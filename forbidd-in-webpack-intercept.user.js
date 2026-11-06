// ==UserScript==
// @name        forbidd-in (webpack intercept)
// @namespace   https://github.com/Hogwai/forbidd-in
// @version     0.2.0
// @description Prevents LinkedIn from detecting browser extensions by neutralizing its webpack extension-detection module, whatever chunk/module IDs the current deploy uses
// @author      Hogwai
// @match       https://www.linkedin.com/*
// @run-at      document-start
// @grant       none
// ==/UserScript==

// == forbidd-in: webpack-intercept approach ==
// Neutralizes LinkedIn's extension detection module without relying on the webpack chunk/module IDs of a given deploy.
//
// Why this is no longer ID-based:
// LinkedIn rotates chunk and module IDs on every deployment. 
// The detection module has been seen as chunk 418 / module 29424 (2025), chunk 905 / module 75023 (Dec 2025) and chunk 585 / module 9269 (May 2026). 
// A hardcoded ID stops matching after a deploy and the scan silently resumes.
//
// How it works now:
// 1. A Proxy wraps the global webpackChunk_ember_auto_import_ array.
// 2. Every chunk passed to push() has its modules inspected.
// 3. The detection module is recognized by its content: it is the only module that defines the chrome-extension:// prefix together with the fetchExtensions / scanDOMForPrefix exports.
// 4. That module is replaced with a no-op that keeps the same public exports before webpack registers it.
//
// Defense in depth: fetch() calls to chrome-extension:// are rejected as well, so a probe cannot succeed even if LinkedIn changes the chunk loading mechanism again and step 3 no longer matches.

// The detection module is the only module containing this literal.
const EXTENSION_PREFIX = 'chrome-extension://';

// Export-map keys that only the defining module contains (with the colon).
// Importers reference the names but never write "name: () => fn".
const DEFINING_EXPORT_KEYS = ['fetchExtensions:', 'scanDOMForPrefix:'];

// Harmless replacement values for the detection module's public surface.
// Each entry is a webpack getter: () => exportedValue.
const STUB_DEFINITIONS = {
    AbuseFeaturesCollectionCoordinator: () => ({}),
    CommonFeaturesAccessor: () => ({}),
    EXTENSION_PREFIX: () => EXTENSION_PREFIX,
    compressToBase64: () => (s) => s,
    dfpAndroidFeaturesKeyEncodingMap: () => ({}),
    dfpAndroidTopLevelKeyEncodingMap: () => ({}),
    dfpIosFeaturesKeyEncodingMap: () => ({}),
    dfpIosPayloadKeysEncodingMap: () => ({}),
    dnaTopLevelFlatKeyEncodingMap: () => ({}),
    dnaTopLevelNestedKeyEncodingMap: () => ({}),
    encodeDFPAndroid: () => () => ({}),
    encodeDFPIos: () => () => ({}),
    encodeDNA: () => () => ({}),
    fetchExtensions: () => () => Promise.resolve([]),
    fireExtensionDetectedEvents: () => () => {},
    fireSpectroscopyEvent: () => () => {},
    getDocument: () => () => document,
    isBrowser: () => () => false,
    isUserAgentChrome: () => () => false,
    parseFoundString: () => () => '',
    scanDOMForPrefix: () => () => [],
};

function buildStubModule() {
    return function (module, exports, require) {
        require.r(exports);
        require.d(exports, STUB_DEFINITIONS);
    };
}

// A module is the detection module if it defines the extension prefix and declares the probing exports in its export map.
function isDetectionModule(mod) {
    if (typeof mod !== 'function') return false;

    let source;
    try {
        source = Function.prototype.toString.call(mod);
    } catch {
        return false;
    }

    if (!source.includes(EXTENSION_PREFIX)) return false;
    return DEFINING_EXPORT_KEYS.every((key) => source.includes(key));
}

function neutralizeChunk(chunk) {
    if (!Array.isArray(chunk)) return;

    const modules = chunk[1];
    if (!modules || typeof modules !== 'object') return;

    for (const id of Object.keys(modules)) {
        if (isDetectionModule(modules[id])) {
            modules[id] = buildStubModule();
            console.info(`[forbidd-in] Detection module ${id} neutralized (chunk ${JSON.stringify(chunk[0])})`);
        }
    }
}

// Backing array that stores chunks (target of the Proxy)
const realArray = [];

// Webpack's JSONP callback calls the previous push implementation back with the same chunk after registering it. 
let forwarding = false;

function handlePush(chunk) {
    if (forwarding) {
        return Array.prototype.push.call(realArray, chunk);
    }

    // Neuter the detection module before webpack registers it
    neutralizeChunk(chunk);

    forwarding = true;
    try {
        // Let webpack process the chunk normally
        return realArray.push(chunk);
    } finally {
        forwarding = false;
    }
}

const proxy = new Proxy(realArray, {
    get(target, prop) {
        if (prop === 'push') {
            return handlePush;
        }
        // Any other property passes through normally
        const value = Reflect.get(target, prop, target);
        return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, prop, value) {
        // Webpack assigns push = webpackJsonpCallback and we store it
        target[prop] = value;
        return true;
    }
});

// Lock the property: the getter always returns our Proxy
Object.defineProperty(globalThis, 'webpackChunk_ember_auto_import_', {
    get() { return proxy; },
    set() { /* ignored; the getter does the work */ },
    configurable: true,
    enumerable: true
});

const originalFetch = window.fetch;
if (typeof originalFetch === 'function') {
    let blocked = 0;
    window.fetch = function (input, init) {
        const url = typeof input === 'string'
            ? input
            : (input && typeof input.url === 'string' ? input.url : '');
        if (url.startsWith(EXTENSION_PREFIX)) {
            if (blocked++ === 0) {
                console.warn('[forbidd-in] chrome-extension:// fetch blocked (webpack module not intercepted?)');
            }
            return Promise.reject(new TypeError('Failed to fetch'));
        }
        return originalFetch.call(this, input, init);
    };
}

console.info('[forbidd-in] Webpack proxy active');

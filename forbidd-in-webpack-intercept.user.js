// ==UserScript==
// @name        forbidd-in (webpack intercept)
// @namespace   https://github.com/Hogwai/forbidd-in
// @version     0.1.0
// @description Prevents LinkedIn from detecting browser extensions by intercepting their webpack module 29424 (chunk 418)
// @author      Hogwai
// @match       https://www.linkedin.com/*
// @run-at      document-start
// @grant       none
// ==/UserScript==

// Intercepts LinkedIn's webpack 5 JSONP chunk loading to neuter the extension
// detection module (chunk 418, module 29424) before it registers.
//
// A Proxy on the global webpackChunk_ember_auto_import_ array intercepts the
// push() call when chunk 418 arrives and replaces module 29424 with a no-op.

const DETECTION_MODULE_ID = 29424;
const realArray = [];

const proxy = new Proxy(realArray, {
    get(target, prop, receiver) {
        if (prop === 'push') {
            return function (chunk) {
                const chunkIds = Array.isArray(chunk) ? chunk[0] : null;
                const modules = Array.isArray(chunk) ? chunk[1] : null;

                if (Array.isArray(chunkIds) && modules !== null && typeof modules === 'object' && chunkIds.includes(418)) {
                    if (modules[DETECTION_MODULE_ID]) {
                        modules[DETECTION_MODULE_ID] = function (e, t, n) {
                            n.r(t);
                            n.d(t, {
                                AbuseFeaturesCollectionCoordinator: () => ({}),
                                CommonFeaturesAccessor: () => ({}),
                                EXTENSION_PREFIX: () => 'chrome-extension://',
                                compressToBase64: () => (s) => s,
                                encodeDNA: () => () => ({}),
                                encodeDFPAndroid: () => () => ({}),
                                encodeDFPIos: () => () => ({}),
                                fetchExtensions: () => () => Promise.resolve([]),
                                fireExtensionDetectedEvents: () => () => {},
                                fireSpectroscopyEvent: () => () => {},
                                getDocument: () => () => document,
                                isBrowser: () => () => false,
                                isUserAgentChrome: () => () => false,
                                parseFoundString: () => () => '',
                                scanDOMForPrefix: () => () => [],
                            });
                        };
                    }
                }
                return target.push(chunk);
            };
        }
        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, prop, value) {
        target[prop] = value;
        return true;
    }
});

Object.defineProperty(globalThis, 'webpackChunk_ember_auto_import_', {
    get() { return proxy; },
    set() {},
    configurable: true,
    enumerable: true
});

console.log('[forbidd-in] Webpack intercept active: chunk 418 monitored');

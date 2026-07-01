// == forbidd-in: webpack-intercept approach ==
// Neutralizes LinkedIn's extension detection module (chunk 418, module 29424)
// by intercepting the webpack 5 JSONP chunk loading mechanism.
//
// How it works:
// 1. A Proxy wraps the global webpackChunk_ember_auto_import_ array
// 2. The Proxy intercepts push() access even after webpack replaces
//    this method with its chunk processing callback
// 3. When chunk 418 arrives, module 29424 is replaced with a no-op
//    BEFORE webpack processes it
// 4. Modules importing the detection functions receive harmless stubs
//
// Benefits over window.appEnvironment = "node":
// - Does NOT touch the SSR appEnvironment flag (breaks other LinkedIn features)
// - Does NOT touch userAgent
// - Surgical: only the detection module is neutralized

const DETECTION_MODULE_ID = 29424;

// Backing array that stores chunks (target of the Proxy)
const realArray = [];

const proxy = new Proxy(realArray, {
    get(target, prop, receiver) {
        if (prop === 'push') {
            return function (chunk) {
                // Format webpack 5 : push([[chunkId, ...], {modules}])
                const chunkIds = Array.isArray(chunk) ? chunk[0] : null;
                const modules = Array.isArray(chunk) ? chunk[1] : null;

                if (Array.isArray(chunkIds) && modules !== null && typeof modules === 'object' && chunkIds.includes(418)) {
                    // Detection module
                    if (modules[DETECTION_MODULE_ID]) {
                        modules[DETECTION_MODULE_ID] = function (e, t, n) {
                            n.r(t); // mark as ES module
                            n.d(t, { // export harmless stubs
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
                        console.log('[forbidd-in] Detection module 29424 neutralized');
                    }
                }
                // Let webpack process the chunk normally
                return target.push(chunk);
            };
        }
        // Any other property passes through normally
        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, prop, value) {
        // Webpack sets push = webpackJsonpCallback; we store it
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

console.log('[forbidd-in] Webpack proxy active: monitoring chunk 418');

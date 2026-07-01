// == forbidd-in: fetch-intercept approach ==
// Intercepts window.fetch in MAIN world to reject chrome-extension:// URLs.
//
// LinkedIn probes installed extensions via fetch() of chrome-extension://<id>/<file>
// (functions c()/l() in webpack chunk 418, module 29424). By rejecting these
// requests before they reach the network, the probe list remains empty and the
// AedEvent tracking payload is never sent with valid extension IDs.
//
// Why this works even though LinkedIn wraps fetch in its own interceptors:
// LinkedIn's ActionInterceptor captures window.fetch into a closure at init time.
// Since this script runs at document_start (before any LinkedIn code loads),
// the closure captures our overridden fetch, not the original. The call chain:
//     probe → LinkedIn wrapper (closure holds our override)
//          → our override → Promise.reject()
//
// Chrome's own blocking is insufficient: WAR (web accessible resources) files
// like icons/fonts ARE accessible from chrome-extension:// even in pages.
// Only a MAIN-world override can reliably prevent probe resolution.
//
// Limitation: does NOT block the DOM scan (SpectroscopyEvent via h()/p()).
// Unlike webpack-intercept (which neuters the entire module), this approach
// only blocks the fetch-based probe path. DOM scanning still runs but finds
// nothing as long as no extension injects content via chrome-extension:// URLs
// into the LinkedIn page.
//
// 🔗 Comparison with other approaches:
//    - webpack-intercept: surgical, blocks all detection paths
//    - fetch-intercept:   blocks probing layer only, no side effects
//    - property-spoofing: blocks all detection but has side effects

const EXTENSION_PREFIX = 'chrome-extension://';

let blockedCount = 0;
const originalFetch = window.fetch.bind(window);

window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
    if (url.startsWith(EXTENSION_PREFIX)) {
        blockedCount++;
        console.log(`[forbidd-in] Fetch chrome-extension:// blocked (#${blockedCount}): ${url.slice(0, 80)}`);
        return Promise.reject(new TypeError('Failed to fetch'));
    }
    return originalFetch(input, init);
};

console.log(`[forbidd-in] Fetch intercept active: blocking chrome-extension:// requests`);

// Expose counter for console inspection
window.__forbiddIn = { blockedCount: () => blockedCount };

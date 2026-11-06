// ==UserScript==
// @name        forbidd-in (fetch intercept)
// @namespace   https://github.com/Hogwai/forbidd-in
// @version     0.1.0
// @description Prevents LinkedIn from probing browser extensions by blocking chrome-extension:// fetch requests
// @author      Hogwai
// @match       https://www.linkedin.com/*
// @run-at      document-start
// @grant       none
// ==/UserScript==

// == forbidd-in: fetch-intercept approach ==
// Intercepts window.fetch in MAIN world to reject chrome-extension:// URLs.
//
// LinkedIn probes installed extensions by calling fetch() on
// chrome-extension://<id>/<file> URLs (functions c()/l() in its webpack
// detection module). The chunk and module IDs change on every deploy, so
// don't rely on them. Rejecting the probes before they reach the network
// keeps the probe list empty, so the AedEvent tracking payload never contains
// a valid extension ID.
//
// Why this works even though LinkedIn wraps fetch in its own interceptors:
// LinkedIn's ActionInterceptor captures window.fetch into a closure at init time.
// Since this script runs at document_start (before any LinkedIn code loads),
// the closure captures our overridden fetch, not the original. The call chain:
//     probe calls LinkedIn wrapper (closure holds our override)
//     which calls our override resulting in Promise.reject()
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
    const url = typeof input === 'string'
        ? input
        : (input && typeof input.url === 'string' ? input.url : '');
    if (url.startsWith(EXTENSION_PREFIX)) {
        blockedCount++;
        if (blockedCount === 1) {
            console.warn('[forbidd-in] Fetch chrome-extension:// blocked (further blocks are silent)');
        }
        return Promise.reject(new TypeError('Failed to fetch'));
    }
    return originalFetch(input, init);
};

console.log(`[forbidd-in] Fetch intercept active: blocking chrome-extension:// requests`);

// Expose counter for console inspection
window.__forbiddIn = { blockedCount: () => blockedCount };

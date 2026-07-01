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

// Intercepts window.fetch to reject chrome-extension:// requests that LinkedIn
// uses to probe installed extensions (functions c()/l()).
//
// LinkedIn's ActionInterceptor wrappers capture fetch into a closure at init
// time. Since this script runs at document-start with @grant none, the closure
// captures our override instead of the original fetch.

const EXTENSION_PREFIX = 'chrome-extension://';
const originalFetch = window.fetch.bind(window);

window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
    if (url.startsWith(EXTENSION_PREFIX)) {
        return Promise.reject(new TypeError('Failed to fetch'));
    }
    return originalFetch(input, init);
};

console.log('[forbidd-in] Fetch intercept active: blocking chrome-extension:// requests');

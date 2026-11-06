// ==UserScript==
// @name        forbidd-in
// @namespace   https://github.com/Hogwai/forbidd-in
// @version     0.1.0
// @description Prevents LinkedIn from scanning and fingerprinting browser extensions
// @author      Hogwai
// @match       https://www.linkedin.com/*
// @run-at      document-start
// @grant       none
// ==/UserScript==

// main.js: Runs in MAIN world at document_start
// Spoof navigator.userAgent: Chrome -> Chromium
const fakeUA = navigator.userAgent.replace(/Chrome\//g, 'Chromium/');
Object.defineProperty(Navigator.prototype, 'userAgent', {
    get() { return fakeUA; },
    configurable: false
});

// Set appEnvironment before any LinkedIn script reads it
window.appEnvironment = "node";

console.log('[forbidd-in] Property spoofing active');
console.log('[forbidd-in] UA =', navigator.userAgent);
console.log('[forbidd-in] appEnvironment =', window.appEnvironment);

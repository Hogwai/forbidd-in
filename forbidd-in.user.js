// ==UserScript==
// @name        forbidd-in
// @namespace   https://github.com/Hogwai/forbidd-in
// @version     2.0
// @description Prevents LinkedIn from scanning and fingerprinting browser extensions
// @author      Hogwai
// @match       https://www.linkedin.com/*
// @run-at      document-start
// @grant       none
// ==/UserScript==

const fakeUA = navigator.userAgent.replace(/Chrome\//g, 'Chromium/');
Object.defineProperty(Navigator.prototype, 'userAgent', {
    get() { return fakeUA; },
    configurable: false
});

window.appEnvironment = "node";

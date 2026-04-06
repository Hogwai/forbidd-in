// main.js — Runs in MAIN world at document_start
// Spoof navigator.userAgent: Chrome -> Chromium
const fakeUA = navigator.userAgent.replace(/Chrome\//g, 'Chromium/');
Object.defineProperty(Navigator.prototype, 'userAgent', {
    get() { return fakeUA; },
    configurable: false
});

// Set appEnvironment before any LinkedIn script reads it
window.appEnvironment = "node";

console.log('🛡️ [Anti-LI-Scan] main.js MAIN world injected');
console.log('🛡️ [Anti-LI-Scan] UA =', navigator.userAgent);
console.log('🛡️ [Anti-LI-Scan] appEnvironment =', window.appEnvironment);

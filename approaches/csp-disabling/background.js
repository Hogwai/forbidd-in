// background.js
chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) return;

    chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        world: "MAIN",
        injectImmediately: true,
        func: () => {
            window.__antiliscan_patched = true;
            const fakeUA = navigator.userAgent.replace(/Chrome\//g, 'Chromium/');
            Object.defineProperty(Navigator.prototype, 'userAgent', {
                get() { return fakeUA; },
                configurable: false
            });
            console.log('🛡️ [Anti-LI-Scan] injected, UA =', navigator.userAgent);
        }
    });
}, { url: [{ hostContains: 'linkedin.com' }] });

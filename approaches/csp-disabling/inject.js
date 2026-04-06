// inject.js
new MutationObserver((mutations) => {
    for (const m of mutations) {
        for (const node of m.addedNodes) {
            if (node.tagName === 'META' &&
                node.httpEquiv === 'Content-Security-Policy') {
                node.remove();
                console.log('🛡️ [Anti-LI-Scan] CSP meta removed');
            }
        }
    }
}).observe(document.documentElement, { childList: true, subtree: true });

// Le content script ISOLATED partage le DOM avec la page
// On injecte un inline via un event handler DOM — ça s'exécute dans le realm de la page
const div = document.createElement('div');
div.setAttribute('onclick', 'window.appEnvironment = "node"; console.log("🛡️ [Anti-LI-Scan] onclick realm:", window.appEnvironment)');
document.documentElement.prepend(div);
div.click();
div.remove();

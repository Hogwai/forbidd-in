// block.js
const s = document.createElement('script');
s.textContent = `
    window.appEnvironment = "node";
    window.__test_realm = Math.random();
    console.log("🛡️ [Anti-LI-Scan] INLINE realm id:", window.__test_realm);
`;
document.documentElement.prepend(s);
s.remove();

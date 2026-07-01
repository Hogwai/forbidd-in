// block.js
const s = document.createElement('script');
s.textContent = `
    window.appEnvironment = "node";
    window.__test_realm = Math.random();
    console.log("[forbidd-in] INLINE realm id:", window.__test_realm);
`;
document.documentElement.prepend(s);
s.remove();

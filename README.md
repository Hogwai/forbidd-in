# forbidd-in

Chrome extension that prevents LinkedIn from detecting and fingerprinting browser extensions.

## What LinkedIn does

LinkedIn ships an extension detection system with three layers:

### 1. Environment gate (`a()` + `s()`)

```js
// a() checks if we're in a browser with appEnvironment != "node"
return "undefined" != typeof window && window && "node" !== window.appEnvironment

// s() checks if the userAgent contains "Chrome"
return navigator.userAgent.indexOf("Chrome") > -1
```

Both must pass for any detection to run. If either returns false, LinkedIn skips all scanning.

### 2. Extension ID probing (`c()` / `l()`)

Fetches `chrome-extension://<id>/<file>` for a hardcoded list of known extension IDs. If the fetch resolves, the extension is installed. Results are sent as an `AedEvent` tracking payload.

LinkedIn wraps this in `requestIdleCallback` with a 2 second timeout. Every time the browser goes idle, it fires again and probes the full list of extension IDs. A second variant adds a `setTimeout` between each fetch so the requests don't all fire at once, making the scan harder to spot in the network tab.

### 3. DOM scanning (`h()` / `p()`)

Walks the entire DOM tree looking for `chrome-extension://` strings in text nodes and element attributes. Any extension ID found in the page is reported as a `SpectroscopyEvent`.

## How forbidd-in defeats it

The extension only needs to make `a()` or `s()` return false. This short-circuits all downstream detection: ID probing and DOM scanning never execute.

Two properties are spoofed:

1. `window.appEnvironment = "node"` makes `a()` return `false`
2. `navigator.userAgent` has `Chrome/` replaced with `Chromium/`, making `s()` return `false` since `indexOf("Chrome")` no longer matches

Either one alone is sufficient. Both are set for redundancy.

## Approaches

Two working approaches are provided. Each folder is a standalone loadable extension.

### `approaches/main-world/` (recommended)

Uses a content script declared with `"world": "MAIN"` in the manifest. Chrome injects the script directly into the page's JavaScript realm at `document_start`, before any LinkedIn code runs.

No CSP modification needed. Chrome's privileged API bypasses CSP entirely. 2 files total (`manifest.json` + `main.js`). Simplest and safest approach.

### `approaches/csp-disabling/`

> **⚠️ WARNING: This approach is a security risk.** This approach strips all CSP headers from LinkedIn pages, leaving you completely exposed to XSS, malicious injections from other extensions, and any script that would normally be blocked by CSP. It is kept here as a reference to document how the original version worked. Use the main-world approach instead.

The original approach. Strips all `Content-Security-Policy` headers via `declarativeNetRequest` rules, then injects inline scripts and onclick handlers to set the spoofed values. 5 files, more complex.

## Loading an approach

1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked" and select one of the `approaches/` folders

## Disclaimer

This project is provided for educational and research purposes only. It documents how LinkedIn's extension detection system works and demonstrates techniques to protect user privacy. Use it at your own risk. The author is not responsible for any consequences resulting from its use, including but not limited to account restrictions or violations of LinkedIn's Terms of Service.

# forbidd-in

Ways of preventing LinkedIn from detecting and fingerprinting your browser extensions. Available as a Chrome extension or userscript.

As always, the best option is to **ditch Google Chrome** for a browser more respectful of your privacy:

- [Mozilla Firefox](https://www.firefox.com/en-US/)
- [Zen Browser](https://zen-browser.app/)
- [Waterfox](https://www.waterfox.com/)

LinkedIn's extension detection exploits Chrome specific APIs (`chrome-extension://` probing, webpack chunk interception). 

Firefox and Firefox based browsers don't expose these vectors, making extension detection impractical.

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

Four strategies are available, each in its own approach folder.

### Strategy A: Webpack intercept (recommended)

Intercepts LinkedIn's webpack 5 chunk loading to neuter the detection module before it registers.

LinkedIn loads its extension detection code as **webpack chunk 418** via a JSONP mechanism. A `Proxy` on the global `webpackChunk_ember_auto_import_` array intercepts the `push()` call when chunk 418 arrives and replaces the detection module (29424) with a no-op. Only the `a()`, `s()`, `c()`, `l()`, `h()`, and `p()` functions become empty stubs. Everything else on LinkedIn continues to work.

Zero side effects on `appEnvironment` or `userAgent`.

- Extension: `approaches/webpack-intercept/`
- Userscript: <a href="https://github.com/Hogwai/forbidd-in/raw/main/forbidd-in-webpack-intercept.user.js"><code>forbidd-in-webpack-intercept.user.js</code></a> <a href="https://github.com/Hogwai/forbidd-in/raw/main/forbidd-in-webpack-intercept.user.js" target="_blank"><img src="https://img.shields.io/badge/Install-181717?style=flat-square&logo=github&logoColor=white" alt="Install"></a>

### Strategy B: Fetch intercept

Blocks the probing layer by intercepting `window.fetch` in MAIN world at `document_start`.

LinkedIn's extension ID probing (functions `c()`/`l()`) uses `fetch()` to request `chrome-extension://<id>/<file>` URLs. By overriding `window.fetch` before any LinkedIn code runs, this approach rejects those probes. The list stays empty and the `AedEvent` tracking payload contains no valid extension IDs.

LinkedIn's own `ActionInterceptor` wraps `window.fetch` into a closure at init time. Because our override is already in place before LinkedIn loads (MAIN world, `document_start`), the closure captures our rejecting override instead of the original `fetch`.

**Limitation:** Only blocks the fetch-based probe path. The DOM scan (`h()`/`p()` → `SpectroscopyEvent`) still runs. In practice the DOM scan finds no extensions unless another extension injects `chrome-extension://` URLs into the page.

**Trade-off:** Less complete than webpack-intercept, but trivially simple and zero side effects on any other LinkedIn functionality.

- Extension: `approaches/fetch-intercept/`
- Userscript: <a href="https://github.com/Hogwai/forbidd-in/raw/main/forbidd-in-fetch-intercept.user.js"><code>forbidd-in-fetch-intercept.user.js</code></a> <a href="https://github.com/Hogwai/forbidd-in/raw/main/forbidd-in-fetch-intercept.user.js" target="_blank"><img src="https://img.shields.io/badge/Install-181717?style=flat-square&logo=github&logoColor=white" alt="Install"></a>

### Strategy C: DNR block tracking

Blocks the exfiltration of detection data at the network level using `declarativeNetRequest` rules.

Instead of preventing LinkedIn from *collecting* extension IDs, this strategy prevents it from *sending* them anywhere. `declarativeNetRequest` rules block outgoing requests to known LinkedIn tracking endpoints: `trackingApiService/track`, `trackO11yApi/trackO11y`, `/li/track`, and `/sensorCollect/`.

The detection code still runs (probes fire, DOM scan executes), but every attempt to exfiltrate the results is blocked by the browser before it reaches the network. Confirmed working against `AedEvent` and `SpectroscopyEvent` payloads.

**Limitation:** Detection code runs locally on every idle cycle and DOM mutation, which is wasteful. Combined with the fetch-intercept approach (Strategy B) it covers both the collection and exfiltration layers with no side effects.

**Use case:** Standalone last line of defense, or layered with Strategy B for full coverage without property spoofing.

- Extension: `approaches/dnr-block-tracking/` (extension only; requires `declarativeNetRequest` API)

### Strategy D: Property spoofing

The extension makes `a()` or `s()` return false by spoofing browser properties at `document_start`. This short-circuits all downstream detection: ID probing and DOM scanning never execute.

Two properties are spoofed:

1. `window.appEnvironment = "node"` (makes `a()` return `false`)
2. `navigator.userAgent` replaces `Chrome/` with `Chromium/` (makes `s()` return `false` since `indexOf("Chrome")` no longer matches)

Either one alone is sufficient, but `appEnvironment` has side effects (LinkedIn uses it as an SSR flag in other modules) and `userAgent` spoofing may affect feature detection by non-malicious scripts.

- Extension: `approaches/main-world/`
- Userscript: <a href="https://github.com/Hogwai/forbidd-in/raw/main/forbidd-in.user.js"><code>forbidd-in.user.js</code></a> <a href="https://github.com/Hogwai/forbidd-in/raw/main/forbidd-in.user.js" target="_blank"><img src="https://img.shields.io/badge/Install-181717?style=flat-square&logo=github&logoColor=white" alt="Install"></a>

> **Original legacy approach: `approaches/csp-disabling/`**  Strips CSP headers via `declarativeNetRequest` and injects scripts into the page. ⚠️ **Security risk:** removes all CSP protection, leaving you exposed to XSS. Kept as reference only.

## Loading an approach

1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked" and select one of the `approaches/` folders

## Disclaimer

This project is provided for educational and research purposes only. It documents how LinkedIn's extension detection system works and demonstrates techniques to protect user privacy. Use it at your own risk. The author is not responsible for any consequences resulting from its use, including but not limited to account restrictions or violations of LinkedIn's Terms of Service.

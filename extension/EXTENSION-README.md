# STFC Claim Free Offers — Browser Extension

A standalone browser extension that automatically claims free offers on the Star Trek Fleet Command (STFC) web store.

## What it does

When you visit the [STFC Store](https://home.startrekfleetcommand.com/store), the extension automatically:
- Navigates to the **Web Gifts** tab
- Finds all available free offers and clicks **Claim** on each one
- Handles the confirmation dialog that follows each claim
- Monitors the page for newly available offers and claims them as they appear

---

## Browser support

| Browser | Supported | Notes |
|---|---|---|
| Chrome | Yes | v88+ |
| Edge | Yes | v88+ |
| Brave | Yes | All recent versions |
| Opera | Yes | v74+ |
| Firefox | Yes | v109+ |
| Safari | Build required | See Safari instructions below |

---

## Installation

### Chrome, Edge, Brave, Opera

1. Download or clone this repository
2. Open your browser and navigate to the extensions page:
   - Chrome/Brave: `chrome://extensions`
   - Edge: `edge://extensions`
   - Opera: `opera://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `extension/` folder from this repository
6. The extension is now active — visit the [STFC Store](https://home.startrekfleetcommand.com/store) to confirm it's running

### Firefox

1. Download or clone this repository
2. Navigate to `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Open the `extension/` folder and select `manifest.json`
5. The extension is now active for this browser session

> **Note:** Temporary add-ons in Firefox are removed when the browser is closed. For a permanent install, the extension must be submitted to [addons.mozilla.org](https://addons.mozilla.org) or signed via Mozilla's self-distribution process.

### Safari (macOS)

Safari requires wrapping the extension in a native macOS app using Xcode.

**Prerequisites:**
- macOS with Xcode installed (free from the App Store)
- An Apple Developer account (free tier works for local use)

**Steps:**
1. Open Terminal and run:
   ```bash
   xcrun safari-web-extension-converter ./extension --project-location ./safari-extension
   ```
2. Open the generated Xcode project in `./safari-extension/`
3. Set your Apple Developer Team under **Signing & Capabilities**
4. Click **Run** (▶) to build and install the app
5. Open Safari → **Settings** → **Extensions** and enable **STFC Claim and View Offers**
6. Click **Always Allow on home.startrekfleetcommand.com** when prompted

> To distribute to other Safari users, the app must be submitted to the Mac App Store.

---

## Usage

1. Log in to the [STFC website](https://home.startrekfleetcommand.com)
2. Navigate to the [STFC Store](https://home.startrekfleetcommand.com/store) — free offers are claimed automatically
3. Keep the browser tab open so the extension can monitor for newly available offers

---

## Known issues

- **Site maintenance** — When Scopely performs website maintenance the extension will stop functioning. Refresh the store page once maintenance is complete.
- **Session expiry** — The extension does not have access to your login credentials. If your Scopely session expires you must log in manually.

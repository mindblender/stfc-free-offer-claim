# STFC Free Offer Claim

Automatically claims free offers on the [Star Trek Fleet Command](https://home.startrekfleetcommand.com) web store.

Available as a **Browser Extension** (recommended) or as a **TamperMonkey userscript**.

---

## Browser Extension

A standalone Manifest V3 extension — no TamperMonkey required.

### Features
- Auto-claims free offers in the STFC Store's "Web Gifts" tab
- Toggle auto-claiming on/off from the toolbar popup without reloading the page
- Toolbar icon shows green (enabled) or red (disabled) at a glance

### Browser support

| Browser | Supported |
|---|---|
| Firefox | ✅ |
| Chrome | ✅ |
| Edge | ✅ |
| Brave | ✅ |
| Opera | ✅ |
| Safari | ⚠️ Requires additional conversion steps (see `extension/DEPLOYMENT.md`) |

### Installation (developer / temporary load)

**Firefox:**
1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select any file inside the `extension/` folder

**Chrome / Edge / Brave / Opera:**
1. Navigate to `chrome://extensions` (or the browser's equivalent)
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `extension/` folder

### Usage
Keep a browser tab open on the [STFC Store](https://home.startrekfleetcommand.com/store). The extension monitors for new free offers and claims them automatically. Use the toolbar popup to toggle auto-claiming on or off at any time.

---

## TamperMonkey Script

The original userscript for use with the [TamperMonkey](https://www.tampermonkey.net/) browser extension.

### Features
- Auto-claims free offers in the STFC Store's "Web Gifts" tab

### Requirements
1. [TamperMonkey](https://www.tampermonkey.net/)
2. A Scopely login for the [STFC](https://home.startrekfleetcommand.com/) site

### Installation
1. Log in to the [STFC site](https://home.startrekfleetcommand.com)
2. Navigate to the [STFC Store](https://home.startrekfleetcommand.com/store)
3. Click the TamperMonkey icon and choose **Create a New Script**
4. Copy and paste the [claim-free-gifts.js](https://raw.githubusercontent.com/mindblender/stfc-free-offer-claim/refs/heads/main/claim-free-gifts.js) code into the editor
5. Save and refresh the STFC Store page
6. A red badge on the TamperMonkey icon confirms the script is active

---

## Known Issues

- **Scopely maintenance** — When Scopely performs website maintenance, auto-claiming stops. Refresh the STFC Store page once maintenance is complete.

- **Session expiry** — When your Scopely login session expires, the extension/script can no longer claim offers. Log in again manually to resume.

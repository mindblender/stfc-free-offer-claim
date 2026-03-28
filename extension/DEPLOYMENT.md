# Extension Store Deployment Guide

## Before you submit

All stores require the extension to be packaged as a zip file. Create it from the `extension/` folder contents (not the folder itself):

```bash
cd extension && zip -r ../stfc-claim-offers.zip .
```

---

## Chrome Web Store

1. **Create a developer account** at [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole) — one-time $5 USD registration fee
2. In the developer console, click **New Item** and upload the zip
3. Fill in the store listing:
   - Description
   - Screenshots (at least 1280×800 or 640×400)
   - Category — **Productivity**
4. Set **Visibility** — Public, Unlisted, or Private
5. Submit for review — typically **1–3 business days** for new extensions

---

## Firefox Add-ons (AMO)

1. **Create a developer account** at [addons.mozilla.org](https://addons.mozilla.org) — free
2. Go to **Developer Hub** → **Submit a New Add-on**
3. Choose **On this site** (AMO public listing) or **On your own** (self-hosted/signed zip)
4. Upload the zip — Mozilla runs an automated validator immediately
5. Fill in the listing details
6. Submit for manual review — typically **a few days to a few weeks** depending on the queue

> Firefox requires extensions to be signed by Mozilla to install permanently. AMO submission handles signing automatically.
>
> AMO requires a source code submission if the code is minified. This extension's code is not minified, so this step can be skipped.

---

## Microsoft Edge Add-ons

1. **Create a developer account** at [partner.microsoft.com/dashboard](https://partner.microsoft.com/dashboard) — free
2. Go to **Microsoft Edge** → **Extensions** → **Create new extension**
3. Upload the same zip file — Edge uses the same Manifest V3 format as Chrome
4. Fill in the store listing and submit for review — typically **1–7 business days**

> Edge users can also install extensions directly from the Chrome Web Store, so many developers skip a separate Edge submission.

---

## Opera Add-ons

1. **Create a developer account** at [addons.opera.com/developer](https://addons.opera.com/developer) — free
2. Click **Submit add-on** and upload the zip
3. Fill in listing details and submit
4. Review can take **several weeks** — Opera's review queue is slower than the others

> Opera also supports installing Chrome Web Store extensions directly, so many developers skip Opera's store and just publish to Chrome's.

---

## Safari / Mac App Store

**Prerequisites:**
- macOS with Xcode installed
- Apple Developer Program membership — $99 USD/year (required for App Store distribution)

1. **Enroll** in the Apple Developer Program at [developer.apple.com](https://developer.apple.com)
2. Convert the extension to an Xcode project (if not already done):
   ```bash
   xcrun safari-web-extension-converter ./extension --project-location ./safari-extension
   ```
3. In Xcode:
   - Set your **Bundle Identifier** (e.g. `dev.mindblender.stfc-claim-offers`)
   - Set your **Team** under Signing & Capabilities
   - Set the version and build number
4. Archive the app: **Product** → **Archive**
5. In the **Organizer**, click **Distribute App** → **App Store Connect**
6. Complete the App Store Connect listing at [appstoreconnect.apple.com](https://appstoreconnect.apple.com):
   - Screenshots, description, and privacy details are all required
7. Submit for review — typically **1–3 business days**

---

## Summary

| Store | Cost | Review time | Notes |
|---|---|---|---|
| Chrome Web Store | $5 one-time | 1–3 days | Largest user base |
| Firefox AMO | Free | Days–weeks | Covers all Firefox users |
| Edge Add-ons | Free | 1–7 days | Edge can also use Chrome Web Store directly |
| Opera Add-ons | Free | Weeks | Low priority; Opera supports Chrome Web Store extensions |
| Mac App Store (Safari) | $99/year | 1–3 days | Requires Xcode conversion step first |

**Recommendation:** Start with Chrome Web Store and Firefox AMO — they cover the vast majority of users. Edge and Opera can follow, and Safari only if there is demand given the yearly cost and additional build requirements.

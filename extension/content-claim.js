'use strict';

// Runs on: https://home.startrekfleetcommand.com/store

const storage = typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;

const clickWebGiftTab = () => {
    const btn = document.getElementById('store-web-gift-tab-button');
    if (btn) setTimeout(() => btn.click(), 2000);
};

const claimDialog = () => {
    setTimeout(() => {
        // Support both new MuiDialog structure and legacy WP-OfferDetailsModal structure
        const confirm = document.querySelector('.MuiDialogActions-root button')
                     || document.querySelector('button.WP-OfferDetailsModal-confirmButton:not([disabled])');

        setTimeout(() => confirm?.click(), 2000);
    }, 2000);
};

const findClaimButtons = () => {
    const claimBtns = Array.from(
        document.querySelectorAll('button.WP-Offer-price-btn:not([disabled])')
    ).filter(b => b.querySelector('p')?.textContent.trim() === "Claim");

    claimBtns.forEach((btn, idx) => setTimeout(() => {
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        btn.disabled = true;
        claimDialog();
    }, 3000 * (idx + 1)));
};

const observer = new MutationObserver(muts => {
    if (muts.some(m => m.addedNodes.length)) { findClaimButtons(); clickWebGiftTab(); }
});

function start() {
    observer.observe(document.body, { childList: true, subtree: true });
    findClaimButtons();
    clickWebGiftTab();
}

function stop() {
    observer.disconnect();
}

// Check initial state on page load
storage.get(['enabled']).then((result) => {
    if (result.enabled !== false) start();
});

// React to toggle changes in real time without requiring a page reload
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !('enabled' in changes)) return;
    changes.enabled.newValue === false ? stop() : start();
});

// When the tab becomes visible again, re-scan for any offers that appeared
// while the browser was throttling the background tab
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    storage.get(['enabled']).then((result) => {
        if (result.enabled !== false) { findClaimButtons(); clickWebGiftTab(); }
    });
});

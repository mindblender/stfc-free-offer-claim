// ==UserScript==
// @name         STFC Claim Free Offers
// @namespace    https://mindblender.dev/stfc
// @version      v1.9.6
// @description  Automatically claims free offers on the STFC web store.
// @author       Mindblender
// @match        https://home.startrekfleetcommand.com/store*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    if (!window.location.pathname.startsWith('/store')) return;

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
            btn.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true }));
            btn.disabled = true;
            claimDialog();
        }, 3000 * (idx + 1)));
    };

    new MutationObserver(muts => {
        if (muts.some(m => m.addedNodes.length)) { findClaimButtons(); clickWebGiftTab(); }
    }).observe(document.body, { childList:true, subtree:true });

    findClaimButtons();
    clickWebGiftTab();
})();

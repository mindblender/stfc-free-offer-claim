// ==UserScript==
// @name         STFC Claim free offers
// @namespace    http://tampermonkey.net/
// @version      2025-02-10
// @description  This script attempts to automatically claim free offers as they appear.  Note: obviously you must be logged in and keep the page open for this to work.
// @author       Mindblender
// @match        https://home.startrekfleetcommand.com/store
// @icon         https://www.google.com/s2/favicons?sz=64&domain=startrekfleetcommand.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Debounce function to limit the frequency of execution
    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), delay);
        };
    };

    // Find and click the "Web Gift" button
    const findAndClickWebGiftButton = () => {
        const webGiftButton = document.getElementById('store-web-gift-tab-button');

        if (webGiftButton) {
            setTimeout(() => {
                webGiftButton.click();
            }, 2000);
        }
    };

    
    const claimDialog = (cardTitle, timestamp) => {
        setTimeout(() => {
            const modalButton = document.querySelector('button.WP-OfferDetailsModal-confirmButton:not([disabled])');
            const confirmationModal = null;

            const rewardElement = document.querySelector('.WP-OfferDetailsModalItem-title pre');
            const rewardText = rewardElement ? rewardElement.textContent.trim() : null;

            const qtyElement = document.querySelector('.WP-OfferDetailsModal-itemCount');
            const qtyText = qtyElement ? qtyElement.textContent.trim() : null;
            const quantity = qtyText ? parseInt(qtyText.replace(/^x/, '')) : null;

            console.log('Parsed quantity:', quantity); // 50

            console.log('Reward text:', rewardText);

            const offerItem = null;
            const offerQty = 0;

            if (modalButton) {
                /*
                Future enhancement:
                - Grab the item name and quantity from the UI Modal and stuff it into LocalStorage.
                LocalStorage Data:
                timestamp,Item,Qty

                Steps:
                1. fine modal dialog
                2. find item
                3. find quantity

                saveGiftData({
                    title: cardTitle,
                    timestamp: timestamp,
                    reward: "TODO: extract reward info here"
                });

                */
                setTimeout(() => {
                    console.log(`Clicking the button in the Claim dialog for ${cardTitle} @ ${timestamp}`, modalButton);
                    modalButton.click();
                }, 2000);
            }
        }, 2000);
    };

    const saveGiftData = (data) => {
        const key = 'stfcGiftLog';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push(data);
        localStorage.setItem(key, JSON.stringify(existing));
    }

    function exportGiftData() {
        const data = localStorage.getItem('stfcGiftLog') || '[]';
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
    
        const a = document.createElement('a');
        a.href = url;
        a.download = 'stfcGiftData.json';
        a.click();
    
        URL.revokeObjectURL(url);
    }

    /* Not implemented, yet
    const timestampe = () => new Date().toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    */

    function findClaimButtons() {
        const buttons = document.querySelectorAll('button.WP-Offer-price-btn:not([disabled])');

        const claimButtons = Array.from(buttons).filter(button => {
            const pElement = button.querySelector('p');
            return pElement && pElement.textContent.trim() === "Claim";
        });

        claimButtons.forEach((button, index, fullArray) => {
            setTimeout(() => {
                const offerWrapper = button.closest('[name="web-gift-item-div"]');
                const titleElement = offerWrapper ? offerWrapper.querySelector('p.sc-dsLQwm.sc-iKTcqh.cyqmnO.fUkhYC.p24.bold.Inter.break') : null;
                const cardTitle = titleElement ? titleElement.textContent.trim() : "Unknown Offer";

                const timestamp = new Date().toLocaleString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });

                console.log(`Clicking Claim button: (${cardTitle}) @ ${timestamp}`, button);

                button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

                button.disabled = true;

                claimDialog(cardTitle, timestamp);
            }, 3000);
        });
    }

    // Debounced versions of the functions
    const debouncedFindClaimButtons = debounce(findClaimButtons, 1000);
    const debouncedFindAndClickWebGiftButton = debounce(findAndClickWebGiftButton, 1000);

    // Run once on load
    findClaimButtons();
    findAndClickWebGiftButton();

    // Observe dynamic DOM updates with MutationObserver
    const observer = new MutationObserver((mutationsList, observer) => {
        debouncedFindClaimButtons();
        debouncedFindAndClickWebGiftButton();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
})();

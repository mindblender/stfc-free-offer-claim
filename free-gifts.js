// ==UserScript==
// @name         STFC Claim free offers
// @namespace    http://tampermonkey.net/
// @version      2025-04-12
// @description  This script attempts to automatically claim free offers as they appear.  Note: obviously you must be logged in and keep the page open for this to work.
// @author       Mindblender
// @match        https://home.startrekfleetcommand.com/store
// @icon         https://www.google.com/s2/favicons?sz=64&domain=startrekfleetcommand.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
  
    const STORAGE_KEY = 'stfc_claimed_rewards';
  
    const storeRewardData = (title, quantity, timestamp) => {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      existing.push({ title, quantity, timestamp });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    };
  
    const extractRewardInfo = (timestamp) => {
      const titleElement = document.querySelector('.WP-OfferDetailsModalItem-title pre');
      const qtyElement = document.querySelector('.WP-OfferDetailsModal-itemCount');
  
      const title = titleElement ? titleElement.textContent.trim() : 'Unknown';
      const rawQty = qtyElement ? qtyElement.textContent.trim() : null;
      const quantity = rawQty ? parseInt(rawQty.replace(/[^\d]/g, '')) : 0;
  
      storeRewardData(title, quantity, timestamp);
    };
  
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
        const modalButton = document.querySelector(
          'button.WP-OfferDetailsModal-confirmButton:not([disabled])'
        );
  
        extractRewardInfo(timestamp);
  
        setTimeout(() => {
          console.log(`Clicking the button in the Claim dialog for ${cardTitle} @ ${timestamp}`, modalButton);
          modalButton.click();
        }, 2000);
      }, 2000);
    };
  
    function findClaimButtons() {
      const buttons = document.querySelectorAll('button.WP-Offer-price-btn:not([disabled])');
  
      const claimButtons = Array.from(buttons).filter((button) => {
        const pElement = button.querySelector('p');
        return pElement && pElement.textContent.trim() === 'Claim';
      });
  
      claimButtons.forEach((button, index) => {
        setTimeout(() => {
          const offerWrapper = button.closest('[name="web-gift-item-div"]');
          const titleElement = offerWrapper
            ? offerWrapper.querySelector('p.sc-dsLQwm.sc-iKTcqh.cyqmnO.fUkhYC.p24.bold.Inter.break')
            : null;
          const cardTitle = titleElement ? titleElement.textContent.trim() : 'Unknown Offer';
  
          const timestamp = new Date().toLocaleString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
  
          console.log(`Clicking Claim button: (${cardTitle}) @ ${timestamp}`, button);
  
          button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  
          button.disabled = true;
  
          claimDialog(cardTitle, timestamp);
        }, 3000 * index);
      });
    }
  
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.addedNodes.length > 0) {
          findClaimButtons();
          findAndClickWebGiftButton();
          break;
        }
      }
    });
  
    observer.observe(document.body, { childList: true, subtree: true });
  
    findClaimButtons();
    findAndClickWebGiftButton();
  })();
  
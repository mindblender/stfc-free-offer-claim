// ==UserScript==
// @name         STFC Free Offers Claim & Viewer
// @namespace    https://mindblender.dev/stfc
// @version      v2.0.0
// @description  Auto-claims STFC free offers and shows a sortable view at /view-claims with visual indicators.
// @author       Mindblender
// @match        https://home.startrekfleetcommand.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    const currentUrl = window.location.href;

    // === VIEW MODE (/view-claims) ===
    if (currentUrl.includes('/view-claims')) {
        const claimedOffers = GM_getValue("claimedOffers", []);
        console.log("🔍 Retrieved offers:", claimedOffers);

        const tableRows = claimedOffers.map(claim => `
            <tr>
                <td>${claim.timestamp}</td>
                <td>${claim.itemName}</td>
                <td>${claim.quantity}</td>
                <td>${claim.cardTitle}</td>
            </tr>`).join('');

        const html = `
            <html>
            <head>
                <title>Claimed Offers</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    table { border-collapse: collapse; width: 100%; }
                    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                    th { cursor: pointer; background-color: #f2f2f2; user-select: none; }
                    th.sorted-asc::after { content: " ↑"; }
                    th.sorted-desc::after { content: " ↓"; }
                </style>
            </head>
            <body>
                <h1>Claimed Offers</h1>
                ${claimedOffers.length === 0 ? '<p>No claimed offers found.</p>' : `
                <table id="offersTable">
                    <thead>
                        <tr>
                            <th onclick="sortTable(0)">Date</th>
                            <th onclick="sortTable(1)">Item</th>
                            <th onclick="sortTable(2)">Qty</th>
                            <th onclick="sortTable(3)">Card</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>`}
                <script>
                    let sortDirections = {};

                    function sortTable(colIndex) {
                        const table = document.getElementById("offersTable");
                        const rows = Array.from(table.rows).slice(1);
                        const headers = table.tHead.rows[0].cells;

                        // Reset headers
                        Array.from(headers).forEach(th => {
                            th.classList.remove('sorted-asc', 'sorted-desc');
                        });

                        // Toggle direction
                        const isAsc = sortDirections[colIndex] = !sortDirections[colIndex];
                        headers[colIndex].classList.add(isAsc ? 'sorted-asc' : 'sorted-desc');

                        rows.sort((a, b) => {
                            const x = a.cells[colIndex].innerText.trim();
                            const y = b.cells[colIndex].innerText.trim();

                            return isAsc
                                ? x.localeCompare(y, undefined, { numeric: true })
                                : y.localeCompare(x, undefined, { numeric: true });
                        });

                        rows.forEach(row => table.tBodies[0].appendChild(row));
                    }
                </script>
            </body>
            </html>`;

        document.open();
        document.write(html);
        document.close();
        return; // Exit to avoid running claim logic
    }

    // === CLAIM MODE (/store) ===
    if (!currentUrl.includes('/store')) return;

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

            const itemElements = document.querySelectorAll('.WP-OfferDetailsModalItem-title pre');
            const quantityElements = document.querySelectorAll('.WP-OfferDetailsModal-itemCount');

            const claimEntries = [];

            itemElements.forEach((el, i) => {
                const itemName = el ? el.textContent.trim() : "Unknown Item";
                const quantityText = quantityElements[i] ? quantityElements[i].textContent.trim() : "x0";
                const quantity = parseInt(quantityText.replace(/^x/, '')) || 0;

                claimEntries.push({
                    cardTitle,
                    itemName,
                    quantity,
                    timestamp
                });
            });

            const existingClaims = GM_getValue("claimedOffers", []);
            const parsedNewTime = new Date(timestamp).getTime();

            const dedupedNewClaims = claimEntries.filter(entry => {
                return !existingClaims.some(existing => {
                    const sameTitle = existing.cardTitle === entry.cardTitle;
                    const sameItem = existing.itemName === entry.itemName;
                    const existingTime = new Date(existing.timestamp).getTime();
                    const withinTimeWindow = Math.abs(existingTime - parsedNewTime) <= 5000;
                    return sameTitle && sameItem && withinTimeWindow;
                });
            });

            if (dedupedNewClaims.length > 0) {
                const updated = existingClaims.concat(dedupedNewClaims);
                GM_setValue("claimedOffers", updated);
                console.log("💾 Saved offers:", updated);
            }

            setTimeout(() => {
                console.log(`✅ Clicking Confirm for ${cardTitle} @ ${timestamp}`, modalButton);
                modalButton?.click();
            }, 2000);
        }, 2000);
    };

    const findClaimButtons = () => {
        const buttons = document.querySelectorAll('button.WP-Offer-price-btn:not([disabled])');

        const claimButtons = Array.from(buttons).filter(button => {
            const pElement = button.querySelector('p');
            return pElement && pElement.textContent.trim() === "Claim";
        });

        claimButtons.forEach((button, index) => {
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

                console.log(`🛎️ Claiming (${cardTitle}) @ ${timestamp}`, button);

                try {
                    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                } catch (e) {
                    console.error("❌ Failed to dispatch click:", e);
                }

                button.disabled = true;

                claimDialog(cardTitle, timestamp);
            }, 3000 * (index + 1));
        });
    };

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

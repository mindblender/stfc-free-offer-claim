
// ==UserScript==
// @name         STFC Claim and View Offers
// @namespace    https://mindblender.dev/stfc
// @version      v1.7.0
// @description  Automatically claims free offers and provides a view page with sortable, exportable table of claimed items and a chart of most frequently claimed items.
// @author       Mindblender
// @match        https://home.startrekfleetcommand.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
    'use strict';

    const currentPath = window.location.pathname;

    // === Claim Offers Logic ===
    if (currentPath === "/store") {
        const findAndClickWebGiftButton = () => {
            const webGiftButton = document.getElementById('store-web-gift-tab-button');
            if (webGiftButton) setTimeout(() => webGiftButton.click(), 2000);
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
                    claimEntries.push({ cardTitle, itemName, quantity, timestamp });
                });

                const existingClaims = GM_getValue("claimedOffers", []);
                const parsedNewTime = new Date(timestamp).getTime();

                const TWO_MINUTES_MS = 2 * 60 * 1000;

                const dedupedNewClaims = claimEntries.filter(entry => {
                    return !existingClaims.some(existing => {
                        const sameTitle = existing.cardTitle === entry.cardTitle;
                        const sameItem = existing.itemName === entry.itemName;
                        const existingTime = new Date(existing.timestamp).getTime();
                        return sameTitle && sameItem && (parsedNewTime - existingTime >= 0) && (parsedNewTime - existingTime <= TWO_MINUTES_MS);
                    });
                });

                if (dedupedNewClaims.length > 0) {
                    const updated = existingClaims.concat(dedupedNewClaims);
                    GM_setValue("claimedOffers", updated);
                    console.log("✅ Saved offers:", updated);
                }

                setTimeout(() => modalButton?.click(), 2000);
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
                    const titleElement = offerWrapper?.querySelector('p.bold.Inter.break');
                    const cardTitle = titleElement ? titleElement.textContent.trim() : "Unknown Offer";
                    const timestamp = new Date().toLocaleString('en-US', {
                        hour: 'numeric', minute: '2-digit', second: '2-digit',
                        hour12: true, month: 'short', day: 'numeric', year: 'numeric'
                    });

                    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
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
    }

    // === View Claimed Offers Logic ===
    else if (currentPath.startsWith("/view-claims")) {
        const claimedOffers = GM_getValue("claimedOffers", []);
        console.log("🔍 Retrieved offers:", claimedOffers);

        // Count frequencies
        const frequencyMap = {};
        claimedOffers.forEach(({ itemName, quantity }) => {
            frequencyMap[itemName] = (frequencyMap[itemName] || 0) + quantity;
        });

        const sortedItems = Object.entries(frequencyMap).sort((a, b) => b[1] - a[1]);

        const html = `
            <html>
            <head>
                <title>Claimed Offers</title>
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    table { border-collapse: collapse; width: 100%; }
                    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                    th { cursor: pointer; background-color: #f2f2f2; }
                    .sort-asc::after { content: " ▲"; }
                    .sort-desc::after { content: " ▼"; }
                    button { margin-top: 10px; padding: 6px 12px; }
                    #exportBtn {
                        margin-bottom: 10px;
                        padding: 8px 12px;
                        background-color: #007bff;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                    }
                    #exportBtn:hover {
                        background-color: #0056b3;
                    }
                    #chartContainer {
                        margin-top: 40px;
                        max-width: 800px;
                    }
                    #dataControls {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        gap: 2rem;
                    }
                    #paginationControls button {
                        padding: 6px 10px;
                        margin: 2px;
                        border-radius: 4px;
                        border: 1px solid #ccc;
                        cursor: pointer;
                    }
                    #paginationControls .active {
                        background-color: #007bff;
                        color: white;
                    }
                </style>
            </head>
            <body>
                <h1>Claimed Offers</h1>
                ${claimedOffers.length === 0 ? '<p>No claimed offers found.</p>' : `
                <div id="dataControls">
                    <button id="exportBtn" onclick="exportToCSV()">Export to CSV</button>
                    <div style="text-align: right; margin: 10px 0; font-weight: bold;">
                        Total claims: ${claimedOffers.length}
                    </div>
                </div>
                <table id="offersTable">
                    <thead>
                        <tr>
                            <th onclick="sortTable(0)">Date</th>
                            <th onclick="sortTable(1)">Item</th>
                            <th onclick="sortTable(2)">Qty</th>
                            <th onclick="sortTable(3)">Card</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
                <div id="paginationControls"></div>

                <div id="chartContainer">
                    <h2>Most Frequently Claimed Items</h2>
                    <canvas id="frequencyChart"></canvas>
                </div>`}
                <script>
                    const claimedOffers = ${JSON.stringify(claimedOffers)};
                    const PAGE_SIZE = 25;
                    let currentPage = 1;
                    let sortDirection = [true, true, true, true];

                    function renderTablePage() {
                        const start = (currentPage - 1) * PAGE_SIZE;
                        const end = start + PAGE_SIZE;
                        const currentData = claimedOffers.slice(start, end);

                        const rows = currentData.map(function(claim) {
                            return (
                                '<tr>' +
                                    '<td>' + claim.timestamp + '</td>' +
                                    '<td>' + claim.itemName + '</td>' +
                                    '<td>' + claim.quantity + '</td>' +
                                    '<td>' + claim.cardTitle + '</td>' +
                                '</tr>'
                            );
                        }).join('');

                        const tbody = document.querySelector('#offersTable tbody');
                        if (tbody) tbody.innerHTML = rows;

                        renderPaginationControls();
                    }

                    function renderPaginationControls() {
                        const totalPages = Math.ceil(claimedOffers.length / PAGE_SIZE);
                        const container = document.getElementById("paginationControls");
                        container.innerHTML = '';

                        for (let i = 1; i <= totalPages; i++) {
                            const btn = document.createElement("button");
                            btn.textContent = i;
                            if (i === currentPage) btn.classList.add("active");
                            btn.onclick = function () {
                                currentPage = i;
                                renderTablePage();
                            };
                            container.appendChild(btn);
                        }
                    }

                    function sortTable(colIndex) {
                        const ascending = sortDirection[colIndex];
                        sortDirection[colIndex] = !ascending;

                        claimedOffers.sort((a, b) => {
                            const x = Object.values(a)[colIndex];
                            const y = Object.values(b)[colIndex];
                            return ascending ? String(x).localeCompare(String(y), undefined, { numeric: true }) :
                                               String(y).localeCompare(String(x), undefined, { numeric: true });
                        });

                        currentPage = 1;
                        renderTablePage();

                        const headers = document.querySelectorAll("th");
                        headers.forEach((th, i) => {
                            th.classList.remove("sort-asc", "sort-desc");
                            if (i === colIndex) {
                                th.classList.add(ascending ? "sort-asc" : "sort-desc");
                            }
                        });
                    }

                    function exportToCSV() {
                        const rows = [["Timestamp", "Item Name", "Quantity", "Card Title"]];
                        claimedOffers.forEach(claim => {
                            rows.push([claim.timestamp, claim.itemName, claim.quantity, claim.cardTitle]);
                        });

                        const csvContent = rows.map(row =>
                            row.map(field => '"' + String(field).replace(/"/g, '""') + '"').join(",")
                        ).join("\\n");

                        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(blob);
                        link.download = "stfc_claimed_offers.csv";
                        link.click();
                    }

                    new Chart(document.getElementById('frequencyChart'), {
                        type: 'bar',
                        data: {
                            labels: ${JSON.stringify(sortedItems.map(([item]) => item))},
                            datasets: [{
                                label: 'Total Claimed',
                                data: ${JSON.stringify(sortedItems.map(([, qty]) => qty))},
                                backgroundColor: 'rgba(54, 162, 235, 0.7)'
                            }]
                        },
                        options: {
                            responsive: true,
                            scales: {
                                y: { beginAtZero: true }
                            }
                        }
                    });

                    renderTablePage();
                </script>
            </body>
            </html>`;

        document.open();
        document.write(html);
        document.close();
    }
})();

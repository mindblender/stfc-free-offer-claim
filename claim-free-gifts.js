// ==UserScript==
// @name         STFC Claim and View Offers
// @namespace    https://mindblender.dev/stfc
// @version      v1.8
// @description  Automatically claims free offers and provides a view page with sortable, exportable table of claimed items, a summary table of totals, and (optionally) a chart of most-frequently-claimed items.
// @author       Mindblender
// @match        https://home.startrekfleetcommand.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
    'use strict';

    const currentPath = window.location.pathname;

    // ========================
    // === Claim Offers Logic ===
    // ========================
    if (currentPath === "/store") {
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
                    console.log("✅ Saved offers:", updated);
                }

                setTimeout(() => {
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
                    const titleElement = offerWrapper ? offerWrapper.querySelector('p.bold.Inter.break') : null;
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

    // ===========================
    // === View Claimed Offers ===
    // ===========================
    else if (currentPath.startsWith("/view-claims")) {
        const claimedOffers = GM_getValue("claimedOffers", []);
        console.log("🔍 Retrieved offers:", claimedOffers);

        const html = `
            <html>
            <head>
                <title>Claimed Offers</title>
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
                    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                    th { cursor: pointer; background-color: #f2f2f2; }
                    .sort-asc::after { content: " ▲"; }
                    .sort-desc::after { content: " ▼"; }
                    button { margin: 5px; padding: 6px 12px; }
                    #exportBtn {
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
                    #dataControls {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        gap: 2rem;
                    }
                    #chartContainer { max-width: 800px; margin: 30px auto; }

                    /* --- Totals table --- */
                    #summaryTable {
                        border-collapse: collapse;
                        width: 100%;
                        margin-top: 30px;
                    }
                    #summaryTable th,
                    #summaryTable td {
                        border: 1px solid #ccc;
                        padding: 8px;
                        text-align: left;
                    }
                    #summaryTable th { background: #f2f2f2; }
                </style>
            </head>
            <body>
                <h1>Claimed Offers</h1>
                ${claimedOffers.length === 0 ? '<p>No claimed offers found.</p>' : `
                <div id="dataControls">
                    <button id="exportBtn" onclick="exportToCSV()">Export to CSV</button>
                    <div>
                        <button onclick="prevPage()">Previous</button>
                        <span id="pageInfo"></span>
                        <button onclick="nextPage()">Next</button>
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
                    <tbody id="tableBody"></tbody>
                </table>
                <!--
                <div id="chartContainer">
                    <h2>Most Frequently Claimed Items</h2>
                    <canvas id="claimsChart" width="800" height="400"></canvas>
                </div>
                -->
                <h2>Totals by Item</h2>
                <table id="summaryTable">
                    <thead>
                        <tr><th>Item</th><th>Total Qty</th></tr>
                    </thead>
                    <tbody id="summaryBody"></tbody>
                </table>
                `}
                <script>
                    const claimedOffers = ${JSON.stringify(claimedOffers)};
                    let sortDirection = [true, true, true, true];
                    let currentPage = 1;
                    const rowsPerPage = 20;

                    /** ---------------- Table pagination ---------------- */
                    function renderTablePage() {
                        const start = (currentPage - 1) * rowsPerPage;
                        const end = start + rowsPerPage;
                        const pageItems = claimedOffers.slice(start, end);
                        const tableBody = document.getElementById("tableBody");
                        tableBody.innerHTML = pageItems.map(claim => \`
                            <tr>
                                <td>\${claim.timestamp}</td>
                                <td>\${claim.itemName}</td>
                                <td>\${claim.quantity}</td>
                                <td>\${claim.cardTitle}</td>
                            </tr>\`).join('');

                        const pageInfo = document.getElementById("pageInfo");
                        const totalPages = Math.ceil(claimedOffers.length / rowsPerPage);
                        pageInfo.textContent = \`Page \${currentPage} of \${totalPages}\`;
                    }

                    function prevPage() {
                        if (currentPage > 1) {
                            currentPage--;
                            renderTablePage();
                            renderSummaryTable();
                        }
                    }

                    function nextPage() {
                        if (currentPage < Math.ceil(claimedOffers.length / rowsPerPage)) {
                            currentPage++;
                            renderTablePage();
                            renderSummaryTable();
                        }
                    }

                    /** ---------------- Column sorting ---------------- */
                    function sortTable(colIndex) {
                        const ascending = sortDirection[colIndex];
                        sortDirection[colIndex] = !ascending;

                        claimedOffers.sort((a, b) => {
                            const x = [a.timestamp, a.itemName, a.quantity, a.cardTitle][colIndex];
                            const y = [b.timestamp, b.itemName, b.quantity, b.cardTitle][colIndex];
                            return ascending
                                ? String(x).localeCompare(String(y), undefined, { numeric: true })
                                : String(y).localeCompare(String(x), undefined, { numeric: true });
                        });

                        const headers = document.querySelectorAll("th");
                        headers.forEach((th, i) => {
                            th.classList.remove("sort-asc", "sort-desc");
                            if (i === colIndex) {
                                th.classList.add(ascending ? "sort-asc" : "sort-desc");
                            }
                        });

                        renderTablePage();
                        renderSummaryTable();
                    }

                    /** ---------------- CSV export ---------------- */
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

                    /** ---------------- Summary (totals) table ---------------- */
                    function renderSummaryTable () {
                        const totals = {};
                        claimedOffers.forEach(({ itemName, quantity }) => {
                            totals[itemName] = (totals[itemName] || 0) + Number(quantity);
                        });

                        const rows = Object.entries(totals)
                            .sort((a, b) => b[1] - a[1]) // highest first
                            .map(([item, qty]) =>
                                \`<tr><td>\${item}</td><td>\${qty}</td></tr>\`
                            ).join("");

                        document.getElementById("summaryBody").innerHTML = rows;
                    }

                    /** ---------------- (Optional) Chart of top 10 ---------------- */
                    function renderChart() {
                        const counts = {};
                        claimedOffers.forEach(({ itemName }) => {
                            counts[itemName] = (counts[itemName] || 0) + 1;
                        });

                        const sortedItems = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
                        const labels = sortedItems.map(([item]) => item);
                        const data = sortedItems.map(([, count]) => count);

                        new Chart(document.getElementById('claimsChart'), {
                            type: 'bar',
                            data: {
                                labels,
                                datasets: [{
                                    label: 'Times Claimed',
                                    data
                                }]
                            },
                            options: {
                                responsive: true,
                                scales: {
                                    y: { beginAtZero: true }
                                }
                            }
                        });
                    }

                    /* -------- Initial render -------- */
                    renderTablePage();
                    renderSummaryTable();
                    // renderChart();   // uncomment if you enabled the chart section
                </script>
            </body>
            </html>`;

        document.open();
        document.write(html);
        document.close();
    }
})();

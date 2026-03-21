'use strict';

// Runs on: https://home.startrekfleetcommand.com/view-claims
// Replaces GM_getValue("claimedOffers", []) with chrome.storage.local.get (async).
// Avoids document.write() + inline <script> tags — both are blocked by extension CSP.
// All JS functions live in this content script scope; event listeners are attached directly.

chrome.storage.local.get(["claimedOffers"], (result) => {
    const claimedOffers = result.claimedOffers || [];

    // ── Replace page head ──────────────────────────────────────────────────────
    document.title = "Claimed Offers";
    document.head.innerHTML = "";

    const style = document.createElement('style');
    style.textContent = `
      body { font-family: Arial, sans-serif; padding: 20px; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
      th,td { border:1px solid #ccc; padding:8px; text-align:left; }
      th { cursor:pointer; background:#f2f2f2; }
      .sort-asc::after  { content:" ▲"; }
      .sort-desc::after { content:" ▼"; }
      button { margin:5px; padding:6px 12px; }
      #exportBtn { background:#007bff; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:14px; }
      #exportBtn:hover { background:#0056b3; }
      #dataControls { display:flex; justify-content:space-between; align-items:center; gap:2rem; }
      #statsTable,#summaryTable { border-collapse:collapse; width:100%; margin-top:10px; }
      #statsTable th,#statsTable td,#summaryTable th,#summaryTable td { border:1px solid #ccc; padding:8px; text-align:left; }
      #statsTable th,#summaryTable th { background:#f2f2f2; }
    `;
    document.head.appendChild(style);

    // ── Replace page body ──────────────────────────────────────────────────────
    document.body.innerHTML = "<h1>Claimed Offers</h1>";

    if (claimedOffers.length === 0) {
        const p = document.createElement('p');
        p.textContent = "No claimed offers found.";
        document.body.appendChild(p);
        return;
    }

    document.body.insertAdjacentHTML('beforeend', `
      <div id="dataControls">
        <button id="exportBtn">Export to CSV</button>
        <div>
          <button id="prevBtn">Previous</button>
          <span id="pageInfo"></span>
          <button id="nextBtn">Next</button>
        </div>
      </div>

      <table id="offersTable">
        <thead>
          <tr>
            <th data-col="0">Date</th>
            <th data-col="1">Item</th>
            <th data-col="2">Qty</th>
            <th data-col="3">Card</th>
          </tr>
        </thead>
        <tbody id="tableBody"></tbody>
      </table>

      <h2>Statistics</h2>
      <table id="statsTable"><tbody id="statsBody"></tbody></table>

      <h2>Totals by Item</h2>
      <table id="summaryTable">
        <thead><tr><th>Item</th><th>Total Qty</th></tr></thead>
        <tbody id="summaryBody"></tbody>
      </table>
    `);

    // ── State ──────────────────────────────────────────────────────────────────
    const rowsPerPage = 20;
    let currentPage = 1;
    let sortDir = [true, true, true, true];

    // ── Pagination ─────────────────────────────────────────────────────────────
    function renderTablePage() {
        const start = (currentPage - 1) * rowsPerPage, end = start + rowsPerPage;
        document.getElementById("tableBody").innerHTML = claimedOffers.slice(start, end).map(c =>
            `<tr><td>${c.timestamp}</td><td>${c.itemName}</td><td>${c.quantity}</td><td>${c.cardTitle}</td></tr>`
        ).join("");

        const pages = Math.ceil(claimedOffers.length / rowsPerPage) || 1;
        document.getElementById("pageInfo").textContent = `Page ${currentPage} of ${pages}`;
        document.getElementById("prevBtn").disabled = currentPage === 1;
        document.getElementById("nextBtn").disabled = currentPage === pages;
    }

    // ── Sorting ────────────────────────────────────────────────────────────────
    function sortTable(col) {
        const asc = sortDir[col]; sortDir[col] = !asc;
        claimedOffers.sort((a, b) => {
            const X = [a.timestamp, a.itemName, a.quantity, a.cardTitle][col];
            const Y = [b.timestamp, b.itemName, b.quantity, b.cardTitle][col];
            return asc ? String(X).localeCompare(String(Y), undefined, { numeric: true })
                       : String(Y).localeCompare(String(X), undefined, { numeric: true });
        });
        document.querySelectorAll("th[data-col]").forEach((th, i) => {
            th.classList.toggle("sort-asc",  i === col && asc);
            th.classList.toggle("sort-desc", i === col && !asc);
        });
        renderTablePage(); renderSummary(); renderStats();
    }

    // ── CSV export ─────────────────────────────────────────────────────────────
    function exportToCSV() {
        const rows = [
            ["Timestamp", "Item Name", "Quantity", "Card Title"],
            ...claimedOffers.map(c => [c.timestamp, c.itemName, c.quantity, c.cardTitle])
        ];
        const csv = rows.map(r => r.map(f => '"' + String(f).replace(/"/g, '""') + '"').join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "stfc_claimed_offers.csv";
        link.click();
    }

    // ── Totals by item ─────────────────────────────────────────────────────────
    function renderSummary() {
        const totals = {};
        claimedOffers.forEach(({ itemName, quantity }) =>
            totals[itemName] = (totals[itemName] || 0) + Number(quantity)
        );
        document.getElementById("summaryBody").innerHTML = Object.entries(totals)
            .sort((a, b) => b[1] - a[1])
            .map(([item, qty]) => `<tr><td>${item}</td><td>${qty}</td></tr>`).join("");
    }

    // ── Statistics ─────────────────────────────────────────────────────────────
    function renderStats() {
        const totalClaims = claimedOffers.length;
        const totalItems  = claimedOffers.reduce((s, { quantity }) => s + Number(quantity), 0);
        const days        = new Set(claimedOffers.map(c => new Date(c.timestamp).toLocaleDateString('en-US'))).size;
        document.getElementById("statsBody").innerHTML = `
          <tr><td>Total Items</td><td>${totalItems.toLocaleString('en-US')}</td></tr>
          <tr><td>Number of Chest Claimed</td><td>${totalClaims.toLocaleString('en-US')}</td></tr>
          <tr><td>Number of Days Tracked</td><td>${days.toLocaleString('en-US')}</td></tr>`;
    }

    // ── Event listeners (replaces inline onclick="...") ────────────────────────
    document.getElementById("exportBtn").addEventListener("click", exportToCSV);
    document.getElementById("prevBtn").addEventListener("click", () => {
        if (currentPage > 1) { currentPage--; renderTablePage(); }
    });
    document.getElementById("nextBtn").addEventListener("click", () => {
        const max = Math.ceil(claimedOffers.length / rowsPerPage);
        if (currentPage < max) { currentPage++; renderTablePage(); }
    });
    document.querySelectorAll("th[data-col]").forEach(th => {
        th.addEventListener("click", () => sortTable(parseInt(th.dataset.col)));
    });

    // ── Initial render ─────────────────────────────────────────────────────────
    renderTablePage();
    renderSummary();
    renderStats();
});

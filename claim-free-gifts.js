// ==UserScript==
// @name         STFC Claim and View Offers
// @namespace    https://mindblender.dev/stfc
// @version      v1.9.2
// @description  Auto-claims free offers and provides a view page with sortable, paginated table, per-item totals table, statistics (total claims & days tracked), comma-formatted grand total, CSV export, and optional chart.
// @author       Mindblender
// @match        https://home.startrekfleetcommand.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
    'use strict';

    const currentPath = window.location.pathname;

    /* ──────────────────────────────────────────────────────────────────────────
       CLAIM OFFERS
       ─────────────────────────────────────────────────────────────────────── */
    if (currentPath === "/store") {

        const findAndClickWebGiftButton = () => {
            const btn = document.getElementById('store-web-gift-tab-button');
            if (btn) setTimeout(() => btn.click(), 2000);
        };

        const claimDialog = (cardTitle, timestamp) => {
            setTimeout(() => {
                const confirmBtn = document.querySelector('button.WP-OfferDetailsModal-confirmButton:not([disabled])');
                const itemEls   = document.querySelectorAll('.WP-OfferDetailsModalItem-title pre');
                const qtyEls    = document.querySelectorAll('.WP-OfferDetailsModal-itemCount');

                const newClaims = Array.from(itemEls).map((el, i) => ({
                    cardTitle,
                    itemName : el ? el.textContent.trim() : "Unknown Item",
                    quantity : parseInt((qtyEls[i]?.textContent.trim() ?? "x0").replace(/^x/, '')) || 0,
                    timestamp
                }));

                const existing = GM_getValue("claimedOffers", []);
                const timeMS   = Date.parse(timestamp);

                const unique = newClaims.filter(nc =>
                    !existing.some(ec =>
                        ec.cardTitle === nc.cardTitle &&
                        ec.itemName  === nc.itemName  &&
                        Math.abs(Date.parse(ec.timestamp) - timeMS) <= 5000)
                );

                if (unique.length) {
                    GM_setValue("claimedOffers", existing.concat(unique));
                    console.log("✅ Saved offers:", unique);
                }
                setTimeout(() => confirmBtn?.click(), 2000);
            }, 2000);
        };

        const findClaimButtons = () => {
            const claimBtns = Array.from(
                document.querySelectorAll('button.WP-Offer-price-btn:not([disabled])')
            ).filter(btn => btn.querySelector('p')?.textContent.trim() === "Claim");

            claimBtns.forEach((btn, idx) => setTimeout(() => {
                const wrapper   = btn.closest('[name="web-gift-item-div"]');
                const cardTitle = wrapper?.querySelector('p.bold.Inter.break')?.textContent.trim() || "Unknown Offer";
                const timestamp = new Date().toLocaleString('en-US', {
                    hour:'numeric', minute:'2-digit', second:'2-digit',
                    hour12:true, month:'short', day:'numeric', year:'numeric'
                });

                btn.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true }));
                btn.disabled = true;
                claimDialog(cardTitle, timestamp);
            }, 3000 * (idx + 1)));
        };

        new MutationObserver(muts => {
            if (muts.some(m => m.addedNodes.length)) {
                findClaimButtons();
                findAndClickWebGiftButton();
            }
        }).observe(document.body, { childList:true, subtree:true });

        findClaimButtons();
        findAndClickWebGiftButton();
    }

    /* ──────────────────────────────────────────────────────────────────────────
       VIEW CLAIMED OFFERS
       ─────────────────────────────────────────────────────────────────────── */
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
    th { cursor: pointer; background: #f2f2f2; }
    .sort-asc::after  { content: " ▲"; }
    .sort-desc::after { content: " ▼"; }
    button { margin: 5px; padding: 6px 12px; }
    #exportBtn {
      background: #007bff; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:14px;
    }
    #exportBtn:hover { background:#0056b3; }
    #dataControls { display:flex; justify-content:space-between; align-items:center; gap:2rem; }
    #chartContainer { max-width:800px; margin:30px auto; }

    /* Totals-by-item and statistics tables */
    #summaryTable, #statsTable {
      border-collapse: collapse;
      width: 100%;
      margin-top: 10px;
    }
    #summaryTable th, #summaryTable td,
    #statsTable   th, #statsTable   td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: left;
    }
    #summaryTable th, #statsTable th { background:#f2f2f2; }
  </style>
</head>
<body>
  <h1>Claimed Offers</h1>
  ${claimedOffers.length === 0
        ? '<p>No claimed offers found.</p>'
        : `
    <div id="dataControls">
      <button id="exportBtn" onclick="exportToCSV()">Export to CSV</button>
      <div>
        <span id="totalItems" style="margin-right:10px;"></span>
        <button id="prevBtn" onclick="prevPage()">Previous</button>
        <span id="pageInfo"></span>
        <button id="nextBtn" onclick="nextPage()">Next</button>
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

    <!-- Optional chart
    <div id="chartContainer">
      <h2>Most Frequently Claimed Items</h2>
      <canvas id="claimsChart" width="800" height="400"></canvas>
    </div>
    -->

    <h2>Statistics</h2>
    <table id="statsTable">
      <tbody id="statsBody"></tbody>
    </table>

    <h2>Totals by Item</h2>
    <table id="summaryTable">
      <thead><tr><th>Item</th><th>Total Qty</th></tr></thead>
      <tbody id="summaryBody"></tbody>
    </table>
  `}
<script>
  const claimedOffers = ${JSON.stringify(claimedOffers)};
  const rowsPerPage   = 20;
  let currentPage     = 1;
  let sortDirection   = [true,true,true,true];

  /* ────────── Pagination & Nav buttons ────────── */
  function renderTablePage(){
    const start = (currentPage-1)*rowsPerPage;
    const page  = claimedOffers.slice(start, start+rowsPerPage);

    document.getElementById("tableBody").innerHTML = page.map(c=>\`
      <tr><td>\${c.timestamp}</td><td>\${c.itemName}</td><td>\${c.quantity}</td><td>\${c.cardTitle}</td></tr>\`
    ).join("");

    const totalPages = Math.ceil(claimedOffers.length/rowsPerPage) || 1;
    document.getElementById("pageInfo").textContent = \`Page \${currentPage} of \${totalPages}\`;
    document.getElementById("prevBtn").disabled = currentPage===1;
    document.getElementById("nextBtn").disabled = currentPage===totalPages;
  }
  const prevPage = ()=>{ if(currentPage>1){ currentPage--; renderTablePage(); } };
  const nextPage = ()=>{ const max=Math.ceil(claimedOffers.length/rowsPerPage); if(currentPage<max){ currentPage++; renderTablePage(); } };

  /* ────────── Column sorting ────────── */
  function sortTable(col){
    const asc = sortDirection[col]; sortDirection[col]=!asc;
    claimedOffers.sort((a,b)=>{
      const X=[a.timestamp,a.itemName,a.quantity,a.cardTitle][col];
      const Y=[b.timestamp,b.itemName,b.quantity,b.cardTitle][col];
      return asc ? String(X).localeCompare(String(Y),undefined,{numeric:true})
                 : String(Y).localeCompare(String(X),undefined,{numeric:true});
    });
    document.querySelectorAll("th").forEach((th,i)=>{
      th.classList.remove("sort-asc","sort-desc");
      if(i===col) th.classList.add(asc?"sort-asc":"sort-desc");
    });
    renderTablePage(); renderSummaryTable(); renderTotalItems();
  }

  /* ────────── CSV export ────────── */
  function exportToCSV(){
    const rows=[["Timestamp","Item Name","Quantity","Card Title"], ...claimedOffers.map(c=>[c.timestamp,c.itemName,c.quantity,c.cardTitle])];
    const csv=rows.map(r=>r.map(f=>'"'+String(f).replace(/"/g,'""')+'"').join(",")).join("\\n");
    const blob=new Blob([csv],{type:"text/csv"}), link=document.createElement("a");
    link.href=URL.createObjectURL(blob); link.download="stfc_claimed_offers.csv"; link.click();
  }

  /* ────────── Totals-by-item table ────────── */
  function renderSummaryTable(){
    const totals={};
    claimedOffers.forEach(({itemName,quantity})=>totals[itemName]=(totals[itemName]||0)+Number(quantity));
    document.getElementById("summaryBody").innerHTML = Object.entries(totals)
      .sort((a,b)=>b[1]-a[1])
      .map(([item,qty])=>\`<tr><td>\${item}</td><td>\${qty}</td></tr>\`).join("");
  }

  /* ────────── Statistics table ────────── */
  function renderStatsTable(){
    const totalClaims = claimedOffers.length;
    const uniqueDays  = new Set(
      claimedOffers.map(c => new Date(c.timestamp).toLocaleDateString('en-US'))
    ).size;
    document.getElementById("statsBody").innerHTML = \`
      <tr><td>Number of Chest Claims</td><td>\${totalClaims.toLocaleString('en-US')}</td></tr>
      <tr><td>Number of Days Tracked</td><td>\${uniqueDays.toLocaleString('en-US')}</td></tr>
    \`;
  }

  /* ────────── Overall total-items counter ────────── */
  function renderTotalItems(){
    const total = claimedOffers.reduce((sum,{quantity})=>sum+Number(quantity),0);
    document.getElementById("totalItems").textContent = "Total Items: " + total.toLocaleString('en-US');
  }

  /* ────────── (Optional) Top-10 chart ────────── */
  function renderChart(){
    const counts={}; claimedOffers.forEach(({itemName})=>counts[itemName]=(counts[itemName]||0)+1);
    const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10);
    new Chart(document.getElementById('claimsChart'),{
      type:'bar',
      data:{ labels:top.map(t=>t[0]), datasets:[{label:'Times Claimed', data:top.map(t=>t[1])}] },
      options:{ responsive:true, scales:{ y:{beginAtZero:true} } }
    });
  }

  /* ────────── Initial render ────────── */
  if (claimedOffers.length){
    renderTablePage();
    renderSummaryTable();
    renderStatsTable();
    renderTotalItems();
    // renderChart(); // uncomment if chart section is present
  }
</script>
</body>
</html>`;

        document.open();
        document.write(html);
        document.close();
    }
})();

// ==UserScript==
// @name         STFC Claim and View Offers
// @namespace    https://mindblender.dev/stfc
// @version      v1.9.5
// @description  Auto-claims free offers and shows a view page with sortable, paginated table, per-item totals, full statistics (total items, chest claims, days tracked), CSV export, and optional chart.
// @author       Mindblender
// @match        https://home.startrekfleetcommand.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
    'use strict';

    const currentPath = window.location.pathname;

    /* ──────────────────────────────────  CLAIM OFFERS  ────────────────────────────────── */
    if (currentPath === "/store") {

        const clickWebGiftTab = () => {
            const btn = document.getElementById('store-web-gift-tab-button');
            if (btn) setTimeout(() => btn.click(), 2000);
        };

        const claimDialog = () => {
            setTimeout(() => {
                // Support both new MuiDialog structure and legacy WP-OfferDetailsModal structure
                const confirm = document.querySelector('.MuiDialogActions-root button')
                             || document.querySelector('button.WP-OfferDetailsModal-confirmButton:not([disabled])');

                // Logging disabled — new dialog no longer exposes item details
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
    }

    /* ──────────────────────────────────  VIEW CLAIMS  ─────────────────────────────────── */
    else if (currentPath.startsWith("/view-claims")) {

        const claimedOffers = GM_getValue("claimedOffers", []);
        console.log("🔍 Offers:", claimedOffers);

        const html = `
<html>
<head>
<title>Claimed Offers</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  body { font-family: Arial, sans-serif; padding: 20px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
  th,td { border:1px solid #ccc; padding:8px; text-align:left; }
  th { cursor:pointer; background:#f2f2f2; }
  .sort-asc::after  { content:" ▲"; }
  .sort-desc::after { content:" ▼"; }
  button { margin:5px; padding:6px 12px; }
  #exportBtn{ background:#007bff; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:14px;}
  #exportBtn:hover{ background:#0056b3; }
  #dataControls{ display:flex; justify-content:space-between; align-items:center; gap:2rem; }
  #chartContainer{ max-width:800px; margin:30px auto; }

  /* Statistics & totals tables */
  #statsTable,#summaryTable{ border-collapse:collapse; width:100%; margin-top:10px; }
  #statsTable th,#statsTable td,#summaryTable th,#summaryTable td{ border:1px solid #ccc; padding:8px; text-align:left; }
  #statsTable th,#summaryTable th{ background:#f2f2f2; }
</style>
</head>
<body>
<h1>Claimed Offers</h1>
${claimedOffers.length===0?'<p>No claimed offers found.</p>':`
  <div id="dataControls">
    <button id="exportBtn" onclick="exportToCSV()">Export to CSV</button>
    <div>
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
  <table id="statsTable"><tbody id="statsBody"></tbody></table>

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
  let sortDir         = [true,true,true,true];

  /* -------- Pagination -------- */
  function renderTablePage(){
    const start=(currentPage-1)*rowsPerPage, end=start+rowsPerPage;
    document.getElementById("tableBody").innerHTML = claimedOffers.slice(start,end).map(c=>\`
      <tr><td>\${c.timestamp}</td><td>\${c.itemName}</td><td>\${c.quantity}</td><td>\${c.cardTitle}</td></tr>\`).join("");

    const pages=Math.ceil(claimedOffers.length/rowsPerPage)||1;
    document.getElementById("pageInfo").textContent=\`Page \${currentPage} of \${pages}\`;
    document.getElementById("prevBtn").disabled = currentPage===1;
    document.getElementById("nextBtn").disabled = currentPage===pages;
  }
  const prevPage=()=>{if(currentPage>1){currentPage--;renderTablePage();}};
  const nextPage=()=>{const max=Math.ceil(claimedOffers.length/rowsPerPage);if(currentPage<max){currentPage++;renderTablePage();}};

  /* -------- Sorting -------- */
  function sortTable(col){
    const asc=sortDir[col]; sortDir[col]=!asc;
    claimedOffers.sort((a,b)=>{
      const X=[a.timestamp,a.itemName,a.quantity,a.cardTitle][col];
      const Y=[b.timestamp,b.itemName,b.quantity,b.cardTitle][col];
      return asc?String(X).localeCompare(String(Y),undefined,{numeric:true})
                :String(Y).localeCompare(String(X),undefined,{numeric:true});
    });
    document.querySelectorAll("th").forEach((th,i)=>{
      th.classList.toggle("sort-asc", i===col&&asc);
      th.classList.toggle("sort-desc",i===col&&!asc);
    });
    renderTablePage(); renderSummary(); renderStats();
  }

  /* -------- CSV export -------- */
  function exportToCSV(){
    const rows=[["Timestamp","Item Name","Quantity","Card Title"], ...claimedOffers.map(c=>[c.timestamp,c.itemName,c.quantity,c.cardTitle])];
    const csv=rows.map(r=>r.map(f=>'"'+String(f).replace(/"/g,'""')+'"').join(",")).join("\\n");
    const blob=new Blob([csv],{type:"text/csv"}), link=document.createElement("a");
    link.href=URL.createObjectURL(blob); link.download="stfc_claimed_offers.csv"; link.click();
  }

  /* -------- Totals-by-item -------- */
  function renderSummary(){
    const totals={};
    claimedOffers.forEach(({itemName,quantity})=>totals[itemName]=(totals[itemName]||0)+Number(quantity));
    document.getElementById("summaryBody").innerHTML=Object.entries(totals)
      .sort((a,b)=>b[1]-a[1])
      .map(([item,qty])=>\`<tr><td>\${item}</td><td>\${qty}</td></tr>\`).join("");
  }

  /* -------- Statistics -------- */
  function renderStats(){
    const totalClaims = claimedOffers.length;
    const totalItems  = claimedOffers.reduce((s,{quantity})=>s+Number(quantity),0);
    const days        = new Set(claimedOffers.map(c=>new Date(c.timestamp).toLocaleDateString('en-US'))).size;
    document.getElementById("statsBody").innerHTML=\`
      <tr><td>Total Items</td><td>\${totalItems.toLocaleString('en-US')}</td></tr>
      <tr><td>Number of Chest Claimed</td><td>\${totalClaims.toLocaleString('en-US')}</td></tr>
      <tr><td>Number of Days Tracked</td><td>\${days.toLocaleString('en-US')}</td></tr>\`;
  }

  /* -------- Optional chart -------- */
  function renderChart(){
    const counts={}; claimedOffers.forEach(({itemName})=>counts[itemName]=(counts[itemName]||0)+1);
    const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10);
    new Chart(document.getElementById('claimsChart'),{
      type:'bar',
      data:{ labels:top.map(t=>t[0]), datasets:[{label:'Times Claimed', data:top.map(t=>t[1])}] },
      options:{responsive:true, scales:{y:{beginAtZero:true}} }
    });
  }

  /* -------- Initial render -------- */
  if(claimedOffers.length){
    renderTablePage(); renderSummary(); renderStats();
    // renderChart();
  }
</script>
</body>
</html>`;
        document.open(); document.write(html); document.close();
    }
})();

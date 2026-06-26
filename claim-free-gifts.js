// ==UserScript==
// @name         STFC Claim and View Offers
// @namespace    https://mindblender.dev/stfc
// @version      v1.9.6-fix-auto-claim-feature-20260626-0142
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

        const log = (...args) => console.log('[STFC]', ...args);

        // Click the Web Gifts tab if it isn't active yet. Uses a timer guard to avoid
        // rapid re-clicks, but retries on each mutation until the tab is actually active.
        let tabClickTimer = null;
        const clickWebGiftTab = () => {
            const btn = document.getElementById('store-web-gift-tab-button');
            if (!btn || btn.classList.contains('active') || tabClickTimer) return;
            log('Web Gifts tab not active — scheduling click');
            tabClickTimer = setTimeout(() => {
                tabClickTimer = null;
                const b = document.getElementById('store-web-gift-tab-button');
                if (b && !b.classList.contains('active')) { log('Clicking Web Gifts tab'); b.click(); }
            }, 2000);
        };

        // Uses MutationObserver (not throttled in background/minimized tabs) to detect
        // the confirm dialog appearing and then closing, so claiming works even when the
        // browser window is not focused or the OS focus is on a native application.
        const claimDialog = () => new Promise(resolve => {
            const confirmSel = '.MuiDialogActions-root button, button.WP-OfferDetailsModal-confirmButton:not([disabled])';
            const openSel    = '.MuiDialogActions-root, .WP-OfferDetailsModal';

            const clickAndWaitClose = (confirmBtn) => {
                log('Dialog found — clicking confirm');
                confirmBtn.click();
                const closeObs = new MutationObserver(() => {
                    if (!document.querySelector(openSel)) {
                        clearTimeout(closeTimer);
                        log('Dialog closed — moving to next claim');
                        closeObs.disconnect(); resolve();
                    }
                });
                closeObs.observe(document.body, { childList: true, subtree: true });
                const closeTimer = setTimeout(() => { log('Dialog close timed out (30s) — moving on'); closeObs.disconnect(); resolve(); }, 30000);
            };

            // Dialog may already be open (e.g. script was throttled during the click)
            const existing = document.querySelector(confirmSel);
            if (existing) { log('Dialog already open'); clickAndWaitClose(existing); return; }

            log('Waiting for confirm dialog to appear...');
            // Otherwise observe for it to appear
            const openObs = new MutationObserver(() => {
                const btn = document.querySelector(confirmSel);
                if (btn) { clearTimeout(openTimer); openObs.disconnect(); clickAndWaitClose(btn); }
            });
            openObs.observe(document.body, { childList: true, subtree: true });
            const openTimer = setTimeout(() => { log('No dialog appeared after 30s — moving on'); openObs.disconnect(); resolve(); }, 30000);
        });

        const findClaimButtons = () =>
            Array.from(document.querySelectorAll('button.WP-Offer-price-btn:not([disabled])'))
                .filter(b => b.textContent.trim() === "Claim");

        let isClaiming = false;
        const processClaims = async () => {
            if (isClaiming) return;
            isClaiming = true;
            log('Starting claim run');
            let count = 0, btn;
            // Re-query after each claim so we always get fresh DOM references.
            // The page re-renders the offer list after each claim, which invalidates
            // any previously captured button elements.
            while ((btn = findClaimButtons()[0])) {
                count++;
                log(`Claim ${count}: clicking`);
                btn.disabled = true;
                btn.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true }));
                await claimDialog();
                log(`Claim ${count}: done`);
            }
            log(`Claim run complete — ${count} item(s) claimed`);
            isClaiming = false;
        };

        // Only schedule claims once the Web Gifts tab is active (has the 'active' class)
        // and claim buttons are present, then wait 2s after the last mutation to settle.
        const isWebGiftsTabActive = () =>
            document.getElementById('store-web-gift-tab-button')?.classList.contains('active') ?? false;

        let claimTimer = null;
        const scheduleClaims = () => {
            if (!isWebGiftsTabActive()) return;
            if (!findClaimButtons().length) return;
            clearTimeout(claimTimer);
            claimTimer = setTimeout(() => { if (!isClaiming) processClaims(); }, 2000);
        };

        // Re-trigger when the tab/window comes back into focus after being minimized
        // or when the OS focus returns from a native application.
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) scheduleClaims();
        });

        new MutationObserver(muts => {
            if (muts.some(m => m.addedNodes.length)) { scheduleClaims(); clickWebGiftTab(); }
        }).observe(document.body, { childList:true, subtree:true });

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

/**
 * storage.js
 *
 * All data persistence goes through this file.
 *
 * Three layers, in priority order on load:
 *   1. fetch('./portfolio-data.json') — auto-loads if the file sits next to index.html
 *      (works on GitHub Pages and any local server). Save the exported JSON as
 *      "portfolio-data.json" in the same folder and refresh — it loads automatically.
 *   2. localStorage                  — fallback / live session cache
 *   3. blank scaffold                — first-ever visit
 *
 * Exports:
 *   loadPortfolioFromServer()  → Promise<data>  tries fetch first, then localStorage
 *   savePortfolio(data)        → writes to localStorage (and updates in-memory copy)
 *   loadFXRates()              → { TWD, IDR } from localStorage or CONFIG defaults
 *   saveFXRates(twd, idr)      → persists FX rates to localStorage
 *   exportJSON()               → triggers browser download of portfolio-data.json
 *   importJSON()               → reads a user-selected .json file and reloads the app
 *   exportExcel()              → triggers browser download of portfolio.xlsx
 */

const FX_STORAGE_KEY = 'portfolio_fx_rates';

/* ─── Core read/write ─── */

function _blankData() {
  return { stocks: [], emergency: [], retirement: [] };
}

function loadPortfolio() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('localStorage read failed:', e);
  }
  return _blankData();
}

function savePortfolio(data) {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('localStorage write failed:', e);
  }
}

/**
 * Primary load function used by app.js init().
 * Tries to fetch portfolio-data.json from the same directory first.
 * Falls back to localStorage, then blank data.
 * Returns a Promise<data>.
 */
async function loadPortfolioFromServer() {
  try {
    const res = await fetch('./portfolio-data.json', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      // Validate minimal shape
      if (data && Array.isArray(data.stocks)) {
        console.info('Loaded portfolio from portfolio-data.json');
        // Mirror into localStorage so edits persist between refreshes
        savePortfolio(data);
        return data;
      }
    }
  } catch (e) {
    // fetch failed (file not found, CORS, network) — fall through silently
  }
  // Fallback to localStorage
  return loadPortfolio();
}

/* ─── FX rates ─── */

function loadFXRates() {
  try {
    const raw = localStorage.getItem(FX_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { TWD: CONFIG.DEFAULT_FX.TWD, IDR: CONFIG.DEFAULT_FX.IDR };
}

function saveFXRates(twd, idr) {
  try {
    localStorage.setItem(FX_STORAGE_KEY, JSON.stringify({ TWD: twd, IDR: idr }));
  } catch (e) {
    console.warn('Could not save FX rates:', e);
  }
}

/* ─── JSON export ─── */

function exportJSON() {
  const payload = JSON.stringify(appData, null, 2);
  const blob    = new Blob([payload], { type: 'application/json' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href        = url;
  a.download    = 'portfolio-data.json';
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── JSON import ─── */

/**
 * Called by the file input's change event (wired in app.js).
 * Reads the selected .json file, validates it, saves it, and re-renders.
 */
function importJSON() {
  const input = document.getElementById('import-file-input');
  if (!input || !input.files[0]) return;
  const file   = input.files[0];
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data || !Array.isArray(data.stocks)) {
        alert('Invalid portfolio file — missing stocks array.');
        return;
      }
      data.emergency  = data.emergency  || [];
      data.retirement = data.retirement || [];
      savePortfolio(data);
      appData = data;
      renderStocks(appData.stocks);
      renderSection('emergency',  appData.emergency);
      renderSection('retirement', appData.retirement);
      updateDashboard(appData);
      updateAllCharts(appData.stocks);
      alert('Portfolio imported successfully.');
    } catch (err) {
      alert('Could not parse file: ' + err.message);
    }
    input.value = ''; // reset so same file can be re-imported
  };
  reader.readAsText(file);
}

/* ─── Excel export ─── */

function exportExcel() {
  if (typeof XLSX === 'undefined') {
    alert('Excel library not loaded yet — please wait a moment and try again.');
    return;
  }

  const wb = XLSX.utils.book_new();

  /* Stocks sheet — one combined sheet with a Market column */
  const stockRows = [['Market', 'Name/Ticker', 'Date', 'Units', 'Buy Price', 'Current Price', 'Currency', 'Value (USD)', 'G/L ($)', 'G/L (%)']];
  appData.stocks.forEach(r => {
    const val = rowValueUSD('stocks', r);
    const gl  = rowGainLoss(r);
    stockRows.push([
      r.market || 'US',
      r.col1 || '',
      r.col2 || '',
      parseFloat(r.col3) || '',
      parseFloat(r.col4) || '',
      parseFloat(r.col5) || '',
      r.currency || 'USD',
      Math.round(val),
      gl ? Math.round(gl.diff) : '',
      gl ? parseFloat(gl.pct.toFixed(2)) : '',
    ]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(stockRows), 'Stocks');

  /* Emergency Fund sheet */
  const emergencyRows = [['Date', 'Amount', 'Currency', 'Value (USD)']];
  appData.emergency.forEach(r => {
    emergencyRows.push([
      r.col1 || '',
      parseFloat(r.col4) || '',
      r.currency || 'USD',
      Math.round(rowValueUSD('emergency', r)),
    ]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(emergencyRows), 'Emergency Fund');

  /* Retirement sheet */
  const retirementRows = [['Date', 'Provider', 'Balance', 'Currency', 'Value (USD)']];
  appData.retirement.forEach(r => {
    retirementRows.push([
      r.col1 || '',
      r.col2 || '',
      parseFloat(r.col4) || '',
      r.currency || 'USD',
      Math.round(rowValueUSD('retirement', r)),
    ]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(retirementRows), 'Retirement');

  /* Summary sheet */
  const gains = calcPortfolioGains(appData.stocks);
  const summaryRows = [
    ['Category', 'Value (USD)'],
    ['Stocks — US',        Math.round(gains.byMarket.US.value)],
    ['Stocks — TW',        Math.round(gains.byMarket.TW.value)],
    ['Stocks — ID',        Math.round(gains.byMarket.ID.value)],
    ['Emergency Fund',     Math.round(appData.emergency.reduce((s,r)=>s+rowValueUSD('emergency',r),0))],
    ['Retirement',         Math.round(appData.retirement.reduce((s,r)=>s+rowValueUSD('retirement',r),0))],
    [],
    ['Cost Basis (Stocks)',    Math.round(gains.total.cost)],
    ['Current Value (Stocks)', Math.round(gains.total.value)],
    ['G/L $',              Math.round(gains.total.diff)],
    ['G/L %',              parseFloat(gains.total.pct.toFixed(2))],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');

  XLSX.writeFile(wb, 'portfolio.xlsx');
}

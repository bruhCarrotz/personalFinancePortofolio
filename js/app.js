/**
 * app.js
 *
 * Entry point. Loaded last so all other scripts are already defined.
 *
 * Responsibilities:
 *   1. Load saved data from localStorage
 *   2. Do the initial render of all three sections
 *   3. Wire up the FX input listeners so changing a rate
 *      immediately re-renders all USD values
 *   4. Expose addRow() globally so the HTML onclick= buttons work
 *   5. Set the "last updated" timestamp in the header
 *
 * This file should stay thin — no business logic here.
 * If you find yourself writing math or DOM manipulation here,
 * move it to calculator.js or renderer.js instead.
 */

/** Shared mutable state — the single source of truth in memory. */
let appData = {};

/** Called by the "+ Add" buttons in index.html */
function addRow(sectionKey, market) {
  if (sectionKey === 'stocks') {
    appData.stocks.push({ col1: '', col2: '', col3: '', col4: '', col5: '', currency: 'USD', market: market || 'US' });
    savePortfolio(appData);
    renderStocks(appData.stocks);
    updateDashboard(appData);
    updateAllCharts(appData.stocks);
  } else {
    appData[sectionKey].push({ col1: '', col2: '', col3: '', col4: '', currency: 'USD' });
    savePortfolio(appData);
    renderSection(sectionKey, appData[sectionKey]);
    updateDashboard(appData);
  }
}

/** Re-render every section's USD cells after an FX rate change */
function onFXChange() {
  const twd = parseFloat(document.getElementById('fx-twd').value);
  const idr = parseFloat(document.getElementById('fx-idr').value);
  saveFXRates(twd, idr);
  renderStocks(appData.stocks);
  renderSection('emergency',  appData.emergency);
  renderSection('retirement', appData.retirement);
  updateDashboard(appData);
  updateAllCharts(appData.stocks);
}

/** Initialise everything */
function init() {
  // 1. Load and apply saved FX rates
  const savedFX = loadFXRates();
  document.getElementById('fx-twd').value = savedFX.TWD;
  document.getElementById('fx-idr').value = savedFX.IDR;

  // 2. Load portfolio data
  appData = loadPortfolio();

  // 3. Render all sections
  renderStocks(appData.stocks);
  renderSection('emergency',  appData.emergency);
  renderSection('retirement', appData.retirement);

  // 4. Compute initial dashboard totals
  updateDashboard(appData);

  // 5. Init and populate all charts
  initAllCharts();
  updateAllCharts(appData.stocks);

  // 6. Wire FX inputs
  document.getElementById('fx-twd').addEventListener('input', onFXChange);
  document.getElementById('fx-idr').addEventListener('input', onFXChange);

  // 7. Timestamp
  document.getElementById('last-updated').textContent =
    'Updated ' + new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
}

document.addEventListener('DOMContentLoaded', init);
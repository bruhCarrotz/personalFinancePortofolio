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

/** Called by the "+ Add holding / + Add account" buttons in index.html */
function addRow(sectionKey) {
  appData[sectionKey].push({
    col1: '', col2: '', col3: '', col4: '0', currency: 'USD',
  });
  savePortfolio(appData);
  renderSection(sectionKey, appData[sectionKey]);
  updateDashboard(appData);
}

/** Re-render every section's USD cells after an FX rate change */
function onFXChange() {
  Object.keys(CONFIG.SECTIONS).forEach(sectionKey => {
    renderSection(sectionKey, appData[sectionKey]);
  });
  updateDashboard(appData);
}

/** Initialise everything */
function init() {
  // 1. Load data
  appData = loadPortfolio();

  // 2. Render all sections
  Object.keys(CONFIG.SECTIONS).forEach(sectionKey => {
    renderSection(sectionKey, appData[sectionKey]);
  });

  // 3. Compute initial dashboard totals
  updateDashboard(appData);

  // 4. Wire FX inputs
  document.getElementById('fx-twd').addEventListener('input', onFXChange);
  document.getElementById('fx-idr').addEventListener('input', onFXChange);

  // 5. Timestamp
  document.getElementById('last-updated').textContent =
    'Updated ' + new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
}

document.addEventListener('DOMContentLoaded', init);

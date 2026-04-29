/**
 * storage.js
 *
 * All read/write to localStorage goes through this file.
 * The rest of the app never calls localStorage directly.
 *
 * Exports two functions:
 *   loadPortfolio()  → returns the saved data object, or a blank default
 *   savePortfolio(data) → persists the full data object
 *
 * Data shape stored in localStorage:
 * {
 *   stocks:    [ { col1, col2, col3, col4, currency }, ... ],
 *   emergency: [ { col1, col2, col3, col4, currency }, ... ],
 *   retirement:[ { col1, col2, col3, col4, currency }, ... ],
 * }
 */

function loadPortfolio() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not load portfolio from localStorage:', e);
  }
  // Return empty scaffold if nothing saved yet
  return { stocks: [], emergency: [], retirement: [] };
}

function savePortfolio(data) {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save portfolio to localStorage:', e);
  }
}

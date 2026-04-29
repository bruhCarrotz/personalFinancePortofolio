/**
 * storage.js
 *
 * All read/write to localStorage goes through this file.
 *
 * Exports:
 *   loadPortfolio()        → returns saved portfolio rows, or blank default
 *   savePortfolio(data)    → persists portfolio rows
 *   loadFXRates()          → returns saved { TWD, IDR } rates, or CONFIG defaults
 *   saveFXRates(twd, idr)  → persists the current FX rate inputs
 */

const FX_STORAGE_KEY = 'portfolio_fx_rates';

function loadPortfolio() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not load portfolio from localStorage:', e);
  }
  return { stocks: [], emergency: [], retirement: [] };
}

function savePortfolio(data) {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save portfolio to localStorage:', e);
  }
}

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
/**
 * fx.js
 *
 * Handles currency conversion and live rate fetching.
 *
 * Live rates source: @fawazahmed0/currency-api via jsDelivr CDN
 *   - Fully open, no API key, explicit CORS support
 *   - Updated daily
 *   - URL: https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json
 *   - Fallback: https://latest.currency-api.pages.dev/v1/currencies/usd.json
 *
 * Exports:
 *   getFXRates()                   → { USD:1, TWD:0.031, IDR:0.000062 }
 *   convertToUSD(amount, currency) → number in USD
 *   refreshFXRates()               → async, fetches live rates and re-renders
 */

function getFXRates() {
  const twdPerUsd = parseFloat(document.getElementById('fx-twd').value) || CONFIG.DEFAULT_FX.TWD;
  const idrPerUsd = parseFloat(document.getElementById('fx-idr').value) || CONFIG.DEFAULT_FX.IDR;
  return {
    USD: 1,
    TWD: 1 / twdPerUsd,
    IDR: 1 / idrPerUsd,
  };
}

function convertToUSD(amount, currency) {
  const rates = getFXRates();
  const rate  = rates[currency] ?? 1;
  return parseFloat(amount || 0) * rate;
}

async function refreshFXRates() {
  const btn      = document.getElementById('btn-refresh-fx');
  const statusEl = document.getElementById('fx-refresh-status');

  function setStatus(msg, color = 'var(--muted)') {
    if (statusEl) { statusEl.textContent = msg; statusEl.style.color = color; }
  }

  if (btn) { btn.disabled = true; btn.textContent = '⟳'; }
  setStatus('Fetching…');

  // Two mirrors of the same dataset — try in order
  const ENDPOINTS = [
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
    'https://latest.currency-api.pages.dev/v1/currencies/usd.json',
  ];

  let twd = null, idr = null;

  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Response shape: { "date": "...", "usd": { "twd": 32.5, "idr": 16300, ... } }
      const rates = data?.usd;
      if (!rates) throw new Error(`No "usd" key — got: ${Object.keys(data).join(', ')}`);
      twd = rates['twd'];
      idr = rates['idr'];
      if (!twd || !idr) throw new Error(`twd=${twd} idr=${idr}`);
      break; // success
    } catch (err) {
      console.warn(`[fx] ${url} failed:`, err.message);
    }
  }

  if (!twd || !idr) {
    setStatus('✗ Could not fetch live rates — using saved rates', '#c0392b');
    if (btn) { btn.disabled = false; btn.textContent = '⟳ Live rates'; }
    return;
  }

  // fawazahmed0 gives USD→TWD directly (same as Frankfurter convention)
  document.getElementById('fx-twd').value = twd.toFixed(4);
  document.getElementById('fx-idr').value = Math.round(idr);

  saveFXRates(twd, idr);
  renderStocks(appData.stocks);
  renderSection('emergency',  appData.emergency);
  renderSection('retirement', appData.retirement);
  updateDashboard(appData);
  updateAllCharts(appData.stocks);

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  setStatus(`✓ Updated at ${time}`, 'var(--accent)');
  if (btn) { btn.disabled = false; btn.textContent = '⟳ Live rates'; }
}
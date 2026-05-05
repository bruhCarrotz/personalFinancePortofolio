/**
 * fx.js
 *
 * Handles currency conversion.
 * All monetary values in the app are converted to USD for display
 * and for the net worth total.
 *
 * Manual mode:  user types rates directly into the FX bar inputs.
 * Live mode:    refreshFXRates() fetches from Frankfurter API and
 *               populates the inputs automatically.
 *
 * Exports:
 *   getFXRates()              → { USD: 1, TWD: 0.0308, IDR: 0.0000621 }
 *   convertToUSD(amount, currency) → number in USD
 *   refreshFXRates()          → async, fetches live rates and re-renders
 */

const FRANKFURTER_URL = 'https://api.frankfurter.dev/v2/rates?base=USD';

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

/**
 * Fetches live USD → TWD and USD → IDR rates from Frankfurter.
 * Tries v2 first, falls back to stable v1 if needed.
 * Handles both response shapes: { data: {} } (v2) and { rates: {} } (v1).
 */
async function refreshFXRates() {
  const btn      = document.getElementById('btn-refresh-fx');
  const statusEl = document.getElementById('fx-refresh-status');

  function setStatus(msg, color = 'var(--muted)') {
    if (statusEl) { statusEl.textContent = msg; statusEl.style.color = color; }
  }

  if (btn) { btn.disabled = true; btn.textContent = '⟳'; }
  setStatus('Fetching…');

  const ENDPOINTS = [
    'https://api.frankfurter.dev/v2/rates?base=USD',
    'https://api.frankfurter.app/latest?base=USD',
  ];

  let twd = null, idr = null, usedEndpoint = '';

  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // v2 uses { data: { TWD: x, IDR: x } }, v1 uses { rates: { TWD: x, IDR: x } }
      const rateMap = data?.data ?? data?.rates;
      if (!rateMap) throw new Error('No rate map in response');

      twd = rateMap['TWD'];
      idr = rateMap['IDR'];
      if (!twd || !idr) throw new Error(`TWD or IDR missing from response`);

      usedEndpoint = url;
      break; // success — stop trying
    } catch (err) {
      console.warn(`FX endpoint failed (${url}):`, err.message);
    }
  }

  if (!twd || !idr) {
    setStatus('✗ All FX endpoints failed — using saved rates', '#c0392b');
    if (btn) { btn.disabled = false; btn.textContent = '⟳ Live rates'; }
    return;
  }

  // Update inputs
  document.getElementById('fx-twd').value = twd.toFixed(4);
  document.getElementById('fx-idr').value = Math.round(idr);

  // Persist and re-render everything
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
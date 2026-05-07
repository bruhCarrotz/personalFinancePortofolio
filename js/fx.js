/**
 * fx.js
 *
 * Handles currency conversion and live rate fetching.
 *
 * Live rates source: @fawazahmed0/currency-api
 *   - Fully open, no API key, explicit CORS support
 *   - Updated daily
 *
 * Endpoint order (fallback-first — pages.dev is fresher than jsDelivr CDN cache):
 *   1. https://latest.currency-api.pages.dev/v1/currencies/usd.json
 *   2. https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json
 *
 * Exports:
 *   getFXRates()                   → { USD:1, TWD:0.031, IDR:0.000062 }
 *   convertToUSD(amount, currency) → number in USD
 *   refreshFXRates()               → async, fetches live rates and re-renders
 */

function getFXRates() {
  const twdPerUsd =
    parseFloat(document.getElementById('fx-twd')?.value) || CONFIG.DEFAULT_FX.TWD;
  const idrPerUsd =
    parseFloat(document.getElementById('fx-idr')?.value) || CONFIG.DEFAULT_FX.IDR;

  return {
    USD: 1,
    TWD: 1 / twdPerUsd,
    IDR: 1 / idrPerUsd,
  };
}

function convertToUSD(amount, currency) {
  const rates = getFXRates();
  const rate = rates[currency] ?? 1;
  return parseFloat(amount || 0) * rate;
}

async function refreshFXRates() {
  const btn = document.getElementById('btn-refresh-fx');
  const statusEl = document.getElementById('fx-refresh-status');

  function setStatus(msg, color = 'var(--muted)') {
    if (statusEl) {
      statusEl.textContent = msg;
      statusEl.style.color = color;
    }
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = '⟳';
  }
  setStatus('Fetching…');

  // pages.dev is tried first — it serves today's data directly without CDN caching lag
  const ENDPOINTS = [
    'https://latest.currency-api.pages.dev/v1/currencies/usd.json',
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
  ];

  let twd = null;
  let idr = null;
  let rateDate = null;

  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const rates = data?.usd;
      if (!rates) throw new Error('No "usd" key in response');

      twd = rates.twd;
      idr = rates.idr;
      rateDate = data.date || null;

      if (!twd || !idr) throw new Error(`Missing twd/idr in response`);

      console.info(`[fx] Got rates from ${url} — date: ${rateDate}`);
      break;
    } catch (err) {
      console.warn(`[fx] ${url} failed:`, err.message);
    }
  }

  if (!twd || !idr) {
    setStatus('✗ Could not fetch live rates — using saved rates', '#c0392b');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '⟳ Live rates';
    }
    return;
  }

  document.getElementById('fx-twd').value = Number(twd).toFixed(4);
  document.getElementById('fx-idr').value = Math.round(idr);

  if (typeof saveFXRates === 'function') saveFXRates(twd, idr);
  if (typeof renderStocks === 'function') renderStocks(appData.stocks);
  if (typeof renderSection === 'function') {
    renderSection('emergency', appData.emergency);
    renderSection('retirement', appData.retirement);
  }
  if (typeof updateDashboard === 'function') updateDashboard(appData);
  if (typeof updateAllCharts === 'function') updateAllCharts(appData.stocks);

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateLabel = rateDate ? ` (rates dated ${rateDate})` : '';
  setStatus(`✓ Updated at ${time}${dateLabel}`, 'var(--accent)');

  if (btn) {
    btn.disabled = false;
    btn.textContent = '⟳ Live rates';
  }
}
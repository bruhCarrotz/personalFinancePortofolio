/**
 * prices.js
 *
 * Fetches live stock prices via Yahoo Finance (unofficial JSON API)
 * routed through corsproxy.io to bypass CORS restrictions.
 *
 * Yahoo Finance ticker conventions handled automatically:
 *   US market  → ticker as-is          (e.g. VTI, AAPL)
 *   TW market  → ticker + ".TW"        (e.g. 2330.TW)
 *   ID market  → ticker + ".JK"        (e.g. BBCA.JK)
 *
 * Exports:
 *   refreshPrices() → fetches all unique tickers in appData.stocks,
 *                     updates col5 (current price) for each match,
 *                     saves, re-renders, and refreshes charts.
 *
 * Called by the "Refresh Prices" button in index.html.
 */

const YAHOO_BASE  = 'https://query1.finance.yahoo.com/v8/finance/spark';
const CORS_PROXY  = 'https://corsproxy.io/?url=';

/* ── Map a row to the Yahoo Finance ticker symbol ── */
function toYahooSymbol(row) {
  const raw    = (row.col1 || '').trim().toUpperCase();
  const market = row.market || 'US';
  if (!raw) return null;
  if (market === 'TW') return raw.endsWith('.TW') ? raw : raw + '.TW';
  if (market === 'ID') return raw.endsWith('.JK') ? raw : raw + '.JK';
  return raw; // US — use as-is
}

/* ── Fetch a batch of symbols from Yahoo Finance ── */
async function fetchYahooPrices(symbols) {
  if (symbols.length === 0) return {};

  const params = new URLSearchParams({
    symbols: symbols.join(','),
    range:   '1d',
    interval:'1d',
  });

  const yahooUrl  = `${YAHOO_BASE}?${params}`;
  const proxyUrl  = `${CORS_PROXY}${encodeURIComponent(yahooUrl)}`;

  const res  = await fetch(proxyUrl, { headers: { 'x-requested-with': 'XMLHttpRequest' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  /* Parse the spark response into { SYMBOL: price } */
  const prices = {};
  const results = json?.spark?.result ?? [];
  results.forEach(item => {
    const symbol = item?.symbol;
    // Latest close is the last value in the response array
    const closes = item?.response?.[0]?.meta?.regularMarketPrice;
    if (symbol && closes != null) prices[symbol] = closes;
  });
  return prices;
}

/* ── Main entry point ── */
async function refreshPrices() {
  const btn       = document.getElementById('btn-refresh-prices');
  const statusEl  = document.getElementById('price-refresh-status');

  function setStatus(msg, color = 'var(--muted)') {
    if (statusEl) { statusEl.textContent = msg; statusEl.style.color = color; }
  }

  if (btn) { btn.disabled = true; btn.textContent = '⟳ Fetching…'; }
  setStatus('Contacting Yahoo Finance…');

  try {
    /* Build unique symbol → [globalIdxs] map */
    const symbolMap = new Map(); // yahooSymbol → [globalIdx, ...]
    appData.stocks.forEach((row, idx) => {
      const sym = toYahooSymbol(row);
      if (!sym) return;
      if (!symbolMap.has(sym)) symbolMap.set(sym, []);
      symbolMap.get(sym).push(idx);
    });

    if (symbolMap.size === 0) {
      setStatus('No tickers found — add some holdings first.');
      return;
    }

    const symbols = Array.from(symbolMap.keys());
    setStatus(`Fetching ${symbols.length} ticker(s)…`);

    const prices = await fetchYahooPrices(symbols);

    let updated = 0;
    let missed  = [];

    symbolMap.forEach((idxList, sym) => {
      const price = prices[sym];
      if (price == null) { missed.push(sym); return; }
      idxList.forEach(idx => {
        appData.stocks[idx].col5 = String(price);
      });
      updated++;
    });

    savePortfolio(appData);
    renderStocks(appData.stocks);
    updateDashboard(appData);
    updateAllCharts(appData.stocks);

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (missed.length === 0) {
      setStatus(`✓ Updated ${updated} ticker(s) at ${time}`, 'var(--accent)');
    } else {
      setStatus(`✓ ${updated} updated, ✗ not found: ${missed.join(', ')} — at ${time}`, 'var(--warn)');
    }

  } catch (err) {
    console.error('Price fetch failed:', err);
    setStatus(`✗ Fetch failed: ${err.message} — try again shortly.`, '#c0392b');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '⟳ Refresh Prices'; }
  }
}
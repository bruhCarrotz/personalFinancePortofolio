/**
 * prices.js
 *
 * Fetches live stock prices using a two-source strategy:
 *
 *   US stocks  → Finnhub API (free, reliable, proper CORS — no proxy needed)
 *                Get a free key at https://finnhub.io (60 calls/min, no credit card)
 *
 *   TW / ID    → Yahoo Finance via corsproxy.io (best-effort, may fail)
 *                Yahoo's API is unofficial and can block requests without warning.
 *
 * ─────────────────────────────────────────────────────────────
 *  SETUP: paste your Finnhub API key below (US prices won't
 *         work until you do — TW/ID will still try Yahoo).
 * ─────────────────────────────────────────────────────────────
 */

const FINNHUB_API_KEY = 'd7sql2pr01qorsvjm3h0d7sql2pr01qorsvjm3hg'; // ← paste your key from finnhub.io

/* ── Endpoints ── */
const FINNHUB_BASE  = 'https://finnhub.io/api/v1/quote';
const YAHOO_BASE    = 'https://query1.finance.yahoo.com/v8/finance/chart';
const CORS_PREFIX   = 'https://corsproxy.io/?';

/* ── Map a row to its ticker symbol ── */
function toYahooSymbol(row) {
  const raw    = (row.col1 || '').trim().toUpperCase();
  const market = row.market || 'US';
  if (!raw) return null;
  if (market === 'TW') return raw.endsWith('.TW') ? raw : raw + '.TW';
  if (market === 'ID') return raw.endsWith('.JK') ? raw : raw + '.JK';
  return raw;
}

/* ── Finnhub: fetch one US symbol ── */
async function fetchFinnhub(symbol) {
  if (!FINNHUB_API_KEY || FINNHUB_API_KEY === 'd7sql2pr01qorsvjm3h0d7sql2pr01qorsvjm3hg') {
    throw new Error('Finnhub API key not set — edit FINNHUB_API_KEY in prices.js');
  }
  const url = `${FINNHUB_BASE}?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub HTTP ${res.status} for ${symbol}`);
  const data = await res.json();
  // Finnhub returns { c: currentPrice, ... } — c is 0 if market is closed/unknown
  if (!data.c) return null;
  return data.c;
}

/* ── Yahoo Finance: fetch one TW/ID symbol via proxy ── */
async function fetchYahoo(symbol) {
  const yahooUrl = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const proxyUrl = `${CORS_PREFIX}${yahooUrl}`;
  const res = await fetch(proxyUrl, {
    headers: {
      'x-requested-with': 'XMLHttpRequest',
      // Prevent Yahoo from gzip-compressing — corsproxy.io forwards raw bytes,
      // so a compressed response arrives as unreadable binary in the browser.
      'Accept-Encoding': 'identity',
    },
  });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status} for ${symbol}`);
  // Read as text first so a garbled response gives a clear error instead of a cryptic crash
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); }
  catch (e) { throw new Error(`Response not valid JSON — Yahoo may still be compressing. Try again.`); }
  const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (price == null) throw new Error(`No price found in Yahoo response for ${symbol}`);
  return price;
}

/* ── Rate-limit helper: wait ms milliseconds ── */
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ── Main entry point ── */
async function refreshPrices() {
  const btn      = document.getElementById('btn-refresh-prices');
  const statusEl = document.getElementById('price-refresh-status');

  function setStatus(msg, color = 'var(--muted)') {
    if (statusEl) { statusEl.textContent = msg; statusEl.style.color = color; }
  }

  if (btn) { btn.disabled = true; btn.textContent = '⟳ Fetching…'; }
  setStatus('Starting price fetch…');

  try {
    /* Build unique symbol → { idxList, market } map */
    const symbolMap = new Map();
    appData.stocks.forEach((row, idx) => {
      const sym    = toYahooSymbol(row);
      const market = row.market || 'US';
      if (!sym) return;
      if (!symbolMap.has(sym)) symbolMap.set(sym, { idxList: [], market });
      symbolMap.get(sym).idxList.push(idx);
    });

    if (symbolMap.size === 0) {
      setStatus('No tickers found — add some holdings first.');
      return;
    }

    setStatus(`Fetching ${symbolMap.size} ticker(s)…`);

    let updated = 0;
    const missed  = [];
    const errors  = [];
    let callCount = 0;

    for (const [sym, { idxList, market }] of symbolMap) {
      try {
        let price = null;

        if (market === 'US') {
          // Finnhub: rate limit is 60/min → add small delay after every 10 calls
          if (callCount > 0 && callCount % 10 === 0) await wait(500);
          price = await fetchFinnhub(sym);
          callCount++;
        } else {
          // TW / ID: Yahoo Finance via proxy (one at a time)
          price = await fetchYahoo(sym);
        }

        if (price != null) {
          idxList.forEach(idx => { appData.stocks[idx].col5 = String(price); });
          updated++;
        } else {
          missed.push(sym);
        }
      } catch (err) {
        console.warn(`Price fetch failed for ${sym}:`, err.message);
        errors.push(`${sym} (${err.message})`);
        missed.push(sym);
      }
    }

    savePortfolio(appData);
    renderStocks(appData.stocks);
    updateDashboard(appData);
    updateAllCharts(appData.stocks);

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (missed.length === 0) {
      setStatus(`✓ Updated ${updated} ticker(s) at ${time}`, 'var(--accent)');
    } else if (updated > 0) {
      setStatus(`✓ ${updated} updated · ✗ failed: ${missed.join(', ')} — at ${time}`, 'var(--warn)');
    } else {
      // Everything failed — show the first real error message
      const firstErr = errors[0] || 'Unknown error';
      setStatus(`✗ All fetches failed: ${firstErr}`, '#c0392b');
    }

  } catch (err) {
    console.error('refreshPrices crashed:', err);
    setStatus(`✗ Unexpected error: ${err.message}`, '#c0392b');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '⟳ Refresh Prices'; }
  }
}
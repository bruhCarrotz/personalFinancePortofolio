/**
 * prices.js
 *
 * US stocks  → Finnhub API
 * TW / ID    → Yahoo Finance, tried through multiple CORS proxies in sequence
 *              until one succeeds.
 *
 * SETUP: Replace YOUR_FINNHUB_KEY_HERE with your actual Finnhub key.
 */

const FINNHUB_API_KEY = 'd7sqpkpr01qorsvjmh9gd7sqpkpr01qorsvjmha0'; // ← your key here

const FINNHUB_BASE = 'https://finnhub.io/api/v1/quote';
const YAHOO_BASE   = 'https://query1.finance.yahoo.com/v8/finance/chart';

/**
 * Proxies tried in order. If one fails (network error or bad response),
 * the next one is tried automatically.
 *
 * Each entry: { name, buildUrl(yahooUrl) → string, parse(res) → Promise<string> }
 */
const PROXIES = [
  {
    name: 'allorigins',
    buildUrl: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
    parse: async (res) => {
      const w = await res.json();
      if (w?.status?.http_code !== 200) throw new Error(`Yahoo returned ${w?.status?.http_code}`);
      return w.contents;
    },
  },
  {
    name: 'corsproxy.io',
    buildUrl: (u) => `https://corsproxy.io/?${u}`,
    parse: async (res) => {
      const buf  = await res.arrayBuffer();
      const text = new TextDecoder('utf-8').decode(buf);
      if (text.charCodeAt(0) < 32 && text.charCodeAt(0) !== 9) {
        throw new Error('Response appears compressed (binary)');
      }
      return text;
    },
  },
  {
    name: 'thingproxy',
    buildUrl: (u) => `https://thingproxy.freeboard.io/fetch/${u}`,
    parse: async (res) => res.text(),
  },
  {
    name: 'jsonp.afeld.me',
    buildUrl: (u) => `https://jsonp.afeld.me/?url=${encodeURIComponent(u)}`,
    parse: async (res) => res.text(),
  },
];

/* ── Debug logger ── */
function dbg(msg) {
  console.log('[prices]', msg);
  const el = document.getElementById('price-debug-log');
  if (el) el.textContent += '\n' + msg;
}

/* ── Map a row to its ticker symbol ── */
function toSymbol(row) {
  const raw    = (row.col1 || '').trim().toUpperCase();
  const market = row.market || 'US';
  if (!raw) return null;
  if (market === 'TW') return raw.endsWith('.TW') ? raw : raw + '.TW';
  if (market === 'ID') return raw.endsWith('.JK') ? raw : raw + '.JK';
  return raw;
}

/* ── Finnhub: US stocks ── */
async function fetchFinnhub(symbol) {
  const key = (FINNHUB_API_KEY || '').trim();
  if (!key) {
    throw new Error('Finnhub API key not set — edit FINNHUB_API_KEY in prices.js');
  }
  const url = `${FINNHUB_BASE}?symbol=${encodeURIComponent(symbol)}&token=${key}`;
  dbg(`Finnhub → ${symbol}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);
  const data = await res.json();
  dbg(`c=${data.c} pc=${data.pc}`);
  return data.c || data.pc || null;
}

/* ── Yahoo via proxy cascade: TW / ID stocks ── */
async function fetchYahoo(symbol) {
  const yahooUrl = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

  for (const proxy of PROXIES) {
    const proxyUrl = proxy.buildUrl(yahooUrl);
    dbg(`trying ${proxy.name} → ${symbol}`);
    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) { dbg(`${proxy.name} HTTP ${res.status} — skipping`); continue; }

      const text = await proxy.parse(res);
      const first = (text || '').slice(0, 60);
      dbg(`${proxy.name} raw: ${first}`);

      let json;
      try { json = JSON.parse(text); }
      catch (e) { dbg(`${proxy.name} not valid JSON — skipping`); continue; }

      const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price == null) { dbg(`${proxy.name} — no price field — skipping`); continue; }

      dbg(`✓ ${proxy.name} got price for ${symbol}: ${price}`);
      return price;
    } catch (err) {
      dbg(`${proxy.name} failed: ${err.message} — trying next`);
    }
  }
  throw new Error(`All proxies failed for ${symbol}`);
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ── Main entry point ── */
async function refreshPrices() {
  const btn        = document.getElementById('btn-refresh-prices');
  const statusEl   = document.getElementById('price-refresh-status');
  const debugPanel = document.getElementById('price-debug-panel');
  const debugLog   = document.getElementById('price-debug-log');
  if (debugPanel) debugPanel.style.display = 'block';
  if (debugLog)   debugLog.textContent = '── Debug log ──';

  function setStatus(msg, color = 'var(--muted)') {
    if (statusEl) { statusEl.textContent = msg; statusEl.style.color = color; }
  }

  if (btn) { btn.disabled = true; btn.textContent = '⟳ Fetching…'; }
  setStatus('Starting price fetch…');

  const key = (FINNHUB_API_KEY || '').trim();
  dbg(`Key: ${key.slice(0, 8)}... isPlaceholder=${key === 'YOUR_FINNHUB_KEY_HERE'}`);
  dbg(`Stocks: ${(appData.stocks || []).length}`);

  try {
    const symbolMap = new Map();
    (appData.stocks || []).forEach((row, idx) => {
      const sym    = toSymbol(row);
      const market = row.market || 'US';
      if (!sym) return;
      if (!symbolMap.has(sym)) symbolMap.set(sym, { idxList: [], market });
      symbolMap.get(sym).idxList.push(idx);
    });

    dbg(`Symbols: ${[...symbolMap.keys()].join(', ') || 'none'}`);
    if (symbolMap.size === 0) { setStatus('No tickers found.'); return; }
    setStatus(`Fetching ${symbolMap.size} ticker(s)…`);

    let updated = 0, callCount = 0;
    const missed = [], errors = [];

    for (const [sym, { idxList, market }] of symbolMap) {
      try {
        let price = null;
        if (market === 'US') {
          if (callCount > 0 && callCount % 10 === 0) await wait(500);
          price = await fetchFinnhub(sym);
          callCount++;
        } else {
          price = await fetchYahoo(sym);
        }
        if (price != null) {
          idxList.forEach(idx => { appData.stocks[idx].col5 = String(price); });
          updated++;
          dbg(`✓ ${sym} = ${price}`);
        } else {
          missed.push(sym);
          dbg(`✗ ${sym} — null price`);
        }
      } catch (err) {
        dbg(`✗ ${sym} — ${err.message}`);
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
      setStatus(`✗ All proxies failed for TW/ID stocks. Try again later.`, '#c0392b');
    }

  } catch (err) {
    dbg(`CRASH: ${err.message}`);
    setStatus(`✗ Unexpected error: ${err.message}`, '#c0392b');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '⟳ Refresh Prices'; }
  }
}
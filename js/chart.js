/**
 * chart.js
 *
 * Manages all sidebar charts and the portfolio growth block.
 *
 * Charts:
 *   #market-pie       — current value split by market (US / TW / ID)
 *   #us-holdings-pie  — each US stock as its own slice
 *   #tw-holdings-pie  — each TW stock as its own slice
 *   #id-holdings-pie  — each ID stock as its own slice
 *
 * Growth block:
 *   Total cost basis, current value, $ G/L, % G/L across all stocks.
 *
 * Exports:
 *   initAllCharts()       → call once on page load
 *   updateAllCharts(rows) → call whenever stock data changes
 */

/* ── Market colours (used by the By Market chart) ── */
const MARKET_COLORS = {
  US: '#ec6b56',
  TW: '#ffc154',
  ID: '#47b39c',
};
const MARKET_LABELS = {
  US: '🇺🇸 US',
  TW: '🇹🇼 TW',
  ID: '🇮🇩 ID',
};

/* ── Palette for individual holdings (cycles if > 12 tickers) ── */
const HOLDING_PALETTE = [
  '#ec6b56','#ffc154','#47b39c','#5b8dee','#a55eea',
  '#fd9644','#26de81','#fc5c65','#45aaf2','#fed330',
  '#2bcbba','#d1d8e0',
];
function holdingColor(idx) {
  return HOLDING_PALETTE[idx % HOLDING_PALETTE.length];
}

/* ── Chart instances ── */
let chartMarket  = null;
let chartUS      = null;
let chartTW      = null;
let chartID      = null;

/* ── Shared doughnut factory ── */
function makeDoughnutChart(canvasId, labels, data, colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#f7f6f2',
        hoverOffset: 5,
      }],
    },
    options: {
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val   = ctx.parsed;
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = total > 0 ? (val / total * 100).toFixed(1) : '0.0';
              return ` ${fmtUSD(val)}  (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

/* ── Update an existing chart's data in-place ── */
function refreshChart(chart, labels, data, colors) {
  if (!chart) return;
  // Splice-replace to ensure Chart.js doesn't accumulate stale entries
  chart.data.labels.splice(0, chart.data.labels.length, ...labels);
  chart.data.datasets[0].data.splice(0, chart.data.datasets[0].data.length, ...data);
  chart.data.datasets[0].backgroundColor.splice(0, chart.data.datasets[0].backgroundColor.length, ...colors);
  chart.update();
}

/* ── Render a holdings legend from grouped ticker data ── */
function renderHoldingsLegend(containerId, grouped, colors) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (grouped.length === 0) {
    el.innerHTML = '<div style="font-size:11px;color:var(--muted)">No holdings yet</div>';
    return;
  }
  const total = grouped.reduce((s, g) => s + g.value, 0);
  el.innerHTML = grouped.map((g, i) => {
    const pct = total > 0 ? (g.value / total * 100).toFixed(1) : '0.0';
    return `
      <div class="chart-legend-item">
        <span class="chart-legend-dot" style="background:${colors[i]}"></span>
        <span class="chart-legend-name">${g.ticker}</span>
        <span class="chart-legend-pct">${pct}%</span>
        <span class="chart-legend-val">${fmtUSD(g.value)}</span>
      </div>`;
  }).join('');
}

function renderMarketLegend(byMarket) {
  const el = document.getElementById('chart-legend');
  if (!el) return;
  const grand = ['US','TW','ID'].reduce((s, m) => s + byMarket[m].value, 0);
  el.innerHTML = ['US','TW','ID'].map(m => {
    const val = byMarket[m].value;
    const pct = grand > 0 ? (val / grand * 100).toFixed(1) : '0.0';
    return `
      <div class="chart-legend-item">
        <span class="chart-legend-dot" style="background:${MARKET_COLORS[m]}"></span>
        <span class="chart-legend-name">${MARKET_LABELS[m]}</span>
        <span class="chart-legend-pct">${pct}%</span>
        <span class="chart-legend-val">${fmtUSD(val)}</span>
      </div>`;
  }).join('');
}

/* ── Init all charts (call once on DOMContentLoaded) ── */
function initAllCharts() {
  chartMarket = makeDoughnutChart('market-pie',
    ['US','TW','ID'], [0,0,0],
    [MARKET_COLORS.US, MARKET_COLORS.TW, MARKET_COLORS.ID]
  );
  chartUS = makeDoughnutChart('us-holdings-pie', [], [], []);
  chartTW = makeDoughnutChart('tw-holdings-pie', [], [], []);
  chartID = makeDoughnutChart('id-holdings-pie', [], [], []);
}

/* ── Aggregate rows by ticker (col1), summing USD values ── */
function groupByTicker(rows) {
  const map = new Map();
  rows.forEach(row => {
    const ticker = (row.col1 || '—').trim() || '—';
    const val    = rowValueUSD('stocks', row);
    if (map.has(ticker)) {
      map.get(ticker).value += val;
    } else {
      map.set(ticker, { ticker, value: val });
    }
  });
  return Array.from(map.values()); // [{ ticker, value }, ...]
}

/* ── Update all charts + growth block ── */
function updateAllCharts(rows) {
  const gains = calcPortfolioGains(rows);
  const { byMarket, total } = gains;

  /* By Market chart */
  refreshChart(chartMarket,
    ['US','TW','ID'],
    ['US','TW','ID'].map(m => byMarket[m].value),
    [MARKET_COLORS.US, MARKET_COLORS.TW, MARKET_COLORS.ID]
  );
  renderMarketLegend(byMarket);

  /* Per-market holdings charts — grouped by ticker */
  const usRows = rows.filter(r => (r.market || 'US') === 'US');
  const twRows = rows.filter(r => r.market === 'TW');
  const idRows = rows.filter(r => r.market === 'ID');

  const usGrouped = groupByTicker(usRows);
  const twGrouped = groupByTicker(twRows);
  const idGrouped = groupByTicker(idRows);

  const usColors = usGrouped.map((_, i) => holdingColor(i));
  const twColors = twGrouped.map((_, i) => holdingColor(i));
  const idColors = idGrouped.map((_, i) => holdingColor(i));

  refreshChart(chartUS, usGrouped.map(g => g.ticker), usGrouped.map(g => g.value), usColors);
  refreshChart(chartTW, twGrouped.map(g => g.ticker), twGrouped.map(g => g.value), twColors);
  refreshChart(chartID, idGrouped.map(g => g.ticker), idGrouped.map(g => g.value), idColors);

  renderHoldingsLegend('us-holdings-legend', usGrouped, usColors);
  renderHoldingsLegend('tw-holdings-legend', twGrouped, twColors);
  renderHoldingsLegend('id-holdings-legend', idGrouped, idColors);

  /* Growth block */
  const diffEl = document.getElementById('growth-diff');
  const pctEl  = document.getElementById('growth-pct');
  document.getElementById('growth-cost').textContent  = fmtUSD(total.cost);
  document.getElementById('growth-value').textContent = fmtUSD(total.value);
  if (diffEl) {
    const sign = total.diff >= 0 ? '+' : '';
    diffEl.textContent = sign + fmtUSD(total.diff);
    diffEl.className   = 'growth-val growth-diff ' + (total.diff >= 0 ? 'positive' : 'negative');
  }
  if (pctEl) {
    const sign = total.pct >= 0 ? '+' : '';
    pctEl.textContent = sign + total.pct.toFixed(2) + '%';
    pctEl.className   = 'growth-val growth-pct ' + (total.pct >= 0 ? 'positive' : 'negative');
  }
}

/* Backward-compat aliases */
function updateMarketChart(rows) { updateAllCharts(rows); }
function initMarketChart()       { initAllCharts(); }
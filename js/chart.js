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
  chart.data.labels                        = labels;
  chart.data.datasets[0].data             = data;
  chart.data.datasets[0].backgroundColor  = colors;
  chart.update();
}

/* ── Render a legend ── */
function renderHoldingsLegend(containerId, rows, colors) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const total = rows.reduce((s, r) => s + rowValueUSD('stocks', r), 0);
  if (rows.length === 0) {
    el.innerHTML = '<div style="font-size:11px;color:var(--muted)">No holdings yet</div>';
    return;
  }
  el.innerHTML = rows.map((r, i) => {
    const val = rowValueUSD('stocks', r);
    const pct = total > 0 ? (val / total * 100).toFixed(1) : '0.0';
    const label = r.col1 || '—';
    return `
      <div class="chart-legend-item">
        <span class="chart-legend-dot" style="background:${colors[i % colors.length]}"></span>
        <span class="chart-legend-name">${label}</span>
        <span class="chart-legend-pct">${pct}%</span>
        <span class="chart-legend-val">${fmtUSD(val)}</span>
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

  /* Per-market holdings charts */
  const usRows = rows.filter(r => (r.market || 'US') === 'US');
  const twRows = rows.filter(r => r.market === 'TW');
  const idRows = rows.filter(r => r.market === 'ID');

  const usColors = usRows.map((_, i) => holdingColor(i));
  const twColors = twRows.map((_, i) => holdingColor(i));
  const idColors = idRows.map((_, i) => holdingColor(i));

  refreshChart(chartUS,
    usRows.map(r => r.col1 || '—'),
    usRows.map(r => rowValueUSD('stocks', r)),
    usColors
  );
  refreshChart(chartTW,
    twRows.map(r => r.col1 || '—'),
    twRows.map(r => rowValueUSD('stocks', r)),
    twColors
  );
  refreshChart(chartID,
    idRows.map(r => r.col1 || '—'),
    idRows.map(r => rowValueUSD('stocks', r)),
    idColors
  );

  renderHoldingsLegend('us-holdings-legend', usRows, usColors);
  renderHoldingsLegend('tw-holdings-legend', twRows, twColors);
  renderHoldingsLegend('id-holdings-legend', idRows, idColors);

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
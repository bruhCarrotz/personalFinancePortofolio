/**
 * chart.js
 *
 * Manages all three sidebar charts and the portfolio growth block.
 *
 * Charts:
 *   #market-pie  — current value split by market (US/TW/ID)
 *   #cost-pie    — cost basis split by market (what you paid)
 *   #value-pie   — current value split by market (what it's worth now)
 *                  (same data as market-pie but paired with cost-pie for comparison)
 *
 * Growth block:
 *   Shows total cost basis, current value, $ G/L, and % G/L across all stocks.
 *
 * Exports:
 *   initAllCharts()     → call once on page load
 *   updateAllCharts(rows) → call whenever stock data changes
 */

const MARKET_COLORS = {
    US: '#a2c9f4',
    TW: '#d0bbfe',
    ID: '#fe9f9b',
};
const MARKET_LABELS = {
  US: '🇺🇸 US',
  TW: '🇹🇼 TW',
  ID: '🇮🇩 ID',
};

let chartMarket = null;
let chartCost   = null;
let chartValue  = null;

/* ── Shared chart config factory ── */
function makeDoughnutChart(canvasId, colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['US', 'TW', 'ID'],
      datasets: [{
        data: [0, 0, 0],
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

function initAllCharts() {
  const solidColors = [MARKET_COLORS.US, MARKET_COLORS.TW, MARKET_COLORS.ID];
  
  const costValueColors = ['#ec6b56', '#ffc154', '#47b39c'];

  chartMarket = makeDoughnutChart('market-pie', solidColors);
  chartCost   = makeDoughnutChart('cost-pie',   costValueColors);
  chartValue  = makeDoughnutChart('value-pie',  costValueColors);
}

/* ── Render a legend for a chart ── */
function renderLegend(containerId, byMarket, valueKey) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const grand = ['US','TW','ID'].reduce((s, m) => s + byMarket[m][valueKey], 0);
  el.innerHTML = ['US','TW','ID'].map(m => {
    const val = byMarket[m][valueKey];
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

function updateAllCharts(rows) {
  const gains = calcPortfolioGains(rows);
  const { byMarket, total } = gains;

  // Update chart data
  const order = ['US', 'TW', 'ID'];
  if (chartMarket) {
    chartMarket.data.datasets[0].data = order.map(m => byMarket[m].value);
    chartMarket.update();
  }
  if (chartCost) {
    chartCost.data.datasets[0].data = order.map(m => byMarket[m].cost);
    chartCost.update();
  }
  if (chartValue) {
    chartValue.data.datasets[0].data = order.map(m => byMarket[m].value);
    chartValue.update();
  }

  // Update legends
  renderLegend('chart-legend', byMarket, 'value');
  renderLegend('cost-legend',  byMarket, 'cost');
  renderLegend('value-legend', byMarket, 'value');

  // Update growth block
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

/* Keep old name working so renderer.js calls don't break */
function updateMarketChart(rows) { updateAllCharts(rows); }
function initMarketChart()       { initAllCharts(); }
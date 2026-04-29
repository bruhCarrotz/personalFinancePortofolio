/**
 * chart.js
 *
 * Manages the "By Market" pie chart shown beside the Stocks table.
 * Uses Chart.js (loaded from CDN in index.html).
 *
 * Exports:
 *   initMarketChart()         → creates the Chart instance on page load
 *   updateMarketChart(rows)   → re-feeds data whenever rows change
 *
 * The chart groups stock rows by their `market` field (US / TW / ID)
 * and sizes each slice by current market value in USD.
 */

const MARKET_COLORS = {
    US: '#2d5a3d',
    TW: '#1a3a5c',
    ID: '#8a4a1a',
  };
  const MARKET_LABELS = {
    US: '🇺🇸 United States',
    TW: '🇹🇼 Taiwan',
    ID: '🇮🇩 Indonesia',
  };
  
  let pieChart = null;
  
  function initMarketChart() {
    const canvas = document.getElementById('market-pie');
    if (!canvas) return;
    pieChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['US', 'TW', 'ID'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: [MARKET_COLORS.US, MARKET_COLORS.TW, MARKET_COLORS.ID],
          borderWidth: 2,
          borderColor: '#f7f6f2',
          hoverOffset: 6,
        }],
      },
      options: {
        cutout: '62%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed;
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? (val / total * 100).toFixed(1) : 0;
                return ` ${fmtUSD(val)}  (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }
  
  function updateMarketChart(rows) {
    if (!pieChart) return;
  
    const totals = { US: 0, TW: 0, ID: 0 };
    rows.forEach(row => {
      const market = row.market || 'US';
      if (totals[market] !== undefined) {
        totals[market] += rowValueUSD('stocks', row);
      }
    });
  
    pieChart.data.datasets[0].data = [totals.US, totals.TW, totals.ID];
    pieChart.update();
  
    // Update custom legend
    const legend = document.getElementById('chart-legend');
    if (!legend) return;
    const grandTotal = totals.US + totals.TW + totals.ID;
    legend.innerHTML = ['US','TW','ID'].map(m => {
      const pct = grandTotal > 0 ? (totals[m] / grandTotal * 100).toFixed(1) : 0;
      return `
        <div class="chart-legend-item">
          <span class="chart-legend-dot" style="background:${MARKET_COLORS[m]}"></span>
          <span class="chart-legend-name">${MARKET_LABELS[m]}</span>
          <span class="chart-legend-pct">${pct}%</span>
          <span class="chart-legend-val">${fmtUSD(totals[m])}</span>
        </div>`;
    }).join('');
  }
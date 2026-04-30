/**
 * renderer.js
 *
 * Owns all DOM writes.
 *
 * Stock rows are now split into three separate tables by market (US/TW/ID).
 * The market field is set automatically when addRow(section, market) is called
 * from the "+ Add" button — no dropdown needed in the row itself.
 *
 * Exports:
 *   renderSection(sectionKey, rows)   → renders emergency / retirement tables
 *   renderStocks(rows)                → renders all three per-market stock tables
 *   updateDashboard(data)             → refreshes all totals, pills, allocation bar
 *   updateRowUSDCell(market, idx, tr) → fast-path refresh of one stock row's cells
 */

/* ── Currency badge colour ── */
function tagClass(currency) {
  return { USD: 'tag-usd', TWD: 'tag-twd', IDR: 'tag-idr' }[currency] ?? 'tag-usd';
}

/* ── Date input cell ── */
function makeDateCell(value, onChange) {
  const td = document.createElement('td');
  const input = document.createElement('input');
  input.type = 'date';
  input.value = value || '';
  input.style.cssText = 'background:none;border:none;border-bottom:1px dashed transparent;color:var(--text);font-family:var(--font-mono);font-size:12px;outline:none;padding:2px 0;width:100%;cursor:pointer;';
  input.addEventListener('mouseover', () => input.style.borderBottomColor = 'var(--border)');
  input.addEventListener('mouseout',  () => { if (document.activeElement !== input) input.style.borderBottomColor = 'transparent'; });
  input.addEventListener('focus', () => input.style.borderBottomColor = 'var(--accent)');
  input.addEventListener('blur',  () => input.style.borderBottomColor = 'transparent');
  input.addEventListener('change', () => onChange(input.value));
  td.appendChild(input);
  return td;
}

/* ── Text input cell (td wrapper) ── */
function makeTextCell(value, placeholder, onChange) {
  const td = document.createElement('td');
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value || '';
  input.placeholder = placeholder;
  input.addEventListener('input', () => onChange(input.value));
  td.appendChild(input);
  return td;
}

/* ── Number input (returns bare input, caller wraps in td) ── */
function makeNumberInput(value, placeholder, onChange) {
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'num-input';
  input.value = value || '';
  input.placeholder = placeholder;
  input.min = '0';
  input.step = 'any';
  input.addEventListener('input', () => onChange(input.value));
  return input;
}

/* ── G/L cell content helper ── */
function renderGLCell(td, row) {
  const gl = rowGainLoss(row);
  if (gl === null) {
    td.textContent = '—';
    td.style.color = 'var(--muted)';
  } else {
    td.textContent = (gl.diff >= 0 ? '+' : '') + fmtUSD(gl.diff) + ' (' + gl.pct.toFixed(1) + '%)';
    td.style.color = gl.diff >= 0 ? 'var(--accent)' : '#c0392b';
  }
}

/* ── Build one stock row ── */
function buildStockRow(row, globalIdx) {
  const meta = CONFIG.SECTIONS.stocks;
  const tr   = document.createElement('tr');

  // Name / Ticker
  tr.appendChild(makeTextCell(row.col1, meta.col1, (v) => {
    appData.stocks[globalIdx].col1 = v; savePortfolio(appData);
  }));

  // Date
  tr.appendChild(makeDateCell(row.col2, (v) => {
    appData.stocks[globalIdx].col2 = v; savePortfolio(appData);
  }));

  // Units
  const tdUnits = document.createElement('td');
  tdUnits.className = 'num';
  tdUnits.appendChild(makeNumberInput(row.col3, meta.col3, (v) => {
    appData.stocks[globalIdx].col3 = v; savePortfolio(appData);
    updateRowUSDCell(globalIdx, tr);
  }));
  tr.appendChild(tdUnits);

  // Buy Price
  const tdBuy = document.createElement('td');
  tdBuy.className = 'num';
  tdBuy.appendChild(makeNumberInput(row.col4, meta.col4, (v) => {
    appData.stocks[globalIdx].col4 = v; savePortfolio(appData);
    updateRowUSDCell(globalIdx, tr);
  }));
  tr.appendChild(tdBuy);

  // Current Price
  const tdCurrent = document.createElement('td');
  tdCurrent.className = 'num';
  tdCurrent.appendChild(makeNumberInput(row.col5, meta.col5, (v) => {
    appData.stocks[globalIdx].col5 = v; savePortfolio(appData);
    updateRowUSDCell(globalIdx, tr);
  }));
  tr.appendChild(tdCurrent);

  // Currency select
  const tdCur = document.createElement('td');
  tdCur.className = 'num';
  const sel = document.createElement('select');
  sel.className = 'tag ' + tagClass(row.currency);
  CONFIG.CURRENCIES.forEach(cur => {
    const opt = document.createElement('option');
    opt.value = cur; opt.textContent = cur;
    if (cur === row.currency) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    appData.stocks[globalIdx].currency = sel.value;
    sel.className = 'tag ' + tagClass(sel.value);
    savePortfolio(appData);
    updateRowUSDCell(globalIdx, tr);
  });
  tdCur.appendChild(sel);
  tr.appendChild(tdCur);

  // Value (USD) — computed
  const tdUSD = document.createElement('td');
  tdUSD.className = 'num usd-cell';
  tdUSD.textContent = fmtUSD(rowValueUSD('stocks', row));
  tr.appendChild(tdUSD);

  // G/L — computed
  const tdGL = document.createElement('td');
  tdGL.className = 'num gl-cell';
  renderGLCell(tdGL, row);
  tr.appendChild(tdGL);

  // Delete
  const tdDel = document.createElement('td');
  const delBtn = document.createElement('button');
  delBtn.className = 'del-btn';
  delBtn.title = 'Delete';
  delBtn.textContent = '×';
  delBtn.addEventListener('click', () => {
    appData.stocks.splice(globalIdx, 1);
    savePortfolio(appData);
    renderStocks(appData.stocks);
    updateDashboard(appData);
    updateMarketChart(appData.stocks);
  });
  tdDel.appendChild(delBtn);
  tr.appendChild(tdDel);

  return tr;
}

/* ── Sort rows by date (col1 for emergency/retirement, col2 for stocks) ascending ── */
function sortByDate(rows, dateField) {
  return [...rows].sort((a, b) => {
    const da = a[dateField] || '';
    const db = b[dateField] || '';
    if (!da && !db) return 0;
    if (!da) return 1;   // blank dates sink to bottom
    if (!db) return -1;
    return da < db ? -1 : da > db ? 1 : 0;
  });
}

/* ── Render all three per-market stock tables ── */
function renderStocks(rows) {
  const bodies = {
    US: document.getElementById('stocks-us-body'),
    TW: document.getElementById('stocks-tw-body'),
    ID: document.getElementById('stocks-id-body'),
  };
  bodies.US.innerHTML = '';
  bodies.TW.innerHTML = '';
  bodies.ID.innerHTML = '';

  // Build per-market arrays preserving original globalIdx for mutations
  const byMarket = { US: [], TW: [], ID: [] };
  rows.forEach((row, globalIdx) => {
    const m = row.market || 'US';
    if (byMarket[m]) byMarket[m].push({ row, globalIdx });
  });

  // Sort each market's rows chronologically by date (col2)
  ['US','TW','ID'].forEach(m => {
    byMarket[m]
      .sort((a, b) => {
        const da = a.row.col2 || '', db = b.row.col2 || '';
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da < db ? -1 : da > db ? 1 : 0;
      })
      .forEach(({ row, globalIdx }) => {
        bodies[m].appendChild(buildStockRow(row, globalIdx));
      });
  });
}

/* ── Fast-path: refresh USD + G/L cells for one row ── */
function updateRowUSDCell(globalIdx, tr) {
  const row = appData.stocks[globalIdx];
  tr.querySelector('.usd-cell').textContent = fmtUSD(rowValueUSD('stocks', row));
  renderGLCell(tr.querySelector('.gl-cell'), row);
  updateDashboard(appData);
  updateMarketChart(appData.stocks);
}

/* ── Build one emergency / retirement row ── */
function buildRow(sectionKey, row, idx) {
  const meta = CONFIG.SECTIONS[sectionKey];
  const tr   = document.createElement('tr');

  if (sectionKey === 'emergency') {
    tr.appendChild(makeDateCell(row.col1, (v) => { appData.emergency[idx].col1 = v; savePortfolio(appData); }));
    const tdAmt = document.createElement('td');
    tdAmt.className = 'num';
    tdAmt.appendChild(makeNumberInput(row.col4, meta.col4, (v) => {
      appData.emergency[idx].col4 = v; savePortfolio(appData);
      tr.querySelector('.usd-cell').textContent = fmtUSD(rowValueUSD('emergency', appData.emergency[idx]));
      updateDashboard(appData);
    }));
    tr.appendChild(tdAmt);
  }

  if (sectionKey === 'retirement') {
    tr.appendChild(makeDateCell(row.col1, (v) => { appData.retirement[idx].col1 = v; savePortfolio(appData); }));
    tr.appendChild(makeTextCell(row.col2, meta.col2, (v) => { appData.retirement[idx].col2 = v; savePortfolio(appData); }));
    const tdBal = document.createElement('td');
    tdBal.className = 'num';
    tdBal.appendChild(makeNumberInput(row.col4, meta.col4, (v) => {
      appData.retirement[idx].col4 = v; savePortfolio(appData);
      tr.querySelector('.usd-cell').textContent = fmtUSD(rowValueUSD('retirement', appData.retirement[idx]));
      updateDashboard(appData);
    }));
    tr.appendChild(tdBal);
  }

  // Currency select
  const tdCur = document.createElement('td');
  tdCur.className = 'num';
  const sel = document.createElement('select');
  sel.className = 'tag ' + tagClass(row.currency);
  CONFIG.CURRENCIES.forEach(cur => {
    const opt = document.createElement('option');
    opt.value = cur; opt.textContent = cur;
    if (cur === row.currency) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    appData[sectionKey][idx].currency = sel.value;
    sel.className = 'tag ' + tagClass(sel.value);
    savePortfolio(appData);
    tr.querySelector('.usd-cell').textContent = fmtUSD(rowValueUSD(sectionKey, appData[sectionKey][idx]));
    updateDashboard(appData);
  });
  tdCur.appendChild(sel);
  tr.appendChild(tdCur);

  // USD value
  const tdUSD = document.createElement('td');
  tdUSD.className = 'num usd-cell';
  tdUSD.textContent = fmtUSD(rowValueUSD(sectionKey, row));
  tr.appendChild(tdUSD);

  // Delete
  const tdDel = document.createElement('td');
  const delBtn = document.createElement('button');
  delBtn.className = 'del-btn';
  delBtn.title = 'Delete';
  delBtn.textContent = '×';
  delBtn.addEventListener('click', () => {
    appData[sectionKey].splice(idx, 1);
    savePortfolio(appData);
    renderSection(sectionKey, appData[sectionKey]);
    updateDashboard(appData);
  });
  tdDel.appendChild(delBtn);
  tr.appendChild(tdDel);

  return tr;
}

/* ── Render emergency / retirement section ── */
function renderSection(sectionKey, rows) {
  const tbody = document.getElementById(sectionKey + '-body');
  tbody.innerHTML = '';
  // Sort by date (col1) chronologically; blank dates go last
  const sorted = sortByDate(rows, 'col1');
  // Build using original index from appData so mutations stay correct
  sorted.forEach(sortedRow => {
    const originalIdx = rows.indexOf(sortedRow);
    tbody.appendChild(buildRow(sectionKey, sortedRow, originalIdx));
  });
}

/* ── Refresh all dashboard numbers ── */
function updateDashboard(data) {
  const allStocksUSD = data.stocks.reduce((s, r) => s + rowValueUSD('stocks', r), 0);
  const totals = {
    stocks:     allStocksUSD,
    emergency:  sectionTotalUSD('emergency',  data.emergency),
    retirement: sectionTotalUSD('retirement', data.retirement),
  };
  const grand = calcNetWorth(totals);
  const alloc = calcAllocations(totals);

  // Net worth + pills
  document.getElementById('net-worth-total').textContent    = fmtUSD(grand);
  document.getElementById('pill-stocks').textContent        = fmtUSD(totals.stocks);
  document.getElementById('pill-emergency').textContent     = fmtUSD(totals.emergency);
  document.getElementById('pill-retirement').textContent    = fmtUSD(totals.retirement);

  // Per-market section totals
  const byMarket = { US: 0, TW: 0, ID: 0 };
  data.stocks.forEach(r => { const m = r.market || 'US'; byMarket[m] = (byMarket[m] || 0) + rowValueUSD('stocks', r); });
  document.getElementById('stocks-us-total').textContent = 'USD ' + fmtUSD(byMarket.US);
  document.getElementById('stocks-tw-total').textContent = 'USD ' + fmtUSD(byMarket.TW);
  document.getElementById('stocks-id-total').textContent = 'USD ' + fmtUSD(byMarket.ID);

  // Section totals
  document.getElementById('emergency-total').textContent    = 'USD ' + fmtUSD(totals.emergency);
  document.getElementById('retirement-total').textContent   = 'USD ' + fmtUSD(totals.retirement);

  // Allocation bar
  document.getElementById('bar-stocks').style.width      = alloc.stocks + '%';
  document.getElementById('bar-emergency').style.width   = alloc.emergency + '%';
  document.getElementById('bar-retirement').style.width  = alloc.retirement + '%';

  // Legend
  document.getElementById('leg-stocks').textContent     = 'Stocks / ETFs — '  + alloc.stocks     + '%';
  document.getElementById('leg-emergency').textContent  = 'Emergency — '       + alloc.emergency  + '%';
  document.getElementById('leg-retirement').textContent = 'Retirement — '      + alloc.retirement + '%';
}
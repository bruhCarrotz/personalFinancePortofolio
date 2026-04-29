/**
 * renderer.js
 *
 * Owns all DOM writes. Nothing else should touch innerHTML or textContent
 * except through functions defined here.
 *
 * Exports:
 *   renderSection(sectionKey, rows)
 *     → rebuilds the <tbody> for a section from scratch
 *
 *   updateDashboard(data)
 *     → recalculates totals and refreshes:
 *        · Net worth banner + pills
 *        · Section total labels
 *        · Allocation bar widths + legend text
 *
 *   updateRowUSDCell(sectionKey, rowIndex, tr)
 *     → refreshes just the USD cell of one row (used on keystroke)
 *
 * Internal helpers (not exported, used only within this file):
 *   buildRow(sectionKey, row, idx) → <tr> element
 *   tagClass(currency)             → CSS class for currency badge
 */

/* ── Currency badge colour ── */
function tagClass(currency) {
  return { USD: 'tag-usd', TWD: 'tag-twd', IDR: 'tag-idr' }[currency] ?? 'tag-usd';
}

/* ── Date cell with native calendar picker ── */
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

/* ── Build a single editable <tr> ── */
function buildRow(sectionKey, row, idx) {
  const meta = CONFIG.SECTIONS[sectionKey];
  const val  = rowValueUSD(sectionKey, row);
  const isStocks = sectionKey === 'stocks';
  const tr = document.createElement('tr');

  if (isStocks) {
    // Name | Date | Units | Buy Price | Current Price | Market | (currency+usd+gl+del below)
    tr.appendChild(makeTextCell(row.col1, meta.col1, (v) => {
      appData.stocks[idx].col1 = v; savePortfolio(appData);
    }));
    tr.appendChild(makeDateCell(row.col2, (v) => {
      appData.stocks[idx].col2 = v; savePortfolio(appData);
    }));
    const tdUnits = document.createElement('td');
    tdUnits.className = 'num';
    tdUnits.appendChild(makeNumberInput(row.col3, meta.col3, (v) => {
      appData.stocks[idx].col3 = v; savePortfolio(appData);
      updateRowUSDCell('stocks', idx, tr);
    }));
    tr.appendChild(tdUnits);
    // Buy price (reference only — does not affect net worth)
    const tdBuy = document.createElement('td');
    tdBuy.className = 'num';
    tdBuy.appendChild(makeNumberInput(row.col4, meta.col4, (v) => {
      appData.stocks[idx].col4 = v; savePortfolio(appData);
      updateRowUSDCell('stocks', idx, tr);
    }));
    tr.appendChild(tdBuy);
    // Current price (drives net worth value)
    const tdCurrent = document.createElement('td');
    tdCurrent.className = 'num';
    tdCurrent.appendChild(makeNumberInput(row.col5, meta.col5, (v) => {
      appData.stocks[idx].col5 = v; savePortfolio(appData);
      updateRowUSDCell('stocks', idx, tr);
    }));
    tr.appendChild(tdCurrent);
    // Market select (US / TW / ID)
    const tdMarket = document.createElement('td');
    tdMarket.className = 'num';
    const msel = document.createElement('select');
    msel.className = 'tag tag-market';
    ['US','TW','ID'].forEach(m => {
      const opt = document.createElement('option');
      opt.value = m; opt.textContent = m;
      if ((row.market || 'US') === m) opt.selected = true;
      msel.appendChild(opt);
    });
    msel.addEventListener('change', () => {
      appData.stocks[idx].market = msel.value;
      savePortfolio(appData);
      updateMarketChart(appData.stocks);
    });
    tdMarket.appendChild(msel);
    tr.appendChild(tdMarket);

  } else if (sectionKey === 'emergency') {
    // Date | Amount | (currency + usd + del appended below)
    tr.appendChild(makeDateCell(row.col1, (v) => {
      appData.emergency[idx].col1 = v; savePortfolio(appData);
    }));
    const tdAmt = document.createElement('td');
    tdAmt.className = 'num';
    tdAmt.appendChild(makeNumberInput(row.col4, meta.col4, (v) => {
      appData.emergency[idx].col4 = v; savePortfolio(appData);
      updateRowUSDCell('emergency', idx, tr);
    }));
    tr.appendChild(tdAmt);

  } else if (sectionKey === 'retirement') {
    // Date | Provider | Balance | (currency + usd + del appended below)
    tr.appendChild(makeDateCell(row.col1, (v) => {
      appData.retirement[idx].col1 = v; savePortfolio(appData);
    }));
    tr.appendChild(makeTextCell(row.col2, meta.col2, (v) => {
      appData.retirement[idx].col2 = v; savePortfolio(appData);
    }));
    const tdBal = document.createElement('td');
    tdBal.className = 'num';
    tdBal.appendChild(makeNumberInput(row.col4, meta.col4, (v) => {
      appData.retirement[idx].col4 = v; savePortfolio(appData);
      updateRowUSDCell('retirement', idx, tr);
    }));
    tr.appendChild(tdBal);
  }

  // Currency select — shared by all sections
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
    updateRowUSDCell(sectionKey, idx, tr);
  });
  tdCur.appendChild(sel);
  tr.appendChild(tdCur);

  // USD value — read-only computed
  const tdUSD = document.createElement('td');
  tdUSD.className = 'num usd-cell';
  tdUSD.textContent = fmtUSD(val);
  tr.appendChild(tdUSD);

  // G/L cell — stocks only
  if (isStocks) {
    const tdGL = document.createElement('td');
    tdGL.className = 'num gl-cell';
    const gl = rowGainLoss(row);
    if (gl === null) {
      tdGL.textContent = '—';
      tdGL.style.color = 'var(--muted)';
    } else {
      tdGL.textContent = (gl.diff >= 0 ? '+' : '') + fmtUSD(gl.diff) + ' (' + gl.pct.toFixed(1) + '%)';
      tdGL.style.color = gl.diff >= 0 ? 'var(--accent)' : '#c0392b';
    }
    tr.appendChild(tdGL);
  }

  // Delete button
  const tdDel = document.createElement('td');
  const delBtn = document.createElement('button');
  delBtn.className = 'del-btn';
  delBtn.title = 'Delete row';
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

/* ── Render a full section tbody ── */
function renderSection(sectionKey, rows) {
  const tbody = document.getElementById(sectionKey + '-body');
  tbody.innerHTML = '';
  rows.forEach((row, idx) => tbody.appendChild(buildRow(sectionKey, row, idx)));
}

/* ── Refresh just the USD and G/L cells of one row (fast path on keystroke) ── */
function updateRowUSDCell(sectionKey, idx, tr) {
  const row = appData[sectionKey][idx];
  tr.querySelector('.usd-cell').textContent = fmtUSD(rowValueUSD(sectionKey, row));
  if (sectionKey === 'stocks') {
    const glCell = tr.querySelector('.gl-cell');
    if (glCell) {
      const gl = rowGainLoss(row);
      if (gl === null) {
        glCell.textContent = '—';
        glCell.style.color = 'var(--muted)';
      } else {
        glCell.textContent = (gl.diff >= 0 ? '+' : '') + fmtUSD(gl.diff) + ' (' + gl.pct.toFixed(1) + '%)';
        glCell.style.color = gl.diff >= 0 ? 'var(--accent)' : '#c0392b';
      }
    }
    updateMarketChart(appData.stocks);
  }
  updateDashboard(appData);
}

/* ── Refresh all dashboard numbers ── */
function updateDashboard(data) {
  const totals = {
    stocks:     sectionTotalUSD('stocks',     data.stocks),
    emergency:  sectionTotalUSD('emergency',  data.emergency),
    retirement: sectionTotalUSD('retirement', data.retirement),
  };
  const grand = calcNetWorth(totals);
  const alloc = calcAllocations(totals);

  // Net worth banner
  document.getElementById('net-worth-total').textContent = fmtUSD(grand);
  document.getElementById('pill-stocks').textContent     = fmtUSD(totals.stocks);
  document.getElementById('pill-emergency').textContent  = fmtUSD(totals.emergency);
  document.getElementById('pill-retirement').textContent = fmtUSD(totals.retirement);

  // Section totals
  document.getElementById('stocks-total').textContent     = 'USD ' + fmtUSD(totals.stocks);
  document.getElementById('emergency-total').textContent  = 'USD ' + fmtUSD(totals.emergency);
  document.getElementById('retirement-total').textContent = 'USD ' + fmtUSD(totals.retirement);

  // Allocation bar
  document.getElementById('bar-stocks').style.width      = alloc.stocks + '%';
  document.getElementById('bar-emergency').style.width   = alloc.emergency + '%';
  document.getElementById('bar-retirement').style.width  = alloc.retirement + '%';

  // Legend labels
  document.getElementById('leg-stocks').textContent     = 'Stocks / ETFs — '  + alloc.stocks     + '%';
  document.getElementById('leg-emergency').textContent  = 'Emergency — '       + alloc.emergency  + '%';
  document.getElementById('leg-retirement').textContent = 'Retirement — '      + alloc.retirement + '%';
}

/* ── Input helpers ── */
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

function makeTextInputInline(value, placeholder, onChange) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value || '';
  input.placeholder = placeholder;
  input.addEventListener('input', () => onChange(input.value));
  return input;
}

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
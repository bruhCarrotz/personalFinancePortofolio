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

/* ── Build a single editable <tr> ── */
function buildRow(sectionKey, row, idx) {
  const meta = CONFIG.SECTIONS[sectionKey];
  const val  = rowValueUSD(sectionKey, row);
  const isStocks = sectionKey === 'stocks';

  const tr = document.createElement('tr');

  // col1 — name/description
  tr.appendChild(makeTextCell(row.col1, meta.col1, (v) => {
    appData[sectionKey][idx].col1 = v;
    savePortfolio(appData);
  }));

  // col2 — platform/institution
  tr.appendChild(makeTextCell(row.col2, meta.col2, (v) => {
    appData[sectionKey][idx].col2 = v;
    savePortfolio(appData);
  }));

  // col3 — units (stocks) or text (others)
  const td3 = document.createElement('td');
  td3.className = 'num';
  if (isStocks) {
    td3.appendChild(makeNumberInput(row.col3, meta.col3, (v) => {
      appData[sectionKey][idx].col3 = v;
      savePortfolio(appData);
      updateRowUSDCell(sectionKey, idx, tr);
    }));
  } else {
    td3.appendChild(makeTextInputInline(row.col3, meta.col3, (v) => {
      appData[sectionKey][idx].col3 = v;
      savePortfolio(appData);
    }));
  }
  tr.appendChild(td3);

  // col4 — price (stocks) or balance (others)
  const td4 = document.createElement('td');
  td4.className = 'num';
  td4.appendChild(makeNumberInput(row.col4, meta.col4, (v) => {
    appData[sectionKey][idx].col4 = v;
    savePortfolio(appData);
    updateRowUSDCell(sectionKey, idx, tr);
  }));
  tr.appendChild(td4);

  // col5 — currency select
  const td5 = document.createElement('td');
  td5.className = 'num';
  const sel = document.createElement('select');
  sel.className = 'tag ' + tagClass(row.currency);
  CONFIG.CURRENCIES.forEach(cur => {
    const opt = document.createElement('option');
    opt.value = cur;
    opt.textContent = cur;
    if (cur === row.currency) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    appData[sectionKey][idx].currency = sel.value;
    sel.className = 'tag ' + tagClass(sel.value);
    savePortfolio(appData);
    updateRowUSDCell(sectionKey, idx, tr);
  });
  td5.appendChild(sel);
  tr.appendChild(td5);

  // col6 — USD value (read-only, computed)
  const td6 = document.createElement('td');
  td6.className = 'num usd-cell';
  td6.textContent = fmtUSD(val);
  tr.appendChild(td6);

  // col7 — delete button
  const td7 = document.createElement('td');
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
  td7.appendChild(delBtn);
  tr.appendChild(td7);

  return tr;
}

/* ── Render a full section tbody ── */
function renderSection(sectionKey, rows) {
  const tbody = document.getElementById(sectionKey + '-body');
  tbody.innerHTML = '';
  rows.forEach((row, idx) => tbody.appendChild(buildRow(sectionKey, row, idx)));
}

/* ── Refresh just the USD cell of one row (fast path on keystroke) ── */
function updateRowUSDCell(sectionKey, idx, tr) {
  const row = appData[sectionKey][idx];
  tr.querySelector('.usd-cell').textContent = fmtUSD(rowValueUSD(sectionKey, row));
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

/**
 * calculator.js
 *
 * Pure number-crunching. No DOM access, no storage — just math.
 * Takes the raw data array and returns totals and allocations.
 *
 * Exports:
 *   rowValueUSD(section, row)
 *     → USD value of a single row (uses valueMode from config)
 *
 *   sectionTotalUSD(section, rows)
 *     → sum of all rows in a section, in USD
 *
 *   calcAllocations(totals)
 *     → { stocks: 42.3, emergency: 28.1, retirement: 29.6 } (percentages)
 *
 *   calcNetWorth(totals)
 *     → grand total in USD
 *
 * Formatting helpers (not math, but kept here since they're number-related):
 *   fmtUSD(value)   → "$12,345" or "$1.23M"
 */

function rowValueUSD(sectionKey, row) {
  const mode = CONFIG.SECTIONS[sectionKey].valueMode;
  if (mode === 'product') {
    // stocks: units × price
    const units = parseFloat(row.col3 || 0);
    const price = parseFloat(row.col4 || 0);
    return convertToUSD(units * price, row.currency);
  }
  // emergency / retirement: just the balance figure
  return convertToUSD(parseFloat(row.col4 || 0), row.currency);
}

function sectionTotalUSD(sectionKey, rows) {
  return rows.reduce((sum, row) => sum + rowValueUSD(sectionKey, row), 0);
}

function calcNetWorth(totals) {
  return Object.values(totals).reduce((a, b) => a + b, 0);
}

function calcAllocations(totals) {
  const grand = calcNetWorth(totals);
  if (grand === 0) return { stocks: 0, emergency: 0, retirement: 0 };
  const pct = (v) => parseFloat((v / grand * 100).toFixed(1));
  return {
    stocks:     pct(totals.stocks),
    emergency:  pct(totals.emergency),
    retirement: pct(totals.retirement),
  };
}

function fmtUSD(val) {
  if (val >= 1_000_000) return '$' + (val / 1_000_000).toFixed(2) + 'M';
  return '$' + Math.round(val).toLocaleString();
}

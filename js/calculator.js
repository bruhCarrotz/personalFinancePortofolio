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
    const units        = parseFloat(row.col3 || 0);
    // Use current price (col5) if set, otherwise buy price (col4) as fallback
    const currentPrice = parseFloat(row.col5) > 0 ? parseFloat(row.col5) : parseFloat(row.col4 || 0);
    return convertToUSD(units * currentPrice, row.currency);
  }
  return convertToUSD(parseFloat(row.col4 || 0), row.currency);
}

/** Cost basis in USD: units × avg buy price, converted at current FX */
function rowCostUSD(row) {
  const units    = parseFloat(row.col3 || 0);
  const buyPrice = parseFloat(row.col4 || 0);
  return convertToUSD(units * buyPrice, row.currency);
}

/**
 * Gain/loss for a stock row.
 * Returns null if current price (col5) hasn't been entered yet —
 * so G/L only shows once the user has filled in both buy and current price.
 *
 * Formula:
 *   currentValue = units × currentPrice (in USD)
 *   costBasis    = units × buyPrice     (in USD, same FX rate — apples-to-apples)
 *   diff         = currentValue − costBasis
 *   pct          = diff / costBasis × 100
 */
function rowGainLoss(row) {
  const hasCurrentPrice = parseFloat(row.col5) > 0;
  const hasBuyPrice     = parseFloat(row.col4) > 0;
  if (!hasCurrentPrice || !hasBuyPrice) return null;

  const currentValue = rowValueUSD('stocks', row);
  const costBasis    = rowCostUSD(row);
  const diff = currentValue - costBasis;
  const pct  = costBasis > 0 ? (diff / costBasis * 100) : 0;
  return { diff, pct };
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
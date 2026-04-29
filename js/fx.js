/**
 * fx.js
 *
 * Handles currency conversion.
 * All monetary values in the app are converted to USD for display
 * and for the net worth total.
 *
 * Exports:
 *   getFXRates()           → { USD: 1, TWD: 0.0308, IDR: 0.0000621 }
 *   convertToUSD(amount, currency) → number in USD
 *
 * The rates are read live from the two <input> fields in the FX bar,
 * so changing them instantly affects all calculated values.
 */

function getFXRates() {
  const twdPerUsd = parseFloat(document.getElementById('fx-twd').value) || CONFIG.DEFAULT_FX.TWD;
  const idrPerUsd = parseFloat(document.getElementById('fx-idr').value) || CONFIG.DEFAULT_FX.IDR;
  return {
    USD: 1,
    TWD: 1 / twdPerUsd,
    IDR: 1 / idrPerUsd,
  };
}

function convertToUSD(amount, currency) {
  const rates = getFXRates();
  const rate = rates[currency] ?? 1;
  return parseFloat(amount || 0) * rate;
}

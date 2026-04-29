/**
 * config.js
 *
 * Single source of truth for all static configuration.
 * Edit this file when you want to:
 *   · Change placeholder text in table columns
 *   · Add a new section (e.g. "Crypto")
 *   · Change default FX rates shown on first load
 *   · Add a new supported currency
 *
 * No logic lives here — only plain data objects.
 */

const CONFIG = {

  /** localStorage key. Change this if you want to reset stored data. */
  STORAGE_KEY: 'portfolio_data_v2',

  /** Default FX rates shown when the page loads for the first time. */
  DEFAULT_FX: {
    TWD: 32.5,
    IDR: 16100,
  },

  /** Supported currencies. Add more here if needed. */
  CURRENCIES: ['USD', 'TWD', 'IDR'],

  /**
   * Section definitions.
   * Each key matches the section id used in index.html and in localStorage.
   *
   * col1–col4 are the placeholder texts shown in empty cells.
   * valueMode:
   *   'product'  → value = col3 (units) × col4 (price)   [used for stocks]
   *   'direct'   → value = col4 (balance/amount) directly [used for funds]
   */
  SECTIONS: {
    stocks: {
      valueMode: 'product',
      col1: 'e.g. VT, 00878',
      col2: '',            // date — uses <input type="date">, no placeholder needed
      col3: 'e.g. 10',    // units
      col4: 'e.g. 245.00', // price
    },
    emergency: {
      valueMode: 'direct',
      col1: '',            // date — uses <input type="date">
      col4: 'e.g. 500', // amount
    },
    retirement: {
      valueMode: 'direct',
      col1: '',            // date — uses <input type="date">
      col2: 'e.g. BPJS',  // provider
      col4: 'e.g. 1200', // balance
    },
  },

};
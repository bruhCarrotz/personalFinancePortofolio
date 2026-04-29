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
      col1: 'e.g. VTI',
      col2: 'e.g. Firstrade',
      col3: 'e.g. 10',
      col4: 'e.g. 245.00',
    },
    emergency: {
      valueMode: 'direct',
      col1: 'e.g. BCA Savings',
      col2: 'e.g. BCA',
      col3: 'e.g. 6',
      col4: 'e.g. 50000000',
    },
    retirement: {
      valueMode: 'direct',
      col1: 'e.g. BPJS TK',
      col2: 'e.g. BPJS',
      col3: 'e.g. Defined Benefit',
      col4: 'e.g. 120000000',
    },
  },

};

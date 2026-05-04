# Personal Finance Portofolio

A personal net worth dashboard for tracking investments, emergency fund, retirement, and cash across multiple currencies. This project is designed for GitHub Pages and runs entirely in the browser. It uses a simple static structure with separate HTML, CSS, and JavaScript files so the layout, styling, and logic are easier to maintain and debug.

Further improvement such as dynamic stock and currencies pricing, simple database structure, etc. is in consideration and in progress.

## Documentation & Fixes
**2026/05/04** : Local Storage & File‑Based Portfolio Sync
* Developed an async routine that fetches `./portfolio-data.json` using cache: `'no-store'`.
* Developed a helper that serializes `appData` into a pretty‑printed JSON blob and initiates a download as `portfolio-data.json`.
* Developed a file‑import routine that reads a user‑selected `.json` file, validates the presence of a stocks array, writes the payload to `localStorage`, and re‑renders all portfolio views in place without a page reload.
* Developed a SheetJS‑based exporter that assembles a multi‑sheet workbook with “Stocks”, “Emergency Fund”, “Retirement”, and a unified “Summary” sheet that computes cost basis, current value, and gain/loss metrics.
* Removed `Cost-Basis` and `Current Value` pie chart, replacing them with per-market holding pie charts.

**2026/04/30** : Functional and Visual Improvements
* Developed modernized sidebar with a new multi-section layout that now tracks Cost Basis, Current Value, and Portfolio Growth alongside market distribution.
* Developed a standardized visualizations using a shared factory, enabling synchronized updates across all charts and metrics with a single call.
* Fixed gain/loss calculations to provide both per-market breakdowns and portfolio-wide performance summaries in dollars and percentages.
* Implemented automatic display-level sorting for all holdings, ensuring data is always organized chronologically by date while keeping the underlying data structure intact.

**2026/04/29** : Initial Commits
* Developed core structure, theme and design of the webpage.
* Added support for tracking stocks across multiple markets (US, Taiwan, Indonesia) in a single, consistent data model.
* Updated the interface so holdings are clearly grouped by market while sharing the same underlying logic and storage.
* Simplified how users add new holdings and accounts so changes are instantly saved and reflected in the UI.
* Improved startup behavior so the app reliably restores the latest saved portfolio and FX settings on load.
* Ensured FX changes automatically recalculate values and keep totals and allocations accurate.
* Introduced a visual pie chart to make overall stock allocation easier to understand at a glance.

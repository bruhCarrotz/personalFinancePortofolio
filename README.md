# Personal Finance Portofolio

A personal net worth dashboard for tracking investments, emergency fund, retirement, and cash across multiple currencies. This project is designed for GitHub Pages and runs entirely in the browser. It uses a simple static structure with separate HTML, CSS, and JavaScript files so the layout, styling, and logic are easier to maintain and debug.

Further improvement such as dynamic stock and currencies pricing, simple database structure, etc. is in consideration and in progress.

## Documentation & Fixes
**2026/04/29** : Initial Commit
* Developed core structure, theme and design of the webpage.
* Added support for tracking stocks across multiple markets (US, Taiwan, Indonesia) in a single, consistent data model.
* Updated the interface so holdings are clearly grouped by market while sharing the same underlying logic and storage.
* Simplified how users add new holdings and accounts so changes are instantly saved and reflected in the UI.
* Improved startup behavior so the app reliably restores the latest saved portfolio and FX settings on load.
* Ensured FX changes automatically recalculate values and keep totals and allocations accurate.
* Introduced a visual pie chart to make overall stock allocation easier to understand at a glance.
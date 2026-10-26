# BIMAGE Fee & Quotation

BIM services fee calculator and quotation generator for BIMAGE Consulting (M) Sdn Bhd.
Developed by Mohamad Izani Ahmad Kamal Hasni. Version 1.0.0, updated 26 October 2026.

Static website (HTML, CSS, JavaScript). No server, no build step. Runs on GitHub Pages.

## What it does

| Area | What you get |
| --- | --- |
| Dashboard | Quoted value, awarded value, open pipeline, projects in and closed per month, amount by status, manpower demand per month (stacked by role, quoted projects as tentative), who is deployed this month |
| Project data | Project name, client, building or infrastructure, disciplines, project and BIM durations, levels/area, scope of services (ROQ items A–M), drawings provided, models provided, commencement month, margin, SST |
| Build team | One click turns project data into manpower lines, licences, hardware and quotation items (rules from the W430 workbook) |
| Manpower | Package, ROQ items, role, discipline, staff name or TBC, nos, start/end month, RM per month, total, margin (global or per line), after margin, optional flag, deployment Gantt, heads per month |
| Software / Hardware | Licence and laptop rows tied to each manpower line, rates from the database |
| Fee summary | Same layout as the Fee Summary sheet, base and optional, SST 8%, margin earned, person-months, average monthly fee |
| Quotation | Items A–K with % splits from each manpower line, by-client and rate-only items, notes, allocation check, then a print-ready quotation (Save as PDF) and a Word (.docx) download, both following the company template |
| Database | Staff, roles and monthly rates, software, hardware, clients |
| Settings | Company details, defaults, payment terms, T&C, GitHub sync, backup/import, password hash helper |

The W430 project is loaded as sample data. Its totals match the workbook and the issued quotation:
RM 2,053,525.98 + SST RM 164,282.08 = **RM 2,217,808.06**.

## Calculation (same as the workbook)

- Manpower line: `Nos × Rate (RM/month) × Months`, months = End − Start + 1
- After margin: `line total × (1 + margin)`; margin is per project with optional per-line override
- Line pool: after-margin manpower + its licences (users × rate) + its hardware (users × rate)
- Quotation item amount: sum of `% × line pool` (or `% × package pool`); rate = amount ÷ qty, rounded to 2 decimals; amount = rate × qty
- Total, SST 8% on total, Total Amount; optional items priced and taxed separately
- Bi-weekly meetings: `months × 52/12 ÷ 2`, rounded down (12 months → 26 sessions)
- Ad-hoc meeting rate: Coordinator rate × (1 + margin) ÷ 22 working days (RM 610)

## Where the data lives

1. **This browser** (default). Saved automatically on every change.
2. **A private GitHub repository** (recommended). Settings > Database on GitHub. Push and pull a single `data/db.json` file with a fine-grained token. The token stays in your browser.
3. **Backup file**. Settings > Backup > Export, import on another machine.

Keep client data out of the website repository. The website repo is public on the free GitHub Pages plan; the data repo must be private.

## Password

The password (`bimaget`) is checked in the browser against a SHA-256 hash in `assets/js/config.js`.
This keeps casual visitors out. It is not real security: anyone who reads the public source can see the hash, and a short password can be guessed from it. Real protection for the numbers comes from keeping the data in the private repository, which needs your token.

To change the password: Settings > Access, type the new password, copy the hash, paste it into `PASSWORD_SHA256` in `assets/js/config.js`, commit.

## Files

```
index.html                 app shell
assets/css/app.css         app styles
assets/css/quote.css       quotation sheet (screen + A4 print)
assets/js/config.js        name, version, update date, password hash
assets/js/calc.js          calculation engine
assets/js/store.js         database, seed data (W430), GitHub sync
assets/js/generator.js     builds team and quotation from project data
assets/js/quote.js         quotation page and Word export
assets/js/app.js           screens and interactions
assets/vendor/             Chart.js 4.4.1, docx 8.5.0 (bundled, no CDN needed)
assets/img/                BIMAGE logos
```

When you release a change, update `VERSION` and `UPDATED` in `assets/js/config.js`; they show on the login screen, sidebar and footer.

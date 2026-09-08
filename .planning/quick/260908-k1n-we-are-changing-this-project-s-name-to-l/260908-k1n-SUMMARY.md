---
quick_id: 260908-k1n
status: complete
description: Rename the project and product to Labelore everywhere
completed: 2026-09-08
code_commit: 65b1919
---

# Quick Task Summary: Rename the project to Labelore

The product now presents one identity across package metadata, browser chrome, application UI,
runtime messages, tests, fixtures, active planning documents, and historical project artifacts.
The remote was already named `labelore.git`; repository-controlled path references now agree with it.

## Delivered

- Renamed display branding to `Labelore` and machine identifiers to `labelore` / `LABELORE`.
- Replaced the book logo with a label/tag mark in the application shell.
- Added `public/favicon.svg`, the matching orange label favicon, and linked it from `index.html`.
- Renamed the theme storage key, synthetic host, smoke/startup output, temporary test paths, test globals,
  package name, fixtures, golden snapshots, and project documentation.
- Removed the obsolete backlog phase that existed only to request this rename.
- Updated the project-local gsd-browser identity in `.mcp.json` without adding that pre-existing local
  file to version control.

## Verification

- Repository-wide scan excluding `.git`, dependencies, and generated `dist` content: no former brand
  variants remain.
- `npm run typecheck` — passed.
- `npm run build` — passed.
- `npm test -- --run` — 39 files, 547 tests passed.
- `npm run lint` — passed.
- `npm run smoke -- fixtures/dense` — `Labelore smoke passed for fixtures/dense`.
- Playwright desktop/mobile check — title `Labelore`, shell brand `Labelore`, tag SVG present, favicon
  returns HTTP 200 as `image/svg+xml`, no overflow, console errors, or page errors.

## Scope note

The filesystem checkout directory is managed by the active workspace and was not moved during this
task. The repository remote already points to `https://github.com/whonoahexe/labelore.git`.

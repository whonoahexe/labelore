---
status: testing
phase: 07-recognised-files-and-readable-urls
source: [07-VERIFICATION.md]
started: 2026-10-27T11:24:30Z
updated: 2026-10-27T11:24:30Z
---

## Current Test

number: 1
name: Image page, light and dark: open ui-reviews/screenshots/glaze-panel.png (Fit to width, Actual size, Grid on a transparent PNG, Expand) and ui-reviews/kiln-map.svg on the Shapes fixture (node src/server/index.ts test/fixtures/shapes --port 5390)
expected: |
  Both open on the image page matching 07-UI-SPEC section 1; the SVG shows as an inert picture and its script does not run; Grid shows the checker behind transparency; Actual size scrolls inside the frame, not the page
awaiting: user response

## Tests

### 1. Image page, light and dark: open ui-reviews/screenshots/glaze-panel.png (Fit to width, Actual size, Grid on a transparent PNG, Expand) and ui-reviews/kiln-map.svg on the Shapes fixture (node src/server/index.ts test/fixtures/shapes --port 5390)
expected: Both open on the image page matching 07-UI-SPEC section 1; the SVG shows as an inert picture and its script does not run; Grid shows the checker behind transparency; Actual size scrolls inside the frame, not the page
result: [pending]

### 2. File details card at light, dark and 390px width: open the PDF (v1.1/phase-1/firing-sheet.pdf), notes/kiln-curve.dat, and a large-text case (copy the fixture to a temp folder, add a 2 MB text file under .planning/research)
expected: The card matches 07-UI-SPEC section 2: eyebrow, lead sentence, File details panel with Name, Type, Size, Folder; nothing overflows at 390px
result: [pending]

### 3. Drawer After stage at light, dark and the 390px drill-down for phase 01 (PNG, PDF) and phase 02 (COVERAGE.md, .continue-here.md)
expected: Rows and quiet extension-and-size badges match 07-UI-SPEC section 3; badges use no tone and no primary colour; labels ellipsise and the badge never truncates
result: [pending]

### 4. 07-03 walkthrough: npm run dev on this repository, open /, then /someone-else/roadmap
expected: / lands on /labelore; drawer, nav tabs and document breadcrumbs keep the /labelore prefix; the other address shows the wrong-project not-found page
result: [pending]

### 5. 07-07 walkthrough: open a phase from the drawer, a plan and its Summary tab, a quick task, a codebase or note page, /labelore/v1.1 and a live alias /labelore/v1.1/roadmap
expected: The address bar reads like the page; the bare milestone lands on the archived roadmap; the alias lands on /labelore/roadmap; Back skips the redirected entries
result: [pending]

### 6. 07-08 walkthrough: open an old bookmark such as /milestones/m~v1.1/phases/<old key> and /artifacts/<old token>
expected: The address switches to the readable URL with no notice, and Back does not return to the old address
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps

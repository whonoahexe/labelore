---
phase: 07
slug: recognised-files-and-readable-urls
audit_date: 2026-10-27
baseline: 07-UI-SPEC.md
screenshots_captured: true
overall_score: 20
---

# Phase 07 — UI Review

**Audited:** 2026-10-27
**Baseline:** 07-UI-SPEC.md (approved 2026-10-26), with 07-CONTEXT.md and the ten plan/summary pairs as intent
**Screenshots:** Captured from the Shapes fixture in light and dark, at 1440x900 and 390x844. They were kept out of the repo. Interaction capture was off, so hover, click and the Grid / Expand / Fit behaviour were checked in the code only.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Every contracted string matches: the eyebrows, leads, error and over-cap copy, the not-found and wrong-project body, the type labels, `Dimensions unknown`, and the `File details` keys. |
| 2. Visuals | 3/4 | The not-found page's only action, "Return to the dashboard", renders as unstyled body text. |
| 3. Color | 4/4 | The accent appears only where the contract reserves it. The binary, image and not-found pages use no destructive or warning tone, and the drawer badges are muted mono. |
| 4. Typography | 3/4 | Inherited off-contract type renders on the new pages: `.places-badge` at weight 400 and 11.2px keys. The contract acknowledges both, and this phase did not add to them. |
| 5. Spacing | 3/4 | Inherited 10px, 12px and 20px values render on the info card and the figure body. The contract acknowledges these. The new CSS uses no tokens and sets no spacing. |
| 6. Experience Design | 3/4 | The loading, error, not-found and redirect states work. The populated image states could not be seen because the fixture images are tiny. |

**Overall: 20/24.** No blocker-level defect was found.

---

## Verified Working

- **Image page** (`/shapes/v1.1/phase-1/kiln-floor.png`):
  - The eyebrow reads `Image`, the h1 is the file name, and the facts line reads `PNG image · 70 B · 1 × 1 px`.
  - The `FigureFrame` Preview offers Fit to width, Grid and Expand.
  - The page holds one `<img alt>`, served from `/api/files?route=…`. There is no View/Source toggle and no download or raw link.
  - There is no horizontal overflow in either colour scheme or viewport.
- **SVG** (`/shapes/ui-reviews/kiln-map.svg`) is served as an `<img>` and loads at its natural 24x12. The page has no `object`, `iframe` or `embed`.
- **Binary files** (the PDF, `kiln-curve.dat` and the extension-less `kiln-log`) show the `Binary file` card with `File details`:
  - The card has Name, Type, Size and Folder rows and reads "Labelore does not show this file's contents."
  - The `.dat` file reads `Binary file (.dat)` and the extension-less file reads `Binary file`.
- **Not-found and wrong project:**
  - Both `/shapes/no-such-page/deep/here` and `/someone-else/roadmap` show the typed address as escaped text in `artifact-path`.
  - The wrong-project body names `shapes`.
- **Drawer, phase 01, After stage:**
  - `firing-sheet.pdf · PDF · 70 B` and `kiln-floor.png · PNG · 70 B` sort alphabetically after the known documents.
  - Each row carries `data-file-class`. The badge is `aria-hidden` and has a screen-reader twin.
  - There is no tone, icon or grouping.
- **Copy-path button** has `aria-label="Copy file path"` and its `title` is the path.
- `test/web/class-vocabulary.test.ts` passes. `docs/design-language.md` has the "File-class marks are quiet" bullet the contract requires.
- No captured route logged a console error.

---

## Top 3 Priority Fixes

1. **The not-found link reads as plain text.** In `src/web/pages/not-found-page.tsx`, "Return to the dashboard" has no class and renders like body text, so the way back is hard to spot. Fix: give the `Link` the existing `text-link` vocabulary class. No new class is needed.
2. **The populated image states are unverified.** These were not seen, because the fixture PNG is 1x1 and the SVG is 24x12:
   - Fit to width on a wide image
   - Actual size scrolling horizontally inside `.figure-frame-body`
   - Grid over a transparent PNG
   - Expand at actual size

   The code (`figure-frame.tsx` and the `.figure-frame-body img` rules) looks correct. Confirm it in the end-of-phase walkthrough with a scratch copy of the fixture that has a wide PNG and a transparent PNG.
3. **Inherited off-contract type and spacing remain on the new pages.** This is the third weight on `.places-badge` and the 11.2px / 10px / 12px values on the info card. The contract accepts them and forbids copying them, so track this as known debt, not a fix for this phase.

---

## Unresolved in the Contract (not audited as defects)

- **Over-cap image:** the 10 MB cap is a planner assumption, and no fixture is that large.
- **Animated images:** GIF, WebP and APNG autoplay with no pause control. The contract accepts this.
- **Large-text card (over 1 MB):** no fixture exists, so it was checked in the code only.
- **Some drawer rows** are not in the fixture, so their order was not verified: quick-task rows, `COVERAGE.md` and `.continue-here.md`.

---

## Files Audited

- `.planning/phases/07-recognised-files-and-readable-urls/07-UI-SPEC.md`, `07-CONTEXT.md`, `07-{01..10}-SUMMARY.md`
- `src/web/pages/image-page.tsx`, `file-details-page.tsx`, `not-found-page.tsx`, `document-route.tsx`
- `src/web/components/figure-frame.tsx`, `planning-places.tsx`, `copy-path-button.tsx`
- `src/presentation/file-facts.ts`
- `src/web/styles/globals.css` (figure-frame and places-badge rules)
- `docs/design-language.md`

# Phase 08 — UI Review

**Audited:** 2026-10-31
**Baseline:** 08-UI-SPEC.md (approved 2026-10-27), docs/design-language.md, 08-CONTEXT.md
**Screenshots:** not captured (no dev server on localhost:3000, 5173 or 8080; code-only audit)
**Interaction captures:** off (workflow.ui_interaction_capture is false)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Phase 8 copy matches the UI-SPEC Copywriting Contract almost verbatim across the switcher, landing, dialog, scan and forget flows |
| 2. Visuals | 3/4 | Structure and focal points follow the contract, but no screenshot was taken, so the sketch-comparison backstop is unverified |
| 3. Color | 4/4 | Accent use stays inside the five reserved roles; no hardcoded colour in the Phase 8 CSS block; 60/30/10 split unmeasured |
| 4. Typography | 4/4 | Only `--fs-2/3/4/7` and `--fw-medium/semibold` in the Phase 8 block; one Button left at the default 12px (see Finding T-1) |
| 5. Spacing | 3/4 | New CSS carries literal `px` and `rem` values (hairline borders, 2px rules, a `62rem` breakpoint not declared in the contract) |
| 6. Experience Design | 3/4 | Loading, empty, error, unavailable, forget-confirm and cap states are all implemented; touch-target and long-text backstops are unverified |

**Overall: 21/24**

Scores are capped by evidence. Pillars 2, 5 and 6 depend on visual checks the UI-SPEC requires (1280px and 390px, light and dark, a four-project fixture) and that this code-only audit could not perform.

---

## Top 3 Priority Fixes

1. **Visual backstop never evidenced** — The UI-SPEC makes a sketch-screenshot comparison a gate (1280px and 390px, light and dark, loaded/loading/unavailable/`ssh://` rows) and lists a 120-character path no-scroll test as a backstop. Neither is recorded — impact: layout, dark-mode parity and overflow at 390px are unverified. Fix: start the dev server, run `test/e2e/switcher.spec.ts` and `test/e2e/projects.spec.ts` (or capture the matrix with Playwright), and attach the screenshots to the phase.

2. **Sixth type size on the landing retry button** — "Retry loading projects" (`src/web/pages/projects-page.tsx:45`, and `src/web/pages/project-layout.tsx:45`) renders through the base `Button`, whose `text-xs` (12px) is not in the four-step scale. The UI-SPEC requires every Button in this phase to set Meta size (`--fs-3`). Impact: a visibly different label size in the list error state. Fix: add `font-size: var(--fs-3)` to a rule that covers that error notice's button (for example `.projects-page .notice button`).

3. **Literal units and an undeclared breakpoint in new CSS** — The Phase 8 block (`src/web/styles/globals.css` lines 25536–26400) uses `1px` borders throughout, `2px` rules and outlines (lines 225, 437, 685), and `@media (min-width: 62rem)` (line 349). The UI-SPEC bans literal `px`/`rem` in new CSS and names only the 42rem breakpoint. Impact: the side-column breakpoint is undocumented in the contract, so a future change will not know which breakpoints are sanctioned. Fix: either add the 62rem breakpoint and the hairline widths to the UI-SPEC Spacing exceptions, or express them through existing tokens.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

Verified present in source and matching the contract:
- Landing eyebrow, h1 and lede: `projects-page.tsx` ("Projects", "Open a GSD project to see where its work stands. Labelore only reads them and never changes them.").
- Section headings "Add a project" and "Scan a folder" (`projects-page.tsx` ~line 90, ~103).
- Empty state "No projects yet." and body text (`projects-page.tsx` ~line 63–66).
- Load marks "Opening…", "Unavailable" with the server reason, "Already added" (`project-row.tsx` ~lines 180–190, `project-scan.tsx` line 89).
- "Opened {relative}" / "Not opened yet" (`opened-ago.ts`).
- Switcher trigger `aria-label`, "All projects", "Add or scan…" (`project-switcher.tsx` ~lines 81, 91, 160).
- Forget confirm text is exact (`project-row.tsx` line 109), with "Forget project" and "Keep project".
- Add form label "Project location", placeholder, error heading "Could not add this project.", "Path checked:", duplicate "is already in your list." with "Open {name}" link (`add-project-form.tsx`).
- Scan copy: legend singular/plural, "Scanning {folder}…", "No GSD projects found in {folder}.", cap notice, "Added 1 project." / "Added N projects." (`project-scan.tsx` lines 29–38, 237–249).
- Unknown slug heading and body (`unknown-project-page.tsx` lines 24–26).
- Server-owned messages (settings notices, 413, 403, unreachable, folder errors, LABELORE_CONFIG_DIR) are defined once in `src/server/*` and `src/web/api.ts`, not re-worded client-side.

No generic labels ("Submit", "OK", "Click here") were found in the Phase 8 files. Nothing deducted.

### Pillar 2: Visuals (3/4)

Evidence for the score:
- Focal points follow the contract: the current row carries the accent rule, the `Check` icon and `data-current="true"` (`project-row.tsx` line ~150; `globals.css` line 225).
- Icon-only controls carry `aria-label` (forget button, `project-row.tsx` line 209). Load marks are text, not colour alone.
- The header trigger is a `Popover.Trigger` with `aria-haspopup="dialog"` and a full-path `title` (`project-switcher.tsx` ~lines 158–168).

Gap: no screenshot exists. Whether the winning sketch (039 A, 040 B) was matched, and whether rows read cleanly at 390px, cannot be confirmed from code. Capped at 3. See Priority Fix 1.

### Pillar 3: Color (4/4)

- Accent (`var(--primary)`) appears in the Phase 8 block only at `globals.css` line 225 (current-row rule), line 261 (current-row icon), and lines 672–677 (the default button). These are the reserved roles 1 and 2 in the contract. The focus ring and the checkbox fill use the global tokens.
- No hardcoded hex, `rgb()` or `oklch()` literal in the Phase 8 CSS block.
- Forget is neutral (`variant="ghost"` on the icon, `outline` in the confirm). The scan submit is `outline`. Add submit is `default`. Matches the contract.
- Load marks use the shared tones: `quiet` for Opening and Already added, `missing` for Unavailable.
- Not measured: the 60/30/10 proportion of the rendered page. That needs a screenshot.

### Pillar 4: Typography (4/4)

- Phase 8 block uses only `--fs-2`, `--fs-3`, `--fs-4`, `--fs-7`, and only `--fw-medium` and `--fw-semibold`. No bold, no ninth size.
- Button label size is overridden to `--fs-3` for `.project-add-form button` (add form and scan form), `.project-switcher-footer button`, `.project-scan-results [data-part='foot'] button`, and `.project-row-confirm button`.

**Finding T-1 (WARNING):** The "Retry loading projects" button in `projects-page.tsx` (line ~45) and `project-layout.tsx` (line ~45) is not covered by any of those selectors. It inherits the base Button `text-xs` (12px, `src/web/components/ui/button.tsx` line 11). This is a size outside the declared four-step scale. See Priority Fix 2.

### Pillar 5: Spacing (3/4)

- No Tailwind spacing utility (`p-`, `m-`, `gap-`, `px-`) or arbitrary value was found in the Phase 8 TSX files.
- Spacing in the CSS block is token-based (`--space-*`), including popup caps `min(calc(var(--space-28) * 4), …)` and forget button sizes via `--space-10`.

**Finding S-1 (WARNING):** Literal units in new CSS:
- `1px solid` borders at many points in the block (for example lines 27, 60, 73, 105, 196–197, 212, 423, 601, 623, 648, 669, 746), and `1px` in outlines.
- `2px` in `box-shadow: inset 2px 0 0 var(--primary)` (line 225) and `outline: 2px solid` (lines 437, 592, 685).
- `@media (min-width: 62rem)` (line 349). The UI-SPEC names only 42rem as the breakpoint. The 62rem side column is documented in `docs/design-language.md` (`projects-page` row) but not in the contract's Spacing exceptions.

These are hairlines and focus rings, not spacing values, but the contract says "no literal `px` or `rem` in new CSS". Either the contract exceptions or the tokens need updating. See Priority Fix 3.

**Not verified:** the 40px minimum target on coarse pointers, and the forget button's 36px and 40px sizes, depend on rendered output.

### Pillar 6: Experience Design (3/4)

States covered in code:
- Loading: "Loading projects…" quiet-state with role status (`projects-page.tsx` lines 30–36); "Opening {name}…" with `aria-busy` on the outlet (`project-layout.tsx` ~line 118, `app-shell.tsx` line 129).
- Error: list request failure with "Retry loading projects" (`projects-page.tsx` ~line 42); invalid project screen with "Choose another project" (`invalid-project-screen.tsx` line 97).
- Empty: landing "No projects yet." and the switcher `empty-note`.
- Unavailable row keeps its place, is still followable, shows reason (`project-row.tsx` ~lines 185–191).
- Forget: inline confirm, focus starts on "Keep project", Escape restores, failure keeps row and returns focus (`project-row.tsx` lines 74–127). Announcement via live region (`projects-page.tsx` ~line 78).
- Scan: pending state, disabled submit, cap notice, "No GSD projects found", "Already added" disabled rows, partial-failure alerts.
- Duplicate add: notice with link to existing project (`add-project-form.tsx` ~lines 126–129).
- Reduced motion handled in CSS (lines 126, 341, 864).

Gaps:
- The retry button sizing issue (T-1) is a small inconsistency in an error state.
- The 390px wordmark/trigger truncation and the 120-character long-text backstop are not verified.
- The shadcn `components.json` is present. The UI-SPEC lists no third-party registry, so no registry audit was required.

Verification run: `npx vitest run test/web/class-vocabulary.test.ts test/web/project-switcher-contract.test.ts test/web/projects-page.test.ts` passed, 58 of 58 tests. This confirms the design-language vocabulary matches the Phase 8 class names. It does not confirm visual output.

---

## Screenshot gate note

No dev server responded on ports 3000, 5173 or 8080, so the `.planning/ui-reviews/` gitignore gate was not needed (no captures written). Visual pillars were scored from code only.

---

## Files Audited

- `.planning/phases/08-several-projects-and-a-switcher/08-UI-SPEC.md`
- `.planning/phases/08-several-projects-and-a-switcher/08-CONTEXT.md`
- `.planning/phases/08-several-projects-and-a-switcher/08-*-SUMMARY.md` and `08-*-PLAN.md` (file lists)
- `docs/design-language.md` (Phase 8 rows, lines ~1314–1332)
- `src/web/components/project-row.tsx`
- `src/web/components/project-switcher.tsx`
- `src/web/components/project-scan.tsx`
- `src/web/components/add-project-form.tsx`
- `src/web/components/project-add-dialog.tsx`
- `src/web/components/app-shell.tsx`
- `src/web/components/ui/button.tsx`
- `src/web/pages/projects-page.tsx`
- `src/web/pages/project-layout.tsx`
- `src/web/pages/unknown-project-page.tsx`
- `src/web/opened-ago.ts`
- `src/web/styles/globals.css` (Phase 8 blocks, lines ~25536–26400)
- `src/server/settings-model.ts`, `src/server/folder-scan.ts`, `src/server/registry-api.ts` (copy source only)
- Tests run: `test/web/class-vocabulary.test.ts`, `test/web/project-switcher-contract.test.ts`, `test/web/projects-page.test.ts`

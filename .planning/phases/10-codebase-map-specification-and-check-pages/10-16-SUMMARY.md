---
phase: 10-codebase-map-specification-and-check-pages
plan: 16
subsystem: spec-page
tags: [spec, ambiguity, gate, requirements, lock-matrix, scope-fence, sketch-047-B, phase-10]
status: complete

requires:
  - phase: 10-codebase-map-specification-and-check-pages
    provides: 10-04 made-up Lendshed SPEC fixtures, 10-05 fence-aware scanner, 10-08 spec manifest and frame, 10-13 sketch 047 winner B
provides:
  - SpecHandler and structured.spec (extractSpec, SpecBody)
  - composeSpec (verdict, five column gauges, requirements matrix with Edge and Prohibition marks, scope fence, bars, source-only strip)
  - SpecView and specHeaderProps, the phase-10-spec CSS block, design-language rows
affects: [10-18 AI spec page (shares the bar and source-only patterns), 10-23 browser spec]

requirements-completed: [VIEW-11]

key-files:
  created:
    - src/planning-repo/handlers/spec-body.ts
    - src/planning-repo/handlers/spec.ts
    - src/web/views/spec-page.ts
    - src/web/views/spec-page-components.tsx
    - test/spec-handler.test.ts
    - test/web/spec-page.test.ts
  modified:
    - src/planning-repo/handlers/index.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/pages/artifact-page.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/__golden__/dense.json

key-decisions:
  - "Sketch 047 B is built as drawn, including the Edges and Must-not columns (read from the Edge Coverage and Prohibitions tables) and the dimension columns, which the plan's SpecBody shape did not list"
  - "The score is the number written first after the label, so a placeholder such as [score] is no score even though a gate number follows it; the gate accepts the sign, its ASCII form, a plain less-than and the entity"
  - "The verdict chip is the small Label-size chip, as 047 B draws it, not the Heading-size chip UI-SPEC Typography names; above the gate is in-flight, never destructive"
  - "Every section the page does not draw becomes a closed native bar (Ambiguity Report included, which the sketch hid); sections with no rendered group go to the In the source only strip, so nothing is dropped"

duration: one session, resumed after an API rate limit
completed: 2026-11-05
actuals:
  tokens: 90000
  tasks: 2
  commits: 4
plan_head_before: ab6ccbab63fcf0888b9043f6bd8cf0560d4a1e71
plan_head_after: d75ce9a998fcf4db191e3251b883d8f160fc1be7
---

# Phase 10 Plan 16: Spec page Summary

**A SPEC opens on sketch 047 B's lock matrix: a verdict ("Locked enough to plan", "Not locked yet", or "Ambiguity not stated") with "{score} against a gate of {gate}", an ambiguity column against the gate line and one column per Ambiguity Report dimension against its minimum, then the requirements as a Current, Target and Acceptance matrix (with Edge and Must-not marks when the file has those tables), the scope as a fence, and every other section as a closed bar.**

## What was built

- **`spec-body.ts` / `spec.ts`.** `extractSpec` reads the head lines, the goal, numbered requirements (bold or plain label, colon inside or outside the bold, continuation lines, unknown sub-bullets kept as extras), Boundaries (In scope, Out of scope split at the first spaced em dash), the Ambiguity Report's dimensions (the total row left out; status from the mark, else compared), the Edge Coverage and Prohibitions tables (`R{n}` references, status with emoji removed) and every `##` heading with a claimed flag. Line scans only, no regular expression; 250,000-character body cap, 200 requirements, 200 rows, 2,000 characters per field. `SpecHandler` matches the `SPEC` token (never UI-SPEC or AI-SPEC), sits before the generic handler, and is guarded so a throw only omits `structured.spec`.
- **`spec-page.ts`.** Pure composer. Verdict tone `complete`, `in-flight` or `quiet`; a score at exactly the gate is locked; no verdict and no numbers for a missing or placeholder score; a quiet "Gate not stated in the file; GSD's 0.20" note. The count line is the file's `Requirements: N locked`, else counted. Returns null (silent fall-through to the manifest's promoted sections) when the file has no score, requirement, dimension, goal or scope.
- **`spec-page-components.tsx`.** `SpecView` and `specHeaderProps` ("Phase N · Spec", the phase name as the h1 with " — Specification" dropped, Created date and count in the meta row). Column gauges, matrix rows that open in place, "Read more" folds, the fence, native `<details>` bars rendered through the page's `renderHtml`, and the In the source only strip. Author text goes through `ResearchInline`; no raw HTML, no href.
- **Wiring.** `specPage` on the spec manifest (lead and promote fallback unchanged); one `useMemo`, the designed-body test, the header override, hidden metadata disclosure and one render branch in `artifact-page.tsx` (named `specPageCover` because `specCover` already means the UI-SPEC page).
- **CSS and docs.** One `phase-10-spec` block (tokens only, both themes, four font sizes, the page-scoped outline rule); design-language Tones rows for complete, in-flight and quiet and a Language bullet.

## Deviations from Plan

### User decision (047 B) and plan differences

1. **[User decision 047 B] SpecBody is wider than the plan's shape.** The plan's shape has no dimensions, Edge Coverage or Prohibitions; the winner draws all three, so `dimensions`, `edges`, `prohibitions`, `created`, `gate`/`gateText`, `scoreText` and `requirementsOmitted` were added. Edge Coverage and Prohibitions are drawn as marks (10-13 open item 1, followed as drawn).
2. **[User decision 047 B] Small verdict chip.** UI-SPEC Typography lists the verdict chip at Heading size; 047 B draws the small Label-size chip (the large form is A's and C's). Built as 047 B draws it. A first build used the large chip and was corrected after the side-by-side.
3. **Ambiguity Report kept as a bar.** The sketch omits it (its "Written anyway" paragraph would be dropped); the plan says it appears as a plain section. It is a closed bar.
4. **Sketch words kept**, as 10-13 recorded them: "Gate not stated in the file; GSD's 0.20", "Met minimum" / "Below minimum", "Not scored", "Ambiguity · lower is better", the matrix key. None is UI-SPEC copy.
5. **h1 from the title.** `splitPhaseTitle(title, 'Specification')`, so the phase name alone is the h1; a title that does not open with `Phase N:` stays whole with the eyebrow "Spec".
6. **[Dispatch] Service not restarted.** The plan's "systemctl --user restart labelore" steps were not run, per the dispatch. Shots came from an isolated server (`LABELORE_CONFIG_DIR`, port 4191), stopped by PID. The plan's `--sketch` shoot option was not used (it times out on this sketch); the sketch shots came from a scratchpad script loading `?state=&theme=#b`. The Playwright suite was not run.
7. **[Rule 1] Pinned tests updated.** The Task 1 tests that pinned "claims Goal and Requirements" and `hasCoverage` false for 01-SPEC were updated when Boundaries and the Edge and Prohibitions tables were read (01-SPEC has both tables).
8. **[Rule 3] CSS guards.** `project-view-contract` forbids a `.status-square` selector outside the project block and `token-guard` forbids a literal `0.3em`: the page sizes squares with its own `view-spec-sq-s/l` classes and `var(--space-1)`.

### TDD record

Task 1 (tracer) shipped the first screen with the extractor reading only what it draws; boundaries and the two coverage tables were held back. RED `62f47cc` (8 page tests and 6 extractor tests failing) came before GREEN `74a956e`. The tracer's end-to-end check (typecheck, build, four screenshots) passed before expansion.

## Golden

`test/__golden__/dense.json` regenerated with `npx vitest run test/snapshot.golden.test.ts -u`. The diff touches only five records, all `.planning/phases/01-identity-slice/01-SPEC.md` (paths at lines 5615, 11028, 15026, 18204, 21382), each `"structured": {}` becoming `"structured": { "spec": ... }`. `git diff -- fixtures/dense` is empty.

## Side by side (sketch left, build right)

Screens in `/tmp/claude-1000/-home-cinedise-codebases-labelore/eee67f35-318e-418b-ab45-56538cdc4f26/scratchpad/build-10-16/`: build in `build/` (`spec-v1-1-phase-{1,2,3}-spec-{1280,390}-{light,dark}.png`), sketch in `sketch/` (`sketch-{01,02,03}-{1280,390}-{light,dark}.png`), the dense fixture's real-shaped SPEC in `dense/`, and an interaction shot (row open, Read more, a bar open) in `interact.png`. Viewed side by side: 02 and 03 at 1280 light and dark, 03 at 390 light, dense at 390 dark, 01 at 1280 light and 390 dark. Differences:

1. **Fixed: verdict chip** was Heading size; now the small chip as drawn.
2. **Fixed: body text** inside the fence tiles and goal read larger than the sketch (the app's inherited size); the page sets Body on its root.
3. **Fixed: "No acceptance stated" chip** overflowed its column; the Acceptance column is wider (it still wraps to three lines at 390, as in the sketch).
4. **Left: page chrome** (the sketch's bar and shell against the app shell, and the shared crumbs row "Dashboard / Roadmap / v1.1 / Phase 02 / ...").
5. **Left: header row order.** The shared ArtifactHeader puts the meta (Created, count) first and the copy button and View / Source toggle after it, right-aligned; the sketch puts the toggle before the dates.
6. **Left: matrix group header.** The sketch's "Fields" and "Coverage" group labels above the column heads are not built.
7. **Left: bar counts.** The sketch's item counts at the right of each bar (4, 2, 8) are not built; the section's html is not counted.
8. **Left: the Ambiguity Report bar** the sketch does not show (deviation 3).
9. **Left: footer lines** after the last rule stay in the last bar's html when the last section is not the Interview Log; on every fixture it is.
10. **Left: the matrix opens several rows at once**; the sketch opens one.

No sideways page scroll at 390 and no page error on any shot; `shoot-pages` printed no FAIL line. Four font sizes in the block (test-pinned).

## Verification

- `npm run test:gate -- test`: `gate: total=5885 passed=5885 failed=0 skipped=0 todo=0` (base 5798). `npm run typecheck`, `npm run lint`, `npm run build`: exit 0.
- Task 1 verify (`test:gate` on the six named files, then typecheck, build, four shots): passed.
- Acceptance: `SpecHandler` in `handlers/index.ts` (4 lines, `UiSpecHandler` matches too); "Locked enough to plan" in `spec-page.ts` on 1 line; `specPage: composeSpec` on 1 line of `manifests.ts`; "No acceptance stated" in `spec-page.ts` on 1 line.
- Growth (T-10-28): extractor stays linear on 10,000 requirements, a 200k-character line, 2,000 headings and 1,600 table rows.

## Known Stubs

None.

## Threat Flags

None new. T-10-28 mitigated (caps and growth tests). T-10-29 mitigated (`ResearchInline`; the contract test forbids the raw-HTML prop and any href). No package installed.

## Self-Check: PASSED

- FOUND: `spec-body.ts`, `spec.ts`, `spec-page.ts`, `spec-page-components.tsx`, `test/spec-handler.test.ts`, `test/web/spec-page.test.ts`.
- FOUND commits 7fcc3f1, 62f47cc, 74a956e, d75ce9a (ancestors of HEAD).
- STATE.md and ROADMAP.md untouched.

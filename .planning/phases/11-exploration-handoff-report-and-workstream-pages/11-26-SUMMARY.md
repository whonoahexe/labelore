---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 26
subsystem: web-views
tags: [onboarding, view-18, desk, sketch-061, view-kind, copy-command]

requires:
  - phase: 11-exploration-handoff-report-and-workstream-pages
    provides: "11-21 winner 061 A (Desk), 11-20 structured.onboarding lift and buildOnboardingContext (firstScreen, differs), 11-09 made-up Lendshed and Tidemark summaries, 11-01 adopted C11 and X2, 11-25 view wiring pattern"
provides:
  - "The 'onboarding' view kind (39th, VIEW_KINDS and the manifests agree both ways) and its manifest: onboarding/SUMMARY.md opens the Desk page"
  - "The onboarding context on /documents for the onboarding summary only; composeOnboarding (pure), OnboardingView and onboardingHeaderProps, the phase-11-onboarding CSS block, design-language tone rows and the onboarding Language bullet"
affects: [11-27, 11-30]

tech-stack:
  added: []
  patterns:
    - "A command copied from author text is passed through stripControlCharacters in the composer, so what the copy row shows is exactly what is copied"
    - "A figure the page computes from a word the summary already wrote (readiness complete means seven of seven) is drawn only when the number itself cannot be read"
    - "Planted sketch states are made by cloning a fixture presentation and re-lifting a edited copy of the fixture text inside the test, never by editing a fixture"

key-files:
  created:
    - src/web/views/onboarding-page.ts
    - src/web/views/onboarding-page-components.tsx
    - test/web/onboarding-page.test.ts
  modified:
    - src/server/project-api.ts
    - src/web/pages/artifact-page.tsx
    - src/web/views/kinds.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/web/view-registry.test.ts
    - test/server/documents-route.test.ts

key-decisions:
  - "The summary's command is the page's first object, in the shared CopyCommand row, with the never-runs sentence once under it. The only handlers on the page are the three object buttons that open a bar and the details toggles; no request, no storage, no command is sent or run (T-11-39)."
  - "The second block 'The first screen suggests' is drawn only when the context says the commands differ (and both read as text and are not the same text); the summary's command then carries 'From the onboarding summary'. Otherwise the block and the line are absent."
  - "Both commands pass through stripControlCharacters in the composer (bidirectional overrides, zero-width characters, line breaks removed), the same defence the Testing panel uses, so the copied text is the visible text (Rule 2)."
  - "A map whose parenthetical holds words, not a number (the real writer's '(complete codebase map)'), with readiness complete still reads '7 of 7 documents mapped'; any other unreadable or over-seven count leaves the figure out and shows 'Documents mapped: not stated'."
  - "Tones: complete (present sheets and squares, Complete map, mapped minis of a complete map), in-flight (Fast map and Partial map chips and their minis), quiet (Not found, Not stated, the dashed second block). Never destructive, warning or missing."

patterns-established:
  - "Objects of a picture are real buttons (not clickable divs) that open the matching closed bar; the bar's open state is React state synced from the native toggle event"

requirements-completed: [VIEW-18]

actuals:
  tokens: 26000
  tasks: 3
  commits: 3

duration: 85min
completed: 2026-11-07
status: complete
commits: 3
plan_head_before: 3d1f5c14c1c709aa0a9b052fc3a826239e6657ec
plan_head_after: e2660c1e5e41656790adfd1f053a9b2be0150afc
---

# Phase 11 Plan 26: Onboarding page Summary

**`onboarding/SUMMARY.md` opens the sketch 061 A "Desk": the summary's own command first in the shared copy row with the never-runs sentence once, the first screen's different command in a quiet dashed block beside it only when it differs, then one desk of three objects (a folder of four file sheets, a folder of seven map documents with the readiness chip, a pile of candidate documents) over three closed bars.**

## Performance

- **Tasks:** 3 (Task 1 a tracer, verified end to end in a real browser before anything was expanded)
- **Files created:** 3, modified: 9

## Accomplishments

- Task 1 (tracer): the `onboarding` kind (39), the manifest with `onboardingPage: composeOnboarding` and the promote fallback, the `onboardingContext` guarded IIFE on `/documents` (kind `onboarding` only, one `buildOnboardingContext(` call), the artifact-page wiring (props, `useMemo`, header override, one render branch), the command-first view and the first `phase-11-onboarding` CSS. A real browser opened Lendshed's summary with `/gsd-manager` and its copy button before the rest was built.
- Task 2: the quiet second block, the desk and the bars; design-language tone rows (complete, in-flight, quiet) and the onboarding bullet; 29 tests in `test/web/onboarding-page.test.ts` including the view contract and the read-only proof.
- Task 3: side-by-side with the 061 winner (below), one correction, the full gate.

| State | Source | What the page draws |
|-------|--------|---------------------|
| present | Lendshed fixture | `/gsd-manager` first, 4 of 4 present sheets, Codebase "Not found" / "No map", 2 candidates, no second block |
| map only, commands differ | Tidemark fixture | `/gsd-ingest-docs` with "From the onboarding summary", the dashed "The first screen suggests" block with `/gsd-new-project` and its own copy row, four dashed "Not found" sheets, Complete map, 7 of 7 mapped, 3 candidates |
| part-way, fast map | planted | 2 of 4 present, Fast map chip (in-flight), 4 of 7 mapped, 1 candidate, one command |
| map only, same command | planted | one command, no second block, no summary line |
| all four missing | planted | four dashed "Not found" sheets, `/gsd-map-codebase`, no candidates (dashed empty pile) |
| no Recommended Next Step | planted | "No command in the summary.", no copy row, no never-runs sentence, the rest still renders |
| none of the four headings | planted | `composeOnboarding` null, promoted sections silently (X2) |
| readiness word outside the three | planted | shown as written in a dashed plain chip |
| markup, bidirectional or control characters in the command | planted | rendered as text; characters removed before copying |

## Side-by-side with the 061 winner (Task 3)

Shots in a scratchpad folder outside the repository, never committed: Lendshed (with `--sketch`, 12 PNGs in the exact verify command, no FAIL line) and Tidemark; the three planted states as temporary roots (copies of the fixtures edited in the scratchpad) beside the sketch's `partial`, `same`, `missing`, `present` and `maponly` states (state shots by an ad hoc script, since `shoot-pages.ts` does not pass `?state=`); and by hand the D-14 scratch copy's real-shape onboarding summary, copied into a temporary root twice (once over Lendshed, once over Tidemark so the differing case shows), at 1280 and 390, light and dark. No FAIL line and no sideways page scroll anywhere.

Matches the layout contract (the command and its note first, the second block to the right at 1280 and under the command at 390, one bordered desk with an 8px foreground table edge, tabbed folders, tinted present sheets and dashed Not found sheets, the pile with the count on top, three closed bars with the same counts). What changed after the side-by-side:

1. **A real-shape map showed a complete map with seven empty minis.** The real writer wrote `Codebase map: .planning/codebase/ (complete codebase map)`, so there is no leading number, and with readiness `complete` the page drew "Documents mapped: not stated" under a "Complete map" chip. A complete map now reads 7 of 7 when the parenthetical has no number (the summary's own readiness word says it); any other unreadable or over-seven count still leaves the figure out. Test added.
2. **Chips take the sketch's typography**: mono face, widest letter spacing and snug line height, in place of the shared chip's sans face (the shared class is not edited; the rule is page-scoped).

Differences kept on purpose:

- The header is the app's own (crumbs "Dashboard / Roadmap / SUMMARY.md", the Copy path icon, View/Source on the right); the sketch draws its own crumbs and buttons. Same decision as 11-25.
- "Copy command" is the shared Phase 10 `CopyCommand` row unchanged (the brief names it as the shared row): its button is the app's secondary button, not the sketch's outlined mono one.
- The in-flight mini documents use a veil fill with the in-flight border; the sketch's 12 percent colour mix cannot be written in a view block (the contract forbids colour recipes), so the fill is a touch greyer than drawn.
- When the summary has no command, the page draws the dashed "No command in the summary." note and leaves out the never-runs sentence (the sketch draws the sentence under it; a sentence about a command that is not there reads wrong).

## Task Commits

1. **Task 1: The onboarding summary opens with its command ready to copy** - `a2bcf84` (feat)
2. **Task 2: The two commands, project files, codebase and documents** - `b0c0aeb` (feat)
3. **Task 3: The onboarding page after the side-by-side** - `e2660c1` (fix)

**Plan metadata:** the commit that adds this SUMMARY.

## Verification

- Full gate (`npm run test:gate`): total=6973 passed=6973 failed=0 skipped=0 todo=0; `npm run typecheck`, `npm run lint` and `npm run build` clean.
- Task 1, 2 and 3 targeted gates and screenshot commands pass (12 PNGs, no FAIL line).
- Not done: `systemctl --user restart labelore` (named in all three tasks). The service serves the main checkout, not this worktree; after the merge the main checkout needs `npm run build` and a restart.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] The copied command could carry invisible characters**
- **Found during:** Task 1 (threat model T-11-39: the command is author text that is copied to a clipboard and pasted into a terminal)
- **Issue:** the summary's command is capped by the lift but not cleaned; a bidirectional override or zero-width character would be copied though not shown.
- **Fix:** the composer passes both commands through `stripControlCharacters` (the Testing panel's defence), so what is copied is the visible text on one line. Tested.
- **Files modified:** src/web/views/onboarding-page.ts, test/web/onboarding-page.test.ts
- **Commit:** a2bcf84, b0c0aeb

**2. [Rule 1 - Bug] A complete map with words in its parenthetical drew no mapped documents**
- **Found during:** Task 3 (the hand-shot real-shape summary)
- **Fix:** see "What changed after the side-by-side", item 1.
- **Commit:** e2660c1

**3. [Rule 3 - Blocking] `left: -2px` failed the token guard's spacing check**
- **Found during:** Task 2 (`test/token-guard.test.ts`)
- **Fix:** the folder tab's offset is `calc(var(--space-0-5) * -1)`.
- **Commit:** b0c0aeb (fixed before the commit)

### Plan wording versus the build

- The plan's copy test says "pressing both copy buttons". This project has no jsdom, so the test reads the two commands from the rendered rows (and their `aria-label`s), then runs the very function the button calls (`copyCommandToClipboard`, through the real clipboard path) with a recording `navigator.clipboard` and a `fetch` spy: two writes equal to the two commands, zero requests. The source of the components is pinned to the two `CopyCommand` rows and no request or run call.
- The plan lists `src/web/views/manifest.ts` and the others as files to edit; the onboarding context carries the lift's map facts but not `mapDetail`, which the page needs for the seven-document figure. The composer reads it from `structured.onboarding.codebase` (already on the response), so `onboarding-context.ts` (outside this plan's files) is unchanged.

**Total deviations:** 3 auto-fixed, 2 notes. **Impact:** none on scope.

## Flagged assumptions

- **VIEW-18 edge probe (11-20), answered for onboarding.** A summary with none of the four known headings falls through (tested); one with no Recommended Next Step still renders its files, codebase and documents (tested); a readiness word outside `none`, `fast`, `partial`, `complete` is shown as written (tested).
- **A map-only project with four missing files** is not what the writer produces (11-02, 11-09); the page handles it either way (the Tidemark fixture and the planted `same` copy).
- **Readiness `complete` with no readable count reads 7 of 7.** This is derived from the summary's own word, not from a count in the file; if a future writer says `complete` for a map that is not seven documents, the page would overstate. Only the word `complete` triggers it.

## Known Stubs

None.

## Threat Flags

None. No endpoint, auth path or file access was added beyond the planned `onboardingContext` field on the existing `/documents` response; the commands are text and nothing runs them (T-11-39), and every string is React text through the page (T-11-58).

## Self-Check: PASSED

- Created files exist: src/web/views/onboarding-page.ts, src/web/views/onboarding-page-components.tsx, test/web/onboarding-page.test.ts FOUND.
- Commits `a2bcf84`, `b0c0aeb` and `e2660c1` are ancestors of HEAD.
- Acceptance checks: `toBe(39)` in view-registry.test.ts 1; `buildOnboardingContext(` in project-api.ts 1 (call site, the import line has no paren); "The first screen suggests" in onboarding-page.ts 2; "view contract" in onboarding-page.test.ts at least 1.

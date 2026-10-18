---
phase: quick-261018-j5h
plan: 01
subsystem: ui
tags: [debug-sessions, per-type-view, discovery, extractor, case-file-page]
requires:
  - phase: quick-261017-k45
    provides: the per-type view seam (manifest hook plus one early return), the learnings page idiom
provides:
  - GSD debug session files read as their own kind and shown as the sketch's case-file page
  - a tolerant server-side extractor for debug sessions
affects: [sidebar navigation for debug sessions (not built), search grouping]
tech-stack:
  added: []
  patterns: [directory-position kind routing, line-scanned loose-YAML extractor, status-adaptive lead]
key-files:
  created:
    - src/planning-repo/handlers/debug-session.ts
    - src/planning-repo/handlers/debug.ts
    - src/web/views/debug-case.ts
    - src/web/views/debug-case-components.tsx
    - test/fixtures/debug/search-index-goes-stale.md
    - test/debug-session.test.ts
    - test/debug-handler-guard.test.ts
    - test/web/debug-case.test.ts
    - test/web/debug-case-corpus.test.ts
    - test/web/debug-view-contract.test.ts
    - test/helpers/debug-corpus.ts
    - test/e2e/debug-fixture-server.ts
    - test/e2e/debug-page.spec.ts
  modified:
    - src/planning-repo/discovery.ts
    - src/planning-repo/handlers/index.ts
    - src/web/views/kinds.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/pages/artifact-page.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
key-decisions:
  - "Debug sessions get their own kind from the folder they sit in, not from their file name"
  - "The knowledge base file in the debug folder is left as an unrecognised file"
  - "Dates are read literally from the text, with no time-zone shift"
status: complete
completed: 2026-10-19
commits: 3
plan_head_before: 27f96f0743ac55bc8e34b88f12c0066857cd6559
plan_head_after: daba71f32ebd8afca227a5899ab2f32f0558b37e
actuals:
  tokens: 59000
  tasks: 3
  commits: 3
---

# Phase quick-261018-j5h Plan 01: Debug session page Summary

**GSD debug sessions now open on a case-file page that leads with where the investigation stands for its status, with expected vs actual, a suspects board and a filterable, round-aware evidence log underneath.**

## What the page shows

Every debug session (`.planning/debug/*.md`, including `debug/resolved/`) opens on one page. The first screen is the big title (the session's file name made readable), a status badge, the original report as a large quote, and a facts line (bug class, evidence count, ruled-out count, and number of rounds when there is more than one). Beside it sits a lead that changes with the status:

- **Still open** (gathering, investigating, fixing, verifying, or any session with no root cause yet): "Where it stands". It shows the current hypothesis, how it is being tested, what the result would mean, and a call-out with the next action.
- **Waiting on you** (awaiting a human check): "Fixed, waiting on your check". What you need to check comes first, then the root cause, the fix applied, the verification chips and the files changed.
- **Diagnosed, not fixed**: "Root cause found, not fixed yet". It shows the root cause and the fix, or "Suggested fix, not applied".
- **Resolved**: the root cause (one labelled line per cause), the fix cut to its first sentence, a green/red/amber chip per verification step with the verdict, and the files changed.

Anything that was cut short has a "More" button. On a shortened cause or fix it always shows. On a line that is only clipped by the layout it shows only when the clip really hides text. "The full root cause, fix and verification" opens everything in one dialog, with an "Open in source" button. Long reports fold behind "All of it / Less".

Below that: **Expected vs actual** (should happen / what happens, then the other symptom fields as rows), **Suspects** (confirmed, ruled out with what disproved each, also considered; labelled Leading and Still open while the session is open), **Evidence log** (cards with what was checked, what was found and what it implies; filters Confirms, Rules out, Fix, Finding and All, opening on Confirms or on All when nothing confirms; a divider for each round), and one row of "Also in this session" chips that each open that place in Source mode. Source mode is still the plain page.

## Discretion decisions, as built

- **Own kind by position.** Discovery already named directory position as part of how it recognises files. A markdown file under `.planning/debug/` (any depth) is now a debug session. `knowledge-base.md`, GSD's cross-session notes file, is not a session, so it and non-markdown files (resoundant's `.diff` files) stay unrecognised. The file's location is unchanged, so no other golden, tree or search grouping moved.
- **Reaching the page is unchanged.** Sessions open from search results and their link. The sidebar still leaves that location out. Listing debug sessions in the sidebar (where the group sits, open versus resolved, the knowledge base) is the natural next step; the sketch does not answer those questions.
- **Title** is the readable file name (hyphens and underscores to spaces, first letter capitalised). The file's own heading stays in Source.
- **Own head, summary-style.** View mode has no breadcrumb row or Document metadata disclosure; the Frontmatter chip opens Source.
- **Falls back when there is nothing to show.** A session with no report, focus, symptom, evidence, ruled-out entry or filled resolution falls back to the promoted-section view.
- **Dates are literal.** "Opened 16 Sep 2026", "Updated 18:55" for the same day, "Updated 12 Oct 2026 · 22:10" for another day, and no Updated stamp when it is the same day with no time. The app's month abbreviations replace the sketch's "Sept".
- **Status colours.** Resolved uses the complete tone, open, waiting and diagnosed use in-flight, and an unrecognised status is quiet. An unrecognised status that has a root cause uses the resolved layout without a heading, in the quiet tone. Evidence tags, suspect columns and verification results are identity colours on their own attributes, not tones, and the warning and error tones never appear. The design-language document records this.
- **Resolution dialog** also lists a suggested fix that was not applied (the sketch dropped it), and opens focused at its top so a long resolution does not start scrolled to the end.

## Deviations from the sketch (checked side by side, all six sessions)

Kept, on purpose:
- "Sep" instead of "Sept", and dates read without a time-zone shift (the resoundant session reads "Updated 12 Oct 2026 · 22:10"; the sketch said 13 Oct).
- No Updated stamp when it repeats the opened day with no time (the sideby diagnosed session).
- The labelore session shows six verification chips and nine files; the sketch dropped the "behavioural acceptance in a real browser" chip (its signal wraps onto a second line) and `build-splitting.test.ts` (it shared a list item with another file).
- "Also in this session" labels that would repeat get their fuller name ("Round 3 — UAT evidence", and so on), and a trailing date in brackets is dropped ("Round 3 deployment state").
- The sketch-only "Synthetic" chip, the variant switcher, toolbar, shell header and toast are not built.
- Ruled-out suspects carry a "Ruled out by" label, as the plan asked.
- The "What happens" column uses an outline in the missing colour on the card background, because the sketch's pale red fill has no token.

Fixed after the side-by-side (old to new):
- Numbered symptoms lost their numbers (plain lines) to numbered list again, in the page and the dialog.
- The resolution dialog opened scrolled to its last button to opens at the top.
- In the dialog, the file path column collapsed to a single character wide to paths read in a 3:2 split, stacking under 42rem.
- An empty suspects column was bare text to a dashed box like the sketch.

Captured pairs (sketch left, build right) are in `test/e2e/screenshots/j5h/` (not committed), with `report.json`: all six sessions in light at 1440px; labelore, deid and the synthetic one in dark; labelore with Rules out chosen, with the resolution dialog open and with the CODE cause's More open; resoundant with the report expanded; sideby on All (five rounds); labelore and the synthetic one at 1024, 820 and 390px. In all 20 captures the title, eyebrow, status, quote caption, facts, lead heading, cause labels, symptom labels, suspect column counts, filters with their pressed state, entry numbers, round dividers and overflow match; the only differences are the kept ones above.

## Ports used

5310 (debug fixture server) and 5311 (sketch served with `python3 -m http.server`), both inside 5310-5319 and stopped by process ID at the end; Playwright's own 4199 for the e2e run. 4173 and 4174 were never touched. The deid, resoundant and sideby projects were only read (their sessions were copied into a temp project).

## Parse corrections to the sketch's reading

A verification step whose text wraps onto a second line is kept, and a files-changed item naming several comma-separated files yields one file each. Both are pinned in the extractor tests.

## Task Commits

1. Task 1: debug kind by position, extractor, handler, composer, head/hero/lead, dialogs, seam wiring - `e1b72b9`
2. Task 2: expected vs actual, suspects, evidence log, Also row, corpus guard, contract, design-language clause - `4afb201`
3. Task 3: fixture server, e2e spec, side-by-side capture and the fixes it found - `daba71f`

## Verification

- Unit and contract tests for the new work all pass (extractor, handler guard, composer, corpus guard over all 27 sessions in five projects, view contract, discovery, registry).
- Full test run: 2724 passed, 2 failed. Both are failures already present at the starting commit: the whole-stylesheet token guard (its violation list names nothing from the new block) and the plan-pair coverage-matrix order test. The third known failure (the 1 MB timing test in the security register) passed this time. See `deferred-items.md`.
- Typecheck, lint and build pass. The new e2e spec passes (7 tests) through `npm run test:e2e`.

## Deviations from Plan

None needing a rule: the plan was followed. The capture-found fixes above are within the plan's "fix every visible deviation" instruction.

## Known Stubs

None.

## Threat Flags

None. No new endpoints or file access; the extractor only reads, and the fixture is copied.

## Self-Check: PASSED

All created files exist; commits `e1b72b9`, `4afb201` and `daba71f` are reachable from HEAD; goldens unchanged.

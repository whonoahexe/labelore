---
phase: quick-261001-qk7
plan: 01
subsystem: web-views / planning-repo handlers
tags: [uat, view, sketch-015, handler, composer, gsd-browser]
status: complete
requirements: [QK7-01, QK7-02, QK7-03, QK7-04, QK7-05, QK7-06, QK7-07, QK7-08, QK7-09, QK7-10]
commits: 3
plan_head_before: df0d13fd13ed5b3c1a1d66af82d3fe3f812141ce
plan_head_after: 956f952ba7376b6627f0ded6d44845bd0addb79c
actuals:
  tokens: 60000
  tasks: 3
  commits: 3
key-files:
  created:
    - src/planning-repo/handlers/uat-session.ts
    - src/planning-repo/handlers/uat.ts
    - src/web/views/uat-session.ts
    - src/web/views/uat-session-components.tsx
    - test/uat-session.test.ts
    - test/uat-handler-guard.test.ts
    - test/web/uat-session.test.ts
    - test/web/uat-session-corpus.test.ts
    - test/web/uat-view-contract.test.ts
    - test/e2e/uat-page.spec.ts
  modified:
    - src/planning-repo/handlers/index.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/pages/artifact-page.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/__golden__/dense.json
    - test/e2e/measure.ts
---

# Phase quick-261001-qk7 Plan 01: UAT page view (sketch 015 winner B) Summary

A UAT.md now opens as sketch 015 B: a status / Started / Updated cover, the current test as an attention card or a quiet done line, one square per test beside a result bar, always-open Expected | Result pairs, a gap register that opens to its diagnosis (or prose cards), folded extras and an "In the source only" strip. It plugs in through the same seam as PATTERNS (handler -> `structured.uat` -> manifest `uatSession` hook -> artifact page) and falls back to the promoted-block view when nothing composes.

## Commits (worktree `worktree-agent-a03f846aaf99ec15f`, base `df0d13f`)

- `d3d6955` Task 1 (tracer): extractor, `UatHandler`, composer, cover / current / Summary / pairs, tests, dense golden
- `ed40c9f` Task 2: gap register and cards, extras, source-only strip, CSS block, Tones doc, view contract
- `956f952` Task 3: narrow e2e spec, corner selectors, fixes from the side-by-side

## Per corpus doc (pinned in `test/web/uat-session-corpus.test.ts`, confirmed with awk at planning time)

| Doc | Status | Tests (pass/issue/blocked/skipped/pending) | Gaps | Current | Extras | Mismatch |
|---|---|---|---|---|---|---|
| synthetic (sketch) | testing | 7 (0/2/1/1/3) | register, 2 | live: Test 5 of 7, awaiting "user response" | none | none |
| dense fixture 01 | complete | 2 (2/0/0/0/0) | none; author line "None — all tests passed." | done line | none | none |
| LB v1.0/01 | complete | 23 (23) | none | done line, 23 of 23 | none | none |
| LB v1.0/02 | complete | 16 (16) | cards, 12 | done line + "Gate not approved…" | Result, Round-1 detail, Gap Reconciliation, Notes | none |
| LB v1.0/03 | complete | 4 (4) | none | done line | none | none |
| LB v1.0/04 | complete | 9 (9) | none | done line | none | none |
| LB v1.1/05 | complete | 4 (4) | none | done line | Deferred Follow-Ups | none |
| SP v1.0/03 | complete | 6 (6) | register, 6 all resolved | done line | none | none |
| SP P1 | complete | 7 (6/0/0/1/0) | none | done line | Notes | none |
| SP P2 | passed | 3 (3; "passed (operator-approved…)", two "closed…") | cards, 4 + lead | `## Resolution` supplies the resolved current test; done line "none — all items resolved…" | none | none (passed 1 + accepted 2) |
| SP P3 | complete | 5 (5) | register, 1 resolved + reverified | done line | none | none |

## Discretion decisions, as built

- Phase number in the eyebrow strips leading zeros ("Phase 3", "Phase 2.1"); the sketch printed "Phase 03".
- Summary comparison adds `accepted` to pass, so SP P2 raises no flag (the sketch's ⚑ on that doc is intentionally not reproduced).
- The raw Result row shows whenever the raw result says more than its keyword (and always for an unrecognised result).
- A test's unkeyed lead text sits under "More" as an untitled entry.
- Gaps aside: "N · M open" for a register, "N" for cards (the sketch printed "12 · 0 open"), "none" for neither. An empty section shows the author's own line, else "No gaps — no test reported an issue."
- Debug sessions and artifact paths render as mono text, never links (T-qk7-03; the contract test forbids any `href` in the components).
- Source-only: "Summary block" and "{section} (resolved current test)" switch to Source mode at that heading; "Frontmatter" switches to Source mode at the top; "Template comments" is shown as text only when the body has HTML comments (the sketch listed it on every doc).
- Tokens instead of the sketch's colour-mix recipes (card frame, Reported rule, Resolved strip, skipped squares).
- Breakpoints use the app's 62rem / 42rem media queries.
- The uat manifest lead is kept verbatim and hidden behind the cover in View mode.
- The synthetic doc was exercised through a scratch target (temp dir with a copy at `.planning/phases/03-file-browsing/03-UAT.md`) and unit tests that read the sketch file directly; nothing added to `fixtures/`.

## Additions beyond the plan text

- `testsNote`: the prose between the `## Tests` heading and the first test (LB v1.0/02 has a paragraph there) is kept and shown as a quiet note under "02 Tests" instead of being dropped.
- `## Resolution` without a `name:` field stays an extra section (the sketch silently claimed it).
- `###`–`######` sub-headings inside extras and prose cards become a bold line instead of literal hashes.
- A non-live session whose status is testing / partial reads "Testing in progress" rather than "Testing complete".
- Gap span uses whole minutes of the displayed HH:MM (floor), so the synthetic doc reads "1h 35m" as the plan pins (the sketch's rounding gave 1h 36m).
- `blocks` are left empty for the scalar keys `result`, `severity`, `blocked_by` (and for Summary fields) to keep the payload small.
- The Document metadata disclosure is hidden in View mode (as the UI-SPEC page does) because the cover carries the facts and the strip names the frontmatter; Source mode keeps it.

## Changes made after the side-by-side (old -> new, why)

- Extractor key regex allowed no digits, so LB v1.0/02's `round_1: fail (G-01)` line folded into the preceding `result` value and showed as junk in the Result row -> keys may carry digits (`round_1`), the line is now a field under More.
- Gap register rendered as `display: block` (a global table rule) and stopped at about 60% width -> `display: table; width: 100%`.
- Open register row used `--state-active` (loud orange wash) -> `--muted`, as the sketch's quiet open row.
- Reported quote lacked the sketch's curly quotes -> added with `::before` / `::after`.
- Expected text in pairs was larger than the sketch's -> `--fs-4` inside `.view-uat-md`.
- Filled squares used `--primary-foreground`, near-invisible numbers on the pink issue / blocked squares in dark -> `--background` text (readable in both themes).
- Result bar stretched to 44rem -> sizes to its key (min 16rem) like the sketch.
- Status chips wrapped ("FAILE / D") in the 390px register -> `white-space: nowrap` inside the register.
- Document metadata panel pushed the attention card down -> hidden in View mode (see above).

## Evidence

PNGs and `report.json` (structural counts per capture, no horizontal overflow in any of the 17): `/home/cinedise/labelore/test/e2e/screenshots/qk7/`
- Pairs (sketch left, build right): `syn-light.png`, `sp103-light.png`, `sp3-light.png`, `sp1-light.png`, `sp2-light.png`, `lb01-light.png`; dark: `syn-dark.png`, `sp103-dark.png`, `lb01-dark.png`; opened gap: `syn-gap-open-light.png`, `sp103-gap-open-light.png`; phone: `syn-phone-light.png`.
- Build only: `lb-02-light-build.png`, `lb-02-dark-build.png`, `lb-03-light-build.png`, `lb-04-light-build.png`, `lb-05-light-build.png`; `tracer-syn.png` is the early tracer capture.
- Browser checks on the LB v1.0/01 page: one `.status-chip` computed signature across 26 chips (F-05), 0px radii on pairs, squares and the source strip, a square click sets `data-flash="true"` on its test.

## Winner deviations left in place

- No "· synthetic" eyebrow marker, sketch toolbar, toast, variants A and C (not chosen).
- ⚑ is not raised on SP P2 and the gaps aside omits "· 0 open" on prose cards (planner decisions above).
- "Template comments" only appears when the file has comments; the register open state is a muted row rather than the sketch's exact 45% mix; source-only entries are chips (the shared PATTERNS / UI-SPEC treatment) rather than dotted-underline text.
- Long expected text clamps to three lines with more / less per the spec, where the sketch showed some long texts open.

## Verification (in the worktree)

`npm test` 96 files / 1768 tests pass; `npm run typecheck` and `npm run lint` clean; dense golden changed only by the new `structured.uat` on the fixture's 01-UAT.md. Playwright was not run (shared ports with the sibling item); `test/e2e/uat-page.spec.ts` is written and typechecked.

## Post-merge steps for master (not run in the worktree)

1. `npm run build`
2. `systemctl --user restart labelore` (server code changed: new handler), then `systemctl --user is-active labelore`
3. `npx playwright test test/e2e/uat-page.spec.ts -g "uat page"` once
4. Human check on http://cinedise:4173 (hard-refresh): studio-portal v1.0/03 and phases/02 UAT in both themes at 1440px and one phone width; open a gap row; look through the composed pairs.

## Follow-ups

- Remove the now-unreachable `'UAT'` token from `FrontmatterOnlyHandler`'s KNOWN_TOKENS once both batch items merge.
- The uat manifest's Source-mode lead copy.
- LB v1.0/02 puts only `reverified` (and `round_1`) under More, so no doc has fields landing mostly under More; LB v1.0/01 carries executed by / evidence / covers / why human / source / coverage id under More by design.

## Deviations from Plan

None beyond the additions listed above (all Rule 1/2: correctness and no-silent-drop). No auth gates, no installs.

## Threat Flags

None. No new network surface; the extractor follows the bounded-line discipline (1 MB body with a 200k-character line extracts under 250 ms, tested).

## Self-Check: PASSED

Commits d3d6955, ed40c9f and 956f952 exist in the worktree; the files listed above exist; scratch servers on 5291-5293 stopped by PID, temp target and node_modules symlink removed, worktree clean.

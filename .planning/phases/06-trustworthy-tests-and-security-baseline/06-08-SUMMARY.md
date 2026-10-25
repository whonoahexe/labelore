---
phase: 06-trustworthy-tests-and-security-baseline
plan: 08
subsystem: testing
tags: [vitest, playwright, fixtures, lendshed, research-briefing, growth-timing, fail-loud]

requires:
  - phase: 06-trustworthy-tests-and-security-baseline
    provides: "06-01 Lendshed tracer (fxPath, FX_PLANNING, FIXTURE_BASE_URL, test:gate) and 06-02 measureGrowth/GROWTH_LIMIT"
provides:
  - "four made-up Lendshed RESEARCH files (phases 01 and 03, v1.0 phases 02 and 03)"
  - "test/helpers/research-fixtures.ts rewritten as made-up text: LS02_SHAPE, LS04_NUMBERED_PITFALLS, NA_AUDIT, SYNTHETIC_SLOP, PITFALL_LABEL_LINES, with the diagram and tree regions geometry-identical to the old excerpt"
  - "research briefing unit, view, corpus and browser tests reading only Lendshed or Labelore files, no gate and no skip"
  - "the two fixed-millisecond budgets in test/research-briefing.test.ts turned into growth tests"
affects: [06-09, 06-19, 06-22]

actuals:
  tokens: 45000
  tasks: 3
  commits: 4
plan_head_before: 3ddd91079034ac0944116277f693b2742751b023
plan_head_after: c0796d30b47b39ca3b7fa58c25dd1b5291f2a5de

tech-stack:
  added: []
  patterns:
    - "A made-up excerpt keeps real geometry by mapping words to same-length words through a script and then checking every line of the diagram and tree fences against the old text (length, and box glyph columns)"
    - "A lane or kind pin in the browser follows the classifier's keywords, so a rewritten diagram title must still carry the word the classifier keys on"

key-files:
  created:
    - test/fixtures/lendshed/.planning/milestones/v1.0-phases/02-shed-inventory-health/02-RESEARCH.md
    - test/fixtures/lendshed/.planning/milestones/v1.0-phases/03-catalogue-browsing/03-RESEARCH.md
    - test/fixtures/lendshed/.planning/phases/01-member-sign-in-sessions/01-RESEARCH.md
    - test/fixtures/lendshed/.planning/phases/03-account-admin-and-sessions/03-RESEARCH.md
  modified:
    - test/helpers/research-fixtures.ts
    - test/research-briefing.test.ts
    - test/web/research-briefing.test.ts
    - test/web/research-corpus.test.ts
    - test/rendering/ascii-lift.test.ts
    - test/rendering/ascii-tree.test.ts
    - test/e2e/research-briefing.spec.ts

key-decisions:
  - "The made-up excerpt in research-fixtures.ts renames its crates and host tools (fsstat, evrun, axle, kernix, bayprobe, hubctl) rather than keeping the public ones, so the stack, title and confidence assertions were re-texted to match"
  - "The corpus guard also pins the Summary finding counts of the three files the old guard counted (2, 1) plus the new v1.0 phase 03 file (2), each recounted in the file itself"

patterns-established:
  - "Task commits of an interrupted run: Task 1's whole body landed inside the salvage commit, so later tasks build on top without rewriting history"

requirements-completed: [TEST-01, TEST-02, TEST-03, TEST-04]

status: complete
duration: 55min
completed: 2026-10-26
---

# Phase 6 Plan 08: Research-briefing family on Lendshed Summary

**The research briefing is proven on four made-up Lendshed RESEARCH files at unit, view, corpus and browser level, the embedded excerpts are invented with their diagram and tree geometry intact, and no millisecond budget or skip remains.**

## What was done

- **Task 1 (tracer)**: Lendshed v1.0 phase 02 RESEARCH (shed inventory health), the briefing unit pins, the corpus guard, and the browser test now on `FIXTURE_BASE_URL`. This work was already in the salvage commit `6f8e9e7` left by the interrupted run; I reviewed it, found the unit and corpus tests green, and the browser test needed one fix (see Deviations). There is no separate Task 1 commit.
- **Task 2** (`903a1db`): the other three RESEARCH files; the corpus walk keys LB and FX, asserts at least 5 Labelore and at least 4 Lendshed files, and pins Summary finding counts for phases 01 (2) and 03 (1) and v1.0 phase 03 (2). The two fixed-budget tests became `measureGrowth` tests, with the 200,000-character no-throw case kept as a sentinel.
- **Task 3** (`69aa987`): `research-fixtures.ts` rewritten, exports renamed, four importers touched on import and identifier lines only (the two rendering tests changed 5 lines in all, all import or identifier uses).
- Fix (`c0796d3`): the browser pin on lane count (see Deviations).

## Geometry proof for the v1.0 phase 03 diagram (acceptance record)

Measured with the real extractor and lifter over the reference file (read-only, never copied) and the Lendshed file:

| | Reference | Lendshed |
|---|---|---|
| Diagram lines | 40 | 40 |
| Boxes lifted | 2 | 2 |
| Boxes flagged widened | 2 | 2 |
| Widened box labels | `RUST/AXUM BACKEND`, `BROWSER` (path line) | `NODE/HONO BACKEND`, `BROWSER` (path line) |
| Lifted rows | 40 | 40 |
| Per-line character lengths, card kinds, per-row segment kinds, card coordinates | | identical |

The plan text expected a single widened box; the lifter actually widens both boxes of this diagram (both have a right edge that wanders by a column), and it does so identically on the Lendshed copy. Plan 06-19 can retarget `ascii-lift.test.ts` to it unchanged, since that test pins only the box count (2).

The geometry of the invented excerpt in `research-fixtures.ts` was checked the same way against `git show HEAD:test/helpers/research-fixtures.ts`: the diagram fence (48 lines) and the tree fence (17 lines) have equal line lengths line for line; the box glyph and tree connector columns are identical. The only columns that differ are spaces around substituted multi-word phrases. The box and tree pins pass unchanged.

## Quirks each Lendshed file keeps (input for the 06-22 ledger)

- **`phases/01-member-sign-in-sessions/01-RESEARCH.md`**: a `**Confidence:** HIGH` meta line; wrapper tags `<user_constraints>` and `<phase_requirements>`; decisions listed flat with bold IDs and trailing `— **Reversibility:**` clauses; a Summary of one lead paragraph plus two finding paragraphs and a bold `Primary recommendation` line (2 findings); a Package Legitimacy Audit table with 2 rows; a System Architecture Diagram in a plain fence (no box drawing around it, tree-style arrows); a Recommended Project Structure tree; Open Questions numbered with `OPEN-01` style tags and one RESOLVED; Validation Architecture with a Wave 0 checklist; Environment Availability table with an unverifiable row.
- **`phases/03-account-admin-and-sessions/03-RESEARCH.md`**: a long single-line `**Confidence:**` with an em-dash explanation and inline `[VERIFIED: path:lines]` tags; decisions grouped under bold subheadings; "Not applicable" Package Legitimacy Audit with no table; a Standard Stack with a prose intro and no `### Core`; a boxed System Architecture Diagram; a Summary of lead plus 1 finding and a `Primary recommendation` line; Environment Availability that reads "Not applicable" with no table; an Open Questions list with indented "What we know" sub-bullets.
- **`milestones/v1.0-phases/02-shed-inventory-health/02-RESEARCH.md`** (written by the interrupted run, reviewed here): HIGH confidence; blockquote preamble note under the meta block; 6-part confidence breakdown; 21 hand-counted locked-decision IDs reduced to 11; stack groups of 6 and 3 packages; 4 audit rows with dashed dispositions and 2 extra notes; 3 patterns, 6 anti-patterns, 6 hand-roll rows; 8 pitfalls with CRITICAL and HIGH and MEDIUM tags and F codes; 4 open questions; 14 environment rows with 4 unavailable and 3 blocking; sources tiers 10, 5, 4; the nine-box diagram whose host title carries the word `KERNEL` (the lane classifier keys on it; without it the browser shows 5 lanes, not 6).
- **`milestones/v1.0-phases/03-catalogue-browsing/03-RESEARCH.md`**: Confidence MEDIUM with a long split explanation; a `## Project Constraints (from CLAUDE.md)` chapter; a Package Legitimacy Audit with one `SUS` row and a "flagged" disposition; the two ragged-edged boxes of the architecture diagram, column for column; a Summary of lead plus 2 findings; code samples in fenced blocks inside Pattern 1 and Code Examples; a Structure Rationale subsection.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Lane count dropped from six to five in the browser test**
- **Found during:** Task 3 verification (browser spec run)
- **Issue:** The salvage commit's v1.0 phase 02 diagram titled the host box "SHED COUNTERS / FLAGS", which the lane classifier files under "step", not "external". The browser showed five kind lanes where the retargeted test expected six.
- **Fix:** Retitled the box "DESK KERNEL / DEVICES" (same length, column for column), which the classifier reads as external. Recounted: nine nodes, six lanes, nine lifted boxes, "Changed only · 3".
- **Files modified:** `test/fixtures/lendshed/.planning/milestones/v1.0-phases/02-shed-inventory-health/02-RESEARCH.md`
- **Commit:** `c0796d3`

### Other recorded choices

- **Salvage commit as Task 1 commit.** The interrupted run left all of Task 1's work in one `wip:` commit. The history is not rewritten; its content is treated as the Task 1 commit (`6f8e9e7`).
- **Extra pins in the corpus guard.** Beyond the plan, the corpus guard pins the Summary finding counts of all three non-02 files and the 40-line diagram of v1.0 phase 03 (the old guard pinned counts for phases 01 and 03 only; the new file needed one too).
- **Re-texted assertions.** Besides the four assertions the plan names, `research-briefing.test.ts` now looks up the packages `fsstat` and `evrun` (formerly two public crate names), and the pitfall title pin reads `unmounted shed` (formerly `unmounted tier`), because the excerpt's story moved from tiers to sheds. No expected count, level, verdict or tone changed.
- **One more tool-name swap.** The plan asked the tool name be swapped in `confidenceLevelOf` and `tidyConfidenceText`; both now use `hubctl` as the made-up name.
- **Port contention.** An earlier browser run found ports 4198 and 4199 held by another wave's Playwright run; I waited and re-ran once they were free. Only `test/e2e/research-briefing.spec.ts` was run, never the whole suite.
- **Worktree plumbing.** A symlink to the main checkout's `node_modules` was placed in the worktree to run tests and removed afterwards; it was never staged.

## Verification

- `npm run test:gate -- test/research-briefing.test.ts test/web/research-briefing.test.ts test/web/research-corpus.test.ts test/rendering/ascii-lift.test.ts test/rendering/ascii-tree.test.ts`: `gate: total=160 passed=160 failed=0 skipped=0 todo=0`
- `npx playwright test test/e2e/research-briefing.spec.ts`: 4 passed, 0 skipped
- Acceptance greps all clean: deny words and tool tells absent from `research-fixtures.ts`, `test/fixtures/lendshed`, and the two briefing tests; `SP02_SHAPE` and `SP04_NUMBERED_PITFALLS` absent from `test/`; no `runIf`, `skipIf`, `.skip`, `SP_PLANNING`, `STUDIO_PORTAL`, `homedir` in the five files; `performance.now|Date.now` absent from `test/research-briefing.test.ts`; four RESEARCH files under the Lendshed folder; `hostBinary).toBe(true)` count 2 and `MEDIUM-HIGH — the` count 1 in each file.

## Known Stubs

None.

## Threat Flags

None. No new network, auth or file-access surface; the mitigation for T-06-16 (invented hosts, devices and tools in the helper and fixtures) was applied and grepped.

## Self-Check: PASSED

- Files: four RESEARCH fixtures, `research-fixtures.ts`, six test files all present.
- Commits `6f8e9e7`, `903a1db`, `69aa987`, `c0796d3` are ancestors of HEAD.

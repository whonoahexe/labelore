---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 12
subsystem: planning-repo
tags: [spikes, manifest, verdict-board, handlers, presentation-context, pause, view-14]

requires:
  - phase: 11-exploration-handoff-report-and-workstream-pages
    provides: "11-01 adoption of C6; 11-03 listed file class; 11-05 Lendshed and Shapes spikes trees; 11-07 movedOnForSpike seam"
provides:
  - "SpikesManifestHandler, SpikeReadmeHandler, SpikesWrapUpHandler, SpikesConventionsHandler (structured.spikes.manifest | readme | wrapUp | conventions)"
  - "splitVerdict, extractManifest, extractSpikeReadme, extractWrapUp, extractConventions and id helpers (spikes-lift.ts)"
  - "buildSpikesContext, SpikesContext, VERDICT_COLUMNS: the Spikes page's pure join (lanes, tiles, file lists, notInManifest, wrap-up, activeKey)"
  - "movedOnForSpike filled: a spike pause has moved on when its manifest verdict is VALIDATED, INVALIDATED or PARTIAL (source MANIFEST)"
  - "writeLetterFamilySpikes(dir) and a --out CLI for 11-16"
affects: [11-15, 11-16]

actuals:
  tokens: 27000
  tasks: 3
  commits: 3
plan_head_before: 4d18a99f81826c3961fadc90b73ae63f542ef869
plan_head_after: 51022f95f586d213db22e781cb39f59402cc2bef

tech-stack:
  added: []
  patterns:
    - "One lift module plus thin guarded handlers (structured.spikes.<part>), the codebase.ts shape"
    - "Folder-name ids with a comparison key that drops leading zeros (YAML-proof)"

key-files:
  created:
    - src/planning-repo/handlers/spikes-lift.ts
    - src/planning-repo/handlers/spikes.ts
    - src/presentation/spikes-context.ts
    - test/spikes-handler.test.ts
    - test/presentation/spikes-context.test.ts
    - test/helpers/spike-fixtures.ts
  modified:
    - src/planning-repo/handlers/index.ts
    - src/presentation/pause-context.ts
    - test/presentation/pause-context.test.ts

key-decisions:
  - "A spike's id and name come from its folder (or manifest id cell) only; `related:` ids are read as raw head text so `002` and `010` are never coerced to 2 and 8"
  - "The verdict keyword is kept as written; columns compare it case-insensitively with emphasis marks stripped, and an unknown or empty keyword goes to Pending flagged known:false"
  - "readmeSays is the README's keyword (with readmeSaysText) only when it differs from the manifest's; both verdicts are always carried, never merged"
  - "facts.spikes counts every spike the page shows (manifest rows plus notInManifest folders), notInManifestCount is the subset"

requirements-completed: [VIEW-14]

status: complete
duration: 55min
completed: 2026-11-07
---

# Phase 11 Plan 12: Spikes lifts and the board context Summary

**The spikes manifest, each README, the wrap-up and the conventions now lift into structured data (ids from folders, verdict keyword split from its free text, a head scan when YAML fails), and one pure context groups them into the verdict board with readme disagreements flagged, files listed by name, and a stable id order; a spike pause now reads "moved on" from its manifest verdict.**

## Accomplishments

- Task 1 (tracer): `splitVerdict` and `extractManifest` (Map-keyed ideas, at most 500 rows and 200 ideas, the pre-#1700 flat shape as one implicit idea, Shapes' heading-less bare table) with `SpikesManifestHandler`. The verify command printed `ideas: 2 rows: 4`. A planted throwing extractor keeps title, body and frontmatter and omits `structured.spikes`.
- Task 2: README lift (id and name from the folder, `004` stays the string `'004'`, `spike: 010` never becomes 8, verdict recovered from the head when the frontmatter fails, Given/When/Then split case-insensitively or kept whole, remaining `##` headings listed), wrap-up lift (date, count, areas, skill path, processed rows, key findings) and conventions lift (four keyed sections, unknown sections kept unkeyed). Three more handlers registered before the generic handler.
- Task 3: the board context (lanes by idea across Validated, Partial, Invalidated, Pending; tiles with free text, `readmeSays`, `wrappedUp`, file lists of exactly name, kind, sizeBytes, url; `notInManifest`; wrap-up with processed and not-processed spikes; conventions link; facts; `activeKey`), `movedOnForSpike`, and `writeLetterFamilySpikes` (001a/b/c, table lists 001c first, no wrap-up) with a `--out` CLI.
- Full gate: `gate: total=6458 passed=6458 failed=0 skipped=0 todo=0`; `npm run typecheck`, `npm run lint` and `npm run build` exit 0.

## Task Commits

1. Task 1 (tracer): manifest lift, handler and board context - `373c7d3`
2. Task 2: READMEs, wrap-up and conventions, three handlers registered - `2dfee68`
3. Task 3: full context, fixture generator, spike pause rule - `51022f9`

## Deviations from Plan

**1. [Ordering] The complete spikes-context.ts landed in the Task 1 commit**
- The plan grows the context across Tasks 1 and 3; the file was written whole in one pass, so Task 1's commit already holds the file lists, flags and notInManifest code. Its tests (and the README/wrap-up/conventions lift tests) were held back to their own task's commit, so each commit's tests were green. No behaviour differs from the plan.

**2. [Rule 2 - Missing] `related:` read as raw text**
- **Issue:** the plan names the id coercion for `spike:` only, but `related: [002]` hits the same YAML coercion (`010` would read as 8), and the related chips must open the right panel.
- **Fix:** `extractSpikeReadme` takes the whole file text as an optional fifth argument and reads `related` from the head lines as text, falling back to frontmatter values.
- **Commit:** 373c7d3 (lift), 2dfee68 (handler passes raw content)

**3. [Rule 2 - Missing] Pause rule seam helper**
- `manifestRowOfSpike` is exported from spikes-context.ts so `movedOnForSpike` reuses the same defensive manifest read; `PauseMovedOn.source` gained `'MANIFEST'`. The moved-on note has `date: null` because the manifest carries no date. Commit 51022f9.

**4. [Environment]** node_modules was a symlink to the main checkout's (untracked, removed before return). The labelore systemd service serves the main checkout, so the plan's `systemctl --user restart labelore` step was skipped; `npm run build` ran clean in the worktree instead. The per-plan commit ledger was not written (git-dir write refused by the guard in earlier plans); `plan_head_before` is the dispatch base and the 3 commits were counted by `git rev-list`.

## Flagged assumptions (carried from the plan)

- RESEARCH A8 / UI-SPEC open item 5: "moved on" for a spike = manifest verdict VALIDATED, INVALIDATED or PARTIAL. Lendshed's SPIKE-006 has no manifest row, so its pause correctly reads no note; the rule is tested on planted copies that add a row 006.
- A folder with no README (SPIKE-006) shows under `notInManifest` with an empty verdict, url null and its pause url.

## Notes for 11-15 and 11-16

- Tile `url` and file `url` are artifact keys (`/spikes/<folder>/readme`); `pauseUrl` opens the pause page.
- `known: false` means untoned (unknown keyword or empty cell); `columnKey` is still `pending` for those.
- `activeKey` is null for the manifest, the folder name for a README, `wrap-up-summary` or `conventions`.
- A flat manifest's lane key is `spikes` (`implicit: true`); rows with no Idea cell join it.
- README `headings` excludes What This Validates and Results (the sheet shows those itself).

## Known Stubs

None.

## Threat Flags

None. No new endpoint or file access; the file list carries name, kind, size and url only, asserted by test (T-11-17). Author keys go through Maps and `Object.hasOwn` (T-11-15); tables are bounded with a growth test (T-11-16).

## Self-Check: PASSED

- Created files exist: spikes-lift.ts, spikes.ts, spikes-context.ts, spikes-handler.test.ts, spikes-context.test.ts, spike-fixtures.ts
- Commits 373c7d3, 2dfee68 and 51022f9 are ancestors of HEAD
- Acceptance: `SpikesManifestHandler` and `SpikeReadmeHandler` each appear twice in index.ts; `export function splitVerdict` 1; `export const VERDICT_COLUMNS` 1; `export function writeLetterFamilySpikes` 1; the spikes-context test asserts each file entry's keys are exactly kind, name, sizeBytes and url

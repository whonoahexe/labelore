---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 08
subsystem: testing
tags: [fixtures, made-up-examples, seed, thread, lendshed, shapes]

requires:
  - phase: 11-exploration-handoff-report-and-workstream-pages
    provides: "11-02 real writer shapes for seeds and threads; 11-06 Shapes pin case and MADE_UP_EXAMPLE_KINDS pause and spike kinds"
provides:
  - "Three labelled Lendshed seeds and three labelled Lendshed threads, covering every D-15 hard shape for both types"
  - "seed and thread in MADE_UP_EXAMPLE_KINDS; Shapes' seed and thread copies marked and indexed"
affects: [11-14, 11-22, 11-23]

actuals:
  tokens: 6500
  tasks: 2
  commits: 2

key-files:
  created:
    - test/fixtures/lendshed/.planning/seeds/SEED-260304-k7q-shed-capacity-alerts.md
    - test/fixtures/lendshed/.planning/seeds/SEED-260411-m2x-borrower-reminders.md
    - test/fixtures/lendshed/.planning/seeds/SEED-003-paper-forms.md
    - test/fixtures/lendshed/.planning/threads/loan-limit-policy.md
    - test/fixtures/lendshed/.planning/threads/kiosk-printer-swap.md
    - test/fixtures/lendshed/.planning/threads/offline-mode.md
  modified:
    - test/helpers/made-up-examples.ts
    - test/made-up-examples.test.ts
    - test/fixtures/README.md
    - test/fixtures/shapes/.planning/seeds/SEED-001-glaze-library.md
    - test/fixtures/shapes/.planning/threads/kiln-vendor-call.md

key-decisions:
  - "Seed scope is written lower-case (scope: medium, small, unknown) because 11-02 recorded that the real writer leaves it lower-case after enrichment; the bold Scope Estimate label carries the capitalised word"
  - "The writer's stock When-to-Surface sentence and Notes line are left in the enriched seed, as 11-02 observed"
  - "The one-trigger-missing seed drops both the trigger_when key and the Trigger line, keeping the stock sentence"

requirements-completed: [VIEW-15, VIEW-16]

duration: 8min
completed: 2026-11-07
status: complete
commits: 2
plan_head_before: fdcbae132e84c42a92e82ecacd590df0a7a60f56
plan_head_after: 02a9044349b8085163db76f7e1107ee53742fd6e
---

# Phase 11 Plan 08: Seed and thread made-up examples Summary

**Lendshed now holds three labelled, indexed seeds (surfacing condition plus `audit_acknowledged`, no `trigger_when` at all, the older id with writer placeholders) and three threads (in_progress with numbered steps, resolved, the older body-status shape), drawn from 11-02's recorded writer shapes, with seed and thread bound by the made-up example rule.**

## Accomplishments

- Task 1 (tracer): `seed` and `thread` appended to `MADE_UP_EXAMPLE_KINDS`; the rule-covers test case extended. `SEED-260304-k7q-shed-capacity-alerts.md` follows the plant-seed writer: marker keys, id, status dormant, bare-date `planted`, `planted_during` with a slash and parentheses, sentence `trigger_when`, `scope: medium`, an `audit_acknowledged` map (milestone, at as a quoted string, status), the six-section body, and three breadcrumbs of which one names a file that does not exist. The tracer verify prints `kind: seed trigger: true`.
- Task 2: `SEED-260411-m2x` (no `trigger_when` key, status active), `SEED-003-paper-forms` (older id, `scope: unknown`, placeholder text left in Why, Scope Estimate and Breadcrumbs), threads `loan-limit-policy` (in_progress, three numbered steps, one resolvable reference), `kiosk-printer-swap` (resolved, plain-bullet steps as the writer produces them), `offline-mode` (no frontmatter, first-line comment marker, `# Thread:` heading, `## Status: OPEN`, placeholder bullets in References and Next Steps).
- Shapes' seed (first-line comment marker) and thread (three marker keys added in its frontmatter) marked, every other byte kept; the Shapes pin case now lists the seed and thread paths by literal. Ten new Index rows, each naming `plant-seed.md` or `thread.md`.
- Full gate: `gate: total=6345 passed=6345 failed=0 skipped=0 todo=0`; `fixture-leak.test.ts` passes; typecheck and ESLint on the touched ts files clean. No per-project total another test pins moved.

## Task Commits

1. Task 1 (tracer): first seed, kinds, Shapes markers - `5b4bf1b`
2. Task 2: remaining seeds and threads, index rows - `02a9044`

## Deviations from Plan

**1. [Rule 3 - Blocking] Shapes' seed and thread markers moved from Task 2 into Task 1**
- Appending `seed` and `thread` to the kinds binds Shapes' two small files at once, so the Task 1 commit would have left `made-up-examples.test.ts` red until Task 2. The markers, their two index rows and the Shapes pin-case update were done in Task 1's commit to keep every commit green. Task 2 then carried only the Lendshed files and rows.

**2. [Interpretation] `scope` is lower-case in the frontmatter**
- The plan text says "scope Medium"; 11-02 recorded that the real writer's `scope` is a lower-case word and the bold Scope Estimate label is the capitalised one. The files follow the recorded real shape (`scope: medium`, `**Medium**`). The page shows Small / Medium / Large from either case.

**3. [Environment]** node_modules was a symlink to the main checkout's (untracked, removed before return). The labelore systemd service serves the main checkout, so no restart was done. The per-plan commit ledger file was not written; `plan_head_before` is the dispatch base.

## Known Stubs

None. The writer placeholder text in SEED-003 and offline-mode is the intended fixture shape.

## Threat Flags

None. All content is invented (T-11-11); only 11-02's recorded shapes were followed, and `test/fixture-leak.test.ts` passes in the full gate.

## Self-Check: PASSED

- All six created files and five modified files exist; commits 5b4bf1b and 02a9044 are ancestors of HEAD
- Acceptance: seeds 3, threads 3, `^## Status: OPEN` 1, `^trigger_when:` in SEED-260411 0, `'seed'` in made-up-examples.ts 1, k7q Index row 1

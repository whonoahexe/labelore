---
phase: quick-261016-ujo
plan: 01
subsystem: plan-page
tags: [plan, manual-checks, presentation, view]
requires:
  - quick-261006-iz6 (PLAN task navigator)
provides:
  - "What to check tab on every PLAN task that needs a person to check it"
  - "PlanTask.readFirst and PlanTask.resumeSignal on the PLAN projection"
  - "manualChecks on the PLAN document response"
affects:
  - src/presentation/manual-checks.ts
  - src/server/index.ts
  - src/web/views/plan-navigator.ts
  - src/web/views/plan-navigator-components.tsx
key-files:
  created:
    - src/presentation/manual-checks.ts
    - test/presentation/manual-checks.test.ts
  modified:
    - src/server/index.ts
    - src/web/views/manifest.ts
    - src/web/pages/artifact-page.tsx
    - src/web/views/plan-navigator.ts
    - src/web/views/plan-navigator-components.tsx
    - src/web/styles/globals.css
    - src/planning-repo/handlers/plan-structure.ts
    - docs/design-language.md
    - test/plan-structure.test.ts
    - test/web/plan-navigator.test.ts
    - test/web/plan-navigator-view-contract.test.ts
    - test/__golden__/dense.json
    - test/__golden__/sparse-started.json
decisions:
  - "The builder was written in its final shape in the first task commit (UI-SPEC, Read first and UAT groups included); the second task commit delivers the plan-structure fields that feed Read first and When you are done, plus the tests for those groups."
  - "A row's task references only ever leave it out (all references belong to other plans); a row naming none is kept, per the 2026-10-16 user decision."
requirements: [QUJO-01, QUJO-02, QUJO-03, QUJO-04, QUJO-05, QUJO-06, QUJO-07, QUJO-08]
status: complete
duration: about 35 minutes
completed: 2026-10-16
commits: 3
plan_head_before: 1b4b8d9fa569de582283b700bedccc88d6fefbeb
plan_head_after: 64594f35860df1adf2009b64bda6c3c8d0da72b5
actuals:
  tokens: 16000
  tasks: 3
  commits: 3
---

# Quick 261016-ujo: What to check panel for manual checks

A PLAN task that needs a person to check it now opens on a What to check tab. The tab gathers the task's own steps, the matching VALIDATION and UI-SPEC rows, the Read first files and the UAT checklist in one place. Each group names its file and section and links back to that file. The plan header has a matching What to check control.

## What was built

- **Builder (`src/presentation/manual-checks.ts`).** A pure, regex-free `buildPlanManualChecks(presentation, registry, planPath)`. It reads only the cached presentation and the reference registry. Groups per task, in order:
  - From this task: How to check it, Steps, What to do, each Human check, Accept when, When you are done. Only a `checkpoint:human-verify` task gets all of them. Any other task with a `<human-check>` gets only its Human check items.
  - Read first: links only, resolved by exact `.planning/...` path or a bare sibling file name. The plan's own file and anything unresolved are left out.
  - VALIDATION Manual-Only rows matched on a shared requirement ID (trimmed, case-insensitive). A row whose Behavior or Test Instructions names task references that all belong to other plans is dropped. A row naming no task reference is kept.
  - UI-SPEC backstop rows, titled "Category · Element".
  - The phase UAT file as a pointer, with no items and no effect on the count.
- **Server.** `artifactResponse` adds `manualChecks` to the document response, built from the request's own `activeDerived` bundle inside a try/catch. It is null for every document that is not a PLAN.
- **PLAN projection.** `PlanTask.readFirst` (at most 50, deduplicated, `@` and `./` stripped, prose dropped, plus `@` lines from the task's own `<context>`) and `PlanTask.resumeSignal`. `sourceChildren` is unchanged. The golden diff is additions only: 74 added lines, 0 deleted.
- **Composer and view.** `readManualChecks` validates the server value and drops anything malformed. A URL is kept only when it starts with a single `/`, so `//host`, `/\host` and `javascript:` become plain text. A checked task gets a first `checks` tab and opens on it. `ManualChecksPanel` and one new `Link` render it. The task list shows "N to check". The header has a What to check control (`data-jump="checks"`) that opens the first checked task.
- **CSS and docs.** Rules sit inside the quick-261006-iz6 block under their own sub-comment, tokens only. `docs/design-language.md` has one bullet recording the convention.

## Commits

| Task | Commit | Content |
|------|--------|---------|
| 1 (tracer) | 682d79d | Builder, document response, ViewInput, composer tab, panel, CSS, contract test, builder tests |
| 2 | 86e242b | `readFirst` / `resumeSignal`, goldens, UI-SPEC / Read first / UAT / resume-signal tests |
| 3 | 64594f3 | Header control, task-list marker, design-language bullet, tests |

## Verification

- `npm run typecheck`: pass.
- `npm run lint`: pass, no output.
- `npm run build`: pass.
- `npm test`: 2300 passed, 3 failed. None of the failures is in code this plan touched:
  - `test/token-guard.test.ts` fails on three lines in the existing stylesheet (`.view-plan-nav-body :not(pre) > code` font-size, `.view-plan-nav-checks li::before` margin-top, `.view-ui-review-found-card ... code` font-size). They are identical at the base commit, and none are lines this plan added.
  - `test/presentation/coverage.test.ts` ("renders the matrix before both complete documents in the plan pair page") fails on `plan-pair-page.tsx`, which this plan did not touch.
  - One of the 250 ms timing guards (`test/ui-spec-contract.test.ts` on one run, `test/security-register.test.ts` on the next) fails when the whole suite runs in parallel. Each passes when run alone.
- Targeted suites for this plan all pass: manual-checks, plan-structure, plan-handler-guard, snapshot golden, plan-navigator, the plan-navigator contract, artifact-response, derived-snapshot-isolation, view-page-contract, class-vocabulary, css-source-order and portability. (`token-guard` is in the list of failures above.)
- Live sanity check, against a second instance on port 4199 (the dashboard on 4173 was left running; nothing was written to the target). studio-portal plan 04-06 returned one entry, Task 3, with 10 items in total:
  - From this task: How to check it, What to do, Accept when, When you are done. This is four items, matching the expectation in the plan.
  - Read first: 04-UI-SPEC.md and 04-VALIDATION.md.
  - VALIDATION: only "Browser/accessibility protocol (04-06-03, BLOCKING)". The Cloudflare row and the ZIP64 row are absent.
  - UI-SPEC: the five backstop rows (E1 selection bar, E2 refusal dialog and E3 archive job row overflow, E3 archive job row and E4 omission disclosure long-text).
  - No UAT pointer.

## Deviations from Plan

- **[Rule 3 - ordering] Builder written in final shape in Task 1.** The plan asks for exactly this ("final shape, so Task 2 only adds data"). The UI-SPEC, Read first, UAT and When you are done code therefore landed in the Task 1 commit. It had no effect until Task 2 added the plan fields and tests. The Task 2 plan-structure tests were written before the implementation but I did not run them red first.
- **[Rule 1 - lint] `artifactResponse` computes `manualChecks` with an immediately invoked function** instead of a reassigned `let`, to satisfy `no-useless-assignment`. Same behaviour.
- No auth gates. No package installs.

## Deferred Issues

- Three pre-existing test failures listed under Verification (token-guard, coverage, a parallel-load timing guard) are out of scope and unchanged.
- A task reference was first any three dash-joined digit groups, so a date such as `2026-10-16` would have read as another plan's task and dropped its row. Fixed by the orchestrator after execution (commit 4eb65fb): each group is at most three digits, so dates in either order are not task references; covered by a new test.

## Human check pending for the user

Task 3's `<human-check>` is not done and was left for you. Open plan 04-06 in light and dark on the running dashboard and confirm:
- The header shows What to check and opens Task 3 on that tab.
- The tab lists the four task items, the one matched VALIDATION row and the five UI-SPEC backstops.
- Read first links to 04-UI-SPEC.md and 04-VALIDATION.md, and each group's source link opens that file.
- Corners are squared, the page reads well at 390px, and nothing overflows sideways.

The data side is confirmed against the live server (see Verification). The visual side is not.

## Known Stubs

None.

## Threat Flags

None. The new surface (a field on the document response, and in-app links resolved only from the presentation) is covered by T-ujo-01 through T-ujo-05.

## Self-Check: PASSED

- Found: src/presentation/manual-checks.ts, test/presentation/manual-checks.test.ts.
- Found commits: 682d79d, 86e242b, 64594f3 (all ancestors of HEAD).

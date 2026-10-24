---
phase: quick-261006-iz7
plan: 01
subsystem: web-views
tags: [summary-page, per-type-views, sketch-020, requirement-preview, gsd-browser]
status: complete
requirements-completed: [QIZ7-01, QIZ7-02, QIZ7-03, QIZ7-04, QIZ7-05, QIZ7-06, QIZ7-07, QIZ7-08, QIZ7-09]
key-files:
  created:
    - src/planning-repo/handlers/summary-run.ts
    - src/web/views/summary-run.ts
    - src/web/views/summary-run-components.tsx
    - test/summary-run.test.ts
    - test/summary-handler-guard.test.ts
    - test/web/summary-run.test.ts
    - test/web/summary-run-corpus.test.ts
    - test/web/summary-view-contract.test.ts
    - test/e2e/summary-page.spec.ts
    - .planning/quick/261006-iz7-build-sketch-020-d-as-the-summary-page-view/capture-side-by-side.mjs
  modified:
    - src/planning-repo/handlers/summary.ts
    - src/planning-repo/handlers/requirements.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/pages/artifact-page.tsx
    - src/web/styles/globals.css
    - test/handlers.test.ts
    - test/__golden__/dense.json
key-decisions:
  - "SummaryHandler claims quick and archived-quick summaries and adds structured.summary (try/catch guarded); RequirementsHandler also parses archived milestone snapshots, project.requirements stays root-only"
  - "Own head with one early return in View mode (SECURITY precedent); a parse warning shows as the chip in the head"
  - "Requirement previews are a Base UI PreviewCard with a controlled open state: hover after 200 ms, keyboard focus-visible, Escape and blur close, focus never moves into the card"
commits: 3
plan_head_before: abb201c6dc009f8b85ed25f73d9c74a602d936b7
plan_head_after: 659974c274377a60fd812cd2d0f57fbe65cf1552
actuals:
  tokens: 70000
  tasks: 3
  commits: 3
duration: 2h
completed: 2026-10-07
---

# Quick 261006-iz7: SUMMARY page view (sketch 020 D) Summary

**A SUMMARY.md now opens as sketch 020's winner D: a B head with a metrics box and Tasks / Files / Requirements modals, then Outcome rows with proof pills, a run timeline with deviations hanging off their task, Proof, Decisions | Patterns and the lineage, fed by a server-side extractor for phase, archived, quick and archived-quick summaries and by archived requirement text for hover previews.**

Branch `worktree-agent-afc51f7396358fc5d`, worktree `/home/cinedise/labelore/.claude/worktrees/agent-afc51f7396358fc5d`, base `abb201c6dc009f8b85ed25f73d9c74a602d936b7` (verified), final code commit `659974c`.

## What was built

- `extractSummaryRun` (server): fence-aware, line-bounded SUMMARY projection. All 154 corpus summaries (labelore 73, studio-portal 81) extract and compose; a 1 MB body with a 200k-character hostile line extracts in well under 250 ms.
- `SummaryHandler` also claims `quick/<id>/<id>-SUMMARY.md` and `milestones/vX.Y-quick/<id>/...`; `research/SUMMARY.md` stays unclaimed. `RequirementsHandler` also claims `milestones/vX.Y-REQUIREMENTS.md` and joins wrapped items.
- `composeSummaryRun` + `requirementPreviews` + `lineageLinks` (pure, client), `SummaryRunView` (components), one delimited CSS block `quick-261006-iz7`.
- Requirement-preview resolution after the change: labelore 134 of 262, studio-portal 158 of 166 (the planning-time measurements; the rest are quick-task IDs).

## Deviations from Plan

### Auto-fixed / decided

1. **[Process] Tests were written after the implementation, not RED first, and Tasks 1 and 2 share commits.** The composer, components, wiring and CSS were built together because the tracer needed the whole view; commit 1 is the server side, commit 2 the web view (Task 1 tracer plus Task 2), commit 3 the side-by-side fixes (Task 3). The contract test, the Tones text and the modal / preview checks of Task 2 are all done.
2. **File notes: each path of a multi-path bullet maps to the note (15 for 05-01), not 12.** The plan's behavior block said 12 (the sketch's regex kept only the first path); Task 2's text ("each file with its one-line note") and the Files modal read better with every path. Pinned in test/summary-run.test.ts.
3. **Count line reads "1 need a human" at any count, as the plan pinned** (no "needs").
4. **No `initialModal` / `initialPreview` props.** Base UI portals draw nothing in `renderToStaticMarkup`, so the modal bodies (`TasksModalBody`, `FilesModalBody`, `RequirementsModalBody`) and `RequirementPreviewCard` are exported and rendered directly in tests instead.
5. **Rule 1 fixes found by the side-by-side:** the title column was squeezed by a global h1 `max-width` (set `none`); a prose Duration (sp 01-06) squeezed it again (metrics box capped at 28rem, values clamped to two lines, full text in `title`, the end stop clips at 40 characters); a Deviations section that opens straight on a `###` subsection was read as "none" and showed "Went to plan." (a lead paragraph is now required); long inline code overflowed at 390px (`overflow-wrap`); task "kinds" over 20 characters (free text in the parenthetical) are dropped; Proof descriptions clamp to two lines like the sketch.
6. **Extras beyond the plan:** title prefixes `Phase quick-<id> Plan NN:`, `NN-NN:` and `NN-NN Summary —` and a dash after `Quick Task <id>` are stripped; a deviation's commit also reads `**Committed in:**`.
7. **Keyboard preview:** Base UI's card did not open on programmatic focus, so `open` is controlled and a focus-visible handler opens it (the plan's own fallback). Verified in Chromium with real Tab / Shift+Tab / Escape through an ad-hoc script on my own port 5297 (not the e2e spec): Tab to UI-06 opens its card, Escape closes only the card, a second Escape closes the dialog, blur closes.
8. **Pre-existing failures, not mine** (see deferred-items.md): `token-guard` fails on the base commit at `globals.css:10264` (`0.88em`, quick 528); three "within 250 ms" timing tests of other extractors flake under full parallel load and pass alone.

### Winner deviations left in place

- "In the source only" entries are `status-chip` buttons (the UAT / SECURITY idiom the plan names), not the sketch's dotted-underline text.
- The preview's Open is the app's own filled `reference-preview-open` button (the sketch drew a text link), and the ID heading is not mono (the app's `reference-preview-heading h2`). Open is reachable by mouse only; the keyboard gets the same text, status, location and phase in the card.
- Details under Also in this summary all start closed (the sketch showed one open from its own state).
- `lb528` shows "Not completed yet" with status Complete: its frontmatter has no `completed`, `metrics.completed` or Performance date.
- A summary with no frontmatter status and no preamble Status shows "—" (quiet), e.g. studio-portal 01-06 (malformed YAML), and its Duration reads the Performance prose.
- The sketch's own phone / tablet render is broken at 390 / 820 (container queries); the build stacks cleanly at both with no overflow (`overflow: false` in report.json).

## Per-doc results (composed head, triggers, outcome, run, proof, lower sections)

| Doc | Eyebrow · date | Status · Duration · Started · Type · Self-check | Triggers | Outcome rows · pills | Stops · margin cards · full cards | Proof | Also · Waits · Lineage (built on · unblocks) | Source-only |
|---|---|---|---|---|---|---|---|---|
| 0501 | Summary · Phase 5 · Per type document views · 20 Sep 2026 | Complete · 26min · 20:34 · UI · passed | Tasks 2 · Files 15 · Req 3 | 5 · D1 row 1, D2 + D3 row 3 (D3 human); "5 things shipped · 3 deliverables proven · 1 need a human" | 4 · 0 · 0, "Went to plan." | 3 (D3 human) | Known Stubs · — · 1 · 5; Next present | Tags, Provides, Actuals, Performance, Self-check, Frontmatter |
| 0406 | Summary · Phase 4 · Bulk archive downloads · Not completed yet | Awaiting checkpoint · — · — · Frontend · passed | Tasks 2 · Files 11 · Req 0 +4 pending | none (section omitted) | 5 (wait stop) · 2 (Task 1, Task 2) · 2 + 2 extras | none | What Was Built, Verification, Flagged Conflict · Task 3 — Pending Human Verification (open) · 2 · 2 | Tags, Provides, Actuals, Self-check, Frontmatter |
| 0101 | Summary · Phase 1 · Portal owned identity sessions · 3 Aug 2026 | Complete · 36min · 16:50 · Auth · passed | Tasks 3 · Files 16 · Req 3 | 5 · D1-D5 one per row (D4 human); "5 things shipped · 5 deliverables proven · 1 need a human · 5 fixed on the way" | 5 · 4 under Task 1, 1 under Task 3 · 5 | 5 (D4 human) | Issues Encountered · — · 0 · 5 ("Nothing — a starting point"); New dependencies 6; Next present | Tags, Provides, Actuals, Performance, Self-check, Frontmatter |
| 0x4 | Quick summary · 260910-0x4 · 10 Sep 2026 | Complete · 50min · — · Tech debt remediation · passed | Commits 16 · Files 28 · Req 14 | none | 3 ("16 commits" stop, 5 deviations on it) · 5 · 5 + 1 extra | 7 (1 human) | Outcome Table, Note on STATE.md · — · 1 · 3 | Tags, Provides, Actuals, Self-check, Frontmatter |
| 3us | Quick summary · 260922-3us · 22 Sep 2026 | Complete · — · — · Web UI · no chip | Tasks 3 (names) · Files 18 · Req 4 | none | 6 · 2 on the Completed stop · 2 | none | Verification · Human check (pending) · 0 · 4 | Tags, Provides, Actuals, Frontmatter |

Harder docs (build-only, in `/home/cinedise/labelore/test/e2e/screenshots/iz7/`): lb0213 (14 Proof rows, all human, scannable with the two-line clamp), spv10407 (7 deviation cards), sp0407 (awaiting checkpoint, `+1 pending` DL-06), lb528 (quick, Commits 3, QK528-* IDs, 10 Also sections), sp0106 (malformed YAML, Warning chip in the head, renders from the body), spv10212 (no frontmatter: status Complete from the preamble, tasks from the Commits line).

## Discretion decisions as built

Own head via one early return; Warning chip in the head; phase number zeros stripped ("Phase 5"); title prefix / suffix stripped; Type chip humanized with UI / API / DB / CSS / CLI / UX / E2E upper-cased; Status complete / awaiting / blocked / quiet; Self-check passed complete, failed missing, other quiet, absent no chip; Started = HH:MM from Performance; tasks from list, table, preamble Commits fact, then frontmatter hashes; commit count actuals → commits → metrics.commits → task count; deviations on the task named in Found during (no list: all on the commits stop; unlisted task: on Completed); proof matching ports the sketch's token overlap with a character scan; hashes are copy buttons; previews look up the summary's own milestone file, then root, then archives newest first; lineage links resolve by number + slug; Also / Waiting split by pending / human / awaiting / not yet / checkpoint; Decisions from key-decisions → decisions → body.

## Files and shared-file insertion points

| File | Anchor | Lines added |
|---|---|---|
| src/web/views/manifest.ts | after `ComposedValidationStrategy` import (line 19); after `validationStrategy?` member (~89) | 2 + 5 |
| src/web/views/manifests.ts | after `composeValidationStrategy` import (line 18); last line of the summary entry (~132) | 1 + 1 |
| src/web/pages/artifact-page.tsx | after ValidationStrategyView import (62); after validationStrategy memo (~628); after `validationStrategy !== null \|\|` (~686); early return after the SECURITY block, before `const crumbs` (~746) | 2 + 7 + 1 + 21 |
| src/web/styles/globals.css | between `/* quick-261003-526:end */` and `/* quick-261001-qk7:start */`, block `quick-261006-iz7` | ~1075 |
| test/__golden__/dense.json | regenerated | — |

`handlers/index.ts`, `kinds.ts`, `reference-preview.tsx`, `docs/design-language.md` and `test/e2e/measure.ts` are untouched.

## Golden and other test expectations

`dense.json` changed only by `structured.summary` on the SUMMARY fixtures (phases, archived phases, the quick task) and by `items` / `outOfScope` / `traceability` on the two archived REQUIREMENTS (checked key by key against the base file). `test/handlers.test.ts`: the archived-REQUIREMENTS expectation moved from GenericMarkdownHandler to RequirementsHandler; the RoadmapHandler negatives and the MILESTONE-AUDIT expectation stay; new cases cover quick-summary matching, `structured.summary`, wrapped lines. crossref and assemble pass unchanged; an invariant test pins project.requirements as root-only with archived snapshots parsed.

## Tones clauses (ready to paste, one /gsd-fast on docs/design-language.md)

- **complete:** , and (quick-261006-iz7) on a SUMMARY page the Complete status, a passed Self-check chip, a Completed requirement chip, the New file chip and a passing proof marker
- **in-flight:** , and (quick-261006-iz7) on a SUMMARY page the Awaiting checkpoint status, a pending or partial requirement (chip, trigger and the trigger's +N pending), a Needs a human pill and proof-row bar, the deviation margin cards and their Rule kicker, the Waiting on a human section, stop and chip, and the User setup callout
- **missing:** , and (quick-261006-iz7) on a SUMMARY page the Blocked status, a failed Self-check chip and a failing proof marker
- **quiet:** , and (quick-261006-iz7) on a SUMMARY page the Type chip, Approach pattern chips, task kind chips, New dependency chips, an unrecognised status and an unknown proof marker
- **active:** , and (quick-261006-iz7) on a SUMMARY page a Convention pattern chip

Only `view-summary-*` names and documented shared names (`status-chip`, `eyebrow`, `document-reader-layout`, `document-canvas`, `reference-preview*`) are used, so the vocabulary test needs no new row.

## Verification

- `npm test`: 2112 passed, 2 failed — the pre-existing token-guard line (10264) and a load-flaky timing test (passes alone); everything touched passes.
- `npm run typecheck` clean; `npm run lint` clean; eslint clean on every touched file (including the e2e spec, which typechecks and was not run).
- Servers: 5297 (labelore) and 5298 (studio-portal), stopped by PID. gsd-browser session `summary`. Playwright e2e was not run; one ad-hoc Chromium script on 5297 checked the keyboard preview.
- PNGs (sketch left, build right) in `/home/cinedise/labelore/test/e2e/screenshots/iz7/`: `0501-light-pair.png`, `0406-light-pair.png`, `0101-light-pair.png`, `0x4-light-pair.png`, `3us-light-pair.png`, `0501-dark-pair.png`, `0101-dark-pair.png`, `0406-dark-pair.png`, `0501-reqs-light-pair.png`, `0501-files-light-pair.png`, `0101-tasks-light-pair.png`, `0101-tablet-light-pair.png`, `0501-phone-light-pair.png`; build-only: `lb0213-light-build.png`, `spv10407-light-build.png`, `sp0407-light-build.png`, `lb528-light-build.png`, `sp0106-light-build.png`, `spv10212-light-build.png`, `lb0213-dark-build.png`, `sp0106-dark-build.png`; metrics in `report.json` there.

## Post-merge steps for master (not run in the worktree)

1. If `dense.json` conflicts with the sibling, regenerate it (`npx vitest run test/snapshot.golden.test.ts -u`) and review the diff.
2. Confirm labelore-build-watch rebuilt `dist/` (or `npm run build`).
3. `systemctl --user restart labelore` (SummaryHandler and RequirementsHandler changed) and `systemctl --user is-active labelore`.
4. `npx playwright test test/e2e/summary-page.spec.ts -g "summary page"` once.
5. One `/gsd-fast` appending the clauses above (with the sibling's) to the Tones rows.
6. Human check: studio-portal 01-01 and 04-06 SUMMARY pages on http://cinedise:4173, both themes, one phone width, the Requirements preview.

## Follow-ups

- Preview archived requirement IDs from document text through the reference registry (the add-alongside debt in the assumption-delta decision).
- An e2e corner-selector entry in `test/e2e/measure.ts` once the sibling merges settle.
- Fix the 0.88em line at `globals.css:10264` so token-guard passes again.

## Threat Flags

None beyond the plan's register: no new network endpoint, auth path or file access; links come only from the route builders.

## Self-Check: PASSED

Files created exist (extractor, composer, components, six test files, e2e spec, capture script); commits `2ee765d`, `200bcf7`, `659974c` are ancestors of HEAD; PNGs and report.json exist in the screenshots directory.

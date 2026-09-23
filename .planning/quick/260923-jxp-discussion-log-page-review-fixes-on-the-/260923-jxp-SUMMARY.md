---
phase: quick-260923-jxp
plan: 01
subsystem: ui
tags: [react, markdown-parsing, discussion-log, design-system, vite]

requires:
  - phase: quick-260922-3us
    provides: the sketch-004 B3 folded-chapters cover/chapter-index/fold layout this task extends
provides:
  - Tolerant extractDiscussionLog covering every corpus discussion-log question shape (S1/S2/S3),
    resolving chosen/claude/custom/open instead of dropping unresolved or custom-answer questions
  - Log-level meta parse: date, areas discussed/offered/declined
  - Numbered/titled answer cards, a source-order options disclosure, a quiet note toggle
  - Declined-area ghost rows and an opt-in Endnotes sheet (discussion logs only)
  - A discussion-log cover whose every number is measured from rendered chapters/items
  - CopyPathButton on every artifact page, replacing the printed path caption
affects: [discussion-log corpus parsing, document-page header chrome, sketch-004 B3 layout contract]

actuals:
  tokens: 42784
  tasks: 3
  commits: 2
  plan_head_before: 082a834

tech-stack:
  added: []
  patterns:
    - "extractDiscussionLog dispatches per-## section into S1 (### question + table) / S2 (table directly under ##) / S3 (bold **Qn:** lines) parse modes, all composed from splitSections/splitSubsections/parseMarkdownTable — never a whole-document regex"
    - "DocumentLayoutSpec.ghosts/alsoStyle are optional composer hooks a manifest opts into (discussion-log only); plan/verification layouts are unaffected by construction"

key-files:
  created:
    - src/web/components/copy-path-button.tsx
    - test/web/discussion-log-corpus.test.ts
    - test/e2e/artifact-header.spec.ts
  modified:
    - src/planning-repo/handlers/section-projection.ts
    - src/web/views/layout.ts
    - src/web/views/layout-discussion-log.ts
    - src/web/views/layout-components.tsx
    - src/web/components/artifact-header.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/section-projection.test.ts
    - test/web/document-layout.test.ts
    - test/e2e/document-layout.spec.ts
    - test/e2e/measure.ts

key-decisions:
  - "All three plan tasks landed as two commits, not three — Task 1 and Task 2 rewrite the same functions (extractDiscussionLog, the discussion-log cover, layout-components.tsx's ItemRow/FoldedChapters) in ways too intertwined to split into non-overlapping git hunks without churn; they are committed together as one feat commit, with Task 3 (copy-path button + foundation sweep) as the second."
  - "A 'you decide' choice line wrapped in markdown italics (*\"...\"*) has the italics stripped but the quote marks kept, matching the corpus's own quoting convention for 'Your words' display."
  - "declinedAreas shape priority is (b) 'declined:' sentence, then (c) gray-area paragraph + bold bullet list, then (a) the 'Areas offered but not selected' header line — first match wins, per the plan's literal priority order."

patterns-established:
  - "Log-level meta (date/areasDiscussed/offeredCount/declinedCount/declinedAreas) is computed in one pass over non-topic ## sections and their ### sub-blocks, paragraph by paragraph, reusing the same topic-detection the question parser already did — no second full-document scan."

requirements-completed: [JXP-01, JXP-02, JXP-03, JXP-04, JXP-05, JXP-06, JXP-07, JXP-08, JXP-09, JXP-10]

coverage:
  - id: D1
    description: "extractDiscussionLog parses every corpus question shape (S1/S2/S3) without dropping a question, including ✓-qualifier variants, custom answers, and table-less you-decide questions"
    requirement: "JXP-05"
    verification:
      - kind: unit
        ref: "test/section-projection.test.ts — extractDiscussionLog describe blocks"
        status: pass
      - kind: unit
        ref: "test/web/discussion-log-corpus.test.ts — pinned question counts, 13 logs"
        status: pass
    human_judgment: false
  - id: D2
    description: "Numbered/titled answer cards, source-order options disclosure, quiet note toggle"
    requirement: "JXP-03, JXP-04, JXP-06"
    verification:
      - kind: unit
        ref: "test/web/document-layout.test.ts — discussionLogLayout answerCard/detail/note tests"
        status: pass
      - kind: e2e
        ref: "test/e2e/document-layout.spec.ts — 'answer card: numbered/titled, options list badges skip it...'"
        status: pass
    human_judgment: false
  - id: D3
    description: "Declined-area ghost rows and truthful cover facts/pills/headline"
    requirement: "JXP-01, JXP-02, JXP-08"
    verification:
      - kind: unit
        ref: "test/web/discussion-log-corpus.test.ts — cover numbers equal rendered counts"
        status: pass
      - kind: e2e
        ref: "test/e2e/document-layout.spec.ts — ghosts and cover facts / cover numbers equal rendered counts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Endnotes sheet replaces the folded Also chapter on discussion logs only"
    requirement: "JXP-07"
    verification:
      - kind: unit
        ref: "test/web/document-layout.test.ts — alsoStyle 'endnotes' tests"
        status: pass
      - kind: e2e
        ref: "test/e2e/document-layout.spec.ts — '05 discussion log: endnotes sheet holds #also-deferred...'"
        status: pass
    human_judgment: false
  - id: D5
    description: "Copy-path icon button replaces the raw path caption on every artifact page"
    requirement: "JXP-09"
    verification:
      - kind: e2e
        ref: "test/e2e/artifact-header.spec.ts — full suite"
        status: pass
    human_judgment: false
  - id: D6
    description: "All gates green: npm test, typecheck, lint, test:e2e, build; systemd untouched"
    requirement: "JXP-10"
    verification:
      - kind: unit
        ref: "npm test (1174/1175 pass — 1 pre-existing, documented, unrelated failure)"
        status: pass
      - kind: e2e
        ref: "npm run test:e2e (39/39 pass, including the full F-01..F-15 foundation sweep — 0 unwaived failures)"
        status: pass
    human_judgment: true
    rationale: "The human-check step in the plan (visiting the tailnet URL after a manual labelore.service restart) was not run by the executor per the constraint that the systemd instance is never touched — a human must confirm the live server view."

duration: 165min
completed: 2026-09-23
status: complete
---

# Quick Task 260923-jxp: Discussion-log page review fixes Summary

**Tolerant multi-shape discussion-log parser (S1/S2/S3, zero dropped questions across all 13 corpus logs), numbered answer cards with a quiet note toggle, declined-area ghost rows, an Endnotes sheet, a cover whose numbers are measured from rendered content, and a shared copy-path button replacing the raw path caption on every artifact page.**

## Performance

- **Duration:** ~165 min
- **Tasks:** 3 (landed as 2 commits — see Deviations)
- **Files modified:** 14 (3 new, 11 modified)

## Accomplishments

- `extractDiscussionLog` now recognizes every corpus question shape: S1 (`##` topic → `###`
  question → option table), S2 (the canonical GSD template — a table directly under `##`, no
  `###`), and S3 (bold `**Qn:**` lines, including table-less "you decide" questions). Every
  question returns (`resolution: 'chosen' | 'claude' | 'custom' | 'open'`), never silently
  dropped. All 13 corpus logs (5 in this repo, 8 in `~/studio-portal`) yield their pinned
  question counts — the studio-portal repro (Cutover & bootstrap admin's renamed CLI question)
  resolves `chosen`, `chosenIndex: 1`, `qualifier: 'renamed'`, with the user's "backstage" words
  captured.
- Log-level meta (date, areas discussed/offered/declined) parsed from tolerant, bounded
  header/prose scans — feeds the cover's "Logged" and "Discussed" facts.
- The chosen (or settled/custom) answer now renders as a numbered, titled card
  (`.document-answer`), the "other options" disclosure is a numbered source-order list, and a
  question's `**Notes:**` sits behind a small quiet toggle separate from the options disclosure —
  an "Accepted gap:" sentence gets an inline marker.
- Declined areas render as greyed, non-expandable "Not discussed" ghost rows after the real
  chapters, in both the chapter index and the chapter list.
- The "Also in this document" fold is replaced, on discussion logs only, by an always-open
  Endnotes sheet — small-caps subsections, hanging bullets, same anchor ids. Plan and verification
  keep the folded Also chapter unchanged.
- Every cover number (headline, status, Topics/Left-to-Claude/Deferred pills) is now measured
  from what the page actually renders, not from raw `structured` totals — verified against 5 real
  logs, not just synthetic fixtures.
- Every artifact page (cover, plain header, plan-pair) now shows a `CopyPathButton` instead of a
  printed path caption.

## Task Commits

Tasks 1 and 2 rewrite the same functions too intertwined to split cleanly, so they landed as one
commit; Task 3 is the second:

1. **Tasks 1+2: discussion-log parse, answer cards, notes, ghosts, Endnotes, truthful cover** -
   `f0c28de` (feat)
2. **Task 3: copy-path button, foundation sweep, build** - `3f74056` (feat)

**Plan metadata:** not committed by this executor — the orchestrator commits `.planning/` docs
per this task's constraints.

## Files Created/Modified

- `src/planning-repo/handlers/section-projection.ts` - Rewritten `extractDiscussionLog` (S1/S2/S3
  shapes, resolution states, notes, qualifiers) plus log-meta extraction (date/areas)
- `src/web/views/layout.ts` - `ItemOption`/`ItemAnswer`/`ItemNote`, `DocumentLayoutSpec.ghosts`/
  `alsoStyle`, `ComposedGhost`, `ENDNOTES_TITLE`
- `src/web/views/layout-discussion-log.ts` - Answer cards, options detail, notes, ghosts,
  `alsoStyle: 'endnotes'`, truthful cover
- `src/web/views/layout-components.tsx` - Renders answer card/options/note toggle, ghost rows,
  `EndnotesSheet`; `useChapterFolds` gains `openNotes`/`toggleNote`
- `src/web/components/copy-path-button.tsx` (new) - `CopyPathButton`
- `src/web/components/artifact-header.tsx` - Renders `CopyPathButton` instead of the raw path
  caption
- `src/web/styles/globals.css` - New `.document-answer*`, `.document-option*`,
  `.document-item-note*`, `.document-ghost*`, `.document-endnote*`, `.artifact-path-copy` rules
- `docs/design-language.md` - Class-vocabulary rows for all of the above, Tones table updates,
  Endnotes/`data-ghost` language-beyond-names bullets
- `test/section-projection.test.ts` - Rewritten + extended for every new shape/behavior
- `test/web/discussion-log-corpus.test.ts` (new) - Real-corpus pinned counts + cover-number guards
- `test/web/document-layout.test.ts` - Rewritten discussion-log describe block + composer tests
  for ghosts/alsoStyle
- `test/e2e/document-layout.spec.ts` - Endnotes-aware `runFullBehaviorChecks`, new jxp describe
  block
- `test/e2e/artifact-header.spec.ts` (new) - Copy-path button e2e contract
- `test/e2e/measure.ts` - `CORNER_SELECTORS` extended

## Decisions Made

- Tasks 1 and 2 committed together (see Task Commits) — the plan's own split (Task 1: parse +
  render minus date/ghosts; Task 2: date/ghosts/Endnotes/cover) touches the identical function
  bodies in `extractDiscussionLog`, the discussion-log `cover()`, and `layout-components.tsx`'s
  `ItemRow`/`FoldedChapters`. Splitting the diff into two non-overlapping commits would have meant
  writing Task 1's version, then immediately rewriting large parts of it for Task 2 — pure churn,
  no reviewability gain. Documented here per the deviation discipline rather than silently
  deviating from the plan's stated task boundaries.
- `offeredCount`/`declinedCount` number-word matching checks the *whole* matched sentence for
  "gray area"/"offered"/"selected" rather than a forward-only window from the "all N" match,
  because the three corpus sentence templates place "selected" both before and after "all N" (SP
  phases/01's "The user selected all four offered gray areas." puts it before).
- `findShapeC`'s declined-area bullet scan tolerates indented continuation lines between bullets
  (real corpus bullets wrap across 2-3 lines) rather than treating any non-bullet line as the end
  of the list — the naive version undercounted LB v1.0/01's declined areas by one.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `findShapeC`'s bullet-list scan broke on wrapped continuation lines**
- **Found during:** Task 2 (real-corpus cover-number test against LB v1.0/01)
- **Issue:** The first pass stopped scanning at the first line that didn't itself start a new
  bullet, so a bullet's own indented continuation line (real corpus bullets wrap 2-3 lines) ended
  the scan early — LB v1.0/01's declined-areas list came back with 1 name instead of 2.
- **Fix:** Continuation lines (indented, non-bullet, appearing after at least one bullet was
  already found) are now skipped rather than treated as list-enders; a blank line (once the list
  has started) still ends it.
- **Files modified:** `src/planning-repo/handlers/section-projection.ts`
- **Verification:** `test/web/discussion-log-corpus.test.ts`'s LB v1.0/01 cover-number test
  (`4 of 6 offered areas`) now passes.
- **Committed in:** f0c28de

**2. [Rule 1 - Bug] `.document-cover-glance` jump assertion assumed every glance target is a fold**
- **Found during:** Task 2 (e2e `runFullBehaviorChecks` against the discussion-log fixtures)
- **Issue:** The pre-existing e2e helper (from quick-260922-3us) asserted a
  `.document-fold[data-open="true"]` appears after clicking the glance action — but a discussion
  log's "Left to Claude" glance can target the discretion panel inside the now-endnotes-style Also
  chapter, which has no fold to open.
- **Fix:** The assertion now checks for an opened fold OR (when none opened) that the always-open
  `.document-endnotes` sheet itself is visible.
- **Files modified:** `test/e2e/document-layout.spec.ts`
- **Verification:** `npx playwright test test/e2e/document-layout.spec.ts` — 25/25 pass.
- **Committed in:** f0c28de

---

**Total deviations:** 2 auto-fixed (both Rule 1 — parse/test bugs surfaced by real-corpus testing).
**Impact on plan:** Both fixes were necessary for the stated success criteria (all 13 logs lose no
declined area; the e2e sweep must pass against the real corpus). No scope creep.

## Issues Encountered

- A pre-existing, unrelated test failure (`test/web/visual-contract.test.ts` — "flattens the
  document canvas... max-width: 70rem") was confirmed via `git stash` to exist on the worktree's
  base commit, before this task touched anything. Left untouched per the scope-boundary rule and
  logged in `.planning/quick/260923-jxp-discussion-log-page-review-fixes-on-the-/deferred-items.md`.

## User Setup Required

None - no external service configuration required. The parse change is server code — it only
reaches the tailnet after the user restarts `labelore.service` themselves; the executor never
touched port 4173 or the systemd unit. The plan's `<verify>` human-check step (visiting the live
tailnet URL post-restart) was not run by the executor for the same reason — see coverage D6.

## Next Phase Readiness

- The full discussion-log page review is complete: all nine review items (log date, ghost
  chapters, option titles, numbered options, no dropped questions, quiet notes, Endnotes sheet,
  truthful cover numbers, copy-path button) are implemented and gated green.
- No blockers. The human should restart `labelore.service` and spot-check studio-portal phase 01's
  discussion log (the CONTEXT.md-named repro) plus a PLAN and a SUMMARY page for the copy button,
  per the plan's `<verify>` human-check step.

---
*Phase: quick-260923-jxp*
*Completed: 2026-09-23*

## Self-Check: PASSED

- FOUND: src/web/components/copy-path-button.tsx
- FOUND: test/web/discussion-log-corpus.test.ts
- FOUND: test/e2e/artifact-header.spec.ts
- FOUND commit f0c28de (Tasks 1+2)
- FOUND commit 3f74056 (Task 3)

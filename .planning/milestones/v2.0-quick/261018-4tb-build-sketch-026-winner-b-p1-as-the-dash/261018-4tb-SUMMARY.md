---
phase: quick-261018-4tb
plan: 01
subsystem: dashboard
tags: [dashboard, blockers, decisions, pace, todos, sketch-026]
requires: [sketch 025 project head]
provides:
  - server-side ledger (blockers, decisions, pace, todos, notes, recent tasks, queue) on /api/dashboard
  - the dashboard below the head: Blocking band, Decisions, Pace, On deck beside Recent work
key-files:
  created:
    - src/server/document-sources.ts
    - src/server/dashboard-ledger.ts
    - src/presentation/dashboard-ledger-view.ts
    - src/presentation/dashboard-pace.ts
    - src/web/pages/dashboard-ledger.tsx
    - src/web/pages/dashboard-pace.tsx
    - src/web/pages/dashboard-deck.tsx
    - test/helpers/dashboard-sources.ts
    - test/fixtures/dashboard/ledger/.planning/
    - test/fixtures/dashboard/synthetic/.planning/
  modified:
    - src/server/project-presentation.ts
    - src/presentation/dashboard.ts
    - src/planning-repo/handlers/state.ts
    - src/web/pages/dashboard-page.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
status: complete
commits: 3
plan_head_before: eb46b29887901f7bb869582dea482f0d0f658453
plan_head_after: 77d3226834671166bf43697f9c5de4645c311c5a
actuals:
  tokens: 300000
  tasks: 3
  commits: 3
---

# Quick Task 261018-4tb: Sketch 026 winner (B + P1) as the dashboard below the head

Everything under the project head is rebuilt. The old Decisions and Blockers panels, which linked to STATE.md headings, and the two-card On deck are gone. The page now has a red Blocking band, Decisions on a phase rail, a Pace panel built from each plan's own SUMMARY, and On deck beside Recent work. The head is unchanged.

## What now sits below the head

- **Blocking.** A full-width red band. The most urgent open blocker in the current filter is the large sentence, with the documents it names. Beside it are the open count, a group legend that filters, a search box and a "Show resolved" toggle. The other blockers are one-line rows that expand in place, five to a page. With nothing open it is one line: "Nothing blocking. No open blockers are recorded". A blocker links only to documents that resolve to a real file. Otherwise it is marked Untagged and offers Copy text. Expanded rows also list up to eight other files that cite the same finding, quick task or requirement.
- **Decisions.** A search box and a count. With two or more phases there is a bar chart per phase, and a bar filters the log. Entries run newest first, eight to a page, grouped by phase on a rail. A row opens to Why, Logged and Source (the plan, quick task or phase context it was logged from) plus a Phase link.
- **Pace.** The total execution time is the hero. Under it are plans completed, average with median, and per task. On the right are milestone chips, a trend chip and sentence, and a dot for every timed plan over shaded phase bands with a running median. Hovering a dot names the plan. Numbers come from each SUMMARY's duration and completed date, not STATE.md's metrics table.
- **On deck and Recent work.** The two panels sit 24px apart, stretch to equal height and pin their pagers to the floor. On deck has Next, Todos and Notes tabs. Todos have severity gutters, and only file-backed todos link out. Recent work has a 21-day activity chart and tasks grouped by day under a date gutter.

All parsing happens on the server over the in-memory snapshot and arrives through the existing `/api/dashboard` request. The page never reads a file. Unknown or malformed files give empty sections with their quiet lines.

## The planner's discretion items, as built

1. One source resolver serves blockers, decisions and STATE todos on the server. Pace statistics stay pure in `src/presentation`, so the page can rescope them when a milestone chip is picked.
2. "Also mentioned in" comes from a token index built in one pass per artifact body, with the same boundaries as the sketch. A 300-blocker stress test builds well inside the 1,500 ms budget.
3. A review finding resolves only in a review-kind artifact. The sketch's filename test also matched UI reviews.
4. A phase-document source (UAT, Security, UI review and so on) shows its label alone in the collapsed chip.
5. The Next queue drops the plan the head already names, by id, and keeps at most six. "Unchecked roadmap phase" is read as a live phase that is not finished. Both fixtures give the sketch's own queue.
6. The decisions no-match line reads "in entries with no phase" for the no-phase filter.
7. Copy text swaps its label to "Copied" for 1.5 seconds, and a clipboard failure is silent.
8. Pace dots name their plan through a native SVG `<title>`, with no floating tooltip. The phase name is the roadmap name.
9. The container widths map to the app's media blocks. The band, pace rail and bottom row go to one column under 62rem. Expanded-row facts and todo rows stack under 42rem.
10. The pace hero uses `--fs-display-3` (`--fs-display-narrow` under 42rem). It fits at 1440px.
11. `DashboardViewModel.current` and `.next` are unchanged. On deck no longer reads the old previews.
12. Labels keep the text they came from: `P05` and `Phase 05` as written, and a finding's meta follows its source.

## Contracts rewritten, and why

- shell-contract, empty-state, visual-contract and strip-emoji read the dashboard page together with its section modules, through a small test helper. The same assertions were kept, now over the modules the markup moved into.
- empty-state now expects "No open blockers are recorded" and "Nothing is queued after the next step."
- visual-contract's old Needs attention row-height test is replaced by checks that a closed ledger row is one line and a source card clamps its detail to two lines. The dashboard-grid test is replaced by a check on the new bottom row. The G2-08 clamp checks now cover the queue and todo details.
- strip-emoji now pins that titles and rationales reach the page through MarkedText, which strips emoji before tokenizing.
- In dashboard.test.ts, the blockers and decisions tests that pinned the removed STATE.md heading link and the old log split were retired. The ledger tests replace them.

## Deviations from Plan

### Auto-fixed

**1. [Rule 3 - Blocking] test/server/deep-links.test.ts pinned the old payload shape**
- Found during: Task 3 full run. Its assertion expected `decisions` and `blockers` as `{ items }`. Both are now plain lists.
- Fix: updated the expectation. This file was not in the plan's file list.
- Commit: 77d3226

**2. [Rule 1 - Bug] The sketch's empty Pace section dropped the milestone chips**
- Choosing a milestone with no timed plans left no way back. The empty section now keeps the chips when there are two or more milestones.

**3. The tab underline overlap used a raw `-1px` margin, which the token guard rejects**
- The tab bar's hairline is now an inset shadow, so the open tab's underline covers it without a negative margin.

### Kept differences from the sketch

- The decision and recent-work counts show the number large and the words small, as in the sketch. Static text reads "6 logged" and "7 in 3 weeks".
- The Pace key's marker dots are round, to match the round chart dots. They are the only rounded elements on the page.
- The 300-blocker timing test keeps about 110 entries, because the plan's 200,000-character section cap applies before parsing. The cost of indexing 300 x 40 KB artifacts is still measured.
- The app shell narrows the page and adds its own header, and labelore's live data has moved on since the sketch.

## Browser check

Scratch servers ran on ports 5310 to 5313 for labelore, the synthetic project, the ledger project and the dense fixture. The sketch was served on 5314. I captured synthetic and dense beside the sketch's own projects at 1440px light, synthetic dark, ledger and labelore at 1440px, and synthetic, ledger and dense at 390px. Order, structure, colours and spacing match the sketch. There is no horizontal overflow at 390px, and the page threw no console errors. I also opened a blocker row (its review, plan and audit cards and "Also mentioned in" chips showed), a decision row and the Todos tab. All scratch servers were stopped by PID. `npm run build` rewrote `dist/`, so the user's running instances on 4173 and 4174 need a restart to pick up the new API and the new bundle together.

## Verification

- Full vitest: the only failures are the ones already present at the base commit (see deferred-items.md). The token-guard list is still exactly the three older rules.
- Typecheck, lint and build pass. No raw-HTML prop appears in the dashboard modules.
- New tests cover the ledger facts through the real reader and the `/api/dashboard` route, the pure helpers, and static renders of every section.

## Self-Check: PASSED

All created files exist and commits c08ceeb, b3db255 and 77d3226 are in history.

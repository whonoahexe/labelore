---
phase: quick-260930-jzt
plan: 01
subsystem: rendering
tags: [research-briefing, ascii-lift, clean-tree, figure-frame, sketch-009]
requires:
  - phase: quick-260929-3x3
    provides: the lifted diagram, clean tree and figure frame this plan improves
provides:
  - drift-tolerant and open-left box detection in the lift model
  - box-less step cards with model-owned padded frames and spacer rows
  - an uncapped, gridded, hover-aware figure frame
  - a MODIFIED tree badge, folder-chain collapse and a framed tree (CleanTreeFigure)
affects: [lifted-figures-everywhere todo, RESEARCH briefing page]
tech-stack:
  added: []
  patterns:
    - "model owns card frames (grid units); the component only multiplies by measured cell size"
    - "new colour recipes are named :root tokens; the 3x3 CSS block only reads var(--token)"
key-files:
  created:
    - test/web/clean-tree.test.ts
    - test/rendering/fixtures/sp-v1-01-identity-diagram.txt
    - test/rendering/fixtures/sp-v1-03-file-browsing-diagram.txt
    - test/rendering/fixtures/sp-p01-identity-sessions-diagram.txt
    - test/rendering/fixtures/sp-p02-roles-diagram.txt
    - test/rendering/fixtures/sp-p04-bulk-archive-diagram.txt
    - test/rendering/fixtures/sp-p02-roles-tree.txt
  modified:
    - src/rendering/ascii-lift.ts
    - src/rendering/ascii-tree.ts
    - src/web/components/lifted-diagram.tsx
    - src/web/components/figure-frame.tsx
    - src/web/components/clean-tree.tsx
    - src/web/views/research-briefing-components.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/rendering/ascii-lift.test.ts
    - test/rendering/ascii-tree.test.ts
    - test/web/research-view-contract.test.ts
key-decisions:
  - "Outside runs win over enclosing nested boxes: an open-left box's frame never covers a note or connector that starts left of its inferred edge (coordinator course correction after the tracer review)"
  - "Two step frames whose text interleaves may meet in one cell (phases/01 rows 12-14); every other pair is disjoint with a half-row gap"
patterns-established:
  - "Open-left box: right-edge-only progressive walk, accepted only when the shape rules out a connector"
  - "Box-less steps absorb trunk-side detail lines; a line that would stretch a step across a neighbour is an aside"
requirements-completed: [JZT-M1, JZT-M2, JZT-M3, JZT-M4, JZT-M5, JZT-M6, JZT-D1, JZT-D2, JZT-D3, JZT-D4]
status: complete
duration: about 2h
completed: 2026-09-30
actuals:
  tokens: 60000
  tasks: 3
  commits: 4
plan_head_before: 261ea0728749f1226fee07d9ec0d3cf5f70eb5c0
plan_head_after: 6c6e72cb476609d6251fb7897dfb4caf2f5996ea
---

# Phase quick-260930-jzt Plan 01: Improve the RESEARCH figure renderers Summary

**The lifted diagram follows hand-drawn drift (ragged and open-left boxes, tree guides, arrows into sides), box-less flows become padded step cards, the frame shows whole figures with Grid and innermost-card hover, and the directory tree is a dense, framed, chain-collapsed list with a MODIFIED chip.**

`actuals.tokens` is an estimate from the size of the realized diff (about 60k on the chars/4 scale), not a measured count.

## Accomplishments

- **Lift model (M4, M5, D1).** Edges are walked progressively (offsets 0, +1, -1, +2, -2 from the previous row). An arrow drawn into a side stays an arrow. `├─`/`└─`/`│` tree guides inside a box stay content. An open-left outer box is inferred from its right edge (AUTH MIDDLEWARE in v1.0/01). Box cards are ordered outer before inner. Box-less flows cluster into step cards that absorb trunk-side detail lines, get aria-hidden spacer rows, and carry padded, clamped frames. Scans stay bounded (500,000-probe walk budget, 500-node cap).
- **Frame and diagram presentation (M1, M3, M6).** The frame body has no height cap and scrolls horizontally only. `data-fit` clips the Fit box. A Grid chip draws a grid-paper backdrop. Hover lights only the innermost card (`data-hot`, set imperatively, rAF-throttled). Four `:root` tokens carry the box, node and grid recipes. Notes get a scoped synthetic oblique (`font-synthesis-style: auto`).
- **Tree (M2, D2, D3, D4).** MODIFIED is a changed badge shown as an in-flight chip. `collapseFolderChains` merges single-child folder chains (`app/admin/`) in one linear pass. `CleanTreeFigure` puts the tree in the diagram's `FigureFrame` titled Directory structure, with Changed only and the counts in the bar. Rows are denser with hairline separators, faint indent guides at a `--space-6` step, and muted folder names. A chip row measures 29.53px against 29.42px for a bare row on roles at 1440px.

## Task Commits

1. Task 1 (tracer): lift model, frames, placement - `26a9de3`
2. Task 1 follow-up: open-left left edge clamped right of outside notes and connectors - `9d31f71`
3. Task 2: frame shell and diagram presentation - `340f24a`
4. Task 3: tree - `6c6e72c`

## Verification

- `npm test`: 79 files, 1530 tests pass. `npm run typecheck` and `npm run lint` clean.
- `npx playwright test test/e2e/research-briefing.spec.ts` (run once): 2 passed. LB v1.0/02 keeps 23 node cards and 27 tree rows; SP v1.0/02 keeps `Changed only · 3` and 9 box cards. The spec needed no edits.
- Live check on a scratch dev server (ports 5191, 5192, since stopped): all 8 studio-portal RESEARCH docs at 1440px in light theme show `scrollHeight == clientHeight` on the figure body (no inner vertical scroll) and no horizontal scroll, at actual size and in Fit. Hover marked exactly one card. Dark theme was not re-measured; those metrics do not depend on the theme.

## Deviations from Plan

**1. [Rule 1 - Bug] Bottom-corner tolerance.** The plan's "`┘` within 2 columns of the last anchor" dropped 2 of 3 boxes in labelore v1.0/01. The check is now "within 2 of the last anchor, or within 3 of the top-right `┐`" (the old tolerance). Commit 26a9de3.

**2. [Rule 1 - Bug] Interleaved step frames.** In phases/01, "Next.js page" (rows 12-14) and "Rust backend" (rows 8-12) share row 12 and column 44 through their text alone, so no padded rectangles that contain all their text can be disjoint. The test asserts that exactly that pair touches, by at most 1 cell. Roles and bulk archive are fully disjoint. Commit 26a9de3.

**3. [Rule 1 - Bug] Wrapped lines and asides.** A wrapped line that would stretch a step across a neighbouring step (phases/01 row 43), and a run that follows a step's own heading on its row (roles `(D-13)`), become notes instead of details. This keeps cards from overlapping. Commit 26a9de3.

**4. [Rule 1 - Bug] Right-edge rounding.** A right border pushed past the `┐` still grows the card to border + 1, as before. The existing "overrun widens to run end + 2" test needs it. Commit 26a9de3.

**5. [Coordinator course correction] Open-left left edge.** The inferred left edge of the AUTH MIDDLEWARE card covered the "(2) POST /api/ws-ticket" note and the `└───►` connector that enters it. The frame's left edge is now clamped just right of any text or connector run that starts left of the inferred edge, on the box's own rows and outside nested boxes. Consequence: the two inner boxes at column 25 (rows 25-29 and 31-34) start left of the outer card and are no longer enclosed by it. Only the box the connector enters (row 16) is enclosed on the left. The v1.0/01 test asserts the note and connector lie outside the card and the heading inside it. Commit 9d31f71.

**6. [Test updates, as planned] Three existing ascii-lift assertions changed**, each with a one-line comment: the minimal box (`toMatchObject` plus a frame check), "1. carries a cookie" (now sub text, D1), and the step list (second node's rows shift by one spacer). Corpus counts did not move: SP02_SHAPE 9 boxes and 1 widened, LB v1.0/02 23 nodes, LB v1.0/01 3 boxes, SP v1.0/03 2 boxes.

**7. [Rule 3 - Blocking] Plan head ledger.** The `gsd-plan-head-before-*` ledger file could not be written from this worktree (the shared `.git` path is refused), so `plan_head_before` was recorded from the tracer checkpoint return (`261ea07…`) and `commits: 4` was measured with `git rev-list --count` against it.

## Known Stubs

None.

## Deferred Items

- dark-theme screenshots of the eight docs were not taken (plan human-check).
- STATE.md and ROADMAP.md were not updated by this executor; the coordinator owns them for this quick task.

## Threat Flags

None. No new network endpoints, auth paths, file access or schema changes. Input caps (250x300, 500 boxes, 500 nodes, 500,000 walk probes, 2000 tree rows) and the no-raw-HTML contract hold.

## Self-Check: PASSED

- FOUND: src/rendering/ascii-lift.ts, src/rendering/ascii-tree.ts, src/web/components/clean-tree.tsx, src/web/components/figure-frame.tsx, test/web/clean-tree.test.ts, all six fixtures
- FOUND commits: 26a9de3, 9d31f71, 340f24a, 6c6e72c

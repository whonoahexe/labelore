---
phase: quick-260930-jzt
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
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
  - test/rendering/fixtures/sp-v1-01-identity-diagram.txt
  - test/rendering/fixtures/sp-v1-03-file-browsing-diagram.txt
  - test/rendering/fixtures/sp-p01-identity-sessions-diagram.txt
  - test/rendering/fixtures/sp-p02-roles-diagram.txt
  - test/rendering/fixtures/sp-p04-bulk-archive-diagram.txt
  - test/rendering/fixtures/sp-p02-roles-tree.txt
  - test/web/clean-tree.test.ts
  - test/web/research-view-contract.test.ts
  - test/e2e/research-briefing.spec.ts
autonomous: true
requirements: [JZT-M1, JZT-M2, JZT-M3, JZT-M4, JZT-M5, JZT-M6, JZT-D1, JZT-D2, JZT-D3, JZT-D4]

estimate:
  tokens: 115000
  raw_tokens: 115000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "JZT-M1: on all 8 studio-portal RESEARCH docs (http://127.0.0.1:5180, 1440px, light and dark) the System architecture figure shows the whole diagram in the page with no inner vertical scroll. A figure wider than the frame scrolls horizontally inside the frame. Fit to width scales it to the frame width with no horizontal scrollbar, and the height follows. Expand still opens it at actual size."
    - "JZT-M4: in v1.0 01-identity-persistence-foundation, the outer AUTH MIDDLEWARE (axum) box lifts as one card. It encloses the fetch, ticket-map, WS-upgrade and SQLite boxes plus the AUTH_MODE=dev lines, and those nested cards paint over it. No staircase of loose │ ticks is left along its drifting right edge. The ► entering step 1 stays an arrow, with no stray │ beside it."
    - "JZT-M5: in v1.0 03-file-browsing, the RUST/AXUM BACKEND box shows no stray right-edge │ fragment on any row. Its ├─ / └─ / │ tree guides stay visible as content."
    - "JZT-D1: in the box-less flows (phases/01, phases/02 roles, phases/04 bulk archive, v1.0 04), every step is a quiet, padded step card. Each card holds its heading, its detail lines (indented lines under or beside the trunk that belong to the step) and the trunk they hang off. Stacked cards in one column share a left edge and keep at least half a row of gap. No two cards overlap. Edge labels (──no──►), ◄─ pointer notes and asides beyond a card stay outside every card."
    - "JZT-M3: diagram notes are visibly distinct: muted and slanted, using a synthetic oblique of the mono face scoped to notes. The monospace grid stays intact."
    - "JZT-M6: the diagram frame bar has a Grid toggle that draws a grid-paper backdrop. Hovering a card highlights only the innermost card under the pointer, with a primary border and primary tint. Box cards show a clearly visible border in light mode. Node cards use the quieter sketch tint."
    - "JZT-M2: in the phases/02 roles tree, the 12 MODIFIED rows show a 'modified' chip in the in-flight tone, and their notes no longer start with 'MODIFIED —'. The frame bar reads 'Changed only · 18' and '18 files · 14 folders'. Changed only keeps the 18 changed files plus their ancestors."
    - "JZT-D2/D3: the tree is denser and calmer. It has faint hairline separators and tighter rows, and a chip row is the same height as a plain row (within 1px). Folder names are muted while folder icons stay primary. Faint vertical indent guides run at a --space-6 step. A single-child folder chain with no intermediate notes collapses into one collapsible row (roles: app/admin/)."
    - "JZT-D4: the tree sits in the same FigureFrame shell as the diagram. The frame is titled 'Directory structure'; its bar carries Changed only, the counts and Expand, and has no Fit or Grid chips. No duplicate 'Directory structure' label sits above either structure figure."
    - "npm test, npm run lint, npm run typecheck and the narrow research-briefing e2e spec all pass. The labelore v1.0/02 figures keep 23 node cards and 27 tree rows."
  artifacts:
    - path: "src/rendering/ascii-lift.ts"
      provides: "Drift-tolerant box detection: a progressive right-edge walk, arrows drawn into a side, tree guides kept as content, and open-left outer boxes. Box cards are ordered outer before inner. Box-less step clustering absorbs trunk-side details. The model adds spacer display rows and computes padded, clamped card frames in grid units. Scans stay bounded: row/column/box caps, a node cap and a walk-probe budget."
      contains: "spacers"
    - path: "src/rendering/ascii-tree.ts"
      provides: "A MODIFIED badge that counts as changed, and a pure, linear collapseFolderChains"
      contains: "MODIFIED"
    - path: "src/web/components/lifted-diagram.tsx"
      provides: "Places cards from card.frame, renders spacer rows (aria-hidden) and data-fit, and marks the innermost card under the pointer data-hot"
      contains: "data-hot"
    - path: "src/web/components/figure-frame.tsx"
      provides: "A Grid toggle (data-grid on the body), a tools slot and a scalable flag"
      contains: "Grid"
    - path: "src/web/components/clean-tree.tsx"
      provides: "CleanTreeFigure: the tree inside a FigureFrame with Changed only and counts in the bar. CleanTree renders collapsed chains with data-dir and indent guides."
      contains: "CleanTreeFigure"
    - path: "src/web/styles/globals.css"
      provides: "The :root tokens --figure-card-border, --figure-node-fill, --figure-node-border and --figure-grid-line, plus rule edits inside the quick-260929-3x3 block"
      contains: "--figure-node-fill:"
    - path: "test/rendering/fixtures/sp-v1-01-identity-diagram.txt"
      provides: "The M4 diagram, verbatim"
    - path: "test/web/clean-tree.test.ts"
      provides: "Static-markup cases for CleanTree against the roles tree fixture"
  key_links:
    - from: "src/web/components/lifted-diagram.tsx"
      to: "src/rendering/ascii-lift.ts"
      via: "placeCard multiplies card.frame by the measured char width and row height; figure.spacers marks aria-hidden rows"
      pattern: "card\\.frame"
    - from: "src/web/components/clean-tree.tsx"
      to: "src/web/components/figure-frame.tsx"
      via: "CleanTreeFigure passes the Changed only chip and counts through FigureFrame's tools slot, with scalable false"
      pattern: "FigureFrame"
    - from: "src/web/views/research-briefing-components.tsx"
      to: "src/web/components/clean-tree.tsx"
      via: "The architecture chapter renders CleanTreeFigure titled Directory structure"
      pattern: "CleanTreeFigure"
    - from: "src/web/styles/globals.css (quick-260929-3x3 block)"
      to: "src/web/styles/globals.css (:root tokens)"
      via: "Card, node, grid and hot rules read the named figure tokens. The block itself stays free of color-mix (research-view contract)."
      pattern: "var\\(--figure-card-border\\)"
---

<objective>
This plan improves the two RESEARCH figure renderers that quick-260929-3x3 built from sketch 009 B+B: the lifted diagram and the clean tree. It fixes the ten findings from a Playwright review of all 8 studio-portal RESEARCH docs.

- Mechanical fixes: M1 (uncapped frame), M2 (MODIFIED badge), M3 (legible notes), M4 (drifting and open-left nested boxes), M5 (tree guides inside boxes), M6 (Grid toggle, card hover, stronger borders).
- Design fixes: D1 (step cards for box-less flows), D2 (a denser, calmer tree), D3 (indent guides and chain collapse), D4 (the tree framed like the diagram).

Purpose: the figures are among the most useful parts of a RESEARCH doc, and today they clip, misdetect boxes and read like spreadsheets. Both renderers stay view-agnostic, because the lifted-figures-everywhere todo reuses them for every document.

Output: an updated pure lift model and tree model with fixture-backed unit tests, updated figure components, CSS edits inside the existing quick-260929-3x3 block plus four :root tokens, and design-language doc updates.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md
@docs/design-language.md
@.planning/sketches/009-research-figures/README.md
@.planning/quick/260929-3x3-build-the-research-page-view-per-sketche/260929-3x3-SUMMARY.md
@src/rendering/ascii-lift.ts
@src/rendering/ascii-tree.ts
@src/web/components/lifted-diagram.tsx
@src/web/components/figure-frame.tsx
@src/web/components/clean-tree.tsx

<interfaces>
Current contracts that the executor extends. The model below is what this plan adds.

- src/rendering/ascii-lift.ts exports liftDiagram(text) returning LiftedFigure or null, isLiftableDiagram(text), LIFT_MAX_ROWS (250) and LIFT_MAX_COLS (300). LiftCard has kind 'box' | 'node', inclusive r1/c1/r2/c2, and widened. LiftedFigure has rows (LiftSegment[][], where a segment is text plus a kind of line | arrow | node | sub | note | null), cards, width and height. isLiftableDiagram is called from src/web/views/research-briefing.ts (it sets diagram.lifted); liftDiagram is called only from src/web/components/lifted-diagram.tsx.
- This plan adds to LiftCard a field `frame` with left, top, width and height. The frame is the rectangle the component draws, in grid units (columns and display rows), with padding and clamping already applied.
- This plan adds to LiftedFigure a field `spacers`: the sorted display-row indices of inserted spacer rows. `rows`, `height` and every card's r1/r2 are in display rows. A boxed figure has no spacers, so its display rows equal its source rows.
- src/rendering/ascii-tree.ts exports parseTree, changedOnlySet, treeCounts, isDirectoryTree and TREE_MAX_ROWS. TreeRow has depth, prefix, name, note, dir, badge and parent. This plan adds the 'MODIFIED' badge and collapseFolderChains(rows), which returns display rows with re-indexed parent links.
- FigureFrame currently takes title, children as (fit: boolean) => ReactNode, and caption. This plan adds tools (ReactNode, rendered in the bar) and scalable (boolean, default true; false hides Fit/Actual size and Grid).
- The call site is src/web/views/research-briefing-components.tsx, in ArchitectureChapter (around lines 344-365).
- The studio-portal source docs are resolved through SP_PLANNING (test/helpers/studio-portal.ts). The docs are phases/01-portal-owned-identity-sessions/01-RESEARCH.md, phases/02-roles-permission-enforcement/02-RESEARCH.md, phases/04-bulk-archive-downloads/04-RESEARCH.md, milestones/v1.0-phases/01-identity-persistence-foundation/01-RESEARCH.md and milestones/v1.0-phases/03-file-browsing/03-RESEARCH.md. The figure text is extractResearchBriefing(body).architecture.diagram.text or .structure.text, from src/planning-repo/handlers/research-briefing.ts.
</interfaces>

<gates>
These are hard gates, checked by existing tests that must stay green.

- test/web/research-view-contract.test.ts forbids color-mix, raw colours, radius and the destructive/warning tokens inside the quick-260929-3x3 CSS block. Every new colour recipe is therefore a named token in :root, next to --missing-border (the idiom quick-260929-mih used). The block only reads var(--token).
- test/token-guard.test.ts requires padding, margin, gap and inset to use var(--space-*), with calc(-1 * var(--space-N)) allowed. line-height and font-size must be var() tokens. A color-mix recipe may not recur at two usage sites. No two :root tokens may hold identical values.
- test/web/class-vocabulary.test.ts requires every className literal in src/web/components to be a name in docs/design-language.md, and every data-tone literal to be a documented tone. Prefer data-attributes (data-hot, data-grid, data-fit, data-spacer, data-dir) over new class names.
- The F-05 chip signature (research-briefing e2e) requires every status-chip on the page to compute the same font-size, weight, padding, text-transform, letter-spacing and line-height. So never set line-height on a chip's ancestors and never restyle chip padding or font.
- Tones come only from the design-language tone table. Never use destructive or warning for content.
- Squared corners everywhere.
- Playwright: run only the single narrow spec test/e2e/research-briefing.spec.ts, once, at the end. Never run the full e2e suite (about 6 minutes).
- The studio-portal checkout is read-only. Fixture extraction only reads it.
- Do not touch labelore.service (port 4173) or the sketch server (port 4174). The dev server on 5180 hot-reloads UI changes, and labelore-build-watch rebuilds dist/ on its own.
</gates>
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Lift model — drift-tolerant and open-left boxes, box-less step cards, model-owned frames, placed end-to-end (JZT-M4, JZT-M5, JZT-D1)</name>
  <files>src/rendering/ascii-lift.ts, test/rendering/ascii-lift.test.ts, test/rendering/fixtures/sp-v1-01-identity-diagram.txt, test/rendering/fixtures/sp-v1-03-file-browsing-diagram.txt, test/rendering/fixtures/sp-p01-identity-sessions-diagram.txt, test/rendering/fixtures/sp-p02-roles-diagram.txt, test/rendering/fixtures/sp-p04-bulk-archive-diagram.txt, src/web/components/lifted-diagram.tsx, src/web/styles/globals.css</files>
  <read_first>src/rendering/ascii-lift.ts (whole file), test/rendering/ascii-lift.test.ts (whole file), src/web/components/lifted-diagram.tsx, .planning/sketches/009-research-figures/index.html (liftModel and placeCards, around lines 345-440), test/helpers/studio-portal.ts, src/planning-repo/handlers/research-briefing.ts (extractResearchBriefing signature only)</read_first>
  <behavior>
    - M4 fixture (sp-v1-01-identity-diagram.txt): 8 box cards.
      - One box card has r1 14 (the AUTH MIDDLEWARE top row, with ┌ at column 35) and c2 of at least 89. Its frame encloses the frames of the four boxes whose r1 is 16, 25, 25 and 31, and it comes before each of them in cards.
      - On every row from 15 to 36, the column of that source row's rightmost │ is a space in the lifted text.
      - The outer frame's bottom (top + height) is at least 38, so the row-37 "hard-panics…" text sits inside it.
      - Row 17 keeps ► at column 47 as an arrow segment, and column 48 is blank.
    - M5 fixture (sp-v1-03-file-browsing-diagram.txt): 2 box cards, and the backend box has c2 of at least 73. No box glyph sits at column 60 or beyond on rows 10–38. Column 5 keeps its ├ / └ / │ guide as a line segment on rows 13–24, 27–30 and 33–36.
    - Bulk-archive fixture (sp-p04-bulk-archive-diagram.txt): 11 node cards and 10 spacers.
      - No two node frames intersect.
      - Frames that share columns are at least 0.5 row apart. Frames that share rows are at least 0.5 column apart.
      - Each detail line ('local: TierRoot…', 'cloud: one rclone…', the five lines under 'ArchiveExecutor dedicated thread', and the three lines under 'completed WS…') lies inside its step's frame.
      - The ten arrow-led step cards share one frame left edge.
      - 'no', 'refusal dialog (selection intact)' and 'same refusal dialog' are notes that lie outside every node frame.
    - Roles fixture (sp-p02-roles-diagram.txt): no two node frames intersect.
      - 'Browser -> POST/PATCH…' lies inside the frame of 'Admin permission-grant path (new):'.
      - The 'SQLite transaction…' and 'revocation/permission bus.send…' steps are separate node cards at least 0.5 row apart.
      - '2. VerifiedIdentity::from_request_parts (auth/mod.rs)' and its three '- …' bullets are sub text inside the 'axum handler' frame.
      - 'UNCHANGED, identity-free…' stays a note outside every frame.
    - Phases/01 fixture (sp-p01-identity-sessions-diagram.txt): no two node frames intersect.
      - 'validation endpoint', 'SELECT ... FROM sessions', 'WHERE id=? AND revoked_at IS NULL' and 'AND expires_at > now()' lie inside the frame of 'Rust backend — /api/whoami-shaped'.
      - 'renders page' lies inside the frame of '(cookie valid)'.
    - Kept: SP02_SHAPE has 9 boxes, 1 widened, 46 rows and 0 nodes. LB v1.0/02 has 0 boxes and 23 nodes. LB v1.0/01 has 3 boxes. The SP v1.0/03 real file has 2 boxes. The isLiftableDiagram cases and the 250×300 caps hold.
    - Perf (T-jzt-01): 250 rows alternating '┌┐' pairs with rows of '││' columns (heavy on edge walks) return within 250 ms, and a null result is allowed. A 250×300 grid of 'ab  ' repeats returns within 250 ms.
  </behavior>
  <action>
Fixtures first. Write a throwaway extraction script in the session scratchpad, not in the repo. For each of the five studio-portal docs listed in the interfaces block, it should read the doc under SP_PLANNING, take extractResearchBriefing(body).architecture.diagram.text, and write that text byte-for-byte (no added trailing newline) to test/rendering/fixtures/:
- the v1.0 01 identity doc to sp-v1-01-identity-diagram.txt
- the v1.0 03 file-browsing doc to sp-v1-03-file-browsing-diagram.txt
- the phases/01 doc to sp-p01-identity-sessions-diagram.txt
- the phases/02 roles doc to sp-p02-roles-diagram.txt
- the phases/04 bulk-archive doc to sp-p04-bulk-archive-diagram.txt

Tests read these fixtures with readFile(new URL('./fixtures/NAME.txt', import.meta.url)). The row and column numbers in the behavior block are 0-based indices into this text. Confirm each one against the fixture before writing the assertions.

Model API (see the interfaces block):
- Add `frame` to LiftCard and `spacers` to LiftedFigure.
- Keep liftDiagram pure: no DOM, no Node API, no research import.
- Update the file's header comment to describe the new detection, clustering and frame rules.

Box detection (M4, M5):
- (a) Progressive right-edge walk. Replace the fixed tolerance, which measured each row's right border against the top-right corner. On each row between the top and bottom rows, look for the border around the previous row's border column, starting from the ┐ column, trying offsets 0, +1, −1, +2, −2 in that order. When a row has no border, keep the previous anchor and record −1. The ┘ must sit within 2 columns of the last anchor.
  - c2 is the rightmost border column found.
  - `widened` is true whenever c2 lies right of the ┐ column or the existing 1–2-column overrun widening fires.
- (b) Arrow drawn into a side. For ►│ on a left edge or │◄ on a right edge, the arrow is the connector tip and stays. The side glyph next to it is the border and is blanked. This fixes the stray │ at row 17 column 48 of the M4 fixture.
- (c) Tree guides are content. An edge walk never takes a candidate that starts a tree-guide run (├ or └, then ─, then a space and text). Inside a box, blank only the per-row left and right border glyphs the walks found (plus the top and bottom edge runs). Every other box glyph inside, such as ├─, └─ and │ trunks, stays and renders as line. When a row's right border was not found, blank a side glyph that sits within 2 columns of the anchor, so that the box's own right border is blanked on every row (M5).
- (d) Open-left boxes (M4's outer box has no left edge and no └).
  - When a ┌…┐ top's left walk does not close, run a second walk down the right edge only. It is progressive, as in (a). Each row must carry a side glyph, or a side arrow at the edge, inside the drift window, and the walk ends on a ┘.
  - Accept the box only when all of these hold:
    - the ┘ has at least 2 ─ directly to its left, and that run does not start at an arrow glyph (this rejects connector tips such as ◄─┘);
    - the cell directly under the ┌ is not a box or arrow glyph (this rejects fork tops such as ┌──┼──┐ over ▼);
    - the box spans at least 3 rows.
  - Card geometry:
    - r1 is the top row and r2 is the ┘ row.
    - c1 is one column left of the leftmost of: the ┌ column, and the c1 of every other box that lies strictly inside r1..r2 rows, has its c2 left of this box's right edge, and overlaps the top edge's column span.
    - c2 is the rightmost right-edge column.
  - When the ┘ row carries text left of its bottom ─ run inside the box's columns, count that text as inside the box. Set the frame bottom at r2 + 1.25 so the text sits within the card.
  - Blank the top edge run, each row's right-edge glyph, the bottom ─ run and the ┘.
- (e) Paint order. Sort box cards so that a containing box comes before every box it contains; area descending is enough. Later DOM siblings paint on top, so nested cards lift over the outer card.
- (f) Bounds (T-jzt-01).
  - Keep LIFT_MAX_ROWS, LIFT_MAX_COLS and MAX_BOXES.
  - Add a global edge-walk probe budget (about 500,000 probes across all walks) and a node cap (about 500). Exceeding either returns null, and the figure then renders as plain text.
  - Run the right-edge-only walk only for tops whose left walk failed.
  - Every new pass must be linear in grid cells or O(cards²) under the caps. Never nest a full-grid scan inside a per-card loop.

Box-less step cards (D1). These apply only when no box was found.
- (a) Decide each run's role in this order:
  1. It follows a note on the same row: note.
  2. Only line or arrow glyphs precede it on its row and it is led by ─…► or →: it starts a step.
  3. It is a short label between two ─ segments: note (edge label).
  4. A ◄─ pointer hangs it off: note.
  5. Trunk-side: the nearest non-space character to its left is a │ within 8 columns. If an open node (see b) has that trunk column within its column span ±2, the run is a detail of that node. Otherwise it is a note.
  6. It starts inside the column span of a node that ended on the row directly above: it merges into that node as sub, even when it opens with a bracket. This fixes LB v1.0/02's '(snapshot only; no fs read)'.
  7. It is a bracketed aside further along a row: note.
  8. Otherwise apply the existing column-overlap merge, or start a new node.
- (b) Detail absorption. After its last row, a node stays open while the following rows, within its column span ±2, hold only trunk │ glyphs and trunk-side runs. A row that holds an arrow glyph, nothing, or a run that is not trunk-side in that window closes the node.
  - Trunk-side runs on an open node's rows join it as sub.
  - On an absorbed row, a later run that starts inside the node's current column span also joins it. A run that starts beyond the span stays a note.
  - The node's column span includes the trunk column its details hang off.
- (c) A card never draws over a note. After clustering, any note run that lies wholly inside a node's final rectangle becomes sub text of that node.
- (d) Spacers. Insert one spacer display row before source row r when a node starts on r and a different node ends on r−1 and their column spans overlap (±1). The spacer row's text holds a │ at every column where the row above has a downward-continuing glyph (│ ├ ┤ ┼ ┬ ┌ ┐) and the row below has an upward-continuing one (│ ├ ┤ ┼ ┴ └ ┘ ▼). Every other column is a space. Shift card rows to display coordinates. Per-row arrays may need one row beyond the last source row.
- (e) Frames.
  - Box frame: left c1 + 0.5, top r1 + 0.5, width c2 − c1, height r2 − r1. This is today's geometry, except for the open-box bottom rule in (d) of box detection.
  - Node frame: start from the member-text extent, padded by 1 column on each side and 0.25 row above and below. Then clamp it:
    - keep at least 0.25 column of clearance from any non-member, non-space character on the frame's rows, and never let padding drop below 0;
    - keep at least 0.5 column between frames that share rows;
    - keep at least 0.5 row between frames that share columns.
  - Stacked node cards in one column whose text starts within 2 columns of each other share the smallest left edge.

Component and CSS (so the tracer reaches the page):
- In src/web/components/lifted-diagram.tsx, placeCard sets left, top, width and height from card.frame multiplied by the measured char width and row height, for both kinds. Delete the per-kind offset constants.
- Rows whose index is in figure.spacers render with data-spacer="true" and aria-hidden="true".
- In src/web/styles/globals.css, inside the quick-260929-3x3 block after the .lifted-diagram-row rule, add a rule for .lifted-diagram-row[data-spacer='true'] that sets user-select: none.

Tests:
- Add the behavior cases. Build a small helper that locates a needle's display row and column span from the joined segment texts, and a frame-contains check.
- Update the existing assertions this design changes, with a one-line comment on each:
  - the minimal box's exact toEqual becomes toMatchObject plus a frame assertion;
  - '1. carries a cookie' is now sub text of Browser (trunk-side detail, D1) instead of a note;
  - in the step-list case, the second node's rows shift by one spacer.
- If SP02_SHAPE's widened count moves, update it only when the newly widened box's right border really drifts past its ┐. Record that in the SUMMARY.
  </action>
  <verify>
    <automated>npx vitest run test/rendering/ascii-lift.test.ts test/web/research-view-contract.test.ts test/web/css-source-order.test.ts test/token-guard.test.ts && npm run typecheck</automated>
    <human-check>On http://127.0.0.1:5180, open studio-portal phases/04 bulk archive and phases/02 roles (Architecture chapter). Every step should be its own padded card, with no overlaps and detail lines inside their cards. Then open v1.0 01 identity: the AUTH MIDDLEWARE card encloses the four inner boxes, with no right-edge staircase.</human-check>
  </verify>
  <done>
- All behavior cases pass against the committed fixtures. The pre-existing ascii-lift cases pass, with only the three documented updates.
- Typecheck is clean, and lifted-diagram.tsx places every card from card.frame.
- In the live app, box-less flows render as separated step cards and the M4 outer box lifts as one card under its nested cards.
  </done>
</task>

<task type="auto">
  <name>Task 2: Frame shell and diagram presentation — uncapped body, Fit without scrollbar, Grid, innermost-card hover, stronger borders, quieter nodes, slanted notes (JZT-M1, JZT-M3, JZT-M6, JZT-D1 tint)</name>
  <files>src/web/components/figure-frame.tsx, src/web/components/lifted-diagram.tsx, src/web/styles/globals.css, docs/design-language.md, test/web/research-view-contract.test.ts</files>
  <read_first>src/web/components/figure-frame.tsx, src/web/components/lifted-diagram.tsx, src/web/styles/globals.css (lines 100-140 for :root tokens; lines 6395-6545 for the .figure-frame* and .lifted-diagram* rules), docs/design-language.md (Shared vocabulary rows 121-142, the 'ASCII figures are lifted' and '10% accent reservation' bullets around lines 284-296), test/web/research-view-contract.test.ts, .planning/sketches/009-research-figures/index.html (lines 66-79 for .grid-paper and .lift-card*)</read_first>
  <action>
Tokens (M6, D1 tint):
- In src/web/styles/globals.css :root, directly after --missing-border and outside the quick-260929-3x3 block, add four named tokens using the sketch-009 recipes, each with a one-line comment:
  - --figure-card-border: color-mix in oklch of --foreground 22% into --border
  - --figure-node-fill: color-mix in oklch of --primary-tint 60% into --background
  - --figure-node-border: color-mix in oklch of --primary 40% into --border
  - --figure-grid-line: color-mix in oklch of --border 35% into transparent
- Do not redeclare them in .dark; they derive from theme variables.

Rules inside the quick-260929-3x3 block (edit in place; var() only):
- .figure-frame-body (M1): keep its padding, scroll horizontally only (overflow-x auto), and delete its fixed height cap so the whole figure shows in the page.
- The dialog's .figure-frame-body override scrolls on both axes (overflow auto), replacing the old reset.
- Add .figure-frame-body[data-grid='true']: a grid-paper backdrop made of two 1px linear-gradient lines in var(--figure-grid-line) (one horizontal, one at 90deg), with background-size var(--space-6) in both axes.
- Add .lifted-diagram-fit[data-fit='true'] with overflow hidden, so the unscaled layout box never produces a horizontal scrollbar in Fit mode.
- .lifted-diagram-card: border colour var(--figure-card-border); the background stays var(--background).
- [data-kind='node']: border colour var(--figure-node-border), background var(--figure-node-fill).
- Add .lifted-diagram-card[data-hot='true']: border colour var(--primary), background var(--primary-tint), plus a short border-color and background-color transition in the stylesheet's existing millisecond idiom.
- .lifted-diagram-note (M3): keep color var(--muted-foreground) and italic, and add font-synthesis-style: auto. Add a comment saying the root turns synthesis off and the mono face ships no italic. A synthetic oblique keeps advance widths, so the grid holds. Do not switch fonts.

src/web/components/figure-frame.tsx:
- Add the props tools (ReactNode, rendered in the bar after the title and before the frame's own chips) and scalable (boolean, default true).
- When scalable, the bar shows the Fit to width / Actual size chip and a new Grid chip: a button with the status-chip class, aria-pressed bound to a grid state, labelled Grid. When scalable is false, neither chip shows.
- Both the page body and the dialog body get data-grid="true" while grid is on.
- Expand stays.
- Update the header comment.

src/web/components/lifted-diagram.tsx:
- The .lifted-diagram-fit wrapper carries data-fit="true" while fit is on.
- Hover (M6): add a pointermove listener on the wrapper, throttled with requestAnimationFrame and using no React state. It converts the pointer to layout units, dividing the fit scale out exactly as place() does. It sets data-hot="true" on the last card in paint order whose rectangle contains the point, which is the innermost one, and removes the attribute from every other card. pointerleave clears all cards. Clean up the listeners and any pending frame in the effect's teardown.
- Cards stay aria-hidden.
- No raw-HTML injection prop anywhere.

docs/design-language.md — update these rows in place:
- figure-frame-bar: Fit/Actual size and Grid chips when scalable, the tools slot, Expand.
- figure-frame-body: no height cap (the whole figure shows), horizontal scroll, the data-grid grid-paper backdrop.
- lifted-diagram-fit: data-fit clips the unscaled box.
- lifted-diagram-card: frames computed by the model, data-hot on the innermost card, the --figure-card-border and --figure-node-* tokens.
- lifted-diagram-row: aria-hidden data-spacer rows between stacked step cards.
- lifted-diagram-note: muted and slanted by a scoped font-synthesis-style.

Also update two bullets:
- 'ASCII figures are lifted, not redrawn': ragged right edges followed row by row, open-left outer boxes, nested cards painted over the outer card, tree guides inside boxes kept as content, box-less step cards that absorb trunk-side detail lines, and spacer rows.
- '10% accent reservation': node cards on the quieter --figure-node-fill / --figure-node-border; the hovered card takes --primary.

test/web/research-view-contract.test.ts — add one case asserting that:
- the .figure-frame-body rule declares no max-height;
- the .lifted-diagram-note rule contains font-synthesis-style: auto;
- :root declares --figure-card-border, --figure-node-fill, --figure-node-border and --figure-grid-line;
- a .lifted-diagram-card[data-hot='true'] rule exists;
- figure-frame.tsx contains aria-pressed on a Grid chip.

The existing 'block holds no color-mix' case must stay green unchanged.
  </action>
  <verify>
    <automated>npx vitest run test/web/research-view-contract.test.ts test/web/class-vocabulary.test.ts test/token-guard.test.ts test/web/css-source-order.test.ts && npm run typecheck && npm run lint</automated>
    <human-check>At 1440px in both themes on http://127.0.0.1:5180, go through all 8 studio-portal RESEARCH docs.
- No diagram has an inner vertical scroll.
- Fit to width scales with no horizontal scrollbar.
- Grid draws the backdrop.
- Hovering a nested card lights only that card.
- Box borders are visible in light mode.
- Notes read slanted and muted, and the columns still line up.</human-check>
  </verify>
  <done>
- The frame body has no height cap, so every diagram shows whole, and Fit scales to width with no scrollbar.
- Grid, innermost-card hover, the stronger card border, the quieter node tint and slanted notes all render in both themes.
- The four tokens live in :root, the 3x3 block stays free of color-mix, and the doc rows and bullets match.
- The contract, vocabulary, token-guard and css-order tests, typecheck and lint pass.
  </done>
  <acceptance_criteria>
    - grep -c "max-height: 34rem" src/web/styles/globals.css prints 0
    - grep -c "font-synthesis-style: auto" src/web/styles/globals.css prints 1 or more
    - grep -c -- "--figure-node-fill:" src/web/styles/globals.css prints 1
    - grep -c "data-hot" src/web/components/lifted-diagram.tsx prints 1 or more
  </acceptance_criteria>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Tree — MODIFIED badge, folder-chain collapse, calmer dense rows with indent guides, framed like the diagram (JZT-M2, JZT-D2, JZT-D3, JZT-D4)</name>
  <files>src/rendering/ascii-tree.ts, src/web/components/clean-tree.tsx, src/web/views/research-briefing-components.tsx, src/web/styles/globals.css, docs/design-language.md, test/rendering/ascii-tree.test.ts, test/rendering/fixtures/sp-p02-roles-tree.txt, test/web/clean-tree.test.ts, test/e2e/research-briefing.spec.ts</files>
  <read_first>src/rendering/ascii-tree.ts, test/rendering/ascii-tree.test.ts, src/web/components/clean-tree.tsx, src/web/components/figure-frame.tsx (as updated by Task 2), src/web/views/research-briefing-components.tsx (lines 330-370), src/web/styles/globals.css (the .clean-tree* rules, around lines 6545-6660), docs/design-language.md (Tones table lines 144-154, clean-tree rows 136-142), test/web/research-briefing.test.ts (the renderToStaticMarkup idiom around line 500), test/e2e/research-briefing.spec.ts (lines 55-60 and 118-127)</read_first>
  <behavior>
    - badgeOf recognises 'MODIFIED — …' and 'MODIFIED: …' and strips the prefix. 'MODIFIEDX …' has no badge.
    - Roles tree fixture (sp-p02-roles-tree.txt):
      - parseTree gives 32 rows, and treeCounts is { files: 18, folders: 14, changed: 18 }.
      - 12 rows have the MODIFIED badge, and none of their notes starts with 'MODIFIED' or '—'.
      - changedOnlySet holds every NEW / EXTEND / MODIFIED row plus its ancestors.
    - collapseFolderChains:
      - Roles gives 31 rows. One row is the folder 'app/admin/', and its display children are 'page.tsx' and 'users/[id]/page.tsx' at the merged row's depth + 1. 'backend/', 'src/', 'frontend/', 'components/' and 'lib/' stay separate.
      - The synthetic tree a/ → b/ → c/ → f.ts gives one row 'a/b/c/' plus 'f.ts'.
      - A note on the parent folder blocks the merge, and a noted last folder keeps its note on the merged row.
      - LB v1.0/02 stays at 27 rows and SP02_SHAPE stays at 14.
      - A 100,000-line single chain returns within 250 ms.
    - CleanTree static markup (roles fixture):
      - 31 clean-tree-row items.
      - A status-chip with data-tone="in-flight" reads 'modified'.
      - Folder rows carry data-dir="true".
      - With changedOnly, the markup renders exactly the changedOnlySet of the collapsed rows.
  </behavior>
  <action>
Fixture:
- Extract the phases/02 roles doc's architecture.structure.text verbatim to test/rendering/fixtures/sp-p02-roles-tree.txt, using the same read-only scratch-script method as Task 1.

src/rendering/ascii-tree.ts:
- TreeBadge gains 'MODIFIED'. badgeOf checks it with the same word-boundary test and the same stripping of ':', '—', '-' and whitespace.
- One shared changed-badge set (NEW, EXTEND, MODIFIED) drives both changedOnlySet and treeCounts.changed.
- Export collapseFolderChains(rows). It is pure and linear:
  - one pass counts each row's children;
  - a folder with exactly one child that is itself a folder, where the parent has no note and no badge, merges with that child, repeating down the chain;
  - the merged name is the chain's folder names concatenated;
  - note, badge and dir come from the last folder in the chain, and prefix comes from the first;
  - parent indices are re-indexed onto the display rows;
  - depth becomes the parent's display depth + 1, with roots at 0.
- Update the header comment.

src/web/components/clean-tree.tsx:
- BADGE_TONE maps MODIFIED to 'in-flight': it is an edit to an existing file, like EXTEND, and never destructive. Keep the exact data-tone={BADGE_TONE[row.badge]} expression that the research-view contract pins.
- CleanTree takes text and an optional changedOnly (default false). It renders collapseFolderChains(parseTree(text)), filters with changedOnlySet over those display rows, and keeps its collapsed-folder state.
- Each li carries data-dir="true" for folders.
- The name cell indents by var(--space-6) per display depth (wider than today).
- The li gets an inline backgroundSize of calc(var(--space-6) * depth) 100% for the guides.
- New export CleanTreeFigure, taking text and title:
  - it owns the changedOnly state;
  - it renders FigureFrame with that title and scalable false;
  - its tools are the Changed only chip (a status-chip button with aria-pressed, labelled 'Changed only · N', shown only when the changed count is above 0) followed by the clean-tree-count span ('F files · D folders', from treeCounts(parseTree(text)));
  - its children render CleanTree.
- Delete the old in-list tools row. If clean-tree-tools is no longer rendered, delete its CSS rules and its doc row together.

src/web/views/research-briefing-components.tsx:
- In ArchitectureChapter's structure block, render CleanTreeFigure titled Directory structure for trees. For non-trees keep FigureFrame titled Directory structure around PlainDiagram.
- Remove the ChapterLabel 'Directory structure' above them; the frame title is now the label.
- The structure notes stay below.

CSS inside the quick-260929-3x3 block (D2, D3):
- .clean-tree-row:
  - padding-block var(--space-1), which is tighter;
  - a 1px solid var(--border-faint) bottom rule (the existing faint-hairline token; do not mint a near-duplicate);
  - hover sets background-color only, so the guide image survives;
  - guides: background-image repeating-linear-gradient at 90deg of var(--border-faint) from 0 to 1px, then transparent from 1px to var(--space-6); background-repeat no-repeat; background-position var(--space-2) 0, which puts each guide under an ancestor's icon centre; the width comes from the inline background-size.
- Chips must not grow a row. Give .clean-tree-note .status-chip a negative block margin written as calc(-1 * var(--space-N)), and choose N by measurement.
  - Never set line-height on any chip ancestor, and never change a chip's padding or font (F-05).
  - Measure at 1440px on roles P2: a row with a chip and a plain one-line row must be within 1px of the same height. Use devtools or a throwaway script against http://127.0.0.1:5180, not the e2e suite.
- .clean-tree-row[data-dir='true'] folder names use var(--muted-foreground), lighter than file names. Folder icons stay var(--primary).
- MODIFIED joins NEW and EXTEND in the changed-name rule (var(--foreground), var(--fw-medium)).
- The pressed Changed-only chip is now styled by the existing .figure-frame-bar button.status-chip[aria-pressed='true'] rule.

docs/design-language.md:
- The Tones table's in-flight 'Used for' cell gains 'a MODIFIED tree badge'.
- Update these rows: clean-tree (collapsed single-child folder chains), clean-tree-row (data-badge includes MODIFIED, data-dir, faint indent guides, hairline separators), clean-tree-name (a --space-6 indent step) and clean-tree-count (now in the frame bar). Remove the clean-tree-tools row if its CSS was deleted.
- The '10% accent reservation' bullet: folder icons take --primary; folder names sit on --muted-foreground.

Tests:
- Add the behavior cases to test/rendering/ascii-tree.test.ts.
- Create test/web/clean-tree.test.ts, which renders CleanTree (not CleanTreeFigure, which avoids the Dialog) through react-dom/server renderToStaticMarkup, following the idiom in test/web/research-briefing.test.ts.
- Touch test/e2e/research-briefing.spec.ts only if an assertion's count legitimately changes, and explain any change in the SUMMARY. The expectations are that LB v1.0/02 keeps 23 node cards, 27 tree rows and no Changed-only button, and that SP v1.0/02 keeps 'Changed only · 3' and 9 box cards.
  </action>
  <verify>
    <automated>npx vitest run test/rendering/ascii-tree.test.ts test/web/clean-tree.test.ts test/web/research-view-contract.test.ts test/web/class-vocabulary.test.ts test/token-guard.test.ts && npm run typecheck && npm run lint</automated>
    <human-check>On http://127.0.0.1:5180, open studio-portal phases/02 roles at 1440px in both themes. The tree sits in a 'Directory structure' frame whose bar has Changed only · 18, 18 files · 14 folders and Expand. MODIFIED rows show in-flight 'modified' chips. Rows are dense with faint separators and faint indent guides. app/admin/ is one collapsible row. Chip rows are the same height as plain rows.</human-check>
  </verify>
  <done>
- MODIFIED is a changed badge in the in-flight tone.
- Single-child note-free folder chains collapse into one collapsible row.
- The tree renders dense and calm, with indent guides, inside a FigureFrame whose bar holds Changed only and the counts.
- The duplicate label is gone.
- The tree, markup, contract, vocabulary and token-guard tests, typecheck and lint pass.
  </done>
  <acceptance_criteria>
    - grep -c "MODIFIED" src/rendering/ascii-tree.ts prints 1 or more
    - grep -c "collapseFolderChains" src/web/components/clean-tree.tsx prints 1 or more
    - grep -c "CleanTreeFigure" src/web/views/research-briefing-components.tsx prints 1 or more
    - grep -c "data-tone={BADGE_TONE\[row.badge\]}" src/web/components/clean-tree.tsx prints 1
  </acceptance_criteria>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| target `.planning/` markdown → pure lift/tree models | Fenced ASCII from any GSD project is untrusted input to a grid scanner and a tree parser that run in the browser |
| model output → React DOM | Diagram text, notes and tree notes become rendered text |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-jzt-01 | Denial of service | src/rendering/ascii-lift.ts: new drift walks, open-left walk, absorption, spacers, frame clamping | medium | mitigate | Keep the LIFT_MAX_ROWS (250), LIFT_MAX_COLS (300) and MAX_BOXES caps. Add a global edge-walk probe budget (about 500k) and a node cap (about 500); exceeding either returns null (plain text). Run the right-edge walk only after a failed left walk. Keep pairwise frame clamping O(cards²) under the caps. Two new 250 ms perf tests (walk-heavy ┌┐/││ grid and a dense-run grid) enforce this. |
| T-jzt-02 | Denial of service | src/rendering/ascii-tree.ts collapseFolderChains | low | mitigate | One linear child-count pass plus one linear merge pass over at most TREE_MAX_ROWS rows. A 100k-line chain perf test enforces it. |
| T-jzt-03 | Tampering (script injection) | lifted-diagram.tsx, clean-tree.tsx, figure-frame.tsx | medium | mitigate | All text renders as React text nodes, and tree notes go only through tokenizeInline-mapped elements. No raw-HTML injection prop; research-view-contract.test.ts already fails on one in every figure file. The spacer rows' text is generated from box glyphs only. |
| T-jzt-04 | Information disclosure | fixture extraction script | low | accept | It only reads studio-portal .planning docs that already render in the app. It writes only into this repo's test/rendering/fixtures/. The checkout stays read-only. |
| T-jzt-SC | Tampering | npm/pip/cargo installs | high | accept | No package is installed or upgraded by this plan, so there is nothing to gate. Any install an executor finds necessary is out of scope and must stop for a checkpoint. |
</threat_model>

<verification>
- npm test: the full vitest suite passes, including ascii-lift, ascii-tree, clean-tree, research-view-contract, class-vocabulary, token-guard and css-source-order.
- npm run lint and npm run typecheck are clean.
- Once, at the end: npx playwright test test/e2e/research-briefing.spec.ts (the single narrow spec covering these renderers). LB v1.0/02 keeps 23 node cards and 27 tree rows, SP v1.0/02 keeps 9 boxes and 'Changed only · 3', and the F-05 chip signatures stay uniform.
- End-of-phase human check (human_verify_mode end-of-phase), at 1440px in both themes on http://127.0.0.1:5180. Cover all 8 studio-portal RESEARCH docs: phases/01–04 and milestones/v1.0-phases/01–04.
  - Whole diagrams with no inner scroll; Fit with no scrollbar.
  - Separated, padded step cards in the 4 box-less docs.
  - The M4 outer card under its nested cards.
  - No stray │ in the v1.0/03 box.
  - Slanted notes, Grid and innermost-card hover.
  - The roles tree framed, dense and guided, with in-flight 'modified' chips and app/admin/ collapsed.
</verification>

<success_criteria>
- All ten findings (M1–M6, D1–D4) are observable in the live app per the must_haves truths, and each is backed by an automated case where it is testable: the lift fixtures, tree fixtures, static markup or CSS contract.
- The renderers stay view-agnostic: no research import in any figure file.
- Colours come only from theme tokens, the four new named :root figure tokens and design-language tones. MODIFIED uses in-flight, never destructive. Corners stay squared.
- Existing gates stay green: vitest, lint, typecheck, and the narrow e2e spec.
</success_criteria>

<output>
Create `.planning/quick/260930-jzt-improve-research-figure-renderers-uncapp/260930-jzt-SUMMARY.md` when done. Record in it:
- any count that moved (SP02 widened, e2e counts) and why;
- the chip negative-margin token chosen and the measured row heights;
- corpus markers seen but not badged (DELETED, REPLACED, EXTENDED) as a follow-up note.
</output>

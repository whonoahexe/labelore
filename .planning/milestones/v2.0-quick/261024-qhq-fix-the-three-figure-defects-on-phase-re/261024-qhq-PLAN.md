---
phase: quick-261024-qhq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - test/rendering/fixtures/lb-v1-01-read-layer-diagram.txt
  - src/rendering/ascii-lift.ts
  - test/rendering/ascii-lift.test.ts
  - src/rendering/ascii-graph.ts
  - test/rendering/ascii-graph.test.ts
  - src/web/styles/globals.css
  - test/web/research-view-contract.test.ts
  - test/e2e/research-briefing.spec.ts
  - docs/design-language.md
autonomous: true
requirements: [QQHQ-01, QQHQ-02, QQHQ-03, QQHQ-04, QQHQ-05, QQHQ-06, QQHQ-07]

estimate:
  tokens: 260000
  raw_tokens: 260000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "QQHQ-01: A box whose right border the author drew further right than the lift's 2-column drift walk reaches (the CLI box in labelore's v1.0 Phase 1 RESEARCH system diagram: top corner at column 60, title-row border at 71, next three rows at 64) widens to fit its longest inside line, and every right-edge bar of that box is blanked, so the Shown as drawn view shows the whole title inside the card and no stray bars beside it. The recovery is bounded (a fixed reach past the top-right corner, counted against the walk budget), never takes a border another box owns, and applies only to boxes with two or more interior rows, so the one-row sketch rule (an overrun of 3 or more columns does not widen) still holds."
    - "QQHQ-02: No figure body on the page, and no element inside one, shows a vertical scrollbar when the figure fits; the cause is found by measurement in the browser and fixed at its source."
    - "QQHQ-03 (user's locked decision): unboxed start and end labels count as nodes. In the graph builder, a free-text label at the open end of a wire becomes a node: (a) a label an arrowhead points into, on a wire whose drawn source is a card, becomes a target; (b) a label directly above or below the tail of a wire that has no card source and points into a card becomes the source. Its wrapped lines become its details. Horizontal `◄──` pointer notes, wire labels beside a line, and prose beside a diagram stay notes; a wire that touches no card promotes nothing."
    - "QQHQ-03 (outcome): the read-layer system diagram redraws as the lanes figure with six nodes: the `.planning` disk source (external lane), Layer A, Layer B, CLI, stdout JSON and Vitest golden-file suite, joined disk to Layer A to Layer B to CLI, and CLI to both outputs."
    - "QQHQ-04: A figure inside a research note (the fixtures/test tree under the Architecture chapter's directory structure) is as wide as the chapter, as wide as the src/ tree above it, and looks the same as that tree; the note's prose and lists keep their 72ch reading measure; every `div.view-research-note` in the Research view gets the same treatment."
    - "QQHQ-05: Existing lift and graph unit tests, the sketch golden (test/rendering/fixtures/sketch-012-graphs.json) and the class-vocabulary test pass unchanged; a corpus census over all four projects, run before and after, lists every fence whose figure changed, and classification counts (diagram, tree, code) do not change."
    - "QQHQ-06: Nothing is written to any `.planning/` tree (apart from this quick task's own directory) or to the other three projects; the new fixture is a read-only copy of the fence into test/."
    - "QQHQ-07: A real visual check: screenshots of the v1.0 Phase 1 RESEARCH Architecture chapter (lanes figure, Shown as drawn, directory structure) are taken and looked at, and described in plain words in the SUMMARY; only the named Playwright specs are run."
  artifacts:
    - path: "test/rendering/fixtures/lb-v1-01-read-layer-diagram.txt"
      provides: "the read-layer system diagram fence, verbatim, no trailing newline"
      contains: "<project>/.planning/  (disk)"
    - path: "src/rendering/ascii-lift.ts"
      provides: "ragged right-border recovery for closed boxes, after the detection loop and before the blanking pass"
      contains: "export function liftDiagram"
    - path: "src/rendering/ascii-graph.ts"
      provides: "terminal labels promoted to node cards before the edge pass"
      contains: "export function buildDiagramGraph"
    - path: "test/e2e/research-briefing.spec.ts"
      provides: "the LB v1.0/01 architecture figures browser test, with screenshots"
      contains: "01-read-layer-domain-model/01-RESEARCH.md"
    - path: "src/web/styles/globals.css"
      provides: "figures inside research notes span the chapter; the lifted text block is never its own scroller"
      contains: ".view-research-note"
  key_links:
    - from: "src/rendering/ascii-lift.ts ragged recovery"
      to: "src/rendering/ascii-lift.ts border blanking pass"
      via: "the recovered column is written into the box geometry's per-row right border list, so the existing blanking pass clears it and insideBox uses the widened c2"
      pattern: "geo\\.right|right\\["
    - from: "src/rendering/ascii-graph.ts terminal-label pass"
      to: "src/rendering/ascii-graph.ts edge pass"
      via: "promoted labels are painted into the cell-to-card grid and added to usedNotes before comps.forEach builds edges"
      pattern: "usedNotes"
    - from: "src/web/components/lane-diagram.tsx LaneDiagramFigure"
      to: "src/rendering/ascii-graph.ts buildDiagramGraph"
      via: "graph.thin false makes the lanes figure the default and Shown as drawn the toggle"
      pattern: "graph\\.thin"
    - from: "src/web/views/research-briefing-components.tsx ArchitectureChapter"
      to: "src/web/styles/globals.css"
      via: "structure.notes render inside div.view-research-note; the stylesheet lets a figure frame there span the chapter"
      pattern: "view-research-note"
---

<objective>
Fix the three figure defects the user found on phase Research pages, all visible in the Architecture chapter of labelore's own v1.0 Phase 1 RESEARCH page (.planning/milestones/v1.0-phases/01-read-layer-domain-model/01-RESEARCH.md, read-only):

1. The "Shown as drawn" view of the system diagram is broken: the CLI box's author-drawn right border drifts past the lift's walk, so its title spills out of the card, stray vertical bars float beside it, and a vertical scrollbar shows inside the figure body.
2. The same diagram never redraws as the lanes figure, because the chain's unboxed start label (`<project>/.planning/  (disk)`) and end labels (`stdout JSON`, `Vitest golden-file suite`) are not nodes, leaving three nodes (under the four-node minimum). The user decided (locked): count those labels as nodes.
3. The fixtures/test tree under "Directory structure" is squeezed to half the chapter because it renders inside the note column capped at 72ch.

Purpose: the dashboard's promise is that a planning artifact reads without opening the file; a broken figure is worse than plain text.
Output: lift and graph fixes in the shared rendering modules (so every document type benefits), two CSS fixes, a fixture copied from the fence, unit tests that pin each defect, a browser test with screenshots, and a before/after corpus census.

Source coverage: the three defects (the goal), the locked decision (unboxed start/end labels are nodes) and every user rule (fix in code only, never write to any .planning tree, run only the touched pages' Playwright specs, a real screenshot check, plain-language report, new class names go in docs/design-language.md) are each owned by a task below. There is no research or CONTEXT file for this quick task.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md
@docs/design-language.md
@.planning/quick/261024-o3h-make-the-lifted-diagram-and-clean-tree-r/261024-o3h-SUMMARY.md
@src/rendering/ascii-lift.ts
@src/rendering/ascii-graph.ts
@src/web/components/lane-diagram.tsx
@src/web/components/lifted-diagram.tsx
@src/web/components/figure-frame.tsx

Facts measured at planning time (HEAD a69d05c), so the executor does not re-derive them:

- The system diagram fence is lines 203–237 of the RESEARCH file (the fence markers are lines 202 and 238). The fixtures/test tree fence is lines 273–285; the composer puts it in `structure.notes` as a code block, followed by a list.
- Current lift of the diagram: three box cards, Layer A (source rows 3–8, c2 64), Layer B (rows 11–22, c2 65) and CLI (rows 24–29, c2 63, widened only by the 2-column overrun rule). The CLI interior rows 25–28 are the only rows in the figure whose right border the drift walk misses (borders at 71, 64, 64, 64 against a top corner at 60). Among the eleven graph fixtures in test/rendering/fixtures, the only other such row is one row of the sp-p03 account-admin box (border at 46), which is not in the golden.
- Current graph: 3 nodes, 2 edges, quality 0.77, dangling 1 (the stray bars), thin. The top wire's open tail reaches the note `<project>/.planning/` and goes down the annotation branch (the label and `(disk)` end up as notes on Layer A). The bottom wire (the CLI's `▼` landing on `◄────────────────►`) has the CLI as its only card and both arrowheads reach notes (`stdout JSON` with `(manual/smoke use)`, and `Vitest golden-file suite` with three wrapped lines), so no edge is made and both blocks are lost as unused labels.
- Across the eleven graph fixtures, no wire has an arrowhead reaching a note while its drawn source is a card, and no vertical wire has a note at its tail with no card source, so the two promotion rules below change none of them. Every horizontal `◄──` pointer annotation in them (sp-p02, sp-p03) keeps its current meaning.
- The browser cause candidate for the scrollbar: the global rule `pre { max-width: 100%; overflow-x: auto; }` (globals.css ~2178) also applies to `<pre class="lifted-diagram-text">` and `<pre class="figure-frame-plain">`; overflow-x auto forces overflow-y auto, so any sub-pixel overflow of the fixed-height rows becomes a thin vertical scrollbar inside the figure. This is a hypothesis to confirm by measurement, not a given.
- `.view-research-note` (globals.css ~10188) is `display: grid; gap; max-width: 72ch; color: var(--muted-foreground); font-size: var(--fs-3)`; `p.view-research-note` overrides display. The `div.view-research-note` containers that render ResearchBlocks (which can hold fences) are in research-briefing-components.tsx at the structure notes (~350), and around lines 751, 789, 936, 1000, 1005 and 1226. `.view-research-sub` is a grid, so an uncapped child stretches to the chapter width.
- Baseline at HEAD: test/rendering/ascii-lift.test.ts, ascii-graph.test.ts, figure-detect.test.ts, lane-layout.test.ts, test/web/research-view-contract.test.ts and lane-diagram.test.ts pass (114 tests). The o3h SUMMARY records 6 full-suite failures that predate it (5 tied to a moved sketches todo, 1 stylesheet token check); re-measure them in Step 0.
- `view-research-*` names are a view-local namespace the class-vocabulary test auto-allows; any other new class name needs a row in docs/design-language.md.
- Corpora for the census (read-only): this checkout, /home/noah/Work/Cinedise/studio-portal, /home/noah/Work/Sideby/plan.sideby.me, /home/noah/Work/Ibis/resoundant (each has a `.planning/`).

User preferences that bind this work:
- Never edit planning content to change what a page shows; fix rendering in code. Never write to any `.planning/` tree or to the other three projects.
- Run only the named Playwright spec files, never `npm run test:e2e` with no file. Never touch the running Labelore service on port 4173 or the sketch server on 4174; Playwright starts its own server on 4199.
- Report in plain words (no internal codes or bare test names) in the SUMMARY. No icon list markers.
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Ragged boxes close around their longest line, pinned from the copied fence to the real page</name>
  <files>test/rendering/fixtures/lb-v1-01-read-layer-diagram.txt, src/rendering/ascii-lift.ts, test/rendering/ascii-lift.test.ts, test/e2e/research-briefing.spec.ts</files>
  <read_first>
    - src/rendering/ascii-lift.ts — the closed-box detection loop (~253–350: the left walk, the right walk with `drift`, the bottom-corner tolerance), the open-left pass (~383–435), the border blanking pass (~448–475) and the 2-column overrun widening (~513–527)
    - test/rendering/ascii-lift.test.ts — "minimal shapes" (~30–150, including the one-row pin "an overrun of 3 or more columns does not widen") and "drifting and open-left boxes" (~294–420)
    - test/e2e/research-briefing.spec.ts — `resolveFixtureUrl` and the "LB v1.0/02 briefing" test (the idiom to copy)
    - test/e2e/pages.ts — `SCREENSHOT_ROOT`
  </read_first>
  <behavior>
    - The fixture's CLI box (source rows 24–29) lifts as one box card with `c2 >= 71` and `widened: true`; its title row's node segment is the whole title ending in "<path>`"; its interior rows 25–28 hold no `line` segment.
    - Layer A and Layer B keep their current cards (c2 64 and 65); the figure still has exactly three box cards.
    - A synthetic box with two or more interior rows whose rows put their right bar 4 and 9 columns past the top-right corner widens to the farthest border plus one (the walk's own convention) and leaves no `line` segment on its interior rows.
    - Guard: a row that lost its own border never takes the left border of a box beside it — both boxes lift, the left box is not widened, and the right box's rows show no `line` segment.
    - Bound: a bar further right than the reach is not taken (the box is not widened by it).
    - The existing one-row test "an overrun of 3 or more columns does not widen" passes unchanged.
  </behavior>
  <action>
Step 0, baselines before any code change (record every result for the SUMMARY):
(a) Corpus census baseline (QQHQ-05, read-only). Write a throwaway Node script in your session scratchpad (outside the repo, never committed) that imports src/rendering/figure-detect.ts, src/rendering/ascii-lift.ts and src/rendering/ascii-graph.ts from this checkout by absolute path, walks each corpus's `.planning/**/*.md` (the four listed in context) with read-only fs calls only, extracts every fence with its info string and start line, and for each fence records: the classifyFence result; and for each diagram, the box cards (r1, c1, r2, c2, widened), the number of `line` segments that sit inside a box card's interior rows and columns (stray bars), and from buildDiagramGraph the node count, each node's kind and label main, the edge list and the thin flag. Write the output as JSON into the scratchpad. Re-run it after Task 2 and at the end of Task 3 and diff against this baseline.
(b) Run `npm test` and record which test files fail (expected: the pre-existing failures the o3h SUMMARY names).
(c) Run `npx playwright test test/e2e/research-briefing.spec.ts test/e2e/research-page.spec.ts` and `npx playwright test test/e2e/document-layout.spec.ts -g "rendered figures"` and record pass/skip/fail counts.

Step 1, the fixture: copy the system diagram fence verbatim into test/rendering/fixtures/lb-v1-01-read-layer-diagram.txt with no trailing newline, matching the other fixtures, using a read-only extraction such as `printf '%s' "$(sed -n '203,237p' .planning/milestones/v1.0-phases/01-read-layer-domain-model/01-RESEARCH.md)" > test/rendering/fixtures/lb-v1-01-read-layer-diagram.txt`. Do not modify the RESEARCH file.

Step 2, red: add the behavior cases above to test/rendering/ascii-lift.test.ts in a new describe block for this task (read the fixture with `readFile(new URL('./fixtures/lb-v1-01-read-layer-diagram.txt', import.meta.url), 'utf8')`, as the file already does for other fixtures). Build the synthetic shapes inline. Run the file and confirm the new CLI and synthetic-widening cases fail before the fix.

Step 3, green, in src/rendering/ascii-lift.ts (QQHQ-01): add a ragged right-border recovery pass that runs immediately after the closed-box detection loop, before the open-left pass, so every detected box is known. For each closed box (not open-left) with two or more interior rows, take each interior row whose right border the walk did not find (its entry in the geometry's per-row right list is -1) and scan rightward from the column after the top-right corner up to a named reach constant (16 columns past the top-right corner, clamped to the grid width) for the first side-edge glyph that is not a tree guide. The scan stops without a result at any box, double-line or arrow glyph (only blanks and text may lie between the box and its border), and rejects a candidate that lies inside the column span of another box on that row unless that box encloses this one, or that sits on a border column another box's walk already recorded for that row. Count every scanned cell against the existing probe budget (return null when it is spent). A recovered column is written into the geometry's right list for that row, so the existing blanking pass clears the glyph, and the box's c2 grows to that column plus one, the same convention the drift walk already uses for a border pushed right of the corner, with `widened` set. Leave the drift walk, the bottom-corner tolerance, the open-left walk and the 2-column overrun widening untouched. Update the file header's box-detection list with one line describing the recovery and its bounds. The two-interior-row requirement exists so the sketch port's one-row rule keeps holding; say so in the code comment.

Step 4, the browser pin: add a test "LB v1.0/01 architecture figures" to test/e2e/research-briefing.spec.ts that resolves `01-read-layer-domain-model/01-RESEARCH.md` with `resolveFixtureUrl`, opens it in light theme, waits for `#research-summary`, and scopes to the first `.figure-frame` inside `#research-architecture` (the System architecture figure). At this point the graph is still thin, so the figure shows as drawn by default: assert three `.lifted-diagram-card[data-kind="box"]`, that `.lifted-diagram-row` 25 through 28 contain no `[data-glyph="line"]` span, and that the right edge of the box card under the CLI title is at or beyond the right edge of the `.lifted-diagram-node` span whose text starts with "CLI (src/cli". Run it with `-g "LB v1.0/01"` only.
  </action>
  <verify>
    <automated>npx vitest run test/rendering/ascii-lift.test.ts test/rendering/ascii-graph.test.ts test/rendering/figure-detect.test.ts && npx playwright test test/e2e/research-briefing.spec.ts -g "LB v1.0/01"</automated>
  </verify>
  <acceptance_criteria>
    - `git diff --exit-code -- .planning/milestones` exits 0 (the RESEARCH file is untouched).
    - The new fixture's first line is `<project>/.planning/  (disk)` and its last byte is not a newline (`tail -c1 test/rendering/fixtures/lb-v1-01-read-layer-diagram.txt | xxd -p` prints `29`).
    - Every pre-existing test in test/rendering/ascii-lift.test.ts and test/rendering/ascii-graph.test.ts passes with no edit to its body, including the sketch golden parity cases.
    - The new lift cases pass; the new browser test passes.
  </acceptance_criteria>
  <done>The CLI box lifts as one card wide enough for its title, with no stray bars on its rows, from the copied fence through to the real page; the recovery is bounded, never steals a neighbour's border, and every earlier lift test still passes.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Unboxed start and end labels become nodes, so the read-layer chain redraws as the lanes figure</name>
  <files>src/rendering/ascii-graph.ts, test/rendering/ascii-graph.test.ts, test/e2e/research-briefing.spec.ts</files>
  <read_first>
    - src/rendering/ascii-graph.ts — `readShapes` (notes, quality, dangling), and in `buildDiagramGraph` the cell-to-card grid (~538–560), the components and `besideNotes` (~576–653), the edge pass `comps.forEach` with its tips/ends probe and the `pointerFromNote` branch (~674–763), the SHOUTED-name and leftover-notes passes (~776–838), the KINDS table (~390–398) and the thin rule (~874–879)
    - test/rendering/ascii-graph.test.ts — `FIXTURE_NAMES`, `graphOf`, the golden loop and the thin-rule block
  </read_first>
  <behavior>
    - The fixture graph has 6 nodes and is not thin, dangling 0: a source node whose label `full` is `<project>/.planning/ (disk)` with kind `external`; Layer A; Layer B; CLI; `stdout JSON`; `Vitest golden-file suite`.
    - Edges, all directed and not implied: disk to Layer A labelled `fs.readdirSync(recursive) / fs.readFileSync / fs.statSync`; Layer A to Layer B labelled `RawArtifact { path, content, mtimeMs }`; Layer B to CLI; CLI to stdout JSON; CLI to Vitest golden-file suite. No edge joins the two outputs to each other.
    - Layer A's notes no longer contain the disk label or the readdirSync text. The stdout JSON node's details are `["(manual/smoke use)"]`; the Vitest node's details are the one wrapped phrase `(imports the SAME repository call — D-05 — diffs against committed golden per fixture)`.
    - Guards (synthetic): a horizontal `◄── note` beside a box still becomes a note on that box, not a node; prose beside a diagram that no wire end reaches stays a note; a wire joining two notes with no card on it promotes nothing.
    - Every golden case, and the existing thin-rule cases (three thin, seven drawn), pass unchanged.
  </behavior>
  <action>
Implements the user's locked decision (unboxed start and end labels count as nodes) generally in the graph builder, not as a case for this fence (QQHQ-03).

Step 1, red: add the fixture to `FIXTURE_NAMES` in test/rendering/ascii-graph.test.ts as `'lb-v1-01': 'lb-v1-01-read-layer'` (the golden loop iterates golden keys only, so this adds no golden case) and add a new describe block with the behavior cases above, plus the three synthetic guard shapes built inline. Run and confirm the fixture cases fail.

Step 2, green, in src/rendering/ascii-graph.ts:
(a) Extract the open-end probe the edge pass runs per component (for each cell's open directions, the card or note reached within 3 cells) into one helper that also returns the probe direction, and use it from both the new pass and the existing edge pass, so the two cannot drift.
(b) Add a terminal-label pass after `besideNotes` is built and before the work nodes are made. For each component, from the probe results: rule A, a note an arrowhead reaches (tip, no card) on a component that has at least one card at a non-tip end (its drawn source) is promoted as a target; rule B, a note reached at a non-tip end in direction up or down, on a component that has no card at any non-tip end and at least one card at a tip, is promoted as the source. A note reached only horizontally at a tail keeps today's annotation branch, and a component with no card at either kind of end promotes nothing.
(c) A promoted note becomes a node card (kind `node`) built from its block: its title line is the block's first line, joined (with the author's double space) by any note that starts on that same row within 3 columns after it, which is how `(disk)` joins `<project>/.planning/`; its remaining lines become details, with consecutive lines joined into one detail while a bracket opened on an earlier line is still open. Give it a unique card index, title row and column from the block, paint it into the cell-to-card grid with the same one-column slack node cards get, and add every absorbed note index to `usedNotes` before the edge pass, so it is never a wire label, an annotation, a SHOUTED box name or a leftover note. Count promoted text as card text in `quality`.
(d) The edge pass then needs no new branch: the promoted cards are hit by the probe like any card. The bar the CLI's arrow drops onto (`◄────►` under the `▼`) is a fan-out, exactly like a `┌──┴──┐` bus, so it yields CLI to each output; its two heads are never joined to each other (discretion, recorded here: the user's chain is CLI to both outputs, and a fan-out bus never links its targets).
(e) Kind: the disk source must land in the external lane beside Layer A's filesystem. Extend the `external` pattern in KINDS with a narrow disk token (start with a whole-word `disk`). If the golden or the census shows any other node's kind changing, narrow the token (for example to the parenthesised form) until only new nodes are affected.
(f) Keep the thin rule's conditions as they are; promoted nodes count toward the node cap like any node.
Update the file header with two lines describing the terminal-label rule and its guards.

Step 3, the browser: extend "LB v1.0/01 architecture figures" in test/e2e/research-briefing.spec.ts. The figure now defaults to lanes: assert 6 `.lane-diagram-node` in the System architecture figure, that nodes containing "Layer A", "Layer B", "CLI", "stdout JSON" and "Vitest golden-file suite" are present, and that the node containing ".planning" has `data-kind="external"`. Then click the frame's "Shown as drawn" button and run Task 1's as-drawn assertions there.

Step 4: re-run the census script and diff against the baseline. Every fence whose node count, edge list, kinds or thin flag changed goes in the SUMMARY with before and after. A change that is not clearly better (a prose aside became a node, a drawn diagram became thin, a kind changed on an existing node) means the rule is too loose: tighten it in this module and re-run, never special-case a fence. If a changed fence sits on a page type other than Research (CONTEXT, todo, codebase-map, project research), add that page's existing spec to the Task 3 browser run.
  </action>
  <verify>
    <automated>npx vitest run test/rendering/ascii-graph.test.ts test/rendering/ascii-lift.test.ts test/rendering/lane-layout.test.ts test/web/lane-diagram.test.ts && npx playwright test test/e2e/research-briefing.spec.ts -g "LB v1.0/01"</automated>
  </verify>
  <acceptance_criteria>
    - `git diff --exit-code -- test/rendering/fixtures/sketch-012-graphs.json` exits 0 (the golden is not edited) and every golden case passes.
    - The existing thin-rule tests pass with no edit to their bodies.
    - The new graph cases and the extended browser test pass.
    - The census diff is recorded, with each changed fence explained.
  </acceptance_criteria>
  <done>Unboxed labels at a wire's end are nodes; the read-layer diagram draws as the six-node lanes figure by default, with Shown as drawn one click away; every earlier graph test and the golden hold.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: No inner scrollbar in a figure, figures in research notes span the chapter; screenshots, census and full checks</name>
  <files>src/web/styles/globals.css, test/web/research-view-contract.test.ts, test/e2e/research-briefing.spec.ts, docs/design-language.md</files>
  <read_first>
    - src/web/styles/globals.css — the global `pre` overflow rule (~2178–2187), `.figure-frame-body` and `.figure-frame-plain` (~10375–10407), `.lifted-diagram*` (~10429–10512), `.view-research-note` (~10188–10199), `.view-research-sub` (~10968)
    - src/web/views/research-briefing-components.tsx — `ArchitectureChapter` (~325–360) and the other `div.view-research-note` sites listed in context
    - test/web/research-view-contract.test.ts — the figure-frame rule test (~70–85) and its `rule()` helper
  </read_first>
  <behavior>
    - On the v1.0 Phase 1 RESEARCH page, in both the lanes view and the Shown as drawn view, no element in any `#research-architecture .figure-frame-body` subtree (the body included) whose computed overflow-y is auto or scroll has `scrollHeight` more than 1px over its `clientHeight`.
    - The figure frame inside the directory-structure note is within 1px of the width of the src/ tree's figure frame above it, and wider than the note's list.
    - The two trees' first `.clean-tree-name` have the same computed font-size and color.
    - A `div.view-research-note` that holds no figure keeps a capped computed max-width (not `none`).
  </behavior>
  <action>
Step 1, red (QQHQ-02, QQHQ-04): extend "LB v1.0/01 architecture figures" with the behavior checks above (the scroller check runs once in lanes and once after Shown as drawn; also check that every `div.view-research-note` on the page without a `.figure-frame` child still has a computed max-width other than `none`, and that the structure note's list is no wider than that cap). Run it with `-g "LB v1.0/01"` and confirm the scroller and width checks fail before any CSS change.

Step 2, the scrollbar: measure in that failing run (or a page.evaluate you add while diagnosing) which element is the vertical scroller and by how much it overflows. If it is the lifted text block or the plain figure block inheriting the global `pre` overflow rule, give `.lifted-diagram-text` and `.figure-frame-plain` `overflow: visible` and `max-width: none`, since the frame body is the figure's only scroller. If it is something else, fix that cause instead and say what it was in the SUMMARY. Do not hide the symptom with `overflow-y: hidden` on the frame body.

Step 3, the note width: change the `.view-research-note` rules so a figure frame inside a `div.view-research-note` spans the chapter while the note's other children keep the 72ch reading measure, and a note without a figure renders exactly as before; scope it with a selector on figure frames inside the note (for example uncapping a note that has a direct `.figure-frame` child and capping its non-figure children), and keep `p.view-research-note`'s own measure. If the figure inherits the note's muted color or small font size and the two trees then differ, reset those on the figure frame inside the note. This one rule covers every `div.view-research-note` site in the Research view, so no component change is needed.

Step 4, pins: in test/web/research-view-contract.test.ts add a case that reads globals.css and asserts the lifted text and plain figure rules set overflow visible, and that a rule exists giving a `.figure-frame` inside `.view-research-note` an uncapped width. Use only existing class names; if you add one that is not `view-research-*`, add its row to docs/design-language.md. Update the `lifted-diagram-text` and `figure-frame-plain` rows in docs/design-language.md to say the block never scrolls on its own (the frame body does).

Step 5, the visual check (QQHQ-07): at the end of the test, save three screenshots with `SCREENSHOT_ROOT` from test/e2e/pages.ts into its `qhq` subfolder (gitignored): the System architecture frame in lanes view, the same frame after Shown as drawn, and the directory-structure block holding both trees. Open each PNG with the Read tool and confirm by eye: the lanes figure shows the six nodes joined as the chain; Shown as drawn shows three clean cards, the CLI title inside its card, no stray bars and no scrollbar; the fixtures/test tree spans the chapter with its descriptions on one line each. Describe what each screenshot shows, in plain words, in the SUMMARY.

Step 6, full checks: run the census once more and diff against the baseline (classification counts must be identical). Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` (warning-free), and the browser specs `npx playwright test test/e2e/research-briefing.spec.ts test/e2e/research-page.spec.ts` plus `npx playwright test test/e2e/document-layout.spec.ts -g "rendered figures"` (plus any page spec Task 2's census step added). Compare against the Step 0 baselines: no failure that was not failing before. Check `git status --porcelain` in this checkout shows changes only under src/, test/, docs/ and this quick task's directory, and that `git status --porcelain` in each of the three other projects is unchanged from before the work. Write the SUMMARY in plain words: what the user now sees on the Phase 1 RESEARCH page, the scrollbar's real cause, every census change, and anything left undone.
  </action>
  <verify>
    <automated>npx vitest run test/web/research-view-contract.test.ts test/web/class-vocabulary.test.ts test/rendering/ascii-lift.test.ts test/rendering/ascii-graph.test.ts && npx playwright test test/e2e/research-briefing.spec.ts test/e2e/research-page.spec.ts && npx playwright test test/e2e/document-layout.spec.ts -g "rendered figures"</automated>
    <human-check>Open labelore's v1.0 Phase 1 RESEARCH page, Architecture chapter: the system diagram draws as the lanes figure (the .planning disk source, Layer A, Layer B, CLI, stdout JSON, Vitest golden-file suite); Shown as drawn shows three clean cards with the CLI title inside its card, no stray bars and no inner scrollbar; the fixtures/test tree under Directory structure is as wide as the src/ tree above it.</human-check>
  </verify>
  <acceptance_criteria>
    - The three screenshots exist under test/e2e/screenshots/qhq/ and are described in the SUMMARY.
    - The class-vocabulary test passes.
    - `npm test` shows no failing test file beyond the Step 0 baseline; typecheck, lint and build are clean.
    - `git status --porcelain -- .planning` lists nothing outside .planning/quick/261024-qhq-fix-the-three-figure-defects-on-phase-re/.
  </acceptance_criteria>
  <done>Figures fit without an inner scrollbar, the tree in the structure notes spans the chapter while prose keeps its measure, the page was checked by eye from screenshots, the census and all checks are recorded, and nothing outside code, tests and docs changed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| planning files to renderer | Author-written ASCII from any target `.planning/` reaches the lift, the graph builder and the browser as untrusted text |
| renderer to target filesystem | The tool must stay incapable of writing to planning state it does not own |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-qhq-01 | Denial of service | ascii-lift.ts ragged right-border recovery | low | mitigate | The scan is capped at a fixed reach per row and runs only on rows the walk missed; every scanned cell counts against the existing probe budget and the lift returns null when it is spent, so the existing cost-bound tests (250 ms grids) still hold |
| T-qhq-02 | Denial of service | ascii-graph.ts terminal-label pass | low | mitigate | It reuses the per-component probe (at most 3 cells per open end) over the already-built connector list; promoted nodes count toward MAX_GRAPH_NODES, so an oversized figure is still thin; the existing cost-bound tests run unchanged |
| T-qhq-03 | Tampering | target `.planning/` trees and the three other projects | high | mitigate | No write path is added; the fixture is copied with a read-only extraction into test/; the census script lives in the scratchpad and uses read-only fs calls; Task 1 and Task 3 acceptance check that `.planning/` and the other projects show no change |
| T-qhq-04 | Information disclosure / injection | promoted node labels and details in the lanes figure | low | mitigate | Promoted labels are author text carried in the existing DiagramLabel and details strings and rendered by lane-diagram.tsx as React text and a React title attribute; this plan adds no new rendering sink and no markup parsing |
| T-qhq-SC | Tampering | npm/pip/cargo installs | low | accept | This plan installs no package; no legitimacy checkpoint is needed |
</threat_model>

<verification>
- Unit: ascii-lift, ascii-graph (golden included), figure-detect, lane-layout, lane-diagram, research-view-contract and class-vocabulary tests pass; every pre-existing case passes with no edit to its body.
- Browser (named specs only): research-briefing.spec.ts (with the new LB v1.0/01 test), research-page.spec.ts, and document-layout.spec.ts "rendered figures" show no failure that was not failing in Step 0.
- Census: before and after diffs recorded; classification counts identical; every changed figure explained.
- Visual: three screenshots looked at and described.
- Full: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` against the Step 0 baseline.
- Read-only: no change under `.planning/` outside this quick task's directory, none in the other three projects.
</verification>

<success_criteria>
- The v1.0 Phase 1 RESEARCH system diagram draws as a six-node lanes figure, with the disk source in the external lane and the chain the user named.
- Its Shown as drawn view shows three clean cards with the CLI title inside its card, no stray bars and no inner scrollbar.
- The fixtures/test tree in the structure notes spans the chapter; prose keeps its measure.
- The lift and graph fixes are general (bounded, guarded) and every earlier test and the golden still pass.
</success_criteria>

<output>
Create `.planning/quick/261024-qhq-fix-the-three-figure-defects-on-phase-re/261024-qhq-SUMMARY.md` when done
</output>

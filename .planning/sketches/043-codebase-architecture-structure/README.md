---
sketch: 043
name: codebase-architecture-structure
question: "Inside 042's winning Rail + column frame, how should the Architecture and Structure panels arrange the system diagram, the component table, the anti-pattern swaps, the directory tree and the 'Where to add new code' lookup?"
winner: "synthesis"
tags: [codebase, architecture, structure, diagram, tree]
---

# Sketch 043: Architecture and Structure panels

## Design Question
Phase 10 D-01, D-14 and D-15, UI-SPEC section 2. Architecture and Structure are the cross-read pair on the
Codebase page. Architecture lifts the System Overview diagram first (the lifted-diagram figure, with the
"Shown as drawn" rule), the Component Responsibilities table, Pattern Overview, Entry Points and
Anti-Patterns as swaps (what happens, why it is wrong, do this instead); everything else stays a plain
section after the lifted part. Structure lifts the Directory Layout as the clean tree titled "Directory
structure" and "Where to add new code" as a lookup list; the rest stays plain. This sketch decides how
those parts are arranged inside the panel. The page frame is not up for choice: it is 042 A, drawn
identically in every variant.

## How to View
open .planning/sketches/043-codebase-architecture-structure/index.html

- Tabs `#a`, `#b`, `#c` pick the variant. Light and Dark switch theme (`?theme=dark` works too).
- The State bar (`?state=arch|plain|tidemark|tree|deep`) switches five states:
  - **Architecture**: Labelore's own Architecture (about 290 lines in the source: a 76-column diagram, 24
    components, six plain sections below the lifted part).
  - **Diagram not lifted**: the same panel with a System Overview the lift rejects (no closed boxes), shown
    as plain text in the same figure frame, no cards behind it and no "Shown as drawn" line.
  - **Tidemark headings**: the made-up Tidemark Architecture fixture, whose headings differ (an added "API
    Architecture" section that stays plain below the lifted part, five components, two anti-patterns, a
    diagram holding a line that starts with two hashes inside the fence). The rail shows its own counts;
    entries without a number there are not drawn in this sketch.
  - **Structure**: Labelore's own Structure (the real 37-line tree with trailing comments, ten Where-to-add
    entries, eleven Directory Purposes).
  - **Deep tree**: an invented tree in Labelore's own words, seven levels down in places, to show how a
    deep tree and the shipped folder-chain collapse (`test/fixtures/dashboard/` and `ledger/.planning/`
    become one row each) read.
- Click Architecture or Structure in the rail to change panel; the other rail entries are 044 to 046 and
  show "Sketch only". Expand, Actual size, Grid, View and Source are drawn, not wired.
- A 390px-wide window shows the phone layout; none of the three scrolls sideways at 390px in either theme
  (the diagram and the tree scroll inside their own frame).

## Shared across all three
- The 042 A frame: sticky left rail (facts line, seven entries), the panel head (number, name, key number),
  the lifted part, then the plain sections in document order. Normal project, so no "Mapped, not started"
  head.
- **System overview** is the shipped figure frame: title bar with Actual size, Grid and Expand chips, the
  author's text with cards behind it (the lifted diagram). The quiet "Shown as drawn" chip and "This figure
  keeps the author's layout." sit over it. The lane diagram is not drawn: its graph test (at least four
  nodes, enough wires) is a build-time judgement, so the sketch shows the fallback that every diagram can
  always show.
- **Anti-patterns** are swaps: the mistake struck through, an arrow, what to do instead; the row opens to
  "What happens" and "Why it's wrong" (the 032 A treatment, no warning colours).
- **Directory structure** is the shipped clean tree: folder and file icons, indent guides, folder chains
  collapsed to one row, folders fold, the trailing `# comment` in a second column, a "folders · files" count
  in the frame bar.
- **Where to add new code** keeps the document's own labels ("New page", "New view (composed UI section)")
  and every bullet under each, so nothing is cut.
- Tokens only. No destructive, warning or missing tone anywhere: nothing on these panels is a failed read.
  Accent is spent on the panel number, the active rail entry, the tree's folder icons, and in B and C the
  active tab's top rule, the lit card and the selected row (the figure accent uses of UI-SPEC Color).
- Four font sizes in every variant at 1280 and 390 (display `--fs-display-3` on the `h1` only, heading
  `--fs-7`, body `--fs-4`, label `--fs-2`), measured in headless Chrome. No typography exception is needed.
- Text is Labelore's own public map. The Integrations line the 10-03 summary flags is not used here and no
  other repository's map is drawn from.

## Variants
- **A: Diagram first.** One reading column in document order. System overview at full width, then
  Component responsibilities (six rows, "Show all 24" opens the rest in place), Pattern overview (the
  overall sentence large, the characteristics under it), Entry points, Anti-patterns, then the plain
  sections. Structure: the tree full width, Where to add new code, Directory purposes, then plain. Longest
  panel (Architecture is about 8000px tall at 1280), shortest path to any one thing by scrolling.
- **B: Lens switch.** A row of four tabs under the panel head, one part at a time. Architecture: Overview
  (diagram, pattern, entry points), Components (all 24 with a chip filter by area: `src/server`, `src/web`
  and so on, taken from the file path), Anti-patterns, Other sections (the plain ones). Structure: Directory
  structure, Where to add new code, Directory purposes, Other sections. Each tab carries its count. The
  panel is one screen or two; nothing is seen unless it is opened.
- **C: Map + legend.** Two panes under the panel head. Architecture: the diagram on the left (it sticks while
  the legend scrolls), the 24 components as a numbered legend on the right; choosing a component lights its
  box in the diagram, opens its responsibility in the legend row and shows any anti-pattern that names its
  file. Pattern, entry points, anti-patterns and the plain sections follow full width. Structure: the tree
  on the left, "Where to add new code" on the right as buttons that light the folders they name in the tree,
  plus a "Selected folder" card (its Directory Purposes entry) when a folder is clicked. Directory purposes
  and the plain sections follow full width.

## Layout contract
Measured in headless Chrome from the file; widths are CSS pixels of the box, content column 838px at 1280.

**A: Diagram first**
- 1280px: the rail is 288px at x=51 and the column 838px at x=390; the diagram frame is the full 838px,
  753px tall, its 76-column text about 510px wide inside it (the frame body scrolls only if the text is wider).
- 1280px: component rows are three columns (name 11rem, responsibility, file 13rem); six rows by default,
  24 after "Show all 24"; the Architecture panel is about 7950px tall with all plain sections.
- 1280px: the Directory structure frame is 838px wide and 917px tall (37 rows at 24px, notes in a second
  column); Where to add new code has the label at 13rem and every bullet beside it.
- 390px: one 358px column under the rail; component rows stack name, responsibility, file; the diagram frame
  is 358px wide and its body scrolls sideways inside the frame, not the page.

**B: Lens switch**
- 1280px: the tab row is 838px wide and 37px tall (four tabs on one line); the Architecture panel on the
  Overview tab is about 2050px tall, Components and Anti-patterns tabs are shorter.
- 1280px: the Components tab holds all 24 rows and a chip row (All plus eight areas); the chip row wraps.
- 1280px: the Directory structure tab is the tree frame alone, 838px wide.
- 390px: the tabs wrap to two lines (78px tall); the active tab keeps its accent top rule.

**C: Map + legend**
- 1280px: the figure pane is 546px wide at x=390 and the legend 272px at x=957, gap 21px; the 76-column diagram
  (510px plus 32px of frame padding) just fits the 544px frame body, so it does not scroll at this width.
- 1280px: legend rows are 58px tall (name over file), a row with two files 75px, the open row grows by its
  responsibility text; the 24-row legend is about 1620px tall, so the diagram frame (753px, sticky) stays in
  view while the legend scrolls.
- 1280px: in Structure the tree pane is 546px (notes scroll inside the frame) and the lookup column 272px with
  ten buttons of 120 to 142px; the Selected folder card sits above the lookup when a folder is clicked.
- 390px: under 75rem the panes stack: diagram frame first (358px wide), then the legend as 358px rows.

## Font sizes
Measured in light theme, text of the page only. Same four in all variants; at 390 the display size falls to
44.8px and the other three are unchanged.

| Role | Token | Size at 1280 | Renders |
|------|-------|--------------|---------|
| Display | `--fs-display-3` | 76.8px | the `h1` only |
| Heading | `--fs-7` | 20.8px | panel `h2`, the Pattern overview sentence |
| Body | `--fs-4` | 13.12px | names, prose, rows, tree names |
| Label | `--fs-2` | 11.2px | group labels, chips, tab counts, diagram text, tree notes, files |

## What to Look For
- Architecture is the longest panel in the product. Does A's single column earn its length, or is B's one-part-
  at-a-time (nothing hidden, but one click each) the better way to meet 24 components and six plain sections?
- Is C's link between a component, its box in the diagram and its anti-pattern worth a second pane, given the
  diagram is no longer full width (546px)?
- For Structure: tree first and the lookup below (A), the lookup on its own tab (B), or the lookup as a way to
  light the tree (C)?
- When the diagram is not lifted (second state) the plain frame must still read as a figure, not an error:
  does it?
- The Tidemark state: does the heading variant look like a panel with one extra section, not a broken one?

## Open points for the build
- The lane diagram (shipped for the Research panel) is not drawn here. Whether Labelore's own diagram earns
  lanes is the graph test's call at build time; the "Shown as drawn" fallback shown here is always available.
- C's component-to-box link is by the file path in the component row (the Labelore diagram names the files it
  boxes); a document whose diagram names no files lights nothing. B's area chips are read from the same file
  column. Neither is invented text.
- The "folders · files" count in the tree's frame bar is the shipped clean tree's; "Selected folder" and the
  rail's "–" for entries not drawn are sketch words.

All content is Labelore's own public map, the made-up Tidemark fixture, or invented here in Labelore's own
words. The repository is public.

## Round 2: D, E, F (visual-first)
Round 1 (A, B, C above, kept as the tabs "Round 1 A/B/C") was rejected by the user: "no creativity in them, plain
boring wall of texts". Round 2 replaces the panel interiors with three pictures. The frame is still 042 A. In each
variant **the first screen of the panel is a picture of the codebase**; prose is reached on demand (a click on a box,
a step, a folder, a signpost, or one of the closed accordion bars under the picture, which hold every section of the
document so nothing is lost). Colours are tokens only: the opacity steps `--fill-1..4` (foreground at 4, 8, 13 and 19
percent), a hatch of `--border`, and the existing accent and `in-flight` tones. No new hue, no destructive, warning or
missing tone.

How to view: the tabs `#d`, `#e`, `#f` (the sketch now opens on D); the same State bar. Each picture is HTML at real
size with an SVG overlay for lines only, so text stays on the four font sizes. Click boxes, steps, cells, pins and
signposts; "Shown as drawn" in D swaps the picture for the round 1 text figure.

- **D: Boxes and arrows + treemap.** Architecture is a drawn graph: the System Overview diagram redrawn as boxes and
  arrows at the author's proportions, arrow labels kept. "Trace" chips pick one of the document's data flows and
  numbered markers light up on the boxes the steps pass through, with the connecting arrows in accent; clicking a box
  dims the rest, lights its arrows and opens its components and the anti-patterns that name it. Structure is a
  treemap of the directory tree (area = entries the tree lists), with the ten "Where to add new code" entries as
  numbered signposts planted on the folders they name.
- **E: Territory bands.** One picture answers "how is it built" and "where does it live": the Layers section as
  horizontal bands (the first layer listed is the bottom band), each holding the components that live in it as chips
  and, on the Structure panel, the folders under it as tiles; "uses" chips on a band name the layers it depends on;
  folders and components outside every layer sit in a dashed "outside" band. Signposts as in D.
- **F: Metro lines + sunburst.** Architecture is the document's data flows drawn as metro lines (one line style per
  flow: solid, dashed, dotted, double), each step a station labelled with the component it passes through; a station
  outlined twice is a component on more than one line. Structure is a sunburst of the tree (rings are folder depth,
  angle is entries listed) with the same signposts.

### Where each mark comes from (every one is computed from a field the map documents contain)
| Mark | Source in the map |
|------|-------------------|
| D box, its title, its one-line sub, box proportions | rectangles of the System Overview fenced diagram (shared walls split into several boxes); first line, its parenthetical or first backticked path |
| D arrow, its label | a `▼` or `▶` connector between two boxes, the text beside it |
| D step marker, trace chip | numbered lists under each `###` of Data Flow; the box is the one whose text holds a path named in the step |
| D box dock: components, flag count | Component Responsibilities rows whose File paths match the box; Anti-Patterns that name a path in the box |
| D graph when the diagram is not liftable | Layers: Location (box), Depends on (arrows) |
| D, F treemap cell and sunburst slice | Directory Layout tree (indent, trailing `# note`); area or angle = entries listed; hatched or grey = the files at that level |
| D, E, F signpost | backticked paths in each Where to Add New Code entry, planted on the deepest folder that holds them |
| Folder dock: purpose | Directory Purposes entry for that folder |
| E band, its folder, "uses" chips | Layers: name, Location, and the paths or "all layers below" in Depends on |
| E component chip | Component Responsibilities row whose File path is under the layer's Location |
| E folder tile | a Directory Layout folder placed by the longest Location prefix; tile width = entries listed |
| E bands in Tidemark (no Layers section) | the rows of its System Overview diagram |
| F line, station | each numbered Data Flow list; the Component Responsibilities row whose File matches a path in the step (else the first path in the step) |

### Mobile form at 390px (no sideways page scroll in any state, theme or variant)
D architecture and F architecture are pictures that pan inside their own frame (the graph is 667px wide, the metro
680px, the frame body 356px). Everything else reflows: D's treemap is re-laid out to 324 by 520px, E's bands stack the
label over the chips (324 wide, about 1400px tall), F's sunburst scales to 324px square.

### Layout contract, round 2
**D: Boxes and arrows + treemap**
- 1280px: the frame is 838px wide and 854px tall; the graph is 667 by 598px, centred, seven boxes in six tiers
  (the two boxes of the third tier sit side by side with an arrow between them).
- 1280px: the Structure treemap is 804 by 498px (height is 0.62 of width); cells under 40px wide carry no name.
- 390px: the graph keeps 667px and pans inside the 356px frame body; the treemap is 324 by 520px.
- 390px: after a click the dock (components in the box, anti-patterns) is the next block under the frame.
**E: Territory bands**
- 1280px: seven bands plus a dashed one, 804px wide, 830px tall (Architecture) and 800px (Structure); band labels are
  12rem wide, chips and tiles wrap in the rest.
- 390px: each band is one column of 324px: label and "uses" chips over the chips; the picture is about 1400px tall.
**F: Metro lines + sunburst**
- 1280px: four lines of up to 6 stations, 112px apart, 680px wide, 467px tall in an 838px frame.
- 1280px: the sunburst is 576px square at x=522, three rings, ten signposts; labels only on slices with 50px of arc.
- 390px: the metro keeps 680px and pans in the frame; the sunburst scales to 324px square, signposts stay 18px.

### Font sizes, round 2
Measured at 1280 and 390, light theme, text of the page only: the same four (`--fs-display-3` on the `h1`, `--fs-7`
heading, `--fs-4` body, `--fs-2` label) in D, E and F. No exception needed.

### What to look for, round 2
- Is the redrawn diagram (D) a picture you would rather read than the author's text diagram? Does tracing a data flow
  across it say what the Data Flow prose says?
- Does E's one-picture-two-answers (layers holding components and folders) earn the bands, or is it a table in colour?
- Is F's metro a better picture of "what happens, in order" than D's trace, and is the sunburst readable against
  D's treemap for a tree this size?
- For Structure only: treemap (D), territory tiles (E) or sunburst (F)?

## Winner
**Reuse, no new variant** (recorded as `synthesis` in the frontmatter so the plan's acceptance grep reads it; the
decision is "reuse the shipped figures"). User, at the 10-09 checkpoint, after round 1 (A, B, C) was rejected as "plain
boring wall of texts" and round 2 (D, E, F) was shown: "for 43, keep our original architecture diagrams that we have
planned before, we already have a component for that." Round 1 and round 2 stay in this folder as the record; none of
them is built.

The Architecture and Structure panels are built from the components already shipped for the RESEARCH page, inside 042 A's
frame (Rail + column):

| Part of the panel | Shipped component to build against | Sketch it came from |
|-------------------|------------------------------------|---------------------|
| System Overview diagram | `LaneDiagramFigure({ text, title, caption })` in `src/web/components/lane-diagram.tsx` (lanes by kind, with its own "Shown as drawn" chip and fallback `AsDrawn`, which shows `LiftedDiagram` from `src/web/components/lifted-diagram.tsx`); framed by `FigureFrame` in `src/web/components/figure-frame.tsx`. `FencedFigure({ text, title, caption })` / `FigureFor` in `src/web/components/fenced-figure.tsx` choose diagram or tree from the fence text (`classifyFence` in `src/rendering/figure-detect.ts`) and fall back to `PlainDiagram` for a figure the lift rejects | 012 B (lane diagram), 009 B (lifted figure) |
| Directory Layout tree, titled "Directory structure" | `CleanTreeFigure({ text, title, caption })` / `CleanTree` in `src/web/components/clean-tree.tsx` (model: `parseTree`, `collapseFolderChains`, `treeCounts` in `src/rendering/ascii-tree.ts`) | 009 B (clean list tree) |
| Anti-Patterns as swaps | `SwapRows({ items })` in `src/web/pages/research-atoms.tsx`; items are `SwapItem { bad, good, details: [{label, text}] }` from `src/presentation/project-research-panels.ts` | 032 A (swaps) |

Parts with **no shipped component** (component table, Entry Points, Pattern Overview, "Where to add new code", Directory
Purposes, and the plain sections): they render as the 042 frame's plain or keyed sections (the generic document form
and the lifted rows UI-SPEC section 2 names) unless 10-12's plan says otherwise. Nothing from round 1 or round 2 is a
design for them.

Checked against the repository at this commit: the components and exports above exist. `classifyFence('text', ...)` on
Labelore's own System Overview returns `diagram`, `liftDiagram` lifts it to 7 nodes and `buildDiagramGraph` reports it
not thin (quality 0.79); on the Tidemark fixture it lifts to 3 nodes, not thin (quality 0.77); Labelore's Directory
Layout classifies as `tree`. Whether the lane diagram puts each Labelore box in a sensible lane is not checked here:
its lane kinds come from keyword lists written for RESEARCH diagrams (open item for 10-12, see the SUMMARY).

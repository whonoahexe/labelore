---
sketch: 045
name: codebase-stack-integrations
question: "Inside 042 A's Rail + column frame, how should the Stack and Integrations panels (a cross-read pair) show the languages, runtime, frameworks and dependencies with their versions, and the outside services, storage, auth, monitoring, CI/CD and webhooks, with variable names and never their values?"
winner: null
tags: [codebase, stack, integrations, env-vars]
---

# Sketch 045: Stack and Integrations panels

## Design Question
Phase 10 D-01, D-14 and D-15, UI-SPEC section 2 (Stack and Integrations rows, the Safety rule). Stack lifts
languages (primary, secondary), runtime and frameworks (core, testing, build/dev) as untoned chips with the
version in mono, then Key Dependencies, Configuration and Platform Requirements. Integrations lifts the external
services, data storage, authentication, monitoring, CI/CD and webhooks as grouped rows, and the environment
variable **names only**: a value the document writes beside a name is shown as the quiet "Value not shown" mark.
The two panels are cross-read (D-01), so they are drawn together here, and a name found in both panels links
across. The frame is 042 A and is drawn identically in every variant; only the panel interiors vary.

Round 1 of 043 and 044 was rejected as "plain boring wall of texts", so every variant here opens on a **picture of
the data**; prose is read on demand (select a mark, read its line in the dock under the picture), and every section
of the document stays reachable as a closed bar under the dock, so nothing is lost. The three variants differ in
the kind of picture, not in layout.

## How to View
open .planning/sketches/045-codebase-stack-integrations/index.html

- Tabs `#a`, `#b`, `#c` pick the variant. Light and Dark switch theme (`?theme=dark` works too).
- The panel list in the rail switches between **01 Stack** and **06 Integrations** (or the sketch bar's Panel
  buttons, or `?panel=integrations`); the other five entries are drawn in their own sketches.
- The State bar (`?state=labelore|tidemark|deps30`):
  - **Labelore**: its own STACK (22 languages and frameworks, 20 key dependencies) and INTEGRATIONS (eight
    sections including the extra File Watching; most groups say None).
  - **Tidemark**: the made-up fixture: STACK with the combined **Languages & Runtimes** heading (its Runtime and
    Package Manager labels feed the runtime layer), INTEGRATIONS with four sections and three known sections absent,
    and the planted variable `TIDEMARK_TIDE_FEED_KEY` drawn as the name plus "Value not shown".
  - **30 dependencies**: Labelore's STACK with ten of its own devDependencies (real versions from `package.json`)
    added to Key Dependencies as one more labelled group, so the dependency layer holds 30.
- Select any chip, tile, group, node or variable: its line from the document opens in the dock under the picture,
  with "Also in Integrations" / "Also in Stack" links where the same name is in the other panel (for example
  `better-sqlite3` in Tidemark, `shiki` and `minisearch` against Labelore's Caching group). Close or Escape clears it.

## Reuse check (shipped components that already show this kind of data)
| Shipped | Where | Used here |
|---------|-------|-----------|
| Stack chip groups (`ChipGroup`, `ChipSet` in `src/web/views/codebase-components.tsx`, 10-08) | the Codebase page's Stack lift today | **C** Stack, as drawn today; Key Dependencies use the same chip set |
| Lane diagram (`LaneDiagram({ graph })` in `src/web/components/lane-diagram.tsx`, 012 B) | RESEARCH architecture | **C** Integrations: it takes a `DiagramGraph`, so a graph built from the Integrations groups can be handed to it |
| Copy-command row, clean tree | 10-10, 009 B | not used: nothing in these two documents is a command or a tree |
| Research Stack panel (034 A, layer chips and package rows) | RESEARCH stack | not used: it opens on a verdict and rows of text, the shape round 1 was rejected for |

## Variants
- **A: Tower + hub.** Stack is a building: the layers stack from the platform up (Runtime, Languages, core
  Frameworks, Key dependencies, then a hatched "Not present" slab read from the document's own "Not present" line),
  each layer's width grows with its count (square root), so Labelore's wide dependency top on a narrow runtime base
  is the picture. Testing and build tools stand beside it as a dashed scaffold, with the environment names read by
  the code; the platform requirements are the ground, development and production. Integrations is a hub: the app in
  the middle holding its Environment Configuration names, every other section a card around it, one spoke each;
  a group in use has a filled square, a group whose first line says None a dashed one, a section with nothing in
  use is hatched and reached by a dashed spoke, and a known section the document lacks is a dashed "Not in this
  document" card. Selecting a group or a variable lights its spoke.
- **B: Element board + floor plan.** Stack is a board of element tiles, one per language, runtime piece, framework
  and dependency, grouped in blocks by the document's labels: the major version large in mono, the name, the full
  version small; shade by family (languages darkest, then runtime, core frameworks, tooling; dependencies plain,
  types-only dashed), "no version" tiles show a dash, and the "Not present" items are hatched zero tiles. The
  environment names and the platform pegs sit under the board. Integrations is a floor plan: one room per section,
  sharing walls, a room's width by its group count, furniture tiles for the groups (in use shaded with its first
  line, None dashed), a room with nothing in use hatched, empty floor hatched between rooms; the Environment room
  holds the names as plugs under Required, Conditionally required and Optional.
- **C: Reuse: shipped chips + lanes.** Stack is the chip groups the Codebase page already draws (10-08): Languages
  (Primary, Secondary), Runtime, Frameworks (Core, Testing, Build / dev) and, with the same chip set, Key
  Dependencies with the "Not present" ghosts. Integrations is the shipped lane diagram (012 B) fed a graph built
  from the groups: the app in the Service lane, every group in use a node in the lane its section maps to (Edge for
  Authentication, Worker for CI/CD, Channel for Monitoring and Webhooks, Data for Data Storage, External for APIs),
  a wire to each, labelled with the group's Client line; the groups that say None are quiet chips under the lanes,
  and the variable names are a strip below.

## Where each mark comes from (every one is computed from the documents)
| Mark | Source in the map |
|------|-------------------|
| Stack chip / tile: name and version | 10-05's chip rule on a bullet: the text left of the first spaced dash; the version is the first digit-led token after the first word, outside parentheses. Two sketch additions: a version may start with a comparator (`>=22.18.0`), and a Key Dependencies bullet is split at its top-level commas (one bullet holds several packages) |
| Which layer, block or chip set | the section heading (Languages / Languages & Runtimes, Runtime, Frameworks, Key Dependencies) and the bold label under it (Primary, Secondary, Runtime, Package Manager, Core, Testing, Build/Dev, each Key Dependencies label) |
| "+N notes" | a bullet whose chip name would be over 32 characters (a sentence, not a package): kept as a note, opened in the dock |
| "Not present" slab / zero tiles / ghosts | the Key Dependencies `**Not present:**` line, split at its commas and "or" |
| Primary chip shade | the Primary label |
| A layer width, B major-version numeral | the layer's chip count (square root of its share of the largest); the first number of the version |
| Platform ground / pegs, dashed peg | Platform Requirements bullets under Development and Production, cut at the first parenthesis; a bullet starting "Optional:" is dashed |
| Environment names in Stack | backticked UPPER_SNAKE names in Configuration's "Environment variables" bullets |
| Integrations card / room / lane node | one known section (seven, matched by heading) or an extra section; one group per bold label under it |
| In use vs None (filled vs dashed square, shaded vs dashed tile, node vs quiet chip) | the group's first line starts with None, Not detected, Not applicable, Not implemented, Not hosted or No |
| "Not in this document" | a known section the document lacks |
| Variable names, Required / Conditionally required / Optional | backticked UPPER_SNAKE names in Environment Configuration bullets, under labels containing "Required" or "Optional"; "Conditional" in the bullet |
| A variable tag on a group | the same name backticked anywhere in that group |
| "Value not shown" | the document writes `NAME=value` (or a value in prose) beside the name. The value is removed before the text reaches this file; the page can only show the name |
| C lane, wire label | section to lane kind as listed above; the group's `Client:` / `SDK/Client:` / `Connection:` sub-bullet (its first backticked name) |
| "Also in Integrations" / "Also in Stack", the ↔ mark | a chip's name found as a word in an Integrations group (file and folder paths left out), and the reverse |

## Mobile form at 390px (no sideways page scroll in any state, theme or variant)
A's tower and B's board and floor plan and C's chip groups **reflow**: layers keep at least 62% width so chips stay
readable, the scaffold and the ground stack under the tower; tiles become four to a row; rooms become one column.
A's hub and C's lanes **pan inside their frame** (the hub board keeps 46rem, the lanes keep one column per kind);
the frame's foot says so. Checked in headless Chrome: 72 screenshots (3 variants, 2 themes, 2 widths, 2 panels,
3 states), no sideways page scroll, no console errors.

## Layout contract
Measured in headless Chrome from the file; the picture frame is the reading column, 838px wide at 1280 and 358px at
390. Heights are the picture frame (bar, body, key), Labelore state unless named.

**A: Tower + hub**
- 1280 Stack: the tower is 838 by 1125px (Tidemark 617, 30 dependencies 1342); the scaffold column is 13rem at the
  right, the ground spans the frame under both; layer widths are Labelore 100, 59, 55 and 45% of the tower column.
- 1280 Integrations: a 3 by 3 board, 838 by 973px (Tidemark 663): the hub in the middle cell, cards around it,
  spokes drawn from the hub's centre to each card's.
- 390: Stack reflows to 358 by 2271px; the hub board keeps 46rem and pans inside the 358px frame (1148px tall).

**B: Element board + floor plan**
- 1280 Stack: tiles 92 by 84px, eight to a row; blocks share a row when they fit; 838 by 1482px (30 dependencies
  1692, Tidemark 572).
- 1280 Integrations: a six-column plan, a room spans three columns with four or more groups, else two; 838 by 930px.
- 390: tiles four to a row (2355px); the plan is one column of rooms (1749px).

**C: Reuse**
- 1280 Stack: chip sets in columns of at least 14rem (three across), 838 by 1019px.
- 1280 Integrations: six lanes across the measured body (about 134px each), nodes 58px tall, 838 by 716px with the
  Not used and Environment strips; Tidemark has four lanes.
- 390: the chip groups stack (1517px); the lanes keep 128px each and pan inside the frame (1009px).

## Font sizes
Measured in light theme at 1280 and 390, text of the page only (the sketch bar and the app shell are outside the
page): four sizes in every variant, state and panel; no typography exception.

| Role | Token | Size at 1280 | Renders |
|------|-------|--------------|---------|
| Display | `--fs-display-3` | 76.8px (44.8px at 390) | the `h1` only |
| Heading | `--fs-7` | 20.8px | panel `h2`, layer counts (A), major versions (B), the hub's app name |
| Body | `--fs-4` | 13.12px | group names, the dock, prose in the section bars |
| Label | `--fs-2` | 11.2px | chips, tiles, tags, micro labels, keys, "Value not shown" |

## Colour
Tokens only: the opacity steps `--fill-1..4` (foreground at 4, 8, 13 and 19%), a hatch of `--border`, the
muted foreground, and the accent for the frame's active entry, the selected mark's ring and a lit spoke or wire.
No tone is used for content (a dependency, a service or a missing database is not a status); no destructive,
warning or missing tone anywhere. No colour literal in the file.

## What to Look For
- Stack: does the tower (A) say "a lot rests on a small runtime" at a glance, or is the tile board (B) the better
  picture of "what is in here and how new is it" (the major versions large)? Is C's shipped chip shelf enough?
- Integrations: Labelore mostly says None. Does the hub (A) or the floor plan (B) make "it touches almost nothing"
  visible faster than the lanes (C), which show only what is used and list the rest as quiet chips?
- Tidemark: the planted variable reads as a name with "Value not shown" in all three; do the three known sections
  it lacks read as "not in this document" and not as an error?
- The cross-read: select `better-sqlite3` (Tidemark, Stack) and follow "Also in Integrations"; is a link across the
  pair worth keeping?

## Open points for the build
- The comparator in a version (`>=22.18.0`) and the comma split in Key Dependencies extend 10-05's `chipOf`; the
  32-character chip cut-off is a sketch number.
- The Package Manager label feeds the runtime layer here; 10-05 feeds it nothing.
- A group whose first line says None but whose later lines describe something real (Labelore's Auth Provider:
  "None", then the Host and Origin guard) counts as not in use, the same zero rule 10-03 uses for concerns.
- C's lane mapping (section to lane kind) is a sketch table; the shipped lane kinds come from RESEARCH keyword
  lists, so the build hands the graph in with kinds already set rather than asking `ascii-graph` to classify.
- Labelore's INTEGRATIONS line that registers a developer tool by a home path (10-03-SUMMARY) is left out of this
  sketch; whether the build masks it is 10-14's call.

All content is Labelore's own public map, the made-up Tidemark fixture, or real `package.json` entries; no other
repository's map is drawn from. The repository is public.

---
sketch: 042
name: codebase-page
question: "How do the seven codebase-map documents sit on one page with a panel each, and how does a map-only project's first screen put a short 'Mapped, not started' head over those panels?"
winner: null
tags: [codebase, map, panels, mapped-not-started, phase-10]
---

# Sketch 042: The Codebase page and the "Mapped, not started" head

## Design Question
Phase 10 D-01 and D-14: the seven map documents (Stack, Architecture, Structure, Conventions, Testing,
Integrations, Concerns) open as one Codebase page with a panel each, and the URL picks the panel. A
project that has a map and no roadmap opens on that same page with a short head over the panels (D-05):
"Mapped, not started", one sentence, the stack, the concern counts, and GSD's next command as selectable
text with a "Copy command" button (D-06). This sketch decides the frame and the head. The panel insides
are only stand-ins here: 043 to 046 design Architecture and Structure, Concerns, Stack and Integrations
inside the winning frame.

## How to View
open .planning/sketches/042-codebase-page/index.html

- Tabs `#a`, `#b`, `#c` pick the variant. Light and Dark switch theme (`?theme=dark` works too).
- The State bar switches six states (`?state=new|fast|partial|ingest|normal|variant`):
  Normal project (a map and a roadmap: no head), Map only complete (`/gsd-new-project`), Map only fast
  (4 of 7, `/gsd-map-codebase`), Map only partial (3 of 7, `/gsd-map-codebase`), Map only with ADR
  documents (`/gsd-ingest-docs`), and Heading variants (a normal project whose Architecture has an
  added "API Architecture" section that stays plain below the lifted part, a Concerns document with no
  Missing Critical Features section and an extra "Repository Hygiene" one, and a map dated only by an
  older footer, so no commit chip).
- Click a panel in the list to change panel (`?panel=concerns`); the list entries are links, "Not mapped"
  entries are not. "Copy command" turns into "Copied" inside the button for under two seconds; nothing
  is copied by a toast, nothing runs.
- A 390px-wide window shows the phone layout; none of the three scrolls sideways at 390px in either theme.

## Frames not reused
How the three most recent winners frame their pages, so none of this sketch's variants repeats them:

- **031 E (Research):** five full-height vertical spines side by side, one open, the others closed to a
  vertical title with a small visual; the summary is spine 00; under 42rem the spines stack as bars.
- **040 B (projects landing):** a plain header, a title block, then a main list on the left with the add
  and scan forms in a side column on the right; under 62rem one stacked column.
- **041 B (project page):** a full-width masthead (identity left, the core value in a framed card right)
  with a strip of count tiles under it, a vertical decision spine below, and a sticky margin on the right
  that holds the constraints.

042 uses none of: a row of full-height spines, a masthead with a framed card, a decision spine, a side
column of forms or a sticky margin of rules. Each variant differs from the others in how the panel list
works, not only where things sit: A is a rail (a table of contents beside a reading column), B is a strip
(seven tiles over one full-width panel), C is a stack of bars where the active bar opens in place.

## Shared across all three
- Content: the facts line ("{n} of 7 documents mapped", the readiness chip Complete map / Fast map /
  Partial map, "Mapped {date}", the commit as a mono quiet chip that is left out when the map has none),
  seven entries in the fixed order with number, name and one key number, "Not mapped" ghost entries
  (dashed square, not a link), the active panel with its lifted part above plain unmatched sections, and
  in map-only states the head (UI-SPEC section 3 copy verbatim, the next-step reasons, the never-runs note).
- Tokens only: every colour is a theme token or a colour-mix of tokens, squared corners, spacing from
  `--space-*`. Tones are `complete`, `in-flight` and `quiet` only (plus a neutral filled square for a
  plain count): nothing on this page is a failed read, so no destructive, warning or missing tone.
- Accent is spent only on the eyebrow, the `complete` readiness chip and its square, the active panel's
  number with its border and tint, the active tile's top rule in B and the bar's left rule in C, and the
  focus ring. The Copy command button is not accent-filled.
- Readiness: all seven present is Complete map (`complete`), the four core documents present is Fast map
  (`in-flight`), anything else is Partial map (`in-flight`).
- The ArtifactHeader is drawn unmodified (breadcrumbs, eyebrow, display `h1`, copy-path icon, View and
  Source); the app shell above it is drawn as today, with Roadmap and Traceability absent in map-only
  states (D-07) and Dashboard current.
- Text is labelore's own public map (`.planning/codebase/`). The counts follow 10-03's rule: 30 concerns,
  Security first with 6. The one private line 10-03 flags in the Integrations document (a home path with
  a user name) is left out. The other two repositories' maps only set shapes: the Architecture diagram is
  drawn at its widest real width (76 columns, the real diagram has about 78); the Concerns panel carries
  nine sections of unequal length (1 to 6 items) and, in the Heading variants state, a zero section and an
  extra section; the Architecture panel keeps its six plain sections below the lifted part (about 290
  lines in the source) so a long panel has to live in each frame; Testing carries ten plain sections
  including the repeated "Test Types Summary" heading that falls through.
- Panel list entries: key numbers are Stack 22 (languages plus frameworks), Architecture 24
  (components), Structure 11 (directories), Conventions 8 (rule groups), Testing Vitest (framework),
  Integrations 3 (services), Concerns 30 (32 in the Heading variants state, whose extra section adds to
  the total).

## Variants
- **A: Rail + column.** A sticky left rail holds the facts line (stacked) and the seven entries as a
  table of contents: number, name, key number right-aligned. The reading column holds the head, then the
  active panel. In a map-only project the head is a bordered block at the top of the reading column: the
  sentence at heading size, the stack and the concern counts in two columns, then the next step under a
  rule. The words "Mapped, not started" are the eyebrow. Under 62rem the rail stops being sticky and the
  column is one stack in this order: head, facts and entries as a column of bars, panel.
- **B: Tile strip.** The facts line sits in the meta row under the title. A map-only project gets a
  three-cell band (sentence and stack, concern counts, next step) above a strip of seven equal tiles, each
  tile a number, a name and the key number large. The active panel is full width below, its lifted groups
  in two columns (wide ones full width) and its plain sections in two columns. The title reads "Mapped,
  not started" in a map-only project; "Codebase" is then the eyebrow. Under 62rem the strip is four
  columns, under 42rem a column of bars.
- **C: Bars in place.** The seven entries are a ledger of bars (number, name over a one-line gist, key
  number, chevron); the active bar opens in place and its panel sits directly under it, so the panel list
  and the panel are one column. A facts sidebar on the right holds "n of 7 documents mapped" large, the
  chip, the date and commit, and in a map-only project the head under a rule (title, sentence, stack,
  concern counts as a vertical list, next step). The sidebar is not sticky because the head is taller than
  a screen. Under 62rem the sidebar (head first) sits above the bars.

## Layout contract
Measured in headless Chrome from the file; widths are CSS pixels of the box, content width 1177px at 1280.

**A: Rail + column**
- 1280px: the rail is 288px wide at x=51, the reading column starts at x=390 and is 838px wide; the head
  block is 838px wide and about 487px tall, its stack and concerns columns are 382px each.
- 1280px: the seven entries are single-line bars, 42px tall, stacked in the rail; "Not mapped" entries use
  two lines (name, then the word) and stay dashed.
- 1280px: the rail is sticky (it follows the scroll while the column is longer); the panel starts under
  the head, about 520px below the top of the grid.
- 390px: no rail and no column: one stack of 358px-wide boxes in the order head, facts and seven 42px bars,
  panel; the head's two columns become one.
- 390px: the entries show number, name and key number only; the one-line gists are not shown.

**B: Tile strip**
- 1280px: seven tiles, 168px wide each in one row, 129px tall; the band above is 1178px wide in three cells
  (417px, then two of about 380px); with only two cells (no Concerns document) the band is two cells.
- 1280px: the panel is the full 1178px; its lifted groups sit in two columns of about 563px, and groups
  made of rows, tables, figures or lists run the full width.
- 390px: the band becomes one column of three cells under each other; the tiles become seven 46px bars
  (number, name, key number on one line) in a column.
- 390px: the heading "Mapped, not started" wraps to two lines at display size (45px) and the facts line
  wraps under it.

**C: Bars in place**
- 1280px: the main column is 806px wide at x=51 and the sidebar 320px wide at x=909; bars are 67px tall
  (two lines) and the open panel starts directly under the active bar, indented.
- 1280px: the sidebar is about 1180px tall in a map-only project, taller than the first screen, which is
  why it does not stick; in a normal project it is the facts block only, a short box.
- 390px: sidebar first (head), then the bars in one 358px column; the open panel is the full width under
  its bar, the other bars keep one line of gist with an ellipsis.
- 390px: the concern counts are one per row, label left and number right.

## Font sizes
Measured from the rendered page in light theme, text of the page only (the sketch bar and the app shell
are outside the page and not counted). Tokens are the app's `--fs-*` scale.

**A: four sizes (within the default cap)**
| Role | Token | Size at 1280 | Renders |
|------|-------|--------------|---------|
| Display | `--fs-display-3` | 76.8px (44.8px at 390) | the `h1` only |
| Heading | `--fs-7` | 20.8px | panel `h2`, the head sentence, concern totals and counts |
| Body | `--fs-4` | 13.12px | names, prose, rows, the command, notes |
| Label | `--fs-2` | 11.2px | eyebrow, chips, breadcrumbs, buttons, group labels, entry numbers, units |

**B: five sizes at 1280 (four at 390)**
The four above plus **`--fs-fluid-3`, 26.4px at 1280**, for the key number on each tile (at 390 the tiles
become bars with the key number at `--fs-4`, so B renders four sizes there). Exception needed: one extra size, one role (tile key
number).

**C: six sizes at 1280 and at 390**
The four above plus **`--fs-5`, 14.4px**, for the bar names, and **`--fs-display-1`, 43.2px at 1280
(28.8px at 390)**, for the "n of 7" figure in the sidebar. Exception needed: two extra sizes, two roles
(bar name, documents-mapped figure).

## What to Look For
- Which structure makes the seven documents feel like one page rather than seven tabs?
- Does the map-only head read as "short head over the panels" or as a second page (A's bordered block, B's
  band, C's sidebar)?
- Is the readiness chip beside the next-step command easy to find in each (A: separate blocks, B: facts
  line under the title and command in the band's last cell, C: both in the sidebar)?
- With a long panel (Architecture in the Normal and Heading variants states) does each frame still orient
  you: A's sticky rail, B's strip scrolling away, C's open bar?
- Is the extra size worth it (B's tile numbers, C's bar names and big figure), or does A's four sizes carry
  the page?

## Open points for the build
- The concern labels in the head and counts are short ("Security", "Tech debt") and the panel keeps the
  document's own headings. If the head should use the headings verbatim, "Security Considerations" and
  "Dependencies at Risk" wrap in A and B.
- The Concerns panel draws one muted "Most dangerous" pull line (the first Security item); UI-SPEC says to
  keep it only if the sketch earns it. It is in all three variants; 044 may drop it.
- The Architecture component table opens from 6 to all 24 rows in place ("Show all 24").

All content is labelore's own public map or invented here. The repository is public.

## Winner
<!-- winner: pending. Chosen at the 10-06 checkpoint. -->
Not chosen yet.

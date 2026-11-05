---
sketch: 044
name: codebase-concerns
question: "Inside 042's winning Rail + column frame, how should the Concerns panel show a count per section (Security first), keep every concern readable in full on demand, and decide whether one quiet 'Most dangerous' line earns its place?"
winner: null
tags: [codebase, concerns, counts, security]
---

# Sketch 044: Concerns panel

## Design Question
Phase 10 D-14 and UI-SPEC section 2 (Concerns row, Tone mapping, Concerns copy rows). The Concerns panel
leads with a count per section for the nine named sections, **Security first**, the rest in document order;
a section with none shows `0` with a dashed square, not hidden; each concern is readable in full on demand
(no item truncated without "Read more"); the panel may offer **one** quiet "Most dangerous" pull line (the
first item under Security, else the first under Tech Debt), only if this sketch earns it. A count is the
10-03 rule's count (bold-label groups count from one, a group whose first field says None counts 0), so
Labelore's own CONCERNS is **30**, Security 6. No concern and no section is ever toned `missing` or
`destructive`: a concern is a finding shown as content. The page frame is 042 A and is drawn identically in
every variant; only the panel interior varies.

## How to View
open .planning/sketches/044-codebase-concerns/index.html

- Tabs `#a`, `#b`, `#c` pick the variant. Light and Dark switch theme (`?theme=dark` works too).
- The State bar (`?state=labelore|tidemark|debt|nosec`) switches four states:
  - **Labelore**: its own Concerns document (30 concerns in nine sections of 1 to 6, a long scope paragraph
    before the first heading, bold-label groups, "No open defects" dropped from Known Bugs).
  - **Tidemark**: the made-up fixture (14 concerns): `###` subsections under Performance, plain bullets
    under Fragile Areas, a table under Scaling Limits, "None identified." and "Not detected." which count 0
    (two dashed squares).
  - **40 in Tech Debt**: Labelore's document with 34 more Tech Debt items (same words, one per parser file),
    so the panel holds 64 concerns and one section is much longer than the rest.
  - **No Security items**: Security at 0 (a filled `complete` square, not a dashed one), so the pull line
    falls back to the first Tech Debt item as UI-SPEC says.
- "Read more" opens a concern in place with all its fields and turns into "Read less". In A, B and C the
  first line of each concern is its title and its first field, clamped to two lines when long. Items with no
  fields (Tidemark's Fragile Areas bullets) show the title only, in full, with no button.
- A 390px-wide window shows the phone layout; none of the three scrolls sideways at 390px in either theme.

## Shared across all three
- Content: the scope paragraph from the document (quiet), "{n} concerns" (number at heading size, mono),
  per-section counts with a short label ("Security", "Tech debt", "Dependencies at risk", "Missing features")
  and the document's own heading wherever a section opens. Counts are plain numerals in mono; Security's
  square is `in-flight` above 0 and `complete` at 0; every other section has a neutral square, and a dashed
  `quiet` square at 0.
- Each concern: bold title, the first field as a gist, "Read more" / "Read less" in the quiet text-link
  form; the opened form lists the document's own field names (Issue, Files, Impact, Fix approach, Risk,
  Current mitigation, Recommendations, Problem, Cause, Priority and so on) over their values, nothing cut.
- "Most dangerous": label in the mono micro-label form, the concern's title verbatim, muted, a 2px quiet left
  rule. It is drawn in **A and C and not in B**, so the choice is open (UI-SPEC: only if the sketch earns it).
- Tokens only; no `destructive`, `warning` or `missing` anywhere. Accent is spent only on the active rail
  entry and panel number (the frame) and, in B, the selected cell's top rule and number.
- Four font sizes in every variant at 1280 and 390 (display on the `h1` only, `--fs-7` for counts and the
  panel heading, `--fs-4` body, `--fs-2` labels); measured in headless Chrome. No typography exception.
- Text is Labelore's own public map, the made-up Tidemark fixture, and 34 invented Tech Debt items in
  Labelore's own words (real parser file names). No other repository's map is drawn from.

## Variants
- **A: Count strip over collapsible sections.** The nine counts sit in a bordered strip (label over number)
  that wraps to two rows at 1280 (six, then three) and two columns at 390; a cell opens its section below and
  scrolls to it. Below, nine collapsible bars (chevron, square, document heading, count at heading size);
  Security is open, the rest closed. The pull line sits between strip and bars.
- **B: Count grid that opens one section.** The nine counts are a three-by-three grid of larger cells, label
  over number, Security first; the chosen cell gets the accent top rule and tint. Only that section's
  concerns show under the grid, under its full heading. No pull line. The panel is the shortest of the three
  and never shows two sections at once.
- **C: Gutter ledger.** One continuous ledger. The count and square sit in a gutter at the left of each
  section (the number sticks while that section scrolls past), the document heading and the concerns to the
  right. Every section is open; the pull line sits under the total. Longest panel, nothing to click to see a
  section.

## Layout contract
Measured in headless Chrome from the file; widths are CSS pixels of the box, content column 838px at 1280.

**A: Count strip + collapsible sections**
- 1280px: the strip is 838px wide and 166px tall: cells 140px wide and 72px tall, six on the first row and
  three on the second.
- 1280px: section bars are 40px tall; the open Security section's concerns are indented 28px and are 115px
  each (title, two-line gist, Read more); the panel is about 1570px tall with only Security open.
- 390px: the strip is two columns of 179px cells, 85px tall, five rows (428px); bars are one line.
- 390px: the pull line and the scope paragraph sit above the bars; the panel is about 1990px tall.

**B: Count grid, one section at a time**
- 1280px: the grid is 838px wide and 248px tall: three columns of 279px cells, 82px tall.
- 1280px: the opened section is a normal list under a heading, 838px wide; Security is about 1230px of panel.
- 390px: three columns of 119px cells, 91px tall, label above number with the square above the label.
- 390px: choosing a cell swaps the list under the grid; the page height changes with the section (about 2430px
  at 390 with Security open in the 40-item state; Tech Debt itself would be far taller).

**C: Gutter ledger**
- 1280px: a gutter 80px wide at x=390 (number, then square) and the body 742px wide at x=486; the Security
  section is about 740px tall, the number stays in view with it (sticky).
- 1280px: with 40 items in Tech Debt that one section is over 5300px tall, which is why the number sticks.
- 390px: the gutter is 40px wide; the body takes the rest of the 358px column.
- 390px: the whole panel is about 8970px tall in the 40-item state (every concern two lines).

## Font sizes
Measured in light theme, text of the page only; at 390 the display size falls to 44.8px.

| Role | Token | Size at 1280 | Renders |
|------|-------|--------------|---------|
| Display | `--fs-display-3` | 76.8px | the `h1` only |
| Heading | `--fs-7` | 20.8px | panel `h2`, "{n} concerns", every count numeral |
| Body | `--fs-4` | 13.12px | concern titles and gists, section names, prose |
| Label | `--fs-2` | 11.2px | chips, "Most dangerous", field names, "Read more", cell labels at 390 |

## What to Look For
- Counts first: strip (A), grid (B) or gutter (C): which one lets you say "6 security, 30 in all" without
  reading anything?
- Is it right to hide sections (A's bars closed except Security, B's one at a time) when the whole document is
  only 30 concerns, or does C's everything-open ledger read better for a document you would otherwise scroll?
- Does the "Most dangerous" line earn its place? It repeats a title that is the first row of Security anyway
  (A and C); B has none for comparison. Also: when Security is 0 the line shows a Tech Debt title under the same
  words (No Security items state).
- The 40-item state: does a long section stay readable (A: one bar to open, B: one section on screen, C: a
  sticky number the whole way)?
- Two dashed squares (Tidemark): do the zero sections read as "nothing here" and not "missing"?

## Open points for the build
- Short labels in the counts ("Security", "Tech debt", "Performance", "Missing features") and the document's
  own headings in the sections follow 042's open point: if the counts should use the headings verbatim,
  "Security Considerations" and "Dependencies at Risk" wrap in A's strip at 140px.
- A section that is absent from a document shows 0 with a dashed square (Tidemark has no zero-by-absence
  case; Labelore's "Known Bugs" drops its "no defects" group and shows 1). The extra-heading case (a section
  outside the nine, counted after the known ones) is in 042's Heading variants state and is not redrawn here.
- "None under this heading." (the empty body of a zero section in A, B and C) is a sketch word.
- The gist clamps at two lines and "Read more" shows when there is more than one field or the first field is
  over about 130 characters; the build can settle the exact rule.

All content is Labelore's own public map, the made-up Tidemark fixture, or invented here in Labelore's own
words. The repository is public.

## Round 2: D, E, F (visual-first)
Round 1 (A, B, C above, kept as the tabs "Round 1 A/B/C") was rejected by the user: "no creativity in them, plain
boring wall of texts". Round 2 replaces the panel interiors with three pictures of where and how much the concerns
are. The frame is still 042 A. **The first screen of the panel is the picture**; a concern is read only when you
select its mark, and the nine sections stay reachable as closed accordion bars under the picture (each holds the round 1
list with Read more). Colours are tokens only: the `in-flight` tone for Security's marks and for the heat of a map cell
(three opacity steps), muted-foreground at opacity steps for every other mark, a hatch of `--border`. No new hue and no
destructive, warning or missing tone; no concern or section is ever toned as a failure.

How to view: tabs `#d`, `#e`, `#f` (the sketch now opens on D); the same four states. Select a mark (or a dot) to open
the concern under the picture; the section chips filter the marks (the others dim); the sketch's "Close" returns to
the picture.

- **D: Hotspots on the codebase.** The structure treemap with each concern a small square placed in the folder its
  Files field names, so you see WHERE the risk sits; a folder's tint deepens with how many marks it holds (1 to 3, 4 to
  11, 12 and more); concerns that name no file wait in a dashed tray under the map; the nine sections are the legend
  chips under the picture. The most dangerous mark carries an accent ring (key in the picture's foot), no sentence.
- **E: Risk piles.** Nine columns, one per section, Security first; each concern is one segment stacked from the
  baseline, so a dense section visibly piles up (the 40-in-Tech-Debt state makes one tower); counts and the square tone
  sit under each column. Zero is a dashed box. The most dangerous mark carries the accent ring.
- **F: Shape chart.** A nine-spoke chart, Security at the top, the rest clockwise in the document's order. The shaded
  shape is the count per section (square-root scale, so 40 and 1 can share a chart); each concern is a dot on its
  spoke, running outwards in the document's order. The most dangerous item is called out ON the picture: a leader
  line from its dot to a labelled box with its title verbatim (the one "Most dangerous" line of the round, in F only;
  D and E use the ring).

### Where each mark comes from
| Mark | Source in the map |
|------|-------------------|
| D treemap cell, its area | Directory Layout tree in STRUCTURE (Labelore's own or the Tidemark fixture's); area = entries listed; hatched = the files at that level |
| D, E, F mark = one concern | a concern counted by the 10-03 rule in the CONCERNS document (sections: the nine headings; unit: `###`, bold-label group, bullet, or table row) |
| D mark position | the deepest tree folder that contains a path named in the concern's Files field (else any backticked path in its other fields); no path = the tray |
| Security tone | the section heading (Security Considerations is first and is `in-flight` above zero, `complete` at zero) |
| Mark opacity step | the concern's Priority field when it states High, Medium or Low |
| Ring, callout | the first Security item, else the first Tech Debt item (UI-SPEC pull-line rule) |
| E column, F spoke | one section heading each; counts as in 10-03; Security first, the rest in document order |
| Section chips, accordion | the nine headings and their counts |

### Mobile form at 390px (no sideways page scroll in any state, theme or variant)
All three reflow; none pans. D's treemap is re-laid out to 324 by 500px (marks wrap inside their cell). E keeps nine
columns at about 32px each, hides the column labels and shows the section chips under the picture. F's chart is 324px
square with counts only at the spokes; the callout moves under the chart and the leader line is dropped.

### Layout contract, round 2
**D: Hotspots**
- 1280px: the frame is 838px wide and 658px tall; the treemap is 804 by 450px (0.56 of width), the tray under it
  and the section chips under the frame.
- 390px: the frame is 358px, the treemap 324 by 500px; cells under 40px wide carry no name, marks keep 11px.
**E: Risk piles**
- 1280px: nine columns across 804px, 163px tall for Labelore's own 30 concerns (segments 13px tall, 3px apart); with
  40 in Tech Debt the tallest column is about 700px and the frame 890px tall.
- 390px: nine columns across 324px (145px tall), labels hidden, the chips under the frame.
**F: Shape chart**
- 1280px: the chart is 512px square, centred in the 838px frame (695px tall); the callout sits at its lower left.
- 390px: the chart is 324px square (frame 679px tall including the callout below it).

### Font sizes, round 2
Measured at 1280 and 390, light theme, text of the page only: the same four (`--fs-display-3` on the `h1`, `--fs-7`
for counts and headings, `--fs-4` body, `--fs-2` labels). No exception needed.

### What to look for, round 2
- D: can you tell at a glance where the risk sits (the server folder, the handlers, `.planning`)? How does the map
  read with Tidemark's two folders, and with 40 marks in one folder (the 40-item state)?
- E: do the piles say "Tech Debt dwarfs everything" better than a number? Is Security first obvious from the piles?
- F: is the shape chart a picture you would keep, or is a square-root radar hard to read for counts?
- The "Most dangerous" decision: a ring (D, E), a callout with the title on the picture (F), or none.

## Winner
Not chosen yet. Round 1 (A, B, C) was rejected; round 2 (D, E, F) is the 10-09 checkpoint choice, together with sketch
043 and whether "Most dangerous" stays.

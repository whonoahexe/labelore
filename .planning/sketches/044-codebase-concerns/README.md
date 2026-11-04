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

## Winner
Not chosen yet. The choice is the 10-09 checkpoint (Task 3), together with sketch 043 and whether the
"Most dangerous" line stays.

---
sketch: 057
name: seed-page
question: "How does a seed page lead with the idea beside when it should surface, its scope, and where and when it was planted, as a picture?"
winner: null
tags: [seed, exploration, phase-11]
---

# Sketch 057: Seed page

## Design Question
Phase 11 D-02, D-16 (VIEW-15). `/gsd-capture --seed` writes `.planning/seeds/SEED-{YYMMDD}-{3 chars}-{slug}.md`: one
idea planted for a later milestone. The page leads with the idea and puts **when it should surface**, how big it is
and where and when it was planted beside it, as a picture of those fields; the prose sits behind a click or below
the picture. Three arrangements, three different pictures of the same file.

Real shape (the D-14 scratch run, 11-02-SUMMARY "## Seed", read for shape only):
- Frontmatter, six keys in order: `id` (the file name prefix), `status` (a bare word, `dormant` in both real
  files), `planted` (a date), `planted_during` (free text, `{milestone} / Phase {N} ({phase name})`),
  `trigger_when` (free phrase) and `scope` (lowercase `small` or `medium`; the writer's default is `unknown`).
  `audit_acknowledged` (`milestone`, `at`, `status`) is kept as "when present" and was not seen in either real file.
- Body: `# {id}: {idea}`, then `## Why This Matters`, `## When to Surface`, `## Scope Estimate`, `## Breadcrumbs`,
  `## Notes`. Bold labels: `**Trigger:**` in When to Surface, a bold size word (`**Small**`, `**Medium**`, `**Unknown**`)
  opening the Scope Estimate line. Breadcrumbs are bullets of a backticked relative path, an em dash and a short
  description (all nine real ones resolve).
- Writer placeholders that stay in the file: the stock "This seed will surface during `/gsd-new-milestone` when the
  milestone scope matches." sentence (even when the trigger is specific), the Notes line "Captured via one-shot seed
  capture. Enrich with trigger, why, and scope at your convenience.", "To be filled in" for Why, "**Unknown**" for the
  scope estimate, "No breadcrumbs collected yet." So the page leads with `trigger_when`, never with the stock sentence,
  and reads an unfilled placeholder as absent.

## How to View
open .planning/sketches/057-seed-page/index.html

- Tabs `#a`, `#b`, `#c`; Light and Dark (`?theme=dark`). "Today" is 2026-04-21, so the ages are computed from it.
- State bar (`?state=trigger|notrigger|unknown|crumbs`), all made up (Lendshed), the four hard seeds:
  - **Trigger + audit** (`trigger`, SEED-260304-k7q, the 11-08 fixture): dormant, a trigger sentence, `medium`,
    `audit_acknowledged` (v1.0, 2026-03-20, dormant), three breadcrumbs of which one does not resolve.
  - **No surfacing condition** (`notrigger`, SEED-260411-m2x, 11-08): active, no `trigger_when`, `small`, two
    breadcrumbs.
  - **Scope unknown, placeholders** (`unknown`, SEED-003, 11-08): the older id form, `trigger_when: when relevant`
    (the writer's default, shown as written), `scope: unknown`, Why, Scope Estimate and Breadcrumbs all still
    placeholders (so absent on the page).
  - **Breadcrumbs that do not resolve** (`crumbs`, SEED-260402-w9d): **a fourth seed made up for this sketch only**,
    not in the Lendshed fixture. It is the one that covers `triggered` and `large`, and four breadcrumbs of which only one
    resolves. 11-22 should add it to the fixture if this frame wins and the build needs it.
- B: click a file node to see its description in the dock under the figure. Every "Sketch only" link is inert.

## Frames not reused
How the four locked frame sketches lay out their pages (a seed must not copy any of them):
- **053 A, verdict board:** a board of verdict columns (counts as the focal point) with each spike opening as a panel
  at its own URL; the page is a grid of tiles grouped by idea.
- **054 C, gate path:** one vertical gate path (gate bars and numbers down a spine) ending in a boxed "Resume here"
  next action; closed bars carry the back matter.
- **055 A, instrument grid:** a grid of instrument tiles, each a file's key figure, a tile opening to full width in place.
- **056 C, shared root:** a tree, a root node of shared files with one card per workstream branching from it.

And the status-first pages already shipped (027 todo lifecycle strip over a numbered spine, 023 debug case file)
are not reused for 058 either. The three seed frames: **A** a full-width banner (a time axis) over a two-column reading
band and closed bars; **B** a stage and margin (a left-to-right fan figure beside a facts sheet); **C** one narrow
centred letter (an envelope object over folded sheets). None has a grid of tiles, a vertical spine of gates, a branching
tree of cards or a board of columns.

## Shared across all three
- Header: crumbs "Lendshed / Seeds / {id}", eyebrow "Seed", the h1 the idea (the `# SEED-id: idea` title, id
  stripped), then the id, the View / Source toggle and a Copy path button. The h1 is the page's only display size; a
  62-character idea takes two lines at 1280px and four at 390px.
- Labels (the Copywriting Contract, verbatim): "Surface when", "Scope", "Planted {date}", "Planted during {phase}",
  "Breadcrumbs", "No surfacing condition", "Scope not stated". The file's own key is shown as `audit_acknowledged`.
- Tones: status `dormant` quiet, `active` and `triggered` `in-flight`, any other word verbatim and quiet. Scope
  Small / Medium / Large are untoned chips; `unknown` or absent is a quiet "Scope not stated". A missing
  `trigger_when` is a quiet dashed "No surfacing condition". A breadcrumb that resolves is a `complete` square and a
  link; one that does not is a quiet dashed square, plain mono text and a quiet "Not found" chip, never a link.
  No `missing` or alarm tone: a path that moved is a fact, not a failure.
- Below the picture: "Why this matters" (omitted while it is the writer's placeholder), "Breadcrumbs" where the
  picture does not carry them, and three closed bars: "Scope estimate" (the bold size word and its gloss),
  "When to surface" (the trigger and the stock sentence, quiet) and "Notes" (as written).
- Computed by Labelore, never presented as the file's: "{n} days since planted", "{k} resolve", "one tick a week",
  "next /gsd-new-milestone" (taken from the stock sentence, shown only as a dashed run, not as the trigger).

## Variants
- **A: Dormant to surface.** The picture is a time axis in a banner: a solid line from "Planted {date}" (with
  "Planted during {phase}") through the `audit_acknowledged` date to today, ticks a week apart, then a dashed run
  labelled "next /gsd-new-milestone" into a framed gate that carries "Surface when", the trigger sentence, the status
  chip and the scope chip. No audit means no mid marker; no trigger is a dashed gate with the quiet chip. Under 52rem
  the axis turns vertical. Computable from `planted`, `audit_acknowledged.at`, `planted_during`, `trigger_when`,
  `status` and `scope`.
- **B: Fan of references.** The picture is a left-to-right figure: the seed (id, status, scope, planted) on the left,
  one wire to each breadcrumb on the right (solid and `complete` where it resolves, dashed and quiet where it does
  not), under the shipped figure-frame title bar "Breadcrumbs". Click a file for its description in the dock. A margin
  sheet carries "Surface when", the three-notch scope scale, "Planted {date}", "Planted during {phase}" and
  `audit_acknowledged`. No breadcrumbs draws the seed with a dashed stub. Under 42rem the fan is a spine with stubs.
- **C: Seed packet.** The picture is an envelope: a square postmark ("Planted" and the date), a dashed stamp
  carrying the scope letter, the "Surface when" sentence as the address, the status as a seal; `audit_acknowledged` as
  a dashed postscript line under it. Why, Breadcrumbs and the bars follow as folded sheets in one narrow column.

## Layout contract
Measured in headless Chrome (1280x800 and 390x844; every state, every variant, both themes):
1. No sideways scroll: `scrollWidth` equals `clientWidth` (1280 and 390) in all 24 combinations per width.
2. The picture's top edge is at y 481px at 1280 for A, B and C (under the h1 and meta row); A's band is whole inside
   the 800px first screen, B's stage and C's packet start there (C's seal ends at about 847px).
3. A at 1280: band is the page column wide (1178px), three columns: the axis, a 128px dashed run and a 352px gate; at
   390 the axis is one column with a 4px spine and the gate is full width.
4. B at 1280: figure 834px wide beside a 320px sheet (a 24px gutter); at under 62rem (about 992px) the sheet drops under
   the figure; at 390 each file row is a full-width node on a spine.
5. C at 1280 and 390: the packet is at most 48rem wide (768px) and centred at 1280, full column at 390.
6. Every file path is one line with an ellipsis and the full path in `title` (B), or wraps (A, C breadcrumb list);
   the trigger sentence always wraps and is never cut.

## Font sizes
The four-size cap (UI-SPEC Typography, no exception route). Computed sizes found on the page in all combinations:
- **Display 76.8px** at 1280 (44.8px at 390), `--fs-display-3`: the h1 only.
- **Heading 20.8px**, `--fs-7`: section h2, the trigger sentence in the gate, the address and the margin sheet, the
  stamp's scope letter.
- **Body and Meta 13.12px**, `--fs-4`: the Why prose, breadcrumb descriptions, "Planted during" text, bar titles.
- **Label 11.2px**, `--fs-2`: eyebrow, crumbs, chips, ids, dates, paths, micro labels, ticks, scale notches, buttons.
Weights 500 and 600 only. The app shell and the sketch bar are outside the page.

## Sketch words
Not UI-SPEC copy, drawn only to read the picture: "View" and "Source" (the shipped toggle), "Copy path", "Not found",
"one tick a week", "next /gsd-new-milestone", "{n} days since planted", "{k} resolve", "No breadcrumbs", "Why this
matters", "Scope estimate", "When to surface", "Notes".

## Reuse and open points for the build
- **Shipped figure to reuse.** No shipped figure draws a time axis, a fan or an envelope. B reuses the shipped
  `FigureFrame` bar for its stage. The one fit among shipped figures is a `StatusMeter` ("2 of 3 breadcrumbs resolve")
  placed above the breadcrumb rows; it was not drawn as a variant because the page would then open on a meter over a text
  list, which is rows rearranged, not a picture of the seed.
- The h1 is the idea (long); 11-22 decides whether the `ArtifactHeader` caps its length or wraps.
- Breadcrumb resolution is computed against the project root when the page loads; a path that goes outside the project
  never resolves (no link, "Not found").
- The writer's stock sentence and Notes line are shown as written in closed bars, never as the lead.
- B draws "No breadcrumbs" (a quiet stub) because the missing breadcrumbs are the point of an empty fan; the other
  variants stay silent. If B wins, 11-22 confirms whether that one absence word earns its place (UI-SPEC "absence is
  silent unless the absence is the point").
- Seeds are free text: a `KEY=` looking string in Notes uses the shared "Value not shown" mark (UI-SPEC section 1 rule 8).

All text is made up. The repository is public.

## Winner
Pending, chosen at the 11-14 checkpoint.

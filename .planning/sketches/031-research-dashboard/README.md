---
sketch: 031
name: research-dashboard
question: "How should the five project research files sit together on one Research page, with the summary (suggested build order, gaps to address) first and then Stack, Features, Architecture and Pitfalls?"
winner: "E (round 2)"
tags: [research, dashboard, project-research, build-order, gaps, layout, frame]
---

# Sketch 031: Research dashboard (frame + summary)

## Design Question
Today the five files in `.planning/research/` open as "Unrecognized" plain documents. This sketch
gives them one Research page: the summary first, then the four files. This round settles the
**frame** and the **summary**. The four file pages get their own sketches inside the winning frame:
032 Architecture, 033 Features, 034 Stack, 035 Pitfalls. Until then their bodies are placeholders.

## How to View
open .planning/sketches/031-research-dashboard/index.html (round 3; round-2.html and round-1.html keep the earlier rounds)

The tools at the bottom right switch **Project** (Cinedise Portal, dense and drifting from the
template, or Labelore, close to it), **Files** (all five, no PITFALLS.md, SUMMARY.md only), theme and width.

## Data
`data.js` is generated from the real files by `gen-data.mjs`, which takes the Cinedise research
directory as an argument because those files live on another host.

## The summary (the same in every variant, both rounds)
- **Head:** the milestone name (or the project name) large, confidence as a 3-cell meter, the date
  researched, the domain, and the executive summary's first paragraph as the lede. The rest of it folds.
- **Suggested build order:** a track of numbered phases. A phase that "runs in parallel with" or
  "can overlap" another sits under it on a second lane (Cinedise: 2 under 1, 4 under 3, 6 under 5).
  Marks show a gate, a research flag and how many pitfalls the phase avoids. An entry gate
  ("before any phase writes…") shows as a dashed callout ahead of phase 01. Clicking a phase,
  or using ← →, opens an inspector with the rationale, what it delivers (a one-paragraph
  `a; b; c` list is split into items), the gate, pitfall chips that open the Pitfalls page, and
  the research flag. "Why this order" folds underneath.
- **Gaps to address:** a numbered two-column ledger, with the bold lead and the body.
- (Round 1 also had an "Also in SUMMARY.md" chip row. Round 2 drops it: nothing links to the source.)

## Round 1 (rejected, kept in round-1.html)
- **A: Tabs under the head** · **B: Side rail of five files** · **C: Summary hub + file pages.**
- Feedback: "none of them actually. we can be creative with everything, including the layout. also,
  do not link to the source anywhere." Round 2 removes every source link (no Source chips, no
  "Also in SUMMARY.md" row, no line numbers or file names).

## Round 2 (round-2.html)
Every file now has a signature visual, shared by all three variants:
- **Summary:** the build-order line. Gated phases are filled squares; a phase that runs alongside
  another hangs under it on a dashed tick.
- **Stack:** layered slabs, one per stack section, core on top in the accent.
- **Features:** a three-way split bar (expected · differentiators · anti-features, the last hatched
  and struck through), with a few names under each.
- **Architecture:** the shipped lane diagram (hand-built graph, laid out by `layoutLanes`), as a
  wordless thumbnail and in full with node details.
- **Pitfalls:** one square per pitfall, grouped by the first phase whose "Avoids" names it; pitfall 01 is solid.

Variants:
- **D: Bento board.** The project name huge, then a board: a wide Summary tile (lede, big phase
  count, the build-order line), a Gaps tile, then Architecture, Stack, Features and Pitfalls tiles.
  A tile opens in place: the board shrinks to a sticky strip of tiles (Board · Summary · … · Gaps)
  over the opened content. Esc goes back to the board.
- **E: Five spines.** A full-height row of five panels; one is open, the others are spines with a
  vertical title, their number and confidence. Summary is spine 00, the leftmost. ← → moves
  between spines. On a phone the spines stack as bars.
- **F: Chapters.** One read, front to back. Each file opens with a full-screen cover (giant
  chapter number, title, its finding said large, its visual), then its content. A sticky index on
  the left follows the scroll and marks the chapters already read.

In every variant the summary's full content is the build-order track with its phase inspector
(rationale, delivers, gate, pitfall chips that open the pitfall, research flag), "Why this order",
and the gaps ledger. The four file bodies are still placeholders for 032–035.

## Round 3 (index.html): refining E
The user picked E (five spines): "I like E but it can improve in a lot of different ways." This
round fixes what was weak in E: closed spines were empty columns, the open panel's first screen was
a small bar over a wall of text, and the summary lost its place once another file was open. There is
no separate top bar any more; the summary panel itself carries the project name.
- **E1: Living spines.** Each closed spine carries its file's visual, drawn vertically: the build
  line, stack layers with counts, a vertical feature split, components placed by lane, and the
  pitfall squares. Its key number and confidence sit at the foot. Hovering or focusing a spine shows
  a peek with that file's finding. The open panel leads big: the project name huge (on the summary),
  the finding said large, then a stat strip of big numbers, then the content.
- **E2: Summary docked.** The summary never closes. It is a left column with the project, "Read this
  first", the build order as a vertical list (alongside phases indented on a dashed elbow; marks
  for gate, research and pitfalls), the entry gate and the gaps. The four files are slim spines
  beside it. The main area shows whatever was picked: the full summary and why this order (by
  default), a phase (big number, rationale, delivers, gate, and the pitfalls it avoids with their
  titles, each opening the pitfall), a gap, or a file.
- **E3: Fisheye.** Like E1, but the open panel's neighbour opens halfway as a preview card (title,
  confidence, big number, finding, its visual); the rest stay living spines.

**Round 3 result:** "nope, E was better". None of the round 3 changes carry forward. Round 2's E,
as drawn in round-2.html, is the frame.

## Winner
**E: Five spines (round 2).** A slim title bar, then five full-height panels with one open. The
closed ones are plain spines (number, vertical title, key number, confidence). Summary is spine 00.
The open panel has a big number, title, the file's finding, and its content. The user said it "can
improve in a lot of different ways"; what to improve is still to be asked, not guessed.

## What to Look For
- Which arrangement makes the summary feel first, and the research feel like one thing?
- Do the signature visuals read at tile, spine-cover and full size?
- Cinedise (9 phases, 18 pitfalls, 73 features) vs Labelore (4, 10, 27): does each layout hold both?

## Known for the build
- The shipped ASCII → lane-diagram extractor can't read either project's system overview yet.
  Cinedise's comes out as one node, and Labelore's loses the search index. 032 lays out a
  hand-built graph with the shipped `layoutLanes`. The extractor needs work before the
  Architecture page can use it.
- Headings drift from the template (Cinedise: "Headline" for "The Decision, Stated Once", table
  stakes grouped under `####`, and sections only it has: Conflicts, Gates and Spikes). Parse by
  role. With no source links, whatever isn't recognised needs its own in-app home, or stays out.
- The summary's Key Findings for features and pitfalls are lists, so a "finding" sentence is
  composed from counts and the first pitfall's title instead.

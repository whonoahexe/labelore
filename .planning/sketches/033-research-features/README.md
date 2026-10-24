---
sketch: 033
name: research-features
question: "Inside 031's E frame, how should the Features panel show the feature landscape (expected, differentiators, anti-features) and the competitor feature analysis?"
winner: "D1"
tags: [research, features, landscape, anti-features, competitors, comparison]
---

# Sketch 033: Features panel

## Design Question
The Features spine of the Research page (031, E), opened. The user's brief: the feature landscape
(expected, differentiators, anti-features) and the competitor feature analysis.

## How to View
open .planning/sketches/033-research-features/index.html

It opens on Features. Project switches between Cinedise Portal (44 expected in 6 groups, 13
differentiators, 16 anti-features; 3 rival tools) and Labelore (11 / 7 / 9; 2 kinds of product).

## Data
`gen-data.mjs` reads FEATURES.md: the Table Stakes, Differentiators and Anti-Features tables (with
their `####` groups, as Cinedise has), complexity normalised to LOW…HIGH, and the Competitor
Feature Analysis table. Its middle columns are the rivals and its last column is ours. The
paragraph after the table becomes the comparison's closing note.

## The same in every variant
- **Anti-features are 032 A's swaps:** the feature struck through → the better approach. Click a
  row for "Why it gets asked for" / "Why it's a problem".
- **Complexity** is three quiet cells. In-panel labels use the shipped mono style.

## Variants
- **A: Columns + matrix.** Expected | Differentiators side by side, each with a big count. Each
  group shows 3 features, then "+ N more in Projects". Click a row for why and notes. The
  comparison is a matrix: feature, each rival, then our column tinted (headed with the project's
  name). Cells clamp at 3 lines, and a click unclamps the row.
- **B: Kind switch + us vs them.** A three-way switch (44 expected · 13 differentiators · 16 not to
  build) shows one kind at a time. Rows carry a one-line why. The comparison reads as "us vs them":
  the feature, our approach large, the rivals underneath in small text.
- **C: Complexity map + pick a rival.** Expected and differentiators as tiles in Low / Medium /
  High columns. Click a tile for the detail below. Pick one rival to read each comparison row as
  a swap: them (muted) → us.

## Round 2: D and the long list
The user: "Kind switch from B and competitors from A. kind switch can still be a bit improved". When
asked what to improve: the long list (Cinedise's 44 expected features in one run).
- **D: B's switch + A's matrix.** The synthesis, with the list as it was.
- **D1: Group switch.** A second, smaller switch of group chips (Projects 6 · Ingest 12 · …) shows
  one group at a time.
- **D2: One group open.** An accordion with one group open (the first by default). Each closed group
  shows its count and a one-line peek at its first two features.
- **D3: Group cards.** Groups as cards in a grid with names only (no why line); a click opens why.

A list with fewer than two groups (Labelore, and every differentiators list) stays a plain list.

## What to Look For
- Cinedise's 44 expected features: capped groups (A), one kind at a time (B) or a map (C)?
- The comparison: a matrix, us-first rows, or one rival at a time?

## Winner
**D1: B's kind switch + group switch, with A's competitor matrix.** Build it. User: "D1 is better".
- Landscape: the three-way kind switch (big counts: expected · differentiators · not to build).
  When the chosen list has two or more groups (Cinedise's expected features), a second row of
  group chips with counts shows one group at a time. Rows: name, a one-line why and complexity
  cells; a click opens why and notes.
- "Not to build" shows 032 A's swaps (struck through → instead; why on click).
- Competitors: the matrix. Feature, each rival (name over its parenthetical), then our column
  tinted and headed with the project's name. Cells clamp at 3 lines and a click unclamps the row.
  The file's closing paragraph sits below.

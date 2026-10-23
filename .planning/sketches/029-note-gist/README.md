---
sketch: 029
name: note-gist
question: "What one signature first screen gives every note its gist at a glance — a one-liner, a dense labelled quick note, an unpromoted question, and a 40–112-line explore note?"
winner: "A"
tags: [documents, per-type-views, note, explore, gist, lifting, layout, round-2]
---

# Sketch 029: Note gist (NOTE page, round 2)

## Design Question
028-A shipped as the NOTE page, but in use its first screen is lifeless: a title and rows of text.
A short quick note is mostly empty space under a giant title, and an explore note reads as a plain
document with a contents list. What should every note open on, so you get its gist fast, in the
energy of the security console, the UI-review scorecard and the verification ledger?

## How to View
open .planning/sketches/029-note-gist/index.html (`?v=a|b|c&doc=dcrop|dround|dsfx|dcall|dback|pcap|star|sundo|lsketch|pbrief|lperkind|lsurvey&theme=light`)
Edit `template.html`, then run `node .planning/sketches/029-note-gist/build.mjs` (copies 027's shared
CSS and helpers in). `gen-data.mjs` extends 028's data with labelore's own sketches-page note and
artifact survey.

## Intake (user's answers)
- **What's off today:** a lifeless first screen, explore notes as plain documents, quick notes that feel empty.
- **Feel:** Labelore's own winners — one big signature graphic per page.
- **The one thing to get:** the gist, fast.

## Variants
- **A: Gist console** — a rail (title from the file name, where-it-went chip, a big number:
  things it says / measured figures, a stat list, the todo) beside the gist said large, then a
  ledger: "What it says" (one numbered row per lifted clause) or, for explore notes, "Section by
  section" (each section's key sentence, bold-led items, flagged calls, figure chips, Read + to open).
- **B: Fact board** — a big title (the gist; a one-liner gets its file-name title), then a board of
  tiles, one big value each: clause tiles (Decided wide), figure tiles (a measured number + unit),
  a Where-it-went tile. Explore notes: the lede under the title, figure and flagged-call tiles, then
  the sections as quiet folds.
- **C: The note as a card** — a verdict line said large ("Became a todo. Shipped 22 Oct 2026."
  / "Still a note. 15 days on."), then the note drawn as a ruled index card: clause labels in the
  margin, the gist at the top, the todo pinned beside it. Explore notes become a deck: the lede card
  first, then one index card per section, which opens full width in place.

**Same in all three:** lifting comes from the file alone (028's `Label:` rule for quick notes; for
explore notes the lede, `##` sections, bold-led list items, tables, number + unit figures, and the
flag words Decided / Blocked / open question / rejected / resolved / Corrected); Lifted (or Board) |
As written toggle; View / Source; "Also in this file" as one chip row; no added motion.

## What to Look For
- `star` / `sundo` (one-liners): does the first screen feel full and meaningful now?
- `pbrief` / `lperkind` / `lsurvey`: does the explore note's gist land without reading it?
  Are the lifted figures the ones you'd want?
- `dcrop` / `lsketch` (dense): does the lifted structure read faster than 028's rows?
- Phone width (toolbar → Phone) for all three.

---
sketch: 035
name: research-pitfalls
question: "Inside 031's E frame, how should the Pitfalls panel let you scan what to watch for across the critical pitfalls, open one, and show the Looks Done But Isn't checklist?"
winner: "A"
tags: [research, pitfalls, warning-signs, checklist, risks]
---

# Sketch 035: Pitfalls panel

## Design Question
The Pitfalls spine of the Research page (031, E), opened. The user's brief: the critical pitfalls and
the "Looks Done But Isn't" checklist. The other back sections (debt/integration/performance/security/UX
tables, recovery strategies, the phase map) stay out. The main job is **scanning what to watch for**:
see every pitfall at a glance (name, how likely, its warning signs), then open one.

## How to View
open .planning/sketches/035-research-pitfalls/index.html

It opens on Pitfalls; the other spines still work. Project switches between Cinedise Portal (18
pitfalls, 47 warning signs, 18 checks; no "how likely", so it shows how sure the research is) and Labelore
(10 pitfalls ranked by severity, 28 signs, 10 checks).

## Data
`data.js` comes from `gen-data.mjs` (it takes the Cinedise research directory as an argument). It
reads PITFALLS.md:
- **Each `### Pitfall N:`**: What goes wrong, Why it happens (Cinedise 9–18 have none), How likely
  (Labelore only: the level word, e.g. "Very high"), How to avoid, Warning signs (bullets, or one
  paragraph split at top-level ";"; Cinedise 18 has none), Phase to address, Confidence (Cinedise).
- **Pitfall-to-Phase Mapping**: each pitfall's short name ("Overfit to studio-portal", "Cache-backed
  verification"), its prevention phase and its verification. The panel uses these inside each pitfall,
  not as a section.
- **Looks Done But Isn't**: label, the check, "(Pitfall N)" lifted into a chip, and Cinedise's
  "often X - verify Y" split into what it often does and the check.

## The same in every variant
- The leaf head counts critical pitfalls, warning signs and checks. 031's lead stays ("The worst of
  10: …").
- A pitfall reads as its short name over the author's full title. How likely is a four-cell meter in
  the pitfall (destructive) tone; where the file doesn't say, the confidence meter stands in.
- An opened pitfall leads with the first sentence of What goes wrong ("What goes wrong, in full" for
  the rest). Ways to avoid it show the bold lead or first sentence; the rest clamps at two lines and a
  click unclamps. "How to verify" comes from the phase map. A section the pitfall doesn't have is not
  drawn.
- Pitfall chips elsewhere (the summary's "Avoids pitfalls", a check's chip) open that pitfall.

## Variants
- **A: Watch list + check ledger.** One row per pitfall, in the file's order: number, short name, full
  title, then "Watch for" and the first warning sign (+N more); how likely and the phase on the right.
  A row opens in place with tabs (Warning signs first · How to avoid · Why it happens · How to verify).
  Checklist as a numbered two-column ledger.
- **B: Board + inspector + tick list.** Pitfalls as cards on a board, in columns by how likely
  (Labelore) or by the phase that prevents them (Cinedise, which has no likelihood). The selected
  card opens an inspector below: title, meter and phase, what goes wrong, warning signs beside how to
  avoid, the verify block, Why folded. ← → walk through the pitfalls. Checklist as a tick list with a
  progress strip ("3 of 10 checked · not saved").
- **C: Symptom index + drawer + swaps.** Leads with the warning signs themselves: every sign, grouped
  under its pitfall, with a filter ("Seeing something? Filter the signs") that matches signs and
  pitfall names live. A sign or pitfall opens a right-side drawer with the tabs; ← → walk, Esc closes.
  Checklist as swaps: what it often does, struck through → the check.

## What to Look For
- Scanning: which one lets you take in 18 pitfalls fastest, the list's first sign (A), the board's
  columns (B) or every sign at once (C)?
- Cinedise has no "how likely". Does the confidence meter carry the row (A, C), or does grouping by
  phase work better (B)?
- The checklist: ledger (A), tick list (B) or often → verify swaps (C)? The tick list holds state the
  read-only app doesn't own; it is per-visit only.

## Winner
**A: Watch list + check ledger.** Build it. User: "A seems right but do not add emojis".
- One row per pitfall in the file's order: number, short name over the full title, "Watch for" with
  the first warning sign (+N more), how likely (or how sure, when the file doesn't say) and the phase.
- A row opens in place: the first sentence of What goes wrong ("What goes wrong, in full" for the
  rest), then tabs, Warning signs first, then How to avoid, Why it happens and How to verify. Tabs
  with nothing in them are not drawn.
- Warning signs are marked with small squares in the pitfall tone. No warning-triangle icons as
  list markers: they read as emoji. The ⚠ markers were replaced in every variant.
- "How to verify" is a plain block (label + the check) with an accent left rule. No tick icon.
- The checklist is a numbered two-column ledger: label, the check, and a chip for any pitfall it names.

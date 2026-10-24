---
sketch: 034
name: research-stack
question: "Inside 031's E frame, how should the Stack panel show the decision, the recommended stack and the alternatives considered?"
winner: "A"
tags: [research, stack, decision, alternatives, packages]
---

# Sketch 034: Stack panel

## Design Question
The Stack spine of the Research page (031, E), opened. The user's brief: the decision and the
recommended stack, then the alternatives considered.

## How to View
open .planning/sketches/034-research-stack/index.html

It opens on Stack. Project switches between Cinedise Portal (a one-paragraph headline, 5 layers,
13 alternatives with Category / Why not) and Labelore ("X over Y" with 3 reasons, 3 layers, 10
alternatives with "When to use").

## Data
`gen-data.mjs` reads STACK.md:
- **Decision:** "The Decision, Stated Once" (Labelore: a bold "X over Y" line, numbered reasons
  with bold leads) or "Headline" (Cinedise: one paragraph).
- **Stack:** every table under Recommended Stack, one layer per `###`, with its parenthetical as
  the layer note ("the only one", "already installed…").
- **Alternatives:** both table shapes (Recommended / Alternative / When to use, and Category /
  Recommended / Alternative / Why not).

The decision replaces the open panel's lead sentence, so the headline isn't said twice.

## Variants
- **A: Verdict + layer switch + over rows.** The verdict's first sentence large, the numbered
  reasons as leads that open, and "Read more" for the rest. The stack is one layer at a time
  behind 033's group switch: rows of name (mono), version and purpose, with why on click.
  Alternatives are "chosen over alternative" rows, with "Use it instead when" / "Why not" on click.
  Cinedise groups them by category; a choice repeated on consecutive rows shows once.
- **B: Duel + layers + choice cards.** When the verdict says "X over Y", it shows as a duel: Chosen
  (tinted) over Passed over (struck through), with the reasons as numbered cards. Otherwise it
  falls back to A's verdict. The stack is every layer at once, stacked and offset, with packages as
  name + version chips; a click shows its purpose and why. Alternatives are one card per choice,
  listing what it beat, with the condition on click.

## What to Look For
- Labelore's "Vite + Hono over Next.js": verdict line (A) or duel (B)?
- 25 packages: one layer at a time (A) or all layers as chips (B)?
- Alternatives: over rows (A) or cards per choice (B)?

## Known
- The spine's stack count comes from 031's data (it counts every table row under Recommended Stack
  differently); the panel's own count sums the layers. Reconcile in the build.

## Winner
**A: Verdict + layer switch + over rows.** Build it. User: "A is better".
- The decision leads the panel, replacing the lead sentence: the verdict's first sentence large
  (cut at a colon when long), the reasons as numbered one-line leads that open, then "Read more".
- The stack is one layer at a time behind the group switch (layer chips with counts, the layer's
  note under them). Rows show name (mono), version (mono, muted) and purpose; why on click.
- Alternatives are "chosen over alternative" rows, grouped by category when the file has one. A
  choice repeated on consecutive rows shows once. A click shows "Use it instead when" / "Why not".

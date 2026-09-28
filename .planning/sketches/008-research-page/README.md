---
sketch: 008
name: research-page
question: "What overall shape should a RESEARCH.md page take — date, confidence and a quiet domain up top, a simple summary, the stack rendered well, architecture/pitfalls/open questions in the body, constraints in back matter, and the not-for-humans sections pushed to source?"
winner: "A"
tags: [documents, per-type-views, research, layout]
---

# Sketch 008: RESEARCH page

## Design Question
RESEARCH.md is the longest planning document (≈760–830 lines, 18 `##` sections). What layout lets a
person open one and immediately get: when it was researched, how confident it is, what it recommends,
which packages it brings in (and which the legitimacy gate flagged), what the architecture looks like,
and what will go wrong — while code examples, state of the art, the assumptions log, installation and
version verification stay out of the way?

## How to View
http://cinedise:4174/008-research-page/

Toolbar: **Doc** switches between labelore P2 (30 packages, 12 SUS, 9 unrated pitfalls, all questions
resolved) and studio-portal P2 (Rust crates + host binaries, CRITICAL/HIGH/MEDIUM pitfalls, 4 open
questions, 3 blocking environment gaps). **Audit → + synthetic SLOP** adds two invented `[SLOP]`
removals (clearly badged) because no real RESEARCH file has removed a package yet. **Evidence tags**
toggles the `[VERIFIED]`/`[CITED]`/`[ASSUMED]` markers (V / C / A superscripts, hover for the citation).

## Variants
- **A: Briefing** — cover (eyebrow, big title, date · confidence chip · valid until, quiet DOMAIN line), then summary beside the primary recommendation and an "at a glance" column, then numbered chapters: 01 Stack (+ legitimacy), 02 Architecture, 03 Pitfalls, 04 Open questions | 05 Environment, 06 Sources, back matter, source-only strip.
- **B: Reference sheet** — sticky left rail holds the identity (title, date, per-area confidence meters, domain) and a grouped outline with counts and active-section tracking; the body is denser (stack as tables, pitfalls as a flat accordion with Expand all, sources open).
- **C: Dashboard** — six clickable tiles (confidence, stack, legitimacy, pitfalls, open questions, environment) under the header, then summary + recommendation, then a panel grid (stack beside legitimacy, full-width alternatives, architecture, patterns | don't hand-roll, pitfalls, questions | environment, sources).

## Shared across variants (not the question here)
- Confidence chip opens the Metadata breakdown (per-area level + note + valid-until).
- Stack: Core / Supporting as package rows (name, version · date, SUS / new / already pinned / host binary badges, purpose, why); Alternatives as "chosen **over** other" with a verdict chip (rejected / viable / do not use / later phase) derived from the tradeoff text.
- Legitimacy: counts + proportion bar, SLOP removals as struck-through red cards with reason and replacement, SUS names as chips, full seam table behind a toggle. Refined in sketch 010.
- Diagram: the verbatim ASCII in a framed figure — box-drawing glyphs dimmed, arrows in primary, Fit / Expand. Tree: parsed into a collapsible tree with `#` comments as an aligned notes column and NEW / EXTEND / EXISTING badges. Refined in sketch 009.
- Patterns ⇄ Anti-patterns toggle; Don't hand-roll as "don't ~~X~~ → use Y" rows plus the key insight.
- Pitfalls as cards: what goes wrong visible, why / how to avoid / warning signs on expand, severity + F-code chips when the heading has them.
- Back matter rows: User constraints (IDs link into CONTEXT.md), Phase requirements, Responsibility map.
- "In the source only": Installation, Version verification, Code Examples, State of the Art, Assumptions Log, Security Domain, etc. as links into Source mode.

## What to Look For
- Does the domain line stay quiet enough in each? (A/C: under the facts row; B: in the rail.)
- labelore P2's 21-row stack: which variant keeps it scannable?
- studio-portal P2's three CRITICAL pitfalls and three blocking env gaps: which variant makes them hard to miss?
- Switch on synthetic SLOP: does the removal register as serious in each placement?
- Phone width: B's rail collapses into a wrapped outline; A and C stack.

## Data note
Text is verbatim from the two RESEARCH.md files (trimmed with … in places). Annotations a parser
would derive are listed in `data.js`'s header comment: SUS from the `[WARNING…]` suffix, alternative
verdicts from the tradeoff's first word, pitfall severity/F-code from the heading parenthetical,
tree badges from comment prefixes. Pattern bodies are shortened to their **What:** line.

## Winner
**A: Briefing.** Build it. Cover with a quiet DOMAIN line and a confidence chip that opens the per-area breakdown. Summary sits beside the primary recommendation and an "at a glance" column. After that come numbered chapters: 01 Stack (+ legitimacy), 02 Architecture, 03 Pitfalls, 04 Open questions | 05 Environment, 06 Sources. Back matter rows and the source-only strip close the page. Sketches 009 (diagram + tree) and 010 (legitimacy audit) refine parts inside this frame.

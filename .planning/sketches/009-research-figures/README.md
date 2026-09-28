---
sketch: 009
name: research-figures
question: "Inside 008-A's Architecture chapter, how should the system diagram look good and the directory structure read well, when both are hand-drawn ASCII in the source?"
winner: "B+B"
tags: [documents, per-type-views, research, figures, diagram, tree]
---

# Sketch 009: RESEARCH figures

## Design Question
Every RESEARCH.md draws its System Architecture Diagram and Recommended Project Structure as
plain ```` ``` ```` / ```` ```text ```` fences: box-drawing ASCII and `├──` trees with `# comments`.
They are among the most useful parts of the document and currently render as a grey code block.
The diagram and the tree are independent choices, so each has its own row of variants.

## How to View
http://cinedise:4174/009-research-figures/ (or the sketch quick tunnel)

Top bar: **Diagram** A / B / C and **Tree** A / B / C are chosen independently. Toolbar: Doc
switches between labelore P2 (box-less flow diagram, plain tree) and studio-portal P2 (boxed
diagram, tree with NEW / EXTEND / EXISTING comments).

## Variants — diagram
- **A: Framed ASCII** — 008's treatment: verbatim text in a figure frame, box glyphs dimmed, arrows in primary, fixed-height rows so lines join; Actual size / Fit, Grid backdrop, Expand.
- **B: Lifted** — the page finds structure in the ASCII and draws real cards behind it. `┌…┐└…┘` rectangles become bordered cards whose first line is bold; in a box-less diagram, text runs are clustered into node cards (two-line nodes keep their subtitle muted). Connectors stay the author's ASCII; free text next to boxes is set as muted italic annotation. Generic — nothing is hand-placed.
- **C: Mermaid redraw** — hand-converted Mermaid of the same two diagrams, rendered by Mermaid (strict). A comparison point only: Labelore cannot convert ASCII to Mermaid, but a source that already uses a `mermaid` fence would look like this.

## Variants — tree
- **A: ASCII guides** — 008's treatment: the `├──` guides kept, folders collapsible, `#` comments as an aligned notes column, NEW / EXTEND / EXISTING as chips.
- **B: Clean list** — no guide glyphs; folder/file icons and indentation, notes beside, a "Changed only" filter when the tree has NEW / EXTEND markers, file/folder counts.
- **C: Directory cards** — one card per top-level folder (grid), files with their notes inside; files sitting at the root collect in one card.

## What to Look For
- B diagram on studio-portal: do the lifted boxes read as the author's architecture, or does the fixed ASCII grid still show through too much?
- B diagram on labelore: are node cards right for a flow that had no boxes at all?
- Tree B's "Changed only" on studio-portal — is that the view a reader wants from a research doc?
- Tree C on labelore: `test/` folders that are only a comment line become empty-ish cards — acceptable?
- Phone width: every diagram needs horizontal scroll or Fit; the trees should stack.

## Data note
Diagram and tree text are the verbatim fences from the two RESEARCH.md files (copied from 008).
The Mermaid in C is hand-written. Detection rules for B are in the page's `liftModel()` comment;
one source line (BROADCAST BUS) overruns its box by a character, and B widens that box to fit.

## Winner
**Diagram B (Lifted) + Tree B (Clean list).** Build both.
- **Diagram:** the page finds `┌…┐└…┘` boxes and draws them as cards (first line bold), or groups text into node cards when the diagram has no boxes. Connectors stay ASCII, and text beside a box becomes a muted italic note. Each row has a fixed height so the cards line up, and a box grows by up to 2 chars when a source line overruns it. Keeps Fit / Grid / Expand.
- **Tree:** icons and indentation with no guide glyphs, notes beside, collapsible folders, NEW / EXTEND / EXISTING chips, a "Changed only" filter (only when NEW or EXTEND markers exist), and file/folder counts.

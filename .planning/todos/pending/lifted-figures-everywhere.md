---
title: Use the lifted-diagram and clean-list-tree renderers for every ASCII diagram and directory tree in Labelore
date: 2026-09-29
priority: medium
status: pending
---

Sketch 009's winners, **Diagram B (Lifted)** and **Tree B (Clean list)**, were designed for the
RESEARCH page. The user said they "can replace all the diagrams and dir tree representation
across labelore". Later, once the RESEARCH view is built, make them the shared renderer for
every document, not just RESEARCH.

- **Diagrams:** any box-drawing ASCII fence (```` ``` ```` / ```` ```text ````) that contains
  `┌┐└┘` boxes or `│ ▼ → ` connector flows goes through the lift. Boxes become cards; box-less
  text runs are clustered into node cards; connectors stay ASCII; each row has a fixed height.
  Mermaid fences keep rendering through Mermaid.
- **Trees:** any fence whose lines are `├──` / `└──` trees gets the clean list: icons,
  indentation, collapsible folders, `#` comments as notes, NEW / EXTEND / EXISTING chips, a
  "Changed only" filter when markers exist.
- **Where they show up:** RESEARCH (System Architecture Diagram, Recommended Project Structure),
  ARCHITECTURE.md / STACK.md in `.planning/research/`, PLAN and PATTERNS bodies, CONTEXT, and
  anywhere else in the markdown pipeline. That suggests detecting the fence in the renderer
  rather than hanging it off one view's manifest.
- **Reference:** `.planning/sketches/009-research-figures/index.html`: `liftModel()` /
  `liftHTML()` / `placeCards()` for diagrams, and `parseTree()` / `treeB()` for trees.
- **Watch for:** misdetection on ordinary code blocks that happen to contain `│` or `├`. The
  detection should require a real rectangle, or 3+ tree-prefixed lines, before it takes over.
  There must be a way back to the raw text (Source mode already covers this).

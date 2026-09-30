---
sketch: 012
name: diagram-product
question: "Read as data rather than redrawn, can each RESEARCH architecture diagram look like a product-doc diagram (Stripe/Linear): few typed nodes, short labels, clean layers, details on demand?"
winner: "B"
tags: [documents, per-type-views, research, figures, diagram, graph]
---

# Sketch 012: Diagram as a product diagram

## Design Question
011's redraw kept the author's ASCII geometry and was rejected on four counts: it still looked
like ASCII, it was dense, the layout was ragged and it looked flat. The reference the user picked
is Stripe/Linear docs diagrams. So this sketch treats the ASCII as **data**: extract a graph, then
draw it from scratch.

## How to View
http://cinedise:4174/012-diagram-product/ (or through the sketch quick tunnel)

At the top: **A / B / C** variants. The chips switch between the 8 diagrams. Click a node for its
details. The frame bar has **Source** (the author's ASCII) and **Shown as drawn** (the fallback).

## How the graph is extracted (graph.js, on top of 011's shapes.js and the shipped model)
- **Nodes:** the model's cards. A box around other cards becomes a group.
- **Edges:** each connected run of wire glyphs. Arrowheads mark targets and plain ends mark
  sources. A wire the author broke with a note is bridged. A fan-out with no drawn source comes
  from the card just above it. A `◄─ note` pointer is an annotation, not a flow.
- **Wire labels:** notes sitting right beside a wire. Other notes become annotations on the
  nearest node.
- **Labels:** `HEALTH REGISTRY (async task)` becomes **Health registry** / async task. Code is cut
  at its argument list (`authz::require` / `(&identity, …)`). SQL is cut after its table. A
  shouted side label names a box that has no heading (`HOST KERNEL / DEVICES`). `:vault` beside
  `PROBER THREAD:stage` becomes `Prober thread:vault`.
- **Kinds:** client, edge, service, worker, channel, data, external, step, matched on keywords.
  Each kind shows as a lucide icon. There are no new hues: only the client (entry) icon uses the
  primary tint, per the tone rules.

## Variants
- **A: Layered.** Uniform nodes with an icon, label and one-line subtitle. Layers follow the
  author's rows, and left-to-right order follows the author's columns. An only child sits under
  its only parent. Wires are orthogonal with rounded elbows, labels sit near their target, and a
  `+N` marks hidden detail.
- **B: Lanes by kind.** The same layers, but each node's column is its kind lane. Wide diagrams
  run out of room, and the lanes can split one flow across the page.
- **C: Numbered walkthrough.** Minimal numbered nodes, with a docs-style step list beside them
  carrying subtitles and wire labels. Best on single-file flows (bulk archive, roles).

## What to Look For
- A on storage-health, identity and labelore: does it read as a designed diagram now?
- Labels: are the short names right, and is anything important lost behind `+N` or the panel?
- A vs C on linear flows (roles, bulk archive): a tall column of cards, or numbered steps?
- B: a lane per kind is where it breaks. Is the kind grouping worth anything?

## Winner
**B: Lanes by kind.** Build it.
- **Graph extraction (graph.js):** nodes, edges, wire labels, groups, short labels and kinds, as
  described above. It is shared by every variant and is the part that ports to `src/rendering/`.
- **Lanes:** one column per kind present, in the order client, edge, service & steps, worker,
  channel, data, external. Each lane has an icon header and alternating lane shading. Layers
  follow the author's rows. Nodes of one kind in one layer sit side by side inside their lane.
- **Nodes:** uniform size, lucide icon, label clamped to 2 lines, one-line subtitle, and `+N` for
  hidden detail. Clicking a node opens the details panel (details, notes, from/to with wire
  labels, as written); the node's wires turn primary and everything else dims.
- **Wires:** orthogonal with rounded elbows, arrowheads, and labels near the target.
- **Known for the build:** a wide diagram (storage-health's four probers plus the external lane)
  outgrows the frame. Lane width needs capping, or several same-lane nodes in a layer need to
  wrap. The shouted side-label (`HOST KERNEL / DEVICES`) and fan-out bridging must survive into
  the port. Fallback stays "Shown as drawn" when the graph is thin.

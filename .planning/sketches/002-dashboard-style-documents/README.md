---
sketch: 002
name: dashboard-style-documents
question: "Which layout makes a document page read like the dashboard, in a shape every artifact type can fill?"
winner: null
tags: [documents, layout, per-type-views, dashboard]
---

# Sketch 002: Dashboard-style documents

## Design Question
Document pages open with a giant title that fills the first screen, then a thin unboxed list. The
dashboard opens with a short header, a "Next up" card, a big-number progress panel, then boxed
panels. Which layout brings document pages in line with the dashboard, and does it hold for two
very different types (a discussion log and a plan)?

Both documents are normalised into one shape. That shape is the pattern every type would follow:

| Slot | Dashboard equivalent | Discussion log | Plan |
|---|---|---|---|
| hero | position hero | title, phase, date, status | objective, wave, status |
| glance | "Next up" card | decision left to Claude | blocking human checkpoint |
| stats | progress panel | 16 decided, topics, open | 2/3 tasks, must-haves, flagged |
| groups | "Needs attention" | topics → questions → chosen answer | tasks, must-haves |
| side | "On deck" | open questions, deferred ideas | requirements, threats, files |

Content is real: studio-portal phase 04 (`04-DISCUSSION-LOG.md`, `04-06-PLAN.md`), trimmed for length.

## How to View
Served over the tailnet by the `labelore-sketches` user service (Tailscale Serve `/sketches` →
127.0.0.1:4174):

    https://cinedise.persian-elnath.ts.net/sketches/002-dashboard-style-documents/

Locally: `http://127.0.0.1:4174/002-dashboard-style-documents/` (opening the file directly won't
load the fonts — they come through the theme's symlink).

Toolbar (bottom right): Discussion log / Plan, Light / Dark, Phone / Tablet / Desktop.

## Variants
- **Today (reference)** — approximates the current page: giant title, outline rail, flat list.
- **A: Dashboard mirror** — the dashboard's own layout reused as-is: hero + "Next up"-style card,
  big-number panel, main panel + side panels. Maps almost 1:1 onto existing CSS classes.
- **B: Ledger** — compact header, four stat tiles, one-line notice, then a table per group (question
  | chosen | also offered). Densest; closest to the traceability page.
- **C: Board** — compact header with the glance card beside it, pill strip, groups as a 2-column
  grid of cards that expand in place.

## What to Look For
- First screen: can you tell what the document is and what needs you, without scrolling?
- Discussion log: find the one decision Claude made for you (use the glance link).
- Plan: find what's blocking and which tasks are done.
- Switch to Phone: which variant reflows best?
- Does it feel like the same app as the dashboard in both themes?

## Trade-offs
| | Build cost | Scan speed | Long documents | Catch |
|---|---|---|---|---|
| A | Lowest: reuses dashboard CSS | Good | Main panel gets long | Big hero still costs half the first screen |
| B | Medium: new table rows | Best | Best; rows stay one line | Least "dashboard", most "report" |
| C | Medium: new card grid + expand | Good at a glance | Worst; expanding shifts the grid | Summaries truncate; detail is one click away |

---
sketch: 006
name: context-brief
question: "What layout gives a CONTEXT document its own shape, boundary first, without copying the discussion log's folded chapters but still reading as the same site?"
winner: "D1"
tags: [documents, per-type-views, context, dashboard-vocabulary]
---

# Sketch 006: Context, round 2

## Design Question
Round 1 (sketch 005) was rejected because it put CONTEXT inside the discussion log's B3 frame, so
the two pages looked identical. This round drops the cover sheet and folded chapters and builds
from the dashboard's own pieces instead:
- `page-intro`
- `position-hero`, with the accent card that has a primary top rule and an offset shadow
- the attention panel
- preview panels
- `section-heading` with a `count-box`

The user's priorities:
1. **The boundary hits first.**
2. "Do not drift into these" stays quiet.
3. Decisions are the body.
4. Claude's discretion is **tagged into the areas**: an item that names a decision (`D-10`, `D-12`)
   shows as a "Claude decides" note on that decision. Anything left over goes in a short list.

## How to View
https://cinedise.persian-elnath.ts.net/sketches/006-context-brief/
(locally: http://127.0.0.1:4174/006-context-brief/)

Toolbar: document (studio-portal P1 / labelore P5), theme, width.

## Shared by all variants
- **Intro:** eyebrow `Context · Phase 01 · Gathered Aug 3, 2026`, title, status chip, "Covers …",
  copy-path icon, View/Source.
- **Boundary:** the phase statement in large heading type leads the page. "In this phase" is the
  loud element. "Not in this phase · do not drift into these" is a dashed, muted strip (a quiet
  panel in D3), with each item's destination (`→ PHASE 3`).
- **Stat buttons:** `19 decisions locked`, `3 open for the researcher` (amber), `2 hard to undo`,
  `5 left to Claude`. Each jumps to its target.
- **Ideas:** specific and deferred ideas as two preview-style panels with count boxes.
- **Back matter:** references and code insights in one closed "More in this document" disclosure.

## Variants
- **D1: Brief + register.** A `position-hero` pairs the statement and stats with the accent "In this
  phase" card, and the quiet out-strip sits underneath. Next comes an amber attention panel for the
  open questions, then a continuous register: area names in a sticky left column and every decision
  listed in full, with the tag in the gutter, the summary always visible and the reasoning a click
  away. Chips show reversibility and `OPEN-01`, and "Claude decides" notes sit under their
  decisions.
- **D2: Register + reader.** The same boundary as a full-width statement with inline in-scope tags.
  Decisions become master/detail: the left list holds every tag and summary grouped by area, marked
  `OPEN` / `claude` / `costly`. The right pane reads the selected decision in full, with its open
  question and "Claude decides" as insets, prev/next buttons and ↑/↓ keys.
- **D3: Area cards.** The boundary is two panels (the accent statement with in-scope tags, and a
  quiet not-in-scope panel). Decisions sit in a 2-column grid of area cards, with the open-questions
  attention panel spanning the grid first. Each card ends with a "Claude decides" footer.

## What to Look For
- Does the boundary now read as the first thing, and does it stay quiet about drift?
- Is the page distinct enough from the discussion log while still clearly the same site?
- Scanning 19 decisions: D1's full register, D2's list and reader, or D3's cards?
- Do the "Claude decides" notes read well in place, compared with the old endnotes sheet?

## Parsing notes for the build
- Carried over from 005: prose boundaries ("This phase does not…") are fragile, and the labelore P5
  out-list needed a hand correction. Studio-portal P4's "Locked upstream" table is a third shape.
- Tagging discretion into areas: an item attaches to the first `D-NN` it names, so "…beyond what
  D-01 and D-04 require" attaches to D-01. One-paragraph discretion ("…left to planning judgment:
  a, b, and c.") is split on its comma list first.

## Outcome
**Winner: D1 (Brief + register).** The CONTEXT page pattern going forward:

1. **Intro:** `page-intro` with eyebrow `Context · Phase NN · Gathered <date>`, the title, a status
   chip, "Covers …", a copy-path icon and View/Source.
2. **Boundary hero:** a `position-hero`. On the left, the phase statement's first sentence in large
   heading type, the rest in muted text, and stat buttons (decisions locked / open for the
   researcher / hard to undo / left to Claude). On the right, the accent card "In this phase" with a
   ✓ list. When the boundary has no explicit In-scope list, the card shows the summary's remaining
   prose instead.
3. **Out strip:** "Not in this phase · do not drift into these" as a dashed, muted strip under the
   hero, with each item's `→ destination`.
4. **Open questions:** an amber attention panel. Each row is `OPEN-NN` · question · a `blocks D-NN`
   chip that jumps to the decision, and the reasoning opens on click. There's no panel when the file
   has no open questions.
5. **Decision register:** a `section-heading` "Decisions" with a count box. Each area is a row with
   its name and chips (locked / open) in a sticky left column. Its decisions are always listed as tag
   gutter · summary (first sentence) · chips (`OPEN-NN`, reversibility), and clicking the summary
   shows the detail and the reversibility line.
6. **Claude's discretion, tagged:** an item naming a `D-NN` renders as a "Claude decides" note under
   that decision. The rest go in an "Also left to Claude" panel after the register.
7. **Ideas:** "Specific ideas" and "Deferred" as two preview-style panels with count boxes, each item
   a bold title plus a two-line clamp that expands on click.
8. **Back matter:** a single closed "More in this document" disclosure holding canonical references
   and existing code insights, grouped by their `###` headings.

---
sketch: 028
name: note-page
question: "How should a NOTE page make a one-paragraph capture worth a page — lifting its Decided / Bug / Want clauses and file references — while a long explore note still reads as a document, and show the todo it became?"
winner: "A"
tags: [documents, per-type-views, note, todo, lifting, layout]
---

# Sketch 028: NOTE page

## Design Question
GSD's `/gsd-note` writes `date "YYYY-MM-DD HH:mm" · promoted` plus one paragraph kept word for word.
`/gsd-explore` writes `title · date · context` plus a full document. In practice the quick notes are
dense: "Decided:", "Bug:", "Cause:", "Fix:", "Want:", "Off limits:", "Known gap:", and file:line
references. A note never records which todo it became (only `promoted: true`), so the page looks
it up the other way, from the todos.

## How to View
open .planning/sketches/028-note-page/index.html (`?v=a|b|c&doc=dcrop|dround|dsfx|dcall|dback|pcap|star|sundo|pbrief|lperkind&theme=light`)
Edit `template.html`, then run `node .planning/sketches/028-note-page/build.mjs`. It copies 027's
shared CSS and helpers in, so both sketches use the same vocabulary.

## Intake (user's answers)
- **Lift its structure:** pull out the labelled clauses and file references, with the verbatim text
  one click away.
- **Relatives:** preview inline: the todo it became, its status and resolution, and any notes
  batched into the same todo.

## Winner
**A: Annotated**: the first sentence is the title, then the remaining clauses in reading order with labels in a gutter (Lifted | As written toggle); margin holds the todo it became (with batched notes) and every file mentioned. Explore notes render as a document with a contents list in the margin. Build it.

## Variants
- **A: Annotated** — the first sentence is the title, then the remaining clauses in reading order,
  one row each, with the label in a gutter (Lifted | As written toggle). Margin: the todo card, then
  every file mentioned (click to highlight and copy). Explore notes: the document plus a contents
  list in the margin.
- **B: Brief** — regrouped by kind: Decided (full width), The problem (Bug/Cause/Today/Observed),
  What to do (Fix/Want/How/UI/Output/Suggested), Limits (Off limits/Known gap/constraints/
  estimates). A Mentions strip at the top, then what it became beside the verbatim text folded.
  Explore notes: their `##` sections as folds.
- **C: Note → todo** — the note as flowing text with inline label chips (Decided highlighted),
  arrowed to the todo pane: status, weight, resolution excerpt, which of the note's calls survived
  into what shipped (✓ / ≠), and the batched sibling notes (click to open them).

**Same in all three:** promoted with no todo found is a quiet "promoted, but untraced"; not
promoted is "still a note"; a todo that only mentions the note is "Related", not "Became".

## What to Look For
- `dcall` (Observed / Want / Output / Off limits) and `pcap` (unlabelled; lifted from "Today …",
  identifiers and file:line refs).
- `sundo` / `star`: one-liners. Is a page this empty acceptable?
- `dround` ↔ `dcrop`: two notes batched into one todo.
- Lifting rule: a sentence opening with a short `Label:` (or "Today", "Estimated", "Batch with")
  starts a clause; later sentences without a label join it.

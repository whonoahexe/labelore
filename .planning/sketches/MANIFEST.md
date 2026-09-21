# Sketch Manifest

## Design Direction
Labelore's own visual language: studio-portal oklch tokens, base-sera, squared corners, light and
dark, mono micro-labels over Space Grotesk body text. Sketches reuse the app's real tokens (see
themes/default.css) so a layout that reads well in a sketch reads the same in the app.

## Reference Points
The dashboard (`src/web/pages/dashboard-page.tsx`) for sketch 002. The shipped traceability page (`src/web/pages/traceability-page.tsx`, `.trace-row*` in
`src/web/styles/globals.css`).

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | trace-row-layout | How should a trace-row be laid out so rhythm, phase placement, the two-column split and scannability all improve? | C — status rail | traceability, layout, list-row |
| 002 | dashboard-style-documents | Which layout makes a document page read like the dashboard, in a shape every artifact type can fill? | A — dashboard mirror (refine in 003) | documents, layout, per-type-views |
| 003 | document-layout-refined | Keeping 002 A's building blocks, which layout reads as a document page rather than a copy of the dashboard? | — (pending) | documents, layout, per-type-views, refinement |

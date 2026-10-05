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
| 003 | document-layout-refined | Keeping 002 A's building blocks, which layout reads as a document page rather than a copy of the dashboard? | A2 — cover sheet + numbered chapters (refine in 004) | documents, layout, per-type-views, refinement |
| 004 | sheet-refined | How should A2's cover sheet and numbered chapters handle phones, long documents and a third document type? | B3 — folded chapters (build it) | documents, layout, navigation, refinement |
| 005 | context-document | Inside the B3 frame, how should a CONTEXT document show its boundary, 15–21 decisions, open questions, ideas and back matter? | None — too close to the discussion log; reworked in 006 | documents, per-type-views, context, b3 |
| 006 | context-brief | Without the discussion log's folded chapters, what layout gives CONTEXT its own shape, boundary first, in the site's dashboard vocabulary? | D1 — brief + register (build it) | documents, per-type-views, context, dashboard-vocabulary |
| 007 | context-ideas | How should the CONTEXT brief's Specific ideas and Deferred show rules as rules, and where parked ideas went and why? | C — grouped by fate (build it) | documents, per-type-views, context, ideas, deferred |
| 008 | research-page | What overall shape should a RESEARCH page take — quiet identity, simple summary, stack rendered well, back matter and not-for-humans sections pushed aside? | A — briefing (build it; refine figures in 009, audit in 010) | documents, per-type-views, research, layout |
| 009 | research-figures | Inside 008-A, how should the ASCII system diagram and directory tree render — framed, lifted into cards, or redrawn; guides, clean list, or folder cards? | B+B — lifted diagram + clean list tree (build it) | documents, per-type-views, research, figures, diagram, tree |
| 010 | legitimacy-audit | How should the Package Legitimacy Audit show verdicts so [SLOP] removals and [SUS] flags stand out? | B — lanes by verdict, 4 per lane + show more, system tones only (build it) | documents, per-type-views, research, legitimacy, packages |
| 011 | diagram-redraw | Can the architecture diagram be redrawn from the author's ASCII (real cards, SVG connectors, the author's arrangement kept) so all 8 RESEARCH diagrams look designed, with a fallback when it can't? | None — still reads as ASCII, dense, ragged, flat; reworked in 012 | documents, per-type-views, research, figures, diagram, redraw |
| 012 | diagram-product | Read as data rather than redrawn, can each RESEARCH architecture diagram look like a Stripe/Linear docs diagram: few typed nodes, short labels, clean layers, details on demand? | B — lanes by kind (build it) | documents, per-type-views, research, figures, diagram, graph |
| 013 | patterns-page | How should a PATTERNS page show classification, assignments, shared patterns and no-analog files usefully for a human, without the agent-facing code? | B — by location + side panel (build it) | documents, per-type-views, patterns, layout |
| 014 | ui-spec-page | How should a UI-SPEC page show the design system (spacing, type, colour) creatively and make dozens of UI-consideration rows readable, with date, quiet shadcn/preset and sign-off up front? | Round 2: B shadcn card + A no copy — B spacing ruler, C type ladder, A colour, A matrix, modal sign-off, verdict-first registry (build it) | documents, per-type-views, ui-spec, design-system, layout |
| 015 | uat-page | How should a UAT page show timestamps + status, the current test with attention, a summary, every test's expected/result fields, and gaps with diagnosis? | B — square strip summary, expected/result pairs, gap register (build it) | documents, per-type-views, uat, testing, layout |
| 016 | validation-page | How should a VALIDATION page show status, test infrastructure and sampling, a per-task verification map better than a 10-column table, a quiet Wave 0, manual checks and sign-off — in what order? | A — cover cells + how it's tested + wave lanes/inspector + quiet Wave 0 + human-check cards + sign-off (build it) | documents, per-type-views, validation, testing, layout |
| 017 | security-page | How should a SECURITY page show date, threats open, ASVS and status, a small summary, trust boundaries, the threat register (severity, status), accepted risks, a toggleable audit trail and sign-off — in what order? | Round 2: D — console rail + severity × STRIDE threat board + waiver ledger + boundary flow chips (build it) | documents, per-type-views, security, threats, layout |
| 018 | ui-review-page | How should a UI-REVIEW page make reviewing easy — score, the fixes to make, where points were lost, the passes out of the way, and how/when it was audited — in what order? | B — scorecard: hexagon radar + verdict/fix pins/method, pillar tabs + inspector (found + fixes · held up) (build it) | documents, per-type-views, ui-review, audit, layout |
| 019 | plan-page | How should a PLAN page order header (modal triggers for deps/files/requirements), objective, tasks of every type, done-when and the executor-only material so a human isn't overwhelmed? | B — task navigator: header + planned date + View/Source + deps/files/requirements modals, objective dl, task list + tabbed task pane (← →), done when, in the source only (build it) | documents, per-type-views, plan, tasks, checkpoints, layout |

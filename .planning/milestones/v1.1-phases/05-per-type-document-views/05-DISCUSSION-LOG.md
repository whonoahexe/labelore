# Phase 5: Per-Type Document Views - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-20
**Phase:** 5-per-type-document-views
**Areas discussed:** Structure vs. document body, License to reorder, Convention: where + how strict, Reading surface: TOC + mentions

---

## Structure vs. document body

### Q1 — When a type has a registered view, how does the promoted structure relate to the rendered markdown body?

| Option | Description | Selected |
|--------|-------------|----------|
| View is primary, source behind a toggle | The per-type view IS the page; full rendered markdown reachable via an explicit "Document source" toggle. Avoids double-rendering. Costs: the view must not silently drop unpromoted content. | ✓ |
| Structured lead, full document always below | Keeps Phase 2's D-09 shape exactly. Nothing can be lost; a thin manifest degrades gracefully. Costs: duplication on all 12 section-projection types. | |
| Per-type manifest decides | Manifest declares its own mode — lead-then-body for frontmatter types, replace-with-toggle for section types. More faithful, one more axis per manifest. | |

**User's choice:** View is primary, source behind a toggle
**Notes:** Flagged up front that this revises Phase 2's D-09. The deciding factor was that a lead-panel above the full markdown would render a discussion log's `| Option | Description | Selected |` table twice — once promoted, once as raw prose.

### Q2 — A manifest promotes some sections/fields. What happens to everything it doesn't promote?

| Option | Description | Selected |
|--------|-------------|----------|
| Renders after, in document order, inside the view | Promoted structure first, then remaining content in original order. Nothing lost even with a thin manifest. | |
| Only in the source toggle | View shows exactly what the manifest promotes. Sharpest views, but a stale manifest silently hides content as GSD evolves. | |
| Renders after, collapsed by default | Unpromoted content present but folded behind a disclosure. Keeps the view tight while guaranteeing nothing is unreachable. Costs an extra click. | ✓ |

**User's choice:** Renders after, collapsed by default
**Notes:** Resolves the "view is primary" content-loss risk — the remainder is always present, just folded.

### Q3 — What does the "Document source" escape hatch actually show?

| Option | Description | Selected |
|--------|-------------|----------|
| The v1.0 generic rendered document | Full document through the existing sanitized markdown pipeline — tables, code, Mermaid, anchors, linkified mentions intact. | ✓ |
| Literal raw markdown in a code block | Verbatim file text, no rendering. Zero interpretation; loses tables/diagrams/links. | |
| Both, as two toggle states | Most complete, but three states on every document page for a single-user tool. | |

**User's choice:** The v1.0 generic rendered document
**Notes:** The per-type view becomes an interpretation layered over the reader that already works.

---

## License to reorder

### Q1 — Within the promoted region, may a manifest order things differently from the file?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — manifest declares promotion order | The promotion list IS the order. VIEW-03's "leads with what needs a human" becomes a one-line manifest fact rather than special-case code. | ✓ |
| No — promoted items keep file order | Simplest to reason about, hardest to misrepresent a document — but VIEW-03 would need the source file to already lead with human checks, which it doesn't. | |
| Yes, and views may also re-rank by status | Failing checks above passing, unselected options below the chosen one. Most useful at a glance, most interpretation layered over the file. | |

**User's choice:** Yes — manifest declares promotion order
**Notes:** Stops at declared order; status-based re-ranking was not taken and is recorded as deferred.

### Q2 — The view now departs from file order. How does the page stay honest about that?

| Option | Description | Selected |
|--------|-------------|----------|
| Each promoted block links to its source position | A quiet "in document" affordance resolving to the heading anchor; reuses rehype-slug anchors and the D-16 copy-link pattern. Auditable per item. | |
| Source toggle is the only signal | No per-block provenance; flip to Document source for the file's own order. Cleanest surface, uncluttered by meta-affordances. | ✓ |
| One provenance note per page | A single `source-note`-style line stating what was promoted and that the remainder follows. | |

**User's choice:** Source toggle is the only signal
**Notes:** Per-block provenance recorded as a deferred idea, revisitable if reordering proves disorienting.

### Q3 — A manifest promotes a section or field that this particular file doesn't have. What does the view do?

| Option | Description | Selected |
|--------|-------------|----------|
| Silently omit it | Absence is normal — GSD templates carry optional sections and the corpus is full of legitimately partial artifacts. Matches the v1.0 rule that dangling references are data, not warnings. | ✓ |
| Show the slot with an empty state | Distinguishes "no human checks" from "the view didn't look". Costs empty scaffolding on every partial document. | |
| Omit, but mark the document as partially matched | A quiet "matched N of M" chip signalling manifest drift without cluttering the body. | |

**User's choice:** Silently omit it
**Notes:** Manifest-drift signalling recorded as a deferred idea.

---

## Convention: where + how strict

### Q1 — Where does the written design language live?

| Option | Description | Selected |
|--------|-------------|----------|
| Repo doc + CLAUDE.md pointer | A real document owns the vocabulary; § Conventions in CLAUDE.md shrinks to a one-line pointer that survives regeneration. | ✓ |
| Inside `.claude/CLAUDE.md` § Conventions | Unavoidably in context when writing a new view. Risk: GSD-managed section, may be clobbered, bloats every prompt. | |
| Co-located with the CSS | Closest to the selectors it describes, least likely to drift — furthest from where a planning agent looks. | |

**User's choice:** Repo doc + CLAUDE.md pointer
**Notes:** Flagged before asking that CLAUDE.md's sections are GSD-managed and regenerated, so a long spec there is fragile.

### Q2 — UI-05 says a test must stop a new view from silently drifting. What does that test actually block?

| Option | Description | Selected |
|--------|-------------|----------|
| Class vocabulary allowlist | Derives sanctioned names from the doc, scans `className` literals, fails on anything outside the vocabulary. Forces reuse or an explicit doc amendment. | ✓ |
| Token/primitive lint only | Fails on raw hex/rgb, hardcoded px, non-token spacing. Cheap and zero false positives, but doesn't stop a view inventing its own heading or chip pattern. | |
| Structural conformance per registered view | Every registry entry must render the shared page skeleton. Tests shape rather than strings; weaker against bespoke chrome added on top. | |

**User's choice:** Class vocabulary allowlist
**Notes:** Chosen as the strictest reading of "cannot silently drift".

### Q3 — How does a view legitimately introduce a class name the vocabulary doesn't have?

| Option | Description | Selected |
|--------|-------------|----------|
| Reserved view-local namespace | Names under a declared per-view prefix are auto-allowed as view-private; anything else needs a doc amendment. Every shared name stays a deliberate act. | ✓ |
| Doc amendment is the only route | Maximum pressure toward reuse and a genuinely complete vocabulary. Costs friction on every internal element, 16 views over. | |
| Exception list in the test | Visible and greppable in one place — but a second vocabulary that drifts from the doc. | |

**User's choice:** Reserved view-local namespace

### Q4 — Does the vocabulary test also run over the existing dashboard, roadmap, traceability and search pages?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — they're the reference, so they must pass | The doc is derived from them, so they pass by construction; a failure means the vocabulary was written incompletely. Also stops the reference itself drifting. | ✓ |
| Document views only | Smallest blast radius; no risk of the phase turning into cleanup of out-of-scope pages. | |
| Yes, but reference-page failures are warnings | Two severities in one test — surfaces reference drift without blocking on pre-existing conditions. | |

**User's choice:** Yes — they're the reference, so they must pass
**Notes:** Explicitly bounded in CONTEXT.md D-10: when a reference page fails, the doc gains the name — the page is never rewritten, since REQUIREMENTS.md § Out of Scope forbids it.

---

## Reading surface: TOC + mentions

### Q1 — What does the outline list now that the page is a view rather than a plain document?

| Option | Description | Selected |
|--------|-------------|----------|
| The view's own sections | Mirrors what's on screen — promoted sections in promotion order, then the collapsed remainder as one entry. Stays truthful under reordering; the registry already knows the section list. | ✓ |
| Document headings, as today | Zero change to the data source and matches the Document-source view exactly — but would list headings the view has reordered or folded away. | |
| View sections, plus document headings nested under them | Richest navigation on long artifacts. More machinery, and the 18-entry cap gets tight fast. | |

**User's choice:** The view's own sections
**Notes:** Grounded in the current implementation — `outlineHeadings` filters to depth ≤ 3, caps at 18, hides below 2 (`artifact-page.tsx:60`).

### Q2 — READ-07 says the outline stays legible at every viewport width. What happens when the sticky left column doesn't fit?

| Option | Description | Selected |
|--------|-------------|----------|
| Collapses to a sticky disclosure above the document | Pinned under the page chrome; opening overlays the section list. Reachable at any scroll depth without eating width; reuses the existing disclosure pattern. | ✓ |
| Moves into normal flow above the document | Simplest possible behaviour — but on a long artifact only reachable by scrolling back to the top, which is most of what READ-07 is complaining about. | |
| Folds into the existing sidebar drawer | One narrow-width navigation surface instead of two; mixes cross-document with in-document navigation. | |

**User's choice:** Collapses to a sticky disclosure above the document

### Q3 — How does the outline show reading position?

| Option | Description | Selected |
|--------|-------------|----------|
| Active highlight, and the collapsed label names it | One active entry via IntersectionObserver, and at narrow width the disclosure label reads "On this page · <current section>". Position answerable without opening anything. | ✓ |
| Active highlight only | Smallest surface, one behaviour to test. At narrow width you learn nothing until you open it. | |
| Active highlight plus passed-section treatment | Reads as progress through the document; another visual state to hold consistent across light and dark. | |

**User's choice:** Active highlight, and the collapsed label names it
**Notes:** Phase 2's D-16 was restated before asking — scrolling must never rewrite the URL, so this tracking is visual only.

### Q4 — Given D-XX and WR-XX are phase-scoped, how does a mention resolve?

| Option | Description | Selected |
|--------|-------------|----------|
| Resolve within the containing phase only | Matches how the IDs are authored, so it's right by default and never links to the wrong phase's decision. A mention outside any phase directory stays plain text per D-17. | |
| Phase-local first, then whole corpus | Try the containing phase; fall back to a corpus-wide search and link if exactly one match exists. Catches cross-phase citations in PROJECT.md and MILESTONES.md. | ✓ |
| Phase-local, with a disambiguating preview when ambiguous | Never guesses wrong, but builds a second preview shape just for the ambiguous case. | |

**User's choice:** Phase-local first, then whole corpus
**Notes:** Two findings were surfaced before the question: (1) `D-01` is defined four separate times across the four phase CONTEXT.md files and `WR-01` appears 54 times across different REVIEW.md files, so there is no global namespace; (2) `ID_PATTERNS` has no `warning` scheme and `WR-01` currently matches `requirement`, so BACK-02 needs a new scheme with precedence — the same separation `decision` already solves.

### Q5 — D-14 locked preview-first for requirement, phase and plan IDs. Do D-XX and WR-XX follow that pattern?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — same preview, decision/warning-shaped detail | Reuses `reference-preview.tsx`; the type-specific detail is the decision statement or finding title plus the defining phase — exactly the disambiguation the global fallback needs. | ✓ |
| Yes for decisions, direct navigation for warnings | Fits how the two are used, at the cost of two behaviours for visually identical tokens. | |
| Direct navigation for both | Fewer steps when you know you want the source; departs from D-14, so the document surface would behave differently from the rest of the app. | |

**User's choice:** Yes — same preview, decision/warning-shaped detail

---

## Claude's Discretion

- Design-language doc filename and internal organisation; exact reserved view-local prefix spelling.
- Whether the vocabulary test parses or is generated from the doc, and how `className` literals are extracted.
- Manifest registry shape (data vs. small functions), provided it mirrors `HANDLERS` and keys on the granular `kind`.
- Disclosure mechanics, overlay placement, focus handling and transitions for the narrow-width outline.
- IntersectionObserver thresholds and root margins.
- The granular `kind` key names produced by splitting `frontmatter-only` and `unknown`.
- Wave decomposition inside the phase — ROADMAP.md's four-wave suggestion is an ordering, not a mandate.

## Deferred Ideas

- Per-block provenance links back to source heading anchors (rejected as D-05).
- Manifest-drift signalling — a "matched N of M" chip (rejected as D-06).
- Outline nesting document headings under view sections (rejected as D-11).
- Status-based re-ranking inside a promoted group (not taken in D-04).

No scope creep arose during discussion — all four areas stayed inside the phase boundary.

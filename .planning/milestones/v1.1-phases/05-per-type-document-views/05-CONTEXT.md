# Phase 5: Per-Type Document Views - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 makes every planning document legible as the kind of document it is. It delivers a per-kind
**view registry** mirroring the existing read-side `HANDLERS` registry, a granularised `kind` that
splits the two catch-alls (`frontmatter-only`, `unknown`) into real presentation keys, the
section-projection extractor built from the shipped `splitSections` / `splitSubsections` /
`parseMarkdownTable` primitives, a speculative structural fallback for unmanifested types, and a
registered view for all 16 known artifact types. Alongside that it writes the emergent design
language down as a documented convention enforced by a test, fixes the document outline's appearance
and reading-position tracking, and makes `D-XX` / `WR-XX` mentions resolve.

This phase does not add a purpose/category taxonomy (rejected 2026-09-20), does not adopt
`gsd-tools query`, does not rewrite the dashboard, roadmap, traceability or search pages — they are
the reference this conforms to — and does not add plan-vs-outcome deviation pairing (READ-08),
backlinks (BACK-01), faceted search (FIND-06) or file watching (PLAT-01).

</domain>

<decisions>
## Implementation Decisions

### View / Document-Body Relationship

- **D-01:** The per-type view is the page. The full rendered document is reachable through an
  explicit **Document source** toggle rather than sitting permanently beneath the view. Chosen so
  that "a discussion log reads as questions and choices" is literally true instead of showing the
  same `| Option | Description | Selected |` table twice — once promoted, once as raw prose.
  This revises Phase 2's D-09, which made the structured summary a compact lead into the always-
  present full document.
  — **Reversibility:** costly — every one of the 16 views is authored against this page shape, and
  reverting to lead-plus-body would rework each one plus the outline's data source (D-09 below).
- **D-02:** Content the manifest does **not** promote still renders inside the view, after the
  promoted region, in its original document order, **collapsed by default** behind a disclosure.
  Nothing is ever unreachable even when a manifest is thin or has gone stale against a newer GSD
  template, and the view stays tight.
- **D-03:** The **Document source** toggle shows the full document through the existing v1.0
  sanitized markdown pipeline — tables, code, Mermaid, heading anchors and linkified mentions
  intact. Not literal raw markdown text. The per-type view is an interpretation layered over the
  reader that already works, not a replacement for it.

### Promotion Order and Fidelity

- **D-04:** A manifest's promotion list **is** the render order. A view may present promoted
  fields/sections in an order that differs from the file. VIEW-03's "leads with what still needs a
  human" is therefore a one-line manifest fact, not special-case code. Document order is still
  preserved for everything in D-02's unpromoted remainder.
- **D-05:** No per-block provenance affordances. Promoted blocks do **not** carry "in document"
  back-links to their source heading anchors. The **Document source** toggle (D-03) is the single
  signal that the view has reordered and folded things; the view surface stays free of meta-chrome.
- **D-06:** A manifest that promotes a section or field the file does not contain **silently omits**
  it — no empty slot, no empty-state scaffolding, no partial-match chip. Absence is normal in this
  corpus (GSD templates carry optional sections, artifacts are legitimately partial). This extends
  Phase 1/2's rule that dangling references are data rather than warnings: attention states stay
  reserved for genuine read or parse degradation.

### Design Language Convention

- **D-07:** The design language lives in a **repo document** (e.g. `docs/design-language.md`) that
  owns the vocabulary — `status-chip[data-tone]`, `section-heading` (+ `.compact`), `empty-note`,
  `quiet-state`, `notice` / `notice destructive`, `source-note`, `source-link`, `eyebrow`, `lede`,
  `page-intro`, `page-stack`, and the `history-*` family. `.claude/CLAUDE.md` § Conventions —
  currently reading "Conventions not yet established" — shrinks to a one-line pointer at that doc,
  because CLAUDE.md's sections are GSD-managed and regenerated and would not hold a long spec.
- **D-08:** UI-05's enforcing test is a **class vocabulary allowlist**. It derives the sanctioned
  names from the design-language doc, scans `className` literals in view and page code, and fails on
  any name outside the vocabulary. Chosen over a token/primitive lint (which catches theme drift but
  not a view inventing its own heading or chip pattern) and over structural conformance checks
  (which test the shape but not bespoke chrome added on top).
- **D-09:** The escape route for genuinely view-private styling is a **reserved view-local
  namespace** — names under a declared per-view prefix (e.g. `view-discussion-log-*`) are
  auto-allowed. Every *shared* name therefore remains a deliberate, documented act, while a view can
  style its own internals without amending the doc. Not a test-side exception array, which would be
  a second vocabulary drifting from the first.
- **D-10:** The vocabulary test runs over the existing dashboard, roadmap, traceability and search
  pages too. The doc is derived from those four pages, so they should pass by construction; a
  failure means the vocabulary was written incompletely. **When a reference page fails, the fix is
  to add the name to the doc — never to rewrite the page.** Rewriting those pages stays out of scope
  per REQUIREMENTS.md § Out of Scope.

### Reading Surface — Outline (READ-07)

- **D-11:** The outline lists **the view's own sections** — the manifest's promoted sections in
  promotion order, then D-02's collapsed remainder as a single entry. Not `RenderedDocument.headings`
  as today, which after D-04's reordering and D-02's folding would link to positions that no longer
  match what is on screen. The view registry already knows the section list, so this does not
  introduce a second source of headings.
- **D-12:** At widths where the sticky left column does not fit, the outline **collapses to a sticky
  disclosure** pinned under the page chrome; opening it overlays the section list. It stays reachable
  at any scroll depth without consuming reading width. Rejected: dropping it into normal flow above
  the document (only reachable by scrolling to the top — which is most of what READ-07 objects to),
  and folding it into the narrow-width sidebar drawer (mixes cross-document with in-document
  navigation).
- **D-13:** Reading position is shown as a single **active entry**, tracked with an
  `IntersectionObserver` on section boundaries — **and at narrow width the collapsed disclosure's own
  label names the current section** (e.g. "On this page · Human verification"), so position is
  answerable without opening anything at exactly the width where the list is hidden. Per Phase 2's
  **D-16**, scrolling must **not** rewrite the URL; this tracking is visual only.

### Reading Surface — Mentions (BACK-02)

- **D-14:** `D-XX` and `WR-XX` resolve **phase-local first, then whole corpus**. A mention resolves
  against the definitions in its own phase directory; if none exists there, fall back to a corpus-wide
  search and link only when **exactly one** definition matches. Ambiguous or absent → plain text, per
  Phase 2's **D-17**. The fallback is what lets cross-phase citations in `PROJECT.md` and
  `MILESTONES.md` resolve at all.
  — **Reversibility:** reversible — resolution strategy is local to the mention-resolution layer.
- **D-15:** Both schemes follow Phase 2's **D-14** preview-first pattern, reusing
  `src/web/components/reference-preview.tsx`. Per Phase 2's **D-15**, the type-specific detail is the
  decision's own statement or the warning's finding title, **plus which phase defines it** — which is
  exactly the disambiguation D-14 above requires when the global fallback fires. One interaction
  across every ID scheme; no new pattern on the document surface.

### Claude's Discretion

- Exact filename and internal organisation of the design-language doc (D-07), and the exact spelling
  of the reserved view-local prefix (D-09).
- Whether the vocabulary test parses the doc or is generated from it, and how `className` literals are
  extracted (AST vs. source scan) — provided D-08's failure condition and D-10's scope hold.
- The precise registry shape for manifests, and whether manifests are data or small functions —
  provided it mirrors `HANDLERS` and is keyed on the granularised `kind`.
- Disclosure mechanics, overlay placement, focus handling and transitions for D-12, provided pointer
  and keyboard users get equivalent access.
- `IntersectionObserver` thresholds and root margins for D-13.
- The exact granular `kind` key names produced by splitting `frontmatter-only` and `unknown`.
- Wave decomposition inside the phase — ROADMAP.md's four-wave suggestion is a sound ordering, not a
  mandate.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope and Locked Milestone Facts

- `.planning/ROADMAP.md` § "Phase 5: Per-Type Document Views" — goal, 11 mapped requirements, five
  success criteria, the "Scope shape — read before planning" strategy table, and the suggested wave
  structure. **Read § Scope shape before sizing anything.**
- `.planning/REQUIREMENTS.md` — VIEW-01…06, READ-07, BACK-02, UI-04…06 are the complete Phase 5 set.
  **§ Implementation Context is the established-facts list a plan must build on rather than
  re-derive.** § Out of Scope names four exclusions, including rewriting the reference pages.
- `.planning/PROJECT.md` — core value, read-only boundary, one-project-per-run constraint, resolved
  stack, and the Key Decisions table carrying v1.0's locked rules.

### The Categorization Decision and Its Evidence

- `.planning/research/questions.md` — **the resolved categorization decision (2026-09-20)** and all
  five sub-question answers. No purpose taxonomy; extraction keys on where structure lives; `kind`
  goes granular; sidebar stays grouped by `location`; unrecognized types get a speculative structural
  read. This is the decision Phase 5 implements — do not re-litigate it.
- `.planning/notes/artifact-structure-survey.md` — the 425-file empirical survey that disproved the
  purpose axis and established the three-strategy partition.
- `.planning/notes/per-kind-artifact-rendering.md` — the three-axis diagnosis (parsing, design
  language, categorization). **Two claims were corrected 2026-09-20 and are marked as such in the
  file — read the correction blocks, not just the prose around them.**

### Prior Locked Decisions This Phase Must Honour

- `.planning/milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-CONTEXT.md` —
  D-09 (document-first canvas; **revised by D-01 above**), D-10 (unknown frontmatter fields stay
  visible), D-11 (PLAN pseudo-XML as semantic structure), D-13 (milestone-qualified routes;
  **costly to change**), D-14/D-15 (preview-first, type-aware preview content), D-16 (heading
  anchors never auto-rewrite the URL on scroll), D-17 (unresolved IDs render as plain text).
- `.planning/milestones/v1.0-phases/01-read-layer-domain-model/01-CONTEXT.md` — the read-layer
  contracts the view registry consumes. Note its decision IDs are a **separate** `D-01…D-16`
  namespace from Phase 2's, which is the fact D-14 above turns on.

### Code the Phase Builds On

- `src/planning-repo/handlers/index.ts` — the ordered `HANDLERS` registry the view registry mirrors.
  `GenericMarkdownHandler` must stay last (load-bearing comment at its declaration).
- `src/planning-repo/handlers/markdown-sections.ts` — `splitSections` / `splitSubsections` /
  `parseMarkdownTable`, shipping and tested; the section-projection extractor composes these.
- `src/planning-repo/handlers/frontmatter-only.ts` — stays a legitimate shared **parse** path. The
  granular-`kind` split is a presentation change, not a parser rewrite.
- `src/rendering/markdown.ts` — `renderPlanRange`, the only existing per-kind branch
  (`input.kind === 'plan'`).
- `src/rendering/frontmatter-views.ts` — `FRONTMATTER_PANEL_BUILDERS`, the closest existing analog
  to the manifest pattern.
- `src/server/index.ts` and `src/web/pages/artifact-page.tsx` — `artifact.structured` is serialized
  by the server and declared in the client DTO but **never read**; the "Document metadata" disclosure
  is built from `frontmatter` instead. Wiring `structured` through is foundation work.
- `src/web/pages/artifact-page.tsx` — `outlineHeadings` / `DocumentOutline`, plus
  `src/web/styles/globals.css` `.document-outline` and its media queries.
- `src/planning-repo/mentions.ts` — `ID_PATTERNS` has `requirement`, `decision`, `plan`, `phase` and
  **no `warning` scheme**; `WR-01` currently matches `requirement`. The header comments explain the
  precedence rules and the ReDoS constraints any new pattern must satisfy.
- `src/web/components/reference-preview.tsx` — the D-15 preview surface both schemes reuse.

### Visual Reference

- `src/web/pages/dashboard-page.tsx`, `roadmap-page.tsx`, `traceability-page.tsx`,
  `search-page.tsx` — the four pages the design-language doc is derived from and which D-10's test
  must also pass. Reference, not work items.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `HANDLERS` (`src/planning-repo/handlers/index.ts:18`) — a working ordered registry keyed by kind on
  the read side, with no counterpart on the display side. The view registry is its mirror.
- `FRONTMATTER_PANEL_BUILDERS` (`src/rendering/frontmatter-views.ts:54`) — an existing
  frozen-array-of-builders registry; the nearest shipped analog for how manifests should be shaped.
- `splitSections` / `splitSubsections` / `parseMarkdownTable`
  (`src/planning-repo/handlers/markdown-sections.ts`) — already shipping and tested. Section
  projection composes these rather than writing new parsing.
- `DocumentOutline` (`src/web/pages/artifact-page.tsx:66`) — exists and is already sticky
  (`globals.css:2821`). Filters to depth ≤ 3, caps at 18 entries, hides below 2. The gap is its data
  source (D-11), narrow-width behaviour (D-12) and position tracking (D-13) — not its existence.
- `scanMentions` / `ID_PATTERNS` / `stripCodeForScanning` (`src/planning-repo/mentions.ts`) —
  BACK-02 adds a scheme to a working scanner rather than building one.
- `reference-preview.tsx` — the preview surface D-15 reuses for both new schemes.

### Established Patterns

- One-way dependency: `planning-fs` → `planning-repo` → zero-I/O `domain`. View and route code
  consume repository/domain output and must not import filesystem code or handlers.
- Handlers' `match()` inspects only filename and location, never file content (DATA-02). The
  **speculative structural read** for unmanifested types is a *presentation-side* inference over
  already-parsed content — it must not push content sniffing back into handler matching.
- Status-like values and artifact kinds are open, not closed enums. The granularised `kind` must keep
  an unconditional fallback for values that do not exist yet.
- Dangling references are data (`resolved: null`), not warnings. D-06 and D-14 above are the same
  rule applied to manifests and to mention resolution.
- `local-fs.ts` is the sole `src/` importer of `node:fs`, pinned by a test gate. Nothing in this
  phase touches that.

### Integration Points

- Wire `artifact.structured` across the server→client boundary so views can read what handlers
  already extract (`src/server/index.ts` → `artifact-page.tsx`).
- Add the view registry beside the existing rendering layer, dispatching on granularised `kind` with
  an unconditional fallback to the D-03 generic document.
- Split `frontmatter-only` and `unknown` into real presentation kinds without changing which handler
  parses each type.
- Add a `warning` scheme to `ID_PATTERNS` with precedence over `requirement` — the same separation
  problem `decision` already solves against `requirement`, and subject to the same ReDoS bounds.
- Add the vocabulary test to the vitest suite, reading the design-language doc and scanning view/page
  `className` literals across both the new views and the four reference pages.

</code_context>

<specifics>
## Specific Ideas

- The phase goal's own framing is the acceptance feel: "a discussion log reads as questions and
  choices, a verification as what still needs a human, a plan as a plan" — and every one of them
  reads as the same application as the dashboard.
- DISCUSSION-LOG is the proof case and should go end to end early. Its anchor is the
  `| Option | Description | Selected |` table with `✓` (audited 12/12). The `**User's choice:**`
  prose line already has two spellings — treat it as tolerant enrichment, never the anchor.
- VIEW-03 needs no handler work: `human_verification[]` is already an array of
  `{test, expected, why_human}` on the wire. It needs a view that promotes the field instead of
  burying it in a collapsed metadata disclosure.
- The first type deliberately cannot be a quick task. Naming the design language (UI-04/UI-05) comes
  **before** multiplying surfaces against it, or each new view re-invents it slightly differently —
  the same drift already seen between `.page-stack` and `.artifact-page`, multiplied sixteen-fold.
- Views should be verified against real long-form GSD artifacts in both themes, not toy markdown —
  wide tables, code blocks, Mermaid, and the sparse/dense/stripped fixtures.

</specifics>

<deferred>
## Deferred Ideas

- **Per-block provenance links** — giving each promoted block an "in document" affordance back to its
  source heading anchor. Rejected as D-05 in favour of keeping the view surface free of meta-chrome;
  worth revisiting if the reordering in D-04 ever proves disorienting in practice.
- **Manifest-drift signalling** — a quiet "matched N of M" chip when a manifest promotes fields a file
  lacks. Rejected as D-06 for now; becomes interesting if GSD template churn starts silently hollowing
  out views.
- **Outline nesting document headings under view sections** — two-level navigation on long artifacts.
  Rejected as D-11 for scope; the 18-entry cap would need rethinking first.
- **Status-based re-ranking inside a promoted group** (failing checks above passing, unselected
  options below the chosen one). Not taken in D-04, which stops at declared order.
- Already tracked in `REQUIREMENTS.md § Deferred` and not re-opened here: READ-08 (deviation
  pairing), BACK-01 (backlinks panel), FIND-06 (faceted search — becomes practical *after* this
  phase's granular `kind`), NAV-08 (command palette), DASH-05, PLAT-01…04.

</deferred>

---

*Phase: 5-per-type-document-views*
*Context gathered: 2026-09-20*

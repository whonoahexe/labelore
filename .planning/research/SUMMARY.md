# Project Research Summary

**Project:** GSD Lore  
**Domain:** Local filesystem-backed read-only dashboard for GSD `.planning/` directories  
**Researched:** 2026-08-21  
**Confidence:** HIGH (domain research grounded in primary-source inspection of real `.planning/` trees and code-versioned GSD contracts; stack/features/architecture cross-validated across independent researcher findings)

## Executive Summary

GSD Lore is a read-only web viewer over structured markdown planning directories produced by the GSD orchestration tool. The core research finding is that **`.planning/` is not a schema, it is a filesystem-shaped event log** — GSD enforces conventions through a code-owned artifact registry that evolves between versions, and the most important architectural decision is treating this as an evolving surface, not a fixed contract.

The recommended approach is a **Vite 8 + React 19 SPA with a thin Hono/Node API server**, chosen not for lightness as a reflex but because this tool's actual constraints (CLI path argument as the primary entry point, no multi-user hosting, local-only deployment, explicit forward-compatibility obligations to future file-watching and write-back) point consistently toward that stack and away from Next.js's infrastructure. The stack is mature, dependencies are stable, and the tech choice is the least risky part of this project — the real risk lives entirely in the data layer: parsing a moving-target corpus correctly, degrading gracefully when optional artifacts are absent or unknown types appear, and building a parser boundary that doesn't preclude future capabilities like file-watching or write-back.

The three forward-compatibility boundaries are already named: (1) multi-project targeting (future registry/switcher), (2) live file-watching (v2+), and (3) write-back to drive GSD commands (furthest future). The proposed architecture handles all three by treating filesystem I/O as an abstract capability-flagged interface, keeping the parser pipelines and the UI completely separate from knowledge about where bytes come from. This is not premature abstraction — it is the cost of the project's own stated requirement: "works on any GSD project" without coupling to a specific version's output shape.

**Key risk: building the parser against studio-portal's shape instead of GSD's contract.** Studio-portal is a mature, two-milestone project with every optional artifact type present — the only real example to develop against — which creates constant pressure to special-case what's visible there rather than what GSD guarantees. This is the single biggest threat to shipping a tool that actually works on the next GSD project, and the mitigation (testing against a sparse fixture tree with a brand-new project's shape, plus a dense fixture with unknown artifact types) is not optional polish — it is the only thing that catches this class of bug.

---

## Key Findings

### Recommended Stack

**Decision: Vite 8 + React 19 SPA over Node/Hono, not Next.js 16.**

The decision is grounded in three concrete, project-specific pressures: (1) this tool is relaunched dozens of times against different `.planning/` directories, not deployed once — CLI-supplied path arguments are the primary entry point, and Vite's Node entrypoint can read `process.argv[2]` directly, while Next.js custom servers are now explicitly discouraged; (2) RSC's fs-read-with-no-API advantage is narrow here because the app needs request/response and streaming layers anyway (search queries, cross-reference click-through, file-watching in v2 requires SSE) — once that layer exists, RSC only saves handlers for the initial page load, not the whole surface; (3) dev-loop speed matters for a tool relaunched constantly, and Vite's esbuild-based HMR has measurably faster cold-start and rebuild than Next's Turbopack at this codebase scale.

**Core technologies:**
- **Vite 8.2.2:** Dev server + production bundler, "Backend Integration" pattern for Hono middleware-mode integration. Near-instant HMR and cold start.
- **React 19.2.8:** UI library, matches studio-portal's version. No reason to diverge.
- **Hono 4.13.3 + @hono/node-server 2.1.1:** Node API server, static file serving, owns the CLI entrypoint. Native `streamSSE` helper for the v2 file-watcher transport. Minimal ceremony for ~6 routes.
- **TypeScript 7.0.2:** Go-native compiler (default `latest` npm dist-tag as of 2026-08-21). 10x+ faster checking. Maturity risk is low for this codebase scale.
- **react-router 8.3.0:** Client-side routing (library mode, `createBrowserRouter`). Deep-linkable URLs for phases/plans/search. Refresh-on-deep-link still works. Use the unified `react-router` package directly, not `react-router-dom` (legacy re-export as of v7+).
- **@tanstack/react-query 5.101.4:** Server-state cache. Loading/error states for search and file-read endpoints. Actual reason to add it now: `queryClient.invalidateQueries()` is the entire client-side reaction to future file-watcher SSE events.

**Markdown/search pipeline:**
- **gray-matter 4.0.3:** YAML frontmatter extraction. Always wrap in try/catch (throws on malformed YAML by default).
- **unified 11.0.5 → remark-parse 11.0.0 → remark-gfm 4.0.1 → remark-rehype 11.1.2:** Markdown parsing chain (standardized unified pipeline).
- **rehype-raw 7.0.0 (with `allowDangerousHtml: true`):** Expand raw HTML embedded in markdown into hast nodes. Use immediately after remark-rehype.
- **rehype-sanitize 6.0.0:** Strip `<script>`, `on*` handlers, `javascript:` hrefs. Run **immediately after** `rehype-raw` and **before** any highlight/slug/link-rewrite plugins — order matters.
- **shiki 4.4.3:** Syntax highlighting. VS Code-quality grammars, dual light/dark via CSS variables. Create highlighter once at server startup (`createHighlighter()`, async), call synchronously per code block in a custom rehype plugin. Do not use `rehype-pretty-code` (unnecessary wrapper).
- **mermaid 11.17.0:** Diagram rendering. Skip server-side rendering (needs real DOM). Have the highlight plugin emit `<pre class="mermaid" data-mermaid-source="...">` placeholders; call `mermaid.run()` client-side in a `useEffect` after mount.
- **minisearch 7.2.0:** Full-text search index. Index-on-load is acceptable at this corpus scale; has good incremental `add`/`remove` API for future v2 watcher integration.

**Theme:**
- **@base-ui/react 1.7.0:** Headless primitives library, framework-agnostic (not Next-specific). Set `"rsc": false` in `components.json` when running `shadcn add`.
- **@tailwindcss/vite 4.3.3:** Tailwind v4 for Vite (direct equivalent of `@tailwindcss/postcss` for Next).
- **lucide-react, studio-portal's oklch token palette, shadcn `base-sera` style, squared-corner convention:** All portable directly from studio-portal.

**High confidence because:** framework choice is grounded in this tool's specific shape (CLI entrypoint, no hosting, local-only), not general opinion.

### Expected Features

**Must have (table stakes):**
1. STATE.md-driven dashboard (milestone, phase, status, progress bar, up-next/blocked panel)
2. Full roadmap rendering (phases, goals, success criteria, plans-in-waves, checkboxes, dependency shape)
3. Full-text search grouped by phase and artifact type with snippet highlighting
4. Directory-tree navigator mirroring `.planning/`'s real structure
5. Markdown rendering with proper support for tables, code blocks, checklists, frontmatter as structured panels
6. PLAN + SUMMARY paired reading view (structured pairing of `must_haves` ↔ `coverage`)
7. Requirement-ID cross-linking (plain-text mentions clickable to canonical source)
8. Requirements traceability view (requirement → phase → status)
9. Milestone history distinct from active milestone
10. Graceful degradation for missing/unknown artifacts (omit nav for missing, render unknown as markdown)

**Should have (competitive differentiators):**
1. Backlinks on requirements, decisions, phases (reverse index from ID-linking infrastructure)
2. Command palette (Cmd-K) for quick navigation (reuses search index)
3. Sticky table of contents / heading anchors on long documents
4. Static recent-activity strip on dashboard (`STATE.md`'s Decisions log + Quick Tasks table)
5. Faceted search by requirement/decision ID (depends on ID registry)

**Anti-features to NOT build:**
- Graph view (hairball of hub nodes, shows no status, expensive to build well)
- Kanban board (GSD workflow is linear, no lateral drag-to-reorder)
- Gantt timeline (GSD has no scheduled calendar dates)
- Any write-back affordance (violates read-only constraint)

### Architecture Approach

System built as two clean layers separated by a boundary that admits multi-project, watch, and write capabilities without restructuring.

**Layer A: PlanningFilesystem** — abstract file-tree contract (list, read, exists, optional watch/write, gated by `capabilities` flag). v1 implements `LocalFsPlanningFilesystem` (Node `fs`). Future implementations: `WatchedFsPlanningFilesystem`, `WritableFsPlanningFilesystem`, `MultiProjectRegistry`.

**Layer B: Parsing Pipeline** — discovery, registry-based per-artifact-type parsing with GenericMarkdownHandler fallback, cross-reference resolution, atomic snapshot-based caching. Single `ProjectSnapshot` holds entire resolved graph; `refresh()` rebuilds and atomically swaps.

**Key patterns:**
- **Filename-pattern dispatch:** Use filename convention (the signal GSD itself relies on), not frontmatter shape (varies by artifact type).
- **Registry-with-mandatory-fallback:** Unknown artifact types still become `Artifact { kind: 'unknown', title, body }` and render as markdown.
- **Snapshot-based load with refresh() seam:** All at once, atomically swapped. Future watcher calls identical `refresh()` function without restructuring.

**Proposed 4-phase build order:**
1. **Phase A:** Read layer foundation (fixture testing against sparse/dense trees required)
2. **Phase B:** Situational-awareness UI + rendering
3. **Phase C:** Search & navigability
4. **Phase D:** Polish, degradation hardening, final QA

### Critical Pitfalls

**1. Building parser against studio-portal's shape, not GSD's contract.**
Studio-portal is the only real example — the only thing to develop against — which creates pressure to special-case what's visible rather than what GSD guarantees. Sparse projects have no `ROADMAP.md`, no `phases/`, sparse `STATE.md`. Phase numbering restarts per-milestone (v1's Phase 1 ≠ v2's Phase 1). *Mitigation:* Test against two synthetic fixtures (sparse fresh project + dense unknown-type project) as golden-file snapshot tests. This is not optional polish.

**2. GSD's pseudo-XML plan structure is not HTML-safe markdown.**
`PLAN.md` contains literal angle-bracket tags (`<objective>`, `<task>`, `<decision>`) for LLM/human reading, not HTML. CommonMark's HTML-block rules can swallow markdown inside a `<decision>` block. *Mitigation:* Test real `PLAN.md` (e.g., `02-01-PLAN.md`) and confirm nested markdown survives. Escape unrecognized tags to visible text, not raw HTML passthrough.

**3. Treating markdown as a queryable data source.**
Checkboxes appear in ≥4 semantic contexts (requirement status, phase status, task status, ad-hoc checklists). Counting them produces plausible-but-wrong progress numbers. *Mitigation:* Read structured facts ONLY from frontmatter (`STATE.md`'s `progress` block), not from parsing checkboxes elsewhere. Treat prose as a document to render, not a database to query.

**4. Frontmatter/JSON errors crash the whole page.**
Frontmatter is real YAML with nested structures; any can be malformed, missing fields, or type-changed between versions. *Mitigation:* Parse defensively (every parse wrapped, optional chaining/defaults, never propagate exceptions past the parse boundary). Failure isolation per-file, not per-page.

**5. Showing confidently stale data with no watcher.**
V1 has no file watcher (reads on load + explicit refresh). Without visible timestamp, users trust stale data. *Mitigation:* Record load timestamp and show it persistently. Provide obvious refresh action. Design read layer so watcher can drop in later without restructuring.

---

## Implications for Roadmap

### Phase 1: Data Layer & Domain Model Foundation

**Rationale:** Everything downstream depends on a clean, tested, forward-compatible read layer. Pitfall #1 (overfitting) is architectural and must be solved before UI is built. Layer A/B separation is the seam admitting multi-project, watch, and write capabilities. Testing against two synthetic fixtures is the only way to catch overfitting.

**Delivers:**
- `PlanningFilesystem` interface + `LocalFsPlanningFilesystem` implementation
- Discovery pass, registry-based parsing, GenericMarkdownHandler fallback
- Full cross-reference resolution (requirement IDs, phase refs, decision mentions, dangling refs handled gracefully)
- Atomic `ProjectSnapshot` with domain model (Project, Milestone, Phase, Plan, Summary, Requirement, Artifact, Decision mentions index)
- Per-file error isolation
- Non-UI harness that dumps snapshot as JSON for testing against fixtures

**Avoids:** Pitfalls #1, #3, #4, #9 (path handling)

**Research flags:** None required — this is direct application of GSD's documented shapes and standard patterns.

### Phase 2: Situational-Awareness UI & Rendering

**Rationale:** Phase 1 exits with tested snapshot. This phase uses that to build "where am I" UX: dashboard, full roadmap, markdown renderer with cross-reference linking. Proves pseudo-XML safety and HTML sanitization with real `PLAN.md`.

**Delivers:**
- Landing dashboard (milestone, phase, status, progress, up-next/blocked from `STATE.md`)
- Full roadmap view (phases, goals, success criteria, plans-in-waves, checkboxes, dependency diagram)
- Markdown pipeline (proper syntax highlighting, sanitization, pseudo-XML tag safety)
- Cross-reference link rewriting (`AUTH-01` → clickable route)
- Per-kind view-component registry + GenericMarkdownView fallback
- PLAN + SUMMARY paired view
- Milestone history as distinct read-only view

**Avoids:** Pitfalls #2 (pseudo-XML with real test), #7 (unsafe HTML), #10 (theme drift)

### Phase 3: Full Navigability, Search & Traceability

**Rationale:** Phases 1-2 deliver "where am I" and "read properly" pains. This tackles "find that thing": full-text search, tree escape-hatch, requirements traceability.

**Delivers:**
- Full-text search index (from source markdown, not rendered HTML), grouped by phase/artifact type
- Lazy/incremental index build (off critical startup path)
- `/browse` tree view escape-hatch
- Requirements traceability view
- Foundation for faceted search and backlinks

**Avoids:** Pitfall #8 (source-not-rendered indexing, match context, exact-token boosting)

### Phase 4: Polish, Degradation Hardening & Final QA

**Rationale:** Phases 1-3 deliver full product. This phase proves it works on ANY GSD project, not just studio-portal. Test against broken/sparse/unknown-type fixtures. Wire explicit refresh action (the exact seam v2's watcher will call).

**Delivers:**
- Explicit "Refresh" action wired to `repository.refresh()`
- Error-state UI for every failure mode
- Golden-file tests against sparse + dense + malformed fixtures
- Empty-state UI
- Visual QA (both themes, real rendered content)
- Load timestamp visible on every view
- Path argument robustness (relative, `~`, symlinked paths)

**Avoids:** All pitfalls proven in practice against adversarial fixtures

### Phase Ordering Rationale

1. **Strict dependency chain (1 → 2 → 3 → 4).** Phase 2 and 3 consume Phase 1's snapshot. Phase 3 uses Phase 2's rendering conventions. Phase 4 exercises all three adversarially.

2. **Pitfall mitigation forces order.** Overfitting must be caught in Phase 1. Pseudo-XML/HTML safety must be proven in Phase 2. Markdown-as-data is Phase 1 design. Frontmatter isolation is Phase 1-2 infrastructure. Search source-text indexing is Phase 3's core choice.

3. **Forward-compatibility seams proven incrementally.** Phase 1 proves `PlanningFilesystem` interface. Phase 2 proves routes never call Layer A. Phase 3 proves snapshot is read-only. Phase 4 proves refresh seam works (same code manual button and future watcher will call).

4. **Coarse phase granularity (3-5 phases).** 4 phases fits project's own configuration; each is 1-2 plans at coarse granularity.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | Grounded in this tool's specific constraints (CLI, local-only, forward-compat obligations). Every version verified current 2026-08-21. Mature, no alpha/beta. |
| **Features** | HIGH | Grounded in real studio-portal, GSD Lore's PROJECT.md (three confirmed pains), cross-checked against Linear/Jira/GitHub Projects, Docusaurus/MkDocs, Obsidian. Table-stakes unanimous; differentiators grounded in corpus's unique properties (ID-based cross-refs). |
| **Architecture** | HIGH | Derived from PROJECT.md's forward-compat obligations and studio-portal's real structure. Layer A/B is standard repository pattern. Patterns are established (not invented). |
| **Pitfalls** | HIGH | Grounded in studio-portal (where manifesting) and gsd-core/templates (where preventable). Ten pitfalls with concrete examples, mitigation, recovery costs. |

**Overall confidence: HIGH**

### Gaps to Address

1. **gsd-tools query API vs. self-contained parser.** GSD-DOMAIN recommends using `gsd-tools query roadmap analyze`, `query progress`, etc. for structural facts. ARCHITECTURE designs independent parser. Not mutually exclusive — Phase 1 planning should scope whether calling out to `gsd-tools` for roadmap/progress is a post-launch v1.x optimization (would eliminate parser drift).

2. **Search corpus scope and indexing strategy.** Phase 3 planning should confirm: which file types indexed, eager vs. lazy/incremental build? *Recommendation:* Index all artifact bodies (frontmatter-stripped) + requirement/decision IDs as boosted tokens. Build eagerly at startup for v1 (acceptable at scale, <1s).

3. **Decision ID and Pitfall ID cross-reference.** Decision/pitfall IDs are loose (scattered as inline prose mentions). Currently planned as v1.x stretch goal. *Recommendation:* Phase 1 should build decision/pitfall mentions index during assembly (zero cost), so Phase 2 link-rewrite supports it without Phase 3 rework.

4. **Test fixture coverage.** Two fixtures (sparse + dense) required. Should "dense" include all documented artifact types (`SPEC.md`, `AI-SPEC.md`)? *Recommendation:* Include all documented types from templates that studio-portal doesn't have. Only way to validate "any GSD project" is achievable.

---

## Sources

### Primary (HIGH confidence)
- `/home/cinedise/gsd-lore/.planning/PROJECT.md` — Project charter (scope, pains, constraints, forward-compat obligations)
- `~/studio-portal/.planning/` (live inspection) — Real mature GSD project (STATE.md, ROADMAP.md, REQUIREMENTS.md, config.json, MILESTONES.md, phases/, quick/, milestones/)
- `~/.claude/gsd-core/templates/` and `gsd-core/bin/lib/artifacts.cjs` — Artifact registry (CANONICAL_EXACT, CANONICAL_PATTERNS), authoritative contract
- `gsd-core` source (`phase-id.cjs`, `init.cjs`, `roadmap.cjs`, `configuration.cjs`) — Phase/quick/milestone naming grammar, internal parsing code proving recommended regexes

### Secondary (MEDIUM confidence)
- Vite official "Backend Integration" guide — Confirmed middleware-mode pattern is sanctioned approach
- Next.js official "Guides: Custom Server" — Confirmed discourages custom servers (this project's CLI path argument is the exception)
- shadcn/ui Vite installation docs — Confirmed officially supported with same CSS-variables/Tailwind-v4 model
- MiniSearch, FlexSearch, Lunr, Fuse.js official API docs — Incremental update support verified directly
- react-markdown guidance on `rehype-raw` + `rehype-sanitize` — Plugin-order gotcha confirmed widely-documented
- Obsidian graph view debate (CodeCulture, Eleanor Konik) — Community consensus on graph utility (or lack thereof)

### Tertiary (LOW confidence)
- `@base-ui/react` framework-agnosticism — Architectural but not tested directly; verify on first `shadcn add`
- TypeScript 7.0.2 on this codebase — Native Go compiler, default `latest`, high maturity (no advanced type-metaprogramming); verify on first setup

---

*Research completed: 2026-08-21*
*Ready for roadmap: yes*

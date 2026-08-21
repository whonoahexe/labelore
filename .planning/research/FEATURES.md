# Feature Research

**Domain:** Local read-only dashboard over a structured planning/knowledge directory (project-status dashboard + docs browser, single-user, local-first)
**Researched:** 2026-08-21
**Confidence:** HIGH (grounded directly in a real, mature `.planning/` tree — `~/studio-portal`, gsd-core 1.11.0 — cross-checked against known patterns from Linear/Jira/GitHub Projects, Docusaurus/MkDocs Material/Obsidian/Foam/Dendron/Quartz, and Storybook/coverage-report/git-log-viewer style local tools)

## What GSD Artifacts Actually Look Like (grounds everything below)

Read directly from `~/studio-portal/.planning/`:

- **`STATE.md`** carries a real YAML frontmatter block (`milestone`, `current_phase`, `status`, `stopped_at`, `progress: {total_phases, completed_phases, total_plans, completed_plans, percent}`) plus a body with an ASCII progress bar, a milestone plan table, a dependency-shape diagram, a **chronological decisions log** (50+ one-line entries tagged `[Phase ?]`), a **Blockers/Concerns** section split into Operational/Security/Observability/Process, a **Quick Tasks Completed** table, and **Operator Next Steps**. This is the single highest-value file for "where am I" — it is already 90% structured.
- **`ROADMAP.md`** has phase checkboxes, a text dependency diagram, per-phase Goal/Depends-on/Requirements/Success-Criteria/Plans-in-waves/UI-hint/Notes, and two summary tables at the bottom (Progress, Requirement Coverage). Waves within a phase carry inline blocking notes (`*(blocked on Wave 1 completion)*`).
- **`REQUIREMENTS.md`** groups requirement IDs (`AUTH-01`) by feature area, has an amendment callout block referencing a specific `CONTEXT.md` anchor, a Future Requirements section, an Out of Scope section with reasoning, and a full **Traceability table** (requirement → phase → status).
- **`PLAN.md`** (`NN-MM-PLAN.md`) frontmatter is dense and highly structured: `requirements: [...]`, `depends_on`, `estimate`, `must_haves: {truths, prohibitions, artifacts, key_links}` (each `key_links` entry names a `from`/`to`/`via`/`pattern`), followed by an `<objective>`, `<scope_note>`, `<execution_context>` (file includes), `<context>` (more file includes), and `<artifacts_this_phase_produces>`.
- **`SUMMARY.md`** frontmatter is *more* structured than the plan it summarizes: `requires`/`provides`/`affects` (phase-to-phase plan dependency chain), `tech-stack: {added, patterns}`, `key-files: {created, modified, deleted}`, `key-decisions` (prose, each referencing a decision ID like `D-18`), `patterns-established`, `requirements-completed`, and a **`coverage`** array — one entry per truth from the plan's `must_haves`, each with an `id` (`D1`, `D2`...), a `requirement`, one or more `verification` entries (`kind`, `ref` — a literal `path#test_name` or file citation, `status: pass`), and `human_judgment: true/false` with a `rationale` when a claim can't be automatically verified.
- **`LEARNINGS.md`** is generated *from* the above — Decisions / Lessons / Patterns / Surprises, each with a one-line title, body, and a `**Source:**` back-reference to the specific `SUMMARY.md` (sometimes a specific deviation number within it).
- **Cross-references are informal, not links.** IDs like `AUTH-01`, `D-05`, `D-18`, `HARDEN-02`, `WR-03`, `PITFALLS P1` are mentioned in prose throughout `PROJECT.md`, `ROADMAP.md`, `REQUIREMENTS.md`, every `PLAN.md`, every `SUMMARY.md`, and `LEARNINGS.md` — but **none of them are markdown links**. GSD's own convention is plain-text ID citation, trusting a human reader (or `grep`) to connect them. This is the single most important technical fact for this research: "clickable cross-references" is not a matter of rendering existing links — it requires building an ID registry and a prose-scanning linkifier from scratch.
- **`quick/<slug>/`** entries and **`milestones/`** archives follow the same PLAN/SUMMARY shape at smaller or larger scale, plus `MILESTONE-AUDIT.md`, archived `ROADMAP.md`/`REQUIREMENTS.md` snapshots, and archived phase trees.
- Deviations are a first-class, expected concept — nearly every `SUMMARY.md` documents where execution departed from the plan (e.g., "two review findings survived to the verification pass", "Task 3 revealed the entire phase had never been deployed"). The plan is the *intent*; the summary is the *ground truth*; they routinely disagree in informative ways.

---

## Feature Landscape

### 1. Situational awareness — what earns its place

GSD's workflow is **strictly linear**: milestones → phases (sequential, with an explicit named dependency shape) → waves within a phase (explicitly blocking) → plans within a wave. This is closer to Jira's "epic → sprint → ticket" or Linear's "initiative → project → issue" than it is to a free-form kanban board, but it is **more constrained than either** — GSD phases don't move backward through statuses, don't get re-prioritized on a board, and don't have WIP limits to visualize. That constraint should drive what gets built:

- **Progress bar / percent-complete** — genuinely earns its place. `STATE.md` frontmatter already computes it (`progress.percent`, `completed_phases/total_phases`, `completed_plans/total_plans`). Rendering the number GSD already computed is nearly free and answers "where am I" in one glance, exactly like Linear's project progress bar (percentage from closed vs. total issues) or GitHub Projects' completion chip.
- **"Up next" / "what's blocked" panel** — earns its place, and GSD half-builds it already: `STATE.md`'s `stopped_at`, `Blockers/Concerns`, and `Operator Next Steps` sections are exactly this content, just as prose. Surfacing them as a dedicated panel (rather than making the user scroll a long markdown file) is high-value, low-risk — it's a rendering problem, not a data-modeling problem.
- **Status badges per phase** (`not started` / `in progress` / `complete`, wave-blocked) — earns its place. `ROADMAP.md`'s checkboxes plus wave-blocking notes already encode this; a badge is just checkbox-to-chip translation.
- **Kanban board** — **cargo cult here.** GSD phases don't move sideways between statuses a user drags them through; they move forward through a fixed sequence the roadmap already dictates, and a kanban implies drag-and-drop reordering, which is a write operation this tool must never have. A kanban board would visually restate `ROADMAP.md`'s checkbox list using a much more expensive layout, for a workflow with no lateral movement to show. Skip it.
- **Timeline / Gantt** — **cargo cult here.** GSD doesn't carry calendar-scheduled start/end dates per phase — it carries *actual elapsed duration after the fact* (`STATE.md`'s Performance Metrics: "Longest single plan: 01-03 (~45min)") and a *dependency shape*, not a schedule. A Gantt chart implies scheduled dates and would have to fabricate them. The dependency diagram already in `ROADMAP.md`/`STATE.md` (a simple text arrow-graph: `Phase 1 → Phase 2 → Phase 3`, `∥` for parallel) is the correct visualization primitive — render it as a small horizontal flow, not a calendar.
- **Activity feed** — partially earns its place. `STATE.md`'s Decisions log and Quick Tasks table are already a reverse-chronological activity record; surfacing the most recent N entries as a feed-style panel on a landing dashboard is cheap and genuinely useful. A live/streaming activity feed (à la a real-time Jira audit log) is explicitly out of scope (no file-watching in v1) — a *static* "recent activity" read on load/refresh is the right-sized version.
- **Milestone history strip** — earns its place, is explicitly required (PROJECT.md), and Linear/GitHub Projects both do a version of this (past cycles/milestones shown distinct from the active one). GSD's `MILESTONES.md` + `milestones/` archive already has the data; this is a rendering and navigation problem, not new data.

**Verdict:** progress bar, status badges, up-next/blocked panel, a small dependency-flow diagram, and a static recent-activity strip are all warranted. Kanban and Gantt are not — they would visualize workflow shapes GSD's data model doesn't have.

### 2. Search UX — what developers actually reach for

Comparable prior art: MkDocs Material ships a client-side Lunr-indexed instant search with typeahead suggestion, snippet highlighting, and a tokenizer tuned for docs prose — no server round-trip, because the corpus is static once built. Command-palette tools (Linear, Raycast, VS Code, cmdk-powered UIs) default to Cmd-K opening a modal with fuzzy (subsequence, not substring) matching and instant results as you type, with a global keyboard shortcut so it's reachable from anywhere in the app.

For GSD Lore specifically:

- **Instant/as-you-type over submit-and-wait.** The corpus is small (hundreds of markdown files, not millions) and entirely local — there is no reason to make the user press Enter. This is a solved problem at this scale (client-side or in-process indexing, e.g. a simple inverted index or something like MiniSearch/Lunr/FlexSearch) and instant feedback is what every comparable local tool (MkDocs Material, VS Code's file search, `fzf`-style CLI tools) converges on.
- **Result grouping is essential, snippet highlighting is essential — GSD's own directory taxonomy is the grouping key.** A flat result list across hundreds of `PLAN`/`SUMMARY`/`LEARNINGS`/`REVIEW`/`RESEARCH` files is close to useless; group by phase, then by artifact type (the same taxonomy `PROJECT.md` already names: root docs / `phases/` / `quick/` / `milestones/` / `research/`). Snippet highlighting matters more here than in most docs search, because the payload is dense technical prose (decision rationale, deviation writeups) where the matching sentence, not just the filename, is the answer the user came for.
- **Command palette (Cmd-K) *and* a dedicated search experience are not actually in tension — build one index, two entry points.** A Cmd-K palette is the fast path for "I know roughly what I'm looking for" (jump to a phase, jump to a requirement ID, jump to a file by name) the way Linear/Raycast use it. A dedicated, larger search surface (with grouped results and visible snippets, not a truncated dropdown) is what's actually needed for "I remember we decided something about rate limiting somewhere, where" — the kind of query the Q&A in the milestone context calls "buried artifacts." Both read from the same full-text index; the palette is the narrow always-available entry point, the search page is where you actually read results. Developers reach for Cmd-K to *navigate*; they reach for a real search results page to *investigate*. GSD Lore needs both because it has both use cases.
- **Faceting by requirement ID / decision ID is a natural extension once the ID registry (below) exists** — e.g., filter search to "everything mentioning AUTH-01." This is a differentiator, not table stakes, because it depends on the cross-reference infrastructure being built first.

### 3. Navigation and cross-linking — and the graph-view question, answered directly

- **Sidebar tree mirroring `.planning/`'s real structure is table stakes.** This is the "navigation covers walking a structure you already understand" half of the confirmed findability requirement. It should mirror the actual taxonomy — root docs, then `phases/NN-slug/` (each phase itself expandable to its plan/summary/context/etc. files), `quick/`, `milestones/`, `research/` — not a flattened file list. Docusaurus and MkDocs Material both validate this as the default expectation for any docs browser: a persistent, collapsible tree keyed to the real directory shape.
- **Breadcrumbs are table stakes and nearly free** given the tree already encodes the hierarchy (`Phase 01 → 01-01-PLAN.md`).
- **Requirement-ID cross-linking is the most important navigation feature in this entire research area, and it is a differentiator, not something any of the comparable tools hand you for free.** Docusaurus/MkDocs/Obsidian all assume the *author* writes `[[wikilinks]]` or markdown links; GSD authors write plain-text IDs (`AUTH-01`, `D-18`, `WR-03`) with the expectation that a human (or `grep`) resolves them. Building this requires: (1) a registry pass that establishes canonical sources for each ID class — requirement IDs from `REQUIREMENTS.md`'s definitions, decision IDs from `PROJECT.md`'s Key Decisions table and each `SUMMARY.md`'s `key-decisions`, phase/plan numbers from the directory structure itself; (2) a prose-scanning linkifier applied at render time that turns any occurrence of a known ID into a link to its canonical source. Requirement IDs are the highest-value, lowest-ambiguity case (fixed format `AREA-NN`, defined once in `REQUIREMENTS.md`, referenced identically everywhere) and should be table stakes given it's explicitly named in scope ("requirement ID → the phase covering it"). Decision IDs (`D-05`, `D-18`) and pitfall IDs (`P1`) are looser — a `D-18` can be *defined* inline in a `SUMMARY.md`'s prose rather than in a single canonical table — so treat those as a stretch differentiator layered on the same infrastructure once requirement-ID linking proves the pattern.
- **"What references this" (backlinks) is a genuine differentiator here, more so than in a typical wiki**, precisely because GSD's cross-references are invisible without tooling. In Obsidian, backlinks are somewhat redundant with the fact that you wrote the `[[link]]` yourself and remember roughly where; in GSD, nobody today can answer "which other files mention D-18" without `grep`. A backlinks panel on a requirement, decision, or phase page is one of the few features here that is strictly better than reading the files by hand, which is this project's own bar for a differentiator. It depends on the ID registry and linkifier existing first (same reverse index, other direction).
- **Graph view — direct answer: not warranted, don't build one.** The case against, specific to this project: (1) Obsidian's own community consensus (per current discussion) is that the graph is "more fun to look at than navigate," useful mainly for small vaults early on, and shows no note status, priority, or staleness — exactly the information GSD Lore's users actually need (is this phase done, is this decision still current) and exactly what a force-directed node/edge graph cannot encode without becoming a second dashboard bolted onto the first. (2) GSD's link density would be worse than a hand-authored wiki's, not better — the connections between a `PLAN.md` and everything that cites its requirement or decision IDs would need to be *inferred* by the same linkifier described above, and a phase with 10 plans, each touching 5-10 requirement/decision IDs, produces a hairball with a few hub nodes (the phase itself, common decisions) and no discoverable structure beyond "yes, everything in this phase is related to this phase" — information the sidebar tree already conveys for free. (3) It actively worsens the "single developer, personal tool" cost equation this research is told to weigh: a graph view is expensive to build well (force-directed layout, zoom/pan, node styling by type, performance at hundreds of nodes) and, per the anti-features guidance, is a textbook example of a feature "that seem[s] good but create[s] problems" — it's the single most likely feature in this whole landscape to be built, admired once, and never opened again. Skip it. If a visual summary of relationships is wanted later, a simple filtered backlinks list ("things that reference Phase 2") gives 90% of the value a graph promises, at a fraction of the cost, and — critically — it can express status and type (a decision vs. a phase vs. a requirement) as plain text and color, which a graph node cannot do legibly at this density.

### 4. Document rendering — what matters for long technical planning documents

`PLAN.md`/`SUMMARY.md` documents run long (the `01-01-PLAN.md` frontmatter alone is ~150 lines before the body starts) and are dense with nested structure (YAML arrays of objects, XML-tag-delimited body sections). This is a materially different rendering problem than a typical docs page:

- **Frontmatter must render as structured panels, not a raw YAML dump or an afterthought.** `must_haves.truths`, `must_haves.artifacts`, `key_links`, `coverage` (with its per-item `verification` sub-array and `status: pass/fail` and `human_judgment` flag) are the load-bearing content of a plan/summary — arguably more informative than the prose body. A generic markdown renderer that shows frontmatter as a collapsed code block or skips it entirely would bury the most useful part of the document. This should be a first-class structured view: a table for `must_haves.truths`, a table for `coverage` with pass/fail/human-judgment badges, a small graph-free list for `key_links` (from → via → to).
- **Collapsible sections are important specifically because these documents are long and skimmable-by-design.** A user reviewing a plan usually wants the objective and success criteria first, the task list second, and the full estimate/key_links detail only on demand. Sensible defaults: frontmatter structured panels open by default (they're why the user is here), long prose sections (objective, scope_note) open, deeply nested detail (raw `key_links` patterns, `artifacts_this_phase_produces`) collapsed.
- **Sticky table of contents / heading anchors matter more here than in a typical README** because `LEARNINGS.md` and long `SUMMARY.md`/`REVIEW.md` files have real internal structure (Decisions/Lessons/Patterns/Surprises, each a `###` heading) a reader wants to jump between, and because deep-linking to a specific coverage item or decision from a search result or a backlink requires stable anchors.
- **Code highlighting** is needed but modest in scope — GSD documents embed code fences (Rust/TS snippets, shell commands, file paths) rather than being code-first documents; standard fenced-block highlighting (no need for full LSP-grade semantic highlighting) covers it.
- **PLAN + SUMMARY as one reading experience, not two separate files, is an explicitly confirmed requirement and is genuinely differentiating** — this is the single clearest case in this whole research where the dashboard beats reading files by hand. A side-by-side or tabbed "plan vs. what actually happened" view, with the summary's `deviations`/`coverage` visually anchored back to the plan's `must_haves` they satisfy, directly serves the third confirmed pain ("reviewing plans/output"). A literal diff view (line-level PLAN vs SUMMARY text diff) is *not* warranted — they're different documents describing intent vs. outcome, not two versions of the same document, so a text diff would produce noise, not insight. What's warranted instead is a **structured pairing**: each `must_haves.truths` entry from the plan matched to its `coverage` entry in the summary (same `requirement`/near-identical wording), rendered together.
- **Reading width** should follow standard prose-reading conventions (a constrained max-width column, not full browser width) — these are long-form technical documents meant to be read start to end, same as any docs site, not dashboards meant to be scanned as a grid.
- **Print/export** is low-value here and should not be built for v1: GSD documents are not meant to leave the machine (this is an explicitly personal, unpublished tool per PROJECT.md's Out of Scope), and a browser's native print-to-PDF already works adequately against clean, print-respecting CSS with zero additional feature work — so this is a "make sure normal browser print isn't actively broken" concern, not a feature to build.
- **Checklists and tables**, GSD's other common markdown constructs (`- [x]` roadmap checkboxes, requirement tables, Traceability tables), need to render as real checkboxes/tables, not literal `[x]` text — standard markdown-renderer table stakes, but worth naming because GSD leans on them heavily (every `ROADMAP.md`, every `REQUIREMENTS.md`, every plan's must_haves).

### 5. Anti-features — what this space builds that gets abandoned, and why to skip each

Specific to a single-developer local tool, where every skipped feature is real time saved:

- **Graph view.** Covered above in depth — visually impressive, situationally useless for this data shape, expensive to build well. Skip.
- **Kanban board.** Restates data `ROADMAP.md` already encodes, in a much more expensive UI, for a workflow with no lateral movement. Skip.
- **Gantt/timeline chart with scheduled dates.** GSD doesn't produce calendar-scheduled dates to plot; only after-the-fact durations and a dependency shape. Building a Gantt would mean inventing dates the data doesn't have. Skip; use a lightweight dependency-flow diagram instead.
- **Any write-back / editing UI.** Explicitly and correctly out of scope per PROJECT.md — GSD's slash commands own the invariants of these files (e.g., the last-admin-invariant-style guarantees baked into GSD's own generation logic), and a viewer that can write can corrupt planning state a viewer that can't write never can. This is the project's own stated reasoning and it's correct; don't relitigate it mid-build by adding "just a quick inline edit" for convenience.
- **Live file-watching / websocket push updates.** Explicitly deferred to v2 in scope. Real infrastructure (watcher + transport + client state invalidation) for a personal tool that's opened, read, and closed — read-on-load-and-explicit-refresh is sufficient for how this tool is actually used, and the read layer should just be built so a watcher can be added later without a rewrite.
- **Multi-project registry/switcher.** Explicitly deferred. Adds discovery, persistence, and a "which project am I looking at" state machine for a v1 that only ever needs to open one path at a time.
- **AI-assisted search / "ask your docs" chat.** Tempting given the corpus is dense technical prose an LLM could summarize well, but it's a large new dependency surface (a model, an API key, cost, latency, hallucination risk on a tool whose whole value proposition is *accurate* situational awareness) that was never requested and doesn't serve any of the three confirmed pains better than full-text search plus good grouping does. Skip unless a future milestone explicitly asks for it.
- **Docs versioning / i18n (Docusaurus-style).** GSD Lore renders one project's current planning state, not a public docs site with historical published versions in multiple languages. `milestones/` archives already provide the "previous version" concept GSD needs; a full docs-versioning system solves a problem GSD Lore doesn't have.
- **Comment/annotation/notes-on-top-of-docs.** Any per-user annotation layer is a write feature in disguise (it has to persist somewhere) and duplicates what `.planning/`'s own decision/learnings logs already are for. Skip.
- **Full activity/notification system (real-time toasts, unread counts, mentions).** GSD Lore has one user and no live updates in v1; a "recent activity" static list read on load covers the actual need without inventing a notification model with no one to notify.
- **Rich diff/version-history browser (like a git-blame UI) over `.planning/` file history.** Appealing given `.planning/` is git-tracked, but it's a second, parallel data source (git log/blame) requiring its own indexing and UI, serving a "how did this document evolve" curiosity that isn't one of the three confirmed pains. If ever wanted, a simple "last modified" timestamp per file (cheap, filesystem-derived) covers the 80% case without building a git browser.
- **Curated per-type aggregate pages** (e.g., a standalone "all Decisions across the whole project" page, "all Pitfalls" page) — this was explicitly considered and explicitly *not* chosen by the user in favor of search + navigation. Worth naming here so it isn't quietly re-added: the reasoning holds up under this research too, because these pages would require per-artifact-type parsing logic multiplied across ~15 artifact types (LEARNINGS, PATTERNS, PITFALLS, REVIEW, SECURITY, VALIDATION...), a maintenance burden search and navigation don't have, for content that's already reachable both ways.

### 6. Keyboard and ergonomics

This is a developer-facing local tool; the bar is "feels like the rest of the developer's toolchain," not "accessible to a general audience out of the box":

- **`Cmd/Ctrl-K` for the command palette / quick-jump** is close to a hard expectation at this point among developer tools (Linear, Raycast, VS Code, GitHub's own `/` and `Ctrl-K`) — the single highest-value shortcut to implement.
- **`/` or a dedicated key to focus the main search input** — a secondary, lower-ceremony entry point than the full palette, common in docs tools (GitHub, many MkDocs sites) for "I'm already looking at the page, just let me search without a modal."
- **`Esc` to close any modal/palette/panel**, and **arrow-key + `Enter` navigation within search/palette results** — table stakes the moment a palette exists; a mouse-only palette defeats the point of building one.
- **`g`-then-letter style go-to shortcuts** (à la GitHub's `g n`, `g i`) are a nice-to-have, not table stakes, for jumping to top-level sections (roadmap, search, requirements) — cheap once the router exists, easy to defer to v1.x.
- **Browser-native scroll/back-forward/deep-linkable URLs matter more than custom keybindings here.** Because this is a local web app (not a TUI or Electron shell), the browser's own back/forward, tab restore, and URL-bar history are ergonomics GSD Lore gets for free *if and only if* every view (a phase, a plan, a search query, a requirement) is a real URL — this is a routing/architecture decision more than a "feature," but it's the single biggest ergonomic win available and it's nearly free if planned for from the start, and expensive to retrofit if the app is built as client-side view-state instead of routes.
- **No custom rebindable keymap, no vim-mode, no leader-key system.** These show up in power-user tools (lazygit, some Obsidian plugins) but are disproportionate engineering for a single, known user who can simply learn the small fixed shortcut set this tool ships with. Skip.

---

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| STATE.md-driven dashboard (milestone, phase, status, progress bar, up-next/blocked panel) | This *is* the "where am I" pain, and `STATE.md` frontmatter already computes the numbers | LOW | Mostly a rendering problem — parse frontmatter + a few known prose sections (`Blockers/Concerns`, `Operator Next Steps`) |
| Full roadmap render (phases, goals, success criteria, plans-in-waves, checkboxes, dependency shape) | The other half of "where am I" — phase-level detail `STATE.md` doesn't carry | MEDIUM | Needs to parse `ROADMAP.md`'s semi-structured markdown (headings + tables + checkbox lists), not just frontmatter |
| Full-text search across all of `.planning/`, grouped by phase/artifact type, with snippet highlighting | Explicitly confirmed requirement; the only reliable way to find "buried artifacts" (decisions, learnings, pitfalls) across hundreds of files | MEDIUM-HIGH | Needs an index (even a simple in-process one) built at load time; grouping logic keyed to GSD's own directory taxonomy |
| Directory-tree navigator mirroring `.planning/`'s real structure (root docs / `phases/` / `quick/` / `milestones/` / `research/`) | The "navigation covers what you already understand" half of findability; standard in every docs browser (Docusaurus, MkDocs Material, Obsidian) | LOW | Straightforward once the file tree is enumerated; needs to expand/collapse per phase |
| Markdown rendering (tables, code blocks, checklists as real checkboxes, blockquotes) | GSD documents lean heavily on all of these — a raw-text or partially-rendered view fails the "render this properly" pain immediately | LOW | A standard markdown renderer (e.g. `remark`/`react-markdown` or equivalent) covers this; the real work is frontmatter (below) |
| Frontmatter rendered as structured panels (not raw YAML) — `must_haves`, `coverage`, `key_links`, `progress`, `tech-stack` | The frontmatter *is* the informative content in `PLAN.md`/`SUMMARY.md`; a generic renderer that dumps or hides it fails the core "reviewing plans/output" pain | MEDIUM | Needs per-document-type schemas (PLAN vs SUMMARY vs STATE frontmatter shapes differ) and per-field presentation (tables for `coverage`, badges for `status: pass`) |
| PLAN + SUMMARY paired reading view | Explicitly confirmed requirement ("readable together rather than as two unrelated files") | MEDIUM | Depends on frontmatter rendering; needs to match a plan's `must_haves.truths` to a summary's `coverage` entries |
| Requirement-ID cross-linking (`AUTH-01` mentions → the phase/plan covering it) | Explicitly confirmed requirement ("requirement ID → the phase covering it... clickable") | MEDIUM-HIGH | Requires building an ID registry from `REQUIREMENTS.md` plus a prose-scanning linkifier — GSD's own convention has no real links to parse |
| Requirements traceability view (requirement → phase → status) | Explicitly confirmed as a first-class view; `REQUIREMENTS.md` already has this exact table | LOW-MEDIUM | Mostly a matter of parsing the existing Traceability table and/or reconstructing it from per-phase requirement lists |
| Milestone history distinct from active milestone | Explicitly confirmed; GSD's own phase-numbering-restarts-per-milestone convention makes conflating them actively misleading | MEDIUM | Needs to read `MILESTONES.md` + `milestones/*-ROADMAP.md`/`*-REQUIREMENTS.md` archives and present them as a clearly separate, read-only "past" view |
| Graceful degradation on missing/unknown artifacts | Explicitly confirmed portability requirement; a hardcoded assumption about which files exist breaks on any other GSD project (including this project's own earlier phases, before certain doc types existed) | MEDIUM | Cross-cutting architectural concern more than a feature — every renderer needs an "unknown type → fall back to plain markdown" path, not a crash |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Backlinks ("what references this") on requirements, decisions, and phases | Strictly better than reading files by hand — today, "what else mentions D-18" requires `grep`; this is the single clearest case of the tool beating manual file-reading | MEDIUM-HIGH | Reverse index of the same ID-linkifier pass built for requirement-ID cross-linking; extend from requirement IDs to decision IDs (`D-XX`) once the pattern is proven |
| Command palette (Cmd-K) quick-jump | Fast path to a known phase/plan/requirement without leaving the keyboard, matching developer-tool convention (Linear, Raycast, VS Code) | MEDIUM | Reuses the full-text search index; mostly a UI/keybinding layer once search exists |
| Structured plan-vs-outcome pairing (must_haves ↔ coverage, with deviations surfaced) | Directly serves "reviewing plans/output" — shows not just what was planned but what actually happened and where it diverged, which is exactly what GSD's own `SUMMARY.md`s are built to record | MEDIUM | Not a text diff (wrong tool for intent-vs-outcome documents) — a matched-pair structured view keyed by `must_haves` truth ↔ `coverage` entry |
| Sticky table of contents / heading anchors on long documents | `LEARNINGS.md`, `SUMMARY.md`, `REVIEW.md` are long and internally structured; deep-linkable anchors make search results and backlinks land on the exact paragraph, not just the file | LOW-MEDIUM | Standard heading-to-anchor generation; the "deep link into a specific coverage/decision item" case needs stable IDs beyond just headings |
| Static "recent activity" strip on the landing dashboard | `STATE.md`'s Decisions log and Quick Tasks table are already a chronological record; surfacing the last N entries answers "what just happened" without any live infrastructure | LOW | Read-on-load slice of data already being parsed for the dashboard; no watcher needed |
| Small dependency-flow diagram (phase → phase, `∥` for parallel) rendered visually rather than as ASCII art | `ROADMAP.md`/`STATE.md` already author this as a text diagram; a proper small flow renders the same information more legibly without inventing dates a Gantt would require | LOW-MEDIUM | Parse the existing text arrow-notation; render as a simple horizontal flow, not a general graph layout |
| Faceted search (filter results by requirement ID, phase, artifact type, or decision ID) | Extends search from "find text" to "find everything about AUTH-01" — a materially better tool than `grep` once the ID registry exists | MEDIUM | Depends on both full-text search and the ID registry existing first |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Graph view of files/decisions/requirements | Visually striking; "every knowledge tool has one" (Obsidian, Foam, Dendron, Quartz) | GSD's cross-references are inferred prose mentions, not authored links — the resulting graph is a hairball of hub nodes with no discoverable structure; shows no status/type, which is exactly what this tool's users need; expensive to build well (layout, zoom, node styling) for a payoff the Obsidian community itself is split on even with authored links | A filtered backlinks list per requirement/decision/phase — same information, legible, cheap, and can show status/type as plain text and color |
| Kanban board | "Project dashboards have kanban" (Jira, GitHub Projects, Height) | GSD phases move forward through a fixed sequence with no lateral drag-and-drop reordering to visualize; a kanban implies write interactions this read-only tool must never have | The roadmap's own checkbox/wave list, rendered with status badges |
| Gantt/timeline chart with scheduled dates | "Roadmap dashboards have timelines" (Linear Roadmap, Jira roadmap view) | GSD doesn't produce calendar-scheduled dates — only after-the-fact durations and a dependency shape; a Gantt would have to invent dates the data doesn't contain | The existing text dependency-shape diagram, rendered as a small flow |
| AI-assisted "ask your docs" search/summarization | The corpus is dense technical prose an LLM could plausibly summarize well | New dependency surface (model, key, cost, latency, hallucination risk) never requested, serving no confirmed pain better than good full-text search + grouping does | Full-text search with snippet highlighting and grouping by phase/type |
| Write-back / inline editing of any `.planning/` file | "Since I'm already looking at it, let me fix a typo/tick a box here" | Explicitly and correctly out of scope — GSD's own tooling owns these files' invariants; a viewer that writes can corrupt planning state | Open the file in an editor, or run the relevant GSD command, outside this tool |
| Live file-watching / push updates | Feels modern; "shouldn't it just update"? | Real infrastructure (watcher, transport, client cache invalidation) for a tool opened, read, and closed by one person — explicitly deferred to v2 | Read on load, explicit refresh button; build the read layer so a watcher can be *added* later without a rewrite |
| Curated per-type aggregate pages (all Decisions, all Pitfalls, all Learnings across the whole project) | Feels like it would save scrolling per phase | Already explicitly considered and rejected in favor of search + navigation; ~15 artifact types would each need bespoke parsing/aggregation logic for content reachable both other ways | Full-text search scoped/faceted by artifact type; navigate per-phase |
| Rich git-history/blame browser over `.planning/` | `.planning/` is git-tracked, so "why not show history" is a natural next thought | A second, parallel data source needing its own indexing/UI, serving a curiosity ("how did this evolve") that isn't one of the three confirmed pains | A cheap filesystem "last modified" timestamp per file, if ever needed |
| Full activity/notification system with live toasts and unread state | Standard in team dashboards (Jira, Linear, GitHub) | One user, no live updates in v1 — there is no one to notify and nothing pushing | A static "recent activity" list, read on load from `STATE.md`'s own decision/quick-task logs |

## Feature Dependencies

```
[Markdown Rendering Pipeline]
    └──requires──> nothing (foundational)

[Frontmatter Structured Panels]
    └──requires──> [Markdown Rendering Pipeline]
    └──requires──> per-document-type schema (PLAN/SUMMARY/STATE frontmatter shapes)

[PLAN + SUMMARY Paired View]
    └──requires──> [Frontmatter Structured Panels]

[Full-Text Search Index]
    └──requires──> [File Tree Enumeration] (the corpus to index)

[Command Palette (Cmd-K)]
    └──requires──> [Full-Text Search Index]

[Requirement Traceability View]
    └──requires──> parsing REQUIREMENTS.md + per-phase requirement lists in ROADMAP.md

[ID Registry] (requirement IDs, decision IDs, phase/plan numbers)
    └──requires──> [Requirement Traceability View]'s parsing pass (reuses REQUIREMENTS.md scan)

[Requirement-ID Cross-Linking in prose]
    └──requires──> [ID Registry]
    └──requires──> [Markdown Rendering Pipeline] (linkify at render time)

[Backlinks ("what references this")]
    └──requires──> [Requirement-ID Cross-Linking] (reverse of the same forward index)

[Faceted Search by requirement/decision ID]
    └──requires──> [Full-Text Search Index]
    └──requires──> [ID Registry]

[STATE.md Dashboard (progress, up-next, blocked)]
    └──requires──> nothing beyond frontmatter + known-section parsing (build first)

[Milestone History View]
    └──requires──> [File Tree Enumeration]
    └──requires──> convention-aware parsing of milestones/ archive shape

[Graceful Degradation for unknown artifact types] ──enhances──> everything
    (cross-cutting: every renderer needs an "unrecognized type → plain markdown fallback" path)

[Kanban board] ──conflicts──> [Read-only constraint]
[Live file-watching] ──conflicts──> [v1 scope: read-on-load only]
```

### Dependency Notes

- **Frontmatter Structured Panels requires per-document-type schemas:** `PLAN.md` frontmatter (`must_haves`, `key_links`, `estimate`) and `SUMMARY.md` frontmatter (`coverage`, `tech-stack`, `key-decisions`) are shaped differently enough that one generic "render this YAML nicely" pass won't serve both well — this needs to be planned as (at minimum) separate schemas for PLAN, SUMMARY, STATE, and a fallback for everything else, which is also what makes graceful degradation for unrecognized types a natural fallback case rather than a special one.
- **Requirement-ID Cross-Linking requires the ID Registry, which requires the Traceability View's parsing pass:** don't build these as unrelated features — the same `REQUIREMENTS.md` scan that produces the traceability table is the seed of the registry that later powers linkification and backlinks. Sequence them together.
- **Backlinks enhances (and is enhanced by) Search:** once an ID registry and reverse index exist, "search for AUTH-01" and "show backlinks for AUTH-01" become nearly the same query against the same data — build the index once, expose it two ways.
- **Kanban and live-watching conflict with stated constraints, not just "not chosen":** these aren't merely lower priority — a kanban's implied drag-reorder write action and a watcher's implied v1 scope violation are structural conflicts with this project's own Out of Scope list, not deferred nice-to-haves.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept, mapped directly to the three confirmed pains.

- [ ] STATE.md-driven dashboard: milestone/phase/status/progress bar, up-next/blocked panel — *this is the entire "where am I" pain on its own*
- [ ] Full roadmap render: phases, goals, success criteria, waves, checkboxes, dependency-flow diagram
- [ ] Directory-tree navigator over the whole `.planning/` structure — *the navigation half of findability*
- [ ] Full-text search, grouped by phase/artifact type, with snippet highlighting — *the search half of findability*
- [ ] Markdown rendering with tables/code/checklists, plus frontmatter as structured panels — *the entire "reviewing plans/output" pain on its own*
- [ ] PLAN + SUMMARY paired reading view
- [ ] Requirement-ID cross-linking (prose mentions → canonical source) — explicitly named as required, foundational to the differentiators layered after it
- [ ] Requirements traceability view
- [ ] Milestone history, visually distinct from the active milestone
- [ ] Graceful degradation for missing/unrecognized artifacts — cross-cutting, must be true from day one given the portability requirement

### Add After Validation (v1.x)

Features to add once the core is working and in daily use.

- [ ] Backlinks on requirements/decisions/phases — trigger: once requirement-ID linking is live and proves the ID-registry pattern works
- [ ] Decision-ID (`D-XX`) and pitfall-ID (`PXX`) linking, extending the same registry beyond requirement IDs — trigger: requirement-ID linking is in daily use and the looser, inline-defined nature of decision IDs has been scoped
- [ ] Command palette (Cmd-K) — trigger: the search index exists and daily use reveals navigation, not just search, is a frequent need
- [ ] Sticky TOC / heading anchors on long documents — trigger: `LEARNINGS.md`/`REVIEW.md`-length documents are being read often enough that in-page scrolling is a friction point
- [ ] Static recent-activity strip on the dashboard — trigger: daily use reveals "what changed since I last looked" is asked more often than the up-next panel already answers
- [ ] Faceted search by requirement/decision ID — trigger: full-text search is in daily use and users are manually re-typing an ID to narrow results

### Future Consideration (v2+)

Features to defer until the read-only v1 has proven itself.

- [ ] Live file-watching / push updates — deferred per explicit project scope; build the read layer now so this can be added without restructuring
- [ ] Multi-project registry/switcher — deferred per explicit project scope
- [ ] Write-back / driving GSD commands from the UI — deferred per explicit project scope; a named future direction, not a v1 concern
- [ ] Structured plan-vs-outcome pairing beyond the basic must_haves↔coverage match (e.g., surfacing every documented deviation inline against the specific task it departed from) — worth doing well eventually, but the basic pairing in v1 already serves the core pain; the fuller version is a refinement, not a launch blocker

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| STATE.md dashboard (progress, up-next, blocked) | HIGH | LOW | P1 |
| Roadmap render (phases, waves, dependency flow) | HIGH | MEDIUM | P1 |
| Directory-tree navigator | HIGH | LOW | P1 |
| Full-text search with grouping + snippets | HIGH | MEDIUM-HIGH | P1 |
| Markdown + frontmatter structured rendering | HIGH | MEDIUM | P1 |
| PLAN + SUMMARY paired view | HIGH | MEDIUM | P1 |
| Requirement-ID cross-linking | HIGH | MEDIUM-HIGH | P1 |
| Requirements traceability view | MEDIUM-HIGH | LOW-MEDIUM | P1 |
| Milestone history view | MEDIUM | MEDIUM | P1 |
| Graceful degradation for unknown artifacts | HIGH (prevents breakage) | MEDIUM | P1 |
| Backlinks on IDs | HIGH | MEDIUM-HIGH | P2 |
| Command palette (Cmd-K) | MEDIUM-HIGH | MEDIUM | P2 |
| Sticky TOC / heading anchors | MEDIUM | LOW-MEDIUM | P2 |
| Static recent-activity strip | MEDIUM | LOW | P2 |
| Faceted search by ID | MEDIUM | MEDIUM | P2 |
| Decision/pitfall-ID linking | MEDIUM | MEDIUM-HIGH | P2 |
| Live file-watching | LOW (for v1's actual usage pattern) | HIGH | P3 (v2) |
| Multi-project switcher | LOW (for v1) | MEDIUM-HIGH | P3 (v2) |
| Graph view | LOW (situationally useless per analysis above) | HIGH | Do not build |
| Kanban board | LOW (wrong workflow shape) | MEDIUM-HIGH | Do not build |
| Gantt/timeline | LOW (no scheduled-date data exists) | MEDIUM-HIGH | Do not build |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Project dashboards (Linear/Jira/GitHub Projects) | Docs browsers (Docusaurus/MkDocs Material/Obsidian) | GSD Lore's approach |
|---------|--------------------------------------------------|-------------------------------------------------------|----------------------|
| Progress visualization | Progress bar from closed/total issues, status-colored chips | N/A (not their domain) | Reuse `STATE.md`'s own precomputed `progress.percent` — no new computation needed |
| Board/timeline views | Kanban + Gantt-style roadmap timeline are core to the category | N/A | Deliberately excluded — GSD's linear, non-scheduled workflow doesn't match either shape (see anti-features) |
| Search | Usually secondary to filtering/views | Core feature — instant, client-side, typeahead (MkDocs Material's Lunr-based search) | Core feature here too — instant, grouped by phase/type, snippet-highlighted |
| Cross-linking | Issue references (`#123`) auto-link because the platform owns both ends | Author-written `[[wikilinks]]` (Obsidian) or explicit markdown links (Docusaurus/MkDocs) | Neither — GSD's IDs are plain-text prose mentions with no existing link syntax; must be built via ID-registry + linkifier, closer to inferring issue-reference-style links than parsing wikilinks |
| Backlinks | Rare (issue "linked from" lists exist but are secondary) | Core feature (Obsidian, Foam, Dendron) | Adopted as a differentiator — more valuable here than in Obsidian because the links aren't visible without tooling in the first place |
| Graph view | Not present | Present in Obsidian/Foam/Quartz, contested even there | Explicitly not built — see graph-view analysis above |
| Command palette | Present (Linear, GitHub) | Present in some (VS Code-adjacent tools), less common in pure docs sites | Adopted, layered on the same search index, v1.x not launch-blocking |

## Sources

- `~/studio-portal/.planning/` (primary source — `STATE.md`, `ROADMAP.md`, `REQUIREMENTS.md`, `MILESTONES.md`, `phases/01-portal-owned-identity-sessions/01-01-PLAN.md`, `01-01-SUMMARY.md`, `01-LEARNINGS.md`) — read directly for this research, a real mature GSD planning tree
- `/home/cinedise/gsd-lore/.planning/PROJECT.md` — confirmed scope, the three pains, out-of-scope list
- [Obsidian's Graph View Is Beautiful and Almost Completely Useless](https://codeculture.store/blogs/developer-culture/obsidian-graph-view-useful)
- [In Defense of Obsidian's Graph View](https://www.eleanorkonik.com/p/its-not-just-a-pretty-gimmick-in-defense-of-obsidians-graph-view) (the counterpoint, considered and weighed)
- [Material for MkDocs — Setting up site search](https://squidfunk.github.io/mkdocs-material/setup/setting-up-site-search/)
- [Material for MkDocs — Search: better, faster, smaller](https://squidfunk.github.io/mkdocs-material/blog/2021/09/13/search-better-faster-smaller/)
- [Build a Command Palette: Cmd+K Like Linear and Vercel](https://www.techinterview.org/post/3233475212/build-command-palette-cmd-k/)
- [Designing a Command Palette — Destiner's notes](https://destiner.io/blog/post/designing-a-command-palette/)
- [Linear Initiatives + Roadmap — OKRs to Issues With Automatic Status Rollups](https://www.resumelens.org/blog/linear/linear-initiatives-and-roadmap)
- [Storybook — Sidebar & URLs](https://storybook.js.org/docs/configure/user-interface/sidebar-and-urls) (Story Indexers crawl the filesystem to populate a sidebar — the same CLI-launches-local-browser-UI-over-a-directory pattern GSD Lore follows)
- [@lcov-viewer/istanbul-report](https://www.npmjs.com/package/@lcov-viewer/istanbul-report) (grouped-by-directory HTML report pattern, comparable to grouping search results/navigation by phase)

---
*Feature research for: local read-only GSD planning-directory dashboard*
*Researched: 2026-08-21*

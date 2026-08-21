# Pitfalls Research

**Domain:** Local filesystem-backed documentation/planning dashboards and markdown-rendering developer tools (specifically: a read-only viewer over a GSD `.planning/` directory)
**Researched:** 2026-08-21
**Confidence:** HIGH (grounded directly in `~/studio-portal/.planning/`, GSD Lore's own `PROJECT.md`, and `gsd-core` 1.11.0's template set; MEDIUM on general web/rendering claims, cited)

This file is written against artifacts actually read in `~/studio-portal/.planning/` — a mature, two-milestone GSD project — and cross-checked against `~/.claude/gsd-core/templates/`, which contains artifact types (`AI-SPEC.md`, `SPEC.md`, `DEBUG.md`) that do **not** appear in studio-portal at all. That gap is itself evidence for pitfall #1.

## Critical Pitfalls

Ranked by severity for GSD Lore specifically. #1–#4 are architectural and must be decided before the reader/parser layer is built; #5–#10 can be addressed progressively but still need a plan-level decision early.

### Pitfall 1: Building the parser against studio-portal's shape, not GSD's contract

**What goes wrong:**
The developer has exactly one real `.planning/` tree to look at while building (`~/studio-portal`), and it is a *mature* one: two milestones, archived phase history, `quick/` tasks, every optional artifact type present. Code written by looking at real files instead of the GSD contract ends up assuming things that are true of studio-portal today but are not guaranteed by GSD in general:
- A milestone exists and `STATE.md` frontmatter's `milestone` field is non-null (a brand-new `/gsd-new-project` run produces a `.planning/` with `PROJECT.md` and `REQUIREMENTS.md` but no `ROADMAP.md`, no `phases/`, and a `STATE.md` in an early, sparser shape).
- Phases are numbered from 1 with no gaps (studio-portal's v2.0 numbering "restarts-per-milestone" per its own `STATE.md` frontmatter — `phase_numbering: restarts-per-milestone` — meaning a fresh milestone's Phase 1 is a *different phase* from a prior milestone's Phase 1, and both a `phases/01-...` and a `milestones/v1.0-phases/01-...` directory legitimately exist at once with the same number).
- `milestones/` exists (a project with one milestone in progress, which is the common case for a while, has no archives yet).
- `quick/` exists, and quick task directories follow the same `NN-slug` shape as phase directories (they don't — studio-portal's are `260726-unp-add-a-toggle-...`, a date-code-slug with no phase number at all, and no fixed set of child artifacts: some have only `PLAN.md`+`SUMMARY.md`, one has `CONTEXT.md`+`PLAN.md`+`SUMMARY.md`+`VERIFICATION.md`).
- Every phase has every artifact type. It doesn't: `04-bulk-archive-downloads` (in-progress) has `CONTEXT`, `DISCUSSION-LOG`, `PATTERNS`, `RESEARCH`, `UI-SPEC`, `VALIDATION` but no `PLAN.md`/`SUMMARY.md` yet (not planned), no `SECURITY.md`, no `REVIEW.md`. Phase 1 has a `ROUTE-INVENTORY.md` that no other phase has. This variance is normal, not a data-quality bug.
- `config.json`'s ~60 workflow toggles are a fixed, known shape. They aren't — the field the tool reads today (`workflow.ui_safety_gate`, say) may not exist in a `.planning/` produced by an older or newer `gsd-core`, and new toggles get added over time.
- `RETROSPECTIVE.md`, `WINDSURF.md`-style project-specific notes, `estimation-calibration.json`, `HANDOFF.json` all exist. Any of these can be absent, especially early in a project's life.

**Why it happens:**
There is only one convenient example to develop against, iteration is fastest when the code matches what's on disk in front of you, and "it renders `~/studio-portal` correctly" *feels* like the definition of done — but that project alone cannot exercise the empty-project code path, the single-milestone-no-archive path, or the "GSD added a new artifact type since this tool was written" path. This is explicitly named as the single biggest risk in GSD Lore's own `PROJECT.md`.

**How likely for this project:** Very high. It is architecturally guaranteed to happen at least partially — there is no second GSD project on this machine yet to develop against, and the temptation to special-case what's visible in studio-portal (2 milestones, `quick/`, every artifact type) is constant background pressure throughout the build.

**How to avoid:**
- Do not derive the parser's shape from `~/studio-portal`. Derive it from `gsd-core`'s templates (`~/.claude/gsd-core/templates/*.md` and `templates/research-project/*.md`) plus its actual state-machine outputs (`config.json` default shape, `STATE.md` frontmatter schema) — those are the contract; studio-portal is one instance of it.
- Build and check in **two synthetic fixture trees** before or alongside the real reader code: (a) a maximally-sparse fresh project — `PROJECT.md` + `REQUIREMENTS.md` only, no `ROADMAP.md`, no `phases/`, `STATE.md` in its earliest shape — and (b) a maximally-dense one, either a copy of studio-portal's structure with file contents redacted/replaced, or a synthetic tree that adds artifact types studio-portal doesn't have (`AI-SPEC.md`, `SPEC.md`) plus a *third* milestone so multi-milestone logic isn't tested only at N=2.
- Every "assume field/directory X exists" statement in the code should be traceable to a specific line in a GSD template or a `config.json` default — not to "it's there in studio-portal."
- Treat unknown top-level entries under `.planning/` (a doc type GSD adds later, or a project-specific file like `WINDOWS.md`) as a required, tested code path — GSD Lore's own requirements already demand this ("Tolerates artifact types it does not recognize... still appears and renders as markdown instead of disappearing or breaking").
- The two-fixture testing strategy is not optional polish — it is the only thing that actually catches this class of bug, because studio-portal alone structurally cannot exercise the empty-project or unknown-artifact-type paths. Golden-file/snapshot tests against both fixtures, run in CI or at minimum before every phase is called done, are the concrete mechanism.

**Warning signs:** Any code with a comment like "studio-portal always has..."; any function whose only test input is the real `~/studio-portal` tree; any path-building logic that concatenates `phases/NN-slug` without also handling `milestones/vX.Y-phases/NN-slug` and `quick/<timestamp-slug>`; reaching for `.milestone` or `.current_phase` off `STATE.md` frontmatter without a null-check.

**Phase to address:** Architectural — the reader/parser layer, before any UI is built on top of it. This is the phase most likely to need the deepest research flag and the most scrutiny in review.

---

### Pitfall 2: GSD's pseudo-XML plan structure is not HTML-safe markdown

**What goes wrong:**
`PLAN.md` files are not plain prose-and-checkboxes markdown. They contain literal angle-bracket pseudo-tags used as GSD's own internal structuring convention — `<objective>`, `<execution_context>`, `<context>`, `<tasks>`, `<task type="checkpoint:decision" gate="blocking">`, `<decision>`, nested `<context>` blocks — confirmed directly in `02-01-PLAN.md`. These are not meant as HTML; they are a prompt/document structuring convention specific to GSD. But a standard CommonMark-compliant renderer (remark/rehype, markdown-it, etc.) does not know that. CommonMark's HTML-block rules treat a tag alone on its own line as the start of a raw HTML block that runs until the next blank line — which means: (a) the tag itself may render as an invisible/stripped element or leak as literal text depending on the renderer's HTML mode, and (b) markdown *inside* that block (bold text, bullet lists, inline code — all present inside the `<decision>`/`<context>` prose seen in `02-01-PLAN.md`) can stop being parsed as markdown at all and get treated as part of the raw HTML block, rendering as unstyled or garbled text.
The same risk applies, in smaller doses, to `UI-SPEC.md` and `PATTERNS.md`, which were confirmed (via grep) to contain literal HTML-like tags elsewhere in studio-portal.

**Why it happens:**
GSD's plan format was designed to be read by an LLM (which parses pseudo-XML natively and correctly) and by a human in a terminal/editor (where angle brackets are just visible text) — not by a CommonMark renderer, which is a third, unconsidered reader. The mismatch only surfaces once a real markdown-to-HTML pipeline is pointed at these files, which is exactly what GSD Lore does.

**How likely for this project:** Very high. `PLAN.md` is one of the two artifact types the project's own requirements name explicitly ("`PLAN.md` and its paired `SUMMARY.md` are readable together"), so this isn't an edge case being rendered occasionally — it's a primary, load-bearing rendering target.

**How to avoid:**
- Before choosing a markdown renderer, run it against a real `PLAN.md` (e.g. `02-01-PLAN.md`) as a rendering spike and visually confirm the `<objective>`, `<task>`, `<decision>` blocks and their nested markdown (bold, lists) survive intact.
- Prefer a renderer/pipeline where HTML-block parsing can be disabled or where unrecognized tags are escaped to visible text rather than swallowed (e.g. treat the whole document as HTML-disabled markdown, escaping literal `<...>` sequences before rendering, rather than trusting `rehype-raw`-style raw-HTML passthrough). This also closes most of Pitfall 7 (unsafe HTML) for free, since GSD content is never expected to contain real interactive HTML.
- Add a specific rendering fixture/test built from an actual multi-task `PLAN.md` (not a synthetic simplified one) to the test suite, asserting that prose inside `<task>`/`<decision>` blocks renders as formatted markdown, not raw/garbled text.

**Warning signs:** A rendered `PLAN.md` where `<objective>` or `<task ...>` tags appear as visible literal text; bold/list markup inside a decision block rendering as plain unformatted text; content after a `<task>` tag vanishing until the next blank line.

**Phase to address:** Architectural — must be settled during renderer/tech-stack selection, not discovered during the "reading" phase's polish pass.

---

### Pitfall 3: Treating markdown structure as a queryable data source

**What goes wrong:**
GSD's markdown is written freely by both a human and an LLM across many sessions — headings drift, checkbox semantics vary by document, table columns aren't guaranteed stable, and the same visual pattern (`- [ ]`) means different things in different files. Concretely, in studio-portal's own tree, `- [ ]`/`- [x]` checkboxes appear in at least four semantically distinct contexts: requirement satisfaction in `REQUIREMENTS.md`, phase-plan-execution status inside `ROADMAP.md`'s phase detail blocks, individual `<task>` completion inside a `PLAN.md`'s pseudo-XML body, and ad-hoc generic checklists in `PATTERNS.md`/`RESEARCH.md` that have nothing to do with progress at all. A parser that counts checkboxes to compute "percent done" will double-count, undercount, or count the wrong thing entirely, and it will silently produce a *plausible-looking but wrong* number rather than an obvious error — the worst failure mode for a dashboard whose entire purpose is "know where the work stands."
Similarly, `REQUIREMENTS.md` is not a clean, stable table — it mixes structured requirement bullets with prose amendment blockquotes (e.g. `> **Amended 2026-08-08** by \`02-CONTEXT.md\`... ROLE-01, ROLE-02, and ROLE-05 are reworded below...`) interleaved between requirement groups. Heading-based section extraction (grabbing everything between `### Roles & Permissions` and the next `###`) will scoop up that prose too, which is *correct* to show but wrong to treat as more requirement rows.

**Why it happens:**
Markdown looks structured (headings, lists, tables) so it's tempting to parse it like a lightweight database. But GSD's actual source of truth for machine-readable state is deliberately narrow — YAML frontmatter in `STATE.md`, `config.json`, `HANDOFF.json` — precisely because the markdown bodies are meant to be free prose, edited by hand and by an LLM, and are not contract-stable.

**How likely for this project:** Very high — GSD Lore's core value proposition ("immediately know where the work stands") depends on exactly the kind of progress/status derivation that's easiest to get subtly wrong this way.

**How to avoid:**
- **Structured facts (progress percent, current phase, completion counts, requirement IDs and their status) must be read only from the documents GSD designates as machine-readable**: `STATE.md` frontmatter's `progress` block, `config.json`, `ROADMAP.md`'s own explicit `[x]`/`[ ]` phase-line and plan-line syntax (which GSD itself treats as authoritative, not incidental prose) — not derived by re-counting checkboxes across arbitrary files.
- Everything else — `PATTERNS.md`, `RESEARCH.md`, `DISCUSSION-LOG.md`, `CONTEXT.md`, prose sections of `REQUIREMENTS.md` — is a **document to render**, not a **database to query**. The dashboard should show these as rendered markdown and let full-text search find things inside them, rather than trying to extract structured meaning from their prose.
- Where a document's shape genuinely needs light extraction (e.g. "list this phase's plans and their status" from `ROADMAP.md`), write the parser against GSD's own documented ROADMAP template syntax (`~/.claude/gsd-core/templates/roadmap.md`) as the contract, and treat any line that doesn't match the expected pattern as "cannot extract — show raw" rather than skipping it silently or throwing.
- **When a document doesn't match its expected shape, the resilient default is: render the raw markdown/prose faithfully (which always works, because it's just markdown) and skip only the *structured extraction* on top of it — never show a blank section, and never crash the page.** Silent omission hides real content from a "where is that thing" tool, which defeats its purpose; a hard error takes down navigation for one bad file. Falling back to raw rendering is the only option consistent with the product's promise.

**Warning signs:** A "percent complete" figure on screen that doesn't match `STATE.md`'s own `progress.percent`; a requirements table missing a row that's clearly visible when the file is opened directly; any `try { extractStructured(doc) } catch { return null }` pattern that causes a whole section to disappear.

**Phase to address:** Architectural, in the reader/parser layer — the "structured facts vs. rendered prose" boundary is a foundational data-modeling decision, not something to patch in later.

---

### Pitfall 4: Frontmatter/JSON errors crash the whole page instead of degrading

**What goes wrong:**
`STATE.md`'s frontmatter is real YAML with nested structures (a `progress:` block, string values that need quoting like `last_updated: "2026-08-21T07:07:55.651Z"`), and `PLAN.md`'s frontmatter is *substantially* deeper — `02-01-PLAN.md`'s frontmatter includes `must_haves.truths` (an array of long strings), `must_haves.key_links`, and `prohibitions` (an array of objects with `statement`/`status`/`verification` fields). `config.json` is ~60 keys deep with nested objects (`workflow`, `ship.pr_body_sections` as an array of objects). Any of these can, in a real project, be: malformed (a stray tab breaking YAML indentation, a trailing comma in hand-edited JSON), missing an expected field (older `gsd-core` versions don't emit `phase_numbering` or `state_head`), or carrying a field whose *type* changed between tool versions (a string becoming an object, a flat array becoming an array of objects — exactly the `prohibitions` shape, which looks like it could plausibly have been a flat string array in an earlier GSD version). A naive implementation that does `const fm = yaml.parse(raw)` or `JSON.parse(raw)` at the top of a page-render function, with no try/catch, or that does `fm.progress.percent` with no optional chaining, throws an unhandled exception that — in a typical SSR/SPA setup — takes down the entire route, not just the one field or the one file.

**Why it happens:**
Frontmatter and JSON *feel* trustworthy because they're structured, unlike prose markdown — so the defensive instinct that naturally applies to "parsing markdown as data" often doesn't get applied here too, even though the same authors (human + LLM, across GSD versions) are producing this input.

**How likely for this project:** High. GSD Lore is explicitly required to work across GSD versions and phase-of-life ("mid-milestone or greenfield"), and `gsd-core` is an actively evolving tool (1.11.0 at time of writing) — schema drift across versions is a stated compatibility constraint in `PROJECT.md`, not a hypothetical.

**How to avoid:**
- Parse frontmatter/JSON defensively at the boundary: every parse is wrapped, every field access uses optional chaining/defaults, and a parse failure or missing-field condition produces a typed "this file's structured data is unavailable" result rather than propagating an exception up the call stack.
- Validate against a schema with sensible defaults for optional/new fields (a runtime schema library, not just TypeScript types, since TypeScript types don't survive `JSON.parse`/YAML parse of untrusted-shape input) — unknown extra fields are ignored, missing known fields fall back to defaults, and type-mismatched fields are treated as absent rather than crashing.
- Failure isolation must be per-file, not per-page: a malformed `STATE.md` should degrade the "where am I" panel to "status unavailable, see raw file" while the rest of the dashboard (navigation, search, everything else) keeps working. A malformed frontmatter block in one `PLAN.md` out of forty should not affect the other thirty-nine.
- Because the raw markdown body is separable from its frontmatter, always render the body even when the frontmatter fails to parse — the two failures are independent and should be handled independently.

**Warning signs:** A single bad file taking the whole app down (visible immediately in the two-fixture testing strategy from Pitfall 1 if one fixture includes a deliberately malformed frontmatter block); any top-level `yaml.parse`/`JSON.parse` call without a wrapping try/catch; direct property-chain access on parsed frontmatter without defaults.

**Phase to address:** Architectural — belongs in the same reader/parser layer as Pitfalls 1 and 3, ideally the same error-boundary mechanism.

---

### Pitfall 5: Showing confidently stale data with no watcher

**What goes wrong:**
V1 deliberately has no file watcher — reads happen on load and on explicit refresh, by design (per `PROJECT.md`'s Out of Scope). The danger isn't the lack of live updates; it's a dashboard that looks exactly as authoritative *after* the underlying files changed as it did the moment it loaded, with nothing distinguishing the two states. Since this tool's entire purpose is trustworthy situational awareness ("where does the work stand"), a confidently-wrong "where am I" panel is worse than no panel — GSD sessions run for hours, `STATE.md` and `ROADMAP.md` change constantly during active work, and this is precisely the tool someone opens *while* a GSD session is running elsewhere.

**Why it happens:**
"No watcher" is easy to interpret as "just read once and render," which is correct for v1's scope but incomplete — it skips the cheap, purely-client-side half of the problem: signaling staleness, which requires no watcher at all.

**How likely for this project:** High — this is a stated, deliberate v1 constraint (not an oversight), which makes it easy to under-engineer the mitigation since "it's out of scope" reads as "don't worry about it," when actually only the *live-push* half is out of scope; the *staleness signal* half is still v1's job.

**How to avoid:**
- Record a load timestamp and show it persistently ("as of 14:32," or similar), so staleness is always visible without requiring a watcher.
- Provide an explicit, cheap, obvious refresh action (not buried in a menu) — this is the mechanism the project already commits to ("reads on load and on explicit refresh").
- Where feasible without a watcher, a lightweight on-focus or on-navigation re-check (e.g. compare a file's mtime against what was loaded, on route entry) can flag "this may be stale, refresh?" without building real file-watching infrastructure — this is a cheap middle ground worth scoping as a stretch goal, not a hard requirement.
- Design the read layer (per `PROJECT.md`'s own forward-compatibility constraint) so a real watcher can be dropped in later without restructuring — concretely, this means reads should go through one seam/interface that a future watcher-backed implementation can satisfy identically, rather than being scattered inline in UI components.

**Warning signs:** No visible timestamp anywhere on the dashboard; refresh requiring a full page reload instead of an in-app action; any cached read whose age is invisible to the user.

**Phase to address:** Architectural for the "record load time + refresh seam" part (belongs with the reader layer); UI polish for surfacing it visibly.

---

### Pitfall 6: Scope creep into graphs, timelines, analytics, and eventually an editor

**What goes wrong:**
Dashboards over structured project data have a well-known gravitational pull toward "just one more view" — a Gantt-style phase timeline, a burndown chart, a dependency graph visualization, contributor/activity analytics, a diff view between plan versions — none of which were asked for, all of which are individually temptingly cheap once the data layer exists, and each of which adds a maintenance surface, a way to render stale/misleading data (see Pitfall 5), and delay to shipping the actually-requested v1. The read-only constraint has its own, sneakier version of this drift: "just let me fix this typo from the dashboard" starts as an inline-edit-one-field feature and grows into a write path, which is explicitly the thing `PROJECT.md` rules out because GSD, not the viewer, owns these files' invariants.

**Why it happens:**
The underlying data (phases, requirements, timestamps, dependency graphs already drawn in `ROADMAP.md`'s own text diagrams) is genuinely graph/timeline-shaped, so building a visualization on top of it feels like "obviously the right next feature" rather than scope creep — and for a personal tool with no external pressure to ship, there's no natural forcing function stopping it.

**How likely for this project:** Medium — the project is explicit and disciplined in its stated Out of Scope section already (no writing, no multi-project switcher, no live watching), which is a strong signal of self-awareness about this risk; the residual risk is mid-build feature creep once the reader/renderer exists and "just one more view" becomes cheap to add.

**How to avoid:**
- Hold the line stated in `PROJECT.md`'s Out of Scope section as a hard gate at every phase boundary, not just at project kickoff — re-read it before adding any feature not already listed under Active requirements.
- Any proposed feature not already in the Active requirements list gets treated as a new milestone proposal, not a mid-phase addition — consistent with the project's own "Evolution" process for `PROJECT.md`.
- Prefer text-first surfaces already present in the source material (`ROADMAP.md`'s own ASCII dependency diagram, its `[phase table]`) over building new visual chart components — GSD's authors already draw these relationships in prose/ASCII where they matter; duplicating them as an interactive graph is discretionary scope, not a requirement.
- Treat "read-only" as a permanent architectural property enforced at the data-access layer (the filesystem client literally has no write methods), not just a policy — this makes "just add a small edit feature" require a structural change big enough to force a real scoping conversation rather than a quiet addition.

**Warning signs:** Any PR/plan that adds a new top-level nav item not traceable to an Active requirement; any code path that opens a file for writing; feature discussions that start with "wouldn't it be cool if..." rather than "this addresses situational-awareness/findability/reading gap X."

**Phase to address:** Governance, not a build phase — enforced at every phase-planning checkpoint across the whole roadmap, most critically after the core reader/renderer ships and it becomes cheap to add "just one more view."

---

### Pitfall 7: Unsafe HTML and un-sanitized markdown rendering

**What goes wrong:**
Markdown renderers that pass raw HTML through (`rehype-raw` without `rehype-sanitize`, or equivalent) execute anything embedded in a document, including `<script>` tags, `onerror`/`onclick` attributes on `<img>`, and `<iframe>` sources — a well-documented, current class of vulnerability in markdown-rendering React apps. GSD Lore's content is locally authored and not adversarial in the normal case, but the content is written partly by an LLM across many sessions and partly by hand, over a long project lifetime — the threat model isn't "someone else's malicious repo," it's "any copy-pasted snippet, scraped research excerpt, or LLM-generated content that happens to include HTML-like text" rendering as live DOM instead of visible text. Confirmed directly: `01-UI-SPEC.md` and `PATTERNS.md` files in studio-portal already contain literal HTML tags (grep-confirmed), so this isn't a hypothetical edge case for this corpus.

**Why it happens:**
Enabling raw-HTML passthrough is often the path of least resistance to get GSD's pseudo-XML tags (Pitfall 2) or an intentional `<details>`/`<br>` to render "nicely," without realizing it opens the same door to anything else that looks like a tag.

**How likely for this project:** Medium-high, specifically because Pitfall 2 already pushes toward *some* HTML handling — the natural bad fix for "my pseudo-XML tags don't render" is "just enable raw HTML," which directly creates this hole.

**How to avoid:**
- Do not enable raw HTML passthrough to solve Pitfall 2 — solve Pitfall 2 by escaping unrecognized tags to visible text (the CommonMark-safe default), not by trusting HTML.
- If any real HTML support is needed (e.g. for a handful of `<details>`/`<summary>`/`<br>` uses seen in the corpus), route it through an allowlist-based sanitizer (`rehype-sanitize` or `DOMPurify` with an explicit safe-tag/safe-attribute list) rather than blanket-allowing raw HTML — this is the documented, current best practice for exactly this scenario.
- Since this is a purely local, single-user tool serving files from disk, the severity ceiling is lower than a multi-user web app, but the fix is nearly free (a well-maintained sanitizer plugin) relative to the cost of getting it wrong, so there's no good reason to skip it.

**Warning signs:** Any markdown pipeline config with `rehype-raw` and no `rehype-sanitize` (or equivalent) after it; a rendered document where a pasted snippet's angle-bracket text silently vanishes rather than displaying as text.

**Phase to address:** Architectural — decided at the same time as the renderer/tech-stack choice and Pitfall 2's fix, not bolted on later.

---

### Pitfall 8: Search built on rendered text, indexed at startup, with no explanation of why a result matched

**What goes wrong:**
Three compounding search failure modes are common in exactly this kind of tool:
1. **Index-build blocking startup.** Building a full-text index over hundreds of files (studio-portal alone has 46+23 plans plus dozens of supporting docs, some individual files 700–980 lines) synchronously on process start delays "the dashboard opens" — the first thing a user does after launch. Lunr-style libraries in particular are documented to build/parse the whole corpus into memory at once, which can block the main thread on larger corpora.
2. **Searching rendered text instead of source text on a corpus full of IDs and code.** This corpus is dense with tokens that matter exactly as written — requirement IDs (`ROLE-07`, `AUTH-04`), file paths (`backend/src/authz/mod.rs`), decision IDs (`D-05`). If search indexes the *rendered* HTML/DOM text (after markdown-to-HTML transforms strip backticks, collapse whitespace, or a syntax highlighter splits a code token across multiple `<span>`s), exact-ID and code-snippet searches silently degrade — a search for `ROLE-07` can fail to match content that's visibly right there in the source markdown, which is a worse failure than not finding it at all because it looks like the tool searched and came up empty.
3. **Snippets and ranking with no "why did this match" signal**, which matters more on a small, dense, jargon-heavy corpus (a few hundred files, many sharing vocabulary like "authorization," "session," "phase") than on a large generic corpus — naive term-frequency ranking surfaces the wrong file when ten files all mention "authorization," and a snippet that just shows the first N characters of a file (rather than context around the actual match) doesn't help the user judge relevance.

**Why it happens:**
It's simplest to index whatever text is easiest to get at (rendered DOM/HTML), and building the index eagerly on startup is simpler than building it lazily, incrementally, or on a background thread — the failure modes only become visible with a real, ID-dense, moderately large corpus like this one, not with a toy example.

**How likely for this project:** High — full-text search "across every file in `.planning/`, with results grouped by phase and artifact type" is a named Active requirement, and this corpus's ID/code density (requirement IDs, decision IDs, file paths, Rust/TS identifiers) is exactly the case where source-vs-rendered-text matters most.

**How to avoid:**
- Index the **source markdown text** (frontmatter-stripped, pseudo-XML-tag-stripped, but otherwise raw), not the rendered HTML — this preserves exact-match behavior for IDs, code identifiers, and file paths.
- Build the index off the render-critical path: lazily on first search, incrementally per-file, or in a background task/worker — never as a synchronous blocking step before the app becomes interactive.
- Cache the built index across restarts where safe, and only rebuild entries for files whose mtime changed since the cache was written, rather than a full rebuild every launch — cheap because there's no watcher requiring live invalidation, but still avoids paying the full-corpus cost every single start.
- Show match context (a snippet centered on the actual matched term, not the file's opening lines) and surface which field/artifact-type matched (a hit in a `PLAN.md`'s `must_haves` vs. its prose objective are different kinds of relevant) — this directly serves the "why did this match" gap and reuses the phase/artifact-type grouping already required.
- For ranking on a small corpus, prefer exact-token boosting (an exact `ROLE-07` match should always outrank a fuzzy "role" match) over pure TF-IDF, since the corpus is dense with meaningful exact IDs that generic ranking treats as ordinary words.

**Warning signs:** Search for a requirement ID returning zero results when the ID is visibly present in a file; a noticeable startup delay that scales with corpus size; search results with no visible reason why they matched.

**Phase to address:** Findability phase — architectural for the source-vs-rendered indexing decision (must be right from the first implementation, since re-indexing a differently-modeled corpus later is a rewrite, not a patch); the caching/incremental-build refinement can land as a follow-up within the same phase.

---

### Pitfall 9: Local-tool ergonomics treated as an afterthought

**What goes wrong:**
A handful of small, boring failures compound into a tool that feels unreliable even though its core logic is correct:
- **Port conflicts** — hardcoding a dev-server-style port that's already in use elsewhere on the machine (the studio server already runs multiple services), with no fallback or clear error.
- **Path argument handling** — the tool is explicitly "targeted with a path argument/env var" per `PROJECT.md`; relative paths (`../other-project`), paths with `~` unexpanded by the shell in some invocation contexts, trailing slashes, and paths that point at the project root instead of `.planning/` (or vice versa) are all real inputs a personal tool's own author will hit within the first week of use.
- **Symlinks** — GSD projects can live inside a symlinked directory (common on a machine with multiple mounted drives, which this user's environment already has via NAS/RAID setups) or contain symlinked files; naive path-resolution or containment checks (`does this resolved path start with the target directory?`) can be fooled by or reject legitimate symlinks.
- **Permissions** — a `.planning/` directory or file unreadable by the current user (wrong ownership after being created by a different process/user, or copied from another machine) should produce a clear, scoped error, not a silent empty view or a stack trace.
- **Stale caches surviving a restart** — any on-disk cache (search index, parsed-frontmatter cache) that isn't invalidated by content changes will serve wrong data after a restart if the target `.planning/` changed since the cache was written, silently reintroducing Pitfall 5's staleness problem through the back door.
- **Launching the browser** — auto-opening a browser tab on a headless/remote session, or opening it to the wrong port after a fallback port was chosen, are small papercuts that erode trust in a tool meant to be opened casually and often.

**Why it happens:**
These are unglamorous compared to the parsing/rendering work, so they get deferred, but for a tool whose whole reason to exist is "reduce friction versus opening files by hand," friction reintroduced at the ergonomics layer defeats the purpose just as effectively as a parsing bug.

**How likely for this project:** Medium — the constraints are already well-scoped (single user, clone-and-run, path-argument startup), which limits the surface, but path/symlink/cache handling specifically interacts with the two-fixture testing strategy from Pitfall 1 and is easy to under-test because it "obviously works" against the one real path used during development.

**How to avoid:**
- Resolve the path argument to an absolute, canonicalized path immediately at startup (resolving symlinks explicitly, e.g. `fs.realpath`-equivalent) and use that resolved path everywhere downstream — never mix relative and resolved paths in the same codebase.
- Fail fast and specifically: missing directory, missing `.planning/` inside it, and permission-denied should each produce a distinct, actionable startup error rather than a generic crash or an empty UI.
- Any cache keyed by file path should also be keyed or validated by mtime/hash, so a stale on-disk cache from a previous run is detected and invalidated rather than silently served.
- Pick a port with an automatic fallback (try N, then N+1, etc.) and print/display the actual port used; only auto-launch a browser when a display/interactive session is plausible, and make it easy to suppress.
- Test the path-argument UX against the same two fixture trees from Pitfall 1, invoked via relative path, `~`-path, and a symlinked path, not just the one absolute path used throughout day-to-day development.

**Warning signs:** "Works on my machine" bug reports (a symptom of testing only against one real, already-canonical path); a cache directory that never seems to shrink or update after files change.

**Phase to address:** Mostly late/polish, except path canonicalization and the read-layer's cache-invalidation strategy, which belong in the architectural reader-layer phase alongside Pitfalls 1, 3, 4, and 5.

---

### Pitfall 10: Theme porting drifts from "copy tokens" to "maintain a fork"

**What goes wrong:**
`PROJECT.md` commits to lifting studio-portal's oklch token palette, shadcn `base-sera` component style, `@base-ui/react` primitives, lucide icons, and squared-corner convention — explicitly "the tokens are copied; the codebase is not." The concrete ways this goes subtly wrong: dark-mode tokens ported incompletely (a light-mode oklch value copied but its dark-mode counterpart missed or approximated, since dark mode is usually a second, parallel token set, not a mechanical derivation of the light one); contrast ratios that were tuned against studio-portal's specific component compositions (a card-on-card, badge-on-muted-background combination) breaking when the same tokens are applied to GSD Lore's different layout and component mix; and token drift over time — studio-portal's design system keeps evolving (its own `.planning/quick/` history shows multiple recent quick-tasks specifically retuning navbar and scrollbar visual design), while GSD Lore's copy is a one-time snapshot that silently diverges with no mechanism to notice or reconcile.

**Why it happens:**
"Copy the tokens" sounds like a one-time, mechanical act, but a design system is tokens *plus* the component-level decisions about how they're combined (spacing scale, elevation/shadow use, focus-ring treatment) — porting only the token values without also porting (or independently re-deriving) those combination decisions produces something that looks superficially right in isolation and subtly wrong once real content and real components are laid out.

**How likely for this project:** Medium — the requirement is explicit and scoped narrowly ("tokens are copied; the codebase is not," "no coupling to studio-portal"), which limits the blast radius, but dark-mode-specific bugs and contrast issues are exactly the kind of thing that's invisible until tested directly, and there's an explicit maintenance-burden risk named implicitly by the "no dependency" constraint.

**How to avoid:**
- Port the full token set (both light and dark values) as a single atomic copy from studio-portal's actual token source file, not hand-transcribed from visual inspection — this avoids partial/approximated dark-mode values.
- Verify contrast (WCAG AA at minimum, for text-on-background and text-on-muted combinations actually used in GSD Lore's own layouts) directly in GSD Lore's own components, not by assuming studio-portal's own contrast choices transfer — GSD Lore's content-heavy, document-reading layouts are a different composition than studio-portal's app UI, and contrast that worked for a status badge doesn't guarantee it works for long-form markdown body text.
- Treat the port as a one-time snapshot explicitly, in writing (already true per `PROJECT.md`'s "no coupling" decision) — do not build any live or build-time dependency (shared package, copied component source with intent to keep syncing) that would create pressure to keep re-syncing as studio-portal's theme evolves. If studio-portal's theme changes meaningfully later, that's a deliberate, scoped re-port decision, not automatic drift to chase.
- Test both themes (light and dark) against real rendered markdown content (tables, code blocks, blockquotes, the unicode/emoji already present in studio-portal's own docs like `✅`/`🚧`/`█░` progress bars) early, since prose-heavy rendering surfaces contrast and spacing issues that a component-only theme check won't.

**Warning signs:** A dark-mode screen that's visibly worse than light mode (lower contrast, muddy borders) despite light mode looking fine; any code that imports from or references a studio-portal path/package at build or runtime (violates the explicit no-coupling constraint and reintroduces exactly the maintenance burden this decision was meant to avoid).

**Phase to address:** Look-and-feel phase — architectural for the "atomic one-time copy, no live dependency" decision; contrast verification and prose-specific testing are late/polish but should happen before that phase is called done, not deferred indefinitely.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Hardcoding `phases/NN-slug` path patterns without also handling `milestones/vX.Y-phases/` and `quick/<timestamp-slug>` | Faster to ship phase-detail views | Breaks on any project with archived milestones or quick tasks — silently omits real content | Never, once the requirement to support archived milestones exists (it does) |
| Deriving progress/status by counting checkboxes instead of reading `STATE.md`'s `progress` frontmatter | No need to understand the frontmatter schema up front | Produces a plausible-but-wrong number that undermines the tool's core trust proposition | Never |
| Enabling raw HTML passthrough to make GSD's pseudo-XML tags render | Quick fix for one visible rendering bug | Opens an XSS-shaped hole across the whole corpus | Never — use tag-escaping or an allowlist sanitizer instead |
| Testing only against `~/studio-portal` | Fastest path to a demo-able first render | Ships a tool that breaks on the very next project it's pointed at, which is this project's stated purpose | Never past the first spike/prototype |
| Building the index eagerly on every startup instead of caching it | Simplest to implement first | Startup latency scales with corpus size, defeating "open it and immediately know" | Acceptable for a very early spike, not for the shipped findability phase |
| Skipping frontmatter schema validation and trusting field presence/types | Faster initial parsing code | One malformed or older-version file crashes a page | Never, given GSD's stated version-drift compatibility constraint |

## Integration Gotchas

Not third-party services, but the equivalent surface for this project: coupling to a specific `gsd-core` version's output shape.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-------------------|
| `gsd-core` template/schema version | Assuming `config.json`'s ~60-key shape, `STATE.md`'s frontmatter fields, and the artifact-type list are fixed | Treat all of it as versioned and evolving; unknown fields are ignored gracefully, missing known fields fall back to sensible defaults, unrecognized top-level files/directories render as generic markdown rather than being dropped |
| `STATE.md`'s `phase_numbering` mode | Assuming phase numbers are globally unique across a project's lifetime | Always scope a phase by `(milestone, phase number)`, never by phase number alone — studio-portal's own `phase_numbering: restarts-per-milestone` proves numbers repeat across milestones |
| `quick/` directory naming | Assuming quick tasks share phase directories' `NN-slug` shape | Parse quick tasks as their own artifact type (`<date>-<code>-<slug>` directories with a variable artifact set), not as a phase-directory variant |
| Multiple GSD "root" doc sets per milestone (`REQUIREMENTS.md` vs `milestones/vX.Y-REQUIREMENTS.md`) | Reading only the top-level `REQUIREMENTS.md` and assuming it's the complete history | Surface archived milestone requirements/roadmaps distinctly, as the project's own requirements already demand ("Shows milestone history and archived milestones as distinct from the active one") |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Rendering every markdown file's syntax-highlighted code blocks eagerly on page load, even off-screen ones | Noticeably slow navigation into large `PLAN.md`/`RESEARCH.md` files (some 700–980 lines with many fenced code blocks) | Lazy/virtualized highlighting, or highlight on-demand as blocks scroll into view; cache highlighted output per file+hash | Once files exceed roughly a few hundred lines with multiple code blocks — already true of several real files in this corpus |
| Synchronous full-corpus search-index build on startup | Startup delay scales with number of files | Background/lazy/incremental index build, per Pitfall 8 | Corpus in the low hundreds of files, which studio-portal already exceeds |
| Re-parsing every file on every navigation instead of caching parsed output keyed by mtime | Repeated redundant work, slower perceived navigation over a session | Parse-and-cache in memory (or on disk) per file, invalidated by mtime, not by request | Noticeable once a session involves browsing many files back and forth, which is the primary usage pattern for this tool |

## Security Mistakes

Even for a single-user, local-only tool, a couple of domain-specific issues matter because the tool reads an arbitrary filesystem path supplied at startup.

| Mistake | Risk | Prevention |
|---------|------|------------|
| No path-containment check once a project root is resolved | A crafted or accidental relative-path/symlink inside `.planning/` could cause the app to read (and expose via search/rendering) files well outside the intended tree | Resolve the target path once at startup, and validate that any file the reader opens resolves to a path inside (or an intentionally-allowed symlink target within) the resolved project root |
| Raw HTML passthrough in the markdown renderer (Pitfall 7) | Content containing HTML-like text executes as live DOM instead of rendering as text | Escape unrecognized tags to visible text, or sanitize with an explicit allowlist if any real HTML support is needed |
| Trusting `config.json`/frontmatter values used to build file paths (e.g. a custom branch-template-like string) without validation | A malformed or unexpected value used unsanitized in path construction could enable path traversal | Never build filesystem paths directly from arbitrary document content; validate and allowlist any config value used in path construction |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| No visible "as of" timestamp (Pitfall 5) | User trusts stale data without realizing it | Persistent, unobtrusive load timestamp plus an easy refresh action |
| Search results with no context or match reason (Pitfall 8) | User can't judge relevance without opening every result | Contextual snippets centered on the match, plus visible artifact-type/phase grouping |
| A missing optional artifact (no `SECURITY.md` for a phase) rendered as a broken link or empty page | Feels like a bug, erodes trust project-wide | Simply omit the nav entry/tab for artifact types that don't exist for that phase — absence is normal, not an error state |
| An unrecognized artifact type silently dropped from navigation | User can't find something they know exists (they can see the file in an editor) | Render unknown files generically as markdown/plain text rather than omitting them, per the project's own stated requirement |
| Requirement IDs, phase names, and decision IDs shown as inert text | Defeats the "clickable cross-references" requirement, forces manual lookup | Cross-link every recognizable ID pattern (`REQ-NN`, `D-NN`, phase names) to its target, derived from the structured facts layer (Pitfall 3), not from regexing arbitrary prose |

## "Looks Done But Isn't" Checklist

- [ ] **Renders any GSD project:** Verify against a genuinely fresh/near-empty fixture (no `ROADMAP.md`, no `phases/`), not just against `~/studio-portal` — a tool that only handles the mature case isn't done.
- [ ] **Degrades gracefully on missing artifacts:** Verify by removing an optional file from a phase directory (no `UI-SPEC.md`) and confirming the nav/UI adapts, rather than showing a broken link or blank tab.
- [ ] **Unknown artifact tolerance:** Verify by adding a file GSD doesn't currently produce (a new template like `AI-SPEC.md`, or a made-up future doc type) and confirming it still appears and renders as markdown.
- [ ] **PLAN.md pseudo-XML renders correctly:** Verify a real multi-task `PLAN.md`'s `<task>`/`<decision>` prose renders with its markdown formatting intact, not as raw/garbled text (Pitfall 2) — this is easy to miss because a *simple* test file without nested pseudo-XML will look fine.
- [ ] **Frontmatter failure isolation:** Verify by deliberately corrupting one file's frontmatter (bad YAML indentation) and confirming only that file's structured view degrades, not the whole app.
- [ ] **Search matches on source tokens:** Verify a search for a real requirement ID or file path (e.g. `ROLE-07`, `backend/src/authz/mod.rs`) returns the expected file, not a false negative caused by indexing rendered/highlighted text instead of source text.
- [ ] **Progress numbers match `STATE.md`:** Verify any on-screen "X of Y phases/plans complete" figure is read from (or reconciles exactly with) `STATE.md`'s own `progress` frontmatter block, not independently recomputed by counting checkboxes elsewhere.
- [ ] **Archived milestone phases are distinct and reachable:** Verify `milestones/vX.Y-phases/NN-slug` content is browsable and doesn't collide in navigation with the active `phases/NN-slug` of the same number.
- [ ] **Dark mode checked against real prose, not just components:** Verify contrast and legibility on an actual long `RESEARCH.md`/`PLAN.md` render in dark mode, not only on isolated UI chrome.
- [ ] **Path argument robustness:** Verify startup with a relative path, a `~`-path, and a symlinked path, not only the one absolute path used during development.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|----------------|------------------|
| Parser overfit to studio-portal's shape (Pitfall 1) | HIGH | Retrofit the two-fixture testing strategy immediately; every failure the sparse/dense fixtures surface is a real bug to fix before continuing feature work — this is cheaper the earlier it's caught, and expensive (near-rewrite of the reader layer) if discovered after the UI is built on top of overfit assumptions |
| Raw-HTML/unsanitized rendering shipped (Pitfall 7) | LOW–MEDIUM | Swap in an allowlist sanitizer (or switch to tag-escaping) at the render pipeline level; since content is local and single-user, this is a contained, low-urgency fix once identified, but should not ship without it |
| Checkbox-counted progress numbers shipped and found wrong (Pitfall 3) | MEDIUM | Replace the derivation with a direct read from `STATE.md`'s `progress` frontmatter; audit anywhere else in the UI that derived a similar number the same brittle way |
| Search indexing rendered text instead of source (Pitfall 8) | MEDIUM | Rebuild the index against source markdown text; since there's no watcher and no external consumers of the index, this is a self-contained internal change, not a migration |
| Theme drift/contrast issues found post-launch (Pitfall 10) | LOW | Since it's a personal tool with a one-time token snapshot, re-derive the specific broken tokens directly rather than re-porting the whole set; no external consumers to coordinate with |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| 1. Overfit to studio-portal | Reader/parser layer (architectural, earliest phase) | Two-fixture (sparse + dense/unknown-type) test suite passes; no code references studio-portal-specific assumptions without a template/schema citation |
| 2. Pseudo-XML tags breaking rendering | Renderer/tech-stack selection (architectural) | Real `PLAN.md` with nested `<task>`/`<decision>` blocks renders with markdown formatting intact |
| 3. Markdown-as-database | Reader/parser layer (architectural) | On-screen progress/status figures reconcile exactly with `STATE.md` frontmatter; no section silently disappears when a document's shape is atypical |
| 4. Frontmatter/JSON crashes | Reader/parser layer (architectural) | Deliberately malformed fixture file degrades only its own view, not the whole app |
| 5. Confidently stale data | Reader layer (timestamp/refresh seam) + situational-awareness UI phase | Load timestamp visible on every session; refresh action present and functional |
| 6. Scope creep | Governance, every phase boundary | Every shipped feature traces to an Active requirement in `PROJECT.md`; no write paths exist in the data-access layer |
| 7. Unsafe HTML rendering | Renderer/tech-stack selection (architectural) | Sanitizer/escaping verified against a fixture containing angle-bracket text and script-like content |
| 8. Search staleness/ranking/source-text | Findability phase (architectural for source-indexing decision) | Exact ID/path search returns correct results; index build doesn't block interactivity |
| 9. Local-tool ergonomics | Reader layer (path canonicalization, cache keys) + late polish (port/browser) | Startup succeeds via relative, `~`, and symlinked paths; stale on-disk cache is invalidated after content changes |
| 10. Theme port drift | Look-and-feel phase (architectural: one-time atomic copy) | Contrast verified in both themes against real long-form content; no build/runtime reference to studio-portal |

## Sources

- Direct inspection of `~/studio-portal/.planning/` (STATE.md, ROADMAP.md, REQUIREMENTS.md, config.json, `phases/02-roles-permission-enforcement/02-01-PLAN.md`, `quick/` directory names, `milestones/v1.0-phases/` structure) — HIGH confidence, primary source.
- `~/.claude/gsd-core/templates/` (full template listing, including artifact types like `AI-SPEC.md` and `SPEC.md` absent from studio-portal's own tree) — HIGH confidence, primary source establishing the contract vs. the one example.
- `/home/cinedise/gsd-lore/.planning/PROJECT.md` — HIGH confidence, defines this project's own explicit scope boundaries and stated risks.
- [rehype-sanitize (GitHub)](https://github.com/rehypejs/rehype-sanitize) and [Secure Markdown Rendering in React with React-Markdown (Strapi)](https://strapi.io/blog/react-markdown-complete-guide-security-styling) — MEDIUM confidence, current community/vendor guidance on markdown XSS mitigation.
- [CopilotKit raw-HTML XSS advisory](https://github.com/CopilotKit/CopilotKit/issues/3938) — MEDIUM confidence, concrete real-world example of the rehype-raw-without-sanitize failure mode.
- [Client-Side Full-Text Search Engines comparison (npm-compare.com)](https://npm-compare.com/elasticlunr,flexsearch,fuse.js,js-search,lunr,search-index) — MEDIUM confidence, corroborates startup-blocking index-build behavior in common client-side search libraries.

---
*Pitfalls research for: local filesystem-backed GSD `.planning/` dashboard (GSD Lore)*
*Researched: 2026-08-21*

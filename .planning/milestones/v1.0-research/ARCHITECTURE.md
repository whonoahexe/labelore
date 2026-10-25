# Architecture Research

**Domain:** Local filesystem-backed, read-only web dashboard over a structured markdown corpus (GSD `.planning/`)
**Researched:** 2026-08-21
**Confidence:** HIGH (derived directly from PROJECT.md's stated constraints and a firsthand inspection of the real reference corpus at `~/studio-portal/.planning`, plus well-established patterns — repository pattern, chain-of-responsibility parsing, snapshot-based caching — not exotic or unproven choices)

## System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│  DISK: <project>/.planning/   (234 files / 5.6MB at studio-portal scale) │
└───────────────────────────────────┬──────────────────────────────────────┘
                                     │ fs.readdir / fs.readFile / fs.stat
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  LAYER A — PlanningFilesystem (the abstract file-tree contract)          │
│  list(dir) · read(path) · exists(path) · watch?(path,cb) · write?(...)   │
│                                                                            │
│  v1 impl:    LocalFsPlanningFilesystem(rootPath)                         │
│  v2 (named): WatchedFsPlanningFilesystem — adds watch capability         │
│  future:     MultiProjectRegistry — routes projectId → a Layer A instance│
│  future:     WritableFsPlanningFilesystem — adds write, capability-gated │
└───────────────────────────────────┬──────────────────────────────────────┘
                                     │ RawArtifact { path, content, mtimeMs }
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  LAYER B — Parsing Pipeline (the PlanningRepository)                     │
│  1. Discovery   : tree walk → ArtifactRef[] (path, inferred kind, phase) │
│  2. Handler reg.: ArtifactHandler<T> per kind + GenericMarkdownHandler   │
│                   fallback (always matches, lowest priority)             │
│  3. Assembly    : build Project/Milestone/Phase/Plan/Requirement/        │
│                   Artifact graph; resolve cross-refs eagerly             │
│  → ProjectSnapshot { project, warnings: ParseWarning[] }                 │
└───────────────┬─────────────────────────────────────┬────────────────────┘
                │                                      │
                ▼                                      ▼
┌───────────────────────────────┐    ┌──────────────────────────────────┐
│  Search Index (in-memory)      │    │  ProjectSnapshot (in-memory)     │
│  built from the same pass,     │    │  held behind one pointer,        │
│  swapped in lockstep with the  │    │  atomically swapped on           │
│  snapshot                      │    │  repository.refresh()            │
└───────────────┬─────────────────────────────────┬───────────────────────┘
                │                                  │
                └─────────────────┬────────────────┘
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  ROUTES / VIEW MODELS — overview, roadmap, phase, plan, requirements,    │
│  search, browse — read-only queries against the snapshot + index         │
└───────────────────────────────────┬──────────────────────────────────────┘
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  UI — a view-component-per-artifact-kind registry, GenericMarkdown       │
│  fallback; a link-rewrite pass turns relative .md links and bare IDs     │
│  (AUTH-01, D-05) into app routes                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

The single most important structural decision in this system is the **Layer A / Layer B split**: Layer A knows nothing about GSD, only about a file tree with an optional watch/write capability. Layer B knows GSD's shape but nothing about where the bytes come from. Every one of the three forward-compatibility obligations is satisfied by keeping this seam intact — see "Forward-Compatibility Seams" below.

## Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|-----------------|-------------------------|
| `PlanningFilesystem` | Abstract file-tree access: list, read, exists, optional watch/write, gated by a `capabilities` flag | Interface + `LocalFsPlanningFilesystem` (Node `fs`), later a chokodar-backed variant |
| `PlanningRepository` | Discovery, parsing, cross-reference resolution, snapshot lifecycle (`load`, `refresh`, `getSnapshot`) | Pure-ish orchestration class/module; all I/O delegated to Layer A |
| `ArtifactHandler` registry | Per-artifact-type parsing (frontmatter + structure) with one universal fallback | Chain-of-responsibility / strategy map keyed by filename pattern |
| Domain model (`Project`/`Milestone`/`Phase`/`Plan`/`Requirement`/`Artifact`) | In-memory, resolved graph — one snapshot per load/refresh cycle | Plain typed objects, built once, immutable per snapshot |
| Search index | Full-text index over all artifact titles/bodies/frontmatter, built alongside the snapshot | In-memory inverted index (e.g. MiniSearch), never persisted to disk |
| Routes / view models | Per-screen shaping of the domain model (grouping, pairing Plan+Summary, progress rollups) | Thin mapping functions, one per route, no I/O |
| UI renderer | Markdown → DOM, cross-reference link rewriting, per-kind view components with a generic fallback | Same registry pattern as the parser, one layer up |

## Recommended Project Structure

```
src/
├── planning-fs/                 # Layer A — filesystem abstraction
│   ├── types.ts                 # PlanningFilesystem interface, DirEntry, capabilities
│   └── local-fs.ts              # LocalFsPlanningFilesystem (v1's only implementation)
├── planning-repo/                # Layer B — parsing pipeline + domain model
│   ├── discovery.ts             # tree walk → ArtifactRef[]
│   ├── handlers/                # one file per artifact kind + generic.ts fallback
│   │   ├── plan.ts  summary.ts  roadmap.ts  state.ts  requirements.ts
│   │   ├── review.ts  security.ts  validation.ts  ui-spec.ts  ...
│   │   └── generic.ts           # GenericMarkdownHandler — always matches, last in chain
│   ├── assemble.ts              # ArtifactRef[] + parsed docs → resolved domain graph
│   ├── crossref.ts              # requirement/decision ID resolution, link-target resolution
│   ├── snapshot.ts              # ProjectSnapshot type, load()/refresh() orchestration
│   └── search-index.ts          # builds the in-memory index from the same snapshot pass
├── domain/                      # entity types only — no I/O, no framework code
│   └── model.ts                 # Project, Milestone, Phase, Plan, Requirement, Artifact, Decision
├── routes/                      # one module per route family, maps snapshot → view model
│   ├── overview.ts  roadmap.ts  phase.ts  plan.ts  requirements.ts  search.ts  browse.ts
└── ui/
    ├── markdown/                # renderer + link-rewrite pass
    ├── artifact-views/          # per-kind components + GenericMarkdownView fallback
    └── theme/                   # ported studio-portal tokens
```

### Structure Rationale

- **`planning-fs/` is deliberately tiny and dependency-free of everything above it.** It is the only place that will ever need to change for multi-project support (swap which root a `LocalFsPlanningFilesystem` is constructed with, or add a routing layer that picks one) or for a watcher (add a second implementation). Nothing in `planning-repo/` or above should import Node's `fs` directly — only `planning-fs/local-fs.ts` does.
- **`handlers/` mirrors GSD's own artifact taxonomy one file at a time**, with `generic.ts` structurally last and unconditionally matching — this makes "add support for a new GSD artifact type" a strictly additive change (new file, register it before generic), never a change to existing handlers or to discovery/assembly.
- **`domain/` has zero imports from `planning-fs/` or `planning-repo/`.** It is the vocabulary both the repository and the UI/routes share; keeping it dependency-free is what lets a future writer or a search-only CLI reuse the same entity types without pulling in the parsing machinery.
- **`routes/` is a thin view-model layer, not a copy of the domain model.** It exists specifically so "Plan and its paired Summary are readable together" (an explicit requirement) is a route-level composition, not a domain-model concern — the domain model keeps Plan and Summary as separate entities linked by ID; the route pairs them for display.

## Architectural Patterns

### Pattern 1: Capability-flagged filesystem contract (the data-layer boundary)

**What:** One interface, `PlanningFilesystem`, that every producer of planning bytes implements — a plain local reader today, a watcher-backed reactive source and eventually a writer later — distinguished by which optional methods they actually implement, declared via a `capabilities` object rather than by having different interfaces.

**When to use:** Any time a system must admit a future capability (watch, write) without knowing yet whether it will be built, and must not let the UI or the domain layer assume that capability exists.

**Trade-offs:** Slightly more ceremony than "just call `fs.readFile` from the route handler" — but it is the single change that makes all three forward-compatibility obligations tractable instead of speculative. Cost is front-loaded (one small abstraction, defined once in Phase A of the build order below) and never revisited.

**Example:**
```typescript
interface PlanningFilesystem {
  readonly capabilities: { watch: boolean; write: boolean };
  list(relDir: string): Promise<DirEntry[]>;
  read(relPath: string): Promise<{ content: string; mtimeMs: number; size: number }>;
  exists(relPath: string): Promise<boolean>;
  watch?(relPath: string, onChange: (event: FsChangeEvent) => void): Unsubscribe;
  write?(relPath: string, content: string): Promise<void>;
}

// v1's only implementation:
class LocalFsPlanningFilesystem implements PlanningFilesystem {
  readonly capabilities = { watch: false, write: false };
  constructor(private rootPath: string) {}
  // list/read/exists implemented over node:fs; watch/write simply absent.
}
```
The UI never calls `PlanningFilesystem` directly and never checks `capabilities` itself — it asks the `PlanningRepository`, which is the only consumer of Layer A. `capabilities` exists so that a later `refresh()`-triggering watcher, or a future write affordance, can assert "is this supported by the current source" at exactly one chokepoint, the same shape studio-portal's own `authz::require` chokepoint pattern uses for a different problem (deny by default, check once).

### Pattern 2: Registry-of-handlers with a mandatory fallback (the parsing pipeline)

**What:** Discovery produces `ArtifactRef`s (path + a best-guess kind from filename pattern). A registry of `ArtifactHandler`s is tried in priority order; a `GenericMarkdownHandler` is registered last and matches unconditionally, extracting YAML frontmatter best-effort and otherwise wrapping the whole file as `{ title, body }`.

**When to use:** Any corpus where the schema is a moving target and unrecognized items must never disappear or crash the pipeline — exactly PROJECT.md's "tolerates artifact types it does not recognize" requirement.

**Trade-offs:** Filename-pattern dispatch (not frontmatter-shape dispatch) was chosen deliberately after inspecting studio-portal's real corpus: `01-CONTEXT.md`, `01-RESEARCH.md`, and `01-PATTERNS.md` carry **no YAML frontmatter at all** (just a markdown `#` header), while `01-UAT.md`, `01-REVIEW.md`, `01-SECURITY.md`, `01-VALIDATION.md`, and `01-UI-SPEC.md` each have their own distinct frontmatter schema. Frontmatter shape is not a reliable dispatch signal across GSD's own artifact set; the filename convention (`NN-MM-PLAN.md`, `NN-SECURITY.md`, `STATE.md`, etc.) is the one signal GSD itself relies on to locate these files, so it is the correct dispatch key. Frontmatter is still parsed — just as *enrichment inside* a matched handler, never as *how* a handler is selected.

**Example:**
```typescript
interface ArtifactHandler<T = unknown> {
  kind: string;                       // 'plan' | 'summary' | 'roadmap' | 'security' | ...
  match(ref: ArtifactRef): boolean;   // filename/path pattern, checked in registration order
  parse(raw: RawArtifact): T;         // frontmatter (best-effort) + body; never throws
}

const GenericMarkdownHandler: ArtifactHandler<GenericArtifact> = {
  kind: 'unknown',
  match: () => true,                  // registered last — the universal catch-all
  parse: (raw) => ({
    title: deriveTitleFromFilenameOrFirstHeading(raw),
    frontmatter: tryParseFrontmatter(raw.content), // null on failure, never throws
    body: raw.content,
  }),
};

const registry = [PlanHandler, SummaryHandler, RoadmapHandler, StateHandler,
                  RequirementsHandler, SecurityHandler, ValidationHandler,
                  UiSpecHandler, ReviewHandler, /* … */ GenericMarkdownHandler];
```
An artifact that matches no typed handler still becomes an `Artifact { kind: 'unknown', title, body, frontmatter }` node attached to its owning phase — it "still appears and renders as markdown instead of disappearing," satisfying the requirement directly. One layer up, the UI applies the identical pattern: a per-kind view-component registry with `GenericMarkdownView` as the unconditional fallback, so a new artifact kind requires zero changes anywhere except optionally adding a nicer view for it later.

**Alternatives considered:** (a) frontmatter-driven dispatch — rejected, inconsistent across GSD's real corpus as shown above; (b) a single monolithic parser with a big `switch` on filename — rejected, violates "unrecognized types flow through without special-casing at every layer" the moment a new type appears, since every call site with a switch would need a new case; the registry pattern instead needs exactly one new file, registered once.

### Pattern 3: Snapshot-based load with a single refresh() seam (caching, search, and the watcher obligation)

**What:** The entire corpus is read, parsed, cross-reference-resolved, and indexed in one pass into an immutable `ProjectSnapshot { project, warnings }` plus a paired search index, held behind one pointer. `PlanningRepository.refresh()` reruns the pass and atomically swaps the pointer. Every route and the search endpoint read only from the current snapshot pointer — never from disk directly, never per-request.

**When to use:** A corpus small enough that "read everything" is cheap (hundreds of files, single-digit MB — studio-portal's reference scale) and where cross-referencing and full-text search are core features, both of which require touching most of the corpus anyway.

**Trade-offs:** Pays a fixed load cost on every refresh (acceptable at this scale — well under a second) in exchange for eliminating an entire class of cache-invalidation bugs: there is no per-route cache to keep consistent with a per-artifact cache to keep consistent with a search index — there is one snapshot, rebuilt as a unit. This is also exactly the shape a future watcher needs: watching only ever has to call the same `refresh()` a manual "Refresh" button calls, debounced, with no per-file fan-out invalidation logic to write.

**Example:**
```typescript
class PlanningRepository {
  private snapshot: ProjectSnapshot | null = null;
  constructor(private fs: PlanningFilesystem) {}

  async load(): Promise<ProjectSnapshot> { return this.refresh(); }

  async refresh(): Promise<ProjectSnapshot> {
    const refs = await discover(this.fs);                    // Stage 1
    const parsed = refs.map(r => parseWithRegistry(r));       // Stage 2 (per-file try/catch)
    const project = assembleDomainModel(parsed);               // Stage 3 (resolves cross-refs)
    const index = buildSearchIndex(parsed);
    this.snapshot = { project, index, warnings: collectWarnings(parsed) };
    return this.snapshot;
  }

  getSnapshot(): ProjectSnapshot {
    if (!this.snapshot) throw new Error('call load() first');
    return this.snapshot;
  }
}
```
v2's watcher becomes: `fs.watch?.('.', debounce(() => repository.refresh().then(pushToClients)))` — no restructuring of `PlanningRepository`, routes, or the UI, exactly the obligation PROJECT.md states.

## Data Flow

### Load / Refresh Flow (the only flow that touches disk)

```
CLI path arg
    ↓
LocalFsPlanningFilesystem(rootPath)      [Layer A]
    ↓ list()/read() calls
discover() → ArtifactRef[]                [Layer B, Stage 1]
    ↓
registry.parse() per ref, isolated try/catch  [Layer B, Stage 2]
    ↓
assembleDomainModel() → resolved graph    [Layer B, Stage 3 — cross-refs resolved HERE, eagerly]
    ↓                                  ↓
buildSearchIndex()              ProjectSnapshot { project, warnings }
    ↓                                  ↓
        atomically swapped into repository.snapshot pointer
```

### Render Flow (every subsequent request — no disk I/O)

```
Route hit (e.g. /milestones/v2.0/phases/1/plans/01-01)
    ↓
route view-model mapper reads repository.getSnapshot()   [pure memory read]
    ↓
pairs Plan + Summary, resolves requirement/decision backlinks already in the graph
    ↓
MarkdownRenderer + link-rewrite pass (relative .md links → app routes;
  bare AUTH-01/D-05 tokens → requirement/decision routes, using the resolved graph)
    ↓
per-kind view component (or GenericMarkdownView fallback)
    ↓
pixels
```

### Key Data Flows

1. **Cold start:** CLI path → `LocalFsPlanningFilesystem` → one full `refresh()` → snapshot + index ready before the server starts accepting routes (or the first route blocks on it) — no route is ever served against a half-built snapshot.
2. **Manual refresh (v1's only re-read mechanism):** user-triggered action calls the exact same `repository.refresh()` used at cold start — proven identical code path, which is also what a v2 watcher will call.
3. **Cross-reference resolution:** happens once, inside `assembleDomainModel()`, not per-render — see "Domain Model" below for why eager wins here.
4. **Search:** query hits the in-memory index built in the same pass as the snapshot; never touches disk, never rebuilds per-query.

## Domain Model

**Core entities**, in dependency order:

- **Project** — root: name, rootPath, parsed `PROJECT.md` sections (What This Is / Requirements / Constraints / Key Decisions), `config.json` (workflow toggles — informational, not behavior-driving in v1), has-many Milestone.
- **Milestone** — id/version string (`v2.0`), name, status (`active` / `shipped` / `archived`), has-many Phase, has one Requirements slice, one Roadmap doc reference. **Archived milestones' phases physically live under `milestones/vX.Y-phases/` while the active milestone's live under `phases/`** — the repository normalizes this at discovery time so `Milestone.phases` is uniform regardless of physical location; this is a real fact confirmed in studio-portal (`milestones/v1.0-phases/`, `phases/` for v2.0 current).
- **Phase** — **identity is the pair `(milestoneId, phaseNumber)`, not phase number alone** — studio-portal's `STATE.md` states `phase_numbering: restarts-per-milestone` explicitly, and v1.0's "Phase 1" and v2.0's "Phase 1" are different phases. Fields: slug, name, goal, successCriteria[], requirementIds[], dependsOnPhaseIds[], status, has-many Plan (grouped into waves), has-many Artifact (typed and generic).
- **Plan** — id (`NN-MM`), phase ref, wave, status, requirementIds[], filesModified[], dependsOnPlanIds[]; pairs 1:1 by filename convention with exactly one **Summary**.
- **Summary** — plan ref, provides[]/affects[]/tech-stack fields, actuals (tokens/tasks/commits).
- **Artifact** — the universal base entity every file becomes at minimum: `{ id, path, kind, phase?, plan?, frontmatter, title, body, mtimeMs }`. Typed artifacts (Plan, Summary, Review, Security, Validation, UiSpec, Learnings, Patterns, Context, Research…) are specializations that add structured fields on top of this base; anything the registry doesn't recognize stops at this base shape with `kind: 'unknown'` and still renders.
- **Requirement** — id (`AUTH-01`), text, checked/unchecked, milestone, section header, resolvedPhaseIds[] (many-to-many: a requirement can be claimed by more than one phase's `requirements:` frontmatter list in principle, though usually one).
- **Decision** — **not a first-class file-backed entity in GSD.** Decision IDs (`D-05`, `WR-02`) are a citation convention scattered across `CONTEXT.md`/`SUMMARY.md`/`PLAN.md` prose with no canonical registry file — confirmed by inspecting studio-portal, where `D-13`, `D-18`, `WR-02` etc. appear inline with no single source of truth. Model this as a **mentions index**, not a strict entity: scan artifact bodies for `D-\d+`/`WR-\d+`/`P\d+`-shaped tokens during assembly, build `decisionId → [mentioning artifact refs, first-seen text]`. Do not pretend to own a canonical Decision title/description beyond what's textually recoverable — a page can show "D-05, mentioned in 3 places" with excerpts, not a fabricated canonical record.

**Relationships:** Project 1—\* Milestone; Milestone 1—\* Phase; Phase 1—\* Plan (each with exactly one Summary); Phase 1—\* Artifact (all other typed and generic docs); Phase \*—\* Requirement; Plan \*—\* Requirement; Artifact \*—\* Decision (mentions, not ownership).

**Resolution strategy: eager, at load, into a fully resolved graph — not lazy at render.** Recommended for four concrete reasons specific to this system:

1. The corpus is small enough (hundreds of files, single-digit MB at reference scale) that a full resolution pass costs milliseconds-to-low-seconds, not a real budget concern.
2. Clickable cross-references are an explicit, load-bearing requirement — lazy resolution would mean re-scanning artifact bodies for ID mentions on every render or building an ad hoc cache anyway, which is eager resolution with extra failure modes, not less work.
3. Full-text search independently requires a whole-corpus pass; once that pass is happening, resolving the graph in the same pass is nearly free — building both artifacts from two separate passes would be pure waste.
4. Eager resolution produces one consistent snapshot every route and the search index read from — exactly the shape that generalizes cleanly to a future watcher (see Pattern 3): `refresh()` recomputes the whole resolved graph, not a partial one.

The one thing eager resolution must get right: **dangling references are expected, not exceptional.** A requirement ID mentioned that doesn't exist in `REQUIREMENTS.md`, or a relative link pointing at a file the discovery pass didn't find, must resolve to `{ raw: 'AUTH-07', resolved: null }` rather than throw — the UI renders the raw token as plain (non-linked, or greyed) text. This is degradation strategy (Q7) applied inside the domain model itself.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|---------------------------|
| Studio-portal reference scale (~234 files, 5.6MB, single project) | Eager full-load-into-memory as designed above; no adjustments needed |
| A much larger single project (thousands of files, tens of MB) | Full rebuild on every `refresh()` becomes the first cost worth revisiting — move to incremental re-parse (only re-run Stage 2/3 for changed paths on a watcher event) before touching anything else; snapshot-swap architecture is unchanged |
| Multi-project registry (future direction) | Each project gets its own `PlanningRepository` + snapshot, keyed by project id; memory cost is additive per open project, not shared — acceptable for a personal tool with a handful of projects open at once; no change to Layer A/B contracts, only a routing layer above `PlanningRepository` selecting which instance a request targets |

### Scaling Priorities

1. **First real bottleneck, if any:** full snapshot rebuild latency, only relevant once a watcher exists and a corpus is large — mitigated by incremental re-parse of changed paths rather than a full re-walk, without changing the snapshot-swap contract.
2. **Not a bottleneck at this project's actual scale:** memory footprint of holding the whole corpus parsed in RAM — a few hundred markdown files parsed into typed objects is low single-digit MB, irrelevant next to a modern machine's available memory for a localhost single-user tool.

## Anti-Patterns

### Anti-Pattern 1: Letting the UI read the filesystem or call GSD-specific parsing directly

**What people do:** Route handlers or React components call `fs.readFile` on a `.planning/` path directly, or import a specific handler (`parsePlan()`) inline where a view needs plan data.
**Why it's wrong:** It re-couples the UI to Layer A/B internals, defeating the entire point of the `PlanningFilesystem`/`PlanningRepository` split — the moment a watcher, multi-project switcher, or writer is added, every such call site must be found and rewritten.
**Do this instead:** UI and routes only ever call `repository.getSnapshot()` (or an equivalent query surface) and never import from `planning-fs/` or the handler registry.

### Anti-Pattern 2: Special-casing unrecognized artifact types per view

**What people do:** Add `if (artifact.kind === 'unknown') { ...special rendering... }` scattered across multiple components as new artifact types are discovered in the wild.
**Why it's wrong:** Directly violates "tolerates artifact types it does not recognize... without special-casing at every layer" — every new special-case is a place that can be forgotten, and the behavior for unknowns should be uniform, not view-specific.
**Do this instead:** `GenericMarkdownHandler` (parse-time) and `GenericMarkdownView` (render-time) are each registered once, matched last, and every other component simply never has to know an "unknown" case exists.

### Anti-Pattern 3: Per-route or per-artifact caching layered on top of the snapshot

**What people do:** Add a memoization/cache layer per route ("cache the roadmap page for 60s") independent of the snapshot-refresh lifecycle, reasoning it will speed up repeated visits.
**Why it's wrong:** At this corpus size the snapshot read is already a memory access — sub-millisecond — so a secondary cache buys nothing and adds a second invalidation lifecycle a future watcher must also learn to bust, exactly the "targeted invalidation" complexity Pattern 3 is designed to avoid.
**Do this instead:** One snapshot, one refresh path, every route reads the same pointer; if profiling ever shows a real per-route cost (unlikely here), memoize the *view model mapping function*, not raw data, and key it off the snapshot's identity so it self-invalidates on refresh for free.

## Error and Degradation Strategy

Concrete handling per failure mode, mapped to where it's caught and what the user sees — this is the operational form of the "works on any GSD project" requirement:

| Failure | Where handled | What the user sees |
|---|---|---|
| Path argument does not exist / not a directory | `LocalFsPlanningFilesystem` construction, checked before `load()` runs | App boots to an explicit "no project loaded — path not found" screen, not a crash; fixable without restarting the process once multi-project targeting exists |
| Directory exists but isn't a GSD project (no `.planning/`, no recognizable root doc) | `PlanningRepository.load()` — minimum bar check (`.planning/` present + at least one of `PROJECT.md`/`STATE.md`/`ROADMAP.md` parseable) | Explicit empty-state page: "This doesn't look like a GSD project" — never a stack trace or a blank screen |
| Missing optional artifacts (no `UI-SPEC.md`, no `SECURITY.md`, no `quick/`, no `milestones/`) | Domain model — every optional field/collection is genuinely optional (empty array, not assumed-present); every UI section checks presence before rendering | The section/tab simply doesn't appear — this is normal-path behavior, not an error state, and is the actual shape of studio-portal's own corpus (e.g. Phase 4 has no `SECURITY.md`/`REVIEW.md` at time of research) |
| Malformed frontmatter in one file | Inside the matched `ArtifactHandler.parse()`, try/catch scoped to the frontmatter-parse step only | That one file degrades to `frontmatter: null` with its raw body still rendered as markdown — never blocks the rest of the load |
| Unparseable `ROADMAP.md` / `STATE.md` structure | Same per-file isolation as any other artifact — structural parse attempted, raw markdown fallback if it fails entirely | Derived views needing that structure (e.g. phase dependency diagram) show "unable to determine phase structure from ROADMAP.md" instead of crashing; the raw file is still viewable |
| Unrecognized artifact type | `GenericMarkdownHandler` / `GenericMarkdownView` (Pattern 2) | Renders as plain markdown under its owning phase, exactly like a known type minus the specialized view |
| Dangling cross-reference (ID or link with no resolution target) | `assembleDomainModel()` / `crossref.ts`, resolved to `{ raw, resolved: null }` | Rendered as plain (non-linked or visibly disabled) text instead of a broken link or thrown error |

**General principle governing all of the above:** the load pipeline's outer contract is *it always produces a snapshot* — even a nearly-empty one — collecting a `warnings: ParseWarning[]` list on the snapshot rather than ever throwing past Stage 2. The single exception is "not a GSD project at all," which gets its own dedicated empty-state UI rather than being folded into warnings, because it's a different kind of failure (nothing to show at all) than "most of the project loaded, a few files didn't parse cleanly."

## Forward-Compatibility Seams (explicit)

| Obligation | Named seam | Why it's sufficient |
|---|---|---|
| **Multi-project** (registry/switcher, future) | `PlanningFilesystem` is constructed with a root path and nothing else assumes there's only one instance; a future `MultiProjectRegistry` is a thin router that holds `Map<projectId, PlanningRepository>` and picks one per request — no change to Layer A/B contracts or to any route/view code, which already only ever talks to "the current repository" | The seam already treats "which project" as an external parameter to construction, never baked into any downstream type |
| **Live file-watching** (v2) | `PlanningFilesystem.capabilities.watch` + optional `watch()` method; `PlanningRepository.refresh()` is the exact function both a manual refresh button and a future watcher call | v1 ships `refresh()` wired to a manual action; v2 wires the identical function to a debounced fs-event callback — zero restructuring, per PROJECT.md's explicit requirement |
| **Write-back / driving GSD** (furthest future direction) | `PlanningFilesystem.capabilities.write` + optional `write()` method, declared in the interface now, implemented by nobody in v1 | The UI can assert "this source is read-only" from `capabilities.write === false` at one chokepoint rather than v1 code assuming read-only everywhere it happens to matter; adding a writer later never requires touching the interface's shape, only adding a new implementing class |

## Recommended Build Order (coarse granularity)

Given the dependency shape above (Layer A → Layer B → routes/UI → search/browse → degradation hardening), and the project's own coarse-phase convention (3–5 broad phases, 1–3 plans each):

### Phase A — Read layer & domain model foundation
Build `PlanningFilesystem` (local implementation only), the discovery + registry parsing pipeline with the generic fallback handler, and domain-model assembly with eager cross-reference resolution — exercised against studio-portal's real `.planning/` via a non-UI harness (e.g. dump the resolved `ProjectSnapshot` as JSON). This phase alone proves out the data-layer boundary, the parsing pipeline, the domain model, and the degradation strategy, since none of it requires a browser to validate. Nothing else can start before this exists; it depends on nothing else. **~1–2 plans:** (1) filesystem layer + discovery + generic handler + minimal domain assembly; (2) typed handlers per known artifact kind + full cross-reference resolution + degradation edge cases run against deliberately broken fixtures.

### Phase B — Situational-awareness UI shell
App skeleton (routing, layout, studio-portal-derived theme tokens), the overview/roadmap/phase/plan-detail routes reading from Phase A's snapshot, and the markdown renderer with cross-reference link rewriting. Establishes the URL scheme and the render-time half of the registry pattern. Depends entirely on Phase A's snapshot contract being stable. **~2–3 plans:** shell + theme + routing skeleton; roadmap/phase/plan views; markdown rendering + link rewriting.

### Phase C — Search & full navigability
Search index build-and-query wired to the same snapshot, the raw `/browse` tree view (an escape hatch independent of the domain model, walking `PlanningFilesystem.list()` directly so it works even where the domain model can't fully interpret a directory), and the requirements traceability view. Depends on Phase A (snapshot/index) and Phase B (routing/rendering conventions to embed results into). **~1–2 plans.**

### Phase D — Polish, refresh, and degradation hardening
Wire the explicit "Refresh" action to `repository.refresh()` (rehearsing the exact seam the future watcher will call), build and test empty-state/error-state UI for every failure mode in the table above against deliberately partial/broken fixtures — not just studio-portal's clean corpus — and do visual QA against the studio-portal theme. Belongs last because meaningful degradation testing needs the full app surface (Phases A–C) already built to exercise it against; this is what actually proves "works on ANY GSD project" rather than just the reference one. **~1–2 plans.**

**Why this order, restated:** A is the pure-data foundation nothing else can render without. B and C both consume A's snapshot and could theoretically interleave, but B establishes the rendering/link-rewrite/routing conventions C's search results and traceability links need to point into, so B-before-C is the safer sequencing at coarse granularity. D is deliberately last, not first — you cannot verify "a missing `SECURITY.md` doesn't break the phase page" until the phase page exists to test it against.

## Integration Points

### External Services

None. This is a fully local, filesystem-only, single-user tool by explicit constraint — no external service integration exists or is anticipated in v1.

### Internal Boundaries

| Boundary | Communication | Notes |
|---|---|---|
| `planning-fs/` ↔ `planning-repo/` | Direct in-process calls through the `PlanningFilesystem` interface | The only boundary that changes shape for multi-project/watcher/writer support — see Forward-Compatibility Seams |
| `planning-repo/` ↔ `routes/` | Direct in-process calls: `repository.getSnapshot()` and view-model mapper functions | Snapshot is read-only from this side; no route ever mutates it |
| `routes/` ↔ `ui/` | Whatever the chosen framework's data-to-component convention is (server components, props, loader data — framework choice deferred to STACK research) | View models are already shaped for display by the time they cross this boundary; no further domain logic belongs on the UI side |
| Search index ↔ everything else | Built and swapped in lockstep with the snapshot inside `refresh()`, queried read-only from the search route | Never has an independent invalidation lifecycle from the snapshot — see Anti-Pattern 3 |

## Sources

- `/home/cinedise/labelore/.planning/PROJECT.md` — authoritative source for the three forward-compatibility obligations, the read-only constraint, and the "works on any GSD project" requirement (HIGH confidence — primary project document).
- `~/studio-portal/.planning/` (live inspection: `STATE.md`, `ROADMAP.md`, `REQUIREMENTS.md`, `MILESTONES.md`, `phases/01-portal-owned-identity-sessions/*`, `quick/*/`, `milestones/v1.0-*`) — the actual reference corpus this architecture is designed against; confirmed corpus scale (234 `.md` files, 5.6MB), inconsistent frontmatter across artifact types, per-milestone phase-number restart, and the informal (non-canonical) nature of decision IDs (HIGH confidence — direct primary-source inspection, not inference).
- Repository pattern, chain-of-responsibility/strategy for extensible parsing, and snapshot-based caching are established, widely-documented architectural patterns applied here to this domain's specific constraints, not sourced from a single external reference (MEDIUM confidence on the general pattern names; HIGH confidence on their fit to this project's stated constraints, which is the load-bearing claim).
- In-memory search library choice (e.g. MiniSearch) is a directional recommendation sized to a "hundreds of documents, single-user, localhost" search workload, not a benchmarked or externally-verified pick — flag for STACK.md research to confirm the specific library against the chosen frontend/backend stack (MEDIUM confidence).

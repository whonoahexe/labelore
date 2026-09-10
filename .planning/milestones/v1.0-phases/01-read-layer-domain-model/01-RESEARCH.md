# Phase 1: Read Layer & Domain Model - Research

**Researched:** 2026-08-21
**Domain:** Node/TypeScript filesystem-backed parsing pipeline over a structured markdown+JSON corpus (GSD `.planning/`) — no UI, no web framework
**Confidence:** HIGH (architecture, domain schema, and pitfalls come from primary-source project research already committed to this repo, cross-checked this session against the actual GSD core 1.11.0 source at `~/.claude/gsd-core/` and this project's own `.planning/config.json`; package versions confirmed live against npm)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Test Fixtures (DATA-06)**
- **D-01:** Dense fixture is hand-authored synthetic, shaped from `~/.claude/gsd-core/templates/`, never from `~/studio-portal`. Must carry artifact types studio-portal never produced (`AI-SPEC.md`, `SPEC.md`, an invented future doc type) and a third milestone. Every "field/directory X exists" assumption in the parser must trace to a template line.
- **D-02:** Deliberately corrupted files (tab-broken YAML in a `PLAN.md`, trailing comma in a `HANDOFF.json`, frontmatter with no body) live *inside* the dense fixture, among healthy files — not isolated. Consequence: the dense fixture's golden snapshot permanently contains warnings; "zero warnings" can never be asserted against it.
- **D-03:** Two sparse variants, not one — `sparse-empty/` (`PROJECT.md` + `REQUIREMENTS.md` + earliest-shape `STATE.md`, no `ROADMAP.md`, no `phases/`) and `sparse-started/` (one phase, a `ROADMAP.md`, no `milestones/`). Total fixture count for the phase is **three trees**, extending DATA-06's literal "two fixtures" wording — flag this to the roadmap.
- **D-04:** `~/studio-portal` is a manual smoke target only. Zero committed assertions against it. The machine-checked contract is entirely fixture-derived.

**Verification Harness (DATA-05, TGT-01, TGT-02)**
- **D-05:** Harness is a CLI plus a golden-file test suite sharing exactly one entry point. CLI (`npm run snapshot -- <path>`) prints snapshot JSON to stdout; Vitest invokes the same code path against each fixture and diffs a committed golden.
- **D-06:** Artifact bodies omitted from the dump by default, behind a flag that includes them. Default output carries structure, frontmatter, resolved cross-refs, warnings, and a body length + hash.
- **D-07:** One normalizing serializer owns every machine-varying value — absolute paths become project-root-relative, `mtimeMs` becomes a stable placeholder under a `--stable` flag the golden tests always pass. Raw CLI dump keeps real values.
- **D-08:** SC4 is proven by writing a second `PlanningFilesystem` backed by an in-memory `path → content` map and running the same golden tests through it. Byte-identical snapshots from either implementation prove the seam by construction.

**Degradation & Warnings**
- **D-09:** Warnings live in both `snapshot.warnings[]` (flat) and a reference on each affected artifact. Both populated from one source during assembly.
- **D-10:** Unresolvable cross-references are NOT warnings — modeled as `{ raw, resolved: null }` on the graph, out of the warning channel entirely. Dangling references are expected, not exceptional.
- **D-11:** A warning record carries four fields: `path`, `stage` (`read` / `frontmatter` / `structured-extraction` / `assembly`), `message`, `salvage` (what survived).
- **D-12:** `load()` never throws. A non-GSD target still resolves to a snapshot carrying `loadStatus` (`ok` / `not-a-gsd-project` / `path-not-found` / `permission-denied`) plus the exact path checked.

**ID Scanning & Cross-References (NAV-07, SC5)**
- **D-13:** The prose scanner recognizes exactly four ID schemes: requirement IDs (`[A-Z][A-Z0-9]*-\d{2,}`), phase references, plan IDs (`NN-MM`), decision IDs (`D-NN`). Everything else in GSD's nine-scheme inventory is recorded only where already structured in frontmatter, never scanned from prose.
- **D-14:** The `D-05`-vs-`D1` collision is resolved by resolving each ID within the context of the artifact type it was found in — never a single global namespace. Structural consequence: the scanner runs **after handler dispatch**, not alongside discovery.
- **D-15:** The scanner skips both fenced code blocks and inline code spans. Known cost: backtick-quoted IDs (`` `AUTH-01` ``) are missed; the documented fallback if this proves too lossy is inline-spans-yes/fences-no — never "scan everything."
- **D-16:** Each mention record carries artifact ref, position (line/offset), and a surrounding excerpt. Positions must survive the D-07 normalizing serializer into goldens.

### Claude's Discretion

- **Structured-extraction depth** — how deep typed handlers parse in Phase 1 vs. Phase 2 (e.g. whether the ROADMAP handler extracts phase blocks — goal, success criteria, requirements, wave grouping, `**Depends on**` — in this phase, and whether the ASCII dependency diagram is parsed or carried as opaque body text). This research's recommendation: see "Structured-Extraction Depth" under Architecture Patterns below.
- **Path targeting mechanics (TGT-01/TGT-02)** — env var vs. positional argument, whether pointing at `.planning/` itself works as well as the project root, symlink containment policy, exact startup failure wording. This research's recommendation: see "Path Targeting Mechanics" under Architecture Patterns below.

### Deferred Ideas (OUT OF SCOPE for this phase)

- A third, purely-hostile fixture (permission-denied files, empty `.planning/`, not-a-GSD-project-at-all) — deferred; cheaply authorable later via D-08's in-memory filesystem for Phase 4's TGT-07.
- A `--summary` digest mode on the harness CLI (counts by kind, tree outline, warning list, unresolved-reference list).
- An unresolved-reference rollup count on the snapshot ("47 dangling requirement IDs").
- An ESLint rule forbidding `node:fs` imports outside `src/planning-fs/`.
- Capturing the underlying caught error (message/stack) on warning records.
- Scanning inline code spans for ID mentions (the documented fallback if D-15 proves too lossy).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| TGT-01 | User starts the dashboard with a project path argument and it renders that project's `.planning/` | "Path Targeting Mechanics" pattern below; `loadStatus` union (D-12); path canonicalization code example |
| TGT-02 | Path argument accepts relative, `~`-prefixed, and symlinked paths | Same as above — tilde-expansion + `fs.realpathSync` code example; PITFALLS #9 |
| DATA-01 | Filesystem access sits behind an interface admitting multi-project, watcher, and eventual write sources | `PlanningFilesystem` capability-flagged interface (Architecture Pattern 1); Forward-Compatibility Seams table |
| DATA-02 | Parsing dispatches on filename pattern, generic handler registered last, unconditional match; frontmatter presence never used as dispatch signal | `ArtifactHandler` registry pattern (Architecture Pattern 2); GSD-DOMAIN.md's confirmed frontmatter-inconsistency evidence |
| DATA-03 | `config.json` and artifact-type set parsed as open maps; unknown keys/types preserved | GSD-DOMAIN.md config.json schema-drift findings; `Record<string, unknown>` domain model recommendation |
| DATA-04 | Whole snapshot rebuildable through one `refresh()` entry point | Architecture Pattern 3 (`PlanningRepository.refresh()`) |
| DATA-05 | Non-UI harness dumps parsed snapshot as JSON | D-05, D-06, D-07 — CLI + golden test shared entry point, normalizing serializer |
| DATA-06 | Two (really three, per D-03) synthetic fixtures, dashboard renders both | Fixture Design section below; traceability-to-template requirement (D-01, PITFALLS #1) |
| NAV-07 | Snapshot exposes a decision-mention index, verifiable through the harness | D-13 through D-16; mention-record code example; `D-NN` vs `D1` collision handling |

</phase_requirements>

## Summary

Phase 1 builds a **headless, two-layer read pipeline**: a tiny, GSD-agnostic filesystem abstraction
(`PlanningFilesystem`) underneath a GSD-aware parsing/assembly pipeline (`PlanningRepository`), producing
one immutable `ProjectSnapshot` per `load()`/`refresh()` call. Nothing in this phase touches a browser —
correctness is proven entirely by a CLI that dumps the snapshot as JSON and a Vitest golden-file suite
that exercises the same entry point against three hand-authored fixture trees (two sparse variants per
D-03, one dense/adversarial per D-01/D-02) plus a second, in-memory `PlanningFilesystem` implementation
(D-08) that must produce byte-identical output.

The single highest-severity risk for this phase, confirmed independently by both `PITFALLS.md` and this
project's own `PROJECT.md`, is **overfitting the parser to `~/studio-portal`'s shape** rather than to
GSD's actual contract. This session re-verified the two load-bearing facts underpinning that contract
directly against GSD core 1.11.0's own source (not just the prior research's citations of it): the
canonical root-artifact registry (`artifacts.cjs` lines 18–39) and the phase-number token grammar
(`phase-id.cjs` line 50). Both match `GSD-DOMAIN.md`'s prior findings exactly — see Sources for the
verbatim quotes. The dense fixture's shape must trace to these same primary sources, never to what
happens to be sitting in `~/studio-portal` today.

Structurally, the phase has almost no new package surface: `TypeScript` (7.0.2 / "tsgo"), `vitest`
(4.1.11), and `gray-matter` (4.0.3, always guarded) are the only runtime/test dependencies this phase
needs — the markdown-rendering half of the stack (`unified`/`remark`/`rehype`/`shiki`, Vite, Hono, React)
belongs to Phase 2 and must not be pulled in here. One genuinely new finding from this session: **Node
22.23 (the local runtime) runs `.ts` files directly with zero flags and zero extra dependencies** —
confirmed by executing a `.ts` file in this session — which removes the need for `tsx`/`ts-node` as a
CLI-runner dependency (both would otherwise need a `checkpoint:human-verify` gate; see Package Legitimacy
Audit). This directly serves D-05's "CLI and Vitest suite share one entry point" requirement with the
least possible ceremony: the CLI file need only be executed, not built.

**Primary recommendation:** build `planning-fs/` (Layer A, local + in-memory implementations),
`planning-repo/` (Layer B: discovery → registry-dispatched parsing → assembly with eager cross-reference
resolution → snapshot), and `domain/` (dependency-free entity types) exactly per `ARCHITECTURE.md`'s
Pattern 1–3 and Domain Model sections, wire the CLI (`npm run snapshot -- <path>`, run via Node's native
type-stripping) and Vitest golden suite to the identical `PlanningRepository.load()` call per D-05, and
build the three fixture trees from `~/.claude/gsd-core/templates/` before writing a single parser
assumption.

## Architectural Responsibility Map

Phase 1 has no browser/CDN tier — it is a local Node process with a CLI entrypoint. The standard
web-tier vocabulary is mapped onto its closest structural analogue below; tiers with no applicable
component in this phase are marked accordingly (they belong to Phase 2+).

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Raw file/directory access (list, read, exists) | Storage/Filesystem (`planning-fs/`) | — | The one place `node:fs` may be imported (Anti-Pattern 1); everything above it is I/O-agnostic |
| Artifact discovery + filename-pattern dispatch | Backend/Domain logic (`planning-repo/discovery.ts` + `handlers/`) | Storage (consumes Layer A) | GSD-specific knowledge starts here; Layer A knows nothing about GSD |
| Frontmatter/structure parsing per artifact type | Backend/Domain logic (`planning-repo/handlers/*`) | — | Per-file, try/catch isolated (PITFALLS #4); generic fallback always matches last |
| Cross-reference resolution + mention scanning | Backend/Domain logic (`planning-repo/crossref.ts`, `assemble.ts`) | Domain model (`domain/`) | Runs once, eagerly, inside assembly — not per-render (no render exists yet in this phase) |
| Snapshot lifecycle (`load`/`refresh`) | Backend/Domain logic (`planning-repo/snapshot.ts`) | — | The seam a v2 watcher and this phase's CLI both call identically |
| CLI entrypoint (dump JSON) | Backend/Domain logic, acting as the process entrypoint | — | Analogous to a thin server entrypoint in a full-stack app; no HTTP surface exists yet |
| Golden-file test harness | Test/Verification (Vitest) | Backend/Domain logic (same entry point as CLI, per D-05) | Not a runtime tier — the mechanism proving the boundary above is real |
| Rendering, routing, theming, markdown→HTML | *(none — Phase 2)* | — | Explicitly out of this phase's boundary per CONTEXT.md `<domain>` |
| Search index build | *(none — Phase 3)* | — | Out of scope; NAV-07's mention index is a different, smaller thing built now |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| TypeScript | 7.0.2 [VERIFIED: npm registry, checked 2026-08-21] | Language/type-checking | Locked project-wide stack decision (`.claude/CLAUDE.md`); native Go-ported compiler ("tsgo"), now `latest` on npm. Fall back to `typescript@^5` if any tooling in this phase's specific patterns doesn't work under TS7 (verify `tsc --version`/editor integration on first setup). |
| vitest | 4.1.11 [VERIFIED: npm registry, checked 2026-08-21] | Golden-file test suite (D-05), shares the CLI's entry point | Locked stack decision; native Vite/esbuild TS transform means no separate loader config needed for test files even though Phase 1 has no Vite yet — vitest transforms TS independently of a Vite app existing. |
| gray-matter | 4.0.3 [VERIFIED: npm registry, checked 2026-08-21] | YAML frontmatter extraction | Locked stack decision. **Must always be called inside try/catch** — throws by default on malformed YAML (a tab-broken block, exactly what D-02's corrupted fixture file exercises); this is the direct mechanism behind D-11's `frontmatter`-stage warning. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/node` | 26.2.0 [VERIFIED: npm registry, checked 2026-08-21] | Type definitions for `node:fs`/`node:path`/`node:os` | Needed the moment `planning-fs/local-fs.ts` is written; devDependency only. |
| *(none — no glob library)* | — | Recursive directory walk for `PlanningFilesystem.list()` | **Do not add** `glob`/`fast-glob`. `fs.readdirSync(dir, { recursive: true, withFileTypes: true })` was executed directly in this session on the local Node 22.23.1 runtime and returned a correct recursive listing with file-type information — Node's own `fs` module is sufficient. See "Don't Hand-Roll." |
| *(none — no CLI-runner dependency)* | — | Running the `.ts` CLI entrypoint without a build step | **Do not add `tsx`/`ts-node`.** A `.ts` file with type-only syntax (interfaces, type aliases — no enums/namespaces) was executed directly with plain `node path/to/file.ts` in this session, zero flags, on the local Node 22.23.1 runtime — confirmed native type-stripping is already default-enabled (Node exposes `--no-experimental-strip-types` to *disable* it, meaning it ships on by default). This is the lowest-ceremony way to satisfy D-05's "CLI and test suite share one entry point," and it removes an otherwise-SUS-flagged dependency (see Package Legitimacy Audit) from the install list entirely. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node's native TS type-stripping for the CLI | `tsx` (esbuild-based TS runner) | Needed only if the codebase later requires non-erasable syntax (`enum`, `namespace`, decorators-as-values) that plain type-stripping can't handle — `--experimental-transform-types` extends coverage before reaching for `tsx`. Also, `tsx` was flagged `[SUS]` by this session's legitimacy check (see audit) purely on publish-recency, despite 70M+ weekly downloads and a long-lived, well-known repo — not a real slopsquat signal, but the checkpoint gate still applies if chosen. |
| `fs.readdirSync(..., {recursive:true})` for tree walk | `glob` / `fast-glob` | Only worth it if the walk needs include/exclude glob patterns (e.g. skipping `research/.cache/`) beyond a simple post-filter — a plain array `.filter()` on the native recursive listing covers that need at this corpus's scale (hundreds of files) without a dependency. |
| `gray-matter` (guarded) | `yaml` 2.9.0 directly | Only if finer control over partial/lenient YAML recovery is needed beyond gray-matter's try/catch-and-fallback — not needed here; the try/catch fallback (full content as body, empty frontmatter, `frontmatter`-stage warning) fully satisfies D-11/D-12's degradation contract. |
| Hand-written frontmatter validation (open-map read + manual field lifts) | `zod` (or similar runtime schema library) | Not in the locked stack (`.claude/CLAUDE.md` names no schema-validation library for this phase) and not strictly required by D-11/D-12's design: warnings are per-stage, not per-field, and GSD-DOMAIN.md's own recommendation is to read every frontmatter block as `Record<string, unknown>` and lift known fields with defaults, never a closed schema. Flagged as an **open question** below rather than assumed — the planner should decide whether typed field-lifting needs a validation library or plain optional-chaining suffices for this phase's scope. |

**Installation:**
```bash
npm install --save-dev typescript vitest gray-matter @types/node
```
No non-dev dependency is required for Phase 1 — the read layer, CLI, and test harness are all
devDependency-driven; there is no production runtime distinct from "run this Node script."

**Version verification:** All four packages above were checked live against the npm registry on
2026-08-21 via `npm view <package> version`; the eslint/prettier toolchain (if bootstrapped in this
phase per the "bootstrap work falls inside this phase" note in CONTEXT.md) was checked the same way —
see Package Legitimacy Audit for the full list and verdicts.

## Package Legitimacy Audit

Every package below was run through the legitimacy-check seam (`gsd-tools query package-legitimacy
check`) against the live npm registry on 2026-08-21.

| Package | Registry | Published | Weekly Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----------|-------------------|--------------|---------|--------------|
| `typescript` | npm | 2026-07-08 | 225,722,105 | github.com/microsoft/TypeScript | OK | Approved |
| `gray-matter` | npm | 2021-04-24 | 7,163,905 | github.com/jonschlinkert/gray-matter | OK | Approved |
| `@eslint/js` | npm | 2026-02-06 | 119,772,362 | github.com/eslint/eslint | OK | Approved |
| `prettier` | npm | 2026-07-21 | 110,238,330 | github.com/prettier/prettier | OK | Approved |
| `vitest` | npm | 2026-08-18 | 77,728,812 | github.com/vitest-dev/vitest | SUS — reason: "too-new" | Flagged — planner must add `checkpoint:human-verify` before install |
| `@types/node` | npm | 2026-08-07 | 348,951,646 | github.com/DefinitelyTyped/DefinitelyTyped | SUS — reason: "too-new" | Flagged — planner must add `checkpoint:human-verify` before install |
| `eslint` | npm | 2026-08-21 | 133,827,823 | github.com/eslint/eslint | SUS — reason: "too-new" | Flagged — planner must add `checkpoint:human-verify` before install |
| `typescript-eslint` | npm | 2026-08-10 | 75,088,819 | github.com/typescript-eslint/typescript-eslint | SUS — reason: "too-new" | Flagged — planner must add `checkpoint:human-verify` before install |
| `globals` | npm | 2026-08-12 | 227,094,176 | github.com/sindresorhus/globals | SUS — reason: "too-new" | Flagged — planner must add `checkpoint:human-verify` before install |
| `tsx` | npm | 2026-08-10 | 70,678,223 | github.com/privatenumber/tsx | SUS — reason: "too-new" | **Not recommended for this phase** — see Standard Stack; Node's native type-stripping replaces it, so this dependency should not be installed at all |

**Packages removed due to `[SLOP]` verdict:** none.

**Packages flagged as suspicious `[SUS]`:** `vitest`, `@types/node`, `eslint`, `typescript-eslint`,
`globals` (and `tsx`, not recommended for install regardless). **Pattern worth noting explicitly:** every
`[SUS]` verdict above carries the single reason `"too-new"`, which this seam derives from the *latest
published version's* publish date, not the package's age or legitimacy — each of these packages has a
multi-year-old, well-known GitHub repository and between 70 million and 349 million weekly downloads,
which is strong contrary evidence against a slopsquat/hallucination read. This is very likely a
false-positive shape (a mature package's routine patch release landing inside the checker's "too new"
window), but per protocol the verdict is reported as-is and the planner must still gate each install
behind a `checkpoint:human-verify` task rather than the researcher waiving the flag.

*Note on `[SUS]` vs. `[ASSUMED]`:* every package name above was already a locked stack decision from
`.claude/CLAUDE.md` (project-wide tech-stack research), not a name freshly discovered by this research
session via web search — so the package-name-provenance rule's `[ASSUMED]` tag does not apply to package
*existence*; the `[SUS]`/`[OK]` verdicts above are the live, tool-confirmed legitimacy signal for this
session specifically.

## Architecture Patterns

### System Architecture Diagram

```
<project>/.planning/  (disk)
        │  fs.readdirSync(recursive) / fs.readFileSync / fs.statSync
        ▼
┌───────────────────────────────────────────────────────────┐
│ LAYER A — PlanningFilesystem (planning-fs/)                │
│  capabilities: { watch: false, write: false }               │
│  list(dir) · read(path) · exists(path)                       │
│  v1: LocalFsPlanningFilesystem   (D-08: + InMemoryFs twin)   │
└───────────────────────┬───────────────────────────────────┘
                         │ RawArtifact { path, content, mtimeMs }
                         ▼
┌───────────────────────────────────────────────────────────┐
│ LAYER B — PlanningRepository (planning-repo/)               │
│  1. discover()      → ArtifactRef[] (path, inferred kind)    │
│  2. registry.parse()→ per-ref, try/catch isolated (DATA-02)  │
│  3. assemble()      → domain graph, cross-refs resolved      │
│     (D-10: dangling → {raw, resolved:null}, not a warning)   │
│  3b. scanMentions() → runs AFTER dispatch (D-14), scans      │
│     body text outside fences/spans (D-15) for the 4 ID       │
│     schemes (D-13) → mention records (D-16: ref+pos+excerpt) │
│  → ProjectSnapshot { project, warnings[], loadStatus }        │
│     (D-12: load() never throws; loadStatus always present)    │
└───────────────────────┬───────────────────────────────────┘
                         ▼
┌───────────────────────────────────────────────────────────┐
│ CLI (src/cli/snapshot.ts) — run via `node src/cli/snapshot.ts <path>`│
│  normalizingSerializer() (D-07): abs→root-relative paths,     │
│  mtimeMs→placeholder under --stable; body omitted by default  │
│  (D-06), included under --with-bodies                         │
└───────────────────────┬───────────────────────────────────┘
                         ▼
        stdout JSON  ◄────────────────►  Vitest golden-file suite
        (manual/smoke use)               (imports the SAME repository
                                          call — D-05 — diffs against
                                          committed golden per fixture)
```

The CLI and the Vitest suite are two callers of **exactly one** function
(`PlanningRepository.load(fs, rootPath)` → `normalizingSerializer(snapshot)`); this is D-05's whole
point, and Phase 4's "swap the filesystem" proof (D-08) works by swapping only the `fs` argument, not by
duplicating the call chain.

### Recommended Project Structure

```
src/
├── planning-fs/
│   ├── types.ts              # PlanningFilesystem interface, DirEntry, capabilities
│   ├── local-fs.ts           # LocalFsPlanningFilesystem — the ONLY file that imports node:fs
│   └── in-memory-fs.ts       # InMemoryPlanningFilesystem — D-08's twin implementation
├── planning-repo/
│   ├── discovery.ts          # tree walk → ArtifactRef[] (path, inferred kind, owning phase/quick-task)
│   ├── handlers/
│   │   ├── plan.ts  summary.ts  roadmap.ts  state.ts  requirements.ts  project.ts
│   │   ├── context.ts  validation.ts  security.ts  ui-spec.ts  ai-spec.ts  ...
│   │   └── generic.ts        # GenericMarkdownHandler — matches unconditionally, registered LAST
│   ├── assemble.ts           # ArtifactRef[] + parsed docs → resolved domain graph
│   ├── crossref.ts           # requirement/phase/plan/decision ID resolution → {raw, resolved}
│   ├── mentions.ts           # NAV-07's prose scanner (D-13–D-16), runs post-dispatch
│   ├── snapshot.ts           # ProjectSnapshot type; load()/refresh() orchestration; loadStatus (D-12)
│   ├── warnings.ts           # ParseWarning type (D-11); the single collection point for D-09
│   └── serialize.ts          # normalizingSerializer (D-07) — path/mtime normalization for goldens
├── domain/
│   └── model.ts               # Project, Milestone, Phase, Plan, Requirement, Artifact — zero I/O imports
├── cli/
│   └── snapshot.ts            # `node src/cli/snapshot.ts <path> [--with-bodies] [--stable]`
└── fixtures/                  # NOT under src/ in the final layout — see below
```

```
fixtures/
├── sparse-empty/.planning/       # D-03: PROJECT.md + REQUIREMENTS.md + earliest-shape STATE.md only
├── sparse-started/.planning/     # D-03: one phase, a ROADMAP.md, no milestones/
└── dense/.planning/              # D-01/D-02: AI-SPEC.md, SPEC.md, invented type, 3rd milestone,
                                   #            corrupted files interleaved among healthy ones
test/
├── snapshot.golden.test.ts       # loads each fixture through LocalFsPlanningFilesystem, diffs golden
├── snapshot.in-memory.test.ts    # D-08: same fixtures loaded through InMemoryPlanningFilesystem,
                                   #       asserts byte-identical output to the Local variant
└── __golden__/
    ├── sparse-empty.json
    ├── sparse-started.json
    └── dense.json                # permanently contains warnings — D-02
```

### Structure Rationale

- `planning-fs/` is the only place `node:fs` may be imported — the seam every forward-compatibility
  obligation (multi-project, watcher, write-back) depends on staying intact (DATA-01).
- `handlers/` mirrors GSD's own artifact taxonomy one file at a time, `generic.ts` unconditionally last
  — adding a new GSD artifact type is a strictly additive change (DATA-02).
- `domain/` has zero imports from `planning-fs/` or `planning-repo/` — it's the shared vocabulary a
  future writer or search-only tool could reuse without pulling in parsing machinery.
- Fixtures live outside `src/` (a `fixtures/` sibling directory) since they are test data, not source —
  keeps `src/` free of large synthetic trees while both harness callers (CLI smoke-testing, Vitest) can
  reference them by relative path.

### Pattern 1: Capability-flagged filesystem contract

**What:** One `PlanningFilesystem` interface — `list`/`read`/`exists` mandatory, `watch`/`write`
optional — with a `capabilities: { watch: boolean; write: boolean }` object declaring which optional
methods a given implementation actually provides.

**When to use:** Satisfying DATA-01 exactly: nothing downstream of `PlanningRepository` should ever
import `node:fs` or assume there is only one project root.

**Example:**
```typescript
// src/planning-fs/types.ts
export interface DirEntry {
  name: string;
  isDirectory: boolean;
}

export interface PlanningFilesystem {
  readonly capabilities: { watch: boolean; write: boolean };
  list(relDir: string): Promise<DirEntry[]>;
  read(relPath: string): Promise<{ content: string; mtimeMs: number; size: number }>;
  exists(relPath: string): Promise<boolean>;
  watch?(relPath: string, onChange: (event: unknown) => void): () => void;
  write?(relPath: string, content: string): Promise<void>;
}
```
```typescript
// src/planning-fs/local-fs.ts — the only file that imports node:fs
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { PlanningFilesystem, DirEntry } from './types.ts';

export class LocalFsPlanningFilesystem implements PlanningFilesystem {
  readonly capabilities = { watch: false, write: false };
  constructor(private readonly rootPath: string) {}

  async list(relDir: string): Promise<DirEntry[]> {
    const abs = join(this.rootPath, relDir);
    // Node 22.23.1: recursive + withFileTypes confirmed working natively this session —
    // no glob/fast-glob dependency needed.
    return readdirSync(abs, { withFileTypes: true }).map((d) => ({
      name: d.name,
      isDirectory: d.isDirectory(),
    }));
  }

  async read(relPath: string) {
    const abs = join(this.rootPath, relPath);
    const stat = statSync(abs);
    return { content: readFileSync(abs, 'utf8'), mtimeMs: stat.mtimeMs, size: stat.size };
  }

  async exists(relPath: string): Promise<boolean> {
    return existsSync(join(this.rootPath, relPath));
  }
}
```

### Pattern 2: Registry-of-handlers with a mandatory fallback

**What:** Discovery produces `ArtifactRef`s from filename patterns (never frontmatter shape — DATA-02).
A registry of `ArtifactHandler`s is tried in order; `GenericMarkdownHandler` matches unconditionally and
is registered last.

**Why filename dispatch, not frontmatter dispatch:** confirmed directly in GSD's own template set this
session — `CONTEXT.md`, `RESEARCH.md`, `DISCUSSION-LOG.md`, and `PATTERNS.md` carry **no YAML
frontmatter at all**, while `VALIDATION.md`, `SECURITY.md`, `UI-SPEC.md`, `UAT.md`, and `SUMMARY.md`
each have distinct frontmatter schemas (verified against the actual template files at
`~/.claude/gsd-core/templates/` — `context.md`, `research.md`, and `discussion-log.md` contain no
`---` frontmatter block; `VALIDATION.md`, `SECURITY.md`, `UI-SPEC.md` each open with one). Frontmatter
presence is therefore not a reliable dispatch signal across GSD's own artifact set — filename convention
is the one signal GSD itself relies on.

**Example:**
```typescript
// src/planning-repo/handlers/generic.ts
import type { ArtifactHandler, RawArtifact, GenericArtifact } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';

export const GenericMarkdownHandler: ArtifactHandler<GenericArtifact> = {
  kind: 'unknown',
  match: () => true,                    // registered LAST — the universal catch-all (DATA-02, TGT-05)
  parse: (raw: RawArtifact) => {
    const fm = tryParseFrontmatter(raw.content); // never throws — see D-11/D-12 below
    return {
      title: fm.data?.title ?? deriveTitleFromFirstHeading(raw.content) ?? raw.path,
      frontmatter: fm.data,               // {} on parse failure, not null — open map (DATA-03)
      body: raw.content,
      warning: fm.warning,                // undefined on success
    };
  },
};
```
```typescript
// src/planning-repo/frontmatter.ts — the guarded gray-matter call PITFALLS #4 requires
import matter from 'gray-matter';
import type { ParseWarning } from './warnings.ts';

export function tryParseFrontmatter(content: string): {
  data: Record<string, unknown>;
  body: string;
  warning?: Omit<ParseWarning, 'path'>;
} {
  try {
    const parsed = matter(content); // gray-matter throws on malformed YAML by default — MUST wrap
    return { data: parsed.data, body: parsed.content };
  } catch {
    // D-11: stage = 'frontmatter', salvage = 'body intact, frontmatter unavailable'
    return {
      data: {},
      body: content,
      warning: {
        stage: 'frontmatter',
        message: 'YAML frontmatter failed to parse',
        salvage: 'body intact, frontmatter unavailable',
      },
    };
  }
}
```

### Pattern 3: Snapshot-based load with a single `refresh()` seam

**What:** Discovery + parsing + assembly + mention-scanning run in one pass into an immutable
`ProjectSnapshot`; `refresh()` reruns the whole pass and returns a new snapshot. `load()` calls
`refresh()` once and never throws (D-12).

**Example:**
```typescript
// src/planning-repo/snapshot.ts
import type { PlanningFilesystem } from '../planning-fs/types.ts';
import type { ProjectSnapshot, LoadStatus } from './types.ts';
import { discover } from './discovery.ts';
import { parseWithRegistry } from './registry.ts';
import { assembleDomainModel } from './assemble.ts';
import { scanMentions } from './mentions.ts';
import { collectWarnings } from './warnings.ts';

export class PlanningRepository {
  private snapshot: ProjectSnapshot | null = null;
  constructor(private readonly fs: PlanningFilesystem, private readonly rootPath: string) {}

  async load(): Promise<ProjectSnapshot> {
    return this.refresh();
  }

  async refresh(): Promise<ProjectSnapshot> {
    const loadStatus = await this.checkTargetIsGsdProject(); // D-12: 'ok' | 'not-a-gsd-project' | ...
    if (loadStatus.status !== 'ok') {
      this.snapshot = { project: null, warnings: [], loadStatus };
      return this.snapshot; // load() NEVER throws — a status, not an exception
    }
    const refs = await discover(this.fs);
    const parsed = await Promise.all(refs.map((r) => parseWithRegistry(this.fs, r))); // per-file try/catch
    const project = assembleDomainModel(parsed);       // D-10: dangling refs → {raw, resolved:null}
    scanMentions(project, parsed);                       // D-14: AFTER dispatch, per-artifact kind context
    this.snapshot = { project, warnings: collectWarnings(parsed), loadStatus };
    return this.snapshot;
  }

  getSnapshot(): ProjectSnapshot {
    if (!this.snapshot) throw new Error('call load() first'); // programmer error, not a data condition
    return this.snapshot;
  }
}
```

### Pattern 4: Mention record shape (NAV-07, D-13–D-16)

```typescript
// src/planning-repo/mentions.ts
export type IdScheme = 'requirement' | 'phase' | 'plan' | 'decision';

export interface Mention {
  scheme: IdScheme;
  id: string;                 // e.g. "AUTH-01", "D-05"
  artifactRef: string;        // path of the artifact the mention was found in
  position: { line: number; offset: number };
  excerpt: string;            // surrounding text, per D-16
}

// D-13's four schemes — requirement IDs match GSD-DOMAIN.md's confirmed REQUIREMENTS.md grammar,
// re-verified this session by reading this project's own REQUIREMENTS.md (TGT-01..NAV-07, DATA-01..06
// all match `[A-Z][A-Z0-9]*-\d{2,}`).
export const ID_PATTERNS: Record<IdScheme, RegExp> = {
  requirement: /\b([A-Z][A-Z0-9]*-\d{2,})\b/g,
  decision: /\bD-(\d+)\b/g,                       // D-14: resolved only within CONTEXT.md-kind artifacts
  plan: /\b(\d{2,}-\d{2,})\b/g,                    // phase-plan pair, e.g. "01-02"
  phase: /\bPhase\s+(\d+[A-Z]?(?:\.\d+)*)\b/gi,     // token grammar verified this session, see Sources
};

// D-15: strip fenced code blocks (```...```) and inline spans (`...`) before scanning prose.
export function stripCodeForScanning(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, (m) => ' '.repeat(m.length))   // preserve offsets, blank the content
    .replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length));
}
```

### Structured-Extraction Depth (Claude's Discretion — recommendation)

**Recommendation: extract ROADMAP.md phase blocks fully in Phase 1**, not deferred to Phase 2. Rationale:
Success Criteria 2 and 5 require a *complete* snapshot with *resolved* cross-references, and a
`Phase.requirementIds[]`/`Phase.dependsOnPhaseIds[]` field cannot be resolved against `REQUIREMENTS.md`
without first extracting them from `ROADMAP.md`'s `**Requirements**:`/`**Depends on**:` lines — deferring
this to Phase 2 would mean Phase 1's own domain model can't satisfy its own success criteria. Specifically:

- **Extract in Phase 1:** phase number/name/slug, `**Goal**`, `**Depends on**` (raw string, not parsed
  into a graph — GSD-DOMAIN.md confirms `gsd-tools query roadmap analyze` itself leaves this as raw
  text), `**Requirements**` (array, brackets optional per GSD's own template comment), `**Success
  Criteria**` (numbered list), plan checklist (`- [ ] NN-MM: {desc}` → plan ID + checked state), and the
  milestone-grouped `<details>` archive wrapper (`<summary>` text = milestone header).
- **Carry through as opaque body text, do not parse structurally:** the ASCII "Dependency shape"
  diagram — confirmed free-form art, not machine-parseable, by GSD-DOMAIN.md's direct inspection of both
  the template and a real, independently-produced `ROADMAP.md`. Render/store it verbatim as a
  preformatted string; do not attempt arrow-parsing.
- **Do NOT count checkboxes as a progress source** (PITFALLS #3) — `roadmapComplete` (from ROADMAP.md's
  own checkbox syntax) and `diskStatus`/plan-summary presence are two independent, sometimes-disagreeing
  signals; keep them as two separate fields, never merged, exactly as `ARCHITECTURE.md`'s Domain Model
  section specifies.

The planner should record this recommendation as the phase's locked decision (or override it with
reasoning) rather than leave it implicit — it is "the decision most likely to shape how the phase's two
plans get split," per CONTEXT.md's own framing.

### Path Targeting Mechanics (Claude's Discretion — recommendation)

**Recommendation:**
- **Positional CLI argument**, not an env var — matches D-05's already-decided harness shape
  (`npm run snapshot -- <path>`) and needs no additional documentation surface. An env var can be added
  later without conflicting (CLI arg wins if both present).
- **Accept both a project root and a path directly at `.planning/`** — check `existsSync(join(target,
  '.planning'))` first; if false, check whether `target` itself ends in `.planning` and `PROJECT.md`
  or `STATE.md` exists directly inside it. Two cheap checks, no ambiguity.
- **Canonicalize once, at startup, before anything else runs:**
  ```typescript
  import { realpathSync } from 'node:fs';
  import { homedir } from 'node:os';
  import { resolve } from 'node:path';

  function resolveTargetPath(raw: string): string {
    // TGT-02: `~`-prefix — Node does NOT expand this; the shell usually does, but a raw
    // argument passed through npm/vitest wrapping is not guaranteed to have been shell-expanded.
    const tildeExpanded = raw.startsWith('~')
      ? raw.replace(/^~/, homedir())
      : raw;
    const absolute = resolve(tildeExpanded); // handles relative paths (TGT-02)
    return realpathSync(absolute); // resolves symlinks (TGT-02); throws ENOENT if missing —
                                    // catch this at the call site and map to loadStatus:'path-not-found'
  }
  ```
  This was the exact PITFALLS #9 prescription ("resolve to an absolute, canonicalized path immediately
  at startup... use that resolved path everywhere downstream — never mix relative and resolved paths").
- **Symlink policy:** allow a symlink whose target escapes the resolved root (do not add a containment
  check that rejects it) — GSD-DOMAIN.md's own research environment routinely uses symlinked/NAS-mounted
  project directories, and `PROJECT.md`'s read-only constraint means there is nothing to protect against
  by refusing to follow a symlink here. Containment matters for *files found during the walk*, not for
  the single root argument: once `rootPath` is resolved via `realpathSync`, every subsequent
  `list()`/`read()` call should itself resolve and verify the result still starts with `rootPath` before
  returning content (PITFALLS #9's "Security Mistakes" table — prevents a crafted or accidental symlink
  *inside* `.planning/` from escaping the tree during the walk, which is a different concern from the
  root argument itself being a symlink).
- **Startup failure wording, one distinct message per `loadStatus` value** (D-12 already fixes the
  enum): e.g. `path-not-found` → `"No such path: {rawPath} (resolved: {resolvedPath})"`;
  `not-a-gsd-project` → `"{resolvedPath} exists but contains no .planning/ directory"`;
  `permission-denied` → `"Cannot read {resolvedPath}: permission denied"`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recursive directory walk | A custom recursive `fs.readdir` wrapper, or `glob`/`fast-glob` | `fs.readdirSync(dir, { recursive: true, withFileTypes: true })` | Confirmed working natively on Node 22.23.1 in this session — zero dependencies, correct file-type info, handles the whole `.planning/` tree in one call. |
| Running the `.ts` CLI without a build step | A custom `require` transform, or reaching for `tsx`/`ts-node` | Plain `node path/to/file.ts` | Confirmed executing directly in this session with zero flags on Node 22.23.1 — native type-stripping is default-enabled. Avoids an extra dependency that was independently flagged `[SUS]` this session (see Package Legitimacy Audit). |
| YAML frontmatter parsing | A hand-written `---`-delimited splitter + `yaml.parse` | `gray-matter`, always wrapped in try/catch | Locked stack decision; hand-rolling frontmatter extraction reintroduces exactly the malformed-YAML crash risk (PITFALLS #4) gray-matter already handles correctly once guarded. |
| Path canonicalization / symlink resolution | Manual string manipulation on the path argument | `node:fs.realpathSync` + `node:os.homedir()` for tilde expansion | `realpathSync` is the POSIX-correct symlink-resolution primitive; hand-rolling this is exactly PITFALLS #9's "local-tool ergonomics treated as an afterthought" failure mode. |
| Cross-reference / ID-mention scanning | A single global regex pass with no context, or eager link-resolution scattered across render code | The `mentions.ts` post-dispatch scanner (Pattern 4), producing `{raw, resolved}` records at assembly time | D-10's dangling-reference contract and D-14's artifact-type-scoped resolution both require this to happen once, in one place, with access to each artifact's resolved kind — not as an ad hoc regex called from multiple sites. |
| Golden-file diffing / snapshot testing | A custom JSON-diff script | Vitest's built-in `toMatchFileSnapshot()` / `expect(...).toMatchSnapshot()` against committed golden files | Vitest already ships mature snapshot tooling (including `-u` to regenerate) — this is precisely what D-05's harness needs and it is already a locked dependency. |

**Key insight:** almost nothing about this phase's actual *parsing logic* needs a new dependency beyond
the three already locked in `.claude/CLAUDE.md`. The temptation this phase must resist is reaching for
convenience libraries (a glob package, a CLI-runner package, a schema-validation package) for problems
Node's own runtime or the already-locked stack already solves natively — every such addition is one more
line in the Package Legitimacy Audit and, per this session's findings, would very likely be flagged
`[SUS]` on pure publish-recency grounds regardless of the package's actual maturity.

## Common Pitfalls

(Full detail in `.planning/research/PITFALLS.md` #1, #3, #4, #9 — summarized here with this phase's
concrete mitigation, since #1–#4 and #9 are exactly the ones CONTEXT.md and PITFALLS.md both flag as
"architectural, must be decided before the reader/parser layer is built.")

### Pitfall 1: Building the parser against studio-portal's shape, not GSD's contract
**What goes wrong:** Code ends up assuming a milestone exists, phases number from 1 with no gaps,
`milestones/` exists, every phase has every artifact type, `config.json` has a fixed ~60-key shape —
all true of `~/studio-portal` today, none guaranteed by GSD in general.
**Why it happens:** It's the only real, convenient example to develop against.
**How to avoid:** D-01's traceability rule, enforced literally — every "field/directory X exists"
assumption must cite a specific template line (`~/.claude/gsd-core/templates/*`) or a primary-source
`.cjs` file, never "it's there in studio-portal." This session re-verified two of the highest-leverage
facts directly against the running GSD core (not just against the prior `GSD-DOMAIN.md` research) —
see Sources.
**Warning signs:** Any parser code comment reading "studio-portal always has..."; any function whose only
test input is `~/studio-portal`; phase-path logic that concatenates `phases/NN-slug` without also
handling `milestones/vX.Y-phases/` and `quick/<timestamp-slug>`.

### Pitfall 3: Treating markdown structure as a queryable data source
**What goes wrong:** Counting `- [ ]`/`- [x]` checkboxes to compute "percent done" — the same visual
pattern means requirement-satisfaction in `REQUIREMENTS.md`, plan-execution-status in `ROADMAP.md`, and
ad-hoc checklists in `PATTERNS.md`/`RESEARCH.md` with nothing to do with progress at all.
**How to avoid:** Structured facts (progress, phase status) come only from `STATE.md`'s frontmatter,
`config.json`, and `ROADMAP.md`'s own explicit phase/plan checkbox syntax — never derived by recounting
checkboxes elsewhere. Not directly Phase 1's problem (no dashboard yet), but the domain model built here
must preserve `roadmapComplete` and `diskStatus` as two separate fields so Phase 2 doesn't have to
retrofit this distinction.

### Pitfall 4: Frontmatter/JSON errors crash the whole page instead of degrading
**What goes wrong:** An unguarded `matter(content)` or `JSON.parse(content)` call throws on a single bad
file and — without per-file isolation — takes down everything downstream of it.
**How to avoid:** Exactly D-11/D-12's mechanism: every parse is wrapped, every failure produces a typed
warning at a specific `stage`, and `load()` itself never throws. This phase's dense fixture (D-02) exists
specifically to prove this holds under a real corrupted file, not just in theory.
**Warning signs:** A test suite where corrupting one fixture file breaks assertions about *other* files
in the same fixture — the isolation guarantee is a testable property, not a design intention.

### Pitfall 9: Local-tool ergonomics treated as an afterthought
**What goes wrong:** Path/symlink/permission handling "obviously works" against the one real path used
during development and breaks the first time someone runs it with a relative path, a `~`-path, or a
symlinked directory.
**How to avoid:** Resolve once at startup (see "Path Targeting Mechanics" above); test the fixture-driven
harness itself via relative, `~`, and symlinked invocations of the same fixture tree, not just one
absolute path form.
**Warning signs:** Any test or manual verification step that only ever uses one absolute path.

## Code Examples

### `loadStatus` union and warning record (D-11, D-12)

```typescript
// src/planning-repo/types.ts
export type LoadStatus =
  | { status: 'ok' }
  | { status: 'not-a-gsd-project'; pathChecked: string }
  | { status: 'path-not-found'; pathChecked: string }
  | { status: 'permission-denied'; pathChecked: string };

export interface ParseWarning {
  path: string;                                                       // artifact path this warning concerns
  stage: 'read' | 'frontmatter' | 'structured-extraction' | 'assembly'; // D-11
  message: string;
  salvage: string;                                                     // e.g. "body intact, frontmatter unavailable"
}

export interface ProjectSnapshot {
  project: unknown | null;   // null only when loadStatus.status !== 'ok'
  warnings: ParseWarning[];  // D-09: flat list...
  loadStatus: LoadStatus;
  // ...and each affected Artifact also carries `warnings: ParseWarning[]` referencing the same objects
}
```

### Cross-reference resolution shape (D-10)

```typescript
// src/planning-repo/crossref.ts
export interface Reference<T> {
  raw: string;           // the literal token as written, e.g. "AUTH-07"
  resolved: T | null;     // null = dangling — NOT a warning (D-10)
}

// Example: resolving a requirement ID mentioned in ROADMAP.md's **Requirements**: field
export function resolveRequirementRef(
  raw: string,
  requirementsById: Map<string, unknown>
): Reference<unknown> {
  return { raw, resolved: requirementsById.get(raw) ?? null };
}
```

### `--stable` normalizing serializer (D-07)

```typescript
// src/planning-repo/serialize.ts
import { relative } from 'node:path';

export function normalizeForGolden(snapshot: unknown, rootPath: string, stable: boolean): unknown {
  return JSON.parse(
    JSON.stringify(snapshot, (key, value) => {
      if (typeof value === 'string' && value.startsWith(rootPath)) {
        return relative(rootPath, value) || '.';   // absolute → project-root-relative, ALWAYS
      }
      if (stable && key === 'mtimeMs') {
        return 0;                                   // placeholder ONLY under --stable; raw dump keeps real value
      }
      return value;
    })
  );
}
```

## State of the Art

Phase 1 is greenfield — there is no prior version of this specific tool to compare against. The one
relevant "current vs. legacy" distinction found this session:

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|---------------|--------|
| `tsx`/`ts-node` as a required dependency to run TypeScript files directly with Node | Node's native, default-enabled type-stripping (`node file.ts` with zero flags) | Confirmed default-enabled on the local Node 22.23.1 runtime this session (`--no-experimental-strip-types` exists to *disable* it) | Removes a dependency this session's legitimacy check would otherwise flag `[SUS]`, and removes a build/transform step from the CLI entrypoint entirely |

**Deprecated/outdated for this phase specifically:** none — TypeScript, vitest, and gray-matter are all
current, actively maintained, and already the locked stack decision.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | A runtime schema-validation library (e.g. `zod`) is *not* needed for Phase 1's frontmatter degradation contract — open-map reads with optional chaining suffice | Alternatives Considered (Standard Stack) | If the planner judges typed field-lifting genuinely needs stronger guarantees (e.g. `PLAN.md`'s deeply-nested `must_haves`/`prohibitions` shape), a validation library may need adding mid-phase, which the Package Legitimacy Audit would then need to re-run against |
| A2 | Node's native TS type-stripping will remain sufficient for the entire Phase 1 codebase (no `enum`/`namespace`/decorator syntax will be needed) | Standard Stack, Don't Hand-Roll | If a later handler genuinely needs an `enum` (unlikely — this codebase leans on string unions per the domain model's own "open string, not closed enum" philosophy), `--experimental-transform-types` or a build step would need adding |
| A3 | `--`-prefixed CLI flags (`--with-bodies`, `--stable`) can be parsed with manual `process.argv` inspection, no argument-parsing library needed, consistent with `.claude/CLAUDE.md`'s explicit "no `commander`" ruling for this project | Code Examples / CLI pattern | Low — the flag surface is two booleans; manual parsing is a handful of lines regardless |

**If this table is sparse:** most of this phase's factual claims were verified this session directly
against GSD core 1.11.0's source, this project's own `config.json`/`REQUIREMENTS.md`, and the live npm
registry — see Sources for the specific files read and commands run.

## Open Questions

1. **Does Phase 1 need a runtime schema-validation library for frontmatter fields, or is open-map +
   optional-chaining sufficient?**
   - What we know: `.claude/CLAUDE.md`'s locked stack names no such library for this phase; GSD-DOMAIN.md
     recommends reading every frontmatter block as `Record<string, unknown>` with known-field lifts and
     defaults, never a closed schema — which argues against needing one.
   - What's unclear: whether `PLAN.md`'s deeper nested shapes (`must_haves.truths`, `prohibitions[]`)
     benefit enough from structural validation to justify adding a dependency this early.
   - Recommendation: start without one (plain TypeScript types + defensive field access); revisit only
     if the `PLAN.md`/`SUMMARY.md` handlers prove error-prone in practice.

2. **Exact wording and format for the three loadStatus-derived startup failure messages.**
   - What we know: D-12 fixes the four `loadStatus` enum values and requires "the exact path checked."
     PITFALLS #9 requires each failure mode to be distinct and actionable.
   - What's unclear: the literal message strings — this research proposes a format above ("Path
     Targeting Mechanics") but the planner/executor should finalize exact wording.
   - Recommendation: treat the proposed format as a starting draft, not a locked contract.

3. **Whether the dense fixture's third milestone and invented artifact type should be literally
   fabricated content or near-verbatim template copies with placeholder prose.**
   - What we know: D-01 requires the shape to trace to templates, not to studio-portal; it does not
     specify prose-authoring style.
   - What's unclear: how much realistic prose length/detail the fixture bodies need to meaningfully
     exercise the parser (e.g. does a one-line stub `PLAN.md` body exercise the same code paths as a
     200-line real one?).
   - Recommendation: template-derived structure (frontmatter shape, section headings, pseudo-XML tags)
     should be exact; body prose length can be minimal — the parser's correctness depends on structure,
     not prose volume, per PITFALLS #2's specific concern about pseudo-XML tags surviving intact
     (relevant to Phase 2's renderer, not Phase 1's parser, but the fixture should still include at least
     one realistic multi-task `<task>`/`<decision>` block so Phase 2 can reuse the same fixture).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|----------|----------|
| Node.js | Entire phase (runtime) | ✓ [VERIFIED: ran `node --version` this session] | v22.23.1 | — |
| Native TS type-stripping | CLI entrypoint execution (D-05) | ✓ [VERIFIED: executed a `.ts` file directly this session with zero flags] | Default-enabled as of this Node build | `tsx` (adds a `[SUS]`-flagged dependency — see audit) or a `tsc` build step |
| npm registry access | Installing `typescript`/`vitest`/`gray-matter`/`@types/node` | ✓ [VERIFIED: `npm view` succeeded for every package checked this session] | — | — |
| `~/.claude/gsd-core/templates/` | D-01's traceability requirement — the dense fixture's shape contract | ✓ [VERIFIED: directory listed and multiple files read this session] | gsd-core 1.11.0 | None — this is the authoritative contract; if absent, fixture construction cannot proceed correctly |
| `~/studio-portal/.planning/` | D-04's manual smoke target (not a committed dependency) | Not directly re-checked this session; prior research (`GSD-DOMAIN.md`, `PITFALLS.md`) confirms it exists and was inspected | studio-portal's own version | None needed — D-04 makes this optional by design; its absence does not block any committed test |

**Missing dependencies with no fallback:** none identified.

**Missing dependencies with fallback:** native TS type-stripping has a documented fallback (`tsx` or a
build step) if it ever proves insufficient for this codebase's syntax needs.

## Security Domain

`security_enforcement` is `true` in this project's `.planning/config.json` [VERIFIED:
`.planning/config.json:46` — `"security_enforcement": true,`], so this section is required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V1 Architecture, Design, Threat Modeling | Yes | The Layer A/Layer B split itself is the threat-modeling control — Layer A is the only code path touching the filesystem, making "what can read arbitrary paths" a one-file audit surface (Anti-Pattern 1 in ARCHITECTURE.md) |
| V2 Authentication | No | Single-user local tool, no network-facing auth surface exists in this phase (no server yet — that's Phase 2's Hono layer) |
| V3 Session Management | No | Same reasoning as V2 — no session concept exists in a CLI-only phase |
| V4 Access Control | Yes | Path-containment enforcement: resolve the root once via `realpathSync`, verify every subsequent read stays within it — the "no path-containment check" mistake named explicitly in PITFALLS.md's Security Mistakes table |
| V5 Input Validation | Yes | `gray-matter` always wrapped in try/catch (never trust YAML shape); `JSON.parse` for `HANDOFF.json`/`config.json`/`estimation-calibration.json` similarly guarded; the CLI's own path argument is validated (exists, resolves, is a directory) before any read attempt |
| V6 Cryptography | No | No secrets, no crypto operations anywhere in this phase's scope |
| V12 File and Resources | Yes | Never build a filesystem path directly from arbitrary document content (e.g. a `config.json` value) without validation — PITFALLS.md names this exact path-traversal vector explicitly for this project |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Path traversal via a crafted/accidental symlink inside `.planning/` escaping the resolved project root | Tampering / Information Disclosure | Resolve the root once via `realpathSync` at startup; every `list()`/`read()` result path must itself resolve and be verified to still start with the resolved root before its content is returned — confirmed as a named risk in PITFALLS.md's Security Mistakes table, specific to this project (arbitrary filesystem path supplied at startup) |
| Trusting `config.json`/frontmatter field values in constructing a filesystem path (e.g. a hypothetical future `custom_docs_path`-style key) | Tampering | Never build a path directly from document content; validate/allowlist any config value used in path construction — no such key is used by Phase 1's parsing rules today, but the principle applies to any future field read from an open map |
| YAML/JSON deserialization of untrusted-shape (not untrusted-origin) content crashing the process | Denial of Service | `gray-matter` and `JSON.parse` both guarded with try/catch at every call site (D-11/D-12's whole mechanism); neither library executes arbitrary code on parse (no YAML "safe load" concern here — gray-matter uses `js-yaml`'s safe schema by default, not `eval`-based parsing) |

## Sources

### Primary (HIGH confidence — read/executed directly this session)
- `~/.claude/gsd-core/bin/lib/artifacts.cjs` lines 18–39 — read directly this session. Verbatim quote:
  `exports.CANONICAL_EXACT = new Set([ 'PROJECT.md', 'ROADMAP.md', 'STATE.md', 'REQUIREMENTS.md',
  'MILESTONES.md', 'BACKLOG.md', 'LEARNINGS.md', 'THREADS.md', 'config.json', 'CLAUDE.md',
  'RETROSPECTIVE.md', 'WINDOWS.md', ... 'STATE-ARCHIVE.md', ... 'milestone.lock', ... ]);` and
  `exports.CANONICAL_PATTERNS = [ /^v\d+\.\d+(?:\.\d+)?-MILESTONE-AUDIT\.md$/i, /^v\d+\.\d+(?:\.\d+)?-.*\.md$/i, ];`
- `~/.claude/gsd-core/bin/lib/phase-id.cjs` line 50 — read directly this session. Verbatim quote:
  `const PHASE_NUMBER_TOKEN_SOURCE = '\\d+[A-Z]?(?:\\.\\d+)*';`
- `~/.claude/gsd-core/templates/context.md`, `research.md`, `discussion-log.md`, `VALIDATION.md`,
  `SECURITY.md`, `UI-SPEC.md` — listed and spot-read directly this session, confirming the
  frontmatter-presence inconsistency behind Pattern 2's dispatch rationale.
- `/home/cinedise/labelore/.planning/config.json` lines 24 and 46 — read directly this session.
  Verbatim: `"nyquist_validation": false,` (line 24) and `"security_enforcement": true,` (line 46) —
  the basis for skipping the Validation Architecture section and including the Security Domain section.
- `/home/cinedise/labelore/.planning/REQUIREMENTS.md` — read in full this session; requirement ID
  grammar (`[A-Z][A-Z0-9]*-\d{2,}`) re-confirmed against every listed ID (TGT-01..08, DASH-01..04,
  ROAD-01..04, READ-01..06, NAV-01..07, FIND-01..05, HIST-01..02, UI-01..03, DATA-01..06).
- `npm view typescript version` → `7.0.2`; `npm view vitest version` → `4.1.11`; `npm view gray-matter
  version` → `4.0.3`; `npm view @types/node version` → `26.2.0`; `npm view eslint version` → `10.9.0`;
  `npm view typescript-eslint version` → `8.67.0`; `npm view @eslint/js version` → `10.0.1`; `npm view
  eslint-plugin-react-hooks version` → `7.1.1`; `npm view globals version` → `17.11.0`; `npm view
  prettier version` → `3.9.6`; `npm view tsx version` → `4.23.12` — all run directly against the live
  npm registry this session (2026-08-21).
- `gsd-tools query package-legitimacy check` (npm ecosystem) — run against `typescript`, `vitest`,
  `gray-matter`, `tsx`, `@types/node`, `eslint`, `typescript-eslint`, `@eslint/js`, `globals`, `prettier`
  this session; full verdicts and signals reproduced in the Package Legitimacy Audit table above.
- Node 22.23.1 (local runtime) — `fs.readdirSync(dir, { recursive: true, withFileTypes: true })` and
  direct execution of a `.ts` file via plain `node file.ts` (zero flags) were both run and confirmed
  working in this session; `node --help` output confirmed a `--no-experimental-strip-types` flag exists
  (implying the feature ships default-enabled, not default-disabled).

### Secondary (MEDIUM confidence — prior committed research, re-read and cross-checked this session)
- `.planning/research/ARCHITECTURE.md` — the primary architectural reference for this phase (Patterns
  1–3, Domain Model, Anti-Patterns, Forward-Compatibility Seams, Error/Degradation Strategy); grounded in
  a firsthand `~/studio-portal/.planning` inspection performed in a prior research session, not this one.
- `.planning/research/PITFALLS.md` — pitfalls #1, #3, #4, #9 specifically, direct source for this
  phase's Common Pitfalls section; same prior-session provenance as above.
- `.planning/research/GSD-DOMAIN.md` — the domain-schema ground truth (config.json shape, STATE.md
  frontmatter, ID scheme table, artifact inventory); this session independently re-verified two of its
  highest-leverage claims (artifacts.cjs registry, phase-id.cjs token grammar) against the live source
  and found them to match exactly.
- `.planning/phases/01-read-layer-domain-model/01-CONTEXT.md` and `01-DISCUSSION-LOG.md` — the locked
  decisions (D-01–D-16) this research is built around; read in full this session.

### Tertiary (LOW confidence)
- None used — every claim in this document traces to either a primary-source file/command run this
  session or a previously-committed, already-cross-checked project research document.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all four core/supporting packages version-checked live against npm this
  session; the one new recommendation (native TS type-stripping) was executed and confirmed working
  directly, not assumed.
- Architecture: HIGH — directly inherited from `ARCHITECTURE.md`'s primary-source-grounded patterns,
  with the two most load-bearing schema claims (canonical artifact registry, phase-number grammar)
  independently re-verified against GSD core's actual source this session.
- Pitfalls: HIGH — grounded in `PITFALLS.md`'s direct inspection of both `~/studio-portal` and
  `~/.claude/gsd-core/templates/`, cross-checked this session against the same template directory.
- Package legitimacy: HIGH confidence in the verdicts (tool-run this session), MEDIUM confidence in
  their real-world meaning — every `[SUS]` result traces to a single "too-new" heuristic reason that
  does not distinguish a slopsquat from a mature package's routine patch release; flagged transparently
  above rather than waived.

**Research date:** 2026-08-21
**Valid until:** ~30 days for the architecture/domain-schema claims (stable, template-derived); ~7 days
for the specific npm version numbers and legitimacy verdicts (fast-moving registry state) — re-check
versions immediately before the planner locks the Standard Stack table if execution starts more than a
few days after this research.

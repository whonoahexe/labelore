# GSD Domain Research

**Researched:** 2026-08-21
**GSD core version installed:** 1.11.0 (`~/.claude/gsd-core/VERSION`)
**Method:** Primary-source only — every claim below is grounded in a file read on this machine.
Two corpora were used throughout: the **template/reference corpus** (`~/.claude/gsd-core/templates/`,
`~/.claude/gsd-core/references/`, `~/.claude/gsd-core/bin/lib/*.cjs`) which defines what GSD *intends*
to produce, and the **observed corpus** (`~/studio-portal/.planning/`, a real mature project — 2
milestones, 9 phases, 69 plans — and `~/labelore/.planning/`, a real fresh/greenfield project) which
shows what GSD *actually* produces. Where they disagree, both are reported and the disagreement itself
is treated as a finding.

---

## Executive Summary

`.planning/` is not one schema — it is a **filesystem-shaped event log**. Every GSD workflow appends or
overwrites a small number of files, and the accumulated set of files at any moment *is* the project's
state. There is no database; the markdown and JSON files ARE the database. This has one large
consequence for a visualizer: a single canonical parser cannot assume any given file exists, but it
*can* assume that if a file exists with a recognized name, its shape is highly regular — GSD enforces
its own conventions through a code-owned registry (`gsd-core/bin/lib/artifacts.cjs`), not through
convention alone.

The most important discovery is that **GSD ships its own query layer that already parses
`.planning/` into JSON** — `gsd-tools query roadmap analyze`, `query progress`, `query state load`,
`query stats`, etc. (full list in the section below). These are not internal-only; they are stable,
versioned, documented CLI surfaces that GSD's own workflows call to avoid re-deriving parsing logic in
every agent. **A dashboard should treat this CLI as a first-class read API**, not a "nice to have" — it
is the difference between building one more independent markdown-regex parser that drifts from GSD's
own truth, and consuming the same normalized view GSD's own orchestration relies on. Where the CLI
doesn't cover something (full-text file browsing, rendering individual `PLAN.md`/`SUMMARY.md` files,
cross-linking prose), the dashboard's own markdown+frontmatter parser is still required — but the CLI
should be the source of truth for structural facts (phase list, progress, requirements coverage,
config) wherever it exposes them.

The second major discovery is that **the artifact registry is versioned in code, not in docs**. The
canonical list of `.planning/`-root files a dashboard should recognize lives in
`gsd-core/bin/lib/artifacts.cjs`'s `CANONICAL_EXACT` Set and `CANONICAL_PATTERNS` array — and it has
already drifted ahead of `gsd-core/templates/README.md`'s human-readable registry table, which is
missing `WINDOWS.md`, `STATE-ARCHIVE.md`, and `milestone.lock` (all confirmed present in `artifacts.cjs`
with issue-number comments, e.g. `WINDOWS.md // #3224`). This is proof, not speculation, that GSD's
artifact surface evolves between minor versions and that documentation lags code. **Graceful
degradation is not a nice-to-have safety margin — it is the normal operating condition of this
domain.**

The third discovery is that `config.json`'s *actual on-disk shape differs from the shipped template*.
The template (`gsd-core/templates/config.json`) shows a nested nine-key nested tree. Two real projects
on this machine (`studio-portal`, `labelore`) both have a **flatter, ~15-key top-level shape** with a
nested `workflow` object carrying ~25 sub-keys, plus `git`, `ship`, `hooks` objects — closer to, but
still not identical to, the ~60-key field reference documented in `references/planning-config.md`
(`Complete Field Reference`, generated from `CONFIG_DEFAULTS`/`VALID_CONFIG_KEYS` in code). That
reference doc is the authoritative source; the shipped template is stale relative to it. A parser must
read `config.json` key-by-key with defaults, never assume a fixed shape, and never assume every key is
present.

Structurally, machine-readable data is concentrated in a small number of places: `STATE.md`'s YAML
frontmatter, `config.json`, `HANDOFF.json`, `estimation-calibration.json`, `WINDOWS.md`'s frontmatter +
markdown table + fenced JSON blob, and per-artifact YAML frontmatter on `VALIDATION.md`, `SECURITY.md`,
`UI-SPEC.md`, `UAT.md`, `SUMMARY.md`, `VERIFICATION.md`, `LEARNINGS.md`, and `PLAN.md`. Everything else
— `PROJECT.md`, `ROADMAP.md`, `REQUIREMENTS.md`, `CONTEXT.md`, `RESEARCH.md`, `DISCUSSION-LOG.md`,
`PATTERNS.md`, `MILESTONES.md`, `RETROSPECTIVE.md` — is prose markdown with *reliable heading
structure* (documented per-type below) but *no frontmatter contract*. `ROADMAP.md` is the single
richest hand-authored structured document: phase headers, goal/depends-on/requirements/success-criteria
fields, plan checklists, a progress table, an ASCII dependency diagram, and `<details>`-collapsed
archived milestones — and it is exactly reproduced by `gsd-tools query roadmap analyze` into JSON,
which is strong evidence the parsing rules below are correct (the CLI's own parser is the ground
truth, confirmed against two independently-authored `ROADMAP.md` files).

---

## The `.planning/` File Inventory

### Ground truth for "is this canonical"

There are two authorities, and they disagree slightly. In priority order for a parser:

1. **`gsd-core/bin/lib/artifacts.cjs`** — `CANONICAL_EXACT` (a `Set<string>` of exact root filenames)
   and `CANONICAL_PATTERNS` (regexes for versioned files). This is what `gsd-health`'s W019 check
   actually runs against. **This is the only ground truth that cannot drift from runtime behavior** —
   it's the same code that runs. Read directly:

   ```
   PROJECT.md, ROADMAP.md, STATE.md, REQUIREMENTS.md, MILESTONES.md, BACKLOG.md,
   LEARNINGS.md, THREADS.md, config.json, CLAUDE.md, RETROSPECTIVE.md, WINDOWS.md,
   STATE-ARCHIVE.md, milestone.lock
   ```
   plus pattern `^v\d+\.\d+(?:\.\d+)?-MILESTONE-AUDIT\.md$` and `^v\d+\.\d+(?:\.\d+)?-.*\.md$`
   (any version-stamped doc, case-insensitive).

2. **`gsd-core/templates/README.md`** ("GSD Canonical Artifact Registry") — a human-curated table.
   **Confirmed stale**: missing `WINDOWS.md`, `STATE-ARCHIVE.md`, `milestone.lock` from its root table,
   even though all three are present in `artifacts.cjs` with explicit issue-tracker comments (e.g.
   `'WINDOWS.md', // #3224: broken-windows ledger`). Still useful for producer/purpose mapping —
   just not for completeness.

A dashboard's "is this a known artifact type" check should mirror `artifacts.cjs`'s logic (exact-set
∪ pattern-match), not the README table, and MUST treat "recognized" and "renders nicely" as separate
concerns — see `<recommended_strategy>` below.

### `.planning/` root files

| File | Produced by | Mandatory? | Structured data? | Notes |
|---|---|---|---|---|
| `PROJECT.md` | `/gsd-new-project` | Yes (always present) | No (prose, tables) | Requirements (Validated/Active/Out of Scope), Key Decisions table, Constraints. Confirmed identical shape in `labelore` (fresh) and referenced by `studio-portal`'s STATE.md. |
| `ROADMAP.md` | `/gsd-new-project`, `/gsd-new-milestone` | Yes once milestone exists | Semi (regular heading grammar; fully parsed by `gsd-tools query roadmap analyze`) | Absent in a brand-new project before roadmap creation (confirmed: `labelore/.planning/` has no ROADMAP.md yet). |
| `STATE.md` | `/gsd-new-project`, `/gsd-health --repair` | Yes | **Yes — YAML frontmatter** | The living-memory file. See schema below. |
| `REQUIREMENTS.md` | `/gsd-new-milestone` | Yes once milestone exists | Semi (checkbox + ID grammar; `mark-complete`/`ready-ids` CLI subcommands operate on it) | |
| `MILESTONES.md` | `/gsd-complete-milestone` | Only after ≥1 milestone shipped | No | Absent in `labelore` (fresh); present in `studio-portal` (1 shipped milestone). |
| `BACKLOG.md` | `/gsd-add-backlog` | Optional | No | Not present in either sampled project — genuinely optional. |
| `LEARNINGS.md` | `/gsd-extract-learnings`, `/gsd-execute-phase` | Optional | **Yes — YAML frontmatter** (project-root aggregate variant; per-phase `NN-LEARNINGS.md` also exists, see below) | |
| `THREADS.md` | `/gsd-thread` | Optional | No | Not present in either sampled project. |
| `config.json` | `/gsd-new-project`, `/gsd-health --repair` | Yes | **Yes — JSON, ~60 keys** | See full schema below. Shape differs from shipped template — see Executive Summary. |
| `CLAUDE.md` | `/gsd-profile` | Optional | No | Lives at project root, not necessarily `.planning/` (path is `claude_md_path` config key, default `./.claude/CLAUDE.md`). Out of `.planning/` scope for this dashboard's tree browser, but worth linking to. |
| `RETROSPECTIVE.md` | `/gsd-complete-milestone` | Only after ≥1 milestone shipped | No | Present in `studio-portal`, absent in `labelore`. "Living document updated at each milestone close." |
| `WINDOWS.md` | `/gsd-ship` (broken-windows ledger, `workflow.windows_enforce`) | Optional (feature-gated) | **Yes — YAML frontmatter + markdown table + fenced JSON array** | Confirmed present in `studio-portal` with 10 open items; genuinely undocumented in template registry — a live example of registry drift. See schema below. |
| `STATE-ARCHIVE.md` | `gsd-tools state prune` (`workflow.auto_prune_state`) | Optional | No (archive of pruned STATE.md history) | Not observed in either sample; confirmed to exist in code (`artifacts.cjs` comment: "state.cts's cmdStatePrune writes this at the .planning/ root"). |
| `milestone.lock` | Milestone-claim mechanism (`src/milestone-lock.cts`) | Transient/optional | Yes (JSON, but ephemeral — a live claim file, not a durable record) | Not observed; a runtime coordination file, likely irrelevant to a read-only historical dashboard except as a "work in progress" indicator if present. |
| `HANDOFF.json` | `/gsd-pause-work` | Optional (present only mid-pause) | **Yes — JSON** | See schema below. Present in `studio-portal` (a phase was paused mid-execution). |
| `estimation-calibration.json` | Executor duration/token tracking (#2632 in `summary.md`) | Optional | **Yes — JSON, simple sample array** | `{schema_version, samples: [{estimateTokens, actualTokens}]}`. |
| `vX.Y-MILESTONE-AUDIT.md` | `/gsd-audit-milestone` | Transient (pre-archive) | No | Lives at root only until `/gsd-complete-milestone` moves it into `milestones/`. |
| Version-stamped docs (`vX.Y-*.md`) | Various | Optional | Varies | Pattern-matched, not exact-matched — any file shaped `vX.Y[.Z]-*.md` at root is treated as canonical. |

### `phases/NN-slug/` — the phase directory

Confirmed both from `gsd-core/templates/README.md`'s "Phase Subdirectory Artifacts" table and from
direct listing of `studio-portal/.planning/phases/{01,02,03,04}-*` and its archived
`milestones/v1.0-phases/*`. Up to ~19 distinct artifact types were observed in one phase directory
(`phases/01-portal-owned-identity-sessions/`):

| File pattern | Produced by | Mandatory? | Structured data? |
|---|---|---|---|
| `NN-MM-PLAN.md` (per plan) | `/gsd-plan-phase` | Yes, ≥1 per phase once planned | **Yes — YAML frontmatter** (rich; see below) |
| `NN-MM-SUMMARY.md` (per plan) | `/gsd-execute-phase` | Yes, once that plan executes | **Yes — YAML frontmatter** (rich; see below) |
| `NN-CONTEXT.md` | `/gsd-discuss-phase` | Common but optional (skippable via `skip_discuss`) | No frontmatter; has a fixed 6-tag section grammar (`<domain>`, `<decisions>`, `<specifics>`, `<canonical_refs>`, `<code_context>`, `<deferred>`) |
| `NN-DISCUSSION-LOG.md` | `/gsd-discuss-phase` | Companion to CONTEXT.md | No — explicitly "NOT for LLM consumption," audit-trail only |
| `NN-RESEARCH.md` | `/gsd-plan-phase` (or `--research-phase N`) | Optional (`workflow.research` toggle) | No frontmatter; fixed section tags |
| `NN-VALIDATION.md` | `/gsd-plan-phase` (Nyquist step) | Optional (`workflow.nyquist_validation` toggle) | **Yes — YAML frontmatter** (`status`, `nyquist_compliant`, `wave_0_complete`) |
| `NN-UAT.md` | `/gsd-verify-work` (created new session) / `/gsd-validate-phase` | Optional | **Yes — YAML frontmatter** (`status`, `phase`, `source`, `started`, `updated`) + structured `## Gaps` YAML block |
| `NN-PATTERNS.md` | `/gsd-plan-phase` (pattern-mapper agent, `workflow.pattern_mapper`) | Optional | No frontmatter |
| `NN-UI-SPEC.md` | `/gsd-ui-phase` | Optional (`workflow.ui_phase` toggle; UI-relevant phases only) | **Yes — YAML frontmatter** (`status`, `shadcn_initialized`, `preset`) |
| `NN-SECURITY.md` | `/gsd-secure-phase` | Optional (`workflow.security_enforcement` toggle) | **Yes — YAML frontmatter** (`status`, `threats_open`, `asvs_level`) |
| `NN-AI-SPEC.md` | `/gsd-ai-integration-phase` | Optional (`workflow.ai_integration_phase` toggle; AI-system phases only) | No YAML frontmatter observed (structured via numbered `##` sections instead) |
| `NN-DEBUG.md` | `/gsd-debug` | Optional (only if debugging happened) | Has a status/session-tracking structure (not directly sampled; see `templates/DEBUG.md`) |
| `NN-REVIEW.md` / `NN-REVIEWS.md` | `/gsd-review`, code-review workflow | Optional | Not directly templated in `templates/`; observed in `studio-portal` at `01-REVIEW.md`, `03-REVIEW.md` |
| `NN-REVIEW-FIX.md` | code-review-fix workflow | Optional, follows a REVIEW.md | Observed: `01-REVIEW-FIX.md` |
| `NN-LEARNINGS.md` (per-phase) | `/gsd-extract-learnings` | Optional | **Yes — YAML frontmatter** (`phase`, `phase_name`, `project`, `generated`, `counts: {decisions,lessons,patterns,surprises}`, `missing_artifacts`) |
| `NN-VERIFICATION.md` | `/gsd-verify-work` / phase-goal verification | Optional but common at phase close | **Yes — YAML frontmatter** (`phase`, `verified`, `status`, `score`, `behavior_unverified`, optional structured item lists) |
| `NN-UI-REVIEW.md` | `/gsd-ui-review` | Optional | Not templated; observed: `03-UI-REVIEW.md` |
| Ad-hoc phase-specific docs (e.g. `NN-ROUTE-INVENTORY.md`) | Planner/executor discretion | Optional, unbounded | **Genuinely unknown shape** — this is the class of file a visualizer MUST NOT choke on. Observed real example: `01-ROUTE-INVENTORY.md` in `studio-portal`. |

**Important nuance on "mandatory":** nothing in a phase directory is unconditionally mandatory except
that once a phase reaches "planned," it has ≥1 `NN-MM-PLAN.md`, and once executed, a matching
`NN-MM-SUMMARY.md`. Everything else is gated by a `workflow.*` config toggle (see config schema) or by
whether that phase's nature triggered the generating workflow (UI-SPEC only for frontend phases,
AI-SPEC only for AI-system phases, SECURITY only if `security_enforcement` is on, etc.).

### `quick/<timestamp-slug>/`

Confirmed from `studio-portal/.planning/quick/` (5 real examples) and from `gsd-core/bin/lib/init.cjs`
(`cmdInitQuick`, the code that mints these). Each quick-task directory contains a variable subset of:

- `{quickId}-PLAN.md` — always
- `{quickId}-SUMMARY.md` — after execution
- `{quickId}-CONTEXT.md` — optional (observed once: `260803-2pr`)
- `{quickId}-VERIFICATION.md` — optional (observed once: `260727-3mo`)

Quick tasks are also tracked in a table inside `STATE.md`'s "Quick Tasks Completed" section (see
below) — that table, not the directory listing, is the authoritative index of quick-task status
(commit hash, human-verification status).

### `milestones/`

Confirmed from `studio-portal/.planning/milestones/`. Produced by `/gsd-complete-milestone` and
`/gsd-audit-milestone`. Contains:

- `vX.Y-ROADMAP.md` — a snapshot/rewrite of `ROADMAP.md` scoped to that milestone (full independent
  document, same grammar as root `ROADMAP.md`)
- `vX.Y-REQUIREMENTS.md` — same for `REQUIREMENTS.md`
- `vX.Y-MILESTONE-AUDIT.md` — moved from root
- `vX.Y-phases/NN-slug/...` — entire archived phase directory trees, **byte-identical in internal
  shape** to `phases/NN-slug/` (confirmed: `milestones/v1.0-phases/01-identity-persistence-foundation/`
  has the same file-type set as live `phases/01-portal-owned-identity-sessions/`)

`--archive-phases` is an opt-in flag to `/gsd-complete-milestone`; without it, phase directories are
NOT moved (they could in principle remain under `phases/` after a milestone ships — a dashboard cannot
assume `phases/` only ever holds the current milestone's work, though in the observed sample it does).

### `research/` (project-level, not phase-level)

Confirmed from both `studio-portal/.planning/research/` and `labelore/.planning/research/` (this very
document is being written into the second one). Produced by the GSD research stage
(`/gsd-new-project`, `/gsd-new-milestone`) — this is the **same research agent role this document was
generated by**. Fixed file set:

```
research/SUMMARY.md
research/STACK.md
research/FEATURES.md
research/PITFALLS.md
research/ARCHITECTURE.md          (conditional — "if patterns discovered")
research/COMPARISON.md            (conditional — comparison-mode runs only)
research/FEASIBILITY.md           (conditional — feasibility-mode runs only)
research/.cache/<sha256>.json     (internal — provider response cache, not for rendering)
```

Confirmed the `.cache/` subdirectory is large (60+ files in `studio-portal`) and is pure cache —
**explicitly out of scope for rendering**; a dashboard's tree browser should either hide it or badge
it distinctly as internal/cache, never index its contents for search.

### `ui-reviews/`

Confirmed from `studio-portal/.planning/ui-reviews/` — contains only a `.gitignore` in the sampled
project (feature exists, unused). Produced by `/gsd-ui-review` in retroactive/whole-project mode
(distinct from the per-phase `NN-UI-REVIEW.md` inside a phase directory). Likely to hold screenshot
artifacts and review reports when used — the `.gitignore` suggests binary/generated content
(screenshots) is deliberately excluded from git, meaning **this directory's contents may not be
reliably present even in git-committed clones** — a visualizer reading from a live filesystem sees
more than one reading from a git checkout.

### Directories referenced in the question but NOT observed in either sample, confirmed to exist in code/templates

These are real GSD surfaces documented in `gsd-core/references/artifact-types.md` and workflow files,
but absent from both `studio-portal` and `labelore` — genuine variability evidence, not omissions:

| Directory | Purpose | Evidence |
|---|---|---|
| `.planning/spikes/NNN-name/` | `/gsd-spike` experiential exploration | `artifact-types.md` "SPIKE.md / DESIGN.md", "Spike README.md / MANIFEST.md" |
| `.planning/spikes/MANIFEST.md` | Cross-spike index (one section per idea + one Spikes table) | Same |
| `.planning/sketches/NNN-name/` | `/gsd-sketch` UI mockups (tabbed HTML variants) | Same reference, "Sketch README.md / MANIFEST.md / index.html" |
| `.planning/sketches/MANIFEST.md` | Cross-sketch index | Same |
| `.planning/codebase/` | `/gsd-map-codebase` output — `architecture.md`, `concerns.md`, `conventions.md`, `integrations.md`, `stack.md`, `structure.md`, `testing.md` | Confirmed template set exists at `gsd-core/templates/codebase/` (7 files) |
| `.planning/intel/` | `/gsd-map-codebase --query` JSON index (`intel.enabled` config gate) | `planning-config.md` Intel Fields section; `gsd-tools query intel` has subcommands `api-surface, diff, extract-exports, patch-meta, query, snapshot, status, update, validate` |
| `.planning/graphs/` | Knowledge graph (`/gsd-graphify`) | `gsd-tools query graphify` subcommands: `build, diff, query, status` |
| `.planning/threads/` | Persistent cross-session discussion threads (`/gsd-thread`) | `THREADS.md` root file is the index; a `threads/` subdirectory is plausible for thread bodies but not directly confirmed — treat as unconfirmed |
| `.planning/debug/` | `/gsd-debug` session logs referenced from UAT.md gaps (`debug_session: ".planning/debug/comment-not-refreshing.md"` in `templates/UAT.md`'s example) | Path referenced in template example |
| `.planning/todos/pending/` | `/gsd-add-todo` captured ideas, referenced from `STATE.md`'s "Pending Todos" section | `templates/state.md` |

**Implication:** a dashboard's directory tree/router MUST be driven by "what exists on disk," never by
a hardcoded list of expected subdirectories — over half of GSD's own documented surface is legitimately
absent from a real 9-phase, 2-milestone project.

---

## Naming Conventions and Parsing Rules

All regexes below are transcribed from `gsd-core/bin/lib/phase-id.cjs` and `gsd-core/bin/lib/init.cjs`
(the actual runtime parsing code), not reverse-engineered from examples — this is the same grammar GSD
itself uses to resolve phase/plan tokens.

### Phase directory naming

**Canonical phase-number token grammar** (`phase-id.cjs`, `PHASE_NUMBER_TOKEN_SOURCE`):

```
\d+[A-Z]?(?:\.\d+)*
```

Matches: `1`, `01`, `12`, `12A`, `2.1`, `3.2.1` — a phase number with an optional single-letter variant
suffix and optional dotted sub-phase segments (decimal phases for urgent insertions, per
`roadmap.md`'s guidelines: "Decimal phases (2.1, 2.2): Urgent insertions").

**Project-code prefix grammar** (`phase-id.cjs`):

```
Strip:   ^[A-Z][A-Z0-9_]*-(?=\d)
Capture: ^([A-Z][A-Z0-9_]*)-(\d.*)
```

A project code is an uppercase-leading alphanumeric/underscore token immediately followed by a hyphen
and a digit (e.g. `CK-01-foundation` when `config.project_code = "CK"`). This is opt-in — `project_code`
defaults to `null`; neither sampled project uses it.

**Full phase directory name assembly** (from `phase.cjs` `cmdPhaseAdd`, the literal code that creates
these directories):

```js
prefix = config.project_code ? `${project_code}-` : ''
// sequential mode (config.phase_naming === "sequential", the default):
dirName = `${prefix}${String(newPhaseId).padStart(2, '0')}-${slug}`
// custom mode (config.phase_naming === "custom"):
dirName = `${prefix}${customId || slug.toUpperCase()}-${slug}`
```

Recommended parser regex for a phase directory basename (sequential mode, the default and only mode
observed in both samples):

```
^(?:([A-Z][A-Z0-9_]*)-)?(\d+[A-Z]?(?:\.\d+)*)-(.+)$
```

Capture groups: 1 = optional project code, 2 = phase number token (parse as string, not int — decimal
and lettered phases are legitimate), 3 = slug. **Custom mode breaks this regex** — `phase_naming:
"custom"` phase IDs are arbitrary uppercase strings (`customId || slug.toUpperCase()`), not numbers.
A parser MUST branch on `config.phase_naming` before assuming numeric phase ordering. Neither sampled
project uses custom mode (`labelore` and `studio-portal` both have `"phase_naming": "sequential"`).

**On-disk directory-scan regex** used internally to detect existing phase numbers (from `phase.cjs`):
```js
/^(?:[A-Z][A-Z0-9]*-)?(\d+)-/
```
This is the loose, integer-only variant GSD itself uses just to find "the next number" — note it does
NOT capture letter suffixes or dotted sub-phases, i.e. even GSD's own enumeration code treats those as
belonging to the slug for that specific scan. A visualizer's phase-sort should use the fuller grammar
above (dotted-decimal-aware) for correct ordering, but should tolerate the looser form when matching.

### Slug generation

From `core-utils.cjs generateSlugInternal`:
```js
transliterateForSlug(text)          // Cyrillic → ASCII, others pass through
  .replace(/[^a-z0-9]+/g, '-')      // non-alphanumeric runs → single hyphen
  .substring(0, 60)                 // truncate to 60 chars
  .replace(/^-+|-+$/g, '')          // strip leading/trailing hyphens (post-truncation)
```
Max 60 chars for phase slugs. Quick-task slugs use the same function but truncated to 40 chars
(`init.cjs`: `generateSlugInternal(description)?.substring(0, 40)`).

### Plan/artifact file naming inside a phase directory

```
{phase}-{plan}-PLAN.md        e.g. 01-02-PLAN.md   (Phase 1, Plan 2)
{phase}-{plan}-SUMMARY.md     e.g. 01-02-SUMMARY.md
{phase}-ARTIFACT.md           e.g. 01-CONTEXT.md, 01-RESEARCH.md, 01-VALIDATION.md, 01-UAT.md, ...
```

Both `{phase}` and `{plan}` are zero-padded to (at least) 2 digits (`getPhaseDirFromPhaseId` writes
continuation segments "zero-padded to exactly 2 digits" per `phase-id.cjs` comments — confirmed:
`01-01-PLAN.md` through `01-06-PLAN.md` in `studio-portal`, and `02-01` through `02-10`). Recommended
parser regex for a file inside a phase directory:

```
^(\d+[A-Z]?(?:\.\d+)*)-(\d{2,})-(PLAN|SUMMARY)\.md$      → plan-scoped file
^(\d+[A-Z]?(?:\.\d+)*)-([A-Z][A-Z-]*)\.md$                → phase-scoped artifact (CONTEXT, RESEARCH, VALIDATION, UAT, SECURITY, UI-SPEC, AI-SPEC, DEBUG, PATTERNS, REVIEW, REVIEW-FIX, LEARNINGS, VERIFICATION, UI-REVIEW, or an unrecognized ad-hoc name like ROUTE-INVENTORY)
```
The second pattern is deliberately permissive on the ARTIFACT token — **any** uppercase-hyphenated
word after the phase number is a legal artifact name; GSD does not enumerate a closed set at the
filesystem level. Membership in the "known artifact types" list (for choosing a specialized renderer)
should be a lookup table, but a file failing that lookup must still render as generic markdown, not be
hidden (this is an explicit, quality-gated product requirement in `PROJECT.md`).

### `quick/<timestamp-slug>/` naming

From `init.cjs cmdInitQuick`, the literal generation code:

```js
yy = last 2 digits of year
mm = month, zero-padded
dd = day, zero-padded
dateStr = yy+mm+dd                                    // e.g. "260726"
secondsSinceMidnight = h*3600 + m*60 + s
timeBlocks = floor(secondsSinceMidnight / 2)          // 2-second resolution buckets
timeEncoded = timeBlocks.toString(36).padStart(3,'0')  // base-36, 3 chars
quickId = `${dateStr}-${timeEncoded}`                  // e.g. "260726-unp"
dirName = `${quickId}-${slug}`                         // slug truncated to 40 chars
```

Recommended parser regex:
```
^(\d{6})-([0-9a-z]{3})-(.+)$
```
Group 1 = `YYMMDD` (2-digit year — **not Y2.1K-safe past 2099, but that is GSD's own choice, not this
dashboard's problem to solve**), group 2 = base-36 time-of-day encoding (NOT independently meaningful
without decoding — do not attempt to derive an exact time from it; treat as an opaque disambiguator),
group 3 = slug. Confirmed against 5 real examples in `studio-portal/.planning/quick/`:
`260726-unp-add-a-toggle-to-switch-between-light-dar`,
`260727-3mo-hoist-usehealthsocket-into-a-healthsocke`,
`260802-sya-improve-navbar-visual-design-to-match-br`,
`260802-uv1-restyle-scrollbars-to-match-the-design-s`,
`260803-2pr-we-should-implement-right-click-context-` — all match, and all truncate mid-word at 40
chars (visible trailing partial words in the examples), confirming the truncation behavior.

Files inside: `{quickId}-PLAN.md`, `{quickId}-SUMMARY.md`, `{quickId}-CONTEXT.md`,
`{quickId}-VERIFICATION.md` — same `{token}-ARTIFACT.md` grammar as phase artifacts, but keyed on the
full `quickId` (date+time) rather than a phase number.

### Milestone archive naming

```
milestones/vX.Y-ROADMAP.md
milestones/vX.Y-REQUIREMENTS.md
milestones/vX.Y-MILESTONE-AUDIT.md
milestones/vX.Y-phases/NN-slug/...
```
Confirmed via direct listing: `milestones/v1.0-ROADMAP.md`, `milestones/v1.0-REQUIREMENTS.md`,
`milestones/v1.0-MILESTONE-AUDIT.md`, `milestones/v1.0-phases/`. Regex:
```
^v(\d+)\.(\d+)(?:\.(\d+))?-(.+)$
```
matching `CANONICAL_PATTERNS`' `/^v\d+\.\d+(?:\.\d+)?-.*\.md$/i` (case-insensitive, optional patch
version). `milestone_version` values observed as plain strings like `"v2.0"` in STATE.md frontmatter,
`"v1.0"` in the milestone archive filenames — consistent `vMAJOR.MINOR` scheme, patch segment optional
and unobserved in practice.

### `phase_naming` and `phase_numbering` config effects on all of the above

Two distinct config keys govern this, and they are NOT the same thing:

- **`config.json`'s `phase_naming`** (`"sequential"` default | `"custom"`): governs how a NEW phase's
  own ID is minted (integer auto-increment vs. arbitrary uppercase string via `--id`). Confirmed in
  `phase.cjs` (`cmdPhaseAdd`). Both sampled projects use `"sequential"`.
- **`STATE.md`'s `phase_numbering`** frontmatter field (observed value in `studio-portal`:
  `"restarts-per-milestone"`): governs whether phase numbers are continuous across the project's whole
  life or reset to 1 at each new milestone. **This is the more consequential one for a dashboard**:
  `studio-portal`'s v2.0 "Phase 1" (`phases/01-portal-owned-identity-sessions/`) is a DIFFERENT phase
  from v1.0's shipped "Phase 1" (`milestones/v1.0-phases/01-identity-persistence-foundation/`) — same
  directory-name grammar, same number, disjoint identity. STATE.md's own prose makes this explicit:
  *"Phase numbering restarts at 1 for v2.0.' 'Phase 1' here is v2.0's identity phase, not v1.0's shipped
  'Identity & Persistence Foundation'."* A phase's true identity is therefore
  **(milestone_version, phase_number)**, never phase_number alone, whenever `phase_numbering:
  restarts-per-milestone` is in effect. `roadmap.md`'s own template guidance says the opposite is also
  a legitimate mode ("Continuous phase numbering (never restart at 01)" — the milestone-grouped-roadmap
  guideline). **A dashboard must read `phase_numbering` from STATE.md frontmatter (when present) before
  assuming phase numbers are globally unique**, and must always scope phase lookups to the directory
  they were found in (`phases/` = current milestone; `milestones/vX.Y-phases/` = archived) rather than
  to phase number alone.

---

## Structured Data Schemas

### STATE.md — YAML frontmatter

Confirmed field-by-field against both `gsd-core/templates/state.md` (the intended shape) and
`studio-portal/.planning/STATE.md` (the real, evolved shape — richer than the template).

**Guaranteed fields** (present in the template, and confirmed present in the real file):

| Field | Type | Notes |
|---|---|---|
| `gsd_state_version` | string | Semver-ish; observed `'1.0'` (template, quoted) and `1.0` (real, unquoted — YAML parses both identically as a scalar, but a strict typed parser should coerce to string). Template comment: `"placeholder; syncStateFrontmatter overwrites on first state.* call"` — meaning a truly untouched fresh STATE.md may carry a stale placeholder value; do not use it alone to detect "empty project." |
| `status` | string enum | Observed value: `planning`. Template comment implies other values exist (execution-related) but only one value was directly observed; treat as an open string, not a closed enum, for forward-compat. |
| `progress` | object | Nested block, see below. |

**Guaranteed sub-fields of `progress`:**

| Field | Type |
|---|---|
| `total_phases` | integer |
| `completed_phases` | integer |
| `total_plans` | integer |
| `completed_plans` | integer |
| `percent` | integer (0–100) |

**Additional fields confirmed present in the real (evolved) file, NOT in the shipped template — treat
these as conventional/optional, not guaranteed:**

| Field | Type | Observed value |
|---|---|---|
| `milestone` | string | `v2.0` |
| `milestone_name` | string | `Accounts & Bulk Downloads` |
| `current_phase` | integer or string | `1` |
| `current_phase_name` | string | `Portal-Owned Identity & Sessions` |
| `stopped_at` | string (free text) | `Phase 4 UI-SPEC approved` |
| `last_updated` | ISO 8601 string (quoted) | `"2026-08-21T07:07:55.651Z"` |
| `last_activity` | date string `YYYY-MM-DD` | `2026-08-21` |
| `last_activity_desc` | string | free text |
| `state_head` | git SHA string | `2e5c8fd70bbee920e1b77974725daadabbe7cf18` |
| `phase_numbering` | string enum | `restarts-per-milestone` (only value observed; contrast implied: continuous) |

**Conclusion on STATE.md frontmatter:** the template's ~3-field contract
(`gsd_state_version`/`status`/`progress`) is the only part safe to treat as guaranteed across every
GSD project. Everything else is genuinely additive and observed-not-guaranteed — a parser MUST read
frontmatter as an open map (`Record<string, unknown>`), pick out the known fields it wants to surface
prominently, and pass the rest through generically (e.g. as a details/metadata panel) rather than
failing on unrecognized keys.

**STATE.md body sections** (prose, but structurally reliable — confirmed present, in this order, in
both the template and the real file): `## Project Reference`, `## Current Position`, `## Milestone Plan
(vX.Y)` *(observed-only addition, a markdown table of phase→requirements→depends-on)*, `## Milestone
History` *(observed-only, table of past milestones with links to their archive)*, `## Performance
Metrics` (Velocity + By-Phase table + Recent Trend, or in the real file: totals + per-phase table +
per-plan table), `## Accumulated Context` (`### Decisions`, `### Blockers/Concerns`, and observed-only
`### Quick Tasks Completed` table), `## Deferred Items` (table: Category/Item/Status/Deferred
At/Milestone), `## Session Continuity`, and observed-only `## Operator Next Steps`. The Quick Tasks
Completed table is the single authoritative status index for `quick/` — it has columns `#`,
Description, Date, Commit, Status (free text — observed values include empty, `Needs Review`), and
Directory (relative markdown link). A dashboard's quick-task list view should source status from here,
not attempt to infer it from directory contents.

### config.json — key inventory

The **authoritative, code-generated field reference** is `gsd-core/references/planning-config.md`'s
`<complete_field_reference>` section (~60 keys, explicitly stated to be "Generated from
`CONFIG_DEFAULTS` (configuration.cjs) and `VALID_CONFIG_KEYS` (config-schema.cjs)"). Do not use the
shipped `templates/config.json` as a schema source — it is a stale, differently-nested example.
Summarized by namespace (full descriptions in the source doc; reproduced here at type/default level
for a parser's benefit):

**Core (flat, top-level):** `model_profile` (string enum: quality/balanced/budget/adaptive/inherit),
`mode` (interactive/yolo), `granularity` (coarse/standard/fine), `commit_docs` (bool), `search_gitignored`
(bool), `phase_naming` (sequential/custom), `project_code` (string|null), `response_language`
(string|null), `context_window` (number, default 200000), `resolve_model_ids` (bool|"omit"), `context`
(dev/research/review/null), `review.models.<cli>` (string|null per-CLI override).

**`workflow.*`** (~25 keys): `research`, `plan_check` (alias `plan_checker`), `verifier`,
`nyquist_validation`, `auto_prune_state`, `auto_advance`, `node_repair`, `node_repair_budget`,
`smart_zone_tokens` (default 100000), `ai_integration_phase`, `api_coverage_gate`, `ui_phase`,
`ui_safety_gate`, `text_mode`, `research_before_questions`, `discuss_mode` (discuss/assumptions),
`skip_discuss`, `use_worktrees`, `subagent_timeout` (ms, default 300000), `test_command` (string|null),
`build_command` (string|null), `mvp_mode`, `context_guard_mode` (auto/warn/off), `plan_chunked`,
`specless_probe_fallback`, `code_review_command` (string|null), `inline_plan_threshold` (default 2),
`code_review`, `code_review_depth` (quick/standard/deep), `_auto_chain_active` (internal), `security_enforcement`,
`security_asvs_level` (1/2/3), `security_block_on` (critical/high/medium/low/none),
`post_planning_gaps`. Studio-portal's real config additionally carries `workflow.windows_enforce`
(bool, off by default) and `workflow.schema_drift_gate`/`drift_threshold`/`drift_action`/
`plan_drift_precheck`/`assumption_delta` — **confirming the field set has grown even beyond the
~60-key reference doc's snapshot**, via `gsd-tools query state load`'s live config dump, which is more
current than the static reference doc. **This is the single strongest piece of evidence for "config
schema is a moving target, read it as an open map."**

**`ship.pr_body_sections`**: array of `{heading, enabled, source?, template?, fallback?}` — governs PR
body composition; not directly relevant to a `.planning/`-only dashboard except as a config-display
item.

**`git.*`**: `branching_strategy` (none/phase/milestone), `base_branch` (string|null),
`create_tag` (bool), `phase_branch_template`/`milestone_branch_template`/`quick_branch_template`
(string templates with `{phase}`/`{slug}`/`{milestone}` variables).

**Search/API toggles (flat, top-level):** `brave_search`, `firecrawl`, `exa_search` (booleans;
studio-portal's real config additionally has `tavily_search`, `ref_search`, `perplexity`, `jina` —
again beyond the static doc's enumerated set).

**`features.*`**: `thinking_partner`, `global_learnings`.
**`hooks.*`**: `context_warnings`.
**`learnings.*`**: `max_inject` (default 10).
**`intel.*`**: `enabled` (bool, default false) — gates `.planning/intel/`.
**`manager.flags.*`**: `discuss`/`plan`/`execute` (CLI flag strings).
**Advanced:** `parallelization` (bool OR `{enabled: bool, ...}` — polymorphic, normalized at load
time), `model_overrides` (object|null), `agent_skills` (object, `{agentType: skillSet | skillSet[]}`),
`sub_repos` (array, auto-detected/synced on every load).
**`planning.*`**: `commit_docs`/`search_gitignored` — aliases of the top-level keys; top-level wins if
both set.

**Field interaction rules worth encoding in a parser/renderer** (from the same reference doc):
`commit_docs` resolves through a 4-tier precedence chain (`phase_commit_docs.<id>` → explicit config →
`.gitignore` auto-detect → default `true`); `context_window >= 500000` changes downstream agent read
depth (informational for a dashboard, not actionable); `parallelization` accepts boolean-or-object;
the deprecated `depth` key auto-migrates to `granularity` on load and is rewritten to disk — so a
truly ancient `config.json` might still show `depth` if `gsd-tools` hasn't touched it since; `sub_repos`
is rewritten on every config load (auto-detected), so it is not purely user-authored despite living in
the file the user edits.

### HANDOFF.json

Confirmed field-by-field from `studio-portal/.planning/HANDOFF.json` (a real paused-phase example) and
cross-referenced against `artifact-types.md`'s description ("Structured pause state (JSON
machine-readable...)"). Fields observed:

```
version (string, "1.0")
timestamp (ISO string)
phase (string, zero-padded, e.g. "01")
phase_name (string, slug form)
phase_dir (string, relative path)
plan (number — the plan currently in progress)
task (number — the task within that plan)
total_tasks (number)
status (string, observed: "paused")
completed_tasks (array of {id, name, status, commit, wave, tasks})
remaining_tasks (array of {id, name, status, wave, autonomous (bool), tasks: [{id, name, type, tdd?}]})
blockers (array)
async_jobs (array)
human_actions_pending (array of {action, context, blocking (bool)})
decisions (array of {decision, rationale, phase})
uncommitted_files (array)
next_action (string — literal next command to run)
context_notes (string — free text)
```
No template file for `HANDOFF.json` exists in `gsd-core/templates/` — its shape is defined entirely by
the pause-work/resume-project workflow code, not a markdown template. Treat every field above as
**observed, not contractually guaranteed** — this is a single real sample, not a schema document. Only
`version`, `timestamp`, `phase`, `status` look load-bearing enough (referenced by workflow prose) to
treat as reliably present.

### estimation-calibration.json

Simple and fully confirmed:
```json
{ "schema_version": 1, "samples": [ { "estimateTokens": number, "actualTokens": number } ] }
```
Purely a calibration dataset for GSD's own estimator; no rendering value beyond a curiosity metric
("estimate accuracy over time" chart is possible but low-priority).

### WINDOWS.md — the broken-windows ledger

Confirmed from `studio-portal/.planning/WINDOWS.md`, a genuinely undocumented-in-templates but
fully-canonical (`artifacts.cjs`) file. Triple-encoded: YAML frontmatter, a human-readable markdown
table, AND a fenced ` ```json ` block repeating the same rows — clearly designed so both a human
reader and a script (`gsd-tools windows ...` — not directly enumerated in the CLI's top-level command
list but implied by ledger-management prose: "Waive with `gsd-tools windows waive <id> "<reason>"`")
can consume it without re-parsing markdown.

**Frontmatter:**
```yaml
schema_version: 1
open_count: N
waived_count: N
fixed_count: N
total_count: N
last_updated: ISO timestamp
```
**Table columns:** `id, phase, kind, file, line, description, status, reason, recorded_at, resolved_at`.
**`kind` observed values:** `unrun-verify`, `deviation`. **`status` observed values:** `open` (only
value seen; `waived`/`fixed` implied by the count fields and CLI verbs but not observed in a row).

This is a genuinely useful, high-signal artifact for a dashboard's "what's outstanding" view — it is
explicitly a cross-phase register of unresolved human-verification gaps and known deviations, already
structured as a table with a phase FK. Prefer parsing the fenced JSON block over the markdown table
when both are present (same data, JSON is authoritative-shaped).

### Per-phase-artifact YAML frontmatter — the full confirmed set

| Artifact | Frontmatter fields (guaranteed by template) |
|---|---|
| `VALIDATION.md` | `phase`, `slug`, `status` (draft→validated), `nyquist_compliant` (bool), `wave_0_complete` (bool), `created` |
| `SECURITY.md` | `phase`, `slug`, `status` (draft→verified), `threats_open` (int — count at/above `security_block_on` severity), `asvs_level` (1/2/3), `created` |
| `UI-SPEC.md` | `phase`, `slug`, `status` (draft→?), `shadcn_initialized` (bool), `preset` (string), `created` |
| `UAT.md` | `status` (testing/partial/complete/diagnosed), `phase`, `source` (list of SUMMARY.md files), `started`, `updated` |
| `PLAN.md` | `phase`, `plan`, `type` (execute), `wave` (int), `depends_on` (array of plan IDs), `files_modified` (array), `autonomous` (bool), `requirements` (array, REQUIRED non-empty), `user_setup` (array), `must_haves: {truths: [], artifacts: [], key_links: []}` |
| `SUMMARY.md` | `phase`, `plan`, `subsystem`, `tags`, `requires`/`provides`/`affects` (dependency graph), `actuals: {tokens, tasks, commits}`, `tech-stack: {added, patterns}`, `key-files: {created, modified}`, `key-decisions` (array), `patterns-established` (array), `requirements-completed` (array, REQUIRED), `coverage` (array of `{id, description, requirement?, verification: [{kind, ref, status}], human_judgment (bool, REQUIRED), rationale?}` — OMITTED entirely = legacy fallback to prose), `duration`, `completed`, `status` (complete default / halted) |
| `VERIFICATION.md` | `phase`, `verified` (ISO), `status` (passed/gaps_found/human_needed), `score` (string "N/M"), `behavior_unverified` (int), `behavior_unverified_items` (conditional array), `coincidental_reliance_items` (conditional array) |
| `LEARNINGS.md` (per-phase) | `phase`, `phase_name`, `project`, `generated`, `counts: {decisions, lessons, patterns, surprises}`, `missing_artifacts` (array) |
| `WINDOWS.md` | (see above — project-root, not per-phase) |
| `AI-SPEC.md` | **No YAML frontmatter** — structured instead via numbered `##`/`###` markdown sections (`1. System Classification`, `1b. Domain Context`, etc.) with HTML-comment-delimited fill-in fields. |
| `CONTEXT.md`, `RESEARCH.md`, `DISCUSSION-LOG.md`, `PATTERNS.md` | **No YAML frontmatter** — pure structured markdown/pseudo-XML tag sections. |

**Distinguishing guaranteed vs. conventional:** every field listed above under a template-backed
artifact type is "guaranteed" in the sense that the template mandates it and downstream workflows
(planner, verifier, UAT classifier) read it by name — these are load-bearing, not decorative. Fields
NOT listed (i.e. anything appearing in a real file's frontmatter that isn't in its template) should be
treated the same way STATE.md's extra fields are: pass-through, not schema violations.

---

## Markdown Conventions per Artifact Type

### ROADMAP.md — the richest hand-authored structure

Confirmed against both the template (`gsd-core/templates/roadmap.md`) and two independently-evolved
real files, and independently re-validated by `gsd-tools query roadmap analyze`'s JSON output (which
extracts an identical shape from `studio-portal/ROADMAP.md` — this is the strongest possible
confirmation that the grammar below is not a hallucinated pattern but the actual, machine-relied-upon
contract).

**Top of file (pre-milestone-grouping, greenfield v1.0):**
```
# Roadmap: {Project Name}
## Overview
## Phases
- [ ] **Phase N: {Name}** - {one-line description}
```
**After ≥1 milestone ships (milestone-grouped form — the mature shape, confirmed in studio-portal):**
```
# Roadmap: {Project Name}
## Milestones
- ✅ **v1.0 {Name}** — {phases} (shipped {date})
- 🚧 **v2.0 {Name}** — {phases} (in progress / planned {date})
## Phases
<details>
<summary>✅ v1.0 {Name} (v1.0 Phases X-Y) — SHIPPED {date}</summary>
- [x] v1.0 Phase N: {Name} ({M}/{M} plans) — completed {date}
...
Full detail: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
Audit: [milestones/v1.0-MILESTONE-AUDIT.md](milestones/v1.0-MILESTONE-AUDIT.md)
</details>
### 🚧 v2.0 {Name} (current milestone ...)
- [ ] **Phase N: {Name}** - {description} [— completed {date}, if done]
```
**Collapsed-archive convention:** `<details><summary>{emoji} vX.Y {Name} (...) </summary>...</details>`
— a parser should treat the `<summary>` text as the milestone header and everything inside as that
milestone's archived phase list. Emoji is a genuine status signal: ✅ shipped, 🚧 in progress, 📋
planned (from `roadmap.md` template guidance) — confirmed ✅/🚧 used in the real file.

**Dependency shape** — an OPTIONAL ASCII-art fenced block, confirmed present in studio-portal:
```
## Phase Details
...
**Dependency shape:**
```
Phase 1 (identity) ──► Phase 2 (roles) ──► Phase 3 (admin + revocation)
                              │
                              └──────────► Phase 4 (bulk archive)   [∥ Phase 3]
```
This is **free-form ASCII, not a machine-parseable format** — a dashboard cannot regex this into a
graph. The machine-parseable dependency signal is each phase's `**Depends on**:` field (see below),
which is prose but far more regular. A "render the ASCII block verbatim in a `<pre>`" strategy is
correct; attempting to derive a graph from arrows is not recommended (fragile, no schema guarantee).

**Per-phase detail block** (this is what `roadmap analyze` parses into its `phases[]` array):
```
### Phase N: {Name}
**Goal**: {text}
**Depends on**: {free text, e.g. "Phase 1", "Nothing (first phase)", "Phase 2 (∥ Phase 3)"}
**Requirements**: {REQ-01, REQ-02}   <!-- brackets optional; confirmed by template comment: "parser handles both formats" -->
**Success Criteria** (what must be TRUE):
  1. {observable behavior}
  2. ...
**Plans**: {N plans | "TBD"}

Plans:
- [ ] NN-01: {description}
- [x] NN-02: {description}   <!-- checked = complete -->
```
**Confirmed via `roadmap analyze` output fields**: `number`, `name`, `goal`, `mode` (nullable — MVP
mode marker), `depends_on` (raw string, not parsed further), `plan_count`, `summary_count`,
`has_context` (bool — CONTEXT.md exists), `has_research` (bool), `disk_status` (observed values:
`"complete"`, `"researched"`, `"no_directory"` — a derived enum combining directory presence + plan/
summary counts), `roadmap_complete` (bool — whether ALL plan checkboxes in this phase's list are
`[x]`). **`roadmap_complete` and `disk_status` can legitimately disagree** (observed: Phase 1 has
`disk_status: "complete"` — 6/6 plans have SUMMARY.md — but `roadmap_complete: false`, because its
ROADMAP.md checkboxes were not yet ticked — confirmed in STATE.md's own prose: *"Phase 1's plans are
all executed; only its ROADMAP checkboxes are unticked"*). **A dashboard must surface both signals
distinctly and never collapse them into one "done" boolean** — this exact discrepancy is the single
most concrete, real example in the sampled data of "what looks done on disk vs. what the roadmap
formally records as done" diverging, and it is exactly the kind of gap this dashboard exists to
surface.

**Progress table:**
```
## Progress
| Phase | Plans Complete | Status | Completed |
```
Status values (from template's `<status_values>`): `Not started`, `In progress`, `Complete` (with
date), `Deferred` (with reason). In the milestone-grouped form the table gains a Milestone column.

**Requirement Coverage / Carried Items sections** — observed-only additions in the real file
(`## Requirement Coverage`, `## Carried Items Not In This Milestone`) not present in the template —
further evidence the template is a starting skeleton, not a closed schema.

### REQUIREMENTS.md

Template and real file agree closely:
```
# Requirements: {Project} [— {Milestone Name}, in mature/milestone-scoped form]
**Milestone:** / **Defined:** / **Core Value:** / **Supersedes:** {prior milestone's archived REQUIREMENTS.md}
## v1 Requirements  (or "## v2.0 Requirements" in milestone-scoped form)
### {Category}
- [ ] **{CAT}-{NN}**: {user-centric, testable, atomic description}
## v2 Requirements  (or "## Future Requirements")
### {Category}
- **{CAT}-{NN}**: {description}     <!-- no checkbox — not yet actionable -->
## Out of Scope
| Feature | Reason |
## Traceability
| Requirement | Phase | Status |
**Coverage:**
- v1 requirements: {X} total
- Mapped to phases: {Y}
- Unmapped: {Z}
```
Requirement ID grammar: `[A-Z][A-Z0-9]*-\d{2,}` (e.g. `AUTH-01`, `DL-09`, `ROLE-07`) — confirmed
against both template examples and every real requirement observed (`AUTH-01..06`, `ROLE-01..07`,
`ADMIN-01..06`, `DL-01..09`, `BROWSE-04..07`, `HARDEN-01/02`). Category prefixes are free-form,
project-defined (not a closed enum) — derived from research `FEATURES.md` categories per the template
guidance. Status column values (template): `Pending`, `In Progress`, `Complete`, `Blocked`.
**Real-file addition confirmed**: a requirement can carry an inline amendment note (blockquote,
`> **Amended {date}** by \`{artifact}\` § \`<tag>\` ({D-refs}). {explanation}`) directly above its
category heading — this is a genuine, unschematized prose extension a renderer should preserve
verbatim (render blockquotes normally) rather than try to parse structurally.

### PROJECT.md

Confirmed via `labelore/.planning/PROJECT.md` (this project's own file, read in full at research
start) matching `gsd-core/templates/project.md`'s shape:
```
# {Project Name}
## What This Is
## Core Value
## Requirements
### Validated    <!-- requirement text + phase reference, once shipped -->
### Active       <!-- checkbox list, hypotheses -->
### Out of Scope <!-- bulleted, each with a **bold reason** -->
## Context
## Constraints
## Key Decisions
| Decision | Rationale | Outcome |
## Evolution
```
The `## Key Decisions` table's Outcome column uses `— Pending` as a literal placeholder value until a
decision is validated by shipped work — confirmed in the live file (all 7 decisions in `labelore`'s
PROJECT.md show `— Pending`). This table is the closest thing to a project-wide decision log outside
of per-phase `D-NN` IDs in CONTEXT.md — but it is NOT ID-keyed (no `D-NN` prefix at this level), so
cross-linking it to phase-level decisions is a text-matching problem, not an ID-join.

### CONTEXT.md — 6-tag section grammar

Confirmed from `gsd-core/templates/context.md`. Not headings but **pseudo-XML tags** wrapping `##`
sections:
```
<domain> ## Phase Boundary </domain>
<decisions> ## Implementation Decisions   ### {Area}: - **D-01:** {decision}  ... ### Claude's Discretion </decisions>
<specifics> ## Specific Ideas </specifics>
<canonical_refs> ## Canonical References  ### {Topic}: - `path` — {what it defines} </canonical_refs>
<code_context> ## Existing Code Insights  ### Reusable Assets / Established Patterns / Integration Points </code_context>
<deferred> ## Deferred Ideas </deferred>
```
Decision IDs here are `D-NN` (project-relative, NOT globally unique across phases — confirmed:
studio-portal's real decision IDs referenced in STATE.md and REQUIREMENTS.md include `D-01`, `D-02`,
`D-06`, `D-07`, `D-08`, `D-09`, `D-16`, `D-18` — these appear to be **milestone-scoped sequential**,
not phase-scoped; e.g. `02-CONTEXT.md`'s decisions are cited as `D-01/D-02/D-16` in REQUIREMENTS.md's
amendment note while `03-CONTEXT.md` records `D-09`, suggesting a single running counter across the
milestone's phases, not a per-phase reset). **A parser cannot assume `D-NN` uniqueness scope without
also reading which CONTEXT.md file it was extracted from** — treat `D-NN` IDs as scoped to
`(milestone, D-NN)` unless/until observed otherwise, and always carry the source file alongside the ID
when indexing for cross-reference.

### PLAN.md task structure

Confirmed from `gsd-core/templates/phase-prompt.md`. Tasks are pseudo-XML, not markdown checklists:
```xml
<task type="auto">
  <name>Task N: {action-oriented name}</name>
  <files>path, path</files>
  <read_first>path, path</read_first>
  <action>{instructions}</action>
  <verify>{command/check}</verify>
  <acceptance_criteria> - {grep-verifiable condition} </acceptance_criteria>
  <done>{measurable criteria}</done>
</task>
```
Checkpoint task types (`type="checkpoint:decision"`, `type="checkpoint:human-verify"`,
`type="checkpoint:human-action"` per HANDOFF.json's observed `gate: "blocking"` field) carry
`<decision>`/`<options>`/`<resume-signal>` or `<what-built>`/`<how-to-verify>`/`<resume-signal>`
instead of `<action>`/`<verify>`. A renderer should special-case these — they represent human gates,
not automatable steps, and are exactly the "awaiting human verification" signal the dashboard's
situational-awareness requirement needs (confirmed real example: `01-06`'s Task 3, a
`checkpoint:human-action` with `gate: blocking`, held up the whole phase per HANDOFF.json).

### SUMMARY.md prose sections

Confirmed section order from template and cross-checked structurally (not full-text) against real
files: `# Phase N: {Name} Summary` → one-liner → `## Performance` → `## Accomplishments` → `## Task
Commits` (numbered list, each `**Task N: {name}** - \`{short-sha}\` ({type})`) → `## Files
Created/Modified` → `## Decisions Made` → `## Deviations from Plan` → `## Issues Encountered` → `##
User Setup Required` → `## Next Phase Readiness`. The commit-SHA-per-task list is a genuine
cross-reference opportunity (short SHA → could link to a git host, out of this project's read-only
`.planning/`-only scope but worth flagging as a "link out" seam).

### Checkboxes and completion state — the general convention

Every checklist in every GSD artifact uses standard GFM `- [ ]` / `- [x]` (never `[X]` uppercase in any
sample observed). This is reliably parseable with a single regex (`^\s*-\s*\[([ xX])\]\s*(.*)$`) across
every artifact type that uses lists: ROADMAP.md's phase and plan lists, REQUIREMENTS.md's requirement
lists, UAT.md is the one exception — it uses a `result:` YAML-ish key inside a `###` heading per test,
not a checkbox, because a UAT test result has more than 2 states (pass/issue/skipped/blocked/pending).

---

## Cross-Reference and ID Conventions

Every ID scheme observed, with its scope and the artifacts that carry it:

| ID scheme | Format | Scope | Defined in | Referenced from |
|---|---|---|---|---|
| Requirement ID | `[A-Z][A-Z0-9]*-\d{2,}` (e.g. `AUTH-01`) | Project-wide, persists across milestones (`REQ-ID numbering continues from v1.0` — confirmed in REQUIREMENTS.md's own header prose) | `REQUIREMENTS.md` | `ROADMAP.md` phase `**Requirements**:` field, `PLAN.md` frontmatter `requirements:` array, `SUMMARY.md` frontmatter `requirements-completed:`/`coverage[].requirement`, `VERIFICATION.md` Requirements Coverage table, `SECURITY.md` threat register (indirectly) |
| Phase number | `\d+[A-Z]?(?:\.\d+)*`, scoped to `(milestone, number)` when `phase_numbering: restarts-per-milestone` | Milestone-scoped or project-wide depending on config | `ROADMAP.md` phase headers, directory names | Everywhere — `STATE.md current_phase`, `SUMMARY.md`/`PLAN.md` `phase:` field, `HANDOFF.json phase`, commit messages (`feat(NN-MM): ...` convention referenced in `milestone.md` template's "Git range" guidance) |
| Plan ID | `{phase}-{plan}` both zero-padded (e.g. `01-02`) | Phase-scoped | `PLAN.md`/`SUMMARY.md` filenames and frontmatter | `PLAN.md depends_on: []` (array of plan IDs), `SUMMARY.md requires[].phase`, `HANDOFF.json completed_tasks[].id`/`remaining_tasks[].id` |
| Decision ID | `D-NN` | Milestone-scoped (evidence above; not confirmed phase-scoped) | `CONTEXT.md <decisions>` | `REQUIREMENTS.md` amendment blockquotes, `STATE.md` Decisions section (prose, not ID-linked in the sample — decisions there are written as free text with a `[Phase ?]:` prefix, NOT `D-NN` linked — a real gap in cross-referencing that a dashboard could actually fix by joining STATE.md's decision text back to its source CONTEXT.md's D-NN by proximity/phase, though this is a heuristic, not a guaranteed join) |
| Wave number | Plain integer | Plan-scoped (execution ordering within a phase) | `PLAN.md wave:` frontmatter | `HANDOFF.json completed_tasks[].wave`/`remaining_tasks[].wave` |
| Milestone version | `vMAJOR.MINOR[.PATCH]` | Project-wide, monotonic | `STATE.md milestone`, `ROADMAP.md` headers, `milestones/vX.Y-*` filenames | `MILESTONES.md` entries, `RETROSPECTIVE.md`, `REQUIREMENTS.md Supersedes:` field |
| Threat ID | `T-{phase}-{NN}` (e.g. `T-N-01`) | Phase-scoped | `SECURITY.md` Threat Register | Accepted Risks Log `Threat Ref` column |
| Deliverable ID | `D1`, `D2`, ... (NOTE: same `D` prefix letter as Decision IDs but a DIFFERENT namespace — collision risk in naive ID search) | Plan-scoped | `SUMMARY.md coverage[].id` | `UAT.md` (implied — "cross-referencing from UAT.md and audit reports" per template's field-semantics table), audit reports |
| Windows-ledger ID | Plain integer, ledger-wide sequential | Project-wide | `WINDOWS.md` table `id` column | `gsd-tools windows waive/fixed <id>` (CLI-only reference, not cross-linked from other markdown) |
| Requirement traceability | Requirement → Phase (1:1 per the template: "Each requirement maps to exactly one phase") | — | `REQUIREMENTS.md ## Traceability` table | This is explicitly named in `labelore`'s own `PROJECT.md` as a first-class dashboard requirement — the table itself is a ready-made join source. |

**Important collision warning:** `D-NN` (project decisions) and `D{N}` (SUMMARY.md coverage
deliverable IDs, no hyphen) are visually similar but semantically and namespace-distinct. A
cross-reference resolver keying purely on a regex like `D-?\d+` would incorrectly conflate them. Always
resolve an ID within the context of the artifact type it was found in, never as a single global
namespace.

**What is genuinely NOT ID-linked (a gap in GSD itself, not this research's gap):** STATE.md's
"Decisions" bullet list is free prose with a `[Phase N]:` prefix, not a `D-NN` reference — confirmed
directly in the real file (every entry: `- [Phase ?]: {prose}`, note even the phase number is
literally the placeholder text `?` in several entries — evidently hand/agent-written without full
substitution). A dashboard cannot join these to CONTEXT.md decisions by ID; only by proximity (same
phase directory) and prose similarity. Set expectations accordingly — this is a "browse near" feature
at best, not a "click to jump to exact decision" feature, for this specific relationship.

---

## Beyond `.planning/`: Skills, Agents, Hooks, Runtime

### Skills — `~/.claude/skills/`

73 directories confirmed (`ls ~/.claude/skills/`), one per `gsd-*` slash command plus 6 `gsd-ns-*`
"namespace" skills that appear to be command groupings/routers (`gsd-ns-context`, `gsd-ns-ideate`,
`gsd-ns-manage`, `gsd-ns-project`, `gsd-ns-review`, `gsd-ns-workflow`). Each is a thin wrapper skill
that likely just points at the corresponding `gsd-core/workflows/*.md` file. **Holds no project state**
— purely command definitions. **Out of scope** for a `.planning/` dashboard; not worth surfacing.

### Agents — `~/.claude/agents/`

32 `gsd-*.md` agent definition files confirmed (`gsd-planner.md`, `gsd-executor.md`, `gsd-verifier.md`,
`gsd-codebase-mapper.md`, `gsd-pattern-mapper.md`, `gsd-security-auditor.md`, `gsd-ui-auditor.md`,
`gsd-debugger.md`, etc. — largest is `gsd-code-fixer.md` at ~44KB, `gsd-executor.md`/`gsd-verifier.md`/
`gsd-planner.md`/`gsd-plan-checker.md` each ~49KB). These are subagent system-prompt definitions
consumed by Claude Code's own Task/Agent tool — **not project state, holds no per-project data**.
**Out of scope**, same reasoning as skills.

### Hooks — `~/.claude/settings.json`

Confirmed the full hook wiring: `SessionStart` (2 hooks: `gsd-check-update.js`,
`gsd-session-state.sh`), `PostToolUse` (4 matchers: `Bash|Edit|Write|MultiEdit|Agent|Task` →
context-monitor; `Read` → injection-scanner; `Bash` → graphify-update; `Write|Edit` →
phase-boundary), `PreToolUse` (7 hooks across `Write|Edit`, `Bash`, `Agent|Task` matchers — prompt-
guard, read-guard, workflow-guard, worktree-path-guard, validate-commit, agent-isolation-guard,
write-guard), `SubagentStop`/`Stop`/`PreCompact` (all → `gsd-context-monitor.js`), `FileChanged`
(matcher `config.json` → `gsd-config-reload.js`). Plus a `statusLine` command
(`gsd-statusline.js`) and `enabledPlugins` (`vercel`, `rust-analyzer-lsp`).

**Relevance to a dashboard:** These are Claude-Code-session-lifecycle hooks that fire during active
*editing* sessions — they enforce GSD's own write-time invariants (guard against writing outside
worktree paths, validate commits, warn on context exhaustion, live-reload config). **None of them hold
durable project state a dashboard would read** — they are process, not data. The one exception worth
naming: `gsd-graphify-update.sh` fires on every `Bash` tool call and presumably keeps
`.planning/graphs/` current — meaning if that directory existed and were populated, it would be
close to real-time fresh relative to the last Claude Code session, which is a relevant "how fresh is
this data" fact if a future milestone adds graph rendering. **Not v1 scope** per `PROJECT.md`'s own
Out-of-Scope list (no live file-watching in v1), but worth flagging as a freshness caveat for whichever
future milestone reads `graphs/`.

### `gsd-core` runtime and `gsd-tools.cjs` query CLI

Confirmed the full top-level command list via `gsd-tools --help`:
```
agent, agent-skills, assumption-delta, audit-open, audit-uat, check, check-commit, commit,
commit-docs-guard, commit-to-subrepo, pr-subrepo, config-ensure-section, config-get,
config-new-project, config-path, config-set, migrate-config, normalize-test-command,
context-predicates, current-timestamp, detect-custom-files, docs-init, drift-guard, effort,
extract-messages, find-phase, from-gsd2, frontmatter, gap-analysis, generate-claude-md,
generate-claude-profile, generate-dev-preferences, generate-slug, graphify, history-digest, init,
intel, capability, classify-confidence, git, learnings, list-seeds, list-todos, loop, milestone,
package-legitimacy, phase, phase-plan-index, phases, profile-questionnaire, profile-sample,
progress, project-instruction-file, prompt-budget, quick-tasks-append, requirements,
research-plan, research-store, resolve-granularity, resolve-model, restore-custom-files, roadmap,
scaffold, smart-entry, state, config-set-model-profile, dispatch-isolation,
dispatch-should-flatten, inspect-dispatch-isolation, record-dispatch-isolation,
estimate-calibrate, estimate-calibration, estimate-check, resolve-agent, resolve-dispatch-type,
resolve-execution, review-lane, skill-manifest, skills-root, state-snapshot, stats,
summary-extract, teams-status, todo, uat, update-context, verification, websearch, windows, task,
template, user-story, validate, verify, verify-path-exists, verify-summary, eval, workstream,
worktree
```

**Subcommands directly probed and confirmed useful for a read-only dashboard** (invoked live against
`studio-portal`; all under `node gsd-core/bin/gsd-tools.cjs query <command> <subcommand>`):

| Command | Subcommand(s) | What it returns | Dashboard relevance |
|---|---|---|---|
| `roadmap` | `analyze` | Full JSON: milestones[], phases[] (number, name, goal, mode, depends_on, plan_count, summary_count, has_context, has_research, disk_status, roadmap_complete), phase_count, completed_phases, total_plans, total_summaries, progress_percent, progress_scope, current_phase, next_phase | **High** — this IS the roadmap view's data model, already parsed. Confirmed live output above. |
| `roadmap` | `milestone-scope`, `get-phase`, `validate`, `upgrade`, `update-plan-progress`, `annotate-dependencies` | (not individually probed) | `get-phase` likely returns single-phase detail; `validate` likely a lint check — useful for a "roadmap health" indicator |
| `progress` | (no subcommand — direct) | JSON: `milestone_version`, `milestone_name`, `phases[]`, `total_plans`, `total_summaries`, `percent`, `phase_scope` | **High** — lighter-weight sibling of `roadmap analyze`, likely the exact source for a "where am I" header widget |
| `state` | `load` | Full merged config (all ~60+ keys with resolved defaults) plus more | **High** — the single most reliable way to read effective config, since it already applies the `depth`→`granularity` migration, `planning.*` alias resolution, and `sub_repos` auto-sync that a naive `config.json` read would miss |
| `stats` | (direct) | JSON: milestone_version, milestone_name, phases[], phases_completed/total, total_plans, total_summaries, percent, plan_percent, requirements_total/complete, git_commits, git_first_commit_date, last_activity, phase_scope | **High** — ready-made stats-panel data; confirmed working even on a phase-less fresh project (`labelore`), returning zeroed/null fields gracefully rather than erroring — good evidence the CLI itself already does graceful degradation a dashboard can lean on |
| `requirements` | `mark-complete`, `ready-ids`, `revert-phase` | (write-oriented; `ready-ids` may be read-only — not confirmed) | Likely low relevance — these are workflow-mutation commands, not the requirements-list read path (that's `REQUIREMENTS.md` parsing directly, or possibly an unlisted read subcommand not discovered) |
| `phase` | `list-plans`, plus write verbs (`add`, `insert`, `remove`, `complete`, `next-decimal`, `uat-passed`) | `list-plans` is plausibly read-only and useful | Worth probing further in implementation phase |
| `phases` | `list`, `clear` | `list` plausibly a flat phase index | Worth probing further |
| `windows` | (verbs implied: `waive`, `fixed` from prose) | Not enumerated at top level as its own subcommand list in this probe | Confirm subcommands in implementation phase — likely has a read/list verb too |
| `graphify` | `build`, `diff`, `query`, `status` | `query`/`status` plausibly read `.planning/graphs/` | Out of v1 scope (graphs/ likely absent) but noted for future milestone |
| `intel` | `api-surface`, `diff`, `extract-exports`, `patch-meta`, `query`, `snapshot`, `status`, `update`, `validate` | `query`/`status` plausibly read `.planning/intel/` | Same — out of v1 scope, gated by `intel.enabled` |
| `workstream` | `create`, `list`, `status`, `complete`, `set`, `get`, `progress` | `list`/`status`/`get`/`progress` plausibly read-only | Relevant only if the target project uses workstreams (not observed in either sample) |
| `milestone` | `complete`, `archive-quick` | Both write-oriented | Low relevance to a reader |
| `verification` | `status`, `resolve-file` | `status` plausibly reads VERIFICATION.md state | Worth probing |
| `uat` | `render-checkpoint`, `classify-coverage` | `classify-coverage` reads SUMMARY.md `coverage:` blocks per the template's documented contract | Directly relevant to rendering UAT/coverage state correctly |

**Recommendation, stated plainly:** every `query` subcommand above marked High relevance should be
treated as **preferred over hand-rolled parsing** for the specific facts it returns (progress
percentages, phase disk-status, effective config) — but the dashboard still needs its own markdown
renderer for full document display (rendering `PLAN.md` prose, `SUMMARY.md` narrative,
`ROADMAP.md`'s full phase-detail prose, full-text search across raw files, and any artifact type the
CLI has no dedicated query for). Treat `gsd-tools query` as a **fast-path structural API**, and direct
file reads + the parsing rules in this document as the **fallback/complete path**. A pragmatic
implementation note: these are synchronous CLI invocations (`node gsd-tools.cjs query ...`,
confirmed ~0.1–0.3s per call in testing above including a Node cold start) — cheap enough to shell out
to per-request in a local single-user tool, but a server layer should still cache results keyed on
file mtimes rather than re-invoking on every request.

### `.gsd/` — project-local runtime scratch

Confirmed: `studio-portal/.gsd/dispatch-isolation-sentinel.json` — a single file,
`{"isolation":"harness-worktree","harness_flag":"isolation=\"worktree\"","phase":"03","plan":null,"written_at":<epoch ms>}`. This is **transient execution-coordination state** (which isolation mode the
last execute-phase run used), not durable project history. **Out of scope** for the dashboard — no
value in surfacing a workflow-internal sentinel to a human reviewing project status. `labelore` (fresh
project) does not have a `.gsd/` directory at all yet, confirming it's created lazily on first
execute-phase run, not at project init.

### `~/.gsd/` — global, cross-project runtime home

Confirmed: `~/.gsd/defaults.json` (`{"resolve_model_ids": "omit", "runtime": "codex"}` — global
overrides for model-ID resolution and detected agentic runtime; explicitly stated by `gsd-tools`'s own
warning output to be **lower priority than project config**: *"a project config takes precedence here
— those global keys are ignored for model resolution"*) and `~/.gsd/research-cache/<sha256>.json` (a
global, cross-project research-response cache — same shape/purpose as the per-project
`.planning/research/.cache/`). Neither holds per-project planning state. **Out of scope.**

### `~/.claude/gsd-core/` — the installed runtime itself

Confirmed structure: `VERSION` (plain string, `1.11.0`), `.gsd-runtime` (plain string, `claude` —
identifies which agentic CLI this install targets), `bin/` (the `gsd-tools.cjs` CLI + `lib/` with
~50+ `.cjs` modules — this is genuinely a compiled/bundled runtime, not source-readable prose;
`config-defaults.manifest.json` and `config-schema.manifest.json` under `bin/shared/` are the actual
machine-readable config schema sources, more authoritative than even the `planning-config.md`
reference doc), `contexts/`, `references/` (~100 markdown files — GSD's own internal knowledge base,
consumed by GSD's agents, not project state), `templates/` (the artifact templates this whole
document is grounded in), `workflows/` (~100 markdown files, one per slash command, the actual
orchestration logic).

**Relevance to a dashboard:** `~/.claude/gsd-core/` is shared across ALL GSD projects on this machine
— it is not per-project state, and a dashboard targeting one project by path argument
(`labelore`'s own core requirement) should never need to read it at runtime **except** to resolve
`VERSION` for a "GSD core version" display, and possibly to read `templates/README.md` /
`bin/lib/artifacts.cjs`'s `CANONICAL_EXACT` set once, at build time or cached at startup, to drive the
"known artifact type" lookup table described in the recommended strategy below. **It should never be
treated as per-project data** — a different machine, or a future GSD upgrade, will have a different
`gsd-core`, and the dashboard's `.planning/` parsing must not silently assume today's installed
version's exact behavior is universal (this is exactly the version-evolution risk the next section
covers).

---

## Version Evolution and Compatibility Risk

**`gsd_state_version`** (STATE.md frontmatter): observed value `1.0` / `'1.0'` in both real samples.
The template's own comment says this is *"a placeholder; syncStateFrontmatter overwrites on first
state.* call"* — meaning GSD itself treats this as a live, code-owned version stamp, not a
hand-authored one. **No second value has ever been observed on this machine**, so this research cannot
confirm what a `gsd_state_version: 2.0` STATE.md would look like or whether the schema documented
above is what that version bump would change. Treat `1.0` as "the only version this research covers,"
and treat `gsd_state_version` as the single field a dashboard should log/display prominently and use
to decide whether to attempt the field-level parsing described above at all (fail soft into
generic-markdown rendering if the version is unrecognized).

**Concrete, already-observed evidence of schema drift (this is the important part — not
hypothetical):**

1. **`config.json`'s actual shape vs. the shipped template.** The template
   (`gsd-core/templates/config.json`) is a 9-top-level-key nested document. Both real projects sampled
   have a ~15-top-level-key document with different nesting and additional namespaces
   (`agent_skills`, `plan_review`, `ship`). **The template is stale relative to real output.**
2. **`config.json`'s field reference doc vs. `gsd-tools query state load`'s live output.**
   `references/planning-config.md`'s "Complete Field Reference" documents `workflow.*`'s ~25 keys and
   three search-API booleans (`brave_search`/`firecrawl`/`exa_search`). The live config dump from
   `studio-portal` shows additional real fields not in that reference doc: `workflow.windows_enforce`,
   `workflow.schema_drift_gate`, `workflow.drift_threshold`, `workflow.drift_action`,
   `workflow.plan_drift_precheck`, `workflow.assumption_delta`, and additional top-level search
   toggles (`tavily_search`, `ref_search`, `perplexity`, `jina`). **Even the "authoritative,
   code-generated" reference doc lags the running code.**
3. **`gsd-core/templates/README.md`'s canonical artifact registry vs.
   `gsd-core/bin/lib/artifacts.cjs`'s `CANONICAL_EXACT` set.** The README table is missing
   `WINDOWS.md`, `STATE-ARCHIVE.md`, `milestone.lock` — all three present in the code with explicit
   issue-tracker justification comments (`WINDOWS.md // #3224`). **The code is unambiguously ahead of
   the documentation here**, confirmed by a live, real `WINDOWS.md` file existing in `studio-portal`
   with 10 real ledger entries.
4. **`gsd-core/references/artifact-types.md`** (the reference doc closest to a formal schema
   registry) **also omits WINDOWS.md entirely** and omits several per-phase artifact types this
   research directly observed on disk (`SECURITY.md`, `UI-SPEC.md`, `AI-SPEC.md`, `REVIEW.md`,
   `REVIEW-FIX.md`, per-phase `LEARNINGS.md`, `VERIFICATION.md`, `UI-REVIEW.md`, ad-hoc docs like
   `ROUTE-INVENTORY.md`) — it documents ROADMAP/STATE/REQUIREMENTS/CONTEXT/PLAN/SUMMARY/HANDOFF plus a
   few "Extended" and "Standing Reference" types (DISCUSSION-LOG, USER-PROFILE, SPIKE, sketch,
   WRAP-UP-SUMMARY, METHODOLOGY) but is demonstrably not a complete list of what a real project
   produces.

**What guarantee, if any, exists:** none that this research could find in the form of an explicit
compatibility contract or changelog schema. The strongest available guarantee is structural, not
documented: `artifacts.cjs`'s `CANONICAL_EXACT`/`CANONICAL_PATTERNS` is the literal code path that
GSD's own health-check (`gsd-health` W019) runs, so it cannot itself be stale relative to GSD's own
runtime behavior — **but it can still be, and demonstrably is, ahead of every human-readable doc about
it.** Practically: **read code (`artifacts.cjs`) over docs (`README.md`/`artifact-types.md`) when the
two conflict, and expect both to eventually be behind whatever GSD version is installed when this
dashboard runs.**

<recommended_strategy>

**Recommended strategy for version/evolution risk, concretely:**

1. Treat the parsing rules in this document as **the shape as of GSD core 1.11.0**, valid for
   `gsd_state_version: '1.0'`. Log both version numbers somewhere visible in the dashboard (e.g. a
   footer: "Parsed against GSD core 1.11.0 conventions; target project reports gsd_state_version
   1.0").
2. Build the "known artifact type" registry as **data, not code** — a small JSON/TS map of
   `{filenamePattern → rendererType}` that mirrors `artifacts.cjs`'s two-tier exact/pattern structure,
   sourced by reading `~/.claude/gsd-core/bin/lib/artifacts.cjs`'s `CANONICAL_EXACT`/
   `CANONICAL_PATTERNS` at dashboard startup (or vendoring a snapshot with a documented "last synced
   against gsd-core X.Y.Z" comment) — NOT by hardcoding the file list found in this research document,
   since this document itself may already be slightly behind by the time it's implemented against.
3. For unrecognized filenames (no match in the registry): render generically. Detect YAML frontmatter
   by regex (`^---\n[\s\S]*?\n---\n`) regardless of whether the specific filename is known — an
   unrecognized artifact with frontmatter should still get its frontmatter rendered as a structured
   key-value panel above the markdown body, because the *frontmatter convention itself* (not the
   specific field set) is the reliable, versionstable thing here.
4. Never hard-fail parsing on an unexpected frontmatter field or an artifact type absent from this
   document's tables. Every table above should be read as "confirmed present as of this research," not
   "the closed set."

</recommended_strategy>

---

## Variability Across Projects

Directly confirmed by contrasting `labelore` (fresh, pre-roadmap) against `studio-portal` (mature, 2
milestones, 9 phases, 69 plans):

| Aspect | `labelore` (fresh) | `studio-portal` (mature) |
|---|---|---|
| `ROADMAP.md` | **Absent** | Present, milestone-grouped with `<details>` archive |
| `STATE.md` | Not yet checked directly but implied absent/minimal (no ROADMAP means no phases to track) | Rich, 200+ lines, every optional section populated |
| `REQUIREMENTS.md` | Absent | Present, milestone-scoped, 2nd generation (v2.0, superseding v1.0's archived copy) |
| `MILESTONES.md` | Absent | Present (1 shipped milestone) |
| `RETROSPECTIVE.md` | Absent | Present |
| `phases/` | Absent | 4 directories (current milestone only — v1.0's 4 phases archived under `milestones/v1.0-phases/`) |
| `milestones/` | Absent | Present, full v1.0 archive (ROADMAP, REQUIREMENTS, MILESTONE-AUDIT, 4 archived phase trees × ~10-20 files each) |
| `quick/` | Absent | 5 quick-task directories |
| `research/` | Present (4 files — this research is being written into it) | Present (4 files + large `.cache/`) |
| `ui-reviews/` | Not checked | Present but empty (only `.gitignore`) |
| `HANDOFF.json` | Absent | Present (mid-pause from a prior session) |
| `WINDOWS.md` | Absent | Present, 10 open items |
| `config.json` mode | `"yolo"`, `granularity: "coarse"` | `"interactive"`, `granularity: "standard"` |
| `config.json` `nyquist_validation` | `false` | `true` |
| `config.json` `ai_integration_phase` | `false` | (present as `true` under `workflow.ai_integration_phase`) |
| `.gsd/` (project-local) | Absent | Present (`dispatch-isolation-sentinel.json`) |
| `spikes/`, `sketches/`, `codebase/`, `intel/`, `graphs/`, `threads/`, `BACKLOG.md`, `THREADS.md`, `debug/` | Absent | **Also absent** — confirms these are genuinely optional even in a mature project, not just early-project gaps |

**What this proves concretely:** roughly half of GSD's documented artifact surface
(spikes/sketches/codebase-map/intel/graphs/threads/backlog) is unused even by a real, actively-worked,
9-phase project — these are opt-in features triggered by specific slash commands
(`/gsd-spike`, `/gsd-sketch`, `/gsd-map-codebase`, `/gsd-thread`, `/gsd-add-backlog`) the user simply
never ran. **"Present in the templates/references" is not evidence of "commonly present on disk."** A
dashboard's navigation UI should be built to gracefully collapse/hide entire sections when their
backing directory doesn't exist (not just individual missing files within a section) — confirmed
necessary by this comparison, not merely a defensive nicety.

### Config toggles that suppress whole artifact classes — confirmed mapping

| Config key | Default | When `false`, suppresses |
|---|---|---|
| `workflow.ui_phase` | `true` | `NN-UI-SPEC.md` generation (still only for phases classified as frontend-relevant even when `true`) |
| `workflow.nyquist_validation` | `true` | `NN-VALIDATION.md`'s `nyquist_compliant`/`wave_0_complete` gating is inert; the file may still be created as a stub (confirmed: `labelore` has `nyquist_validation: false` set from project creation — likely reflects a non-UI-heavy/simple project's defaults) |
| `workflow.security_enforcement` | `true` | `NN-SECURITY.md` generation entirely — "When `false`, security checks are skipped entirely" (direct quote, `planning-config.md`) |
| `workflow.ai_integration_phase` | `true` | `NN-AI-SPEC.md` generation (also gated on the phase being an AI-system phase regardless of this toggle) |
| `workflow.code_review` | `true` | Built-in review step in `/gsd-ship` — affects `NN-REVIEW.md`/`NN-REVIEW-FIX.md` presence |
| `workflow.pattern_mapper` (studio-portal's flat form) / pattern-mapper agent gate | `true` | `NN-PATTERNS.md` generation |
| `intel.enabled` | `false` | Entire `.planning/intel/` tree |
| `workflow.windows_enforce` | `false` | `WINDOWS.md` enforcement at `/gsd-ship` time (the file can still exist and accumulate entries even with enforcement off — confirmed: `studio-portal`'s `workflow.windows_enforce` is `false` yet `WINDOWS.md` has 10 real entries, so **presence of WINDOWS.md does not imply the enforcement gate is active** — track these as independent facts) |
| `workflow.research` | `true` | `NN-RESEARCH.md` generation |
| `workflow.skip_discuss` / `discuss_mode` | `false` / `"discuss"` | `NN-CONTEXT.md` and `NN-DISCUSSION-LOG.md` (skipped or replaced by an "assumptions" mode with a different, not-yet-observed shape when `discuss_mode: "assumptions"`) |

**`ui_phase`/`nyquist_validation`/`security_enforcement`/`code_review` are directly named in the
research question, and all four are confirmed real, present, code-enforced gates** — not aspirational
documentation. A dashboard reading a project with these toggles off should not show empty/broken
sections for the corresponding artifact types; it should ideally read `config.json` first and adjust
its own navigation to not even offer a "Security" tab if `security_enforcement` was `false` for that
phase's entire life (though a toggle can change over a project's life, so per-phase presence-check is
still the more robust signal than a single global config read — use config as a hint, file-presence as
the ground truth).

---

## Recommended Data Model for a Visualizer

A pragmatic, layered internal model, informed directly by the findings above:

```
Project
  root: absolute path
  gsdCoreVersionAtParse: string        // this dashboard's own gsd-core version, for the footer note
  config: Record<string, unknown>      // raw config.json OR (preferred) `gsd-tools query state load` output — open map, never typed strictly
  state: {
    frontmatter: Record<string, unknown>   // open map; known fields lifted out, rest passed through
    sections: { heading: string, bodyMarkdown: string }[]
  } | null                              // null in a fresh, pre-roadmap project

  roadmap: RoadmapAnalyzeResult | null  // prefer `gsd-tools query roadmap analyze` verbatim; null if ROADMAP.md absent
  requirements: {
    raw: string                         // full markdown, for prose rendering
    items: { id: string, category: string, text: string, tier: "v1"|"v2"|"future", checked: boolean|null, amendment?: string }[]
    outOfScope: { feature: string, reason: string }[]
    traceability: { requirementId: string, phase: string, status: string }[]
  } | null

  milestones: {
    current: { version: string, name: string, status: "planned"|"in_progress" } | null
    archived: { version: string, name: string, shippedDate: string, archivePath: string }[]  // from MILESTONES.md + milestones/ dir cross-check
  }

  phases: Phase[]           // union of live `phases/` and archived `milestones/vX.Y-phases/`, each tagged with its milestone
  quickTasks: QuickTask[]   // sourced from STATE.md's "Quick Tasks Completed" table, cross-linked to quick/ directories by quickId
  windowsLedger: WindowsEntry[] | null

  tree: FsNode               // full recursive listing of .planning/, used for the navigable browser + search index
                              // every node tagged: { knownArtifactType: string | null, hasFrontmatter: boolean }
```

```
Phase
  identity: { milestoneVersion: string | null, number: string, projectCode: string | null, slug: string }  // NEVER just `number` alone
  dirPath: string
  archived: boolean          // true if under milestones/vX.Y-phases/
  roadmapEntry: {            // from ROADMAP.md / roadmap analyze — the FORMAL record
    goal, dependsOn, requirements: string[], successCriteria: string[], planCount, roadmapComplete: boolean
  } | null
  diskStatus: "no_directory" | "researched" | "complete" | string   // from roadmap analyze, open string — new values may appear
  artifacts: {                // presence-keyed map, not a fixed struct — iterate what's actually on disk
    [artifactType: string]: { path: string, frontmatter?: Record<string, unknown> }
  }
  plans: { id: string, planPath: string, summaryPath: string | null, frontmatter: {...}, summaryFrontmatter?: {...} }[]
```

**Key modeling decisions this schema encodes, each traceable to a finding above:**

- `identity` is a compound key, never a bare phase number — required by `phase_numbering:
  restarts-per-milestone` (confirmed real behavior in studio-portal).
- `roadmapComplete` (from ROADMAP.md checkbox state) and `diskStatus` (from actual file presence) are
  kept as **two separate fields**, never merged — the observed Phase-1 discrepancy in studio-portal
  proves they can legitimately disagree and that disagreement is itself meaningful signal for a
  situational-awareness dashboard.
- `artifacts` is a map keyed by discovered filename-derived type, not a fixed set of named optional
  fields — required by the confirmed unbounded, ad-hoc artifact-naming freedom (`ROUTE-INVENTORY.md`).
- `config` and `state.frontmatter` are open maps (`Record<string, unknown>`) everywhere, never closed
  interfaces — required by the confirmed, repeated evidence of schema drift ahead of every static
  reference doc.
- `tree` (the raw filesystem walk) is modeled as the source of truth for "does this exist," with
  everything else as a derived/parsed view on top — because presence-on-disk, not any document's
  registry, is what determines what's real in a given project.

<recommended_parsing_strategy>

**Recommended parsing strategy, in priority order:**

1. **Walk the filesystem first**, always. Build `tree` unconditionally — this never fails and is the
   only thing that must never be wrong.
2. **Shell out to `gsd-tools query`** for the specific facts it's confirmed to expose well:
   `roadmap analyze` (phase list + progress), `progress` (lightweight progress digest), `stats`
   (project-wide counters), `state load` (effective, fully-resolved config — prefer this over reading
   `config.json` directly, since it applies migrations/aliases GSD itself relies on). Cache by
   `.planning/`'s aggregate mtime; invalidate on file change (or on explicit refresh, per the v1
   read-on-load-and-refresh constraint already decided in `PROJECT.md`).
3. **Parse frontmatter generically** on every file the tree walk finds, regardless of recognized type —
   a leading `---\n...\n---\n` block is YAML, parse it into an open map, always.
4. **Parse markdown structurally only for known, template-backed types** (ROADMAP.md, REQUIREMENTS.md,
   PROJECT.md, CONTEXT.md's 6 tags, PLAN.md's task tags) using the regexes and section grammars
   documented above — and fall back to **rendering the raw markdown** (with frontmatter shown as a
   panel, if present) for everything else, including any artifact type this document didn't enumerate.
5. **Never let an unrecognized file, an unrecognized frontmatter field, or an unrecognized
   `disk_status`/`status` enum value throw** — every enum observed above (`disk_status`, `status`
   fields across VALIDATION/SECURITY/UAT/VERIFICATION/SUMMARY) should be typed as an open string with
   a small set of "known, specially-styled" values and a generic fallback style for anything else.

</recommended_parsing_strategy>

---

## What NOT to Depend On

Explicit, consolidated list of things confirmed unreliable or unsafe to hardcode against:

- **`gsd-core/templates/config.json`** as a schema source — confirmed stale relative to both real
  projects sampled. Use `references/planning-config.md`'s field reference as a starting point, but
  prefer `gsd-tools query state load`'s live output as ground truth, since even the reference doc is
  confirmed behind real running config.
- **`gsd-core/templates/README.md`**'s artifact registry table as a completeness source — confirmed
  missing `WINDOWS.md`, `STATE-ARCHIVE.md`, `milestone.lock`. Use `gsd-core/bin/lib/artifacts.cjs`'s
  `CANONICAL_EXACT`/`CANONICAL_PATTERNS` instead.
- **`gsd-core/references/artifact-types.md`** as a complete artifact-type catalog — confirmed to omit
  several artifact types this research directly observed on disk in a real project (SECURITY.md,
  UI-SPEC.md, AI-SPEC.md, REVIEW.md, REVIEW-FIX.md, per-phase LEARNINGS.md, VERIFICATION.md,
  UI-REVIEW.md, WINDOWS.md, and unbounded ad-hoc docs).
- **Phase number alone as a unique key** — invalid whenever `phase_numbering: restarts-per-milestone`
  is set (confirmed real, active config in studio-portal). Always pair with milestone version and
  archived/live status.
- **`D-NN` as a globally-unique or even certainly phase-scoped ID** — evidence points to
  milestone-scoped numbering (a single counter spanning that milestone's phases), not confirmed
  beyond doubt, and NOT the same namespace as `SUMMARY.md`'s `coverage[].id` (`D1`, `D2`, no hyphen).
- **STATE.md's "Decisions" bullets as ID-linked to CONTEXT.md's `D-NN` entries** — confirmed to be
  free prose with an inconsistently-substituted `[Phase N]:`/`[Phase ?]:` prefix, not a structural
  link. Any UI implying a precise decision cross-reference here would be fabricating a connection GSD
  itself did not make.
- **ROADMAP.md's ASCII "Dependency shape" diagrams** as a machine-parseable graph — confirmed free-form
  art, not a schema. Render verbatim as preformatted text; do not attempt structural extraction.
- **`roadmapComplete` as equivalent to "actually done"** — confirmed to legitimately lag actual
  execution completeness (studio-portal Phase 1: fully executed, unchecked in ROADMAP.md). Surface
  both signals.
- **Any single frontmatter field set (STATE.md's, SUMMARY.md's, etc.) as closed/exhaustive** — every
  sampled real file has fields beyond its shipped template. Treat every frontmatter block as an open
  map with a known-subset overlay, never a strict interface.
- **The presence of a directory (`spikes/`, `sketches/`, `codebase/`, `intel/`, `graphs/`,
  `threads/`) as evidence it will be present in most projects** — confirmed absent in a mature,
  actively-developed 9-phase project. Treat every one of these as fully optional, independently of
  project maturity.
- **`.gsd/` and `~/.gsd/` contents as project history** — confirmed to be transient runtime
  coordination state and cross-project caches/overrides, respectively. Not planning history; do not
  surface in a "project state" view.
- **skills/agents/hooks as data sources** — confirmed to hold zero per-project state; they are Claude
  Code session machinery, entirely out of this dashboard's domain.

---

## Open Questions

- **What does a `gsd_state_version` bump actually change?** Only version `1.0`/`'1.0'` was observed on
  this machine (one installed GSD core version, two projects both created under it). The schema
  documented here is confirmed for `gsd_state_version: '1.0'` under GSD core 1.11.0 only. Cannot verify
  forward-compatibility mechanics beyond the general graceful-degradation recommendation above.
- **What does `discuss_mode: "assumptions"` produce instead of CONTEXT.md/DISCUSSION-LOG.md?** Named in
  `planning-config.md` as an alternative to the default `"discuss"` mode ("analyzes codebase and
  surfaces assumptions instead") but no real example was found in either sampled project (both use the
  default). The resulting artifact shape is unconfirmed.
- **Exact subcommand arguments/output shape for `gsd-tools query phase list-plans`, `phases list`,
  `windows` (its own subcommand list wasn't printed — only inferred from prose), `verification status`,
  `uat classify-coverage`, `intel query/status`, `graphify query/status`, `workstream list/status`** —
  identified as plausibly useful but not individually invoked with real arguments in this research
  pass; worth a focused CLI-exploration spike during the implementation phase, ideally against a
  project that actually uses workstreams/intel/graphs (none available on this machine).
- **What does `AI-SPEC.md`'s full shape look like once populated for a real AI-integration phase?**
  Neither sampled project has an AI-integration phase; only the template's fill-in-the-blank shape was
  read, no real example.
- **Does a phase directory ever legitimately contain a `.continue-here.md` file in practice?** Named in
  `artifact-types.md` as the markdown counterpart to `HANDOFF.json`, but not observed in either
  sample (studio-portal's pause state was captured entirely in root-level `HANDOFF.json`; no
  phase-level `.continue-here.md` was found alongside it). Possibly used only for spike/deliberation
  pauses per the reference doc's own parenthetical ("or spike/deliberation path") — unconfirmed.
- **Precisely how `ui-reviews/` is populated when used** — only its empty, `.gitignore`-only shape was
  observed. Screenshot/binary content is implied but not confirmed in structure or naming.

---

## Sources

All claims are grounded in files read directly on this machine during this research session. No web
sources were used — the task was explicitly scoped as primary-source, on-disk research, and everything
needed was available locally.

**Template/reference corpus (`~/.claude/gsd-core/`, version 1.11.0):**
- `VERSION`, `.gsd-runtime`
- `templates/README.md`, `templates/config.json`, `templates/state.md`, `templates/roadmap.md`,
  `templates/requirements.md`, `templates/project.md`, `templates/context.md`, `templates/summary.md`,
  `templates/phase-prompt.md`, `templates/VALIDATION.md`, `templates/SECURITY.md`, `templates/UAT.md`,
  `templates/UI-SPEC.md`, `templates/AI-SPEC.md`, `templates/verification-report.md`,
  `templates/discussion-log.md`, `templates/milestone.md`, `templates/milestone-archive.md`,
  `templates/research.md`, `templates/codebase/` (listing), `templates/research-project/` (listing)
- `references/artifact-types.md`, `references/planning-config.md`
- `bin/lib/artifacts.cjs`, `bin/lib/phase-id.cjs`, `bin/lib/phase.cjs`, `bin/lib/core-utils.cjs`,
  `bin/lib/init.cjs`, `bin/shared/config-defaults.manifest.json`,
  `bin/shared/config-schema.manifest.json`
- `workflows/add-phase.md`, `workflows/extract-learnings.md`, `workflows/code-review.md`
- `agents/gsd-pattern-mapper.md` (at `~/.claude/agents/`)
- `gsd-tools.cjs query --help`, `query roadmap analyze`, `query progress`, `query stats`,
  `query state load`, `query roadmap`/`requirements`/`phase`/`phases`/`graphify`/`intel`/
  `workstream`/`milestone`/`verification`/`uat` (subcommand enumeration via error output)

**Observed corpus:**
- `~/labelore/.planning/PROJECT.md`, `~/labelore/.planning/config.json`,
  `~/labelore/.planning/` directory listing
- `~/studio-portal/.planning/` — full directory listing plus direct reads of: `STATE.md`,
  `HANDOFF.json`, `estimation-calibration.json`, `config.json`, `ROADMAP.md`, `REQUIREMENTS.md`,
  `WINDOWS.md`, `phases/01-portal-owned-identity-sessions/` through `phases/04-.../` (listings),
  `milestones/` (listing), `quick/` (listing)
- `~/studio-portal/.gsd/dispatch-isolation-sentinel.json`
- `~/.gsd/defaults.json`, `~/.gsd/research-cache/` (listing)
- `~/.claude/settings.json` (hooks configuration)
- `~/.claude/skills/` (listing, 73 entries), `~/.claude/agents/` (listing, 32 entries)

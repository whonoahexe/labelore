# Phase 1: Read Layer & Domain Model - Context

**Gathered:** 2026-08-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Any GSD project on disk becomes a complete, inspectable in-memory snapshot — assembled behind a
filesystem interface that already admits multi-project targeting, a watcher, and eventual write-back —
and proven correct without a browser.

This phase produces **no UI**. Its entire deliverable surface is: a filesystem abstraction, a discovery
and parsing pipeline, a resolved domain graph, a set of test fixtures, and a non-UI harness that dumps
and asserts the result. Requirements in scope: TGT-01, TGT-02, DATA-01 through DATA-06, NAV-07.

Explicitly **not** this phase: rendering, routing, theming, markdown-to-HTML, the search index, the
prose linkifier's UI half. Phase 1 builds the mention index (NAV-07); Phase 2 turns mentions into links.

</domain>

<decisions>
## Implementation Decisions

### Test Fixtures (DATA-06)

- **D-01:** The dense fixture is **hand-authored synthetic**, with its shape derived from
  `~/.claude/gsd-core/templates/` rather than from `~/studio-portal`. Every "assume field/directory X
  exists" claim in the parser must be traceable to a template line, not to what happens to be on disk
  in the reference project. It deliberately carries artifact types studio-portal has never produced
  (`AI-SPEC.md`, `SPEC.md`, at least one invented future doc type) and a **third milestone**, so
  multi-milestone logic is not tested only at N=2.
  — **Reversibility:** costly — the fixtures become Phase 4's adversarial substrate (Phase 4 SC1 names
  them directly). Reshaping them later invalidates every golden file and every Phase 4 degradation
  claim built on top of them.

- **D-02:** **Deliberately corrupted files live inside the dense fixture**, among healthy ones — a
  tab-broken YAML block in one `PLAN.md`, a trailing comma in a `HANDOFF.json`, a file with frontmatter
  and no body. Rationale: Success Criterion 3's actual claim is *"degrades to its raw body plus a
  recorded warning while every other file parses cleanly"* — isolation is only meaningfully proven when
  there is a healthy majority surrounding the broken file. Consequence the planner must account for:
  the dense fixture's golden snapshot **permanently contains warnings**, so "zero warnings" can never
  be an assertion against it.

- **D-03:** **Two sparse variants, not one.** The roadmap describes the sparse fixture inconsistently —
  Phase 1 SC2 says *"fresh project, no `ROADMAP.md`, no `phases/`"* while Phase 4 SC1 says *"one phase,
  no milestones"*. These are different trees exercising different code paths. Build both:
  - `sparse-empty/` — `PROJECT.md` + `REQUIREMENTS.md` + earliest-shape `STATE.md`. No `ROADMAP.md`,
    no `phases/`. Proves the parser survives with nothing to parse and a null milestone.
  - `sparse-started/` — one phase, a `ROADMAP.md`, no `milestones/`. Proves it survives with structure
    but no history — the common shape of any real project's first weeks.

  Fixture count for the phase is therefore **three trees** (two sparse + one dense), which extends
  DATA-06's literal "two synthetic test fixtures" wording. Flag this to the roadmap rather than
  silently satisfying the letter of DATA-06 with the wrong trees.

- **D-04:** `~/studio-portal` is a **manual smoke target only** — zero committed assertions against it.
  The machine-checked contract is entirely fixture-derived, so no assertion can quietly encode a
  studio-portal-ism. You point the harness at it by hand when you want to see real output.
  Accepted trade-off: a regression that only manifests at real-world scale or messiness will not be
  caught automatically.

### Verification Harness (DATA-05, TGT-01, TGT-02)

- **D-05:** The harness is **a CLI plus a golden-file test suite sharing exactly one entry point**.
  The CLI (`npm run snapshot -- <path>` or equivalent) prints snapshot JSON to stdout; a Vitest suite
  invokes the same code path against each fixture and diffs against a committed golden file. Sharing
  the entry point is the point — the tested path cannot diverge from the runnable one.

- **D-06:** **Artifact bodies are omitted from the dump by default**, behind a flag that includes them.
  The default output carries structure, frontmatter, resolved cross-references, warnings, and a body
  **length plus hash**. Golden diffs stay readable so structural regressions are visible rather than
  buried in megabytes of prose; the hash still catches silent truncation or mangling. The flag exists
  specifically because Success Criterion 3 requires proving a corrupted file *"degrades to its raw
  body"* — that claim must remain checkable through the harness.

- **D-07:** **One normalizing serializer owns every machine-varying value.** Absolute paths become
  project-root-relative; `mtimeMs` becomes a stable placeholder under a `--stable` flag that the golden
  tests always pass. The raw CLI dump keeps real values so genuine mtimes are visible when smoke-testing.
  Any volatile field added later gets fixed in this one function.
  — **Reversibility:** reversible — but note the failure mode it prevents is total: without it, every
  committed golden fails immediately and permanently on any fresh `git clone`.

- **D-08:** Success Criterion 4 ("swapping the filesystem implementation requires no change downstream")
  is proven by **writing a second `PlanningFilesystem` backed by an in-memory `path → content` map**
  and running the same golden tests through it from the same fixture trees. Byte-identical snapshots
  from either implementation prove the seam by construction rather than by inspection. Secondary
  benefits the planner should exploit: fixture tests get fast, and hostile cases that are awkward to
  commit to git (permission-denied, unreadable file) become authorable.
  — **Reversibility:** reversible — additive; it validates the DATA-01 interface rather than shaping it.

### Degradation & Warnings

- **D-09:** Warnings live in **both places**: a flat `snapshot.warnings[]` for project-wide views and
  the harness, and a reference on each affected artifact so "this page's data is degraded" is
  renderable without scanning the whole list. Both must be populated from **one source** during
  assembly, not built independently, or they will drift.

- **D-10:** **Unresolvable cross-references are NOT warnings.** They are modeled as
  `{ raw, resolved: null }` on the graph and stay out of the warning channel entirely.
  `ARCHITECTURE.md` is explicit that *"dangling references are expected, not exceptional"* — GSD prose
  mentions undefined IDs routinely, and `STATE.md` in this very project contains literal `[Phase ?]:`
  placeholders. Routing them into warnings would bury the handful of real parse failures under hundreds
  of routine unresolved mentions and would make the harness's warning count meaningless.
  Criterion 5's *"present and explicitly marked rather than silently dropped"* is satisfied by the
  `resolved: null` itself. Accepted trade-off: a typo'd requirement ID is indistinguishable from a
  deliberately-unlinked mention.
  — **Reversibility:** costly — this shapes what every downstream consumer treats as an error signal
  versus normal data. Reclassifying later touches the graph type, the warning channel, and Phase 4's
  degradation views.

- **D-11:** A warning record carries **four fields: path, stage, message, salvage**.
  - `stage` is which pipeline step failed: `read` / `frontmatter` / `structured-extraction` / `assembly`.
  - `salvage` is what survived — e.g. `body intact, frontmatter unavailable` versus `nothing readable`.

  The `stage` field is what makes PITFALLS #4's independence real: frontmatter failure and body failure
  are separate stages, so "frontmatter died but the body renders" is expressible instead of collapsing
  into one generic "this file is broken". Phase 4's honest empty states read directly off `stage` and
  `salvage` — do not force consumers to pattern-match on message text.

- **D-12:** **`load()` never throws.** When the target is not a GSD project, the read layer still
  resolves — to a snapshot carrying a `loadStatus` field (`ok` / `not-a-gsd-project` / `path-not-found`
  / `permission-denied`) **plus the exact path that was checked**. This is the one case
  `ARCHITECTURE.md` carves out of "always produces a snapshot", and it is resolved here in favor of one
  uniform shape: every consumer handles one type, Phase 4's error screens (TGT-07) are just another
  render of the same object, and a future multi-project switcher can hold a failed project alongside
  good ones without special-casing. Accepted trade-off: consumers must check the status rather than
  being forced to by an exception.
  — **Reversibility:** costly — the return contract of the read layer's single entry point. Changing it
  later touches the CLI, the harness, every route, and Phase 4's error handling.

### ID Scanning & Cross-References (NAV-07, SC5)

- **D-13:** The prose scanner recognizes **four ID schemes** — requirement IDs
  (`[A-Z][A-Z0-9]*-\d{2,}`), phase references, plan IDs (`NN-MM`), and decision IDs (`D-NN`). This is
  exactly the set NAV-02, NAV-03, and NAV-07 consume. Everything else in `GSD-DOMAIN.md`'s nine-scheme
  inventory (threat IDs, wave numbers, windows-ledger integers) is recorded **only where it is already
  structured data in frontmatter**, never scanned out of prose — the excluded schemes are precisely the
  ones with no distinctive shape, where a bare integer would match any number in any document.

- **D-14:** The `D-05`-versus-`D1` collision is resolved by **resolving each ID within the context of
  the artifact type it was found in**, per `GSD-DOMAIN.md`'s explicit instruction: *"never as a single
  global namespace."* A `D`-prefixed token inside a `SUMMARY.md` coverage block is a deliverable; the
  same token in a `CONTEXT.md` decisions section is a decision.
  **Structural consequence the planner must honor:** the scanner is therefore **not** a context-free
  regex pass over raw text. It needs the artifact's resolved kind, so it runs **after handler dispatch**,
  not alongside discovery.

- **D-15:** The scanner **skips both fenced code blocks and inline code spans**. This corpus is dense
  with code that trips a requirement-ID pattern — constants, hyphenated identifiers, CSS tokens, branch
  names like `feat/AUTH-02`. Prose mentions are what NAV-02/03 are about, and a link injected into a
  rendered code block would look broken regardless. Accepted, known cost: GSD authors quote IDs in
  backticks constantly (`` `AUTH-01` ``), so legitimate references written that way are missed. If this
  proves too lossy in practice, the narrower relaxation is to scan inline spans while still skipping
  fences — do not revisit by scanning everything.

- **D-16:** Each mention record carries **artifact ref, position (line/offset), and a surrounding
  excerpt** — not just `id → artifact[]`. `ARCHITECTURE.md` asks for exactly this shape: *"a page can
  show 'D-05, mentioned in 3 places' with excerpts, not a fabricated canonical record."* The position
  is what lets Phase 2 deep-link to the right spot (READ-06) and saves Phase 3's snippet UX from
  recomputing it. Capturing it now avoids what `ARCHITECTURE.md` calls *"eager resolution with extra
  failure modes, not less work"*. Note for D-07: positions must survive the normalizing serializer
  into goldens.

### Claude's Discretion

Two gray areas were identified and deliberately left open for the researcher and planner rather than
being locked here:

- **Structured-extraction depth.** How deep the typed handlers parse in Phase 1 versus what waits for
  Phase 2 — e.g. whether the ROADMAP handler extracts phase blocks (goal, success criteria, mapped
  requirements, wave grouping, the `**Depends on**:` line) in this phase, and whether the ASCII
  dependency diagram is parsed or carried through as opaque body text. The roadmap's Criteria 2 and 5
  require *complete* snapshots with *resolved* cross-references, which puts extraction in Phase 1; the
  per-document-type depth is the planner's call. This is the decision most likely to shape how the
  phase's two plans get split.
- **Path targeting mechanics (TGT-01/TGT-02).** Env var name versus positional argument, whether
  pointing at `.planning/` itself works as well as the project root, symlink containment policy (allow
  a symlink whose target escapes the resolved root, or reject it), and the exact wording of startup
  failure messages. PITFALLS #9 supplies the constraints: canonicalize once at startup via a
  `realpath` equivalent and use the resolved path everywhere downstream; never mix relative and
  resolved paths; fail fast and distinctly per failure mode. The `loadStatus` values in D-12 are the
  agreed output shape for these failures.

Both are genuinely open — the planner should decide them and record the outcome, not treat their
absence here as an oversight.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` §"Phase 1: Read Layer & Domain Model" — goal, the five success criteria,
  mapped requirements, and the "2 plans" sizing. Note the sparse-fixture contradiction against Phase 4
  SC1, resolved by D-03.
- `.planning/REQUIREMENTS.md` — TGT-01, TGT-02 (lines 16–17), NAV-07 (line 64), DATA-01 through
  DATA-06 (lines 93–98). Also see BACK-02 (line 107) for what NAV-07's index feeds in v2.
- `.planning/PROJECT.md` §Constraints — the read-only constraint, the clone-and-run deployment shape,
  and the three forward-compatibility obligations (multi-project, watcher, write-back).
- `.planning/STATE.md` §"Blockers/Concerns" — carries the standing warning that thin Phase 1 fixtures
  block Phase 4's TGT-03/TGT-05 proof. D-01 through D-04 are the response to it.

### Architecture — the design this phase implements
- `.planning/research/ARCHITECTURE.md` — **the primary implementation reference for this phase.**
  Specifically: §"Pattern 1" (the capability-flagged `PlanningFilesystem` contract, with the v1
  interface written out), §"Pattern 2" (the handler registry and why filename-pattern dispatch beats
  frontmatter-shape dispatch — with the evidence from studio-portal's real corpus), §"Pattern 3"
  (snapshot + single `refresh()` seam, with the `PlanningRepository` skeleton), §"Domain Model" (entity
  list, the `(milestoneId, phaseNumber)` identity rule, why resolution is eager, and the dangling-ref
  rule behind D-10), §"Recommended Project Structure" (the `planning-fs/` / `planning-repo/` / `domain/`
  layout), §"Error and Degradation Strategy" (the per-failure-mode table behind D-11 and D-12), and
  §"Forward-Compatibility Seams".
- `.planning/research/ARCHITECTURE.md` §"Anti-Patterns" — three named anti-patterns, all of which apply
  directly to this phase: UI/routes reading the filesystem or importing handlers; per-view special-casing
  of unknown artifact types; per-route caching layered on top of the snapshot.

### Domain contract — what GSD actually produces
- `.planning/research/GSD-DOMAIN.md` — the ground truth for parsing. Specifically:
  §"The `.planning/` File Inventory" (what exists at root, in `phases/NN-slug/`, `quick/<timestamp-slug>/`,
  `milestones/`, `research/`, `ui-reviews/`), §"Naming Conventions and Parsing Rules" (phase directory
  naming, slug generation, plan/artifact file naming, quick-task naming, milestone archive naming, and
  how `phase_naming`/`phase_numbering` config affects all of it), §"Structured Data Schemas"
  (`STATE.md` frontmatter, the `config.json` key inventory, `HANDOFF.json`,
  `estimation-calibration.json`, `WINDOWS.md`, and the full confirmed per-artifact frontmatter set),
  §"Markdown Conventions per Artifact Type", and §"Cross-Reference and ID Conventions" — **the
  nine-scheme ID table and the `D-NN` versus `D1` collision warning are the direct basis for D-13 and
  D-14.**
- `.planning/research/GSD-DOMAIN.md` §"Version Evolution and Compatibility Risk", §"Variability Across
  Projects", §"Recommended Data Model for a Visualizer", and §"What NOT to Depend On" — read before
  writing any handler.

### Pitfalls — the failure modes this phase must design against
- `.planning/research/PITFALLS.md` #1 "Building the parser against studio-portal's shape, not GSD's
  contract" — highest-severity risk in the project; the two-fixture strategy in D-01–D-04 is its
  mitigation, and its "Warning signs" list is a usable review checklist.
- `.planning/research/PITFALLS.md` #3 "Treating markdown structure as a queryable data source" — the
  structured-facts-versus-rendered-prose boundary. Progress and status come only from `STATE.md`
  frontmatter, `config.json`, and `ROADMAP.md`'s own checkbox syntax; never recount prose checkboxes.
- `.planning/research/PITFALLS.md` #4 "Frontmatter/JSON errors crash the whole page instead of
  degrading" — per-file isolation, and the frontmatter/body independence that D-11's `stage` field
  encodes.
- `.planning/research/PITFALLS.md` #9 "Local-tool ergonomics" — path canonicalization, symlinks,
  permissions, and cache-key correctness; the constraint set for the open path-targeting question.
- `.planning/research/PITFALLS.md` §"Pitfall-to-Phase Mapping" and §"'Looks Done But Isn't' Checklist"
  — the last is a ready-made verification list; rows 1, 2, 5, 7, 8 and 10 are Phase 1's.

### Stack
- `.claude/CLAUDE.md` §"Technology Stack" — the resolved stack. Phase 1 touches only the Node/TypeScript
  half: TypeScript 7.0.2 (with the documented `typescript@^5` fallback if tooling lags), `gray-matter`
  4.0.3 **always wrapped in try/catch — never called unguarded**, and `vitest` 4.1.11. The markdown
  pipeline (`unified`/`remark`/`rehype`/`shiki`), `minisearch`, Vite, React, Hono and `react-router`
  are all Phase 2 and later — do not pull them in here.
- `.planning/research/STACK.md` — the reasoning behind those picks.

### External (outside this repo — read-only reference)
- `~/.claude/gsd-core/templates/` — **the contract the parser is written against.** Per D-01 and
  PITFALLS #1, every "field X exists" assumption must be traceable to a line here.
- `~/studio-portal/.planning/` — the real reference corpus. Manual smoke target only per D-04; no
  committed assertions may depend on it.

</canonical_refs>

<code_context>
## Existing Code Insights

**The repository is greenfield.** It contains only `.planning/`, `.claude/`, and `.git`. There is no
`package.json`, no `src/`, no build tooling, no test setup. Every file this phase produces is new.

### Reusable Assets
None — nothing exists to reuse. The nearest thing to an asset is `~/studio-portal`'s frontend, which is
a **theme source for Phase 2 only** and is explicitly forbidden as a code or runtime dependency
(`PROJECT.md` Constraints: "No runtime, code, or data dependency on studio-portal").

### Established Patterns
None in code. The patterns this phase must follow come from `ARCHITECTURE.md` rather than from an
existing codebase — and because Phase 1 is first, the conventions it establishes become the project's
patterns. `.claude/CLAUDE.md` §Conventions is currently empty and should be populated from what this
phase settles.

### Integration Points
Phase 1 has no upstream code to integrate with. Its **downstream** contracts are what matter, and all
three are named in the roadmap as things later phases must not have to restructure:
- `ProjectSnapshot` — consumed by Phase 2's routes and view models.
- `PlanningRepository.refresh()` — the seam Phase 4's Refresh action (TGT-08) and a v2 file watcher
  both call.
- The parsed-artifact set — the corpus Phase 3's search index (FIND-01, built from **source** markdown,
  not rendered output) is constructed from.

Bootstrap work (package.json, tsconfig, vitest config, lint setup) falls inside this phase because
nothing precedes it. The planner should account for that setup cost explicitly rather than assuming a
scaffold exists.

</code_context>

<specifics>
## Specific Ideas

- **Traceability as a build rule, not a review note.** Per D-01, the standard is that any assumption
  about a field or directory existing should be traceable to a `gsd-core` template line rather than to
  studio-portal. PITFALLS #1 states this as the concrete mechanism for the project's highest-severity
  risk.

- **The dense fixture should stress N>2.** A third milestone specifically, so multi-milestone handling
  is not validated only at the one shape studio-portal happens to have. Likewise archived phase trees
  under `milestones/vX.Y-phases/` colliding by number with active `phases/NN-slug` — the exact case
  `GSD-DOMAIN.md` and PITFALLS both flag.

- **Warnings are for parse failures; nulls are for expected absence.** D-10 and D-11 together are one
  idea: the warning channel must stay small enough that a non-empty warning list is meaningful. Anything
  routine — an unresolved ID, a missing optional artifact — is normal-path data, not a warning.

- **Prove the seam, don't assert it.** D-08's in-memory filesystem exists because "we kept the layers
  clean" is not evidence. Two implementations producing byte-identical snapshots is.

</specifics>

<deferred>
## Deferred Ideas

- **A third, purely-hostile fixture** (permission-denied files, an empty `.planning/`, a directory that
  is not a GSD project at all). Considered and set aside for Phase 1 — D-02 puts corruption inside the
  dense fixture instead. These hostile cases are cheaply authorable through D-08's in-memory
  filesystem when Phase 4 needs them for TGT-07, without committing awkward files to git.

- **A `--summary` digest mode on the harness CLI** — counts by artifact kind, a milestone/phase/plan
  tree outline, the warning list, the unresolved-reference list. Genuinely useful against a full
  studio-portal snapshot, which is a very large blob. Not built in Phase 1; revisit if reading raw JSON
  becomes the bottleneck.

- **An unresolved-reference rollup count on the snapshot** ("47 dangling requirement IDs"). Compatible
  with D-10 and cheap, but not needed to satisfy Criterion 5. Natural fit for Phase 4's project-health
  surface.

- **An ESLint rule forbidding `node:fs` imports outside `src/planning-fs/`.** Considered alongside D-08
  and not chosen, since the in-memory implementation proves the seam more strongly than a lint rule
  prevents violating it. Worth adding later as cheap ongoing enforcement once the layout is settled.

- **Capturing the underlying caught error (message/stack) on warning records.** Useful for debugging
  unanticipated fixture failures, but stack traces are machine-varying and would become one more thing
  D-07's normalizing serializer must strip. Add only if diagnosing warnings proves painful.

- **Scanning inline code spans for ID mentions.** Explicitly the fallback if D-15 proves too lossy —
  GSD authors do quote IDs in backticks. The relaxation to try is inline-spans-yes / fenced-blocks-no,
  never "scan everything".

</deferred>

---

*Phase: 1-Read Layer & Domain Model*
*Context gathered: 2026-08-21*

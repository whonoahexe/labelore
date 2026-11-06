# Phase 11: Exploration, Handoff, Report and Workstream Pages - Context

**Gathered:** 2026-11-06
**Status:** Ready for planning (real-shape generation, made-up examples and the frame sketches come first, see D-14..D-16)

<domain>
## Phase Boundary

The files GSD leaves while exploring and pausing (spikes, seeds, threads, the pause-and-resume
handoff), its rarer outputs (session reports, milestone summaries, forensics reports, onboarding
summaries, the intel and graph indexes) and its workstreams open into designed pages. Requirements
VIEW-14, VIEW-15, VIEW-16, VIEW-17, VIEW-18, VIEW-19, VIEW-20. Workstreams are built last within the
phase so they can be cut without disturbing the rest.

All of these file kinds are already recognised by `src/planning-repo/folders.ts` (`spike*`, `seed`,
`thread`, `report`, `forensics`, `onboarding`, `intel`, `graph`, `handoff`, `continue-here`);
`workstreams/` is a reserved folder with `kindOf: unknownKind` that this phase owns.

Not in this phase: `config.json` settings page and Source mode (Phase 12), search and the palette
(Phase 13), root extras such as STATE-ARCHIVE or INGEST-CONFLICTS (research Family 2, deferred), a
dashboard "Paused" mark (D-06).

</domain>

<decisions>
## Implementation Decisions

### Page grouping
- **D-01:** **One Spikes page** in the frame + panel model of Research and Codebase (sketches
  031/042): the manifest's verdict board grouped by idea (validated, invalidated, partial, pending)
  leads, and each spike README, `CONVENTIONS.md` and `WRAP-UP-SUMMARY.md` is a panel with its own URL
  (`/<project>/spikes/<NNN-name>`, Phase 7 scheme) that opens the page on that panel. Spike scripts and
  output files are listed by name only, never run or rendered (success criterion 1). Real verdicts
  carry free text after the keyword (`INVALIDATED (no spare Studio seat)`, `PARTIAL (Resolve relink
  untested)`); the keyword groups, the text is kept.
- **D-02:** **Seeds and threads each open their own page**, no board: a seed leads with the idea,
  when it should surface, its scope, and where and when it was planted; a thread with its status and
  next steps first. The drawer already lists them.
- **D-03:** **Each report type gets its own page**: session report (headline numbers: duration,
  commits, plans; key outcomes; open blockers), forensics (root-cause hypothesis and recommended
  actions first), onboarding summary (recommended next command first, copyable, never run). The
  session report and milestone summary may share one frame if their sketch shows they fit.
- **D-04:** **One Indexes page** for intel and graphs: a panel per intel file (`stack`, `file-roles`,
  `api-map`, `dependency-graph`, `arch-decisions`, and `SYNTHESIS` where ingest-docs wrote it) plus
  the graph panel (node and edge counts, last build status and age from `.last-build-status.json`, at
  most a short top list). The server builds and serves a **bounded summary only**; the raw JSON is
  never sent to the page or copied whole into the index, however large the file (success criterion
  3; research A.13: `JsonConfigHandler` today copies the whole object into `frontmatter` and `body`).

### Paused work
- **D-05:** `HANDOFF.json` and `.continue-here.md` are written together by `/gsd-pause-work`. Whether
  they share one pause page or get two linked pages is **left to the sketch** (Claude's discretion).
  Either way the page shows where work stopped (task N of M), the single next action, human actions
  pending with blocking ones first, what is left, and the long context notes folded (success
  criterion 2). Where the two files disagree (e.g. a different task number), both values show,
  never merged (project rule).
- **D-06:** **The pause appears only on its own page**, reachable from the drawer and search. The
  dashboard gets **no** "Paused" mark (the research suggestion is declined).
- **D-07:** A **nested `.continue-here.md`** (in a phase folder, spike folder, `sketches/` or
  `deliberations/`) opens the **same pause layout, headed with its context** ("Paused in phase 2",
  "Paused in spike 001b", from the file's `context` frontmatter and location), and its phase or
  spike page carries a small link to it.
- **D-08:** The page always shows the pause's **date and age** ("paused <date>, N days ago"). When the
  phase or plan it names is already complete by STATE/ROADMAP, a quiet **"work has moved on since"**
  note sits beside it, separate from the handoff's own fields. GSD deletes these files on resume, so
  a surviving old one is a real case.

### Workstreams
- **D-09:** GSD's layout (`gsd-core/bin/lib/workstream.cjs`): `ROADMAP.md`, `STATE.md`,
  `REQUIREMENTS.md` and `phases/` move into `.planning/workstreams/<name>/`; `PROJECT.md`,
  `config.json`, `milestones/`, `research/`, `codebase/`, `todos/` stay at the root; a workstream may
  carry its own `config.json`; `.planning/active-workstream` names the active one; with no
  `workstreams/` folder GSD is in flat mode. Model it as a **nested scope reusing every existing
  builder** (research ARCHITECTURE "workstreams/ is a scope"), **without widening `PhaseIdentity`**
  (research Anti-Pattern 4).
- **D-10:** In workstream mode the **project's first screen is a workstream index**: the project head
  (name, what it is) over one card per workstream with its current phase, status and progress, from
  that workstream's STATE/ROADMAP; the workstream named in `active-workstream` is marked. A card opens
  that workstream's normal dashboard.
- **D-11:** Inside a workstream, a **header scope chip** beside the project name (e.g.
  "ws: payments ▾") lists the workstreams plus "All workstreams" and switches between them. Dashboard,
  Roadmap, Traceability and the drawer are scoped to the chosen workstream; URLs are
  `/<project>/workstreams/<name>/…` re-entering the normal grammar, each page at its own readable URL.
- **D-12:** **Shared files appear once, at project level**: the drawer shows them in a "Shared" group
  above the workstream's own files; their URLs do not change.
- **D-13:** Completed workstreams (archived by GSD to `milestones/ws-<name>-<date>/`) show **only on
  the workstream index**, as a collapsed "Completed" group; not in roadmap History. Their files open
  through the normal pages. Projects without workstreams look and behave exactly as before (success
  criterion 4).

### Inputs, examples and sketch order
- **D-14:** **Real shapes come from running GSD's own commands on a scratch copy** of a real project
  (e.g. labelore or duet copied to a throwaway folder outside any repo): `/gsd-thread`,
  `/gsd-plant-seed`, `/gsd-session-report`, `/gsd-milestone-summary`, `/gsd-forensics`,
  `/gsd-onboard`, `/gsd-graphify build` and intel (`/gsd-map-codebase --query`), `/gsd-pause-work`,
  and `gsd workstream create` / migrate. No real `.planning/` is touched. Output is read for shape
  only and never copied into fixtures (Phase 6 rule). This answers the research flag that the
  workstream layout is "inferred from source, not observed". cinedise-portal's `spikes/` is the one
  real exploration tree on this machine and is read for shape the same way.
- **D-15:** **Made-up examples follow the Phase 10 rule (D-10..D-13 there)**: labelled in the file,
  listed in the fixtures index, enforced by the existing test, and placed **in the Lendshed fixture**
  so they open in context. They must cover the hard shapes: verdicts with free text after the
  keyword, a spike with scripts and output files, a seed with and without a surfacing condition, a
  handoff with blocking and non-blocking human actions, a stale handoff whose phase has completed, a
  nested `.continue-here.md`, HANDOFF and continue-here disagreeing, a forensics report with
  anomalies at each confidence, a large graph (bounded-summary test). A **separate made-up
  workstream project fixture** is needed (Lendshed cannot be flat and workstream mode at once),
  including an active pointer and one completed workstream; where it sits is the planner's choice.
  The existing `shapes` fixture keeps its small copies.
- **D-16:** **Frame sketches run before `/gsd-plan-phase 11`**: Spikes page, pause page, Indexes
  page, workstream index + scope chip. The per-type sketches (seed, thread, session report /
  milestone summary, forensics, onboarding) run **inside the phase as a sketch → quick loop per
  type**. Sketch inputs are the real-shape files (D-14) and the made-up examples (D-15), so those are
  written first. Each sketch gets a fresh page frame (keeps tokens, chips and tones) and each build is
  screenshot-checked beside its sketch on the sketch's docs and the hardest real or made-up docs.
- **D-17:** **Workstreams stay in Phase 11 as the last wave(s)**; every other page ships first, and
  if workstreams slip they are cut to a follow-up without reopening anything.

### Claude's Discretion
- One pause page vs two linked pages for HANDOFF.json and `.continue-here.md` (D-05): the pause
  sketch decides.
- How the Spikes and Indexes pages are reached (drawer and search at least; a header entry only if
  Research and Codebase have one), matching Phase 10's discretion on map navigation.
- How the onboarding summary page relates to Phase 10's "mapped, not started" head, which already
  shows the next-step command (avoid two disagreeing suggestions; if they differ, show both apart).
- A project caught mid-migration (root ROADMAP/STATE plus `workstreams/`): the planner picks a
  readable treatment from GSD's own migration rules.
- Which intel files exist in practice (the ingest-docs markdown family versus the intel-updater JSON
  family) is settled by D-14's real run.

### Confirmed research deviations (11-01)
The user answered "approve all" on 2026-11-07 to the C1 to X6 table (11-01 Task 1). C1 words D-01's
spike address as the Phase 7 key plus a redirect, and C12 narrows D-13; both are recorded as answered.
- C1: adopted (2026-11-07; plans 11-15, 11-16, 11-18)
- C2: adopted (2026-11-07; plans 11-18)
- C3: adopted (2026-11-07; plans 11-03, 11-13)
- C4: adopted (2026-11-07; plans 11-03, 11-16)
- C5: adopted (2026-11-07; plans 11-13, 11-19)
- C6: adopted (2026-11-07; plans 11-05, 11-12)
- C7: adopted (2026-11-07; plans 11-29, 11-31)
- C8: adopted (2026-11-07; plans 11-03, 11-27)
- C9: adopted (2026-11-07; plans 11-06, 11-07, 11-10)
- C10: adopted (2026-11-07; plans 11-09, 11-17, 11-20, 11-24)
- C11: adopted (2026-11-07; plans 11-09, 11-20, 11-21, 11-26)
- C12: adopted (2026-11-07; plans 11-28, 11-29, 11-31)
- C13: adopted (2026-11-07; plans 11-04, 11-06)
- C14: adopted (2026-11-07; plans 11-07, 11-13)
- X1: adopted (2026-11-07; plans 11-10, 11-11)
- X2: adopted (2026-11-07; plans 11-10, 11-15, 11-18, 11-22, 11-23, 11-24, 11-25, 11-26)
- X3: adopted (2026-11-07; plans 11-19)
- X4: approve, the fifth size (2026-11-07; plans 11-15, 11-16)
- X5: approve, the fifth size (2026-11-07; plans 11-18, 11-19)
- X6: approve, the fifth size (2026-11-07; plans 11-31)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` § Phase 11: goal and the five success criteria
- `.planning/REQUIREMENTS.md`: VIEW-14 through VIEW-20
- `.planning/PROJECT.md` § Key Decisions: "per-type view is the page", "sketch first", the made-up
  fixture rule, "keep disagreeing signals separate"

### Research already done for this phase
- `.planning/research/FEATURES.md` § A.5 Family 3 (pause and resume: fields of both files), § A.12
  Family 10 (reports, forensics, onboarding), § A.13 Family 11 (intel and graphs, bounded summary
  constraint), and the Family 9 rows for spikes, seeds and threads
- `.planning/research/ARCHITECTURE.md` § "workstreams/ is a scope, not a folder of files" and
  § Anti-Pattern 4 (do not widen `PhaseIdentity`)
- `.planning/research/GSD-DOMAIN.md` § HANDOFF.json
- `.planning/research/PITFALLS.md`: the "no real example on this machine" pitfall

### GSD sources the examples and pages derive from
- `~/.claude/gsd-core/workflows/spike.md`, `spike-wrap-up.md`, `plant-seed.md`, `list-seeds.md`,
  `thread.md`, `pause-work.md`, `session-report.md`, `milestone-summary.md`, `forensics.md`,
  `onboard.md`
- `~/.claude/gsd-core/templates/continue-here.md`
- `~/.claude/gsd-core/bin/lib/workstream.cjs`, `workstream-inventory.cjs`,
  `active-workstream-store.cjs`: workstream layout, inventory status, archive to
  `milestones/ws-<name>-<date>/`, `.planning/active-workstream`
- `~/.claude/gsd-core/bin/lib/graphify.cjs`, `references/planner-graphify-auto-update.md`,
  `~/.claude/agents/gsd-intel-updater.md`, `gsd-doc-synthesizer.md`: intel and graph files
- `~/.claude/gsd-core/bin/lib/onboard-projection.cjs`: next-step rules shared with Phase 10 D-06

### Prior phase decisions this builds on
- `.planning/phases/10-codebase-map-specification-and-check-pages/10-CONTEXT.md`: D-01 (frame +
  panels with per-file URLs), D-10..D-13 (made-up example rule, binding this phase), D-14/D-15
  (sketch inputs are the real files)
- `.planning/phases/09-review-audit-and-root-document-pages/09-CONTEXT.md`: D-12/D-13 sketch and
  analog rules, D-15 fixture-shape coverage
- `.planning/phases/08-several-projects-and-a-switcher/08-CONTEXT.md`: D-17 (one resolver), switcher
  pattern the scope chip sits beside
- `.planning/phases/07-recognised-files-and-readable-urls/07-CONTEXT.md`: URL scheme

### Design
- `docs/design-language.md`: tones, tokens, chips; enforced by `test/web/class-vocabulary.test.ts`
- `.planning/sketches/MANIFEST.md`: 031 and 042 (frame + panels) for the Spikes and Indexes pages;
  023 (debug case file) and 027 (todo lifecycle) as nearest frames for pause and thread; 039
  (project switcher popover) for the scope chip; 025 (dashboard project head) for the workstream
  index head; 051 (browser window outcome-first) for forensics

### Real shapes (read for shape only; never copy into fixtures)
- `~/codebases/cinedise-portal/.planning/spikes/` (MANIFEST.md with free-text verdicts, four spikes,
  one with `make_proxy.sh`)
- The scratch-copy outputs generated under D-14

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/web/pages/research-page.tsx` and the Codebase page (`src/web/views/codebase-page.ts`,
  `codebase-components.tsx`): the frame + panel pattern for Spikes (D-01) and Indexes (D-04).
- `src/planning-repo/folders.ts`: every kind already recognised (`explorationKind('spikes', …)`,
  `markdownKind('seed'|'thread'|'report'|'forensics'|'onboarding')`, `jsonKind('intel'|'graph')`,
  `handoff`, `continue-here` with `where: 'any'`); `workstreams` reserved with `unknownKind`.
- `src/web/views/debug-case.ts`, `todo-lifecycle.ts`: status-first analogs for pause and thread pages.
- The Phase 10 "mapped, not started" head and its copyable next-step command: reuse for onboarding.
- `test/fixtures/shapes/.planning/` (HANDOFF.json, `.continue-here.md` root and in a phase,
  `seeds/`, `threads/`, `spikes/`): small existing shapes.
- The Phase 8 project switcher popover: model for the workstream scope chip (D-11).

### Established Patterns
- Per-type views registered in `src/web/views/kinds.ts` (`VIEW_KINDS`) and `manifests.ts`; fallback
  in `src/web/views/fallback.ts` (success criterion 5's readable generic page).
- Wiring files every view build touches: `handlers/index.ts`, `manifests.ts`, `artifact-page.tsx`,
  `globals.css`, the dense golden.
- Made-up example marker + fixtures index + test (Phase 10 D-10).

### Integration Points
- JSON handler for intel/graph: must produce a bounded summary, not copy the whole object (D-04).
- Discovery and assembly: tag refs with a workstream scope and assemble per scope (D-09);
  `ArtifactRef`, serialization goldens and `serialize.test.ts` change.
- Route table / dispatch and `PROJECT_PAGES`: `/<project>/workstreams/<name>/…` (D-11).
- Dashboard and `project-layout.tsx`: workstream index as first screen in workstream mode (D-10).
- Phase and spike pages: link to a nested `.continue-here.md` (D-07).
- Drawer: "Shared" group in workstream mode (D-12).

</code_context>

<specifics>
## Specific Ideas

- Spikes, like Research and Codebase, are read together: the board and the experiments belong on
  one page.
- Real GSD output beats templates: generate it on a throwaway copy, as Phase 10 did with fresh maps,
  without polluting any real `.planning/`.
- The dashboard stays as it is; a pause is something you go and look at, not a banner.
- Workstreams are the riskiest part (model change, no real example) and must stay cuttable.

</specifics>

<deferred>
## Deferred Ideas

- A dashboard "Paused at task N of M" mark when HANDOFF.json exists (research A.5 suggestion);
  declined for this phase (D-06).
- Completed workstreams in the roadmap page's History beside milestones (D-13 keeps them on the
  index only).

</deferred>

---

*Phase: 11-exploration-handoff-report-and-workstream-pages*

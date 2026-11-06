# Phase 11: Exploration, Handoff, Report and Workstream Pages - Research

**Researched:** 2026-11-06
**Domain:** Eight new per-type views plus one scope model inside an existing Hono + React read-only dashboard over `.planning/` (handlers, server-built contexts, URL grammar, bounded JSON summaries, a nested workstream scope)
**Confidence:** HIGH on in-repo integration points and GSD writer shapes (read and run this session); MEDIUM on workstream scope mechanics (recommended design is new, no real example on this machine); LOW on the unobserved writer outputs (ingest-docs intel, forensics, session report, seed and thread in real runs: the D-14 scratch run has not been done for them).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Page grouping**
- **D-01:** **One Spikes page** in the frame + panel model of Research and Codebase (sketches 031/042): the manifest's verdict board grouped by idea (validated, invalidated, partial, pending) leads, and each spike README, `CONVENTIONS.md` and `WRAP-UP-SUMMARY.md` is a panel with its own URL (`/<project>/spikes/<NNN-name>`, Phase 7 scheme) that opens the page on that panel. Spike scripts and output files are listed by name only, never run or rendered (success criterion 1). Real verdicts carry free text after the keyword (`INVALIDATED (no spare Studio seat)`, `PARTIAL (Resolve relink untested)`); the keyword groups, the text is kept.
- **D-02:** **Seeds and threads each open their own page**, no board: a seed leads with the idea, when it should surface, its scope, and where and when it was planted; a thread with its status and next steps first. The drawer already lists them.
- **D-03:** **Each report type gets its own page**: session report (headline numbers: duration, commits, plans; key outcomes; open blockers), forensics (root-cause hypothesis and recommended actions first), onboarding summary (recommended next command first, copyable, never run). The session report and milestone summary may share one frame if their sketch shows they fit.
- **D-04:** **One Indexes page** for intel and graphs: a panel per intel file (`stack`, `file-roles`, `api-map`, `dependency-graph`, `arch-decisions`, and `SYNTHESIS` where ingest-docs wrote it) plus the graph panel (node and edge counts, last build status and age from `.last-build-status.json`, at most a short top list). The server builds and serves a **bounded summary only**; the raw JSON is never sent to the page or copied whole into the index, however large the file (success criterion 3; research A.13: `JsonConfigHandler` today copies the whole object into `frontmatter` and `body`).

**Paused work**
- **D-05:** `HANDOFF.json` and `.continue-here.md` are written together by `/gsd-pause-work`. Whether they share one pause page or get two linked pages is **left to the sketch** (Claude's discretion). Either way the page shows where work stopped (task N of M), the single next action, human actions pending with blocking ones first, what is left, and the long context notes folded (success criterion 2). Where the two files disagree (e.g. a different task number), both values show, never merged (project rule).
- **D-06:** **The pause appears only on its own page**, reachable from the drawer and search. The dashboard gets **no** "Paused" mark (the research suggestion is declined).
- **D-07:** A **nested `.continue-here.md`** (in a phase folder, spike folder, `sketches/` or `deliberations/`) opens the **same pause layout, headed with its context** ("Paused in phase 2", "Paused in spike 001b", from the file's `context` frontmatter and location), and its phase or spike page carries a small link to it.
- **D-08:** The page always shows the pause's **date and age** ("paused <date>, N days ago"). When the phase or plan it names is already complete by STATE/ROADMAP, a quiet **"work has moved on since"** note sits beside it, separate from the handoff's own fields. GSD deletes these files on resume, so a surviving old one is a real case.

**Workstreams**
- **D-09:** GSD's layout (`gsd-core/bin/lib/workstream.cjs`): `ROADMAP.md`, `STATE.md`, `REQUIREMENTS.md` and `phases/` move into `.planning/workstreams/<name>/`; `PROJECT.md`, `config.json`, `milestones/`, `research/`, `codebase/`, `todos/` stay at the root; a workstream may carry its own `config.json`; `.planning/active-workstream` names the active one; with no `workstreams/` folder GSD is in flat mode. Model it as a **nested scope reusing every existing builder** (research ARCHITECTURE "workstreams/ is a scope"), **without widening `PhaseIdentity`** (research Anti-Pattern 4).
- **D-10:** In workstream mode the **project's first screen is a workstream index**: the project head (name, what it is) over one card per workstream with its current phase, status and progress, from that workstream's STATE/ROADMAP; the workstream named in `active-workstream` is marked. A card opens that workstream's normal dashboard.
- **D-11:** Inside a workstream, a **header scope chip** beside the project name (e.g. "ws: payments ▾") lists the workstreams plus "All workstreams" and switches between them. Dashboard, Roadmap, Traceability and the drawer are scoped to the chosen workstream; URLs are `/<project>/workstreams/<name>/…` re-entering the normal grammar, each page at its own readable URL.
- **D-12:** **Shared files appear once, at project level**: the drawer shows them in a "Shared" group above the workstream's own files; their URLs do not change.
- **D-13:** Completed workstreams (archived by GSD to `milestones/ws-<name>-<date>/`) show **only on the workstream index**, as a collapsed "Completed" group; not in roadmap History. Their files open through the normal pages. Projects without workstreams look and behave exactly as before (success criterion 4).

**Inputs, examples and sketch order**
- **D-14:** **Real shapes come from running GSD's own commands on a scratch copy** of a real project (e.g. labelore or duet copied to a throwaway folder outside any repo): `/gsd-thread`, `/gsd-plant-seed`, `/gsd-session-report`, `/gsd-milestone-summary`, `/gsd-forensics`, `/gsd-onboard`, `/gsd-graphify build` and intel (`/gsd-map-codebase --query`), `/gsd-pause-work`, and `gsd workstream create` / migrate. No real `.planning/` is touched. Output is read for shape only and never copied into fixtures (Phase 6 rule). This answers the research flag that the workstream layout is "inferred from source, not observed". cinedise-portal's `spikes/` is the one real exploration tree on this machine and is read for shape the same way.
- **D-15:** **Made-up examples follow the Phase 10 rule (D-10..D-13 there)**: labelled in the file, listed in the fixtures index, enforced by the existing test, and placed **in the Lendshed fixture** so they open in context. They must cover the hard shapes: verdicts with free text after the keyword, a spike with scripts and output files, a seed with and without a surfacing condition, a handoff with blocking and non-blocking human actions, a stale handoff whose phase has completed, a nested `.continue-here.md`, HANDOFF and continue-here disagreeing, a forensics report with anomalies at each confidence, a large graph (bounded-summary test). A **separate made-up workstream project fixture** is needed (Lendshed cannot be flat and workstream mode at once), including an active pointer and one completed workstream; where it sits is the planner's choice. The existing `shapes` fixture keeps its small copies.
- **D-16:** **Frame sketches run before `/gsd-plan-phase 11`**: Spikes page, pause page, Indexes page, workstream index + scope chip. The per-type sketches (seed, thread, session report / milestone summary, forensics, onboarding) run **inside the phase as a sketch → quick loop per type**. Sketch inputs are the real-shape files (D-14) and the made-up examples (D-15), so those are written first. Each sketch gets a fresh page frame (keeps tokens, chips and tones) and each build is screenshot-checked beside its sketch on the sketch's docs and the hardest real or made-up docs.
- **D-17:** **Workstreams stay in Phase 11 as the last wave(s)**; every other page ships first, and if workstreams slip they are cut to a follow-up without reopening anything.

### Claude's Discretion
- One pause page vs two linked pages for HANDOFF.json and `.continue-here.md` (D-05): the pause sketch decides. (Settled by sketch 054: winner C, one page.)
- How the Spikes and Indexes pages are reached (drawer and search at least; a header entry only if Research and Codebase have one), matching Phase 10's discretion on map navigation.
- How the onboarding summary page relates to Phase 10's "mapped, not started" head, which already shows the next-step command (avoid two disagreeing suggestions; if they differ, show both apart).
- A project caught mid-migration (root ROADMAP/STATE plus `workstreams/`): the planner picks a readable treatment from GSD's own migration rules.
- Which intel files exist in practice (the ingest-docs markdown family versus the intel-updater JSON family) is settled by D-14's real run.

### Deferred Ideas (OUT OF SCOPE)
- A dashboard "Paused at task N of M" mark when HANDOFF.json exists (research A.5 suggestion); declined for this phase (D-06).
- Completed workstreams in the roadmap page's History beside milestones (D-13 keeps them on the index only).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIEW-14 | Spikes open into designed pages: manifest, each spike, wrap-up summary | Spikes lift (manifest ideas + table, README frontmatter with octal/colon traps), Codebase-style frame, `listed` file class so scripts are never read (C1, C4, C6; Patterns 4, 6) |
| VIEW-15 | Seeds open into designed pages (idea, surface condition, planted) | Seed writer shape (`SEED-YYMMDD-xxx-slug.md`, frontmatter + five headings), per-type sketch loop (What GSD writes) |
| VIEW-16 | Threads open into designed pages | Thread writer shape in two forms (frontmatter and `## Status:` heading), per-type sketch loop |
| VIEW-17 | Pause-and-resume files open into one designed page | Pause lift for JSON and tag-section markdown, pairing rule, age and moved-on rules, 054 C (Pattern 5, C9) |
| VIEW-18 | Reports, forensics, onboarding open into designed pages | Bold-label (no frontmatter) session report, 7-section milestone summary, forensics template, onboarding summary + Phase 10 `nextStep` reuse (C10, C11) |
| VIEW-19 | Intel and graph open into summary pages, never a raw dump | Bounded `IndexSummary` service, kind rules for `.md` intel and `GRAPH_REPORT.md`, large-file bypass (C2, C3, C5; Pattern 6) |
| VIEW-20 | Workstream project shows each workstream with its own state, roadmap, phases | Scope adapter (`ScopedPlanningFilesystem`) + per-scope runtime + scope URL prefix; cuttable last wave (Pattern 7, C7, C8, C12) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Read-only: the tool must be incapable of damaging planning state; `node:fs` stays confined to `src/planning-fs/local-fs.ts` for planning reads. Nothing in this phase adds a write path; copy buttons write only to the clipboard. [VERIFIED: .claude/CLAUDE.md "Access" constraint]
- Unknown files must degrade rather than break (every page needs a generic fallback, per file, never per project). [VERIFIED: .claude/CLAUDE.md "Compatibility"]
- Visual language lives in `docs/design-language.md`; `test/web/class-vocabulary.test.ts` enforces it. New shared class names need a table row BEFORE the test runs; `view-<kind>-*` is auto-allowed only for kinds in `VIEW_LOCAL_PREFIXES`. [VERIFIED: CLAUDE.md "Conventions"; src/web/views/kinds.ts]
- Stack is fixed (Vite 8.2.2, React 19.2.8, Hono 4.13.x, react-router 8.3.0, TanStack Query 5.10x, vitest 4.1.11, Playwright 1.63.0). No new runtime dependency is needed (see Standard Stack). [VERIFIED: package.json]
- No runtime, code or data dependency on studio-portal; fixtures are made-up only (public repo). `test/fixture-leak.test.ts` bans real project names in fixtures, tests and `src/` (Phase 10 research Pitfall 10: `duet`, `ibis`, `cinedise`, `studio-portal` and others are whole-word banned in fixtures). `.planning/` is exempt.
- GSD workflow enforcement: file changes go through a GSD command. Project memory rules binding execution: restart `systemctl --user restart labelore` after every change (CSS included); Playwright e2e only when necessary, narrowest spec (~6 min a run); screenshot each build beside its sketch (system Chrome `/usr/bin/google-chrome`); colours only from design-language tones, never `destructive` for content; every sketch gets a fresh page frame; ask what is off before "polishing" a liked variant; parallel view builds trip over shared wiring files (serialize them).
- 11-UI-SPEC.md (approved 2026-11-06) and CONTEXT are locked. Where this research found a contradiction with the UI-SPEC it is listed in "Contract conflicts" and must be resolved by the planner and the user, not silently overridden.

## Summary

Phase 11 adds eight view kinds (`spikes`, `pause`, `indexes`, `seed`, `thread`, `report`, `forensics`, `onboarding`) and one cross-cutting scope model (workstreams). Everything except workstreams fits the pipeline Phase 10 proved: a guarded handler produces a `structured.*` lift, a server-built context joins sibling documents on `/documents`, a pure `compose*` function in `src/web/views/` shapes a model, a `ViewManifest` field opts the kind in, and `artifact-page.tsx` renders it. `VIEW_KINDS` is pinned at 31 by `view-registry.test.ts` (it becomes 39) and every wiring file is shared, so builds must be serialized. **No new npm package is recommended.**

The most important findings are mismatches between the approved UI-SPEC/CONTEXT and what the code does today, listed in "Contract conflicts". The ones that change the plan: (1) a spike README's address today is `/spikes/<NNN-name>/readme`, the manifest's is `/spikes/manifest`, and a bare `/spikes` or `/indexes` is not found; (2) `graph.json` is above the 1 MiB text cap, so it is class `large` and today opens the File details card, never an ArtifactPage; (3) spike scripts and outputs are ordinary text files that discovery reads, indexes and lists, so "never read" needs a position rule; (4) `SYNTHESIS.md` and `GRAPH_REPORT.md` are kind `unknown` today and folder tests pin that; (5) `.planning/active-workstream` is a root-internal file that never becomes an artifact, and GSD keeps the real pointer per session, so Labelore must read it directly and treat it as a hint; (6) `projectMapState` would call a workstream-mode project with a codebase map "map-only" and send its dashboard to the Codebase page.

For workstreams, ARCHITECTURE.md proposed tagging refs and splitting `assembleDomainModel`. This research found a cheaper design that satisfies D-09 and keeps `PhaseIdentity`, discovery, assembly, every handler, every presentation builder and the dense/serialize goldens untouched: a **`ScopedPlanningFilesystem`** adapter at the existing port boundary that presents `.planning/workstreams/<name>/` as the scope's `.planning/` (shared root files overlaid), feeding the unmodified `PlanningRepository` and `ProjectRuntime`, mounted a second time with the existing `createProjectApi` factory at `/api/projects/:slug/ws/:name`. Its cost is virtual paths (copy-path and search ids must be mapped), which is the main open question.

**Primary recommendation:** Plan five layers in order: (A) recognition rules, the `listed` file class, the D-14 real-shape run and the labelled made-up fixtures with the extended marker test; (B) guarded handlers and the bounded index-summary service; (C) pure presentation contexts, `VIEW_KINDS`/`viewKindOf`, route redirects and the large-file bypass; (D) one view per page, serialized, each with its sketch checkpoint (053 A, 054 C, 055 A already won; seed, thread, reports, forensics, onboarding sketch inside the phase starting at 057) and a screenshot check; (E) workstreams last, as a cuttable wave built on the scope adapter.

### Contract conflicts to resolve (put in the plan as explicit, user-confirmed deviations)

| # | UI-SPEC / CONTEXT says | Reality (verified) | Recommendation |
|---|------------------------|--------------------|----------------|
| C1 | Spike sheet URL `/<project>/spikes/<NNN-name>`, bare `/<project>/spikes` opens the board, `/spikes/conventions` and `/spikes/wrap-up-summary` as panels. Indexes `/<project>/indexes/<file>` is "a sketch word" | Running `addressOfPath`: `spikes/MANIFEST.md` is `/spikes/manifest`; `spikes/003b-local-disk-staging/README.md` is `/spikes/003b-local-disk-staging/readme`; `CONVENTIONS.md` is `/spikes/conventions`; `WRAP-UP-SUMMARY.md` is `/spikes/wrap-up-summary`. `parseRoutePath('/spikes')` and `('/indexes')` give a `document` route no artifact owns, so they are not-found. (`folderAddress` drops the last segment's `.md` and lower-cases it, see Code Examples.) | Keep Phase 7 addresses authoritative (they are the artifacts' keys). Add redirect-only dispatch for bare `/spikes` (to the manifest key, else the first spike's key) and bare `/indexes` (first tile), exactly like the bare `/codebase` redirect (`route-dispatch.ts`). Record that UI-SPEC's `/spikes/<NNN-name>` is the sketch's word. Do not add `spikes` to `PROJECT_PAGES` |
| C2 | The graph tile opens "the same Indexes page" at `/graphs/…` | `graph.json` over 1,048,576 bytes is class `large`; `DocumentRoute` sends `large` to `FileDetailsPage` before any `/documents` call; the registry never reads a `large` file | `DocumentRoute` must let a kind that owns a designed view (`graph`, `intel`, spike files) skip the file-class card; the graph summary comes from the server-side bounded service, not from `parseWithRegistry` |
| C3 | Panels for `SYNTHESIS` and the ingest-docs family; the graph panel uses GRAPH_REPORT | `folderRule` `intel` and `graphs` use `jsonKind(...)`, so `intel/SYNTHESIS.md`, `intel/decisions.md` and `graphs/GRAPH_REPORT.md` are kind `unknown`; `test/folders.test.ts` pins `['intel/SYNTHESIS.md','other','unknown']` and `['graphs/notes.md','other','unknown']` | Change the two rows to accept `.md` and `.json` and update those pins deliberately in the recognition wave. `intel/.last-refresh.json` is the freshness stamp, not a tile |
| C4 | Spike scripts and outputs are "listed by name only; a test asserts the file bytes are never read" | Discovery reads every `text`-class file (`.sh`, `.js`, `.json`, `.log` are in `TEXT_EXTENSIONS`), the registry parses it, search indexes `artifact.body` and Source mode can show it | Add a position rule: a file under `spikes/<dir>/` that is not `README.md` or `.continue-here.md` gets a new `listed` file class (never read, never indexed, listed with size). `FileClass` today is `'text' \| 'image' \| 'binary' \| 'large'`; widening it touches `file-facts.ts`, `drawer.ts`, `planning-places.tsx` and tests. Fallback if the plan wants no widening: reuse class `large` (same effect, wrong label) |
| C5 | Synthesis conflict chips: auto-resolved `quiet`, competing `in-flight`, unresolved `missing` | The writer's summary line reads "Conflicts: N blockers, N competing-variants, N auto-resolved" (`gsd-doc-synthesizer.md`); the conflict report buckets are BLOCKERS, WARNINGS, INFO | Show the file's own words: blockers `missing`, competing-variants `in-flight`, auto-resolved `quiet`. Parse leniently; fall back to the tile with no chips |
| C6 | Spike id and verdict come from README frontmatter | gray-matter turns `spike: 001` into the number 1, `spike: 010` into 8 (octal), and `verdict: PARTIAL: x` (unquoted colon) throws, leaving the body intact and frontmatter `{}` | Take id and name from the folder name, never from `spike:`. If the README frontmatter warns, recover `verdict:` with one line scan of the head. A real README says `verdict: DEFERRED` (a keyword outside the four) while the manifest says `PENDING (needs test recording)`: the "README says" flag and the unknown-keyword chip are real cases |
| C7 | "Active comes only from `.planning/active-workstream`" | `active-workstream` is in `ROOT_INTERNAL_FILES`, so discovery never makes it an artifact; the pointer is per session under Claude Code (`$TMPDIR/gsd-workstream-sessions/...`) | Read `.planning/active-workstream` once, directly through the filesystem port, in the workstream inventory (bounded, trimmed, validated against GSD's name regex, matched only against listed folder names). A miss is "no pointer" |
| C8 | (not mentioned) | `projectMapState` is `present.length > 0 && !hasRoadmap && !hasPhaseArtifact` over root paths; a workstream project has no root `ROADMAP.md` and its phases are `location: 'other'` | A workstream-mode project with a codebase map would read as map-only: its tabs hide and its dashboard becomes the Codebase page. Add the workstream condition to `projectMapState` and test it |
| C9 | Pause "Behind you" from `completed_tasks`, "Ahead" from `remaining_tasks` as tasks | The writer's examples use task objects, but the frozen dense fixture's `remaining_tasks` entry is a plan-shaped object (`id "02-01-01"`, `wave`, nested `tasks[]`); the `.continue-here.md` body uses pseudo-XML tag sections (`<current_state>`), not headings; a spike pause lives in `spikes/SPIKE-NNN/`, not `NNN-name` | Read both task shapes defensively; strip the tag-only lines before the markdown render (the `context.ts` HTML-block trap); pair by folder and `phase` frontmatter, never assume the folder is a spike id |
| C10 | Session report headline numbers | The session report has no frontmatter; numbers are bold-label lines (`**Duration:**`, `**Plans Executed:**`, `**Commits Made:**`); a second report is named `YYYYMMDD-session-report.md` | Lift bold-label lines in the head; the numbers are free text ("Single session"), shown as written |
| C11 | Onboarding "recommended next command" | The summary's `## Recommended Next Step` bullet is `{handoff_commands.manager}` (a manager command line), while Phase 10's head computes `/gsd-map-codebase`/`/gsd-new-project` by `nextStep` | The 11-UI-SPEC two-block answer is right; take the summary command from the first bullet verbatim, never validate it |
| C12 | Completed workstreams collapsed on the index | `workstream complete` moves the folder into `milestones/ws-<name>-<date>[-N]/` and removes `workstreams/` when none remain (`reverted_to_flat`). Those archives hold STATE.md and phases/ only; their files sit under `milestones/` as `unknown` kind with `file/` addresses | The index (and so the Completed bar) exists only while at least one live workstream folder remains. A project whose last workstream completed is flat again; its `ws-*` archives are ordinary milestone-folder files. The Completed rows are read from `milestones/ws-*` directory names |
| C13 | "Marker test reads both frontmatter and comment" | `readMadeUpMarker(frontmatter, rawText)` reads a frontmatter key set or a first-line HTML comment; JSON cannot hold a comment, and intel/graph artifacts will not carry the object in `frontmatter` (D-04) | Extend `readMadeUpMarker` to parse raw JSON text (top-level keys or `_meta`). The index file is `test/fixtures/README.md` (not the Lendshed README); every kind added to `MADE_UP_EXAMPLE_KINDS` forces a marker on the `shapes` fixture's small copies too |
| C14 | `JsonConfigHandler` "copies the whole object into frontmatter and body" for intel and graph | It matches only `location === 'root'` and three names, so intel/graph never reach it today; they go to the generic handler and (under 1 MiB) land whole in `body`, which `/documents` renders to HTML and search indexes | The new index handler must set `body` to a bounded digest (or empty) and keep the raw object out of `frontmatter`, `body`, the rendered `document` and the search index. `HANDOFF.json` keeps its current handler output (a test pins `frontmatter.brave_search` and the raw body); add `structured.pause` beside it |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Recognising spikes, seeds, threads, reports, intel, graphs, pause files | Planning-repo (`folders.ts`, `discovery.ts`) | — | Kind is decided by position and name only (DATA-02) |
| Structured lifts (verdicts, seed fields, pause fields, report numbers) | Planning-repo handlers (`structured.*`) | — | Same guarded-handler contract as the codebase map |
| Joining sibling documents (manifest + READMEs + files, HANDOFF + continue-here + STATE) | API / Backend (`presentation/*-context.ts` built on `/documents`) | — | One bundle per request (D-05); the page never reads a file |
| Bounded intel and graph summaries | API / Backend (async `IndexSummary` service behind the filesystem port) | Planning-repo handler for small intel files | Large files must never reach the page or the index |
| Ages, "moved on since", "N commits behind" | API / Backend | Browser (age text from a server-supplied date) | Computed words are Labelore's own; git count needs the server |
| Page composition and rendering | Browser (`compose*` + components) | — | Pure composers over `ViewInput` |
| Copy command / path | Browser (clipboard) | — | Reads the page, writes nothing |
| Workstream scope (inventory, scoped runtime, API mount) | API / Backend | Planning-fs adapter | Scope is a view of the same files, never a second parser |
| Scope URL prefix, scope chip, scoped nav | Browser (`nav.tsx`, router) | — | The slug is already prefixed in one place; scope joins it |
| "Never run, never read" guarantees for spike files | Planning-repo (file class) | Server (stat only) | Enforced before any read |

## Standard Stack

### Core (all in-repo seams; nothing to install)

| Library / seam | Version | Purpose | Why standard |
|----------------|---------|---------|--------------|
| `gray-matter` via `tryParseFrontmatter` | 4.0.3 | Frontmatter for READMEs, seeds, threads, continue-here | The one guarded call; passes `{}` options to bypass its cache [VERIFIED: src/planning-repo/frontmatter.ts] |
| `tryParseJson` (frontmatter.ts) | in repo | Guarded JSON (strips `__proto__`, `constructor`, `prototype`) | Required for HANDOFF and intel JSON [VERIFIED: json-config.ts header comment] |
| `splitSections` / `parseMarkdownTable` (`markdown-sections.ts`), `splitFencedSections` (`fenced-sections.ts`) | in repo | Heading and table scanning, fence-aware | Reuse; `splitSections` is not fence-aware (Phase 10 Pitfall 2), use the fenced variant for READMEs and reports |
| `PlanningRepository`, `PlanningFilesystem` port, `ProjectRuntime`, `createProjectApi` | in repo | The whole load, derive and serve pipeline | The scope adapter reuses all of it unchanged |
| `StatusMeter`, `CopyCommand`, `CopyPathButton`, `ValueNotShown`, `ProjectSwitcher` (Popover model), `Dialog` | in repo | UI atoms named in the UI-SPEC | Built once; do not add `view-x-meter` |
| `nextStep` / `mapReadiness` (`presentation/codebase-map.ts`) | in repo | Onboarding second block | Pure, shared with Phase 10 |
| `createGitRunner` (`server/file-dates.ts`) | in repo | `git` for "commits behind" | Hardened runner (no shell, no pager) [VERIFIED: commit-times.ts header] |

### Supporting

| Library | Version | Purpose | When to use |
|---------|---------|---------|-------------|
| `@streamparser/json` | 0.0.26 (npm, MIT, modified 2026-08-21) | Streaming JSON tokens | Only if the hand-written graph scanner is rejected; see Package Legitimacy Audit. Not recommended |

### Alternatives Considered

| Instead of | Could use | Tradeoff |
|------------|-----------|----------|
| `ScopedPlanningFilesystem` adapter for workstreams | ARCHITECTURE.md plan: `workstream` tag on `ArtifactRef` plus `assembleScope` per workstream | Real paths and no copy-path mapping, but touches `ArtifactRef`, discovery, assembly, 16 hard-coded root-path sites in 9 files, serialization goldens and `serialize.test.ts` |
| Lazy async `IndexSummary` per runtime, cached by path+mtime+size | Summaries inside `parseWithRegistry` at load | Load-time cost on every refresh (a 47 MB graph) and `large` files are never read there; lazy keeps startup flat |
| New `listed` file class | Reuse `large` for spike scripts/outputs | `listed` is honest and testable; `large` needs no type change but mislabels a small `.sh` as "large" |
| Hand-written graph element scanner | `@streamparser/json` | A dependency (pre-1.0, unverified API surface this session) versus ~80 lines tested against `JSON.parse` on a generated 20,000-node graph |

**Installation:** none. `npm install` is not part of this phase.

**Version verification:** `npm view @streamparser/json version license` returned `0.0.26` / `MIT`, modified `2026-08-21` (this session). Every other library is already pinned in `package.json`.

## Package Legitimacy Audit

No external package is installed by this phase. One optional package was evaluated and is not recommended.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@streamparser/json` | npm | published 2026-08-21 (latest 0.0.26) | ~3.75M/wk | github.com/juanjoDiaz/streamparser-json | OK (seam) | Not used. If chosen, tag `[ASSUMED]` (found by me, API surface not confirmed against its docs this session: the README fetch showed no `paths`/`keepStack` text) and add a `checkpoint:human-verify` before install |
| `stream-json` | npm | latest published 2026-10-29 | ~14.8M/wk | github.com/uhop/stream-json | SUS (`too-new`) | Not used. If chosen, flagged: planner must add a human-verify checkpoint |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `stream-json` (not recommended; no install planned)
Registry: `gsd_run query package-legitimacy check --ecosystem npm stream-json @streamparser/json` was run this session.

## Architecture Patterns

### System Architecture Diagram

```
 .planning/ (read-only)
   spikes/ seeds/ threads/ reports/ forensics/ onboarding/ intel/ graphs/ HANDOFF.json .continue-here.md
   workstreams/<ws>/ {STATE,ROADMAP,REQUIREMENTS,phases/}   active-workstream (internal, root only)
        |
        v
 PlanningFilesystem port  --(optional)-->  ScopedPlanningFilesystem(ws)  [shared root overlaid, ws files as .planning/]
        |                                          |
        v                                          v
 discover(): kind by position+name  ------>  parseWithRegistry(): handler per kind (guarded) -> structured.*
   (spike scripts/outputs -> class `listed`: never read)       (intel/graph: bounded digest only)
        |
        v
 assembleDomainModel -> Project -> toProjectPresentation (+ ArtifactDto.structured)
        |
        +--> GET /documents?route=  : artifact + per-kind context (spikes | pause | indexes | onboarding ...)
        |         |                    built from the cached presentation (pure) + async IndexSummary (graph, cached by path+mtime+size)
        |         v
        |    Browser: resolveProjectRoute -> DocumentRoute (kind-owned views skip the file-class card)
        |         -> ArtifactPage -> manifest.<view>Page(compose) -> <View>  (spike sheet = Dialog, indexes tile = in place)
        |
        +--> /api/projects/:slug/ws/:name/*  (same createProjectApi, scoped ProjectRuntime)
                  Browser: scope prefix in nav.tsx; workstream index at "/" when workstreams/ has a folder
```

### Recommended Project Structure

```
src/planning-fs/scoped-fs.ts                  # NEW: ScopedPlanningFilesystem (workstream wave only)
src/planning-repo/folders.ts                  # EDIT: intel/graphs accept .md; spike-file position rule
src/planning-repo/file-class.ts               # EDIT: `listed` class (or `large` fallback)
src/planning-repo/handlers/
  spikes.ts  spikes-lift.ts                   # manifest + README + wrap-up + conventions (one handler per file kind, one lift module)
  seed.ts  thread.ts                          # frontmatter + headings, with bold-label and `## Status:` fallbacks
  pause.ts  pause-lift.ts                     # HANDOFF.json (wraps JsonConfigHandler) and .continue-here.md
  report.ts  forensics.ts  onboarding.ts      # bold-label heads, tables, bullets
  index-intel.ts                              # small intel JSON/MD -> bounded structured.index + digest body
src/server/index-summary.ts                   # NEW: async bounded graph/intel service (readBytesWithin, caps)
src/server/workstreams.ts                     # NEW: inventory (list, STATE/ROADMAP lifts, active pointer, ws-* archives)
src/presentation/spikes-context.ts pause-context.ts indexes-context.ts onboarding-context.ts workstreams.ts
src/web/views/<kind>-page.ts + <kind>-page-components.tsx   # one pair per view, copying the Phase 10 shape
src/web/pages/workstream-index-page.tsx                     # last wave
src/web/components/scope-chip.tsx                           # last wave (reuse project-switcher-trigger if it fits)
test/fixtures/lendshed/.planning/{spikes,seeds,threads,reports,forensics,onboarding,intel,graphs}/...
test/fixtures/<workstream-project>/.planning/...            # separate made-up root (name is the planner's choice)
```

### Pattern 1: Guarded handler with a separate extractor (every kind)
**What:** `match` by ref only; parse with `tryParseFrontmatter`/`tryParseJson`; run the extractor in try/catch; return `structured: extraction === undefined ? {} : { key: extraction }` so a throw omits the key and title, body and frontmatter survive.
**Source:** `src/planning-repo/handlers/codebase.ts` and `coverage.ts` (read this session). Register before `GenericMarkdownHandler`, which must stay last in `HANDLERS`.
**Per kind, what the lift carries (bounded, author-controlled keys in `Map`/`Object.hasOwn`):**
- `spikes-manifest`: `ideas[{key, paragraph, requirements[]}]`, `spikes[{id, idea, name, type, validates, verdictKeyword, verdictText, tags}]` from the table (ids as text, order as written; the page orders by id). Handle the pre-#1700 flat shape (`## Idea` / `## Requirements`) as one implicit idea.
- `spike`: id and name from the folder name; frontmatter `idea, type, validates, verdict, related, tags`; the verdict recovery line scan (C6); `validates` split on `Given`/`when`/`then` case-insensitively else whole; the remaining headings as a list for the closed bars.
- `spikes-wrap-up`: `date`, `count`, `processed[{id, name, type, verdict, area}]` from the table, key findings text, skill path from the `**Skill output:**` line. `spikes-conventions`: its four headings.
- `seed`: frontmatter `id, status, planted, planted_during, trigger_when, scope, audit_acknowledged{milestone, at, status}`; headings `Why This Matters`, `When to Surface` (`**Trigger:**`), `Scope Estimate`, `Breadcrumbs`, `Notes`. Placeholder text (`_To be filled in..._`, `_No breadcrumbs collected yet._`) is "not stated", not content. Dates are `Date` objects in YAML: take `toISOString().slice(0, 10)`.
- `thread`: frontmatter `slug, title, status, created, updated`; fall back to `## Status: OPEN|IN PROGRESS|RESOLVED` in the body and the `# Thread:` heading for title; sections `Goal, Context, References, Next Steps`; placeholder bullets `*(what the next session should do first)*` are empty.
- `report`: session report (bold-label head lines, `## Session Summary` ... `## Blockers & Open Items`) and milestone summary (`# Milestone v{V} — Project Summary`, seven numbered `##` sections, `## Stats`). Decide the kind variant from the file name only (`MILESTONE_SUMMARY-v*` versus the rest).
- `forensics`: `**Generated:**`, `**Problem:**`, `## Evidence Summary` (three `###` subsections, an artifact table with check/cross marks), `## Anomalies Detected` (`### {Type} — {Confidence: HIGH|MEDIUM|LOW}` with `**Evidence:**`, `**Interpretation:**`), `## Root Cause Hypothesis`, `## Recommended Actions` (numbered).
- `onboarding`: four `- NAME.md: present|missing` bullets, Codebase Context bullets (`Brownfield repo`, `Map readiness`, `Codebase map`, `Fast map available`), Docs Context count, `## Recommended Next Step` first bullet.
- `handoff`/`continue-here`: see Pattern 5.
- `intel`/`graph`: see Pattern 6.

### Pattern 2: Server-built context on `/documents`
**What:** A pure function over the cached presentation, called in a guarded IIFE in `project-api.ts` keyed on `lookup.artifact.kind`; carried to the page through `ArtifactDocumentResponse`, `ViewInput` (`manifest.ts`) and the `viewInput` `useMemo` in `artifact-page.tsx`. Spikes, pause, indexes and onboarding each need one. The Indexes graph tile is async (bounded read), so its context builder is the one `await` in that handler, cached per bundle.
**Source:** the `codebaseContext` IIFE in `src/server/project-api.ts` (read this session; Phase 10 Pattern 2). Do not add `artifact.kind === '…'` branches to `artifact-page.tsx` (`view-page-contract.test.ts` caps them): add one optional manifest composer field per view.

### Pattern 3: Register views with a table-driven `viewKindOf`
`viewKindOf(kind)` is prefix-based today (`codebase-*`). Replace its body with a small lookup: `spikes-manifest|spike|spikes-wrap-up|spikes-conventions` to `spikes`; `handoff|continue-here` to `pause`; `intel|graph` to `indexes`; `codebase-*` to `codebase`; others unchanged. `VIEW_KINDS` grows by 8 (`spikes`, `pause`, `indexes`, `seed`, `thread`, `report`, `forensics`, `onboarding`) to 39: update `view-registry.test.ts` (`expect(VIEW_KINDS.length).toBe(31)`) deliberately, give each manifest a `lead` ending in a period and a `promote` fallback, and normalise `test/e2e/pages.ts` through `viewKindOf`. Add every kind to `VIEW_LOCAL_PREFIXES` through `VIEW_KINDS` and document the new shared names in `docs/design-language.md` before running the vocabulary test.

### Pattern 4: Spikes page = the Codebase frame, not a new page route
Each spike README, the manifest, CONVENTIONS and WRAP-UP-SUMMARY is an ordinary document at its Phase 7 address; all four render the same Spikes view, with the sheet open for a README. The board needs the manifest plus every spike README plus the file list of each spike folder, all already in the presentation (`ArtifactDto` carries `structured`, `path`, `sizeBytes`, `fileClass`). So `buildSpikesContext(presentation, path)` is pure and synchronous, like `buildCodebaseContext`. Sheet state is carried by the URL: opening `/spikes/<id>/readme` opens the sheet; closing navigates to the manifest key. Reaching it: bare `/spikes` redirect (C1), drawer and search; no header tab (Phase 10 C6 precedent; the 390 px two-row top bar). A folder under `spikes/` with no manifest row, and a manifest-less project, follow the UI-SPEC fallback table.

### Pattern 5: Pause = one page over two kinds, joined by a pure context
- **Addresses (verified by running `addressOfPath`):** root `HANDOFF.json` is `/handoff`; root `.continue-here.md` is `/continue-here`; in a phase folder it is `/<v>/phase-2/continue-here`; in a spike folder `/spikes/SPIKE-006/continue-here`; in `sketches/` `/sketches/.continue-here`; in `deliberations/` the lossless `/file/deliberations/.continue-here.md`. All open the pause view.
- **Pairing:** HANDOFF pairs with the root `.continue-here.md`, else the one in the folder `phase_dir` names; a continue-here pairs with the root HANDOFF when its `phase` matches, else stands alone. The `phase` frontmatter wins for the head even when the file sits in another phase's folder (seen for real).
- **Page data:** HANDOFF lift `{version, timestamp|paused_at, phase, phase_name, phase_dir, plan, task, total_tasks, status, completed[], remaining[], blockers[], asyncJobs[], humanActions[{action, context, blocking}], decisions[], uncommittedFiles[], nextAction, contextNotes}`; every field optional; unknown keys listed for the closed bars. Continue-here lift `{context, phase, task, totalTasks, status, lastUpdated, constraints[], antiPatterns[{pattern, description, severity, prevention}], tags{current_state, completed_work, remaining_work, decisions_made, blockers, context, next_action}, sections[]}`. Constraint lines split on " — "; `status` values differ between files (`paused` versus `in_progress|blocked|almost_done`): show both, never merge.
- **Age and moved-on (server-side, computed once per bundle):** age from HANDOFF `timestamp`, older `paused_at`, else continue-here `last_updated`. "Moved on" reads the named phase's completion from STATE/ROADMAP (`roadmapComplete` or `diskStatus === 'complete'`); for a spike, its manifest verdict (Open item 5).
- **Do not break:** keep `JsonConfigHandler`'s `frontmatter` and `body` for `HANDOFF.json` exactly (pinned by `test/config-masking.test.ts` lines 140-151); add a `PauseHandler` earlier in `HANDLERS` that calls it and adds `structured.pause`. The older `shapes` HANDOFF (`paused_at`, `task`, `total_tasks`, `next_action`, no task lists) and the dense file (invalid JSON, a frozen degradation fixture) must both render.

### Pattern 6: Indexes = a bounded summary service, not a handler copy
- **Small intel (the writer's own budget is about 500 to 3,000 tokens a file, so a few KB):** a sync handler on the text-class path builds `structured.index` and a digest `body` (labels only, at most about 2 KB); `frontmatter` keeps only `_meta` and the made-up marker keys. If a file is over 1 MiB it is class `large` and its tile reads "Unreadable" with its path, never sent.
- **Graph:** async `IndexSummary.graph(path)` in the server, cached per runtime by `(path, mtimeMs, sizeBytes)`. Order: (1) `GRAPH_REPORT.md` (a normal text artifact once C3 is fixed) for counts and "God Nodes"; (2) `.last-build-status.json` (small JSON) for status, exit code, duration, `head_at_build`; (3) if the report is absent, a bounded scan of `graph.json` read through `readBytesWithin('.planning', path)` under a stated cap (recommend 96 MB; larger gives "counts not read"), counting `nodes` and `links`/`edges` elements and accumulating degree per node id to emit at most 10 hubs, never building the object graph; (4) `.last-build-snapshot.json`, `graph.html` and other big files are only `stat`ed and named on the "Not sent to this page" line. `built_at_commit` is read from `graph.json`'s top level by the scan or a head sniff (key position is unverified, Assumption A5); "N commits behind" is `git rev-list --count <built>..HEAD` through `createGitRunner`, `null` on any failure, never cached across refresh.
- **Bounds (constants in one module, tested with a generated 20,000-node graph):** 10 hubs, 12 paths, 6 routes, 8 dependencies, every arch key. A GRAPH_REPORT line longer than a stated cap (the real file had one over 5 KB) never enters the summary.
- **Where it ships:** only inside the `/documents` indexes context. `/presentation` stays small (`ArtifactDto.structured` ships whole there, Phase 10 Pitfall 12) and the `/documents` rendered `document` HTML must not contain the raw JSON (C14).

### Pattern 7: Workstreams = a scope adapter at the port, then reuse everything (last wave)
**Mechanism (recommended).**
1. `src/server/workstreams.ts` lists `.planning/workstreams/*` (folders only, names validated against GSD's `^[a-zA-Z0-9][a-zA-Z0-9._-]*$` and not `none`), reads each STATE (frontmatter first, then the `**Status:**` and `**Current Phase:**` bold lines, as GSD's own inventory does) and ROADMAP phase name, the active pointer (C7), and `milestones/ws-<name>-<date>[-N]/` archives with the count of their `phases/` entries. A listed entry that is not a folder, or has no STATE.md, becomes a dashed branch (never hidden).
2. `ScopedPlanningFilesystem(parent, name)` implements `PlanningFilesystem`: for a virtual path `.planning/X`, if `X` is `ROADMAP.md`, `STATE.md`, `REQUIREMENTS.md` or under `phases/` read `.planning/workstreams/<name>/X`; if the workstream folder has `X` (its own `config.json`, `quick/`) prefer it; otherwise read the root file. `list` merges the two (workstream entries win, root `workstreams/` and root leftovers of the moved names are hidden, so mid-migration root files never leak in). It never writes.
3. A scoped `PlanningRepository` and `ProjectRuntime` per workstream (created lazily, held by the parent runtime, disposed with it, refreshed with it). `createProjectApi` is mounted a second time at `/api/projects/:slug/ws/:name` with a `resolve` that returns the scoped runtime or 404 (unknown name). The registry's request guard covers it.
4. URL grammar: no change to the `Route` union (ARCHITECTURE.md's `{ kind: 'workstream'; inner }` variant is unnecessary here). Split the scope off before parsing: `splitProjectPath` yields `{first, rest}`; add a `splitScope(rest)` that peels `workstreams/<name>` and passes the remainder to the unchanged `resolveProjectRoute` against the scoped presentation. `/workstreams` alone is the index. A workstream whose name collides with a grammar word (`phase-x`, `v1.1`, `roadmap`) is safe because the name sits after the `workstreams` segment and is matched only against the listing.
5. Web: one `useProjectScope()` in `nav.tsx`; `withProjectSlug` (and `projectUrl`/`projectKey`) take the scope so every `Link`, API fetch and query key carries it (57 call sites in 20 files; a standing scan like `test/web/nav-contract.test.ts` and `query-keys.test.ts` should fail on an omission). The drawer's "Shared" group and the chip's "All workstreams" opt out of the scope prefix (D-12).
6. Shell: in workstream mode the first screen is the index (`/` outcome), the header hides Roadmap and Traceability on it (extend the `mapOnly`-style gate in `app-shell.tsx` and re-pin `navbar-contract.test.ts`), and `projectMapState` is fixed (C8).
**Cost to state in the plan:** scoped artifact paths are virtual (`.planning/ROADMAP.md`). Add an optional `realPath` to `ArtifactDto` in scoped presentations (set by the adapter's inverse map) and feed it to `CopyPathButton`; Phase 13 search must key on scope plus path. This is Open question 1.
**Cut line (D-17):** nothing in layers A to D may import `scoped-fs.ts`, `workstreams.ts`, `useProjectScope` or the scope chip. The only edits outside the last wave that mention workstreams are the folder row and `projectMapState`.

### Pattern 8: Made-up examples and the marker test
Place each file in Lendshed (`test/fixtures/lendshed/.planning/`), label it (frontmatter keys, or a first-line comment `<!-- made-up example · derived from {writer} · gsd-core 1.19.0 -->`, JSON top-level keys or `_meta`), add a row to `test/fixtures/README.md` (`parseMadeUpIndex` reads the first table whose header starts with `Path`), and append the new kinds to `MADE_UP_EXAMPLE_KINDS`. Extend `readMadeUpMarker` for raw JSON (C13). Put the 20,000-node graph in the test (a helper writing to `mkdtemp`, like `test/helpers/research-fixtures.ts`), never committed. The workstream fixture is a new root: add it to `RELATIVE_ROOTS` in `test/helpers/fixture-roots.ts` (importing throws if a root has no `.planning`) and give it its own index row and marker test coverage. The `shapes` fixture's small seed, thread, spike, HANDOFF and continue-here files need markers too once their kinds join the rule; mind that `shapes` HANDOFF.json is pinned by other tests.

### Anti-Patterns to Avoid
- **Widening `PhaseIdentity`** with a workstream (D-09; Anti-Pattern 4): two workstreams each have a phase 1; per-scope assembly keeps identities unique.
- **Copying the raw JSON** into `frontmatter`, `body`, `document` HTML, `structured` or the search body for intel/graph (C14).
- **Reading spike scripts/outputs** "just to count lines" or to render a preview (C4).
- **Parsing spike id or verdict from frontmatter alone** (C6) and **deriving a pause's folder from its spike id** (C9).
- **A header tab** for Spikes or Indexes (two-row top bar at 390 px; Phase 10 C6).
- **Merging disagreeing records** (manifest vs README, HANDOFF vs continue-here, phases vs plans counts): one dashed `quiet` block, both values, one shared `record-disagreement` name.
- **Inferring Active** from mtimes or STATE.

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Frontmatter | A YAML parser or a regex | `tryParseFrontmatter` | Throws on unquoted colons; the guard exists |
| JSON | `JSON.parse` on raw text | `tryParseJson` | Prototype-key stripping at every depth |
| Heading/table scanning | New regexes per page | `splitFencedSections`, `parseMarkdownTable` | Linear, fence-aware, growth-tested |
| Copyable command | A new button | `CopyCommand` | `copy-command*` classes, Phase 10 |
| Meters, "Value not shown" | Per-view copies | `StatusMeter`, `ValueNotShown` | Drift rule of the design language |
| Next-step rules | A second onboarding rule table | `nextStep`/`mapReadiness` | GSD's `onboard-projection.cjs` rules are already mirrored |
| Git queries | `child_process` in a new module | `createGitRunner` | No shell, no pager, timeouts |
| Project API for a scope | A second route table | `createProjectApi` mounted again | The factory already takes a resolver |
| Pause "age" text | Date maths in components | One server-computed date plus the existing `opened-ago.ts` style | Computed words are Labelore's own |

**Key insight:** every page here is a thin lift plus a join over files the pipeline already loads. The two places that need genuinely new machinery are bounded reads of files the pipeline refuses to load (graph) and a scope view of the filesystem (workstreams).

## What GSD Writes (shapes to build and fake from)

All paths read this session from `~/.claude/gsd-core` (VERSION `1.19.0`). Real output of D-14's run is still to be generated by the first wave; where the sketch READMEs recorded a real run, that is noted.

- **Spikes** [CITED: workflows/spike.md create_manifest, README step; spike-wrap-up.md]: `MANIFEST.md` has `## Ideas` / `### {idea-key}` (paragraph, `**Requirements:**` bullets) and `## Spikes` table `| # | Idea | Name | Type | Validates | Verdict | Tags |`. README frontmatter `spike, idea, name, type, validates, verdict, related, tags`; headings What This Validates, Research, How to Run, What to Expect, Observability, Investigation Trail, Results (a real README adds free sections). Wrap-up: `# Spike Wrap-Up Summary`, `**Date:**`, `**Spikes processed:**`, `**Feature areas:**`, `**Skill output:**`, `## Processed Spikes` table, `## Key Findings`. Real tree read for shape (not copied): table rows out of id order, letter families `001a/b/c`, README verdict a bare keyword (`DEFERRED`) while the manifest cell is `KEYWORD (free text)`.
- **Seed** [CITED: workflows/plant-seed.md write-seed]: `.planning/seeds/SEED-{YYMMDD}-{3 chars}-{slug}.md` (older `SEED-001-slug.md`); frontmatter `id, status: dormant, planted, planted_during, trigger_when: when relevant, scope: unknown`; `# {SEED_ID}: {idea}`; sections as listed above; `scope` choices Small/Medium/Large; status values `dormant`, `active`, `triggered` [CITED: workflows/list-seeds.md]. `audit_acknowledged: {milestone, at, status}` [CITED: bin/lib/audit.cjs header].
- **Thread** [CITED: workflows/thread.md]: frontmatter `slug, title, status: open|in_progress|resolved, created, updated`; `# Thread: {description}`; `## Goal`, `## Context`, `## References`, `## Next Steps`; an older shape has `## Status: OPEN` in the body.
- **HANDOFF.json / .continue-here.md** [CITED: workflows/pause-work.md, templates/continue-here.md]: shapes in Pattern 5. Paths: phase `phases/XX-name/`, spike `spikes/SPIKE-NNN/`, sketch `sketches/`, deliberation `deliberations/`, else `.planning/`. The file is deleted on resume.
- **Session report / milestone summary** [CITED: workflows/session-report.md, milestone-summary.md]: `reports/SESSION_REPORT.md` or `YYYYMMDD-session-report.md`; `reports/MILESTONE_SUMMARY-v{V}.md`.
- **Forensics** [CITED: workflows/forensics.md Step 4]: `forensics/report-YYYYMMDD-HHMMSS.md`; the artifact table's cells are check and cross marks.
- **Onboarding** [CITED: workflows/onboard.md Step 3]: `onboarding/SUMMARY.md`.
- **Intel** [CITED: agents/gsd-intel-updater.md Intel File Schemas; bin/lib/intel.cjs]: `stack.json` (flat: `languages, frameworks, tools, build_system, test_framework, package_manager, content_formats`), `file-roles.json`, `api-map.json`, `dependency-graph.json` (`type` is production, development, peer or optional; `used_by[]`, `invocation`), `arch-decisions.json` (`entries.overview.pattern`, `data-flow.flow` read as "A -> B -> C", keyed `component:{Name}`), each `{_meta:{updated_at, version}, entries}`; `.last-refresh.json`. Ingest-docs family [CITED: agents/gsd-doc-synthesizer.md]: `SYNTHESIS.md`, `decisions.md` (`## {title}`, `- source:`, `- status: locked|proposed`), `requirements.md` (`## REQ-{slug}`), `constraints.md`, `context.md`, plus classifications; conflicts at `CONFLICTS_PATH`.
- **Graph** [CITED: bin/lib/graphify.cjs]: `graph.json` with `nodes` and `edges` or `links`, optional `hyperedges`, top-level `built_at_commit`; `.last-build-snapshot.json` (`nodes`, `edges`, `timestamp`); `.last-build-status.json` (`status` failed or running or ok, `exit_code`, `duration_ms`, `head_at_build`); artifacts `graph.json`, `graph.html`, `GRAPH_REPORT.md`; `graphify.graph_path` in config can point elsewhere.
- **Workstreams** [VERIFIED: bin/lib/workstream.cjs]: `workstream create` makes `workstreams/<slug>/STATE.md` (frontmatter `workstream`, `created`; body `**Status:** Not started`, `**Current Phase:** None`) and an empty `phases/`; migration moves `ROADMAP.md`, `STATE.md`, `REQUIREMENTS.md`, `phases`; `complete` archives to `milestones/ws-${name}-${today}` (suffixed `-1`, `-2` on a clash) and may revert to flat.

## Common Pitfalls

### Pitfall 1: Reading what must not be read
**What goes wrong:** spike scripts/outputs and the 22-47 MB graph end up parsed, indexed or rendered. **Why:** discovery classifies by extension and size only; `text` is read. **Avoid:** class `listed` for spike files (C4); the bounded service for the graph (Pattern 6). **Warning signs:** a spike `.sh` appears in search or in `/presentation` `structured`; a test that spies `fs.read` over `spikes/*/make_*.sh` sees a call.

### Pitfall 2: A kind-owned page hidden behind the file-class card
`DocumentRoute` picks the page from `fileClass` alone. The graph (and any `large` intel) never reaches the view. Add an explicit "kind owns a view" check (a small set exported next to `viewKindOf`).

### Pitfall 3: YAML coercion in READMEs and seeds
`spike: 010` is 8, `spike: 001` is 1 (verified, see Code Examples); `planted: 2026-03-04` is a `Date` serialised as `2026-03-04T00:00:00.000Z`; `verdict: A: b` throws. Always derive ids from folder names, dates by `slice(0, 10)` of the ISO string (UTC-safe), and keep the head-scan recovery for verdicts.

### Pitfall 4: Pseudo-XML tag sections swallow markdown
`<current_state>`, `<context>`, `<next_action>` on their own lines open a CommonMark HTML block that swallows the following headings (the exact trap `context.ts` documents). Extract tags from the untouched body, hand the renderer a copy with the tag-only lines blanked.

### Pitfall 5: Phases and plans counts, and statuses, are separate facts
Workstream STATE `completed_phases 4/8` beside `completed_plans 90/90` is real (sketch 056). Derive neither from the other; show the note only when every plan is done and fewer phases are marked. HANDOFF `status: paused` versus continue-here `blocked` is also real.

### Pitfall 6: Pointer is a hint, and names are untrusted
`active-workstream` content and the `/ws/:name` path segment are text from disk or the URL. Validate against the name regex and against the listed folder names; never join either into a filesystem path unchecked. A stale pointer produces no Active mark and the "names X, which is not in workstreams/" line.

### Pitfall 7: Tests pin today's decisions
`test/folders.test.ts` (intel/graph `.md` unknown, `workstreams` row unknown), `view-registry.test.ts` (31), `navbar-contract.test.ts` (exactly five links, gate order), `config-masking.test.ts` (HANDOFF `frontmatter`/`body`), `file-class.test.ts` (`config.json`, `HANDOFF.json`, `.continue-here.md` never internal), the dense golden and `serialize.test.ts`. Change each deliberately in the wave that causes it; do not touch `fixtures/dense/**` or `test/__golden__/dense.json` (frozen). Adding Lendshed files can shift pinned per-project totals: pin per file, run `npm run test:gate`.

### Pitfall 8: Fixture and text must pass the leak guard
Invented Lendshed content must avoid the banned whole words (Phase 10 Pitfall 10: includes `duet`, `ibis`); a made-up value in a pause file is an obvious placeholder; nothing from the D-14 scratch run or the cinedise-portal spikes is copied.

### Pitfall 9: Shared wiring files make parallel builds collide
Every view build edits `handlers/index.ts`, `manifest.ts`, `manifests.ts`, `kinds.ts`, `artifact-page.tsx`, `globals.css`, `docs/design-language.md`, `view-registry.test.ts`. Serialize view builds (Phase 9 ran 12 waves for this); the pure pieces (lifts, contexts, fixtures) can parallelize.

### Pitfall 10: Workstream first screen must not flash a flat dashboard
The first screen is chosen from the loaded presentation; until it loads the layout's "Opening {name}…" body shows. A flat project's tabs, header and drawer must be byte-identical (success criterion 4): backstop with a browser test on a flat fixture.

### Pitfall 11: Author-controlled keys in plain objects
Idea keys, verdict keywords, intel entry keys, workstream names, heading text: use `Map`, `Object.create(null)` or `Object.hasOwn` (Phase 9 IN-03).

### Pitfall 12: Mid-migration and flat-again projects
Root `ROADMAP.md`/`STATE.md` plus `workstreams/` is a real state (a migration that failed to move, or a hand edit). Treat the workstream folder as authoritative (the adapter hides root leftovers), show one `notice` naming the situation, never a second dashboard, never throw. After the last `workstream complete` the project is flat again.

## Code Examples

### Verified: gray-matter coercions that bite spikes, seeds and pause files
```javascript
// Run this session against the repo's gray-matter 4.0.3 with options {}:
// 'spike: 001'                          -> {"spike":1}
// 'spike: 010'                          -> {"spike":8}
// 'spike: 003b'                         -> {"spike":"003b"}
// 'last_updated: 2025-01-15T14:30:00Z'  -> {"last_updated":"2025-01-15T14:30:00.000Z"}
// 'planted: 2026-03-04'                 -> {"planted":"2026-03-04T00:00:00.000Z"}
// 'verdict: PARTIAL: Resolve relink'    -> THROWS "incomplete explicit mapping pair..."
// 'verdict: INVALIDATED (no spare seat)'-> {"verdict":"INVALIDATED (no spare seat)"}
```

### Verified: addresses the plan must reconcile (`addressOfPath`, run this session)
```
.planning/spikes/MANIFEST.md                          /spikes/manifest
.planning/spikes/003b-local-disk-staging/README.md    /spikes/003b-local-disk-staging/readme
.planning/spikes/CONVENTIONS.md                       /spikes/conventions
.planning/spikes/WRAP-UP-SUMMARY.md                   /spikes/wrap-up-summary
.planning/spikes/SPIKE-006/.continue-here.md          /spikes/SPIKE-006/.continue-here
.planning/seeds/SEED-260101-abc-foo.md                /seeds/SEED-260101-abc-foo
.planning/threads/db-schema.md                        /threads/db-schema
.planning/reports/MILESTONE_SUMMARY-v1.0.md           /reports/MILESTONE_SUMMARY-v1.0
.planning/forensics/report-20260101-120000.md         /forensics/report-20260101-120000
.planning/onboarding/SUMMARY.md                       /onboarding/SUMMARY
.planning/intel/stack.json                            /intel/stack.json
.planning/intel/SYNTHESIS.md   kind unknown today     /intel/SYNTHESIS.md
.planning/graphs/GRAPH_REPORT.md kind unknown today   /graphs/GRAPH_REPORT.md
.planning/HANDOFF.json                                /handoff
.planning/.continue-here.md                           /continue-here
.planning/phases/02-x/.continue-here.md (owner v1.1)  /v1.1/phase-2/continue-here
.planning/workstreams/payments/STATE.md               /file/workstreams/payments/STATE.md  (kind unknown)
.planning/milestones/ws-payments-2026-05-01/STATE.md  /file/milestones/ws-payments-2026-05-01/STATE.md
```
`parseRoutePath('/workstreams/payments/roadmap')` today is a plain `document` route (no scope concept).

### Skeleton: the scope adapter (names are proposals)
```typescript
// src/planning-fs/scoped-fs.ts: pure, read-only; never imports node:fs.
const MOVED = new Set(['ROADMAP.md', 'STATE.md', 'REQUIREMENTS.md', 'phases']);
export class ScopedPlanningFilesystem implements PlanningFilesystem {
  readonly capabilities = { watch: false, write: false };
  constructor(private readonly parent: PlanningFilesystem, private readonly ws: string /* already validated */) {}
  // `.planning/<x>` -> `.planning/workstreams/<ws>/<x>` when the workstream owns it, else the root file,
  // except the MOVED names and `workstreams/` itself, which never come from the root.
  private async resolve(rel: string): Promise<string | null> { /* exists() in ws dir first; MOVED at root => null */ }
  async read(rel: string) { const real = await this.resolve(rel); if (real === null) throw enoent(rel); return this.parent.read(real); }
  async exists(rel: string) { return (await this.resolve(rel)) !== null; }
  async list(relDir: string) { /* union of root and ws listing, ws wins, hide root `workstreams` and MOVED */ }
  realPathOf(virtual: string): string | null { /* the inverse, for copy-path */ }
}
```

### Skeleton: bounded graph scan (never builds the object graph)
```typescript
// Over a Uint8Array from readBytesWithin('.planning', path), capped. Tracks depth and in-string/escape
// state, finds the top-level `nodes` and `links`/`edges` arrays, slices each element at depth 2, and
// JSON.parse's one element at a time to take its `id` / `source` / `target`. Keeps a Map<id, degree>
// and returns counts + the 10 highest degrees. Oracle in the test: equals JSON.parse on a generated
// 20,000-node graph; plus growth test via test/helpers/growth.ts.
```

### Pause moved-on rule (pure)
```typescript
// phase named by the file => find Phase by number in presentation.milestones[*].phases
// moved on iff phase.roadmapComplete === true || phase.diskStatus === 'complete'
// source label = 'ROADMAP' | 'STATE' (whichever said so), date = STATE last_activity if present
```

## State of the Art

| Old approach | Current approach | When changed | Impact |
|--------------|------------------|--------------|--------|
| Active workstream: one `.planning/active-workstream` marker | Per-session pointer under `$TMPDIR/gsd-workstream-sessions/<project>/<session>` when a session key exists | GSD 1.19 (`active-workstream-store.cjs`; sketch 056 observed it) | Labelore can show Active only when the shared file exists |
| Intel as markdown | `gsd-intel-updater` writes five JSON files with `_meta` | current | Tiles read JSON; ingest-docs still writes markdown |
| Spike manifest flat `## Idea` | `## Ideas` / `### {idea-key}` with Idea column | #1700 | Handle both (migration shape) |

**Deprecated/outdated:** none beyond the above.

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | The first wave's D-14 scratch run will produce seed, thread, session report, milestone summary, forensics and onboarding output matching the writer templates above | What GSD Writes | The per-type sketches are drawn from templates, not real output; a real file differs and falls back to the generic page |
| A2 | `GRAPH_REPORT.md` carries counts and a "God Nodes" list that can be lifted (the sketch README recorded God Nodes, Import Cycles and Knowledge Gaps but no Summary format) | Pattern 6 | Tier 1 of the graph read yields nothing; the scan or "counts not read" takes over |
| A3 | A `readBytesWithin` read capped at about 96 MB is acceptable for the graph scan (memory held transiently) | Pattern 6 | If the user wants true chunked streaming, add an optional port method `readChunks?` |
| A4 | `listed` is the right name and the right place for the new file class | C4 | A smaller change (reuse `large`) is also valid |
| A5 | `built_at_commit` is a top-level key near the head of `graph.json` | Pattern 6 | The commits-behind figure needs the full scan or is omitted |
| A6 | One `ScopedPlanningFilesystem` + per-scope runtime is acceptable to the user in place of ARCHITECTURE.md's tag-and-split design, with virtual paths mapped for display | Pattern 7 | If rejected, the plan grows by discovery, assembly, 16 root-path sites and golden changes |
| A7 | Reaching Spikes and Indexes by drawer, search and the bare redirects (no header tab) matches the user's Claude's-Discretion intent | Pattern 4 | A header tab adds a sixth link and rewrites `navbar-contract.test.ts` |
| A8 | The `moved on` rule for a spike (manifest verdict) is a reasonable reading; no real example exists | Pattern 5 | A different rule changes only the context builder |
| A9 | `workstream` STATE `status` and `current_phase` follow GSD's own fallback chain (frontmatter, then bold body line) | Pattern 7 | A card shows "unknown" status |

## Open Questions

1. **Virtual paths under the scope adapter.**
   - Known: the adapter makes every existing builder work unchanged; scoped artifacts have virtual `.planning/ROADMAP.md` paths; copy-path takes `artifact.path`.
   - Unclear: whether Phase 13 search and the "In the source only" strips tolerate a scope-prefixed id.
   - Recommendation: add `realPath` on scoped `ArtifactDto`s, use it for copy-path and file facts, key search by scope plus path, record it for Phase 13. Confirm with the user before wave E (A6).
2. **Spike and Indexes addresses (C1).** Recommendation: keep Phase 7 keys, add redirect-only `/spikes` and `/indexes`; no `/indexes/<file>` alias unless the user asks.
3. **`listed` versus `large` (C4).** Recommendation: `listed`, with the touch list in C4.
4. **Source mode for intel/graph in Phase 12.** Phase 11 sends no raw JSON; whether Phase 12's Source mode may fetch it on explicit request is Phase 12's call. Record it.
5. **Spike "work has moved on" rule.** Stated in Pattern 5; test it on a made-up nested spike pause.
6. **Whether any value-looking string in a pause or seed can reach search or the index** (UI-SPEC open item 4): record as a follow-up, not scope.
7. **Mid-migration treatment (CONTEXT discretion).** Recommendation in Pitfall 12.
8. **Session report and milestone summary: one frame or two.** Decided by their sketch; the composer can serve both from `report`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | everything | yes | 22.23.1 (`engines >=22.18.0`; type stripping runs `.ts` directly) | none needed |
| git | commits behind, D-14 scratch copies | yes | `/usr/bin/git` | commits-behind omitted on failure |
| GSD CLI (`gsd-tools.cjs`) | D-14 real-shape run (`workstream`, `pause`, `intel`, `graphify`, `list-seeds`) | yes | gsd-core 1.19.0 | hand-fill from templates (made-up examples) |
| `graphify` CLI | D-14 graph run | no (`command -v graphify` empty; `graphify status` reports "not enabled") | — | generate a synthetic graph in the test; record a real one only if the user installs it |
| System Chrome | screenshot checks | yes | `/usr/bin/google-chrome` | none (Playwright's bundled browser is not installed) |
| `systemctl --user` service `labelore` | restart after every change | yes (active) | — | — |
| Context7 / web research providers | not needed | all off in `.planning/config.json` | — | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** `graphify` CLI (see above).

## Security Domain

`security_enforcement` is enabled (ASVS level 1).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication / V3 Session | no | Local, read-only; the registry request guard is unchanged and covers the new `/ws/:name` mount |
| V4 Access Control | yes | A workstream name from the URL or `active-workstream` is checked against the listed folder names and the GSD name regex before any path is built; scoped runtimes resolve only listed names, else 404 |
| V5 Input Validation | yes | All document text goes through existing guarded parsers; lifts are bounded; JSON through `tryParseJson`; markdown through the existing sanitized renderer; hub and list bounds enforced server-side |
| V6 Cryptography | no | — |
| V12 Files and Resources | yes | `listed`/`large` files never read; graph read capped and through `readBytesWithin('.planning', …)` confinement; `PathEscapeError` handling as in `file-bytes.ts`; the scope adapter never writes and never leaves the project root |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via workstream name (`../`, `..`, encoded) | Tampering / Info disclosure | Regex `^[a-zA-Z0-9][a-zA-Z0-9._-]*$` plus exact membership in the directory listing; reject any name containing `..` (GSD's `hasInvalidPathSegment`) |
| Oversized JSON or hostile graph (DoS) | Denial of service | Byte cap before scan, element and hub bounds, growth test on 20,000 nodes, `jsonValue` cycle-safe serialisation |
| Prototype pollution via intel/HANDOFF keys | Tampering | `tryParseJson` stripping; `Map`/`Object.hasOwn` for author keys |
| Secret-looking values in pause, seed, intel notes | Info disclosure | Shown as written per UI-SPEC rule 8, with the shared "Value not shown" mark where a name sits beside `KEY=…`; value reaching search is recorded as follow-up (Open item 6) |
| XSS through free-text verdicts, next actions, context notes | Tampering | Inline tokenizer and sanitized renderer only; no `dangerouslySetInnerHTML`; `raw-html-guard.test.ts` stays green |
| Running or rendering a spike script | Elevation / Tampering | Class `listed`; no route serves its bytes; copy-command copies text, runs nothing |
| Crafted `active-workstream` content | Spoofing | Treated as a hint matched against listed names only |

## Sources

### Primary (HIGH confidence)
- Repo files read this session: `src/planning-repo/{folders,discovery,assemble,registry,file-class,types,snapshot,frontmatter}.ts`, `handlers/{index,json-config,generic,codebase,context,frontmatter-only,markdown-sections}.ts`, `src/presentation/{routes,reserved,route-table,project-map-state,codebase-map,drawer}.ts`, `src/server/{project-api,project-runtime,project-presentation,file-bytes,remote-source,commit-times}.ts`, `src/web/{app-router,route-dispatch,nav,project-path,query-keys,api}.ts*`, `src/web/pages/{project-layout,document-route,research-page}.tsx`, `src/web/components/{app-shell,copy-path-button}.tsx`, `src/web/views/{kinds,manifest,manifests}.ts`, `src/domain/model.ts`, `src/planning-fs/types.ts`, tests `folders`, `view-registry`, `made-up-examples`, `config-masking`, helpers `made-up-examples.ts`, `fixture-roots.ts`.
- Executed this session: `addressOfPath`/`kindOfPath`/`parseRoutePath` probes, gray-matter coercion probe, `gsd-tools query package-legitimacy check`, `npm view`.
- GSD source in `~/.claude/gsd-core` (VERSION 1.19.0): `bin/lib/{workstream,workstream-name-policy,workstream-inventory,active-workstream-store,planning-workspace,graphify,intel,onboard-projection,audit}.cjs`, `workflows/{pause-work,plant-seed,list-seeds,thread,spike,spike-wrap-up,session-report,milestone-summary,forensics,onboard}.md`, `templates/continue-here.md`; `~/.claude/agents/{gsd-intel-updater,gsd-doc-synthesizer}.md`.
- `.planning/sketches/{053,054,055,056}/README.md` (winners and recorded real shapes), `11-CONTEXT.md`, `11-UI-SPEC.md`, `.planning/research/ARCHITECTURE.md` (workstream scope), `10-RESEARCH.md` (patterns and pitfalls carried forward).
- Shape-only read of `~/codebases/cinedise-portal/.planning/spikes/` (manifest rows, README frontmatter, section names, file listing); nothing copied.

### Secondary (MEDIUM confidence)
- `github.com/juanjoDiaz/streamparser-json` README (license MIT; package split into `@streamparser/json` and `@streamparser/json-node`); API options not confirmed.

### Tertiary (LOW confidence)
- Writer output for forensics, session report, seed, thread and ingest-docs intel is taken from templates, not from a real run (A1).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, nothing new to install; every seam read in this repo.
- Architecture: HIGH for per-type views (Phase 10 proved the pipeline); MEDIUM for the scope adapter (design not yet exercised; virtual-path cost is open).
- Pitfalls: HIGH for the verified ones (coercions, addresses, file class, `projectMapState`, pinned tests); MEDIUM for the unobserved writer shapes.

**Research date:** 2026-11-06
**Valid until:** 2026-12-06 (GSD 1.19 writers are the moving part; re-read `workstream.cjs` and the writers if gsd-core updates before planning)

# Labelore

## What This Is

Labelore is a read-only web dashboard that makes a GSD `.planning/` directory legible. It lives in its
own repository, is started with a path argument pointing at any GSD-managed project, and renders that
project's planning state: where the work stands, what every phase and plan contains, and where the
accumulated decisions, learnings, and review findings are buried. It is a personal tool, built to
replace opening `.planning/` files by hand in an editor.

## Core Value

Open the dashboard on a GSD project and immediately know where the work stands and where any planning
artifact lives — without reading a single file by hand.

## Current State

**v2.0 Fully Labelled shipped 2026-10-25.** A quick-task milestone: no roadmap phases, 40
directory and 90 inline quick tasks, 490 commits. Every artifact type Labelore meets now opens into
a page built from a winning sketch: CONTEXT, RESEARCH, PATTERNS, UI-SPEC, UAT, VALIDATION, SECURITY,
UI-REVIEW, PLAN, SUMMARY, VERIFICATION, REVIEW, LEARNINGS, debug sessions, todos and notes. The
dashboard, the roadmap's milestone history and the planning-files drawer were all redesigned, and
Labelore can open a remote project over ssh. The record is in `milestones/v2.0-*` and
`MILESTONES.md`; the release is tagged `v2.0` (package 2.0.0).

**v1.1 Legible Documents shipped 2026-09-21.** One phase (5), 6 plans, 11/11 v1.1 requirements
satisfied; Phase 5 verified `passed`, UAT 4/4, security `threats_open: 0`, UI review 22/24. Every
planning document type now opens into a view built for it, behind a client-side view registry
keyed on a granularised `kind` and speaking one written-down, test-enforced design language. The
full record is in `milestones/v1.1-*` and `MILESTONES.md`.

**v1.0 MVP shipped 2026-09-10.** Four phases, 45/45 v1 requirements, milestone audit `passed`. The
record is in `milestones/v1.0-*`.

The shipped app is a Vite 8 + React 19 SPA served by a Hono 4 Node server, started with
`npm run dev -- /path/to/project` (or an `ssh://`/`sftp://` target, mirrored read-only over ssh). It contains:

- a headless read layer behind a swappable filesystem seam
- a sanitized, PLAN-aware markdown pipeline (unified/remark/rehype, Shiki, client-side Mermaid)
- per-type document views for all 18 registered kinds, most rebuilt from sketches in v2.0, with a structural fallback for the rest
- shared diagram and directory-tree figures (lanes figure, lifted diagram, clean tree) for any document
- a documented design language (`docs/design-language.md`) enforced by a class-vocabulary test
- MiniSearch full-text search
- a two-column planning-files drawer (it replaced the v1.0 tree navigator in v2.0)
- Sketches and project Research pages
- requirements traceability
- a single `refresh()` seam with an atomic derived-view swap

It has about 158k lines of TypeScript/TSX/CSS (src and tests) and 3,361 tests across 176 files.
After the post-close test fixes on 2026-10-25, one test fails: a security-register timing test that
missed its 250 ms limit by a few milliseconds. The note, todo and debug corpus tests still walk
every project's live `.planning/` tree on this machine, so they can break whenever another project
changes.

## Current Milestone: v2.1 Wayfinding

**Goal:** Every file GSD can write opens into a designed page, Labelore moves between projects, and
URLs read like what they point to, with search that is quicker to use and easier to read.

**Target features:**
- Sketch-built pages for every GSD file type that still lacks one: the root documents (project,
  roadmap, requirements, state, milestones, retrospective, windows), milestone audit, review
  disposition, coverage, review fix, spec, AI spec, eval review, user setup, browser check,
  cross-AI reviews, the 7 codebase-map documents, spikes, seeds, threads, reports, intel, graphs,
  forensics, workstreams, onboarding, handoff and continue-here. Discussion log and human UAT keep
  their current pages.
- Project settings: `config.json` becomes the project's read-only settings, reachable from anywhere
  in the app, not a document page.
- A redesigned Source mode.
- Codebase-only projects (`.planning/codebase/` and nothing else, as `/gsd-map-codebase` leaves
  them): the first screen is a "mapped, not started" overview built from the codebase documents.
- Test health: the suite passes reliably, and corpus tests read fixtures copied into Labelore
  instead of other projects' live `.planning/` trees.
- The security regression tests v1.1 promised, and the v1.1 UI-review polish items.
- Search grouped by milestone then phase, filters for phase, file type and requirement, and a
  redesigned look.
- A Cmd-K quick-jump palette over the search index.
- Clean, readable URLs: `/labelore/v1.1/phase-5/plan-03`, `/labelore/quick/261024-qhq/summary`,
  `/labelore/codebase/architecture`.
- Project switching: several paths at start, scanning a folder such as `~/Work`, remembering opened
  projects in Labelore's own settings, and adding a path or `ssh://` target from the switcher.

## Requirements

### Validated

**Situational awareness**

- ✓ Current milestone, phase, status, and progress from `STATE.md`, with formal roadmap completion
  and observed disk state as two separate signals — v1.0
- ✓ What is next, what is blocked, and what awaits human verification — v1.0
- ✓ Roadmap view: phases, goals, success criteria, mapped requirements, plans by wave, dependency
  flow — v1.0
- ✓ Milestone history and archived milestones, visually distinct from the active one — v1.0

**Reading**

- ✓ Markdown renders properly and safely: tables, code, task lists, and PLAN wrapper tags as
  structure, with frontmatter as structured panels — v1.0
- ✓ `PLAN.md` and its `SUMMARY.md` read together, with `must_haves.truths` matched against
  coverage — v1.0

**Findability**

- ✓ Full-text search across every file in `.planning/`, grouped by phase and artifact type — v1.0
- ✓ Navigable browser of the complete `.planning/` tree — v1.0
- ✓ Clickable cross-references between requirements, phases, plans, summaries, and roadmap
  entries — v1.0
- ✓ First-class requirements traceability view — v1.0

**Portability and degradation**

- ✓ Arbitrary GSD project shapes render without hardcoded phase, milestone, or config
  assumptions — v1.0
- ✓ Missing optional artifacts and directories produce honest empty states — v1.0
- ✓ Unknown artifact types stay navigable and render through the generic document reader — v1.0
- ✓ Invalid targets name the problem and the exact path checked — v1.0
- ✓ Every valid view states its snapshot age, and Refresh re-reads through one atomic seam — v1.0
- ✓ Light and dark themes keep the studio-portal visual language across sparse, dense, degraded,
  and invalid states — v1.0

**Document legibility**

- ✓ Per-type document views for all 18 registered kinds behind a client-side view registry keyed
  on a granularised `kind`; View is the page, Source is the escape hatch; unregistered kinds get a
  speculative structural read behind a quiet `Unrecognized type` marker — v1.1
- ✓ The design language written down in `docs/design-language.md` and enforced by the
  class-vocabulary test — v1.1
- ✓ READ-07: outline tracks reading position via one IntersectionObserver; below 58rem it becomes
  a sticky, keyboard-operable disclosure — v1.1
- ✓ BACK-02: `D-XX` / `WR-XX` mentions resolve phase-local-first-then-corpus-unique and preview
  before navigating — v1.1
- ✓ Each artifact type's surface perfected against the view registry, one sketch and one quick
  task per type (CONTEXT, RESEARCH, PATTERNS, UI-SPEC, UAT, VALIDATION, SECURITY, UI-REVIEW,
  PLAN, SUMMARY, VERIFICATION, REVIEW, LEARNINGS, debug, todos, notes) — v2.0
- ✓ Diagrams and directory trees in any document draw as figures, decided by one shared
  detector — v2.0

**Navigation and dashboard**

- ✓ Dashboard project head and body rebuilt from sketches 025 and 026, with pace timing from git
  commit gaps — v2.0
- ✓ Roadmap milestone history with retrospectives; traceability covers previous milestones — v2.0
- ✓ Two-column planning-files drawer (places, then the chosen place's files; quick tasks grouped by
  milestone) — v2.0
- ✓ Sketches page and project Research page — v2.0

**Portability**

- ✓ Remote targets: `ssh://` / `sftp://` paths mirror the remote `.planning/` read-only over the
  system ssh client — v2.0

### Active

<!-- v2.1 Wayfinding scope, defined 2026-10-25. REQUIREMENTS.md holds the REQ-IDs. -->

**Document legibility**

- [ ] Sketch-built pages for every GSD file type that lacks one (root documents, milestone audit,
      review disposition, coverage, review fix, spec, AI spec, eval review, user setup, browser
      check, cross-AI reviews, codebase map, spikes, seeds, threads, reports, intel, graphs,
      forensics, workstreams, onboarding, handoff, continue-here)
- [ ] `config.json` shown as read-only project settings reachable from anywhere in the app
- [ ] Redesigned Source mode
- [ ] Codebase-only projects open on a "mapped, not started" overview

**Test health and v1.1 leftovers**

- [ ] The suite passes reliably; corpus tests read fixtures copied into `test/`, not other
      projects' live `.planning/` trees
- [ ] Regression tests the Phase 5 threat register promised: ReDoS timing tests for the
      section-projection and mention scanners, a standing assertion that `blocks.tsx` stays free of
      `dangerouslySetInnerHTML`, and a View-mode outline-entry cap (05-SECURITY audit notes 1–3)
- [ ] UI-review polish: opaque narrow outline trigger, depth markers on the plan task index,
      primary-coloured trigger chevron (05-UI-REVIEW), each re-checked against the v2.0 rebuilds

**Findability**

- [ ] FIND-06: Search filters by phase, file type and requirement
- [ ] Search results grouped by milestone, then phase, with a redesigned look
- [ ] NAV-08: Command palette (Cmd-K) quick-jump that reuses the search index
- [ ] Clean, readable URLs in place of today's encoded tokens

**Platform**

- [ ] PLAT-02: Multi-project switching — several paths at start, folder scan, remembered projects,
      add a path or `ssh://` target from the switcher

**Later candidates — not in v2.1**

- [ ] BACK-01: Backlinks panel on requirements, decisions, and phases
- [ ] READ-08: Fuller plan-vs-outcome pairing with every deviation shown against its task
- [ ] DASH-05: Static recent-activity strip from `STATE.md`'s decision log and quick-task table
- [ ] PLAT-01: Live file-watching with push updates (chokidar + Hono `streamSSE` →
      `queryClient.invalidateQueries()`)
- [ ] PLAT-03: Driving GSD commands from the UI
- [ ] PLAT-04: Adopt `gsd-tools query` for structural facts, if the independent parser proves costly
      to maintain

### Out of Scope

- **Writing to `.planning/`** — Labelore is strictly read-only. All mutation stays inside Claude Code
  and the GSD slash commands, which own the invariants of these files. A viewer that writes can
  corrupt planning state; a viewer that cannot write can never do harm. *(Still valid after v1.0.
  PLAT-03 would revisit it deliberately, not by drift.)*
- **Authentication, hosting, multi-user access** — it runs locally for one person on their own machine.
- **Any coupling to studio-portal** — studio-portal is the reference `.planning/` directory used to
  develop against and the source of the visual theme. Nothing else is shared: no code, no API, no data,
  no deployment. The dependency is one-directional and read-only.
- **Editing, authoring, or scaffolding GSD artifacts** — that is what GSD itself is for.
- **Publishing, packaging, or distribution** — this is a personal tool, not a released product.
  `package.json` deliberately declares no `bin` field.

*Moved out of this list into Active as candidates:* driving GSD commands from the UI (PLAT-03),
multi-project registry (PLAT-02), and live file-watching (PLAT-01). They were v1 exclusions, not
permanent ones.

## Context

**The problem being solved.** Three specific frustrations drove this, all confirmed during questioning,
and v1.0 addresses all three:

1. *Where am I overall* — cross-phase and cross-milestone progress meant reading `STATE.md` and
   `ROADMAP.md` by hand. → the dashboard and roadmap views.
2. *Finding buried artifacts* — knowledge written across hundreds of files under `phases/` but not
   reachable. → search, the tree navigator, traceability, and clickable references.
3. *Reviewing plans and output* — reading `PLAN.md` and `SUMMARY.md` in a terminal is painful. → the
   PLAN-aware reader and plan–summary pairing.

**The reference project.** `~/studio-portal` is the development reference: a mature GSD project with two
milestones, 9 phases, and archived milestone history. v1.0 was built against it but proven against
three synthetic fixtures (`sparse-empty`, `sparse-started`, `dense`) plus stripped and corrupted
variants, so it is not hardcoded to studio-portal's shape.

**What GSD actually produces:**

- *Root documents*: `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, `MILESTONES.md`,
  `RETROSPECTIVE.md`, plus project-specific notes.
- *Machine-readable state*: `STATE.md` YAML frontmatter, `config.json` (read as an open map),
  `HANDOFF.json`, and `estimation-calibration.json`.
- *Phase directories*: `phases/NN-slug/` with up to about 15 artifact types. Handlers dispatch on
  filename+location into a granularised `kind`; all 18 registered kinds have a view manifest, and
  anything else gets a structural read behind an `Unrecognized type` marker.
- *Other trees*: `quick/`, `milestones/`, `research/`, `ui-reviews/`.
- *Beyond `.planning/`*: research confirmed that GSD's skills, agents, and hooks hold no state worth
  showing in the dashboard, which resolves the open question from project start.

**Theme source.** studio-portal's oklch tokens, shadcn `base-sera` over `@base-ui/react`, lucide icons,
and squared corners were copied. The codebase was not.

**Known issues / debt.** At v1.1 close: the 05-SECURITY threat register promised three regression
tests that were not written (ReDoS timing for the section-projection and mention scanners, a
standing `dangerouslySetInnerHTML` guard on `blocks.tsx`, and a View-mode outline cap) — all listed
in Active. R-02-01 from v1.0 stays an accepted medium risk.

**Environment.** Linux, Node 22.23.1 (`engines.node >=22.18.0`). Built against GSD core 1.11.0;
1.13.0 installed at v1.0 close, 1.14.0 at v1.1 close.

## Constraints

- **Deployment**: Clone-and-run from its own repo at `~/labelore`, targeted with a path argument at
  startup — Not a per-project install, not a published CLI, not a hosted service. Keeps setup trivial.
- **Access**: Read-only filesystem access to the target `.planning/` — The tool must be incapable of
  damaging planning state it does not own. Enforced: `local-fs.ts` is the sole `src/` importer of
  `node:fs`, pinned by a test gate.
- **Compatibility**: Must read `.planning/` as produced by `@opengsd/gsd-core` — GSD's artifact set
  evolves, so unknown files must degrade rather than break.
- **Design**: Visual language inherited from studio-portal — oklch token palette, shadcn `base-sera`,
  `@base-ui/react`, lucide, squared corners, light and dark.
- **Dependencies**: No runtime, code, or data dependency on studio-portal — It is a reference and a
  theme source only.
- **Tech stack**: Resolved — Vite 8 + React 19 + Hono 4, `react-router` (library mode), TanStack Query,
  Tailwind v4. TypeScript is pinned to 5.9.3 because TS7 is outside `typescript-eslint@8.67.0`'s peer
  range.
- **Forward compatibility**: The `.planning/` reader sits behind a boundary that admits multi-project
  targeting, a file watcher, and eventually write-back. None of those shipped in v1.0, but the seam is
  built and tested.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Read-only in v1; no writes to `.planning/` | GSD owns these files' invariants. A viewer that cannot write cannot corrupt planning state. Driving GSD is a named future direction, not v1 scope. | ✓ Good — read-only boundary with containment checks; `node:fs` confined to `local-fs.ts` |
| One project per run, targeted by path argument | Simplest thing that satisfies "works on any GSD project" without registry, discovery, or persistence machinery. | ✓ Good — absolute, relative, `~`-prefixed, and symlinked targets verified; invalid targets get a named-path screen |
| Own repository, clone-and-run | Chosen over `npx`/global CLI: no packaging or distribution burden for a personal tool. | ✓ Good — `npm run dev -- <path>`; no `bin` field |
| Findability via full-text search *and* navigation/cross-linking | Chosen over curated per-type aggregate pages. Search covers the unknown-unknowns; navigation covers walking a known structure. | ✓ Good — exact-token search, grouped snippets, complete tree, traceability |
| studio-portal is a reference and theme source, nothing more | Explicit user instruction. Hardcoding to studio-portal would defeat the point. | ✓ Good — sparse, dense, stripped, malformed, and invalid targets verified in both themes |
| Live file-watching deferred, read layer built to allow it | Watching is real infrastructure. Deferring it is cheap only if the read layer is a seam from day one. | ✓ Good — single `refresh()` seam plus atomic derived-view swap; PLAT-01 is now a candidate |
| Tech stack deferred to research | A local read-only tool has different pressures than studio-portal's networked app. | ✓ Good — research chose Vite + React + Hono over a Next.js custom server |
| Vite + React SPA + Hono over Next.js | A CLI path argument and a handful of routes fit a thin Node server; Next's custom-server mode fights the framework. | ✓ Good — small API surface, `streamSSE` available for PLAT-01 |
| Built for one user, no distribution concerns | Removes onboarding, docs, version-compatibility, and contribution surface from scope. Portability across GSD projects is still required. | ✓ Good |
| Keep the domain model independent of filesystem and parser modules | Resolved references and mention indexes are shared contracts; zero-I/O domain types prevent dependency inversion. | ✓ Good — one-way `planning-fs → planning-repo → domain` boundary |
| Treat dangling references as data, not warnings | GSD prose routinely mentions identifiers that are not definitions. Warning on each would bury real parse failures. | ✓ Good — `{raw, resolved: null}`, warnings stay high-signal |
| Sanitize right after `rehype-raw`, before slug/link/Shiki plugins | Sanitizing after Shiki strips its highlighting. Sanitizing before trusted-markup injection keeps both safety and styling. | ✓ Good |
| Keep disagreeing signals separate, never merged (roadmap vs disk, checkbox vs phase status) | A merged verdict hides exactly the disagreements a user needs to see. | ✓ Good — applied in the dashboard (D-02) and traceability |
| One captured derived-views bundle per request | Prevents a concurrent refresh from mixing pre- and post-refresh data in a single response. | ✓ Good — closed D-05; regression-tested |
| In-memory MiniSearch, rebuilt on start, non-blocking | A few hundred files index in well under a second; incremental `add`/`remove` fits a future watcher. | ✓ Good — revisit only if corpus size grows substantially |
| Pin TypeScript 5.9.3 rather than TS7 | TS7 is outside `typescript-eslint@8.67.0`'s peer range. | ⚠️ Revisit — when `typescript-eslint` supports TS7 |
| The per-type view is the page; Source is the escape hatch (D-01) | Promoting structure into a secondary panel would leave the generic reader as the primary surface — the thing v1.1 exists to replace. | ✓ Good — one render path, proven across 18 kinds |
| Extraction keys on where structure lives, not on document purpose | VERIFICATION and UAT share a purpose but store structure in different places; a purpose taxonomy would still need both paths. | ✓ Good — 3 strategies + 18 manifests, no template tier |
| Design language is a documented allowlist enforced by a test, not a lint rule | The vocabulary is small and stable; a test that reads the doc's own table keeps the doc and the code from drifting apart. | ✓ Good — every Phase 5 manifest was authored against it |
| A milestone made of quick tasks, no roadmap phases (v2.0) | Per-type polish was many small, independent, design-led changes; a phase per type would have been ceremony. | ✓ Good — 40 directory quick tasks shipped; the cost is no phase verification or requirements trail at close |
| Sketch first, then build the winner, then screenshot against the sketch | Design choices were made on throwaway HTML, so builds had a concrete target and a visual check. | ✓ Good — the loop behind every v2.0 view |
| Phase 5 ships the seam, not the polish | Each type's surface gets its own quick task against the registry; folding all 18 into the phase would have made it a restyle marathon with no shared contract. | ✓ Good — recorded as a deferred follow-up in 05-UAT, carried into Active |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-25 after starting milestone v2.1 Wayfinding*

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

**v1.0 MVP shipped 2026-09-10.** All four phases are complete, 45/45 v1 requirements are satisfied,
and the milestone audit `passed` with zero open tech debt. One accepted, non-blocking risk is on
record (R-02-01). The full record is in `milestones/v1.0-*` and `MILESTONES.md`.

The shipped app is a Vite 8 + React 19 SPA served by a Hono 4 Node server, started with
`npm run dev -- /path/to/project`. It contains:

- a headless read layer behind a swappable filesystem seam
- a sanitized, PLAN-aware markdown pipeline (unified/remark/rehype, Shiki, client-side Mermaid)
- MiniSearch full-text search
- a tree navigator
- requirements traceability
- a single `refresh()` seam with an atomic derived-view swap

It has about 24.4k lines of TypeScript/TSX/CSS and 590 tests.

## Next Milestone Goals

Not yet defined. `/gsd-new-milestone` will choose scope. The candidates carried forward are the v2
requirements listed under Active below. The strongest signal is PLAT-01 (live file-watching),
because the read layer, the `refresh()` seam, and the TanStack Query fetch layer were all built to
admit it without restructuring.

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

### Active

<!-- Candidates for the next milestone, carried from v1.0's v2 requirements. Each is a hypothesis until /gsd-new-milestone scopes it. -->

**Findability enhancements**

- [ ] BACK-01: Backlinks panel on requirements, decisions, and phases — "what else references this"
- [ ] BACK-02: Clickable `D-XX` decision and `WR-XX` warning mentions, surfacing NAV-07's index in the UI
- [ ] FIND-06: Faceted search — filter by requirement ID, phase, or artifact type
- [ ] NAV-08: Command palette (Cmd-K) quick-jump that reuses the search index

**Reading enhancements**

- [ ] READ-07: Sticky table of contents on long documents
- [ ] READ-08: Fuller plan-vs-outcome pairing, with every documented deviation shown against the task
      it departed from

**Dashboard enhancements**

- [ ] DASH-05: Static recent-activity strip from `STATE.md`'s decision log and quick-task table

**Platform directions**

- [ ] PLAT-01: Live file-watching with push updates (chokidar + Hono `streamSSE` →
      `queryClient.invalidateQueries()`)
- [ ] PLAT-02: Multi-project registry and switcher
- [ ] PLAT-03: Driving GSD commands from the UI
- [ ] PLAT-04: Adopt `gsd-tools query` for structural facts, if the independent parser proves costly to
      maintain

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
- *Phase directories*: `phases/NN-slug/` with up to about 15 artifact types. The ten recognized types
  get typed handlers; everything else falls through to the generic markdown handler.
- *Other trees*: `quick/`, `milestones/`, `research/`, `ui-reviews/`.
- *Beyond `.planning/`*: research confirmed that GSD's skills, agents, and hooks hold no state worth
  showing in the dashboard, which resolves the open question from project start.

**Theme source.** studio-portal's oklch tokens, shadcn `base-sera` over `@base-ui/react`, lucide icons,
and squared corners were copied. The codebase was not.

**Known issues / debt.** No open tech debt at v1.0 close. R-02-01, the 02-06 gate closed on a human
decision, stays an accepted medium risk, mitigated by the approved 02-13 → 02-17 gate chain.

**Environment.** Linux, Node 22.23.1 (`engines.node >=22.18.0`). Built against GSD core 1.11.0;
1.13.0 installed at v1.0 close.

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
*Last updated: 2026-09-10 after v1.0 milestone*

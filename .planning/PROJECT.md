# GSD Lore

## What This Is

GSD Lore is a read-only web dashboard that makes a GSD `.planning/` directory legible. It lives in its
own repository, is started with a path argument pointing at any GSD-managed project, and renders that
project's planning state: where the work stands, what every phase and plan contains, and where the
accumulated decisions, learnings, and review findings are buried. It is a personal tool, built to
replace opening `.planning/` files by hand in an editor.

## Core Value

Open the dashboard on a GSD project and immediately know where the work stands and where any planning
artifact lives — without reading a single file by hand.

## Requirements

### Validated

- ✓ Full-text search across every file in `.planning/`, grouped by phase and artifact type — Phase 3
- ✓ Navigable browser of the complete `.planning/` tree — Phase 3
- ✓ Clickable cross-references between requirements, phases, plans, summaries, and roadmap entries — Phase 3
- ✓ First-class requirements traceability view — Phase 3
- ✓ Dashboard renders arbitrary GSD project shapes without hardcoded phase, milestone, or config assumptions — Phase 4
- ✓ Missing optional artifacts and directories produce honest empty states — Phase 4
- ✓ Unknown artifact types remain navigable and render through the generic document reader — Phase 4
- ✓ Invalid targets name the problem and exact checked path — Phase 4
- ✓ Every valid view states snapshot age and Refresh re-reads through one atomic seam — Phase 4
- ✓ Light and dark themes preserve the studio-portal visual language across sparse, dense, degraded, and invalid states — Phase 4

### Active

<!-- Greenfield: every Active requirement is a hypothesis until shipped and validated. -->

**Situational awareness — "where am I?"**

- [ ] Surfaces current milestone, current phase, status, and progress from `STATE.md` frontmatter
- [ ] Shows what is next, what is blocked, and what is awaiting human verification
- [ ] Renders the roadmap: phases, their goals, success criteria, plan lists, wave structure, and
      completion state
- [ ] Shows milestone history and archived milestones as distinct from the active one

**Reading — "render this properly"**

- [ ] Markdown artifacts render properly — tables, code blocks, checklists, and YAML frontmatter
      presented as structured data rather than raw text
- [ ] `PLAN.md` and its paired `SUMMARY.md` are readable together rather than as two unrelated files

### Out of Scope

- **Writing to `.planning/`** — v1 is strictly read-only. All mutation stays inside Claude Code and the
  GSD slash commands, which own the invariants of these files. A viewer that writes can corrupt planning
  state; a viewer that cannot write can never do harm.
- **Driving GSD commands from the UI** — an acknowledged future direction, deliberately not v1. It turns
  the project from a viewer into a control surface and multiplies the scope.
- **Multi-project registry or switcher** — v1 reads one project per run, chosen at startup. The
  portfolio view is a future direction the data layer should not preclude.
- **Live file-watching and push updates** — deferred to v2. The read layer must be built so a watcher
  can be added without restructuring, but v1 reads on load and on explicit refresh.
- **Authentication, hosting, multi-user access** — it runs locally for one person on their own machine.
- **Any coupling to studio-portal** — studio-portal is the reference `.planning/` directory used to
  develop against and the source of the visual theme. Nothing else is shared: no code, no API, no data,
  no deployment. The dependency is one-directional and read-only.
- **Editing, authoring, or scaffolding GSD artifacts** — that is what GSD itself is for.
- **Publishing, packaging, or distribution** — this is a personal tool, not a released product. If that
  changes it becomes a later milestone, not a v1 constraint.

## Context

**The problem being solved.** Three specific frustrations drove this, all confirmed during questioning:

1. *Where am I overall* — cross-phase and cross-milestone progress currently requires reading `STATE.md`
   and `ROADMAP.md` by hand and holding the picture in your head.
2. *Finding buried artifacts* — the knowledge is written down, across hundreds of files under `phases/`
   (decisions, learnings, pitfalls, review findings), but it is not reachable.
3. *Reviewing plans and output* — reading `PLAN.md` and `SUMMARY.md` in a terminal is painful; they
   deserve proper rendering.

**The reference project.** `~/studio-portal` is the development reference — a mature GSD project with two
milestones (v1.0 shipped, v2.0 in progress), 9 phases, 46 + 23 plans, and archived milestone history. Its
`.planning/` exercises nearly the whole GSD surface, which makes it a good target to build against and a
poor target to hardcode for.

**What GSD actually produces** (surveyed from studio-portal and `gsd-core` 1.11.0's templates — the
research stage should verify and extend this):

- *Root documents*: `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, `MILESTONES.md`,
  `RETROSPECTIVE.md`, plus project-specific notes.
- *Machine-readable state*: `STATE.md` carries YAML frontmatter with `milestone`, `current_phase`,
  `status`, `last_activity`, and a `progress` block (`total_phases`, `completed_phases`, `total_plans`,
  `completed_plans`, `percent`). `config.json` holds roughly sixty workflow toggles. `HANDOFF.json` and
  `estimation-calibration.json` carry further structured data. These are the primary structured inputs;
  most of the rest is markdown.
- *Phase directories*: `phases/NN-slug/` containing up to ~15 artifact types — `NN-MM-PLAN.md` and
  `NN-MM-SUMMARY.md` per plan, plus `CONTEXT`, `RESEARCH`, `DISCUSSION-LOG`, `UAT`, `VERIFICATION`,
  `REVIEW`, `REVIEW-FIX`, `SECURITY`, `VALIDATION`, `UI-SPEC`, `LEARNINGS`, `PATTERNS`, and ad-hoc
  phase-specific documents.
- *Other trees*: `quick/<timestamp-slug>/` for one-off tasks, `milestones/` for archived roadmaps,
  requirements, audits, and whole archived phase trees, `research/` for project-level research,
  `ui-reviews/`.
- *Beyond `.planning/`*: GSD also installs skills, agent definitions, hooks (`SessionStart` and others),
  and a `gsd-core` runtime with a query CLI. Whether any of that belongs in the dashboard is an open
  question for research — the user explicitly asked that research cover it.

**Theme source.** studio-portal's frontend is Next.js 16 / React 19 / Tailwind v4 with shadcn in the
`base-sera` style over `@base-ui/react` primitives, `lucide` icons, a neutral oklch base with an orange
primary, and a documented squared-corner convention (its scrollbar treatment note explains the house
style). The tokens are copied; the codebase is not.

**Environment.** Linux, Node 22.23.1, GSD core 1.11.0 installed globally at `~/.claude/gsd-core`.

## Constraints

- **Deployment**: Clone-and-run from its own repo at `~/gsd-lore`, targeted with a path argument at
  startup — Not a per-project install, not a published CLI, not a hosted service. Keeps v1 setup trivial.
- **Access**: Read-only filesystem access to the target `.planning/` — The tool must be incapable of
  damaging planning state it does not own.
- **Compatibility**: Must read `.planning/` as produced by `@opengsd/gsd-core` (1.11.0 at time of
  writing) — GSD's artifact set evolves, so unknown files must degrade rather than break.
- **Design**: Visual language inherited from studio-portal — oklch token palette, shadcn `base-sera`,
  `@base-ui/react`, lucide, squared corners, light and dark. Familiarity, and the theme comes for free.
- **Dependencies**: No runtime, code, or data dependency on studio-portal — It is a reference and a
  theme source only.
- **Tech stack**: Undecided, pending research — The user explicitly deferred this. Research must compare
  options (inheriting the Next.js stack versus a lighter Vite/Node runner) against a local read-only
  tool's needs.
- **Forward compatibility**: The `.planning/` reader must sit behind a boundary that admits multi-project
  targeting, a file watcher, and eventually write-back — None of those ship in v1, but all three are
  named future directions and a reader baked into the UI would block all of them.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Read-only in v1; no writes to `.planning/` | GSD owns these files' invariants. A viewer that cannot write cannot corrupt planning state. Driving GSD is a named future direction, not v1 scope. | ✓ Phase 1 established a read-only filesystem boundary with containment checks |
| One project per run, targeted by path argument | Simplest thing that satisfies "works on any GSD project" without building registry, discovery, or persistence machinery. | ✓ Phase 1 verified absolute, relative, `~`-prefixed, and symlinked targets |
| Own repository at `~/gsd-lore`, clone-and-run | Chosen over `npx`/global CLI: no packaging or distribution burden for a personal tool. | — Pending |
| Findability via full-text search *and* navigation/cross-linking | Both were chosen over curated per-type aggregate pages. Search covers the unknown-unknowns; navigation covers walking a structure you already understand. | ✓ Phase 3 shipped exact-token search, grouped snippets, a complete tree, and requirements traceability |
| studio-portal is a reference and theme source, nothing more | Explicit user instruction. The dashboard must render any GSD project, so hardcoding to studio-portal would defeat the point. | ✓ Phase 4 verified sparse, dense, stripped, malformed, and invalid targets in both themes |
| Live file-watching deferred to v2, read layer built to allow it | Watching is real infrastructure (watcher plus transport plus client state). Deferring it is cheap only if the read layer is a seam from day one. | ✓ Phase 1 delivered and tested the single `refresh()` seam |
| Tech stack deferred to research | User declined to pre-commit. A local read-only tool has different pressures than studio-portal's networked app; the theme is portable across candidate stacks. | — Pending |
| Built for one user, no distribution concerns | Removes onboarding, docs, version-compatibility, and contribution surface from v1 scope. Portability across GSD projects is still required — but for this user's own projects. | — Pending |
| Keep the domain model independent of filesystem and parser modules | Resolved references and mention indexes are shared downstream contracts; putting their types in the zero-I/O domain layer prevents dependency inversion. | ✓ Phase 1 implemented the one-way `planning-fs → planning-repo → domain` boundary |
| Treat dangling references as data, not warnings | GSD prose routinely mentions identifiers that are not definitions; warning on each would bury real parse failures. | ✓ Phase 1 preserves `{raw, resolved: null}` and keeps warnings high-signal |

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
*Last updated: 2026-09-08 after Phase 4*

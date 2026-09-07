# Roadmap: GSD Lore

## Overview

GSD Lore is built from the inside out. Phase 1 produces no pixels at all: it turns any `.planning/`
directory on disk into a complete, inspectable in-memory snapshot, and proves that claim with a JSON
harness run against two synthetic fixtures — a sparse fresh project and a dense project containing
artifact types studio-portal does not have. This is deliberate. Research ranked *overfitting the parser
to studio-portal's shape* as the single highest-severity risk in the project, and that risk is only
catchable before a UI is built on top of overfit assumptions. Phase 2 turns that snapshot into the
product: the landing view that answers "where does the work stand", the roadmap view, the markdown
rendering pipeline that makes `PLAN.md` and `SUMMARY.md` readable, and the prose-scanning linkifier that
makes GSD's plain-text ID mentions clickable. Phase 3 tackles the third confirmed pain — finding buried
artifacts — with full-text search over source markdown, a tree browser, and a traceability view. Phase 4
turns the whole app adversarially against Phase 1's fixtures plus deliberately broken and partial ones,
proving the tool works on *any* GSD project rather than only on the reference one, and wiring the refresh
seam a future file watcher will call.

**Dependency shape.** A strict chain, `1 → 2 → 3 → 4`, with one nuance worth stating explicitly: Phase 3
depends on Phase 1 for the snapshot it indexes *and* on Phase 2 for the routing and rendering conventions
its results must point into. Phase 4 depends on all three, because degradation cannot be meaningfully
tested until there is a full app surface to degrade — you cannot verify that a missing `SECURITY.md`
doesn't break the phase page until the phase page exists.

```
Phase 1 ──▶ Phase 2 ──▶ Phase 3 ──▶ Phase 4
 (data)      (read)      (find)      (prove)
   │            │            │          ▲
   └────────────┴────────────┴──────────┘
        all three exercised adversarially in 4
```

**Degradation is designed in Phase 1, proven in Phase 4.** Per-file error isolation, the mandatory
generic-markdown fallback, and open-map parsing of `config.json` are Phase 1 architecture, not Phase 4
polish. Phase 4 owns the requirements that state the *user-visible* form of that behavior, and proves it
against fixtures Phase 1 already built.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Read Layer & Domain Model** - Headless snapshot of any `.planning/` tree, proven against sparse and dense fixtures via a JSON harness (completed 2026-08-24)
- [x] **Phase 2: Situational Awareness & Artifact Reading** - The dashboard, roadmap view, markdown pipeline, and prose linkifier — first pixels (completed 2026-09-01)
- [x] **Phase 3: Search, Browsing & Traceability** - Full-text search over source markdown, tree navigator, requirements traceability (completed 2026-09-02)
- [ ] **Phase 4: Portability & Degradation Hardening** - Adversarial proof against sparse, unknown-type, and broken projects, plus the refresh seam

## Phase Details

### Phase 1: Read Layer & Domain Model

**Goal**: Any GSD project on disk becomes a complete, inspectable snapshot — assembled behind a filesystem interface that already admits multi-project, watching, and write-back, and proven correct without a browser.
**Depends on**: Nothing (first phase)
**Requirements**: TGT-01, TGT-02, DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, NAV-07
**Success Criteria** (what must be TRUE):

  1. Running the harness against a project path — absolute, relative, `~`-prefixed, or symlinked — dumps that project's entire `.planning/` snapshot as JSON.
  2. The sparse fixture (fresh project, no `ROADMAP.md`, no `phases/`) and the dense fixture (artifact types absent from studio-portal) both produce complete snapshots: no file is dropped, unrecognized filenames arrive as generic markdown artifacts, and unknown `config.json` keys survive the round trip.
  3. A deliberately corrupted file in a fixture degrades to its raw body plus a recorded warning while every other file parses cleanly — the load produces a snapshot rather than throwing.
  4. The whole snapshot rebuilds through one `refresh()` call, and swapping the filesystem implementation behind the interface requires no change to parsing, assembly, or anything downstream.
  5. The snapshot exposes resolved cross-references — requirement to phase, phase to plans, and a decision ID to the files mentioning it — with unresolvable references present and explicitly marked rather than silently dropped.

**Plans**: 4/4 plans executed

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Tracer: scaffold the repo and drive one path end-to-end from a project path to normalized snapshot JSON, plus the never-throwing load contract (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Fixture corpus: `sparse-started` and the adversarial `dense` tree, with deliberate corruption and a template-traceability ledger (wave 2)
- [x] 01-03-PLAN.md — GSD naming grammar, typed handler registry with the generic fallback last, and the milestone-qualified domain graph (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-04-PLAN.md — Cross-reference resolution, the NAV-07 decision-mention index, and the two-implementation proof with committed goldens (wave 3)

> **Note (D-03):** DATA-06 says "two synthetic test fixtures"; this phase delivers **three** trees.
> The roadmap describes the sparse fixture two incompatible ways — Phase 1 SC2 says "fresh project,
> no `ROADMAP.md`, no `phases/`" while Phase 4 SC1 says "one phase, no milestones" — and those are
> different trees exercising different code paths, so both are built (`sparse-empty` and
> `sparse-started`) alongside `dense`. Flagged rather than silently satisfying DATA-06's letter with
> the wrong trees.

### Phase 2: Situational Awareness & Artifact Reading

**Goal**: Opening the dashboard on a project answers "where does the work stand" at a glance, and every artifact — plan, summary, research, or a type the tool has never seen — reads as a properly formatted, cross-linked document.
**Depends on**: Phase 1
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, ROAD-01, ROAD-02, ROAD-03, ROAD-04, READ-01, READ-02, READ-03, READ-04, READ-05, READ-06, NAV-02, NAV-03, NAV-04, NAV-06, HIST-01, HIST-02, UI-01, UI-02, UI-03
**Success Criteria** (what must be TRUE):

  1. The landing view answers "where am I" without opening a file: current milestone, phase, status, and progress from `STATE.md`, plus what comes next, what is blocked, and what awaits human verification — with formal roadmap completion and observed disk state presented as two separate signals so any disagreement between them is visible rather than collapsed into one number.
  2. The roadmap view shows every phase with its goal, success criteria, mapped requirements, and plans grouped by wave, renders the dependency shape as a legible flow rather than ASCII art, and keeps phase identity milestone-qualified — while archived milestones and their phase trees are reachable and visually distinct from the active one.
  3. A real multi-task `PLAN.md` from studio-portal renders correctly and safely: its literal `<objective>`, `<task>`, and `<decision>` tags appear as visible structure with their nested markdown intact, its frontmatter renders as structured panels rather than raw YAML, tables and code blocks and task lists render properly, and no HTML embedded in any artifact executes.
  4. A plan and its summary read together, with the plan's `must_haves.truths` matched against the summary's `coverage` entries.
  5. Requirement, phase, and plan IDs mentioned in prose are clickable and land on the right view through a shareable, bookmarkable URL, headings carry stable anchors so a link can target a specific section, and a mention with no definition stays plain text instead of becoming a broken link.
  6. Both light and dark themes render studio-portal's visual language — oklch tokens, `base-sera` components, lucide icons, squared corners — with legible contrast on real long-form artifact content, and wide tables, code blocks, and diagrams scroll inside their own containers while the page body never scrolls horizontally.

**Plans**: 12/16 active plans executed (02-09 superseded by 02-13; 02-13 re-gate run 2026-08-31, NOT APPROVED — 10 gaps recorded in 02-13-SUMMARY.md; plans 02-14 through 02-17 close and re-gate those gaps)
**UI hint**: yes

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Package-vetted CLI-path-to-browser current-position tracer and production shell

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — Canonical route codec, structured STATE/PLAN projection, and truthful dashboard selectors

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-03-PLAN.md — Current-position dashboard, vertical roadmap/history, and studio-portal-derived light/dark shell

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 02-04-PLAN.md — Safe PLAN-aware Markdown, structured frontmatter, artifact index, and document canvas

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 02-05-PLAN.md — Conservative plan-summary pairing and milestone-aware preview interaction bridge

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 02-06-PLAN.md — Blocking end-of-phase browser UAT over dense and real long-form corpora

**Wave 7** *(gap closure — blocked on Wave 6 verification)*

- [x] 02-07-PLAN.md — Navigable phase and blocker next-work routes, identity-grounded regression fixtures, rounded progress display
- [x] 02-08-PLAN.md — Route-aware roadmap that opens and scrolls the deep-linked phase, plus two latent anti-pattern fixes

**Wave 8** *(gap closure — blocked on Wave 7 completion)*

- [ ] 02-09-PLAN.md — Blocking per-surface light/dark contrast gate on real long-form content and the repaired navigation flow *(run 2026-08-29, gate NOT approved — 11 gaps recorded in 02-UAT.md; superseded by the re-run gate 02-13)*

**Wave 9** *(gap closure — blocked on the 02-UAT.md gate failure)*

- [x] 02-10-PLAN.md — Unconditional PLAN wrapper segmentation with a generic labelled fallback, and the locked warm code theme (G-01, G-11, G-06)
- [x] 02-11-PLAN.md — Routable attention-row destinations and a settle-loop deep-link scroll (G-02, G-04)
- [x] 02-12-PLAN.md — Flattened nesting, enforced overflow chain with a drawn scrollbar, revised tables, badges and reference-trigger resting appearance (G-08, G-10, G-05, G-07, G-03)

**Wave 10** *(gap closure — blocked on Wave 9 completion)*

- [x] 02-13-PLAN.md — Blocking re-run of every UAT surface on the post-gap-closure tree, including the two the first gate never reached *(run 2026-08-31, gate NOT approved — 10 gaps recorded in 02-13-SUMMARY.md, G2-01..G2-10; plan 02-09's gate remains open)*

**Wave 11** *(gap closure — blocked on Wave 10 gate failure)*

- [x] 02-14-PLAN.md — Root-caused nesting, popover, table, Mermaid, and provenance fixes (G2-01, G2-02, G2-04, G2-05, G2-06)

**Wave 12** *(gap closure — blocked on Wave 11 completion)*

- [x] 02-15-PLAN.md — Registry-backed `.planning` artifact-path previews, with G2-03's source-path prerequisite recorded honestly
- [x] 02-16-PLAN.md — Reproduction-first attention routing, bounded Next descriptions, and normalized label/chip tokens (G2-07..G2-10)

**Wave 13** *(gap closure — blocked on Wave 12 completion)*

- [x] 02-17-PLAN.md — Complete fresh-build human re-gate across themes, viewports, muted surfaces, fallbacks, scrollbar interactions, and destination branches

### Phase 3: Search, Browsing & Traceability

**Goal**: Anything buried anywhere in `.planning/` is findable in seconds — by searching for an exact token, by walking the tree to it, or by following a requirement to the phase that covers it.
**Depends on**: Phase 2 (routing and rendering conventions results point into), Phase 1 (the snapshot indexed)
**Requirements**: FIND-01, FIND-02, FIND-03, FIND-04, FIND-05, NAV-01, NAV-05
**Success Criteria** (what must be TRUE):

  1. Searching an exact token — a requirement ID like `ROLE-07`, or a file path like `backend/src/authz/mod.rs` — returns the files containing it, because the index is built from source markdown rather than rendered output.
  2. Search covers every file in `.planning/`, and results arrive grouped by phase and artifact type with a snippet showing the match highlighted in context.
  3. The app is usable before the index finishes building — index construction never blocks first paint.
  4. A tree navigator mirrors `.planning/`'s real structure — root docs, `phases/`, `quick/`, `milestones/`, `research/` — expandable per phase, and a traceability view shows every requirement with the phase covering it and its status.

**Plans**: 4/4 plans executed *(sized at 2 at roadmap time; split to 4 because D-11's assembly fix, the search surfaces, the sidebar restructure, and the traceability view each own a distinct file set and `src/server/index.ts`, `src/presentation/routes.ts`, `app-shell.tsx` and `globals.css` are touched by more than one — a two-plan split would have put every task over the per-plan file budget)*
**UI hint**: yes

**Wave 1** *(tracer — the vertical slice every later wave builds on)*

- [x] 03-01-PLAN.md — End-to-end exact-token search, the D-11 assembly fix that makes the corpus complete, and non-blocking index construction (FIND-01, FIND-02, FIND-05)

**Wave 2** *(blocked on Wave 1)*

- [x] 03-02-PLAN.md — Location-then-type result grouping, match-centred snippets with heading deep-links, and the /search reading surface (FIND-03, FIND-04)

**Wave 3** *(blocked on Wave 2 — shares app-shell.tsx and globals.css)*

- [x] 03-03-PLAN.md — The disk-mirroring tree navigator and the shell restructured into header-over-sidebar-plus-content (NAV-01)

**Wave 4** *(blocked on Wave 3 — shares app-shell.tsx, tree.ts and globals.css)*

- [x] 03-04-PLAN.md — The requirements traceability view with two unmerged status columns, category grouping, and uncovered/disagreement filters (NAV-05)

### Phase 4: Portability & Degradation Hardening

**Goal**: The dashboard is proven to work on any GSD project — sparse, unfamiliar, partly broken, or not a GSD project at all — and never shows data whose age it cannot state.
**Depends on**: Phase 3 (and, adversarially, Phases 1 and 2)
**Requirements**: TGT-03, TGT-04, TGT-05, TGT-06, TGT-07, TGT-08
**Success Criteria** (what must be TRUE):

  1. Phase 1's sparse fixture (one phase, no milestones) and dense fixture (artifact types absent from studio-portal) both render as complete, navigable dashboards — not merely as parsed snapshots — and an unrecognized artifact type still appears in navigation and renders as plain markdown.
  2. Removing an optional artifact or directory — `quick/`, `milestones/`, `research/`, `UI-SPEC.md`, `SECURITY.md` — produces an honest empty state in the affected view and leaves every other view untouched, never an error page.
  3. A file with deliberately corrupted YAML degrades only its own view; every other page still renders and the app does not crash.
  4. Starting against a nonexistent path, or a directory with no `.planning/`, shows a message naming the problem and the exact path that was checked.
  5. Every view states when its data was read from disk, and a Refresh action re-reads the project through the same `refresh()` seam a future file watcher will call.

**Plans**: 5/5 plans executed — 04-05 is a gap-closure plan added after `04-VERIFICATION.md` returned
`gaps_found` (2 of 8 must-haves failed: D-12's shared vocabulary missing on the artifact page, and
D-05's atomic-swap claim broken by a GET racing a refresh) *(sized at 2 at roadmap time; split to 4 because each of the four surfaces —
the refresh seam, the invalid-project screen, the damaged-artifact treatment, and the empty-state
plus portability proof — owns a distinct file set, and `src/web/styles/globals.css` plus
`src/web/pages/artifact-page.tsx` are touched by more than one, so a two-plan split would have put
several tasks over the per-plan file budget)*
**UI hint**: yes

Plans:
**Wave 1** *(tracer — the vertical slice every later wave builds on)*

- [x] 04-01-PLAN.md — Tracer: the refresh seam end to end, the atomic derived-view swap, and the header timestamp that states the snapshot's age (TGT-08)

**Wave 2** *(blocked on Wave 1 — shares globals.css)*

- [x] 04-02-PLAN.md — The whole-app invalid-project screen above the routed shell, with the checked path and a restart command both copyable (TGT-07)

**Wave 3** *(blocked on Wave 2 — shares globals.css)*

- [x] 04-03-PLAN.md — One shared damaged-artifact vocabulary across tree, search and artifact page, with the badge-and-disclosure treatment replacing the persistent banners (TGT-06)

**Wave 4** *(blocked on Wave 3 — shares globals.css and artifact-page.tsx)*

- [x] 04-04-PLAN.md — The one generic empty state and the adversarial three-fixture, stripped-fixture and unknown-type portability proof (TGT-03, TGT-04, TGT-05)

**Wave 5** *(gap closure — blocked on the 04-VERIFICATION.md `gaps_found` result)*

- [x] 04-05-PLAN.md — Close the two failed must-haves: the shared Warning/Unreadable vocabulary reaching the artifact page, and one derived bundle per request (TGT-06, TGT-08)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Read Layer & Domain Model | 4/4 | Complete    | 2026-08-24 |
| 2. Situational Awareness & Artifact Reading | 16/16 | Complete    | 2026-09-01 |
| 3. Search, Browsing & Traceability | 4/4 | Complete    | 2026-09-02 |
| 4. Portability & Degradation Hardening | 5/5 | In Progress|  |

## Backlog

### Phase 999.1: Rename project from "GSD Lore" to "Labelore" (BACKLOG)

**Goal:** [Captured for future planning]
**Requirements:** TBD
**Plans:** 0 plans

Rename the product from **GSD Lore** to **Labelore**. Raised by the user on 2026-08-31
during the phase 02 UAT re-gate, and deliberately kept out of that gate's scope.

Known surfaces the rename touches — not exhaustive, confirm during planning:

- `.planning/PROJECT.md` — project title and prose
- `package.json` — `name`, `description`, and the `bin` entry
- The CLI entrypoint's startup banner (`GSD Lore is reading <path>`)
- `index.html` `<title>` and any in-app shell heading
- `README` / docs
- Fixture corpus names and any test asserting on the old string (the smoke test
  prints `GSD Lore smoke passed for <corpus>`)
- The repo directory `~/gsd-lore` and the git remote, if the rename extends that far

Open question for planning: whether the repo/directory name changes too, or only the
product name. The deployment constraint in PROJECT.md names `~/gsd-lore` explicitly.

Plans:

- [ ] TBD (promote with /gsd-review-backlog when ready)

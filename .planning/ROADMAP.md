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

- [ ] **Phase 1: Read Layer & Domain Model** - Headless snapshot of any `.planning/` tree, proven against sparse and dense fixtures via a JSON harness
- [ ] **Phase 2: Situational Awareness & Artifact Reading** - The dashboard, roadmap view, markdown pipeline, and prose linkifier — first pixels
- [ ] **Phase 3: Search, Browsing & Traceability** - Full-text search over source markdown, tree navigator, requirements traceability
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
**Plans**: 2 plans

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
**Plans**: 3 plans
**UI hint**: yes

### Phase 3: Search, Browsing & Traceability
**Goal**: Anything buried anywhere in `.planning/` is findable in seconds — by searching for an exact token, by walking the tree to it, or by following a requirement to the phase that covers it.
**Depends on**: Phase 2 (routing and rendering conventions results point into), Phase 1 (the snapshot indexed)
**Requirements**: FIND-01, FIND-02, FIND-03, FIND-04, FIND-05, NAV-01, NAV-05
**Success Criteria** (what must be TRUE):
  1. Searching an exact token — a requirement ID like `ROLE-07`, or a file path like `backend/src/authz/mod.rs` — returns the files containing it, because the index is built from source markdown rather than rendered output.
  2. Search covers every file in `.planning/`, and results arrive grouped by phase and artifact type with a snippet showing the match highlighted in context.
  3. The app is usable before the index finishes building — index construction never blocks first paint.
  4. A tree navigator mirrors `.planning/`'s real structure — root docs, `phases/`, `quick/`, `milestones/`, `research/` — expandable per phase, and a traceability view shows every requirement with the phase covering it and its status.
**Plans**: 2 plans
**UI hint**: yes

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
**Plans**: 2 plans
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Read Layer & Domain Model | 0/2 | Not started | - |
| 2. Situational Awareness & Artifact Reading | 0/3 | Not started | - |
| 3. Search, Browsing & Traceability | 0/2 | Not started | - |
| 4. Portability & Degradation Hardening | 0/2 | Not started | - |

# Roadmap: Labelore

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-09-10)
- ✅ **v1.1 Legible Documents** — Phase 5 (shipped 2026-09-21)
- ✅ **v2.0 Fully Labelled** — quick tasks, no phases (shipped 2026-10-25)
- 🚧 **v2.1 Wayfinding** — Phases 6-13 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-09-10</summary>

- [x] Phase 1: Read Layer & Domain Model (4/4 plans) — completed 2026-08-24
- [x] Phase 2: Situational Awareness & Artifact Reading (16/16 plans) — completed 2026-09-01
- [x] Phase 3: Search, Browsing & Traceability (4/4 plans) — completed 2026-09-02
- [x] Phase 4: Portability & Degradation Hardening (6/6 plans) — completed 2026-09-08

Full phase detail, success criteria, and plan waves: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

<details>
<summary>✅ v1.1 Legible Documents (Phase 5) — SHIPPED 2026-09-21</summary>

- [x] Phase 5: Per-Type Document Views (6/6 plans) — completed 2026-09-21

Full phase detail, success criteria, and plan waves: [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)

</details>

<details>
<summary>✅ v2.0 Fully Labelled (quick tasks) — SHIPPED 2026-10-25</summary>

- [x] 40 directory quick tasks and 90 inline quick tasks: a sketch-built page for every artifact type, dashboard and drawer redesigns, remote ssh targets — completed 2026-10-25

Quick-task index: [milestones/v2.0-quick/README.md](milestones/v2.0-quick/README.md) · summary in [MILESTONES.md](MILESTONES.md)

</details>

### 🚧 v2.1 Wayfinding (In Progress)

**Milestone Goal:** Every file GSD can write opens into a designed page, Labelore moves between
projects, and URLs read like what they point to, with search that is quicker to use and easier to
read.

- [ ] **Phase 6: Trustworthy Tests and Security Baseline** - The suite passes every run on made-up fixtures, and the promised security checks and secret masking are in place
- [ ] **Phase 7: Recognised Files and Readable URLs** - Every GSD file is recognised by where it lives and has one readable address starting with the project's name
- [ ] **Phase 8: Several Projects and a Switcher** - One run holds several projects, remembers them, and moves between them without mixing their data
- [ ] **Phase 9: Review, Audit and Root Document Pages** - The root documents, milestone audits, coverage files and the review ledger open into designed pages
- [ ] **Phase 10: Codebase Map, Specification and Check Pages** - Codebase maps, map-only projects, and the documents a phase is specified and checked with get pages, built on labelled made-up examples where none exists
- [ ] **Phase 11: Exploration, Handoff, Report and Workstream Pages** - Spikes, seeds, threads, paused work, the rarer reports and indexes, and workstreams each open into a designed page
- [ ] **Phase 12: Project Settings, Source Mode and Reading Polish** - `config.json` becomes a read-only settings page, Source mode is redesigned, and the v1.1 polish items close
- [ ] **Phase 13: Search and Quick-Jump Palette** - Search is grouped, filterable and honest while indexing, and Cmd-K jumps to any page, ID or project

**Execution order:** 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13. Phase 9 needs only Phase 7, so it can
run alongside Phase 8 if that helps. Workstreams, intel, graphs, reports and forensics have no real
example on this machine; they all sit in Phase 11, with workstreams built last within it, so they
can be cut without disturbing anything else.

## Phase Details

### Phase 6: Trustworthy Tests and Security Baseline

**Goal**: The test suite can be trusted again: it passes on every normal run and reads only made-up
data committed in this public repository. The security checks the v1.1 threat register promised are
in place, and secrets in a project's settings file are masked at the point Labelore reads it, before
any page is built to show them.

**Depends on**: Nothing in this milestone (builds on v2.0 as shipped)

**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, SEC-01, SEC-02, SEC-03, SEC-04

**Success Criteria** (what must be TRUE):

1. Running the full unit suite gives zero failures and zero skipped tests, run after run, and
   changing or deleting another project's `.planning/` folder on this machine changes no test
   result. *(TEST-01, TEST-02)*
2. Every fixture in the repository is made up: anything copied from private work projects has been
   replaced. The browser tests run against a fixture inside the repository and fail loudly instead
   of skipping when it is missing. *(TEST-03, TEST-04)*
3. Feeding the section, mention and link scanners huge or hostile input (thousands of table rows,
   very long lines, long runs of capitals or digits) shows their cost growing in step with the input.
   The link scanner, which slows down sharply on such input today, is fixed, and timing tests compare
   growth rather than a fixed millisecond budget. *(SEC-01, TEST-01)*
4. A test fails if any web code injects raw HTML outside the one allowed rendering site, and a
   document with thousands of headings shows a capped outline in View mode, the same way Source mode
   already does. *(SEC-02, SEC-03)*
5. An API key or similar secret in a project's `config.json` shows up only in masked form in the
   raw file, on its file page and in search results and snippets. The full value never reaches the
   search index, so every page built later inherits the masking. *(SEC-04)*

**Plans**: 15/22 plans executed

Plans:
**Wave 1**
- [x] 06-01-PLAN.md — Tracer: the made-up Lendshed project, its throwing loader, the fail-loud 4198 browser server, the zero-skip gate and the shared fixture server, proven on one CONTEXT file
- [x] 06-02-PLAN.md — Growth harness, linear link scanner, growth tests for the section and mention scanners
- [x] 06-03-PLAN.md — View-mode outline capped at 18 with a "+N more sections" row; standing raw-HTML guard
- [x] 06-04-PLAN.md — config.json secrets masked at read time for presentation, file page and search

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 06-05-PLAN.md — CONTEXT family on Lendshed
- [x] 06-06-PLAN.md — Discussion-log and validation families on Lendshed
- [x] 06-07-PLAN.md — Pattern-map family on Lendshed, Labelore phase 6 PATTERNS re-pinned
- [x] 06-08-PLAN.md — Research-briefing family on Lendshed, embedded research excerpts made up
- [x] 06-09-PLAN.md — Plan family on Lendshed, Labelore 528 drift fix
- [x] 06-11-PLAN.md — UAT and security-register families on Lendshed
- [x] 06-12-PLAN.md — UI-SPEC, theme and UI-review families on Lendshed
- [x] 06-13-PLAN.md — Copied review fixtures replaced by made-up Lendshed reviews
- [x] 06-14-PLAN.md — Copied verification and learnings fixtures replaced, learnings server retired
- [x] 06-15-PLAN.md — Debug sessions on Lendshed, sibling helper and debug server deleted
- [x] 06-16-PLAN.md — Made-up todos and the notes they point at on Lendshed, todo unit tests repointed, provenance tests deleted
- [ ] 06-21-PLAN.md — Labelore-own research and drawer tests re-pinned, last timing and tilde-path fixes

**Wave 3** *(blocked on Wave 2 completion)*
- [ ] 06-10-PLAN.md — Summary family on Lendshed, Labelore summary-walker drift fix
- [ ] 06-17-PLAN.md — Todo browser spec on the shared fixture server, copied todo fixtures and the todo server deleted
- [ ] 06-18-PLAN.md — Note family on Lendshed, committed notes copy deleted
- [ ] 06-19-PLAN.md — Diagram fixtures rewritten column for column, sketch-012 golden regenerated

**Wave 4** *(blocked on Wave 3 completion)*
- [ ] 06-20-PLAN.md — Diagram timing tests converted to growth under the size caps

**Wave 5** *(blocked on Wave 4 completion)*
- [ ] 06-22-PLAN.md — Standing leak and no-skips scans, ledgers, and the full-suite phase gate

### Phase 7: Recognised Files and Readable URLs

**Goal**: Every file GSD writes is recognised for what it is and has exactly one readable address
starting with the project's name. Pages, the switcher, search and the palette built later all link
to the same clean URLs, and none of them needs to change again.

**Depends on**: Phase 6 (the URL change touches almost every page and test, so the suite must be trustworthy first)

**Requirements**: DATA-07, DATA-08, NAV-09, NAV-10, NAV-11

**Success Criteria** (what must be TRUE):

1. Files GSD names without a phase prefix (such as `COVERAGE.md`), `HANDOFF.json` and
   `.continue-here.md` are recognised by their folder as well as their name. A file that shares a
   root document's name deeper in the tree is no longer mistaken for one, and GSD's internal files
   (temporary folders, locks, `state.json`) no longer appear in the drawer or in search. *(DATA-07)*
2. Images and other binary files are listed as what they are and are never read or indexed as text.
   *(DATA-08)*
3. The address bar reads like what it points to, for example `/labelore/v1.1/phase-5/plan-03`,
   `/labelore/quick/261024-qhq/summary`, `/labelore/codebase/architecture`,
   `/labelore/notes/per-kind-artifact-rendering` and `/labelore/roadmap`. *(NAV-09)*
4. Every file in the fixture projects has exactly one URL, including files that fit no clean
   pattern, and no two files share one. Opening or hard-reloading any of those URLs directly lands
   on the right page in both the development server and the built app, including URLs with dots
   such as `v1.1`. *(NAV-10)*
5. An old-style encoded link or bookmark redirects to its new readable URL. *(NAV-11)*

**Plans**: TBD

### Phase 8: Several Projects and a Switcher

**Goal**: One Labelore run holds several projects and moves between them without mixing their data.
It remembers them in its own settings file, and every endpoint that accepts a path, an `ssh://`
target or a settings change refuses requests from other websites.

**Depends on**: Phase 7 (the project's name is the first part of every URL)

**Requirements**: PLAT-02, PLAT-05, PLAT-06, PLAT-07, PLAT-08, SEC-05

**Success Criteria** (what must be TRUE):

1. Starting Labelore with several paths opens all of them, and a switcher in the header moves
   between them. The switcher is sketched first, built from the winning sketch and screenshot-checked
   against it. *(PLAT-02)*
2. When the user asks, Labelore scans a folder such as `~/Work` and lets the user pick from the GSD
   projects it finds. The user can also add a local path or an `ssh://` target from the switcher.
   *(PLAT-05, PLAT-07)*
3. Projects the user has opened are still listed after a restart. They are remembered in Labelore's
   own settings file, which a test proves can never be written inside a target project.
   *(PLAT-06, SEC-05)*
4. Switching project never flashes the previous project's data, and a project keeps the same URL
   name across runs, so bookmarks keep working. A remembered project that can no longer be opened
   stays listed with the reason. *(PLAT-08)*
5. A request from another website to any endpoint that accepts a path, an `ssh://` target or a
   settings change is refused. *(SEC-05)*

**Plans**: TBD
**UI hint**: yes

### Phase 9: Review, Audit and Root Document Pages

**Goal**: The unpaged files met most often in real projects open into designed pages: the documents
at the root of `.planning/` (project, roadmap, requirements, state, milestones, retrospective and
windows) and their archived copies under `milestones/`, milestone audits, coverage files, and the
review disposition and review fix files, which read as one ledger alongside the existing review
page.

**Depends on**: Phase 7 (pages need the file recognition and the readable URLs; can run alongside Phase 8)

**Requirements**: VIEW-07, VIEW-08, VIEW-09, VIEW-10

**Success Criteria** (what must be TRUE):

1. Opening any root document shows a designed file page and never a "no dedicated view" notice.
   Where the app already has a designed page for it (dashboard, roadmap, traceability, milestone
   history, retrospective), the file page links to that page or reuses it instead of building a
   second copy. An archived copy under `milestones/` opens on the same page as its live counterpart
   and is clearly marked as part of a shipped milestone. *(VIEW-07)*
2. Opening the project file shows what the project is and its core value, the current milestone's
   goal, requirement counts by state, the constraints, and the key decisions with their outcomes.
   Opening the windows ledger leads with how many broken windows are still open, then lists them by
   phase and kind, with each waived one showing its reason. *(VIEW-07)*
3. Opening a milestone audit shows its verdict, its scores, each gap with its evidence and the tech
   debt grouped by phase, and it reads the real audits on this machine correctly, not only the old
   test fixture's shape. Opening a coverage file shows its capability-by-capability coverage matrix
   (which capabilities are integrated, which are opted out, and why) instead of a generic document.
   *(VIEW-08, VIEW-10)*
4. Opening a review disposition or a review fix shows open against total findings by severity, what
   was fixed and in which commit, and what was skipped or deferred and why. Moving among the review,
   its disposition and its fix reads as one ledger. *(VIEW-09)*
5. Each new page is sketched first, built from the winning sketch and screenshot-checked against
   it. It still opens readably when the file is missing sections or has a shape the design did not
   expect. *(VIEW-07, VIEW-08, VIEW-09, VIEW-10)*

**Plans**: TBD
**UI hint**: yes

### Phase 10: Codebase Map, Specification and Check Pages

**Goal**: The seven codebase-map documents open into designed pages, and a project that holds only
a codebase map opens on a "mapped, not started" overview built from them instead of being refused
or showing an empty dashboard. The documents a phase is specified with (spec, AI spec, user setup)
and checked with (eval review, browser check, cross-AI reviews) also open into designed pages. None
of those six has ever been produced on this machine, so this phase sets the rule for building and
testing such pages against made-up examples that are clearly labelled as made up.

**Depends on**: Phase 8 (a map-only project must open from the switcher and the folder scan as well as from the command line)

**Requirements**: VIEW-13, TGT-09, VIEW-11, VIEW-12, VIEW-21

**Success Criteria** (what must be TRUE):

1. Each of the seven codebase-map documents (stack, architecture, structure, conventions, testing,
   integrations, concerns) opens into a designed page that reads the real codebase maps on this
   machine correctly, even where their headings differ. *(VIEW-13)*
2. A project whose `.planning/` holds only a codebase map opens whether Labelore is pointed at the
   project folder or at its `.planning` folder, from the command line, the switcher or a folder
   scan. Its first screen is a "mapped, not started" overview: the seven documents as the way in,
   the stack and concerns lifted onto the page, and when the map was made, with no roadmap or
   traceability links that would lead nowhere. *(TGT-09)*
3. Opening a spec shows whether it is locked enough to plan (its ambiguity score against the gate)
   and each requirement as current state, target and acceptance. An AI spec shows its system type,
   framework, evaluation dimensions and checklist progress, and says plainly when sections are still
   unfilled template slots. A user setup shows how many steps are done and where each variable goes,
   never the variable's value. *(VIEW-11)*
4. Opening an eval review shows its score and verdict, its dimension coverage and its ordered
   remediation plan. A browser check shows its outcome, with "could not look" visibly different from
   "nothing to report", plus its pass, fail and needs-review counts. A cross-AI review shows each
   reviewer with its model, the concerns the reviewers agreed on first, and where they disagreed.
   *(VIEW-12)*
5. Each of the six specification and check types is built and tested against a made-up example
   derived from GSD's own template or writer, committed in the repository and labelled as made up,
   and the same rule binds every later type with no real example on this machine. Every page in
   this phase is sketched first, built from the winning sketch and screenshot-checked against it,
   and falls back to a readable generic page when a real file differs from what the design expected.
   *(VIEW-21, VIEW-11, VIEW-12, VIEW-13)*

**Plans**: TBD
**UI hint**: yes

### Phase 11: Exploration, Handoff, Report and Workstream Pages

**Goal**: The files GSD leaves while exploring ideas and pausing work (spikes, seeds, threads and the
pause-and-resume handoff), its rarer outputs (session and milestone reports, forensics reports,
onboarding summaries, and the intel and graph indexes) and its workstreams open into designed pages.
The user can see what was tried, what is waiting to surface, where work stopped, and how each
workstream stands. Workstreams are built last within the phase so they can be cut without disturbing
the rest.

**Depends on**: Phase 9 (a workstream's state and roadmap reuse the root document pages) and Phase 10 (made-up example rule)

**Requirements**: VIEW-14, VIEW-15, VIEW-16, VIEW-17, VIEW-18, VIEW-19, VIEW-20

**Success Criteria** (what must be TRUE):

1. Opening the spikes manifest shows a verdict board grouped by idea (validated, invalidated,
   partial, pending), and each spike and its wrap-up summary opens into a designed page; spike
   scripts and output files are listed by name only and are never run or rendered. A seed shows the
   idea, the condition under which it should surface, its scope, and where and when it was planted.
   A thread shows its status and next steps first. *(VIEW-14, VIEW-15, VIEW-16)*
2. Opening `HANDOFF.json` or `.continue-here.md` shows where the work stopped (task N of M), the
   single next action GSD suggests, the human actions still pending (blocking ones first) and what is
   left, with the long context notes folded away. *(VIEW-17)*
3. Opening a report shows its headline numbers (duration, commits, plans), key outcomes and open
   blockers. A forensics report leads with its root-cause hypothesis and recommended actions, and an
   onboarding summary leads with the recommended next command, ready to copy. An intel or graph file
   shows a short summary (counts, last build status and age, at most a short top list) and never a
   dump of the raw data, however large the file. *(VIEW-18, VIEW-19)*
4. Opening a project that uses workstreams shows each workstream with its current phase and
   progress, and choosing one shows its own state, roadmap and phases through the normal pages, each
   at its own readable URL. Files shared by all workstreams still appear once, at the project level,
   and projects without workstreams look and behave exactly as before. *(VIEW-20)*
5. Each page is sketched first, built from the winning sketch and screenshot-checked against it.
   Threads, reports, forensics, onboarding, intel, graphs and workstreams have no real example on
   this machine, so they are built against labelled made-up examples derived from GSD's own writer,
   template or workstream layout, and fall back to a readable generic page when a real file differs.
   *(VIEW-14, VIEW-15, VIEW-16, VIEW-17, VIEW-18, VIEW-19, VIEW-20)*

**Plans**: TBD
**UI hint**: yes

### Phase 12: Project Settings, Source Mode and Reading Polish

**Goal**: A project's `config.json` becomes a read-only settings page the user can reach from
anywhere, Source mode is redesigned into a proper raw-text reader, and the three reading fixes left
over from the v1.1 UI review are closed.

**Depends on**: Phase 8 (the settings entry sits in the header beside the switcher), building on the secret masking from Phase 6 and the binary-file handling from Phase 7

**Requirements**: SET-01, SRC-01, SRC-02, UI-07, UI-08, UI-09

**Success Criteria** (what must be TRUE):

1. From the header on every page, the user can open the project's settings. Settings are grouped
   under plain labels, unknown keys are shown rather than hidden, a key that is not set says "not
   set" instead of showing an invented default, secrets are masked, and nothing on the page can
   change a setting. *(SET-01)*
2. Source mode is redesigned: sketched first, built from the winning sketch and screenshot-checked
   against it. *(SRC-01)*
3. In Source mode the user sees a file's raw text with line numbers and the frontmatter folded. The
   user can copy a link to a line, which lands on that line when opened, and can copy the file's path
   or its contents with one click. An image or binary file shows a plain notice instead of garbled
   text. *(SRC-02)*
4. Each of the three carried v1.1 UI-review items (an opaque outline trigger on narrow screens,
   depth markers on the plan task index, and a primary-coloured trigger chevron) is either fixed or
   closed as no longer applicable because a v2.0 rebuild already changed it, with the reason written
   down. *(UI-07, UI-08, UI-09)*

**Plans**: TBD
**UI hint**: yes

### Phase 13: Search and Quick-Jump Palette

**Goal**: Search becomes quicker to use and easier to read: grouped by milestone then phase,
filterable, and honest while it is still indexing. Cmd-K opens a palette that jumps to any page,
file, ID or project.

**Depends on**: Phase 8 (the palette switches project) and Phase 12 (the settings page exists); it runs last so filters and jumps cover every page type

**Requirements**: FIND-06, FIND-07, FIND-08, FIND-09, NAV-08, NAV-12, NAV-13

**Success Criteria** (what must be TRUE):

1. Search results are grouped by milestone, then phase. The redesigned search page is sketched
   first, built from the winning sketch and screenshot-checked against it. *(FIND-07, FIND-08)*
2. The user can filter results by phase, file type and requirement, and each filter shows how many
   results it holds. *(FIND-06)*
3. While the index is still being built, at start or during a refresh, search says it is indexing
   instead of showing "no results". *(FIND-09)*
4. Cmd-K opens a quick-jump palette that finds any page or file by name from the search index.
   Typing an ID such as `WR-03`, `D-12`, a requirement ID, `05-02` or a quick-task ID jumps straight
   to it. *(NAV-08, NAV-12)*
5. The palette lists the user's projects, and choosing one lands in that project without showing the
   previous project's data. *(NAV-13)*

**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–4 | v1.0 | 30/30 | Archived | 2026-09-10 |
| 5 | v1.1 | 6/6 | Archived | 2026-09-21 |
| quick tasks | v2.0 | 40/40 | Archived | 2026-10-25 |
| 6. Trustworthy Tests and Security Baseline | v2.1 | 15/22 | In Progress | - |
| 7. Recognised Files and Readable URLs | v2.1 | 0/TBD | Not started | - |
| 8. Several Projects and a Switcher | v2.1 | 0/TBD | Not started | - |
| 9. Review, Audit and Root Document Pages | v2.1 | 0/TBD | Not started | - |
| 10. Codebase Map, Specification and Check Pages | v2.1 | 0/TBD | Not started | - |
| 11. Exploration, Handoff, Report and Workstream Pages | v2.1 | 0/TBD | Not started | - |
| 12. Project Settings, Source Mode and Reading Polish | v2.1 | 0/TBD | Not started | - |
| 13. Search and Quick-Jump Palette | v2.1 | 0/TBD | Not started | - |

## Backlog

No open backlog items. The "Per-kind artifact views" entry captured 2026-09-20 was promoted into
Phase 5 above and is tracked there, not here.

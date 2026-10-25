# Requirements: Labelore

**Defined:** 2026-10-25
**Milestone:** v2.1 Wayfinding
**Core Value:** Open the dashboard on a GSD project and immediately know where the work stands and where any planning
artifact lives — without reading a single file by hand.

## v2.1 Requirements

Requirements for this milestone. Each maps to one roadmap phase. IDs continue each category's numbering from
v1.0 and v1.1; new categories start at 01.

### Test health

- [ ] **TEST-01**: The full unit suite passes with zero failures and zero skipped tests on a normal run, and timing
      tests assert how cost grows with input size rather than an absolute millisecond budget
- [ ] **TEST-02**: Corpus tests (notes, todos, debug sessions, patterns and similar) read made-up fixtures committed
      in this repository, never other projects' live `.planning/` trees
- [ ] **TEST-03**: Fixtures already committed under `test/` and `fixtures/` are audited, and any content copied from
      private work projects is replaced with made-up content, because the repository is public
- [ ] **TEST-04**: Browser tests run against a fixture inside the repository instead of `~/studio-portal`, and fail
      rather than skip when their target is missing

### Security

- [x] **SEC-01**: Timing tests show the section scanner, the mention scanner and the link scanner stay linear on
      huge or hostile input (thousands of table rows, very long lines, long runs of capitals or digits), and the
      link scanner is fixed so it does
- [x] **SEC-02**: A standing test fails if web code injects raw HTML anywhere other than the one allowlisted
      rendering site
- [x] **SEC-03**: View mode caps the number of outline entries the way Source mode does
- [ ] **SEC-04**: Secrets in `config.json` (API keys and similar) are masked everywhere Labelore shows or indexes
      it: the settings page, the raw file and search
- [ ] **SEC-05**: Endpoints that accept a path, an `ssh://` target or a settings change refuse requests from other
      websites, and Labelore's settings file can never be written inside a target project

### Recognising files

- [ ] **DATA-07**: Every file type GSD writes is recognised by where it lives as well as by its name, including
      files GSD names without a phase prefix (`COVERAGE.md`), `HANDOFF.json` and `.continue-here.md`, and GSD's
      internal files (temporary folders, locks, `state.json`) are kept out of the drawer and search
- [ ] **DATA-08**: Images and other binary files are recognised as such and never read or indexed as text

### Pages for every GSD file type

Each page is sketched first, then built and screenshot-checked against the winning sketch.

- [ ] **VIEW-07**: The root documents open into designed file pages: project, roadmap, requirements, state,
      milestones, retrospective and windows, including their archived copies under `milestones/`
- [ ] **VIEW-08**: A milestone audit opens into a designed page
- [ ] **VIEW-09**: Review disposition and review fix open into designed pages that read as one review ledger
      alongside the existing review page
- [ ] **VIEW-10**: A coverage file opens into a designed page that shows what GSD's coverage file actually holds
      (its capability-by-capability coverage matrix)
- [ ] **VIEW-11**: Phase specification documents open into designed pages: spec, AI spec and user setup
- [ ] **VIEW-12**: Phase check documents open into designed pages: eval review, browser check (DOM verify) and
      cross-AI reviews
- [ ] **VIEW-13**: The seven codebase-map documents (stack, architecture, structure, conventions, testing,
      integrations, concerns) open into designed pages
- [ ] **VIEW-14**: Spikes open into designed pages: the spikes manifest, each spike and its wrap-up summary
- [ ] **VIEW-15**: Seeds open into designed pages showing the idea, when it should surface and where it was planted
- [ ] **VIEW-16**: Threads open into designed pages
- [ ] **VIEW-17**: Pause-and-resume files (`HANDOFF.json`, `.continue-here.md`) open into a designed page that says
      where the work stopped and what GSD suggests next
- [ ] **VIEW-18**: Reports, forensics and onboarding documents open into designed pages
- [ ] **VIEW-19**: Intel and graph files open into designed summary pages, never a dump of the raw data
- [ ] **VIEW-20**: A project that uses GSD workstreams shows each workstream with its own state, roadmap and phases
- [ ] **VIEW-21**: Every type with no real example on this machine is built and tested against a made-up example
      derived from GSD's own template, and that example is labelled as made up

### Project settings, Source mode and project shapes

- [ ] **SET-01**: `config.json` is shown as the project's read-only settings page, reachable from the header on
      every page, grouped with plain labels, showing unknown keys rather than hiding them, and never inventing a
      default for a key that is not set
- [ ] **SRC-01**: Source mode is redesigned from a sketch
- [ ] **SRC-02**: Source mode can show a file's raw text with line numbers, folded frontmatter, a link to a line,
      and copy buttons for the path and the contents
- [ ] **TGT-09**: A project whose `.planning/` holds only a codebase map (as `/gsd-map-codebase` leaves it) opens
      from either its project path or its `.planning` path, and its first screen is a "mapped, not started"
      overview built from the codebase documents

### URLs

- [ ] **NAV-09**: Every page has a readable URL that starts with the project's name, such as
      `/labelore/v1.1/phase-5/plan-03`, `/labelore/quick/261024-qhq/summary`, `/labelore/codebase/architecture`,
      `/labelore/notes/per-kind-artifact-rendering` and `/labelore/roadmap`
- [ ] **NAV-10**: Every file has exactly one URL, including files that fit no clean pattern, no two files share
      one, and opening or reloading any URL directly lands on the right page
- [ ] **NAV-11**: Old-style encoded links redirect to their new readable URL

### Command palette

- [ ] **NAV-08**: Cmd-K opens a quick-jump palette that finds any page or file by name, using the search index
- [ ] **NAV-12**: Typing an ID in the palette (`WR-03`, `D-12`, a requirement ID, `05-02`, a quick-task ID) jumps
      straight to it
- [ ] **NAV-13**: The palette lists the user's projects and switches to the chosen one

### Search

- [ ] **FIND-06**: Search results can be filtered by phase, file type and requirement, with each filter showing how
      many results it holds
- [ ] **FIND-07**: Search results are grouped by milestone, then phase
- [ ] **FIND-08**: The search page is redesigned from a sketch
- [ ] **FIND-09**: Search says when it is still indexing instead of showing no results, including during a refresh

### Projects

- [ ] **PLAT-02**: Starting Labelore with several paths opens all of them, with a switcher to move between them
- [ ] **PLAT-05**: The user can scan a folder such as `~/Work` and pick from the GSD projects found inside it
- [ ] **PLAT-06**: Projects the user has opened are remembered between runs in Labelore's own settings file, never
      inside a project
- [ ] **PLAT-07**: The user can add a local path or an `ssh://` target from the switcher
- [ ] **PLAT-08**: Switching project never shows the previous project's data, each project keeps the same URL name
      across runs, and a project that can no longer be opened is listed with the reason

### UI-review polish carried from v1.1

Each item is first checked against the v2.0 rebuilds, and closed as no longer applicable if the rebuild already
changed it.

- [ ] **UI-07**: The narrow-screen outline trigger is opaque
- [ ] **UI-08**: The plan task index shows depth markers
- [ ] **UI-09**: The outline trigger chevron uses the primary colour

## Future Requirements

Deferred. Tracked but not in this roadmap.

### Pages

- **VIEW-F1**: `deferred-items.md` (20 files across 5 local projects) opens into a designed page
- **VIEW-F2**: `SKELETON.md` opens into a designed page
- **VIEW-F3**: Quick batches open into a designed page
- **VIEW-F4**: The debug knowledge base and the `ui-reviews/` folder open into designed pages

### Findability

- **NAV-F1**: The palette opens on recently visited pages
- **FIND-F1**: Search filters live in the URL, so a filtered search can be bookmarked and reloaded
- **BACK-01**: Backlinks panel on requirements, decisions, and phases
- **FIND-F2**: Search across all projects at once

### Reading and dashboard

- **READ-08**: Fuller plan-vs-outcome pairing with every deviation shown against its task
- **DASH-05**: Static recent-activity strip from `STATE.md`'s decision log and quick-task table

### Platform

- **PLAT-01**: Live file-watching with push updates
- **PLAT-03**: Driving GSD commands from the UI
- **PLAT-04**: Adopt `gsd-tools query` for structural facts

## Out of Scope

| Feature | Reason |
|---------|--------|
| Editing project settings | Settings are read-only for now; Labelore never writes to `.planning/`, and any later write-back is a deliberate decision, not drift |
| Rebuilding the discussion log and human UAT pages | Both keep their current pages by the user's decision |
| A merged view of several projects | One project is shown at a time; the switcher moves between them |
| Scanning for projects at startup | A scan runs only when the user asks; walking a large folder on every start is slow and surprising |
| Adding `cmdk` or another palette library | The installed Base UI components already provide the pieces; a second component family is ceremony |
| Toggles or editors for checklists, dispositions or threads | Labelore stays read-only; pages show the GSD command to run instead |
| Copying other projects' planning files into tests | The repository is public; fixtures are made up |

## Traceability

Which phases cover which requirements. Filled in when the roadmap is created.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEST-01 | Phase 6 | Pending |
| TEST-02 | Phase 6 | Pending |
| TEST-03 | Phase 6 | Pending |
| TEST-04 | Phase 6 | Pending |
| SEC-01 | Phase 6 | Complete |
| SEC-02 | Phase 6 | Complete |
| SEC-03 | Phase 6 | Complete |
| SEC-04 | Phase 6 | Pending |
| SEC-05 | Phase 8 | Pending |
| DATA-07 | Phase 7 | Pending |
| DATA-08 | Phase 7 | Pending |
| VIEW-07 | Phase 9 | Pending |
| VIEW-08 | Phase 9 | Pending |
| VIEW-09 | Phase 9 | Pending |
| VIEW-10 | Phase 9 | Pending |
| VIEW-11 | Phase 10 | Pending |
| VIEW-12 | Phase 10 | Pending |
| VIEW-13 | Phase 10 | Pending |
| VIEW-14 | Phase 11 | Pending |
| VIEW-15 | Phase 11 | Pending |
| VIEW-16 | Phase 11 | Pending |
| VIEW-17 | Phase 11 | Pending |
| VIEW-18 | Phase 11 | Pending |
| VIEW-19 | Phase 11 | Pending |
| VIEW-20 | Phase 11 | Pending |
| VIEW-21 | Phase 10 | Pending |
| SET-01 | Phase 12 | Pending |
| SRC-01 | Phase 12 | Pending |
| SRC-02 | Phase 12 | Pending |
| TGT-09 | Phase 10 | Pending |
| NAV-09 | Phase 7 | Pending |
| NAV-10 | Phase 7 | Pending |
| NAV-11 | Phase 7 | Pending |
| NAV-08 | Phase 13 | Pending |
| NAV-12 | Phase 13 | Pending |
| NAV-13 | Phase 13 | Pending |
| FIND-06 | Phase 13 | Pending |
| FIND-07 | Phase 13 | Pending |
| FIND-08 | Phase 13 | Pending |
| FIND-09 | Phase 13 | Pending |
| PLAT-02 | Phase 8 | Pending |
| PLAT-05 | Phase 8 | Pending |
| PLAT-06 | Phase 8 | Pending |
| PLAT-07 | Phase 8 | Pending |
| PLAT-08 | Phase 8 | Pending |
| UI-07 | Phase 12 | Pending |
| UI-08 | Phase 12 | Pending |
| UI-09 | Phase 12 | Pending |

**Coverage:**
- v2.1 requirements: 48 total
- Mapped to phases: 48
- Unmapped: 0

---
*Requirements defined: 2026-10-25*
*Last updated: 2026-10-25 after v2.1 roadmap revision (8 phases, Phases 6-13)*

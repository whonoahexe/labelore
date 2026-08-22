# Requirements: GSD Lore

**Defined:** 2026-08-21
**Core Value:** Open the dashboard on a GSD project and immediately know where the work stands and where any planning artifact lives — without reading a single file by hand.

## v1 Requirements

Requirements for initial release. Each maps to exactly one roadmap phase.

### Targeting & Portability

The "works on any GSD project" requirement. Research ranked overfitting to `~/studio-portal`
as the single highest-severity risk in the project, so these are first-class requirements
rather than defensive polish.

- [x] **TGT-01**: User starts the dashboard with a project path argument and it renders that project's `.planning/`
- [x] **TGT-02**: Path argument accepts relative paths, `~`-prefixed paths, and symlinked paths
- [ ] **TGT-03**: Dashboard renders a GSD project correctly regardless of phase count, milestone count, or which config toggles are enabled — including a fresh project with one phase and no milestones
- [ ] **TGT-04**: A missing optional artifact or directory (`quick/`, `milestones/`, `research/`, `UI-SPEC.md`, `SECURITY.md`) produces an honest empty state in the affected view, never an error page
- [ ] **TGT-05**: An artifact type the dashboard does not recognize still appears in navigation and renders as plain markdown
- [ ] **TGT-06**: A single malformed file (bad YAML, unparseable structure) is isolated to its own view — it never blanks another page or crashes the app
- [ ] **TGT-07**: Pointing at a nonexistent path, or a directory with no `.planning/`, produces a clear message naming the problem and the path checked
- [ ] **TGT-08**: Every view shows when its data was read from disk, and a Refresh action re-reads the project

### Situational Awareness

The "where am I overall" pain.

- [ ] **DASH-01**: Landing view shows current milestone, current phase number and name, status, and progress, sourced from `STATE.md` frontmatter
- [ ] **DASH-02**: Landing view shows what comes next and what is blocked
- [ ] **DASH-03**: Landing view shows work awaiting human verification
- [ ] **DASH-04**: Formal completion state (`ROADMAP.md` checkboxes) and observed disk state (presence of `SUMMARY.md` files) are presented as two separate signals, and any disagreement between them is visible rather than collapsed into one number

### Roadmap & Phases

- [ ] **ROAD-01**: Roadmap view renders every phase with its goal, success criteria, mapped requirements, and dependencies
- [ ] **ROAD-02**: A phase's plans are shown grouped by wave, including which waves are blocked on which
- [ ] **ROAD-03**: The phase dependency shape renders as a legible flow rather than raw ASCII art
- [ ] **ROAD-04**: Phase identity is milestone-qualified throughout the app, so v1.0 Phase 1 and v2.0 Phase 1 are never conflated

### Artifact Reading

The "reviewing plans/output" pain.

- [ ] **READ-01**: Markdown renders with GFM tables, syntax-highlighted code blocks, task lists, and blockquotes
- [ ] **READ-02**: YAML frontmatter renders as structured panels — `must_haves`, `coverage`, `key_links`, `progress` presented as tables and badges, not raw YAML
- [ ] **READ-03**: `PLAN.md`'s literal pseudo-XML tags (`<objective>`, `<task type="...">`, `<decision>`) render as visible structure — never swallowed as HTML blocks, never leaked as garbage text
- [ ] **READ-04**: Rendered markdown is sanitized, so no HTML embedded in an artifact can execute
- [ ] **READ-05**: A plan and its summary are readable together, matching the plan's `must_haves.truths` against the summary's `coverage` entries
- [ ] **READ-06**: Headings in rendered documents carry stable anchors, so search results and cross-references can deep-link to a specific section

### Navigation & Cross-Linking

The navigation half of the "finding buried artifacts" pain. GSD's cross-references are plain
prose mentions, not markdown links, so this requires building an ID registry and a
prose-scanning linkifier — there are no existing links to render.

- [ ] **NAV-01**: A tree navigator mirrors `.planning/`'s real structure — root docs, `phases/`, `quick/`, `milestones/`, `research/` — expandable per phase
- [ ] **NAV-02**: Requirement IDs appearing in prose (`AUTH-01`) become clickable links to the phase covering that requirement
- [ ] **NAV-03**: Phase and plan references appearing in prose become clickable links to those phases and plans
- [ ] **NAV-04**: A reference to an ID with no definition renders as plain text, never as a broken link
- [ ] **NAV-05**: A requirements traceability view shows requirement → phase → status
- [ ] **NAV-06**: URLs are shareable and bookmarkable, mapping onto milestone → phase → plan → artifact
- [ ] **NAV-07**: The loaded snapshot exposes a decision-mention index (decision ID → the files mentioning it), verifiable through the data-layer harness — built now so decision linking can be added later without reworking the assembly pass

### Search

The search half of "finding buried artifacts."

- [ ] **FIND-01**: Full-text search covers every file in `.planning/`
- [ ] **FIND-02**: The index is built from source markdown, not rendered text, so exact tokens (`ROLE-07`, `backend/src/authz/mod.rs`) match reliably
- [ ] **FIND-03**: Results are grouped by phase and artifact type
- [ ] **FIND-04**: Each result shows a snippet with the match highlighted
- [ ] **FIND-05**: Index construction does not block first paint

### Milestone History

- [ ] **HIST-01**: Archived milestones are viewable and visually distinct from the active milestone
- [ ] **HIST-02**: Archived phase trees under `milestones/` are browsable

### Presentation

- [ ] **UI-01**: The interface uses studio-portal's visual language — its oklch token palette, shadcn `base-sera` component style, lucide icons, and squared-corner convention
- [ ] **UI-02**: Light and dark themes both render correctly, with contrast verified on real long-form artifact content
- [ ] **UI-03**: Wide content (tables, code blocks, diagrams) scrolls inside its own container; the page body never scrolls horizontally

### Data Layer

Architectural requirements. They are listed because PROJECT.md names three future directions
(multi-project, live watching, write-back) that a reader baked into the UI would block, and
because fixture testing is the only real defense against overfitting.

- [ ] **DATA-01**: Filesystem access sits behind an interface that admits a multi-project source, a watcher-backed source, and eventually a writing source, without changes downstream of it
- [x] **DATA-02**: Artifact parsing dispatches on filename pattern with a generic markdown handler registered last and matching unconditionally — frontmatter presence is never used as the dispatch signal
- [ ] **DATA-03**: `config.json` and the artifact-type set are parsed as open maps; unknown keys and unknown types are preserved rather than dropped
- [ ] **DATA-04**: The whole project snapshot is rebuildable through a single `refresh()` entry point — the same seam a future file watcher will call
- [ ] **DATA-05**: A non-UI harness dumps the parsed snapshot as JSON, so parsing can be tested without rendering
- [ ] **DATA-06**: Two synthetic test fixtures exist — one sparse project and one dense project containing artifact types absent from studio-portal — and the dashboard renders both

## v2 Requirements

Deferred to future releases. Tracked but not in the current roadmap.

### Findability Enhancements

- **BACK-01**: Backlinks panel on requirements, decisions, and phases — "what else references this"
- **BACK-02**: Decision ID (`D-XX`) and warning ID (`WR-XX`) mentions become clickable, extending NAV-07's index into the UI
- **FIND-06**: Faceted search — filter results by requirement ID, phase, or artifact type
- **NAV-08**: Command palette (Cmd-K) quick-jump, reusing the search index

### Reading Enhancements

- **READ-07**: Sticky table of contents on long documents
- **READ-08**: Fuller plan-vs-outcome pairing — every documented deviation surfaced against the specific task it departed from

### Dashboard Enhancements

- **DASH-05**: Static recent-activity strip, read on load from `STATE.md`'s decision log and quick-task table

### Platform Directions

- **PLAT-01**: Live file-watching with push updates to the browser — the read layer is built to admit this without restructuring
- **PLAT-02**: Multi-project registry and switcher
- **PLAT-03**: Driving GSD commands from the UI, turning the viewer into a control surface
- **PLAT-04**: Adopt `gsd-tools query` for structural facts as a parser-drift elimination, if the independent parser proves costly to maintain

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Graph view of files, decisions, or requirements | GSD's cross-references are inferred prose mentions, not authored links — the result is a hairball of hub nodes with no discoverable structure, and it cannot show status or type, which is what actually matters here. A filtered backlinks list carries the same information legibly and cheaply. |
| Kanban board | GSD phases advance through a fixed sequence with no lateral movement to visualize, and a board implies write interactions this tool must never have. The roadmap's own wave/checkbox list with status badges covers it. |
| Gantt or timeline chart | GSD produces no calendar-scheduled dates — only after-the-fact durations and a dependency shape. A Gantt would have to invent data that does not exist. |
| AI-assisted "ask your docs" search | New dependency surface (model, key, cost, latency, hallucination risk) serving no confirmed pain better than good full-text search with grouping already does. |
| Write-back or inline editing of any `.planning/` file | GSD's own tooling owns these files' invariants. A viewer that writes can corrupt planning state; one that cannot write can never do harm. |
| Curated per-type aggregate pages (all Decisions, all Learnings) | Considered and rejected in favor of search plus navigation. Roughly 15 artifact types would each need bespoke aggregation logic for content already reachable two other ways. |
| Git history or blame browser over `.planning/` | A second parallel data source with its own indexing and UI, serving a curiosity ("how did this evolve") that is not one of the three confirmed pains. A file mtime covers the cheap version. |
| Notification or activity system with unread state | One user, no live updates in v1 — there is nobody to notify and nothing pushing. |
| GSD skills, agents, and hooks surface | Research confirmed these hold no state a dashboard could usefully show. They configure GSD's behavior; they are not planning artifacts. This resolves the open question PROJECT.md left. |
| Authentication, hosting, multi-user access | Runs locally, for one person, on their own machine. |
| Packaging, publishing, or distribution | A personal tool, not a released product. If that changes it becomes a later milestone, not a v1 constraint. |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TGT-01 | Phase 1 | Complete |
| TGT-02 | Phase 1 | Complete |
| TGT-03 | Phase 4 | Pending |
| TGT-04 | Phase 4 | Pending |
| TGT-05 | Phase 4 | Pending |
| TGT-06 | Phase 4 | Pending |
| TGT-07 | Phase 4 | Pending |
| TGT-08 | Phase 4 | Pending |
| DASH-01 | Phase 2 | Pending |
| DASH-02 | Phase 2 | Pending |
| DASH-03 | Phase 2 | Pending |
| DASH-04 | Phase 2 | Pending |
| ROAD-01 | Phase 2 | Pending |
| ROAD-02 | Phase 2 | Pending |
| ROAD-03 | Phase 2 | Pending |
| ROAD-04 | Phase 2 | Pending |
| READ-01 | Phase 2 | Pending |
| READ-02 | Phase 2 | Pending |
| READ-03 | Phase 2 | Pending |
| READ-04 | Phase 2 | Pending |
| READ-05 | Phase 2 | Pending |
| READ-06 | Phase 2 | Pending |
| NAV-01 | Phase 3 | Pending |
| NAV-02 | Phase 2 | Pending |
| NAV-03 | Phase 2 | Pending |
| NAV-04 | Phase 2 | Pending |
| NAV-05 | Phase 3 | Pending |
| NAV-06 | Phase 2 | Pending |
| NAV-07 | Phase 1 | Pending |
| FIND-01 | Phase 3 | Pending |
| FIND-02 | Phase 3 | Pending |
| FIND-03 | Phase 3 | Pending |
| FIND-04 | Phase 3 | Pending |
| FIND-05 | Phase 3 | Pending |
| HIST-01 | Phase 2 | Pending |
| HIST-02 | Phase 2 | Pending |
| UI-01 | Phase 2 | Pending |
| UI-02 | Phase 2 | Pending |
| UI-03 | Phase 2 | Pending |
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 1 | Pending |
| DATA-05 | Phase 1 | Pending |
| DATA-06 | Phase 1 | Pending |

**Per-phase totals:**

- Phase 1: 9 requirements
- Phase 2: 23 requirements
- Phase 3: 7 requirements
- Phase 4: 6 requirements

**Coverage:**

- v1 requirements: 45 total
- Mapped to phases: 45
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-21*
*Last updated: 2026-08-21 after roadmap creation (traceability populated)*

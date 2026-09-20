# Requirements: Labelore — v1.1 Legible Documents

**Defined:** 2026-09-20
**Core Value:** Open the dashboard on a GSD project and immediately know where the work stands and
where any planning artifact lives — without reading a single file by hand.

**Milestone premise:** v1.0 made every artifact *reachable*. None of it is *legible* — a
DISCUSSION-LOG, a VERIFICATION and a PLAN all render identically through one generic markdown
pipeline. v1.1 makes each type show what it is actually for.

Requirement IDs continue from v1.0 (archived at `milestones/v1.0-REQUIREMENTS.md`). `READ-07` and
`BACK-02` are promoted out of that milestone's v2 list; `VIEW` is a new category.

## v1.1 Requirements

### Document Views

- [x] **VIEW-01**: Each artifact type renders through a view selected for that type, rather than one
      undifferentiated reader
- [x] **VIEW-02**: A discussion log shows, for each question, the options that were offered and which
      one was chosen
- [ ] **VIEW-03**: A verification report leads with what still needs human verification — each check,
      what is expected, and why a person is required
- [ ] **VIEW-04**: A plan shows its task structure, including each section's position and whether it
      gates
- [ ] **VIEW-05**: All 16 known artifact types have a registered view, not a subset
- [ ] **VIEW-06**: An artifact type with no registered view still renders structurally, inferred from
      its shape, and is marked unrecognized rather than presented as understood

### Reading Surface

- [ ] **READ-07**: Long documents carry a table of contents that tracks reading position and stays
      legible at every viewport width
- [x] **BACK-02**: `D-XX` decision and `WR-XX` warning mentions are clickable and resolve to their
      source

### Visual Consistency

- [x] **UI-04**: The design language shared by the dashboard, roadmap, traceability and search pages
      is written down as a stated convention
- [x] **UI-05**: That convention is enforced by a test, so a new view cannot silently drift from it
- [ ] **UI-06**: Every document view uses that language — moving between a document and the dashboard
      reads as one application

## Implementation Context

Not requirements — the established facts a plan should build on, so it does not re-derive them.
Full basis: `.planning/notes/artifact-structure-survey.md` (425 files surveyed),
`.planning/research/questions.md` (categorization decision, resolved 2026-09-20).

**Extraction keys on where a type's structure lives, not on its purpose.** Three strategies, two of
which already ship:

| Strategy | Status | Types |
|---|---|---|
| Frontmatter projection | Exists — parsed by gray-matter, already serialized to the client, currently never read | PLAN, SUMMARY, VERIFICATION, REVIEW, MILESTONE-AUDIT |
| Tag projection | Exists — `renderPlanRange` in `src/rendering/markdown.ts` | PLAN body |
| Section projection | To build — composes `splitSections` / `splitSubsections` / `parseMarkdownTable`, all already shipping and tested in `src/planning-repo/handlers/markdown-sections.ts` | CONTEXT, RESEARCH, PATTERNS, UI-SPEC, UAT, VALIDATION, SECURITY, UI-REVIEW, ROADMAP, REQUIREMENTS, REVIEW-FIX, DISCUSSION-LOG |

- `kind` must go granular. Today 11 of 16 types collapse into two catch-alls (`frontmatter-only`,
  `unknown`); with no purpose taxonomy, `kind` is the only presentation axis and needs real keys.
  `FrontmatterOnlyHandler` stays a legitimate shared *parse* path — this is a presentation change.
- VIEW-03 needs **no handler work**: `human_verification[]` is already an array of
  `{test, expected, why_human}` on the wire.
- VIEW-02's anchor is the `| Option | Description | Selected |` table with `✓` — audited at 12/12
  discussion logs. The `**User's choice:**` prose line already has two spellings, so treat it as
  tolerant enrichment, never the anchor.
- UI-04's language is real and already cross-referenced between pages (`history-*`,
  `roadmap-loading`, `search-group-label`, `status-chip[data-tone]`, `section-heading`, `empty-note`,
  `lede`, `page-intro`). `.claude/CLAUDE.md` still says "Conventions not yet established."
- READ-07's `DocumentOutline` exists and is already sticky. The gap is appearance and
  reading-position tracking, not existence.
- `src/planning-repo/mentions.ts` already exists for BACK-02.

**Cleared before this milestone:** the categorization question (resolved 2026-09-20) and the
document page frame (quick task `260920-mzr`), so views inherit a correct container.

## Deferred

Tracked, not in this roadmap.

### Reading Enhancements

- **READ-08**: Fuller plan-vs-outcome pairing — every documented deviation surfaced against the
  specific task it departed from. *PLAN and SUMMARY still get their own views in v1.1 as 2 of the
  16 types; the deviation-pairing feature is what is deferred.*

### Findability Enhancements

- **BACK-01**: Backlinks panel on requirements, decisions, and phases
- **FIND-06**: Faceted search — filter by requirement ID, phase, or artifact type. *Becomes
  practical after v1.1: filtering by artifact type needs the granular `kind` this milestone produces.*
- **NAV-08**: Command palette (Cmd-K) quick-jump, reusing the search index

### Dashboard Enhancements

- **DASH-05**: Static recent-activity strip from `STATE.md`'s decision log and quick-task table

### Platform Directions

- **PLAT-01**: Live file-watching with push updates — still the strongest platform signal; the read
  layer, the `refresh()` seam and the TanStack Query layer all admit it without restructuring
- **PLAT-02**: Multi-project registry and switcher
- **PLAT-03**: Driving GSD commands from the UI
- **PLAT-04**: Adopt `gsd-tools query` for structural facts

## Out of Scope

| Feature | Reason |
|---------|--------|
| Writing to `.planning/` | Labelore is strictly read-only. Unchanged and absolute. |
| A purpose/category taxonomy over artifact types | Considered and rejected 2026-09-20 — purpose does not predict extraction strategy, so it adds a second taxonomy to keep in sync for no gain. See `research/questions.md`. |
| Adopting `gsd-tools query` during this milestone | This milestone extends the independent parser with per-type manifests. Replacing the foundation while building on it is the wrong order. PLAT-04 stays deferred. |
| Rewriting the dashboard, roadmap or traceability pages | They are the reference the document views conform to, not work items. |

## Traceability

Mapped during roadmap creation, 2026-09-20. The milestone is a single phase, so every requirement
maps to Phase 5; the wave column records where it is expected to land inside that phase.

| Requirement | Phase | Wave (suggested) | Status |
|-------------|-------|------------------|--------|
| VIEW-01 | Phase 5 | 1 — Foundation (view registry, granular `kind`) | Complete |
| VIEW-02 | Phase 5 | 3 — Proof (DISCUSSION-LOG end to end) | Complete |
| VIEW-03 | Phase 5 | 4 — Coverage (view only; no handler work) | Pending |
| VIEW-04 | Phase 5 | 4 — Coverage | Pending |
| VIEW-05 | Phase 5 | 4 — Coverage | Pending |
| VIEW-06 | Phase 5 | 2 — Extraction (section projection + speculative fallback) | Pending |
| READ-07 | Phase 5 | Any — independent of the registry work | Pending |
| BACK-02 | Phase 5 | Any — independent of the registry work | Complete |
| UI-04 | Phase 5 | 1 — Foundation (convention written down) | Complete |
| UI-05 | Phase 5 | 1 — Foundation (convention enforced by test) | Complete |
| UI-06 | Phase 5 | Conformance condition across waves 1-4 | Pending |

**Coverage:**

- v1.1 requirements: 11 total
- Mapped to phases: 11 (all to Phase 5)
- Unmapped: 0
- Duplicated across phases: 0

---
*Requirements defined: 2026-09-20*
*Last updated: 2026-09-20 after roadmap creation — Phase 5 mapped, 11/11 covered*

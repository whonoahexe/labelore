# Phase 2: Situational Awareness & Artifact Reading - Context

**Gathered:** 2026-08-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 turns the Phase 1 read-layer snapshot into GSD Lore's first usable web interface. It delivers
the project-status landing view, roadmap and archived-milestone views, safe long-form artifact
rendering, paired plan/summary reading, milestone-qualified routes, heading anchors, and prose links
for requirements, phases, and plans. It also establishes the studio-portal-derived visual shell in
light and dark themes.

This phase does not add search, the full filesystem tree browser, requirements traceability, live file
watching, write-back, multi-project switching, or a rich dependency-graph canvas. Those remain later
or future capabilities.

</domain>

<decisions>
## Implementation Decisions

### Landing-Page Hierarchy

- **D-01:** The first screen is current-position-first. Lead with the current milestone, phase, status,
  and immediate next work; progress and exceptions follow rather than competing with that answer.
- **D-02:** Use one primary progress display. Keep observed disk completion as a compact, explicitly
  sourced secondary signal and surface a prominent discrepancy alert when it differs from formal
  roadmap completion. The two underlying signals remain distinct even though they do not receive equal
  visual weight.
- **D-03:** Combine blockers, human-verification waits, and status discrepancies into one prioritized
  **Needs attention** list. Every item carries a clear type label.
- **D-04:** Show one explicit immediate next item with a short explanation of why it is next, followed by
  the next two items in a quieter preview. Do not turn the landing page into the full remaining-work
  queue.

### Roadmap and Milestone Browsing

- **D-05:** The primary roadmap is a vertical phase flow ordered by execution, using compact dependency
  connectors and status markers rather than a graph canvas.
- **D-06:** Each phase is compact by default: identity, status, goal, dependencies, and progress are
  always visible. Success criteria, mapped requirements, and wave-grouped plans expand in place.
- **D-07:** Archived milestones live in a dedicated, clearly labeled history section. Use subdued visual
  treatment and expandable archived phase trees so history is reachable without competing with the
  active milestone.
- **D-08:** Within an expanded phase, render plans in vertically stacked wave bands. Plans appear as rows
  inside each band, with explicit `blocked by` labels wherever dependencies require them.

### Artifact-Reading Experience

- **D-09:** Artifact pages use a document-first reading canvas: breadcrumbs, title, artifact type, and a
  compact structured summary lead directly into the rendered document.
- **D-10:** Known frontmatter fields such as `must_haves`, `coverage`, `key_links`, and `progress` receive
  artifact-aware tables, badges, or panels. Unknown fields remain visible in a generic key/value panel;
  specialized presentation must never become a reason to drop unfamiliar data.
- **D-11:** PLAN pseudo-XML becomes semantic document structure. `<objective>`, `<task>`, and `<decision>`
  render as labeled sections, nested markdown renders normally, and meaningful attributes such as task
  type become badges. Literal tags must neither disappear as HTML nor leak as garbage text.
- **D-12:** A paired plan/summary page begins with a truth-to-coverage matrix matching the plan's
  `must_haves.truths` against summary `coverage`, then renders the full plan and full summary as stacked
  sections with jump links. Preserve full reading width for tables and code.

### Deep Links and Document Navigation

- **D-13:** Bookmarkable URLs use a readable, milestone-qualified hierarchy encoding milestone, phase,
  plan, and artifact identity. Duplicate phase numbers across milestones must never collide.
  — **Reversibility:** costly — changing the public route shape after links are copied would invalidate
  bookmarks, cross-links, and Phase 3 search-result destinations.
- **D-14:** Clicking a recognized requirement, phase, or plan ID opens a preview first rather than
  navigating immediately. The preview includes an explicit **Open** action.
- **D-15:** Link previews are compact and type-aware: show identity, title, status, location, and the most
  useful type-specific detail (requirement text, phase goal, or plan objective), without becoming a
  miniature full page.
- **D-16:** Headings reveal a copy-link affordance on pointer hover and keyboard focus. Activating it
  updates and copies the stable section URL; anchor controls are not permanently visible and the URL
  does not automatically change during scrolling.
- **D-17:** Carry forward Phase 1's dangling-reference rule: if an ID has no resolved definition, render
  it as ordinary text with no broken link or misleading preview affordance.

### the agent's Discretion

- Exact spacing, typography scale, responsive breakpoints, and low-level component composition within
  the required studio-portal visual language.
- Exact route segment names and slug-normalization mechanics, provided D-13's milestone-qualified,
  readable hierarchy and stable identity constraints hold.
- Preview placement, dismissal mechanics, and subtle transitions, provided pointer and keyboard users
  receive equivalent access.
- Exact dependency-connector drawing technique for the vertical flow. Phase 1 preserves the roadmap's
  free-form dependency text; research and planning may choose the safest derivation strategy without
  expanding this phase into a graph editor or graph canvas.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope and Locked Project Constraints

- `.planning/ROADMAP.md` §"Phase 2: Situational Awareness & Artifact Reading" — phase goal, dependency,
  23 mapped requirements, six success criteria, three-plan sizing, and UI hint.
- `.planning/REQUIREMENTS.md` — DASH-01–04, ROAD-01–04, READ-01–06, NAV-02–04, NAV-06, HIST-01–02,
  and UI-01–03 are the complete Phase 2 requirement set. READ-07/08 and DASH-05 are v2, not Phase 2.
- `.planning/PROJECT.md` — core value, read-only boundary, one-project-per-run constraint, explicit v1
  exclusions, visual-language source, and forward-compatibility obligations.
- `.planning/STATE.md` — current phase/status plus the concern that Phase 2 spans six subsystems and
  should be decomposed by subsystem rather than by view.
- `.planning/phases/01-read-layer-domain-model/01-CONTEXT.md` — locked read-layer decisions and the
  downstream contracts this UI must consume without re-litigating.

### Architecture, Stack, and Failure Modes

- `.planning/research/ARCHITECTURE.md` §"Render Flow", §"Domain Model", §"Anti-Patterns", and
  §"Phase B — Situational-awareness UI shell" — UI/repository boundary, generic view fallback,
  milestone-qualified identity, routing/rendering scope, and forbidden direct filesystem access.
- `.planning/research/STACK.md` — resolved Vite/React/Hono stack; `react-router`; markdown pipeline and
  plugin order; Shiki lifecycle; Mermaid handling; Tailwind/shadcn portability; and exact theme-source
  files. Treat recorded versions as research inputs to verify, not licenses to upgrade blindly.
- `.planning/research/PITFALLS.md` #2, #5, #6, #7, #10 plus §"UX Pitfalls" and §"Looks Done But Isn't"
  — pseudo-XML corruption, duplicate phase identity, plan/summary pairing, raw-HTML XSS, theme drift,
  long-document overflow, and real-corpus verification traps.
- `.planning/research/GSD-DOMAIN.md` — artifact inventory, milestone archive layout, phase/plan naming,
  structured-data shapes, markdown conventions, and cross-reference namespaces the routes and views
  must represent.
- `.claude/CLAUDE.md` §"Technology Stack" and §"Constraints" — project-local resolved stack and the
  non-negotiable read-only, portable, theme-only relationship with studio-portal.

### Visual Source of Truth (read-only external reference)

- `/home/cinedise/studio-portal/frontend/app/globals.css` — oklch theme tokens, Tailwind mappings, and
  squared-corner styling source.
- `/home/cinedise/studio-portal/frontend/components.json` — shadcn `base-sera` configuration and
  component conventions; adapt for Vite rather than copying Next/RSC settings blindly.
- `/home/cinedise/studio-portal/frontend/components/theme-toggle.tsx` — light/dark interaction reference,
  not a code dependency.
- `/home/cinedise/studio-portal/frontend/package.json` — reference dependency inventory only; GSD Lore
  remains independently built and must not import from studio-portal at runtime.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `src/planning-repo/snapshot.ts` — `PlanningRepository.load()` / `refresh()` is the only load seam the
  server layer should call. It returns a complete snapshot with `readAt`, load status, warnings, and
  the assembled project.
- `src/domain/model.ts` — already exposes milestone-qualified `PhaseIdentity`, active/archived
  milestones, separate `roadmapComplete` and `diskStatus`, paired `Plan.summary`, requirements, and the
  mention index needed by link-aware views.
- `src/planning-repo/handlers/roadmap.ts` — supplies structured phase blocks, success criteria,
  requirements, plan checklist state, archived milestone groups, and the raw dependency shape.
- `src/planning-repo/handlers/plan.ts` — deliberately preserves PLAN bodies and pseudo-XML verbatim for
  the Phase 2 renderer instead of pre-rendering or discarding their structure.

### Established Patterns

- The dependency direction is one-way: `planning-fs` → `planning-repo` → zero-I/O domain model. UI and
  route code consume repository/domain outputs and must not import Node filesystem code or handlers.
- Status-like values and config/artifact maps are open rather than closed enums. Views need graceful
  generic fallbacks for future values and unknown artifact kinds.
- Dangling references are normal data (`resolved: null`), while warnings are reserved for genuine read
  or parse degradation. UI attention states must preserve that distinction.
- Snapshot refresh produces a new immutable view of the corpus. Do not add route-local filesystem reads
  or independent caches that can disagree with the snapshot.

### Integration Points

- Add the Hono/Node delivery layer above `PlanningRepository`; expose snapshot-derived data to the
  React app without leaking filesystem concerns into client components.
- Add the Vite/React shell and milestone-qualified React Router route tree. Every preview, breadcrumb,
  and heading link should resolve through the same canonical route builder.
- Add a render-time artifact view registry parallel to the parser registry: specialized known-kind
  views with an unconditional generic markdown fallback.
- Add the markdown/pseudo-XML/link-rewrite pipeline over `Artifact.body`, resolving references through
  the assembled domain model and leaving `resolved: null` mentions untouched.
- Build the landing and roadmap view models from `Project`, `Milestone`, `Phase`, and `Plan`; do not
  derive authoritative progress by re-parsing displayed markdown in the browser.

</code_context>

<specifics>
## Specific Ideas

- The landing page should feel quiet when the project is healthy: current position and next work lead;
  discrepancy and attention treatment becomes prominent only when something needs action.
- The roadmap should read vertically like an execution narrative, not like a dashboard of equally
  weighted cards. Expansion reveals detail without forcing a separate phase-detail detour.
- Long-form artifact content keeps the main reading width. Metadata rails and permanent side-by-side
  plan/summary panes were rejected in favor of compact headers and stacked documents.
- Link previews are deliberate orientation aids: enough context to decide whether to leave the current
  document, followed by an explicit Open action.
- Light/dark behavior, wide tables, code blocks, and diagrams must be tested with real long-form GSD
  artifacts rather than toy markdown.

</specifics>

<deferred>
## Deferred Ideas

- Add a richer dependency graph canvas in a future phase. Phase 2 intentionally uses the vertical
  phase flow with compact connectors; ROAD-03's legible-flow requirement must still be satisfied now.

</deferred>

---

*Phase: 2-situational-awareness-artifact-reading*
*Context gathered: 2026-08-25*

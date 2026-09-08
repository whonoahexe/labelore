# Phase 4: Portability & Degradation Hardening - Context

**Gathered:** 2026-09-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 proves the existing dashboard against sparse, unfamiliar, partially broken, and invalid GSD
projects. It hardens every existing surface so missing optional content is an honest empty state,
unknown artifacts remain readable, and one malformed file cannot damage unrelated views. It also
exposes snapshot age and a manual Refresh action wired through the existing single `refresh()` seam.

This phase does not add live file watching, project switching, write-back, authentication, hosting,
or new artifact-specific readers. It validates and presents the forward-compatible behavior already
designed in Phases 1–3.

</domain>

<decisions>
## Implementation Decisions

### Refresh Experience

- **D-01:** Put the Refresh action beside the global “Snapshot read” timestamp in the application
  header. It is one project-wide action, not a duplicate control on every page.
- **D-02:** While refresh is running, keep the current snapshot fully visible and change the global
  status to “Refreshing…”. Do not dim, disable, or replace the current page with a loading screen.
- **D-03:** After a successful refresh, preserve the current route but return the page to the top.
- **D-04:** If refresh fails after a valid snapshot has loaded, retain that previous snapshot and its
  original read timestamp. Report the failure with a small transient toast; do not add a persistent
  stale label and do not replace the content with a failure screen.
- **D-05:** A successful refresh replaces all snapshot-derived presentation data together. The
  timestamp, tree, search index, routes, and page data must not show a mixture of old and new states.
  — **Reversibility:** costly — independent per-view refresh lifecycles would undo the established
  single-snapshot contract and require coordinating every consumer separately.

### Missing-Content States

- **D-06:** Keep every recognized optional directory group (`quick/`, `research/`, `milestones/`, and
  equivalent groups) visible in the tree even when it is absent. Its empty group explicitly shows
  that the content is not present in this project.
- **D-07:** Preserve the tree as a literal disk mirror: never fabricate disabled file nodes for absent
  `UI-SPEC.md`, `SECURITY.md`, or other optional artifacts. A relevant phase/view section may show one
  empty state, but only real files appear as file nodes.
- **D-08:** Use one compact generic empty-state message everywhere: “Nothing here yet.”
- **D-09:** Normal absence uses quiet inline styling with a neutral icon and short message. It must not
  resemble a warning, parse failure, or application error.

### Damaged-Artifact Treatment

- **D-10:** When structured parsing fails but the Markdown body survives, render the recovered body
  normally and place a compact warning badge beside the artifact-type label. Do not interrupt the page
  with a persistent warning banner.
- **D-11:** Opening the warning badge reveals a plain-language summary of what failed and what survived.
  Raw technical details (including path, parser stage, and message) live in a secondary expandable
  section.
- **D-12:** Mark a damaged artifact with a warning indicator in both the tree and search results before
  the user opens it. The artifact remains navigable in both places.
- **D-13:** When the recovered body is readable, index and rank it normally. Do not demote or exclude it
  merely because its structured metadata degraded; carry the warning indicator alongside the result.

### Invalid-Project Screen

- **D-14:** A startup target that is missing, unreadable, or lacks `.planning/` gets a dedicated,
  branded whole-app failure screen. Keep branding and theme control, but hide project navigation,
  search, and the tree because there is no valid project to navigate.
- **D-15:** Use the same generic “Project could not be loaded” treatment for every load-status type.
  Show the status-specific detailed message below it rather than giving each failure a distinct visual
  design.
- **D-16:** Present the exact checked path in a prominent, copyable code-style field. When the path as
  typed differs from its resolved form, show both values.
- **D-17:** Provide a copyable example terminal command for restarting Labelore with a corrected project
  path. Do not add an in-app project picker or switcher.

### the agent's Discretion

- Exact Refresh icon, loading animation, toast placement, and toast duration within the established
  studio-portal visual language.
- The warning badge icon, popover/disclosure component, and wording of the plain-language salvage
  summary, provided the required technical fields remain available on demand.
- The neutral empty-state icon and spacing around “Nothing here yet.”
- Exact generic failure-screen illustration/icon and copyable-command affordance.
- Test organization and fixture-mutation mechanics, provided all six mapped requirements and every
  roadmap success criterion receive automated adversarial coverage.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope and Requirements

- `.planning/ROADMAP.md` §“Phase 4: Portability & Degradation Hardening” — phase goal, six mapped
  requirements, five success criteria, and two-plan roadmap sizing.
- `.planning/REQUIREMENTS.md` §“Targeting & Portability” — TGT-03 through TGT-08 are the complete Phase
  4 requirement set.
- `.planning/PROJECT.md` §“Constraints” and §“Key Decisions” — read-only boundary, one-project-per-run
  model, generic degradation rule, and the explicitly deferred watcher/project-switching/write-back
  capabilities.

### Locked Upstream Contracts

- `.planning/phases/01-read-layer-domain-model/01-CONTEXT.md` — fixture strategy, per-file warning and
  salvage contract, uniform non-throwing load statuses, and the immutable `refresh()` seam this phase
  must expose rather than replace.
- `.planning/phases/02-situational-awareness-artifact-reading/02-CONTEXT.md` — global snapshot
  presentation, generic artifact renderer, established error/attention distinction, and the rule that
  views consume repository/domain output without filesystem access.
- `.planning/phases/03-search-browsing-traceability/03-CONTEXT.md` — literal tree behavior, unknown-file
  navigation, warning propagation into search, and lockstep search-index/snapshot refresh.

### Architecture and Failure Modes

- `.planning/research/ARCHITECTURE.md` — snapshot-based loading, internal dependency boundaries,
  generic artifact fallback, degradation strategy, and forward-compatibility seams.
- `.planning/research/PITFALLS.md` — especially parser overfitting, per-file frontmatter isolation,
  local path ergonomics, and the project’s “looks done but isn’t” portability checks.

No external specs were introduced during this discussion.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `src/planning-repo/snapshot.ts` — `PlanningRepository.refresh()` already rebuilds and atomically
  publishes a new immutable snapshot carrying `readAt`, `loadStatus`, warnings, and exclusions.
- `src/server/project-presentation.ts` — `ProjectPresentation` already transports snapshot age, load
  status, root path, artifact warnings, and empty arrays for failed loads.
- `src/web/components/app-shell.tsx` — the global header already renders “Snapshot read” and its
  timestamp; this is the insertion point for D-01 through D-04.
- `src/web/pages/artifact-page.tsx` — already renders recovered Markdown and artifact/document warnings;
  its current inline warning treatment becomes the badge/disclosure behavior in D-10 and D-11.
- `src/cli/target-path.ts` — centralizes canonicalization and the four load-status messages, including
  typed and resolved path details needed by D-15 through D-17.

### Established Patterns

- All UI data flows `planning-fs → planning-repo → domain → presentation → web`; Phase 4 must not add
  route-local filesystem access.
- Missing optional data is represented by nulls/empty collections, while warnings are reserved for
  genuine read or parse degradation.
- Unknown artifact kinds remain open values and flow through a generic Markdown renderer.
- TanStack Query owns client requests, but the snapshot and search index have one shared server-side
  refresh lifecycle rather than independent invalidation rules.

### Integration Points

- `src/server/index.ts` currently captures artifact/presentation/search structures during app creation;
  refresh must update these through one coherent server-side source rather than leaving startup-cached
  indexes stale.
- `src/presentation/tree.ts` already emits every recognized location group, even when empty, and every
  real artifact leaf; it needs explicit empty-group presentation and warning metadata without fake
  files.
- `src/web/pages/dashboard-page.tsx` currently handles invalid load status only inside the dashboard;
  the dedicated D-14 failure state belongs above the routed project shell.
- Existing sparse/dense fixtures and `test/degradation.test.ts` already prove repository-level
  isolation and refresh invariants; Phase 4 extends that proof through the full server and browser UI.

</code_context>

<specifics>
## Specific Ideas

- Keep snapshot age and Refresh adjacent: the action that changes the data sits beside the timestamp
  that says how old it is.
- Refresh should feel like updating the current reading session, not navigating away: retain the route,
  keep content visible during work, then return to the top when the replacement arrives.
- “Nothing here yet” is deliberately generic and quiet. A missing optional artifact is not damage.
- Degraded files remain useful: warn early in the tree/search, explain on demand, and preserve normal
  search ranking whenever the body survived.
- Invalid-project recovery stays terminal-oriented: show exactly what was checked and supply a command
  to restart with another path, without smuggling a project switcher into v1.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 4-Portability & Degradation Hardening*
*Context gathered: 2026-09-03*

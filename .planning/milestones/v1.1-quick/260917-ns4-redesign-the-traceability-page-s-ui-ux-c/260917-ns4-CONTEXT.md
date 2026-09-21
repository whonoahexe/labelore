# Quick Task 260917-ns4: Redesign the traceability page's UI/UX - Context

**Gathered:** 2026-09-17
**Status:** Ready for planning

<domain>
## Task Boundary

Redesign the traceability page's UI/UX. Context from exploration: (1) add an at-a-glance summary
strip up top — coverage %, uncovered count, mismatch count — instead of requiring row-by-row
reading to find the story; (2) split requirements into an active tier (front-and-center) and a
History section for older tiers/milestones, reusing the existing .history-section/.history-milestone
collapsible treatment from roadmap-page.tsx rather than inventing new visual language; (3) move
away from the flat HTML table toward something with real visual hierarchy and proportion cues
(e.g. per-category coverage bars); user confirmed dislikes: "plain tables feel flat", "no sense of
proportion", "filter bar feels bolted on". User confirmed status chips
(Complete/Incomplete/Uncovered/Mismatch) are NOT a problem — leave that treatment alone.

Relevant files: src/web/pages/traceability-page.tsx, src/web/pages/traceability-filter.ts,
src/presentation/traceability.ts, src/web/pages/roadmap-page.tsx (pattern reference),
src/web/styles/globals.css (trace-* and history-* rules).

</domain>

<decisions>
## Implementation Decisions

### Coverage bar semantics
- Segmented three-way bar (covered / uncovered / mismatched) next to each category heading, plus
  one overall aggregate bar in the summary strip. Solves the "no sense of proportion" complaint at
  both the page level and the per-category level.

### Summary strip scope
- Restyled stat tiles for total / uncovered / mismatch counts, plus the one overall aggregate
  coverage bar from the decision above. The filter bar (search input + status buttons) folds into
  this same header area rather than floating above the tables, per the exploration's "bolted on"
  complaint.

### History + filter interaction
- Add a separate, off-by-default "search history too" toggle. With it off (default), the
  search/status filter only touches the active tier's requirements; History stays collapsed
  regardless. Turning it on extends the filter to archived tiers as well.

### Claude's Discretion
- Tier → milestone mapping reliability (surfaced during exploration, not selected as a gray area
  in this discussion pass — treat as open and resolve during planning): requirement `tier`
  (`RequirementDto`) is a free-form string and isn't guaranteed 1:1 with milestone `version`.
  Confirm how reliably tiers map to archived milestones before committing to grouping requirements
  by milestone in the History section; fall back to grouping by tier alone if that mapping proves
  fuzzy.
- Exact visual styling of the segmented bars (colors, corner radius, sizing) — follow the
  project's existing oklch token palette and squared-corner design language; no new visual
  language beyond what's needed for the bar/stat-tile components themselves.
- Whether the per-category bar sits inline with the `<h2>` or on its own line beneath it — pick
  whichever reads cleanest against the existing `.trace-category > h2` spacing.

</decisions>

<specifics>
## Specific Ideas

- Reuse `.history-section` / `.history-milestone` / `.history-tree` CSS and the `<details>`-based
  collapsible pattern from `roadmap-page.tsx` (`HistoryMilestone`, lines ~278-309) verbatim rather
  than inventing a new collapsible treatment.
- Status chips (`RequirementStatusChip`, `.status-chip`) are explicitly out of scope — keep as-is.

</specifics>

<canonical_refs>
## Canonical References

No external specs — requirements fully captured in decisions above.

</canonical_refs>

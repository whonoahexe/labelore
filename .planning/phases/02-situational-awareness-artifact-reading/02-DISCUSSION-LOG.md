# Phase 2: Situational Awareness & Artifact Reading - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-25
**Phase:** 2-Situational Awareness & Artifact Reading
**Areas discussed:** Landing-page hierarchy, Roadmap and milestone browsing, Artifact-reading experience, Deep links and document navigation

---

## Landing-Page Hierarchy

### First-screen emphasis

| Option | Description | Selected |
|--------|-------------|----------|
| Current position first | Lead with milestone, phase, status, and what is next; progress and exceptions follow. | ✓ |
| Progress first | Lead with completion metrics and the roadmap-versus-disk comparison. | |
| Attention first | Lead with blockers, verification waits, and status disagreements. | |

**User's choice:** Current position first.
**Notes:** This best matches the project's core “where am I?” question.

### Completion signals

| Option | Description | Selected |
|--------|-------------|----------|
| Two labeled signals side by side | Give roadmap and observed-on-disk completion equal visibility. | |
| Single progress display with discrepancy alert | Keep one primary display and emphasize the second signal when the values differ. | ✓ |
| Separate status cards | Give each completion signal a detailed card. | |

**User's choice:** Single progress display with discrepancy alert.
**Notes:** The observed disk signal remains explicit but visually compact during normal agreement so the requirement's two-source distinction is preserved.

### Attention items

| Option | Description | Selected |
|--------|-------------|----------|
| One Needs attention list | Combine blockers, verification waits, and discrepancies with type labels. | ✓ |
| Separate sections | Give blockers and verification waits separate cards. | |
| Inline with current phase | Attach details to phases/plans and show only a landing-page count. | |

**User's choice:** One Needs attention list.
**Notes:** Items are prioritized rather than merely grouped.

### Upcoming work

| Option | Description | Selected |
|--------|-------------|----------|
| One explicit next item plus a short preview | Explain the immediate next item and show two quieter upcoming items. | ✓ |
| Full upcoming queue | Show every remaining phase and plan. | |
| Immediate next item only | Show no preview beyond the single next item. | |

**User's choice:** One explicit next item plus a short preview.
**Notes:** The roadmap remains the place for the full queue.

---

## Roadmap and Milestone Browsing

### Primary roadmap shape

| Option | Description | Selected |
|--------|-------------|----------|
| Vertical phase flow | Stack phase cards in execution order with compact connectors and status markers. | ✓ |
| Dependency graph canvas | Use graph nodes with details opened separately. | |
| Structured phase list plus mini-map | Pair a detailed list with a separate compact dependency diagram. | |

**User's choice:** Vertical phase flow for now.
**Notes:** The user explicitly wants a richer graph canvas later; it is deferred beyond Phase 2.

### Phase-card density

| Option | Description | Selected |
|--------|-------------|----------|
| Compact summary with expandable details | Show essential phase facts and expand criteria, requirements, and plans in place. | ✓ |
| Everything expanded | Show all required phase content immediately. | |
| Summary cards with a separate detail page | Keep the roadmap minimal and move detail to another route. | |

**User's choice:** Compact summary with expandable details.
**Notes:** Expansion stays on the roadmap page.

### Archived milestones

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated history section | Keep active work focused and show subdued, expandable archives separately. | ✓ |
| Inline beneath the active milestone | Put collapsed archived milestones on the active roadmap page. | |
| Active/archive toggle | Show one mode at a time. | |

**User's choice:** Dedicated history section.
**Notes:** Archived phase trees remain fully reachable.

### Waves and blocking

| Option | Description | Selected |
|--------|-------------|----------|
| Stacked wave bands | Show vertical wave groups with plan rows and explicit blocked-by labels. | ✓ |
| Parallel swimlanes | Use columns and connectors to emphasize concurrency. | |
| Simple grouped lists | Use wave headings and text-only dependency labels. | |

**User's choice:** Stacked wave bands.
**Notes:** Dependency labels remain explicit even when connectors are present.

---

## Artifact-Reading Experience

### Reader emphasis

| Option | Description | Selected |
|--------|-------------|----------|
| Document-first reading canvas | Show compact identity/context and begin the rendered body immediately. | ✓ |
| Metadata-first inspector | Lead with comprehensive frontmatter and extracted structure. | |
| Two-column reader | Keep metadata in a persistent side rail. | |

**User's choice:** Document-first reading canvas.
**Notes:** Breadcrumbs, title, artifact type, and a compact structured summary precede the body.

### Frontmatter presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Artifact-aware panels plus a generic remainder | Specialize known fields and retain unfamiliar fields generically. | ✓ |
| One universal structured table | Render every artifact's fields through the same table. | |
| Compact summary with expandable details | Hide most structured data behind disclosure controls. | |

**User's choice:** Artifact-aware panels plus a generic remainder.
**Notes:** Unknown fields must remain visible rather than being dropped.

### PLAN pseudo-XML

| Option | Description | Selected |
|--------|-------------|----------|
| Semantic document blocks | Turn tags into labeled sections, render nested markdown, and badge useful attributes. | ✓ |
| Subtle inline structure | Remove the tag-oriented appearance and use ordinary headings/dividers. | |
| Code-like framed blocks | Preserve a visibly tag-oriented source feel. | |

**User's choice:** Semantic document blocks.
**Notes:** Literal tags should neither be swallowed as HTML nor leak as garbage text.

### Plan/summary pairing

| Option | Description | Selected |
|--------|-------------|----------|
| Shared comparison header, then full documents | Start with a truth-to-coverage matrix, then stack both complete documents. | ✓ |
| Synchronized split view | Put plan and summary side by side on wide screens. | |
| Plan/summary tabs with persistent coverage panel | Show one full document at a time under a shared comparison panel. | |

**User's choice:** Shared comparison header, then full documents.
**Notes:** Use jump links and preserve full reading width for wide content.

---

## Deep Links and Document Navigation

### URL shape

| Option | Description | Selected |
|--------|-------------|----------|
| Milestone-qualified hierarchy | Encode milestone, phase, plan, and artifact identity readably. | ✓ |
| Filesystem-path routes | Mirror each artifact's relative `.planning/` path. | |
| Opaque stable IDs | Keep hierarchy out of the URL. | |

**User's choice:** Milestone-qualified hierarchy.
**Notes:** The route must prevent same-numbered phases in different milestones from colliding.

### Prose-link activation

| Option | Description | Selected |
|--------|-------------|----------|
| Navigate normally in the same reader | Open the target immediately and rely on browser history. | |
| Preview first | Show target context and require a second action to navigate. | ✓ |
| Open a side panel | Keep the source visible while showing the target beside it. | |

**User's choice:** Preview first.
**Notes:** Navigation occurs only through the preview's explicit Open action.

### Link-preview content

| Option | Description | Selected |
|--------|-------------|----------|
| Compact type-aware summary | Show identity, title, status, location, one useful type-specific detail, and Open. | ✓ |
| Context excerpt only | Show only nearby definition text. | |
| Rich mini-view | Include progress, dependencies, and related links. | |

**User's choice:** Compact type-aware summary.
**Notes:** Requirement text, phase goal, or plan objective is selected according to target type.

### Heading anchors

| Option | Description | Selected |
|--------|-------------|----------|
| Anchor affordance on heading hover/focus | Reveal a copy-link control contextually. | ✓ |
| Always-visible heading links | Keep anchor icons permanently visible. | |
| Automatic URL tracking | Update the URL fragment while scrolling. | |

**User's choice:** Anchor affordance on heading hover/focus.
**Notes:** Activation updates and copies the stable section URL; keyboard users receive the same affordance.

---

## the agent's Discretion

The user did not explicitly delegate any product decision with “you decide.” Low-level implementation
choices remain open only within the constraints recorded in `02-CONTEXT.md`, including exact spacing,
route segment spelling, preview positioning, and the connector-drawing technique.

## Deferred Ideas

- Add a richer dependency graph canvas in a future phase. Phase 2 uses a vertical phase flow with
  compact dependency connectors.

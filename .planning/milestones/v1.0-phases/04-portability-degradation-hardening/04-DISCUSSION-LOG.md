# Phase 4: Portability & Degradation Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-03
**Phase:** 4-Portability & Degradation Hardening
**Areas discussed:** Refresh experience, Missing-content states, Damaged-artifact treatment, Invalid-project screen

---

## Refresh Experience

### Refresh placement

| Option | Description | Selected |
|--------|-------------|----------|
| Global header | Beside “Snapshot read”; keeps project-wide age and action together | ✓ |
| Page header | Duplicate the action in each page’s content header | |
| Both | Put redundant controls in both locations | |

**User's choice:** Global header.

### In-progress behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Keep content visible | Mark the global status “Refreshing…” without disrupting reading | ✓ |
| Dim and disable | Preserve context but interrupt interaction | |
| Loading replacement | Replace the page with a loading state | |

**User's choice:** Keep the current snapshot visible.

### Successful refresh navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve route and position | Stay at the same reading position when possible | |
| Preserve route, return to top | Keep the current page but restart reading at its beginning | ✓ |
| Return to dashboard | Navigate home after every refresh | |

**User's choice:** Preserve the route but return to the top.

### Failed refresh

| Option | Description | Selected |
|--------|-------------|----------|
| Persistent stale state | Keep old data with a permanent stale label and error | |
| Failure replacement | Remove old content and show the failure screen | |
| Small error toast | Keep old data and original timestamp; report failure transiently | ✓ |

**User's choice:** Keep the previous snapshot with a small error toast and no persistent stale label.
**Notes:** The unchanged original timestamp continues to state the retained snapshot’s age.

---

## Missing-Content States

### Absent optional directories

| Option | Description | Selected |
|--------|-------------|----------|
| Visible empty groups | Keep each recognized group and explicitly show that it is absent | ✓ |
| Omit groups | Remove optional groups that have no files | |
| User toggle | Hide them unless “Show absent sections” is enabled | |

**User's choice:** Keep absent optional directory groups visible.

### Absent optional files

| Option | Description | Selected |
|--------|-------------|----------|
| Section-level empty state | No fake file nodes; one empty message in the relevant section | ✓ |
| Placeholder file rows | Show disabled rows for expected optional filenames | |
| Hide section | Render nothing when there are no matching files | |

**User's choice:** Preserve the literal tree and use a section-level empty state.

### Empty-state wording

| Option | Description | Selected |
|--------|-------------|----------|
| Context-specific | Name each absent content type and explain that it is optional | |
| Generic | Use “Nothing here yet” consistently | ✓ |
| Technical | Include exact directories and patterns checked | |

**User's choice:** One compact generic message everywhere.

### Empty-state prominence

| Option | Description | Selected |
|--------|-------------|----------|
| Quiet inline | Neutral icon and short message | ✓ |
| Bordered panel | Occupy the missing section’s normal space | |
| Warning callout | Present normal absence as attention-worthy | |

**User's choice:** Quiet inline treatment.

---

## Damaged-Artifact Treatment

### Page-level warning

| Option | Description | Selected |
|--------|-------------|----------|
| Persistent banner | Warning below the heading before recovered content | |
| On-demand badge | Compact badge beside artifact type; details open on request | ✓ |
| Warning after content | Put degradation information after the document | |

**User's choice:** On-demand warning badge.

### Warning details

| Option | Description | Selected |
|--------|-------------|----------|
| Layered detail | Plain-language failure/salvage summary plus expandable technical detail | ✓ |
| Raw diagnostics | Only path, parser stage, and raw error | |
| Minimal message | Only say that metadata is unavailable | |

**User's choice:** Layered plain-language and technical detail.

### Advance indication

| Option | Description | Selected |
|--------|-------------|----------|
| Tree and search | Mark degradation in both discovery surfaces | ✓ |
| Search only | Warn only where parsing can affect results | |
| Artifact page only | Give no warning before the file opens | |

**User's choice:** Mark damaged artifacts in both tree and search.

### Search participation

| Option | Description | Selected |
|--------|-------------|----------|
| Normal rank | Search the recovered body normally and retain the warning indicator | ✓ |
| Demote | Include the file below equally relevant healthy results | |
| Exclude | Leave the file reachable only through navigation | |

**User's choice:** Search and rank recovered readable content normally.

---

## Invalid-Project Screen

### Shell treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated branded screen | Keep branding/theme but hide invalid project controls | ✓ |
| Complete shell | Keep navigation, search, and tree around a dashboard error | |
| Plain error page | Render outside normal application styling | |

**User's choice:** Dedicated whole-app failure screen.

### Failure differentiation

| Option | Description | Selected |
|--------|-------------|----------|
| Specific treatment | Different heading, icon, and recovery hint per status | |
| Generic treatment | One visual treatment with status-specific detail beneath it | ✓ |
| Separate designs | Completely distinct screen per status | |

**User's choice:** One generic failure treatment.

### Recovery guidance

| Option | Description | Selected |
|--------|-------------|----------|
| Restart command | Exact path plus a copyable corrected startup example | ✓ |
| Retry same target | Retry the unchanged target from the UI | |
| Details only | Leave all recovery to the terminal without guidance | |

**User's choice:** Show a copyable restart command.

### Path display

| Option | Description | Selected |
|--------|-------------|----------|
| Prominent typed/resolved fields | Copyable path display; show both forms when different | ✓ |
| Resolved path in prose | Include only the canonical path in the message | |
| Collapsed details | Hide path information until requested | |

**User's choice:** Prominent copyable path field with typed and resolved forms when applicable.

---

## the agent's Discretion

- Exact icons, spacing, animation, toast duration, disclosure component, and diagnostic phrasing.
- Test layout and fixture-mutation mechanics within the locked acceptance behavior.

## Deferred Ideas

None.

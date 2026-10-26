# Phase 7: Recognised Files and Readable URLs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md. This log preserves the alternatives considered.

**Date:** 2026-10-26
**Phase:** 07-recognised-files-and-readable-urls
**Areas discussed:** Current-milestone URLs; Plan, summary and token URLs; Images and binary files; Internal files and old links

---

## Current-milestone URLs

| Option | Description | Selected |
|--------|-------------|----------|
| Always | /labelore/v2.1/phase-7. Never changes at milestone close | ✓ |
| Short for live | /labelore/phase-7 while live, then moves at close | |
| Both work | Real URL carries the milestone, short form redirects | |

**User's choice:** Always carry the milestone.

| Option | Description | Selected |
|--------|-------------|----------|
| Drop the segment | /labelore/phase-2 for unversioned projects | |
| current | /labelore/current/phase-2 | |
| You decide | Planner picks within research rules | ✓ |

**User's choice:** You decide.

| Option | Description | Selected |
|--------|-------------|----------|
| Milestone page | /v2.1 opens today's milestone page | |
| Redirect to roadmap | /v2.1 jumps to that milestone's roadmap | ✓ |

**User's choice:** Redirect to roadmap.

| Option | Description | Selected |
|--------|-------------|----------|
| Retire it | Drop the milestone page, roadmap covers it | |
| Keep at /v2.1/overview | Keep the page at its own named address | ✓ |

**User's choice:** Keep at /v2.1/overview.

| Option | Description | Selected |
|--------|-------------|----------|
| /labelore/roadmap | Live roadmap has one address | ✓ |
| /labelore/v2.1/roadmap | Every milestone's roadmap reads the same way | |

**User's choice:** /labelore/roadmap.

---

## Plan, summary and token URLs

| Option | Description | Selected |
|--------|-------------|----------|
| /plan-03/summary | Summary tab gets a real path, one URL per file | ✓ |
| Keep ?doc=summary | Query string on the same page | |

| Option | Description | Selected |
|--------|-------------|----------|
| No, /plan-03 is the plan | No alias | ✓ |
| Yes, and redirect | /plan-03/plan redirects | |

| Option | Description | Selected |
|--------|-------------|----------|
| Lowercased token | /phase-7/context, /phase-7/ui-spec | ✓ |
| Keep the filename | /phase-7/07-CONTEXT | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, same as plans | /quick/<id> plan, /quick/<id>/summary | ✓ |
| Use the task slug | /quick/fix-drawer-scroll | |

**User's choice:** The recommended option throughout.

---

## Images and binary files

| Option | Description | Selected |
|--------|-------------|----------|
| The image | Plain page with the image, name, size, dimensions; SVG as <img> | ✓ |
| Info card only | No preview | |
| Not openable | Listed only | |

| Option | Description | Selected |
|--------|-------------|----------|
| Info card | Name, type, size, folder; contents not shown | ✓ |
| Info card + open raw | Adds a raw-serve link | |

| Option | Description | Selected |
|--------|-------------|----------|
| Inline with a type mark | In their folder, with icon and size | |
| Grouped under 'Assets' | Separate group per folder | |
| You decide | Follow design-language.md | ✓ |

**Notes:** Size limits for huge text files are left to the planner.

---

## Internal files and old links

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, via file/ only | Reachable but unadvertised | |
| Unreachable | Not indexed, 404 | ✓ |
| Hidden drawer toggle | "Show internal files" switch | |

| Option | Description | Selected |
|--------|-------------|----------|
| Silent redirect | Replace URL in place, no notice | ✓ |
| Redirect + brief notice | "This link has moved" | |

| Option | Description | Selected |
|--------|-------------|----------|
| Normal not-found page | Names the path it looked for | ✓ |
| Nearest parent | Fall back to phase or milestone page | |

| Option | Description | Selected |
|--------|-------------|----------|
| Indefinitely | Keep the legacy parser | |
| Remove at v2.1 close | Delete the redirector when the milestone closes | ✓ |

---

## Claude's Discretion

- The URL form for unversioned projects (recommendation: drop the milestone segment).
- How binaries appear in the drawer.
- Size limits for huge text files and the binary-detection rule.
- Deriving the project slug before Phase 8 (basename, kebab-cased, shared reserved-word constant).

## Deferred Ideas

- Remove the legacy URL redirector at v2.1 milestone close.
- A raw-serve link for non-image binaries (declined for now).
- A "show internal files" drawer toggle (declined).

# Phase 6: Trustworthy Tests and Security Baseline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-25
**Phase:** 06-trustworthy-tests-and-security-baseline
**Areas discussed:** Replacing real-project tests, What made-up content looks like, Secret masking rules, View-mode outline cap

---

## Replacing real-project tests

| Option | Description | Selected |
|--------|-------------|----------|
| One made-up project | Single invented GSD project; unit and browser tests both read it | ✓ |
| Small fixtures per test | Each test file gets its own tiny folder | |
| Both | Shared project plus small edge-case fixtures | |

**User's choice:** One made-up project

| Option | Description | Selected |
|--------|-------------|----------|
| Re-pin on new data | Keep intent, recalculate numbers on the made-up project | ✓ |
| Keep only behaviour tests | Drop "real file still has N items" tests | |

**User's choice:** Re-pin on new data

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, remove it too | Treat Labelore's own .planning/ as live data | |
| No, it's fine | It's committed in this repo; leave those tests | ✓ |

**User's choice:** No, it's fine

| Option | Description | Selected |
|--------|-------------|----------|
| Leave them as they are | Existing made-up trees and goldens untouched | ✓ |
| Fold into the new project | Merge all, redo goldens | |

**User's choice:** Leave them as they are

| Option | Description | Selected |
|--------|-------------|----------|
| No, remove it entirely | No committed test mentions real projects | ✓ |
| Opt-in flag | Separate command runs checks against real projects | |

**User's choice:** No, remove it entirely

---

## What made-up content looks like

| Option | Description | Selected |
|--------|-------------|----------|
| Keep structure, new words | Rewrite every word/name/ID but keep headings, tables, quirks | ✓ |
| Fresh from GSD templates | New files from GSD templates | |

**User's choice:** Keep structure, new words

| Option | Description | Selected |
|--------|-------------|----------|
| One invented app | A single fictional product | ✓ |
| Neutral placeholders | Generic wording | |
| You pick a theme | User names the project | |

**User's choice:** One invented app

| Option | Description | Selected |
|--------|-------------|----------|
| Standing test | Fails if a fixture contains a deny-listed private name | ✓ |
| One-time audit | Audit once, written list of replacements | |

**User's choice:** Standing test

| Option | Description | Selected |
|--------|-------------|----------|
| Hashed words | Store only hashes of private words | |
| Plain list is fine | Names already public in today's helpers | ✓ |
| Local file, ignored by git | Test skips elsewhere | |

**User's choice:** Plain list is fine

---

## Secret masking rules

| Option | Description | Selected |
|--------|-------------|----------|
| GSD's list + name pattern | GSD's three keys plus *key*/*token*/*secret*/*password*/*credential* | |
| GSD's list only | Exactly what GSD masks | ✓ |

**User's choice:** GSD's list only

| Option | Description | Selected |
|--------|-------------|----------|
| GSD's style: ****abcd | Last 4 shown; **** if short; (unset) if empty | ✓ |
| Fully hidden | Always **** | |

**User's choice:** GSD's style

| Option | Description | Selected |
|--------|-------------|----------|
| Masked text in place | Raw file identical except secret values | |
| Re-formatted JSON | Masked parsed object pretty-printed | ✓ |

**User's choice:** Re-formatted JSON

| Option | Description | Selected |
|--------|-------------|----------|
| Mask only text values | true/false and numbers shown as-is | ✓ |
| Mask every value, like GSD | Even false shows as **** | |

**User's choice:** Mask only text values

---

## View-mode outline cap

| Option | Description | Selected |
|--------|-------------|----------|
| Same 18 as Source mode | Matches the roadmap wording; long docs cut off | ✓ |
| High safety cap, e.g. 200 | Real documents never reach it | |

**User's choice:** Same 18 as Source mode

| Option | Description | Selected |
|--------|-------------|----------|
| A '+N more sections' line | Last row reports omitted count | ✓ |
| Silent cut-off | Outline just stops | |

**User's choice:** A '+N more sections' line

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, both modes | Source mode gets the line too | |
| View mode only | Leave Source until Phase 12 | ✓ |

**User's choice:** View mode only

| Option | Description | Selected |
|--------|-------------|----------|
| Plain text | Only reports the count | ✓ |
| Jumps to the 19th section | Scrolls to first omitted section | |

**User's choice:** Plain text

---

## Claude's Discretion

- Growth-ratio timing test design, linkify fix, raw-HTML guard shape, loud-failure mechanism for browser tests, zero-skip enforcement, invented app theme, "+N more" counting rule.

## Deferred Ideas

- "+N more sections" in Source mode — Phase 12 Source redesign
- Name-pattern secret detection — rejected for now

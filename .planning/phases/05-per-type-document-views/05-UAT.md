---
status: testing
phase: 05-per-type-document-views
source: [05-VERIFICATION.md]
started: 2026-09-21T06:15:00Z
updated: 2026-09-21T06:15:00Z
---

## Current Test

number: 1
name: Discussion-log and REVIEW.md View/Source toggle, light and dark
expected: |
  View mode renders questions+chips as one application with the dashboard; Source shows the full document; toggling never changes the URL
awaiting: user response

## Tests

### 1. Discussion-log and REVIEW.md View/Source toggle, light and dark
expected: Open `/milestones/m~v1.1/.../05-DISCUSSION-LOG.md` and a real REVIEW.md, toggle View/Source, in both light and dark themes. View mode renders questions+chips as one application with the dashboard; Source shows the full document; toggling never changes the URL.
result: [pending]

### 2. Outline scroll tracking and narrow trigger/popover, keyboard only
expected: At ~1200px and ~600px, in both light and dark, scroll a real RESEARCH.md and operate the narrow trigger/popover with keyboard only (Tab to focus, Enter to open, Escape to close and return focus). Active entry tracks scroll at wide width; trigger stays pinned and its label updates at narrow width; popover is fully keyboard-operable.
result: [pending]

### 3. VERIFICATION, PLAN and unrecognized-kind fallback read as one application
expected: Open a real VERIFICATION with checks (v1.0 phase 04), a real PLAN, and a real unrecognized-kind artifact (v1.0 phase 04 COVERAGE.md) in both light and dark. All three read as one coherent application with the dashboard; the Unrecognized-type chip reads as neutral, never as an error.
result: [pending]

### 4. Full end-of-phase checklist across at least six artifact kinds
expected: Walk the full end-of-phase checklist from 05-06-PLAN.md's `<human-check>` block: DISCUSSION-LOG, VERIFICATION (both shapes), a PLAN via the tree, COVERAGE.md and WINDOWS.md fallbacks, RESEARCH.md outline at both widths, cross-page navigation (dashboard/roadmap/traceability/search), and WR-01/D-01 reference previews — all in both light and dark. Every surface reads as the same application; wide tables/code/Mermaid inside promoted sections still render correctly.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

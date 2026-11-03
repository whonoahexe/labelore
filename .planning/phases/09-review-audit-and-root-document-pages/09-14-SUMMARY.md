---
phase: 09-review-audit-and-root-document-pages
plan: 14
subsystem: ui
tags: [milestone-audit, handler, view, frontmatter, react, css]
requires:
  - phase: 09-review-audit-and-root-document-pages
    provides: status-square, the view-local CSS block idiom, formatStamp, ResearchInline (09-07 to 09-13)
provides:
  - MilestoneAuditHandler and structured.audit (verdict, date, scores, gaps, tech debt, Nyquist, unclaimed keys)
  - composeMilestoneAudit and MilestoneAuditView / auditHeaderProps
  - Lendshed made-up v1.0 audit fixture
affects: [09-16 user review]
actions: none
actuals:
  tokens: 62000
  tasks: 2
  commits: 2
plan_head_before: 922d3c9b7d0bd4cc6a28416bf0d42a9aeb325600
plan_head_after: 7c2ae18493d2afce7012c0ca2a8d88104adcdc51
commits: 2
tech-stack:
  added: []
  patterns: [extractor split from handler so a throwing extractor is provable, claimed-key accounting so unreadable keys fall to extras]
key-files:
  created:
    - src/planning-repo/handlers/milestone-audit.ts
    - src/planning-repo/handlers/milestone-audit-body.ts
    - src/web/views/milestone-audit.ts
    - src/web/views/milestone-audit-components.tsx
    - test/fixtures/lendshed/.planning/milestones/v1.0-MILESTONE-AUDIT.md
    - test/milestone-audit-handler.test.ts
    - test/web/milestone-audit.test.ts
    - test/web/milestone-audit-view-contract.test.ts
  modified:
    - src/planning-repo/handlers/index.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/pages/artifact-page.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/__golden__/dense.json
    - test/handlers.test.ts
key-decisions:
  - "Frontmatter wins over a disagreeing Status line; the prose line stays in the narrative untouched"
  - "A frontmatter key the reading cannot read is listed in extras rather than dropped"
  - "Partial score segments are in-flight with unmet units missing (UI-SPEC), full are complete, none are missing"
  - "Hyphens in row labels are kept so ids such as TGT-08 are not humanised"
requirements-completed: [VIEW-08]
duration: 35min
completed: 2026-11-03
status: complete
---

# Phase 9 Plan 14: Milestone audit page Summary

**A milestone audit opens on its verdict chip and audited date, then scores, gaps ("No gaps" when empty), tech debt by phase with closed items told apart, Nyquist, every unclaimed frontmatter key and a folded Audit narrative, read from all four real audit shapes.**

## Accomplishments
- MilestoneAuditHandler (registered before the generic handler) normalises the canonical frontmatter shape, this repo's object-debt shape, the dense prose-only shape and the old heading-and-sentence shape; frontmatter first, prose only for verdict and date.
- Cover: eyebrow, milestone name/version/title as h1, verdict chip at --fs-7 beside "Audited {date}"; an absent or unknown status reads "Verdict not stated" or its own words in the quiet tone, never Passed.
- Scores tiles with segmented (up to 24) or proportional bars; gaps groups; debt grouped by phase with id and status chips, closed items complete and outside the total; Nyquist chips (numbers zero-padded); unclaimed keys as labelled rows; narrative folded, open for prose-only audits.
- Caps and linear scans throughout (T-09-28); author text through ResearchInline (T-09-29); view contract test incl. a four-font-size check on the CSS block.
- Screenshot check (headless Chrome, 1280 and 390) on Lendshed, this repo's own audit and the dense prose-only audit: all three read as designed.

## Task Commits
1. **Task 1: /v1.0/audit opens on its verdict and audited date** - `248f8fc` (feat)
2. **Task 2: scores, gaps, debt by phase, Nyquist, unclaimed keys, narrative** - `7c2ae18` (feat)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Handler/extractor split into two files**
- **Found during:** Task 1 (throwing-extractor test needs a mockable module boundary)
- **Fix:** extractor and types live in `milestone-audit-body.ts`; `milestone-audit.ts` holds the handler and re-exports `extractMilestoneAudit` and `MilestoneAuditBody`, so the plan's export contract holds.
- **Commit:** 248f8fc

**2. [Rule 1 - Bug] test/handlers.test.ts asserted the audit falls to GenericMarkdownHandler**
- **Fix:** now asserts MilestoneAuditHandler (file not in the plan's files_modified).
- **Commit:** 248f8fc

**3. [Rule 1 - Bug] Token guard rejected `gap: 2px`; id labels were humanised ("TGT 08")**
- **Fix:** `var(--space-0-5)`; humanise only underscores.
- **Commit:** 7c2ae18

Other notes: tests were run with the main checkout's vitest/tsc/eslint/vite binaries (the worktree has no node_modules), so `npm run test:gate` was not used; the full vitest run (239 files, 5339 tests, no skips) and typecheck, lint and `vite build` all pass. `systemctl --user restart labelore` was skipped per the worktree instructions; the orchestrator restarts after merge. Debt heading is singularised ("1 item across 1 phase"). An all-empty Nyquist block still shows its Overall chip and reason so nothing is dropped.

**Total deviations:** 3 auto-fixed. **Impact:** none on scope.

## Known Stubs
None.

## Threat Flags
None.

## Next Phase Readiness
Ready for 09-15 and the user's visual review in 09-16.

## Self-Check: PASSED
Created files exist, commits 248f8fc and 7c2ae18 are on the branch, acceptance greps pass.

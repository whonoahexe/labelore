---
phase: 05-per-type-document-views
plan: 02
subsystem: ui
tags: [design-system, vocabulary-guard, vitest, css, documentation]

# Dependency graph
requires:
  - phase: 05-per-type-document-views
    provides: "Plan 05-01's view registry (VIEW_LOCAL_PREFIXES in src/web/views/kinds.ts), which this plan's D-09 namespace check imports directly"
provides:
  - "docs/design-language.md — the single, written-down design language (UI-04): 40 shared vocabulary rows, the seven-tone table, the history-*/plan-section* families, the D-09 reserved view-local namespace rule, six non-name conventions, and a 212-name surface-scoped appendix covering every className the four reference pages plus shell/nav/tree-navigator/reference-preview/document-page chrome actually use"
  - "test/web/class-vocabulary.test.ts — a class-vocabulary allowlist test (UI-05) that derives its sanctioned names entirely from docs/design-language.md's table rows, auto-allows the D-09 view-local namespace, and fails any future view that invents an undocumented class or data-tone value"
  - ".claude/CLAUDE.md § Conventions — a one-line pointer to docs/design-language.md"
affects: [05-03-per-type-document-views, 05-04-per-type-document-views, 05-05-per-type-document-views, 05-06-per-type-document-views]

actuals:
  tokens: 9758
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Vocabulary-as-doc: the design language lives in a repo markdown doc, machine-parsed by the enforcing test — no parallel test-side allowlist array can drift from it (D-08)."
    - "Brace-walked className extraction: for className={…} expressions, walk to the matching close brace and collect every quoted string literal and template-literal static segment inside it — deliberately over-inclusive (it also picks up Button variant/size prop values from buttonVariants({...}) call sites), with the over-collection resolved by documenting the extra tokens rather than teaching the scanner AST-level precision."
    - "Comparison-aware data-tone extraction: quoted literals immediately preceded by === or !== inside a data-tone={…} ternary are excluded, so a comparison operand (status === 'Complete') is never mistaken for the tone value the attribute actually resolves to (complete/active/quiet) — necessary for the two reference-page ternaries (dashboard-page.tsx, plan-pair-page.tsx) to pass by construction."

key-files:
  created:
    - docs/design-language.md
    - test/web/class-vocabulary.test.ts
  modified:
    - .claude/CLAUDE.md

key-decisions:
  - "The className={...} brace-walk collects every quoted string in the expression, not just the literal(s) that end up as the rendered className — this is what the plan's own read_first pointers (search-field.tsx:108, sidebar-drawer.tsx:18-29) implied, so 'ghost', 'sm', 'icon-sm' (Button variant/size prop values, not CSS classes) are documented in the Shell-and-navigation appendix with a note explaining why, rather than adding AST-level precision to the scanner."
  - "data-tone extraction needed a narrower rule than className extraction: a blind brace-walk over data-tone={…} ternaries would flag comparison operands ('Complete', 'Awaiting Checkpoint', 'In Progress', 'exact') as undocumented tones on dashboard-page.tsx and plan-pair-page.tsx, breaking D-10 and the 'exactly seven tone rows' acceptance criterion simultaneously. Resolved with a targeted heuristic: skip a quoted literal immediately preceded by === or !==. Verified against every real data-tone={…} call site in the codebase."
  - "metadata-panel-known has no CSS rule of its own (only metadata-panel-generic adds a dashed-border modifier) — documented anyway per the plan's explicit instruction, since the class name is real DOM output (metadata-panel-${panel.presentation}) even though it carries no bespoke styling yet."

requirements-completed: [UI-04, UI-05]

coverage:
  - id: D1
    description: "docs/design-language.md exists with the eight required ## headings, documents every UI-SPEC seed-list class plus the Phase 5 shared additions (document-view-toggle, document-outline-trigger, view-block, metadata-panel-known/generic), the seven-row Tones table, the D-09 view-local namespace rule, six non-name conventions, and a 212-entry surface-scoped appendix; CLAUDE.md § Conventions now points to it in exactly one line"
    requirement: UI-04
    verification:
      - kind: unit
        ref: "shell acceptance-criteria script — 8 headings present in order, 6 spot-checked class rows present, Tones section has exactly 7 rows, appendix has 212 (>=150) backticked first-cell names, git diff --quiet on all 4 reference pages, CLAUDE.md diff is exactly 1 insertion/1 deletion"
        status: pass
    human_judgment: false
  - id: D2
    description: "test/web/class-vocabulary.test.ts derives its allowlist by parsing docs/design-language.md (no test-side array), auto-allows the D-09 view-<kind>-<suffix> namespace via VIEW_LOCAL_PREFIXES, scans className/data-tone literals across src/web/views, src/web/pages and src/web/components (excluding components/ui/), and fails on any name outside the vocabulary — verified with a planted mkdtemp positive control; all 4 reference pages pass unmodified"
    requirement: UI-05
    verification:
      - kind: unit
        ref: "test/web/class-vocabulary.test.ts — 5 specs: full-repo className scan, full-repo data-tone scan, view-local namespace pass/fail boundary and near-miss cases, template-literal prefix resolution, planted mkdtemp positive control asserting exactly totally-invented/loud are reported"
        status: pass
      - kind: integration
        ref: "npx vitest run test/web/class-vocabulary.test.ts (5/5 passed), npm test (877/877 passed across 58 files), npm run lint (0 errors, 0 warnings)"
        status: pass
    human_judgment: false

# Metrics
duration: 15min
completed: 2026-09-20
status: complete
plan_head_before: 9d17cea0f5b453a3e8b611528425c1f7c8b5a269
---

# Phase 5 Plan 02: Design language doc + class-vocabulary allowlist test Summary

**The dashboard/roadmap/traceability/search design language is now written down once in
`docs/design-language.md` (40 shared classes, 7 tones, 212-entry surface inventory) and enforced
by a 5-spec vitest allowlist test that fails any future view inventing an undocumented class.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-09-20T15:32:39Z (approx., continuing directly from 05-01's completion)
- **Completed:** 2026-09-20T15:47:20Z
- **Tasks:** 2 completed
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- `docs/design-language.md` written with the eight required `## ` sections: Purpose, Shared
  vocabulary (40 rows), Tones (exactly 7 rows), Families (`history-*`/`plan-section*`), Reserved
  view-local namespace (the D-09 rule in prose), Language beyond names (spacing tokens, two-weight
  typography, 10% accent reservation, squared corners, light/dark parity, `EMPTY_STATE_MESSAGE`,
  `ArtifactHeader`), Surface-scoped registered names (212 backticked names across Dashboard,
  Roadmap, Traceability, Search, Shell and navigation, Tree navigator, Reference preview, Document
  pages), and How to extend
- `.claude/CLAUDE.md` § Conventions now reads a single pointer line to the doc, leaving the
  heading and `<!-- GSD:conventions-end -->` marker untouched (exactly 1 insertion/1 deletion)
- `test/web/class-vocabulary.test.ts` implements `parseVocabulary`/`extractClassTokens`/
  `extractToneTokens`/`viewLocalPattern`/`checkTokens` and five specs (repo-wide className scan,
  repo-wide data-tone scan, view-local namespace boundary cases, template-literal prefix
  resolution, planted mkdtemp positive control) — all green on the first full run, with the four
  reference pages passing unmodified by construction
- `npx vitest run test/web/class-vocabulary.test.ts`, `npm test` (877/877) and `npm run lint`
  (0 errors, 0 warnings) all pass clean; `package.json`/`package-lock.json` untouched (zero new
  dependencies)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write docs/design-language.md from the four reference pages and UI-SPEC** — `8c492ae` (docs)
2. **Task 2: The class-vocabulary allowlist test (D-08/D-09/D-10)** — `f4868ba` (test)

## Files Created/Modified

- `docs/design-language.md` — the design language doc; 8 sections, 40 shared-vocabulary rows,
  7-row Tones table, 212-name surface appendix (built by a one-off node extraction script mirroring
  the test's own scanner, run over the 4 reference pages + shell/nav + tree navigator + reference
  preview + document-page chrome — not committed, scratchpad-only)
- `test/web/class-vocabulary.test.ts` — `parseVocabulary`, `extractClassTokens`,
  `extractToneTokens`, `viewLocalPattern`, `checkTokens`; 5 `it` cases
- `.claude/CLAUDE.md` — § Conventions body replaced with the one-line pointer

## Decisions Made

See `key-decisions` in frontmatter — three decisions: accepting the className brace-walk's
over-collection of Button prop values (documented rather than AST-precision-engineered), the
comparison-aware `data-tone` extraction heuristic (required for D-10 + the exactly-seven-tones
acceptance criterion to both hold simultaneously), and documenting `metadata-panel-known` despite
it having no distinct CSS rule.

## Deviations from Plan

None - plan executed exactly as written. The `data-tone` comparison-aware extraction and the
documented-not-filtered Button-prop-value tokens were both within the plan's own stated latitude
("extracted (AST vs. source scan) — provided D-08's failure condition and D-10's scope hold",
05-CONTEXT.md) rather than departures from what was specified.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`docs/design-language.md` is the vocabulary every remaining Phase 5 manifest (05-03 through 05-06)
must draw from before inventing a new class name, and `test/web/class-vocabulary.test.ts` is now a
standing member of `npm test` that will fail the build the moment a new view's className strays
outside the documented vocabulary or the D-09 view-local namespace. No changes to the test's
extraction logic or the doc's section shape are expected to be needed by later plans — they only
add new rows (shared names) or rely on the existing namespace rule (view-local names). Ready for
05-03.

---
*Phase: 05-per-type-document-views*
*Completed: 2026-09-20*

## Self-Check: PASSED

Both created files verified present on disk (`docs/design-language.md`,
`test/web/class-vocabulary.test.ts`); both task commits (`8c492ae`, `f4868ba`) verified present in
`git log`.

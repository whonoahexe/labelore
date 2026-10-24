---
phase: quick-261005-p1x
plan: 01
subsystem: web-views/security-console
tags: [security, trust-boundaries, residual-observations, view]
status: complete
requires: [quick-261003-527]
provides:
  - SECURITY trust boundaries grouped by destination (shared blocks, one single-crossing list, at-rest block)
  - Residual observations toggle with threat ref chips and a reverse link in the detail panel
affects: [src/web/views/security-console.ts, src/web/views/security-console-components.tsx, src/web/styles/globals.css]
key-files:
  modified:
    - src/web/views/security-console.ts
    - src/web/views/security-console-components.tsx
    - src/web/styles/globals.css
    - test/web/security-console.test.ts
    - test/web/security-console-corpus.test.ts
    - test/web/security-view-contract.test.ts
    - test/e2e/security-page.spec.ts
decisions:
  - "User amendment applied: only destinations with 2+ crossings get a block; every one-crossing destination goes into one list (Other crossings / Crossings)"
  - "An unbalanced '(' that swallows the whole destination falls back to the raw text as the group key and label, rather than sending the row to the at-rest block"
  - "Section and nav id are security-boundaries; the nav count stays the boundary row count"
actuals:
  tokens: 60000
  tasks: 3
  commits: 3
plan_head_before: 577e23682ca949cccc81c3c49e157776dd4ac2fb
plan_head_after: 1d1184a4a9316bfb3ce33e8d4f17ae73d0e081e1
completed: 2026-10-05
---

# Phase quick-261005-p1x Plan 01: SECURITY page trust boundaries grouped by destination + residual observations Summary

Trust boundaries now render as destination blocks (shared destinations, one gathered single-crossing list, a final at-rest block) and Residual Observations is a closed-by-default toggle whose ref chips pick the threat square and whose threats link back to their observations.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 75c7dd8 | Trust boundaries grouped by destination (composer, view, CSS, tests) |
| 2 | 3828973 | Residual observations toggle, ref chips, detail-panel reverse link |
| 3 | 1d1184a | Contract pins (BOUNDARY_TONE, CSS rules, old selectors gone) and e2e spec (written, not run) |

## Per corpus doc (as built, pinned against the source tables)

| Doc | Blocks (label · count) | Toned source |
|-----|------------------------|--------------|
| SP 01 | Backend · 2 ways in (browser [via Cloudflare tunnel], Vercel edge [session validation]); Other crossings · 6 (`POST /api/login`, Every handler, Filesystem, Vercel edge [route gate], `backstage` process, Build); At rest / in-process · 2 | unauthenticated caller |
| SP 03 (and synthetic) | Crossings · 10 | unauthenticated browser |
| LB v1.1/05 | Crossings · 8 | none |
| LB v1.0/01, 02, 03 | Crossings · 4 each (02 keeps its trailing "dominant threat classes" note) | none |
| LB v1.0/04 | Crossings · 3 | none |
| fixtures/dense | Crossings · 1 | none |

SP 01 residual items: "`AUTH_MODE=dev` guard scope" -> T-01-07, "`Cf-Connecting-Ip` tunnel dependency" -> T-01-24 (both matched to register rows), "Unobserved fault windows" (no ref). Lead starts "Not open threats — no register entry is unmitigated." SP 01 extras are now [].

## Planner discretion decisions, as built

- Qualifier kept as a muted "(aside)" after the lead; nothing in the doc disappears.
- Display label: first occurrence's destination minus parentheticals, whitespace collapsed, leading lowercase letter raised, backticks kept (render as code); raw text fallback.
- At-rest header is "At rest / in-process · N" (plain count). A row with an empty arrow side goes there with the whole Boundary cell as its lead.
- Descriptions always visible (muted, beneath); the per-flow why/hide disclosure and its `flow-N` open keys are gone.
- Section and nav id `security-boundaries`; subtitle "what crosses where" kept.
- Residual ref chip reuses `onPickRef` (same as the waiver ledger), so it picks the square and centres the detail panel.
- Residual toggle is a `button[aria-expanded]` with state under key `residuals` in the existing open set; the item list mounts only when open and `aria-controls` is set only then; the lead stays visible as the subtitle.
- Placement: Summary, Board, Accepted risks, Trust boundaries, Residual observations, other folded extras, Sign-off, Audit, In the source only. No nav entry for residuals.
- Model: `kind: 'shared' | 'single' | 'at-rest'` replaces the planned `atRest` boolean; each crossing also carries `destination` (the label) for the "source -> destination" leads of the single list.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unbalanced '(' destination went to the at-rest block**
- **Found during:** Task 1 (RED test for the degrade path)
- **Issue:** The plan says "an unbalanced '(' never empties the label, which falls back to the raw text", but also "destination key empty -> at-rest". An unclosed '(' that swallows the whole destination produced an empty key, so the row went at rest and the label fallback was unreachable.
- **Fix:** `destinationKey` falls back to the raw (backtick-stripped, collapsed, lower-cased) text when stripping leaves nothing, so the row groups under a readable label. Rows with a truly empty source or destination still go at rest.
- **Files modified:** src/web/views/security-console.ts
- **Commit:** 75c7dd8

**2. [Rule 3 - Blocking test construction] Pathological residual input built by hand**
- **Found during:** Task 2
- **Issue:** The extractor caps every line at 8000 characters, so a 100k-character bold title loses its closing `**` before it reaches the composer and is no longer a titled paragraph.
- **Fix:** The pathological residual test hands the composer a hand-built `structured.security.extras` payload, so it proves the composer itself stays linear and caps refs at 20.
- **Files modified:** test/web/security-console.test.ts
- **Commit:** 3828973

Otherwise the plan (with the user amendment) was executed as written. The corpus pin `residuals` is optional in the `Pinned` interface (omitted means 0) instead of being spelled out as 0 on every entry.

## Verification

- `npm test`: 113 files, 2026 tests pass (includes class-vocabulary, token-guard, css-source-order, security-view-contract, security-register).
- `npm run typecheck` (server and web, which covers test/e2e/security-page.spec.ts): clean.
- eslint on all touched src and test files: clean.
- Playwright was NOT run (port collisions in worktrees).

## Known Stubs

None.

## Threat Flags

None. No new network endpoint, auth path or file access; author strings render only through ResearchInline / ResearchBlocks or as plain React text, no href is built from document text, and DOM ids come from indexes.

## Ready-to-paste Tones text for docs/design-language.md (one `/gsd-fast` on master)

- in-flight row: "(quick-261005-p1x) on a SECURITY page an unauthenticated/untrusted/anonymous trust-boundary source"
- quiet row: "(quick-261005-p1x) on a SECURITY page every other trust-boundary source and the data-crossing chip"

## Post-merge steps (NOT run in this task)

1. `npm run build`, then `systemctl --user restart labelore`, then confirm it is active.
2. `npx playwright test test/e2e/security-page.spec.ts -g "security page"` once.
3. Human check: open studio-portal 01 and 03 SECURITY at http://cinedise:4173 in light and dark; destination blocks read cleanly, "unauthenticated caller" is the only toned source, and the residual toggle, ref chips and reverse link round-trip.

## Self-Check: PASSED

- Files modified exist and are committed: security-console.ts, security-console-components.tsx, globals.css, the four test files.
- Commits 75c7dd8, 3828973 and 1d1184a are ancestors of HEAD; `git rev-list --count 577e236..HEAD` is 3.
- The worktree `node_modules` symlink is untracked and was never staged.

---
phase: quick-260929-mih
plan: 01
subsystem: web/views (RESEARCH briefing, Package legitimacy block)
tags: [research, legitimacy, sketch-010, css-tokens, design-language]
requires: [quick-260929-3x3]
provides:
  - "Package legitimacy block matching sketch 010 B (empty lanes toned, carets, Use instead, code chips, hairlines, tight notes)"
  - "--missing-border, --border-faint and --code-veil :root tokens"
affects: [src/web/views/research-briefing-components.tsx, src/web/styles/globals.css]
tech-stack:
  added: []
  patterns: ["SSR render tests via react-dom/server renderToStaticMarkup + createElement in vitest (node env)"]
key-files:
  created: []
  modified:
    - src/web/views/research-briefing-components.tsx
    - src/web/styles/globals.css
    - test/web/research-briefing.test.ts
    - test/web/research-view-contract.test.ts
    - test/token-guard.test.ts
    - tsconfig.server.json
    - docs/design-language.md
key-decisions:
  - "--missing-border is a real :root token (missing-fill 50% toward --border), mirroring --in-flight-border; the missing chip switched to it too"
  - "Sketch-only mixes became named tokens --border-faint (55%) and --code-veil (70%) so the 3x3 CSS block stays free of color-mix()"
  - "One token-guard ALLOWLIST entry for the em-relative 0.88em inline-code chip"
  - "62ab188's empty-lane de-toning override removed; empty lanes keep their tone"
requirements-completed: [MIH-01, MIH-02, MIH-03, MIH-04, MIH-05, MIH-06, MIH-07, MIH-08]
status: complete
duration: ~15min
completed: 2026-09-29
commits: 3
plan_head_before: 8b9354b4c13e7667e5f574b0720948e1f768d5df
plan_head_after: 3ac56cff8c78fb1d768edb121e1af5e2649608b4
actuals:
  tokens: 30000
  tasks: 2
  commits: 3
---

# Phase quick-260929-mih Plan 01: Package legitimacy back to sketch 010 B Summary

The RESEARCH page's Package legitimacy block reads as sketch 010's winner (lanes by verdict) again: empty lanes keep their Removed / Flagged tone with "Nothing removed/flagged/approved." copy, the Removed outline sits on a new `--missing-border` token, pagination and the seam toggle carry aria-hidden carets with a `--primary` hover, and inline code, hairlines, the "Use instead" row and the trailing notes follow the sketch.

## Tasks

| Task | Commit | Notes |
|------|--------|-------|
| 1 (tracer, TDD) RED | c423495 | `test(views)`: AuditBlock render cases + CSS contract case (failed as expected) |
| 1 GREEN | 3b9298b | Markup/copy, `--missing-border`, empty-lane override removed, AuditBlock exported |
| 2 | 3ac56cf | Code chip, `--primary` hovers, hairlines, Use instead row, notes stacking, allowlist entry, design-language edits |

## What changed

- `research-briefing-components.tsx`: `AuditBlock` exported (root `view-research-sub view-research-audit`); lane empty copy is `Nothing ${noun}.`; carets in `<span aria-hidden>` on Show more / Show fewer and the seam toggle (now "Show/Hide the seam output (N rows)", classes `view-research-link view-research-seam-toggle`); replacement row is `.view-research-lane-use` with a "Use instead" key; extra notes sit in `div.view-research-audit-notes` as plain `<p>`s. All text still goes through `ResearchInline` (T-mih-01 mitigation intact).
- `globals.css`: tokens `--missing-border`, `--border-faint`, `--code-veil` in the first `:root`; slop lane and missing chip use `--missing-border`; lane item dividers on `--border-faint`; approved dispositions names at `--fs-3`; `.view-research-lane-use`; `--primary` hover on `.view-research-lane-more` and `.view-research-seam-toggle` (`.view-research-link:hover` untouched, Patterns "source" keeps `--foreground`); `.view-research-audit-notes`; `.view-research-audit :not(td) > code` chip. Empty-lane override rules deleted.
- Tests: 3 AuditBlock render cases, 2 CSS-contract cases, 1 token-guard ALLOWLIST entry.
- `docs/design-language.md`: legitimacy-audit bullet and the RESEARCH accent-reservation bullet updated (tagged quick-260929-mih).

## Verification

- `npx vitest run test`: 78 files, 1499 tests pass. `npm run typecheck` and `npm run lint` clean.
- `git diff 8b9354b -- test/e2e src/planning-repo` empty; no e2e spec ran.
- `node .playwright-mcp/legit-check.mjs` exits 0 across LB and SP x dark/light x 1400/420: slop lane keeps inset top rule, differs from Approved in border and title colour, empty copy is "Nothing removed." (and "Nothing flagged." on SP with a toned Flagged title), code chips have a non-transparent background, no horizontal overflow at 420, and the first Show-more hovers to `--primary`.
- Dark 1400 after-shots compared with the sketch shots (legit-sketch-lab02.png / legit-sketch-sp02.png): all ten differences closed. No token values needed tuning. The remaining visible difference from the sketch is the intentional page-wide V/C/A evidence superscript.

Screenshots (`/home/cinedise/labelore/.playwright-mcp/`, gitignored):
- legit-after-lab02-dark-1400.png, legit-after-lab02-dark-420.png, legit-after-lab02-light-1400.png, legit-after-lab02-light-420.png
- legit-after-sp02-dark-1400.png, legit-after-sp02-dark-420.png, legit-after-sp02-light-1400.png, legit-after-sp02-light-420.png

Check script: `/home/cinedise/labelore/.playwright-mcp/legit-check.mjs` (gitignored; carries `/* eslint-disable */` because `npm run lint` scans that directory).

## Deviations from Plan

**1. [Rule 3 - Blocking] `tsconfig.server.json` gained `"jsx": "react-jsx"`**
- **Found during:** Task 1 (typecheck)
- **Issue:** The server tsconfig includes `test/**/*.ts`; the new render test imports `research-briefing-components.tsx`, which failed with TS6142 (`--jsx` not set).
- **Fix:** Added the `jsx` option to `tsconfig.server.json`; typecheck passes with both configs. No other config touched.
- **Commit:** 3b9298b

**2. [Rule 1 - Bug] CSS comment text tripped the pre-hydration token-snapshot test**
- **Found during:** Task 2 (full vitest run)
- **Issue:** `test/web/focus-ring-contrast.test.ts` extracts tokens with a `--name: value;` regex; my comments containing "--border: the RESEARCH…" were parsed as a token declaration.
- **Fix:** Reworded the `--border-faint` and `--missing-border` comments so they contain no `--token:` pattern. Fixed before the Task 2 commit.

## Known Stubs

None.

## Threat Flags

None. The exported `AuditBlock` is presentational only; no new network, auth or filesystem surface.

## Self-Check: PASSED

- Commits c423495, 3b9298b, 3ac56cf exist on master.
- Modified files present; all eight screenshots and legit-check.mjs present.

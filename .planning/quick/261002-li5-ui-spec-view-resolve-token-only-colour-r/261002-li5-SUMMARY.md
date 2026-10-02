---
phase: quick-261002-li5
plan: 01
subsystem: ui-spec-view
tags: [ui-spec, colour, theme-tokens, planning-repo, read-only]
requires: [quick-261001-qk6]
provides:
  - src/planning-repo/css-color.ts (safeColor, shared validator)
  - src/planning-repo/theme-tokens.ts (resolveThemeTokens, loadThemeTokens, ThemeTokens)
  - structured.uiSpecTheme on UI-SPEC artifacts
affects: [ui-spec composer, ui-spec components, design-language]
key-files:
  created:
    - src/planning-repo/css-color.ts
    - src/planning-repo/theme-tokens.ts
    - test/theme-tokens.test.ts
    - test/web/ui-spec-theme.test.ts
  modified:
    - src/planning-repo/snapshot.ts
    - src/web/views/ui-spec.ts
    - src/web/views/ui-spec-components.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/web/ui-spec-view-contract.test.ts
decisions:
  - Theme values travel in a sibling key structured.uiSpecTheme, leaving UiSpecContract untouched.
  - safeColor moved to a node-free module so server resolver and client composer share one validator.
  - components.json tailwind.css is consulted before the fixed candidate list.
  - Resolution is per swatch: a swatch with any document value keeps only the document's values.
metrics:
  duration: ~25m
  completed: 2026-10-02
status: complete
commits: 3
plan_head_before: bb9be99f7132a08c46699ad900300b773d92de71
plan_head_after: 186715b504415708a169b9dc5dd9627c694485c7
actuals:
  tokens: 60000
  tasks: 3
  commits: 3
---

# Phase quick-261002-li5 Plan 01: Resolve token-only UI-SPEC colours Summary

Token-only UI-SPEC colour roles (`--background`, `--card`, `--border`, `--primary`, `--destructive`) now render real light and dark swatches read from the target project's own stylesheet, with visible "From globals.css" provenance; tokens that resolve nowhere stay hatched.

## What was built

- **css-color.ts**: `safeColor` moved verbatim out of the composer; `ui-spec.ts` imports and re-exports it, so existing imports keep working.
- **theme-tokens.ts**: pure `resolveThemeTokens(css, source)` (one linear walk, brace-depth stack capped at 32, strings and comments skipped, light from `:root`/`html`/`:host`, dark from `.dark`/`:root.dark`/`html.dark`/`[data-theme=dark]` variants and `@media (prefers-color-scheme: dark)`, `@layer` allowed, `@theme` and every other at-rule never read, `var()` chains to 8 hops with cycle detection and fallbacks, every value through `safeColor`, declaration caps). `loadThemeTokens(fs)` reads only via `fs.read`: components.json `tailwind.css` pointer in `'' / frontend / web / client / apps/web` (64 KiB cap, strict relative-path validation), then 10 fixed conventional paths, 512 KiB stylesheet cap, never throws.
- **snapshot.ts**: `PlanningRepository(fs, rootPath, { loadTheme })` (default `loadThemeTokens`, `null` disables). `refresh()` awaits the loader once, only when a parsed artifact has `structured.uiSpec`, and attaches `structured.uiSpecTheme` to those artifacts via a new array. No stylesheet means the same `parsed` array flows through, so goldens are unchanged.
- **ui-spec.ts**: `themeOf` guard, own-property lookups re-validated by `safeColor` client-side, `paintFromTheme` (per-token split when at least one token resolves, document values always win), `resolvedFrom` on swatches and shares, `paintedWith` on the colour model (three variants).
- **ui-spec-components.tsx / globals.css / design-language.md**: "From <file>" line with the full path in its tooltip, chip half titles name the source, split key uses `paintedWith`; `.view-ui-spec-from` rule inside the qk6 block (tokens only); the design-language swatch rule records the stylesheet fallback and the amended "only colours outside the theme tokens" sentence.

## Verification

- Full `npx vitest run`: 98 files, 1818 tests pass (includes goldens, fs-equivalence, degradation, portability, class-vocabulary, contract).
- Real studio-portal fixtures ran (not skipped): the loader resolves `frontend/app/globals.css` through components.json with the expected light/dark values, and the composed 01-UI-SPEC has no "Value not in doc" and a key reading "painted from frontend/app/globals.css".
- `npm run typecheck` and eslint on all touched files pass. `git diff -- test/__golden__` is empty. No Playwright e2e was run.

## Deviations from Plan

**1. [Ordering] components.json pointer step and the full walker landed in Task 1 rather than Task 2.** Writing the walker twice would have been wasted work, so the tracer commit already contained the production-quality resolver and loader; Task 2 added the hardening tests, one fix, and the contract-test guard. No scope change.

**2. [Rule 1 - Bug] End-of-file declaration dropped.** Found by the Task 2 robustness test: a block cut off at EOF without a trailing `;` lost its last declaration. Fixed with a final flush in `collectRaw`. Commit 50c7319.

## Pending

- **Live visual check (Task 3 human-check) is PENDING.** The running labelore server has the old code; after the orchestrator restarts `systemctl --user restart labelore` and the watch build refreshes dist, open `http://127.0.0.1:4173/artifacts/a~.planning%2Fphases%2F01-portal-owned-identity-sessions%2F01-UI-SPEC.md` and check the Colour section in light and dark (painted chips with "From globals.css", two chips for Secondary, painted 60/30/10 bar with key "painted from frontend/app/globals.css", path tooltips, nothing hatched, squared corners).

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model (T-li5-01..08 mitigated as specified; the loader reads outside `.planning/` by the user's explicit decision, via fixed paths and the LocalFs containment guard).

## Commits

- 4893bd9 feat(quick-261002-li5): paint token-only UI-SPEC colour roles from the project stylesheet
- 50c7319 test(quick-261002-li5): harden and cover the stylesheet resolver
- 186715b feat(quick-261002-li5): show stylesheet provenance on resolved UI-SPEC swatches

## Self-Check: PASSED

All created files exist; all three commits present in `git log`.

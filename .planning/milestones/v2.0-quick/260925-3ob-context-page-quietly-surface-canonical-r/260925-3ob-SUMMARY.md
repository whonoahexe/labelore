---
phase: quick-260925-3ob
plan: 01
subsystem: web-views
tags: [context-view, brief, back-matter, view-local-css]
status: complete
dependency-graph:
  requires:
    - quick-260923-lju (sketch-006 D1 brief layout: composeContextBrief, ContextBriefView, useContextBrief)
  provides:
    - "ContextBrief.amendments/references/codeInsights (ContextAside[]) — src/planning-repo/handlers/context-brief.ts"
    - "ComposedContextBrief.asides (ComposedAside[]) — src/web/views/context-brief.ts"
    - "ContextAsides quiet back-matter rows — src/web/views/context-brief-components.tsx"
  affects:
    - "CONTEXT page View mode (all phases/quick tasks with a canonical_refs/code_context/blocking_amendments section)"
tech-stack:
  added: []
  patterns:
    - "asideSectionsOf(body, role): groups a role-bearing ## section into an untitled lead group plus one group per ### subsection, dropping bare thematic-break lines"
    - "Tolerant array/shape reads (tolerantAsideSections) on new ContextBrief fields — never added to isContextBrief's required checks, so an older server payload still composes"
key-files:
  created:
    - .planning/quick/260925-3ob-context-page-quietly-surface-canonical-r/deferred-items.md
  modified:
    - src/planning-repo/handlers/context-brief.ts
    - src/web/views/context-brief.ts
    - src/web/views/context-brief-components.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/context-brief.test.ts
    - test/web/context-brief.test.ts
    - test/web/context-brief-corpus.test.ts
    - test/__golden__/dense.json
    - test/__golden__/sparse-started.json
decisions:
  - "One quiet back-matter strip, three collapsed rows in fixed order (amendments, then references, then code) — matches the plan's Claude-discretion design, not the plan's own alternative of a single merged panel."
  - "Amendments recognised by tag (blocking_amendments -> 'amendments' role) or by a leading-emoji-tolerant /requirement amendments?/i heading regex, whichever matches first in the shared role-resolution tables the extractor already used for boundary/decisions/specifics/deferred/references/code."
  - "Dropped the dead `more` bucket and MORE_HEADING_RE entirely rather than leaving them alongside the new asides — nothing rendered `more` since 1d0baf3, and references/code headings were already unconditionally pushed into recognizedHeadings, so removing it required no new exclusion logic."
metrics:
  duration: ~50min
  completed: 2026-09-25
actuals:
  tokens: 27073
  tasks: 3
  commits: 3
  plan_head_before: 1c30097006f7da22e9d23ac38a95d62d717c894d
---

# Phase quick-260925-3ob Plan 01: CONTEXT page quietly surfaces canonical references, code insights, and requirement amendments Summary

Added three quiet, collapsed back-matter rows to the CONTEXT brief's View mode — requirement
amendments (recognised by the `<blocking_amendments>` tag or a "Requirement amendments" heading,
regardless of leading emoji), canonical references, and existing code insights — closing out a gap
left by 1d0baf3's removal of the generic "More in this document" disclosure, without drawing any
visual attention (no `--primary`, no status-chip tone, no card, no hero stat).

## What was built

**Task 1 (tracer):** End-to-end path for requirement amendments only — `blocking_amendments` added
to the extractor's tag/heading role tables, a new `asideSectionsOf(body, role)` helper that groups
a role-bearing `##` section into an untitled lead group plus one group per `###` subsection (bare
thematic-break lines dropped), `ContextBrief.amendments`, `ComposedContextBrief.asides`, and a new
`ContextAsides` React component rendered as the last child of `ContextBriefView` — a hairline-ruled,
chevron-toggled row per aside, muted foreground on `--border`, expanding to grouped `BlockList`
content one type step smaller than the rest of the brief.

**Task 2 (TDD):** Expanded `asideSectionsOf` to `references`/`code` roles, wired
`ContextBrief.references`/`codeInsights`, and taught the composer to merge every
references/codeInsights section into a single aside each (`context-references` /
`context-code`, sentence-case labels "Canonical references" / "Existing code insights"). Retired
the dead `more` bucket and `MORE_HEADING_RE` — those headings were already unconditionally pushed
into `recognizedHeadings`, so nothing new was needed to keep them out of `extras`. Extractor and
composer tests were written RED first (asserting fields/behavior that didn't exist yet), then made
GREEN.

**Task 3:** Extended the 19-file corpus guard with a pinned `amendments` count per file (1 for SP
02/03/04, 0 elsewhere — confirmed via `grep -c '^<blocking_amendments>'` before pinning) and a new
per-file "aside prose not dropped" word-coverage guard mirroring the existing one. Refreshed
`test/__golden__/dense.json` and `sparse-started.json` (diff reviewed: additive-only —
`amendments`/`references`/`codeInsights` keys inside `brief` objects, nothing else moved). Updated
`docs/design-language.md`'s CONTEXT-brief bullets to describe the quiet back-matter rows and the
amendments row's toneless treatment. Rebuilt `dist/`, restarted the `labelore` systemd service, and
confirmed via a live API probe that studio-portal's phase 2 CONTEXT now serves one amendments, one
references, and one codeInsights aside.

## Verification

- `npx vitest run` — 1307/1308 passing (one pre-existing, unrelated `token-guard.test.ts` failure;
  confirmed via `git stash` to predate this task — see Known Stubs / deferred-items.md).
- `npm run typecheck` and `npm run lint` — both clean.
- Grep gates: no `dangerouslySetInnerHTML`, no remainder constants in
  `context-brief-components.tsx`; `MORE_HEADING_RE` fully removed from the composer.
- Live API probe (`curl` against `127.0.0.1:4173` after `systemctl --user restart labelore`):
  phase 2's CONTEXT brief returns `amendments.length === 1`, `references.length === 1`,
  `codeInsights.length === 1`.
- **Human check pending** (not automatable from this session): visually confirm at
  `https://cinedise.persian-elnath.ts.net` — studio-portal phase 2 CONTEXT in View mode, light and
  dark — that no ⚠️ amendments section appears before the Decisions register, that the brief ends
  with three collapsed muted rows (amendments count 6, references, code insights), that expanding
  each shows grouped content quieter than the register with working D-NN jump buttons, that nothing
  uses the accent colour, and that nothing scrolls horizontally at ~420px.

## Deviations from Plan

None — plan executed as written. One out-of-scope, pre-existing test failure was found during
full-suite verification (`test/token-guard.test.ts`, 2 colour-token violations on lines predating
this task's CSS) and logged to
`.planning/quick/260925-3ob-context-page-quietly-surface-canonical-r/deferred-items.md` per the
scope-boundary rule rather than fixed.

## Self-Check: PASSED

- FOUND: src/planning-repo/handlers/context-brief.ts (asideSectionsOf, ContextAside, AsideGroup, amendments/references/codeInsights fields)
- FOUND: src/web/views/context-brief.ts (ComposedAside, ComposedAsideGroup, asides field, tolerantAsideSections)
- FOUND: src/web/views/context-brief-components.tsx (ContextAsides component)
- FOUND: src/web/styles/globals.css (.view-context-aside-toggle and siblings)
- FOUND: docs/design-language.md (back-matter rows bullet, amendments toneless note)
- FOUND: test/context-brief.test.ts, test/web/context-brief.test.ts, test/web/context-brief-corpus.test.ts (new describe blocks)
- FOUND: test/__golden__/dense.json, test/__golden__/sparse-started.json (refreshed)
- FOUND commit 3d26ee5 in `git log --oneline`
- FOUND commit ecfe9fc in `git log --oneline`
- FOUND commit 4b9eedd in `git log --oneline`

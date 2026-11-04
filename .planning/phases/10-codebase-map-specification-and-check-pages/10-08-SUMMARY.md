---
phase: 10-codebase-map-specification-and-check-pages
plan: 08
subsystem: codebase-page
tags: [codebase-page, panels, readiness, view-registry, withhold-document, sketch-042-A, phase-10]
status: complete

requires:
  - phase: 10-01
    provides: CODEBASE_MAP_FILES, FAST_MAP_FILES, projectMapState, the screenshot helper
  - phase: 10-05
    provides: structured.codebase (stamp, sections with keys, Stack chips, Concerns counts, keyNumber)
  - phase: 10-06
    provides: sketch 042 winner A (rail + column), four font sizes, no typography exception
provides:
  - one Codebase page for all seven map documents, built from sketch 042 A (facts line, seven-entry panel list, active panel)
  - buildCodebaseContext, mapReadiness and CODEBASE_PANELS (server), codebaseContext on /documents for codebase-* kinds
  - viewKindOf and the one `codebase` view kind; the six spec and check kinds registered (VIEW_KINDS is 31)
  - withholdDocumentInView on user-setup and documentHtmlAllowedInView (T-10-49)
affects: [10-10 mapped-not-started head, the panel plans that add designed forms per panel, 10-16 to 10-22 spec and check composers, 10-19 user-setup]

actuals:
  tokens: 70000
  tasks: 3
  commits: 4
plan_head_before: 54c016943902f1d9932413a5c4b542b3ab182368
plan_head_after: 6694d5518e9411e4ee85d5a67eebd0dd78174bb8
commits: 4

key-files:
  created:
    - src/presentation/codebase-map.ts
    - src/web/views/codebase-page.ts
    - src/web/views/codebase-components.tsx
    - src/web/views/withheld-document-note.tsx
    - test/presentation/codebase-map.test.ts
    - test/web/codebase-page.test.ts
  modified:
    - src/server/project-api.ts
    - src/web/pages/artifact-page.tsx
    - src/web/views/kinds.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/server/documents-route.test.ts
    - test/web/view-registry.test.ts
    - test/web/debug-view-contract.test.ts
    - test/web/note-view-contract.test.ts

key-decisions:
  - "Sections the page has no designed form for stay in the panel as plain sections in document order, keyed or not: only Stack chips and Concerns counts are lifted here, and neither consumes a section, so nothing in a document is dropped until a panel plan draws a designed form and marks its sections consumed"
  - "Mapped date is the newest per-document stamp; the commit chip is the first document in page order carrying that date and a commit (never from an older document); no freshness field exists"
  - "The page's own breadcrumb override (Dashboard / Codebase) replaces the Dashboard / Roadmap / document trail that 10-01 flagged, through the same one-prop header spread the other designed pages use"
  - "Concerns counts in the panel use the document's own headings (Security Considerations first); the short head labels belong to 10-10"
  - "The withheld-document empty note is its own component (withheld-document-note.tsx) because empty-state-contract.test.ts forbids EmptyState inside artifact-page.tsx"

requirements-completed: [VIEW-13]

duration: about 2h
completed: 2026-11-04
---

# Phase 10 Plan 08: Codebase page frame (sketch 042 A) Summary

**All seven `/{project}/codebase/{doc}` addresses open one Codebase page built from sketch 042's winner (sticky rail with the facts line and seven panel links over a reading column), with GSD's readiness, "Not mapped" ghost entries, Stack chips and Concerns counts lifted above plain sections that drop nothing, in exactly four font sizes.**

## What was built

- **Server.** `src/presentation/codebase-map.ts`: `CODEBASE_PANELS` (page order), `mapReadiness` (GSD's `map_readiness` exactly), `buildCodebaseContext` (seven panels with an address only for a document the folder holds, mapped count, readiness, newest stamp and its commit, active panel, `mapOnly`). `project-api.ts` adds a guarded `codebaseContext` IIFE to `/documents` (null for any kind not starting `codebase-`).
- **Registry.** `VIEW_KINDS` is 31 (`codebase` plus `spec`, `ai-spec`, `user-setup`, `eval-review`, `dom-verify`, `reviews`), manifest keys still equal kinds both ways. `viewKindOf` maps every `codebase-*` kind to `codebase`; `resolveViewFor` looks up through it. The six spec and check manifests carry their verbatim lead and a promote-every-section fallback and no composer. `user-setup` sets `withholdDocumentInView`; `documentHtmlAllowedInView(manifest)` is checked in `artifact-page.tsx` before the document-HTML branches, which show the sanctioned "Nothing here yet." (T-10-49).
- **Page.** `composeCodebase` (pure, no regex, no fs, no module-level `let`) and `CodebaseView`/`codebaseHeaderProps`. Facts line: "{n} of 7 documents mapped", the readiness chip with the UI-SPEC tooltips verbatim, "Mapped {date}", the commit as a mono quiet chip (each of the last two omitted silently). Panel list: seven entries in fixed order, mapped ones real `Link`s with `aria-current="page"`, missing ones `data-ghost="true"` with a dashed square and "Not mapped". Active panel: head (number, name, "30 concerns"), lifted part (Stack chips in Languages / Runtime / Frameworks sets; Concerns total and counts, Security first, a zero as a dashed square), then every section as a plain section through the page's one sanitised renderer. An unshapeable document falls to the manifest's promoted sections with no notice (C1).
- **CSS.** One `phase-10-codebase` block, tokens only, both themes, `view-codebase-*` names. The rendered-document sizes inside plain sections (prose, tables, code, headings, figure text) are taken inside the four-size scale by page-scoped rules.
- **Docs.** design-language.md: tone uses (Complete map, Fast and Partial map, Not mapped, commit chip, zero concerns, Security count), the `data-ghost` Codebase entry, and a Codebase page bullet.

## Task commits

1. Task 1 (tracer): `a214ee1` feat - frame, context, registry, withhold, composer and components, CSS block
2. Task 2 RED: `3e1dbe1` test (RED; 15 of the new composer and contract tests failed before the code existed) then GREEN `2c90975` feat
3. Task 3 and fixes: `6694d55` fix - sibling contract tests kept green, withheld note component, view-local square class (the side-by-side pass itself changed no layout)

## Verification

- Full gate: `gate: total=5618 passed=5618 failed=0 skipped=0 todo=0` (base 5520).
- `npm run typecheck`, `npx eslint src test`, `npm run build`: exit 0. Task 3's verify command: 28 PNGs, no FAIL line, exit 0. `/documents` Tidemark STACK carries seven panels, readiness complete; a non-map document gets null.
- Not run, as instructed: the Playwright e2e suite and `systemctl --user restart labelore` (the orchestrator restarts after merge).
- Font sizes measured in the rendered page at 1280 and 390, both themes, on all seven Tidemark documents and every case below: exactly four (11.2, 13.12, 20.8px and the h1 76.8px at 1280 or 44.8px at 390). One h1 and no sideways scroll at 390 on every case.

## Side-by-side against sketch 042 A

Build beside the sketch at the same width and theme (the sketch in its "Normal project" state, or Map only fast or partial for the partial maps), 1280 and 390, light and dark, into `/tmp/claude-1000/-home-cinedise-codebases-labelore/eee67f35-318e-418b-ab45-56538cdc4f26/scratchpad/build-10-08/`. Files are `{case}-{width}-{theme}-side-by-side.png` (sketch left, build right) with `-build.png` and `-sketch.png` beside them. Cases: `tidemark-stack`, `tidemark-architecture`, `tidemark-concerns` (complete map), `shapes-stack` (3 of 7), `tidemark4-stack` (Tidemark copy with CONVENTIONS, TESTING and CONCERNS removed: 4 of 7, fast), `labelore-concerns`, `labelore-architecture`, `labelore-testing`, `labelore-structure` (labelore's own fresh map; TESTING 302, ARCHITECTURE 287, STRUCTURE 238 lines), `map2-architecture|testing|structure` and `map3-testing|architecture|concerns` (the two other D-03 repositories' longest documents, read in place, nothing copied into the repository). The task gate's own run is under `.../build-10-08/gate/` and `.../build-10-08/final/`.

Matches the layout contract: rail 288px at 1280 with facts over seven single-line entries, reading column with the panel head (accent number, name, key phrase right), lifted groups in the sketch's order, ghost entries dashed with "Not mapped", fast and partial readiness chips and tooltips, one column under 62rem with facts and entries before the panel, dark and light parity, and no sideways scroll at 390 on the Tidemark, Shapes, labelore and both other repositories' documents.

Differences seen, and what became of them:

1. **Key numbers only where the lift set one (left).** The rail shows Stack and Concerns numbers; Architecture, Structure, Conventions, Testing and Integrations show none because 10-05 sets `keyNumber` only for those two. Each panel plan sets its own number; the sketch drew all seven.
2. **Lifted forms beyond Stack chips and Concerns counts are absent (left).** Key dependencies and Configuration rows, the Architecture figure and component table, the Structure tree and lookup, command rows and per-concern items are the panel plans' (043 to 046 and 10-12 onward). Their sections show as plain sections, so the Stack panel shows its chips and then the whole document beneath them.
3. **No "Most dangerous" pull line and no per-section readable-in-full items in Concerns (left).** `structured.codebase` carries counts only, never concern text (T-10-10); both come with the Concerns panel plan, which also settles whether the pull line stays.
4. **Concern count labels use the document's headings (decided).** "Security Considerations", "Performance Bottlenecks", "Test Coverage Gaps" wrap to two lines where the sketch's short labels ("Security", "Performance") do not. The short labels are 10-10's head, per the sketch README's open point.
5. **Head not built (10-10).** The "Mapped, not started" block, the "Most dangerous" open point, the 390px head-first order and the Copy command are 10-10's; in a map-only project the eyebrow stays "Codebase" until then.
6. **Header block (left).** ArtifactHeader is shared and unmodified: the copy-path control renders as a link glyph above View / Source rather than a boxed copy icon beside them, and the breadcrumbs read "Dashboard / Codebase" (the sketch drew "Labelore / Codebase", the project name standing in).
7. **Plain-section extras (left).** A document's text before its first heading (for example "Analysis Date" and a scope line) and its final footer line show as plain text because nothing is dropped; the sketch's stand-in panels had neither. Links inside plain sections use the document's link style (underlined), where the sketch had none.
8. **Fixed during the pass:** document markup inside plain sections first rendered at 18.4px prose, 14.4px tables, 21.6px headings and 10 to 12px lane-diagram text (six to nine sizes); page-scoped rules took all of it inside the four sizes.
9. **App shell differs by project state (not the page).** A map-only project's header holds only Dashboard; the sketch's Normal state draws Roadmap and Traceability.

On the hard real documents and Tidemark's heading-variant documents (Languages & Runtimes, API Architecture, the Last updated footer): matched sections show their lifted chips, every section renders plain in document order, the lane diagram and tables of labelore's ARCHITECTURE render inside the page, and nothing scrolls sideways at 390px.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Sibling contract tests broke on the new registry and page**
- **Found during:** full-suite run after Task 2
- **Issue:** four existing tests failed: the debug and note contract tests pinned `kinds.ts` as ending at `'debug',\n] as const;`; `empty-state-contract.test.ts` forbids the string `EmptyState` inside `artifact-page.tsx`; `project-view-contract.test.ts` forbids any `.status-square` selector outside the project CSS block.
- **Fix:** the two kinds pins now assert the entry order without the closing bracket; the withheld-document note moved to `src/web/views/withheld-document-note.tsx`; the Concerns count square takes `view-codebase-square` for its neutral fill. A new view-registry test reads `artifact-page.tsx` to pin the withhold guard before both document-HTML renders.
- **Files modified:** test/web/debug-view-contract.test.ts, test/web/note-view-contract.test.ts, test/web/view-registry.test.ts, src/web/views/withheld-document-note.tsx, src/web/pages/artifact-page.tsx, src/web/views/codebase-components.tsx, src/web/styles/globals.css
- **Commit:** 6694d55

### Instructed deviations

**2. Service restart and e2e skipped**
- Task 1 and 2 verify steps end with `systemctl --user restart labelore`; the dispatch forbids it and the e2e run. `npm run build` ran and passed. The orchestrator restarts after merge.

**3. Plan-ledger file not written**
- The per-plan HEAD ledger lives under the shared git directory, which the worktree sandbox blocks for writes. `plan_head_before` is the dispatch base (54c0169) and `commits: 4` was measured with `git rev-list --count 54c0169..HEAD` before this summary commit.

### Environment

- The worktree had no `node_modules`; a git-ignored directory of per-entry symlinks to the main checkout's was used. No package installed.

## Authentication gates

None.

## Known Stubs

None that block the goal. Panels beyond Stack and Concerns have no designed lifted form yet by design (differences 1 and 2); their plain rendering is the generic document view, so the page never reads worse than it.

## Threat Flags

None new. T-10-13 mitigated (lifted text as React text through `ResearchInline`; plain sections only through the page's sanitised renderer; the contract test forbids the raw-HTML prop). T-10-49 mitigated (`withholdDocumentInView`, asserted in view-registry.test.ts and in a source check on `artifact-page.tsx`).

## Self-Check: PASSED

- Created files found: src/presentation/codebase-map.ts, src/web/views/codebase-page.ts, src/web/views/codebase-components.tsx, src/web/views/withheld-document-note.tsx, test/presentation/codebase-map.test.ts, test/web/codebase-page.test.ts
- Commits a214ee1, 3e1dbe1, 2c90975 and 6694d55 are ancestors of HEAD
- Acceptance greps: `'codebase'` in kinds.ts, `buildCodebaseContext(` in project-api.ts, `toBe(31)` in view-registry.test.ts, `withholdDocumentInView` in manifests.ts and artifact-page.tsx, `data-ghost` in codebase-components.tsx, `viewKindOf(` in manifests.ts, `view contract` in codebase-page.test.ts and one `phase-10-codebase:start` in globals.css

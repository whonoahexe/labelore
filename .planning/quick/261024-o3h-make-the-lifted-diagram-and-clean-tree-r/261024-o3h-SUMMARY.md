---
phase: quick-261024-o3h
plan: 01
subsystem: rendering
tags: [figures, ascii-diagram, directory-tree, markdown-pipeline, hydration]
requires: []
provides:
  - classifyFence, the one decision for every fenced block (diagram, tree or code)
  - FigureFor / FencedCode / FencedFigure / mountFigureIslands, the one figure renderer
affects: [every rendered document page, shared block renderer, CONTEXT, todos, UI-REVIEW, UI-SPEC, PATTERNS, Research]
tech-stack:
  added: []
  patterns: [server wraps a classified fence in a data-figure host after sanitization; client hydrates React islands beside the escaped code block]
key-files:
  created:
    - src/rendering/figure-detect.ts
    - src/web/components/fenced-figure.tsx
    - test/rendering/figure-detect.test.ts
    - test/web/fenced-figure.test.ts
  modified:
    - src/rendering/markdown.ts
    - src/web/pages/artifact-page.tsx
    - src/web/styles/globals.css
    - src/planning-repo/handlers/context-brief.ts
    - src/planning-repo/handlers/research-briefing.ts
    - src/planning-repo/handlers/todo-file.ts
    - src/planning-repo/handlers/ui-review-audit.ts
    - src/planning-repo/handlers/ui-spec-contract.ts
    - src/planning-repo/handlers/pattern-map.ts
    - src/web/views/research-briefing-components.tsx
    - src/web/pages/research-architecture-panel.tsx
decisions:
  - "Box-corner check runs before the tree check; a flow drawn with branch glyphs and three or more forward-arrow lines (outside # comments) is a diagram, not a tree"
  - "Source mode keeps today's plain highlighted code block; only View mode (and documents with no toggle) hydrates figures"
status: complete
commits: 3
plan_head_before: 935314a8f9ba2d067bf962620da9f49c21fb75ff
plan_head_after: fd3d326249249c09a2cf91896de91fef31b16bf3
actuals:
  tokens: 12900
  tasks: 3
  commits: 3
completed: 2026-10-24
---

# Quick 261024-o3h: Lifted diagram and clean tree for every document type

Every box-drawing diagram and every directory tree in every document Labelore shows now draws as the lanes figure (or the author's own layout) and the clean list tree, decided by one shared detector instead of being wired by hand into two Research screens.

## What you now see

- **Any rendered document page** (project research files, codebase-map docs, notes, the fallback view for kinds with no special page, CONTEXT and fold bodies, PLAN sections): diagrams and trees show as figures in View mode. Opening labelore's own project research ARCHITECTURE page shows its system diagram as the lanes figure and its directory tree as the clean list.
- **Phase RESEARCH pages**: every diagram and every tree in the document gets the figure, not only the ones in the architecture chapter.
- **The twelve views that share the block renderer, the CONTEXT brief, todos, UI-REVIEW findings**: a fenced diagram or tree shows as a figure; code tagged with a real language stays code.
- **UI-SPEC and PATTERNS prose**: an untagged fenced diagram or tree is now kept in the prose (it used to be dropped on purpose) and shows as a figure wherever that prose is rendered.
- **Both Research call sites** (the RESEARCH architecture chapter and the project Research page's Architecture panel) render through the same shared component and look as before.

## What stayed the same

- The Source toggle shows each fence as the same plain highlighted code block as before.
- A fence tagged ts, js, bash, json, sh and so on stays code. Mermaid still renders through Mermaid.
- Ordinary code with a stray bar character, or with one or two tree lines, stays code.
- Nothing was written to any target `.planning/` or to the other three projects (verified by `git status` in each).

## How it works

- `classifyFence(lang, text)` decides diagram, tree or code. Only untagged fences and ones tagged text, txt, plain, plaintext or ascii are candidates; text over 256 KiB is never inspected.
- The markdown pipeline wraps a classified fence in a `data-figure` host after sanitization; the host carries only the allowlisted kind and no document text. A host written by an author is stripped (tested).
- The client reads the source from the escaped code block's text and renders it only as React text. No markup is parsed or injected (the module contains no raw-HTML injection).
- Structured block renderers carry the fence language through (`lang` on code blocks, `codeLangs` on research pitfall rows, `codeLang` on UI-REVIEW items) and render through `FencedCode`.

## Checks

| Check | Result |
| --- | --- |
| `npm test` | 3295 passed, 6 failed, 8 skipped (176 files, 5 with failures) |
| `npm run typecheck` | clean |
| `npm run lint` | clean |
| `npm run build` | clean, no warnings |
| Class-vocabulary test | green, no new class names |

The 6 failing tests are not caused by this work. They fail identically on the commit before my first change (checked in a throwaway checkout carrying your uncommitted planning edits): five depend on `.planning/todos/pending/001-sketches-page-in-labelore.md`, which your working tree has moved to `todos/completed/` (coverage matrix page, note-context, two note-page tests, note-page-corpus), and one is the stylesheet token check, which already flags three untouched rules (the plan-nav code size, the plan-nav checks marker margin, the UI-REVIEW finding code size). Logged in deferred items below.

### Browser specs (only these were run, never the whole suite)

Baseline before any change: 68 passed, 5 skipped, 0 failed across document-layout, research-briefing, research-page, context-brief and todo-page. After:

| Spec | Result |
| --- | --- |
| document-layout "rendered figures" (new test) | 1 passed |
| research-briefing + research-page | 36 passed, 1 skipped |
| context-brief + todo-page | 18 passed, 4 skipped |

Every skip is a studio-portal test (the studio-portal server is not available on this machine), as expected.

I also opened labelore's ARCHITECTURE page in a browser of my own (port 4197, since stopped) and looked at both the lanes figure and the clean tree: no prose styling leaked into them.

## Corpus census (read-only, all four projects, every `.planning/**/*.md`)

Fence counts by document type, after the final classifier:

| Document type | Files | Diagram | Tree | Code |
| --- | --- | --- | --- | --- |
| RESEARCH | 38 | 33 | 27 | 346 |
| research/FEATURES | 2 | 0 | 2 | 0 |
| research/ARCHITECTURE | 2 | 4 | 1 | 4 |
| research/other | 8 | 2 | 0 | 33 |
| codebase map | 14 | 3 | 4 | 48 |
| CONTEXT | 49 | 5 | 0 | 10 |
| UI-SPEC | 14 | 5 | 0 | 12 |
| PATTERNS | 31 | 2 | 0 | 717 |
| PLAN | 316 | 3 | 0 | 83 |
| other | 616 | 9 | 0 | 224 |

Research parity (does today's Research slot decision agree with the new detector, on the real diagram and structure text of every `*-RESEARCH.md` and `research/ARCHITECTURE.md`): **empty** after the fix below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Connector flows that borrow tree branch glyphs read as trees**
- **Found during:** Task 3 census
- **Issue:** With the plan's literal order, three plan.sideby.me RESEARCH diagram slots (v1.4 phases 03 and 04, v1.5 phase 03) went from the lanes or as-drawn figure to a clean file tree, because they are connector flows with no box corners but three or more `├──` lines.
- **Fix:** In `classifyFence`, a fence that passes the tree test but also lifts and has three or more forward-arrow lines (arrows inside a `#` comment do not count) is a diagram. This is in the detector, not a per-slot override. A unit test pins both sides (a flow with arrows is a diagram; a tree whose comments hold arrows is a tree).
- **Effect on other fences:** four fences across the four projects change from tree to diagram versus the literal order: those three Research diagrams (now match the old behaviour) plus the codebase-map TESTING.md outline at line 256 in plan.sideby.me, a `├──` outline of prose steps with arrows, which now draws as a figure that falls back to "Shown as drawn" if the graph is thin. Decide later if you would rather that one stay a tree.
- **Files modified:** src/rendering/figure-detect.ts, test/rendering/figure-detect.test.ts
- **Commit:** fd3d326

**2. [Rule 3 - Blocking] Token-guard allowlist and pinned selectors**
- **Found during:** Task 1
- **Issue:** Narrowing the document prose rules with the island exclusion changed their selector text, which the token-guard allowlist (heading margins) and visual-contract pins match by exact text, and a literal `1em` margin tripped the spacing guard.
- **Fix:** Updated the selector strings in test/token-guard.test.ts and test/web/visual-contract.test.ts (every asserted property unchanged) and used `var(--space-4)` for the mounted host's margin.
- **Commit:** 99eb3a8

**3. [Test location]** The pitfall `codeLangs` unit test went into test/research-briefing.test.ts (the handler test file) rather than test/web/research-briefing.test.ts, which is where the composer assertions were updated. The detector test and implementation were written together, so there was no separate red run for them.

## Left undone or for you to decide

- **Figures in UI-SPEC and PATTERNS documents that no view section renders**: the census found seven. Five are in studio-portal's phase 04 UI-SPEC, and two are in plan.sideby.me PATTERNS files (v1.1 phase 03, v1.4 phase 03). Where those fences sit inside a section the view renders as prose they now show as figures; where they sit in a section the view does not render, they stay off the page as before. No new section was added.
- The studio-portal browser tests (4 context-brief specs, 1 research-briefing spec) skipped as expected, so the "later trees in the same document" page-wide count at research-briefing line ~140 was not exercised here; no expectation was changed.
- The one browser-visible check the plan names for studio-portal phase 03 RESEARCH was not possible here for the same reason.
- The todo `.planning/todos/pending/lifted-figures-everywhere.md` was not touched, as instructed.

## Deferred Items

Pre-existing failures, unrelated to this work (reproduced on the commit before my first change):

- 5 tests that depend on the sketches todo you moved to `todos/completed/` (coverage.test.ts, note-context.test.ts, note-page.test.ts x2, note-page-corpus.test.ts).
- The stylesheet token check flags `.view-plan-nav-body :not(pre) > code`, `.view-plan-nav-checks li::before` and `.view-ui-review-found-card .view-ui-review-item-text code`.
- The cost-bound test in test/rendering/ascii-graph.test.ts failed once at 303 ms against a 250 ms limit while a browser run was using the machine at the same time, and passed on the full `npm test` run.

## Known Stubs

None.

## Threat Flags

None. The new surface (the `data-figure` host and client islands) is the one the plan's threat model covers: kind allowlisted to diagram or tree, no document text in any attribute, source rendered only as React text, a forged host stripped by sanitization (tested).

## Self-Check: PASSED

- Created files present: src/rendering/figure-detect.ts, src/web/components/fenced-figure.tsx, test/rendering/figure-detect.test.ts, test/web/fenced-figure.test.ts.
- Commits present on master: 99eb3a8, 43ea81f, fd3d326.

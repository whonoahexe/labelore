---
phase: 10-codebase-map-specification-and-check-pages
plan: 19
subsystem: user-setup-page
tags: [user-setup, value-masking, status-meter, clean-tree, sketch-049-B, phase-10]
status: complete

requires:
  - phase: 10-codebase-map-specification-and-check-pages
    provides: 10-04 made-up USER-SETUP fixtures, 10-08 user-setup manifest and withholdDocumentInView, 10-14 withholdValue and the Value not shown mark, 10-15 sketch 049 winner B, 10-16 and 10-18 page shape and StatusMeter
provides:
  - UserSetupHandler, extractUserSetup and UserSetupBody (structured.userSetup), names only, every other string masked
  - maskValues and VALUE_NOT_SHOWN_MARK (withhold-values.ts)
  - composeUserSetup and UserSetupView (designed model or masked plain model)
  - the shared ValueNotShown component, a row-input path on CleanTree, tone items on StatusMeter
affects: [10-23 browser spec, any later page that draws a dashboard path tree or a Value not shown mark]

requirements-completed: [VIEW-11]

key-files:
  created:
    - src/planning-repo/handlers/user-setup-body.ts
    - src/planning-repo/handlers/user-setup.ts
    - src/web/components/value-not-shown.tsx
    - src/web/views/user-setup-page.ts
    - src/web/views/user-setup-page-components.tsx
    - test/user-setup-handler.test.ts
    - test/web/user-setup-page.test.ts
  modified:
    - src/planning-repo/handlers/index.ts
    - src/planning-repo/handlers/withhold-values.ts
    - src/web/components/clean-tree.tsx
    - src/web/components/status-meter.tsx
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/views/codebase-components.tsx
    - src/web/pages/artifact-page.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/withhold-values.test.ts
    - test/web/clean-tree.test.ts
    - test/web/status-meter.test.ts

key-decisions:
  - "Built sketch 049 winner B as chosen: a ruled head (lead, status-meter, the Status line beside the boxes), a map of the dashboard paths as the shared clean tree beside one card per destination file, the selected step's dock, closed bars, In the source only"
  - "The mask marker is the bracketed text '[Value not shown]': a placeholder to maskValues, so masking is idempotent, and plain text in titles and outlines where a custom glyph would show as a missing-glyph box"
  - "The 10-14 mark is promoted to components/value-not-shown.tsx (class value-not-shown); the Codebase page uses it too"

duration: one session
completed: 2026-11-05
actuals:
  tokens: 46000
  tasks: 3
  commits: 5
plan_head_before: 11d92fe645e39a2bbf25f3aad5aaff40b0a44e83
plan_head_after: 0423f39bcb854a388d648c9621dbe6ef2af4c9b5
---

# Phase 10 Plan 19: User setup page Summary

**A USER-SETUP opens on sketch 049 B: "3 of 6 steps done" over the status-meter with the file's own Status line set beside the boxes (a quiet dashed pair when they disagree), the dashboard paths as a clean tree of clickable step leaves beside a card per destination file, and no variable value anywhere in View mode: the handler keeps only names and masks every other string, and the page never reads the document HTML.**

## What was built

- **`handlers/user-setup-body.ts`.** `extractUserSetup` reads the head lines, the Environment Variables table (Variable, Source, Add to, and the Status box when the table has that column), the `- [x]` / `- [ ]` items of every `##` section with their indented `Key: value` lines, and every `##` section as masked lines. The Variable cell goes through `withholdValue` (name and a hadValue flag); every other stored string goes through `keep` (cap 400, then `maskValues`). Steps and sections sit in their own guards, so a throw in one leaves the other. Caps: 250,000-character body, 200 steps, 200 sections, 2,000 lines a section, 400 characters a string. No regular expression.
- **`handlers/user-setup.ts`.** `UserSetupHandler` on the `USER-SETUP` token, before the generic handler; title and every frontmatter string (keys included, nested to depth 8) masked; the body stays as written for Source mode.
- **`maskValues`.** One linear pass: every upper-snake `NAME=value`, `NAME: value`, `NAME:value`, `NAME = value`, quoted value, value inside an inline code span (to the closing backtick) and `` `NAME`=value `` anywhere in a string; bracketed and angle-bracketed placeholders, empty remainders and text with no assignment kept; sentence punctuation after a value stays outside the mask. Returns `[Value not shown]` where a value was.
- **`user-setup-page.ts` / `-components.tsx`.** The pure composer (tree, file cards, bars, plain sections as blocks, the status pair) and the page; `MaskedInline` renders author text and draws the marker as the shared quiet mark. Fenced commands are `CopyCommand` rows, except a command that held a value, which is plain text.
- **Shared parts.** `CleanTree` takes `rows` (a row-input path: depth, name, folder or leaf, parent, an optional leaf node) beside its ASCII `text`; `StatusMeter` items may name a tone (`complete`, `in-flight`, `quiet`); `ValueNotShown` promoted from the Codebase page.
- **Wiring, CSS, docs.** `userSetupPage` on the user-setup manifest; one memo, header override, hidden metadata disclosure and render branch in `artifact-page.tsx`; a `phase-10-user-setup` CSS block and a `value-not-shown` block; design-language tone uses, a class row and a Language bullet.

## Deviations from Plan

1. **[User decision 049 B] Page as the winner draws it**, not the plan's looser "steps with status squares" text. Variables the file lists without a Status box (no Status column) are listed unclassified (a dashed square, no word) in the tree and cards, even when other steps exist; the sketch drops them when steps exist.
2. **Marker text, not a private glyph.** The plan says a "marker the components render". The marker is the bracketed text `[Value not shown]`, so `maskValues` is idempotent (a placeholder is kept) and a title or heading that cannot draw the mark still reads. The page draws it as the quiet mark everywhere author text is drawn.
3. **`MaskedInline`, not `ResearchInline`.** `ResearchInline` cannot draw the mark, and a marker inside a code span would break at a split. The page has its own inline renderer over the same `tokenizeInline`; the view contract pins that no `<ResearchInline` is used.
4. **No View-mode outline.** The plan says the outline for this kind comes from the composed model's headings. The 049 winner draws no outline and every Phase 10 page (Spec, AI spec) draws none, so there is none; the document's heading list can never be what View mode draws for this kind. The contract test pins that the user-setup branch precedes `documentWithheld`, `ViewReader` and `ArtifactReader` in `artifact-page.tsx`.
5. **`fields[].text`, not `.value`.** Item fields are stored as `{ key, text }` so the source-text contract can forbid any field named `value` (it allows only an inline token's `.value`).
6. **`NAME = value`, `NAME:value` masked; `NAME= value` not.** Wider than the plan's "followed by = or :" where leaking is concerned; `NAME= value` (an empty assignment followed by prose) is left, so "DB_URL= and ..." is not eaten. Sentence punctuation right after a value stays outside the mask.
7. **Tree status word inline.** `CleanTreeRow` first had a `trail` slot for a right-aligned word; the sketch puts the word inline after the title, so the slot was removed again before it shipped.
8. **[Dispatch] Not run:** the Playwright suite, `systemctl --user restart labelore`, and `--sketch` on `shoot-pages` (times out). Shots came from `shoot-pages` on an isolated server and a scratchpad script for the sketch (`shoot-049.mjs`, tab `#b`, `?state=`).
9. **[Rule 3] CSS guards.** The page sizes squares with its own `view-user-setup-sq` and sets no `.status-square` rule; the plan's shared `.view-codebase-vns` rule moved to a `value-not-shown` block.
10. **Hidden metadata disclosure.** View mode hides the "Document metadata" disclosure for this page (masked anyway); Source mode keeps it.

## UI-SPEC open item 1: where a value can still be seen

Where a value can still be seen: Source mode renders the /documents response's document HTML, which holds the file as written, and for every other kind View-mode plain sections and the promoted fallback render that same HTML; for user-setup, View mode never renders it (10-08's `withholdDocumentInView` and this plan), so a value is visible only in Source mode. The search index holds artifact bodies, so a value is searchable and can appear in a snippet. Map INTEGRATIONS values outside lifted rows read the same way. Phase 6 masks only `config.json`. Recorded as a follow-up for a later phase, not fixed here (T-10-34, accepted). The API payload also carries the artifact `body` as written (Source mode needs it); only `structured`, `title` and `frontmatter` are masked.

## Tracer and TDD record

Task 1 (tracer): the handler, composer, page, CleanTree rows, StatusMeter tones and CSS shipped with the non-variable strings unmasked; the tracer was checked end to end (gate on the named files, typecheck, build, four screenshots) before expansion. Task 2: RED `2503074` (20 tests failing), GREEN `d29cc6c`. Task 3: RED `3cedcff` (15 tests failing), GREEN `0423f39`.

## Side by side (sketch left, build right)

Shots in `/tmp/claude-1000/-home-cinedise-codebases-labelore/eee67f35-318e-418b-ab45-56538cdc4f26/scratchpad/build-10-19/`: `sketch/sketch-{04,02}-{1280,390}-{light,dark}.png` and `build/setup-v1-1-phase-{4,2}-user-setup-{1280,390}-{light,dark}.png`. Viewed side by side: 04 at 1280 light, 04 at 390 light, 02 at 1280 dark (the other combinations were shot, not all viewed). Differences:

1. **Fixed: tree status word** was right-aligned in the first build; the sketch sets it inline after the title.
2. **Fixed: folder icons and weight** were orange and bold; now muted and regular, as the sketch.
3. **Fixed: In the source only** sat a page gap below the bars; now inside the Steps block.
4. **Left: Value not shown mark.** The sketch's mark carries a small square; the build uses the shared 10-14 mark (dashed box, no square), as the plan asks.
5. **Left: tree root.** The sketch draws the root bold with a server icon; the shared `CleanTree` draws every folder with a folder icon and the same weight.
6. **Left: page chrome** (the app shell and crumbs, and the header row order: the app puts the copy button and View / Source on their own right-aligned line).
7. **Left: "Goes in" code tint.** The sketch's inline `.env.local` has a veil ground; the build's is plain mono.
8. **Left: unviewed combinations.** 02 at 390, 04 dark and the "No steps" state were not looked at beside the sketch; the no-steps layout is unit tested only (no fixture, no sketch of the build's plain layout).
9. **Left: interaction.** A leaf or file line opening the dock, and a bar opened, are covered by markup tests only, not photographed.

No sideways page scroll at 390 and no page error on any shot (`shoot-pages` printed no FAIL line). Four font sizes in the block (test-pinned).

## Verification

- `npm run test:gate -- test`: `gate: total=6044 passed=6044 failed=0 skipped=0 todo=0` (base 5966). `npm run typecheck`, `npm run lint`, `npm run build`: exit 0.
- Task 1 gate on the named files (plus clean-tree, status-meter and codebase-page): 452 passed; four screenshots rendered.
- Acceptance: `UserSetupHandler` in `handlers/index.ts`; `withholdValue(` in `user-setup-body.ts`; `userSetupPage: composeUserSetup` once in `manifests.ts`; `export function maskValues` once; `PLANTED-FALLBACK-VALUE-0003` and `PLANTED-SECTION-VALUE-0002` in the tests; the "where a value can still be seen" section above.
- Growth (T-10-35): the mask and the extractor stay linear on 5,000 assignments on one line, a 200,000-character line and 10,000 table rows.
- The golden (`test/__golden__/dense.json`) did not change: the dense fixture has no USER-SETUP file.

## Known Stubs

None.

## Threat Flags

None new. T-10-33 mitigated (names through `withholdValue`, every other stored string through `maskValues`, the View never renders the document HTML for this kind; tests plant values in a step body, an unclaimed section, a fenced command, a title, a frontmatter string and a no-steps file). T-10-34 accepted and recorded above. T-10-35 mitigated (caps, single-pass scans, growth tests). No package installed.

## Self-Check: PASSED

- FOUND: `user-setup-body.ts`, `user-setup.ts`, `value-not-shown.tsx`, `user-setup-page.ts`, `user-setup-page-components.tsx`, `test/user-setup-handler.test.ts`, `test/web/user-setup-page.test.ts`.
- FOUND commits 9eda54a, 2503074, d29cc6c, 3cedcff, 0423f39 (ancestors of HEAD).
- STATE.md and ROADMAP.md untouched.

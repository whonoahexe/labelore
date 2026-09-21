---
phase: quick-260912-lfi
plan: 01
subsystem: ui
tags: [dashboard, markdown, navigation, scroll-settle, css-tokens]

requires:
  - phase: quick-260910-jz8
    provides: centralized spacing/type/color design tokens and test/token-guard.test.ts
provides:
  - blocker provenance with heading anchor slug `#<slug>` preserved through routes to `STATE.md`
  - seamless scroll target in `artifact-page.tsx` via `scrollWhenSettled` with location hash dependency
  - safe, token-compliant `InlineMarkdown` component and `parseInlineMarkdown` parser for dashboard prose
affects: [dashboard.ts, routes.ts, artifact-page.tsx, inline-markdown.tsx, inline-markdown.ts, dashboard-page.tsx, globals.css]

actuals:
  tokens: 18250
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Stable slug generation for blocker provenance anchors matching artifact heading renderer"
    - "Lightweight, recursive inline Markdown parser emitting semantic JSX elements without third-party dependencies"
    - "CSS token-compliant styling for dashboard prose strong and code elements resetting card-header block overrides"

key-files:
  created:
    - src/web/components/inline-markdown.ts
    - src/web/components/inline-markdown.tsx
    - test/web/inline-markdown.test.ts
  modified:
    - src/presentation/dashboard.ts
    - src/presentation/routes.ts
    - src/web/pages/artifact-page.tsx
    - src/web/pages/dashboard-page.tsx
    - src/web/styles/globals.css
    - test/presentation/dashboard.test.ts
    - test/presentation/routes.test.ts
    - test/web/strip-emoji.test.ts
    - test/web/visual-contract.test.ts

key-decisions:
  - "D-01: Blocker provenance from STATE.md includes the heading anchor slug for the blockers section (e.g. #blockersconcerns)"
  - "D-02: sourceDestination preserves and forwards hash anchors to buildArtifactUrl for artifact links"
  - "D-03: DocumentView effect includes location.hash in dependencies so anchor navigation engages scrollWhenSettled"
  - "D-04: Lightweight InlineMarkdown component parses bold, italic, code, and strikethrough without emitting raw delimiters"
  - "D-05: Emoji sanitization via stripEmoji is preserved before rendering inline markdown in attention and next-work items"

requirements-completed: [LFI-01, LFI-02]

coverage:
  - id: D1
    description: "Blocker source link navigation and scroll target (anchor preservation, provenance slugging, and settle scroll)"
    requirement: "LFI-01"
    verification:
      - kind: unit
        ref: "test/presentation/dashboard.test.ts#blocker attention items populate provenance.ref with heading anchor slug and sourceDestination resolves to artifact with anchor (LFI-01)"
        status: pass
      - kind: unit
        ref: "test/presentation/routes.test.ts#normalizes headings with accidental leading hashes"
        status: pass
    human_judgment: false
  - id: D2
    description: "Safe inline Markdown rendering across dashboard cards and token-compliant typography styling"
    requirement: "LFI-02"
    verification:
      - kind: unit
        ref: "test/web/inline-markdown.test.ts#InlineMarkdown and parseInlineMarkdown"
        status: pass
      - kind: unit
        ref: "test/web/strip-emoji.test.ts#dashboard-page emoji sanitization contract"
        status: pass
      - kind: unit
        ref: "test/web/visual-contract.test.ts#never truncates the underlying description string in the component itself"
        status: pass
      - kind: unit
        ref: "test/token-guard.test.ts#token guard — spacing + type + colour families"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-09-12
status: complete
---

# Quick 260912-lfi: Scroll to blocker in project state from source link, and render markdown without raw asterisks in dashboard Summary

**Enabled seamless navigation from blocker attention items to the blockers section in `STATE.md` with heading anchor preservation and smooth scroll settling; replaced raw Markdown delimiters across dashboard items with a lightweight, token-compliant `InlineMarkdown` component.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2 (both completed with TDD)
- **Files modified:** 12 (3 created, 9 modified)

## Accomplishments

- **Blocker Heading Anchor Resolution (LFI-01):**
  - Updated `src/presentation/dashboard.ts` to attach `#${stableSlug(blocker.heading)}` to `AttentionItem.provenance.ref` when `blocker.heading` is present.
  - Updated `sourceDestination` in `src/presentation/dashboard.ts` to preserve heading anchors from `provenance.ref` and pass them to `buildArtifactUrl(null, path, hash)`.
  - Normalized heading handling in `src/presentation/routes.ts` (`withHeading`) to safely strip accidental leading `#` characters.
  - Updated `DocumentView` in `src/web/pages/artifact-page.tsx` to depend on `location.hash` so that entering or switching to an anchor triggers `scrollWhenSettled`.

- **Safe Inline Markdown Rendering (LFI-02):**
  - Created `src/web/components/inline-markdown.ts` and `src/web/components/inline-markdown.tsx` exporting `InlineMarkdown` and `parseInlineMarkdown`.
  - Supports bold (`**` and `__`), italic (`*` and word-boundary `_`), bold+italic (`***`), inline code (`` ` ``), and strikethrough (`~~`), with recursive nesting (e.g. code inside bold).
  - Preserves plain text for snake_case identifiers (`ident_with_underscore`) and arithmetic expressions (`2 * 3 = 6`).
  - Integrated `InlineMarkdown` into `dashboard-page.tsx` for `NextWork` item descriptions, `AttentionItem` details, and discrepancy callout details, while preserving `stripEmoji` sanitization.
  - Added CSS rules in `src/web/styles/globals.css` for `.dashboard-page p strong` and `.dashboard-page p code` ensuring inline flow and full design token compliance.
  - Rebuilt production assets via `npm run build`.

## Task Commits

1. **Task 1: Preserve and resolve blocker heading anchor in provenance, routes, and artifact scroll target** - `6f6ddb2` (fix)
2. **Task 2: Implement InlineMarkdown component, integrate into dashboard items, style token-compliantly, and rebuild** - `c6def3f` (feat)

**Plan metadata:** Not committed (per quick task constraints, docs commit handled separately).

## Files Created/Modified

- `src/presentation/dashboard.ts` - `stableSlug` import, heading anchor preserved in `sourceDestination` and added to blocker provenance
- `src/presentation/routes.ts` - `withHeading` normalizes accidental leading `#`
- `src/web/pages/artifact-page.tsx` - `DocumentView` uses location hash dependency for `scrollWhenSettled`
- `src/web/components/inline-markdown.ts` - Core tokenizer and `InlineMarkdown` / `parseInlineMarkdown` implementation
- `src/web/components/inline-markdown.tsx` - Re-export for `.tsx` imports
- `src/web/pages/dashboard-page.tsx` - `<InlineMarkdown>` used for NextWork description, attention detail, and discrepancy detail
- `src/web/styles/globals.css` - Typography and token-compliant rules for `.dashboard-page p strong` and `.dashboard-page p code`
- `test/presentation/dashboard.test.ts` - Unit tests for blocker provenance anchor and `sourceDestination` resolution
- `test/presentation/routes.test.ts` - Unit tests for heading normalization in `withHeading`
- `test/web/inline-markdown.test.ts` - Unit tests covering all formatting patterns, code spans, nested formatting, and edge cases
- `test/web/strip-emoji.test.ts` - Contract test updated for `InlineMarkdown`
- `test/web/visual-contract.test.ts` - Contract test updated for `InlineMarkdown`

## Verification

- `npx vitest run test/presentation/dashboard.test.ts test/web/attention-row-contract.test.ts test/presentation/routes.test.ts` passed (57 tests).
- `npx vitest run test/web/inline-markdown.test.ts test/web/strip-emoji.test.ts test/web/visual-contract.test.ts test/token-guard.test.ts` passed (95 tests).
- `npm run typecheck` passed cleanly across both `tsconfig.server.json` and `tsconfig.web.json`.
- `npm run build` succeeded and built all chunks in 536ms.

## Self-Check: PASSED

All required files created and updated; commits `6f6ddb2` and `c6def3f` present in git; no docs committed; `status: complete` set.

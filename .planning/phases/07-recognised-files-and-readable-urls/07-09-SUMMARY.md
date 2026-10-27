---
phase: 07-recognised-files-and-readable-urls
plan: 09
subsystem: server-and-web
tags: [images, binaries, file-details, bytes-route, drawer-badge, data-08, security, vitest]
status: complete

requires:
  - phase: 07-recognised-files-and-readable-urls
    provides: "07-01: file classes, sizes and MAX_IMAGE_BYTES; 07-06: table-backed lookupRoute; 07-07: DocumentRoute and documentCrumbsOf"
provides:
  - "GET/HEAD /api/files?route=: images-only, capped, hardened bytes route resolved through one captured bundle"
  - "file-facts: the one shared set of sizes, type labels, badge, folder, facts line, bytes URL and page kind"
  - "ImagePage/ImageView: the image page with Fit to width, loading, loaded and failed states"
  - "FileDetailsPage: the static four-fact card for binary, large-text and over-cap image files"
  - "DocumentRoute branching on the payload artifact's file class (no /api/documents request for a non-text file)"
  - "Drawer rows for non-text files with data-file-class and a quiet type-and-size badge"
affects: [07-10]

requirements-completed: [DATA-08]

actuals:
  tokens: 15475
  tasks: 3
  commits: 4
plan_head_before: 4fc6d962e5f48f45d89246a98c3584410c06e7f5
plan_head_after: 3c454f48fc8d1f9a0f5be3312a80488499710a14

tech-stack:
  added: []
  patterns:
    - "A request only selects an indexed artifact through the captured bundle's route table; the bytes route reads that artifact's own path through readBytesWithin('.planning', ...) and never request text"
    - "One uniform 'Not found' for every non-image, internal or unknown route, decided before any filesystem read"
    - "Post-read length check holds the cap for a file that grew after indexing"

key-files:
  created:
    - src/server/file-bytes.ts
    - src/presentation/file-facts.ts
    - src/web/pages/image-page.tsx
    - src/web/pages/file-details-page.tsx
    - test/server/file-bytes.test.ts
    - test/presentation/file-facts.test.ts
    - test/web/file-pages.test.ts
  modified:
    - src/server/index.ts
    - src/web/pages/document-route.tsx
    - src/web/components/figure-frame.tsx
    - src/web/components/planning-places.tsx
    - src/web/styles/globals.css
    - docs/design-language.md

key-decisions:
  - "The size of an over-cap image and the large-text limit are written through formatByteSize (10 MB, 1 MB), so the UI strings follow the constants"
  - "While the payload has not loaded, DocumentRoute falls back to ArtifactPage as before; the shell already holds its Reading snapshot state until the payload exists"
  - "FileRow's badge extension comes from the row's path, not its label, so a relabelled row still shows the real extension"

patterns-established:
  - "Static-render tests of a page's markup region (the figure-frame-body holds exactly one img) prove D-08 without a browser"

coverage:
  - id: C1
    description: "The bytes route serves an image's exact bytes with the three security headers; HEAD answers the same with no body"
    requirement: DATA-08
    verification:
      - kind: unit
        ref: "test/server/file-bytes.test.ts#GET /api/files?route= over the Shapes fixture"
        status: pass
    human_judgment: false
  - id: C2
    description: "Every non-image, internal, unknown, malformed or missing route answers the same 404 with zero readBytesWithin calls (D-09, D-10, D-11)"
    requirement: DATA-08
    verification:
      - kind: unit
        ref: "test/server/file-bytes.test.ts#answers the same 404 before any read for everything that is not an image"
        status: pass
    human_judgment: false
  - id: C3
    description: "MAX_IMAGE_BYTES is served, one more is 413 unread, and a file that grew after indexing is 413 from the bytes read"
    requirement: DATA-08
    verification:
      - kind: unit
        ref: "test/server/file-bytes.test.ts#the size cap"
        status: pass
    human_judgment: false
  - id: C4
    description: "A request is answered from the one bundle it captured, even when a refresh swaps the bundle during the read; the capture is the handler's first statement"
    requirement: DATA-08
    verification:
      - kind: unit
        ref: "test/server/file-bytes.test.ts#a request is answered from the one bundle it captured (DATA-08 concurrency edge)"
        status: pass
    human_judgment: false
  - id: C5
    description: "Error mapping, method guard and a symlink leaving .planning (403, no bytes)"
    requirement: DATA-08
    verification:
      - kind: unit
        ref: "test/server/file-bytes.test.ts#read errors / #methods / #a symlink that leaves .planning"
        status: pass
    human_judgment: false
  - id: C6
    description: "Image page states (loading, loaded, zero-dimension, failed), Fit to width, one img and nothing else in the frame, no link, download or new tab"
    requirement: DATA-08
    verification:
      - kind: unit
        ref: "test/web/file-pages.test.ts#ImageView"
        status: pass
      - kind: unit
        ref: "test/web/file-pages.test.ts#the page sources"
        status: pass
    human_judgment: false
  - id: C7
    description: "File details card for binary, large-text and over-cap image; DocumentRoute picks the page without requesting the document"
    requirement: DATA-08
    verification:
      - kind: unit
        ref: "test/web/file-pages.test.ts#FileDetailsPage / #DocumentRoute"
        status: pass
    human_judgment: false
  - id: C8
    description: "Drawer badge for non-text rows, quiet and toneless; text rows unchanged; active row current"
    requirement: DATA-08
    verification:
      - kind: unit
        ref: "test/web/file-pages.test.ts#FileRow"
        status: pass
    human_judgment: false
  - id: C9
    description: "Shared facts: every size boundary, the UI-SPEC type table, badge, folder, facts line, bytes URL and page kind"
    requirement: DATA-08
    verification:
      - kind: unit
        ref: "test/presentation/file-facts.test.ts"
        status: pass
    human_judgment: false
  - id: C10
    description: "Screenshots in light and dark (and 390px) of the image page, the binary and large cards and the drawer with a PNG, a PDF and text rows (three backstop truths)"
    requirement: DATA-08
    verification:
      - kind: manual
        ref: "Task 3 human-check, left for the end-of-phase walkthrough"
        status: pending
    human_judgment: true

duration: 35min
completed: 2026-10-27
---

# Phase 7 Plan 09: Image page, File details card and quiet drawer badge Summary

**Images open on a plain Fit-to-width page through a hardened, images-only, size-capped bytes route resolved from one captured bundle; binaries, large text and over-cap images open a static File details card; the drawer marks non-text rows quietly.**

## Performance

- **Tasks:** 3 (one tracer, one TDD, one auto), plus one test-typing fix
- **Files:** 13 planned, 13 changed; no new fixtures

## Accomplishments

- `/api/files?route=` serves only indexed images: sandbox CSP, nosniff and no-cache on every response, 413 above 10 MiB before and after the read, the sketch-files error mapping, 405 for other methods, and one identical 'Not found' for everything else with zero reads (T-07-23 to T-07-27).
- The image page shows the picture in an img only (SVGs too), opens in Fit to width, appends dimensions on load and replaces the frame with the render-issue notice on failure.
- The File details card and DocumentRoute branch mean a non-text file never requests /api/documents (D-10); confirmed in Chromium over the Shapes fixture (0 document requests, PNG decoded as 1 x 1 px, SVG as 24 x 12 px).
- The drawer badge, `FigureFrame` `defaultFit`, two element-scoped CSS rules and one design-language bullet landed with the vocabulary, source-order and token-guard tests passing unchanged.

## Task Commits

1. Task 1 (tracer): `fed57b7` bytes route, registration, shared facts, image page, document-route branch
2. Task 2 (TDD): `267025a` cap, error mapping, race and refusal tests, complete shared facts
3. Task 3: `49ed273` image states, File details card, drawer badge, CSS, design-language bullet, page tests
4. Fix: `3c454f4` type the defaultFit test props (found by the full typecheck)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test props did not typecheck**
- **Found during:** final `npm run typecheck`
- **Issue:** the `FigureFrame` defaultFit test passed `children` as a third `createElement` argument, which the required `children` prop rejected
- **Fix:** passed `children` in the props object
- **Files modified:** test/web/file-pages.test.ts
- **Commit:** 3c454f4

**2. [Test adjustment] Inline icon svg in the header**
- The copy-path button contains a lucide `<svg>`, so the "no inline svg" assertion is scoped to the figure-frame body (where D-08 applies) rather than the whole page.

Otherwise the plan executed as written. React 19 adds a `<link rel="preload" as="image">` for the img; it is a resource hint, not a link a reader can follow.

## Issues Encountered

- `npm run test:gate` over the whole suite: 4233 of 4234 tests passed in the first run and a different set of failures appeared in the second, none related to this plan:
  - `test/fixture-leak.test.ts` cannot read the worktree's `node_modules` symlink (EISDIR), because it scans `git ls-files --others` and the symlink is untracked here (the ignore rule is for a directory, not a symlink). It is an artifact of the worktree setup; the symlink was never staged.
  - `test/server/documents-route.test.ts` (5 s timeout) and `test/server/remote-source.test.ts` (leftover temp dir from a parallel run) failed under load while another executor ran; both passed when rerun alone.
- `npm run typecheck` and `npm run lint` exit 0.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model (T-07-23 to T-07-29 are mitigated or accepted as planned; the residual unbounded read of a file that grew after indexing, T-07-26, is unchanged).

## Next Phase Readiness

07-10 can rely on `file-facts`, `FileDetailsPage` and the bytes route. The three screenshot checks (image page, cards, drawer in light, dark and 390px) are recorded for the end-of-phase walkthrough.

## Self-Check: PASSED

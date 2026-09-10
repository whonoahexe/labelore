---
phase: 02-situational-awareness-artifact-reading
plan: 04
subsystem: artifact-reading
tags: [markdown, gfm, shiki, rehype-sanitize, mermaid, react, security]

requires:
  - phase: 02-situational-awareness-artifact-reading
    plan: 02
    provides: 'Milestone-qualified canonical document routes and bounded PLAN segmentation'
  - phase: 02-situational-awareness-artifact-reading
    plan: 03
    provides: 'Studio Portal b3Dqcuo4na shell, responsive containment, and light/dark tokens'
provides:
  - 'Raw-before-sanitize GFM and Shiki document renderer with PLAN-aware semantic sections'
  - 'Snapshot-only artifact index and typed plan/artifact document API'
  - 'Document-first React canvas with guarded frontmatter views, strict manual Mermaid, and stable heading links'
affects: [02-05, 02-06, artifact-linking, browser-uat, security-review]

actuals:
  tokens: 12417
  tasks: 2
  commits: 6

tech-stack:
  added: []
  patterns:
    - 'Untrusted artifact HTML is parsed raw, sanitized, then enriched only with trusted heading and highlighting nodes'
    - 'Canonical request routes select immutable ArtifactIndex entries and never become filesystem paths'
    - 'Known frontmatter builders consume only guarded shapes; every remainder is rendered recursively as text'

key-files:
  created:
    - src/server/artifact-index.ts
    - src/rendering/markdown.ts
    - src/rendering/frontmatter-views.ts
    - src/web/pages/artifact-page.tsx
    - test/rendering/markdown.test.ts
  modified:
    - src/server/index.ts
    - src/web/app-router.tsx
    - src/web/styles/globals.css

key-decisions:
  - 'PLAN rendering recursively composes sanitized Markdown fragments inside trusted semantic wrappers, reusing segmentPlanBody instead of adding a second grammar.'
  - 'Mermaid source remains escaped text until DocumentView manually selects a server-approved, 256 KiB-capped placeholder and runs strict browser rendering.'
  - 'Heading ids are recalculated deterministically across all PLAN fragments so duplicate headings remain stable regardless of semantic wrapper boundaries.'
  - 'Plan and artifact browser routes resolve through secondary keys built with the shared canonical route codec inside ArtifactIndex.'

patterns-established:
  - 'Renderer order: remarkParse -> remarkGfm -> remarkRehype(raw) -> rehypeRaw -> rehypeSanitize -> rehypeSlug -> trusted enrichment -> stringify'
  - 'Document delivery: canonical route -> typed parse -> immutable ArtifactIndex lookup -> finalized RenderedDocument -> sole HTML mount'
  - 'Frontmatter presentation: specialized-first guarded builders -> handled keys -> unconditional generic recursive remainder'

requirements-completed: [READ-01, READ-02, READ-03, READ-04, READ-06]

coverage:
  - id: D1
    description: 'GFM tables, task lists, blockquotes, adjacent blocks, source ordering, and dual-theme Shiki output survive one sanitized renderer.'
    requirement: READ-01
    verification:
      - kind: integration
        ref: 'test/rendering/markdown.test.ts#preserves adjacent GFM blocks and rows in source order with dual-theme highlighting'
        status: pass
    human_judgment: false
  - id: D2
    description: 'Known frontmatter panels are guarded while empty, wrong-shaped, and future fields remain visible through a recursive text fallback.'
    requirement: READ-02
    verification:
      - kind: unit
        ref: 'test/rendering/markdown.test.ts#structured frontmatter views'
        status: pass
    human_judgment: false
  - id: D3
    description: 'Real, empty, malformed, fenced, attributed, and Unicode PLAN wrappers render in source order through the shared bounded segmenter.'
    requirement: READ-03
    verification:
      - kind: integration
        ref: 'test/rendering/markdown.test.ts#renders the real Phase 1 plan as ordered semantic sections with nested Markdown'
        status: pass
      - kind: unit
        ref: 'test/rendering/markdown.test.ts#keeps empty wrappers semantic and degrades malformed wrappers locally as literal text'
        status: pass
    human_judgment: false
  - id: D4
    description: 'Hostile active content is removed before enrichment, Mermaid is strict/manual/capped, and traversal-shaped tokens can only miss the snapshot index.'
    requirement: READ-04
    verification:
      - kind: integration
        ref: 'test/rendering/markdown.test.ts#removes active content and source-authored post-sanitize attributes'
        status: pass
      - kind: integration
        ref: 'test/rendering/markdown.test.ts#snapshot-only artifact lookup'
        status: pass
    human_judgment: false
  - id: D5
    description: 'Duplicate headings receive stable distinct ids and their controls copy and update only on explicit activation without scroll-driven URL mutation.'
    requirement: READ-06
    verification:
      - kind: unit
        ref: 'test/rendering/markdown.test.ts#assigns deterministic duplicate-safe heading IDs and dormant adjacent copy controls'
        status: pass
      - kind: integration
        ref: 'test/rendering/markdown.test.ts#document-first browser contract'
        status: pass
    human_judgment: false

duration: 17min
completed: 2026-08-27
status: complete
---

# Phase 2 Plan 4: Safe Artifact Reader Summary

**A snapshot-only, PLAN-aware artifact reader now converts hostile local content into sanitized GFM and dual-theme Shiki output, preserves open metadata shapes, and mounts finalized documents once with strict Mermaid and stable section links.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-08-27T09:58:25Z
- **Completed:** 2026-08-27T10:14:59Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added one singleton renderer lifecycle in the required raw-before-sanitize order, with source-ordered GFM, dual-theme Shiki, deterministic duplicate heading ids, and local render degradation.
- Reused the bounded PLAN segmenter to render nested semantic sections, literal malformed wrappers, fenced pseudo-tags, Unicode content, and honest empty sections without inventing content.
- Added a snapshot-built ArtifactIndex and typed API routes that resolve canonical artifact and plan identities without passing request text to filesystem or path APIs.
- Added guarded structured frontmatter panels followed by an unconditional recursive generic remainder, preserving empty, wrong-shaped, and future metadata as text.
- Added the document-first ArtifactPage and sole sanitized HTML mount with strict manual Mermaid execution, activation-only copy links, responsive overflow containment, and explicit empty/error states.
- Proved the boundary with 13 focused hostile/real-corpus tests; the full suite passes all 203 tests.

## Task Commits

1. **Task 1 RED: Safe renderer and snapshot-index suite** — `ef7122e` (test)
2. **Task 1 GREEN: PLAN-aware sanitized artifact renderer** — `e72c167` (feat)
3. **Task 2 RED: Frontmatter and document-canvas suite** — `98edac4` (test)
4. **Task 2 GREEN: Document-first artifact canvas** — `1fa40a8` (feat)
5. **Verification fix: Remove modified router placeholder** — `c0fa2e9` (fix)
6. **Security fix: Validate Mermaid before DOM rendering** — `7e77fdb` (fix)

## Files Created/Modified

- `src/server/artifact-index.ts` — immutable canonical path/route index with typed found/not-found results
- `src/rendering/markdown.ts` — hostile-content-safe GFM, PLAN, Shiki, Mermaid, and heading pipeline
- `src/rendering/frontmatter-views.ts` — guarded known builders plus recursive generic remainder
- `src/server/index.ts` — typed artifact/document endpoints backed only by the snapshot index
- `src/web/pages/artifact-page.tsx` — document-first page and sole finalized HTML mount
- `src/web/app-router.tsx` — live plan/artifact document routes and non-placeholder phase destination
- `src/web/styles/globals.css` — preset-preserving metadata, document, PLAN, heading, and overflow treatment
- `test/rendering/markdown.test.ts` — real-corpus, hostile payload, edge-shape, route, and mount regression suite

## Decisions Made

The renderer sanitizes every artifact-authored node before any trusted Shiki or heading nodes are added. PLAN wrappers are not fed back through a permissive HTML parser: the existing segmenter defines bounded source ranges, each authored Markdown fragment is independently sanitized, and only escaped allowlisted wrapper attributes enter trusted semantic sections. Artifact requests similarly stop at an immutable in-memory index; route identity is a selector, never a disk address.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added a canonical route-to-document API seam**

- **Found during:** Task 2 document route integration
- **Issue:** Canonical plan URLs contain a plan identity rather than an artifact token, so the browser could not safely derive a file path without duplicating repository naming rules.
- **Fix:** Added an ArtifactIndex secondary route key and `/api/documents` endpoint that parses the shared canonical codec, then queries only the already-built index.
- **Files modified:** `src/server/artifact-index.ts`, `src/server/index.ts`
- **Verification:** Canonical plan and artifact API tests, full suite, typecheck, lint, build, and production smoke pass.
- **Committed in:** `1fa40a8`

**2. [Rule 2 - Missing Critical] Added document-specific containment and activation styling**

- **Found during:** Task 2 document canvas integration
- **Issue:** The existing shell supplied theme tokens and generic overflow boundaries but no metadata, PLAN section, heading-control, or wide-document presentation contract.
- **Fix:** Added local responsive reader styles using the existing `b3Dqcuo4na` tokens without changing the shell palette or geometry.
- **Files modified:** `src/web/styles/globals.css`
- **Verification:** Build, shell contract tests, focused renderer source contract, and production smoke pass.
- **Committed in:** `1fa40a8`

**3. [Rule 2 - Missing Critical] Removed the pre-existing placeholder from the modified route tree**

- **Found during:** Final stub scan
- **Issue:** The old phase destination still rendered placeholder copy in a router now responsible for real document routes.
- **Fix:** Kept canonical phase routes on the already-live roadmap page and reserved ArtifactPage for plan and artifact destinations.
- **Files modified:** `src/web/app-router.tsx`
- **Verification:** Typecheck, lint, shell contract, and renderer contract tests pass; the stub scan is clean.
- **Committed in:** `c0fa2e9`

**4. [Rule 1 - Bug] Validated Mermaid grammar before mutating the browser placeholder**

- **Found during:** Final threat-boundary review
- **Issue:** `mermaid.run({ suppressErrors: true })` could suppress a grammar error after the server's lightweight diagram-family check, weakening the guarantee that invalid source remains escaped and locally warned.
- **Fix:** Run strict `mermaid.parse` first with errors enabled, then render only successfully parsed source; the catch path restores the untouched source and adds a local warning.
- **Files modified:** `src/web/pages/artifact-page.tsx`, `test/rendering/markdown.test.ts`
- **Verification:** Focused/full tests, typecheck, lint, build, and production smoke pass.
- **Committed in:** `7e77fdb`

---

**Total deviations:** 4 auto-fixed (3 missing-critical integration gaps, 1 security-boundary bug).
**Impact on plan:** All fixes remain inside the planned artifact-to-DOM and route-to-index boundaries; no search, inferred linking, write capability, or theme substitution was introduced.

## Issues Encountered

The strict hooks lint rejected a synchronous warning state update inside the document-mount effect. Malformed fragments are already fail-closed by the route codec, so the local reload helper now safely ignores a malformed fragment without triggering a render cascade. The full lint gate passes.

## User Setup Required

None.

## Next Phase Readiness

- Plan 02-05 can link references and previews to finalized canonical reader routes without touching filesystem APIs or creating a second renderer.
- Plan 02-06 can exercise the document canvas, themes, narrow-width containment, Mermaid, and duplicate-heading reload behavior through the requested Cloudflare browser tunnel.
- No known stubs, skipped tests, unrun verification, or threat flags remain.

## Self-Check: PASSED

All five declared artifacts exist, all six TDD/production commits resolve, the complete 203-test suite and every quality gate pass, and the summary coverage is fully automatable.

---

_Phase: 02-situational-awareness-artifact-reading_
_Completed: 2026-08-27_

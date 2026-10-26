# Phase 7: Recognised Files and Readable URLs - Context

**Gathered:** 2026-10-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Every file GSD writes is recognised by where it lives as well as by its name. Images and other
binaries are recognised as binary and never read or indexed as text. GSD's internal files are kept
out of the drawer, search and the URL space. Every remaining file has exactly one readable URL that
starts with the project's name, the encoded `m~`/`p~`/`a~` URLs are replaced, and old links redirect.

Requirements: DATA-07, DATA-08, NAV-09, NAV-10, NAV-11.

Not in this phase: the multi-project registry, persisted slugs, the switcher and SEC-05 (Phase 8);
designed pages for the newly recognised types (Phases 9–11); the settings page and the Source mode
redesign (Phase 12); search facets and the palette (Phase 13). This phase only needs the one loaded
project's name as the first URL segment.

</domain>

<decisions>
## Implementation Decisions

### Milestone and phase URLs
- **D-01:** Phase URLs **always carry the milestone segment**, live or archived:
  `/labelore/v2.1/phase-7`. A URL never changes when a milestone closes and its phases move under
  `milestones/`, because the version stays the same. There is no short `/labelore/phase-7` form or
  alias. — **Reversibility:** costly — every builder, golden and Playwright URL is stamped with the
  milestone segment.
- **D-02:** The bare milestone URL **redirects to that milestone's roadmap**. For an archived milestone
  `/labelore/v1.1` goes to `/labelore/v1.1/roadmap` (the archived ROADMAP copy). For the live milestone
  `/labelore/v2.1` goes to `/labelore/roadmap` (the root `ROADMAP.md`).
- **D-03:** The live roadmap has **one address**, `/labelore/roadmap`. `/labelore/v2.1/roadmap` for the
  live milestone redirects there rather than being a second URL for the same file. The same applies to
  the other live root documents that have archived copies (requirements and the like).
- **D-04:** Today's milestone page (its phase list and progress) is **kept** and moves to
  `/labelore/<version>/overview`. `overview` therefore joins `roadmap`, `requirements` and `audit` as a
  reserved segment inside a milestone.

### Plan, summary and phase-file URLs
- **D-05:** `/…/phase-6/plan-03` is the **PLAN file's one URL** and opens the Plan tab of the pair page.
  `/…/phase-6/plan-03/summary` is the **SUMMARY file's one URL** and opens the Summary tab. Today's
  `?doc=summary` query redirects to the `/summary` path. There is **no** `/plan-03/plan` alias.
- **D-06:** Other phase-level files use the **lowercased filename token** as the last segment:
  `07-CONTEXT.md` → `/phase-7/context`, `07-VERIFICATION.md` → `/phase-7/verification`,
  `07-UI-SPEC.md` → `/phase-7/ui-spec`. A file whose numeric prefix does not match its phase directory's
  number takes the `file/` fallback (research rule).
- **D-07:** Quick tasks follow the plan shape: `/labelore/quick/261024-qhq` is the task's PLAN,
  `/labelore/quick/261024-qhq/summary` its SUMMARY, and other files in the task folder use their
  lowercased token. The URL uses the task ID, not the descriptive folder slug.

### Images and binary files
- **D-08:** Opening an **image** (png, jpg, gif, webp, svg, …) shows a plain page with the image
  itself, its name, size and pixel dimensions. **SVG is served as an image (`<img>`), never inlined
  into the DOM**, so scripts inside it cannot run. The image bytes are served from an artifact-index
  lookup, never from a path in the request.
- **D-09:** Opening **any other binary** (pdf, zip, fonts, unknown bytes) shows an **info card**: name,
  type, size and folder, plus a line saying Labelore does not show this file's contents. There is
  **no** raw-serve or download endpoint for non-image binaries, and their bytes are never read beyond
  what is needed to classify them.
- **D-10:** Binaries are never read as text, parsed or added to the search index (DATA-08).

### Internal files
- **D-11:** GSD's internal files (`state.json`, locks, `tmp/`, `async-jobs/` and similar) are
  **unreachable**. They are not in the artifact index, so they are absent from the drawer and search,
  and any URL for them (including a `file/` URL) returns the normal not-found page. Nothing serves
  their contents. `config.json` is **not** internal: it stays reachable, with secrets masked
  (Phase 6), and becomes the settings page in Phase 12. — **Reversibility:** reversible — adding
  internal files back to the index later is additive.

### Old links
- **D-12:** Old encoded URLs (`/milestones/m~…/phases/p~…`, `/artifacts/a~…`, `?doc=summary`)
  **redirect silently** to the new readable URL, replacing the history entry so the back button skips
  the old one. There is no "link has moved" notice.
- **D-13:** An old link that no longer resolves to any file gets the **normal not-found page**, naming
  the path it looked for. It does not fall back to the nearest parent page.
- **D-14:** The legacy redirector is **temporary**. It lives in one isolated module so it can be deleted
  cleanly, and it is **removed when milestone v2.1 closes** (see Deferred Ideas).

### Claude's Discretion
- **Unversioned projects (no milestone version yet):** the planner picks the form. Recommendation:
  drop the milestone segment (`/labelore/phase-2`), because there is no milestone for it to clash with,
  rather than the fake `current` segment used today. Whatever is chosen must keep D-01's "one URL per
  file" property and be covered by the round-trip test.
- **How binaries appear in the drawer:** inline in their folder or grouped, with a type mark and size
  or not, following `docs/design-language.md` and enforced by the class-vocabulary test. Keep it quiet.
- **Size limits for huge text files** and the exact binary-detection rule (extension, magic bytes or
  both).
- **The project slug before Phase 8:** derive it from the target folder's basename (kebab-cased, never
  empty) and share one reserved-word constant with the server routing, as the research recommends.
  Persisting slugs belongs to Phase 8.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### URL grammar and recognising files (primary design)
- `.planning/research/ARCHITECTURE.md` §"Feature 4: Clean URLs": the full URL grammar, the `Route`
  union, `buildUrl`/`parseRoutePath`/`addressOfPath`, `file/` fallback, injectivity audit, the
  round-trip property test, the single `/:project/*` splat route and the `planning-repo/folders.ts` table.
  Note that D-01..D-07 above refine it (milestone redirect, `/overview`, `/summary`).
- `.planning/research/SUMMARY.md` §"Implications for roadmap" items 2–3: the folder-to-kind table,
  the Labelore-side exact-name map (`HANDOFF.json`, `.continue-here.md`, `COVERAGE.md`,
  `deferred-items.md`, `SKELETON.md`), the file-kind policy, reserved words, and the research flags
  (plan-pair `/summary`, react-router 8 `%2F`/`%25` decoding).
- `.planning/research/PITFALLS.md`: pitfalls 1–5 (URL is also identity, slug collisions and ad-hoc
  files, reserved top-level words, old URLs/goldens/specs), plus 7, 8, 10, 24, 25, 26.
- `.planning/research/GSD-DOMAIN.md`: what GSD writes and where, used to build the folder table.

### Requirements and roadmap
- `.planning/REQUIREMENTS.md`: DATA-07, DATA-08, NAV-09, NAV-10, NAV-11.
- `.planning/ROADMAP.md` §"Phase 7": the success criteria, including dotted URLs (`v1.1`) surviving
  a hard reload in both the dev server and the built app.

### Conventions
- `docs/design-language.md` and `test/web/class-vocabulary.test.ts`: any new drawer marks or image or
  binary page chrome must use the allowed vocabulary.
- `fixtures/README.md` and the Lendshed fixture from Phase 6 (D-01 of `06-CONTEXT.md`): the round-trip
  and uniqueness tests run over the committed fixture projects only.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/presentation/routes.ts`: today's grammar (`m~`/`p~`/`a~` tokens, `presentationRoutePatterns`,
  `buildMilestoneUrl`/`buildPhaseUrl`/`buildPlanUrl`/`buildArtifactUrl`, `parsePresentationUrl`,
  `withHeading`/`parseHeading`). Rewrite it in place and keep the export names, so its importers change
  in expectations, not in shape. The current token parser becomes the legacy redirector (D-14).
- `src/server/artifact-index.ts`: the existing invariant that the server never opens a path taken
  from request text and only looks it up in the index. Extend it with `lookupRoute` and the
  duplicate-URL audit. Image bytes (D-08) are served through the same lookup.
- `src/planning-repo/discovery.ts`: `.md`-only predicates (lines ~91–117) and the `isTodoPath` /
  `isNotePath` / `isDebugSessionPath` helpers. These fold into the new folder table, and DATA-08's
  binary classification hooks in here.
- `src/planning-repo/naming.ts`: the filename grammar (`parsePlanFileName`, phase-number parsing) that
  phase and plan segments reuse. `phaseNumbersEqual`/`comparePhaseNumbers` drive phase-number
  normalisation (`05` = `5`, `12A` → `12a`).
- `src/planning-repo/secret-mask.ts`: keeps `config.json` masked at its `file/` URL (D-11).

### Established Patterns
- URLs are stamped server-side into DTOs by stateless builders (`project-presentation.ts`,
  `search-index.ts`, `drawer.ts`, `roadmap.ts`, `dashboard.ts`, `references.ts`, `traceability.ts`,
  `tree.ts`, `dashboard-ledger.ts`). The grammar stays project-relative, and the web layer prepends the
  slug in one place (`web/nav.tsx`, with a lint rule banning raw `Link`/`useNavigate` elsewhere).
- `src/web/pages/plan-pair-page.tsx` switches tabs today with `?doc=summary` (line ~97), and
  `drawer.ts` `matchUrls` (line ~182) marks the plan active for either file. Both move to the
  `/summary` path (D-05).
- A new `ArtifactLocation` is silently dropped by `assemble.ts`. Keep `location: 'other'` for new
  folders (research note).

### Integration Points
- `src/web/app-router.tsx`: 11 route patterns are replaced by one `/:project/*` splat route that
  dispatches on `parseRoutePath`.
- `/api/documents?route=` carries the new project-relative path. `/api/artifacts/*` becomes the same
  `route=` form.
- `routesToApp` hard-codes `/api/` and `/sketches/`. These come from the shared reserved-word constant.
- Playwright specs and golden snapshots carry URL strings. Route them through one helper and mask
  URLs in goldens.

</code_context>

<specifics>
## Specific Ideas

- The address bar should read like what it points to, e.g. `/labelore/v1.1/phase-5/plan-03`,
  `/labelore/quick/261024-qhq/summary`, `/labelore/codebase/architecture`,
  `/labelore/notes/per-kind-artifact-rendering`, `/labelore/roadmap`.
- Milestone navigation lands on the roadmap first. The overview page is a deliberate second stop at
  `/<version>/overview`.
- Screenshots under `ui-reviews/` should be viewable, not dead ends.

</specifics>

<deferred>
## Deferred Ideas

- **Remove the legacy URL redirector at v2.1 milestone close** (D-14). This is a task for
  `/gsd-complete-milestone`: delete the legacy parser module and its tests once v2.1 ships.
- A raw-serve or "open in browser" link for PDFs and other non-image binaries was considered and
  declined for now (D-09). Revisit only if it is actually missed.
- A "show internal files" drawer toggle was considered and declined (D-11).

</deferred>

---

*Phase: 07-recognised-files-and-readable-urls*
*Context gathered: 2026-10-26*

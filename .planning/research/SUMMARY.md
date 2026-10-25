# Project Research Summary: Labelore v2.1 Wayfinding

**Project:** Labelore
**Domain:** Read-only local dashboard over GSD `.planning/` directories (subsequent milestone; new v2.1 features only)
**Researched:** 2026-10-25
**Confidence:** HIGH on stack, architecture and pitfalls; MEDIUM on workstream layout and switcher conventions; LOW on page designs for file types never produced on this machine

## Executive Summary

v2.1 is an integration milestone. Labelore already has a read layer, markdown pipeline, per-type views for 18 kinds, search and a Cmd-K dialog. The work: make every GSD file type open into a designed page, move from one project to several, replace encoded URL tokens with readable project-relative paths, and rebuild search and the palette on top. **No new runtime or dev dependencies are needed.** Capabilities compose from installed Base UI, react-router, Hono, TanStack Query and MiniSearch, plus about 150 lines of hand-written Node.

Recommended order is strictly dependency-driven: (1) make tests trustworthy and close security gaps (ReDoS in `linkify.ts`, `config.json` secret masking, fixture privacy); (2) add a folder-to-kind table and file-kind policy, additive with no URL change; (3) define the project-relative URL grammar and slug rules; (4) extract a per-project runtime behind a slug-keyed registry, with the settings store as the only write path; (5) then build page batches, the codebase overview and the settings view in volume; (6) search grouping, facets and palette last.

Main risks: URLs becoming a hidden API and cache redesign (mitigate with opaque keys plus one href resolver and a round-trip property test); the first write path breaking the read-only guarantee (second named `node:fs` importer, containment check, atomic writes); and page designs built from templates rather than real files (synthetic fixtures labelled as such, mutation tests, generic fallback). Scope is the largest risk: workstreams, reports, forensics, onboarding and intel are candidates to defer.

## Key Findings

### Recommended Stack

- **Palette:** Base UI `Autocomplete` command-palette recipe over `Dialog`, refactoring `SearchDialog`. Do not add `cmdk` (adds four `@radix-ui/*` packages and a second primitive family).
- **Settings:** `$XDG_CONFIG_HOME/labelore/settings.json` (fallback `~/.config/labelore/`), versioned, atomic temp-file-plus-rename, re-read before each mutation, last writer wins, `LABELORE_CONFIG_DIR` override for tests. Not `localStorage` (origin changes with `autoPort`), not inside any `.planning/`.
- **Folder scan:** hand-written async walk in `local-fs.ts` via `readdir({ withFileTypes })`, no symlink following, skip dot-directories and build dirs, depth/entry/time budgets, only on explicit request or `--scan`.
- **Routing:** one `/:project/*` splat route parsed by one `parseRoutePath`. Static segments outrank `:param` (verified); dotted segments such as `v1.1` serve correctly in dev and production (probed). Keep the old `m~`/`p~`/`a~` parser as a legacy redirector.
- **Server:** Hono sub-app per project under `/api/p/:slug`; built-in `hono/csrf` on non-GET; Content-Type requirement on mutations; Host-header allowlist on `/api/*` against DNS rebinding.
- **Versions:** no bumps. Do not add `cmdk`, `commander`, `chokidar`, `zod`, `env-paths`, `write-file-atomic`, `proper-lockfile`, `fdir`, `tinyglobby`, `better-sqlite3`, or `fs.glob`.

### Expected Features

**Headline:** 62% of `.planning/` files on this machine already open on a designed page. The gaps are concentrated, and the most frequently seen unpaged types are not named in the milestone (`deferred-items.md`; `COVERAGE.md`, whose manifest is dead because the filename is unprefixed).

**Table stakes:**

- Folder-to-kind table covering unprefixed phase files (`COVERAGE.md`, `deferred-items.md`, `SKELETON.md`), `HANDOFF.json`, `.continue-here.md`.
- Clean project-relative URLs, old-token redirects, deep links surviving refresh in dev and production.
- Switcher: several paths at start, remembered list, add path or `ssh://`, scan on request, unavailable projects shown with reason.
- Search grouped milestone then phase then type; filters for phase, type, requirement with counts unaffected by own selection; filters in the URL.
- Settings view: grouped, plain labels for known keys, unknown keys under "Other", "not set" never invented defaults, masking everywhere, header-reachable.
- Source mode: line numbers, folded frontmatter, copy path/raw, line deep links, binary/image policy, size caps.
- Codebase-only projects: "mapped, not started" overview from the seven codebase documents; Roadmap and Traceability hidden.
- Page batches, most-seen first: (1) COVERAGE, REVIEW-DISPOSITION, REVIEW-FIX, deferred-items, milestone audit; (2) codebase family; (3) SPEC, AI-SPEC, USER-SETUP, SKELETON; (4) root document file views and archive copies; (5) spikes, seeds, threads; (6) `.continue-here.md` and HANDOFF with "GSD suggests" line; (7) reports, forensics, onboarding; (8) REVIEWS, EVAL-REVIEW, DOM-VERIFY; (9) quick batches, debug knowledge base, ui-reviews.

**Differentiators:** jump by id in the palette (`WR-03`, `D-12`, `REQ-04`, `05-02`, `261024-qhq`); "what this changes" per config toggle; "Paused" chip from HANDOFF; at most three palette prefixes; DISPOSITION and FIX as one ledger.

**Defer:** workstream scope and index page (until a real fixture exists); intel and graph summaries; STATE-ARCHIVE and INGEST-CONFLICTS layouts; landing cards; cross-project search; palette preview; backlinks; file watching; driving GSD.

**Anti-features:** any toggle or editor for settings, checklists, disposition or threads (show copyable commands); one page per internal file (`state.json`, `async-jobs/`, `tmp/`); rendering whole `graph.json` or `intel/*.json`; a second search UI; absolute paths in URLs; startup auto-scan; following symlinks; merged multi-project view; running scripts from `spikes/` or `sketches/` in the app origin.

### Architecture Approach

Current pipeline: CLI argument, then `PlanningFilesystem` (sole `node:fs` reader), discovery and handlers, `assemble`, one immutable snapshot inside a `createApp` closure, presentation builders that stamp URLs, React client. Target shape:

- **`planning-repo/folders.ts`** (new, pure): one table of folder rule, label, URL segment, order, scope. Keep `location: 'other'` for new folders (a new `ArtifactLocation` is silently dropped by `assemble.ts`).
- **`presentation/routes.ts`** (rewritten in place, same export names): one `Route` union, `buildUrl`, `parseRoutePath`, `addressOfPath`; `lookupRoute` in `artifact-index.ts`; injectivity audit per bundle; total fallback `file/<relative path>`.
- **`server/project-runtime.ts`** (extracted from `createApp`): `derived`, `fileDates`, `commits`, `inFlight`, refresh, disposal per project. D-05 preserved per runtime.
- **`registry/`** (new): project registry with lazy runtimes; `settings-store.ts` as the only write path; `folder-scan.ts`.
- **`web/nav.tsx`** (new): sole slug-prefixing point, with ESLint `no-restricted-imports` banning `Link`, `NavLink`, `useNavigate`, `useLocation` from `react-router` elsewhere. `web/query-keys.ts` for the key factory.
- **Composed pages:** one `compose` mechanism plus `kind -> composerKey` table replaces per-kind `ViewManifest` fields before the first new page; keep granular wire kinds; share composers across the seven codebase documents.

**Patterns:** one table, many readers; project-relative DTO URLs with slug applied at the edge; per-project runtime behind a keyed registry; URL slug as the only "current project" (no `projectId` in context).

### Critical Pitfalls

1. **URL is also identity.** `key` serves as identity, URL and API payload; 82 call sites build URLs. Keep an opaque key for APIs and caches; one href resolver per snapshot; round-trip property test and no-shared-URL check.
2. **Slug collisions and ad-hoc files.** Phase numbers repeat across milestones; `CONVENTIONS.md` exists in `codebase/` and `spikes/`; `README.md` in every spike. Every artifact needs a URL via `file/`; key on location plus path, never basename.
3. **Reserved top-level words.** `routesToApp` hard-codes `/api/` and `/sketches/`; one reserved-word constant shared by server, router and slug generator; test every reserved word as a project name.
4. **Deep links in dev vs production.** Test hard reload of dotted and extension-like final segments in both the Vite middleware server and the Hono static server.
5. **Old URLs, goldens, specs.** Legacy parser as redirector; route Playwright URLs through one helper; mask URL strings in goldens.
6. **Pages from templates.** About 14 types have no real file here. Synthetic fixtures labelled as such; per-kind handler guard, mutation, degrade and generic fallback tests.
7. **Basename dispatch.** `deriveKind` matches `STATE.md` at any depth; classify by position first, with a table-driven test over collisions.
8. **GSD internal files** (`tmp/`, `async-jobs/`, `milestone.lock`, `.gsd-ws-arg`) flood drawer and search; Internal group, excluded from search.
9. **Settings drift.** Key sets differ across seven projects; walk the object, decorate known keys only, "not set" unless default is read from GSD source.
10. **Codebase-only validation.** `.planning` argument form requires PROJECT or STATE; compute one `projectShape` and branch on it.
11. **Absolute-ms timing tests.** `security-register.test.ts` (250 ms) fails under parallel load; assert growth ratios with a planted positive control.
12. **`linkify.ts` is quadratic (verified).** `REFERENCE_TOKEN` lacks `\b` guards: 20k characters of a capital or digit run takes about 280 ms, 100k takes seconds. Fix before trusting the test. `mentions.ts` is linear.
13. **Private fixtures in a public repo.** Fixtures must be synthetic or scrubbed with a secret scan; existing `test/fixtures` has byte-for-byte copies to audit.
14. **Silent skips.** Require zero skipped tests in the default run.
15. **Search and palette.** Second Cmd-K listener; "No results" during the index swap on refresh; facet counts after filtering. Serve the old index until the new one is ready; distinguish "indexing" from "empty".
16. **Singleton server state.** One `createApp` per project multiplies listeners; one shared app risks cross-project bundles. One signal set for the registry; each request captures its context first.
17. **Memory.** Eager loading of every scanned project costs startup and memory.
18. **Cache.** Keys without slug show the previous project after a switch and accept in-flight responses from another project.
19. **Slug identity.** Dedupe by realpath or normalised ssh target; persist the assignment.
20. **First write path.** Atomic writes, schema version, `.bak` on parse failure, re-read before write, `LABELORE_CONFIG_DIR` in tests, containment test, gate test lists exactly two importers.
21. **Runtime paths and ssh targets.** Host allowlist, same-origin and JSON checks on mutations, restricted scan roots, reuse `parseRemoteTarget`, keep sandbox CSP on project-HTML routes.
22. **Scan false positives.** Nested projects, reference copies, Labelore's own fixtures, `.claude/worktrees/`, codebase-only projects. Prune fixture-named and worktree dirs; cap depth; show "stopped early".
23. **innerHTML guard scope.** Scan all of `src/web/**` for `dangerouslySetInnerHTML`, `innerHTML`, `insertAdjacentHTML`, `srcdoc` and similar; strip comments; one-site allowlist; positive control.

## Implications for Roadmap

**Reconciling researcher disagreements.** The files agree on test health first and palette last. Where they differ, the sequence below resolves it as stated.

- **Test health first (all agree):** fixtures and scrub, growth-ratio timing, `linkify.ts` fix, innerHTML guard, zero-skip, `config.json` redaction. Redaction moves into phase 1 because FEATURES and PITFALLS both require it before fixture copying.
- **URL scheme and project identity before pages and search (ARCHITECTURE, PITFALLS agree):** grammar, slug rules and reserved words precede registry and pages. Slug persistence lands with the registry.
- **Config redaction before the settings view:** redaction in phase 1, settings view later.
- **File-kind policy in the foundation:** FEATURES wants it first; PITFALLS placed it later. Resolved into the kinds foundation, before any pages.
- **Pages before the registry lands:** ARCHITECTURE says after; PITFALLS allows parallel. Pages are project-relative, so build them after the grammar, in parallel with the registry.

### Suggested phase order

1. **Test health and security baseline.** Fixtures with provenance and secret scan; growth-ratio ReDoS tests and the `linkify.ts` fix; innerHTML guard with positive control; outline cap (cap listed, not anchors); zero-skip check; `config.json` masking in `JsonConfigHandler.parse` with regression test. Avoids 11, 12, 13, 14, 22, 33. No research flag.
2. **Kinds, folders and project shape.** `folders.ts` with Labelore-side exact-name map (`HANDOFF.json`, `.continue-here.md`, `COVERAGE.md`, `deferred-items.md`, `SKELETON.md`); position-first `deriveKind`; Internal classification and search exclusion; file-kind policy (text, image, binary, size caps); `classifyProjectShape`; marker widening in `resolveTargetPath`; `compose` refactor of `ViewManifest` with `VIEW_KINDS`, manifests and CSS prefixes generated from one declaration. Additive. Avoids 7, 8, 10, 26. No research flag.
3. **Project identity and URL grammar.** One reserved-word constant (union of `api`, `sketches`, `assets`, `fonts`, `favicon.svg`, `src`, `node_modules`, `@*`, `settings`, `projects`); slug rules (kebab basename, collision suffix, never empty, NFC); `Route`, `buildUrl`, `parseRoutePath`, `addressOfPath`, `lookupRoute`; opaque keys kept for API and cache; `file/` fallback; legacy redirector; single splat route; `nav.tsx` plus lint rule; `workstreams/<name>/` reserved in grammar only; round-trip and injectivity tests; hard-reload tests in both modes. Avoids 1, 2, 3, 4, 5, 24, 25. Flags: confirm plan-pair `/plan-03/summary` against `plan-pair-page.tsx` and `matchUrls`; verify react-router 8 `%2F` and `%25` handling with `createMemoryRouter`.
4. **Multi-project runtime and switcher.** Within phase: Host allowlist and same-origin/JSON guards first (before any write endpoint); `ProjectRuntime` extracted, `createApp(source)` kept as one-project wrapper so existing tests pass; `/api/p/:slug/*` (spike Hono path-parameter form; rewritten-request dispatcher as fallback); `settings-store.ts` with atomic writes, `LABELORE_CONFIG_DIR`, containment test, gate changed to exactly two named importers; persisted slug with canonical-path dedupe; CLI multi-path and `--scan`; lazy load with bounded LRU; per-project refresh; query-key factory with lint or source scan banning raw `queryKey: [`; `/:project` layout with unknown-project screen; switcher; landing page; `/sketches/*` moved under `/api/p/:slug/sketch-files/*` with sandbox CSP kept. Avoids 16–22. Flags: Hono spike; folder-scan timing on real `~/Work` with and without pruning; ssh mirror cleanup across crashes.
5. **Settings view and codebase overview (parallel).** `/<slug>/settings` reading existing `presentation.config`, grouped as in `/gsd-settings`, unknown keys under "Other", "not set" for absent, toggle-to-artifact map, copyable `/gsd-config` commands. Codebase overview ("mapped, not started"): seven documents as entry grid, stack and concerns lifted, freshness stamp as text, Roadmap and Traceability hidden. Avoids 9, 10. Overview composers shared with batch 2.
6. **Page batches (parallel once phase 3 lands).** Batches 1–9 as listed under Expected Features. Each batch: one sketch round, one build, one screenshot against sketch, only the touched page's Playwright spec. Avoids 6, 26, 27, 28, 30. Flags: batches 3, 7, 8 need synthetic fixtures first (LOW confidence); batches 1, 2, 4, 5, 6, 9 have real files.
7. **Source mode.** Bounded raw payload under file-kind policy; line numbers, soft wrap, folded frontmatter, `#L12-L20` deep links without colliding with heading anchors; copy path and raw; keep place when switching view to source. Avoids 31. Flag: line-anchor spike against heading anchors.
8. **Search grouping, facets and palette.** Index metadata (milestone, phase, area, requirement ids) in the `documents` map; one unfiltered pass for counts, then post-filter; grouping milestone, phase, type; filters in URL, validated with visible note on drop; `SearchDialog` refactored into a Base UI `Autocomplete` palette with one keydown listener, recents, cached navigation targets, "Switch project", jump-by-id; "indexing" distinct from "empty"; stale index served during refresh. Avoids 15, 28. Flags: IME, focus return, and document-level key handlers ignoring dialog-portal events.
9. **UI-review polish.** Three v1.1 items, each re-checked against v2.0 components first. Avoids 32.

**Deferred to v2.1.x or later:** workstream scope model and index page (reserve grammar now); intel and graph summaries; STATE-ARCHIVE and INGEST-CONFLICTS layouts; landing cards; cross-project search.

### Conflicts Between Research Files (and Resolutions)

| Topic | Disagreement | Resolution |
|-------|--------------|------------|
| Slug persistence | STACK: derive at load. ARCHITECTURE and PITFALLS: persist | **Persist**; adding a project must not change a bookmark |
| Slug identity | STACK: stored target string. PITFALLS: realpath or normalised ssh | **Canonical identity** for dedupe; keep raw target for display |
| API prefix | ARCHITECTURE `/api/projects/:slug`. STACK and PITFALLS `/api/p/:slug` | **`/api/p/:slug`** |
| Facet counts | STACK: MiniSearch `filter` with separate unfiltered run. FEATURES and ARCHITECTURE: post-filter one unfiltered pass | **Post-filter** from one pass |
| Palette data | STACK: client jump list plus server text search. ARCHITECTURE: `mode=jump` endpoint | **Two tiers**, client list plus server text search; no `mode=jump` |
| Loaded runtimes | ARCHITECTURE: keep all, LRU past about ten. PITFALLS: LRU of two or three | **Lazy plus bounded LRU, start at five**; heap test decides |
| Scan depth | STACK: depth 3, stop at first hit. ARCHITECTURE: depth 2. PITFALLS: do not stop at hit (nested projects exist) | **Depth 3, keep descending below a hit**, skip fixture, worktree and build dirs |
| Reserved slugs | STACK and ARCHITECTURE differ | **One union constant**, tested per word |
| Sketch files | ARCHITECTURE moves route. PITFALLS keeps CSP | **Both** |
| v2.1 scope | PROJECT lists everything; FEATURES and STACK defer several | **Flag as scope decision**; recommend deferring workstreams, intel, graphs, and reports/forensics beyond synthetic fixtures |
| Dotted deep links | STACK verified by probe. PITFALLS rated MEDIUM | **Both**: probe shows current behaviour; regression test still required |

### Research Flags

Needs research during planning:

- **Phase 2:** workstream layout (inferred from gsd-core source); build fixture from `workstream` output or defer.
- **Phase 3:** plan-pair summary URL; react-router 8 `%2F` and `%25` decoding.
- **Phase 4:** Hono sub-app path-parameter spike; folder-scan timing; ssh mirror cleanup.
- **Phase 6 batches 3, 7, 8:** SPEC, AI-SPEC, USER-SETUP, reports, forensics, onboarding, REVIEWS, EVAL-REVIEW, DOM-VERIFY. Synthetic fixtures first.
- **Phase 7:** line-anchor scheme.
- **Phase 8:** IME, focus return, existing document-level key handlers.

Standard patterns: phase 1; phase 5; phase 6 batches 1, 2, 4, 5, 6, 9; phase 9.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Installed packages, `matchRoutes` probes, live server probes, installed Base UI docs. XDG location from convention, not re-fetched. |
| Features | HIGH catalogue; MEDIUM search/source conventions; LOW switchers | Catalogue from running discovery across 14 trees. Switchers have no standard. |
| Architecture | HIGH for existing points; MEDIUM for workstreams and Hono dispatch | Workstream layout from gsd-core source comments only. |
| Pitfalls | HIGH for repo-grounded and measured; MEDIUM for framework behaviour | Dotted-URL and react-router decoding still need tests. |

**Overall:** MEDIUM-HIGH. Confidence falls for never-seen page designs and for scope.

### Gaps to Address

- **About 14 never-seen types:** synthetic fixtures from GSD writers or templates in phase 6, labelled, LOW confidence per page.
- **GSD version drift:** repo built against 1.11.0; 1.18.0 installed; config keys differ. Record gsd-core version in fixture provenance; generic fallback for every page.
- **Workstream layout:** inferred. Gate on a real fixture.
- **Scope:** get an explicit decision before the roadmap.
- **Public repo and existing fixtures:** audit and scrub `test/fixtures` in phase 1.
- **Folder scan on real tree:** re-measure in phase 4.
- **Palette accessibility and IME:** verify in phase 8 against the installed component's DOM.
- **Hono path-parameter dispatch:** spike in phase 4; rewritten-request fallback.
- **Decisions for the roadmapper:** (1) persist slugs and dedupe by canonical path (recommended); (2) LRU bound, start at five; (3) descend below folder-scan hits with pruning (recommended); (4) v2.1 scope cut for workstreams, intel, graphs, reports and forensics.

## Sources

**Primary (HIGH):** Labelore `src/` integration points; `test/portability.test.ts`, `test/security-register.test.ts`, `test/section-projection.test.ts`, `test/server/deep-links.test.ts`, `test/web/class-vocabulary.test.ts`, `fixtures/README.md`; installed `@base-ui/react` 1.7.0 autocomplete docs; react-router 8.3.0 `matchRoutes` and live Vite/Hono probes; measured regex timings and `~/Work` scan; `~/.claude/gsd-core/` 1.18.0 templates, references, workflows and `bin/lib`; real files under `Ibis/`, `Cinedise/`, `Personal/duet/`, `Sideby/`.

**Secondary (MEDIUM):** npm registry version checks (2026-10-25); XDG convention (not re-fetched); Hono 4 sub-app path parameters (to be spiked); workstream layout from `workstream.cjs` comments.

**Tertiary (LOW):** switcher conventions (MCPJam PR 3643, Nintex thread, TYPO3 11117, Drupal MR 6605); docs-site search grouping; frontmatter folding in source viewers.

---
*Research completed: 2026-10-25*
*Ready for roadmap: yes, once the four scope and policy decisions in Gaps to Address are recorded*

# Phase 7: Recognised Files and Readable URLs - Research

**Researched:** 2026-10-26
**Domain:** Read-only local dashboard. File recognition (discovery and kinds), file-class policy (text, image, binary, internal), project-relative URL grammar with a per-bundle route table, SPA routing and deep-link delivery (Vite middleware in dev, Hono static in production), legacy-link redirects.
**Confidence:** HIGH on everything that was read or probed in this session (code, react-router 8.3.0, Vite dev server, Hono production server, GSD 1.18.0 source). MEDIUM on the design choices marked `[ASSUMED]`, which the planner should confirm before locking.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Milestone and phase URLs**
- **D-01:** Phase URLs **always carry the milestone segment**, live or archived: `/labelore/v2.1/phase-7`. A URL never changes when a milestone closes and its phases move under `milestones/`, because the version stays the same. There is no short `/labelore/phase-7` form or alias. — **Reversibility:** costly — every builder, golden and Playwright URL is stamped with the milestone segment.
- **D-02:** The bare milestone URL **redirects to that milestone's roadmap**. For an archived milestone `/labelore/v1.1` goes to `/labelore/v1.1/roadmap` (the archived ROADMAP copy). For the live milestone `/labelore/v2.1` goes to `/labelore/roadmap` (the root `ROADMAP.md`).
- **D-03:** The live roadmap has **one address**, `/labelore/roadmap`. `/labelore/v2.1/roadmap` for the live milestone redirects there rather than being a second URL for the same file. The same applies to the other live root documents that have archived copies (requirements and the like).
- **D-04:** Today's milestone page (its phase list and progress) is **kept** and moves to `/labelore/<version>/overview`. `overview` therefore joins `roadmap`, `requirements` and `audit` as a reserved segment inside a milestone.

**Plan, summary and phase-file URLs**
- **D-05:** `/…/phase-6/plan-03` is the **PLAN file's one URL** and opens the Plan tab of the pair page. `/…/phase-6/plan-03/summary` is the **SUMMARY file's one URL** and opens the Summary tab. Today's `?doc=summary` query redirects to the `/summary` path. There is **no** `/plan-03/plan` alias.
- **D-06:** Other phase-level files use the **lowercased filename token** as the last segment: `07-CONTEXT.md` → `/phase-7/context`, `07-VERIFICATION.md` → `/phase-7/verification`, `07-UI-SPEC.md` → `/phase-7/ui-spec`. A file whose numeric prefix does not match its phase directory's number takes the `file/` fallback (research rule).
- **D-07:** Quick tasks follow the plan shape: `/labelore/quick/261024-qhq` is the task's PLAN, `/labelore/quick/261024-qhq/summary` its SUMMARY, and other files in the task folder use their lowercased token. The URL uses the task ID, not the descriptive folder slug.

**Images and binary files**
- **D-08:** Opening an **image** (png, jpg, gif, webp, svg, …) shows a plain page with the image itself, its name, size and pixel dimensions. **SVG is served as an image (`<img>`), never inlined into the DOM**, so scripts inside it cannot run. The image bytes are served from an artifact-index lookup, never from a path in the request.
- **D-09:** Opening **any other binary** (pdf, zip, fonts, unknown bytes) shows an **info card**: name, type, size and folder, plus a line saying Labelore does not show this file's contents. There is **no** raw-serve or download endpoint for non-image binaries, and their bytes are never read beyond what is needed to classify them.
- **D-10:** Binaries are never read as text, parsed or added to the search index (DATA-08).

**Internal files**
- **D-11:** GSD's internal files (`state.json`, locks, `tmp/`, `async-jobs/` and similar) are **unreachable**. They are not in the artifact index, so they are absent from the drawer and search, and any URL for them (including a `file/` URL) returns the normal not-found page. Nothing serves their contents. `config.json` is **not** internal: it stays reachable, with secrets masked (Phase 6), and becomes the settings page in Phase 12. — **Reversibility:** reversible — adding internal files back to the index later is additive.

**Old links**
- **D-12:** Old encoded URLs (`/milestones/m~…/phases/p~…`, `/artifacts/a~…`, `?doc=summary`) **redirect silently** to the new readable URL, replacing the history entry so the back button skips the old one. There is no "link has moved" notice.
- **D-13:** An old link that no longer resolves to any file gets the **normal not-found page**, naming the path it looked for. It does not fall back to the nearest parent page.
- **D-14:** The legacy redirector is **temporary**. It lives in one isolated module so it can be deleted cleanly, and it is **removed when milestone v2.1 closes** (see Deferred Ideas).

### Claude's Discretion

- **Unversioned projects (no milestone version yet):** the planner picks the form. Recommendation: drop the milestone segment (`/labelore/phase-2`), because there is no milestone for it to clash with, rather than the fake `current` segment used today. Whatever is chosen must keep D-01's "one URL per file" property and be covered by the round-trip test.
- **How binaries appear in the drawer:** inline in their folder or grouped, with a type mark and size or not, following `docs/design-language.md` and enforced by the class-vocabulary test. Keep it quiet.
- **Size limits for huge text files** and the exact binary-detection rule (extension, magic bytes or both).
- **The project slug before Phase 8:** derive it from the target folder's basename (kebab-cased, never empty) and share one reserved-word constant with the server routing, as the research recommends. Persisting slugs belongs to Phase 8.

### Deferred Ideas (OUT OF SCOPE)

- **Remove the legacy URL redirector at v2.1 milestone close** (D-14). This is a task for `/gsd-complete-milestone`: delete the legacy parser module and its tests once v2.1 ships.
- A raw-serve or "open in browser" link for PDFs and other non-image binaries was considered and declined for now (D-09). Revisit only if it is actually missed.
- A "show internal files" drawer toggle was considered and declined (D-11).

Not in this phase (CONTEXT domain boundary): the multi-project registry, persisted slugs, the switcher and SEC-05 (Phase 8); designed pages for the newly recognised types (Phases 9-11); the settings page and Source mode redesign (Phase 12); search facets and the palette (Phase 13).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-07 | Every file type GSD writes is recognised by where it lives as well as by its name (`COVERAGE.md`, `HANDOFF.json`, `.continue-here.md`), and GSD's internal files are kept out of the drawer and search | "Folder table", "Internal-file rules" and "Position-first kind derivation" below. Probe results show 8 files in this repo's own `.planning/` today carry a root-document or plan kind by basename alone (`other\|roadmap`, `other\|state`, 6 `other\|plan`, 2 `other\|summary`), and `state.json` is indexed as `root\|unknown`. |
| DATA-08 | Images and other binary files are recognised and never read or indexed as text | "File-class policy": class decided from extension plus a bounded NUL sniff, `parseWithRegistry` skips the read, search index skips non-text, bytes served only through an index lookup via the existing `readBytesWithin` seam. |
| NAV-09 | Every page has a readable URL starting with the project's name | "URL grammar" table (every example in CONTEXT is reproduced), slug derivation, `/:project/*` splat route, `web/nav.tsx` as the single slug-prefixing point. |
| NAV-10 | Every file has exactly one URL, no two share one, direct open or reload lands on the right page | "Route table" (built once per derived bundle, duplicate audit, `file/` total fallback), react-router splat decoding trap, dev and production deep-link probes. |
| NAV-11 | Old-style encoded links redirect to the new readable URL | "Legacy redirector" (isolated decoder-only module, `Navigate replace`, not-found naming the old path). |
</phase_requirements>

## Project Constraints (from ./.claude/CLAUDE.md)

- **Read-only** filesystem access to the target `.planning/`; the tool must be incapable of damaging planning state. No new write path in this phase.
- **Compatibility:** must read `.planning/` as produced by `@opengsd/gsd-core` (1.11.0 at time of writing; 1.18.0 is installed here). Unknown files must degrade rather than break, so every new rule needs a total fallback (`file/` for URLs, `unknown` kind for recognition).
- **Design:** visual language and class vocabulary live in `docs/design-language.md` and are enforced by `test/web/class-vocabulary.test.ts`. Any new drawer mark or page chrome must use the allowed vocabulary or add rows to the doc table in the same change.
- **Forward compatibility:** the reader sits behind a boundary that admits multi-project targeting, a watcher and write-back. Keep the `PlanningFilesystem` port the only read seam; do not add `node:fs` imports outside `src/planning-fs/local-fs.ts`.
- **Stack:** Vite 8 + React 19 + Hono + react-router 8.3.0 (library mode) + TanStack Query; no new runtime dependencies were identified as necessary.
- **GSD workflow:** edits start from a GSD command (this research feeds `/gsd-plan-phase 7`). `nyquist_validation` is `false` in `.planning/config.json`, so the formal Validation Architecture section is omitted; practical test seams are in "Test Seams and Fixtures".
- Project skills: none found (`.claude/skills/` etc. absent).

## Summary

Phase 7 changes two foundations that nearly everything else reads. First, **what a file is**: today `deriveKind()` in `src/planning-repo/discovery.ts` matches filename grammars at any depth and the walk reads every file as UTF-8 text, indexes it, and lets a few directory-position predicates (`isTodoPath`, `isNotePath`, `isDebugSessionPath`) override. That is why a sketch's synthetic `ROADMAP.md` gets kind `roadmap`, `state.json` is searchable, and files directly under `phases/` are silently dropped from the model (probe below). Second, **where a file lives in the address bar**: `src/presentation/routes.ts` encodes identity into opaque `m~`/`p~`/`a~` tokens, and the same token strings are used as React keys, drawer keys, cache keys and API payload URLs across 23 files in `src/` and 13 test files that import `routes.ts`.

The recommended shape is the one the milestone research already drew (ARCHITECTURE.md "Feature 4"), tightened by what this session verified: (1) a pure **folder table** (`src/planning-repo/folders.ts`) that drives kind, location hint, URL segment and name rule, and a **file-class policy** that decides text, image, binary, oversized or internal *before* any read; (2) a rewritten `routes.ts` with one `Route` union, `buildUrl`, `parseRoutePath`, `addressOfPath`; (3) a **route table** (`path -> url`, `url -> path`, duplicates audited) built once per derived bundle and shared by the DTO builder and the artifact index, so strict "exactly one URL" holds even for collision accidents and path-only call sites; (4) one `/:project/*` splat route, with the parser fed from the raw `location.pathname` because react-router 8.3.0 **double-decodes** splat params (probe below); (5) an isolated, decoder-only legacy module; (6) `web/nav.tsx` as the single place that prepends the slug, backed by a lint rule.

Dev and production deep links already work for dotted and extension-like segments (probed in both servers), so NAV-10's reload requirement is a regression-test task, not a server fix. The single biggest hazard is blast radius: DTO `key` fields double as URLs, 26 web files import react-router link primitives, 24 test files hold old URL strings, 68 Playwright `goto` calls consume DTO URLs, and the web has no slug today. Plan the work as vertical slices that keep the suite green at each step (see "Suggested slicing").

**Primary recommendation:** Build recognition first (folder table, file classes, internal exclusion, new fixture project), then the URL grammar and route table behind unchanged `routes.ts` export names, then migrate consumers in one mechanical sweep with `web/nav.tsx` and the lint rule, then delete nothing until the legacy redirector and the hard-reload tests are green in both modes.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| File recognition (kind, class, internal) | Read layer (`src/planning-repo`) | — | Position and name only, never content (DATA-02). Must happen before any read so binaries and internal files are never opened. |
| Byte-level facts (size, head sniff) | Filesystem port (`src/planning-fs`) | — | The only `node:fs` importer is `local-fs.ts`; new reads must go through `PlanningFilesystem`. |
| URL grammar (build and parse) | Pure presentation module (`src/presentation/routes.ts`) | Web router | Zero I/O, importable by server, web and tests. Project-relative; no slug. |
| Route table (path <-> URL, duplicate audit) | Server, per derived bundle | — | Must swap atomically with the bundle on refresh (D-05, Pitfall 25). |
| Resolving a URL to a file | Server (`artifact-index.ts`, `/api/documents`) | — | The server never opens a path taken from request text; it looks up the index. |
| Serving image bytes | Server (new route using `readBytesWithin`) | — | Lookup by route, content type from an allowlist, hardened headers. |
| Slug prefixing, link building | Browser (`web/nav.tsx`) | — | Single prefixing point so DTO URLs stay project-relative (Phase 8 changes the slug source, not the DTOs). |
| Page dispatch from a URL | Browser (`/:project/*` splat) | — | One parser, no parallel route table. |
| Legacy redirect | Browser (component using presentation data) | — | Needs only `presentation.artifacts` and phases already cached; `Navigate replace`. |
| Deep-link delivery (reload) | Dev: Vite middleware; prod: Hono `serveStatic` fallback | — | Both already return the shell for every non-asset path (probed). |
| Drawer rows and image/binary pages | Browser | Presentation builder (`drawer.ts`) | New marks must stay inside the class vocabulary. |

## Standard Stack

### Core

No new packages. The phase composes what is installed.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-router | 8.3.0 | `createBrowserRouter`, one `/:project/*` route, `Navigate replace`, `matchRoutes` in tests | Already the router; `[VERIFIED: node_modules/react-router/package.json "version": "8.3.0"]` |
| hono + @hono/node-server | 4.13.4 / 2.1.1 | `/api/documents`, new image-bytes route, `serveStatic` SPA fallback | Already the server `[VERIFIED: package.json]` |
| vite | (via package.json, dev middleware mode) | Dev server `appType: 'spa'` | Already used by `startServer` `[VERIFIED: src/server/index.ts:478-482]` |
| @tanstack/react-query | 5.102.3 | Client cache; keys that contain `location.pathname` must use the slug-stripped path | Already used `[VERIFIED: package.json]` |
| vitest | 4.1.11 | Unit, route-table and server tests | Baseline run in this session: 187 files, 3596 tests, all pass, 76 s |
| @playwright/test | 1.63.0 | Hard-reload specs | Installed as a package, but no browser is present on this machine (see Environment Availability) |

### Supporting

None. Image dimensions come from the browser (`HTMLImageElement.naturalWidth/naturalHeight`), so no image-size parser is needed. Binary sniffing is a 15-line NUL check (git's rule, already used by `test/fixture-leak.test.ts`: "files whose first 8,000 bytes hold a NUL byte are binary").

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Browser-reported image size | `image-size` or hand-written header parsers | New dependency or ~100 lines per format for a cosmetic field; the browser already decodes the image. Show "size unknown" when `naturalWidth` is 0 (some SVGs). |
| Extension plus NUL sniff | `file-type` / magic-byte libraries | New dependency; the decision only needs "text or not" plus a known-image allowlist. |
| Stateless builders only | Route table | See "Route table": stateless is simpler but cannot give a colliding file its own URL, and two call sites pass only a path. |

**Installation:** none.

**Version verification:** no package is added or bumped, so no registry check was needed.

## Package Legitimacy Audit

Not applicable. This phase installs no external packages.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
 CLI path ──► resolveTargetPath ──► LocalFs / Remote mirror ──► PlanningFilesystem (port)
                                                                   │  list() + size, readHead()   [new, bounded]
                                                                   ▼
            ┌─────────────────────── discovery.ts (walk) ───────────────────────┐
            │  folders.ts table ──► classifyPath(rel) = { location, kind,        │
            │                         fileClass: text|image|binary|large|internal}│
            │  internal ──► exclusions[] (one entry per internal root), no ref   │
            └──────────────┬─────────────────────────────────────────────────────┘
                           ▼
        registry.ts parseWithRegistry: fileClass != text ──► NO READ, empty body, title=filename
                           ▼
        assemble.ts ──► Project (phases, quickTasks, loose artifacts; phase-dir null identity → 'other')
                           ▼
   buildDerivedViews(snapshot)  (one bundle, atomic swap on refresh, D-05)
      ├─ routeTable = buildRouteTable(project)      path→url, url→path, conflicts[]
      ├─ presentation = toProjectPresentation(...)  DTO .key / .url from routeTable (project-relative)
      ├─ artifactIndex = buildArtifactIndex(...)    lookupRoute(url) via routeTable
      └─ searchIndexState: skips fileClass != text
                           ▼
   Hono: /api/presentation  /api/documents?route=/v1.1/phase-5/plan-03   /api/files?route=…  (image bytes)
                           ▼
 Browser: /:project/*  ──► parseRoutePath(location.pathname minus slug)
      ├─ page routes (dashboard, roadmap, overview, phase, plan pair)
      ├─ document route ──► ArtifactPage / ImagePage / BinaryCard (fileClass from the DTO)
      ├─ legacy routes (/milestones/*, /artifacts/*, /roadmap …) ──► LegacyRedirect ──► Navigate replace
      └─ everything else ──► NotFound naming location.pathname
```

### Recommended Project Structure

```
src/
├── planning-fs/
│   ├── types.ts              # + DirEntry.size?, + readHead(rel, max) (bounded)         [edit]
│   ├── local-fs.ts           # implement both with the same containment guard            [edit]
│   └── in-memory-fs.ts       # contents may be string | Uint8Array so binaries are testable [edit]
├── planning-repo/
│   ├── folders.ts            # NEW pure table + classifyPath(); GSD source cited per row
│   ├── file-class.ts         # NEW extension sets, NUL sniff, size caps, internal rules (or inside folders.ts)
│   ├── discovery.ts          # delegates to classifyPath; keeps the walk, MAX depth, sorting
│   └── assemble.ts           # null-identity phase files stay in the model (location 'other')
├── presentation/
│   ├── reserved.ts           # NEW one reserved-word constant (server, router, slug generator)
│   ├── project-slug.ts       # NEW slugOf(rootPath) (kebab basename, NFC, never empty)
│   ├── routes.ts             # REWRITTEN in place; same export names
│   ├── route-table.ts        # NEW buildRouteTable(project) + audit
│   └── legacy-routes.ts      # NEW isolated decoder for m~/p~/a~ (deleted at v2.1 close)
├── server/
│   ├── artifact-index.ts     # lookupRoute via routeTable; rejects internal by absence
│   ├── file-bytes.ts         # NEW image route handler (headers, allowlist, size cap)
│   └── index.ts              # /api/documents?route= ; remove /api/artifacts/* ; routesToApp from reserved.ts
└── web/
    ├── nav.tsx               # NEW ProjectLink, ProjectNavLink, useProjectNavigate, useProjectPathname, useProjectHref
    ├── app-router.tsx        # one /:project/* route + legacy routes + NotFound
    └── pages/                # image-page.tsx, binary-card.tsx (or one file-page.tsx), plan-pair-page.tsx edits
```

### Verified values this design depends on (read this session)

| Item | Verbatim value | Source |
|------|----------------|--------|
| `ArtifactLocation` | `export type ArtifactLocation = 'root' \| 'phase' \| 'archived-phase' \| 'quick' \| 'milestone-root' \| 'research' \| 'other';` | `src/domain/model.ts:13` |
| `LOCATION_ORDER` keys | `root: 0, phase: 1, 'archived-phase': 2, quick: 3, 'milestone-root': 4, research: 5, other: 6` | `src/planning-repo/discovery.ts:35-43` |
| Server-owned prefixes | `return url !== undefined && (url.startsWith('/api/') \|\| url.startsWith('/sketches/'));` | `src/server/index.ts:60-62` |
| Phase artifact grammar | ``new RegExp(`^(${PHASE_NUMBER_TOKEN_SOURCE})-([A-Z][A-Z-]*)\\.md$`)`` with `PHASE_NUMBER_TOKEN_SOURCE = '\\d+[A-Z]?(?:\\.\\d+)*'` | `src/planning-repo/naming.ts:29,100` |
| Plan grammar | ``new RegExp(`^(${PHASE_NUMBER_TOKEN_SOURCE})-(\\d{2,})-(PLAN\|SUMMARY)\\.md$`)`` | `naming.ts:80` |
| Quick dir / artifact | `/^(\d{6})-([0-9a-z]{3})-(.+)$/` and `/^(\d{6}-[0-9a-z]{3})-([A-Z][A-Z-]*)\.md$/` | `naming.ts:124,144` |
| Milestone file / dirs | `/^(v\d+\.\d+(?:\.\d+)?)-(.+)\.md$/i`, `/^(v\d+\.\d+(?:\.\d+)?)-phases$/i`, `/^(v\d+\.\d+(?:\.\d+)?)-quick$/i` | `naming.ts:163,178,187` |
| Phase-number compare grammar | `raw.match(/^(\d+)([A-Z]?)((?:\.\d+)*)$/)`; non-matching input sorts as base 0 | `naming.ts:205-209` |
| Filesystem port | `list`, `read`, `exists`, optional `readBytesWithin?(baseRelDir, relPath)`, optional `watch?`/`write?` | `src/planning-fs/types.ts:42-60` |
| Registered view kinds | `'discussion-log','verification','plan','summary','review','milestone-audit','research','patterns','ui-spec','uat','validation','security','ui-review','coverage','learnings','context','review-fix','findings','todo','note','debug'` | `src/web/views/kinds.ts:15-35` |
| GSD canonical root names (1.18.0) | `PROJECT.md, ROADMAP.md, STATE.md, REQUIREMENTS.md, MILESTONES.md, BACKLOG.md, LEARNINGS.md, THREADS.md, config.json, CLAUDE.md, RETROSPECTIVE.md, WINDOWS.md, STATE-ARCHIVE.md, milestone.lock, state.json, skill-manifest.json, PATTERNS.md` | `~/.claude/gsd-core/bin/lib/artifacts.cjs` (`CANONICAL_EXACT`), VERSION file reads `1.18.0` |
| Playwright ports | 4199 repo, 4198 Lendshed; 4173/4174 belong to the user | `playwright.config.ts` header comment |

Labelore's own `naming.ts:242-257` lists the older 14-name set (no `state.json`, `skill-manifest.json`, `PATTERNS.md`).

### Pattern 1: Folder table drives kind, URL segment, name rule

**What:** one pure table, many readers (discovery, route builder, drawer labels, search facets later). Each row cites the GSD source that justifies it, like `naming.ts` does for regexes.
**When to use:** every classification and URL decision; never add another bespoke predicate beside `isNotePath`.

Recommended rows (all `location: 'other'` unless noted, because a new `ArtifactLocation` is silently dropped by `assemble.ts`; see Pitfall 1). GSD evidence is from `~/.claude/gsd-core` 1.18.0 workflow and reference text read this session.

| Top-level folder (under `.planning/`) | URL segment | Kind rule | Name rule | GSD evidence |
|---|---|---|---|---|
| `codebase/` | `codebase` | `codebase-<lowercased name>` for the seven documents (`STACK`, `ARCHITECTURE`, `STRUCTURE`, `CONVENTIONS`, `TESTING`, `INTEGRATIONS`, `CONCERNS`), else `unknown` | lowercase, strip `.md` | `workflows/map-codebase.md` writes UPPERCASE names; success criterion needs `/codebase/architecture` |
| `research/` | `research` | unchanged (`ProjectResearchHandler` matches by location and path) | lowercase, strip `.md` | existing |
| `notes/` | `notes` | `note` (existing `isNotePath`) | keep case, strip `.md` | existing |
| `todos/{pending,completed,done}/` | `todos` | `todo` (existing) | keep case, strip `.md`, nested dirs keep slashes | existing |
| `debug/`, `debug/resolved/` | `debug` | `debug` (existing; `knowledge-base.md` stays out) | keep case, strip `.md` | existing |
| `spikes/` | `spikes` | `spikes-manifest`, `spikes-conventions`, `spikes-wrap-up`, `spike` (`NNN-name/README.md`), else `unknown` | lowercase GSD names, keep free-form | `references/artifact-types.md` |
| `sketches/` | `sketches` | `sketches-manifest`, `sketches-wrap-up`, `sketch` (`NNN-name/README.md`), else `unknown` | as spikes | same |
| `seeds/` | `seeds` | `seed` | keep case | `workflows` mention `.planning/seeds/SEED-*.md` |
| `threads/` | `threads` | `thread` | keep case | `.planning/threads/{SLUG}.md` |
| `reports/` | `reports` | `report` | keep case | `SESSION_REPORT.md`, `MILESTONE_SUMMARY-v{version}.md` |
| `forensics/` | `forensics` | `forensics` | keep case | `report-{timestamp}.md` |
| `onboarding/` | `onboarding` | `onboarding` | keep case | `.planning/onboarding/SUMMARY.md` |
| `intel/`, `graphs/` | `intel`, `graphs` | `intel`, `graph` (JSON capped, see policy) | keep case, keep extension | `intel/*.json`, `graphs/graph.json` |
| `ui-reviews/` | `ui-reviews` | `unknown` (text) / image / binary by class | keep case, keep extension | existing `.gitignore` excludes screenshots |
| `quick-batches/` | `quick-batches` | `unknown` (Future VIEW-F3) | keep case | existing folder in this repo |
| `quick/`, `milestones/`, `phases/` | see URL grammar | existing position rules | token rules | existing |
| `workstreams/<name>/…` | reserved scope prefix | reserve in grammar only (VIEW-20 is Phase 11) | — | `workflows/new-milestone.md` |
| `tmp/`, `async-jobs/`, `logs/`, `research/.cache/` | — | **internal** | — | see internal rules |
| any other top-level folder | none | `unknown` | `file/` URL | total fallback |

Root-level files: the 14 existing names stay; add Labelore-side `HANDOFF.json` (`handoff`), `.continue-here.md` (`continue-here`), root `PATTERNS.md` (kind **not** `patterns`; see Pitfall 5, suggest `graduated-patterns`), `METHODOLOGY.md`, `INGEST-CONFLICTS.md`, `INBOX-TRIAGE.md`, `DECISIONS-INDEX.md` (kept as `unknown` with a root URL token unless a designed page exists). Phase and quick folder unprefixed names (Labelore-side exact map): `COVERAGE.md` → `coverage`, `deferred-items.md` → `deferred-items`, `SKELETON.md` → `skeleton`, `.continue-here.md` → `continue-here`. `.continue-here.md` lives at `.planning/`, `.planning/phases/XX-name/`, `.planning/spikes/SPIKE-NNN/` and `.planning/deliberations/` (`references/artifact-types.md:57`, `workflows/resume-project.md:90`), so it is matched by exact basename at any depth because the dot-prefixed name cannot be mistaken for anything else.

### Pattern 2: Position-first kind derivation

**What:** `deriveKind()` today calls `isCanonicalRootFile`, `parseMilestoneFileName`, `parsePlanFileName`, `parsePhaseArtifactName` and `parseQuickArtifactName` on the basename at any depth `[VERIFIED: src/planning-repo/discovery.ts:60-79]`. Gate each grammar by location:

| Grammar | Applies only when |
|---|---|
| canonical root names | location `root` |
| `vX.Y-*.md` | location `root`, or `milestone-root` as a direct child of `milestones/` |
| plan / summary names | location `phase` or `archived-phase` (and quick-style names in `quick` / archived quick dirs) |
| `NN-TOKEN.md` | location `phase` or `archived-phase` |
| `{id}-TOKEN.md` | location `quick`, or inside `milestones/vX.Y-quick/` |
| everything else | folder table, else `unknown` |

Probe of this repo's `.planning/` (562 refs) confirms the defect: `other|roadmap` (1), `other|state` (1), `other|plan` (6), `other|summary` (2) come from `sketches/026-…/synthetic-planning/` `[VERIFIED: probe run this session]`; they should become `unknown` (or a sketch kind) after the change. Handlers are already location-guarded (`ref.location === 'root' && basename(...)`), so only `kind` leaks, and `kind` is what the web view registry and `search`/`dashboard-ledger` consumers key on (for example `Object.values(project.artifacts).find((artifact) => artifact.kind === 'state')` in `src/server/project-presentation.ts:267`).

**Not to break:** `milestone-root|plan` (58) and `milestone-root|summary` (58) in this repo are archived quick tasks (`milestones/vX.Y-quick/<id-slug>/<id>-PLAN.md`) and must keep kinds `plan`/`summary` (they match the quick grammar, `artifact-token.ts:31-33`).

### Pattern 3: File-class policy decided before any read

| Class | Detection | Read? | Indexed? | Page |
|---|---|---|---|---|
| `internal` | path rules below | no | no (absent from model, one `exclusions` entry per root) | none; not-found |
| `image` | extension allowlist: png, jpg, jpeg, gif, webp, avif, bmp, ico, svg | no | no | image page (D-08) |
| `binary` | known-binary extension set (pdf, zip, gz, tar, woff, woff2, ttf, otf, eot, mp3, mp4, mov, webm, wasm, sqlite, db, exe …) or, for unknown/no extension, NUL in the first 8000 bytes | head sniff only | no | info card (D-09) |
| `large` | text class but `size > MAX_TEXT_BYTES` (recommend 1 MiB) | no | no | info card with reason "larger than 1 MiB" |
| `text` | everything else | yes (existing path) | yes (existing) | existing `ArtifactPage` |

`[ASSUMED]` thresholds: `MAX_TEXT_BYTES = 1 MiB`, sniff window 8000 bytes (git's rule, matches `test/fixture-leak.test.ts`). Recommend a constant in one place plus a boundary test.

Port changes (the port is the only read seam): add `size` to `DirEntry` (LocalFs: `statSync` per file entry inside `list()`; in-memory: `Buffer.byteLength`) and an optional `readHead(relPath, maxBytes): Promise<Uint8Array>` that reuses `resolveContained`. `read()` keeps returning text and must not be called for non-text classes. `fromDirectory()` in `test/helpers/from-directory.ts` currently reads every file with `'utf8'`, which corrupts binary fixtures and breaks `size` parity in `test/fs-equivalence.test.ts`; allow `Uint8Array` contents in `InMemoryPlanningFilesystem` and have the helper read non-text extensions as bytes.

Model change: add to `Artifact` and `ParsedArtifact` (and `ArtifactDto`) a `fileClass` and `sizeBytes`; non-text artifacts carry `body: ''`, `bodyLength: 0`. They remain `Artifact`s so the route table, drawer and DTO list treat every file uniformly; the search index and mention scanner skip non-text. `registry.ts` `parseWithRegistry` must branch on `ref.fileClass` before `fs.read` (today it always reads, `registry.ts:19`).

### Pattern 4: Internal-file rules (position-scoped, not basename-anywhere)

`[CITED: ~/.claude/gsd-core workflows and bin/lib, read this session]` GSD writes these into `.planning/` for its own bookkeeping:

- Directories (whole subtree internal): `tmp/` (`agents/gsd-doc-verifier.md`: result JSON), `async-jobs/` (`workflows/resume-project.md:98`), `logs/` (`references/universal-anti-patterns.md:19`), `research/.cache/` (already in `SKIPPED_DIRS`, `discovery.ts:21`).
- Root-only files: `state.json`, `skill-manifest.json` (both in `CANONICAL_EXACT`, `artifacts.cjs`), `milestone.lock`, `STATE.md.lock`, `.WINDOWS.lock`, `WAITING.json`, `agent-history.json`, `current-agent-id.txt`, `active-workstream`, `.gsd-trace.jsonl`, `.mempalace-stage`, `.active-skill`, `STATE.md.bak`, and prefix `.gsd-` (`.gsd-ws-arg`, `.gsd-allow-shrink`, `.gsd-outgoing-milestone`).
- Pattern files anywhere: `*.lock`, `*.tmp` (for example `WINDOWS.md.<pid>.tmp`).

Position matters: `.planning/sketches/NNN/state.json` is user content and stays visible. `estimation-calibration.json` (executor token samples, `bin/lib/estimate-cli.cjs:81`) is not named in CONTEXT; recommend internal `[ASSUMED]`, confirm with the user. `HANDOFF.json` and `.continue-here.md` are explicitly **not** internal (VIEW-17). `config.json` is **not** internal (D-11).

Record each internal root as one `DiscoveryExclusion` (path and reason) so nothing is silently invisible, as the existing `research/.cache` rule does. Keep the exact reason string `Matches the research/.cache/ exclusion rule` unchanged to avoid dense-golden churn, or regenerate the golden deliberately and read the diff.

### Pattern 5: URL grammar (project-relative; the web layer prepends `/<slug>`)

Reserved first segments inside a project: `roadmap`, `requirements`, `state`, `project`, `milestones`, `retrospective`, `windows`, `settings`, `search`, `traceability`, `research`, `sketches`, `quick`, `file`, `overview`, plus every folder-table segment and `phase-*` prefix. Any other first segment is read as a milestone version and resolved against the model.

```
/<slug>                                dashboard
/<slug>/roadmap                        live ROADMAP.md (RoadmapPage); also /requirements, /state, /project, /milestones …  (root files: lowercased basename, ext stripped)
/<slug>/settings                       config.json (Phase 12 designs the page at this same URL) [ASSUMED]
/<slug>/search | traceability | research | sketches    existing pages
/<slug>/v1.1                           redirect → /<slug>/v1.1/roadmap (archived) or /<slug>/roadmap (live)           D-02
/<slug>/v1.1/overview                  milestone page (today's RoadmapPage milestone mode)                           D-04
/<slug>/v1.1/roadmap | requirements | audit    milestones/v1.1-ROADMAP.md | -REQUIREMENTS.md | -MILESTONE-AUDIT.md
/<slug>/v1.1/<token>                   other vX.Y-<token>.md (lowercased token)
/<slug>/v1.1/phase-5                   phase page
/<slug>/v1.1/phase-2.1                 decimal phase (dots are legal)
/<slug>/v1.1/phase-lore-5              project-code phase (code lowercased)
/<slug>/v1.1/phase-5/plan-03           PLAN file (pair page, Plan tab)                                               D-05
/<slug>/v1.1/phase-5/plan-03/summary   SUMMARY file (pair page, Summary tab)                                         D-05
/<slug>/v1.1/phase-5/context           NN-CONTEXT.md; ui-spec, verification, review-fix …                           D-06
/<slug>/v1.1/phase-5/coverage          COVERAGE.md; deferred-items, skeleton, continue-here (Labelore-side map)
/<slug>/quick/261024-qhq               task PLAN                                                                      D-07
/<slug>/quick/261024-qhq/summary       task SUMMARY; /context, /verification, /findings, /deferred-items …
/<slug>/codebase/architecture          folder rule
/<slug>/notes/per-kind-artifact-rendering
/<slug>/todos/pending/<name>   /<slug>/debug/resolved/<name>
/<slug>/ui-reviews/screenshots/x.png   non-md keeps its extension
/<slug>/file/<relative path under .planning>   lossless total fallback (each segment percent-encoded)
```

Rules (each needs a test):
- **Segment encoding:** `encodeURIComponent` per segment, decode **exactly once** per segment. A segment that equals `.` or `..` after name rules (a note named `..md`) keeps its `.md` so the browser cannot collapse it.
- **Phase number:** normalised via the same grammar `comparePhaseNumbers` uses: `05` → `5`, `02.1` → `2.1`, `12A` → `12a`. A number that does not match the grammar falls back to `phase-<lowercased raw>`.
- **Plan number:** `plan-<NN>` from the file's own plan number. Clean form only when the file's phase prefix equals its directory's number (`comparePhaseNumbers(...) === 0`); otherwise `file/`. Same rule for quick: file's `quickId` must equal the directory's `{date}-{timeToken}`.
- **Tokens:** `NN-TOKEN.md` → lowercase `TOKEN`; a token that equals a reserved phase-scope word (`plan-<digits>` pattern, or `summary` only when it would shadow `/plan-NN/summary`) goes to `file/`.
- **Free-form names:** notes, todos, debug, seeds, threads, reports keep case and strip only a trailing `.md`; `foo.json` keeps its extension so `foo.md` and `foo.json` cannot collide. GSD-named folders (codebase, spikes, sketches docs) lowercase.
- **Case-only or reserved collisions inside a folder:** `file/`.
- **Milestone segment:** the raw version, percent-encoded. A version equal to a reserved word (or a `milestone-`-prefixed reserved word) gets one `milestone-` prefix; the decoder strips one prefix only when what remains is reserved. Versions that are not `^v\d+\.\d+(\.\d+)?$` are legal but unusual.
- **Unversioned live milestone** (`milestoneVersion === null`): recommend **no milestone segment**: `/<slug>/phase-2`, `/<slug>/overview`. A first segment starting `phase-` is read as a phase; a milestone version that starts with `phase-` takes the escape prefix.
- **Archived quick tasks** (`milestones/vX.Y-quick/<id-slug>/…`): recommend the same `/quick/<id>` space as live tasks, so a task's URL does not change when its milestone closes (the same argument as D-01) `[ASSUMED: CONTEXT does not say]`.
- **Other archived folders** (`milestones/vX.Y-research/…`): `/<version>/<name>/<rest>` unless `<name>` is reserved in milestone scope, else `file/`.
- **Live aliases (D-03):** for the live version, `/<v>/roadmap` and `/<v>/requirements` redirect to `/roadmap` and `/requirements`. If a stray `milestones/<live-version>-ROADMAP.md` exists, the alias wins and that file takes `file/` (the audit reports it).
- **Heading fragments** keep `withHeading` and `parseHeading` unchanged.
- **Bare folder URLs** (`/quick`, `/notes`, `/codebase`) have no page in this phase; they render the normal not-found page `[ASSUMED]`.

### Pattern 6: Route table (strict uniqueness, built once per bundle)

**What:** `buildRouteTable(project)` computes, for every artifact, `addressOfPath(owner identity, path)` (the stateless grammar), groups by URL, lets the first path in sorted order keep the clean URL, gives every other member its `file/` URL, and records `conflicts: { url, paths }[]`. It returns `urlByPath` and `pathByUrl`.

**Why not purely stateless builders (the ARCHITECTURE.md default):** it explicitly defers a table and relies on a warning. Two facts from this session argue for the table now: (a) strict NAV-10 ("no two files share one") cannot be met for accident trees by a stateless function, and (b) two builders only have a path: `buildArtifactUrl(null, path)` at `src/presentation/dashboard.ts:53` and `src/web/views/summary-run.ts:1212`; for a live phase file, `null` identity cannot know the live milestone version (STATE.md owns it), so it would emit a different URL from the owner-aware call. Resolve every path-only caller through `presentation.artifacts` (`key` by `path`) instead.

**Wiring:** `buildDerivedViews()` (`src/server/index.ts:96-106`) already builds presentation, artifact index and search state from one snapshot; build the table first and pass it to `toProjectPresentation` (`artifactDtos` currently stamps `key: buildArtifactUrl(owner?.identity ?? null, artifact.path)`, `project-presentation.ts:550`) and `buildArtifactIndex`. The table lives inside the bundle, so refresh swaps it atomically (Pitfall 25). Expose `presentation.urlConflicts` for tests; the property test asserts it is empty on every committed fixture.

**Keep opaque identity keys:** `phaseKeyOf` and `milestoneKeyOf` are used as join keys (`artifact.phaseKey`, `phase.key`, `references.ts` scoped keys, `search.ts:128`), not as navigation. Keep their `p~`-style output untouched so those joins and the dense golden do not churn, and move the encoders to `presentation/identity-keys.ts` re-exported from `routes.ts`. The legacy module then holds only the **decoders**, so deleting it at v2.1 close removes no live code. Navigation URLs (`DTO .key` of artifacts, `plan.key`, `phase url`) become the new readable paths.

### Pattern 7: One splat route, parser fed from the raw pathname

Replace the eleven `presentationRoutePatterns` entries with `{ path: '/:project/*' }` plus explicit legacy routes. **Never read the `*` param.** Probe, react-router 8.3.0:

```
/lendshed/file/a%2Fb.md      => {"project":"lendshed","*":"file/a/b.md"}     // %2F became /
/lendshed/file/100%25.md     => {"project":"lendshed","*":"file/100%.md"}
/lendshed/a%252Fb            => {"project":"lendshed","*":"a/b"}             // decoded twice
createMemoryRouter(...).state.location.pathname === "/lendshed/file/a%2Fb.md"   // raw pathname is intact
```

`[VERIFIED: probe run this session with node, react-router 8.3.0, matchRoutes/createMemoryRouter]`. So `parseRoutePath` receives `location.pathname` minus the slug prefix, splits on `/`, and decodes each segment once. This closes the PITFALLS 24 / SUMMARY research flag ("react-router 8 `%2F` and `%25` decoding").

### Pattern 8: `web/nav.tsx` as the single slug-prefixing point

`ProjectLink`, `ProjectNavLink`, `useProjectNavigate`, `useProjectHref`, `useProjectPathname` (returns the slug-stripped pathname so `drawer-route.ts` `row.url === pathname` comparisons keep working). Add `no-restricted-imports` for `Link`, `NavLink`, `useNavigate`, `useLocation` from `react-router` outside `nav.tsx` (and the router file for what it legitimately needs). Verified syntax with ESLint 10 flat config: `importNames` flags `Link` and leaves `Outlet` alone `[VERIFIED: eslint --stdin probe this session]`. Mechanical sweep: 26 files under `src/web` import react-router today (`grep -rln "from 'react-router'" src/web`); slice 3 below names the pages.

Slug source before Phase 8: server adds `projectSlug` to `ProjectPresentation`; the client reads the first path segment, and `ProjectGate` compares it with `presentation.projectSlug`: mismatch renders the not-found page that names the path and links to the right slug; `/` redirects to `/<slug>` with `Navigate replace` once presentation loads. Phase 8 swaps the slug source for the registry without touching DTOs.

### Pattern 9: Legacy redirector (isolated, temporary)

`legacy-routes.ts` contains only decoders (the old `parsePresentationUrl` body) and returns structured identity. A `LegacyRedirect` component maps it to a new URL using data the shell already caches (`presentation.artifacts` by path, `presentation.milestones[*].phases` by identity, plan keys), then `<Navigate replace to=…>` (replaces the history entry, D-12). It must not call the server. If nothing resolves: the normal NotFound naming the old pathname (D-13). Covered legacy shapes: `/milestones/<mk>`, `/milestones/<mk>/phases/<pk>`, `…/plans/<id>` (+ `?doc=summary` → `/summary`), `…/artifacts/<token>`, `/artifacts/<token>`, and the old top-level pages `/roadmap`, `/search`, `/traceability`, `/research`, `/sketches` (these words are reserved as slugs so they cannot be a project). Also redirect new-form `…/plan-03?doc=summary` to `…/plan-03/summary`. Output must be a same-origin relative path built from known pieces (never from request text) so it cannot become an open redirect; `plan-navigator.ts:668-673` (`routeOf`) is the existing precedent for refusing `//host` and `/\host`.

### Anti-Patterns to Avoid

- **A new `ArtifactLocation` for new folders:** `assemble.ts` keeps only `root`, `research`, `milestone-root`, `other` as loose artifacts, so any other location with a null identity vanishes `[VERIFIED: src/planning-repo/assemble.ts:215-221]`. Keep `other`.
- **Reading `useParams()['*']` for the route:** double-decoded (above).
- **A second route table in the router:** `presentationRoutePatterns` and the parser must not coexist.
- **Letting the web invent URLs:** after this phase no web file builds a document URL except through DTO `key`s or the project-aware builders.
- **Indexing or reading non-text "because it is a file":** every consumer that iterates `presentation.artifacts` must tolerate `body: ''` and skip by `fileClass`.
- **Serving image bytes by path:** the byte route takes a `route`, resolves it through the table, and only then calls `readBytesWithin('.planning', artifact.path)`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Routing from a URL | A second matcher beside react-router | One `/:project/*` route + `parseRoutePath` | Two tables drift (ARCHITECTURE Anti-Pattern 6). |
| Percent-encoding | Custom escaping | `encodeURIComponent` per segment, decode once | Built in; the only trap is double decoding. |
| Phase-number equality | A new normaliser with a new regex | Reuse the `comparePhaseNumbers` grammar from `naming.ts` | Single grammar module rule (DATA-02). |
| Binary detection | Magic-byte tables | Extension sets plus NUL sniff | Enough for "never read as text"; the browser decides image validity. |
| Image size | Header parsers | `HTMLImageElement.naturalWidth/Height` | No bytes parsed server-side; SVG included. |
| Path containment for byte reads | A new check | Existing `PlanningFilesystem.readBytesWithin` | Already confines by canonical path and is used by the sketch route. |
| Safe redirect target | Echoing request text | Build from resolved identity or table entry | Prevents open redirect. |
| Slug generation | Ad-hoc `.replace` in three places | One `slugOf()` + one reserved constant | Phase 8 persists slugs; the rule must exist once. |

**Key insight:** every hard part (containment, grammar, escaping) already has a seam in this repo. The risk in this phase is consumer sprawl, not missing primitives.

## Runtime State Inventory

This is a URL-scheme migration, so the five categories are answered explicitly.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | No database, no server-side session. Client: TanStack Query in-memory cache (keys include `location.pathname`: `['plan-pair', location.pathname]`, `['artifact-document', route]`, `plan-pair-page.tsx:66`, `artifact-page.tsx` query key) resets on reload; `localStorage` `labelore-theme` (`planning-drawer.spec.ts` sets it) is unaffected. Browser history and bookmarks hold old `m~/p~/a~` URLs. | Code edit: keys must use the slug-stripped, project-relative route. Old links: legacy redirector (NAV-11). No data migration. |
| Live service config | None. No external service references these URLs. | None. |
| OS-registered state | None. | None. |
| Secrets/env vars | `config.json` secret masking (Phase 6) is applied in `JsonConfigHandler` at read time and is unaffected; its new URL must keep serving the masked body. No env var names change. | Add a regression test that `/settings` (or chosen URL) still returns masked content. |
| Build artifacts | `dist/` embeds the router patterns; stale `dist/` serves the old router. `test/__golden__/{dense,sparse-empty,sparse-started}.json` contain `kind` values (dense: `HANDOFF.json`, `estimation-calibration.json` are `unknown` today). Goldens carry no URL strings (`grep` for `m~/p~/a~` returned 0). 24 test files and `.planning/` docs (for example `.planning/research/PITFALLS.md`, `milestones/v1.0-quick/*`, two `sketches/*/data.js`) contain old-style URL text. | Rebuild `dist/` before the production hard-reload test. Regenerate dense golden deliberately and review the diff (Pitfall 5). Historical `.planning/` text is not rewritten. |

**Canonical question answered:** after every source file is updated, the surviving old-URL carriers are browser history, bookmarks, notes, and archived planning prose; only the first two are reachable by users, and both go through the redirector.

## Common Pitfalls

### Pitfall 1: Files fall out of the model before any URL is possible
**What goes wrong:** `phases/README.md`, `phases/notes/foo.md` and `milestones/v1.0-phases/README.md` are discovered (`location: phase|archived-phase`, null identity) but never reach `Project`, so they have no artifact, no URL, no drawer row.
**Why:** `classify()` returns the phase location with `phaseIdentity: null` when the directory does not parse as a phase, and `assemble.ts` keeps `phase` refs only with an identity `[VERIFIED: probe with InMemoryPlanningFilesystem this session: 3 refs "DROP"]`.
**How to avoid:** in `classify()`, a `phases/` or `milestones/vX-phases/` entry with no identity becomes location `other` (URL `file/…`). Add a "refs equals model artifacts" assertion over every fixture (this repo's own `.planning/`, Lendshed, dense, sparse-started all had 0 drops today).
**Warning signs:** the round-trip test finds fewer artifacts than the walk finds files.

### Pitfall 2: `quick/README.md` becomes a fake quick task
**What goes wrong:** `classify()` sets `quickTaskId` from the first segment under `quick/`, even when that segment is a file, so `quick/README.md` yields a task with id `README.md` `[VERIFIED: probe: quickTaskId README.md]`. The drawer skips READMEs, but the route table would mint `/quick/README.md/...`.
**How to avoid:** only treat a directory whose name parses as `{date}-{time}-{slug}` as a task; anything else under `quick/` gets the folder rule or `file/`.

### Pitfall 3: Giving a kind that already has a designed view to a differently shaped file
**What goes wrong:** `VIEW_KINDS` already contains `coverage`, `patterns`, `research`, `context`, `learnings` `[VERIFIED: kinds.ts:15-35]`. Emitting `coverage` for `COVERAGE.md` engages the existing generic `coverage` manifest (`manifests.ts:260-266`, `heading: /coverage/i, all: true`), which is intended and benign. Emitting `patterns` for the root graduated `PATTERNS.md` would engage the per-phase pattern-map view on a different document.
**How to avoid:** new wire kinds that should not get a designed view use a name absent from `VIEW_KINDS`; the fallback manifest handles them with the case-B notice "Labelore doesn't yet have a dedicated view for {kind} documents" (`fallback.ts`). Add a table-driven kind test and a "kind in VIEW_KINDS implies a handler or manifest exists" check.

### Pitfall 4: Treating the clean URL as unique when it is not
**What goes wrong:** two phase dirs with the same normalised number in one milestone, two plan files with the same plan number, or `Foo.md` and `foo.md` produce identical URLs.
**How to avoid:** the route table (Pattern 6). Unit-test the audit with an in-memory tree that forces each collision, and assert the loser is reachable at its `file/` URL.

### Pitfall 5: `deriveKind` leakage reappears through handlers
**What goes wrong:** gating `deriveKind` by location fixes the wire kind, but `GenericMarkdownHandler.parse` calls `projectSections(ref.kind, …)` (`generic.ts`), so a changed kind changes parsed `structured`. Search and dashboard consumers filter on kind (`kind === 'state'` at `project-presentation.ts:267`, `dashboard-ledger.ts:172,339,502,544`).
**How to avoid:** run the full suite after the kind change, before any URL work, and diff the dense golden.

### Pitfall 6: Dev works, production does not (or the reverse)
**Observed:** both servers return the shell for dotted and extension-like final segments, encoded slashes, unicode, double slashes and trailing slashes (probes below). The risk is regression, not today's behaviour.
**How to avoid:** extend `test/server/deep-links.test.ts` (production, fake static root) and add a dev-mode case that starts `startServer(path, { port: 0, production: false })` and fetches with `Accept: text/html`; keep a Playwright reload spec for the browser view of the same classes. Probe results (curl with `Accept: text/html`; `/lendshed` was the project slug of the Lendshed fixture):
- Dev (Vite middleware, port 5399): `/lendshed/v1.1`, `…/phase-5.1/plan-01`, `…/file/config.json`, `…/file/x.png`, `…/file/.continue-here.md`, `…/file/a.{js,ts,tsx,jsx,mjs,mts,map,wasm,woff2,vue,json,css,html,svg}`, `%2F`, `%25`, `%00`, unicode, `//`, trailing slash: all `200 text/html` shell. Same results without an `Accept` header.
- Production (Hono `serveStatic` + `index.html` fallback, `dist/` built): the same URL classes `200 text/html`; `/assets/nope.js` is `404`, `/api/zzz` is `404 JSON`, `/favicon.svg` serves the real file; `dist/index.html` references `/assets/...` and `/fonts/...` as absolute paths, so deep URLs load assets.
`[VERIFIED: curl probes this session]`

### Pitfall 7: Slug collides with something the server or Vite owns
**What goes wrong:** a project folder named `api`, `sketches`, `assets`, `fonts`, `src` or `node_modules` is mis-served; `routesToApp` hard-codes `/api/` and `/sketches/`. In dev Vite serves real repo files at the root (`/docs/design-language.md` returned `200 text/markdown`, `/package.json` too).
**How to avoid:** one `reserved.ts` constant consumed by `routesToApp`, the router and `slugOf()`. Suggested members `[ASSUMED]`: `api`, `assets`, `sketches`, `fonts`, `favicon.svg`, `src`, `node_modules`, `public`, `docs`, `test`, `fixtures`, `projects`, `milestones`, `artifacts`, `phases`, plus the legacy page words (`roadmap`, `search`, `traceability`, `research`). A reserved base name gets a `-project` suffix; an empty result becomes `project`. Test every member as a folder name.

### Pitfall 8: Redirect loops and open redirects in the legacy component
**How to avoid:** the target is always built from resolved data; a legacy URL never maps to another legacy URL; add a test that every redirect output parses as a non-legacy route, begins with a single `/`, and contains no `//` prefix.

### Pitfall 9: Updating goldens and 24 test files in the same commit as the grammar
**How to avoid:** ship the route table and grammar behind a test helper first (`tUrl(...)`), migrate old-URL assertions mechanically, and review the dense golden diff separately (kind changes only).

### Pitfall 10: Playwright cannot run here
No browser binaries exist on this machine and `~/.cache/ms-playwright` is absent. Specs are authored and typechecked here, run by the user. Unit-level HTTP tests (above) are the machine-checkable substitute and must not use `test.skip` (the repo's no-skips guard fails the run).

## Code Examples

### The route table seam (shape only; values quoted from the table above)

```typescript
// src/presentation/route-table.ts (sketch). Pure: input is the assembled Project.
export interface RouteTable {
  urlByPath: ReadonlyMap<string, string>; // '.planning/phases/07-x/07-CONTEXT.md' -> '/v2.1/phase-7/context'
  pathByUrl: ReadonlyMap<string, string>;
  conflicts: ReadonlyArray<{ url: string; paths: string[] }>;
}

export function buildRouteTable(project: Project): RouteTable {
  const clean = new Map<string, string[]>();
  for (const { path, identity } of allArtifactsWithOwner(project)) {
    const url = addressOfPath(identity, path); // stateless grammar, never throws
    clean.set(url, [...(clean.get(url) ?? []), path]);
  }
  const urlByPath = new Map<string, string>();
  const conflicts: RouteTable['conflicts'][number][] = [];
  for (const [url, paths] of clean) {
    const [winner, ...losers] = paths.sort();
    urlByPath.set(winner, url);
    if (losers.length > 0) conflicts.push({ url, paths: [winner, ...losers] });
    for (const loser of losers) urlByPath.set(loser, fileUrlOf(loser));
  }
  return { urlByPath, pathByUrl: invert(urlByPath), conflicts };
}
```

### Parsing the raw pathname (not the router's splat param)

```typescript
// Source: probe of react-router 8.3.0 (see Pattern 7). The router decodes splat params, so use the raw pathname.
export function segmentsOf(pathname: string, slug: string): string[] | null {
  const raw = pathname.split('/').slice(1);          // ['', 'lendshed', 'file', 'a%2Fb.md'] -> drop leading ''
  if (raw[0] !== encodeURIComponent(slug)) return null;
  return raw.slice(1).filter((s, i, all) => !(i === all.length - 1 && s === '')).map((s) => decodeURIComponent(s));
}
```

### Lint rule (verified syntax)

```javascript
// eslint.config.js: add a block scoped to src/web/**, with an override that exempts src/web/nav.tsx
{
  files: ['src/web/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': ['error', { paths: [{
      name: 'react-router',
      importNames: ['Link', 'NavLink', 'useNavigate', 'useLocation'],
      message: 'Use src/web/nav.tsx so the project slug is prefixed in one place.',
    }] }],
  },
},
```

### Image route hardening (headers; values from MDN and `sketch-files.ts` precedent)

```typescript
// Source: CSP "sandbox" blocks scripts and gives an opaque origin unless allow-scripts is set
// [CITED: developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/sandbox]
const IMAGE_HEADERS = {
  'Content-Security-Policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'", // SVG opened directly runs no script
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-cache',
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Opaque `m~`/`p~`/`a~` tokens as identity, URL, cache key and API payload | Readable path from a route table; opaque keys kept only for joins | This phase | One decoder module to delete at v2.1 close |
| One router entry per page (11 patterns) | One `/:project/*` splat and one parser | This phase | Parser and routes cannot drift |
| Kind from basename at any depth | Kind from folder table, then name | This phase | Deeper `ROADMAP.md` / `STATE.md` stop masquerading |
| Everything read as UTF-8 and indexed | File classes decided pre-read | This phase | Images and binaries safe; internal files absent |
| GSD 1.11 canonical root list (14 names) | GSD 1.18 adds `state.json`, `skill-manifest.json`, `PATTERNS.md` | Installed 1.18.0 | New names must be recognised or hidden, not "unknown" |

**Deprecated/outdated:** `GET /api/artifacts/*` (web does not call it; `grep` of `src/web` found none; CONTEXT says it becomes the `route=` form), `presentationRoutePatterns`, `?doc=summary`, `current` as a milestone segment. `/api/tree` is no longer fetched by the web (only the server route and tests use it); keep or remove is a planner call, but its URLs change either way.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `config.json` gets the URL `/settings` (and Phase 12 designs the page at that URL) | URL grammar | Phase 12 would have to move or alias the URL |
| A2 | Archived quick tasks share the `/quick/<id>` URL space with live ones | URL grammar | Archived tasks would need a milestone-qualified form instead |
| A3 | Bare folder URLs (`/quick`, `/notes`, `/codebase`) show the not-found page | URL grammar | Users may expect a list; cheap to add later |
| A4 | `estimation-calibration.json` and `skill-manifest.json` are internal | Internal rules | A wanted file disappears from the index; additive to reverse (D-11) |
| A5 | `MAX_TEXT_BYTES = 1 MiB`, NUL sniff over 8000 bytes | File-class policy | Too low hides legitimate large docs; too high allows slow reads |
| A6 | Non-markdown text (html, js, mjs) in sketches and quick folders stays readable and indexed as today | File-class policy | Search noise persists until Phase 13; or surprise if the user expects them hidden |
| A7 | Reserved-word membership list (Pitfall 7) | Pitfall 7 | A project named after an omitted word is mis-served |
| A8 | `Content-Security-Policy: sandbox` stops scripts in an SVG opened as a top-level document | Image route | An SVG with script could run under the app origin if opened directly. MDN confirms sandbox blocks scripts for the served resource but does not mention SVG |
| A9 | `naturalWidth/naturalHeight` is 0 or a default for some SVGs; show "unknown" | Image page | Cosmetic |
| A10 | Root documents other than `/roadmap` render in the generic `ArtifactPage` until Phase 9 | URL grammar | Pitfall 27 (duplicate canonical views) if the user wants redirects to existing pages instead |
| A11 | Two path-only builders and strict uniqueness justify the route table now, against ARCHITECTURE.md's "do not pay for it now" | Pattern 6 | Slightly more work in this phase; fall back to stateless plus audit if the planner disagrees |

## Open Questions

1. **Root document pages in Phase 7 (A10).**
   - Known: `/roadmap` is the live roadmap's one URL (D-03) and today a designed page (`RoadmapPage`); `/requirements`, `/state`, `/project`, `/milestones`, `/retrospective`, `/windows` have no designed page until Phase 9.
   - Unclear: should `/requirements` redirect into Traceability (as `tree.ts` D-16 did) or render the generic reader?
   - Recommendation: generic `ArtifactPage` now, record the Phase 9 decision there; do not add redirects.
2. **Collision handling mechanism (A11).** Recommend the route table; if the planner prefers ARCHITECTURE.md's stateless builders plus a warning, the property test must then assert zero conflicts only on the committed fixtures and the two path-only call sites must still be routed through DTO lookups.
3. **UI surface sign-off.** Phase 7 touches drawer rows (type mark, size), a new image page, a binary info card and the not-found page. `ui_phase` and `ui_safety_gate` are `true`; no UI-SPEC exists (Phase 6 overrode the gate for a test-only phase). Decide between `/gsd-ui-phase 7` and an explicit override with a Playwright screenshot check, as Phase 6 did.
4. **Drawer exposure of unprefixed phase files.** `COVERAGE.md`, `deferred-items.md`, `SKELETON.md` and `.continue-here.md` land in `DrawerPhasePlace.other`, which "is not listed in the drawer" (`drawer.ts:65`). To satisfy "recognised ... in the drawer", extend `POST_PLAN_ARTIFACT_ORDER` or list a trailing group; this is where binaries inside phase and quick folders also surface.
5. **Dead `/api/tree`.** Remove or migrate? It still has tests.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | everything | ✓ | v22.22.0 (engines `>=22.18.0`) | — |
| npm / `node_modules` | tests, build | ✓ after `npm ci` run this session (518 packages) | — | — |
| git | file-listing in leak test | ✓ | — | — |
| Vite dev middleware | dev deep-link test | ✓ | via package.json | — |
| `dist/` build | production deep-link test | ✓ (built this session, 3.45 s; gitignored) | — | rebuild per run |
| Playwright browser (Chromium) | hard-reload e2e specs | ✗ (`~/.cache/ms-playwright` absent) | — | HTTP-level vitest tests here; user runs Playwright |
| `~/.claude/gsd-core` 1.18.0 | grounding the folder table | ✓ | 1.18.0 | — |
| Network | none needed | — | — | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** Chromium (see above).

Baselines recorded this session on the unmodified tree: `npx vitest run` 187 files / 3596 tests pass (76 s); `npm run typecheck` and `npm run lint` pass (about 57 s and 39 s).

## Test Seams and Fixtures

(Formal Validation Architecture omitted: `workflow.nyquist_validation` is `false`.)

- **New made-up fixture project.** Do not edit Lendshed: Phase 6 pinned counts there. Add one more committed made-up project (suggested `test/fixtures/shapes/`, fiction and README like Lendshed, passes `test/fixture-leak.test.ts`: avoid names starting `sp`, `dd`, `sb` followed by a digit or hyphen). It must hold: a live milestone with dotted version, a decimal phase (`02.1-…`), a project-coded phase, an archived milestone with `vX.Y-phases`, `vX.Y-quick`, `vX.Y-research`, quick tasks (live and archived), unprefixed `COVERAGE.md`, `deferred-items.md`, `SKELETON.md`, `.continue-here.md`, root `HANDOFF.json`, a deeper `ROADMAP.md` and `STATE.md` (in a sketch folder), `codebase/` documents plus a `spikes/CONVENTIONS.md` (the basename collision), internal files (`state.json`, `tmp/x.json`, `async-jobs/j.json`, `milestone.lock`), a tiny PNG, an SVG containing a `<script>`, a binary stub with NUL bytes, odd names (space, `%`, `#`, `?`, non-ASCII), and a file directly under `phases/`. `fixtures/README.md` requires a ledger row per file for files under `fixtures/`; `test/fixtures/` follows the Lendshed README convention.
- **Pure tests.** Table-driven `(path -> location, kind, fileClass, internal?)` including every collision named in PITFALLS 2 and 7. Property test over all fixtures and this repo's own `.planning/` (allowed, Phase 6 D-03): `buildRouteTable` has no conflicts; `parse(build(x))` and `lookupRoute` return the same artifact; every URL begins with `/`, survives `new URL(url, base).pathname === url`, and is unique; model artifacts equal discovered refs. Adversarial in-memory trees force each collision and assert the `file/` loser.
- **Server tests.** Production shell delivery over every URL class (extend `deep-links.test.ts`), a dev-mode case through `startServer(…, { production: false, port: 0 })`, image route headers and caps, internal and binary URLs return not-found, `/api/documents?route=` with encoded segments, `config.json` URL still masked.
- **Web contract tests.** Source-scan style (as `class-vocabulary.test.ts`): no `queryKey`/link using `location.pathname` unstripped; lint rule enforced; legacy module imported only by the redirect component (so deletion is one file plus its test).
- **Playwright (authored here, run by the user).** One helper `appUrl(base, projectRelativeUrl)` prefixing the slug from `/api/presentation`, then reload specs for dotted, decimal, `file/`, encoded and unicode URLs against the dev and built servers.
- **Goldens.** Regenerate dense only after kind and exclusion changes; review the diff by hand.

## Security Domain

`security_enforcement` is enabled (ASVS level 1).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | local single-user tool |
| V3 Session Management | no | — |
| V4 Access Control | yes (internal files must be unreachable) | internal paths never enter the index; every URL resolves only through the route table |
| V5 Input Validation | yes | route parsed by a total function; `route=` query validated; no path ever taken from request text; reserved-word and length bounds on segments |
| V6 Cryptography | no | — |
| V12 Files and Resources | yes | extension allowlist for served content types, size cap, `nosniff`, CSP `sandbox`, no download endpoint for non-image binaries, read-only port |
| V13 API | yes | `GET` only; `/api/documents` and the image route reject unknown routes with 404 |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via `route` or `file/` URL | Tampering, Information disclosure | lookup in `pathByUrl`; `readBytesWithin('.planning', indexedPath)` re-checks canonical containment |
| Script execution from a hostile SVG | Elevation, Tampering | `<img>` only (D-08), plus `Content-Security-Policy: sandbox …` when the bytes URL is opened directly (A8) |
| Reading internal files by guessing `file/` URLs | Information disclosure | internal files are never indexed; a `file/` URL for one is a plain miss (D-11) |
| Open redirect through the legacy redirector | Spoofing | target built only from resolved identities, same-origin relative path, loop test (Pitfall 8) |
| Memory or time exhaustion from large or binary files | Denial of service | stat size before read, `MAX_TEXT_BYTES`, bounded head read, image byte cap |
| Secret exposure | Information disclosure | `config.json` masking stays in `JsonConfigHandler`; internal list never includes it |
| Cross-site reads of the image route | Information disclosure | GET responses carry no CORS headers; DNS rebinding and Host allowlisting are Phase 8 (SEC-05) and the new route inherits them |
| Hostile file names in UI | Tampering | React escapes text; segments are percent-encoded; `.` / `..` segment guard |

## Suggested slicing for the planner

Dependency order (each slice keeps the suite green):

1. **Recognition (DATA-07, DATA-08):** `folders.ts`, file-class policy, port additions (`size`, `readHead`), `registry.ts` pre-read branch, `classify()` fix for null-identity files, internal exclusions, `Artifact.fileClass`, search skip, new shapes fixture, table-driven tests, dense golden review.
2. **Grammar and table (NAV-09, NAV-10 core):** `reserved.ts`, `project-slug.ts`, rewritten `routes.ts` with unchanged export names, `identity-keys.ts`, `route-table.ts`, `artifact-index.ts` `lookupRoute`, `/api/documents?route=`, remove `/api/artifacts/*`, `projectSlug` on the presentation DTO, property and audit tests.
3. **Consumer sweep:** DTO builders (`project-presentation`, `drawer`, `roadmap`, `dashboard`, `references`, `traceability`, `tree`, `search-index`, `dashboard-ledger`, `document-sources`), `web/nav.tsx` + lint rule, `app-router.tsx` splat, pages (`plan-pair-page` path-based tabs, `pair-switch`, `artifact-page` breadcrumbs and sibling URLs, `roadmap-deep-link`, `planning-places`, `search-field`, `app-shell`), old-URL test migration, Playwright helper.
4. **Legacy (NAV-11):** `legacy-routes.ts` + `LegacyRedirect` + tests; mark the removal task for v2.1 close in the summary.
5. **Delivery proofs (NAV-10 reload):** deep-link tests (prod and dev), Playwright reload spec, built-app smoke.
6. **Image and binary pages (DATA-08 UI):** byte route, `ImagePage`, binary card, drawer marks, design-language rows, class-vocabulary test.

## Sources

### Primary (HIGH confidence)
- Repo code read this session: `src/presentation/routes.ts`, `src/server/artifact-index.ts`, `src/server/index.ts`, `src/planning-repo/{discovery,naming,assemble,registry,snapshot}.ts`, `handlers/{index,artifact-token,json-config,generic}.ts`, `src/planning-fs/{types,local-fs,in-memory-fs}.ts`, `src/presentation/{drawer,drawer-route,tree,tree-labels}.ts`, `src/server/{project-presentation,search-index,sketch-files}.ts`, `src/web/{app-router,components/app-shell,components/pair-switch,pages/plan-pair-page,pages/artifact-page,pages/roadmap-deep-link}.ts*`, `src/web/views/{kinds,fallback}.ts`, `eslint.config.js`, `playwright.config.ts`, `package.json`.
- Milestone research: `.planning/research/{ARCHITECTURE,SUMMARY,PITFALLS,GSD-DOMAIN}.md`; `.planning/phases/07-…/07-CONTEXT.md` and `07-DISCUSSION-LOG.md`.
- GSD 1.18.0 installed at `~/.claude/gsd-core` (`bin/lib/artifacts.cjs`, `templates/README.md`, `references/artifact-types.md`, `workflows/{resume-project,map-codebase,new-milestone}.md`, `references/universal-anti-patterns.md`).
- Probes run this session: discovery and model-drop probes over this repo, Lendshed, dense, sparse-started and an in-memory tree; react-router 8.3.0 `matchRoutes`/`createMemoryRouter` decoding; Vite dev (port 5399, 5397) and Hono production (`dist/`) deep-link requests; ESLint 10 `no-restricted-imports`; baseline `vitest`, `tsc`, `eslint` runs.

### Secondary (MEDIUM confidence)
- MDN, CSP `sandbox` directive: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/sandbox (scripts blocked and opaque origin by default; page does not discuss SVG).

### Tertiary (LOW confidence)
- None used as authority. SVG-under-sandbox behaviour is recorded as `[ASSUMED]` (A8).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, no changes, all versions read from `package.json` and `node_modules`.
- Architecture: HIGH for seams, call sites and URL delivery (probed); MEDIUM for the route table versus stateless trade-off (A11) and for folder-table kind names that Phases 9-11 will consume.
- Pitfalls: HIGH, each cites a probe or a file and line.
- GSD folder coverage: MEDIUM-HIGH: 1.18.0 sources read, but directories such as `workstreams/`, `intel/`, `graphs/`, `reports/` have no real example on this machine, so their file lists come from workflow text.

**Research date:** 2026-10-26
**Valid until:** 2026-11-25 (stable code; revisit if `~/.claude/gsd-core` upgrades past 1.18.x or react-router/Vite majors change)

**Not done:** no commit was made (the caller decides); no external-docs MCP provider was needed because no library is added; Playwright could not be run here.

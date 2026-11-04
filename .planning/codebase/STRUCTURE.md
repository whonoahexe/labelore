---
last_mapped_commit: 717c8d7db3d75717948b08690df3a087fc01684d
last_mapped_at: 2026-11-04
---
# Codebase Structure

**Analysis Date:** 2026-11-04

## Directory Layout

```
labelore/
├── src/                      # All application source (TypeScript, one tree for server + web)
│   ├── cli/                  # Target argument parsing (local path, sftp/ssh/scp remote)
│   ├── domain/               # Shared entity types (model.ts) — no parsing imports
│   ├── planning-fs/          # Filesystem port + Node adapter (the only node:fs reader)
│   ├── planning-repo/        # Discovery, parsing, handlers, assembly, snapshot
│   │   └── handlers/         # One parser per GSD artifact family (54 files)
│   ├── presentation/         # Pure view-model builders and URL grammar (server-side)
│   ├── rendering/            # Markdown → HTML pipeline, diagram lifting/layout
│   ├── server/               # Hono app, project registry/runtime, search, settings
│   └── web/                  # React SPA
│       ├── components/       # Shell, switcher, dialogs, shared widgets
│       │   └── ui/           # Base primitives (button, dialog, toast)
│       ├── pages/            # Route-level components (lazy-loaded)
│       ├── views/            # Pure view composers (*.ts) + presenters (*-components.tsx)
│       └── styles/           # globals.css (oklch tokens, Tailwind v4 @theme)
├── test/                     # Vitest unit/integration tests, goldens, e2e specs
│   ├── __golden__/           # Golden JSON snapshots (dense, sparse-empty, sparse-started)
│   ├── e2e/                  # Playwright specs and shared e2e helpers
│   ├── fixtures/             # Fixture .planning trees used by tests (dashboard, debug, lendshed…)
│   ├── helpers/              # Shared test setup, corpora builders, vitest-gate.mjs
│   └── web/                  # Web-side tests (class-vocabulary, css-source-order, …)
├── fixtures/                 # Top-level fixture projects (e.g. dense/.planning) and README
├── docs/                     # design-language.md (visual and naming conventions)
├── public/                   # favicon.svg, self-hosted woff2 fonts
├── .claude/                  # Claude Code settings, project CLAUDE.md, cloud helper scripts
├── .planning/                # This project's own GSD planning state (not read by the app at runtime)
├── index.html                # Vite entry HTML (loads /src/web/main.tsx)
├── vite.config.ts            # Vite + React + Tailwind plugins, '@' → src/web alias
├── vitest.config.ts          # Test include: test/**/*.test.ts
├── playwright.config.ts      # e2e configuration
├── tsconfig.json             # Base TS config
├── tsconfig.server.json      # Server typecheck (excludes src/web)
├── tsconfig.web.json         # Web typecheck
├── eslint.config.js          # Flat ESLint config
├── components.json           # shadcn configuration (base-sera style)
└── package.json              # Scripts: dev, build, start, smoke, test, test:e2e, typecheck, lint
```

## Directory Purposes

**`src/cli/`** (3 files):
- Purpose: Turn raw CLI arguments into a local folder or remote target, before any filesystem read.
- Contains: `target-path.ts` (folder check, `LOAD_STATUS_MESSAGES`), `remote-target.ts` (pure parsing of `sftp://`, `ssh://`, `[user@]host:/path`), `snapshot.ts` (one-off snapshot CLI).
- Key files: `src/cli/target-path.ts`, `src/cli/remote-target.ts`

**`src/domain/`** (1 file):
- Purpose: Shared vocabulary; safe for any layer to import.
- Key files: `src/domain/model.ts`

**`src/planning-fs/`** (3 files):
- Purpose: Read-only filesystem port.
- Contains: `types.ts` (`PlanningFilesystem`, `PathEscapeError`, `DirEntry`, `FileRead`), `local-fs.ts` (Node adapter, `canonicalizePath`, temp-dir helpers), `in-memory-fs.ts` (test double).
- Key files: `src/planning-fs/types.ts`, `src/planning-fs/local-fs.ts`

**`src/planning-repo/`** (71 files including handlers):
- Purpose: Parse a `.planning/` tree into a `ProjectSnapshot`.
- Contains: `discovery.ts`, `registry.ts`, `assemble.ts`, `crossref.ts`, `snapshot.ts`, `naming.ts`, `folders.ts`, `file-class.ts`, `frontmatter.ts`, `mentions.ts`, `warnings.ts`, `theme-tokens.ts`, `css-color.ts`, `codebase-files.ts`, `secret-mask.ts`, `serialize.ts`, `types.ts`.
- Key files: `src/planning-repo/snapshot.ts` (entry: `PlanningRepository`), `src/planning-repo/handlers/index.ts` (`HANDLERS`), `src/planning-repo/assemble.ts`

**`src/planning-repo/handlers/`** (54 files):
- Purpose: One parser per artifact family. Each exports a handler matching by filename and location.
- Examples: `plan.ts`, `summary.ts`, `roadmap.ts`, `state.ts`, `requirements.ts`, `project.ts`, `milestones.ts`, `review.ts`, `review-disposition.ts`, `research.ts`, `security.ts`, `uat.ts`, `verification.ts`, `todo.ts`, `note.ts`, `debug.ts`, `learnings.ts`, `windows.ts`, `coverage.ts`, `json-config.ts`, `generic.ts` (fallback — must stay last in `HANDLERS`).
- Shared helpers: `markdown-sections.ts`, `section-projection.ts`, `frontmatter-only.ts`, `plan-structure.ts`.

**`src/presentation/`** (37 files):
- Purpose: Build view models and addresses; pure functions of a `Project` or `ProjectPresentation`.
- Key files: `route-table.ts`, `routes.ts`, `reserved.ts` (server-owned URL check), `dashboard.ts`, `roadmap.ts`, `traceability.ts`, `search.ts`, `tree.ts`, `drawer.ts`, `references.ts`, `legacy-routes.ts`, `root-redirects.ts`, `sketches.ts`, `project-research.ts`, `*-context.ts` (review, todo, note, project).

**`src/rendering/`** (11 files):
- Purpose: Server-side markdown rendering and diagram handling.
- Key files: `markdown.ts` (`createArtifactRenderer`), `linkify.ts`, `ascii-lift.ts`, `ascii-tree.ts`, `ascii-graph.ts`, `lane-layout.ts`, `build-order-layout.ts`, `plan-segments.ts`, `figure-detect.ts`, `slug.ts`.

**`src/server/`** (20 files):
- Purpose: HTTP surface, project lifecycle, derived state per project.
- Key files: `index.ts` (entry and CLI parsing), `registry-api.ts` (`createRegistryApp`), `project-api.ts` (`createProjectApi`), `project-registry.ts` (`ProjectRegistry`), `project-runtime.ts` (`ProjectRuntime`), `request-guard.ts`, `settings-store.ts`, `search-index.ts`, `remote-source.ts`, `folder-scan.ts`, `commit-times.ts`, `file-dates.ts`, `file-bytes.ts`, `sketch-files.ts`, `artifact-index.ts`, `dashboard-ledger.ts`, `document-sources.ts`, `project-presentation.ts`, `project-title.ts`, `settings-model.ts`.

**`src/web/`** (140 files):
- Purpose: Browser application.
- Key files: `main.tsx` (root), `app-router.tsx` (route table and `ProjectRoute`), `route-dispatch.ts` (pure address resolution), `api.ts`, `query-keys.ts`, `nav.tsx`, `project-path.ts`, `opened-ago.ts`.
- `components/` (35 files): `app-shell.tsx`, `project-switcher.tsx`, `project-add-dialog.tsx`, `artifact-header.tsx`, `sidebar-drawer.tsx`, `theme-toggle.tsx`, `lane-diagram.tsx`, `fenced-figure.tsx`, `route-progress.tsx`, `route-chunk-store.ts`.
- `components/ui/` (3 files): `button.tsx`, `dialog.tsx`, `toast.tsx` — base-sera primitives on `@base-ui/react`.
- `pages/` (37 files): one `*-page.tsx` per route family (`dashboard-page.tsx`, `roadmap-page.tsx`, `traceability-page.tsx`, `research-page.tsx`, `sketches-page.tsx`, `search-page.tsx`, `document-route.tsx`, `plan-pair-page.tsx`, `artifact-page.tsx`, `projects-page.tsx`, `project-layout.tsx`, `not-found-page.tsx`), plus pure helpers such as `document-title.ts`, `roadmap-deep-link.ts`, `traceability-rollup.ts`, `strip-markdown.ts`.
- `views/` (59 files): paired files per view, e.g. `review-ledger.ts` (pure) with `review-ledger-components.tsx` (React); shared `manifest.ts` (`composeView`), `layout.ts`, `blocks.tsx`, `facts.ts`, `inline-markdown.ts`.
- `styles/globals.css`: oklch tokens and `@theme` mapping.

**`test/`** (553 files, mostly fixtures):
- Unit and integration tests are `test/**/*.test.ts` (e.g. `test/discovery.test.ts`, `test/assemble.test.ts`, `test/crossref.test.ts`, `test/context-brief.test.ts`). Web tests live under `test/web/`.
- e2e: `test/e2e/*.spec.ts` (34 files) with `test/e2e/fixture-server.ts`, `test/e2e/projects-server.ts`, `test/e2e/pages.ts`.
- Goldens: `test/__golden__/*.json`.
- Fixtures: `test/fixtures/` (235 files) organised by scenario (`dashboard/ledger`, `dashboard/synthetic`, `lendshed`, `debug`, `learnings`).

**`fixtures/`** (64 files):
- Purpose: Top-level sample GSD projects (`fixtures/dense/.planning/…`) and `fixtures/README.md`. Distinct from `test/fixtures/`.

## Key File Locations

**Entry Points:**
- `src/server/index.ts`: server and CLI start (`startServer`, `parseCli`)
- `src/web/main.tsx`: browser entry, referenced from `index.html`
- `src/cli/snapshot.ts`: `npm run snapshot`

**Configuration:**
- `package.json`: scripts and dependency versions (Node `>=22.18.0`)
- `vite.config.ts`: build alias `@` → `src/web`; `chunkSizeWarningLimit: 680`
- `tsconfig.server.json` / `tsconfig.web.json`: split typechecks; web excluded from server config
- `eslint.config.js`, `.prettierrc`, `components.json`
- `.claude/settings.json`, `.claude/CLAUDE.md`: agent instructions (not app config)

**Core Logic:**
- `src/planning-repo/snapshot.ts`: load and refresh pipeline
- `src/planning-repo/handlers/index.ts`: handler dispatch order
- `src/planning-repo/assemble.ts`: milestone, phase, plan graph
- `src/server/project-runtime.ts`: per-project derived bundle
- `src/presentation/route-table.ts`: address ownership
- `src/web/app-router.tsx`: web route table

**Testing:**
- `vitest.config.ts`: unit test runner, setup `test/helpers/config-dir-setup.ts`
- `playwright.config.ts`: e2e runner
- `test/helpers/`: 23 shared helpers, including `fixture-project.ts`, `from-directory.ts`, `dashboard-sources.ts`

## Naming Conventions

**Files:**
- kebab-case for all TypeScript modules: `project-registry.ts`, `route-table.ts`, `review-ledger-components.tsx`
- React components in `.tsx`; pure logic in `.ts`. A view's presenter has the `-components.tsx` suffix (`src/web/views/*-components.tsx`).
- Pages end in `-page.tsx` (`src/web/pages/roadmap-page.tsx`); some pages use `-route` or `-layout` (`document-route.tsx`, `project-layout.tsx`).
- Test files: `test/<area>.test.ts`; e2e: `test/e2e/<feature>.spec.ts`.
- Handlers: `src/planning-repo/handlers/<artifact-family>.ts`, exporting `<Name>Handler` (e.g. `PlanHandler`, `UiReviewHandler`).

**Directories:**
- Lowercase, hyphenated (`planning-repo`, `planning-fs`, `project-research`); no index barrels except `handlers/index.ts`.

**Identifiers and constants:**
- Functions: camelCase (`buildRouteTable`, `parseWithRegistry`).
- Module constants: SCREAMING_SNAKE (`HANDLERS`, `LOCATION_ORDER`, `GUARD_BODY_LIMIT`, `SKETCH_FILES_SEGMENT`).
- Types and interfaces: PascalCase, with `Snapshot`, `Source`, `Outcome`, `Context`, `ViewModel` suffixes used as the codebase's convention.
- Imports use `.ts` / `.tsx` extensions (`import … from '../domain/model.ts'`).

**Files under `.planning/` in a target project** (what the app reads): `PROJECT.md`, `ROADMAP.md`, `STATE.md`, `REQUIREMENTS.md`, `milestones/`, `phases/`, `quick/`, `research/`, `todos/`, `notes/`, `debug/`, `codebase/`. Naming parsers live in `src/planning-repo/naming.ts`.

## Where to Add New Code

**New artifact type (a GSD file the app should understand):**
- Parser: `src/planning-repo/handlers/<name>.ts` exporting a handler with `match(ref)` and `parse(raw, ref)`.
- Register it in `HANDLERS` in `src/planning-repo/handlers/index.ts`, before `GenericMarkdownHandler`.
- Domain shape if needed: `src/domain/model.ts`.
- Tests: `test/<name>.test.ts`; fixture under `test/fixtures/`.

**New view model or page data:**
- Builder: `src/presentation/<name>.ts` (pure; takes `Project` or `ProjectPresentation`).
- Endpoint: add `api.get('/<name>', …)` in `src/server/project-api.ts` and read `runtime.derived`.
- Client fetcher: `src/web/api.ts`; query key via `src/web/query-keys.ts`.

**New page:**
- Component: `src/web/pages/<name>-page.tsx` (default export not used; named export such as `DashboardPage`).
- Route: add a lazy import and entry in `src/web/app-router.tsx`, wrapped with `trackRouteChunk`.
- Address grammar, if new: `src/presentation/routes.ts` and dispatch in `src/web/route-dispatch.ts`.
- Reserved first segments: `src/presentation/reserved.ts` (`PROJECT_PAGES`, `LEGACY_FIRST_SEGMENTS`).

**New view (composed UI section):**
- Pure composer: `src/web/views/<name>.ts`
- Presenter: `src/web/views/<name>-components.tsx`
- Register in `src/web/views/manifests.ts` if it participates in the document layout.

**New UI component:**
- Shared widget: `src/web/components/<name>.tsx`
- Base primitive from shadcn: `src/web/components/ui/` (set `"rsc": false` in `components.json`, per the project design rules).
- Styles: tokens in `src/web/styles/globals.css`; visual rules in `docs/design-language.md` (enforced by `test/web/class-vocabulary.test.ts`).

**New rendering behaviour:**
- `src/rendering/markdown.ts` (pipeline order: sanitize before highlight and linkify plugins).

**New filesystem capability:**
- Extend `src/planning-fs/types.ts` (optional member first), implement in `src/planning-fs/local-fs.ts`, and in-memory double in `src/planning-fs/in-memory-fs.ts`.

**New project-level CLI option:**
- `parseCli` in `src/server/index.ts`. Unknown flags throw (no `--scan` flag by design, D-16).

**Utilities:**
- Pure string and URL helpers: `src/presentation/identity-keys.ts`, `src/web/project-path.ts`, `src/web/pages/strip-markdown.ts` (client-side only).
- Server helpers: `src/server/project-title.ts`, `src/server/file-bytes.ts`.

**Tests:**
- Unit: `test/<area>.test.ts`; web: `test/web/<name>.test.ts`; e2e: `test/e2e/<feature>.spec.ts`.
- Shared fixtures and builders: `test/helpers/`.

## Special Directories

**`dist/`:**
- Purpose: Vite production bundle served by `npm start`.
- Generated: Yes (`npm run build`)
- Committed: No (listed in `.gitignore`)

**`test-results/`, `playwright-report/`, `test/e2e/screenshots/`:**
- Purpose: Playwright output and screenshots.
- Generated: Yes
- Committed: No (`.gitignore`)

**`node_modules/`:**
- Generated: Yes
- Committed: No

**`.claude/worktrees/`:**
- Purpose: Agent worktrees created by Claude Code isolation.
- Generated: Yes
- Committed: No (`.gitignore`); excluded from this analysis.

**`.planning/`:**
- Purpose: GSD planning state for this repository (roadmap, milestones, phases, debug notes, this codebase map).
- Generated: Partly (by GSD workflows)
- Committed: Yes

**`fixtures/` and `test/fixtures/`:**
- Purpose: Sample GSD projects used for tests and screenshots. Test data, never read by the app at runtime unless a path is supplied.
- Generated: No
- Committed: Yes

**`.gsd/`, `.playwright-mcp/`:**
- Purpose: Per-run GSD scratch and Playwright MCP state.
- Generated: Yes
- Committed: No (`.gitignore`)

---

*Structure analysis: 2026-11-04*

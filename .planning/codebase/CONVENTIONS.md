---
last_mapped_commit: 717c8d7db3d75717948b08690df3a087fc01684d
last_mapped_at: 2026-11-04
---
# Coding Conventions

**Analysis Date:** 2026-11-04

## Naming Patterns

**Files:**
- kebab-case for every source file: `src/server/project-registry.ts`, `src/planning-repo/handlers/roadmap.ts`, `src/web/components/app-shell.tsx`
- Source files carry an explicit extension in imports (`allowImportingTsExtensions` is on): `import type { ProjectSnapshot } from '../planning-repo/types.ts'`
- Web hooks use a `use-` prefix: `src/web/components/use-active-section.ts`
- Web page components live in `src/web/pages/*-page.tsx` and route-level views in `src/web/views/*.ts(x)`
- Planning-artifact handlers are named after the artifact type: `src/planning-repo/handlers/<type>.ts` (for example `state.ts`, `review-report.ts`, `ui-spec-contract.ts`); `handlers/index.ts` is the registry
- Test files mirror the source area and end in `.test.ts` (never `.test.tsx`): `test/server/refresh.test.ts`, `test/rendering/markdown.test.ts`, `test/web/class-vocabulary.test.ts`
- Playwright specs end in `.spec.ts` and live in `test/e2e/`

**Functions:**
- camelCase for all functions: `defaultSettingsDir`, `tryParseFrontmatter`, `buildSearchDocuments`, `createApp`
- Top-level helpers are `function` declarations, not `const` arrow functions: `function cn(...)` in `src/web/components/ui/button.tsx`, `function findSection(...)` in `src/planning-repo/handlers/state.ts`
- Factory functions are named `create*`: `createApp` (`src/server/index.ts`), `createSearchIndexState` (`src/server/search-index.ts`), `createRegistryApp` (`src/server/registry-api.ts`), `createProjectApi` (`src/server/project-api.ts`)
- Test fixture builders are named `make*`: `makeArtifact`, `makePhase`, `makeProject`, `makeSnapshot` (repeated per test file, see `test/server/search-index.test.ts`)
- Predicate helpers are named `is*` / `has*`: `isBlockersHeading`, `isDecisionsHeading`, `isReady`
- Parsing helpers that return null on failure start with `try`: `tryParseFrontmatter` (`src/planning-repo/frontmatter.ts`)

**Variables:**
- camelCase locals; `const` by default
- Module-level constants are SCREAMING_SNAKE_CASE: `DEFAULT_PORT`, `PORT_ATTEMPTS`, `HOSTNAME` (`src/server/index.ts`), `MAX_QUERY_LENGTH`, `SCAN_RESULT_CAP`, `DEFAULT_MAX_LOADED` (`src/server/project-registry.ts`)
- Message tables are SCREAMING_SNAKE too: `LOAD_STATUS_MESSAGES` (`src/cli/target-path.ts`), `NOTICE_UNREADABLE` (`src/server/settings-model.ts`)
- Private class fields are plain `private readonly` (no `#` fields): `src/planning-repo/warnings.ts`

**Types:**
- PascalCase for types, interfaces and classes; no `I` prefix on interfaces (`SettingsStore`, `ParseWarning`, `FailedLoadStatus`)
- Use `type` aliases for unions and discriminated results: `export type LoadStatus = ...`, `export type MutateResult = { ok: true; ... } | { ok: false; ... }` (`src/server/settings-store.ts`)
- Use `interface` for object shapes and extension points: `export interface SettingsStore` (`src/server/settings-store.ts`), and option bags such as `ServerOptions` in `src/server/index.ts`
- Discriminate results on a `status` or `ok` literal field; never throw for expected load failures (see Error Handling)
- Domain types live in `src/domain/model.ts`; planning-repo contract types in `src/planning-repo/types.ts`

## Code Style

**Formatting:**
- Prettier 3.9.6 with `.prettierrc`: single quotes, semicolons, `printWidth: 100`, `trailingComma: "all"`
- Run with `npm run format` (`prettier --write .`). Formatting is not enforced by a hook or pre-commit step
- Keep lines at or under 100 columns in new code; some existing files (notably `src/web/**` and tests) exceed this in long string literals and JSX attribute lists

**TypeScript settings:**
- `strict: true`, `verbatimModuleSyntax: true`, `module`/`moduleResolution: nodenext` (`tsconfig.json`)
- Use `import type { ... }` for type-only imports; the compiler rejects value imports of types under `verbatimModuleSyntax`
- Web code is type-checked with `tsconfig.web.json` (`jsx: react-jsx`, DOM lib); server code with `tsconfig.server.json`
- `npm run typecheck` runs both configs

**Linting:**
- ESLint 10 flat config at `eslint.config.js`
- Base: `@eslint/js` recommended + `typescript-eslint` recommended
- `@typescript-eslint/no-unused-vars` is an error with `argsIgnorePattern: '^_'`: prefix intentionally unused parameters with `_`
- `src/web/**` adds `eslint-plugin-react-hooks` recommended rules and browser globals; `src/server/**`, `src/cli/**`, `src/planning-repo/**`, `src/planning-fs/**` and `test/**` use Node globals
- Restricted import rule (NAV-09): in `src/web/**`, `Link`, `NavLink`, `useNavigate` and `useLocation` must not be imported from `react-router`. Use the wrappers in `src/web/nav.tsx`. Only `nav.tsx` and `src/web/app-router.tsx` are exempt
- Ignored: `dist/**`, `fixtures/**`, `test/__golden__/**`, `.planning/**`
- Run with `npm run lint`
- Suppressions are rare and narrow: the one `eslint-disable-next-line react-hooks/exhaustive-deps` is in `src/web/components/use-active-section.ts`. No `@ts-ignore` or `@ts-expect-error` appears in `src/` or `test/`
- `any` does not appear as a type annotation in source; use `unknown` and narrow

**Exports:**
- Named exports only. No `export default` appears anywhere in `src/` or `test/`. Keep it that way: `src/server/index.ts` exports `createApp`, `routesToApp`, `startServer` by name
- Re-exports are used to keep old import paths alive, for example `test/helpers/fixture-project.ts` re-exports loaders from `todo-corpus.ts`

## Import Organization

**Order (observed, not lint-enforced):**
1. Node built-ins with `node:` prefix: `import { mkdtempSync } from 'node:fs'`
2. Third-party packages: `hono`, `react`, `@base-ui/react/dialog`, `class-variance-authority`
3. Project modules via relative paths with extensions, parents first then siblings: `../planning-repo/types.ts`, then `./settings-model.ts`
4. `import type` lines are commonly grouped with the module they describe, not separated

**Path Aliases:**
- None. The project has no `@/` alias. Use relative paths with `.ts` / `.tsx` extensions
- `src/web/components/ui/dialog.tsx` imports `./button.tsx` for the same reason

**Restricted imports:**
- Router primitives come from `src/web/nav.tsx`, not `react-router`, inside `src/web/**` (see Linting)

## Error Handling

**Load and read paths never throw (D-12):**
- `PlanningRepository.load()` / `refresh()` return a `LoadStatus` value: `{ status: 'ok' }` or one of `not-a-gsd-project`, `path-not-found`, `permission-denied`, each with `pathChecked` and `message` (`src/planning-repo/types.ts`)
- Consumers switch on `status`; they do not wrap calls in `try`
- The `LOAD_STATUS_MESSAGES` table in `src/cli/target-path.ts` maps statuses to user-facing text

**Per-artifact degradation (D-11):**
- A parse failure does not drop the artifact. It attaches a `ParseWarning` (`path`, `stage`, `message`, `salvage`) produced by `WarningCollector` in `src/planning-repo/warnings.ts`
- `stage` is one of `read`, `frontmatter`, `structured-extraction`, `assembly`
- `salvage` describes what survived, for example "body intact, frontmatter unavailable"
- Never store the caught error object or its stack in a warning. Store the message string

**Frontmatter:**
- Wrap `gray-matter` (via `src/planning-repo/frontmatter.ts`) in try/catch; on failure keep the whole file as body with empty frontmatter. Do not call `matter()` unguarded

**Settings store:**
- `src/server/settings-store.ts` returns `MutateResult` (`{ ok: true, state } | { ok: false, state, reason }`) from `mutate()` and never throws for I/O problems it can describe. `read()` "never throws"
- Errors caught as `catch (err)` and reduced to a reason string

**Throwing:**
- Throw `Error` only for programmer or configuration faults that must stop startup or a test run:
  - `src/server/settings-store.ts`: `LABELORE_CONFIG_DIR must be set when Labelore runs under vitest`
  - `src/server/index.ts`: `--port requires a numeric value`, `Unknown option: ...`, `Invalid port: ...`
  - `test/helpers/fixture-project.ts`: a missing fixture throws instead of skipping
- The CLI entry (`src/server/index.ts`) catches the top-level error, prints `error.message`, and exits non-zero

**HTTP responses:**
- JSON errors use `c.json({ error: '...' }, status)` from Hono, e.g. `c.json({ error: 'API route not found' }, 404)` in `src/server/index.ts`

## Logging

**Framework:** `console` only. No logging library is present.

**Where logging is allowed:**
- Startup and CLI output: `src/server/index.ts` (`Labelore is reading ...`, `Open ${baseUrl}`), `src/cli/snapshot.ts` (`console.error` for usage, `console.log` for JSON)
- Non-fatal remote warnings: `console.warn` in `src/server/remote-source.ts`
- Do not add logging inside `src/planning-repo/**` or `src/planning-fs/**`; report through `ParseWarning` or `LoadStatus` so the data path stays pure

## Comments

**File headers:**
- Almost every source file opens with a multi-line `//` header that states the file's role, the decisions it implements, and the constraints it keeps. Example: `src/server/settings-store.ts` names the one permitted `node:fs` writer and the test that enforces it
- Decision and requirement IDs are cited inline: `D-09`, `D-12`, `PLAT-02`, `NAV-09`, `SEC-05`, `TEST-01`, and quick-task IDs such as `quick-260923-jxp`. Keep citing them when you extend a file

**When to Comment:**
- Explain why a rule exists, especially invariants that a test enforces. `src/web/nav.tsx` explains why links go through the wrappers
- Put a comment at the top of an exported function when the behavior is subtle, using `/** ... */` (see `src/planning-repo/warnings.ts`, `src/server/index.ts` `createApp`)
- Section dividers use `// ---- name ----` or long `// -----` rules in long files (`test/web/class-vocabulary.test.ts`, `src/planning-repo/handlers/verification-report.ts`)
- Do not restate what the code does

**JSDoc/TSDoc:**
- `/** */` on exported functions, interface members and type aliases where a contract matters (`SettingsStore.read`, `ServerOptions.autoPort`)
- No `@param` / `@returns` tags are used. Prose only

## Function Design

**Size:** Parsers in `src/planning-repo/handlers/*.ts` are long and split into many small helpers in the same file. Prefer adding a helper to the file over growing a handler's main function.

**Parameters:**
- Positional for one to three arguments
- Options bags for many optional values: `ServerOptions` in `src/server/index.ts`, `createApp(source, production, staticRoot, commitLog)` with defaults
- Dependency injection through parameters with defaults: `defaultSettingsDir(env = process.env, home = homedir())` in `src/server/settings-store.ts`. Tests pass `MemorySettingsStore` or `InMemoryPlanningFilesystem`

**Return Values:**
- Pure functions return data; repository and store methods return discriminated results (see Error Handling)
- Nullable lookups return `null`, not `undefined`: `findSection(...)` in `src/planning-repo/handlers/state.ts` returns `{...} | null`, and `tryParseFrontmatter` in `src/planning-repo/frontmatter.ts` follows the same rule
- `undefined` is reserved for absent optional fields in options bags

**Classes:**
- Use a class when state is held across calls: `WarningCollector`, `ProjectRegistry`, `ProjectRuntime`, `FileSettingsStore`, `RemoteSnapshotSource`, `InMemoryPlanningFilesystem`, `LocalFsPlanningFilesystem`
- Use plain functions for everything else

## Module Design

**Exports:** Named exports; one primary concept per file. Types that belong to a module are exported from that module (`src/server/settings-model.ts` exports `ParsedSettings`, `SettingsState`).

**Barrel Files:**
- Used in one place: `src/planning-repo/handlers/index.ts` (the handler registry)
- Otherwise import from the concrete file. Do not add new barrels

**Boundaries that are enforced by tests:**
- Only two modules may import `node:fs` under `src/` (`src/planning-fs/local-fs.ts` and `src/server/settings-store.ts`); `test/portability.test.ts` checks this
- The planning reader (`src/planning-repo/**`, `src/planning-fs/**`) is read-only and does not import the settings store
- Web code fetches the server through `src/web/api.ts` (the fetch layer referenced by the React Query hooks)

## Web (React) Conventions

**Components:**
- Function components with named exports, `.tsx` extension, JSX runtime `react-jsx` (no `import React` needed)
- `forwardRef` is used for wrapper components that forward refs to DOM elements (`src/web/nav.tsx` `Link`, `NavLink`)
- Props types are declared inline or as a local `interface`, not exported unless a test uses them

**UI primitives (shadcn base-sera):**
- Live in `src/web/components/ui/` (`button.tsx`, `dialog.tsx`, `toast.tsx`), built on `@base-ui/react` primitives
- Each primitive sets `data-slot="<name>"` on its root element
- Variants use `class-variance-authority` `cva(...)` with `variant` and `size` keys and `defaultVariants`
- Class merging uses `twMerge(clsx(...))`. Each ui file defines its own local `cn` helper (`src/web/components/ui/button.tsx`, `dialog.tsx`); do not import a shared `cn`
- Corners are squared: `rounded-none` is the base for buttons. Keep this when adding primitives

**Styling vocabulary:**
- Page and component classes are plain CSS class names defined in `src/web/styles/globals.css`, not CSS modules
- Every class used in `src/web/views`, `src/web/pages` and `src/web/components` must appear in the table of `docs/design-language.md`, or in the reserved `view-<kind>-<suffix>` namespace. `test/web/class-vocabulary.test.ts` enforces this. To add a class, add a row to `docs/design-language.md` first
- Tokens are oklch CSS custom properties (`--primary`, `--muted-foreground`, `--card-veil`, `--status-square-size`). Do not hard-code hex or hue values in components; use a token. Derive tints from existing tokens with `color-mix`
- Tone is expressed with a `data-tone="complete|in-flight|missing|quiet"` attribute on `.status-chip` / `.status-square`, not extra class names

**State and data:**
- Server state flows through `@tanstack/react-query` (`src/web/api.ts` is the single fetch layer)
- Local UI state uses `useState` and hooks; no global state library

## Server (Hono) Conventions

- One Hono app per concern: `createProjectApi` (`src/server/project-api.ts`), `createRegistryApp` (`src/server/registry-api.ts`), composed with `app.route('/api', ...)`
- Routes are thin; logic lives in `src/presentation/**` (pure view models) and `src/server/**` (I/O-adjacent)
- Every mutating or request-facing route passes through the request guard in `src/server/request-guard.ts` (Host and same-origin checks)
- Read-only is the rule: nothing writes inside a target project. The only write is Labelore's own `settings.json`, via `SettingsStore`

## Naming of Presentation Concepts

- Route and URL helpers are in `src/presentation/routes.ts` and `src/presentation/route-table.ts`; add new URL grammar there, not inline in components
- Slugs come from `src/presentation/project-slug.ts` (`slugOf`, `allocateSlug`)
- Presentation modules are pure TypeScript with no React and no `node:` imports (`src/presentation/*.ts`)

## Where to Follow These Rules

- New planning artifact type: add `src/planning-repo/handlers/<type>.ts`, register it in `handlers/index.ts`, and return `ParseWarning`s instead of throwing
- New server route: add it to the Hono app that owns the area; keep the `.ts` extension in imports
- New UI class: add the row to `docs/design-language.md` first, then use it
- New React link or navigation: use `src/web/nav.tsx`

---

*Convention analysis: 2026-11-04*

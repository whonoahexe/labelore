---
last_mapped_commit: 717c8d7db3d75717948b08690df3a087fc01684d
last_mapped_at: 2026-11-04
---
# Testing Patterns

**Analysis Date:** 2026-11-04

## Test Framework

**Runner:**
- Vitest 4.1.11 (`package.json` devDependencies)
- Config: `vitest.config.ts`
  - `include: ['test/**/*.test.ts']`
  - `setupFiles: ['test/helpers/config-dir-setup.ts']`, which gives every worker its own throwaway `LABELORE_CONFIG_DIR` (decision D-09) so no run touches the real settings file
- No `environment: 'jsdom'`. Web code is tested as text and contract scans, not rendered in a DOM (no `.test.tsx` files exist)

**E2E runner:**
- Playwright Test 1.63.0 (`@playwright/test`)
- Config: `playwright.config.ts`
- Specs: `test/e2e/*.spec.ts`

**Assertion Library:**
- Vitest's built-in `expect` (Chai-style matchers: `toEqual`, `toBe`, `toMatch`, `toThrow`, `toBeLessThan`)
- Playwright's `expect` for browser specs

**Run Commands:**
```bash
npm test                      # vitest run (all unit/contract tests)
npm run test:watch            # vitest (watch mode)
npm run test:gate             # node test/helpers/vitest-gate.mjs: fails on any skip, todo, failure, or zero tests
npm run test:gate -- test/server/refresh.test.ts   # gate a single file
npm run test:e2e              # playwright test (starts four servers, see E2E below)
npx playwright test -g "copy-path"                 # one e2e spec or title, the narrowest run
npm run typecheck             # tsc --noEmit on tsconfig.server.json and tsconfig.web.json
npm run lint                  # eslint .
npx vitest run test/web/class-vocabulary.test.ts   # one file
```

**Coverage:**
- No coverage tool or script is configured. There is no `@vitest/coverage-*` dependency and no `coverage` key in `vitest.config.ts`
- Coverage requirement: none enforced

## Test File Organization

**Location:**
- All unit and contract tests live in a top-level `test/` directory, separate from `src/`. Tests are never co-located with source
- Folders mirror the source layers:
  - `test/server/` for `src/server/**` (for example `test/server/refresh.test.ts`, `test/server/search-index.test.ts`, `test/server/settings-store.test.ts`)
  - `test/rendering/` for `src/rendering/**` (for example `test/rendering/ascii-tree.test.ts`, `test/rendering/markdown.test.ts`)
  - `test/presentation/` for `src/presentation/**` (for example `test/presentation/roadmap.test.ts`, `test/presentation/url-grammar.test.ts`)
  - `test/web/` for `src/web/**` (static contract checks, see Test Types)
  - `test/e2e/` for Playwright browser specs
  - Planning-repo handler tests sit at the root of `test/`, one per artifact type: `test/uat-session.test.ts`, `test/verification-report.test.ts`, `test/review-report.test.ts`, `test/todo-file.test.ts`
  - Root-level guards cover whole-repo rules: `test/no-skips.test.ts`, `test/portability.test.ts`, `test/token-guard.test.ts`, `test/made-up-examples.test.ts`, `test/fixture-leak.test.ts`
- Shared helpers: `test/helpers/` (see Fixtures and Factories)
- Golden outputs: `test/__golden__/` (`dense.json`), consumed by `test/snapshot.golden.test.ts`

**Naming:**
- `<subject>.test.ts`, kebab-case, matching the source module name where one exists: `test/rendering/lane-layout.test.ts` tests `src/rendering/lane-layout.ts`
- Handler guards use `<type>-handler-guard.test.ts` (for example `test/review-handler-guard.test.ts`, `test/uat-handler-guard.test.ts`)
- Playwright specs: `<feature>.spec.ts` in `test/e2e/`

**Structure:**
```
test/
├── helpers/            # shared builders, loaders, request helpers, source scanners
├── fixtures/           # made-up planning projects: lendshed/, shapes/, dashboard/, debug/, ...
├── __golden__/         # frozen snapshot JSON
├── rendering/fixtures/ # ASCII diagram fixtures (*.txt)
├── server/             # server unit tests
├── presentation/       # view-model tests
├── web/                # web contract tests (source-text scans)
├── e2e/                # Playwright specs and app-url / fixture-server helpers
└── *.test.ts           # planning-repo handler tests and root guards
```

## Test Structure

**Suite Organization:**
- `describe` groups one module or one behavior; nested `describe` for sub-behaviors. About 980 `describe(` blocks across 244 test files
- `it(` is the only test form in use. The codebase has about 4,000 `it(` blocks and no `test(` calls. Keep `it`
- `it` titles are full sentences in the past or present tense that state the observable outcome, often citing the decision or requirement they pin. Examples from the tree:
  - `it('yields three Milestone entries for a live milestone and two archived ones, each carrying its own phases', ...)`
  - `it('carries both fields separately and lets them disagree', ...)`
  - `it('falls back to the root <details> block per field when the per-milestone block leaves it empty', ...)`
- Header comment at the top of the file explains what the file pins and which IDs it covers (`test/server/refresh.test.ts`: "Pins the POST /api/refresh contract ...")

**Standard shape:**
```typescript
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/server/index.ts';
import { buildSearchDocuments, tokenizeSearchText } from '../../src/server/search-index.ts';

function waitForBuild(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('search index', () => {
  it('returns no documents for a project with no artifacts', async () => {
    // arrange with a make* builder, act, assert
    expect(buildSearchDocuments(makeProject([], [])).length).toBe(0);
  });
});
```

**Patterns:**
- Setup: builders named `make*` at the top of the file (`makeArtifact`, `makePhase`, `makeProject`, `makeSnapshot`). Each file re-declares its own builders with `Partial<T> & { path }` overrides rather than importing one shared factory. Keep that convention and spread `...overrides` last
- Teardown: `afterAll` / `afterEach` for temp directories, as in `test/web/class-vocabulary.test.ts` (`rm(tmpDir, { recursive: true, force: true })`)
- Shared `beforeEach` / `afterEach` / `beforeAll` calls: about 115 across the test tree
- Async ordering: wait for pending async index builds with `setImmediate` (`waitForBuild` in `test/server/search-index.test.ts`), not with fixed sleeps
- Assertions: prefer `toEqual` on whole structures and `toMatch` on text; use `toThrow` for the programmer-error throws listed in CONVENTIONS.md

## Test Types

**Unit tests (`test/rendering/`, `test/presentation/`, `test/*.test.ts`):**
- Pure function in, value out. Use the made-up Lendshed fixture or inline builders
- Parse behavior is tested against both realistic documents and malformed ones. Degradation tests assert the `ParseWarning` stage and salvage text, not thrown errors (see `test/degradation.test.ts`)

**HTTP / server tests (`test/server/`):**
- Build the real Hono app with `createApp(source)` or `createRegistryApp(...)` and drive it with `app.request(...)`. No real socket is opened
- Guarded requests: `guardedRequest`, `guardedHeaders`, `testPolicy` from `test/helpers/guarded-request.ts` add the allowed Host and Origin headers the request guard expects
- `test/server/start-server.test.ts` checks that `startServer` (the production entry) never constructs the test-only single-runtime wrapper

**Contract / source-scan tests (`test/web/`, `test/no-skips.test.ts`, `test/portability.test.ts`, `test/token-guard.test.ts`):**
- Read source files as text and assert structural rules. No AST tooling is used; the scanners are regex plus comment stripping
- Helpers: `blankComments` and `walkSource` from `test/helpers/source-scan.ts`; vocabulary loader and checks from `test/helpers/design-vocabulary.ts`
- Each scanner ships with a planted positive control: it writes a bad file into a `mkdtemp` folder and asserts that the scanner flags it. See `test/web/class-vocabulary.test.ts`, which writes a fixture and checks it fails
- Examples:
  - `test/web/class-vocabulary.test.ts`: every class in `src/web/views`, `src/web/pages`, `src/web/components` must be listed in `docs/design-language.md`
  - `test/web/nav-contract.test.ts`: no router link or navigate call bypasses `src/web/nav.tsx`
  - `test/web/css-source-order.test.ts`: CSS ordering constraints in `src/web/styles/globals.css`
  - `test/portability.test.ts`: only the two allowed modules import `node:fs` under `src/`

**Golden tests:**
- `test/snapshot.golden.test.ts` compares a full snapshot of the dense fixture against `test/__golden__/dense.json`
- Regenerate only when the output change is intended. Golden files are excluded from ESLint (`test/__golden__/**` in `eslint.config.js`)

**Integration tests (`test/fixture-project.test.ts`, `test/fs-equivalence.test.ts`):**
- Load a real fixture root through `LocalFsPlanningFilesystem` and `PlanningRepository`, then assert on the whole snapshot

**E2E tests (`test/e2e/`):**
- Playwright with a single `chromium` project (see `playwright.config.ts`)
- `testDir: 'test/e2e'`, `testMatch: '**/*.spec.ts'`, `fullyParallel: false`, `workers: 1`, `timeout: 60_000`, `expect.timeout: 10_000`
- Four servers start fresh on every run, each with its own temporary `LABELORE_CONFIG_DIR`:
  - port 4199: the repository itself (document-page sweep)
  - port 4198: the made-up Lendshed fixture (`test/fixtures/lendshed`), through the dev server
  - port 4197: the made-up Shapes fixture through the dev server (deep-reload spec)
  - port 4196: Shapes through the built app (`npm run build` then `npm start`)
- `reuseExistingServer: false`: Playwright never attaches to a running instance. The user's own instances on 4173 and 4174 are never touched
- Specs resolve URLs from the presentation payload (`projectApiUrl`, `artifactUrl` in `test/e2e/app-url.ts`) rather than hard-coding paths
- Run the narrowest spec or title with `-g` when iterating. A full e2e run is several minutes

## Mocking

**Framework:** Vitest `vi` (`vi.fn`, `vi.doMock`, `vi.resetModules`, `vi.stubEnv`, `vi.stubGlobal`, `vi.spyOn`). Used in 14 test files only.

**Preferred approach: fakes, not mocks.** The codebase ships in-memory implementations of its boundaries and tests use those:
- `InMemoryPlanningFilesystem` in `src/planning-fs/in-memory-fs.ts` for the planning read boundary
- `MemorySettingsStore` in `src/server/settings-store.ts` for Labelore's settings (`createApp` / `startServer` accept it through `ServerOptions.settings`)
- `createSource` and `remoteRunner` options on `ServerOptions` (tests only) replace the real local and ssh sources
- `FileSettingsStore` is always pointed at a `mkdtemp` directory in tests

**Patterns:**
```typescript
// Environment: stub, then restore
vi.stubEnv('LABELORE_CONFIG_DIR', dir);
// ...
vi.unstubAllEnvs();

// Module isolation for a module that reads env at import time
vi.resetModules();
vi.doMock('../../src/server/settings-store.ts', () => ({ ... }));
const { defaultSettingsDir } = await import('../../src/server/settings-store.ts');
vi.doUnmock('../../src/server/settings-store.ts');

// Global stub
vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')));
vi.unstubAllGlobals();
```

**What to Mock:**
- The environment (`LABELORE_CONFIG_DIR`, `VITEST`) through `vi.stubEnv`
- External process or network boundaries (ssh, fetch) through the injected option, not `vi.mock`
- Time-dependent values by passing them in (`readAt`, `mtimeMs` are set in builders)

**What NOT to Mock:**
- The planning parser, handlers, or presentation layer. Tests run them for real on fixtures
- The filesystem for planning reads. Use `LocalFsPlanningFilesystem` on a fixture root or `InMemoryPlanningFilesystem`
- Hono: use `app.request` on the real app

## Fixtures and Factories

**Made-up planning projects (required pattern):**
- Realistic but fictional GSD projects live under `test/fixtures/`: `lendshed/`, `shapes/`, `dashboard/`, `debug/`, `learnings/`, `review/`, `todos/`, `verification/`
- The rule is enforced by `test/made-up-examples.test.ts`: every file of a rule kind must carry a marker, and each marked file must appear in `test/fixtures/README.md`
  - Frontmatter form: `made_up_example: true`, `derived_from: <path under ~/.claude>`, `gsd_core_version: <version>`
  - No-frontmatter form: first line `<!-- made-up example · derived from <path> · gsd-core <version> -->`
- The frozen `fixtures/dense` root is exempt by name. This repository's own `.planning/` is exempt because it holds real planning files
- `test/fixture-leak.test.ts` and `test/no-skips.test.ts` forbid tests that reach any real project on the machine

**Fixture access:**
- `test/helpers/fixture-project.ts` exports:
  - `FX_ROOT`, `FX_PLANNING`: absolute paths to the Lendshed project
  - `fxPath(relative)` and `fxRead(relative)`: throw when the file is missing
  - `loadProject(...)`: loads a `LoadedProject` (snapshot, presentation, reference registry, body lookup)
  - `loadFiles`, `planningFiles`
- `test/helpers/shapes-project.ts`, `test/helpers/from-directory.ts`, `test/helpers/fixture-roots.ts` load the other fixture roots
- `test/helpers/note-corpus.ts`, `todo-corpus.ts`, `research-fixtures.ts`, `project-research-fixtures.ts`, `security-synthetic.ts`, `diagram-grids.ts` build corpora for specific handlers

**Missing fixtures fail, never skip:**
- `test/helpers/fixture-project.ts` throws at import when `test/fixtures/lendshed/.planning` is absent
- `playwright.config.ts` calls `resolveFixtureRoot` at load time, which throws when a fixture is missing

**Inline builders (common pattern):**
```typescript
const PHASE_IDENTITY: PhaseIdentity = {
  milestoneVersion: null,
  number: '01',
  projectCode: null,
  slug: 'identity-slice',
};
```
- Put constant identities and builder functions at the top of the test file, before the first `describe`

## Forbidden Test Constructs

Enforced by `test/no-skips.test.ts` (scans every test file, comments blanked):
- `it.skip`, `test.skip`, `describe.skip`, `.todo`, `.only`, `.fixme`, `.skipIf`, `.runIf`
- Disguised skips: `if (!existsSync(...)) return;` at the top of a test
- Absolute machine paths: `/home/<user>/codebases`, `~/Work`, `homedir()` calls, real checkout constants
- Absolute millisecond timing budgets (`expect(elapsed).toBeLessThan(<ms>)` with `performance.now`, `Date.now` or `bestOf`). Use the growth harness `test/helpers/growth.ts` for scaling checks instead
- Exemptions are a frozen list in `test/no-skips.test.ts` (four files, including `test/server/remote-source.test.ts` for a generous hang detector). Adding one is a decision, not an edit

**Gate:** `npm run test:gate` (`test/helpers/vitest-gate.mjs`) runs vitest with a JSON reporter and exits 1 when any test is failed, skipped, todo, or when zero tests run. A green plain `npm test` can hide a skip. Use the gate for "is it actually green" checks.

## Coverage

**Requirements:** None enforced. No threshold in `vitest.config.ts`.

**View Coverage:** Not configured. There is no coverage script in `package.json`.

**Practical coverage map:**
- Planning-repo handlers: one `*.test.ts` and often one `*-handler-guard.test.ts` per type under `test/`
- Presentation and rendering: one test file per module under `test/presentation/` and `test/rendering/`
- Web: contract tests in `test/web/` (118 files) instead of component tests. Gaps exist where behavior is only visible in the browser. Those are covered by `test/e2e/`

## Test Types Summary

| Type | Location | Runner | Real I/O |
|------|----------|--------|----------|
| Unit | `test/rendering`, `test/presentation`, `test/*.test.ts` | Vitest | Fixture files read through `LocalFsPlanningFilesystem` |
| HTTP | `test/server/*.test.ts` | Vitest + `app.request` | No socket; in-memory store |
| Contract (source scan) | `test/web/*.test.ts`, root guards | Vitest | Reads `src/` as text |
| Golden | `test/snapshot.golden.test.ts` | Vitest | Fixture + `test/__golden__/dense.json` |
| E2E | `test/e2e/*.spec.ts` | Playwright | Four real servers on 4196 to 4199 |

## Common Patterns

**Async Testing:**
```typescript
it('serves the project list after a refresh', async () => {
  const response = await app.request('/api/projects', guardedHeaders());
  expect(response.status).toBe(200);
  const body = (await response.json()) as ProjectListResponse;
  expect(body.projects.length).toBeGreaterThan(0);
});
```

**Error / Degradation Testing:**
```typescript
// Pattern: the body survives and the warning names the failed stage.
// WarningCollector (src/planning-repo/warnings.ts) exposes forPath(path) -> ParseWarning[].
expect(warnings.forPath(path)[0].stage).toBe('frontmatter');
```

**Throw Testing (programmer errors only, illustrative):**
```typescript
expect(() => defaultSettingsDir({ VITEST: '1' }, '/home/x')).toThrow(
  'LABELORE_CONFIG_DIR must be set when Labelore runs under vitest',
);
```

**Source-scan planted control:**
```typescript
const dir = await mkdtemp(join(tmpdir(), 'labelore-vocab-'));
await writeFile(join(dir, 'bad.tsx'), '<div className="not-in-vocabulary" />');
expect(checkTokens(dir)).toContainEqual(expect.objectContaining({ token: 'not-in-vocabulary' }));
```

## Adding a Test: Checklist

1. Pick the mirror folder (`test/server`, `test/presentation`, `test/rendering`, or root for handlers)
2. Use `it(` with a full-sentence title that names the outcome
3. Build inputs with a local `make*` builder or a fixture from `test/helpers/fixture-project.ts`. Do not reach outside `test/fixtures/`
4. Never add `.skip`, `.todo`, or an existence-based early `return`. Throw on a missing fixture
5. For a new web class, add a row to `docs/design-language.md` before the test passes
6. Run `npx vitest run <file>`, then `npm run test:gate -- <file>` before calling it done

---

*Testing analysis: 2026-11-04*

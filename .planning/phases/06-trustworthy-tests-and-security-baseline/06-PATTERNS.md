# Phase 6: Trustworthy Tests and Security Baseline - Pattern Map

**Mapped:** 2026-10-25
**Files analyzed:** 27 new/modified file groups
**Analogs found:** 24 / 27 (3 have no in-repo analog; use RESEARCH.md)

All analog paths below were checked as git-tracked source (none are `.gsd` capability mirrors).
Line numbers are from reads this session.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/planning-repo/secret-mask.ts` (new) | utility | transform | `src/planning-repo/frontmatter.ts` (`tryParseJson`) | role-match |
| `src/planning-repo/handlers/json-config.ts` (mod) | handler | transform | itself (lines 12-29) | exact |
| `src/rendering/linkify.ts` (mod, lines 20-21) | utility | transform | itself; sibling `src/planning-repo/mentions.ts` (linear regex doc) | exact |
| `src/web/views/manifest.ts` (mod, add `capOutline`, `OUTLINE_ENTRY_CAP`) | utility | transform | `outlineEntriesOf` at manifest.ts:314-316 | exact |
| `src/web/pages/artifact-page.tsx` (mod, :205, :508) | component | request-response | itself | exact |
| `src/web/components/document-outline.tsx` (mod, "+N more" row) | component | transform | itself, `OutlineList` lines 16-40 | exact |
| `src/web/styles/globals.css` or the existing global CSS (add `li[data-overflow]` rule) | config | n/a | `.document-outline a` rule (~line 4668) | role-match |
| `test/helpers/growth.ts` (new) + `growth.test.ts` | test helper | transform | RESEARCH Pattern 1 prototype | no analog |
| `test/helpers/source-scan.ts` (new, extract) | test helper | file-I/O | `test/web/class-vocabulary.test.ts:30-56` (`blankComments`) | exact |
| `test/helpers/fixture-project.ts` (new) | test helper | file-I/O | `test/helpers/todo-corpus.ts:19-25, 96-133` | exact |
| `test/helpers/{todo,note,debug}-corpus.ts` (mod, strip siblings) | test helper | file-I/O | `test/helpers/todo-corpus.ts` | exact |
| `test/helpers/studio-portal.ts` (delete) | test helper | n/a | n/a | n/a |
| `test/web/raw-html-guard.test.ts` (new) | test | file-I/O scan | `test/web/class-vocabulary.test.ts` | exact |
| `test/fixture-leak.test.ts` (new) | test | file-I/O scan | `test/web/class-vocabulary.test.ts` (positive control, 312-335) | role-match |
| `test/no-skips.test.ts` (new) | test | file-I/O scan | `test/web/class-vocabulary.test.ts` | role-match |
| `test/playwright-config.test.ts` (new) | test | config | `playwright.config.ts` | partial |
| `test/config-masking.test.ts` (new) | test | request-response | `test/server/artifact-response.test.ts` (createApp + app.request) | exact |
| `test/rendering/linkify-growth.test.ts` (new) | test | transform | `test/rendering/references.test.ts:165-175` | role-match |
| `test/web/outline-cap.test.ts` (new) + `outline-contract.test.ts` (mod) | test | transform | `test/web/outline-contract.test.ts` | exact |
| ~33 timing tests (Appendix B) | test | transform | `test/security-register.test.ts:231-241`, `test/section-projection.test.ts:593-615` | exact (convert) |
| `test/fixtures/<app>/**` (new project) | fixture | file-I/O | `fixtures/dense`, `test/fixtures/dashboard/synthetic` | role-match |
| `playwright.config.ts` (mod) | config | n/a | itself lines 17-18, 41-63 | exact |
| `test/e2e/fixture-server.ts` (new, merges four) | test helper | event-driven (spawn) | `test/e2e/todo-fixture-server.ts` | exact |
| 12 e2e specs with `STUDIO_PORTAL_AVAILABLE` (mod) | test | request-response | `test/e2e/context-brief.spec.ts` | exact |
| Corpus unit tests (~50 files, Appendix A) | test | file-I/O | `test/context-brief.test.ts` | exact (retarget) |
| Private-copy fixtures (`test/fixtures/{review,verification,learnings,notes,todos}`, `test/rendering/fixtures/*`) | fixture | file-I/O | `test/fixtures/review/clean-REVIEW.md`, `test/fixtures/learnings/synthetic-LEARNINGS.md` (already synthetic) | role-match |
| `test/target-path.test.ts` (mod, :54-57 silent return) | test | request-response | itself | exact |
| `fixtures/README.md` (mod, ledger entry) | doc | n/a | itself | exact |

## Pattern Assignments

### `src/planning-repo/handlers/json-config.ts` (handler, transform)

**Analog:** itself. Current shape (lines 6-29):

```typescript
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseJson } from '../frontmatter.ts';

const JSON_ARTIFACT_NAMES = new Set(['config.json', 'HANDOFF.json', 'estimation-calibration.json']);

export const JsonConfigHandler: ArtifactHandler = {
  kind: 'json-config',
  match: (ref) => ref.location === 'root' && JSON_ARTIFACT_NAMES.has(basename(ref.path)),
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const result = tryParseJson(raw.content);
    return {
      title: basename(ref.path),
      frontmatter: result.data,
      body: raw.content,
      warning: result.warning,
      structured: {},
    };
  },
};
```

Change: when `basename(ref.path) === 'config.json'`, mask `result.data`, set `frontmatter` to the masked object and `body = JSON.stringify(masked, null, 2) + '\n'` (trailing newline keeps `bodyHash`/`bodyLength` in the dense and sparse-started goldens unchanged). On parse failure for `config.json` do not return `raw.content`; use linear redaction of the three keys or an empty body. `HANDOFF.json` and `estimation-calibration.json` stay untouched. Keep the file's header-comment style (explains guarded parse, T-01-03).

**New `src/planning-repo/secret-mask.ts`** (copy semantics from `~/.claude/gsd-core/bin/lib/secrets.cjs:16-31`, no import):

```typescript
export const SECRET_CONFIG_KEYS: ReadonlySet<string> = new Set(['brave_search', 'firecrawl', 'exa_search']);
export function maskSecret(value: string): string {
  if (value === '') return '(unset)';
  return value.length < 8 ? '****' : `****${value.slice(-4)}`;
}
// maskValue: string -> maskSecret; array/object -> recurse; boolean/number/null unchanged (D-10)
// maskConfig: top-level keys only, exact key match (D-09)
```

Malformed-JSON redaction regex (linear): `/("(?:brave_search|firecrawl|exa_search)"\s*:\s*)"((?:[^"\\]|\\.)*)"/g`.

### `src/rendering/linkify.ts` (utility, transform)

**Analog:** itself, lines 20-21. Replace only the two unbounded restarts:

```typescript
const REFERENCE_TOKEN =
  /\.planning\/\S*[^\s.,;:!?)\]}'"]|D-\d+|Phase\s+[\p{Letter}\p{Number}.]+|[A-Z][A-Z0-9]{1,31}-\d+|\d{1,16}(?:\.\d{1,16})?-\d+/gu;
```

Keep the comment block (lines 10-19) and add one line explaining the bounds. Export `REFERENCE_TOKEN` (or a thin `scanReferenceTokens`) so the growth test can time it. Do not use the lookbehind alternative (changes 6 results in the repo corpus).

### `src/web/views/manifest.ts` + `artifact-page.tsx` + `document-outline.tsx` (outline cap)

**Analog:** `manifest.ts:308-316`:

```typescript
export function outlineEntriesOf(view: ComposedView): OutlineEntry[] {
  return view.blocks.map((block) => ({ id: block.id, label: block.label }));
}
```

Add beside it (pure, exported):

```typescript
export const OUTLINE_ENTRY_CAP = 18;
export function capOutline<T>(entries: T[]): { listed: T[]; omitted: number } { /* slice(0, 18) */ }
```

`artifact-page.tsx:205` becomes `.slice(0, OUTLINE_ENTRY_CAP)` (no "+N" row, D-15). `artifact-page.tsx:508-509` is currently:

```typescript
const rawEntries = outlineEntriesOf(composed);
const entries = rawEntries.length < 2 ? [] : rawEntries;
const activeId = useActiveSection(entries.map((entry) => entry.id));
```

Change to `capOutline(rawEntries.length < 2 ? [] : rawEntries)`, pass `omitted` to `DocumentOutline`. `outlineEntriesOf` stays uncapped so sections still render.

`document-outline.tsx` `OutlineList` (lines 16-40): add an `omitted` prop and, after the map, a plain row with no `<a>`, no className, no icon:

```tsx
<li data-overflow="true">+{omitted} more {omitted === 1 ? 'section' : 'sections'}</li>
```

`OutlineList` is shared by the wide column and the popover (lines 57, 72), so both get it. The class-vocabulary test scans `className` and `data-tone` only, so a `data-overflow` attribute needs no `docs/design-language.md` entry. Use the same CSS rule location as `.document-outline a` (font-size `var(--fs-3)`, `--muted-foreground`).

### `test/web/raw-html-guard.test.ts` (test, file-scan)

**Analog:** `test/web/class-vocabulary.test.ts`.

**Imports and root pattern** (lines 7-17):

```typescript
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
```

**Comment blanking to extract into `test/helpers/source-scan.ts`** (lines 32-56): `blankComments(source)` replaces `//` and `/* */` comments with equal-length whitespace, preserving offsets (needed because `context-brief-components.tsx:7` and `inline-markdown.ts:3` mention `dangerouslySetInnerHTML` in comments). Then update `class-vocabulary.test.ts` to import it.

**Positive control** (lines 312-335): `afterEach` removes `plantedRoot`; the test does `mkdtemp(join(tmpdir(), 'labelore-...-'))`, writes a planted file, reads it back, and asserts the scanner reports it. Plant every sink from RESEARCH's `SINKS` list. The allowlist is `{ file: 'src/web/pages/artifact-page.tsx', sink: 'dangerouslySetInnerHTML', count: 1 }` (site at `artifact-page.tsx:241`); assert exact match and that a stale allowlist entry fails.

### `test/fixture-leak.test.ts` and `test/no-skips.test.ts` (test, file-scan)

**Analog:** same class-vocabulary idiom (walker + planted mkdtemp control). Whole-word case-insensitive deny list `\b(cinedise|studio-portal|resoundant|pyedge|deid|sideby|duet|edgecan|ibis)\b` (`deid` as substring hits `nodeId`). Scan `fixtures/`, `test/fixtures/`, `test/__golden__/`, `test/rendering/fixtures/`. D-16 exemption: `fixtures/dense/**`, `fixtures/README.md`, `test/__golden__/dense.json`, each with a one-line reason, and a test that fails if the exemption list grows. `no-skips` scans `test/**` and `playwright.config.ts` for `runIf|skipIf|test.skip|it.skip|homedir(|/home/|Work/(Ibis|Cinedise|Sideby)|STUDIO_PORTAL|SP_PLANNING` and for `toBeLessThan(<number>)` near `performance.now`/`Date.now` outside the growth helper (exempt the `remote-source` hang detector). Land these LAST (Pitfall 7).

### `test/helpers/fixture-project.ts` (test helper, file-I/O)

**Analog:** `test/helpers/todo-corpus.ts`.

**Root resolution** (line 19-25):

```typescript
export const LB_ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const FIXTURES = join(LB_ROOT, 'test/fixtures/todos');
export const SYNTHETIC_ROOT = join(LB_ROOT, 'test/fixtures/dashboard/synthetic');
```

**Loaders to keep and repoint** (lines 97-149): `LoadedProject`, `loadProject(root)` (LocalFs), `planningFiles(root)` (walker; drop the `existsSync` guard so a missing tree throws), `loadFiles(map)` (InMemory). New helper exports `FX_ROOT`, `FX_PLANNING`, `fxPath()`, and throws on first use if `.planning` is missing. Corpus walkers must assert a minimum count so an empty walk cannot pass vacuously.

**Delete** from `todo-corpus.ts`: lines 1-5 comment about siblings, `homedir` import, `SIBLINGS`, `TODO_SIBLING_ROOTS`, `RESOUNDANT_ROOT`, `DUET_ROOT`/`PORTAL_ROOT` keyed entries, `sketchData`/`sketchTodoRaw`/`sketchNoteRaw` (lines 77-91; D-19, byte-for-byte provenance tests `todo-file.test.ts:38` and `todo-lifecycle-corpus.test.ts:201` are deleted, not re-pinned). `debug-corpus.ts` lines 7-26 (`CANDIDATES`, `DEBUG_SIBLING_ROOTS`, `SKETCH_FILES`) and `studio-portal.ts` go entirely.

### Corpus unit tests (retarget, Appendix A families 1-17)

**Analog:** `test/context-brief.test.ts`.

**Gate to remove** (lines 20-34):

```typescript
const SP01_PATH = `${SP_ROOT}/phases/01-portal-owned-identity-sessions/01-CONTEXT.md`;
...
it.runIf(existsSync(SP01_PATH))('parses statement, inList, outList and drift', async () => {
  const body = await readFile(SP01_PATH, 'utf8');
```

Becomes an unconditional `it(...)` reading `fxPath(...)`, with expected numbers recalculated on the fixture file (D-02). Labelore-own reads (e.g. `LB05_PATH = '.planning/milestones/v1.1-phases/05-per-type-document-views/05-CONTEXT.md'`, read through `repoBody` with `new URL(relativePath, REPO_ROOT)`) stay, and per D-18 live-path tests (project research, drawer, `ui-spec-corpus` PINNED map, plan-navigator ROWS) are re-pinned to today's files.

### Timing tests to convert (TEST-01, Appendix B)

**Analog (before):** `test/security-register.test.ts:231-241`:

```typescript
const started = performance.now();
const r = extractSecurityRegister(body);
const elapsed = performance.now() - started;
expect(r.register?.rows.length).toBe(2000);
expect(elapsed).toBeLessThan(250);
```

and `test/section-projection.test.ts:593-615` (`runs a 100k-character hostile single line ... under 200ms`). Convert to `measureGrowth({ make: (n) => ..., run: extract })` with `expect(r.ratio).toBeLessThan(24)` (n vs 8n, best of 5, warm-up). Keep the existing correctness assertion (row count) on the largest input. Build inputs outside the timed region. For capped inputs (ascii-lift, ascii-graph, ascii-tree, figure-detect) vary size below the cap or assert a flat ratio (~3) for over-cap input. `test/server/remote-source.test.ts:275-280` stays as a generous hang detector; `test/web/build-splitting.test.ts:79` is not timing.

### `test/helpers/growth.ts` + `growth.test.ts` (no in-repo analog)

Use RESEARCH Pattern 1 (`bestOf`, `measureGrowth`, factor 8, reps 5, threshold 24). `growth.test.ts` carries the planted quadratic (ratio > 24) and planted linear (ratio < 24) controls. `linkify-growth.test.ts` also keeps `LEGACY_REFERENCE_TOKEN` as a literal and asserts the harness flags it on a capitals run. Also add one end-to-end test through `rehypeResolvedReferences()` using the registry setup at `test/rendering/references.test.ts:165-175` (`buildReferenceRegistry(presentation())`) and a pin that a 40-capital prefix is not linkified while `WR-03`, `05-02`, `D-12` still are.

### `test/config-masking.test.ts` (test, request-response)

**Analog:** `test/server/artifact-response.test.ts` (header lines 1-40: `createApp` from `../../src/server/index.ts`, `app.request(...)`). Build the snapshot with `new PlanningRepository(new InMemoryPlanningFilesystem({ '.planning/config.json': text }), '/p').load()` (same constructors as `todo-corpus.ts:136-137`), `createApp(source)`, then request `/api/presentation`, the artifact route (`/api/artifacts/...`), `/api/search?q=...`, and `/api/refresh`. Assert the planted full value is absent from every response body, `****abcd` present, `firecrawl: true` stays `true`, a malformed config with a planted key does not leak, and `HANDOFF.json` is untouched.

### `playwright.config.ts` (config)

**Analog:** itself. Remove lines 1-2 `existsSync`/`homedir` gate, lines 12-18 comment and constants, and the conditional spread (lines 50-61). Replace with:

```typescript
const FIXTURE_ROOT = fileURLToPath(new URL('./test/fixtures/<app>/', import.meta.url));
if (!existsSync(join(FIXTURE_ROOT, '.planning'))) {
  throw new Error(`Browser tests need the in-repo fixture project at ${FIXTURE_ROOT}; it is missing.`);
}
// second webServer entry: command `node src/server/index.ts ${FIXTURE_ROOT} --port 4198`,
// url 'http://127.0.0.1:4198/api/dashboard', reuseExistingServer: false, timeout 90_000
```

Keep the 4199 entry (lines 42-49) as is. Never use 4173/4174. `test/playwright-config.test.ts` proves the throw (inject the path via a small exported function, since a top-level throw cannot be re-imported cheaply).

### `test/e2e/fixture-server.ts` (helper, event-driven spawn)

**Analog:** `test/e2e/todo-fixture-server.ts` (also `debug-`, `learnings-`, `note-` copies). Keep verbatim: `FIRST_PORT/LAST_PORT` 5310-5319 (lines 19-20), `portIsFree` and `firstFreePort` (22-35), `spawn('node', ['src/server/index.ts', dir, '--port', String(port)], { cwd: REPO, stdio: 'ignore' })` (87-90), the `kill`/`stop` pair with `process.once('exit', kill)` and SIGTERM then SIGKILL after 3 s (91-106), and the `/api/dashboard` readiness loop with 90 s deadline (108-124). Remove the copy-to-temp logic (45-83), `placed`, the live-001 and resoundant branches: the server is read-only, so spawn directly on `FX_ROOT` with no copy. Specs that used `placed.includes('dd')` become hard assertions.

### 12 e2e specs (`STUDIO_PORTAL_AVAILABLE`)

**Analog:** `test/e2e/context-brief.spec.ts`. Remove lines 8-9, 13-15 (`existsSync`, `homedir`, `STUDIO_PORTAL_AVAILABLE`) and every `test.skip(!STUDIO_PORTAL_AVAILABLE ...)`. Keep `const SP_BASE_URL = 'http://127.0.0.1:4198'` (rename, now the fixture server) and the `resolveFixtureUrl` pattern (lines 22-30ish), which already throws on a missing artifact: reuse as the loud-failure idiom. `planning-drawer.spec.ts` lines 84/104/123 data-conditional skips become assertions against a fixture milestone with quick tasks. `plan-page.spec.ts:216` "Planned 3 Aug 2026" must come from a frontmatter or quick-task-id date, not git/mtime (Pitfall 5).

### `test/target-path.test.ts` (mod)

**Analog:** itself, lines 50-60. The silent `return` when the fixture is not under `$HOME` must become a deterministic test: stub `HOME` (or use a tmp dir under a stubbed home) so the tilde path always resolves, with no early return.

### `test/fixtures/<app>/` (new made-up project)

**Analogs for layout:** `fixtures/dense/.planning/` (structure ledger in `fixtures/README.md`) and `test/fixtures/dashboard/synthetic` (generic "portal" wording is allowed). Layout per RESEARCH: `README.md` (provenance), `components.json`, `frontend/app/globals.css` (small oklch token block for `theme-tokens` and `ui-spec-theme` tests), and `.planning/` with PROJECT, ROADMAP, REQUIREMENTS, STATE, `config.json` (2-space JSON with trailing newline, include a masked-key case in a separate unit test rather than here), `research/{SUMMARY,STACK,FEATURES,ARCHITECTURE,PITFALLS}.md`, `phases/`, `milestones/v1.0-phases/` (shipped, with quick tasks), `quick/`, `notes/`, `todos/{pending,completed,done}`, `debug/` (plus `resolved/`). Suggested fiction: tool-lending app (RESEARCH A9). Keep every quirk per D-06/D-17: ragged diagram boxes (copy column for column, same-length substitutions), a no-frontmatter UI-REVIEW, malformed-YAML summary, a v1.0 summary with no frontmatter, `<blocking_amendments>`/`<resolved_open_question>` tags. Regenerate `test/rendering/fixtures/sketch-012-graphs.json` with the archived generator `.planning/milestones/v2.0-quick/260930-mp6-build-sketch-012-b-lanes-by-kind-as-the-/gen-sketch-golden.ts` and diff node and edge counts. Do not touch `fixtures/dense`, `sparse-*`, `dashboard/synthetic` or their goldens (D-04); `snapshot.golden.test.ts` guards that (the trailing-newline rule keeps them stable).

## Shared Patterns

### Standing scan with planted positive control
**Source:** `test/web/class-vocabulary.test.ts:312-335` and `blankComments` (30-56)
**Apply to:** raw-html-guard, fixture-leak, no-skips, playwright-config tests. Each must prove the scanner catches a planted offender written to a `mkdtemp` directory, never to `src/`.

### Fail loudly, never skip
**Source:** `test/e2e/context-brief.spec.ts` `resolveFixtureUrl` (throws when an artifact is missing) and the `playwright.config.ts` throw above
**Apply to:** `fixture-project.ts`, all retargeted corpus tests, all e2e specs. No `existsSync` decides whether a test runs.

### Read-layer repository loading
**Source:** `test/helpers/todo-corpus.ts:97-149` (`loadProject`, `loadFiles`, `planningFiles`)
**Apply to:** all corpus tests and `config-masking.test.ts`.

### Comment style
**Source:** every file opens with a short header comment stating purpose, decision IDs and constraints (see `json-config.ts:1-5`, `class-vocabulary.test.ts:1-6`). Use `.ts` import extensions (`'../frontmatter.ts'`).

### Plan ordering
Land helpers and the three source fixes first, then author the fixture and retarget families, then rewrite private fixtures, then land the leak/no-skips/guard tests and delete old helpers last (Pitfall 7).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `test/helpers/growth.ts` | test helper | transform | No growth-ratio harness exists; use RESEARCH Pattern 1 |
| `src/planning-repo/secret-mask.ts` | utility | transform | No masking code exists; copy semantics from `~/.claude/gsd-core/bin/lib/secrets.cjs` (outside repo, copy the logic, do not import) |
| `test/playwright-config.test.ts` | test | config | No test imports `playwright.config.ts` today; needs the path injectable (small exported resolver) |

## Metadata

**Analog search scope:** `src/planning-repo`, `src/rendering`, `src/web/{pages,components,views}`, `test/helpers`, `test/web`, `test/server`, `test/e2e`, `playwright.config.ts`, `fixtures/`, `test/fixtures/`
**Files read:** 14 (plus targeted line ranges of 12 more)
**Pattern extraction date:** 2026-10-25

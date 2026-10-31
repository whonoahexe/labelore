---
phase: 08-several-projects-and-a-switcher
reviewed: 2026-10-31T10:00:00Z
depth: standard
files_reviewed: 129
files_reviewed_list:
  - docs/design-language.md
  - playwright.config.ts
  - src/cli/target-path.ts
  - src/planning-fs/local-fs.ts
  - src/presentation/file-facts.ts
  - src/presentation/project-list.ts
  - src/presentation/project-slug.ts
  - src/presentation/reserved.ts
  - src/presentation/sketches.ts
  - src/server/folder-scan.ts
  - src/server/index.ts
  - src/server/project-api.ts
  - src/server/project-presentation.ts
  - src/server/project-registry.ts
  - src/server/project-runtime.ts
  - src/server/project-title.ts
  - src/server/registry-api.ts
  - src/server/request-guard.ts
  - src/server/search-index.ts
  - src/server/settings-model.ts
  - src/server/settings-store.ts
  - src/server/sketch-files.ts
  - src/web/api.ts
  - src/web/app-router.tsx
  - src/web/components/add-project-form.tsx
  - src/web/components/app-shell.tsx
  - src/web/components/plain-header.tsx
  - src/web/components/planning-places.tsx
  - src/web/components/project-add-dialog.tsx
  - src/web/components/project-row.tsx
  - src/web/components/project-scan.tsx
  - src/web/components/project-switcher.tsx
  - src/web/components/search-field.tsx
  - src/web/components/snapshot-status.tsx
  - src/web/nav.tsx
  - src/web/opened-ago.ts
  - src/web/pages/artifact-page.tsx
  - src/web/pages/dashboard-page.tsx
  - src/web/pages/document-route.tsx
  - src/web/pages/image-page.tsx
  - src/web/pages/invalid-project-screen.tsx
  - src/web/pages/not-found-page.tsx
  - src/web/pages/plan-pair-page.tsx
  - src/web/pages/project-layout.tsx
  - src/web/pages/projects-page.tsx
  - src/web/pages/research-page.tsx
  - src/web/pages/roadmap-page.tsx
  - src/web/pages/search-page.tsx
  - src/web/pages/sketches-page.tsx
  - src/web/pages/traceability-page.tsx
  - src/web/pages/unknown-project-page.tsx
  - src/web/project-path.ts
  - src/web/query-keys.ts
  - src/web/styles/globals.css
  - test/e2e-app-url.test.ts
  - test/e2e/app-url.ts
  - test/e2e/artifact-header.spec.ts
  - test/e2e/context-brief.spec.ts
  - test/e2e/debug-page.spec.ts
  - test/e2e/deep-reload.spec.ts
  - test/e2e/document-layout.spec.ts
  - test/e2e/fixture-server.ts
  - test/e2e/learnings-page.spec.ts
  - test/e2e/note-page.spec.ts
  - test/e2e/other-site.ts
  - test/e2e/pages.ts
  - test/e2e/patterns-map.spec.ts
  - test/e2e/plan-page.spec.ts
  - test/e2e/planning-drawer.spec.ts
  - test/e2e/projects-screenshots.spec.ts
  - test/e2e/projects-server.ts
  - test/e2e/projects.spec.ts
  - test/e2e/research-briefing.spec.ts
  - test/e2e/review-page.spec.ts
  - test/e2e/security-page.spec.ts
  - test/e2e/sketch-file.ts
  - test/e2e/summary-page.spec.ts
  - test/e2e/switcher.spec.ts
  - test/e2e/todo-page.spec.ts
  - test/e2e/uat-page.spec.ts
  - test/e2e/ui-review-page.spec.ts
  - test/e2e/ui-spec-page.spec.ts
  - test/e2e/validation-page.spec.ts
  - test/e2e/verification-page.spec.ts
  - test/helpers/config-dir-setup.ts
  - test/helpers/deep-link-probe.mjs
  - test/helpers/guarded-request.ts
  - test/helpers/registry-fetch.ts
  - test/playwright-config.test.ts
  - test/portability.test.ts
  - test/presentation/file-facts.test.ts
  - test/presentation/project-slug.test.ts
  - test/presentation/sketches.test.ts
  - test/server/deep-links.test.ts
  - test/server/derived-snapshot-isolation.test.ts
  - test/server/documents-route.test.ts
  - test/server/folder-scan.test.ts
  - test/server/project-registry.test.ts
  - test/server/refresh.test.ts
  - test/server/registry-api.test.ts
  - test/server/request-guard.test.ts
  - test/server/settings-disjoint.test.ts
  - test/server/settings-model.test.ts
  - test/server/settings-store.test.ts
  - test/server/sketch-files.test.ts
  - test/server/start-server.test.ts
  - test/target-path.test.ts
  - test/web/build-splitting.test.ts
  - test/web/file-pages.test.ts
  - test/web/invalid-project-contract.test.ts
  - test/web/navbar-contract.test.ts
  - test/web/not-found-page.test.ts
  - test/web/note-view-contract.test.ts
  - test/web/pattern-map-corpus.test.ts
  - test/web/plan-pair-cache.test.ts
  - test/web/project-layout.test.ts
  - test/web/project-path.test.ts
  - test/web/project-routes-match.test.ts
  - test/web/project-switcher-contract.test.ts
  - test/web/projects-page.test.ts
  - test/web/query-keys.test.ts
  - test/web/refresh-contract.test.ts
  - test/web/review-view-contract.test.ts
  - test/web/shell-contract.test.ts
  - test/web/sketches-page-contract.test.ts
  - test/web/todo-view-contract.test.ts
  - test/web/ui-spec-corpus.test.ts
  - test/web/visual-contract.test.ts
  - vitest.config.ts
findings:
  critical: 0
  warning: 17
  info: 15
  total: 32
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-10-31
**Depth:** standard
**Files Reviewed:** 129
**Status:** issues_found

## Summary

The scope was 129 files, more than the workflow's 50-file warning, so three gsd-code-reviewer lanes reviewed it in parallel: lane A (server, presentation, config: 23 files), lane B (web UI: 32 files) and lane C (tests: 74 files). This report merges them. Each finding's heading starts with its lane.

No Critical issue was found. The security-relevant paths held under review: the request guard checks Host before Origin and refuses a missing or same-site proof; the folder scan is confined to $HOME by text before any disk call and by realpath after; settings writes go to one fixed path atomically; every query key and request in `src/web` is scoped to its slug; and all user strings render as text nodes. T-08-12 was found by the security audit and fixed in 695b9d4 before this review, so it is not reported again.

The warnings are edge-case defects. Server: skipped settings entries are erased on the next write (WR-01), a font CORS header contradicts the code comments (WR-02), and a resource leak and slug-only matching in the registry (WR-03 to WR-05). Web: focus is lost, the plain header lost its brand layout, the legacy route can dead-end, and scan and add can race (WR-06 to WR-10). Tests: some assertions cannot fail, one test races another over the shared tmpdir, temp directories leak, and the corpus pins turn the suite red whenever a phase artifact lands (WR-11 to WR-17).

## Warnings

### WR-01: [A] Skipped settings entries are silently erased from the file on the next write

**File:** `src/server/settings-model.ts:143-159` (with `src/server/settings-store.ts:81-109`, `src/server/settings-model.ts:179-194`)
**Issue:** `parseSettings` drops any entry it cannot accept (bad slug, reserved slug, duplicate
slug, duplicate identity, no location) and only emits a notice. The dropped raw object is kept
nowhere in `SettingsState`. `FileSettingsStore.mutate` re-reads, applies the update and serialises
`state.projects`, so the next write removes the skipped entries from `settings.json` for good.

Every `POST /api/projects/:slug/open` calls `stampOpened` through `mutate`, so a single project
switch rewrites the file. D-12 says the only way to change a slug is to edit `settings.json` by
hand. A typo in that edit (an upper-case letter, or a reserved word such as `settings`) therefore
produces a "was skipped" notice and then deletes the entry, with its `lastOpened` and any unknown
keys, the next time any project is opened. `serializeSettings` and `readEntry` go to some trouble to
keep unknown keys on rewrite, and a skipped entry gets no such protection.

**Fix:** Keep the raw skipped entries in the parsed state and write them back unchanged.
```ts
// settings-model.ts
export interface SettingsState { /* ... */ skipped: unknown[]; }
// parseSettings: when readEntry returns { reason }, also skipped.push(raw)
// serializeSettings: projects: [...projects, ...state.skipped]
```
The skipped row stays on disk, the notice keeps firing, and the user can fix the typo.

### WR-02: [A] `Access-Control-Allow-Origin: *` on sketch fonts contradicts the documented "no CORS anywhere" posture

**File:** `src/server/sketch-files.ts:155-157` (claims at `src/server/registry-api.ts:6` and `src/server/request-guard.ts:13`)
**Issue:** Both `registry-api.ts` and `request-guard.ts` state that no `Access-Control-*` header is
ever set. `createSketchFileMiddleware` sets `Access-Control-Allow-Origin: *` on every `font/*`
response. These responses are served at `/api/projects/<slug>/sketch-files/...`, behind the guard.
But the guard lets any GET through when the Host is `127.0.0.1:<port>`, and `*` lets any website the
user visits read the bytes cross-origin.

The exposure is small: font-typed files under `.planning/sketches/`, with the slug and path
guessable. It is a deliberate hole in SEC-05's same-origin-only rule, though, and the two
comments are wrong as written. The type is chosen by file extension, so a text file named
`x.woff2` is also served with `*`.

**Fix:** Allow the header only for the sandboxed iframe's request, not for everyone.
```ts
const origin = c.req.header('origin');
if (type.startsWith('font/') && origin === 'null') headers['Access-Control-Allow-Origin'] = 'null';
```
Also add `Vary: Origin`, and correct the two comments to name this one exception.

### WR-03: [A] `load()` leaks the source (an ssh mirror) when `new ProjectRuntime` throws, and mislabels the failure as "No such path"

**File:** `src/server/project-registry.ts:670-684`
**Issue:** `source` is a `const` inside the `try`. If `createSource` succeeds (for ssh, this means a
temp mirror directory exists) and `new ProjectRuntime(source, ...)` then throws, for example from a
presentation builder choking on odd data, the `catch` builds a fresh runtime on `failedSource(...)`
and never calls `source.dispose()`. The mirror directory then lives until the process exits.

The `catch` also reports every failure, including a builder exception, as `path-not-found` ("No such
path: ... (resolved: ...)"). That is misleading on the invalid-target screen for a path that exists.

**Fix:**
```ts
let source: SnapshotSource | null = null;
try {
  source = entry.blocked && entry.failure ? failedSource(entry.failure) : await this.createSource(entry.target);
  runtime = new ProjectRuntime(source, entry.slug);
} catch (error) {
  try { source?.dispose?.(); } catch { /* best effort */ }
  // build a status that says the project could not be read, not that the path is missing
}
```

### WR-04: [A] Settings updates are keyed by slug alone, so a second Labelore instance can change another project's entry

**File:** `src/server/settings-model.ts:233-259`; call sites `src/server/project-registry.ts:563, 586, 715`
**Issue:** `forgetEntry`, `stampOpened` and `setNameHint` find the row by `slug` only. `mutate`
deliberately re-reads the file so that several instances can share it (D-11), and the CLI
auto-picks the next port so a second instance is an expected case. Take instance A holding
`portal -> /a/portal`. Instance B forgets `portal` and then adds `/b/portal`, which gets the free
slug `portal`. Instance A's `forget('portal')` now deletes B's `/b/portal` row from the file. A's
`open('portal')` and `rememberName` likewise stamp or rename B's row.

**Fix:** Match on the target as well as the slug, so the update is a no-op when the row is not the
one this instance holds.
```ts
export function forgetEntry(state, slug, target) {
  const keep = (e) => !(e.slug === slug && e.target === target);
  ...
}
```
Pass `entry.target` from the registry in the same way for `stampOpened` and `setNameHint`.

### WR-05: [A] `blankEntry` silently replaces an existing in-memory entry that has the same slug

**File:** `src/server/project-registry.ts:323` (reached from `src/server/project-registry.ts:488-517`)
**Issue:** `blankEntry` does `this.entries.set(slug, entry)` with no collision check. In `addNow`,
the fresh-slug path allocates against `taken`, which includes `this.entries.keys()`, so it is safe.
The `addedFromFile` duplicate path is not. `addEntry` returns the file row's existing slug without
looking at `this.entries`. If another instance wrote that slug for a different target, this
instance's own live entry with that slug is overwritten. Its runtime, which may hold an ssh mirror,
is never disposed and is lost to `evictOverCap`, `forget` and `dispose`. This is the same
two-instance case as A-WR-04.

**Fix:** In `addNow`, when `addedFromFile` is true and `this.entries.has(slug)` names a different
identity, dispose and remove that stale entry first, or fall back to a fresh `allocateSlug` and
persist that. As a backstop, make `blankEntry` throw or dispose when it would overwrite.

### WR-06: [B] Select all and Clear selection hand focus to a button that is still disabled

**File:** `src/web/components/project-scan.tsx:180-189` (disabled conditions at 273 and 282)
**Issue:** `selectAll()` and `clearSelection()` call `.focus()` on the sibling button synchronously,
before React has re-rendered. At that moment the sibling's `disabled` prop still reflects the old
state, and a disabled button cannot take focus.

- Right after a scan every selectable project is checked, so "Select all projects" is disabled
  (`picked.length === open.length`) and "Clear selection" is enabled. Pressing Clear calls
  `selectAllRef.current?.focus()` on the disabled button, which is a no-op. Clear then becomes
  disabled, so focus drops to `<body>`.
- Pressing Select all from an empty selection has the same failure in the other direction, because
  Clear is still disabled when `clearRef.current?.focus()` runs.

Keyboard and screen-reader users lose their place in the checklist on the most common path. The code
comment ("the other one is the next thing a person may want") shows the intent, but the timing defeats it.
**Fix:** Move focus after the commit, or avoid `disabled` on these two controls.
```tsx
const [focusNext, setFocusNext] = useState<'all' | 'clear' | null>(null);
useEffect(() => {
  if (focusNext === 'clear') clearRef.current?.focus();
  if (focusNext === 'all') selectAllRef.current?.focus();
  if (focusNext !== null) setFocusNext(null);
}, [focusNext]);
// selectAll():       setChecked(...); setFocusNext('clear');
// clearSelection():  setChecked(new Set()); setFocusNext('all');
```
Alternatively wrap the state update in `flushSync` before calling `.focus()`.

### WR-07: [B] The plain header's brand link lost its grid placement and margins

**File:** `src/web/styles/globals.css:476-495` (the diff moved the rules), `src/web/components/plain-header.tsx:11`
**Issue:** Phase 8 moved `grid-area: brand`, `justify-self`, `align-self` and the
`margin: var(--space-3) var(--space-fluid-4) var(--space-3) var(--space-2)` from `.brand` to the new
`.brand-lockup` (and the matching mobile margin at about line 3884). `PlainHeader` still renders
`<AppLink className="brand">` directly inside `.shell-header`, with no `.brand-lockup` wrapper. That
header is used by the landing page, the unknown-project page, `LegacyRoute` and
`ProjectLayoutNotice`.

`.brand` now has only `flex: none; gap; text-decoration`. On the plain header it is therefore
auto-placed into the first free grid cell, which is the `auto`-width `menu` column. It has none of
the brand's former vertical and horizontal margin, so the mark sits flush against the header edge. It
is also no longer aligned like the project shell's header, which is the one the sketch loop was
checked against.

I did not take a screenshot, so the visual outcome is inferred from the CSS. The CSS diff makes the
regression plain, and `test/web/projects-page.test.ts` only asserts markup, not layout.
**Fix:** Wrap the plain header's link in the same lockup so it picks up the same rules.
```tsx
<div className="brand-lockup">
  <AppLink className="brand" to="/" aria-label="Labelore — all projects">…</AppLink>
</div>
```
Alternatively keep a `.shell-header > .brand` rule that restores `grid-area: brand; justify-self: start; align-self: center; margin: …`.

### WR-08: [B] `LegacyRoute` spins forever when the first project's presentation fails

**File:** `src/web/app-router.tsx:197-218`
**Issue:** `presentation` is an enabled `useQuery`, but only `list.isError` and `loaded` are handled.
If the presentation request errors (server down after the list loaded, project forgotten in another
tab so it 404s, or a 5xx), `loaded` stays `undefined`. The function falls through to
`<PlainPage><RouteFallback /></PlainPage>` and the user sees a loading state with no end and no way
out except the brand link. A bookmark of an old un-prefixed address (the exact case NAV-11 supports)
is the entry point.
**Fix:**
```tsx
if (presentation.isError) return <Navigate replace to="/" />;
// or render a PlainPage notice with a link to the landing page
```

### WR-09: [B] The module-level `focusMainOnNextMount` flag can outlive the navigation that set it

**File:** `src/web/components/project-switcher.tsx:23, 134-144`
**Issue:** `onPopupClick` sets the module-level flag for any anchor click in the popup whose `href`
is not `/` or the current project. It does this regardless of what happens next, and the flag is
only cleared when some `ProjectSwitcher` next mounts. These cases leave it set:

- A modified click (Ctrl, Cmd, middle-click, Shift). `AppLink` deliberately lets the browser handle
  it, so the router never navigates. The popup still closes and the flag stays set.
- A switch to a project that resolves to `InvalidProjectScreen` or `UnknownProjectPage`, neither of
  which mounts a switcher.

The next unrelated mount of a shell (for example landing page to project via a row link) then pulls
focus into `#main-content` unexpectedly. It also fails to clear if the target never loads.
**Fix:** Set the flag only for a plain click (`event.button === 0` and no modifier keys), and clear
it when the router location settles or on a short timeout. A cleaner option is to carry the intent in
router navigation state (`navigate(href, { state: { focusMain: true } })`) so it cannot go stale.

### WR-10: [B] A scan started while an add is in flight inherits that add's late result

**File:** `src/web/components/project-scan.tsx:120-132, 143-157`
**Issue:** The Scan button is disabled only by `scan.isPending`, not by `add.isPending`.
`submit()` clears the checklist state and calls `add.reset()`, but the earlier `add` mutation's
`onSuccess` is a callback in `useMutation`'s options. It still runs when the request resolves, after
`reset()`. It then writes `addedNow`, `checked`, `skipped` and `done` using the old `targets` into the
new scan's state. The new checklist can show "Added 2 projects…" and can mark unrelated rows as
already added or hide boxes. The window is narrow (a second scan while "Adding…" is shown) but real,
and the status line takes focus from the stale `done`.
**Fix:** Disable the scan submit while `add.isPending`, or tag each scan with a generation counter
held in a ref and ignore `onSuccess` when the generation no longer matches.

### WR-11: [C] "Requests nothing" assertions can never fail (static render never runs queries)

**File:** `test/web/project-layout.test.ts:186-202`, `test/web/file-pages.test.ts:238-249`
**Issue:** These tests render with `renderToStaticMarkup` and then assert that `fetchSpy` was never called and that the `projectKey('nope','presentation')` query is idle with no data. A static render never subscribes observers, so react-query never calls a `queryFn`; a standalone `useQuery` rendered the same way also makes 0 calls. If the layout regressed into fetching a presentation for an unlisted slug (PLAT-08, D-07), these assertions would still pass. Only the markup assertions can fail.
**Fix:** Render into jsdom with `createRoot` and flush effects, or test the query-enabling predicate (`enabled: listed`) directly. Until then, drop the fetch-spy assertions and the "requests nothing" test names.

### WR-12: [C] The "reach every route" test forgets lendshed partway, so most routes answer 404

**File:** `test/server/registry-api.test.ts:379-388`
**Issue:** The loop sends `DELETE /api/projects/lendshed` early. After it returns 200, `POST /:slug/open`, every project GET route, `refresh` and `files` all answer 404 "Unknown project". The only assertion is "status is not 403 or 415", so a 404 passes. The test proves only that the guard lets the request through. It never reaches the project handlers it claims to reach.
**Fix:** Move the DELETE to the end, or give each route its own registry. Then also assert that a registered slug's status is not 404.

### WR-13: [C] Two test files diff the shared tmpdir for `labelore-remote-*` and run in parallel

**File:** `test/server/project-registry.test.ts:246-271` (new in Phase 8), `test/server/remote-source.test.ts:39-77`
**Issue:** Each file takes a snapshot of every `labelore-remote-*` entry in `tmpdir()` in `beforeEach` and asserts that no new entries appear. Vitest runs the two files in separate workers at the same time. A directory the other file created (`remote-source.test.ts` creates them at :188 and :231) can show up as a "leftover" and fail the run at random.
**Fix:** Assert only on the directories this test created, which the fake runner already records in `destDirs`.

### WR-14: [C] `playwright-config.test.ts` leaks four temp directories per run

**File:** `test/playwright-config.test.ts:12` (imports `playwright.config.ts:30-44`)
**Issue:** `serverEnv()` calls `mkdtempSync` every time the config is loaded. The directories are removed only in `process.on('exit')`, and vitest workers do not reliably run that handler. One run raised the `/tmp/labelore-pw-*` count from 52 to 56. The same happens for every Playwright worker that loads the config (IN-04 covers the misleading comment in the config).
**Fix:** Create the directories lazily, or in `globalSetup` with a matching `globalTeardown`. Have the config test clean up in `afterAll`.

### WR-15: [C] The "settings-store imports nothing from the planning reader" check misses multi-line imports

**File:** `test/portability.test.ts:385-395`
**Issue:** The line filter keeps only single-line `import ... from` statements. An import written across several lines (`import {\n  LocalFsPlanningFilesystem,\n} from '../planning-fs/local-fs.ts';`) gets past it, so the D-19 gate has a hole. It passes today only because `settings-store.ts` writes every import on one line.
**Fix:** Run a multiline pattern over the whole comment-stripped source, e.g. `/\b(?:import|export)\b[^;]*?\bfrom\s+['"]([^'"]+)['"]/gs`. Assert on each specifier it captures, and on the `PlanningFilesystem` token appearing anywhere in the file.

### WR-16: [C] Corpus pins are hand-maintained against the live `.planning/`, so each new phase artifact turns the suite red

**File:** `test/web/ui-review-corpus.test.ts:189,194`, `test/web/security-console-corpus.test.ts:196` (and the sibling corpora)
**Issue:** After `08-UI-REVIEW.md` and `08-SECURITY.md` were committed during verification, `npx vitest run` failed 3 tests with "unpinned" errors. Plan 08-15 pinned `08-UI-SPEC` and `08-PATTERNS` by hand. Any later phase artifact (this REVIEW.md, the disposition, VERIFICATION.md) trips the same check. Phase 7's review recorded the same problem as its WR-04.
**Fix:** Pin the new phase 8 documents before the phase closes. Longer term, have the "nothing unpinned" check exempt the phase in progress, or pin only phases archived with their milestone.

### WR-17: [C] The "marks only the current project" assertion cannot tell lendshed's row from the first row

**File:** `test/web/project-switcher-contract.test.ts:105-111`
**Issue:** The test asserts only that `href="/lendshed"` appears after the first `aria-current="true"`, plus counts. With the list `[shapes, lendshed, kiln]`, putting `aria-current` on the shapes row (the wrong one) also passes.
**Fix:** Split the markup on `class="project-row"` and assert that the chunk containing `href="/lendshed"` is the one carrying `aria-current`.

## Info

### IN-01: [A] `restore()` keeps a saved local target's identity as written, not as its realpath

**File:** `src/server/project-registry.ts:339-362` (with `src/server/project-registry.ts:210-213`)
**Issue:** D-11 makes the canonical path the identity. `identityOfTarget` returns a local target
unchanged, and `restore` canonicalises only to run the settings-folder check. A hand-edited or
relocated target such as `~/work/portal` keeps that identity. A later `add` of the same folder
resolves to `/home/u/work/portal`, does not match, and creates `portal-2` for one project.
`scan`'s `alreadyAdded` misses it too.
**Fix:** In `restore`, use the canonical root as the identity when `canonicalizePath` succeeds.

### IN-02: [A] `--port=` with an empty value silently picks a random port

**File:** `src/server/index.ts:219-221`
**Issue:** `Number('')` is `0`, which passes the integer and range check, and `autoPort` becomes
`false`. `--port=` (an unset shell variable) starts on an OS-chosen port with no warning, while
`--port ""` throws.
**Fix:** Reject an empty value, as the `--port` branch does: `if (!value) throw new Error('--port requires a numeric value')`.

### IN-03: [A] Stale comment on `SketchRow.viewUrl`

**File:** `src/presentation/sketches.ts:38`
**Issue:** The comment says `/sketches/<folder>/ on the server`. `sketchViewUrl` now returns the
project-relative `/sketch-files/<folder>/`, which the web prefixes with the project API base.
**Fix:** Update the comment to `/sketch-files/<folder>/ (project-relative)`.

### IN-04: [A] The Playwright config creates temp directories in every process that loads it, and the comment says otherwise

**File:** `playwright.config.ts:30-43`
**Issue:** `serverEnv` runs `mkdtempSync` at config load, in every worker process as well as the
main one. Only the main process registers the `exit` cleanup, so each worker load leaves four
`labelore-pw-*` directories behind. The comment says a worker "leaves them alone".
**Fix:** Create the directories lazily, only when `TEST_WORKER_INDEX === undefined`, or register
cleanup in every process.

### IN-05: [A] `displayPath` in the list is shortened against the uncanonicalised home

**File:** `src/server/project-registry.ts:608`
**Issue:** Targets are realpaths, but `homeShortened(entry.target, this.home)` uses
`os.homedir()` as given. When `$HOME` is itself a symlink, rows show the full path while scan
results (which use `canonicalHome`) show `~/...`.
**Fix:** Canonicalise the home once in the constructor and use it for the list as well.

### IN-06: [A] A corrupt settings file's backup is overwritten, and the "kept as .bak" notice is shown even if the rename failed

**File:** `src/server/settings-store.ts:134-140`
**Issue:** `renameSync(this.file, settings.json.bak)` replaces any earlier backup, so a second
corruption destroys the first backup. When the rename throws, the code still returns
`NOTICE_UNREADABLE`, which says the old file was kept as `settings.json.bak`.
**Fix:** Use a timestamped backup name, and pick the notice text by whether the rename succeeded.

---

_Reviewed: 2026-10-31_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

### IN-07: [B] Forgetting the open project navigates before the list cache is invalidated

**File:** `src/web/components/project-row.tsx:72-78`
**Issue:** `onSuccess` calls `navigate('/')` (flush-synced) before `await invalidateQueries(projectsKey)`.
The landing page mounts with the previous list still in cache. `staleTime: 0` forces a refetch, but
for one paint the just-forgotten project is still listed with its forget button.
**Fix:** Invalidate (or `setQueryData` to remove the entry) first, then navigate. Or drop the entry
with `queryClient.setQueryData(projectsKey, …)` before navigating.

### IN-08: [B] The unknown-project page can flash from a stale cached list

**File:** `src/web/pages/project-layout.tsx:64-67, 87-95, 107-108`
**Issue:** `projects` comes from `list.data` even while a `staleTime: 0` refetch is in flight. A slug
added by another tab or run, and opened in this tab once the list had been cached, renders
"No project called …" until the refetch lands, then flips to the project. Gate the `unknown` outcome
on `!list.isFetching`, or treat `unknown` plus `list.isFetching` as `loading-list`.

### IN-09: [B] The invalid-project screen's restart hint no longer matches the multi-project model

**File:** `src/web/pages/invalid-project-screen.tsx:13, 100`
**Issue:** The screen offers "Restart with a corrected path" (`npm run dev -- /path/to/your/project`).
Since Phase 8, most unavailable projects were added from the landing page or a scan, and the fix is
to forget and re-add them, not to restart. The screen also gives no forget action beside "Choose
another project". D-10 puts forgetting on the rows, so it is reachable, but a one-line pointer
("Forget it from the project list and add the folder again") would remove the dead end.

### IN-10: [B] `apiFetch` success path can throw a bare `SyntaxError` instead of an `ApiError`

**File:** `src/web/api.ts:85`
**Issue:** `return (await response.json()) as T` is outside the `try`. A 200 with a non-JSON body
(an HTML fallback from a reverse proxy, an empty 204 on a future route) throws a raw `SyntaxError`.
Callers that branch on `error instanceof ApiError` (`failureOf`, `failureText`) treat it as
"unreachable", and queries surface a parser message. Wrap it and rethrow as
`new ApiError('http', 'Labelore sent an unreadable answer.', response.status, null)`.

### IN-11: [B] `RouteError` on `/` says "Return to the dashboard" but links to `/`

**File:** `src/web/app-router.tsx:105`
**Issue:** On the landing route there is no project slug, so `Link to={presentationRoutePatterns.dashboard}`
resolves to `/`, which is the page that just failed. The copy is also wrong (there is no dashboard
there). Use `AppLink to="/"` with "Return to the projects list" when no `:project` param exists.

---

_Reviewed: 2026-10-31_
_Reviewer: Claude (gsd-code-reviewer), lane B_
_Depth: standard_

### IN-12: [C] The "forbidden text" precondition checks the wrong relation

**File:** `test/e2e/projects.spec.ts:149-150`
**Issue:** `expect(text).not.toContain(portal.name)` checks the lendshed strings, but that does not protect the leak check that follows. A name collision would cause a spurious failure, not a false pass.
**Fix:** Assert the reverse (the portal name does not contain the lendshed strings), or drop the line.

### IN-13: [C] Fixed sleeps in two specs

**File:** `test/e2e/projects.spec.ts:361`, `test/e2e/projects-screenshots.spec.ts:143`
**Issue:** `waitForTimeout(1000)` is used to show that "tab A makes no request", which proves less on a slow machine. `waitForTimeout(250)` adds nothing on top of `animations: 'disabled'` and `document.fonts.ready`.
**Fix:** Wait on a positive signal, such as tab B's list refetch settling, before asserting.

### IN-14: [C] `hrefOf` is not anchored at the start

**File:** `test/e2e/app-url.ts:96-99`
**Issue:** The `RegExp` built from the pathname has no `^`, so `/other-project/<same path>` also matches. `exactUrl` is anchored.
**Fix:** Prefix the pattern with `^`.

### IN-15: [C] Two small helper gaps

**File:** `test/helpers/registry-fetch.ts:13-18`, `test/web/query-keys.test.ts:94-100`
**Issue:** `installRegistryFetch` takes the method and headers from `init` only, ignoring those on a `Request` argument. The `query-keys` scan works line by line, so a `setQueryData(\n ['x'], ...)` call split across lines gets past rule 1.
**Fix:** Merge the `Request`'s own method and headers in the helper, and run the scan over the whole blanked text with the `s` flag.

---

_Reviewed by gsd-code-reviewer (three parallel lanes, merged by the execute-phase orchestrator)._
_Depth: standard_

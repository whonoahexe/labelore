---
phase: 11-exploration-handoff-report-and-workstream-pages
reviewed: 2026-11-07T00:00:00Z
depth: standard
lanes: 4 (parallel gsd-code-reviewer agents over the phase diff since dfa0c4e, merged by the orchestrator)
files_reviewed: 82
files_reviewed_list:
  - src/domain/model.ts
  - src/planning-fs/scoped-fs.ts
  - src/planning-repo/discovery.ts
  - src/planning-repo/folders.ts
  - src/planning-repo/handlers/index-intel-lift.ts
  - src/planning-repo/handlers/index-intel.ts
  - src/planning-repo/handlers/index.ts
  - src/planning-repo/handlers/onboarding.ts
  - src/planning-repo/handlers/pause-lift.ts
  - src/planning-repo/handlers/pause.ts
  - src/planning-repo/handlers/reports-lift.ts
  - src/planning-repo/handlers/reports.ts
  - src/planning-repo/handlers/seed-thread-lift.ts
  - src/planning-repo/handlers/seed-thread.ts
  - src/planning-repo/handlers/spikes-lift.ts
  - src/planning-repo/handlers/spikes.ts
  - src/presentation/drawer.ts
  - src/presentation/file-facts.ts
  - src/presentation/indexes-context.ts
  - src/presentation/onboarding-context.ts
  - src/presentation/pause-context.ts
  - src/presentation/project-map-state.ts
  - src/presentation/roadmap.ts
  - src/presentation/seed-thread-links.ts
  - src/presentation/spikes-context.ts
  - src/presentation/workstream-index.ts
  - src/server/index-bounds.ts
  - src/server/index-summary.ts
  - src/server/index.ts
  - src/server/project-api.ts
  - src/server/project-presentation.ts
  - src/server/project-registry.ts
  - src/server/project-runtime.ts
  - src/server/registry-api.ts
  - src/server/workstreams.ts
  - src/web/api.ts
  - src/web/app-router.tsx
  - src/web/components/app-shell.tsx
  - src/web/components/copy-path-button.tsx
  - src/web/components/planning-places.tsx
  - src/web/components/project-row.tsx
  - src/web/components/record-disagreement.tsx
  - src/web/components/scope-chip.tsx
  - src/web/components/search-field.tsx
  - src/web/components/snapshot-status.tsx
  - src/web/nav.tsx
  - src/web/pages/artifact-page.tsx
  - src/web/pages/dashboard-page.tsx
  - src/web/pages/document-route.tsx
  - src/web/pages/file-details-page.tsx
  - src/web/pages/image-page.tsx
  - src/web/pages/plan-pair-page.tsx
  - src/web/pages/project-layout.tsx
  - src/web/pages/research-page.tsx
  - src/web/pages/roadmap-page.tsx
  - src/web/pages/search-page.tsx
  - src/web/pages/sketches-page.tsx
  - src/web/pages/traceability-page.tsx
  - src/web/pages/workstream-index-page.tsx
  - src/web/project-path.ts
  - src/web/query-keys.ts
  - src/web/route-dispatch.ts
  - src/web/styles/globals.css
  - src/web/views/forensics-page-components.tsx
  - src/web/views/forensics-page.ts
  - src/web/views/indexes-page-components.tsx
  - src/web/views/indexes-page.ts
  - src/web/views/kinds.ts
  - src/web/views/manifest.ts
  - src/web/views/manifests.ts
  - src/web/views/onboarding-page-components.tsx
  - src/web/views/onboarding-page.ts
  - src/web/views/pause-page-components.tsx
  - src/web/views/pause-page.ts
  - src/web/views/report-page-components.tsx
  - src/web/views/report-page.ts
  - src/web/views/seed-page-components.tsx
  - src/web/views/seed-page.ts
  - src/web/views/spikes-page-components.tsx
  - src/web/views/spikes-page.ts
  - src/web/views/thread-page-components.tsx
  - src/web/views/thread-page.ts
findings:
  critical: 0
  warning: 18
  info: 23
  total: 41
status: issues_found
---

# Phase 11 code review

The phase changed 82 source files (about 21,700 added lines), so the review ran as four parallel lanes over the
diff since the phase began (dfa0c4e). Finding ids carry their lane prefix (L1, L2A, L2B, L3). No critical
finding and no security vulnerability was found in any lane.

# Lane L1 — server, lifts and the workstream scope adapter

# Phase 11 (lane 1: server, lifts, workstream scope adapter): Code Review Report

**Reviewed:** 2026-11-07
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

The lane is carefully built. Containment holds in the places most likely to fail:
- Workstream names are validated by `isValidScopeName` and then matched against the listing before they become path segments.
- `ScopedPlanningFilesystem` rejects `..` and `.` segments, hides the root `workstreams/` folder, and delegates every read to the parent port.
- `readBytesWithin('.planning', ...)` keeps other workstreams unreachable.
- The graph scanner validates `built_at_commit` against a hex pattern before git sees it, and passes `--`.
- Spike scripts are classed `listed` before any head sniff, so no byte of them is read.
- The handlers read author keys through `Object.hasOwn` and cap their output.

I found no security vulnerability and no data-loss path. I did find four warnings:
- one quadratic-time regex on file content;
- one incorrect figure on workstream dashboards (Pace);
- one inventory/route inconsistency;
- one sketch-serving failure in scoped mode.

There are also five lower-severity items.

## Warnings

### L1-WR-01: Quadratic `^\s*` multiline regexes in `extractSynthesis` can freeze the event loop on a large whitespace-heavy file

**File:** `src/planning-repo/handlers/index-intel-lift.ts:397-408`
**Issue:** Four patterns are run against the whole file text with the `m` flag and a leading `^\s*`:
- `Docs synthesized`
- `Documents synthesized`
- the global `typeRow` loop
- `conflictLine`

`\s*` also consumes newlines. Every line start therefore rescans the following run of blank lines, which makes a blank-line-heavy file O(n²). I measured the first pattern on `"\n".repeat(n)`:

| n | time |
|---|---|
| 20,000 | 225 ms |
| 40,000 | 920 ms |
| 80,000 | 3,686 ms |

The file only has to be class `text` (up to 1 MiB, `MAX_TEXT_BYTES`) and named `SYNTHESIS.md`, which is `intelKindOf`'s `synthesis` kind. Extrapolating, a 1 MiB file is minutes per regex, four regexes. Parsing runs synchronously during `load()` and `refresh()`, so the whole server stalls. This is not a normal file shape, so I kept it at WARNING. It still breaks the project rule that unknown input must degrade rather than break, and the same module otherwise takes care to avoid this class of problem. The `reportLineChars` filter, the line-by-line scans and the "no regular expression" comments all show that intent.
**Fix:** Scan line by line and use `[ \t]*` instead of `\s*`:
```ts
function lineValue(lines: string[], re: RegExp): number | null {
  for (const line of lines) {
    const m = re.exec(line.length > 400 ? line.slice(0, 400) : line);
    if (m) { const n = Number(m[1]); if (Number.isSafeInteger(n)) return n; }
  }
  return null;
}
const lines = text.split('\n');
const documents = lineValue(lines, /^[ \t]*(?:[-*][ \t]*)?Docs synthesized:[ \t]*(\d+)/i)
  ?? lineValue(lines, /^[ \t]*(?:[-*][ \t]*)?Documents?(?: synthesized)?:[ \t]*(\d+)/i);
// typeRow: same per-line loop with /^[ \t]*[-*][ \t]*(ADR|SPEC|PRD|DOC|UNKNOWN)s?[ \t]*[:x×-][ \t]*(\d+)\b/i
// conflictLine: find the first line matching /^[ \t]*(?:[-*][ \t]*)?Conflicts:[ \t]*(.*)$/i
```

### L1-WR-02: Workstream-scoped Pace attributes commits by `(NN-MM)` subject across the whole repository

**File:** `src/server/project-runtime.ts:105` (consumer: `src/server/project-api.ts:313-315`, `src/server/commit-times.ts:56-60,89-130`)
**Issue:** A scoped runtime builds its own `createCommitLog(rootPath)`, the full repository `git log`. `applyCommitTimes` matches a commit to a plan only by the `type(NN-MM)` scope in the subject. Each workstream has its own `phases/` with its own numbering, so `feat(01-02)` can exist in several workstreams, and in the flat root's history as well. The result is wrong:
- Every scoped dashboard counts the other workstreams' commits as its own plan's commits.
- The elapsed-time gaps are summed across them.
- `timing: 'commits'` and `approx: false` are then asserted for numbers that are not that workstream's.
- Each scope also reads and caches its own copy of the 16 MiB log.

The `owners.length > 1` disambiguation only helps when one scope has repeated plan ids. It does not help across scopes.
**Fix:** Do not let a scoped runtime claim commit-derived timing it cannot attribute. The simplest route is to hand scoped runtimes a no-history log, so `applyCommitTimes` falls back to the SUMMARY durations marked `approx`:
```ts
// createScoped
const noHistory: CommitLog = { load: async () => null, reset() {} };
const runtime = new ProjectRuntime(repository, this.slug, noHistory, this.runGit, { name, realPathOf });
```
Alternatively, restrict commits to those touching `.planning/workstreams/<name>/` (`git log -- <path>`) in the scoped log.

### L1-WR-03: Folders with a name outside the workstream grammar are listed as `kind: 'folder'` but can never be opened

**File:** `src/server/workstreams.ts:197-240` (with `src/server/project-runtime.ts:157-160`)
**Issue:** `inspectWorkstream` builds an entry for every non-dot directory under `workstreams/` and does not check `isValidWorkstreamName`. This is despite the header comment saying a name is a path segment only after that check. Directory names such as `my stream`, `-x` or `é` get `kind: 'folder'` with status, progress and phase counts, so the page presents them like any other workstream. Opening one issues `/ws/<name>`. `workstreamRuntime` returns null at `isValidWorkstreamName`, so the API answers 404 `Unknown project`. The active pointer has the opposite behaviour: it is rejected for an invalid name, so a pointer naming such a folder reads `absent`, not `present`. The inventory therefore advertises workstreams the server will refuse to scope.
**Fix:** Make the inventory and the route agree. Either mark the entry as not scopable (for example `kind: 'file'` or a new `kind: 'unscoped'`, rendered dashed, with no link), or validate once in `inspectWorkstream`:
```ts
if (!entry.isDirectory || !isValidWorkstreamName(name)) {
  return { name, kind: 'file', /* ...dashed row, no scope */ };
}
```

### L1-WR-04: Sketch files fail in a scope that has its own `sketches/` folder while some sketches live in the shared root

**File:** `src/planning-fs/scoped-fs.ts:68-72`
**Issue:** The scoped `readBytesWithin` resolves the base directory and the file independently:
```ts
readBytesWithin(await this.resolveFile(baseRelDir), await this.resolveFile(relPath))
```
Both are `either` targets, so each picks the workstream copy only if that exact path exists. The scope's merged `list` shows root sketches next to the workstream's own. Take a workstream that has `workstreams/x/sketches/` and a sketch that lives only in `.planning/sketches/foo/`:
- The base `.planning/sketches` resolves to `workstreams/x/sketches`.
- The file `.planning/sketches/foo/index.html` resolves to the root copy, because the workstream copy does not exist.
- The parent then sees a file outside the confined base and throws `PathEscapeError`, so the sketch route fails.

This only affects workstreams that carry their own `sketches/` folder, but it silently breaks a listed artifact.
**Fix:** Resolve the file first, then derive the base from the file's resolved origin. Alternatively, try the workstream pair and the root pair as whole units:
```ts
this.readBytesWithin = async (baseRelDir, relPath) => {
  const file = await this.resolveFile(relPath);
  const base = file.startsWith(`${this.base}/`) ? realBaseInWorkstream(baseRelDir) : baseRelDir;
  return readBytesWithin(base, file);
};
```

## Info

### L1-IN-01: `children` can retain a disposed runtime after a refresh races a creation

**File:** `src/server/project-runtime.ts:196-205,230-243`
**Issue:** If `resetScopes()` runs while `createScoped` is awaiting `repository.load()`, the child is disposed by the `stale` handler. The creation continuation then does `this.children.add(runtime)` on the already-cleared set. The disposed runtime, with its whole presentation and search index, stays referenced until the next reset. This is harmless to correctness, because `createProjectApi` re-resolves on `disposed`, but it is a leak and it makes `isBusy()` iterate a dead entry.
**Fix:** In `createScoped`, re-check after the await that the pending entry is still current, and skip `children.add` otherwise (`if (this.scoped.get(name) !== pending) { runtime.dispose(); return null; }`). Alternatively, have `dispose()` remove the child from the parent's set.

### L1-IN-02: Scope constants are duplicated across the adapter and the inventory

**File:** `src/server/workstreams.ts:14-18` and `src/planning-fs/scoped-fs.ts:15-18`
**Issue:** `MOVED` (adapter) and `MOVED_NAMES` (inventory) encode the same GSD fact, "the names a migration moves", as two independent literals. `WORKSTREAMS_DIR` is also duplicated. If GSD adds a moved name, one copy will be missed.
**Fix:** Export the list from `scoped-fs.ts` (`export const MOVED_NAMES = [...] as const`) and import it into `workstreams.ts`.

### L1-IN-03: Graph summary silently drops `graph.json` from the page in two cases

**File:** `src/server/index-summary.ts:536-550,571-577`
**Issue:** `graph.json` is excluded from the `others` list because it is a "named" file, and `unnamedReads` only re-adds the report and the status file. If `graph.json` is class `binary`, it is neither scanned nor listed under "Not sent". If it exceeds the cap while the report already has counts and hubs (`reportHasEverything`), the too-large branch pushes no `unreadable` entry and the file is not listed either. The 96 MiB file the page exists to summarise can vanish from the page with no explanation. Separately, the `once` helper comment says a rejected promise is never cached, but `once` does cache a rejection if `work()` ever throws. The current work functions cannot throw, so this is latent.
**Fix:** Add `graphFile` to the `unnamedReads` filter when its class is not `text`, or when its size exceeds the cap and it was not reported as `too-large`. In `once`, delete the key on rejection with `started.catch(() => cache.delete(key))`.

### L1-IN-04: `entriesOf` comment contradicts its behaviour

**File:** `src/planning-repo/handlers/index-intel-lift.ts:205-210`
**Issue:** The comment says "The `entries` object of an intel file, **or the file itself when it has no `entries`**", but the code returns `{}` in that case. An intel file with the entries at the top level therefore summarises as total 0 with no hint. Either the comment is wrong or the fallback is missing.
**Fix:** Pick one. If the fallback is intended, return `value` minus `_meta` when `entries` is absent. Otherwise fix the comment.

### L1-IN-05: Spike folders are walked in full, and every file becomes an artifact entry

**File:** `src/planning-repo/discovery.ts:178-246`
**Issue:** `listed` spares the bytes (no sniff, no read). The walk still descends into every directory under `spikes/<dir>/` and pushes one `ArtifactRef` per file, with no count cap. A spike that ran `npm install` or created a `.venv` puts tens of thousands of `listed` files into the snapshot. They ship in `/presentation` `artifacts` and the drawer. Walking `spikes/*/` was already unbounded before this phase, so this is not a regression. The new feature is what makes such folders show up deliberately.
**Fix:** In `walk`, treat well-known heavy directory names (`node_modules`, `.git`, `.venv`, `__pycache__`) under `spikes/` as one exclusion entry. Alternatively, cap the listed refs per spike folder and record the overflow in `exclusions`.

---

_Reviewed: 2026-11-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

# Lane L2A — presentation builders, routing, web scope, shell

# Phase 11, Lane 2a: Code Review Report

**Reviewed:** 2026-11-07
**Depth:** standard
**Files Reviewed:** 37
**Status:** issues_found

## Summary

The scope plumbing (slug then scope in the URL, `projectKey(slug, scope, ...)`, `projectUrl(..., scope)`, `withProjectScope`, `splitScope`) is consistent. I traced every `projectKey(` / `projectUrl(` / `fetchPresentation(` / `fetchDocument(` call site, found no caller that forgot the scope argument, and `projectWideKey` correctly prefixes all scoped entries for refresh and forget. Workstream names are always re-encoded as one path segment on the way out, and all author text in the new pages is rendered as React text. The `..` / `.` scope-name case cannot reach `projectUrl` because browsers normalise dot segments, even percent-encoded ones, before the router sees them. I found no security issues and no crash or data-loss paths. The defects are in the presentation joins: an asymmetric pairing rule, a float comparison of phase numbers, and a prototype-key lookup. The rest is small inconsistencies and dead code.

## Warnings

### L2A-WR-01: Pause pairing is asymmetric: a HANDOFF pairs with an unrelated root `.continue-here.md`, but not the other way round

**File:** `src/presentation/pause-context.ts:487` (compare `:498-502`)
**Issue:** When the open file is `HANDOFF.json`, `cont = loadContinue(byPath(ROOT_CONTINUE_PATH))` is taken unconditionally, with no check that the note names the same phase. When the open file is `.continue-here.md`, the root HANDOFF is paired only if `samePhase(root.phase, cont.phase)` (or the note is unnamed and is the root one). Take a stale root `.continue-here.md` for phase 3 and a fresh `HANDOFF.json` for phase 5. The HANDOFF page treats them as one pause, so `disagreements` and `nextActionOther` show the two records as conflicting, and `restSections` mixes the stale note's sections into the new pause. Opened from the note, the same two files are correctly treated as unrelated. The file header says only "pairs with the root `.continue-here.md`", so the two directions disagree with each other. The page then asserts that two unrelated records "differ", which is a false claim about the files.
**Fix:** Apply the same phase test in the HANDOFF direction before accepting the root note:
```ts
const root = loadContinue(byPath(ROOT_CONTINUE_PATH));
const unnamed = root?.pause.phase === undefined;
if (root !== null && (unnamed || samePhase(handoff.pause.phase, root.pause.phase))) cont = root;
if (cont === null) { /* existing phase_dir fallback */ }
```

### L2A-WR-02: "Behind the current phase" compares phase numbers with `parseFloat`, so decimal phases order wrongly and print wrongly

**File:** `src/presentation/pause-context.ts:299-305`
**Issue:** GSD decimal phases are inserted numbers (2.1, 2.2, ... 2.10), not fractions. `Number.parseFloat('2.10')` is `2.1`, so STATE on 2.10 is judged to be behind a pause on 2.9 (`2.1 > 2.9` is false), and a pause on 2.1 against STATE on 2.10 reads `current > named` as `2.1 > 2.1`, which is false. The note's text also interpolates the float (`current phase ${current}`), so a STATE phase of `2.10` is printed as `2.1`. This produces a wrong "work has moved on" note in either direction, or none at all. `leadingNumber` already returns the exact string.
**Fix:** Compare dotted numbers segment-wise and print the original string:
```ts
function comparePhaseNumbers(a: string, b: string): number {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
// ...
const current = leadingNumber(state.phaseNumber)?.number;
const named = leadingNumber(phase.identity.number)?.number;
if (current && named && comparePhaseNumbers(current, named) > 0) { /* what: ... ${current} ... */ }
```

### L2A-WR-03: Extension lookup on a plain object literal returns inherited members for author-controlled file names

**File:** `src/presentation/file-facts.ts:110-111` (tables at `:81`, and the existing `TYPE_LABELS`)
**Issue:** `LISTED_LABELS[listedExt] ?? TYPE_LABELS[listedExt]` indexes plain object literals with an extension taken from a file name inside a spike folder, which is author-controlled. A listed file named `x.constructor` (or `x.__proto__`) returns `Object`'s inherited member, not `undefined`, so `fileTypeLabel` returns a function instead of a string. The `fileBadgeOf` template then writes `, function Object() { [native code] }, 12 B` into the spoken text, and the File details card receives a non-string. The Phase 11 code is otherwise careful (`Object.hasOwn` throughout the spikes and indexes joins), and this is the one lookup that is not. It is cheap to fix now that `listed` makes arbitrary names reachable.
**Fix:**
```ts
const own = (table: Readonly<Record<string, string>>, key: string): string | undefined =>
  Object.hasOwn(table, key) ? table[key] : undefined;
// ...
return (listedExt === null ? undefined : (own(LISTED_LABELS, listedExt) ?? own(TYPE_LABELS, listedExt))) ?? 'File';
```
Apply the same helper to the `TYPE_LABELS[ext]` use at `:116`.

## Info

### L2A-IN-01: Dead branch in `buildIndexesContext` (no-op "ghost graph alone" rule)

**File:** `src/presentation/indexes-context.ts:350-352`
**Issue:** The `if (graphOne.state === 'not-built' && jsonTiles.length === 0 && generics.length === 0 && synthesis === null) tiles = [graphOne];` condition implies the preceding assignment already produced exactly `[graphOne]`, so the block changes nothing. The comment ("a ghost Graph beside no intel file would be the whole page") suggests the intent was to return no tiles, or `null`. As written, a project holding only `.planning/intel/.last-refresh.json` gets a page that is a single "not built" ghost tile, and `firstTileUrl` is null so `/indexes` is not-found.
**Fix:** Either delete the block, or implement the stated intent (`return null` when no tile would be real).

### L2A-IN-02: `tileKeyOfPath` classifies nested intel files by base name

**File:** `src/presentation/indexes-context.ts:160-181`
**Issue:** `intelKindOf(name)` runs on the base name only, so `.planning/intel/classifications/stack.json` resolves to the `stack` tile and `openKey` highlights Stack for a file that is not the stack summary. `isGenericIntelPath` excludes sub-folders for the unknown case, but known kinds get no such guard. `synthesisTile` has the same shape (it calls `intelKindOf(artifact.path)` for every path under `intel/`, so a nested `decisions.md` is listed as an ingest document).
**Fix:** Require `path.slice(INTEL_DIR.length)` to contain no `/` before mapping a known kind, in both places.

### L2A-IN-03: No-op ternary on the dashed label

**File:** `src/presentation/workstream-index.ts:239`
**Issue:** `entry.dashed === 'No roadmap yet' ? NO_ROADMAP_LABEL : entry.dashed` maps the string to a constant that holds the same string, so it is a no-op. It also hides that `dashed` is a server enum (`WorkstreamDashedReason`) mirrored here as a magic string.
**Fix:** Use `dashedLabel: entry.dashed`, or compare against an exported constant from `server/workstreams.ts` if the two are meant to diverge.

### L2A-IN-04: `differs` in the onboarding context compares untrimmed text

**File:** `src/presentation/onboarding-context.ts:80`
**Issue:** `firstScreen.command !== summaryCommand` is an exact comparison. `pause-context.ts` compares with `sameText` (trim). A summary command carrying a trailing space or newline from the markdown lift is reported as differing from the identical computed command, and the page then shows two "different" commands.
**Fix:** Compare `firstScreen.command.trim() !== summaryCommand.trim()`.

### L2A-IN-05: Seed/thread link returns `url: ''` where its contract says `null`

**File:** `src/presentation/seed-thread-links.ts:131`
**Issue:** The `SeedThreadLink.url` doc says "else null", but `found.key` is `''` for an artifact with no address (an internal file or a workstream file in the root presentation). `indexes-context.ts` handles the same case with `keyOrNull`. The two page composers (`seed-page.ts:299`, `thread-page.ts:246`) re-check for `''`, so nothing breaks today, but the type allows an empty-string address through for any new consumer, and `Link to=""` collapses to the project dashboard.
**Fix:** `url: found !== null && found.key !== '' ? found.key : null`.

### L2A-IN-06: Scope chip trigger's accessible name does not contain its visible text

**File:** `src/web/components/scope-chip.tsx:91` (model label from `workstream-index.ts:335`)
**Issue:** The trigger shows `ws: {name}` (the `ws:` is `aria-hidden`), but `aria-label` is `Workstream: {name}`. WCAG 2.5.3 (label in name) wants the accessible name to contain the visible label, and speech-control users saying "click ws intake" will not match. Separately, the popup click handler (`:85`) closes the list on any click that lands on an anchor, including Ctrl/Cmd-click, which opens a new tab and leaves the user's list closed.
**Fix:** Drop the `aria-label`, or make it start with the visible text (`ws: ${scope}, workstreams`). In `onPopupClick`, ignore `event.metaKey || event.ctrlKey || event.shiftKey || event.altKey`.

### L2A-IN-07: Duplicate logic and extra round trip on every flat-project first screen

**File:** `src/web/project-path.ts:32-40` (and `:12-20`); `src/web/pages/project-layout.tsx:93-101,145`
**Issue:** `withProjectScope` repeats the body of `withProjectSlug` (single-slash guard, query/hash split, root-collapse), so a future change to the guard has to be made twice. Separately, for a flat project the layout holds the "Opening ..." shell until `/workstreams` returns (`outcome === 'open' && inventoryPending`) at every `/` and `/workstreams`, so every flat project pays one extra request before its dashboard, only to learn it is flat. This is not a correctness bug (a failed inventory falls back to the ordinary page), but the dashboard is delayed for the common case.
**Fix:** Factor the shared guard/split into one helper used by both functions. For the delay, either render the dashboard optimistically once the root presentation shows no `workstreams/` artifacts, or carry the project's mode in the presentation payload so no second request is needed.

---

_Reviewed: 2026-11-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

# Lane L2B — pause, spikes and indexes page views

# Phase 11 (lane 2b): Code Review Report

**Reviewed:** 2026-11-07
**Depth:** standard
**Files Reviewed:** 6 (pause, spikes and indexes composers and components)

## Summary

The composers are pure and defensive, and the React surfaces render every author string as React text (no raw-HTML injection, no hrefs built from document text), so there are no security findings. The defects are behavioural. In a project with no manifest, the Spikes sheet can never be reopened once closed. The Spikes sheet silently drops README sections it believes the lift has covered. All three composers swallow every exception. The Indexes tile loses keyboard focus when it opens.

## Warnings

### L2B-WR-01: Spikes sheet cannot be reopened after it is closed in a project with no manifest

**File:** `src/web/views/spikes-page-components.tsx:526-529, 546-554`
**Issue:** When `sheet.closeTo === null` (no manifest), `close()` calls `setHidden(sheet.key)`. Nothing ever clears `hidden`. The comment says it "stays hidden until the address names another", but the code only compares `hidden !== sheet.key`.
- Close spike A: `hidden = 'A'`.
- Click A's tile again: the Link goes to the same address, so `model.sheet` is unchanged and the sheet stays hidden. The tile is dead.
- Open B (the sheet shows, since `B !== 'A'`), then go back to A: `hidden` is still `'A'`, so A stays suppressed until a full reload.

Folder tiles with no manifest are the only tiles on that page (see `NO_MANIFEST_NOTE`), so the failure hits exactly that case.
**Fix:** Reset `hidden` when the address changes, using the derived-state pattern `IndexesView` already uses (`seenKey`), and also when the user activates a tile. For example:
```tsx
const [seenKey, setSeenKey] = useState(sheet?.key ?? null);
if (seenKey !== (sheet?.key ?? null)) { setSeenKey(sheet?.key ?? null); setHidden(null); }
```
For the same-address click, either clear `hidden` in a tile `onClick` or navigate with a location `state` marker so the model changes.

### L2B-WR-02: Spikes sheet hides README sections it believes the lift covered

**File:** `src/web/views/spikes-page.ts:584, 589` (with `src/planning-repo/handlers/spikes-lift.ts:574-583, 591`)
**Issue:** `barsOf(input, ['what this validates', 'results'])` skips every group with those headings. The content is only shown if another path renders it, and two cases lose it.
1. "What this validates" is shown only through `lift.validates`. The lift builds that from frontmatter or the head `validates:` line, else from the section's non-heading lines outside fences, joined and capped. A section that holds only a table, only a fenced block, or several paragraphs and lists is truncated to its first paragraph, or yields `validates === undefined`. `validatesOf` returns `null` and the bar is skipped. The section then appears nowhere on the sheet.
2. `groupHtml(input, 'results')` returns only the first matching group, but `barsOf` skips all of them. A second "Results" group (for example "## Results" and "### Results") is dropped.

This tool exists to make planning artifacts legible, and silent omission of author content is the worst failure mode for it.
**Fix:** Skip a heading only when the sheet actually renders it. Pass the skip list conditionally, for example `validates !== null ? ['what this validates'] : []`. Make `groupHtml` and `barsOf` agree on which group they consumed by skipping by group identity or index, not by heading text, so later duplicates stay as bars.

### L2B-WR-03: All three composers swallow every exception and return null

**File:** `src/web/views/pause-page.ts:480-482`, `src/web/views/spikes-page.ts:704-706`, `src/web/views/indexes-page.ts:675-677`
**Issue:** An empty `catch { return null; }` converts any programming or data-shape error (for example `row.handoff.file` on a malformed disagreement, a null task row, a `tile.graph` missing a field) into "no context", so the page silently falls back to the promoted-section view with no notice. A regression in any composer then looks like the feature simply not appearing. There is no log, so it is undiagnosable in the dev loop.
**Fix:** Narrow the guard to the genuinely untrusted parts, or at least log in non-production builds:
```ts
} catch (error) {
  if (import.meta.env?.DEV) console.error('composePause failed', error);
  return null;
}
```

### L2B-WR-04: Keyboard focus is lost when an Indexes tile opens

**File:** `src/web/views/indexes-page-components.tsx:502-508, 528-552, 553-568`
**Issue:** Activating a tile either navigates or calls `setClosed(null)`. In both cases the focused `<button data-tile-key>` is unmounted and replaced by a `<section>` (the open branch renders no button). Focus drops to `document.body`, so a keyboard or screen-reader user loses their place, and the next Tab restarts from the top of the page. Focus is only restored on close (the `focusKey` effect), not on open.
**Fix:** After a tile opens, move focus to the open panel. Give the `<section>` `tabIndex={-1}` and focus it in an effect keyed on `openKey`, or focus its `<h2>`.

## Info

### L2B-IN-01: `dayOfIso` accepts impossible dates

**File:** `src/web/views/pause-page.ts:45-51`
**Issue:** `Date.parse('2026-02-31')` returns a valid timestamp, because V8 rolls the day over. The check `Number.isNaN(Date.parse(head))` therefore does not reject it. Only month 13 is rejected. A handoff dated `2026-02-31` renders "Paused ... 2026-02-31 · N days ago" with the age computed from the rolled-over date.
**Fix:** Round-trip the value: `new Date(head).toISOString().slice(0, 10) === head`.

### L2B-IN-02: Dangling `aria-controls` and index-keyed gate state

**File:** `src/web/views/indexes-page-components.tsx:559-560`, `src/web/views/pause-page.ts:355`, `src/web/views/pause-page-components.tsx:223`
**Issue (Indexes):** A collapsed tile is a button with `aria-controls={panelId}`, but the element with that id does not exist while collapsed. That is an invalid reference.
**Issue (Pause):** The `GateBar` "Mark as read" state is keyed by `gate-${index}`. If the model changes while the component stays mounted (a refresh, or a switch between workstream scopes), a read flag stays on whichever gate now sits at that index.
**Fix:** Drop `aria-controls` while collapsed. Key gates by content, for example `${index}-${gate.what}`.

### L2B-IN-03: Duplicate React keys in tag lists

**File:** `src/web/views/indexes-page-components.tsx:134, 306`; `src/web/views/spikes-page-components.tsx:56, 66`
**Issue:** `Tags` uses `key={item}`. The stack summary's language or framework lists are author-supplied, so a duplicate entry produces a duplicate-key warning and unstable rendering. The Spikes header uses `key={fact}` in the same way.
**Fix:** Use `` `${index}-${item}` `` as the key, as `Bars` and `Layers` already do.

### L2B-IN-04: Wrap-up sheet shows only "Key findings"

**File:** `src/web/views/spikes-page.ts:594-611`
**Issue:** `wrapSheet` renders the skill path, the processed chips, the "Key findings" group and the not-processed line. Any other `##` section of a WRAP-UP-SUMMARY.md is not rendered, unlike the conventions sheet, which uses `barsOf(input, [])`. The lendshed fixture only has "Processed Spikes" and "Key Findings", so this is invisible there. Real wrap-ups written by the spike workflow may carry more sections.
**Fix:** Add `bars: barsOf(input, ['processed spikes', 'key findings'])` to the wrap-up sheet and render it with `Bars`.

---

_Reviewed: 2026-11-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

# Lane L3 — seed, thread, report, forensics and onboarding views, view registry, phase-11 CSS

# Phase 11 (lane 3): Code Review Report

**Reviewed:** 2026-11-07
**Depth:** standard
**Files Reviewed:** 14 (the globals.css review covers only the five phase-11 blocks for seed, thread, report, forensics and onboarding, lines 35339-37899)
**Status:** issues_found

## Summary

Registry wiring (`kinds.ts`, `manifest.ts`, `manifests.ts`) is consistent: every new kind is in `VIEW_KINDS`, has a manifest with a `promote` fallback, and the `ViewInput` additions are optional. No script-injection path was found: every author string is rendered as React text, the only `href` values come from the server-resolved `seedThreadLinks`, and the only raw HTML (report `more`/`plain`/`bars`) goes through the existing `renderHtml`. The CSS blocks use tokens only (no hex, no `border-radius`, no `!important`), every class the five components use has a rule (the few misses are ids or inline custom properties), and every `data-*` hook the components emit has a selector except `data-numeral`.

The defects are in the composers' heuristics. The client-side value masking in seed/thread is much weaker than the project's own `maskValues`. The milestone report silently drops or mis-routes document sections. The session report suppresses sections by heading name rather than by what was composed. A few labels state something the data does not support. I reproduced the masking, Stats, debt and grid findings by running the composers against small inputs.

## Warnings

### L3-WR-01: `NAME=value` masking in seed and thread pages is narrow and applied to only some fields

**File:** `src/web/views/seed-page.ts:140-188` (also `seed-page-components.tsx:171,227,205`, `thread-page-components.tsx:256-262`)
**Issue:** The page promises (UI-SPEC rule 8, T-11-37) that a value beside a variable name is never drawn. The implementation is a private re-implementation (`withheldNameOf`/`segmentsOf`) that ignores the project's shared `maskValues`/`withholdValue` (`planning-repo/handlers/withhold-values.ts`). Running it gave:
- `**API_KEY=abc123**` (markdown bold, a very common way to write it): not masked, because the word starts with `*`, which the prefix skip (`` `("' ``) does not cover.
- `API_KEY = abc123` (spaces around `=`): not masked.
- `api_key=abc123`, `token: sk-abcdef`: not masked (upper-case names only, no `NAME: value` form).

Several rendered fields never go through `segmentsOf` at all:
- the "Surface when" sentence (`packet.surfaceWhen`, line 171)
- `bar.trigger` (line 227)
- breadcrumb/reference descriptions (`ResearchInline text={crumb.text}` / `reference.text`)
- `plantedDuring`, the idea h1, the `audit_acknowledged` parts and the status word

The result is that a value can show on a page that advertises it hides them. The unmasked value still reaches the browser payload (Source mode shows it by design), so this is a UI-contract defect rather than a new disclosure channel.
**Fix:** Do the masking once, server-side in the seed/thread handlers with `maskValues` (as `user-setup.ts` does), and have the pages draw the shared `[Value not shown]` marker. If it must stay client-side, import a single shared splitter, extend it to strip `*`/`_` wrappers, accept `NAME = value`, and route `surfaceWhen`, `trigger`, crumb/reference text, `plantedDuring`, and the title through it.

### L3-WR-02: Milestone "Stats" section is dropped and its index chip jumps nowhere when the lift has no stats

**File:** `src/web/views/report-page.ts:852,861` and `src/web/views/report-page-components.tsx:546,589`
**Issue:** `composeMilestone` claims the document's "Stats" group (`statsGroup`, line 852) so it is not listed as a closed bar, then keeps only a boolean. The group's HTML is not stored anywhere on `ComposedMilestoneReport`. The "Stats" chip is added when `stats.length > 0 || statsGroup !== null` (line 861), but `MilestoneBody` renders the element carrying `id={model.statsId}` only when `hasCard` (numerals or ruler) is true. When the lift read no stat lines but the document has a Stats section (free-form text), the section's content is not shown anywhere and the "Stats" chip's `jumpTo` finds no element and silently does nothing. I reproduced this: `stats: []` plus a `Stats` group gives an index chip with `numerals: []`, `ruler: null` and no bar.
**Fix:** When `stats.length === 0 && statsGroup !== null`, push the group into `bars` (or a `plain` section) with `id: statsId` and do not claim it. At minimum, add the chip only when the card renders.

### L3-WR-03: `sectionKind` matches by loose substring and in the wrong order, so a debt section can be replaced by the requirements page

**File:** `src/web/views/report-page.ts:792-799` (used at 817-850)
**Issue:** `sectionKind` tests `includes('requirements')` before `includes('tech debt')`. A section titled "Tech debt and deferred requirements" (deferred requirements is exactly the kind of thing a Tech-debt section lists) is classified `requirements`. If the lift has any requirement rows it counts as `composed`, so `claimGroup` swallows the debt section's HTML and the page shows the Requirements component under that anchor. I reproduced this: `debt: null`, `anchors.requirements = 'view-report-sec-6'`, and the debt text appears nowhere. The same applies to two sections that both classify as `phases`, `requirements` or `decisions`: the second one is also claimed and dropped, and `anchors[kind]` is overwritten.
**Fix:** Check `tech debt` first, and match the stricter headings the writer uses (for example `startsWith` after stripping the `N.` prefix). Only treat a section as composed for the first section of each kind (`anchors[kind] === null`), and let later ones fall through to `plain`/`bars`.

### L3-WR-04: Session report suppresses document sections by heading name, whether or not the page composed them

**File:** `src/web/views/report-page.ts:509-522,618-625`
**Issue:** `sessionMore` drops every group whose heading is in `SESSION_HEADINGS` (or starts with "blockers"), on the assumption the page already shows it. The page shows only what the lift extracted. If the lift read nothing for a section, for example a Key Outcomes written as prose rather than bullets, or a Files Changed section whose summary line it cannot read, `filesOf`/`stringList` give empty and the section's content appears neither in the composed view nor in `more`. `Work Performed` and `Session Summary` are suppressed wholesale, so any prose or extra table rows under them are lost. The milestone variant handles this correctly (it claims a group only when it composed it), so the two variants disagree on the "never lost" promise stated in the header comment.
**Fix:** Mirror the milestone approach: track which headings were actually composed (outcomes non-empty, `files !== null`, and so on) and send every other group to `more`. For `Work Performed`/`Session Summary`, keep a group in `more` when its lift-derived fields are all empty.

### L3-WR-05: The "No commit stamps in the file" ruler label is false whenever the stamps exist but fail the single-day test

**File:** `src/web/views/report-page.ts:536-546` and `src/web/views/report-page-components.tsx:176-188`
**Issue:** `rulerOf` returns `{kind: 'none', label: 'No commit stamps in the file'}` for every case where the clock cannot be drawn. That includes a report whose first and last commit stamps both read but sit on different days (`sameDay` false), or where `last.fraction < first.fraction`. The component then adds `aria-label="No first and last commit stamps in the file"`. The report does carry stamps; the page just cannot draw them on a 24 hour axis. A user (and a screen reader) is told the file lacks something it has. In the same-time case (`first == last`) the clock bar renders with width `0%`, which is invisible.
**Fix:** Give the multi-day/unordered case its own label (for example "Commit stamps span more than one day") and show the stamps as text beside the Duration; render a minimum visible width, or a single tick, when `toAt === fromAt`.

### L3-WR-06: Onboarding shows a "Not found" chip for a codebase map the summary names

**File:** `src/web/views/onboarding-page-components.tsx:229-233`
**Issue:** `CodebaseObject` draws the readiness chip only when `codebase.found && codebase.readiness !== null`; otherwise it draws `NotFoundChip`. `found` means the summary names a map path (`mapPath !== null`). If the map path is present but the readiness line is absent or is the word `none`, the card says "Not found" while the closed bar below it (`CodebaseFacts`) prints the map's path. The two disagree.
**Fix:** Branch on the facts: `!found` gives "Not found"; `found && readiness !== null` gives the chip; `found && readinessNone` gives "None"; `found` with no readiness gives `NOT_STATED_WORD`.

### L3-WR-07: Forensics artifact grid is rebuilt by position, so a missing cell misaligns the whole phase and the absent count is padded

**File:** `src/web/views/forensics-page.ts:373-412`
**Issue:** `gridOf` infers the row width from the first repeat of the first artifact's name, chops the flat list into fixed-width chunks, and reads `chunk[artifactAt]` by position. If any phase's run lacks an artifact (or the first artifact name repeats inside a phase), every later cell in that phase lands under the wrong artifact. A ragged chunk gets phantom `unstated` cells that are counted into `total`. I reproduced it: two phases where the second lists only `PLAN` produce `"1 of 4 artifacts absent"` with a fabricated fourth cell. When `cells[0].artifact` and the next are both null, `null === null` makes `width = 1`.
**Fix:** Group by phase using the cell's own `phase` value, and look up each cell by `artifact` name (a `Map<artifact, cell>` per phase). Count `total` over cells that exist (or exclude `unstated` from the denominator), and treat a null/empty artifact name as a distinct key rather than a repeat marker.

## Info

### L3-IN-01: Nested bullets are flattened, and `**Created ...**` notes and double-spaced status words are not recognised

**File:** `src/web/views/seed-page.ts:205-211`, `src/web/views/thread-page.ts:146-168,108-110,136-144`
**Issue:** `blocksOf` / `threadBlocksOf` call `trimStart()` on every line before the bullet test, so `  - nested` becomes a top-level item (confirmed: `- a / - nested / - b` gives three siblings). `createdNoteDay` handles `*Created ...*` and `_Created ..._` but not `**Created 2026-03-27**`. `statusKeyOf` splits on a single space, so `in  progress` stays an unknown quiet status.
**Fix:** Keep the leading indent to detect nesting (or render the nested line as a continuation); strip all leading `*`/`_` characters in `createdNoteDay`; collapse whitespace runs in `statusKeyOf`.

### L3-IN-02: Onboarding's first-screen command is dropped when the summary has no command

**File:** `src/web/views/onboarding-page.ts:224-226`
**Issue:** `firstScreenOf` returns null when `command === null`. The header comment says "neither is hidden", but for a map-only project whose summary lacks a command the first screen's command shows nowhere (the page prints only "No command in the summary.").
**Fix:** When `command === null` and `context.firstScreen.command` reads, show the first-screen block anyway (or promote it to the main slot).

### L3-IN-03: Duplicated helpers across the five composers and cross-view imports between composers

**File:** `thread-page.ts:146-168` (clone of `seed-page.ts:191-212`), `thread-page.ts:125-133` vs `seed-page.ts:130-138`, `thread-page.ts:228-257` vs `seed-page.ts:281-310`; `fileStemOf` in `thread-page-components.tsx:45`, `report-page-components.tsx:51`, `forensics-page-components.tsx:50` (and `fileNameOf` in the onboarding components); `isRecord`/`textOrNull`/`stringList`/`MS_PER_DAY` in every composer; `forensics-page.ts:18` imports `isoDaysIn` from `report-page.ts`, `seed-page.ts:22` imports `dayOfIso` from `pause-page.ts`.
**Issue:** Maintenance hazard: a fix to one copy (for example L3-WR-01) will not reach the others, and a composer now depends on a sibling page module for a date utility.
**Fix:** Move the date and record helpers to a shared `view-utils.ts`, reuse `blocksOf` in the thread page, and share `fileStemOf` and the link-resolution helper.

### L3-IN-04: Invisible U+FE0F literal in source

**File:** `src/web/views/forensics-page.ts:348`
**Issue:** `rest.startsWith('️')` contains the variation selector as a raw, invisible character (bytes `ef b8 8f`). It reads as an empty-looking string and is easy to lose in an editor or reformat.
**Fix:** `rest.startsWith('️')`.

### L3-IN-05: Date helpers accept impossible days

**File:** `src/web/views/pause-page.ts:45-51` (used by seed/thread), `src/web/views/report-page.ts:395-409`
**Issue:** `dayOfIso` and `isoDaysIn` validate with `Date.parse`, which in V8 rolls over `2026-02-31` to March 3 instead of returning `NaN` (verified). An impossible planted/updated date is then drawn as valid and the age is computed from the rolled-over day.
**Fix:** Round-trip the parsed date (`new Date(ms).toISOString().slice(0, 10) === head`) before accepting it.

### L3-IN-06: Insertions/deletions bar needs both counts

**File:** `src/web/views/report-page-components.tsx:269`
**Issue:** The bar is drawn only when `insertions !== null && deletions !== null`. `git --shortstat` omits a zero side ("3 deletions(-)" alone), so a one-sided change set shows no bar even though one number reads.
**Fix:** Treat a missing side as 0 when the other reads (`(files.insertions ?? 0)`), as `total` already does.

### L3-IN-07: Stale comments and a dead class hook

**File:** `src/web/views/kinds.ts:70-71`, `src/web/views/report-page-components.tsx:268`
**Issue:** The `VIEW_KIND_TABLE` doc comment says later plans "add rows (spikes, indexes)" but those rows are already there. `className="view-report-insdel"` has no CSS rule (only `view-report-insdel-bar` does). `data-numeral` on `Numeral` has no selector.
**Fix:** Update the comment; drop the unused class and attribute or add the rule.

---

_Reviewed: 2026-11-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

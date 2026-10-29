---
phase: 07-recognised-files-and-readable-urls
reviewed: 2026-10-27T11:30:00Z
depth: standard
files_reviewed: 66
files_reviewed_list:
  - src/domain/model.ts
  - src/planning-fs/in-memory-fs.ts
  - src/planning-fs/local-fs.ts
  - src/planning-fs/types.ts
  - src/planning-repo/assemble.ts
  - src/planning-repo/discovery.ts
  - src/planning-repo/file-class.ts
  - src/planning-repo/folders.ts
  - src/planning-repo/handlers/artifact-token.ts
  - src/planning-repo/registry.ts
  - src/planning-repo/types.ts
  - src/presentation/dashboard.ts
  - src/presentation/drawer.ts
  - src/presentation/identity-keys.ts
  - src/presentation/legacy-routes.ts
  - src/presentation/project-slug.ts
  - src/presentation/reserved.ts
  - src/presentation/route-table.ts
  - src/presentation/routes.ts
  - src/server/dashboard-ledger.ts
  - src/server/document-sources.ts
  - src/server/index.ts
  - src/server/project-presentation.ts
  - src/server/search-index.ts
  - src/web/app-router.tsx
  - src/web/components/app-shell.tsx
  - src/web/components/artifact-header.tsx
  - src/web/components/pair-switch.tsx
  - src/web/components/planning-places.tsx
  - src/web/components/reference-preview.tsx
  - src/web/components/search-field.tsx
  - src/web/nav.tsx
  - src/web/pages/artifact-page.tsx
  - src/web/pages/dashboard-deck.tsx
  - src/web/pages/dashboard-ledger.tsx
  - src/web/pages/dashboard-page.tsx
  - src/web/pages/document-crumbs.ts
  - src/web/pages/not-found-page.tsx
  - src/web/pages/plan-pair-page.tsx
  - src/web/pages/research-atoms.tsx
  - src/web/pages/roadmap-deep-link.ts
  - src/web/pages/roadmap-page.tsx
  - src/web/pages/search-page.tsx
  - src/web/pages/sketches-page.tsx
  - src/web/pages/traceability-page.tsx
  - src/web/project-path.ts
  - src/web/route-dispatch.ts
  - src/web/views/note-page-components.tsx
  - src/web/views/plan-context.ts
  - src/web/views/plan-navigator-components.tsx
  - src/web/views/research-briefing-components.tsx
  - src/web/views/review-threads-components.tsx
  - src/web/views/summary-run-components.tsx
  - src/web/views/summary-run.ts
  - src/web/views/todo-lifecycle-components.tsx
  - src/web/views/ui-review-components.tsx
  - src/web/views/validation-strategy-components.tsx
  - src/server/file-bytes.ts
  - src/server/artifact-index.ts
  - src/server/sketch-files.ts
  - src/presentation/file-facts.ts
  - src/presentation/drawer-route.ts
  - src/web/pages/document-route.tsx
  - src/web/pages/image-page.tsx
  - src/web/pages/file-details-page.tsx
  - src/web/components/figure-frame.tsx
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-10-27T11:30:00Z
**Depth:** standard
**Files Reviewed:** 66
**Status:** issues_found

## Summary

The phase added file classes and GSD-internal exclusions, the folder table, the project slug and readable URL grammar, the route table, the legacy-URL redirector, the images-only `/api/files` route, and the image and File details pages.

I read every file in the supplied list. The list left out several new or changed files that carry the riskiest logic, so I also reviewed these: `src/server/file-bytes.ts`, `src/server/artifact-index.ts`, `src/server/sketch-files.ts`, `src/presentation/file-facts.ts`, `src/presentation/drawer-route.ts`, `src/web/pages/document-route.tsx`, `src/web/pages/image-page.tsx`, `src/web/pages/file-details-page.tsx`, `src/web/components/figure-frame.tsx`. I also checked the call sites of the URL builders across `src/` for places the migration missed.

I also ran these checks:
- Typecheck (server and web) and ESLint over the touched trees are clean.
- A probe script round-tripped 26 awkward paths through `addressOfPath` then `parseRoutePath`. All came back to the same URL.
- The full vitest run is 4460 passed, 3 failed (WR-04).

The read-only guarantee holds. No write API is used outside the temp-dir primitives for the remote mirror. `/api/files` selects an indexed artifact through the route table of one bundle, reads it through `readBytesWithin` confined to `.planning`, and serves it with a sandbox CSP and nosniff. The request text never reaches a filesystem path. Redirect targets always come from the payload and are re-prefixed with the slug, so there is no open redirect. The URL grammar is injective: encoding is applied once and decoding once.

I found no blockers. The problems are an unmigrated call site that produces wrong links, a collision policy that rests on a false invariant, a hang on non-regular files, a red test suite, and an enforcement gap in the image byte cap.

## Warnings

### WR-01: Roadmap plan rows still build their URL with the stateless builder instead of the route-table key

**File:** `src/presentation/roadmap.ts:171`
**Issue:** `waveBands` sets `url: buildPlanUrl(phase.identity, plan.id)`, but `plan.key` already holds the route-table address of the same plan. Every other migrated site uses the table (`project-presentation.ts:633`, `document-sources.ts:199`, `dashboard-ledger.ts:568`). The two agree only when the plan file keeps its clean address. When two phase folders of one milestone share a phase address (`05-a` and `5-b`, which `phaseAddressClaims` reports), or a plan file loses a collision, `plan.key` is the lossless `/file/...` address. The Roadmap page (`roadmap-page.tsx:235`, `<Link to={plan.url}>`) then links to the other folder's plan, or to a plan page that does not exist. The file is not in this phase's diff, so the migration missed it.
**Fix:**
```ts
band.plans.push({
  key: plan.key,
  url: plan.key,
  ...
```
Also drop the `buildPlanUrl` import if nothing else in the file uses it.

### WR-02: The "first by code-unit order keeps the clean address" policy lets a stray file steal a canonical document's URL, and `sourceDestination` relies on the opposite being impossible

**File:** `src/presentation/route-table.ts:177-189`, `src/presentation/dashboard.ts:44-59`, `src/presentation/routes.ts:349-371`
**Issue:** `sourceDestination` documents that "neither [an alias nor another file] can claim a root document's own name", so it computes `/state` and `/roadmap` statelessly. That is false for `/state`. `rootFileAddress` strips `.md` and `.json` and lowercases, so `STATE.json`, `STATE.JSON`, `State.md` and `state.md` all map to `/state`. I ran `addressOfPath` and confirmed this. `.planning/STATE.json` sorts before `.planning/STATE.md` in code-unit order ('J' < 'm'), so the stray file wins `/state` and the real STATE.md is demoted to `/file/STATE.md`. `PROJECT.JSON` against `PROJECT.md` behaves the same way. The dashboard "source" links, which use the stateless address, then open the wrong file.
The same ordering rule also means an archived copy under `.planning/milestones/vX-phases/...` beats the live `.planning/phases/...` file when both claim a phase address ('m' < 'p'). That follows from the code. I did not reproduce it end to end.
The policy is deterministic, but the first-path-wins rule has no notion of which file is canonical.
**Fix:** Rank claimants before sorting. Prefer an exact canonical name (`STATE.md`, `PROJECT.md`, and so on), then the live location over the archived one, then code-unit order. Separately, make `sourceDestination` take the key from the payload, as `blockerUrl` now does, instead of assuming a stateless address.

### WR-03: Discovery hangs the whole server on a named pipe (FIFO) in `.planning/`

**File:** `src/planning-fs/local-fs.ts:91-101`, `src/planning-repo/discovery.ts:218-225`
**Issue:** The `readHead` added in this phase calls `openSync(abs, 'r')` on every extensionless or unknown-extension file. `list()` only distinguishes directory from non-directory, so a FIFO is treated as a file. Opening a FIFO for reading blocks synchronously until a writer appears. I confirmed it: `discover()` over a `.planning/` containing `mkfifo weird` never returns, and the process is killed by `timeout`. Because `openSync` is synchronous, this freezes the event loop and takes down `/api/refresh` and startup along with it. A pipe named `*.md` already hung `read()`, but the head sniff extends the hang to any name. The tool is supposed to degrade on unknown files, not hang.
**Fix:** Check the type before opening, for example:
```ts
const fd = openSync(abs, constants.O_RDONLY | constants.O_NONBLOCK);
try {
  if (!fstatSync(fd).isFile()) return new Uint8Array(0);
  ...
```
Better, have `list()` set `size` only for regular files and add an `isFile` flag to `DirEntry`. Then discovery and `read()` can skip or record a non-regular file as an exclusion.

### WR-04: The test suite is red at the phase HEAD: two corpus tests do not know the phase's own artifacts

**File:** `test/web/security-console-corpus.test.ts:191`, `test/web/ui-review-corpus.test.ts:175,180`
**Issue:** `vitest run` ends with 3 failures out of 4463. The corpus tests walk this repo's `.planning/` and require every SECURITY and UI-REVIEW file to be pinned. `phases/07-recognised-files-and-readable-urls/07-SECURITY.md` and `07-UI-REVIEW.md` were added without pins ("unpinned: LB:phases/07-...", "expected undefined to be defined"). Any later run of the gate fails until someone pins them, which weakens the signal that these tests exist to give.
**Fix:** Add the two keys to the `PINNED` maps in both tests with their extracted values. If these files are meant to be excluded while a phase is open, make the corpus walk skip the current phase explicitly instead of failing.

### WR-05: The image size cap in `/api/files` is enforced after the whole file is already in memory

**File:** `src/server/file-bytes.ts:78-84`, `src/planning-fs/local-fs.ts:108-122`
**Issue:** The pre-read check uses `artifact.sizeBytes`, which is the size recorded at index time. That value is `0` whenever the stat failed during `list()` (`entry.size ?? 0`), so it passes. The authoritative check is `bytes.length > MAX_IMAGE_BYTES` after `readBytesWithin`, which has already done `readFileSync(target)` on the full file. The comment says this check "makes the cap hold for a file that grew". It does bound what is sent, but not what is loaded. A file that grew after indexing, or one whose stat failed, is read entirely into the Node heap before the 413. `readBytesWithin` already has the `stat` it needs.
**Fix:** Let the port enforce the limit before reading:
```ts
async readBytesWithin(baseRelDir, relPath, maxBytes?: number) {
  ...
  const stat = statSync(target);
  ...
  if (maxBytes !== undefined && stat.size > maxBytes) throw Object.assign(new Error('E2BIG'), { code: 'E2BIG' });
```
In the handler, map `E2BIG` to 413. Keep the post-read check as a backstop.

## Info

### IN-01: A dispatcher comment promises a legacy redirect that does not exist

**File:** `src/web/route-dispatch.ts:116`
**Issue:** The doc comment says `search` is read for "an old `/plans/<id>` link". `isLegacyPath` and `parseLegacyUrl` only recognise `/milestones/...` and `/artifacts/...`. An old top-level `/plans/<id>` is not a legacy word, falls through to the document lookup, and shows not-found. Either the shape never existed outside the `milestones/.../plans/` nesting, which is handled, or a redirect is missing.
**Fix:** Correct the comment, or add `plans` to `LEGACY_FIRST_SEGMENTS` with a decoder if that shape was ever served.

### IN-02: The drawer's active-row match is an exact string compare against the raw pathname

**File:** `src/presentation/drawer-route.ts:13-25`, `src/web/components/planning-places.tsx:66`
**Issue:** `row.url === pathname` compares the canonical encoder output with `location.pathname` as typed or pasted. A trailing slash (which `parseRoutePath` accepts), a literal `~` where the canonical form is `%7E`, or lowercase percent-hex all make the page open fine but leave the drawer with no active row and no expanded place.
**Fix:** Compare after canonicalising, for example `buildUrl(parseRoutePath(pathname).route)` for a document route, and strip one trailing slash.

### IN-03: The `where: 'root'` rows of `EXACT_NAME_KINDS` have no effect on URLs

**File:** `src/presentation/routes.ts:352`
**Issue:** `rootFileAddress` calls `exactNameToken(name, ['any'])`, so the root-only rows (`HANDOFF.json` -> `handoff`, `PATTERNS.md` -> `graduated-patterns`) are never consulted. The two files get addresses from the generic rule (`/handoff` and `/patterns`). `/handoff` coincides with the kind token. `/patterns` does not match the `graduated-patterns` kind that the table comment says exists to avoid the per-phase `patterns` meaning. If the kind token was meant to be the URL token, this is a bug. If not, the `root` rows are dead for navigation.
**Fix:** Pass `['root', 'any']` here if the kind token is the intended address, or note in `folders.ts` that these rows affect kind only.

### IN-04: A plan's Summary tab can lead out of the plan pair when the summary lost a collision

**File:** `src/web/pages/plan-pair-page.tsx:62-67`, `src/web/route-dispatch.ts:90-96`
**Issue:** `summaryRoute` is the summary artifact's key. If that key is a lossless `/file/...` address, because the summary lost a collision, then `planOutcome` only matches the pair when `plan.summary?.key === summaryUrl`. The tab link goes to the `/file/` address, which resolves as a plain document page. The pair switch disappears and the user cannot get back to the Plan tab from there. This only happens in the collision case, and the data stays reachable.
**Fix:** Have the dispatcher treat a `/file/` address that equals `plan.summary.key` as the `plan-pair` outcome with `active: 'summary'`, or accept the degradation and note it in the plan-pair page header.

---

_Reviewed: 2026-10-27T11:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

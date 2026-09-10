# Phase 3: Search, Browsing & Traceability - Research

**Researched:** 2026-09-02
**Domain:** Client-side-driven full-text search (MiniSearch) over a server-assembled snapshot; a
disk-mirroring tree navigator; a requirements-traceability projection. All three are read-only views
over the Phase 1 domain model, wired through Phase 2's routing/rendering conventions.
**Confidence:** HIGH on the MiniSearch API surface and the existing-code integration points (both read
directly from source this session); MEDIUM on UI-shell restructuring specifics (grounded in the actual
CSS but the exact pixel/behavior choices are implementer discretion per the UI-SPEC); LOW/ASSUMED on a
few debounce/UX-timing numbers the UI-SPEC deliberately left open.

## Summary

Phase 3 has one genuinely hard technical problem and two comparatively mechanical ones. The hard
problem is D-06: MiniSearch's default tokenizer (`SPACE_OR_PUNCTUATION = /[\n\r\p{Z}\p{P}]+/u`,
confirmed by reading the installed package's own source) splits `ROLE-07` into `role` and `07`, and
splits `backend/src/authz/mod.rs` into five separate word fragments — exactly the failure PITFALLS.md's
Pitfall 8 warns about. The fix is not a different library; it's using MiniSearch's own extension
points correctly. MiniSearch's `add()` calls `processTerm(term, field)` once per raw token and accepts
either a single string *or an array of strings* as the return value — every string in that array gets
indexed as its own term for that document/field (verified directly in the shipped `dist/es/index.js`).
That one fact is the whole mechanism: a custom `tokenize` that does NOT punctuation-split (or one that
first extracts ID/path-shaped runs before falling back to default splitting), paired with a
`processTerm` that, for an ID/path-shaped raw token, returns `[wholeTokenLowercased, ...splitParts]`,
gives you D-06's "intact literal AND split constituent parts" for free, with no forked tokenizer per
document.

The second problem is snippets: MiniSearch does not extract snippets, and does not need to — its
`SearchResult.match` field (`{ [indexedTerm]: fieldName[] }`) tells you exactly which literal indexed
terms matched and in which field, so a thin custom layer over the artifact's **raw markdown body**
(never the rendered HTML) can locate those terms verbatim, window around the first/highest-scoring
occurrence, and produce the D-08 "one snippet centered on the actual matched term" — see Code Examples.

The third problem is non-blocking index construction (D-04, FIND-05). The existing server (`src/server
/index.ts`) already separates "server accepts requests" from "domain model is ready" only informally
(everything runs synchronously in `createApp` before `serve()`/`createHttpServer` starts listening).
The fix is a small, explicit index-readiness state object built alongside — not before — the existing
`buildArtifactIndex(snapshot)` call, with the actual `MiniSearch` construction deferred to a
`setImmediate`/microtask tick after `createApp` returns, and a `/api/search` handler that answers
`{status:'indexing'}` (never blocks, never 5xxs) until the background build resolves.

The remaining work — the tree navigator and the traceability view — is close to pure projection over
data that already exists. `Requirement.coveringPhaseRefs` is already resolved by `crossref.ts`;
`discovery.ts`'s `discover()` already walks every file and already records every exclusion; the one
real gap is D-11's assembly hole (`assemble.ts` only surfaces `root`/`phase`/`archived-phase` locations
into the domain model — `quick`, `research`, `milestone-root`, and `other` are discovered, parsed, and
then dropped on the floor). That gap must close before either FIND-01 or NAV-01 can be true, and it is
the natural first-plan item.

**Primary recommendation:** Fix D-11's assembly gap first (it is a hard blocking dependency for both
remaining plans), then build the MiniSearch index with a custom `tokenize`/`processTerm` pair that
double-indexes ID/path-shaped tokens, build it off the request-handling critical path with an explicit
readiness flag polled by the client, and derive both the tree and the traceability view as pure
projections over the now-complete snapshot rather than a second filesystem walk.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Snapshot completeness (D-11 fix) | API / Backend (`planning-repo/assemble.ts`) | — | Zero-I/O domain assembly; must not become a second filesystem read. |
| Search index construction | API / Backend (`server/` — new `search-index.ts`) | — | Built once per snapshot, in-process, in lockstep with `refresh()`, same as `artifact-index.ts`. Never built in the browser — corpus and index shape are server secrets only in the sense that the client never re-derives them. |
| Search query execution | API / Backend | — | `MiniSearch.search()` runs server-side; the client only ever sends a query string and receives ranked, already-shaped results (server-side view models cross the boundary pre-shaped for display, per the established Phase 1/2 pattern). |
| Search readiness signal | API / Backend → Frontend (client) | — | Backend owns the boolean; the client (react-query) polls or reads it inline on every `/api/search` response — no separate SSE/WebSocket channel needed for v1 (no watcher yet). |
| Header dropdown / `/search` page UI | Browser / Client | — | Debounce, stale-response guarding, and rendering are pure client concerns over the already-shaped API response. |
| Tree navigator data (structure + exclusions) | API / Backend (`presentation/` — new tree projection) | — | Derived from the same snapshot (`Project` + `snapshot.exclusions`), not a second `PlanningFilesystem` walk — this is exactly the one-way dependency direction (`planning-fs → planning-repo → domain → presentation → web`) ARCHITECTURE.md already establishes. |
| Tree navigator rendering + expand/collapse state | Browser / Client | — | Session-only UI state (D-12); no server round-trip per expand/collapse. |
| Traceability projection | API / Backend (`presentation/` — new traceability projection, or an extension of `project-presentation.ts`) | — | `Requirement.coveringPhaseRefs` and `Phase.diskStatus`/`roadmapComplete` already exist server-side; the view is a re-shaping of data already in `ProjectPresentation`, not new domain logic. |
| Sidebar layout restructuring | Browser / Client (CSS/`AppShell`) | — | Pure presentation; `--sidebar` tokens already exist in `globals.css`, unused until now. |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `minisearch` | 7.2.0 | In-memory full-text index, incremental update API | `[VERIFIED: npm registry + package-legitimacy check]` Confirmed on npm registry: published 2025-09-16, `latest` dist-tag, 2,634,519 weekly downloads, source repo `github.com/lucaong/minisearch`, no `postinstall` script, first published 2018 (7+ years of history, 70 published versions) — `package-legitimacy check` verdict `OK`, no red flags. Matches `STACK.md`'s recommendation exactly and is **not yet in `package.json`** (confirmed: absent from the current `dependencies` block) — this phase is the one that adds it. |

**Version verification:**
```
$ npm view minisearch version
7.2.0
$ npm view minisearch dist-tags
{ next: '5.0.0-beta1', latest: '7.2.0' }
```
`[VERIFIED: npm registry, 2026-09-02]`

**Installation:**
```bash
npm install minisearch@7.2.0
```

### Supporting

No additional runtime packages are required. `@base-ui/react/combobox` (needed for D-01's header
dropdown, per the UI-SPEC) is already reachable — `[VERIFIED: node_modules/@base-ui/react/package.json
exports, read this session]` `node -p "Object.keys(require('@base-ui/react/package.json').exports)"`
includes `./combobox` in the installed `@base-ui/react@1.7.0`. No `shadcn add` and no new npm package
needed for the dropdown, sidebar, or traceability table — all are hand-built against existing
primitives per the UI-SPEC's established convention (Phase 2 built zero CLI-installed components).

### Alternatives Considered

Already resolved in `.planning/research/STACK.md`'s alternatives table (FlexSearch, SQLite FTS5,
ripgrep, Lunr, Fuse.js) — re-litigated only if MiniSearch's `processTerm`-array mechanism had turned
out not to exist, which this session's direct source read confirms it does. No further alternatives
research is warranted for this phase.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `minisearch` | npm | ~7.9 years (first published 2018-09-17) | 2,634,519/week | `github.com/lucaong/minisearch` | OK | Approved |

`[VERIFIED: gsd_run query package-legitimacy check --ecosystem npm minisearch, 2026-09-02]` — full
verdict JSON: `{"name":"minisearch","verdict":"OK","signals":{"exists":true,"publishedAt":"2025-09-16T12:42:12.453Z","weeklyDownloads":2634519,"repoUrl":"https://github.com/lucaong/minisearch.git","deprecated":false,"postinstall":null,"ecosystem":"npm"},"reasons":[]}`

**Packages removed due to `[SLOP]` verdict:** none.
**Packages flagged as suspicious `[SUS]`:** none.

## Architecture Patterns

### System Architecture Diagram

```
                         ┌─────────────────────────────────────────────┐
                         │  PlanningRepository.refresh() (unchanged)    │
                         │  discover() → parseWithRegistry() → assemble │
                         │  DomainModel() → scanMentions()              │
                         └───────────────────────┬───────────────────────┘
                                                  │ ProjectSnapshot
                                                  │ (D-11: now carries EVERY
                                                  │  discovered artifact, not
                                                  │  just root/phase/archived)
                                                  ▼
                    ┌─────────────────────────────────────────────────────┐
                    │  createApp(source) — src/server/index.ts             │
                    │                                                       │
                    │  buildArtifactIndex(snapshot)   (existing, sync)      │
                    │  toProjectPresentation(snapshot) (existing, sync)     │
                    │                                                       │
                    │  ── NEW: buildSearchIndexState(snapshot) ──           │
                    │     returns { status:'building', ... } SYNCHRONOUSLY  │
                    │     schedules the actual MiniSearch build via         │
                    │     setImmediate() — app.fetch / server.listen        │
                    │     is NEVER blocked on it                            │
                    │                                                       │
                    │  app.get('/api/search', ...)                          │
                    │    reads indexState.status — 'building' → 200 with    │
                    │    {status:'indexing', results:[]}; 'ready' → runs    │
                    │    MiniSearch.search() and shapes grouped results     │
                    │                                                       │
                    │  app.get('/api/search/status', ...) (optional poll    │
                    │    target; or just inline status on every /api/search │
                    │    response, per D-04's "resolves itself automatically") │
                    │                                                       │
                    │  ── NEW: tree + traceability projections ──           │
                    │     pure functions over `presentation`, no new I/O    │
                    └───────────────────────┬───────────────────────────────┘
                                             │ JSON over HTTP
                                             ▼
        ┌───────────────────────────────────────────────────────────────────┐
        │  AppShell (restructured: header ▸ sidebar+content grid)             │
        │                                                                       │
        │  header search field (Combobox, debounced 120–200ms) ──┐            │
        │                                                          ▼            │
        │  [react-query] useQuery(['search', q], fetchSearch) ── AbortSignal   │
        │     stale-response guard: pass {signal} to fetch(); TanStack Query   │
        │     aborts the in-flight request when the queryKey changes           │
        │                                                                       │
        │  dropdown (compact, capped rows) ──"See all N results"──▶ /search?q= │
        │                                                                       │
        │  persistent left sidebar (tree, from `presentation` query already    │
        │  fetched by AppShell) ── every node resolves through                 │
        │  buildArtifactUrl/buildPlanUrl/buildPhaseUrl (Phase 2's route codec) │
        │                                                                       │
        │  /traceability route ── reads a new `/api/traceability` (or reuses   │
        │  `presentation.requirements`, already carrying `coveringPhases`)     │
        └───────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── server/
│   ├── artifact-index.ts        # unchanged
│   ├── search-index.ts          # NEW — MiniSearch construction, tokenize/processTerm, readiness state
│   └── index.ts                 # extended: schedule search-index build, add /api/search route(s)
├── presentation/
│   ├── routes.ts                # extended: add 'search' and 'traceability' to presentationRoutePatterns
│   ├── search.ts                # NEW — result grouping (D-07), snippet extraction (D-08)
│   ├── tree.ts                  # NEW — tree view-model projection over Project + snapshot.exclusions
│   └── traceability.ts          # NEW — requirement/phase dual-status projection (D-13/D-14/D-15)
├── planning-repo/
│   └── assemble.ts              # D-11 fix: surface quick/research/milestone-root/other artifacts
├── domain/
│   └── model.ts                 # D-11 fix: QuickTask gains an `artifacts` map (see Code Examples)
└── web/
    ├── components/
    │   ├── app-shell.tsx         # restructured: header ▸ (sidebar + content) grid
    │   ├── search-field.tsx      # NEW — header Combobox + dropdown
    │   └── tree-navigator.tsx    # NEW — persistent sidebar
    └── pages/
        ├── search-page.tsx       # NEW — /search
        └── traceability-page.tsx # NEW — /traceability
```

### Pattern 1: Dual whole-and-split tokenization (D-06)

**What:** A custom `tokenize`/`processTerm` pair on the `MiniSearch` instance so an ID-shaped or
path-shaped raw token is indexed BOTH as its intact literal and as its split constituent parts.

**When to use:** For every field indexed from source markdown in this corpus — bodies are dense with
`ROLE-07`-shaped requirement/decision IDs and `backend/src/authz/mod.rs`-shaped paths (PITFALLS.md
Pitfall 8; confirmed directly against this project's own `mentions.ts`, which already has a
hardened regex for exactly this ID shape: `` requirement: /\b[A-Z][A-Z0-9]+-\d{2,}\b/g `` —
`[VERIFIED: src/planning-repo/mentions.ts:30-31, read this session]`). Reuse that same shape
detection convention for search-token classification so the two subsystems agree on what "an ID"
looks like.

**Why this works — verified against the installed package's own source** (`node_modules/minisearch`,
confirmed 7.2.0 via `npm view minisearch version`; read directly via `npm pack minisearch@7.2.0` and
inspecting `dist/es/index.js`/`index.d.ts` this session):

```javascript
// dist/es/index.js:1936-1945 — the actual shipped defaults
// [VERIFIED: node_modules minisearch@7.2.0 dist/es/index.js:1936-1945]
const defaultOptions = {
    idField: 'id',
    extractField: (document, fieldName) => document[fieldName],
    stringifyField: (fieldValue, fieldName) => fieldValue.toString(),
    tokenize: (text) => text.split(SPACE_OR_PUNCTUATION),
    processTerm: (term) => term.toLowerCase(),
    fields: undefined,
    ...
};
```
```javascript
// dist/es/index.js:2002 — the exact regex that shreds IDs and paths by default
// [VERIFIED: node_modules minisearch@7.2.0 dist/es/index.js:2002]
const SPACE_OR_PUNCTUATION = /[\n\r\p{Z}\p{P}]+/u;
```
```javascript
// dist/es/index.js:715-732 — the add() loop that makes dual-indexing possible:
// processTerm's return value, if an array, indexes EVERY element as its own term
// [VERIFIED: node_modules minisearch@7.2.0 dist/es/index.js:715-732]
const tokens = tokenize(stringifyField(fieldValue, field), field);
...
for (const term of tokens) {
    const processedTerm = processTerm(term, field);
    if (Array.isArray(processedTerm)) {
        for (const t of processedTerm) {
            this.addTerm(fieldId, shortDocumentId, t);
        }
    }
    else if (processedTerm) {
        this.addTerm(fieldId, shortDocumentId, processedTerm);
    }
    // falsy → term discarded entirely
}
```

**Recommended concrete implementation:**

```typescript
// src/server/search-index.ts
const ID_OR_PATH_SHAPE = /^[A-Za-z0-9][A-Za-z0-9._-]*[/][A-Za-z0-9._/-]+$|^[A-Z][A-Z0-9]+-\d{2,}$/;
// First alternative: a path with at least one '/' (backend/src/authz/mod.rs).
// Second alternative: reuses the exact requirement/decision-ID shape convention
// already established in src/planning-repo/mentions.ts's ID_PATTERNS.requirement.

function tokenize(text: string, _field: string): string[] {
  // Split ONLY on whitespace + a punctuation set that excludes '-', '/', '.' —
  // so 'ROLE-07' and 'backend/src/authz/mod.rs' survive tokenize() as single
  // raw tokens instead of being shredded before processTerm ever sees them.
  return text.split(/[\n\r\p{Z}]+|[!"#$%&'()*+,:;<=>?@[\]^`{|}~]+/u).filter(Boolean);
}

function processTerm(rawTerm: string, _field: string): string | string[] | null {
  const trimmed = rawTerm.replace(/^[./-]+|[./-]+$/g, ''); // strip leading/trailing separators
  if (trimmed.length === 0) return null;
  const lower = trimmed.toLowerCase();
  if (!ID_OR_PATH_SHAPE.test(trimmed)) return lower; // ordinary word — single term
  // ID- or path-shaped: index the intact literal AND every split part.
  const parts = lower.split(/[./-]+/).filter((p) => p.length > 1);
  return [lower, ...parts];
}
```

This satisfies D-06 exactly: `ROLE-07` indexes as `["role-07", "role", "07"]`; `backend/src/authz
/mod.rs` indexes as `["backend/src/authz/mod.rs", "backend", "src", "authz", "mod", "rs"]`. A query
for the intact string will only ever match one document (or a small set), so it naturally scores far
higher under MiniSearch's BM25 ranking (`[VERIFIED: node_modules minisearch@7.2.0 dist/es/index.js:1918`
` — defaultBM25params = { k: 1.2, b: 0.7, d: 0.5 }]`) than the same query matching the common split
parts across many documents — satisfying D-06's "ranking alone can only prefer the right answer" note
without any extra boost configuration, though `boost`/`boostDocument` remain available if measurement
against the real corpus later shows it's insufficient (Claude's Discretion item).

### Pattern 2: Search-time options for D-05 (exact + trailing-prefix, no fuzzy)

```typescript
// src/server/search-index.ts
const searchOptions = {
  prefix: true,
  fuzzy: false,           // D-05: never fuzzy — a typo must produce an honest empty result
  combineWith: 'AND' as const, // multi-word queries require every term present
  boost: { title: 3, frontmatter: 2 }, // Claude's Discretion: title/frontmatter hits ranked over body
};
```
`[VERIFIED: node_modules minisearch@7.2.0 dist/es/index.js:1951-1958]` — `defaultSearchOptions` shows
`prefix: false, fuzzy: false` as the library default; setting `prefix: true` explicitly is required to
get D-02's as-you-type behavior, and NOT setting `fuzzy` (or explicitly `false`) is what D-05 requires
— MiniSearch does not enable fuzzy unless told to, so this is confirming an omission is safe, not
guarding against an unwanted default.

Because both indexing and query-time tokenization go through the same custom `tokenize`/`processTerm`
(MiniSearch uses the indexing tokenizer for queries unless a `searchOptions.tokenize` override is
supplied — `[CITED: MiniSearch README, "tokenize: function used to split fields into individual terms.
By default, it is also used to tokenize search queries"]`), typing `ROLE-0` produces query terms
`["role-0", "role", "0"]`; with `prefix: true`, `role-0` prefix-matches the indexed `role-07` term
directly — this is the mechanism that makes D-02's no-Enter-required interaction actually resolve to
the exact ID as the user finishes typing it, without waiting for the full ID.

### Pattern 3: Snippet extraction from source markdown, not MiniSearch (D-08)

**What:** MiniSearch's `search()` returns a `match: { [indexedTerm]: fieldName[] }` object per result
(`[VERIFIED: node_modules minisearch@7.2.0 dist/es/index.d.ts:608-616]` — `MatchInfo` is documented as
"a key-value object where keys are terms that matched, and values are the list of fields that the term
was found in"). It does not return snippets or offsets — that is entirely this project's job, over the
artifact's raw `body` (the same field the renderer receives, per `src/rendering/markdown.ts`'s
`ArtifactRenderer.render` signature — never the rendered HTML).

**Recommended approach:**
```typescript
// src/presentation/search.ts
function extractSnippet(body: string, matchedTerms: string[], windowChars = 160): { text: string; matchStart: number; matchEnd: number } | null {
  // matchedTerms = Object.keys(result.match) — the actual INDEXED terms (post
  // processTerm), so they are already the exact literal to search for
  // case-insensitively in the raw markdown body.
  let best: { index: number; term: string } | null = null;
  for (const term of matchedTerms) {
    const index = body.toLowerCase().indexOf(term.toLowerCase());
    if (index >= 0 && (!best || term.length > best.term.length)) {
      // Prefer the longest matched term — the intact ID/path literal (D-06)
      // is always longer than its split parts, so this naturally centers the
      // snippet on the ID/path match over a generic word match.
      best = { index, term };
    }
  }
  if (!best) return null;
  const start = Math.max(0, best.index - windowChars / 2);
  const end = Math.min(body.length, best.index + best.term.length + windowChars / 2);
  return { text: body.slice(start, end), matchStart: best.index - start, matchEnd: best.index - start + best.term.length };
}
```
Render the snippet by escaping the whole window as text (React's default JSX text-node escaping is
sufficient — never `dangerouslySetInnerHTML` on raw corpus text) and wrapping only the
`[matchStart, matchEnd)` slice in a `<mark>`/`<span>` — see Security Domain for why this ordering
matters. Deep-link the snippet to the nearest heading anchor using the same `stableSlug()` algorithm
`src/rendering/markdown.ts` already applies (`[VERIFIED: src/rendering/markdown.ts:91-103]` —
lowercases, NFKD-normalizes, strips combining marks, replaces `[^\p{Letter}\p{Number}\s_-]`, collapses
`[\s_]+` to `-`), by finding the nearest preceding `^#{1,6}\s+` line in the raw body and running it
through the same normalization, so the fragment always matches an `id` the renderer actually emitted.

### Pattern 4: Non-blocking index construction, explicit readiness state (D-04, FIND-05)

**What:** The search index is built by a plain synchronous constructor call
(`new MiniSearch(options); index.addAll(documents)`) which, per MiniSearch's own docs, is fine for
"a few hundred documents" but should still never run on the request-serving critical path per D-04.

**Recommended shape** — mirrors the existing `buildArtifactIndex` construction site in
`src/server/index.ts:36` but scheduled to run AFTER `createApp` returns, not inside it:

```typescript
// src/server/search-index.ts
export type SearchIndexState =
  | { status: 'building' }
  | { status: 'ready'; index: MiniSearch; builtAt: string }
  | { status: 'error'; message: string };

export function createSearchIndexState(): { state: () => SearchIndexState; buildFrom: (snapshot: ProjectSnapshot) => void } {
  let current: SearchIndexState = { status: 'building' };
  return {
    state: () => current,
    buildFrom(snapshot) {
      // setImmediate (not a synchronous call) so this never runs before the
      // HTTP server has started accepting connections.
      setImmediate(() => {
        try {
          const index = buildMiniSearchIndex(snapshot); // addAll() over every artifact
          current = { status: 'ready', index, builtAt: new Date().toISOString() };
        } catch (err) {
          current = { status: 'error', message: err instanceof Error ? err.message : String(err) };
        }
      });
    },
  };
}
```
```typescript
// src/server/index.ts — inside createApp(), alongside the existing artifactIndex/presentation lines
const searchIndexState = createSearchIndexState();
searchIndexState.buildFrom(source.getSnapshot());

app.get('/api/search', (c) => {
  const q = c.req.query('q') ?? '';
  const state = searchIndexState.state();
  if (state.status !== 'ready') {
    return c.json({ status: state.status, results: [], groups: [] }); // never 404/500, D-04
  }
  return c.json({ status: 'ready', ...runSearch(state.index, q) });
});
```

**Client-side stale-response guard (D-02):** pass `fetch(url, { signal })` where `signal` comes from
the `queryFn`'s second argument — TanStack Query provides an `AbortSignal` to every `queryFn` and
aborts it automatically when the query key changes or the component unmounts before the promise
resolves `[CITED: tanstack.com/query/latest/docs/framework/react/guides/query-cancellation, 2026]`.
Keying the debounced dropdown query on `['search', 'dropdown', query]` means every keystroke's
in-flight request is cancelled the instant a newer one starts, which is the guard D-02 requires,
using the client library the project already depends on (`@tanstack/react-query` `5.102.3`,
`[VERIFIED: package.json]`) rather than a hand-rolled request-counter/ref pattern.

**Poll-until-ready, not push:** because there is no watcher yet (PLAT-01 is v2), the simplest correct
client behavior is: on a `status: 'building'` response, keep the existing debounce/refetch cadence
running (react-query's `refetchInterval` set conditionally while `status !== 'ready'`) rather than
introducing SSE for this phase — `streamSSE` is reserved by `STACK.md` for the v2 watcher transport,
not for a build that (per this corpus's size — a few hundred files) resolves in low seconds.

### Pattern 5: D-11's assembly-gap fix — extend, don't parallel-walk

**The exact gap**, read directly this session:

```typescript
// src/planning-repo/assemble.ts:157-162 — Project.artifacts today: ROOT ONLY
// [VERIFIED: src/planning-repo/assemble.ts:157-162]
export function assembleDomainModel(parsed: ParsedArtifact[], _warnings: ParseWarning[], rootPath: string): Project {
  const rootArtifacts = parsed.filter((p) => p.ref.location === 'root');
  const artifacts: Record<string, Artifact> = {};
  for (const p of rootArtifacts) {
    artifacts[p.ref.path] = toDomainArtifact(p);
  }
```
```typescript
// src/planning-repo/assemble.ts:183-195 — the ONLY two locations grouped into phases
// [VERIFIED: src/planning-repo/assemble.ts:183-195]
  for (const p of parsed) {
    if (p.ref.location === 'phase' && p.ref.phaseIdentity) {
      ...
    } else if (p.ref.location === 'archived-phase' && p.ref.phaseIdentity) {
      ...
    }
  }
```
Every other location — `'quick' | 'milestone-root' | 'research' | 'other'` — is parsed by
`parseWithRegistry` (they went through the same handler dispatch as everything else) and then simply
never referenced again in `assembleDomainModel`. This is confirmed by the `ArtifactLocation` union
itself: `[VERIFIED: src/planning-repo/types.ts:36]`
```typescript
export type ArtifactLocation = 'root' | 'phase' | 'archived-phase' | 'quick' | 'milestone-root' | 'research' | 'other';
```
— seven members, only three consumed.

`QuickTask` today (`[VERIFIED: src/domain/model.ts:174-179]`):
```typescript
export interface QuickTask {
  id: string;
  path: string;
  /** The matching row from STATE.md's "Quick Tasks Completed" table — the authoritative status index for quick/ — when one exists. */
  stateRow: Record<string, unknown> | null;
}
```
— `path` is a directory, not a list of artifacts; confirmed by `assemble.ts:281-297`'s
`quickGroups: Map<string, string>` (quickTaskId → **directory** path, discarding every individual
`ParsedArtifact` in that directory after only using it to populate the map key).

**Recommended minimal-diff fix** (preserves every existing shape the Phase 1 goldens and Phase 2 views
already consume, per D-11's own instruction):

1. Broaden the root-artifacts filter (`assemble.ts:158`) to also catch `research`, `milestone-root`,
   and `other` — these three have no other natural home in the domain model (`research/`,
   `milestones/vX.Y-*.md` outside any phase, and truly unclassified files), so folding them into the
   same `Project.artifacts` map root docs already use is the smallest change that makes every file
   "reachable" per D-11's wording, without inventing a new top-level collection:
   ```typescript
   const looseArtifacts = parsed.filter((p) =>
     p.ref.location === 'root' || p.ref.location === 'research' ||
     p.ref.location === 'milestone-root' || p.ref.location === 'other'
   );
   ```
   The tree/search consumer distinguishes them by `artifact.path`'s leading segment
   (`.planning/research/...` vs `.planning/PROJECT.md` vs `.planning/milestones/v1.0-ROADMAP.md`), not
   by a new domain field — `Artifact.path` already carries this information losslessly.
2. Extend `QuickTask` with an `artifacts: Record<string, Artifact>` map, populated the same way
   `buildPhaseFromGroup` already populates `Phase.artifacts` — the `quickGroups` loop at
   `assemble.ts:284-290` already iterates every `quick`-location `ParsedArtifact`; it currently only
   uses it to compute the directory path (`dirname(p.ref.path)`) and discards `p` itself. Collecting
   `p` into a `Map<quickTaskId, ParsedArtifact[]>` instead of `Map<quickTaskId, string>` costs one extra
   field and reuses `toDomainArtifact()` unchanged.
3. Do **not** add a second filesystem walk. `discover()` already produced every `ArtifactRef` up
   front (`src/planning-repo/discovery.ts:121-199`); `parseWithRegistry` already parsed every one of
   them (confirmed by `snapshot.ts:75`: `Promise.all(refs.map((ref) => parseWithRegistry(...)))` — this
   runs over ALL `refs`, not a filtered subset). The gap is purely in `assembleDomainModel`'s
   consumption, not in discovery or parsing.

### Pattern 6: Tree navigator — projection, not a second walk (D-10, NAV-01)

The tree's three data needs are already fully present in the (post-D-11-fix) snapshot:
- **Structure**: every `Artifact.path` (e.g. `.planning/phases/03-search-browsing-traceability/03-CONTEXT.md`) is a full relative path; splitting on `/` reconstructs the literal directory tree with zero new I/O.
- **Files the parser never recognized**: `Artifact.kind === 'unknown'` (GenericMarkdownHandler's
  `kind: 'unknown'`, `[VERIFIED: src/planning-repo/handlers/generic.ts:13]`) still produces a full
  `Artifact` — it renders as an ordinary tree node per D-10, using the "generic markdown fallback view"
  (Claude's Discretion item resolved: yes, this is the obvious and only existing candidate).
- **Recorded exclusions**: `snapshot.exclusions: DiscoveryExclusion[]` (`[VERIFIED:
  src/planning-repo/types.ts:52-56,85-91]`) already carries `{ path, reason }` for the
  `research/.cache/` skip and any depth-terminated walk — render these as the "explicitly-marked
  stubs" D-10 requires, keyed by the excluded `path` prefix.

Build the tree view-model server-side (`src/presentation/tree.ts`), grouping by the same
`ArtifactLocation` taxonomy `discovery.ts`'s own `LOCATION_ORDER` already fixes
(`[VERIFIED: src/planning-repo/discovery.ts:175-183]`: `root: 0, phase: 1, 'archived-phase': 2, quick: 3, 'milestone-root': 4, research: 5, other: 6`), so the tree's top-level group ordering matches the
one deterministic ordering the codebase already committed to, rather than inventing a second one.

Every tree node resolves through the existing route builders — `buildArtifactUrl`, `buildPlanUrl`,
`buildPhaseUrl` (`src/presentation/routes.ts`) — never a hand-built href, per the Canonical Refs
instruction. A phase directory node resolves via `buildPhaseUrl(phase.identity)`; a leaf artifact
resolves via `buildArtifactUrl(owningPhaseIdentityOrNull, artifact.path)` — the same
`owner ?? null` lookup `artifactDtos()` in `project-presentation.ts:379-404` already performs.

### Pattern 7: Traceability view — projection over already-resolved data (D-13–D-16, NAV-05)

`RequirementDto.coveringPhases: { raw: string; targetPhaseKey: string | null }[]`
(`[VERIFIED: src/server/project-presentation.ts:110-117, 365-377]`) already carries everything D-13/
D-15 need per requirement: the raw traceability-table phase text, and (if resolved) a `phaseKey` that
can be looked up against `presentation.milestones[].phases[]` for that phase's OWN `diskStatus` and
`roadmapComplete` — the second, independent status signal D-13 requires never be merged with the
requirement's own `checked` field. A `targetPhaseKey: null` with a non-empty `raw` string IS D-15's
"dangling phase reference... raw text plus an explicit unresolved marker" case, already distinguishable
without new backend logic — D-15's requirement is a rendering rule, not a new resolution.

Grouping by `RequirementDto.category` (`[VERIFIED: src/server/project-presentation.ts:110-117]`,
sourced from `RequirementItem.category` — the REQUIREMENTS.md subsection heading text, e.g. "Targeting
& Portability") already matches D-14's "reads the way the source document does" requirement verbatim,
since `category` IS the literal subsection heading text captured by
`splitSubsections` in `handlers/requirements.ts:35`.

`tier` (`'v1' | 'v2' | 'future'` or the open string fallback, `[VERIFIED:
src/planning-repo/handlers/requirements.ts:23-28]`) is exactly the field D-15's "own clearly-labeled
section" for v2/future requirements needs — filter on `tier !== 'v1'` (or the config-open equivalent)
to build that second section, no new parsing.

### Anti-Patterns to Avoid

- **A second `PlanningFilesystem` walk for the tree.** ARCHITECTURE.md's Anti-Pattern 3 (named directly
  in D-11) forbids "no second, parallel view of the corpus built from a different pass." The tree must
  read `Project`/`snapshot.exclusions`, never call `discover()` a second time.
- **Indexing rendered HTML.** Confirmed nowhere in this codebase does a renderer output get cached
  server-side for reuse — `createArtifactRenderer()`'s `render()` is called per-request in
  `artifactResponse()` (`src/server/index.ts:41-43`). The search index MUST be built from
  `Artifact.body` (source markdown), never from a call into `renderer.render()`.
  `Artifact.body` is already frontmatter-stripped (every handler's `tryParseFrontmatter` split already
  removed the YAML block) — the "pseudo-XML-tag-stripped" half of the Claude's Discretion note requires
  an explicit strip pass over `PlanSegment` wrapper tags (`src/rendering/plan-segments.ts`) before
  indexing a `PLAN.md`'s body, or those tags become spurious indexed tokens.
- **Blocking `createApp()` / `startServer()` on `new MiniSearch(...).addAll(...)`.** This is the literal
  restatement of D-04/FIND-05 and Pitfall 8's failure mode #1 — do not call the MiniSearch constructor
  or `addAll` synchronously inside `createApp`.
- **A disabled search input while indexing.** D-04 is explicit: "never a disabled control." The
  `Combobox`'s native input must remain interactive throughout; only the results area shows the
  `Indexing…` transient.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full-text indexing, BM25 ranking, incremental add/discard | A hand-rolled inverted index | `MiniSearch` (`add`/`addAll`/`discard`/`discardAll`/`replace`, `[VERIFIED: node_modules minisearch@7.2.0 dist/es/index.d.ts]`) | BM25 scoring, field-length normalization, and prefix/fuzzy search are non-trivial to get right; MiniSearch already ships all three, tested against millions of weekly installs. |
| Stale-response race guarding on debounced input | A manual request-counter/ref-comparison pattern | `@tanstack/react-query`'s built-in `AbortSignal` passed to `queryFn`, keyed on the query text | Already a project dependency; the abort-on-requery behavior is documented, standard TanStack Query behavior, not a bespoke mechanism to maintain. |
| Directory tree construction | A second recursive `fs.readdir` walk from the web layer | `discovery.ts`'s already-computed `ArtifactRef[]` (via the assembled `Project`) plus `snapshot.exclusions` | `discover()` already handles depth-cycle guarding, deterministic sorting, and exclusion recording (`MAX_WALK_DEPTH`, `SKIPPED_DIRS`) — duplicating any of that logic in a second walk risks the two views disagreeing, which ARCHITECTURE.md's Anti-Pattern 3 exists specifically to prevent. |
| Requirement→phase resolution | A second traceability-table parser/resolver in the search or tree layer | `crossref.ts`'s already-resolved `Requirement.coveringPhaseRefs` | The resolution (scoped to the live milestone, many-to-many, dangling-safe) is already correct and tested against Phase 1's goldens; re-deriving it risks drift from the one true resolution. |

**Key insight:** Every "hard" piece of this phase already has an existing, correct implementation one
layer down in the stack (MiniSearch's own extension points, TanStack Query's cancellation, this
project's own discovery/crossref modules). The actual engineering work in this phase is almost
entirely *wiring*, not new algorithms — the one place that genuinely needs new logic is the
tokenize/processTerm pair (Pattern 1) and the snippet extractor (Pattern 3), both of which are small,
pure functions with no external dependency.

## Common Pitfalls

### Pitfall 1: Trusting the default MiniSearch tokenizer

**What goes wrong:** `ROLE-07` search returns zero results, or returns every file containing the word
"role" ranked no differently from files containing the literal ID.
**Why it happens:** `SPACE_OR_PUNCTUATION` treats `-`, `/`, `.` as term separators by default — this is
by design for prose search, wrong for an ID/path-dense corpus.
**How to avoid:** Pattern 1 above — custom `tokenize` + `processTerm` returning both the whole token
and its parts.
**Warning signs:** A manual test searching the literal string `ROLE-07` (or any real requirement ID
from `REQUIREMENTS.md`) does not return the file containing it, or returns it with the same score as
files that merely mention "role" and "07" unrelated to each other.

### Pitfall 2: Snippet built from rendered HTML or from `dangerouslySetInnerHTML` on raw corpus text

**What goes wrong:** Either (a) the snippet extractor searches `renderer.render(artifact).html` instead
of `artifact.body`, which re-introduces exactly the rendered-vs-source mismatch D-06/FIND-02 exist to
prevent (Shiki-highlighted code splits a token across multiple `<span>`s; heading-copy buttons and
`data-*` attributes pollute the text), or (b) the extracted raw-markdown window is injected via
`dangerouslySetInnerHTML` to bold the match, which — unlike the existing renderer pipeline — has NO
`rehype-sanitize` step between raw content and the DOM. See Security Domain.
**How to avoid:** Extract from `Artifact.body` only (Pattern 3); render the snippet as an escaped React
text node with only the matched substring wrapped in a `<mark>` element built via JSX, never raw HTML
concatenation.
**Warning signs:** A code review finds `dangerouslySetInnerHTML` anywhere in the new search-result
component; a snippet containing a literal `<script>`-looking string from a pasted code block (PITFALLS.md
Pitfall 7 already confirmed this corpus contains literal HTML-like text in some artifacts) renders as
anything other than visible escaped text.

### Pitfall 3: Building the index before the snapshot is fully loaded

**What goes wrong:** Because `createApp(source, ...)` today calls `source.getSnapshot()` synchronously
at construction time (`src/server/index.ts:36`, `38`), and `startServer` already awaits
`repository.load()` before calling `createApp` (`src/server/index.ts:146-147`), the snapshot itself is
always ready by the time `createApp` runs — the risk is specifically in scheduling the (new) MiniSearch
build to also run synchronously inside `createApp`, re-coupling "server ready" to "index ready" even
though the snapshot was already available.
**How to avoid:** Pattern 4 — schedule the MiniSearch build via `setImmediate` (or equivalent),
explicitly, even though the input data is already present; the point is decoupling *CPU time spent
building the index* from *time to first byte on any other route*, not waiting for missing data.
**Warning signs:** `npm run smoke`'s dashboard/root fetch (already gating CI, per `server/index.ts`'s
existing `--smoke` path) becomes measurably slower after this phase lands — that's the exact signal
that index construction leaked onto the startup path.

### Pitfall 4: A second, disagreeing view of "every file" for the tree vs. search

**What goes wrong:** If the tree is built from `discovery.ts`'s raw `ArtifactRef[]` directly (bypassing
`assembleDomainModel`) while search indexes the assembled `Project`, a file that D-11's fix somehow
misses (or a future regression reintroduces) shows up in the tree but never in search results, or vice
versa — silently reintroducing ARCHITECTURE.md's named Anti-Pattern 3.
**How to avoid:** Both the tree projection and the search index build MUST read from the same
already-assembled `Project` (post-D-11-fix), never from two different pipeline stages.
**Warning signs:** A file visible in the tree navigator that a full-text search for its own filename
does not surface (or vice versa) is the exact regression D-11's own text warns about ("Search and the
tree both read that one snapshot — no second, parallel view").

## Code Examples

### Wiring `/api/search` alongside the existing routes

```typescript
// src/server/index.ts — additive to the existing createApp() body
import { createSearchIndexState, runSearch } from './search-index.ts';

export function createApp(source: SnapshotSource, production = ..., staticRoot = './dist'): Hono {
  const app = new Hono();
  const artifactIndex = buildArtifactIndex(source.getSnapshot());   // existing, unchanged
  const renderer = createArtifactRenderer();                        // existing, unchanged
  const presentation = toProjectPresentation(source.getSnapshot()); // existing, unchanged
  const referenceRegistry = buildReferenceRegistry(presentation);   // existing, unchanged

  const searchIndexState = createSearchIndexState();
  searchIndexState.buildFrom(source.getSnapshot()); // scheduled via setImmediate internally

  app.get('/api/search', (c) => {
    const q = c.req.query('q') ?? '';
    const state = searchIndexState.state();
    if (state.status !== 'ready') return c.json({ status: state.status, groups: [] });
    return c.json({ status: 'ready' as const, ...runSearch(state.index, presentation, q) });
  });

  // ...existing routes unchanged...
}
```

### Client stale-response guard using existing dependencies

```typescript
// src/web/components/search-field.tsx
async function fetchSearch(query: string, signal: AbortSignal): Promise<SearchResponse> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal });
  if (!response.ok) throw new Error(`Search request failed (${response.status})`);
  return (await response.json()) as SearchResponse;
}

const [query, setQuery] = useState('');
const [debounced, setDebounced] = useState('');
useEffect(() => {
  const id = setTimeout(() => setDebounced(query), 160); // D-02: 120–200ms band
  return () => clearTimeout(id);
}, [query]);

const search = useQuery({
  queryKey: ['search', 'dropdown', debounced],
  queryFn: ({ signal }) => fetchSearch(debounced, signal), // TanStack aborts stale requests automatically
  enabled: debounced.length > 0,
  refetchInterval: (q) => (q.state.data?.status === 'building' ? 500 : false), // poll while indexing
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| MiniSearch pre-6.x TF-IDF scoring | BM25 scoring (`defaultBM25params = { k: 1.2, b: 0.7, d: 0.5 }`) | MiniSearch 6.0.0 (per registry version history — `[VERIFIED: npm view minisearch versions]`) | Better length-normalized relevance ranking on a corpus with wildly varying document lengths (this project's own artifacts range from short `CONTEXT.md` files to 900+ line `PLAN.md`s per PITFALLS.md) — no code change needed to benefit, just don't assume TF-IDF-era mental models when tuning `boost`/`weights`. |

**Deprecated/outdated:** None specific to this phase — MiniSearch 7.2.0 is the current `latest`
dist-tag with no announced deprecation.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `refetchInterval` polling (rather than SSE) is sufficient UX for index-build wait time on this corpus size | Pattern 4 | If the real corpus this tool is run against is far larger than studio-portal's ~234-file reference corpus, a multi-second "Indexing…" state with 500ms polling could feel sluggish — mitigated by MiniSearch's `addAllAsync` chunking if measured too slow. |
| A2 | Field boosting (`title: 3, frontmatter: 2`) as concrete starting weights | Pattern 2 | These are illustrative defaults, not measured against the real corpus — Claude's Discretion item explicitly leaves this open; treat as a starting point to tune against real search results, not a locked number. |
| A3 | `ID_OR_PATH_SHAPE` regex construction in Pattern 1's code example is a design sketch, not verified against every real ID/path variant in the actual `.planning/` corpus this tool will index | Pattern 1 | An ID or path shape not matched by this regex silently falls back to ordinary single-term indexing (loses the dual-index benefit, but never crashes or mis-indexes) — low risk, but should be spot-checked against a sample of real requirement IDs and file paths mentioned in this project's own corpus during implementation. |
| A4 | Debounce interval defaulting to 160ms (mid-band of D-02's 120–200ms) | Code Examples | Cosmetic only — D-02 explicitly delegates the exact number to implementer discretion. |
| A5 | `refetchInterval` value of 500ms while indexing | Pattern 4 / Code Examples | Cosmetic only, not specified anywhere in CONTEXT.md or UI-SPEC — tune based on observed index-build time. |

**All MiniSearch API claims in this document (tokenize/processTerm array-return, default options,
defaultSearchOptions, defaultBM25params, SearchResult/MatchInfo shape, discard/discardAll semantics)
are `[VERIFIED]` — read directly from the installed `minisearch@7.2.0` package's `dist/es/index.js` and
`dist/es/index.d.ts` this session via `npm pack minisearch@7.2.0`, not from training memory or a web
search summary.**

## Open Questions

1. **Where does `/api/traceability` live — a new route, or reuse of `/api/presentation`'s existing
   `requirements` array?**
   - What we know: `ProjectPresentation.requirements: RequirementDto[]` already carries every field
     D-13/D-14/D-15 need (id, category, text, tier, checked, coveringPhases).
   - What's unclear: whether the traceability page should fetch the whole `/api/presentation` payload
     (already fetched once by `AppShell` for the nav bar) via a shared react-query cache entry, or a
     dedicated slimmer `/api/traceability` endpoint that also joins in each covering phase's
     `diskStatus`/`roadmapComplete` (D-13's second status column) server-side rather than making the
     client cross-reference `phaseKey` against `milestones[].phases[]` itself.
   - Recommendation: a dedicated `/api/traceability` endpoint that does the phase-status join
     server-side (consistent with "server-side view models cross the boundary already shaped for
     display; no domain logic on the client") — cheap to add since all the source data is already in
     `ProjectPresentation`.

2. **Exact wave/plan split of the two plans this phase is sized at.**
   - What we know: CONTEXT.md's discretion note says D-11's snapshot extension "is a genuine
     prerequisite for both search coverage and the tree, so it likely belongs first."
   - What's unclear: whether traceability (which does NOT depend on D-11 — `Requirement`/`Phase` are
     already fully assembled today) should ship in the same plan as D-11+search, or as an independent
     parallel-safe plan since it has no dependency on the assembly fix.
   - Recommendation: Plan 1 = D-11 fix + search index + `/search` surfaces (the dependent chain);
     Plan 2 = tree navigator (depends on Plan 1's D-11 fix) + traceability view (independent, but small
     enough to not warrant a third plan) + the `AppShell` sidebar restructuring both the tree and (per
     UI-SPEC) every other route must be re-verified against.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | matches `@types/node` 22.20.1 in `package.json` (devDependency pin) | — |
| npm registry access | `npm install minisearch@7.2.0` | ✓ (confirmed this session via `npm view`) | — | — |

No other new external dependency is introduced by this phase — no database, no external service, no
new CLI tool (consistent with PROJECT.md's fully-local, filesystem-only constraint).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V5 Input Validation | yes | Search query string is passed to `MiniSearch.search()`, never to a shell, file-path constructor, or SQL-like interface — no injection surface beyond the search library's own tokenizer. Still validate/cap query length server-side (e.g. reject or truncate queries over a few hundred characters) to bound tokenization cost per request. |
| V5 Output Encoding (XSS) | yes | **New surface this phase introduces**: search-result snippets are built from raw, untrusted-by-construction markdown source text (this project's content is locally authored but partly LLM-generated across long sessions — PITFALLS.md Pitfall 7 already confirmed literal HTML-like text exists in the corpus) and rendered WITHOUT passing through the existing `rehype-sanitize` pipeline (`src/rendering/markdown.ts`'s `createProcessor()`), because snippets are plain substrings, not full markdown documents. The snippet renderer MUST treat the extracted window as plain text (React's default JSX escaping) and only wrap the matched-term span via JSX-constructed elements, never `dangerouslySetInnerHTML` with a manually-concatenated `<mark>` string — see Pitfall 2. |
| V4 Access Control | n/a | Single-user, local-only tool (PROJECT.md constraint); no auth boundary in this phase. |
| V6 Cryptography | n/a | Nothing new to encrypt or hash in this phase. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Reflected content injection via search snippet highlighting | Tampering / Information Disclosure (client-side, self-XSS-adjacent since this is a single-user local tool, but still a real DOM-injection class) | Escape-then-wrap: build the snippet as React text nodes; wrap only the verified match span in a `<mark>` JSX element. Never manually build an HTML string containing corpus-sourced text and inject it via `dangerouslySetInnerHTML`. |
| Regex denial-of-service in custom `tokenize`/`processTerm`/`ID_OR_PATH_SHAPE` | Denial of Service | This project already has a documented, deliberate convention for this exact risk class — `mentions.ts`'s own comment: "every pattern below is anchored on a word boundary with bounded quantifiers and no nested unbounded groups, so none of them can exhibit catastrophic backtracking regardless of input size or shape" (`[VERIFIED: src/planning-repo/mentions.ts:26-28]`). Any new regex introduced for search tokenization (Pattern 1's `ID_OR_PATH_SHAPE`) must be reviewed against the same standard — bounded quantifiers, no nested unbounded groups, anchored. |
| Unbounded query length driving unbounded tokenization work | Denial of Service | Cap incoming `?q=` length server-side before passing to `MiniSearch.search()`. |

## Sources

### Primary (HIGH confidence)
- `node_modules/minisearch@7.2.0/dist/es/index.js` and `index.d.ts`, obtained via `npm pack
  minisearch@7.2.0` and read directly this session — every MiniSearch API claim in this document.
- `src/planning-repo/assemble.ts`, `discovery.ts`, `crossref.ts`, `mentions.ts`, `types.ts`,
  `src/domain/model.ts`, `src/server/artifact-index.ts`, `src/server/index.ts`,
  `src/presentation/routes.ts`, `src/server/project-presentation.ts`,
  `src/planning-repo/handlers/requirements.ts`, `roadmap.ts`, `src/rendering/markdown.ts`,
  `src/web/components/app-shell.tsx`, `src/web/app-router.tsx`, `src/web/styles/globals.css` — all
  read directly this session, exact line ranges cited inline above.
- `npm view minisearch version` / `dist-tags` / full registry JSON, and `gsd_run query
  package-legitimacy check --ecosystem npm minisearch` — run this session, 2026-09-02.
- `.claude/CLAUDE.md` §"Technology Stack" — the resolved, non-negotiable stack decision for this
  project (Vite/Hono/React/react-router/react-query/MiniSearch/etc.).

### Secondary (MEDIUM confidence)
- `tanstack.com/query/latest/docs/framework/react/guides/query-cancellation` — TanStack Query v5's
  `AbortSignal` cancellation behavior (WebSearch-surfaced, cross-checked against the official TanStack
  docs domain).
- MiniSearch's own README (`raw.githubusercontent.com/lucaong/minisearch/master/README.md`) — narrative
  API description, cross-checked against and superseded in specificity by the direct source read above
  wherever the two could be compared.

### Tertiary (LOW confidence)
- None retained — every claim that could be checked against the installed package's own source or this
  project's own code was checked directly rather than left at web-search-summary level.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `minisearch` version, legitimacy, and full API surface verified directly
  against the installed package source, not training memory.
- Architecture: HIGH on integration points (all read directly from this repo's actual source this
  session); MEDIUM on the exact server-side module boundaries recommended (`search-index.ts`,
  `tree.ts`, `traceability.ts` are this research's proposed structure, not yet-existing code — planner
  should treat file names/boundaries as a strong recommendation, not a locked contract).
- Pitfalls: HIGH — every pitfall traces to either a verified MiniSearch behavior or an already-committed
  project convention (PITFALLS.md Pitfall 7/8, `mentions.ts`'s ReDoS-safety comment).

**Research date:** 2026-09-02
**Valid until:** 2026-10-02 (30 days — no fast-moving dependency risk; MiniSearch 7.x is stable, and the
codebase integration points researched here are internal to this project and won't drift without an
intervening phase changing them).

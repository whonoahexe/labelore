---
last_mapped_commit: 717c8d7db3d75717948b08690df3a087fc01684d
last_mapped_at: 2026-11-04
---
# Codebase Concerns

**Analysis Date:** 2026-11-04

Scope: the full repository, excluding `.claude/worktrees` and `node_modules`. Findings come from reading the source, the planning ledgers (`.planning/WINDOWS.md`, `.planning/RETROSPECTIVE.md`, `.planning/STATE.md`, `.planning/debug/knowledge-base.md`) and grep sweeps for risky APIs. No runtime or load testing was performed, so performance items are inferred from code shape and are marked as such.

## Tech Debt

**Oversized modules:**
- Issue: Several files have grown well past what a reader can hold in one pass. Each mixes parsing, shaping and presentation concerns.
- Files: `src/planning-repo/handlers/research-briefing.ts` (1879 lines), `src/web/pages/artifact-page.tsx` (1476), `src/planning-repo/handlers/context-brief.ts` (1421), `src/planning-repo/handlers/project-research-lift.ts` (1227), `src/planning-repo/handlers/debug-session.ts` (1150), `src/planning-repo/handlers/ui-review-audit.ts` (1125), `src/planning-repo/handlers/verification-report.ts` (1105), `src/server/project-registry.ts` (761)
- Impact: Changes to one artifact type are hard to review in isolation. Regex-heavy extraction in these files is difficult to audit (see Fragile Areas).
- Fix approach: When touching one of these, extract the pure parsing step into a sibling module with its own unit tests before adding features. Do not refactor them wholesale.

**One handler per artifact type, bespoke parsing each time:**
- Issue: Each GSD artifact type has its own handler under `src/planning-repo/handlers/`. Frontmatter reading is shared (`src/planning-repo/frontmatter.ts`, `tryParseFrontmatter`), but section extraction, heading matching and regex parsing are reimplemented per handler.
- Files: `src/planning-repo/handlers/`, `src/planning-repo/frontmatter.ts`, `src/planning-repo/handlers/section-projection.ts`
- Impact: A fix in one handler's heading or table parsing does not reach its siblings. Compatibility with GSD artifact drift (a stated project constraint) has to be fixed per file.
- Fix approach: Route new section-level parsing through `section-projection.ts` rather than adding another local regex.

**Documentation drift in the project instructions:**
- Issue: `.claude/CLAUDE.md` records the research-time stack (TypeScript 7.0.2, Hono 4.13.3, mermaid 11.17.0) and says "Architecture not yet mapped". `package.json` pins TypeScript 5.9.3, Hono 4.13.4 and mermaid 11.17.1.
- Files: `.claude/CLAUDE.md`, `package.json`
- Impact: A planner or executor reading CLAUDE.md gets a stack that does not match the installed one.
- Fix approach: Regenerate the stack section from `package.json` and point the architecture section at `.planning/codebase/ARCHITECTURE.md`.

**Deferred human verification recorded as "fixed":**
- Issue: `.planning/WINDOWS.md` reports `open_count: 0`, but entries 8 and 9 are `unrun-verify` items whose live visual or motion checks were deferred "to end-of-phase human verification". They are marked `fixed` on the strength of automated tests.
- Files: `.planning/WINDOWS.md` (rows 8 and 9), `src/web/components/route-progress.tsx`, `src/web/styles/globals.css`
- Impact: The ledger suggests nothing is outstanding while two real-browser checks (reduced-motion behaviour of the route progress bar, and the scrollbar reveal in both themes) have never been run.
- Fix approach: Run the two checks on the live server and record the result, or reopen the entries.

**Regression tests recorded as debt and not written:**
- Issue: The v1.0 retrospective notes three regression tests that were "noted rather than added" and carried forward: a ReDoS timing test, a guard against `dangerouslySetInnerHTML` misuse, and a view-mode outline cap.
- Files: `.planning/RETROSPECTIVE.md` (lines 110-111, 137), `src/web/pages/artifact-page.tsx` (line 260 uses `dangerouslySetInnerHTML`)
- Impact: The safety property the `dangerouslySetInnerHTML` guard would protect (only sanitized HTML reaches that prop) is currently held only by convention.
- Fix approach: Add the guard as a test that fails on any new `dangerouslySetInnerHTML` outside an allowlist of files.

**Open test-hygiene warnings:**
- Issue: `.planning/STATE.md` (line 202) lists five test-hygiene review warnings still open from Phase 6. WR-02 is the one it calls worth fixing first: the no-skips scan's comment blanker hides test headers that appear after `//` inside string literals.
- Files: `.planning/STATE.md`, `test/` (the no-skips scan lives in the test gate tooling, `test/helpers/vitest-gate.mjs`)
- Impact: The no-skips gate can miss a skipped test whose header sits after a `//` in a string.
- Fix approach: Fix the blanker to tokenise string literals before stripping comments.

## Known Bugs

**No open defects in the ledger:**
- Symptoms: None recorded. `.planning/WINDOWS.md` shows nine entries, all `fixed`.
- Note: The ledger entries are only as good as the verification behind them. See "Deferred human verification" above.

**Startup mode depends on `NODE_ENV`:**
- Symptoms: On a previous occasion the tunnel origin ran `node src/server/index.ts` with `NODE_ENV` unset. The server then served the Vite dev middleware instead of `./dist`, and the first page load took roughly 12 seconds over a 150 ms round trip.
- Files: `src/server/index.ts` (production flag is derived from `process.env.NODE_ENV === 'production'`), `package.json` (the `dev` script runs `node src/server/index.ts` directly)
- Trigger: Running the entry file without `NODE_ENV=production` in any deployed or tunnelled context.
- Workaround: Use `npm start` (sets `NODE_ENV=production`). The root cause is recorded in `.planning/debug/knowledge-base.md` under `loading-state-regression`.
- Fix approach: Make the mode an explicit flag on the entry point, or refuse to serve the dev middleware when a non-loopback `LABELORE_ALLOWED_HOSTS` entry is set.

## Security Considerations

**Remote project mirroring copies the whole `.planning/` tree to local disk:**
- Risk: `src/server/remote-source.ts` runs `tar -cf - .planning` over ssh and extracts it into a local temp directory, which holds the full planning tree, including `config.json` with its secret keys in plaintext. Secret masking happens only in memory at display time (`src/planning-repo/secret-mask.ts`). The temp copy is not masked.
- Files: `src/server/remote-source.ts` (mirror and cleanup), `src/cli/remote-target.ts` (`buildMirrorCommands`), `src/planning-fs/local-fs.ts` (`createTempDirSync`, `removeTempDirSync`), `src/planning-repo/secret-mask.ts`
- Current mitigation: Temp directories are created mode 0700 under the OS temp dir. The remote side only runs a path check and `tar -c`, so the remote host is never written to. ssh runs with `BatchMode=yes` and no password, and remote paths are single-quoted.
- Recommendations: Document that a remote mirror leaves plaintext on local disk until the process exits. Check whether `removeTempDirSync` runs on process signals as well as on mirror replacement. A plausible cleanup gap is a crash or SIGKILL, which would leave the mirror behind. Consider masking secret keys in the mirror, or excluding `config.json` from the tar.

**Mirror size and time are unbounded:**
- Risk: The mirror has no size cap. Its only limit is a 120-second timeout (`DEFAULT_TIMEOUT_MS` in `src/server/remote-source.ts`). A large `.planning/` tree, or one containing large generated assets, can fill the local temp directory before the timeout fires.
- Files: `src/server/remote-source.ts` (line 29)
- Current mitigation: Timeout only.
- Recommendations: Cap the tar stream by bytes, and surface a failure status when the cap is hit.

**Sketch HTML runs scripts from the target project:**
- Risk: Sketch files from a project's `.planning/` are served with `Content-Security-Policy: sandbox allow-scripts`, so their scripts run in an opaque origin. That keeps them away from the app's API, but they still execute code that a project author wrote, or that arrived through a cloned repository.
- Files: `src/server/sketch-files.ts` (`SECURITY_HEADERS`, lines 23-27; font CORS wildcard at line 157)
- Current mitigation: Opaque origin under the sandbox directive. The `/api` request guard does not apply to these routes. Font responses are the only ones given `Access-Control-Allow-Origin: *`.
- Recommendations: Keep the opaque-origin sandbox. Add a test that asserts the header on every sketch response, including directory redirects and error responses.

**Raw HTML in planning markdown is sanitized with an extended schema:**
- Risk: The markdown pipeline runs `rehype-raw` and then `rehype-sanitize` with a schema extended from `defaultSchema`. The extension allows `className` on every element and `checked`, `disabled` and `type` on `input`. Correctness depends on sanitize running before any trusted plugin adds markup. That order is correct today (`src/rendering/markdown.ts`, lines 300-315), but nothing enforces it.
- Files: `src/rendering/markdown.ts`, `src/web/pages/artifact-page.tsx` (line 260)
- Current mitigation: Sanitize runs before `rehypeResolvedReferences`, `rehypeSlug` and `trustedEnrichment`.
- Recommendations: Add a test that feeds `<img src=x onerror=...>`, `<a href="javascript:...">` and `<script>` through the full pipeline and asserts that all three are removed. This is the regression test noted as debt above.

**Secret masking uses a hard-coded key list:**
- Risk: `SECRET_CONFIG_KEYS` in `src/planning-repo/secret-mask.ts` holds three top-level keys (`brave_search`, `firecrawl`, `exa_search`). A new secret key added by GSD would display in plaintext.
- Files: `src/planning-repo/secret-mask.ts`
- Current mitigation: Keys are copied from GSD's own `secrets.cjs`. Nested values under a secret key are masked fail-closed.
- Recommendations: Add a test that compares the list against the GSD version the project pins, and warn in the settings page when `config.json` contains top-level keys that look like credentials but are not on the list.

**Host allowlist widens by environment variable:**
- Risk: `LABELORE_ALLOWED_HOSTS` adds extra accepted `Host` values. It is opt-in and rejects wildcards, which is correct. The API is read-only apart from settings, but a tunnel that is not intended to be public would still expose every project it can read.
- Files: `src/server/request-guard.ts` (`parseAllowedHosts`, `createHostPolicy`), `src/server/index.ts` (`HOSTNAME = '127.0.0.1'`, line 23)
- Current mitigation: Loopback-only binding. DNS-rebinding protection on every request. No `Access-Control-*` headers.
- Recommendations: Nothing urgent. Make the server log a line at startup listing the extra hosts it accepts.

## Performance Bottlenecks

**Full snapshot rebuilt per project load (inferred):**
- Problem: Loading a project reads and parses every `.planning/` file, then builds a search index and a route table. The code shape suggests this happens on each load and each refresh, with no incremental path.
- Files: `src/planning-repo/snapshot.ts`, `src/server/search-index.ts`, `src/server/artifact-index.ts`, `src/presentation/route-table.ts`
- Cause: No file watcher ships in v1 (CLAUDE.md lists it as a future direction). Each load is a full read.
- Improvement path: Cache per-file parse results keyed by path and mtime. This would also be the seam the planned watcher needs. Measure first on a large real project; this has not been timed.

**Synchronous filesystem calls on the server path:**
- Problem: `src/server/settings-store.ts` uses `readFileSync`, `writeFileSync`, `renameSync` and `realpathSync` inside request handlers. There are 13 `*Sync` calls across `src/server/`.
- Files: `src/server/settings-store.ts`, `src/server/remote-source.ts`, `src/server/sketch-files.ts`
- Cause: The settings file is small, so the block is short. It is still a block on the single event loop.
- Improvement path: Low priority. Move the settings read to `fs/promises` if settings grow.

**Remote mirror runs on the request path:**
- Problem: An ssh mirror of a remote project can take up to 120 seconds, and the mirror lives in the same process that serves other projects.
- Files: `src/server/remote-source.ts`
- Cause: The mirror is awaited inside the project load.
- Improvement path: Show the cached snapshot while a refresh runs in the background, and report the refresh state separately.

## Fragile Areas

**Regex-driven parsing of free-form markdown:**
- Files: `src/presentation/project-research.ts`, `src/presentation/project-research-panels.ts`, `src/rendering/plan-segments.ts`, `src/presentation/sketches.ts`, `src/presentation/references.ts`
- Why fragile: Many patterns match prose that GSD generates, such as `Phase N` labels, `**Bold:**` leads, em-dash separated clauses and "mitigated" phrasing. Each is length-capped (`{1,200}`, `{40,}`), which limits backtracking, but an edit to the source artifact wording silently changes what gets extracted.
- Safe modification: Add a fixture-based test for each pattern before changing it. The fixtures live under `fixtures/`. Do not loosen a length cap without a timing test.
- Test coverage: Unit tests exist for the presentation layer. The ReDoS timing test named in the retrospective is missing.

**Source-text contract tests with an implicit oracle:**
- Files: `test/web/loading-state-contract.test.ts`, and others of the same kind
- Why fragile: These tests assert that a file contains certain identifiers. They pass when the parts exist but are not wired together. The loading-state regression shipped while this suite was green, and the knowledge base records it (`.planning/debug/knowledge-base.md`).
- Safe modification: Prefer behavioural tests that drive the unit with no DOM, as `test/web/route-chunk-store.test.ts` does. Do not add new source-text assertions where a behavioural test can be written.
- Test coverage: Behavioural coverage of the route chunk store is good. Source-text tests still carry the most weight in the loading and shell contracts.

**Frontmatter parsing:**
- Files: `src/planning-repo/frontmatter.ts`
- Why fragile: `gray-matter` is called inside a try block, and the file explains that a pre-parse cache entry survives a throw. This is handled today, but the cache behaviour is subtle.
- Safe modification: Keep every call on `tryParseFrontmatter`. Do not call `matter()` directly outside that function.

**Settings file write path:**
- Files: `src/server/settings-store.ts`
- Why fragile: Writes go to a temp file, then rename over `settings.json`, with a `.bak` copy made from the existing file. The `wx` flag and the realpath check are what prevent a symlink from redirecting the write. Either can be removed in a refactor without any test failing.
- Safe modification: Keep the realpath check and the `wx` flag together. Add a test that places a symlink at `settings.json` and asserts that the write is refused.

## Scaling Limits

**Project count and project size:**
- Current capacity: Not measured. The fixture corpus (`fixtures/`) and the Labelore repository are the largest known inputs.
- Limit: Unknown. The full-read design (see Performance Bottlenecks) will grow linearly with the number of `.planning/` files.
- Scaling path: Per-file caching keyed on path and mtime, then the watcher.

**Remote mirror size:**
- Current capacity: 120-second timeout, no byte cap.
- Limit: Local temp disk space, and the timeout for large trees.
- Scaling path: Byte cap, and a mirror that copies only the directories the reader needs.

## Dependencies at Risk

**TypeScript and tooling version split:**
- Risk: The project pins `typescript` 5.9.3 while the research recorded TypeScript 7.0.2 as the dist-tag latest. Editor and lint tooling may lag if the project moves.
- Impact: Upgrading later means checking `typescript-eslint` and the editor integration together.
- Migration plan: Stay on 5.x until `typescript-eslint` has a stated 7.x support line, then upgrade both in one change.

**`gray-matter` and `hast-util-sanitize` version coupling:**
- Risk: `hast-util-sanitize` is a direct dependency and must match the schema shape that `rehype-sanitize` 6.0.0 expects. A mismatch would silently change what the schema allows.
- Impact: Sanitize could start accepting markup it currently strips.
- Migration plan: Bump the two together and run the sanitizer test (see Security Considerations) before accepting the change.

## Missing Critical Features

**No runtime guard that the reader stays read-only:**
- Problem: The read-only boundary is enforced by convention and by `test/portability.test.ts`, which holds the list of `node:fs` importers to exactly `src/planning-fs/local-fs.ts` and `src/server/settings-store.ts`. Nothing stops a new importer from being added without that test being updated.
- Blocks: Write-back (a named future direction) will need this boundary to be explicit, not just tested.

**No health surface for a degraded snapshot:**
- Problem: Unknown or malformed GSD artifacts degrade to warnings in the snapshot (`src/planning-repo/warnings.ts`). The UI does not offer a single place to see every warning across projects.
- Blocks: Diagnosing GSD format drift across many projects requires opening each one.

## Test Coverage Gaps

**Markdown sanitizer end-to-end:**
- What's not tested: The full pipeline's handling of hostile raw HTML and `javascript:` URLs, against the actual schema.
- Files: `src/rendering/markdown.ts`
- Risk: A schema edit could re-enable script or event-handler attributes without any test failing.
- Priority: High

**ReDoS timing on presentation regexes:**
- What's not tested: Pathological input timing for the regexes in `src/presentation/` and `src/rendering/plan-segments.ts`. Named as debt in `.planning/RETROSPECTIVE.md`.
- Files: `src/presentation/project-research-panels.ts`, `src/rendering/plan-segments.ts`
- Risk: A long adversarial line in a planning file could stall the server's event loop.
- Priority: Medium

**Remote mirror failure paths:**
- What's not tested (not confirmed by a test search in this pass): Behaviour when `tar` is missing, when ssh exits 255 mid-stream, and when the temp directory is left behind after a crash.
- Files: `src/server/remote-source.ts`, `src/cli/remote-target.ts`
- Risk: Leftover plaintext mirrors (see Security Considerations).
- Priority: High

**Settings symlink refusal:**
- What's not tested (not confirmed by a test search in this pass): A symlink placed at `settings.json` or at the settings directory.
- Files: `src/server/settings-store.ts`
- Risk: Writes could be redirected outside the settings directory.
- Priority: Medium

---

*Concerns audit: 2026-11-04*

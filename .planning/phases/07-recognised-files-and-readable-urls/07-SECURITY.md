---
phase: "07"
slug: "recognised-files-and-readable-urls"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-27"
---

# Phase 07 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| HTTP query text (route=) -> artifact lookup | The route parameter is fully attacker-controlled text from any page that can make the browser send a GET | untrusted text, names or bytes from the target or the browser |
| HTTP query text (route=) -> image bytes | Any page that can make the browser send a GET controls the route parameter | untrusted text, names or bytes from the target or the browser |
| Playwright run -> ./dist | The 4196 webServer command rebuilds the repository's gitignored ./dist before serving it | untrusted text, names or bytes from the target or the browser |
| address bar -> dispatcher | Any path, encoded or not, reaches resolveProjectRoute | untrusted text, names or bytes from the target or the browser |
| bookmarked or linked old URL text -> redirect | The old path and query are attacker-controllable and become a navigation | untrusted text, names or bytes from the target or the browser |
| browser address bar -> dev and built servers | Any path, encoded or not, reaches the server's shell fallback before the client dispatcher sees it | untrusted text, names or bytes from the target or the browser |
| browser address bar -> router | Any text can be typed or linked as the first segment and the rest of the path | untrusted text, names or bytes from the target or the browser |
| file names in the target -> URL segments | File names choose URL text and can try to shadow pages or other files | untrusted text, names or bytes from the target or the browser |
| file on disk between indexing and request | The file can change, grow, vanish or be swapped for a symlink after the bundle was built | untrusted text, names or bytes from the target or the browser |
| payload -> redirect targets | Redirects must only ever go where the payload says | untrusted text, names or bytes from the target or the browser |
| read layer -> presentation payload and search index | Whatever is indexed becomes searchable and visible in the browser | untrusted text, names or bytes from the target or the browser |
| request path text -> parsed Route | Any characters can arrive in a path segment, including encoded slashes, dots and NUL | untrusted text, names or bytes from the target or the browser |
| target .planning/ image files -> browser | Image bytes, SVG markup and file names are chosen by whoever wrote the target project | untrusted text, names or bytes from the target or the browser |
| target .planning/ names and folders -> kind and drawer placement | A file name chosen by anyone decides which view and which designed page a file gets | untrusted text, names or bytes from the target or the browser |
| target .planning/ tree -> Labelore read layer | Any file in the target can be huge, binary, a symlink or GSD bookkeeping | untrusted text, names or bytes from the target or the browser |
| target folder name -> slug -> server routing | A folder name decides a URL segment that must not collide with server-owned paths | untrusted text, names or bytes from the target or the browser |
| test harness -> local servers | Tests and the probe start real servers and send them hostile-looking paths | untrusted text, names or bytes from the target or the browser |
| test helpers -> local servers | Specs fetch a local server's payload to compose addresses | untrusted text, names or bytes from the target or the browser |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-07-01 | Denial of service | src/planning-repo/discovery.ts, registry.ts | medium | mitigate | Size comes from the stat in list(); text above MAX_TEXT_BYTES is class large and never read; image and binary classes are never read; readHead is bounded to SNIFF_BYTES | closed |
| T-07-02 | Information disclosure | src/planning-repo/file-class.ts isInternalPath | high | mitigate | Internal files never become refs, so they never reach the index, payload or search; exclusions carry the path only, never content; a source scan proves src/web never renders exclusions | closed |
| T-07-03 | Information disclosure | src/planning-fs/local-fs.ts readHead and list size | high | mitigate | Both go through resolveContained; a child that escapes the root gets no size and its head is never read; readHead opens read-only | closed |
| T-07-SC (07-01) | Tampering | npm installs | low | accept | This plan installs no packages | closed |
| T-07-04 | Spoofing | src/planning-repo/folders.ts kindOfPath | medium | mitigate | Grammars are gated by position, so a file named ROADMAP.md or STATE.md below the root cannot take the root document's kind and feed the dashboard or roadmap; table-driven tests pin each gate | closed |
| T-07-05 | Information disclosure | config.json recognition | medium | mitigate | config.json stays kind config at the root and keeps the Phase 6 masking handler; the folder table adds no second reader for it | closed |
| T-07-SC (07-02) | Tampering | npm installs | low | accept | This plan installs no packages | closed |
| T-07-06 | Spoofing | src/presentation/project-slug.ts, reserved.ts | medium | mitigate | A slug equal to a server-owned or reserved word gets the -project suffix, and routesToApp reads the same constant, so a project named api or sketches is never served as the API or the sketch files | closed |
| T-07-07 | Spoofing (open redirect) | src/web/project-path.ts withProjectSlug, RootRedirect | medium | mitigate | Redirect and link targets are built from the payload's slug plus a value that must start with a single '/'; '//' and '/\\' values collapse to the dashboard; tests pin the guard | closed |
| T-07-08 | Tampering | src/web/pages/not-found-page.tsx | low | mitigate | The typed address is rendered as React text after a guarded per-segment decode; never as a link or HTML; a test renders an address holding markup and asserts it is escaped | closed |
| T-07-SC (07-03) | Tampering | npm installs | low | accept | This plan installs no packages | closed |
| T-07-09 | Tampering (path traversal) | src/presentation/routes.ts parseRoutePath | high | mitigate | A parsed route is only a lookup key; no Route field is ever joined into a filesystem path (lookups go through pathByUrl in 07-06); segments are decoded exactly once and '.'/'..' names are never emitted by the builder | closed |
| T-07-10 | Spoofing | src/presentation/route-table.ts | medium | mitigate | Collisions are resolved deterministically to the code-unit-first path, the others get lossless file/ URLs, and every collision is audited, so a file cannot take over another file's URL | closed |
| T-07-11 | Denial of service | parseRoutePath on hostile input | low | mitigate | Parsing is a single split and one decode per segment with no backtracking regex over the whole input; the url-grammar test includes a very long hostile path | closed |
| T-07-SC (07-04) | Tampering | npm installs | low | accept | This plan installs no packages | closed |
| T-07-12 | Repudiation (false green) | test/e2e specs | medium | mitigate | The contract scan fails on raw URLs and pinned shapes, and the helper throws on a missing slug or artifact, so a spec cannot silently open the wrong page and pass | closed |
| T-07-SC (07-05) | Tampering | npm installs | low | accept | This plan installs no packages | closed |
| T-07-13 | Tampering / Information disclosure (path traversal) | src/server/index.ts /api/documents, src/server/artifact-index.ts | high | mitigate | route is parsed into a Route, canonicalised and looked up in pathByUrl; only an indexed path reaches the read; traversal spellings (encoded dots, ../) are tested to return 404 | closed |
| T-07-14 | Information disclosure | internal files via file/ URLs | high | mitigate | Internal files are not artifacts, so no table entry exists for their file/ URL; tested 404 | closed |
| T-07-15 | Tampering (race) | buildDerivedViews and the documents handler | medium | mitigate | The table lives in the bundle and swaps with it; the handler captures the bundle before parsing; a source pin keeps the capture first | closed |
| T-07-16 | Information disclosure | config.json at /settings | medium | mitigate | Served through the same JsonConfigHandler-masked artifact; a test asserts masked output at the new URL | closed |
| T-07-SC (07-06) | Tampering | npm installs | low | accept | This plan installs no packages | closed |
| T-07-17 | Spoofing (open redirect) | src/web/route-dispatch.ts redirect outcomes | medium | mitigate | Redirect targets are taken only from roadmapUrl and routeAliases in the payload and must start with a single '/'; the slug is prefixed through withProjectSlug's guard; tests assert every redirect target | closed |
| T-07-18 | Information disclosure | not-found outcome for internal files | medium | mitigate | An internal file has no artifact key, so its file/ URL takes the same not-found outcome and copy as any miss; a test covers /file/state.json | closed |
| T-07-19 | Tampering | splat parameter decoding | medium | mitigate | The dispatcher parses the raw pathname, decoding each segment once; a source scan forbids reading the splat parameter | closed |
| T-07-SC (07-07) | Tampering | npm installs | low | accept | This plan installs no packages | closed |
| T-07-20 | Spoofing (open redirect) | src/presentation/legacy-routes.ts | high | mitigate | Targets are built only from payload keys, plan keys, phase identities and milestone overview URLs, passed through safeTarget (single leading '/', no '//' or '/\\', non-legacy parse); the slug is prefixed by withProjectSlug's guard; tests assert every target | closed |
| T-07-21 | Denial of service (redirect loop) | route-dispatch legacy branch | low | mitigate | A legacy target can never be a legacy route; a property test checks no redirect target redirects again beyond the single D-02/D-03 hop | closed |
| T-07-22 | Information disclosure | legacy artifact tokens naming internal files | medium | mitigate | An internal file has no payload artifact, so its old a~ token resolves to null and reaches the same not-found page | closed |
| T-07-SC (07-08) | Tampering | npm installs | low | accept | This plan installs no packages | closed |
| T-07-23 | Tampering / Information disclosure (path traversal) | src/server/file-bytes.ts | high | mitigate | route is parsed with parseRoutePath and looked up through the captured bundle's artifact index and route table; only the indexed artifact path is read, through readBytesWithin('.planning', ...), which re-checks canonical containment; a symlink leaving .planning answers 403; tested | closed |
| T-07-24 | Elevation of privilege (script in a hostile SVG) | src/web/pages/image-page.tsx, src/server/file-bytes.ts | high | mitigate | SVG is shown only through an img element (scripts never run there); the bytes response carries CSP sandbox with default-src 'none' and nosniff so an SVG opened directly is an opaque, script-less document; a source scan forbids raw HTML, frame, object, embed and inline svg on the page | closed |
| T-07-25 | Information disclosure (raw serve of non-images and internal files) | src/server/file-bytes.ts | high | mitigate | Anything whose fileClass is not image answers 404 before any read; internal files are not artifacts; a spy filesystem proves zero readBytesWithin calls; all 404 bodies are identical (D-09, D-11) | closed |
| T-07-26 | Denial of service (huge image) | src/server/file-bytes.ts | medium | mitigate | Indexed size above MAX_IMAGE_BYTES answers 413 without a read; a post-read length check answers 413 for a file that grew after indexing. Residual, accepted: readBytesWithin has no byte bound, so a file that grew after indexing is read once in full before the check; this needs write access to the target on a local single-user tool, and a bounded read can be added to the port later | closed |
| T-07-27 | Tampering (bundle race) | createFileBytesHandler | medium | mitigate | The bundle is captured as the handler's first statement; a refresh-race test and a source pin keep it that way | closed |
| T-07-28 | Tampering (hostile file names in the UI) | image page, File details card, drawer badge | low | mitigate | Names, folders and alt text are React text, never HTML; the badge extension is capped at 5 characters | closed |
| T-07-29 | Information disclosure (cross-site reads of /api/files) | src/server/index.ts | low | accept | No CORS header is sent, so another origin cannot read the bytes; DNS-rebinding and Host allowlisting belong to Phase 8 (SEC-05) and will cover this route with the rest of /api | closed |
| T-07-SC (07-09) | Tampering | npm installs | low | accept | This plan installs no packages | closed |
| T-07-30 | Repudiation (false green) | test/server/deep-links.test.ts, test/helpers/deep-link-probe.mjs, test/e2e/deep-reload.spec.ts, playwright.config.ts | medium | mitigate | URL sets must contain every class and at least the artifact count; the probe fails under 20 URLs and exits 1 on any failure; the gate wrapper rejects skipped or zero-test runs; the specs pass the 07-05 contract scan; each browser leg asserts its mode marker (built: /assets/ entry, nothing from /src/ or /@vite/; development: /src/ entry, nothing from /assets/), so a built leg silently served by Vite (the misconfiguration in .planning/debug/resolved/loading-state-regression.md) fails; the 4196 command rebuilds before it serves, so a stale bundle is never tested; Chromium is a task precondition and an unrun or unlaunchable Playwright command is a blocking checkpoint, never a recorded human check | closed |
| T-07-31 | Information disclosure (API answered by the shell or the shell by the API) | src/server/index.ts routing in both modes | medium | mitigate | Standing tests assert /api/* answers JSON or the bytes route's plain text in both modes even with Accept text/html, and that a missing asset is 404 rather than the shell | closed |
| T-07-32 | Denial of service (servers left running) | test/helpers/deep-link-probe.mjs, the 4197 and 4196 webServers, the in-process dev server | low | mitigate | The probe kills its child with SIGTERM then SIGKILL in a finally block and on exit; Playwright never reuses a server and stops each webServer command (the 4196 build-then-start chain included) at the end of the run; the in-process server is closed in afterAll; every server binds 127.0.0.1 and never 4173 or 4174 | closed |
| T-07-33 | Tampering (build output replaced under a running server) | playwright.config.ts 4196 entry, ./dist | low | accept | ./dist is gitignored build output that npm run build regenerates; the user's 4173 and 4174 instances are never touched by the config; a server started with npm start from this same checkout serves the new bundle after a Playwright run, and a tab it opened before the rebuild needs one reload to pick up the new chunk names | closed |
| T-07-SC (07-10) | Tampering | npm installs | low | accept | This plan installs no packages | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

Evidence for every row (file:line and test name) is in the audit verdict of 2026-10-27. Highlights:
- **T-07-20, open redirect.** `safeTarget` (`src/presentation/legacy-routes.ts`) accepts a target only if it has exactly one leading `/`, is not `//` or `/\`, and is a live, non-legacy route. `redirectTo` in `src/web/route-dispatch.ts` checks again, and the slug is added through `withProjectSlug`. Tests: `test/presentation/legacy-routes.test.ts` "refuses a target that is not a single-slash, non-legacy path (T-07-20)", plus `test/web/route-dispatch.test.ts` over both fixtures.
- **T-07-23 to T-07-25, image bytes.** Bytes are read only through `readBytesWithin('.planning', …)`. Every response carries the sandbox CSP and nosniff headers. A non-image answers 404 before any read. Tests: `test/server/file-bytes.test.ts`.
- **T-07-31, /api/\* guard.** The `/api/*` 404 catch-all is registered before the shell fallback in both modes. Tests: `test/server/deep-links.test.ts` `apiGuardTests` (production and development).

### Unregistered flags

| Flag | Source | Assessment |
|------|--------|------------|
| dev-websocket | 07-10-SUMMARY Threat Flags; `src/server/index.ts` (`server: { middlewareMode: true, ws: { server } }`) | The Vite live-reload (HMR) WebSocket now shares the dev server's own HTTP server. That server binds 127.0.0.1 only, and production starts no Vite server. Development-only and loopback-only, so low. No threat ID covers it yet. This audit did not check Vite's own origin and token checks. Register it as an accepted low risk in a later phase. |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-07-01 | T-07-SC (07-01) | This plan installs no packages | planner (plan threat model) | 2026-10-26 |
| AR-07-02 | T-07-SC (07-02) | This plan installs no packages | planner (plan threat model) | 2026-10-26 |
| AR-07-03 | T-07-SC (07-03) | This plan installs no packages | planner (plan threat model) | 2026-10-26 |
| AR-07-04 | T-07-SC (07-04) | This plan installs no packages | planner (plan threat model) | 2026-10-26 |
| AR-07-05 | T-07-SC (07-05) | This plan installs no packages | planner (plan threat model) | 2026-10-26 |
| AR-07-06 | T-07-SC (07-06) | This plan installs no packages | planner (plan threat model) | 2026-10-26 |
| AR-07-07 | T-07-SC (07-07) | This plan installs no packages | planner (plan threat model) | 2026-10-26 |
| AR-07-08 | T-07-SC (07-08) | This plan installs no packages | planner (plan threat model) | 2026-10-26 |
| AR-07-09 | T-07-29 | No CORS header is sent, so another origin cannot read the bytes; DNS-rebinding and Host allowlisting belong to Phase 8 (SEC-05) and will cover this route with the rest of /api | planner (plan threat model) | 2026-10-26 |
| AR-07-10 | T-07-SC (07-09) | This plan installs no packages | planner (plan threat model) | 2026-10-26 |
| AR-07-11 | T-07-33 | ./dist is gitignored build output that npm run build regenerates; the user's 4173 and 4174 instances are never touched by the config; a server started with npm start from this same checkout serves the new bundle after a Playwright run, and a tab it opened before the rebuild needs one reload to pick up the new chunk names | planner (plan threat model) | 2026-10-26 |
| AR-07-12 | T-07-SC (07-10) | This plan installs no packages | planner (plan threat model) | 2026-10-26 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-27 | 43 | 43 | 0 | gsd-security-auditor (two passes; ASVS L1, block_on high) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-27

---
phase: "08"
slug: "several-projects-and-a-switcher"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
block_on: high
created: "2026-10-31"
---

# Phase 08 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| URL slug to registry | Any string in the first path segment after /api/projects selects a runtime | first named in 08-01 |
| registry to target folders | Each runtime reads one project; nothing may cross between runtimes | first named in 08-01 |
| repository to the public | Everything committed under .planning/sketches is published | first named in 08-02 |
| any web page in the user's browser to 127.0.0.1 /api | Cross-site requests and DNS-rebinding requests reach the local server | first named in 08-03 |
| a tunnel or reverse proxy to the local server | A public host name arrives in the Host header | first named in 08-03 |
| settings.json on disk to the store | a hand-edited or corrupt file is untrusted input at startup | first named in 08-04 |
| the store to the filesystem | the only write in the program; its path is fixed at construction | first named in 08-04 |
| server DTO text to the DOM | names, paths, reasons and notices come from settings, PROJECT.md and error messages | first named in 08-05 |
| slugs to links | row links and 'See all projects' are built from list entries | first named in 08-05 |
| network socket to the Node server | the real Host header, Origin and Sec-Fetch-Site arrive here | first named in 08-06 |
| test harnesses to the user's settings | Playwright, fixture servers, probes and smoke runs start real servers on this machine | first named in 08-06 |
| command line to startServer | arguments decide which folders are opened and remembered | first named in 08-06 |
| browser request body to the scan | the folder string is attacker-influenced until the guard and resolveScanFolder accept it | first named in 08-07 |
| the user's home tree to the walk | symlinks and huge trees inside home are untrusted structure | first named in 08-07 |
| address bar to the layout | any first segment reaches ProjectLayout | first named in 08-08 |
| query cache across projects | one QueryClient serves every project in a tab | first named in 08-08 |
| one tab's actions to the shared query cache | a refresh in one project runs in the same QueryClient as every other project in the tab | first named in 08-09 |
| query cache across projects in one tab | relative URLs repeat across projects | first named in 08-10 |
| server list to the DOM | project names come from PROJECT.md titles and folder names; meta lines and targets include user paths | first named in 08-11 |
| switcher rows to the router | each row and 'All projects' leads to another URL in the app | first named in 08-11 |
| sketch HTML to the app's API | author-controlled scripts in an opaque-origin frame or tab | first named in 08-12 |
| user input to the scan form | the typed folder travels to the guarded scan route | first named in 08-13 |
| server scan results to the DOM | found names and paths come from PROJECT.md titles and folder names | first named in 08-13 |
| checklist selection to add-many | the picked targets are sent back to the server | first named in 08-13 |
| browser specs to the server under test | each spec reads one project's payload to choose what to open | first named in 08-14 |
| another origin's page to Labelore | the cross-site requests SEC-05 must refuse, now from a real browser | first named in 08-15 |
| test fixtures to the public repository | copies and seeded settings are built in mkdtemp, never committed | first named in 08-15 |
| browser request body to the registry | target strings in POST /api/projects are attacker-influenced until the guard and the parser accept them | first named in 08-16 |
| settings.json entries to the registry | saved targets and slugs become registry entries at startup | first named in 08-16 |
| Labelore process to target folders | the only write must never reach a target | first named in 08-16 |
| user input to the add form | typed paths and targets travel to the guarded API | first named in 08-17 |
| server messages to the DOM | invalid-target and save-failure messages include user paths | first named in 08-17 |

---

## Threat Register

| Plan | Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|------|-----------|----------|-----------|----------|-------------|------------|--------|
| 08-01 | T-08-05 | Information disclosure | per-slug runtime resolution | high | mitigate | the runtime comes only from c.req.param('slug') per request; isolation invariant over every GET route and a shared document URL | closed |
| 08-01 | T-08-06 | Denial of service | memory growth from many loaded projects | medium | mitigate | LRU of five runtimes; heap growth-ratio test across three rounds | closed |
| 08-01 | T-08-07 | Tampering | eviction while a request reads a mirror | medium | mitigate | in-flight request count per runtime; busy runtimes are never evicted | closed |
| 08-01 | T-08-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 08-02 | T-08-09 | Information disclosure | sketch sample data | low | mitigate | made-up project names, paths and hosts only (Lendshed, Shapes, Portal, Kiln, ~/Work/acme, ssh://build-box); the standing fixture-leak scan still runs in the phase gate | closed |
| 08-02 | T-08-SC | Tampering | npm installs | low | accept | this plan installs no packages; the Playwright CLI is already installed | closed |
| 08-03 | T-08-01 | Information disclosure | every /api GET through DNS rebinding | high | mitigate | createRequestGuard refuses any Host outside 127.0.0.1/localhost on the server's port (plus exact opt-in hosts) before a route runs; table test over the enumerated route set | closed |
| 08-03 | T-08-02 | Tampering | POST /api/projects/:slug/refresh and every later mutating route | high | mitigate | same-origin proof required (Sec-Fetch-Site same-origin, else Origin host equal to Host), absent proof refused, JSON content type required so a cross-site form cannot send one; refused requests proven side-effect free | closed |
| 08-03 | T-08-03 | Spoofing | Origin comparison | medium | mitigate | the Host allowlist runs first and Origin is compared with the validated Host, never with c.req.url | closed |
| 08-03 | T-08-04 | Tampering | sandboxed sketch scripts (opaque origin) | medium | mitigate | Origin null is refused on every mutating route; test case in request-guard.test.ts | closed |
| 08-03 | T-08-08 | Elevation of privilege | LABELORE_ALLOWED_HOSTS misconfiguration | low | mitigate | opt-in, exact host matches only, wildcard and malformed entries dropped by parseAllowedHosts | closed |
| 08-03 | T-08-SC | Tampering | npm installs | low | accept | this plan installs no packages (hono/body-limit ships inside the installed hono) | closed |
| 08-04 | T-08-11 | Tampering / Denial of service | torn or concurrent settings writes | medium | mitigate | temp file in the same directory with flag wx, then rename; re-read before every change; failure leaves the old file and no temp file | closed |
| 08-04 | T-08-12 | Denial of service | corrupt or hand-edited settings.json at startup | medium | mitigate | parseSettings never throws; corrupt kept as .bak and the list starts empty with a notice; invalid entries skipped and reported | closed |
| 08-04 | T-08-15 | Spoofing | hand-edited persisted slugs | low | mitigate | slugs validated on read (pattern, reserved words, uniqueness); invalid entries skipped and reported | closed |
| 08-04 | T-08-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 08-05 | T-08-21 | Spoofing (open redirect) | links built from slugs | medium | mitigate | AppLink only passes '/' or '/' plus a slug that passes isValidSlug, else '/'; projectRootPath applies the same rule; tests pin 'API', '//evil' and '' to '/' | closed |
| 08-05 | T-08-22 | Tampering (markup injection) | names, paths, reasons and notices on the landing and unknown-project pages | medium | mitigate | rendered as React text nodes only; the standing raw-HTML guard (test/web/raw-html-guard.test.ts) still allows exactly one site | closed |
| 08-05 | T-08-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 08-06 | T-08-16 | Elevation of privilege | startServer serving an unguarded app | high | mitigate | startServer builds only createRegistryApp; region-scoped source scan plus real-socket refusal tests for Host, Origin and an absent proof; the in-handler refresh check is deleted so there is one same-origin gate | closed |
| 08-06 | T-08-18 | Tampering | test harnesses writing the real settings file | medium | mitigate | a distinct temporary LABELORE_CONFIG_DIR per Playwright server, fixture server and probe run; --smoke uses MemorySettingsStore | closed |
| 08-06 | T-08-19 | Spoofing | an unknown CLI flag read as a path | low | mitigate | parseCli refuses any unknown option by name | closed |
| 08-06 | T-08-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 08-07 | T-08-23 | Information disclosure | POST /api/projects/scan as a directory-listing oracle | high | mitigate | POST only behind 08-03's Host and same-origin guard; lexical home containment before any disk call, real-path containment after; results are only folders holding .planning | closed |
| 08-07 | T-08-24 | Information disclosure | symlinks inside home | high | mitigate | the walk never descends into a symlink and a symlinked scan folder is checked by its real path | closed |
| 08-07 | T-08-25 | Denial of service | very large trees | medium | mitigate | depth 2, 100 results, 5,000 visited folders, async listing, growth-ratio test | closed |
| 08-07 | T-08-26 | Tampering | POST /api/projects/add-many | medium | mitigate | at most 100 string targets, each through the single parse of the add path; body cap from the guard | closed |
| 08-07 | T-08-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 08-08 | T-08-20 | Information disclosure | query cache and component state across projects | high | mitigate | every key in the touched files built by projectKey(slug, …); AppShell keyed by slug; no previous-data option; static render proves no other project's text while opening | closed |
| 08-08 | T-08-34 | Denial of service | unknown or hostile slugs typed into the address bar | low | mitigate | the layout requests a presentation and posts an open only for a slug present in the list (exact match); the unknown-project page fetches nothing; the server answers an unknown slug 404 without a load (08-01) | closed |
| 08-08 | T-08-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 08-09 | T-08-35 | Information disclosure / Tampering | snapshot refresh across projects | medium | mitigate | the refresh posts only to the URL's slug and invalidates only projectKey(slug) and projectsKey; a behavioural test proves another project's cached entry stays valid | closed |
| 08-09 | T-08-36 | Spoofing (open redirect) | 'Choose another project' and the not-found way back | low | mitigate | both are AppLink targets ('/' or projectRootPath(openSlug), which collapses an invalid slug to '/'); the override context that let a link point into a project the URL does not name is deleted | closed |
| 08-09 | T-08-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 08-10 | T-08-27 | Information disclosure | plan-pair, document, drawer, search, research, roadmap and traceability caches | high | mitigate | slug-first keys through projectKey; the two-project regression test with the same plan URL; 08-12's standing scan forbids array-literal keys outside the factory | closed |
| 08-10 | T-08-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 08-11 | T-08-40 | Tampering (markup injection) | project names, meta lines and targets in the switcher trigger, its title attribute and its rows | medium | mitigate | rendered as React text nodes and props only; the raw-HTML guard still allows exactly one site | closed |
| 08-11 | T-08-41 | Spoofing | switcher row links and 'All projects' | low | mitigate | AppLink with projectRootPath(slug), which falls back to / for a slug failing isValidSlug, and '/' for All projects; never prefixed with the current slug | closed |
| 08-11 | T-08-SC | Tampering | npm installs | low | accept | this plan installs no packages; the Base UI popover ships with the installed @base-ui/react | closed |
| 08-12 | T-08-17 | Information disclosure / Tampering | sketch files after the move | medium | mitigate | served inside the project API behind the Host guard; sandbox CSP on every response including 308 and errors, asserted byte for byte; Origin null is refused on every mutating route (08-03) | closed |
| 08-12 | T-08-28 | Spoofing | sketch frame and image URLs | medium | mitigate | built only by projectUrl(slug, DTO path); the sandbox CSP and image headers from the server stay unchanged | closed |
| 08-12 | T-08-37 | Information disclosure | a later change reintroducing an unscoped key, a hand-built API URL or a previous-data option | high | mitigate | standing scans in test/web/query-keys.test.ts over src/web, each with a planted positive control, run in every unit gate | closed |
| 08-12 | T-08-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 08-13 | T-08-38 | Tampering | add-many from the checklist | low | mitigate | only checked, not-already-added items are sent; the server re-parses each target through the single add path, caps the list at 100 and refuses a cross-site request (08-03, 08-07); names and paths render as React text nodes only (the raw-HTML guard still allows exactly one site) | closed |
| 08-13 | T-08-SC | Tampering | npm installs | low | accept | this plan installs no packages; Base UI checkbox and field ship with the installed @base-ui/react | closed |
| 08-14 | T-08-39 | Tampering | a spec passing against another project's payload | low | mitigate | projectApiUrl (08-06) resolves the slug from GET /api/projects and throws unless exactly one project is listed; every Playwright and fixture server runs on its own temporary settings directory, so the list holds only the project it was started on | closed |
| 08-14 | T-08-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 08-15 | T-08-32 | Tampering | a later change re-opening cross-site writes | high | mitigate | standing browser test from another origin over add, scan and forget, with settings bytes and the list compared before and after | closed |
| 08-15 | T-08-33 | Information disclosure | a later change reintroducing a flash of the previous project | high | mitigate | standing browser test sampling every frame during a held switch | closed |
| 08-15 | T-08-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 08-16 | T-08-10 | Tampering | FileSettingsStore write path | high | mitigate | path fixed at construction and the two-importer gate (08-04); settings-inside refusal for any target containing the settings directory, on add and on a remembered entry; byte-identical target-tree test over add, open, refresh and forget | closed |
| 08-16 | T-08-13 | Information disclosure | secrets in settings.json | medium | mitigate | parseRemoteTarget refuses passwords; only the canonical root or the parser's rawPath is stored; file mode 0600 and directory 0700 (08-04's store) | closed |
| 08-16 | T-08-14 | Tampering / Elevation of privilege | POST /api/projects target | high | mitigate | 08-03's guard first, then parseRemoteTarget and resolveTargetPath exactly once (leading dash, host and user patterns, shell false); ssh is syntax-checked only and connects lazily with the existing timeout | closed |
| 08-16 | T-08-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 08-17 | T-08-29 | Tampering | forget without intent | low | mitigate | inline two-step confirm with focus on Keep project; no optimistic removal; a 403 changes nothing | closed |
| 08-17 | T-08-30 | Tampering (markup injection) | messages, names and paths in notices, rows and the dialog | medium | mitigate | rendered as React text nodes only; the raw-HTML guard still allows exactly one site | closed |
| 08-17 | T-08-31 | Spoofing | links to added projects and the duplicate's 'Open {name}' | low | mitigate | AppLink and useAppNavigate with projectRootPath(slug), which falls back to / for a slug failing isValidSlug | closed |
| 08-17 | T-08-SC | Tampering | npm installs | low | accept | this plan installs no packages; Base UI field, input and tooltip ship with the installed @base-ui/react | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

T-08-SC appears once per plan: each plan stated it installs no packages, and package.json / package-lock.json are unchanged since the phase's first commit.

### Evidence notes

- **T-08-12 (08-04, medium)** was found only partly mitigated at audit time: `settings-model.ts` called `String()` on a non-string slug, so an entry like `"slug":{"toString":1}` threw a TypeError that escaped `FileSettingsStore.load` → `ProjectRegistry` → `startServer`, and Labelore failed to start. Closed by commit 695b9d4: the skip label falls back to the value's type, `load` treats any parse throw as a corrupt file (.bak + notice), and `test/server/settings-model.test.ts` covers three hostile slugs. The startup reproduction was re-run against the fixed code, and the registry now constructs with one skip notice.
- **T-08-09:** `test/fixture-leak.test.ts` treats `.planning/` as out of scope, so the fixture-leak scan does not cover the sketch files. This threat was closed by grepping the 039 and 040 sketch files directly; they contain only made-up values.
- **T-08-17:** guard refusals (403), the 413 body limit and the unknown-project 404 are sent before the sketch middleware runs, so they carry no sandbox CSP. They are fixed JSON bodies with no author content, so this is not exploitable.
- **08-15-SUMMARY.md** has no `## Threat Flags` section. Its new surface is test-only plus AppLink's `flushSync`, which T-08-33 covers.
- Unregistered flags: none. The 08-01 flag, an unguarded GET /api/projects, maps to T-08-01 and was closed by the guard registration at `registry-api.ts:37`.

---

## Accepted Risks Log

No accepted risks. The T-08-SC rows are plan-time "accept" dispositions; each is documented in its plan and verified (no package changes).

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-31 | 58 | 57 | 1 (T-08-12, medium, non-blocking) | gsd-security-auditor |
| 2026-10-31 | 58 | 58 | 0 | orchestrator, after fix 695b9d4 |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-31

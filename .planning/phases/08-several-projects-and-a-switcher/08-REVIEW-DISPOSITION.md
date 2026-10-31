---
phase: 08
review: 08-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: open
    title: "[A] Skipped settings entries are silently erased from the file on the next write"
  - id: WR-02
    severity: warning
    disposition: open
    title: "[A] `Access-Control-Allow-Origin: *` on sketch fonts contradicts the documented \"no CORS anywhere\" posture"
  - id: WR-03
    severity: warning
    disposition: open
    title: "[A] `load()` leaks the source (an ssh mirror) when `new ProjectRuntime` throws, and mislabels the failure as \"No such path\""
  - id: WR-04
    severity: warning
    disposition: open
    title: "[A] Settings updates are keyed by slug alone, so a second Labelore instance can change another project's entry"
  - id: WR-05
    severity: warning
    disposition: open
    title: "[A] `blankEntry` silently replaces an existing in-memory entry that has the same slug"
  - id: WR-06
    severity: warning
    disposition: open
    title: "[B] Select all and Clear selection hand focus to a button that is still disabled"
  - id: WR-07
    severity: warning
    disposition: open
    title: "[B] The plain header's brand link lost its grid placement and margins"
  - id: WR-08
    severity: warning
    disposition: open
    title: "[B] `LegacyRoute` spins forever when the first project's presentation fails"
  - id: WR-09
    severity: warning
    disposition: open
    title: "[B] The module-level `focusMainOnNextMount` flag can outlive the navigation that set it"
  - id: WR-10
    severity: warning
    disposition: open
    title: "[B] A scan started while an add is in flight inherits that add's late result"
  - id: WR-11
    severity: warning
    disposition: open
    title: "[C] \"Requests nothing\" assertions can never fail (static render never runs queries)"
  - id: WR-12
    severity: warning
    disposition: open
    title: "[C] The \"reach every route\" test forgets lendshed partway, so most routes answer 404"
  - id: WR-13
    severity: warning
    disposition: open
    title: "[C] Two test files diff the shared tmpdir for `labelore-remote-*` and run in parallel"
  - id: WR-14
    severity: warning
    disposition: open
    title: "[C] `playwright-config.test.ts` leaks four temp directories per run"
  - id: WR-15
    severity: warning
    disposition: open
    title: "[C] The \"settings-store imports nothing from the planning reader\" check misses multi-line imports"
  - id: WR-16
    severity: warning
    disposition: open
    title: "[C] Corpus pins are hand-maintained against the live `.planning/`, so each new phase artifact turns the suite red"
  - id: WR-17
    severity: warning
    disposition: open
    title: "[C] The \"marks only the current project\" assertion cannot tell lendshed's row from the first row"
  - id: IN-01
    severity: info
    disposition: open
    title: "[A] `restore()` keeps a saved local target's identity as written, not as its realpath"
  - id: IN-02
    severity: info
    disposition: open
    title: "[A] `--port=` with an empty value silently picks a random port"
  - id: IN-03
    severity: info
    disposition: open
    title: "[A] Stale comment on `SketchRow.viewUrl`"
  - id: IN-04
    severity: info
    disposition: open
    title: "[A] The Playwright config creates temp directories in every process that loads it, and the comment says otherwise"
  - id: IN-05
    severity: info
    disposition: open
    title: "[A] `displayPath` in the list is shortened against the uncanonicalised home"
  - id: IN-06
    severity: info
    disposition: open
    title: "[A] A corrupt settings file's backup is overwritten, and the \"kept as .bak\" notice is shown even if the rename failed"
  - id: IN-07
    severity: info
    disposition: open
    title: "[B] Forgetting the open project navigates before the list cache is invalidated"
  - id: IN-08
    severity: info
    disposition: open
    title: "[B] The unknown-project page can flash from a stale cached list"
  - id: IN-09
    severity: info
    disposition: open
    title: "[B] The invalid-project screen's restart hint no longer matches the multi-project model"
  - id: IN-10
    severity: info
    disposition: open
    title: "[B] `apiFetch` success path can throw a bare `SyntaxError` instead of an `ApiError`"
  - id: IN-11
    severity: info
    disposition: open
    title: "[B] `RouteError` on `/` says \"Return to the dashboard\" but links to `/`"
  - id: IN-12
    severity: info
    disposition: open
    title: "[C] The \"forbidden text\" precondition checks the wrong relation"
  - id: IN-13
    severity: info
    disposition: open
    title: "[C] Fixed sleeps in two specs"
  - id: IN-14
    severity: info
    disposition: open
    title: "[C] `hrefOf` is not anchored at the start"
  - id: IN-15
    severity: info
    disposition: open
    title: "[C] Two small helper gaps"
open: 32
total: 32
recorded: 2026-10-31T09:46:53.933Z
---

# Phase 08: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | open | - |
| WR-02 | warning | open | - |
| WR-03 | warning | open | - |
| WR-04 | warning | open | - |
| WR-05 | warning | open | - |
| WR-06 | warning | open | - |
| WR-07 | warning | open | - |
| WR-08 | warning | open | - |
| WR-09 | warning | open | - |
| WR-10 | warning | open | - |
| WR-11 | warning | open | - |
| WR-12 | warning | open | - |
| WR-13 | warning | open | - |
| WR-14 | warning | open | - |
| WR-15 | warning | open | - |
| WR-16 | warning | open | - |
| WR-17 | warning | open | - |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |
| IN-04 | info | open | - |
| IN-05 | info | open | - |
| IN-06 | info | open | - |
| IN-07 | info | open | - |
| IN-08 | info | open | - |
| IN-09 | info | open | - |
| IN-10 | info | open | - |
| IN-11 | info | open | - |
| IN-12 | info | open | - |
| IN-13 | info | open | - |
| IN-14 | info | open | - |
| IN-15 | info | open | - |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.

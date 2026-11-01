---
phase: 08
review: 08-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: open
    title: "Snapshot pill drops to a ~26px-wide touch target at 42rem and below, and a test locks that in"
  - id: WR-02
    severity: warning
    disposition: open
    title: "Pill state is carried by colour alone for sighted touch users at 42rem and below"
  - id: IN-01
    severity: info
    disposition: open
    title: "The 320px assertion is too loose to catch a regression"
  - id: IN-02
    severity: info
    disposition: open
    title: "`expectWholeName` compares rounded integers, so it can flake by 1px"
  - id: IN-03
    severity: info
    disposition: open
    title: "The 08-UAT pin was inserted between a comment and the entry it describes"
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
    disposition: fixed
    title: "[C] Corpus pins are hand-maintained against the live `.planning/`, so each new phase artifact turns the suite red"
  - id: WR-17
    severity: warning
    disposition: open
    title: "[C] The \"marks only the current project\" assertion cannot tell lendshed's row from the first row"
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
open: 31
total: 32
recorded: 2026-11-01T18:53:58.613Z
---

# Phase 08: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | open | - |
| WR-02 | warning | open | - |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |
| WR-03 | warning | open | - (not in the current review) |
| WR-04 | warning | open | - (not in the current review) |
| WR-05 | warning | open | - (not in the current review) |
| WR-06 | warning | open | - (not in the current review) |
| WR-07 | warning | open | - (not in the current review) |
| WR-08 | warning | open | - (not in the current review) |
| WR-09 | warning | open | - (not in the current review) |
| WR-10 | warning | open | - (not in the current review) |
| WR-11 | warning | open | - (not in the current review) |
| WR-12 | warning | open | - (not in the current review) |
| WR-13 | warning | open | - (not in the current review) |
| WR-14 | warning | open | - (not in the current review) |
| WR-15 | warning | open | - (not in the current review) |
| WR-16 | warning | fixed | Pinned 08-SECURITY.md, 08-UI-REVIEW.md (bf99183) and 08-UAT.md in their corpus guards; 08-REVIEW.md and 08-VERIFICATION.md pass theirs unpinned-free; test:gate 4817/0/0 (not in the current review) |
| WR-17 | warning | open | - (not in the current review) |
| IN-04 | info | open | - (not in the current review) |
| IN-05 | info | open | - (not in the current review) |
| IN-06 | info | open | - (not in the current review) |
| IN-07 | info | open | - (not in the current review) |
| IN-08 | info | open | - (not in the current review) |
| IN-09 | info | open | - (not in the current review) |
| IN-10 | info | open | - (not in the current review) |
| IN-11 | info | open | - (not in the current review) |
| IN-12 | info | open | - (not in the current review) |
| IN-13 | info | open | - (not in the current review) |
| IN-14 | info | open | - (not in the current review) |
| IN-15 | info | open | - (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

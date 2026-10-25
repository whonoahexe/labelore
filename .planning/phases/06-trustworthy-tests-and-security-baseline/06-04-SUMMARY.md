---
phase: 06-trustworthy-tests-and-security-baseline
plan: 04
subsystem: security
tags: [secret-masking, config-json, read-layer, search-index, vitest]

requires:
  - phase: 06-trustworthy-tests-and-security-baseline
    provides: made-up Lendshed fixture and the in-memory filesystem test idiom (plans 06-01 to 06-03)
provides:
  - config.json secret keys (brave_search, firecrawl, exa_search) masked at the read layer for every consumer
  - redaction of those keys in a config.json that fails to parse
affects: [phase-12 settings page, search, file page, presentation payload]

actuals:
  tokens: 5436
  tasks: 2
  commits: 2
plan_head_before: 0354bf04f5357688f40de097fdda0535008a109e
plan_head_after: 7120b5d7f0489162f13ced1f0f499d06120f8025

tech-stack:
  added: []
  patterns:
    - "Mask once in the artifact handler so presentation, file page, search index and snippets inherit it"
    - "Raw-text regex redaction (linear, unambiguous alternation) as the fail-closed path for unparseable JSON"

key-files:
  created:
    - src/planning-repo/secret-mask.ts
    - test/secret-mask.test.ts
    - test/config-masking.test.ts
  modified:
    - src/planning-repo/handlers/json-config.ts

key-decisions:
  - "Masking lives in JsonConfigHandler for config.json only; HANDOFF.json and estimation-calibration.json are returned unchanged (D-09)"
  - "Booleans, numbers and null on secret keys stay visible (D-10); strings nested under a secret key are masked (fail closed)"
  - "A masked config.json shows a re-formatted body (JSON.stringify, two-space indent, trailing newline); an unmasked one is left exactly as read"
  - "redactSecretText also masks a value cut off before its closing quote, so a truncated file cannot leak the part that is present"

patterns-established:
  - "Secret masking semantics copied from GSD's secrets.cjs, never imported: no runtime dependency on gsd-core"

requirements-completed: [SEC-04]

coverage:
  - id: D1
    description: "A string on brave_search, firecrawl or exa_search in config.json shows as ****abcd (last four), **** under 8 characters, (unset) when empty, in presentation, the file page and search"
    requirement: SEC-04
    verification:
      - kind: unit
        ref: "test/secret-mask.test.ts#maskSecret"
        status: pass
      - kind: integration
        ref: "test/config-masking.test.ts#never lets the planted value reach presentation, the file page or search, and shows the last four"
        status: pass
    human_judgment: false
  - id: D2
    description: "Booleans, numbers and null on the secret keys show unchanged; nested strings are masked; non-secret keys untouched"
    requirement: SEC-04
    verification:
      - kind: unit
        ref: "test/secret-mask.test.ts#maskConfig"
        status: pass
    human_judgment: false
  - id: D3
    description: "A config.json that fails to parse keeps its warning and ships no planted secret in its body, search or presentation"
    requirement: SEC-04
    verification:
      - kind: integration
        ref: "test/config-masking.test.ts#keeps the parse warning on a config.json that fails to parse and still ships no planted value"
        status: pass
      - kind: unit
        ref: "test/secret-mask.test.ts#redactSecretText"
        status: pass
    human_judgment: false
  - id: D4
    description: "HANDOFF.json and estimation-calibration.json are returned exactly as before"
    requirement: SEC-04
    verification:
      - kind: integration
        ref: "test/config-masking.test.ts#returns HANDOFF.json and estimation-calibration.json exactly as before"
        status: pass
    human_judgment: false
  - id: D5
    description: "Responses stay masked before and after POST /api/refresh; loading never changes the on-disk config.json (content and mtime)"
    requirement: SEC-04
    verification:
      - kind: integration
        ref: "test/config-masking.test.ts#stays masked in every response before and after POST /api/refresh"
        status: pass
      - kind: integration
        ref: "test/config-masking.test.ts#leaves the on-disk content and mtime identical across a load and a refresh"
        status: pass
    human_judgment: false
  - id: D6
    description: "The dense, sparse-started and sparse-empty golden snapshots are unchanged"
    requirement: SEC-04
    verification:
      - kind: other
        ref: "npx vitest run test/snapshot.golden.test.ts; git diff --exit-code -- test/__golden__"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-10-25
status: complete
---

# Phase 6 Plan 04: Secret masking for config.json Summary

**config.json's brave_search, firecrawl and exa_search values are masked to GSD's `****abcd` form inside the JSON handler, so presentation, the file page, search results and snippets never see the full secret, even from a config that fails to parse.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-10-25T13:57:38Z
- **Completed:** 2026-10-25T14:01:41Z
- **Tasks:** 2
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- One handler change closes all four leak paths research reproduced (raw file view, file page, presentation payload, search index and snippets); the search index reads the handler's body, so it needed no change.
- `src/planning-repo/secret-mask.ts` copies GSD's key set and display form without importing gsd-core; on/off values stay visible, unlike GSD.
- A config.json with a trailing comma (parse failure) keeps its "JSON failed to parse" warning and has its secret strings redacted in the raw body by one linear regex, including a value truncated before its closing quote.
- Read-only constraint pinned by a test: content and mtime of the on-disk config.json are identical across a `LocalFsPlanningFilesystem` load and refresh.

## Task Commits

1. **Task 1: Planted key masked from presentation, file page and search, end to end (tracer)** - `da58eab` (feat)
2. **Task 2: Edge cases (malformed JSON, non-strings, nesting, other JSON files, refresh, goldens)** - `7120b5d` (feat)

**Plan metadata:** committed with this summary (docs: complete plan)

### Failing run before the handler change (Task 1 acceptance)

`npx vitest run test/config-masking.test.ts` before `secret-mask.ts` and the handler change failed:
`expected '{"readAt":"2026-10-25T13:58:06.254Z",…' not to contain 'BSAplantedsecretvalue1234567890wxyz'`
(the presentation payload carried the planted value in both `config` and the artifact `frontmatter`). It passed after the handler change.

Task 2 RED run (`test/secret-mask.test.ts`, `test/config-masking.test.ts`) before `redactSecretText`: 6 failed (5 `redactSecretText is not a function`, 1 malformed-config test showing the planted value in the rendered document HTML). All 22 passed after.

## Files Created/Modified

- `src/planning-repo/secret-mask.ts` - SECRET_CONFIG_KEYS, maskSecret, maskConfig, redactSecretText
- `src/planning-repo/handlers/json-config.ts` - masks frontmatter and body for config.json on parse success, redacts body on parse failure; other JSON files untouched
- `test/secret-mask.test.ts` - unit cases for the three functions, including a linear-time check on a long unterminated string
- `test/config-masking.test.ts` - end-to-end over `/api/presentation`, `/api/documents` and `/api/artifacts/*`, `/api/search` (including fragment queries), `POST /api/refresh`, and the on-disk-unchanged check

## Decisions Made

- Masked body is `JSON.stringify(masked, null, 2)` plus a trailing newline; a config with nothing to mask keeps its original text and frontmatter so unformatted files do not churn.
- Closing quote is optional at end-of-text in the redaction regex (fail closed for truncated files); this goes slightly beyond the plan's wording and is covered by its own test.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Redaction of a value truncated before its closing quote**
- **Found during:** Task 2 (redactSecretText)
- **Issue:** A regex requiring a closing quote would leave a file cut off inside a secret value unredacted, contradicting "a config.json that fails to parse never ships a planted secret string".
- **Fix:** The closing quote is `("|$)`, matching a quote or the end of the text; the same unambiguous alternation keeps it linear.
- **Files modified:** src/planning-repo/secret-mask.ts, test/secret-mask.test.ts
- **Verification:** `redactSecretText on truncated text` test passes; linear-time test passes.
- **Committed in:** 7120b5d

**2. [Test shape] Search assertions exclude the echoed query**
- **Found during:** Task 1
- **Issue:** `/api/search` echoes the query, so a fragment search put `plantedsecret` in the response by construction.
- **Fix:** The test's search helper asserts on `results` and `groups` only.
- **Files modified:** test/config-masking.test.ts
- **Committed in:** da58eab

**3. [Process] Task 2 committed as one commit, not separate RED and GREEN commits**
- The plan gives Task 2 one commit and its `<action>` interleaves test and implementation. The RED run is recorded above instead.

---

**Total deviations:** 1 auto-fixed (Rule 2), 2 notes on test shape and commit granularity.
**Impact on plan:** No scope creep; all within the plan's files.

## Issues Encountered

- Full unit suite shows the same 25 failures already recorded in `deferred-items.md` (drawer, project-research, project-research-lift, pattern-map-corpus, summary-run-corpus); none are in files this plan touches. The ascii-graph timing flake did not appear this run.
- The pre-commit branch guard reported `master` as the default branch; `.planning/config.json` sets `git.allow_default_branch_commits: true`, so commits proceeded.

## Known Stubs

None.

## Threat Flags

None. No new endpoints, auth paths or schema changes; masking reduces disclosure surface only.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Any later page that reads `config.json` through the repository (the Phase 12 settings page) inherits masking with no extra work.
- Masking is top-level keys only; if GSD adds a nested secret location later, extend `SECRET_CONFIG_KEYS` handling in `maskConfig`.

## Self-Check: PASSED

- FOUND: src/planning-repo/secret-mask.ts, test/secret-mask.test.ts, test/config-masking.test.ts
- FOUND commits: da58eab, 7120b5d (ancestors of HEAD)
- `npx vitest run test/secret-mask.test.ts test/config-masking.test.ts test/snapshot.golden.test.ts test/server` 14 files, 198 tests, 0 failed, 0 skipped; `git diff --exit-code -- test/__golden__` clean; `npm run typecheck` and `npm run lint` exit 0

---
*Phase: 06-trustworthy-tests-and-security-baseline*
*Completed: 2026-10-25*

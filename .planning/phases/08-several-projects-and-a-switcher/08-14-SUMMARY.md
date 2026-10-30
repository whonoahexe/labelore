---
phase: 08-several-projects-and-a-switcher
plan: 14
subsystem: e2e-tests
tags: [playwright, projectApiUrl, presentation, registry-app]
status: complete
requires:
  - phase: 08-06
    provides: projectApiUrl(base, path) in test/e2e/app-url.ts, the exactly-one-project rule
provides:
  - "Thirteen test/e2e files reading their project's presentation payload through projectApiUrl"
affects: [08-15]
actuals:
  tokens: 4500
  tasks: 3
  commits: 3
plan_head_before: 04451998f251fdad0caa8851c90613f6ed2df664
plan_head_after: ad3487ef9f44ae49d47581a8058345d84dce3a7f
commits: 3
key-files:
  created: []
  modified:
    - test/e2e/pages.ts
    - test/e2e/deep-reload.spec.ts
    - test/e2e/artifact-header.spec.ts
    - test/e2e/context-brief.spec.ts
    - test/e2e/patterns-map.spec.ts
    - test/e2e/review-page.spec.ts
    - test/e2e/security-page.spec.ts
    - test/e2e/summary-page.spec.ts
    - test/e2e/uat-page.spec.ts
    - test/e2e/ui-review-page.spec.ts
    - test/e2e/ui-spec-page.spec.ts
    - test/e2e/validation-page.spec.ts
    - test/e2e/verification-page.spec.ts
key-decisions:
  - "deep-reload.spec.ts keeps its own per-base cache; the cached promise now awaits projectApiUrl first (projectApiUrl(...).then(fetch...)) because the cache builder is not async"
requirements-completed: [PLAT-02, PLAT-08]
coverage:
  - id: D1
    description: "The page matrix and twelve specs read the project's payload through projectApiUrl(base, '/presentation'), which throws unless the server lists exactly one project"
    requirement: PLAT-02
    verification:
      - kind: command
        ref: "tsc --noEmit -p tsconfig.server.json && tsc --noEmit -p tsconfig.web.json && eslint test/e2e"
        status: pass
    human_judgment: false
  - id: D2
    description: "The specs actually pass in Chromium against the registry app"
    requirement: PLAT-08
    verification: []
    human_judgment: true
    rationale: "The Chromium run of the full suite is asserted by the phase gate, 08-15, after 08-12 moves the last pages; this plan was verified by typecheck and lint only, as the plan specifies"
---

# Phase 8 Plan 14: Remaining e2e specs on projectApiUrl Summary

Thirteen Playwright files (the shared page matrix plus twelve specs) now fetch the project's presentation payload through 08-06's `projectApiUrl(base, '/presentation')` instead of the old root-level `/api/presentation` route, so the full browser suite can run against the registry app.

## What changed

- Task 1 (ff0f49d): `pages.ts`, `deep-reload.spec.ts`, `artifact-header.spec.ts`, `context-brief.spec.ts`.
- Task 2 (d26a631): `patterns-map`, `review-page`, `security-page`, `summary-page`, `uat-page` specs (review-page also moves its second read, against the fixture server's base).
- Task 3 (ad3487e): `ui-review-page`, `ui-spec-page`, `validation-page`, `verification-page` specs (verification-page also moves its second read).

Each file imports `projectApiUrl` from `./app-url.ts`; error strings and header comments now name "the project's presentation payload". No assertion, selector, timeout, screenshot path or fixture placement changed.

## Verification

- `git grep "api/presentation"` over the thirteen files prints nothing (baseline 41 lines).
- `projectApiUrl` count is at least 2 in every file.
- `tsc --noEmit` on both tsconfigs exits 0; `eslint test/e2e` exits 0.
- Not run: Chromium specs (deferred to 08-15 as planned).

## Deviations from Plan

None - plan executed exactly as written. The only non-mechanical edit was `deep-reload.spec.ts`, where a plain substitution would have put `await` in a non-async function; the cache builder was restructured as the plan describes ("its promise now awaits projectApiUrl first").

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

All thirteen files exist and are modified; commits ff0f49d, d26a631 and ad3487e are on the branch.

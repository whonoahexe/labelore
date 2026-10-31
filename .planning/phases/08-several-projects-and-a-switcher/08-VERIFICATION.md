---
phase: 08-several-projects-and-a-switcher
verified: 2026-10-31T10:20:00Z
status: human_needed
score: 5/5 must-haves verified
covered_files:
  - ".planning/phases/08-several-projects-and-a-switcher/08-01-PLAN.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-01-SUMMARY.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-02-PLAN.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-02-SUMMARY.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-03-PLAN.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-03-SUMMARY.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-04-PLAN.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-04-SUMMARY.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-05-PLAN.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-05-SUMMARY.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-06-PLAN.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-06-SUMMARY.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-07-PLAN.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-07-SUMMARY.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-08-PLAN.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-08-SUMMARY.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-09-PLAN.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-09-SUMMARY.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-10-PLAN.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-10-SUMMARY.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-11-PLAN.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-11-SUMMARY.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-12-PLAN.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-12-SUMMARY.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-13-PLAN.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-13-SUMMARY.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-14-PLAN.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-14-SUMMARY.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-15-PLAN.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-15-SUMMARY.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-16-PLAN.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-16-SUMMARY.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-17-PLAN.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-17-SUMMARY.md"
  - "src/server/folder-scan.ts"
  - "src/server/index.ts"
  - "src/server/project-registry.ts"
  - "src/server/registry-api.ts"
  - "src/server/request-guard.ts"
  - "src/server/settings-model.ts"
  - "src/server/settings-store.ts"
  - "src/web/api.ts"
  - "src/web/components/project-add-dialog.tsx"
  - "src/web/components/project-scan.tsx"
  - "src/web/components/project-switcher.tsx"
  - "src/web/nav.tsx"
  - "src/web/pages/project-layout.tsx"
  - "src/web/query-keys.ts"
  - "test/e2e/projects-screenshots.spec.ts"
  - "test/e2e/projects.spec.ts"
  - "test/server/registry-api.test.ts"
  - "test/server/request-guard.test.ts"
  - "test/server/settings-disjoint.test.ts"
covered_digest: "v3:sha256:580a29cf161a3f6ab35c29fb7727c1e82eeec2182e0d09343d83b2b86cf9db45"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Compare the built switcher, landing page and add dialog with winning sketches 039 A and 040 B, at 1280px and 390px, light and dark (24 paired PNGs are written to test-results/phase-08 by `npx playwright test test/e2e/projects-screenshots.spec.ts`)."
    expected: "The build reads as the chosen sketches. Success criterion 1 says the switcher is 'screenshot-checked against' its sketch; the layout facts are asserted, but whether the visible differences are acceptable is a judgement."
    why_human: "Visual match is a judgement. 08-15-SUMMARY lists differences: add-dialog title style, scrim blur, current-row check position, landing header inset and wordmark at 390px, a larger h1-to-lede gap, and the last-opened column about 13px short of the right edge."
  - test: "Open the header at 390px wide with any project open."
    expected: "The person can tell which project is current. In the build the trigger shows only a chevron there (screenshot test-results/phase-08/switcher-390-light.png: a 40px square with no name), so the current project's name is not visible in the header on a phone-width screen."
    why_human: "Contract fact 6 (a trigger of at least 40px with an ellipsis) is met literally, but a name that is cut to 0px may defeat the point of the trigger. Decide whether to accept it or open a follow-up."
---

# Phase 8: Several Projects and a Switcher Verification Report

**Phase Goal:** One Labelore run holds several projects and moves between them without mixing their data. It remembers them in its own settings file, and every endpoint that accepts a path, an `ssh://` target or a settings change refuses requests from other websites.
**Verified:** 2026-10-31
**Status:** human_needed
**Re-verification:** No (initial verification)

## Goal Achievement

The goal holds in the code and at runtime. Nothing failed. What remains is a visual comparison against the sketches that only a person can judge, plus one narrow-screen finding (see Human Verification Required).

### Observable Truths

| #   | Truth (ROADMAP success criterion) | Status | Evidence |
| --- | --------------------------------- | ------ | -------- |
| 1 | Several paths open together; a header switcher moves between them; built from the winning sketch and screenshot-checked (PLAT-02) | VERIFIED (visual match left to a person) | `startServer` in `src/server/index.ts` calls `registry.registerCliTargets(rawPaths)` and serves the guarded `createRegistryApp` only. A live run with `lendshed` and a second project listed both and each answered its own data: `/api/projects/second/presentation` returned `second`'s rootPath and `/api/projects/lendshed/presentation` returned `lendshed`'s. Sketches 039 and 040 exist under `.planning/sketches`; 08-02-SUMMARY records the winners 039 A and 040 B. `src/web/components/project-switcher.tsx` is built from 039 A. I viewed `switcher-1280-light.png` next to its `-sketch.png`: same popover under the name trigger, same rows, Opening and Unavailable chips, and "Add or scan…" footer. `switcher.spec.ts` plus `projects.spec.ts`: 33/33 passed. `projects-screenshots.spec.ts`: 5/5 passed and wrote 24 paired PNGs. |
| 2 | A folder such as `~/Work` is scanned on request and the user picks from the GSD projects found; a local path or `ssh://` target can be added from the switcher (PLAT-05, PLAT-07) | VERIFIED | Live, with `HOME` pointed at a test directory: `POST /api/projects/scan {"folder":"~/Work"}` found `pA` and `pB` and skipped the plain folder. `POST /api/projects/add-many` added both (`added:2`) without loading them. `POST /api/projects` with an `ssh://` target returned 201 with slug `x`. A scan of `/etc` or any folder outside home returned 422 "outside your home folder". Scan is a POST behind the guard, so a foreign page cannot use it to list directories. UI: `project-add-dialog.tsx`, `project-scan.tsx`, `add-project-form.tsx`; `switcher.spec.ts` scan-state tests (running, outside home, no GSD project, refused, capped at 100) pass. |
| 3 | Opened projects are still listed after a restart, remembered in Labelore's own settings file, which a test proves can never be written inside a target (PLAT-06, SEC-05) | VERIFIED | Live: I started the server, added projects, opened `lendshed`, stopped it and started it again on the same `LABELORE_CONFIG_DIR`. All four projects came back with slugs unchanged and `lastOpened` kept. `FileSettingsStore` writes one fixed `settings.json` through a temp file and rename (`flag:'wx'`, mode 0600). `ProjectRegistry.settingsInside` refuses to add, and lists as unavailable, any target that holds the settings folder. `test/server/settings-disjoint.test.ts` runs a full add, load, refresh, open and forget cycle and asserts every target tree is byte-identical. After my live run, `find` showed no new files inside the target trees. A CLI path that fails validation is listed for that run only and never written (the `dash` and `review` directories without `.planning` were absent from `settings.json`). |
| 4 | A switch never flashes the previous project's data; a project keeps its URL name across runs; a remembered project that can no longer be opened stays listed with the reason (PLAT-08) | VERIFIED | `src/web/query-keys.ts` is the only place a key is built, and every project key starts with the slug. `grep` for `keepPreviousData` and `placeholderData` in `src/web` found none. `ProjectLayout` keys `AppShell` by slug and renders "Opening {name}…" until that project's own presentation arrives. `AppLink` and `useAppNavigate` navigate with `flushSync` so the old page cannot stay under the new address. Every `/api` URL is built in `src/web/api.ts` from the slug. e2e `projects.spec.ts` passed: the no-flash switch, restart with bookmarks, a vanished folder, an unreachable ssh project, an unknown slug, and independent tabs. Live: after I moved a project's folder away and restarted, it stayed listed as `unavailable` with "No such path: …"; slugs were the same on every start. |
| 5 | A request from another website to any endpoint that accepts a path, an `ssh://` target or a settings change is refused (SEC-05) | VERIFIED | `createRequestGuard` is the first `app.use('/api/*', …)` in `registry-api.ts`, ahead of every route and the `/api` 404. It checks the Host allowlist on every method (127.0.0.1 or localhost on the real port, plus exact `LABELORE_ALLOWED_HOSTS` entries) and, for any non-GET/HEAD, requires `Sec-Fetch-Site: same-origin` (or an Origin equal to the Host when the header is absent) and a JSON content type. Live against a running server: a cross-site JSON POST to `/api/projects` returned 403; a `text/plain` form POST with a foreign Origin returned 403; a POST to `/scan` with a foreign Origin returned 403; a POST to `/add-many` with no proof returned 403; a cross-site DELETE returned 403; a GET with a foreign Host returned 403. No `Access-Control-*` header was set on `/api/projects`. `request-guard.test.ts` and the 'refusal table over every registered /api route' test in `registry-api.test.ts` (built from the registered routes) pass. The Chromium test serves a page from another site that sends a form post, a no-cors scan and a preflighted forget. All are refused, and the settings file and list are byte-identical afterwards. |

**Score:** 5/5 truths verified (0 present but behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/server/request-guard.ts` | Host allowlist, same-origin and JSON checks | VERIFIED | 95 lines; registered first in `registry-api.ts`; exercised live |
| `src/server/registry-api.ts` | Guarded app: list, add, scan, add-many, forget, open, per-slug mount | VERIFIED | Body limits, 404 for unknown slug, no CORS headers |
| `src/server/project-registry.ts` | Slug-keyed registry, LRU of five, settings-inside check | VERIFIED | Used by `startServer`; behaviour confirmed live |
| `src/server/settings-model.ts` and `settings-store.ts` | Tolerant parse, atomic write at a fixed path | VERIFIED | Corrupt, newer and hand-edited files degrade; `portability.test.ts` holds the `node:fs` importers to two files |
| `src/server/folder-scan.ts` | Scan confined to home, depth 2, no symlinks, capped | VERIFIED | Live scan found projects and refused paths outside home |
| `src/web/pages/project-layout.tsx`, `query-keys.ts`, `api.ts`, `nav.tsx` | Slug-scoped fetch and keys, no flash | VERIFIED | Scanned directly; e2e passes |
| `src/web/components/project-switcher.tsx`, `project-add-dialog.tsx`, `project-scan.tsx`, `project-row.tsx` | Switcher, add dialog, scan checklist, forget confirm | VERIFIED | Exercised by `switcher.spec.ts` (all passed) |
| `test/e2e/projects.spec.ts`, `projects-screenshots.spec.ts` | Phase gate in Chromium | VERIFIED | 33 and 5 tests passed in my own run |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `startServer` | `createRegistryApp` with guard | `createHostPolicy`, `policy.setPort` after listen | WIRED | `createApp` (guard-free) is test-only; a test scans that `startServer` never uses it |
| `registry-api` write routes | `ProjectRegistry` and `SettingsStore.mutate` | `add`, `addMany`, `scan`, `forget`, `open` | WIRED | Live add, forget and open changed `settings.json` |
| Web pages | per-project API | `projectApiUrl(slug, path)` and `projectKey(slug, …)` | WIRED | Only `api.ts` holds an `/api` URL |
| Switcher | route change | `AppLink` with `flushSync` | WIRED | e2e no-flash test passed |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `ProjectLayout` | `presentation` | `fetchPresentation(slug)` to `/api/projects/:slug/presentation` | Yes (live answers differed per slug) | FLOWING |
| Switcher and landing rows | project list | `GET /api/projects` from the registry and settings file | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Typecheck | `npm run typecheck` | exit 0 | PASS |
| Lint | `npm run lint` | exit 0 | PASS |
| Unit gate | `npm run test:gate` | `total=4816 passed=4816 failed=0 skipped=0` | PASS |
| Phase e2e | `npx playwright test test/e2e/projects.spec.ts test/e2e/switcher.spec.ts` | 33 passed | PASS |
| Screenshot e2e | `npx playwright test test/e2e/projects-screenshots.spec.ts` | 5 passed | PASS |
| Live refusals, persistence, scan, add, forget | curl against `NODE_ENV=production node src/server/index.ts --port 4999` and a restart on 4998 | as in Truths 2 to 5 | PASS |

I did not re-run the other 200 or so e2e tests, which cover pages from earlier phases. I rely on 08-15-SUMMARY's report of 238 passed for those. Within my run, one first attempt was cut short because I killed its web server by mistake; I re-ran it cleanly and the figures above are from the clean run.

### Probe Execution

No probes declared by the phase plans; step skipped.

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
| ----------- | ------------ | ----------- | ------ | -------- |
| PLAT-02 | 08-01, 08-03 to 08-06, 08-08 to 08-11, 08-14, 08-15 and others | Several paths open with a switcher | SATISFIED | Truth 1 |
| PLAT-05 | 08-07, 08-13, 08-15 | Scan a folder and pick from the GSD projects found | SATISFIED | Truth 2 |
| PLAT-06 | 08-04, 08-16, 08-15 | Opened projects remembered in Labelore's own settings file, never inside a target | SATISFIED | Truth 3 |
| PLAT-07 | 08-16, 08-17, 08-15 | Add a local path or `ssh://` target from the switcher | SATISFIED | Truth 2 |
| PLAT-08 | 08-01, 08-05, 08-08 to 08-10, 08-12, 08-14, 08-15 | No previous data on switch; stable URL name per project | SATISFIED | Truth 4 |
| SEC-05 | 08-03, 08-04, 08-07, 08-15, 08-16 | Path, `ssh://` and settings endpoints refuse other websites | SATISFIED | Truths 3 and 5 |

All six IDs appear in at least one plan's `requirements:` field and in REQUIREMENTS.md (traceability rows map each to Phase 8, marked Complete). There are no orphaned requirements.

### Anti-Patterns Found

No `TBD`, `FIXME` or `XXX` in the files this phase touched. The `TODO` hits in `src/web` belong to the TODO-lifecycle feature of an earlier quick task, not to unfinished work.

Review findings weighed against the must-haves (08-REVIEW.md: 0 critical, 17 warning, 15 info; 08-REVIEW-DISPOSITION.md lists all as open):

| Finding | Severity here | Undermines a must-have? |
| ------- | ------------- | ------------------------ |
| WR-01: entries `parseSettings` skips are dropped from `settings.json` on the next write | Warning | No. Every valid entry persists, as I confirmed across a restart. The loss is for hand-edited entries that were already invalid: a typo in a slug is erased the next time any project is opened. That runs against the "edit settings.json by hand" promise in D-12. Worth a follow-up. |
| WR-02: `Access-Control-Allow-Origin: *` on sketch font files (`src/server/sketch-files.ts:157`) | Warning | No for SEC-05, which covers endpoints that take a path, an `ssh://` target or a settings change. It does contradict the "no CORS anywhere" comments in `request-guard.ts` and `registry-api.ts`, and lets another site read those font bytes. |
| WR-03 to WR-05 (source leak on a failed runtime, slug-only update matching, `blankEntry` replacement) | Warning | No. Edge cases. |
| WR-06 to WR-10 (focus, plain-header brand layout, `LegacyRoute` spinner, module-level focus flag, scan racing add) | Warning | No. UI edge cases; none touches data separation. |
| WR-11: "requests nothing" assertions cannot fail | Warning | Weakens a test, not the truth. Truth 4 also rests on the Chromium no-flash test, which did run and pass. |
| WR-12: the "reach every route" test forgets `lendshed` partway, so most routes answer 404 | Warning | No. That is the positive test. The refusal test next to it asserts a 403 on every route, and my live requests confirmed the refusals independently. |
| WR-13 to WR-17 (shared tmpdir race, leaked temp dirs, import check, corpus pins, row assertion) | Warning | Test hygiene only. |

Security audit 08-SECURITY.md (58/58 threats closed, T-08-12 fixed in 695b9d4) is consistent with what I saw.

### Human Verification Required

1. **Compare the build with sketches 039 A and 040 B.** Generate the pictures with `npx playwright test test/e2e/projects-screenshots.spec.ts` (files land in `test-results/phase-08`, which Playwright clears on each run). Look at the 24 paired PNGs at 1280px and 390px, in light and dark. Success criterion 1 asks for the check; the layout numbers are asserted and pass, but the differences listed in 08-15-SUMMARY need someone to accept or reject them. The UI audit (08-UI-REVIEW.md, 21/24) was code-only, so it does not cover this.
2. **Header trigger at 390px.** The screenshot shows a 40px square holding only a chevron. The current project's name is not visible in the header at that width. The contract is met literally. Accept it, or open a follow-up.

### Gaps Summary

No gaps. All five roadmap success criteria and all six requirement IDs are met in the code and at runtime. The two human items are visual judgements. Open warnings WR-01 and WR-02 are worth tracking but do not stop the phase goal.

Bookkeeping: ROADMAP.md still shows plan 08-15 unchecked and "16/17 plans executed", yet 08-15-SUMMARY.md exists and reports `status: complete`. The orchestrator should tick it when it commits this report.

---

_Verified: 2026-10-31_
_Verifier: Claude (gsd-verifier)_

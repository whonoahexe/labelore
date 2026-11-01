---
phase: 08-several-projects-and-a-switcher
verified: 2026-11-02T00:35:00Z
status: human_needed
score: 6/6 must-haves verified
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
  - ".planning/phases/08-several-projects-and-a-switcher/08-18-PLAN.md"
  - ".planning/phases/08-several-projects-and-a-switcher/08-18-SUMMARY.md"
  - "docs/design-language.md"
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
  - "src/web/styles/globals.css"
  - "test/e2e/projects-screenshots.spec.ts"
  - "test/e2e/projects.spec.ts"
  - "test/e2e/switcher.spec.ts"
  - "test/server/registry-api.test.ts"
  - "test/server/request-guard.test.ts"
  - "test/server/settings-disjoint.test.ts"
  - "test/web/uat-session-corpus.test.ts"
covered_digest: "v4:sha256:d63c71760d38248868ecb70385305b70cbdd08e41d365e0990c08066edaf8c88"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 5/5
  gaps_closed:
    - "G-08-2: at 390px with a project open, the header shows which project is current (closed by 08-18; browser-proven)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "UAT test 2 re-run: open the header at 390px wide with any project open, in light and dark, and compare with sketch 039 A (`npx playwright test test/e2e/projects-screenshots.spec.ts` writes `test-results/phase-08/switcher-390-{light,dark}.png` next to `-sketch.png`)."
    expected: "The trigger shows the mark, 'Lendshed' over its meta, the chevron, a dot-only snapshot pill, the search trigger and the theme toggle, and reads as the sketch in both themes. 08-UAT.md test 2 still records 'issue' until a person re-runs it."
    why_human: "Visual match against a sketch is a judgement. Automated checks prove the name is 118px wide and whole at 390px (48px, ellipsis, no sideways scroll at 320px). They do not prove the header looks right. I viewed the light pair: the build matches the sketch's header (same order, name over meta, chevron, dot pill, search, theme toggle). I did not compare dark."
  - test: "Decide on the two accepted-or-not consequences of the TGT-08 trade at 42rem and below (08-REVIEW.md WR-01 and WR-02)."
    expected: "Either accept them, or open a follow-up. WR-01: the dot-only pill is about 26px wide and is the smallest tap target in the header (every other control is 40px), and a test asserts width under 40. WR-02: ready, pending and error differ only by dot colour at this width; the wording lives in title, the accessible description and the live region, and title does not show on touch."
    why_human: "Both are accessibility and design trade-offs. The plan accepted the loss of the read time only. It did not record the loss of the error and pending wording. This is a decision, not a defect the code can settle."
---

# Phase 8: Several Projects and a Switcher Verification Report

**Phase Goal:** One Labelore run holds several projects and moves between them without mixing their data. It remembers them in its own settings file, and every endpoint that accepts a path, an `ssh://` target or a settings change refuses requests from other websites.
**Verified:** 2026-11-02
**Status:** human_needed
**Re-verification:** Yes. The earlier report (2026-10-31, human_needed, 5/5) is replaced. Gap-closure plan 08-18 (UAT gap G-08-2) was executed since.

## Goal Achievement

The goal holds in the code and at runtime. Nothing failed. Plan 08-18 closed the 390px finding that the earlier report left as a human question: the open project's name now shows in the header at 390px. What remains is a person's visual re-run of UAT test 2 (still marked "issue" in 08-UAT.md) and a decision on two accessibility consequences of the phone-width pill.

### Re-verification scope

- Server code: `git log d40f707..HEAD -- src/server` is empty. Nothing under `src/server` changed after the earlier verification, so the live-run evidence for Truths 2 to 5 stands (guard, scan, add, persistence, refusals). I re-ran the server tests as a regression check (below) and confirmed the guard is still the first `app.use('/api/*', …)` in `registry-api.ts` (line 37) and that no `keepPreviousData` or `placeholderData` exists in `src/web`.
- Web code changed by 08-18: `src/web/styles/globals.css` only (no `.tsx` change; `git diff d40f707 HEAD --stat -- '*.tsx'` is empty). Full 3-level check done on the new rules and their browser tests.

### Observable Truths

| #   | Truth (ROADMAP success criterion) | Status | Evidence |
| --- | --------------------------------- | ------ | -------- |
| 1 | Several paths open together; a header switcher moves between them; built from the winning sketch and screenshot-checked (PLAT-02) | VERIFIED (final visual judgement with a person) | Unchanged from the earlier report: `startServer` registers all CLI paths on the guarded registry app; per-slug data confirmed live. New this round: the trigger now works at 390px (Truth 6). `switcher.spec.ts` 390/320 subset 7/7 and `projects-screenshots.spec.ts` 5/5 passed in my own run. I viewed `switcher-390-light.png` beside `switcher-390-light-sketch.png`: same header order (drawer button, mark, name over meta with chevron, dot pill, search, theme toggle) and the same popover rows, chips and "Add or scan…" footer. |
| 2 | A folder such as `~/Work` is scanned on request and the user picks from the GSD projects found; a local path or `ssh://` target can be added from the switcher (PLAT-05, PLAT-07) | VERIFIED | Earlier live run (scan found `pA`, `pB`, skipped a plain folder, refused `/etc`; `add-many` added 2; `ssh://` add returned 201). Server code unchanged since. `project-add-dialog.tsx`, `project-scan.tsx` still present; switcher spec scan-state tests unchanged. |
| 3 | Opened projects are still listed after a restart, remembered in Labelore's own settings file, which a test proves can never be written inside a target (PLAT-06, SEC-05) | VERIFIED | Earlier live restart check; `settings-store.ts` and `settings-model.ts` unchanged. `test/server/settings-disjoint.test.ts` passed again in my regression run. |
| 4 | A switch never flashes the previous project's data; a project keeps its URL name across runs; a remembered project that can no longer be opened stays listed with the reason (PLAT-08) | VERIFIED | `query-keys.ts`, `api.ts`, `project-layout.tsx`, `nav.tsx` unchanged; no `keepPreviousData` or `placeholderData` in `src/web`. e2e `projects.spec.ts` covered this in the executor's full run (241 passed). I did not re-run it. |
| 5 | A request from another website to any endpoint that accepts a path, an `ssh://` target or a settings change is refused (SEC-05) | VERIFIED | `createRequestGuard` first in `registry-api.ts`; `request-guard.test.ts` and `registry-api.test.ts` (refusal table over every registered route) passed again in my regression run: 99 tests passed across six files. Earlier live refusals (403 on cross-site JSON, text/plain form, scan, add-many, DELETE, foreign Host; no `Access-Control-*`) stand because server code is unchanged. |
| 6 | At 390px wide with a project open, the header shows which project is current (UAT gap G-08-2, closed by 08-18; PLAT-02) | VERIFIED (visual match with a person) | See "Plan 08-18 must-haves" below. Browser-measured: the name element is whole and visible at 390px, cut with an ellipsis and still visible at 320px, whole while the snapshot is pending and after it fails. |

**Score:** 6/6 truths verified (0 present but behavior-unverified)

### Plan 08-18 must-haves (G-08-2)

| Must-have | Status | Evidence |
| --------- | ------ | -------- |
| At 390px the trigger shows the open project's name: whole for Lendshed (`clientWidth` above 0, `scrollWidth` at most `clientWidth`) | VERIFIED | I ran `switcher.spec.ts -g "G-08-2\|390\|320"` against a Chromium build: 7/7 passed, including "at 390px the trigger shows the whole open project name beside a dot-only snapshot pill, and the read time stays in its title, description and live region (G-08-2)". The summary reports 118px wide and whole; the screenshot shows "Lendshed" and the meta. |
| At 42rem and below the pill keeps only its dot; the read time stays in title, accessible description and live region; the label is visible at 1280px | VERIFIED | `globals.css` 42rem shell block adds `.snapshot-pill { position: relative; padding-inline: var(--space-2) }` and a visually hidden `.snapshot-label` (absolute, 1px box, clip, no `display: none`). The same G-08-2 test asserts the title, description and live region. The 1280px screenshots (passing in `projects-screenshots.spec.ts`) are unaffected because the rules sit inside `@media (max-width: 42rem)`. `snapshot-status.tsx` is unchanged, so `aria-describedby` still names the rendered label. |
| The name stays whole while the snapshot is pending and after it fails | VERIFIED | Test "at 390px the name stays whole while the snapshot is pending and after it fails (G-08-2, D-07)" passed. |
| An 80-character name at 390px keeps at least 40px and is cut with an ellipsis; at 320px at least 24px and no sideways scroll | VERIFIED | "a long project name > truncates in the trigger at 390px" and "at 320px the trigger keeps a visible name and the page never scrolls sideways (G-08-2)" both passed; so did the `projects-screenshots.spec.ts` long-text test (5/5). |
| Every browser check of the 390px trigger asserts a visible name width | VERIFIED | `grep` shows `nameWidths` and `expectWholeName` helpers in `switcher.spec.ts` and `wholeName.client` asserts in `projects-screenshots.spec.ts`. The executor's red proof (pre-fix stylesheet restored: 8 failed) is recorded in 08-18-SUMMARY; I did not repeat it. |
| Standing guards unedited and green (CR-02 no `display: none` on `.snapshot-` rules, source order, navbar, class vocabulary); no new class name | VERIFIED | `git log -1 --format=%h -- test/web/refresh-contract.test.ts` prints `e05d893`, as the plan recorded. `grep` finds no `display: none` in any `.snapshot-` rule. `refresh-contract`, `token-guard` and `uat-session-corpus` tests passed in my regression run. The executor reports `npm run test:gate` at 4817/4817 and typecheck 0; I re-ran typecheck (exit 0). |
| Full unit gate green; the stale 08-UAT.md pin re-pinned; 08-UAT.md not edited | VERIFIED | `test/web/uat-session-corpus.test.ts` passes; `08-UAT.md` is not in the 08-18 diff. |
| Prohibitions: no edit to `refresh-contract.test.ts`; no `display: none` on `.snapshot-` rules; no new class, no `.tsx` change | VERIFIED | All three confirmed by the commands above. |

Artifacts for 08-18: `globals.css` (substantive, wired: the rules are in the shipped stylesheet and take effect in Chromium), `switcher.spec.ts` and `projects-screenshots.spec.ts` (behavioural checks, run), `docs/design-language.md` and `08-UI-SPEC.md` (decision recorded), `uat-session-corpus.test.ts` (pin updated). Key links: the hidden label is still rendered and named by `aria-describedby` (`snapshot-status.tsx` unchanged); the spec measures `.brand-project-name`.

### Required Artifacts (phase-wide)

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/server/request-guard.ts` | Host allowlist, same-origin and JSON checks | VERIFIED | Unchanged since the earlier verification; tests pass |
| `src/server/registry-api.ts` | Guarded app with every route | VERIFIED | Guard first (line 37) |
| `src/server/project-registry.ts`, `settings-model.ts`, `settings-store.ts`, `folder-scan.ts` | Registry, tolerant settings file, scan | VERIFIED | Unchanged; `settings-disjoint` test passes |
| `src/web/pages/project-layout.tsx`, `query-keys.ts`, `api.ts`, `nav.tsx` | Slug-scoped fetch and keys | VERIFIED | Unchanged |
| `src/web/components/project-switcher.tsx`, `project-add-dialog.tsx`, `project-scan.tsx` | Switcher, add dialog, scan | VERIFIED | Unchanged; now usable at 390px |
| `src/web/styles/globals.css` | 42rem header rules | VERIFIED | Diffed against `d40f707`; rules match the plan |
| `test/e2e/*.spec.ts`, `test/server/*.test.ts` | Phase gates | VERIFIED | Subsets run by me pass |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `startServer` | guarded `createRegistryApp` | `createHostPolicy` | WIRED | Unchanged |
| Registry write routes | `ProjectRegistry` and `SettingsStore` | add, scan, forget, open | WIRED | Unchanged |
| Web pages | per-project API | `projectApiUrl(slug, …)`, `projectKey(slug, …)` | WIRED | Unchanged |
| `.snapshot-label` rule | `snapshot-status.tsx` `aria-describedby` | visually hidden, still rendered | WIRED | G-08-2 test asserts the description |
| `switcher.spec.ts` | `project-switcher.tsx` | `.brand-project-name` measured | WIRED | Tests passed |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `ProjectLayout` | `presentation` | `/api/projects/:slug/presentation` | Yes | FLOWING |
| Switcher and landing rows | project list | `GET /api/projects` | Yes | FLOWING |
| Header trigger name | open project's name | the same presentation | Yes (Lendshed shown in screenshot) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Typecheck | `npm run typecheck` | exit 0 | PASS |
| Server and guard tests plus CR-02, token and UAT corpus guards | `npx vitest run test/server/registry-api.test.ts test/server/request-guard.test.ts test/server/settings-disjoint.test.ts test/web/refresh-contract.test.ts test/web/uat-session-corpus.test.ts test/token-guard.test.ts` | 6 files, 99 tests passed | PASS |
| 390px and 320px switcher checks | `playwright test switcher.spec.ts -g "G-08-2\|390\|320"` (system Chrome, see note) | 7 passed | PASS |
| Screenshot spec | `playwright test projects-screenshots.spec.ts` (system Chrome) | 5 passed; 24 PNGs written | PASS |
| Full unit gate | not re-run; executor and orchestrator report `gate: total=4817 passed=4817 failed=0` | reported | NOT RE-RUN |
| Full e2e | not run (instructed); executor reports 241 passed | reported | NOT RE-RUN |

Note: this machine's Playwright chromium build is missing (`~/.cache/ms-playwright/chromium_headless_shell-1243` does not exist), so I ran the specs through a throwaway config that pointed at `/usr/bin/google-chrome` and used only the three dev-server web servers. I deleted the config afterwards; the working tree is clean. If you re-run the e2e suite locally, `npx playwright install chromium` may be needed first.

### Probe Execution

No probes declared by the phase plans; step skipped.

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
| ----------- | ------------ | ----------- | ------ | -------- |
| PLAT-02 | 08-01, 08-03 to 08-06, 08-08 to 08-11, 08-14, 08-15, 08-18 | Several paths open with a switcher | SATISFIED | Truths 1 and 6 |
| PLAT-05 | 08-07, 08-13, 08-15 | Scan a folder and pick the GSD projects found | SATISFIED | Truth 2 |
| PLAT-06 | 08-04, 08-15, 08-16 | Opened projects remembered in Labelore's own settings file | SATISFIED | Truth 3 |
| PLAT-07 | 08-15, 08-16, 08-17 | Add a local path or `ssh://` target from the switcher | SATISFIED | Truth 2 |
| PLAT-08 | 08-01, 08-05, 08-08 to 08-10, 08-12, 08-14, 08-15 | No previous data on switch; stable URL name | SATISFIED | Truth 4 |
| SEC-05 | 08-03, 08-04, 08-07, 08-15, 08-16 | Path, `ssh://` and settings endpoints refuse other websites | SATISFIED | Truths 3 and 5 |

All six IDs appear in at least one plan's `requirements:` field and in REQUIREMENTS.md (all marked Complete, traceability rows map each to Phase 8). 08-18 declares `requirements: [PLAT-02]`. No orphaned requirements.

### Anti-Patterns Found

No `TBD`, `FIXME` or `XXX` markers in files this phase touched (earlier scan; 08-18 added none: its diff is CSS, specs, docs and one corpus pin).

Open review findings (08-REVIEW.md, 08-REVIEW-DISPOSITION.md lists all as open), weighed against the must-haves:

| Finding | Severity here | Undermines a must-have? |
| ------- | ------------- | ------------------------ |
| WR-01 (08-18 delta): dot-only pill is about 26px wide at 42rem and below, smaller than the header's other 40px targets; a test asserts width under 40 | Warning | No. The plan did not require a 40px pill. Listed as a human decision item. |
| WR-02 (08-18 delta): pill state is dot colour alone at 42rem and below (WCAG 1.4.1); wording only in title, description and live region | Warning | No for the must-haves. It is a real accessibility consequence of the TGT-08 trade that the plan did not record. Listed as a human decision item. |
| IN-01 to IN-03 (08-18 delta): 320px floor of 24px is loose; `expectWholeName` compares rounded integers; the 08 pin sits under the 07 comment | Info | No. Test hygiene. |
| WR-01 to WR-17 from the earlier review (`parseSettings` drops invalid entries on write; ACAO `*` on sketch fonts; source leak on a failed runtime; slug-only updates; focus and layout edge cases; test hygiene) | Warning | No. None breaks data separation, remembering, or the refusal of other websites. WR-02-old (ACAO `*` on sketch font files) contradicts the "no CORS anywhere" comments but does not touch an endpoint that accepts a path, `ssh://` target or settings change. |

Note on the two review warnings sharing ids: the 08-18 delta review reused WR-01 and WR-02 for the pill findings; the earlier review's WR-01 and WR-02 are the settings-drop and font CORS items. See 08-REVIEW-DISPOSITION.md for the numbering it uses.

Security audit 08-SECURITY.md (58/58 threats closed) predates 08-18; 08-18 is CSS and tests only, so it adds no input surface.

### Human Verification Required

1. **UAT test 2 re-run (G-08-2).** Open the header at 390px with a project open, in light and dark, against sketch 039 A. The automated checks and my light-theme look say it matches, but 08-UAT.md still records this as an issue and the visual judgement is yours. I did not compare dark.
2. **TGT-08 consequences (WR-01 and WR-02 of the 08-18 review).** Accept the 26px pill and colour-only state at phone width, or open a follow-up (for example a `min-width: 2.5rem` hit area and a non-colour cue on the error dot).

### Gaps Summary

No gaps. All five roadmap success criteria and the closed UAT gap G-08-2 are met in the code, and all six requirement IDs are accounted for. The status is `human_needed` only because of the two visual and accessibility judgements above.

Bookkeeping for the orchestrator: 08-UAT.md test 2 is still `issue` with `status: diagnosed`; update it after the human re-run.

---

_Verified: 2026-11-02_
_Verifier: Claude (gsd-verifier)_

---
phase: 10-codebase-map-specification-and-check-pages
verified: 2026-11-06T14:30:00Z
status: gaps_found
score: 10/11 must-haves verified
covered_files:
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-01-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-01-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-02-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-02-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-03-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-03-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-04-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-04-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-05-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-05-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-06-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-06-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-07-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-07-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-08-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-08-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-09-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-09-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-10-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-10-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-11-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-11-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-12-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-12-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-13-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-13-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-14-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-14-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-15-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-15-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-16-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-16-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-17-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-17-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-18-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-18-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-19-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-19-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-20-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-20-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-21-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-21-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-22-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-22-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-23-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-23-SUMMARY.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-24-PLAN.md
  - .planning/phases/10-codebase-map-specification-and-check-pages/10-24-SUMMARY.md
  - src/planning-repo/handlers/codebase-lift.ts
  - src/planning-repo/handlers/reviews-body.ts
  - src/planning-repo/handlers/spec-body.ts
  - src/planning-repo/handlers/user-setup-body.ts
  - src/planning-repo/handlers/withhold-values.ts
  - src/web/views/reviews-overlap.ts
  - src/web/views/reviews-page-components.tsx
  - src/web/views/user-setup-page-components.tsx
  - src/web/views/user-setup-page.ts
  - test/codebase-lift.test.ts
  - test/helpers/written-value-forms.ts
  - test/user-setup-handler.test.ts
  - test/web/codebase-page.test.ts
  - test/web/user-setup-page.test.ts
  - test/withhold-values.test.ts
covered_digest: "v4:sha256:ebb0b0b5a68a5d2cc94f7e67045897a41c0df532a7c2d2b4bf2e2a8da8dd8f79"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 9/11
  gaps_closed:
    - "The Integrations panel shows environment variable names only (10-14 truth; VIEW-13) - CR-02 closed by 34f7426"
  gaps_remaining:
    - "A user setup never shows the variable's value - CR-01 closed for 'NAME: value' and table cells, still open for '- NAME=value' where the value holds a colon"
  regressions: []
gaps:
  - truth: "A user setup shows how many steps are done and where each variable goes, never the variable's value (VIEW-11 / SC3; 10-19 truth: no USER-SETUP variable value appears in any View-mode output)"
    status: failed
    reason: "Re-verification probe: an indented '- NAME=value' field line under a checklist step still stores and renders the value whenever the value contains a colon. '  - DATABASE_URL=postgres://u:PVDB1@host/db' becomes fields [{ key: 'DATABASE_URL=[Value not shown]', text: '//u:PVDB1@host/db' }]; '  - STRIPE_KEY=sk:PVSK2' becomes { key: 'STRIPE_KEY=[Value not shown]', text: 'PVSK2' }. Both strings were present in renderToStaticMarkup(UserSetupView) output. Connection strings with embedded credentials (postgres://user:password@host) are the commonest secret-bearing value a USER-SETUP would carry. The section lines are masked correctly; only the structured step fields leak."
    artifacts:
      - path: "src/planning-repo/handlers/user-setup-body.ts"
        issue: "readFieldLine splits at the first colon of the raw line and tests the left side with isVariableKey; for 'DATABASE_URL=postgres://...' the left side is 'DATABASE_URL=postgres', not a variable name, so the else branch masks key and text separately and the part after the scheme colon reaches text unmasked"
    missing:
      - "In readFieldLine, mask the whole line (keep(rest)) first when the line starts with an upper-snake name followed by '=' (or ' = '), and split the key/text only from the masked result; or drop the field text when the masked line has no colon"
      - "Add a shared WRITTEN_FORMS entry whose value contains a colon (URL/connection string, 'sk:tag') so the field-line, composer and markup tests plant it"
---
# Phase 10: Codebase Map, Specification and Check Pages Verification Report

**Phase Goal:** The seven codebase-map documents open into designed pages; a map-only project opens on a "mapped, not started" overview built from them; the spec, AI spec, user setup, eval review, browser check and cross-AI review documents open into designed pages built and tested against labelled made-up examples.
**Verified:** 2026-11-06
**Status:** gaps_found
**Re-verification:** Yes, after the code-review fix round (453e16f, 34f7426, b840fa2, 9059134, bda9728, bab6fa5, 3c3e529)

## Goal Achievement

One of the two earlier gaps is closed. The Integrations leak (CR-02) is gone: every written form reproduced in the first report, plus a dozen forms the fix round never listed, now stores and renders `[Value not shown]`. The User setup leak (CR-01/WR-01) is closed for `- NAME: value`, `- NAME = value`, `| NAME | value |` and the forms in the shared 21-form list, but it is not closed for `- NAME=value` when the value contains a colon, which is how a connection string is written. That form still reaches the rendered page. The other nine truths hold with no regression.

### Re-verification probes (run in this pass, against HEAD)

Probes were temporary vitest files in `test/` (removed afterwards; `git status` shows only the pre-existing `.planning/state.json` change). Planted tags were checked against `JSON.stringify` of the extractor result and, for User setup, against `renderToStaticMarkup(UserSetupView)`.

| Scenario | Original report | Now |
|----------|-----------------|-----|
| `extractUserSetup`: `  - STRIPE_KEY: sk_live_abc123` under a step | value stored in `fields` | `fields: [{ key: "STRIPE_KEY", text: "[Value not shown]" }]` |
| `  - STRIPE_KEY=...`, `  - Value: ...`, Notes `Auth: STRIPE_KEY: ...`, `STRIPE_KEY = ...` | mixed | masked |
| `\| STRIPE_KEY \| value \|` in a `Variable \| Value` table (plain section) | value kept | masked in `sections[].lines` and in `variables[]` |
| `extractCodebase('integrations')`: `Auth: STRIPE_KEY = v`, `Set "STRIPE_KEY=v" in env`, `**STRIPE_KEY** = v` (group lines, rows, environment lines) | stored verbatim | absent from the whole record |
| 14 further Integrations forms: `NAME: postgres://u:pw@h`, `NAME = postgres://...`, `"postgres://..."`, ticked and bold names, table rows, `NAME: \`value\``, two assignments on one line | not probed | none leak |
| 22 free-form probes through both extractors | not probed | 12 forms mask on both paths; the 10 that survive are prose or non-assignment shapes (see below) |
| **`  - DATABASE_URL=postgres://u:PVDB1@host/db` field line** | not probed | **LEAK**: `{ key: "DATABASE_URL=[Value not shown]", text: "//u:PVDB1@host/db" }`; present in rendered markup |
| **`  - STRIPE_KEY=sk:PVSK2` field line** | not probed | **LEAK**: `{ key: "STRIPE_KEY=[Value not shown]", text: "PVSK2" }`; present in rendered markup |

The same colon-in-value leak also appears for `NAME = a:b`, `` `NAME`=scheme://... ``, `**NAME**=scheme://...`, `Set NAME=scheme://...` and `DB="postgres://..."` as field lines. The same strings in a plain section (Notes) or in an Integrations line are masked, so the defect is confined to `readFieldLine`.

Cause (`src/planning-repo/handlers/user-setup-body.ts`, `readFieldLine`): the line is split at the first colon of the raw text; for `DATABASE_URL=postgres://...` the left side is `DATABASE_URL=postgres`, which `isVariableKey` does not accept (its name is `DATABASE_URL`, not the whole string), so the else branch masks key and text separately. Key becomes `DATABASE_URL=[Value not shown]`, and the text after the scheme colon is kept. The fix round's shared list plants `- STRIPE_KEY=<tag>` with no colon in the tag, so its tests could not see it.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 (VIEW-13): the seven codebase-map documents open into designed pages and read the real maps on this machine, even where headings differ | VERIFIED | Unchanged since the first report; test/codebase-map-corpus.test.ts and test/web/codebase-page.test.ts pass in this pass. Fix round touched only `cleanText`/mask; the corpus test still passes. |
| 2 | SC2 (TGT-09): a map-only project opens from project path, `.planning` path, switcher and folder scan; first screen "Mapped, not started" | VERIFIED | No fix-round file in this area; test/target-path.test.ts and test/presentation/project-map-state.test.ts pass. Playwright specs not re-run. |
| 3 | SC3a (VIEW-11): a spec shows lock state (ambiguity vs gate) and each requirement as current, target, acceptance | VERIFIED | test/spec-handler.test.ts and test/web/spec-page.test.ts pass. WR-03 fix (9059134, nested numbered lists) now covered by a new test. |
| 4 | SC3b (VIEW-11): an AI spec shows system type, framework, evaluation dimensions, checklist progress, template slots stated plainly | VERIFIED | test/web/ai-spec-page.test.ts passes; no fix-round change. |
| 5 | SC3c (VIEW-11): a user setup shows steps done and where each variable goes, never the variable's value (10-19: no value in any View-mode output) | FAILED | Closed for `NAME: value`, `NAME = value`, `NAME=value` without a colon in the value, table cells and `Value:`-labelled lines. Still open for `- NAME=value` field lines whose value contains a colon (connection strings, `scheme://`, `a:b`): value stored in `steps[].fields[].text` and drawn by `MaskedInline`. Reproduced to rendered markup. |
| 6 | SC4a (VIEW-12): an eval review shows score and verdict, dimension coverage and ordered remediation plan | VERIFIED | test/web/eval-review-page.test.ts passes; no fix-round change. |
| 7 | SC4b (VIEW-12): a browser check shows its outcome, "could not look" distinct from "nothing to report", plus counts | VERIFIED | test/web/dom-verify-page.test.ts passes; no fix-round change. |
| 8 | SC4c (VIEW-12): a cross-AI review shows each reviewer with model, agreed concerns first, disagreements | VERIFIED | test/web/reviews-page.test.ts and test/reviews-handler.test.ts pass, including the new WR-02 (ordinary words no longer read as severity) and WR-04 (overflow count, "+N more did not run") tests. |
| 9 | SC5a (VIEW-21): each type tested against a committed, labelled, indexed made-up example; the rule binds later types | VERIFIED | test/made-up-examples.test.ts passes. |
| 10 | SC5b (VIEW-21/11/12/13): every page sketched first, built from the winner, screenshot-checked, falls back to a readable generic page | VERIFIED | Unchanged; test/web/ui-review-corpus.test.ts now pins 10-UI-REVIEW.md and passes (3c3e529 fixed the two failures the fix report mentioned). |
| 11 | 10-14 truth/prohibition (VIEW-13): Integrations panel shows variable names only; a value beside a name is never stored or shown | VERIFIED | Closed. `cleanText` now runs `maskValues(withholdInText(text).text)` (codebase-lift.ts); bold labels pass through it. All three original forms and 14 extra forms absent from the serialised record; test/codebase-lift.test.ts, test/web/codebase-page.test.ts and test/withhold-values.test.ts plant all 21 shared forms and pass. |

**Score:** 10/11 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `codebase.ts`, `codebase-lift.ts`, `fenced-sections.ts` | Fence-aware sections, lifts | VERIFIED | value withholding gap closed |
| `project-map-state.ts`, `codebase-map.ts`, `target-path.ts` | map-only derivation and resolution | VERIFIED | |
| Codebase, spec, AI spec, eval review, browser check, reviews pages | Six page families | VERIFIED | |
| `user-setup-body.ts`, `user-setup-page.ts`, `-components.tsx`, `withhold-values.ts` | User setup page and value mask | HOLLOW on one form | page works; `readFieldLine` leaks `NAME=value` with a colon in the value |
| `copy-command.tsx`, `status-meter.tsx`, `value-not-shown.tsx`, `clean-tree.tsx` | Shared pieces | VERIFIED | WR-05 fix (bab6fa5) strips invisible format characters, tested with escapes |
| `test/helpers/made-up-examples.ts`, fixtures | Made-up rule and examples | VERIFIED | |
| `test/helpers/written-value-forms.ts` | Shared planted-value list | PARTIAL | 21 forms; none has a colon inside the value |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `cleanText` | Integrations panel rows | `maskValues(withholdInText(...))` | WIRED | strong mask now applied |
| user-setup-body `fields` | rendered step fields | `readFieldLine` -> `MaskedInline` | WIRED, LEAKS ONE FORM | `NAME=value:with:colon` |
| user-setup-body `sections` | plain sections | `maskValueColumns` + `keep(maskSecretLabel())` | WIRED | all probed forms masked |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| Integrations rows | `group.lines`, `environment.groups[].lines` | `cleanText` | Yes, masked | FLOWING |
| User setup step fields | `step.fields` | `readFieldLine` | Yes, but `NAME=value-with-colon` text unmasked | FLOWING (leak, one form) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 17 phase test files (handlers, pages, mask, made-up rule, target-path, map-state, corpus, ui-review corpus) | `npx vitest run <17 files>` | 672/672 passed | PASS |
| Full suite (reported by caller) | `npm test` | 265 files, 6291 tests passing | PASS (not re-run) |
| CR-01 original scenarios | temp vitest probe | masked | PASS |
| CR-02 original scenarios plus 14 extras | temp vitest probe | none leak | PASS |
| `- DATABASE_URL=postgres://u:pw@host/db` field line | temp vitest probe plus `renderToStaticMarkup` | `//u:pw@host/db` in markup | FAIL |

### Probe Execution

Step 7c: SKIPPED (no probes declared in any PLAN).

### Requirements Coverage

All five IDs appear in PLAN frontmatter and in REQUIREMENTS.md (phase 10 rows, all still unchecked); none orphaned.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| VIEW-13 | SATISFIED | truths 1 and 11 |
| TGT-09 | SATISFIED | truth 2 |
| VIEW-11 | PARTIAL | spec and AI spec satisfied; user setup still leaks one written form (truth 5) |
| VIEW-12 | SATISFIED | truths 6-8 |
| VIEW-21 | SATISFIED | truths 9-10 |

### Anti-Patterns Found

No TBD/FIXME/XXX markers added by the fix commits (diff scanned).

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| user-setup-body.ts | readFieldLine (~259-285) | raw-line colon split before masking | BLOCKER | `- NAME=value:with:colon` leaks value to View |
| user-setup-body.ts | readVariableTable (~170) | `source` cell kept as free text via `keep(cell)` | WARNING | a bare value typed in the Source column of the Variable table reaches `variables[].source` and "Get it from"; the plain section line for the same row is masked. Out of template meaning, so advisory |
| withhold-values.ts | maskValues | prose forms (`NAME is v`, `NAME -> v`, `NAME := v`, `NAME - v`, `export NAME v`, `NAME (v)`) | INFO | heuristic limit, not an assignment form; no claim in the plans covers them |

### Human Verification Required

None independent of the gap. The fix report asks for a browser look at a crowded overlap region (WR-04); that is a polish item, not a must-have.

### Gaps Summary

One gap remains, narrow and reproducible. `readFieldLine` must mask the whole line before it splits, or treat a leading upper-snake name followed by `=` as a variable key. Then add a colon-bearing form (`NAME=postgres://u:pw@host/db`, `NAME=sk:tag`) to `WRITTEN_FORMS` so the field-line, composer and markup tests plant it. Everything else claimed by the fix round was confirmed: CR-02, WR-01 (table cells, multi-word, bracketed), WR-02, WR-03, WR-04, WR-05 each have tests that pass, and the nine other truths show no regression.

---

_Verified: 2026-11-06_
_Verifier: Claude (gsd-verifier)_

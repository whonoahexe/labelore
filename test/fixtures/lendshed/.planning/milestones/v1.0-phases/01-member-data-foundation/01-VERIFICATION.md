---
phase: 01-member-data-foundation
verified: 2026-02-20T11:30:00Z
status: human_needed
score: 8/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification: true
previous_verification:
  file: 01-VERIFICATION-2026-02-04.archived.md
  previous_status: gaps_found
  previous_score: 4/8
  previous_behavior_unverified: 2
  gaps_closed:
    - gap: "MEMB-02 — the badge-number check was not enforced on import"
      closed_by: "01-02 (unique index plus 12 import tests) and 01-03 (the import report page, 9-case table)"
    - gap: "MEMB-03 — the member table had no migration for the joined date"
      closed_by: "01-02 (migration 0003 and the backfill) and 01-03 (the form reads the stored value)"
    - gap: "MEMB-04 — the loader and the form read different columns; the fallback failed open"
      closed_by: "01-02 (one shared column list) and 01-03 (the loader takes the list, the old guess was deleted)"
    - gap: "Seed value was still the placeholder badge range"
      closed_by: "01-02 — the committed seed carries real ranges; the doc block matches"
  behavior_unverified_closed:
    - truth: "MEMB-01 — a steward adds a member and sees them in the list"
      closed_by: "01-03 checkpoint 1, a person tried it on 2026-02-18"
    - truth: "MEMB-05 — the list pages and sorts"
      closed_by: "01-03 checkpoint 2, a person tried it on 2026-02-18"
  regressions: []
data_blocked: # NOT passes and NOT failures — kept as the ROADMAP framed them
  - truth: "A second import of the same file reports every row as already present"
    requirement: MEMB-02
    reason: >-
      Only the first import's file exists on disk. The second file lives on the steward lead's
      laptop, so the repeat leg exercises the unique index only through unit tests.
    covered_by_automation: "import.test.ts (12 cases), badge-index.test.ts (6) — all green; not a substitute for the live leg"
    to_close: "Copy the second file into the fixtures folder, then re-run 01-03 checkpoint 3 item 2"
  - truth: "A member with two badges shows the newer one"
    requirement: MEMB-03
    reason: "No imported member holds two badges. Checkpoint 3 item 3 was recorded as blocked, as the plan directed."
    covered_by_automation: "badge-resolve picks the newest; the old pick-first helper was deleted"
    to_close: "Add a two-badge member to the seed, then re-run checkpoint 3 item 3"
human_verification:
  - test: "Run `npm run check-seed` to completion (dev server on :3001, `LENDSHED_STEWARD` and `LENDSHED_PASS` set)"
    expected: "The suite finishes with no seed regressions; the `/members/import` route and its guard resolve as configured"
    why_human: >-
      Both later plans left this suite for last, and no run has ever finished. In 01-03 a
      try on 2026-02-18 ended 6 failed and 2 skipped for a single environmental reason: the
      browser was not installed, so not one test body executed. It is installed now; two
      credential variables and a running dev server are all that is still missing.
  - test: "Open bare `/members/import` (no file chosen) and record what renders"
    expected: "Lands on the not-found page, since the router lists only `members/import/:fileId`; nothing mounts and nothing is announced"
    why_human: >-
      Checkpoint 3 item 2c in 01-03 was noted as never looked at on its own. A STATE.md line
      that says the bare route redirects with a message is wrong as written; the redirect
      belongs to a matched route with a malformed file id, and that case was seen.
warnings:
  - id: WARN-01
    severity: warning
    item: "ROADMAP Success Criterion 3 still asks for a banner on the import page"
    detail: >-
      REQUIREMENTS.md MEMB-02 dropped the banner on 2026-02-19 with a full record. ROADMAP.md SC3
      was never given the matching strike note, so the roadmap still names a component the
      requirement of record removed.
---

# Phase 01: Member Data Foundation — Verification Report (RE-VERIFICATION)

**Phase Goal:** A steward can add members and import a member list, with each member carrying a unique badge, and see the result in a pageable list.

**Verified:** 2026-02-20
**Status:** human_needed (8/8 truths verified; 2 outstanding human items; 2 data-blocked corroborations)
**Re-verification:** Yes — supersedes `01-VERIFICATION-2026-02-04.archived.md` (`gaps_found`, 4/8)

## Re-verification note

The 2026-02-04 report described commit `a41c0de`, which predates plans 01-02 and 01-03.
**Each of its four gaps is now closed in the repository, and a person has since tried both
truths it could not check.** Every closure was read against the code listed below instead of
being taken from a SUMMARY.

| Prior gap | Verdict now | Closed by |
|---|---|---|
| MEMB-02 — badge check not enforced | ✅ CLOSED | 01-02 + 01-03 |
| MEMB-03 — no joined-date migration | ✅ CLOSED | 01-02 + 01-03 |
| MEMB-04 — loader and form read different columns | ✅ CLOSED | 01-02 + 01-03 |
| Placeholder seed range | ✅ CLOSED | 01-02 |

The 2026-02-19 list-page work touched phase surfaces. Checked for regressions against every
truth: **none found.**

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | A steward adds a member and sees them in the list (MEMB-01, MEMB-05) | ✓ VERIFIED | `MemberForm.tsx:112` calls `saveMember` and `:130` refetches the list. Tried by a person in 01-03 checkpoint 1. |
| SC2 | Importing a list refuses a repeated badge number (MEMB-02) | ✓ VERIFIED | `import.ts:88` checks the unique index before any insert, so a repeat runs zero inserts. Live-tried in checkpoint 3 item 1. |
| SC3 | The list pages and sorts by name, badge and joined date (MEMB-03, MEMB-05) | ✓ VERIFIED | `MemberList.tsx:57` passes the sort key to the query; 14 paging tests. Tried in checkpoint 2. |
| T4 | Entry is the Members menu only; there is no second add page | ✓ VERIFIED | `routes.ts:40-48` registers `members` and `members/import/:fileId`, no menu entry for add. |
| T5 | The import uses one shared column list | ✓ VERIFIED | Zero second column lists in `server/members`; only `MEMBER_COLUMNS` is read. |
| T6 | A badge number is stored once per member | ✓ VERIFIED | `badge-index.ts` creates the unique index; 6 tests pin the repeat as an explicit assertion. |
| T7 | The joined date is stored, never guessed | ✓ VERIFIED | Migration 0003 backfills from the import file; the form reads the stored value. |
| T8 | A member with two badges shows the newer one | ✓ VERIFIED (1 live leg data-blocked) | `badge-resolve` returns the newest; the old pick-first helper is deleted. Live leg blocked, not passed. |

**Score:** 8/8 truths verified (0 present-but-behaviour-unverified; every earlier unproven
truth now carries a dated observation).

### Data-Blocked Items (not passes, not failures)

Kept exactly as ROADMAP and 01-03-SUMMARY record them. Both corroborate truths already
verified by executable tables.

| # | Item | Requirement | Why blocked | To close |
|---|------|-------------|-------------|----------|
| 1 | A repeat import reports every row as present | MEMB-02 | The second file is on the steward lead's laptop. | Copy it into the fixtures folder |
| 2 | A two-badge member shows the newer badge | MEMB-03 | No imported member holds two badges. | Add one to the seed |

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `server/members/columns.ts` | One shared column list | ✓ VERIFIED | `MEMBER_COLUMNS` frozen; the loader and the form both read it. 6 tests. |
| `server/members/import.ts` | Import with the unique check | ✓ VERIFIED | 12 tests including "refuses a repeat badge". |
| `server/members/badge-index.ts` | Unique badge index | ✓ VERIFIED | 6 tests. |
| `web/members/MemberList.tsx` | Paged, sortable list | ✓ VERIFIED | Sort key goes to the query; 14 tests. |

### Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| `MemberForm.tsx` | `columns.ts` | `MEMBER_COLUMNS` at `:41`, then `saveMember` at `:112` | ✓ WIRED — **the archived BLOCKER is closed** |
| `import.ts` | `badge-index.ts` | unique check before insert | ✓ WIRED |
| `MemberList.tsx` | list query | `sortKey` and `page` props | ✓ WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data variable | Source | Real data | Status |
|---|---|---|---|---|
| `MemberList` | `rows` | list query on the member table | Yes, and now column-scoped | ✓ FLOWING |
| `MemberForm` | `joined` | stored column | Yes — a person saw the stored value on 2026-02-18 | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Members suite | `npm test -- members` | **18 files, 164/164 passed** (3.20s) | ✓ PASS |
| A test exercises the unique index | `badge-index.test.ts` | 6 tests | ✓ PASS |
| A test exercises the import | `import.test.ts` | 12 tests | ✓ PASS |
| Route registration | `npm test -- routes` | **3 passed / 11 skipped** | ✓ PASS |
| No new type errors | `npx tsc --noEmit \| grep -c "server/members"` | **0** | ✓ PASS |
| List paging and sorting | n/a | Needs a dev server — **already done 2026-02-18** | ✓ PASS (human) |
| Seed run | `npm run check-seed` | Never completed; browser binary now installed | ? SKIP → human verification |

### Probe Execution

No probes declared in any phase 01 PLAN, and no probe scripts exist in this repo. Step 7c: SKIPPED.

### Requirements Coverage

| Requirement | Source plans | Status | Evidence |
|---|---|---|---|
| MEMB-01 | 01-01, 01-03 | ✓ SATISFIED | Add and list tried by a person in 01-03. |
| MEMB-02 | 01-01, 01-02 | ✓ SATISFIED (1 leg data-blocked) | Unique index and a refusal before any insert. **Was BLOCKED.** |
| MEMB-03 | 01-02, 01-03 | ✓ SATISFIED | Joined date stored and backfilled. **Was BLOCKED.** |
| MEMB-04 | 01-02 | ✓ SATISFIED | One shared column list. **Was BLOCKED.** |
| MEMB-05 | 01-03 | ✓ SATISFIED | Paging and sorting tried by a person. **Was NEEDS HUMAN.** |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `server/members/**` | — | `TBD` / `FIXME` / `XXX` | ✓ none | Debt-marker gate passes |
| `.planning/ROADMAP.md` | SC3 | Criterion still asks for the dropped banner | ⚠️ Warning | WARN-01 — the roadmap names a component its own requirement removed |
| `.planning/…/01-CONTEXT.md` | D-05 | Superseded decision with no note | ⚠️ Warning | A reader of CONTEXT alone gets the old badge range |
| `server/members/columns.ts` | 12 | Docblock cites the old column order | ℹ️ Info | Value correct, comment stale |
| `server/tests/routes.test.ts` | — | 2 stale `/admin` cases fail at baseline | ℹ️ Info | Pre-existing and unrelated; the 3 member route cases pass |

Previously listed anti-patterns now **closed**: the missing members route entry, raw error
objects reaching the log, and the stale comment in `import.ts`.

### Human Verification Required

Two items remain. Neither stands in the way of the goal; they are loose ends kept in the open.

**1. `npm run check-seed` to completion**
- **Test:** Dev server on :3001, set `LENDSHED_STEWARD` and `LENDSHED_PASS`, run the suite.
- **Expected:** Finishes with no seed regressions.
- **Why human:** Left over from 01-02 and 01-03; the earlier attempt executed nothing.

**2. Bare `/members/import` (no file) — one-line confirmation**
- **Test:** Open `/members/import` and record what renders.
- **Expected:** The not-found page.
- **Why human:** Recorded as not separately observed; not something to infer.

### Gaps Summary

**No gaps.** The four gaps of 2026-02-04 were each re-read in the code and are closed.

1. **The badge check is now enforced where it matters.** The unique index runs before any
   insert, so a repeat badge never reaches the table.
2. **The joined date is stored, not guessed.** A migration backfills it and the form reads it.
3. **The loader and the form agree.** One frozen column list is the only source.

The status stays `human_needed`, not `passed`, for two reasons and neither is a defect: the
seed suite has not yet run to the end, and one route behaviour has not been looked at alone.
Two corroborations are still **data-blocked** and are recorded that way.

---

_Verified: 2026-02-20_
_Verifier: Claude (gsd-verifier) — re-verification superseding 01-VERIFICATION-2026-02-04.archived.md_

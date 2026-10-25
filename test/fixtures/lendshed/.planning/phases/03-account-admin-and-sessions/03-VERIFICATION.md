---
phase: 03-account-admin-and-sessions
verified: 2026-04-09T21:10:00Z
status: human_needed
score: 4/6 requirements met via code; 2 require a live two-browser session check (Phase 4 UAT)
behavior_unverified: 3
overrides_applied: 0
behavior_unverified_items:
  - truth: "ADMN-03 — disabling an account ends that member's open page and live socket at once"
    test: "Sign in as a member in one browser and as a steward in another. Disable the member from the Members page. Watch the member's open page."
    expected: "The member's page shows the signed-out screen and the live-status socket closes within about two seconds."
    why_human: "Needs the socket close frame to reach a real second browser; the unit tests only assert that the session row is deleted."
  - truth: "ADMN-05 — the signed-in list shows where each member is signed in from and when they last acted"
    test: "Sign in from two browsers as the same member, act in one, then open the Sessions page as a steward."
    expected: "Two rows for that member, each with its own origin label and a last-acted time that moves only for the browser that acted."
    why_human: "Origin labels come from request headers that a unit test cannot vary across two real clients."
  - truth: "ADMN-04 — a deleted member's earlier loans stay attributed in the loan log"
    test: "Delete a member who has loans, then open the loan log and find one of their loans."
    expected: "The loan still names the member, marked as deleted, and the row opens."
    why_human: "The marker styling renders only in a real browser."
human_verification:
  - test: "ADMN-03 disabled member's open page stops at once (see behavior_unverified_items)"
    expected: "Signed-out screen and closed socket within two seconds"
    why_human: "Live two-browser socket close"
  - test: "ADMN-05 signed-in list shows origin and last-acted per browser"
    expected: "One row per browser, last-acted moves for the acting browser only"
    why_human: "Two real clients with different headers"
  - test: "ADMN-04 deleted member still attributed in the loan log"
    expected: "Loan row names the member with a deleted marker"
    why_human: "Visual marker only"
  - test: "ADMN-02 reset password sends the member to the change-password screen"
    expected: "Next sign-in lands on the change-password page and nothing else opens"
    why_human: "Needs a fresh sign-in as the reset member"
---

# Phase 3: Account Admin & Sessions Verification Report

**Phase Goal:** A steward runs member accounts end to end and can see who is signed in and cut them off immediately, without opening a database console.
**Verified:** 2026-04-09T21:10:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

This phase is **built and consistent**. Each artifact named by the four plans is on disk, has real content, is reached from the server routes, and passes its checks:

- `npm test` → **61/61 tests pass** (8 files, including the three new helper suites: session-store, disable-flow, last-seen)
- `npx tsc --noEmit` → **exactly 3 errors, all pre-existing baseline** (stock.ts:211, socket.ts:48, legacy-gate.ts:19). Zero errors in any phase 3 file.
- `npm run build` → **succeeds**, emits `dist/server.js` and `dist/web.js`
- `LegacyPasscode.ts` deleted; `grep -rn "LegacyPasscode" server/` returns nothing

What is left is **live, two-browser checking**, which belongs to Phase 4 UAT. A single open human item holds the status at `human_needed` however clean the static checks are.

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A steward creates a member with an initial password and can reset any member's password. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Create and reset routes wired; the temporary-password flag is set. The forced change-password landing after a reset is a human leg. |
| 2 | Disabling ends that member's sessions at once; re-enabling restores sign-in (revocation / audit) | ✓ VERIFIED (revocation) / ⚠️ (live socket) | ADMN-03 session deletion fully verified. Live socket close in a second browser is a human leg. |
| 3 | A deleted member's loans stay readable and attributed in the loan log | ✓ VERIFIED | Deletion tombstones the member row; the loan query joins the tombstone; unit-tested. |
| 4 | A steward sees who is signed in, from where, and when they last acted | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Session list route wired to `last_seen` and origin label. Two-browser differences are human. |
| 5 | Account changes are written to the loan log beside loans and returns | ✓ VERIFIED | `log-writer.ts` writes account and permission events; log tests pass. |

**Score:** 2/5 fully verified with no human leg (SC3, SC5); 3/5 present and wired with live-only legs. Per-requirement: **4/6 met via code, 2 human_needed** (see below).

### Session-count note (ADMN-05 / SC4) — steward-approved reinterpretation, not a gap

The ROADMAP SC4 wording says "who is signed in". The discussion log (lines 52–61) records an explicit decision to **"count one row per browser, not one per member"**, so a member signed in from two places shows twice. This is a documented, steward-confirmed reading; the intent (see every live session) is met. Not counted as a gap.

**Optional:** to make this explicit in the record, add to this file's frontmatter:
```yaml
overrides:
  - must_have: "ADMN-05 one row per member"
    reason: "Steward lead chose one row per browser in discussion (2026-03-30): every live session must be cuttable. Intent preserved."
    accepted_by: "maya.okafor"
    accepted_at: "2026-03-30T00:00:00Z"
```

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `server/session/store.ts` | SessionStore + revokeFor + listLive | ✓ VERIFIED | Pure, unit-tested; single source of truth |
| `server/routes/members.ts` handlers | CREATE/RESET/DISABLE keyed by steward id | ✓ VERIFIED | Validates the actor from the session; never trusts a posted id (line 210–226) |
| `server/session/last-seen.ts` | touch, origin label | ✓ VERIFIED | Allowlisted headers; throttled write |
| `server/members/tombstone.ts` | tombstone + loan join | ✓ VERIFIED | No name copied into the loan row |
| `web/members/MembersPage.tsx` | list, create, reset, disable, delete | ✓ VERIFIED | Confirmation names the member |
| `web/members/SessionsPage.tsx` | signed-in list | ✓ VERIFIED | One row per session |
| `server/legacy/LegacyPasscode.ts` | DELETED | ✓ VERIFIED | Absent; no references in server/ |

### Key Link Verification

| From | To | Via | Status |
|------|----|----|--------|
| MembersPage | disable route | `POST /api/members/{id}/disable` then refetch | ✓ WIRED |
| disable route | SessionStore | `revokeFor(memberId)` before the response | ✓ WIRED |
| SessionStore | live socket | close frame on revoke | ✓ WIRED (live close = human) |
| SessionsPage | last-seen | `listLive()` ordered by last acted | ✓ WIRED (two-browser origin = human) |
| loan log | tombstone | join on member id, deleted marker | ✓ WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| SessionsPage | rows | store listing and request headers | Yes (real sessions) | ✓ FLOWING |
| MembersPage | members | member table via the repository | Yes | ✓ FLOWING |
| loan log | member names | tombstone join | Yes (real handler, not hardcoded) | ✓ FLOWING (marker styling = human) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite | `npm test` | 61 passed (8 files) | ✓ PASS |
| Type baseline | `npx tsc --noEmit` | 3 pre-existing, 0 in phase 3 files | ✓ PASS |
| Bundle emits | `npm run build` | dist/server.js 412KB | ✓ PASS |
| Passcode module removed | `grep -rn LegacyPasscode server/` | empty | ✓ PASS |
| Disabled member refused | `curl` against a disabled account | 401 on every route | ✓ PASS |
| Live socket close in a second browser | (requires two browsers) | — | ? SKIP → human |

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|------------|--------|----------|
| ADMN-01 create with an initial password | 03-01 | ✓ met | create route sets the temporary flag |
| ADMN-02 reset any member's password | 03-01/02 | ✓ met | reset route wired; flag set again |
| ADMN-03 disable ends sessions at once | 03-02 | ? human_needed | Row deletion verified; the live socket close is live-only |
| ADMN-04 delete keeps loans readable | 03-03 | ✓ met (marker = human) | Tombstone join; styling appears only in a browser |
| ADMN-05 who is signed in, from where | 03-03 | ? human_needed | Two-browser origin differences are live-only |
| ADMN-06 log records account changes | 03-04 | ✓ met | log writer tests pass |

**4 met via code · 2 human_needed · 0 gaps · 0 orphaned requirements**

### Anti-Patterns Found

None. No TBD, FIXME, XXX or PLACEHOLDER markers in phase 3 files, and no stubs (each page reads real session and member state). One unused `.members-temp` style block remains in the stylesheet, left behind by a removed page; cosmetic only.

### Human Verification Required

All four human items are **live two-browser (Phase 4 UAT)** checks. The `human_verification` and `behavior_unverified_items` frontmatter lists the steps, the expected result and the reason for each: ADMN-03 live socket close, ADMN-05 per-browser origin, ADMN-04 deleted marker, and ADMN-02 forced change-password landing.

The most integration-sensitive item is **ADMN-03**: it depends on the socket close frame reaching the member's real browser before the next poll. The member's next request is refused either way, so a missed frame is a short delay, not a break. Confirm the close arrives in the two-browser session.

### Gaps Summary

**No blocking gaps.** Everything from 03-01 to 03-04 exists, has real content, is connected, builds, and passes 61 tests at the unchanged 3-error type baseline. What is still unchecked is runtime behaviour across two live browsers, which the phase plan hands to Phase 4 UAT. So the status is `human_needed`, not `gaps_found`.

---

_Verified: 2026-04-09T21:10:00Z_
_Verifier: Claude (gsd-verifier)_

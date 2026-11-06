<!-- made-up example · derived from gsd-core/workflows/milestone-summary.md · gsd-core 1.19.0 -->
# Milestone v1.0 — Project Summary

**Generated:** 2026-03-21
**Purpose:** Team onboarding and milestone review

---

## 1. Project Overview

Lendshed is one web app for a neighbourhood tool library. It replaces a shared spreadsheet and a paper sign-out sheet, so a member can see what sits on the shelf at every shed and a steward can move a tool from one shed to another as a tracked transfer.

- **Core value:** A member can see what is on the shelf at every shed and borrow it without asking a steward to look it up.
- **Target user:** Library members who borrow, and the volunteer stewards who keep each shed's inventory honest.
- **Milestone status:** Shipped 2026-03-20; the audit closed with tech debt and no blockers.

## 2. Architecture & Technical Decisions

- **Decision:** Keep every record in one SQLite file with write-ahead logging.
  - **Why:** The tool library runs on a single small machine that loses power now and then.
  - **Phase:** Phase 1
- **Decision:** Gate every request on a shared kiosk passcode checked on the server.
  - **Why:** Members had no accounts yet, and a hand-crafted request must not bypass the screen.
  - **Phase:** Phase 1
- **Decision:** Show each shed's stock from its own query, never one joined query.
  - **Why:** A shed with broken data must not hide the healthy ones.
  - **Phase:** Phase 2
- **Decision:** Store the condition note and the repair flag as separate columns.
  - **Why:** A shed with nothing to report shows a count only, and a flag must never depend on note text.
  - **Phase:** Phase 2
- **Decision:** Render the catalogue grid from one component for both the shed and category views.
  - **Why:** The two views must never disagree about a tool.
  - **Phase:** Phase 3
- **Decision:** Record a transfer as two rows, one per shed, linked by a transfer id.
  - **Why:** A tool in transit stays findable from the sending shed until the receiving steward confirms.
  - **Phase:** Phase 4

## 3. Phases Delivered

| Phase | Name | Status | One-Liner |
|-------|------|--------|-----------|
| 1 | Member Data Foundation | Complete (2026-01-30) | Member records in a durable SQLite store that survives a pulled plug |
| 2 | Shed Inventory Health | Complete (2026-02-14) | Live per-shed stock and tool condition, with one broken shed never hiding the others |
| 3 | Catalogue Browsing | Complete (2026-03-03) | Browse tools by shed and category, bounded to what each shed holds |
| 4 | Shed-to-Shed Transfers | Complete (2026-03-20) | Tracked transfers with receiving-steward confirmation and a loan log |

## 4. Requirements Coverage

- ✅ **Member records** — MEMB-01 ... MEMB-05 (Phase 1)
- ✅ **Shed inventory** — SHED-01 ... SHED-05 (Phase 2)
- ✅ **Catalogue** — CATL-01 ... CATL-05 (Phase 3)
- ✅ **Transfers** — MOVE-01, MOVE-02, MOVE-03, MOVE-04, MOVE-05 (Phase 4)

**Audit verdict:** tech debt — the milestone meets its intent, with three small items carried forward and none blocking.

## 5. Key Decisions Log

| ID | Phase | Decision | Rationale |
|----|-------|----------|-----------|
| D-01 | 1 | Member ids are short random strings, not counters | Ids appear in printed lists and must not reveal how many members exist |
| D-02 | 1 | Write-ahead logging is on from the first migration | A pulled plug must not corrupt the member table |
| D-03 | 1 | The kiosk passcode is checked in the request layer | A hand-crafted request must be refused as the screen would refuse it |
| D-04 | 1 | Contact preference is stored per member, not per shed | One answer is enough for every shed a member uses |
| D-01 | 2 | One stock query per shed | A broken shed must not hide the healthy ones |
| D-02 | 2 | Condition note and repair flag are separate columns | The flag must not depend on note wording |
| D-03 | 2 | A shed with nothing to report shows a count only | Empty detail panels read as missing data |
| D-04 | 2 | The repair badge is the only coloured element on a tool row | Stewards scan for it first |
| D-05 | 2 | A whitespace-only note saves as blank | Matches how the paper sheet was read |
| D-01 | 3 | One grid component serves the shed and category views | The two views must agree about a tool |
| D-02 | 3 | The catalogue is bounded to the tools a shed holds | Browsing never offers a tool that cannot be borrowed there |
| D-03 | 3 | Last loan date comes from the loan log, not a stored column | One source of truth for the date |
| D-04 | 3 | Category names are fixed text, not user-editable | Keeps the filter list short and stable |
| D-01 | 4 | A transfer is two linked rows | The tool stays findable from the sending shed |
| D-02 | 4 | The receiving steward confirms, the sender cannot | Confirmation proves the tool arrived |
| D-03 | 4 | The loan log writes dates in UTC with an offset | Stewards use laptops in different time zones |
| D-04 | 4 | A transfer survives a restart | Power cuts must not lose a tool in transit |
| D-05 | 4 | The confirmation screen and the stock view recompute the in-transit count separately | No shared helper yet; recorded as tech debt |

## 6. Tech Debt & Deferred Items

**Verification gaps:** one requirement is only partly met in the audit, and it is steward-side behaviour covered by the Phase 1 verification run.

**Tech debt at close:**
- A condition note holding only whitespace saves as blank and shows no repair flag (deferred).
- The repair flag and the condition note use two different empty-state wordings (advisory).
- The in-transit count is computed twice, so a future cache could let the two numbers drift apart (deferred).

**Lessons:** pin the shared counts with one test before a second screen reads them; keep the power-loss proof in the suite from the first phase.

**Deferred ideas:** a per-tool history page, and email reminders for overdue loans.

## 7. Getting Started

- **Run the project:** install dependencies, then start the server from the project root; the app serves on port 4300.
- **Key directories:**
  - `src/server/` — routes, queries and the migration files
  - `src/web/` — the pages and the shared grid component
  - `test/` — server and page tests
- **Tests:** run the full suite from the project root before every change.
- **Where to look first:** the transfer routes in `src/server/transfers/`, which touch every earlier phase.

---

## Stats

- **Timeline:** 2026-01-12 → 2026-03-20 (68 days)
- **Phases:** 4 / 4 complete
- **Commits:** 140
- **Files changed:** 212 files changed, 9,840 insertions(+), 1,206 deletions(-)
- **Contributors:** Marta Oyelaran, Tobias Reyes

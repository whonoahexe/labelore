# Milestones

## v1.0 Shed Basics (Shipped: 2026-03-20)

**Delivered:** One web app at `app.lendshed.example` that shows the live stock of every shed and moves tools between sheds as tracked transfers, replacing a shared spreadsheet and a paper sign-out sheet.

**Phases:** 4 (Phases 1-4) | **Plans:** 18 | **Tasks:** 41
**Timeline:** 2026-01-12 → 2026-03-20 (68 days, 140 commits)
**Requirements:** 20/20 v1.0 requirements satisfied

### Key Accomplishments

- **Member records with a durable store.** A SQLite file with write-ahead logging, proven against a pulled-plug test.
- **Honest shed inventory.** Each tool carries a condition note and a repair flag; sheds with nothing to report show a count only.
- **Catalogue browsing.** Browse by shed and by category with the same grid in both views.
- **Tracked shed-to-shed transfers.** A tool in transit stays findable until the receiving steward confirms it.

### Known Deferred Items

3 tech-debt items recorded, 0 blockers.

- **2 condition-note edge cases** deferred to a later milestone.
- **1 slow catalogue query** on the largest shed.

**Archives:** `milestones/v1.0-ROADMAP.md`, `milestones/v1.0-REQUIREMENTS.md`

---

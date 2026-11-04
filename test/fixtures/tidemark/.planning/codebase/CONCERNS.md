---
last_mapped_commit: c4e91ab7d03f58a2b6e1790d4c35fa80be127d69
last_mapped_at: 2026-10-30
made_up_example: true
derived_from: agents/gsd-codebase-mapper.md
gsd_core_version: 1.19.0
---
# Codebase Concerns

**Analysis Date:** 2026-10-30

Scope: the whole repository at the stamped commit. Nine sections follow, in template order.

## Tech Debt

**Window rebuild on every refresh:**
- Issue: The tide job deletes and rewrites all windows instead of changing the ones that moved
- Files: `server/tides/refresh.ts`, `server/store/index.ts`
- Impact: A request checked during a refresh can see no window at all
- Fix approach: Write the new windows in one transaction and swap them in

**Two copies of the overlap rule:**
- Issue: The board repeats the clash check so it can grey out dates early
- Files: `board/components/RequestForm/index.tsx`, `server/store/clash.ts`
- Impact: A rule change must land in two places
- Fix approach: Serve the blocked dates from the server and drop the copy

**Staff login shared by the whole office:**
- Issue: One password is used by every member of staff
- Files: `server/office/auth.ts`
- Impact: No record of who confirmed a request
- Fix approach: Give each staff member a code sign-in like the owners

## Known Bugs

**Confirmation mail sent twice:**
- Symptoms: An owner receives two notes when the office confirms and then edits a request
- Files: `server/office/routes.ts`
- Trigger: Confirm a request, then change its dates within one minute
- Workaround: Edit the dates first, then confirm

## Security Considerations

**Emailed codes never expire early:**
- Risk: A sign-in code stays valid for a full day even after it has been used
- Files: `server/berths/auth.ts`
- Current mitigation: Codes are six digits and rate limited per address
- Recommendations: Mark a code as spent on first use

**Staff session cookie:**
- Risk: The cookie is not marked secure when the proxy terminates TLS
- Files: `server/office/auth.ts`
- Current mitigation: The proxy redirects every plain request
- Recommendations: Read the forwarded protocol header and set the flag

## Performance Bottlenecks

### Berth list for a long date range

- Problem: A query for a whole season loads every request and filters in memory
- Files: `server/berths/routes.ts`
- Cause: The range filter runs after the load, not in the query
- Improvement path: Push the range into the SQL where clause

### Tide feed parse

- Problem: Each refresh parses the full feed, not only the next fourteen days
- Files: `server/tides/feed.ts`
- Cause: The feed has no date filter
- Improvement path: Drop rows beyond the horizon before parsing

## Fragile Areas

- The window builder assumes the feed rows arrive sorted by time and has no check for it
- The clash check treats an overnight stay as ending at noon, and the board mirrors that guess
- The migration runner applies files by name order, so a misnamed file runs out of place

## Scaling Limits

| Resource | Current capacity | Limit |
|----------|------------------|-------|
| Berths in the store | 120 | About 2,000 before the berth list query slows down |
| Concurrent staff logins | 1 | The shared login allows one session at a time |

## Dependencies at Risk

None identified.

## Missing Critical Features

**Waiting list:**
- Problem: A refused owner cannot ask to be told when the berth frees up
- Blocks: The office handles the queue by phone

## Test Coverage Gaps

Not detected.

---

*Concerns audit: 2026-10-30*

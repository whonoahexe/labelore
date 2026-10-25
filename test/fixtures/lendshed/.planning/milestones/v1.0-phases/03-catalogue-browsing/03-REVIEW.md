---
phase: 03-catalogue-browsing
reviewed: 2026-02-27T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - server/migrations/0006_catalogue_index.sql
  - server/src/api/catalogue.ts
  - server/src/app.ts
  - server/src/catalogue/boundary.ts
  - server/src/catalogue/categories.ts
  - server/src/catalogue/filters.ts
  - server/src/catalogue/page-cursor.ts
  - server/src/catalogue/query.ts
  - server/src/sheds/index.ts
  - server/test/catalogue-bounds.test.ts
  - server/test/catalogue-query.test.ts
  - server/test/category-tree.test.ts
  - web/src/catalogue/CataloguePage.tsx
  - web/src/catalogue/CategoryRail.tsx
  - web/src/catalogue/FilterChips.tsx
  - web/src/catalogue/ToolCard.tsx
  - web/src/catalogue/use-catalogue.ts
  - web/src/catalogue/use-shed-filter.ts
  - web/src/lib/route-params.ts
  - web/src/routes.tsx
findings:
  critical: 4
  warning: 15
  info: 7
  total: 26
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-02-27
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

The catalogue ships three bounds it says it keeps: results never cross a shed, a page never exceeds the
page size, and a bad category id degrades to an empty list. **All three are weaker than described, and two do
not hold.**

The worst gap is that the shed bound lives in exactly one place: the query builder trusts a shed id from the
URL and the boundary check that should confirm the member may browse that shed is never called from the
route. Any signed-in member can browse a shed they have no card for by editing the address.

Second, the category rail and the query disagree about what a category id means, and the page cursor survives
a shed change. The rest is quality and test coverage.

---

## Critical Issues

### CR-01: The shed boundary check is never called from the catalogue route

**File:** `server/src/catalogue/boundary.ts:61-84`, `server/src/api/catalogue.ts:33-47`

**Issue:** `mayBrowse` has one reference in the repository, its own test. The route reads `shedId` from the
query string and hands it straight to `runQuery`. Three doc blocks (`boundary.ts`, `catalogue.ts`,
`CataloguePage.tsx`) say the route checks it first. It does not.

```ts
const shedId = String(req.query.shed);
const rows = await runQuery({ shedId, category, cursor });
```

**Fix:** Call `mayBrowse(member, shedId)` before anything else and answer 404, not 403, for a shed the member
may not see, so the response does not confirm the shed exists.

---

### CR-02: The cursor outlives a shed change and pages through the wrong shed

**File:** `web/src/catalogue/use-catalogue.ts:49-124`, `server/src/catalogue/page-cursor.ts:88-131`

**Issue:** The hook keeps the last cursor in state and only clears it when the category changes. Switching
shed keeps the old cursor, so page two of shed B starts at a row that belongs to shed A, and the server
accepts it because the cursor holds only a row id.

**Fix:** Clear the cursor on any change of shed or category, and sign the cursor with the shed id so the
server can refuse one issued for another shed.

---

### CR-03: A category id that is not in the tree matches every tool

**File:** `web/src/catalogue/use-shed-filter.ts:226-240`, `server/src/catalogue/categories.ts:40-66`

**Issue:**
`resolveCategory` returns `undefined` for an id it cannot find, and `buildWhere` treats `undefined` as "no
category filter".

So `?category=nope` is not the empty list the spec asks for. It is the whole shed.

The fallback was meant for the unset case and is reached by the unknown case as well, because both arrive as
`undefined`.

**Fix:** Return `null` for unknown and have `buildWhere` produce `1 = 0` for it.

---

### CR-04: A module-level cache of browse results is never cleared on sign-out

**File:** `server/src/catalogue/page-cursor.ts:151`, `web/src/catalogue/ToolCard.tsx:37-48`, `web/src/catalogue/CategoryRail.tsx:20-31`

**Issue:** `lastPage` is a module singleton in `page-cursor.ts`. It holds the previous member's results and is
only replaced by the next query. A second member signing in on the same kiosk sees the first member's last
page for the length of one request, and the card renders from it before the new data arrives.

**Fix:** Clear the cache on sign-out and key it by member id.

---

## Warnings

### WR-01: `/catalogue/:shed` has no entry in the route capability table

**File:** `web/src/routes.tsx:88-97`, `web/src/lib/route-params.ts:14-22`

**Issue:** `capabilityFor()` falls back to "public" for a path it does not know, so the new route renders its
shell for a signed-out visitor before the first fetch is refused.

**Fix:** Add `/catalogue/:shed` beside `/stock` with the browse capability.

---

### WR-02: Shed filter state is written during render

**File:** `web/src/catalogue/use-shed-filter.ts:41-58`

**Issue:** The hook calls `setShed(fromUrl)` in the render body when the URL changes. React warns, and under
strict mode the update runs twice.

**Fix:** Derive the shed from the URL instead of copying it into state.

---

### WR-03: Category rail counts are computed from the current page, not the shed

**File:** `web/src/catalogue/CategoryRail.tsx:62-81,140-147`

**Issue:** `countsByCategory` reduces over the rows already loaded, so the badge beside "Drills" reads 12 on
page one and 24 on page two. The number reads as a total and is not one.

**Fix:** Ask the server for per-category counts in the same request, or drop the badge.

---

### WR-04: A failed page load leaves the spinner up for good

**File:** `web/src/catalogue/use-catalogue.ts:131-149`

**Issue:** `loadMore` sets `loading` before the request and clears it only in the success branch.

**Fix:** Clear it in `finally`.

---

### WR-05: Two quick category clicks race and the slower reply wins

**File:** `web/src/catalogue/use-catalogue.ts:152-171`

**Issue:** There is no request token, so a slow reply for the first category lands after the second one and
replaces its rows.

**Fix:** Keep a request counter and ignore any reply that is not the latest.

---

### WR-06: `useCatalogue` refetches on every render because its options object is new each time

**File:** `web/src/catalogue/use-catalogue.ts:33-47`

**Issue:** The effect depends on `options`, which the page rebuilds on each render, so the effect never
settles while any state changes.

**Fix:** Depend on the three fields the effect reads.

---

### WR-07: The shed filter drops the URL's other parameters when it writes

**File:** `web/src/catalogue/use-shed-filter.ts:77-90`

**Issue:** `setSearchParams({ shed })` replaces the whole query string, so a `q=` search is lost on a shed
change.

**Fix:** Copy the current parameters and set only `shed`.

---

### WR-08: Unknown shed ids show an empty page, not a not-found page

**File:** `web/src/catalogue/use-shed-filter.ts:101-118`

**Issue:** A shed that does not exist produces zero rows, which the page presents as a shed with nothing in it.

**Fix:** Have the server answer 404 and render the not-found view.

---

### WR-09: Fetch errors are logged with the raw response object

**File:** `web/src/catalogue/use-catalogue.ts:177`, `web/src/catalogue/use-shed-filter.ts:120`

**Issue:** `console.error('load failed', response)` prints headers, including the session cookie name, and
the full URL with the member's search text.

**Fix:** Log a short label and the status code only.

---

### WR-10: Page size comes from the query string with no upper bound

**File:** `server/src/api/catalogue.ts:51-60`

**Issue:** `?limit=100000` is passed to the query as written, so one request can read the whole table.

**Fix:** Clamp to the documented maximum before building the query.

---

### WR-11: The shed filter treats `""` and a missing shed the same

**File:** `web/src/catalogue/use-shed-filter.ts:131-139`

**Issue:** An empty `shed=` parameter selects the member's home shed instead of being refused.

**Fix:** Treat an empty string as invalid.

---

### WR-12: Filter change does not reset scroll position

**File:** `web/src/catalogue/use-shed-filter.ts:144-152`

**Issue:** After a filter change the list renders from the top but the window keeps its old scroll offset, so
the member lands partway down an unrelated list.

**Fix:** Scroll the list container to the top when the filter key changes.

---

### WR-13: Chips announce a removed filter to no one

**File:** `web/src/catalogue/FilterChips.tsx:30-52`

**Issue:** Removing a chip changes the results but nothing is announced to assistive tech.

**Fix:** Put the result count in a polite live region.

---

### WR-14: The condition filter builds its SQL by joining strings

**File:** `server/src/catalogue/filters.ts:27-44`, `server/src/catalogue/query.ts:70-82`

**Issue:** The condition names come from a fixed list today, but the code joins them into the statement with
a template string instead of binding them, so adding a user-supplied value later would be an injection.

**Fix:** Bind the values and keep the list as a lookup.

---

### WR-15: The boundary and the cursor have no tests that fail when they are removed

**File:** `server/test/catalogue-bounds.test.ts` (no cursor case), `server/src/catalogue/page-cursor.ts` (no test file)

**Issue:** Three test files were added. `catalogue-bounds.test.ts` calls `mayBrowse` directly and never
through the route, so removing the call in CR-01 leaves every test green. Nothing tests the cursor at all.

**Fix:** Add a route-level test for a shed the member may not browse, and a cursor test that replays a cursor
from another shed.

---

## Info

### IN-01: Two sources of truth for the page size

**File:** `server/src/catalogue/page-cursor.ts:30`, `server/src/catalogue/query.ts:33`

**Issue:** `PAGE_SIZE = 24` appears in both files.

**Fix:** Export it from `page-cursor.ts` and import it in `query.ts`.

---

### IN-02: Dead helpers in the cursor module

**File:** `server/src/catalogue/page-cursor.ts:129-136`

**Issue:** `encodeLegacy` and `decodeLegacy` have no callers.

**Fix:** Delete them.

---

### IN-03: `ToolCard` renders the condition badge above the photo

**File:** `web/src/catalogue/ToolCard.tsx:62-66`

**Issue:** The badge is positioned over the photo's top edge and hides the tool's handle in the thumbnail.

**Fix:** Move it below the title.

---

### IN-04: `useCatalogue` returns three values nothing reads

**File:** `web/src/catalogue/use-catalogue.ts:190-198`

**Issue:** `total`, `hasMore` and `reset` are returned and never destructured.

**Fix:** Remove them or wire them to the footer.

---

### IN-05: Stale comment in `runQuery`

**File:** `server/src/catalogue/query.ts:12-18`

> "Until the boundary lands in a later plan, this returns rows for any shed id it is given"

**Issue:** The boundary exists. The comment now describes a state of the code that is gone.

**Fix:** Delete the comment as part of the CR-01 fix.

---

### IN-06: `runQuery` builds the same prepared statement on every call

**File:** `server/src/catalogue/query.ts:96-110`

**Issue:** The statement text is rebuilt and re-prepared per request.

**Fix:** Cache prepared statements by filter shape.

---

### IN-07: The tool card's `alt` text repeats the title

**File:** `web/src/catalogue/ToolCard.tsx:70-74`

**Issue:** Screen readers announce the tool name twice.

**Fix:** Use an empty `alt` when the title sits directly beside the image.

---

_Reviewed: 2026-02-27T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

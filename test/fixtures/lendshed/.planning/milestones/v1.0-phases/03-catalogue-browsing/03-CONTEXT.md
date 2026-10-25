# Phase 3: Catalogue Browsing - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers **read-only browsing of every shed's tools from the page, plus a tool detail view with its condition and last loan date** — and, underneath both, the shed-boundary check that Phase 4's transfers will also rely on.

Four parts:

1. **A catalogue API** — `GET /api/catalogue/{shed}/{category}` returning one page of tools with name, category, condition and last loan date. Counted sheds read the store directly; the Depot shed asks its counter for a bounded total. Unified behind the `ShedSource` interface in ARCHITECTURE.md §Component Responsibilities — **browse and lookup only, transfer deliberately not**.
2. **The shed boundary (CATL-05)** — every shed id the API accepts is parsed against a closed list and checked against the member's home shed before any query runs. This is the phase's security spine.
3. **Search by name (CATL-04)** — a bounded prefix search, replacing the placeholder filter from the skeleton page.
4. **The `/catalogue` route** — the first link in the navigation shell that Phase 2's D-03 prepared, built on the foundation Phase 2 laid.

**Requirements covered:** CATL-01 (browse any shed), CATL-02 (browse by category), CATL-03 (last loan date), CATL-04 (search by name), CATL-05 (browsing cannot reach a shed the member has no home in).

**Not in this phase:** any write, move or transfer — the job engine, the confirm step and loan-log *writes* are Phase 4 (MOVE-01..05). This phase reads tools and streams pages outward; it never modifies a shed.

**The constraint that shapes the listing half:** a lookup into a silent shed is the very risk Phase 2's Pitfall 6 work addressed; browsing should adopt that approach instead of devising its own.
</domain>

<decisions>
## Implementation Decisions

### Navigation model

- **D-01:** **Tabs-and-grid single-pane layout.** One grid showing the current shed and category only, a category row above it, and a shed switcher across the top. Choosing a category replaces the grid rather than nesting.

  The endorsed shape:
  ```
  ┌─ Lendshed ─────────────────────── ● live ─┐
  ├───────────────────────────────────────────┤
  │ [canal] [ridge] [orchard] [depot]         │
  │                                            │
  │ canal / garden / spades / long-handled    │
  │ ─────────────────────────────────────────  │
  │ ▣ hand trowel                              │
  │ ▣ border fork                              │
  │ ▢ edging iron          good     Mar 18     │
  │ ▢ wheel hoe            repair   Mar 12     │
  └────────────────────────────────────────────┘
  ```

- **D-02:** **Shed and category live in the URL: `/catalogue/{shed}/{category}`.** Links can be shared, back steps up through the category row without extra work, and a reload returns to the same place.
- **D-03:** **The shed switcher shows just a status dot** — a small healthy/degraded/silent marker per shed, reusing Phase 2's state model.
- **D-04:** **A listing is a one-shot fetch with a manual refresh control.** No push and no polling; the catalogue does not change by the second.

### Listing contents

- **D-05 (steward lead chose against recommendation):** **Hide retired tools AND tools lent to another shed by default, with a "show all" toggle.** The recommendation was to show retired tools greyed out.
- **D-06:** **The server returns one page of 60 tools; the page does not load further pages until scrolled.** No cursor protocol beyond a page number.
- **D-07:** **Default order is available tools first, then natural name sort A–Z** (so `saw 2` precedes `saw 10`). Column headers are clickable to re-sort.
- **D-08 (steward lead chose against recommendation):** **Cards carry name, condition, last loan date and a category chip.** The recommendation was to leave the last loan date off the card.

### Claude's Discretion

- **The page size** for D-06 (60 was discussed, not fixed) and whether it is configurable.
- **The lookup deadline** for the Depot shed. Phase 2's precedent: a deadline strictly less than any interval.
- **The exact response shape** and how `ShedSource` declares its lookup across the counted and counter-fed sheds.
- **The empty-category and no-access states** were not discussed. Use judgement consistent with Phase 2's in-page, specific messages.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 3: Catalogue Browsing" — goal and success criteria.
- `.planning/REQUIREMENTS.md` — CATL-01 to CATL-05.

### Boundary safety — authoritative for this phase
- `.planning/research/PITFALLS.md` §Pitfall 10 — shed ids accepted from the wire.

### Architecture & stack
- `.planning/research/ARCHITECTURE.md` §Component Responsibilities — `ShedSource`.

### Frontend
- **The Lendshed design tokens are a fixed directive since Phase 2 (D-06)** and cover all UI work from here on.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`server/src/stock/reader.ts`** — a bounded read with a parent deadline, built for the counter feed; the lookup reuses it.
- **`web/src/stock/use-stock-socket.ts`** — live per-shed state, already a hook; D-03's dots consume it directly.

### Established Patterns
- **Tunables get named constants whose comments say what failure they guard against.**
- **Closed enums over free strings at boundaries.**

### Integration Points
- **`buildRouter`** — `/api/catalogue/{shed}/{category}` mounts here.
- **`web/src/nav-shell.tsx`** — gains its first nav link.

### Notable Gaps
- **No catalogue code exists anywhere** — the browse half of the shed source does not exist yet.
- **No grid, list or search input** — only Card, Badge, Progress, Alert and Skeleton exist so far, from Phase 2.
</code_context>

<specifics>
## Specific Ideas

- **The catalogue shape the steward lead endorsed** — reproduced in D-01 above; a shed switcher as a row of tabs, a category path as a slash-separated line, available tools sorted first.
- **She wants a tidy default view** (D-05): she chose to hide retired and lent-out tools, against the recommendation to show them greyed. Pair it with a visible toggle so nothing is lost.
</specifics>

<deferred>
## Deferred Ideas

- **Short-lived counter cache** — caching the Depot total for a minute would make browsing back faster, but it adds an invalidation question that Phase 4's transfers will settle.
- **Picking several tools** — Phase 4's "pick tools in one shed, start a transfer" will need checkboxes and a selection model; leave them out here.
- **Audit-logging browses** — the loan log arrives in Phase 4 and is not read-oriented.
</deferred>

---

*Phase: 3-Catalogue Browsing*
*Context gathered: 2026-02-18*

# Phase 2: Shed Inventory Health - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers Lendshed's first real member-facing view: **live per-shed stock and tool condition for all four sheds (Canal, Ridge, Orchard, Depot), pushed over the socket Phase 1 built and proved, with each shed kept apart so a silent or stale one can neither hide nor stall what the healthy sheds show.**

Three parts:

1. **Stock collection** — a dedicated background reader per shed, gathering the tool count from the shed's counter feed and the condition notes from the repair flags. Readers share nothing: any one may hang for good and the other three carry on.
2. **Live push** — per-shed stock frames broadcast over the existing ticket-authorized socket via the tagged `Event` enum, so the page updates with no reload.
3. **The stock page** — the landing page at `/`, four shed cards, replacing the walking-skeleton page. The real frontend base is laid here too: the design tokens and the card, badge and skeleton pieces.

**Requirements covered:** SHED-01 (live stock for every shed in one view), SHED-02 (a tool's condition note), SHED-03 (a prominent badge for a tool flagged for repair), SHED-04 (updates without a reload), SHED-05 (a shed with no data never hides the healthy sheds).

**Not in this phase:** browsing the catalogue and its shed boundary (Phase 3); transfers, the job engine and loan-log *writes* (Phase 4). This phase reads counts and flags only — it never walks the catalogue, never moves a tool, and never writes to a shed's feed. Historical stock charts are out of scope; stock is live-only and is **not** stored.

**Context that shapes everything here:** the Orchard shed's counter feed is **already unreliable and being replaced**. A silent shed is this phase's everyday state rather than a corner case: design for "some shed is quiet at this moment" as the normal situation.
</domain>

<decisions>
## Implementation Decisions

### Page layout & shed cards

- **D-01:** **A 2×2 grid of four cards** (single column on a phone), one for each shed. Chosen to match the one-reader-per-shed separation: each shed is a self-contained visual unit, so a silent shed visibly degrades its own card and nothing else. A single dense table was turned down because a row is a weak place to carry both a "no data" state and an un-missable repair warning.
- **D-02:** **Every card has the same parts**: fill bar plus percentage, tools in over capacity, a condition line, and a freshness stamp. The Depot shed keeps the identical shape — its condition line reads `counting` / `silent` rather than a repair verdict.
- **D-03:** **The stock page is the landing page at `/`**, replacing the skeleton. This phase also adds the **navigation shell** that Phases 3–4 (`/catalogue`, `/transfers`) will add links to.
- **D-04:** **Cards keep a fixed order** (Canal, Ridge, Orchard, Depot). Positions stay put across loads; moving the troubled shed to the top-left was explicitly turned down.

### Frontend foundation

- **D-05:** **Add only the pieces this page needs** (about Card, Badge, Progress, Alert, Skeleton). Install nothing speculative for Phases 3–4: pieces nobody uses turn into dead code we maintain.
- **D-06 (STRICT — steward lead directive):** **Use the Lendshed design tokens for everything UI-related**, from this phase onward. Choosing a palette on the fly is not allowed, nor is adding a second hand-rolled token set next to it.

### Repair alarm

- **D-07:** **The alarm trips on a tool flagged `needs repair`, OR on a non-zero count of tools flagged `missing parts`.** A verdict-only rule was turned down because the flag is set late, while missing parts are the earliest honest signal.
- **D-08 (steward lead overruled the recommendation):** **The red card alone — no banner anywhere on the page, dismissible or not.** The advice had been a lasting banner on top of the red card; she let the card do all the signalling. Leave banners out.

### Shed state model & silent handling

- **D-09:** **Three per-shed states: `healthy` / `degraded` / `silent`.** `degraded` means reporting with a repair flag set; it must never fold into `silent`, because each calls for something different from a member.

### Planning-time amendments (2026-02-06, raised by research, decided by the steward lead)

Research raised these two once the discussion was over, and the steward lead settled them while planning. **D-10 and D-11 change contracts that were already approved**; where they clash with earlier text, they win.

- **D-10 (amends D-02):** **If a shed has no condition feed at all, its card shows the count only and leaves out the condition line** — so it never implies a check that did not happen. The Depot counter has no flag feed.
- **D-11 (amends D-07):** **A counter that reports more tools than the shed's capacity also trips `degraded`**, alongside the repair-flag rule. It is free to detect and is exactly what a steward fixing a miscount needs to know.

### Claude's Discretion

- **Stale-feed deadline — resolved during planning:** research measured the Orchard feed at **12 s cold / 0.4 s warm**. Use a **20 s deadline with a 30 s interval** so the skip-overlap rule cannot starve the shed.
- **Exact interval values** for each read type, and whether they are configurable or constants.
- **Frame wire format** and the module layout under `server/src/stock/`.
- **Capacity-threshold warnings** ("shed nearly full") were not discussed — do not add without asking.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 2: Shed Inventory Health" — goal and success criteria.
- `.planning/REQUIREMENTS.md` — SHED-01 to SHED-05.

### Stock-collection pitfalls
- `.planning/research/PITFALLS.md` §Pitfall 6 — the key reference here: a silent counter feed, per-shed reader isolation, and blocking-pool starvation.
- `.planning/research/PITFALLS.md` §UX Pitfalls — "page shows every shed as loading forever when only one is silent".

### Architecture & stack
- `.planning/research/ARCHITECTURE.md` §Component Responsibilities — the stock reader and the broadcast bus.
- `.planning/research/ARCHITECTURE.md` §Internal Boundaries — stock is live-only; do not add a stock table.

### Phase 1 foundation this phase builds on
- `.planning/milestones/v1.0-phases/01-member-data-foundation/01-CONTEXT.md` — D-01 on tickets, which drives the reconnect requirement.
- `server/src/socket/index.ts` — the ticket-authorized socket handler; its message loop is a placeholder echo.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`server/src/socket/index.ts`** — the ticket-authorized upgrade handler, working and hardened. Phase 2 replaces its placeholder loop with a broadcast subscription.
- **`server/src/app.ts::initState`** — the established place to start background tasks; the per-shed readers follow the ticket sweeper's pattern.

### Established Patterns
- **Detached interval task** with a named interval constant.
- **Tunables get named constants whose comments say what failure they guard against.**

### Integration Points
- **Readers → broadcast bus → socket handler** — the new internal seam.
- **Frontend `/` → socket** — direct browser to server.

### Notable Gaps
- **No `stock/` module exists yet** — it is greenfield.
- **No design tokens are installed**; `web/` has only a layout and a skeleton page.
</code_context>

<specifics>
## Specific Ideas

- **The card layout she signed off** (from the accepted layout preview):
  ```
  ┌─ canal ─────────┐  ┌─ ridge ─────────┐
  │ █████░░░░░  62%  │  │ ███████░░░  71%  │
  │ 74 in of 120    │  │ 85 in of 120    │
  │ ● ALL TOOLS OK   │  │ ● ALL TOOLS OK   │
  └─────────────────┘  └─────────────────┘
  ┌─ orchard ───────┐  ┌─ depot ─────────┐
  │ ████████░░  88%  │  │ ███░░░░░░░  31%  │
  │ 90 in of 102    │  │ 37 in of 120    │
  │ ⚠ NEEDS REPAIR   │  │ ● counting       │
  └─────────────────┘  └─────────────────┘
  ```
- **The silent card layout she also signed off** (from the accepted preview):
  ```
  ┌─ orchard ───────────────┐
  │ ░░░░░░░░░░       (88%)  │  ← muted/greyed
  │ 90 in of 102            │
  │ ⚠ silent                │
  │   last heard 14:32 (6m) │
  └─────────────────────────┘
  ```
- **The acceptance test that matters:** unplug the Orchard counter and confirm **only that shed's card** goes silent while the page and the other three sheds keep updating live.
</specifics>

<deferred>
## Deferred Ideas

Nothing came up — the discussion stayed within the phase.

Adjacent items that were consciously **not** pulled forward: capacity-threshold warnings were left out because no SHED requirement asks for them, and a "last restocked" line was turned down since that information belongs to Phase 4's transfers.
</deferred>

---

## Amendment: 2026-02-09 (from the checkpoint at the start of Plan 02-01)

**The premise in the domain statement — "the Orchard counter feed is already unreliable and being replaced" — is SUPERSEDED by new hardware as of 2026-02-09.** The steward lead confirmed the Orchard and Depot counters are both NEW replacements. Real captures against the live feeds (see `server/fixtures/counter-orchard.json` and `.planning/milestones/v1.0-phases/02-shed-inventory-health/02-01-SUMMARY.md`) show all three counted sheds reporting cleanly. Later plans should not assume Orchard is the phase's live silent-feed test fixture — it no longer is.

**The Depot feed is unobservable, not merely quiet.** Its counter has no flag channel: only a bare total comes back, with no per-tool table. Treat the Depot's total as unconfirmed, never as a positive health signal.

---

*Phase: 2-Shed Inventory Health*
*Context gathered: 2026-02-03*
*Amended: 2026-02-09 (from the checkpoint at the start of Plan 02-01 — see above)*

# Quick Task 260403-k2p: right-click menu on the catalogue grid - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Task Boundary

Add a right-click menu to the tool cards of the `/catalogue/{shed}/{category}`
grid. Scope is the card-level menu only — no new server routes, no new transfer
rules, and no change to the Send-to → clash → confirm chain that
`catalogue-view.tsx` already runs.

</domain>

<decisions>
## Implementation Decisions

### Menu action set

The menu offers actions that already exist plus one that lives only in the page.
No item is a placeholder, and none needs a server route that has not been built.

- **Available tool card:** `Open`, `Copy tag`, `Send to…`
- **Lent-out tool card:** `Open history`, `Copy tag`, `Send to…`

Each item wires to a handler `CatalogueView` already owns:
- `Open` → the same `openTool(tool.id)` the card click calls
- `Open history` → the same `setHistoryTool(tool)` the card's clock button calls
  (it opens the `LoanHistoryPanel`; it does NOT start a second, divergent path)
- `Send to…` → `handleSendTo()`, the same handler `ActionBar` calls

Deliberately absent from this menu: `Retire`, `Edit`, `New tool` — neither working
items nor greyed-out stand-ins.

### Selection semantics

The menu always acts on **the right-clicked card alone**. Right-clicking never
changes the checkbox picks — it does not clear them, add to them, or replace them.

That has a consequence the planner has to deal with: `Send to…` currently reads
`pickedTools` (derived from the `picks` set) inside `handleSendConfirm`. Calling
it from the menu on a card outside `picks` must send **that card**, not the
current picks, and must never end up sending an empty `tool_ids` when nothing is
picked. So the source of a pending transfer has to be passed in, not always
computed from `picks`.

Reason: a transfer removes tools from a shelf, and a menu that targets something
other than the ticked boxes is how the wrong three tools get sent.

### Empty-space menu

No menu there. Cards only; a right-click on empty grid space shows the browser's
own menu.

The two obvious actions for empty space already have on-screen controls
(`Refresh` is the toolbar button in `catalogue-view.tsx`, `Pick all` is the header
checkbox in `catalogue-grid.tsx`), so a background menu would just duplicate them.

### Native menu and accessibility

Use the menu library's defaults in full:
- the native browser menu is suppressed on cards (and only on cards)
- the keyboard trigger works: Menu key or `Shift+F10` opens it on the focused card
- touch long-press opens the menu
- `Esc` closes it, arrow keys move between items, and focus returns on close

Shift+right-click does not open the browser menu.

</decisions>

<specifics>
## Specific Ideas

**The menu component is missing.** `web/src/ui/` has no `context-menu.tsx`.
Generate it with the design-token tool rather than writing it by hand, so it
picks up the shared tokens.

**Windowed cards.** `catalogue-grid.tsx` renders cards through a windowing helper.
Each card wraps in its own trigger; the menu renders outside the scroll area, so
nothing clips it. Nothing about card height may change.

**Existing click handlers must stay independent.** `tool-card.tsx` already stops
propagation on the checkbox and the clock button so neither opens the tool. Adding
the menu must not disturb that; an ordinary click must still act exactly as before.

**Copy tag format** — an assumption, flagged for the planner: copy the shed-qualified
tag (`ridge/GRD-0042`), with no leading slash, so the string is unambiguous across
sheds. Use the async clipboard call with a quiet no-op on failure; there is no toast
system yet and none should be introduced.

</specifics>

<canonical_refs>
## Canonical References

- `web/src/catalogue/tool-card.tsx` — the card this menu attaches to; card height
  and propagation conventions are documented inline
- `web/src/catalogue/catalogue-view.tsx` — owns `openTool`, `setHistoryTool`,
  `handleSendTo`, `handleSendConfirm` and the `picks` set
- `web/src/catalogue/catalogue-grid.tsx` — the windowing host and the header checkbox
- the Lendshed design tokens — mandatory for all UI work in this repo

</canonical_refs>

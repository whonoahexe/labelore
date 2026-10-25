# Phase 3: Catalogue Browsing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-02-03
**Phase:** 3-Catalogue Browsing
**Areas discussed:** Navigation model, Listing contents, Receipt boundary, Depot browsing

---

## Navigation model

### Q1: What is the main shape of the catalogue screen?

| Option | Description | Selected |
|---|---|---|
| Category row + single pane (Recommended) | One grid for the current shed and category. | ✓ |
| Tree sidebar + grid | A lasting expandable tree on the left. | |
| Shelf columns | Horizontal columns, one per level. | |

**User's choice:** Category row + single pane
**Notes:** Maya approved the ASCII mock-up as the target — shed tabs across the top, a slash-separated trail, available tools leading, condition aligned right.

### Q2: Is the current shed and category worth putting in the address?

| Option | Description | Selected |
|---|---|---|
| Yes — /catalogue/{shed}/{category} (Recommended) | Shareable, and Back climbs one level. | ✓ |
| No — /catalogue with page state only | Easier routing, though a refresh starts over. | |

**User's choice:** Yes — /catalogue/{shed}/{category}
**Notes:** —

### Q3: How much shed health does the switcher carry over from the stock page?

| Option | Description | Selected |
|---|---|---|
| Status dot only (Recommended) | One healthy / degraded / silent dot for each shed. | ✓ |
| Plain tabs, no health | No link to the Phase 2 state. | |
| Mini shed cards | Most detail, but duplicates the stock page. | |

**User's choice:** Status dot only
**Notes:** —

### Q4: Does a listing load once, or keep updating?

| Option | Description | Selected |
|---|---|---|
| Single REST load + refresh button (Recommended) | A GET plus a control to reload. | ✓ |
| Push updates over the socket | Live changes, paid for with file watchers. | |
| Poll on an interval | No new machinery, yet repeated reads. | |

**User's choice:** Single REST load + refresh button
**Notes:** —

---

## Listing contents

### Q1: Which tools appear in a listing, with retired and lent-out ones about?

| Option | Description | Selected |
|---|---|---|
| Hide retired only (Recommended) | Suppress just the retired flag. | |
| Show everything, unfiltered | Truthful, no rules, but cluttered. | |
| Hide both retired and lent-out, with a switch | The tidiest default, plus a "show all" switch. | ✓ |

**User's choice:** Hide both retired and lent-out, with a switch — **against the recommendation**
**Notes:** Maya wanted the tidy default. Written up as D-05, with the switch flagged as mandatory so the default hides nothing for good.

### Q2: What should a listing do about a tool that has moved to another shed?

| Option | Description | Selected |
|---|---|---|
| Look up, then verify the shed (Recommended) | Find the tool's present home and insist it matches. | ✓ |
| Refuse moved tools outright | Easiest, no lookup risk at all. | |
| Show them, flag them, reject mismatches | Most open, though it needs more interface. | |

**User's choice:** Look up, then verify the shed
**Notes:** Presented as the hard corner of the shed-boundary rule. CONTEXT points out the race window the rejected option guarded against and gives the mechanism to research.

### Q3: What about a category that holds over 5,000 tools?

| Option | Description | Selected |
|---|---|---|
| Everything returned, drawn in windows (Recommended) | The full set, rendered a screenful at once. | ✓ |
| A server limit and a clear truncation note | A firm ceiling and a candid message. | |
| Cursor-based paging | Memory stays bounded, at the cost of more protocol. | |

**User's choice:** Everything returned, drawn in windows
**Notes:** —

### Q4: What order should a listing start in?

| Option | Description | Selected |
|---|---|---|
| Available tools first, then A–Z (Recommended) | Fits how the desk hunts for tools. | ✓ |
| Available first, then most recently added | True to life, but shifts around. | |
| Mixed, newest first | The best view of "what just arrived". | |

**User's choice:** Available tools first, then A–Z
**Notes:** —

---

## Receipt boundary

### Q1: Which receipts count as downloadable?

| Option | Description | Selected |
|---|---|---|
| Size cap only (Recommended) | A single size threshold. | ✓ |
| Size cap + type allowlist | Extra cover, though allowlists go stale. | |
| Size cap, plus an exception for scans | Fits the desk, but adds a one-off rule. | |

**User's choice:** Size cap only
**Notes:** The threshold itself is for planning to set; roughly 20 MB came up as an opening guess, nothing fixed.

### Q2: How does an oversized receipt look to a member?

| Option | Description | Selected |
|---|---|---|
| Greyed-out control + shared-drive path (Recommended) | A greyed control showing the true size. | ✓ |
| Greyed control with just a reason | Bare-bones, and the member is left stranded. | |
| Let them click, fail on the server | No rules to keep aligned. | |

**User's choice:** Greyed-out control + shared-drive path
**Notes:** CONTEXT states that the server applies the cap by itself — the greyed control is a courtesy, never the enforcement.

### Q3: How do Depot receipts get delivered?

| Option | Description | Selected |
|---|---|---|
| Pipe through the feed reader (Recommended) | A bounded process streamed straight to the client. | ✓ |
| No Depot receipts this phase | The smallest footprint. | |
| Copy to scratch, then deliver | Simpler failure modes, though disk use doubles. | |

**User's choice:** Pipe through the feed reader
**Notes:** —

### Q4: How closely should a download ticket be tied to one path?

| Option | Description | Selected |
|---|---|---|
| Tie to the exact shed + path at issue (Recommended) | Path validated and made canonical when issued. | ✓ |
| Ticket grants access, path rides in the URL | More RESTful, a ticket per session. | |
| Tie to the shed only | Fewer round-trips, yet still wide. | |

**User's choice:** Tie to the exact shed + path at issue
**Notes:** This is the path scoping that STATE.md said the Phase 1 ticket design left space for. For later: WR-05 (ticket issue has no rate limit) is still open, and this makes issuing happen per receipt.

---

## Depot browsing

### Q1: What keeps Depot's slow feed from dragging? (a stock read measured 31s cold / 0.6s warm)

| Option | Description | Selected |
|---|---|---|
| Bounded process + visible timeout state (Recommended) | Reuse the bounded runner, adding a timeout state. | ✓ |
| Bounded, plus a brief listing cache | Instant backtracking along the trail, but stale. | |
| Bounded, nothing special in the interface | Least code, a single error path. | |

**User's choice:** Bounded process + visible timeout state
**Notes:** The listing cache was deliberately passed over and sits in CONTEXT `<deferred>` to be reopened with Phase 4, which brings a write event to expire it on.

### Q2: What if someone browses a shed that has gone silent?

| Option | Description | Selected |
|---|---|---|
| Admit them, show the state inside the pane (Recommended) | Moving around never waits on health. | ✓ |
| Disable the switcher for silent sheds | Avoids a pointless request. | |
| Try regardless, no special handling | A single path, but a stuck read hangs. | |

**User's choice:** Admit them, show the state inside the pane
**Notes:** —

### Q3: How is the server protected if a browse read hangs?

| Option | Description | Selected |
|---|---|---|
| Own blocking thread + deadline (Recommended) | Phase 2's canary rule, as it was. | ✓ |
| Also consult the health registry first | Sidesteps most hangs at low cost. | |
| Cap concurrent listing requests | Aimed at the starvation case. | |

**User's choice:** Own blocking thread + deadline, leak accepted
**Notes:** The per-shed cap on requests in flight was not turned down flat — CONTEXT hands it to Claude's Discretion leaning towards adding it, as each repeated click on a stuck shed leaks one thread.

### Q4: Which fields appear on a card?

| Option | Description | Selected |
|---|---|---|
| Name, condition, last loan — identical for every shed (Recommended) | Precisely the stated need, uniform. | |
| Include a kind chip | A category chip on every card. | ✓ |
| Shed-specific fields | Reveals what each backend knows. | |

**User's choice:** Include a kind chip — **against the recommendation**
**Notes:** CONTEXT bounds this in D-08: the kind list must stay short and in one place, as no requirement relies on it. The fields remain the same on all four sheds.

---

## Claude's Discretion

- The size-cap number, and whether it is read from the environment or fixed in code (match the `config.ts` and `FIRST_MESSAGE_GRACE` naming)
- Listing deadlines for Depot and local sheds — taken from measurement, not borrowed from the health poll's 45s
- Whether to put a per-shed limit on in-flight listings atop the blocking-thread rule (leaning yes)
- How path resolution is made race-safe — the choice is fixed, the method is for research
- The listing response shape and how `ShedSource` declares its browse method
- Which flags to pass to the feed reader (only what the chosen fields need; flat by construction)
- Windowing library choice; whether the "show all" toggle persists
- Empty-category and permission-denied states (not discussed; use judgement)
- Whether the `/` stock page gains a link into `/catalogue` beyond the nav shell entry

## Deferred Ideas

- **A brief Depot listing cache** — weighed under the latency question and declined; reopen if Depot browsing feels sluggish, or with Phase 4
- **Choosing several tools** — what MOVE-01 will want in Phase 4; browsing here is read-only and one tool at a time
- **Recording browse and download actions** — MOVE-05 belongs to Phase 4; whether reads are logged at all is Phase 4's decision
- **Search within a shed** — never raised; a new capability, noted so it is not mistaken for an oversight

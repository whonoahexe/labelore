# Phase 2: Shed Inventory Health - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-01-20
**Phase:** 2-Shed Inventory Health
**Areas discussed:** Shed card anatomy & page layout, Repair alarm (trigger & loudness), Silent shed presentation, Count cadence & freshness

---

## Shed card anatomy & page layout

### Q1: How should the four sheds be laid out on the stock page?

| Option | Description | Selected |
|---|---|---|
| Four cards in a grid (Recommended) | 2x2 on a desk, stacked on a phone. Each card stands alone. | ✓ |
| One dense table, a row per shed | Quicker to scan, numbers line up. | |
| Three shed cards and Depot apart | Honest about Depot's missing feed. | |

**User's choice:** Four cards in a grid.
**Notes:** Maya picked the ASCII preview showing fill bar, tools over capacity and a condition line per card.

### Q2: Depot has no condition feed and no tag reader. What fills that slot?

| Option | Description | Selected |
|---|---|---|
| Reachable + count, same shape (Recommended) | Identical card; the condition line reads as reachable only. | ✓ |
| Drop the condition line for Depot | No made-up measure, but the card looks different. | |
| Reachable + count + last stock-take | Richer, but "last stock-take" belongs to Phase 4. | |

**User's choice:** Reachable + count, same shape.

### Q3: How much interface groundwork should Phase 2 lay (no component kit yet)?

| Option | Description | Selected |
|---|---|---|
| Install the kit + only what cards need | Init plus roughly Card, Badge, Progress, Alert, Skeleton. | ✓ |
| Install the kit + a broader base | Front-loads churn but installs once. | |
| Stay on raw utility classes for now | Ships sooner but contradicts a standing choice. | |

**User's choice:** Install the kit + only what cards need — **with an added strict directive**: use the Lendshed design tokens everywhere UI-related, and save that to memory.
**Notes:** The directive reaches past this phase — it is a standing constraint for all interface work. Saved to memory (`lendshed-tokens`) and recorded as D-06 in CONTEXT.md. This settles the "tokens TBD" left open at project start.

### Q4: Is the stock page the landing page, or one route among others?

| Option | Description | Selected |
|---|---|---|
| Landing page at / (Recommended) | Stock is what you want on open. | ✓ |
| Landing at / with no nav shell yet | Less speculative scaffolding. | |
| A dedicated /stock route | Conventional, but leaves an empty home. | |

**User's choice:** Landing page at /.

---

## Repair alarm — trigger & loudness

### Q1: What trips the repair alarm?

| Option | Description | Selected |
|---|---|---|
| Overall verdict + missing-parts counts (Recommended) | A tool flagged needs-repair **or** a non-zero missing-parts count. | ✓ |
| The overall verdict only | Simplest, one field, but stays quiet while parts go missing. | |
| Verdict + counts + a worsening trend | Most useful, but a trend needs history. | |

**User's choice:** Overall verdict + missing-parts counts.

### Q2: How does the alarm stay impossible to miss without turning into wallpaper?

| Option | Description | Selected |
|---|---|---|
| Lasting banner + red card, not dismissible | A top-of-page alert plus the red card. | |
| Lasting banner, dismissible for a day | Respects that the team knows, but returns. | |
| Red card only, no banner | Cleaner and non-repeating, but competes with other cards. | ✓ |

**User's choice:** Red card only, no banner — **against the recommendation.**
**Notes:** Maya overrode the advised banner. Recorded as D-08 with a "do not reintroduce a banner" note for later agents. With the banner gone, the follow-up (Q3) tightened the card treatment.

### Q3: How far does the red-card treatment go, given it carries "prominent" alone?

| Option | Description | Selected |
|---|---|---|
| Red styling + reason + sort to the top | Styling, a reason line, and failures first. | |
| Red styling + reason, fixed grid order | Same look, stable positions. | ✓ |
| Red styling only | Minimal, but a bare "needs repair" explains nothing. | |

**User's choice:** Red styling + reason, fixed grid order.
**Notes:** Maya put steady positions ahead of attention-grabbing sort. The plain-language reason line stays and is required.

### Q4: How does a non-root server process read the tag counter?

| Option | Description | Selected |
|---|---|---|
| A narrow device-group rule (Recommended) | A rule scoped to one read-only device and one command. | ✓ |
| Ask the counter daemon instead | No grant, but adds a service and a socket. | |
| Run the server as root | Simplest, and turns any later bug into a full takeover. | |

**User's choice:** A narrow device-group rule.
**Notes:** Care point kept in CONTEXT.md D-07 — the rule must pin the exact arguments, since a loose wildcard would hand over arbitrary device and file-write flags.

---

## Silent shed — what the steward sees

### Q1: When a shed goes silent, what does its card show?

| Option | Description | Selected |
|---|---|---|
| Last-known values, greyed, with an "as of" stamp | A muted card reading "silent — last seen ...". | ✓ |
| Blank the values, show the state only | No misread risk, but throws away trend context. | |
| Last-known values with no staleness cue | Rejected on its face. | |

**User's choice:** Last-known values, greyed, with an "as of" stamp.
**Notes:** Maya picked the ASCII preview showing the muted bar with a parenthesised stale percentage and a "last seen 14:32 (6m)" line.

### Q2: How many distinct per-shed states?

| Option | Description | Selected |
|---|---|---|
| Healthy / Degraded / Silent / Unknown | Four states; unknown means never polled. | |
| Healthy / Degraded / Silent | Simpler, but the first-poll gap needs an answer. | ✓ |
| Healthy / Silent + a separate Stale flag | Cleaner modelling with two axes. | |

**User's choice:** Healthy / Degraded / Silent (three states).
**Notes:** Maya dropped the proposed `unknown` state. That opened a question about cold start, answered at once in Q3.

### Q3: What shows during cold start, before any shed has been polled?

| Option | Description | Selected |
|---|---|---|
| Skeleton until the first poll, no state | The server sends no frame until it has one. | ✓ |
| Report silent until proven otherwise | Fail-safe in spirit, but shows four alarms at boot. | |
| Report healthy until proven otherwise | Rejected — shows a shed with parts missing as fine. | |

**User's choice:** Skeleton until the first poll.
**Notes:** Keeps the three-state set intact while closing the gap Q2 opened.

### Q4: How does a poller declare its shed silent, given hung reads ignore timeouts?

| Option | Description | Selected |
|---|---|---|
| Canary read + timeout is the signal | A bounded read; the timeout itself is the signal. | ✓ |
| Timeout + device-list disappearance | Catches a clean unplug sooner, but fragile. | |
| Timeout only, no outstanding-poll cap | Simpler loop, but leaks a blocked thread. | |

**User's choice:** Canary read + timeout is the signal itself.
**Notes:** The one-outstanding-poll cap is recorded as a correctness requirement (D-12), not an optimisation.

---

## Count cadence & freshness

### Q1: How should poll intervals be set across the four sheds?

| Option | Description | Selected |
|---|---|---|
| Per-shed intervals, per-poll type | Counts about 5s (a local read); condition slower. | ✓ |
| One interval for everything (about 10s) | Simplest, but either hammers Depot's feed or lags. | |
| Adaptive — back off on a failing shed | Appealing, but adds state. | |

**User's choice:** Per-shed intervals, per-poll type.

### Q2: What does the server push over the socket, and when?

| Option | Description | Selected |
|---|---|---|
| Per-shed frame, pushed on change and on connect | Per-shed frames keep sheds apart. | ✓ |
| One all-sheds frame on every change | Simple for the page, but couples sheds. | |
| Per-shed frame every tick, changed or not | Doubles as a heartbeat. | |

**User's choice:** Per-shed frame, pushed on change and on connect.
**Notes:** Change-only pushes make a steady shed go quiet, which made Q3 necessary.

### Q3: With change-only pushes, how does the page tell "nothing changed" from "the feed died"?

| Option | Description | Selected |
|---|---|---|
| Frames carry polled_at; page shows relative age | Age climbs visibly if polling stops. | ✓ |
| A separate heartbeat frame | Explicit, but a second mechanism. | |
| Trust the socket state alone | Wrong in exactly this phase's scenario. | |

**User's choice:** Frames carry polled_at; page shows relative age.

### Q4: How does the page handle a socket drop, given tickets are single-use with a short life?

| Option | Description | Selected |
|---|---|---|
| Auto-reconnect: re-mint + backoff, visible status | Necessary here, since the box loses power. | ✓ |
| Auto-reconnect, no visible status | Less interface, but members guess. | |
| A manual reconnect button | Never hammers a down box, but tiresome. | |

**User's choice:** Auto-reconnect: re-mint + backoff, visible status.

---

## Claude's Discretion

Explicitly left to research and planning (recorded in CONTEXT.md `<decisions>` under Claude's Discretion):

- Exact poll interval values, and whether they come from the environment or are constants
- Shed configuration shape (device paths, feed address, env versus file), and how a device path maps to a counter
- The canary timeout and the per-shed blocking-thread budget
- Lag handling on the broadcast channel for slow socket clients
- How a shed returns to `healthy` after recovery (not discussed)
- Frame wire format and module layout under `server/src/health/` and `server/src/sheds/`

## Deferred Ideas

No scope creep occurred — the discussion stayed inside the phase boundary throughout.

Consciously left out during discussion:

- **Capacity-threshold warnings** ("shed nearly full") — no requirement asks for it; flagged "do not add without asking"
- **Worsening-trend alerting** — needs retained history; historical charts are explicitly out of scope
- **Depot "last stock-take" line** — that data is Phase 4 job state
- **Adaptive poll backoff on failing sheds** — unnecessary state for read-only polls

Noted in passing, not scoped: **WR-04** (the page's `API_ORIGIN` hardcoded, no env override — open from the Phase 1 review) lives in the very file this phase rewrites. The planner may fold it in cheaply; it is not a Phase 2 requirement.

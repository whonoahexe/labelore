# 02-12 Summary — Per-shed stock-feed staleness deadline

**Status:** Complete. 2/2 tasks.
**Commits:** `e5a40b8` (Task 1), `91cd7f3` (Task 2).

> **Execution note.** The dispatched executor was stopped mid-run by a session
> limit, after writing both tasks' code to the working tree but before
> committing or checking it. The orchestrator read the partial diff, checked it
> against every acceptance line, ran the full gate and committed it. No code
> was regenerated; the two commits are the executor's work plus one spacing
> clean-up.

## What changed

- Each shed's stock feed now has its own staleness deadline instead of one shared 20 seconds.
- The north and east sheds poll every 5 seconds, so their deadline stays at four poll intervals, which equals the old 20 seconds.
- The harbour shed polls over a slower link every 30 seconds, so its deadline sits above that interval and a single quiet frame no longer flips it to unreachable.
- A generic check walks every registered shed feed and asserts its deadline is longer than its own poll interval.

## Verification

| Criterion | Status |
|-----------|--------|
| local derivation unchanged (4 × `FEED_POLL_INTERVAL` == old 20s) | `local_deadline_matches_the_old_value` |
| harbour deadline strictly exceeds `HARBOUR_POLL_INTERVAL` | `a_harbour_deadline_exceeds_its_poll_interval` |
| the real flap scenario does not flip | `a_harbour_frame_silent_past_20s_but_inside_its_deadline_stays_reachable` |
| watchdog still bites for local feeds | `a_local_frame_silent_past_20s_is_still_flipped` |
| the retained-stock contract holds | existing `a_stale_shed_flips_to_unreachable_keeping_stock` |
| `confirm_unreachable` untouched | confirmed by diff, no confirmation logic in either commit |
| generic invariant over `default_feeds()` | `every_feeds_deadline_exceeds_its_own_poll_interval` |
| harbour constant values unchanged | confirmed by diff, comment only |

## Notes for downstream plans

- A new shed feed must register its poll interval; the generic check fails the build otherwise.
- The deadline is derived, not stored, so changing a poll interval moves its deadline with it.

## Self-Check: PASSED

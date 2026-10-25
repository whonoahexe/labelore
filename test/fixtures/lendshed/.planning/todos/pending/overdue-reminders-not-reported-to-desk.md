---
title: Failed overdue reminders are never reported to the desk
date: 2026-03-21
priority: high
---

# Failed overdue reminders are never reported to the desk

Found during the 2026-03-20 `/gsd-explore` session on export bundle checksums.
Deliberately scoped out of that change — see [[2026-03-20-export-bundle-design]] (D-C).

## What happens today

The reminder worker marks a reminder `"sent"` as soon as it queues the message
(`api/src/reminders/worker.ts:54`), **before** delivery is tried. That records a handoff,
not an outcome.

If delivery then fails, nothing more is sent: the job lands in the queue's failed list and
the worker log, and the `Reminder` row stays `sent`. `GET /desk/reminders` only serves
`status="due"`, so the row is never offered again — **no retry, no alert, no trace on the desk**.

## The dead reporting channel

`api/src/reminders/events.ts` defines `setStatus` (line 9) and `setOutcome` (line 14), the
calls a queued job would reach for. Both `push` onto a list called `reminders:status`.

**Nothing reads that list.** A search of the three repos found two hits, both writes.
Meanwhile `addLog` and `flushLogs` (`events.ts:58`) show a working drain; `reminders:status`
has only the producer half.

## Why it matters more now

The bundle checksum adds a new way to fail into this gap: a corrupt bundle that used to slip
through will now be caught, and then vanish silently instead of raising an alert.

## Options considered

- **Report to the desk** — catch at the send site and mark the reminder failed; needs a drain
  built and the reminder id passed down to six call sites.
- **Just make it loud** — `addLog(level="error")` at the failure; cheap, visible to stewards,
  no retry.

Either way, `setOutcome` is not a working channel from inside a job.

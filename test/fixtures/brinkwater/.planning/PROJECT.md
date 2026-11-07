<!-- made-up example · derived from gsd-core/bin/lib/workstream.cjs · gsd-core 1.19.0 -->
# Brinkwater

## What This Is

A tide-gauge service for a small harbour, reachable at `gauges.brinkwater.example`. Sensor posts on the quay walls
report water height every minute, the service keeps the readings and the harbour office reads them on a board.
Several lines of work run side by side in this project, each as a GSD workstream.

## Core Value

The harbour office can see the water height at every gauge post now, and trust that the number is current.

## Constraints

- **Hosting**: One small server in the harbour office, no cloud account.
- **People**: Two people, Marit Osei (harbour engineer) and Tomas Lindqvist (developer).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Poll the posts, do not wait for pushes | The posts sleep between readings and cannot hold a connection. | ✓ Good |
| One workstream per line of work | Intake, ledger and notices move at different speeds and different people hold them. | — Pending |

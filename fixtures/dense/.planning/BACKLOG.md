# Backlog: Dense Fixture Project

Pending ideas and deferred work, captured but not yet scheduled into a milestone.

## Deferred

- **Retry logic for the legacy ingest pipeline** — deferred at v2.0 close; the pipeline currently fails
  hard on a transient network error instead of retrying.
- **IDENT-04: live reconciliation with a running session** — tracked as a v4.0 requirement, not yet
  scheduled.

## Ideas

- A digest/summary mode for the fixture-loading CLI, to avoid dumping the full dense tree when only
  counts are needed.

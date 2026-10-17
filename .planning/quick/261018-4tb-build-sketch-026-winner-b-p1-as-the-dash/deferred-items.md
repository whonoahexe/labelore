# Deferred items: quick task 261018-4tb

These failures were already present at the base commit (eb46b29) and are not caused by this task.

- `test/token-guard.test.ts`, "has zero violations outside the token blocks in the real stylesheet". The list is exactly the three older rules (`.view-plan-nav-body code`, `.view-plan-nav-checks li::before`, `.view-ui-review-found-card code`). This task adds no violation.
- `test/presentation/coverage.test.ts`, "renders the matrix before both complete documents in the plan pair page".
- `test/rendering/ascii-graph.test.ts`, "builds its graph in under 250 ms". It is a timing test and passed on the last two full runs here.

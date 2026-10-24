# Deferred items (quick-261023-61l)

Failures already present at the base commit (d4b4bec) and still failing; none touches the note page.

- `test/token-guard.test.ts` whole-stylesheet case: names three older declarations (`.view-plan-nav-body :not(pre) > code`, `.view-plan-nav-checks li::before`, `.view-ui-review-found-card ... code`). Nothing from the note block is listed.
- `test/presentation/coverage.test.ts` "renders the matrix before both complete documents in the plan pair page".
- `test/rendering/ascii-graph.test.ts` two 250 ms cost-bound cases are load-sensitive: they failed in the baseline run and passed in the final run.

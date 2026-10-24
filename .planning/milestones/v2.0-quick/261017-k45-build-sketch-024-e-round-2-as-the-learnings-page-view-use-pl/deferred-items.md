# Deferred items - quick-261017-k45

Failures that were already present at the base commit or that depend on machine load; none is caused by
this item and none is fixed by it.

- `test/token-guard.test.ts` > "has zero violations outside the token blocks in the real stylesheet": three older
  rules (`.view-plan-nav-body :not(pre) > code`, `.view-plan-nav-checks li::before`,
  `.view-ui-review-found-card ... code`). Nothing from the new LEARNINGS block is named.
- `test/presentation/coverage.test.ts` > "renders the matrix before both complete documents in the plan pair page".
- Wall-clock bounds that fail under load: `test/rendering/ascii-graph.test.ts` (two "under 250 ms" cases in the
  full run), `test/security-register.test.ts` (1 MB body within 250 ms in the full run). They sit in code this
  item does not touch.
- `test/e2e/artifact-header.spec.ts` "plain-header SUMMARY" was not part of this item's e2e run.

# Deferred items (quick-261017-18a)

- test/token-guard.test.ts "zero violations in the real stylesheet" already fails at the base commit on three rules this task did not write: `.view-plan-nav-body :not(pre) > code` (font-size 0.86em), `.view-plan-nav-checks li::before` (margin-top 0.42rem) and `.view-ui-review-found-card .view-ui-review-item-text code` (font-size 0.88em). Out of scope; not fixed here.
- test/presentation/coverage.test.ts "renders the matrix before both complete documents in the plan pair page" fails at the base commit (reads src/web/pages/plan-pair-page.tsx, which this task does not touch). Out of scope.

# Deferred items - quick-261017-k44

Baseline taken with `npx vitest run` on master at f717f8f before any edit. These failures are not caused
by this item and are not fixed by it.

## Unit tests failing at baseline

- `test/token-guard.test.ts` > "has zero violations outside the token blocks in the real stylesheet"
  (three older rules; this item adds no violation naming a `.view-review-` selector).
- `test/presentation/coverage.test.ts` > "renders the matrix before both complete documents in the plan
  pair page".
- `test/rendering/ascii-graph.test.ts` > three "builds its graph in under 250 ms" cost-bound cases, and
  `test/rendering/ascii-lift.test.ts` > "a 250x300 grid of 'ab  ' runs returns within 250 ms". These are
  wall-clock bounds that measure 260-330 ms on this machine while other work is running (they pass or fail
  with load); they sit in the ascii diagram code, which this item does not touch.

## End-to-end tests failing at baseline

- `test/e2e/artifact-header.spec.ts` > "plain-header SUMMARY" (predates the SUMMARY page view).

## Seen once under load at the final gate run

- `test/security-register.test.ts` > "extracts a 1 MB body holding one 200k-character line within 250 ms" failed in the
  full run (15:38) and passed when re-run alone. Another wall-clock bound like the ascii ones; it sits in the
  security extractor, which this item does not touch.
- `test/rendering/ascii-graph.test.ts` > "a lifted figure builds its graph in under 250 ms" failed in the full run
  (same wall-clock family as the baseline entry above).

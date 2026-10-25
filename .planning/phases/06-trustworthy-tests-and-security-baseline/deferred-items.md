## Deferred Items

- 25 unit tests already failed on the commit this phase started from (b509898), in five files: `test/project-research-lift.test.ts` (7), `test/presentation/project-research.test.ts` (14), `test/presentation/drawer.test.ts` (1), `test/web/summary-run-corpus.test.ts` (2, `.planning/milestones/v1.0-research/SUMMARY.md` has no structured summary). Resolved by plan 06-07: `test/web/pattern-map-corpus.test.ts` (1, it needed a pinned entry for `06-PATTERNS.md`), which now pins it under `LB:`. Found during plan 06-01; verified identical on an untouched copy of the starting commit, so not caused by 06-01. Owned by the later family plans that repoint these tests at Lendshed.
  status: open

- `test/rendering/ascii-graph.test.ts` still asserts absolute millisecond budgets (seen failing as "expected 274 to be less than 250" and "expected 338 to be less than 250" in a full parallel run, then passing alone). Found during plan 06-02 while running the whole unit suite; not touched because the file is not in this plan. Owned by the family plan that converts the figure and diagram timing tests to `measureGrowth`.
  status: open

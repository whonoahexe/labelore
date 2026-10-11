# Deferred items — quick 261006-iz7

Out-of-scope discoveries, not fixed here.

1. `test/token-guard.test.ts` ("has zero violations outside the token blocks") fails on the base commit
   abb201c, before any change in this item: `src/web/styles/globals.css` line 10264,
   `.view-ui-review-found-card .view-ui-review-item-text code { font-size: 0.88em }` (quick-261003-528).
   The `.quick-261006-iz7` block adds no violation (the guard reports only that one line with this item applied).
2. Timing-bound tests (`test/security-register.test.ts`, `test/ui-spec-contract.test.ts`,
   `test/rendering/ascii-graph.test.ts`, each "within 250 ms") fail intermittently under the full parallel
   `npm test` load and pass when run alone. Not touched here; this item's own 250 ms test passed in every full run.

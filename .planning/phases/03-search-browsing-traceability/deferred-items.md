# Deferred Items — Phase 03 (search-browsing-traceability)

Out-of-scope issues discovered during plan execution, logged rather than fixed per the
scope-boundary deviation rule.

## 03-01

- **Pre-existing lint failure, unrelated to this plan's files.** `npm run lint` reports two
  `no-regex-spaces` errors in `test/web/visual-contract.test.ts` (lines 438-439, regex literals
  matching a two-space CSS indent: `/:root \{\n  --table-zebra:/` and
  `/\.dark \{\n  --table-zebra:/`). Confirmed pre-existing via `git diff HEAD -- test/web/visual-contract.test.ts`
  (empty) — this file was not touched by 03-01 and the failure predates this plan's work (last
  commit touching it: `45da9aa`, from the prior quick task). Left unfixed per the scope-boundary
  rule; `npm run lint` scoped to this plan's own files (`src/server/search-index.ts`,
  `src/web/components/search-field.tsx`, `src/web/pages/search-page.tsx`, `src/presentation/routes.ts`,
  `src/server/index.ts`, `src/web/app-router.tsx`, `src/web/components/app-shell.tsx`,
  `eslint.config.js`) reports zero errors. Auto-fixable with `eslint --fix` when picked up.

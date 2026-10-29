## Deferred Items

- Phase 08 planning documents are not pinned by the corpus guards (found during 08-01, not caused by it)
  status: open
  **What:** three tests fail on the base commit and after 08-01, because the guards walk Labelore's own
  `.planning/` and now meet the two Phase 8 files they have no pinned entry for:
  `test/web/pattern-map-corpus.test.ts` (LB:phases/08-several-projects-and-a-switcher/08-PATTERNS.md) and
  `test/web/ui-spec-corpus.test.ts` (LB:phases/08-several-projects-and-a-switcher/08-UI-SPEC.md, plus the
  "pins every file it walks" check). 08-01 touches no planning document and no guard, so it is out of scope.
  **Fix:** add the two pinned entries (counts recounted by grep or awk, as the earlier Phase 6 plans did) in
  the plan that owns test health for this phase, or exclude the in-flight phase from the walk.

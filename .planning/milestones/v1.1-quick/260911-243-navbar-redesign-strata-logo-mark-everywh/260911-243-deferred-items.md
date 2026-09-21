# Deferred Items — quick-260911-243

Out-of-scope discoveries found during execution, not fixed (scope boundary: only auto-fix issues
directly caused by this task's own changes).

## test/rendering/markdown.test.ts fixture path (pre-existing, unrelated)

- **Found during:** Task 2 full-suite run (`npm test`)
- **Test:** `safe Markdown rendering > renders the real Phase 1 plan as ordered semantic sections with nested Markdown`
- **Issue:** `ENOENT: no such file or directory, open '.planning/phases/01-read-layer-domain-model/01-04-PLAN.md'`
- **Root cause:** commit `1857c97` ("chore: archive v1.0 milestone files") moved this fixture to
  `.planning/milestones/v1.0-phases/01-read-layer-domain-model/01-04-PLAN.md` at milestone close,
  but the test still hardcodes the pre-archive path. Predates this plan; no file this plan touches
  is involved.
- **Not fixed:** out of scope for quick-260911-243 (navbar redesign). Left for a future task that
  owns the milestone-archive fixture references.

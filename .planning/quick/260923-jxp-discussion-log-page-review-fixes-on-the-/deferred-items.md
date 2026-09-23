# Deferred items — quick-260923-jxp

Out-of-scope discoveries found during execution, not fixed (Scope Boundary rule).

## Pre-existing failure: test/web/visual-contract.test.ts

`flattens the document canvas — no enclosing border, background fill, or shadow` expects
`.document-canvas { ... max-width: 70rem; ... }`, but `globals.css`'s `.document-canvas` rule
(line ~3714) carries only `min-width: 0;` — no `max-width: 70rem` anywhere in the stylesheet.

Confirmed pre-existing via `git stash` against the worktree's base commit
(`082a834 style(document-layout): let the document canvas span full width without its own
padding`) — present before this quick task touched any file, unrelated to the discussion-log
review fixes. Not touched here.

**Resolved by quick-260923-lju** (2026-09-23): updated the test's assertion to negative form —
`.document-canvas` declares no `max-width` and no `padding`, matching commit 082a834's intentional
full-width contract, instead of asserting the stale `max-width: 70rem` expectation.

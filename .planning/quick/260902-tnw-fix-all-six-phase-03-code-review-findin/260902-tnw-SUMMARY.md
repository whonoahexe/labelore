---
quick_id: 260902-tnw
status: complete
description: Fix all six phase-03 code review findings from 03-REVIEW.md
source: .planning/phases/03-search-browsing-traceability/03-REVIEW.md
completed: 2026-09-02
tasks: 3
commits: 5
findings_closed: [CR-01, WR-01, WR-02, WR-03, WR-04, IN-01]
key-files:
  modified:
    - src/planning-repo/assemble.ts
    - src/presentation/tree.ts
    - src/web/components/tree-navigator.tsx
    - src/web/pages/search-page.tsx
    - package.json
    - package-lock.json
    - test/assemble.test.ts
    - test/presentation/tree.test.ts
    - test/web/shell-contract.test.ts
---

# Quick Task Summary: phase-03 code review findings

All six findings in `03-REVIEW.md` are closed. Five commits, three RED→GREEN task groups.

## Finding-to-commit trace

| ID | Severity | Closed by | Note |
|----|----------|-----------|------|
| CR-01 | Critical | `47ec1d7` (RED), `3f9c5ea` | Confirmed as a real startup crash before fixing |
| WR-04 | Warning | `3f9c5ea` | Hardened, but **not reachable** — see below |
| WR-01 | Warning | `cf456e6` (RED), `965649f` | Confirmed by test |
| IN-01 | Info | `cf456e6` (RED), `965649f` | Confirmed by contract test |
| WR-02 | Warning | `2cfc6e4` | Phantom dependency, now declared |
| WR-03 | Warning | `2cfc6e4` | React key leak |

## What was verified rather than assumed

**CR-01 is real, and the review understated nothing.** Traced the full chain before touching code:
`assemble.ts:181` (`?? null` coalesces only `undefined`) → `:228` (`version: activeMilestoneVersion`)
→ `project-presentation.ts:448` (`milestoneKeyOf(milestone.version)`) → `routes.ts:93-95`
(`''` is not `null`, so `assertNonEmpty` throws). That call sits inside `toProjectPresentation`,
invoked synchronously at `server/index.ts:42` during `createApp` — so the throw aborts
`startServer()` outright rather than degrading one artifact. Fixed at the assembly boundary with
`normalizeOptionalText`, which collapses absent / empty / whitespace-only to `null`. Deliberately
did **not** loosen `assertNonEmpty`: refusing to encode an empty path segment is a real invariant
and should stay one.

**WR-04 is not a live bug.** The review asserted the STATE.md table parser could emit a non-string
cell, making `v.includes(id)` throw. It cannot: `parseMarkdownTable`
(`handlers/markdown-sections.ts:61`) does `row[h] = cells[i] ?? ''`, so every cell is a string and
short rows are padded. The `typeof v === 'string'` guard was still applied — the `as
Record<string, string>[]` cast genuinely asserts a shape this code does not own — but it is
defense-in-depth, not a crash fix. The first draft of the test for this finding passed on the
unfixed code; it was replaced with one that asserts what is actually reachable (a short table row
still assembles and still cross-links its quick task) rather than one that proves nothing.

**IN-01's fix does not regress the open-once contract.** `node.nodeType` is constant for a given
node, so the declarative `open` value never changes across re-renders and React never re-writes the
attribute. A user's manual close is still never fought — the property the effect's `openedRef`
guard exists to protect.

## Deviations

None. All six findings were addressed as scoped.

## Verification

- `npm run build` — exit 0
- `npm run typecheck` — clean
- `npx vitest run` — **30 files / 475 tests** (up from 470; 5 new)
- `npm run lint` — clean except the pre-existing `no-regex-spaces` pair in
  `test/web/visual-contract.test.ts`, out of scope and already logged in `deferred-items.md`

## Notes for later

- WR-02 also named `hast`, `mdast`, and `vfile` as undeclared type-only imports. Not adopted: they
  are `import type` only, erased at build, and carry no runtime resolution risk. Worth a sweep if
  the project ever moves to a stricter package manager.
- CR-01's class of defect — a legal-but-empty frontmatter scalar reaching a key derivation that
  asserts non-empty — is exactly Phase 4's TGT-03/TGT-04 territory. This fix closes the one
  instance found; the adversarial sweep for others still belongs to that phase.

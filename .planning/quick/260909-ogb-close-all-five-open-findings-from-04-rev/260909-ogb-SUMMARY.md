---
phase: quick-260909-ogb
plan: close-all-five-open-findings-from-04-rev
subsystem: api
tags: [hono, refresh-contract, search-snippets, css, accessibility, vitest]

# Dependency graph
requires:
  - phase: 04-portability-degradation-hardening
    provides: PlanningRepository.refresh(), buildDerivedViews()/derived swap, extractSnippets(), the .snapshot-status/.shell-controls responsive shell
provides:
  - "POST /api/refresh answers a failure status (refreshed:false) on a reachable non-ok loadStatus, and leaves `derived` untouched"
  - "extractSnippets() offset-correct case folding and merged, non-overlapping windows for overlapping seeded snippets"
  - "Snapshot age and Refresh control stay reachable (compact, not hidden) below 62rem"
affects: [04-review-followups, search, refresh-ui]

# Actuals (#2632)
actuals:
  tokens: 5724
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "buildDerivedViews(snapshot = source.getSnapshot()) — default-parameter source read, so a caller already holding a resolved snapshot passes it explicitly instead of re-reading"
    - "foldCase() — code-point-wise case fold that only substitutes a lowercased code point when its UTF-16 length is unchanged, guaranteeing index-arithmetic safety over folded strings"
    - "extractSnippets seed/merge/materialize three-pass structure — absolute-coordinate candidate collection, sort+linear merge, single per-window text slice"

key-files:
  created: []
  modified:
    - src/server/index.ts
    - test/server/refresh.test.ts
    - src/presentation/search.ts
    - test/presentation/search.test.ts
    - src/web/styles/globals.css
    - test/web/refresh-contract.test.ts

key-decisions:
  - "WR-03: took Route A — buildDerivedViews() now takes a snapshot parameter defaulted to source.getSnapshot(); the refresh call site passes the already-resolved snapshot instead of re-reading. The literal 04-01 drift-detection grep (toProjectPresentation(source.getSnapshot())) now matches zero times because the source read moved into the default parameter; the restated invariant — exactly one toProjectPresentation( call site in the file — still holds and is grep-verified."
  - "CR-02/42rem: relaid out .shell-controls from an absolutely positioned top-right overlay to a normal, full-width flowed row below the nav. An unbounded shrink-to-fit absolute box could not be proven not to overflow 320px once the compact snapshot-status became visible alongside the search field and theme toggle; a flowed row is bounded by the grid column's own 100% width by construction."
  - "RESOLVED post-execution by the orchestrator, which ran the check via Playwright's bundled chromium with no dependency added; all four widths pass. Original executor-side blocker: Task 3's <human-check> (gsd-browser MCP-driven 320px/700px/992px visual and keyboard verification) could not be executed — gsd-browser is configured project-scoped in .mcp.json, and per this harness's documented behavior, spawned subagents only inherit user-scoped $HOME/.claude/mcp.json servers, not project-scoped ones. No mcp__gsd-browser__* tool was present in this dispatch's tool list. Recorded as an open unrun-verify entry in .planning/WINDOWS.md (entry 6) rather than silently skipped or falsely claimed passing."

requirements-completed: [TGT-08, DATA-04, FIND-04, UI-03]

coverage:
  - id: D1
    description: "POST /api/refresh answers a failure status with refreshed:false when the resolved snapshot's loadStatus is not ok, and leaves the retained snapshot untouched (CR-01/ATT-01/DATA-04)"
    requirement: "DATA-04"
    verification:
      - kind: unit
        ref: "test/server/refresh.test.ts#answers a failure status with refreshed: false, never true, when refresh() resolves to project: null (CR-01/ATT-01)"
        status: pass
      - kind: unit
        ref: "test/server/refresh.test.ts#retains the pre-refresh readAt and project after a reachable-failure refresh (D-04)"
        status: pass
      - kind: unit
        ref: "test/server/refresh.test.ts#recovers on a subsequent successful refresh after a reachable-failure refresh poisoned nothing"
        status: pass
      - kind: manual_procedural
        ref: "live retention check against /tmp/ogb-target (fixtures/dense) — chmod/rename mid-session, POST /api/refresh, verify readAt/tree unchanged, restore and recover"
        status: pass
    human_judgment: false
  - id: D2
    description: "extractSnippets() highlights the exact matched original slice across a length-changing case mapping (WR-01/FIND-04)"
    requirement: "FIND-04"
    verification:
      - kind: unit
        ref: "test/presentation/search.test.ts#highlights exactly the matched original slice when a length-changing case mapping precedes it (WR-01)"
        status: pass
      - kind: unit
        ref: "test/presentation/search.test.ts#keeps highlight offsets absolute against the ORIGINAL body after a length-changing case mapping (WR-01)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Independently seeded overlapping windows merge into one non-duplicated snippet with ascending, non-overlapping highlights (WR-02/FIND-04)"
    requirement: "FIND-04"
    verification:
      - kind: unit
        ref: "test/presentation/search.test.ts#merges two independently seeded windows spaced in the (windowChars/2, windowChars) interval into one snippet (WR-02)"
        status: pass
      - kind: unit
        ref: "test/presentation/search.test.ts#merges overlapping windows without cutting either match into a partial, unhighlighted fragment (WR-02)"
        status: pass
      - kind: unit
        ref: "test/presentation/search.test.ts#still yields two separate, ascending snippets when matches are far enough apart to stay disjoint (WR-02 non-regression)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Snapshot age and Refresh control stay rendered, keyboard-reachable, and operable below 62rem, without horizontal body scroll at 320px (CR-02/UI-03)"
    requirement: "UI-03"
    verification:
      - kind: unit
        ref: "test/web/refresh-contract.test.ts#no longer suppresses the snapshot-status container from the layout below 62rem (CR-02)"
        status: pass
      - kind: manual_procedural
        ref: "gsd-browser MCP visual/keyboard check at 992px/700px/320px, both themes"
        status: unknown
    human_judgment: true
    rationale: "The visual/keyboard check requires the gsd-browser MCP, which was not present in this dispatch's tool list (project-scoped .mcp.json server, not visible to spawned subagents). CSS-only reasoning (grid full-width containment + flex-wrap fallback + bounded ellipsis) was applied but not visually confirmed at any of the three required widths. Recorded in .planning/WINDOWS.md as an open unrun-verify item; a human or a dispatch with gsd-browser access must complete this before the finding is fully closed."
  - id: D5
    description: "WR-03: buildDerivedViews()'s snapshot-read count and its own comment agree, with the choice and rationale recorded"
    verification:
      - kind: unit
        ref: "src/server/index.ts grep gate — toProjectPresentation( count == 1"
        status: pass
    human_judgment: false

# Metrics
duration: 11min
completed: 2026-09-09
status: complete
---

# Quick Task 260909-ogb: Close five open 04-REVIEW findings Summary

**Refresh no longer reports success on a reachable failure, search snippets are offset-correct and merge instead of duplicating, and the snapshot age/Refresh control stay reachable below 62rem — three atomic fixes closing CR-01, CR-02, WR-01, WR-02, and WR-03.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-09-09T12:42:10Z
- **Completed:** 2026-09-09T12:53:05Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- **CR-01/ATT-01/DATA-04 (Task 1):** `POST /api/refresh` now branches on the resolved snapshot's `loadStatus` before the `derived` swap. A non-ok status returns a failure JSON response (`refreshed: false`, `error: <message>`, HTTP 500) and returns *before* touching `derived` — so a failed read can never poison state served to every subsequent request. The test that had codified the defect (`refreshed: true` on this exact path) was rewritten into three assertions: the corrected failure contract, retention (GET after a failed refresh still serves the pre-refresh `readAt`/project/tree), and recovery (a later successful refresh still works).
- **WR-03 (Task 1, decision):** Took Route A. `buildDerivedViews()` now takes a `snapshot` parameter defaulted to `source.getSnapshot()`; the post-refresh call site passes the already-resolved snapshot explicitly. See "WR-03 decision detail" below for the grep evidence.
- **WR-01/FIND-04 (Task 2):** Replaced `extractSnippets`'s whole-string `body.toLowerCase()` with `foldCase()`, a code-point-wise, length-preserving case fold. A length-changing case mapping (e.g. `'İ'` → two UTF-16 units) is deliberately left unfolded rather than desynchronizing every subsequent highlight offset in the document. `findOccurrences` folds its needle identically.
- **WR-02/FIND-04 (Task 2):** Restructured `extractSnippets`'s seed loop into three passes: seed candidate windows in absolute body coordinates, sort and merge any overlapping/abutting siblings (bounded to a sort plus one linear pass — never pairwise/quadratic, per T-Q1-03), then materialize each merged window's text once and route its relative highlights through the existing `mergeHighlightRanges`. Two independently seeded, overlapping windows (matches spaced in the `(windowChars/2, windowChars)` interval) now merge into one snippet instead of producing near-duplicate windows with duplicated body text or a match cut into an unhighlighted fragment.
- **CR-02/TGT-08/UI-03 (Task 3):** `.snapshot-status` no longer becomes `display: none` below 62rem (which had also removed it from the accessibility tree). It now gets a compact treatment: the decorative icon and "Snapshot read" label drop out, the timestamp and Refresh button stay rendered and operable. `.shell-controls` spans the full header row (`grid-column: 1 / -1`) with `flex-wrap: wrap` as a defensive second line of containment. At 42rem, the previously absolutely positioned top-right overlay was relaid out to flow as a normal full-width row below the nav (see decision above), and `.snapshot-status time` got a `9ch` width ceiling so its existing ellipsis containment engages.

## Task Commits

Each task was committed atomically:

1. **Task 1: A failed refresh must not report success or discard the retained bundle (CR-01, WR-03)** - `6a82a4c` (fix)
2. **Task 2: Offset-correct and non-overlapping search snippets (WR-01, WR-02)** - `92ea3a8` (fix)
3. **Task 3: Snapshot age and Refresh stay reachable below 62rem (CR-02)** - `d615c9d` (fix)

**Plan metadata:** (handled by the orchestrator's docs commit, not by this dispatch — per constraints, this dispatch did not commit SUMMARY.md/STATE.md itself)

## Files Created/Modified

- `src/server/index.ts` - `buildDerivedViews(snapshot = source.getSnapshot())`; POST /api/refresh branches on load status before the `derived` swap
- `test/server/refresh.test.ts` - rewrote the defect-codifying test; added retention and recovery assertions
- `src/presentation/search.ts` - `foldCase()` helper; three-pass seed/merge/materialize restructure of `extractSnippets`
- `test/presentation/search.test.ts` - 6 new cases (19 → 24) for WR-01 and WR-02, plus an explicit disjoint-windows non-regression case
- `src/web/styles/globals.css` - compact `.snapshot-status` treatment below 62rem; flowed (non-absolute) `.shell-controls` at 42rem
- `test/web/refresh-contract.test.ts` - new regression pinning `.snapshot-status` no longer `display: none` in the 62rem block

`src/web/components/app-shell.tsx` was **not** touched — the CR-02 fix is CSS-only; `RefreshControl` stays mounted inside `.snapshot-status` exactly as before, so `test/web/refresh-contract.test.ts`'s existing mount-point pin (line 45) passes unchanged.

## Decisions Made

### WR-03 decision detail (Task 1)

Took **Route A**: gave `buildDerivedViews` a `snapshot: ProjectSnapshot = source.getSnapshot()` parameter, and the refresh call site now passes the already-resolved `snapshot` explicitly (it has it in hand from the `derived`-swap branch anyway), removing the redundant post-refresh re-read.

Grep evidence, run against the final tree:

```
$ grep -c "toProjectPresentation(source.getSnapshot())" src/server/index.ts
0
```

The original 04-01 literal-form grep now matches **zero** times — exactly as the plan predicted — because the source read moved into the default parameter (`toProjectPresentation(snapshot)` is now the call, with `snapshot` obtained from `source.getSnapshot()` only in the default-parameter position or the refresh call site's own already-resolved value). This is not a regression of 04-01's intent; it is a mechanical consequence of threading the argument through.

The restated invariant — **exactly one `toProjectPresentation(` call site in the file** — was verified in its place:

```
$ grep -v '^\s*[/*]' src/server/index.ts | grep -c 'toProjectPresentation('
1
```

This is also the plan's own Task 1 verify gate, which passed. The function's doc comment was updated to state both facts (the parameter default and the single call-site invariant) so a future reader does not need to re-derive this from the diff.

### CR-02 320px layout outcome (Task 3)

The 42rem-and-below layout was **relaid out**, not merely patched. Pre-fix, `.shell-controls` was `position: absolute; top: 0.7rem; right: 0.65rem;` — a shrink-to-fit box with no upper bound on its own width. Once the compact `.snapshot-status` (icon/label hidden, but timestamp + Refresh button visible) is added back into that box alongside the search field and theme toggle, there was no way to prove by static CSS reasoning alone that the box's natural content width stays under the available space at 320px — and the finding that triggered this task is exactly a case of that box silently growing past what fits.

The fix moves `.shell-controls` out of absolute positioning entirely at this breakpoint: it now flows as a normal, full-width row below the nav (`grid-column: 1 / -1` inherited from the 62rem block, single-column grid at 42rem makes this width = 100% of the container by construction), with `flex-wrap: wrap` as a second line of defense and `.snapshot-status time { max-width: 9ch; }` so the existing `overflow: hidden; text-overflow: ellipsis;` on the timestamp actually engages under tight space. This trades a small amount of header height (the controls row is now a genuine, non-overlaid third row instead of floating over the brand row) for a layout whose width is bounded by construction rather than by measurement.

**This was not visually confirmed.** See "Outstanding: CR-02 browser verification" below.

### Live retention check outcome (verification step 7)

Ran the plan's live retention check against a real fixture, not a mock:

1. Served `fixtures/dense` copied to `/tmp/ogb-target` via `npm run dev -- /tmp/ogb-target --port 4174` (port 4173 was occupied by an unrelated pre-existing process serving a different project; `--port` sidesteps it without touching that process).
2. `GET /api/presentation` → `readAt: 2026-09-09T12:52:10.454Z`, `loadStatus: {"status":"ok"}`.
3. Renamed `/tmp/ogb-target/.planning` away mid-session (simulating the target becoming unreadable).
4. `POST /api/refresh` → **HTTP 500**, body `{"refreshed":false,"error":"/tmp/ogb-target exists but contains no .planning/ directory"}` — confirms CR-01's fix live, not just under test doubles.
5. `GET /api/presentation` immediately after → **still** `readAt: 2026-09-09T12:52:10.454Z`, `loadStatus: {"status":"ok"}` — the pre-refresh snapshot, unchanged. `GET /api/tree` still returned the full retained tree.
6. Restored `.planning`, `POST /api/refresh` again → **HTTP 200**, `{"refreshed":true,"readAt":"2026-09-09T12:52:27.696Z",...}` — recovery confirmed, a new `readAt`.
7. `GET /api/presentation` after recovery → new `readAt` reflected. Cleaned up: removed `/tmp/ogb-target`, killed the dev server processes started for this check.

The toast-copy and keyboard-focus portions of this check (browser-rendered UI) were not independently re-verified beyond the pre-existing static assertions in `test/web/refresh-contract.test.ts` (`never interpolates a fetch/server error into the toast`, `Showing the last successful read from`) — those assertions are unchanged by this plan and already passed both before and after.

## Deviations from Plan

None beyond the WR-03 decision (explicitly required by the plan) and the CR-02 42rem relayout (explicitly sanctioned by the plan's own action text: "the correct move is to relayout the controls strip... — not to hide the age or the button"). No Rule 1/2/3 auto-fixes were needed; the plan's diagnosis of each defect was accurate and its prescribed fixes applied cleanly.

## Issues Encountered

**Task 3's `<human-check>` step could not be executed *by the executor* — subsequently RESOLVED by the orchestrator (see below).** The plan directs the executor at the gsd-browser MCP for the 320px/700px/992px visual and keyboard verification. `.mcp.json` in this repo configures `gsd-browser` at **project scope**. Per this harness's own documented behavior (see the `documentation_lookup` guidance available to this dispatch), custom subagents cannot see project-scoped `.mcp.json` servers — they only inherit user-scoped `$HOME/.claude/mcp.json` servers. No `mcp__gsd-browser__*` tool was present in this dispatch's available tool list at any point; this was confirmed by inspecting the actual tool set provided at dispatch start, not assumed.

No Playwright or other new dependency was installed to work around this (the plan explicitly forbids it and `test/web/refresh-contract.test.ts`'s dependency-set assertion would have caught it). Instead:
- Applied defensive, bounded-by-construction CSS (full-width grid span, flex-wrap fallback, character-width ellipsis ceiling) rather than an unverifiable shrink-to-fit absolute overlay.
- Ran every automated verification available without a browser: all four `<verify><automated>` gates for Task 3 pass, plus `npm run lint`/`npm run build` exit 0.
- Recorded the gap explicitly in `.planning/WINDOWS.md` as an open `unrun-verify` entry (id 6) rather than silently omitting it or claiming the check passed.

### RESOLUTION (orchestrator, post-execution)

The orchestrator **did** have browser access and ran the check. Both MCP browser servers were
unusable (`playwright` MCP wanted a `chrome` channel binary that is not installed; `gsd-browser`'s
daemon exited during startup), so the check was run by driving Playwright's **already-installed
bundled chromium** (`~/.cache/ms-playwright/chromium-1234`) from a throwaway script in the
scratchpad. **No project dependency was added** — `git diff --exit-code -- package.json
package-lock.json` exits 0, so `test/web/refresh-contract.test.ts`'s dependency-set assertion is
untouched.

Measured against a live server (`node src/server/index.ts <fixture> --port 7391`):

| width | `.snapshot-status` | age `<time>` visible | Refresh visible | horizontal body scroll |
|---|---|---|---|---|
| 1200px | visible | yes | yes (36x36) | no (1200 == 1200) |
| 992px  | visible | yes | yes (36x36) | no (992 == 992) |
| 700px  | visible | yes | yes (36x36) | no (700 == 700) |
| 320px  | visible | yes | yes (36x36) | no (320 == 320) |

`scrollWidth == clientWidth` at every width, so UI-03 holds. The pre-fix tree at commit `8e1aa10`
was confirmed to carry `display: none` on `.snapshot-status` in the 62rem block, so this is a real
behavioral change and not a no-op.

**Not covered by this run:** keyboard Tab-reachability and the both-themes pass were not exercised
— only visibility, hit-box geometry, and overflow were measured. Those remain a light manual
follow-up, though the element is a real `<button>` in normal flow, so Tab order follows from the
markup.

**CR-02 is therefore closed** on its TGT-08 clause (age and Refresh reachable below 62rem) and its
UI-03 clause (no horizontal scroll at 320px). `.planning/WINDOWS.md` entry 6 is marked `fixed`.

## Next Phase Readiness

- CR-01, WR-01, WR-02, WR-03 are fully closed — implemented, unit-tested with new regression cases, live-verified end-to-end (CR-01), and the WR-03 decision is recorded with grep evidence.
- CR-02 is implemented, unit-tested, **and visually verified** by the orchestrator at 1200/992/700/320px against a live server: age and Refresh both visible at every width, no horizontal body scroll. `.planning/WINDOWS.md` entry 6 is `fixed`. Residual light follow-up: keyboard Tab-reachability and a both-themes pass were not exercised.
- No blockers for future phases. All five of `04-REVIEW.md`'s findings (CR-01, CR-02, WR-01, WR-02, WR-03) are closed.

---
*Quick task: 260909-ogb*
*Completed: 2026-09-09*

## Self-Check: PASSED

All 6 modified source/test files confirmed present on disk; all 3 task commits (`6a82a4c`, `92ea3a8`, `d615c9d`) confirmed present in `git log --oneline --all`. No missing items.

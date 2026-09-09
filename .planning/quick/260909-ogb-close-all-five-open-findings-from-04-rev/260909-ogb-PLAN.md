---
quick_id: 260909-ogb
type: quick
description: Close all five open findings from 04-REVIEW.md (CR-01, CR-02, WR-01, WR-02, WR-03)
source: .planning/phases/04-portability-degradation-hardening/04-REVIEW.md
audit_gaps: [ATT-01, ATT-02, FIND-04, FLOW-G]
tasks: 3
autonomous: false
requirements: [TGT-08, DATA-04, FIND-04, UI-03]
files_modified:
  - src/server/index.ts
  - src/presentation/search.ts
  - src/web/styles/globals.css
  - src/web/components/app-shell.tsx
  - test/server/refresh.test.ts
  - test/presentation/search.test.ts
  - test/web/refresh-contract.test.ts

estimate:
  tokens: 90000
  raw_tokens: 45000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "A POST /api/refresh whose resolved snapshot carries a non-ok loadStatus answers a failure status with refreshed:false, and every later GET still serves the pre-refresh readAt and data (CR-01, ATT-01, TGT-08, DATA-04)."
    - "The reachable failure path — refresh() resolving to a project:null snapshot — is the path the refresh test suite asserts retention on, not the unreachable rejecting path (ATT-01)."
    - "At and below 62rem, including 320px, both the snapshot age and the Refresh control are rendered, focusable, and operable, and the page body still does not scroll horizontally (CR-02, FLOW-G, TGT-08, UI-03)."
    - "A body containing a length-changing case mapping before a match highlights exactly the matched original slice (WR-01, FIND-04)."
    - "Two matches spaced in the (windowChars/2, windowChars) interval produce one merged snippet whose body text is not duplicated and whose highlight ranges are ascending and non-overlapping (WR-02, FIND-04)."
    - "buildDerivedViews()'s snapshot-read count and its own comment agree, and the choice made is recorded with its rationale (WR-03)."
  artifacts:
    - src/server/index.ts
    - src/presentation/search.ts
    - src/web/styles/globals.css
    - test/server/refresh.test.ts
    - test/presentation/search.test.ts
    - test/web/refresh-contract.test.ts
    - .planning/quick/260909-ogb-close-all-five-open-findings-from-04-rev/260909-ogb-SUMMARY.md
  key_links:
    - "POST /api/refresh failure branch -> the `derived` binding it must NOT reassign (the retention seam)."
    - "extractSnippets() merged-window highlight ranges -> highlightedSnippetNodes() in search-page.tsx, which walks ranges with a single forward cursor and requires them ascending and non-overlapping."
    - "The narrow-width `.snapshot-status` rule -> RefreshControl's mount point inside it, which test/web/refresh-contract.test.ts pins by source text."
---

<objective>
Close all five findings in `04-REVIEW.md`, filed 2026-09-07 and never acted on. All five were
re-confirmed present in the working tree at planning time (see per-task Observed sections — several
line numbers have drifted from the review text; the observed numbers are authoritative).

Purpose: `04-REVIEW.md` is the only phase review in this project that was filed and then left
(ATT-02). Two of its findings are release blockers: a failed refresh currently reports success and
destroys the retained snapshot server-wide (CR-01/ATT-01), and TGT-08's Refresh action does not
exist at all below 62rem (CR-02/FLOW-G).

Output: three atomic commits, one per seam, each independently revertable.

Not a tracer-first phase build — these are three independent defect fixes on three disjoint file
sets, ordered by severity. There is no thin end-to-end slice to lead with.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/04-portability-degradation-hardening/04-REVIEW.md
@.planning/v1.0-MILESTONE-AUDIT.md
@.claude/CLAUDE.md

@src/server/index.ts
@src/presentation/search.ts
@src/web/components/app-shell.tsx
@test/server/refresh.test.ts
</context>

<baseline>
Measured at planning time on a clean tree (commit `0ba8425`):

- `npm test` -> **39 files passed, 547 tests passed, 0 failed.**
- `npm run typecheck`, `npm run lint`, `npm run build` all exit 0.

Every task below must leave all four green. The test count must end **strictly above 547** — Tasks 2
and 3 each add regression cases. A count at or below 547 is a failure, not a pass.
</baseline>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: A failed refresh must not report success or discard the retained bundle (CR-01, WR-03)</name>

  <files>src/server/index.ts, test/server/refresh.test.ts</files>

  <read_first>
src/server/index.ts lines 55-75 (the buildDerivedViews closure and the `derived`/`inFlight`
bindings) and lines 202-245 (the POST /api/refresh handler). test/server/refresh.test.ts lines 1-80
(makeSnapshot, FAILED_SNAPSHOT, makeSpySource) and lines 154-197 (the three refresh-outcome tests).
src/planning-repo/snapshot.ts lines 57-71 (refresh()'s failed-target branch).
src/planning-repo/types.ts lines 5-14 (the LoadStatus union).
  </read_first>

  <observed>
Verified live at planning time, not taken from the review's line numbers:

- `src/server/index.ts:232` `const snapshot = await inFlight;`
- `src/server/index.ts:235` `derived = buildDerivedViews();` — unconditional.
- `src/server/index.ts:237` `refreshed: true as const` — returned regardless of `snapshot.loadStatus`.
- `src/planning-repo/snapshot.ts:61-70` — on a non-ok target check, `refresh()` **overwrites
  `this.snapshot`** with a `project: null` snapshot and **resolves normally**. Per D-12 it never
  throws, so `index.ts`'s `catch` at 241-244 is unreachable in production.
- `buildDerivedViews` is referenced at exactly three places: its definition (line 60), the startup
  call (line 74), and the refresh call (line 235). `source.getSnapshot()` is called only inside
  buildDerivedViews (lines 61, 62, 68). No GET handler reads the source directly — every one reads
  `derived`. **This is why leaving `derived` untouched is a complete retention fix.**
- All three non-`ok` `LoadStatus` variants carry `message`, so `snapshot.loadStatus.message` is
  well-typed after a `status !== 'ok'` narrow.
  </observed>

  <behavior>
Write these as assertions in `test/server/refresh.test.ts` before changing `src/server/index.ts`.

  - Reachable-failure path (this REPLACES the existing test at line 166, see below): given a spy
    source seeded with a good snapshot, `queueNext(FAILED_SNAPSHOT)`, then POST /api/refresh ->
    response status is a failure (>= 400), body is `{ refreshed: false, error: <the failed
    loadStatus message> }`.
  - Retention on the reachable path: immediately after that POST, GET /api/presentation returns the
    **pre-refresh** `readAt` (`'2026-09-01T00:00:00.000Z'`), not `FAILED_SNAPSHOT.readAt`, and its
    payload still describes the pre-refresh project rather than an empty one.
  - Recovery: after a failed refresh, a subsequent `queueNext(<a good snapshot with a new readAt>)`
    + POST /api/refresh returns `refreshed: true` and GET /api/presentation then reports the NEW
    readAt — proving the failure branch poisoned nothing.
  - Unchanged, must still pass: the no-`refresh`-member source still answers **200** with
    `refreshed: false` (the TGT-08 empty edge, test at line 154) — only the failed-loadStatus path
    gains a failure status. And the rejecting-`refresh()` test (line 179) still passes unchanged.
  </behavior>

  <action>
**REQUIRED AND EXPECTED: rewrite the existing test at `test/server/refresh.test.ts:166`**, titled
"carries a failed loadStatus verbatim, never a 5xx, when refresh() resolves to project: null". That
test asserts `expect(body.refreshed).toBe(true)` on precisely the path being fixed — it codified the
defect as intended behavior and is the bug's fingerprint. Rewriting it is the point of this task.
Do NOT preserve it, do NOT keep a variant of its current assertion, and above all do NOT "restore
green" by reverting the source change. Retitle it to describe the corrected contract and re-point it
at the assertions in the behavior block above. If this task ends with that test unchanged, the task
has failed.

Note for context, not for action: the neighbouring test at line 179 already proves retention, but
only for a *rejecting* `refresh()` — a path `PlanningRepository` can never take. That is exactly why
the defect survived phase 04's verification. The reachable path was the untested one.

Then fix the handler. Before the derived swap, branch on the resolved snapshot's load status: when
it is not ok, return a failure JSON response carrying `refreshed: false` and the failed status's own
message, and return **without touching `derived`**. Only on an ok status may the derived swap and
the success response run. Use the same failure HTTP status the existing rejecting-refresh branch
already uses (500), so `RefreshControl.onError` fires its D-04 retention toast through the path it
already has — `postRefresh` throws on any non-ok response.

Update the comment block above the failed branch to state the D-04 invariant it now enforces, and
correct the comment above the swap so it no longer implies every resolved refresh is a success.

**WR-03 — this is a DECISION, not a defect. Choose one route, then state which and why in the
SUMMARY.** `buildDerivedViews()` reads `source.getSnapshot()` three times (lines 61, 62, 68) while
its own comment claims one read. STATE.md records the zero-arg closure as a deliberate 04-01 choice
that "keeps exactly one toProjectPresentation(source.getSnapshot()) call site, satisfying the plan's
own drift-detection grep."

  - Route A — capture once via a defaulted parameter. Give buildDerivedViews a snapshot parameter
    defaulted to the source read, and pass the already-resolved `snapshot` at the refresh call site
    (which the CR-01 fix puts in hand anyway, removing the post-refresh re-read entirely). If you
    take this route you MUST re-run the drift-detection grep 04-01 relied on and record its outcome
    honestly: the original literal form counts zero matches once the argument is threaded, because
    the source read moves into the default. Restate the successor invariant that actually preserves
    04-01's intent — that the file holds exactly one `toProjectPresentation(` call site — verify it,
    and record both the original grep's new result and the restated one in the SUMMARY. Do not
    silently drop the original invariant.
  - Route B — leave the three reads and record an explicit accepted-risk note in the SUMMARY,
    naming the condition under which it would become a real bug (a `SnapshotSource` implementation
    whose getter is not referentially stable within one synchronous call).

Either route is acceptable. Choosing without stating the rationale is not. If you take Route A,
also fix the comment above the function so its claim and its behavior agree.
  </action>

  <verify>
    <automated>npm test -- --run test/server/refresh.test.ts test/server/derived-snapshot-isolation.test.ts test/portability.test.ts test/web/refresh-contract.test.ts</automated>
    <automated>npm run typecheck</automated>
    <automated>test "$(grep -v '^\s*[/*]' src/server/index.ts | grep -c 'refreshed: true')" = 1</automated>
    <automated>test "$(grep -v '^\s*[/*]' src/server/index.ts | grep -c 'toProjectPresentation(')" = 1</automated>
  </verify>

  <done>
POST /api/refresh answers 500 with `refreshed: false` plus the failed status's message whenever the
resolved snapshot's load status is not ok; `derived` is left untouched on that branch and a
following GET /api/presentation still reports the pre-refresh readAt and project. The former
`refreshed: true` assertion on that path is gone from test/server/refresh.test.ts, replaced by
assertions on the corrected contract plus a retention assertion and a recovery assertion. The
TGT-08 empty-source 200 and the rejecting-refresh 500 tests both still pass. The WR-03 route is
chosen, implemented, and its rationale plus grep evidence is written down for the SUMMARY.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Offset-correct and non-overlapping search snippets (WR-01, WR-02)</name>

  <files>src/presentation/search.ts, test/presentation/search.test.ts</files>

  <read_first>
src/presentation/search.ts lines 266-330 (DEFAULT_WINDOW_CHARS, the Occurrence interface,
findOccurrences, safeBoundary, mergeHighlightRanges) and lines 346-410 (the extractSnippets doc
comment and body). src/web/pages/search-page.tsx lines 25-46 (highlightedSnippetNodes and
SnippetLink) — the consumer whose invariant the fix must not break.
  </read_first>

  <observed>
Both defects were reproduced live at planning time by executing the real module.

WR-01, at `src/presentation/search.ts:368` (`const bodyLower = body.toLowerCase();`), with offsets
from `bodyLower` applied to `body` at lines 388-397: for `body = "İMATCH end"` the lowercased
form is 11 UTF-16 units against the original's 10 (`İ` expands to two units). `indexOf('match')`
returns 2; `body.slice(2, 7)` is `"ATCH "` — the UI marks the wrong five characters. Confirmed
exactly as the review describes.

WR-02, at the seed loop `src/presentation/search.ts:384-406` (review said 385-407 — one line of
drift): with `windowChars: 160` (half = 80) and two matches separated by 115 characters, the real
function returns two snippets spanning `[120, 285)` and `[240, 405)` — 45 characters of body text
duplicated across them. A second reproduction with a 78-character gap returns `[120, 285)` and
`[203, 368)`, where the first window's text ends with the unhighlighted fragment `"MA"` — the
promised-against near-duplicate windows, and a match cut into unhighlighted text.

Consumer invariant, confirmed at search-page.tsx:28-38: `highlightedSnippetNodes` walks the
highlight array with a single forward cursor and never re-sorts. Ranges MUST arrive ascending and
non-overlapping or the rendered snippet garbles. `mergeHighlightRanges` (line 316) is the existing
function that guarantees this; route every merged window's ranges through it.
  </observed>

  <behavior>
Add these as new cases in `test/presentation/search.test.ts` before touching `search.ts`. They must
be additive — the file currently holds 19 cases and none of them may be deleted.

  - WR-01 regression: `extractSnippets("İMATCH end", ['match'])` produces one snippet whose
    highlighted slice, read out of the snippet's own text at its reported range, is exactly
    `"MATCH"` — uppercase, five characters, no leading or trailing drift.
  - WR-01, offsets stay absolute: the same case's `bodyOffset` plus its highlight range indexes back
    into the ORIGINAL body at exactly the match, so deep-link/anchor math downstream stays sound.
  - WR-02 regression: two matches separated by a gap in the open interval `(windowChars/2,
    windowChars)` — use `windowChars: 160` and a 115-character gap, the reproduction above —
    produce exactly ONE snippet, whose text appears once (no duplicated body region) and whose
    highlights are two ascending, non-overlapping ranges each covering a real match.
  - WR-02, no cut matches: with a 78-character gap under the same window, no snippet's text ends or
    begins with a partial, unhighlighted fragment of a match.
  - Unchanged: matches far enough apart to produce genuinely disjoint windows still yield two
    separate snippets, sorted ascending by bodyOffset. Assert this explicitly so the merge cannot
    over-collapse.
  </behavior>

  <action>
**WR-01.** Replace the whole-string `toLowerCase()` with an offset-preserving case fold applied to
BOTH the body and each search term, so index arithmetic in the folded string is valid UTF-16 index
arithmetic in the original. Implement it as a small module-level helper that iterates the input by
code point, lowercases each one, and keeps the folded form only when its UTF-16 length equals the
original code point's — otherwise keeping the original code point unchanged. This makes the fold
exactly length-preserving by construction. Apply the same helper inside `findOccurrences` in place
of its current `term.toLowerCase()`, so needle and haystack are folded identically.

Document the deliberate tradeoff in a comment on the helper: a length-changing case mapping is left
unfolded and therefore will not case-insensitively match, which is strictly preferable to shifting
every subsequent highlight range in the document. (Verified: this returns `"MATCH"` for the
`İMATCH` case.) The alternative sanctioned by the review — an explicit normalized-to-UTF-16
index map — is also acceptable if you prefer it, but it is more machinery for the same outcome; if
you take it, say so in the SUMMARY.

**WR-02.** Restructure the seed loop so accepted windows are collected before any text is sliced,
then merged. Keep each candidate window as its start, its end, and its highlight positions in
ABSOLUTE body coordinates — do not convert to window-relative offsets inside the loop as the current
code does at the push site. After the loop, sort the candidates by start and merge any whose
`[start, end)` ranges overlap or abut, taking the union of both the span and the highlight sets.
Only then materialize each merged window: slice its text once, subtract the merged window's start
from every absolute highlight to get relative ranges, and pass those through the existing
`mergeHighlightRanges` so the ascending, non-overlapping guarantee `highlightedSnippetNodes`
depends on is preserved after the union. Resolve the anchor from the merged window's start.

Leave `safeBoundary`, `resolveAnchor`, `mergeHighlightRanges` and the seed-priority ordering
(longest term first, then earliest position) behaving as they do — the merge is a new pass layered
after seeding, not a rewrite of how seeds are chosen. `matchCount` must keep counting occurrences,
not windows.

Update the `extractSnippets` doc comment: it currently promises to avoid near-duplicate windows, a
promise the code did not keep. State that independently seeded windows whose spans overlap are
merged, so the promise now describes what the code does.

Keep the merge cost bounded — a sort plus one linear pass over accepted windows, never a pairwise
scan that could go quadratic on a body with many matches.
  </action>

  <verify>
    <automated>npm test -- --run test/presentation/search.test.ts test/server/search-index.test.ts test/server/deep-links.test.ts</automated>
    <automated>npm run typecheck</automated>
    <automated>test "$(npm test -- --run test/presentation/search.test.ts 2>&1 | grep -oP 'Tests\s+\K[0-9]+' | head -1)" -gt 19</automated>
  </verify>

  <done>
`test/presentation/search.test.ts` holds more than its original 19 cases, including a
length-changing-case-mapping case whose highlighted slice is exactly the matched original text, and
an overlapping-window case in the `(windowChars/2, windowChars)` interval that yields one merged
snippet with ascending, non-overlapping highlights and no duplicated body text. Genuinely disjoint
matches still yield separate snippets. `matchCount` still counts occurrences. All prior search,
search-index, and deep-link tests pass unchanged.
  </done>
</task>

<task type="auto">
  <name>Task 3: Snapshot age and Refresh stay reachable below 62rem (CR-02)</name>

  <files>src/web/styles/globals.css, src/web/components/app-shell.tsx, test/web/refresh-contract.test.ts</files>

  <read_first>
src/web/styles/globals.css lines 275-300 (the shared `.brand`/`.shell-nav`/`.shell-controls`/
`.snapshot-status` flex rule), 355-400 (the `.snapshot-status` block and its `> span`, `time`,
`> svg` children), 1482-1525 (the 62rem media block) and 1527-1550 (the 42rem media block, where
`.shell-controls` becomes absolutely positioned).
src/web/components/app-shell.tsx lines 94-119 (the `.shell-controls` subtree).
test/web/refresh-contract.test.ts lines 45-52 (the assertion that pins RefreshControl's mount point).
  </read_first>

  <observed>
- `src/web/components/app-shell.tsx:96` opens `<div className="snapshot-status" aria-live="polite">`.
  It contains a decorative `Radio` svg, the status `<span>` (a `<small>Snapshot read</small>` label
  plus a `<time>`), and `<RefreshControl>` at lines 112-115. The review's "103-128" has drifted.
- `src/web/styles/globals.css:1487-1489`, inside `@media (max-width: 62rem)`:
  `.snapshot-status { display: none; }`. The review cited 1471-1478.
- `display: none` removes the subtree from the accessibility tree too, so below 62rem no assistive
  technology can reach the age or the control either — this is a coverage gap in both clauses of
  TGT-08, not only a visual one.
- **Blast radius:** `test/web/refresh-contract.test.ts:45` slices the app-shell source from
  `<div className="snapshot-status"` to the next `</div>` and asserts `<RefreshControl` is inside.
  Moving RefreshControl out of `.snapshot-status` breaks that test. Keeping it inside does not.
- `test/web/visual-contract.test.ts:544-548` slices from `@media (max-width: 62rem)` to EOF and
  asserts `.tree-navigator { display: none;` appears — editing the block is safe, but do not remove
  or reorder that rule.
- At `max-width: 42rem`, `.shell-controls` becomes `position: absolute; top: 0.7rem; right: 0.65rem`
  and shares the brand row with the brand mark and name. `formatReadAt` renders
  `Date.toLocaleString()` — around 20 characters. This is the 320px overflow risk (UI-03).
- `.snapshot-status` already inherits `min-width: 0` from the shared rule at line 283, and
  `.snapshot-status time` already declares `overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap`. The containment primitives exist; they just are not reached today.
  </observed>

  <action>
Restore both clauses of TGT-08 below 62rem. **Keep `RefreshControl` mounted inside
`.snapshot-status`** — that is the lowest-blast-radius route and leaves the existing contract test
valid. Replace the narrow-width suppression with a compact treatment: the container stays laid out,
its padding tightens, the decorative status icon and the descriptive label drop out, and the
timestamp element plus the Refresh button both remain rendered and operable. Neither the age nor the
Refresh action may be suppressed at any width — a compact treatment is the requirement; hiding is
what is being fixed.

At the 42rem breakpoint, where the controls strip is absolutely positioned and space is genuinely
scarce, bound the timestamp rather than removing it: give it an explicit character-width ceiling so
its existing ellipsis containment actually engages, and tighten the gap between the timestamp and
the button. If after measuring at 320px the absolutely positioned strip still cannot hold all three
of search, snapshot status, and theme toggle without pushing the body wider than the viewport, the
correct move is to relayout the controls strip (for example letting it flow rather than sit
absolutely positioned at that width) — not to hide the age or the button. Whatever you choose, say
in the SUMMARY what the 320px layout ended up doing.

Add a regression case to `test/web/refresh-contract.test.ts`, in that file's existing source-text
style, asserting that the narrow-width media block no longer suppresses the snapshot status
container from the layout. Slice the stylesheet from the 62rem media-query opener the same way
`test/web/visual-contract.test.ts:546` does, and assert on the `.snapshot-status` rule that block
contains. Pin the outcome, not one particular property spelling, so a reasonable future refactor of
the compact treatment does not produce a false failure.

Touch `app-shell.tsx` only if the compact treatment genuinely needs a markup change (for example a
wrapper the CSS needs to target). If CSS alone suffices, leave the component alone and drop it from
this task's file list in the SUMMARY.
  </action>

  <verify>
    <automated>npm test -- --run test/web/refresh-contract.test.ts test/web/visual-contract.test.ts test/web/degradation-ui-contract.test.ts</automated>
    <automated>npm run lint && npm run build</automated>
    <human-check>
Serve the built app against a fixture (`npm run dev -- fixtures/dense`) and drive it with the
gsd-browser MCP tools. Install no new dependency to do this — the phase-04 threat model (T-04-01-SC)
forbids it and test/web/refresh-contract.test.ts enforces the dependency set. At viewport widths
**992px (62rem), 700px, and 320px**, confirm in each case: (a) the snapshot read time is visible,
(b) the Refresh button is visible, reachable by keyboard Tab, and activates, and (c)
`document.documentElement.scrollWidth` is not greater than `window.innerWidth` — no horizontal body scroll (UI-03).
Check both light and dark themes at 320px.
    </human-check>
  </verify>

  <done>
At 992px, 700px and 320px the snapshot read time and the Refresh control are both rendered,
keyboard-reachable, and operable; the page body does not scroll horizontally at any of the three;
RefreshControl is still mounted inside `.snapshot-status` so the existing contract test passes
unchanged; and a new regression case pins that the 62rem block no longer removes the status
container from the layout.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| target `.planning/` -> PlanningRepository | Arbitrary on-disk markdown the tool does not own crosses into the parser; content and read outcomes are both untrusted. |
| browser -> POST /api/refresh | The only non-GET route; triggers real filesystem work. Gated by the existing `sec-fetch-site` same-origin check. |
| corpus body text -> rendered snippet | Untrusted markdown reaches the DOM as snippet text with `<mark>` wrappers. |
| npm registry -> node_modules | Supply chain. This task installs nothing. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-Q1-01 | Denial of Service | `POST /api/refresh` -> the `derived` binding, src/server/index.ts | high | mitigate | Task 1: a transient or permanent target read failure currently replaces the last good bundle with an empty presentation for **every subsequent request, server-wide** — one unreadable moment degrades the whole session. The fix returns before the swap on a non-ok load status, so a failed read cannot poison served state. Pinned by the rewritten reachable-failure test plus its retention and recovery assertions. |
| T-Q1-02 | Information Disclosure | the new refresh failure response body | low | accept | The failure response returns `loadStatus.message`, which embeds the absolute path of the target directory. Accepted: the server binds to `127.0.0.1` only, the tool is a single-user local dashboard pointed at the user's own project, and `InvalidProjectScreen` already displays that same checked path prominently and copyably by design (D-16). No new information is exposed to any party that did not already have it. |
| T-Q1-03 | Denial of Service | the new window-merge pass in `extractSnippets` | low | mitigate | Task 2 constrains the merge to a sort plus one linear pass over accepted windows. A pairwise overlap scan would go quadratic on a body with many matches and is explicitly excluded. |
| T-Q1-04 | Tampering | merged highlight ranges -> `highlightedSnippetNodes`, src/web/pages/search-page.tsx | medium | mitigate | That consumer walks ranges with a single forward cursor and never re-sorts; overlapping or descending ranges garble the rendered snippet. Task 2 routes every merged window's relative ranges through the existing `mergeHighlightRanges` and asserts ascending non-overlap in a test. Snippet text stays React text nodes — no route to an HTML string is introduced. |
| T-Q1-05 | Spoofing | the now-reachable narrow-width Refresh control | medium | mitigate | Task 3 makes the control reachable at widths where it previously did not exist, which raises the value of the CSRF-shaped surface behind it. The `sec-fetch-site` same-origin gate at the top of the handler is not touched by any task here, and its rejecting-cross-site test in test/server/refresh.test.ts must stay green. |
| T-Q1-06 | Information Disclosure | the failed-refresh UI surface | medium | mitigate | Task 1 makes the reachable failure path actually reach `RefreshControl.onError`, whose D-04 copy is fixed text plus the retained snapshot's own read time and never interpolates server error text — enforced by the existing assertion that the control's source contains no error-message interpolation. The judgment-tier prohibition "the UI never presents a failed read attempt's time as the age of retained data" is verified live in the closing gate below. |
| T-Q1-SC | Tampering | npm installs | high | mitigate | This task installs **no** package — no `dependencies` or `devDependencies` change, no lockfile change. Already enforced by test/web/refresh-contract.test.ts's Phase-3 dependency key-set assertion, and re-verified by `git diff --exit-code -- package.json package-lock.json` in the closing gate. No package-legitimacy checkpoint is required because there is nothing to install. |
</threat_model>

<verification>
Run after all three tasks, on the final tree. Every one is non-negotiable.

1. `npm test` exits 0 with **more than 547 tests passing and 0 failing**. Record the exact count.
   A count at or below 547 means a regression case was dropped or a test was deleted to restore
   green — that is a failure of this task, not a pass.
2. `npm run typecheck` exits 0 (both the server and web projects).
3. `npm run lint` exits 0.
4. `npm run build` exits 0.
5. `git diff --exit-code -- package.json package-lock.json` exits 0 (T-Q1-SC).
6. The WR-03 drift-detection grep result is recorded, with the restated invariant if Route A was
   taken (see Task 1).
7. **Live retention check (the judgment-tier gate that silently passed the first time).** Copy a
   fixture to a temp directory and serve it: `cp -r fixtures/dense /tmp/ogb-target && npm run dev --
   /tmp/ogb-target`. Load the dashboard and note the displayed snapshot read time. With the server
   still running, make the target unreadable mid-session (`chmod 000 /tmp/ogb-target/.planning`, or
   rename it). Click Refresh. Confirm ALL of:
     - the previously loaded data is still on screen — no invalid-project screen, no empty views;
     - the displayed read time is **still the original one**, not the failed attempt's time;
     - the refresh-failure toast appears and names the last successful read;
     - navigating to another route still serves the retained data;
     - restoring the target (`chmod 755 ...`) and clicking Refresh again recovers to a new read time.
   Restore permissions and remove the temp directory afterwards.
</verification>

<success_criteria>
- All five findings in `04-REVIEW.md` are closed: CR-01, CR-02, WR-01, WR-02, WR-03.
- Milestone-audit gaps ATT-01 and ATT-02 have a concrete resolution to point at, and FIND-04's
  `partial` status is backed by two passing regression cases.
- Three atomic commits, one per task, each independently revertable.
- The full gate in `<verification>` passes, test count above 547.
- The SUMMARY records: the WR-03 route and its rationale plus grep evidence; what the 320px layout
  ended up doing; and the live retention check's observed outcome.
</success_criteria>

<output>
Create `.planning/quick/260909-ogb-close-all-five-open-findings-from-04-rev/260909-ogb-SUMMARY.md`
when done, and update `.planning/STATE.md`'s Quick Tasks Completed table.
</output>

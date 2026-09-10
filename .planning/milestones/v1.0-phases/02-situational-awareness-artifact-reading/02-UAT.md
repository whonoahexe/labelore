---
status: complete
phase: 02-situational-awareness-artifact-reading
source: [02-09-PLAN.md, 02-VERIFICATION.md]
started: 2026-08-29
updated: 2026-09-09
corpora: ["/home/cinedise/studio-portal", "fixtures/dense"]
environment: "production build (npm start), host browser via cloudflared tunnel"
---

## Result

Gate **not approved**. Plan 02-09 stays open.

Automated half passed on the integrated tree: `npm test` 255/255, `typecheck`, `lint`,
`build`, `smoke -- fixtures/dense` all exit 0.

Human half found 4 defects and 5 quality objections. The two gap fixes from this round
(02-07, 02-08) are **partially** confirmed: the dashboard CTA navigates (item 10), the
deep link scopes correctly and survives reload (items 12–14), but the blocker action
does not (item 11) and long-body scroll positioning is wrong (item 10).

## Tests

Canonical result set as of the 2026-09-09 reconciliation. Each entry carries its round-1 verdict
so the history stays visible; the round-1 tables are preserved verbatim below under
"Round-1 detail (historical)".

### 1. Body prose renders without leaked section tags
expected: GSD plan-section wrapper tags never render as literal text in `.artifact-document`.
result: pass
round_1: fail (G-01)
reverified: "0 GSD section tags leak on the exact file G-01 cited; the only angle-bracket token is `<seconds>`, genuine prose in a code span at source line 218."

### 2. Muted and faded text is legible
expected: Muted/secondary text meets contrast on its actual painted ground, both themes.
result: pass
round_1: not reached
reverified: "Covered by 02-17's 9-selector x light/dark x desktop/390px measurement table."

### 3. Links are legible and actually linked, all states
expected: Things that read as links are links; default/hover/focus-visible/visited all legible.
result: pass
round_1: fail (G-03, G-09)
reverified: "16 `.document-reference` controls render on a plan page; planning paths in prose are interactive."

### 4. Badges and status chips
expected: Badge and chip treatments read as intentional and meet contrast.
result: pass
round_1: pass with quality objection (G-07)
reverified: "Objection resolved through 02-12/02-13 and approved at the 02-17 gate."

### 5. Table chrome
expected: Tables read cleanly — striping present, no heavy vertical rules.
result: pass
round_1: fail (G-05)
reverified: "Zebra striping live in both themes on `.artifact-document tr:nth-child(even) td`; vertical cell borders 0px."

### 6. Shiki code blocks
expected: Code is legible, themed coherently, and no content is unreachable.
result: pass
round_1: legible, theme rejected (G-06); later found clipped (G-10)
reverified: "All 8 overflowing `<pre>` are `overflow-x:auto` and genuinely scrollable — maxScrollLeft equals hidden width exactly. See the affordance note in Gap Reconciliation."

### 7. Mermaid diagrams
expected: Valid diagrams draw in both themes and stay within their size bound; invalid ones fall back visibly.
result: pass
round_1: not reached (no diagrams encountered)
reverified: "Renders 379x462 in both themes on fixtures/dense — identical to the dimensions 02-17 recorded as passing — with zero page errors."

### 8. Reference-preview popover
expected: A reference in prose exposes a preview trigger; the popover opens with a working Open action.
result: pass
round_1: fail (G-03)
reverified: "Trigger is a `<button aria-label='Preview ...'>`; click opens `.reference-preview` with an Open action to a valid artifact URL."

### 9. Destructive signals
expected: Destructive/damage signalling is distinguishable and meets contrast.
result: pass
round_1: pass

### 10. Dashboard "Next up" navigates to the scoped phase
expected: The primary CTA navigates to the roadmap with exactly that phase opened and scrolled into view.
result: pass
round_1: partial — navigated, but scroll target lost on long bodies (G-04)
reverified: "Deep link settles at top=80px, in viewport, scrollY=13381 on a long plan after layout settle."

### 11. Blocker action navigates to the scoped phase
expected: The attention-panel blocker row is an activatable control reaching its stated destination.
result: pass
round_1: fail (G-02)
reverified: "Blocker rows are real anchors to /milestones/m~v2.0/phases/p~vv2.0~n~v04~vbulk-archive-downloads."

### 12. Other disclosures stay collapsed
expected: Opening one phase disclosure leaves every other one closed.
result: pass
round_1: pass

### 13. Prose reference reaches the same destination as the CTA
expected: A phase reference clicked in prose, followed through Open, matches the dashboard CTA destination.
result: pass
round_1: pass

### 14. Deep-link reload reproduces the view
expected: Reloading a deep link reproduces the same scoped, opened view.
result: pass
round_1: pass

### 15. Nested markdown inside wrapper tags parses
expected: Lists inside unrecognized wrapper tags parse as lists, not run-on paragraphs.
result: pass
round_1: fail (G-11)
reverified: "372 list items parse on the page whose `<read_first>` block used to render run-on."

### 16. Visual nesting depth is bounded
expected: Artifact pages do not stack excessive nested card layers.
result: pass
round_1: fail (G-08, 4-5 layers measured)
reverified: "Measured container nesting depth around code blocks is 3."

## Round-1 detail (historical)

### Contrast pass (round 1)

| # | Surface | Verdict |
|---|---------|---------|
| 1 | body prose | ✗ **FAIL** — raw pseudo-tags render as literal text |
| 2 | muted / faded text | ○ **NOT REACHED** — tester could not locate these surfaces |
| 3 | links, all states | ✗ **FAIL** — hover does nothing; many things that should be links are not |
| 4 | badges / status chips | ✓ pass, quality objection noted |
| 5 | table chrome | ✗ **FAIL** — "tables look horrible" |
| 6 | Shiki code blocks | ✓ legible, ✗ theme rejected |
| 7 | Mermaid diagrams | ○ **NOT REACHED** — no diagrams encountered in either corpus |
| 8 | reference-preview popover | ✗ **FAIL** — no previews found in the UI |
| 9 | `--destructive` signals | ✓ pass |

Items 2 and 7 are recorded as **still open**, not as passes — no surface was reached,
so no verdict exists. Light/dark were not separately reported; both themes were
available, and no finding was theme-specific.

### Navigation pass (round 1)

| # | Flow | Verdict |
|---|------|---------|
| 10 | dashboard "Next up" → scoped phase | ◐ **PARTIAL** — navigates correctly, but scroll target is lost when body text is long |
| 11 | blocker action → scoped phase | ✗ **FAIL** — not working |
| 12 | other disclosures stay collapsed | ✓ pass |
| 13 | prose reference → Open → same destination | ✓ pass |
| 14 | deep link reload reproduces view | ✓ pass |

## Summary

total: 16
passed: 16
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gap Reconciliation — 2026-09-09

All eleven round-1 gaps below are **resolved**. They were closed across three gate rounds, and
each was independently re-verified against the CURRENT tree in this session with playwright-core
driving a real Chromium against two fresh servers (`fixtures/dense` :4190, `~/studio-portal` :4191)
on a build at `0311066`. This matters because 29 commits touched `src/web`, `src/presentation`,
`src/rendering` and `src/server` after the 02-17 approval — including `64cc42b fix(ui): unify
interface hierarchy and color states` — so the approval alone was not sufficient evidence.

**Gate chain:** 02-09 NOT APPROVED (G-01..G-11) → wave 9 (02-10, 02-11, 02-12) → 02-13 NOT
APPROVED (G2-01..G2-10) → 02-14, 02-15, 02-16 → **02-17 APPROVED** (human, 2026-09-01), nine
further defects fixed under quick task 260901-ten and re-verified before approval.

```yaml
- gap_id: G-01
  status: resolved
  resolved_by: [02-10, 02-13]
  reverified: "0 GSD section tags leak on the exact file G-01 cited. The only angle-bracket token
    in body text is `<seconds>`, which is genuine prose inside a code span at source line 218."
- gap_id: G-02
  status: resolved
  resolved_by: [02-11, 02-13]
  reverified: "Blocker rows are real anchors: href=/milestones/m~v2.0/phases/p~vv2.0~n~v04~vbulk-archive-downloads
    — the destination the round-1 record confirmed correct in data but inert in the UI."
- gap_id: G-03
  status: resolved
  resolved_by: [02-10, 02-12, 02-13]
  reverified: "16 .document-reference elements render (was 0). Each is a <button> with
    aria-label='Preview <path>'; clicking opens .reference-preview with a heading and a working
    Open action (/artifacts/a~.planning%2FPROJECT.md)."
- gap_id: G-04
  status: resolved
  resolved_by: [02-11, 02-13]
  reverified: "Deep link to #trust-boundaries on the long plan settles at top=80px, in viewport,
    scrollY=13381 after a 1.6s layout settle — the long-document case that used to lose position."
- gap_id: G-05
  status: resolved
  resolved_by: [02-12, 02-13]
  reverified: "Zebra striping live in both themes on .artifact-document tr:nth-child(even) td
    (dark oklch(...)/0.5, light oklch(...)/0.62). Vertical cell borders are 0px — the specific
    02-13 complaint."
- gap_id: G-06
  status: resolved
  resolved_by: [02-12, 02-13, 02-17]
  reverified: "Subjective; carried through to the 02-17 human gate and approved there."
- gap_id: G-07
  status: resolved
  resolved_by: [02-12, 02-13, 02-17]
  reverified: "Subjective; approved at the 02-17 gate."
- gap_id: G-08
  status: resolved
  resolved_by: [02-12, 02-13]
  reverified: "Measured container nesting depth around code blocks is 3, down from the 4-5 layers
    recorded in round 1."
- gap_id: G-09
  status: resolved
  resolved_by: [02-12, 02-15, 02-17]
  reverified: "Planning paths in prose (.planning/PROJECT.md, ROADMAP.md, STATE.md) are interactive
    preview controls, not inert text."
- gap_id: G-10
  status: resolved
  resolved_by: [02-12, 02-13]
  reverified: "Every overflowing <pre> is overflow-x:auto and genuinely scrollable — maxScrollLeft
    equals hidden width exactly on all 8 blocks, so no content is unreachable. See the affordance
    note below: the scrollbar is 2px by deliberate design (quick 260901-ten F6/F9)."
- gap_id: G-11
  status: resolved
  resolved_by: [02-10, 02-13]
  reverified: "372 list items parse on the page whose <read_first> block used to render as one
    run-on paragraph."
```

**Also re-verified:** mermaid renders in both themes at 379x462 — byte-identical to the dimensions
02-17 recorded as passing — with zero page errors. `npm test` 547/547, `typecheck`, `lint`,
`build`, `smoke -- fixtures/dense` all exit 0.

### Affordance note on G-10 (not a reopened gap)

The reachability defect is fixed. The discoverability tradeoff it was found under is not, and is
recorded here rather than silently absorbed: the largest code block on the studio-portal plan page
hides 1658px of content — about 2.7x its 606px visible width — behind a 2px scrollbar. The content
can be scrolled to; from a static view a reader still cannot tell text is missing. Quick task
260901-ten quieted that scrollbar deliberately (F6, F9), so this is a design decision to affirm or
revisit, not a regression to fix.

### Deferred, carried forward from 02-17

- **Mermaid diagram styling** — "works as expected but it looks very ugly." Rendering is correct
  and bounded; the diagrams' visual design is explicitly deferred.
- **`.artifact-metadata > summary span` at 9.9px** — under a 10px floor.

## Gaps (round 1, historical — all resolved above)

### G-01 — Unknown plan-section tags leak as literal text (defect, confirmed + root-caused)

**Surface:** body prose in `.artifact-document`, every GSD `PLAN.md`.
**Observed:** `</execution_context>`, `</read_first>`, `</scope_note>` render as visible text.

The plan-section renderer recognises a **fixed whitelist** of section names — `objective`,
`context`, `files`, `behavior`, `done` — and wraps those in
`<section class="plan-section-*">` with a label. Any tag outside that list is escaped and
printed. Confirmed in the API response for
`/home/cinedise/studio-portal/.planning/phases/01-portal-owned-identity-sessions/01-01-PLAN.md`:

```
<p>&#x3C;execution_context> @$HOME/.claude/gsd-core/workflows/execute-plan.md
   ... &#x3C;/execution_context></p>
```

Handling is also asymmetric — `<scope_note>` is consumed while `</scope_note>` leaks.

This contradicts the project constraint that unknown artifact input must *degrade, not
break*: GSD's tag vocabulary is open-ended, so a whitelist guarantees recurrence on every
new tag GSD introduces.

### G-02 — Blocker action does not navigate (defect)

Item 11. The blocker's `url` is well-formed and matches a rendered roadmap row exactly —
`/milestones/m~v2.0/phases/p~vv2.0~n~v04~vbulk-archive-downloads` is byte-identical to the
phase-04 row's own `url` in `/api/roadmap`. So the data is correct and the failure is in
the UI: the attention-panel blocker row is likely not rendered as an activatable control.
Plan 02-07 fixed the `NextWorkItem.url` producer; it did not make that row clickable.

### G-03 — References exist in data but no previews in the UI (defect)

Items 3 and 8. `/api/artifacts/...` returns `references: 5` for the plan inspected, so
extraction works. Nothing hoverable appears in the rendered page. The preview trigger is
either not rendered or not bound. Related: the tester reports many things that read as
links are not linked at all.

### G-04 — Deep-link scroll lost on long documents (defect)

Item 10. Navigation succeeds but the target scrolls out of position when the phase body is
large. The one-shot scroll fires before layout settles at full content height.

### G-05 — Table presentation rejected (quality)

Item 5, unqualified: "tables look horrible."

### G-06 — Code block theme rejected (quality)

Item 6. Legible, but the Shiki theme is not wanted.

### G-07 — Badge treatment weak (quality)

Item 4. Passes contrast; "could be improved."

### G-08 — Excessive card nesting (quality, structural)

Unprompted finding: "too many blocks inside the blocks, making it a bunch of nested cards
in many pages." Affects the visual system across pages, not one component.

### G-09 — Paths and commits are not linked (missing capability)

Unprompted finding: any `.planning/` path, source-code path, or commit hash appearing in
artifact prose should be an in-app link to that document. Currently inert text. This is
adjacent to NAV-02/NAV-03 but was not in phase 2's scope as written.

### G-10 — Code block content is clipped and unreachable (defect, found on re-inspection)

Found while capturing evidence for G-06, via headless Chromium against the live server.
Fenced code inside plan sections is **truncated at the right edge with no horizontal
scrollbar and no wrapping**. Lines end mid-token — `returns 200 and a `Set-Co`,
`a syntactically valid but unk` — with no affordance to reach the remainder.

This is more severe than the theme objection it was found under: the document is not
merely ugly, it is *incomplete*, and a reader cannot tell that text is missing. Direct
hit on the phase's core value ("know where any planning artifact lives without reading a
single file by hand") — here you must open the file by hand to read it.

### G-11 — Pseudo-tag wrappers destroy markdown list parsing (defect, same root cause as G-01)

`<read_first>` blocks render as one run-on paragraph: `- backend/src/lib.rs (...) -
backend/src/config.rs (...) - backend/src/db/mod.rs (...)` inline rather than as list
items. The unrecognised wrapper tag prevents the enclosed markdown from being parsed as a
list. Fixing G-01 properly (handle unknown sections generically) should resolve this too;
fixing G-01 by extending the whitelist would not.

### Confirmed visually

- G-01: `</read_first>` and `<scope_note>` render as visible literal text — screenshotted.
- G-03: DOM query for reference triggers returns **0** elements on a document whose API
  response carries `references: 5`. Extraction works; rendering does not exist.
- G-08: four levels of nesting on the artifact page — page canvas → document card →
  section container → code block box — plus dense inline-code chips that read as a
  further box layer.
- Theme default: `localStorage['labelore-theme']`, dark unless the value is exactly
  `light`. `prefers-color-scheme` is never consulted, so a light-preference OS still
  opens dark. Not raised by the tester; recorded as an observation, not a gap.

## Notes

- G-01 through G-04 are defects against what phase 2 already promised.
- G-05 through G-08 are design-quality objections requiring a UI-SPEC revision, not a bug fix.
- G-09 is new scope.
- No Playwright MCP server is configured in this environment, and the project has no
  Playwright, Puppeteer, or jsdom dependency (a deliberate v1 stack decision). Browser-side
  confirmation of G-02/G-03/G-04 therefore still requires a human or a new tooling decision.

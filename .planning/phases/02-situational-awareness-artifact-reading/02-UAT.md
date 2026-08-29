---
status: gaps-found
phase: 02-situational-awareness-artifact-reading
source: [02-09-PLAN.md, 02-VERIFICATION.md]
started: 2026-08-29
updated: 2026-08-29
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

### Contrast pass

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

### Navigation pass

| # | Flow | Verdict |
|---|------|---------|
| 10 | dashboard "Next up" → scoped phase | ◐ **PARTIAL** — navigates correctly, but scroll target is lost when body text is long |
| 11 | blocker action → scoped phase | ✗ **FAIL** — not working |
| 12 | other disclosures stay collapsed | ✓ pass |
| 13 | prose reference → Open → same destination | ✓ pass |
| 14 | deep link reload reproduces view | ✓ pass |

## Gaps

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
- Theme default: `localStorage['gsd-lore-theme']`, dark unless the value is exactly
  `light`. `prefers-color-scheme` is never consulted, so a light-preference OS still
  opens dark. Not raised by the tester; recorded as an observation, not a gap.

## Notes

- G-01 through G-04 are defects against what phase 2 already promised.
- G-05 through G-08 are design-quality objections requiring a UI-SPEC revision, not a bug fix.
- G-09 is new scope.
- No Playwright MCP server is configured in this environment, and the project has no
  Playwright, Puppeteer, or jsdom dependency (a deliberate v1 stack decision). Browser-side
  confirmation of G-02/G-03/G-04 therefore still requires a human or a new tooling decision.

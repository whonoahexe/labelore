# Phase 02 UAT findings — verified evidence

Measured 2026-09-01 with playwright-core against three live dev servers:
D1 `fixtures/dense` :4180 · D2 `~/studio-portal` :4181 · D3 fallback fixture :4182.

Theme is selected by `localStorage['gsd-lore-theme']` (`'light'` | `'dark'`) — set in
`index.html`'s inline boot script. It does NOT read `prefers-color-scheme`, and the
default when the key is absent is **dark**. Any browser check must set the key before
first paint, or it measures dark only.

Representative routes used:
- **Artifact A** (no outline, 2 mermaid fences): `:4180` +
  `/milestones/m~v3.0/phases/p~vv3.0~n~v01~videntity-slice/artifacts/a~.planning%2Fphases%2F01-identity-slice%2F01-01-PLAN.md`
- **Artifact B** (has outline, nested plan sections, tables): `:4181` +
  `/milestones/m~v1.0/phases/p~vv1.0~n~v02~vstorage-health-status/artifacts/a~.planning%2Fmilestones%2Fv1.0-phases%2F02-storage-health-status%2F02-10-PLAN.md`
- **Plan pair**: `:4181` + `/milestones/m~v1.0/phases/p~vv1.0~n~v02~vstorage-health-status/plans/02-10`

---

## F1 — Mermaid renders nothing, in either theme (severity: outage)

`src/web/pages/artifact-page.tsx` ~line 178, inside `DocumentView`'s effect.

`mermaid.initialize({ themeVariables: { ... } })` is handed raw custom-property values
read straight off `getComputedStyle(document.documentElement)`. Every token in this
palette is oklch, and mermaid's colour library rejects the format:

```
light: Error: Unsupported color format: "oklch(0.967 0.001 286.375)"   (--secondary)
dark:  Error: Unsupported color format: "oklch(0.274 0.006 286.033)"   (--secondary)
```

`initialize()` sits OUTSIDE the per-node `try/catch`, so the throw rejects the whole
`import('mermaid').then(...)` callback before the loop runs. Observed on artifact A:

| | observed | expected |
|---|---|---|
| `[data-mermaid-pending="true"]` remaining | 2 | 0 |
| `.mermaid svg` | 0 | 1 (the valid fence) |
| `.mermaid-fallback` | 0 | 1 (the deliberately-invalid fence) |
| `.notice.warning` | 0 | 1 |

Both required behaviours are dead: the valid diagram never draws, and the invalid one
never degrades to readable source. The error is uncaught (surfaces as a `pageerror`).

Fix has two halves, both required:
1. Convert each oklch token to a format mermaid accepts (sRGB hex or `rgb()`) before
   putting it in `themeVariables`. Tokens involved: `--background`, `--secondary`,
   `--foreground`, `--border`. Note `--border` in dark is `oklch(1 0 0 / 10%)` — it
   carries an alpha channel, so the conversion must handle the `/ <alpha>` form and
   not silently drop it.
2. Wrap `initialize()` in its own `try/catch` so a future theme-token change degrades
   to mermaid's default theme instead of killing all diagram rendering. A theme
   failure must never take out the per-node parse/run loop or its fallback path.

---

## F2 — `.discrepancy-callout p` fails WCAG AA in light theme

Measured contrast against its own composited background:

| cell | ratio | font-size |
|---|---|---|
| light | **4.11:1** | 12.8px |
| dark | 6.34:1 | 12.8px |

4.5:1 is the floor for normal-size text. Light fails; dark is fine. This was the only
failing cell of the 36-cell muted-surface matrix (9 selectors × light/dark ×
desktop/mobile) — every other selector measured 4.74:1 light / 6.34–7.66:1 dark.

Note the light-theme floor of 4.74:1 is `--muted-foreground`; it clears 4.5 with very
little headroom, so prefer fixing this callout locally over moving the shared token.

---

## F3 — Prose has no measure cap inside `.plan-section`

`globals.css`: `.artifact-document > :is(p, ul, ol, blockquote) { max-width: 76ch }`
uses the child combinator, so it matches only paragraphs that are DIRECT children of
`.artifact-document`. Plan bodies wrap their prose in `.plan-section`, which the rule
never reaches.

Measured line box widths at 1440px:

| page | median `p` width | canvas width |
|---|---|---|
| artifact A | 968px (~120 chars) | 1120px |
| artifact B | 864px | 1016px |

Comfortable measure is ~65–80 characters. Extend the cap to nested prose without
breaking tables, code blocks or diagrams, which legitimately want the full column.

---

## F4 — Horizontal page overflow at 320px

| viewport | dashboard | roadmap | artifact A | artifact B | plan pair |
|---|---|---|---|---|---|
| 1440 | ok | ok | ok | ok | ok |
| 390 | ok | ok | ok | ok | ok |
| 320 | ok | ok | ok | **325 > 320** | **328 > 320** |

Both themes behave identically. Some descendant sets a floor wider than the viewport;
find the actual offender by measuring element widths rather than guessing.

---

## F5 — `.attention-list small` is a dead selector

`globals.css:790`:

```css
.attention-list p,
.attention-list small { color: var(--muted-foreground); font-size: 0.77rem; line-height: 1.55; }
```

No `<small>` is ever rendered inside an attention row — `dashboard-page.tsx` emits
`<span class="item-kind">`, `<strong>`, `<p>` and the `.source-note`. Confirmed by
`document.querySelector('.attention-list small')` returning null on D1, D2 and D3.
Drop the dead half; `.attention-list p` already carries the live styling.

---

## F6 — Code-block scrollbar is too heavy for the theme

The scrollbar on a horizontally-overflowing `.shiki` block reads as a chunky default
OS bar and clashes with the surrounding surface. Wanted: thin, subtle at rest,
stronger on hover/focus, tracking the theme tokens in both light and dark. Must stay
operable — the four behaviours already accepted in UAT (visible at rest, stronger on
hover/focus, thumb drags, Shift+wheel scrolls) are a regression floor, and the bar
must remain reachable for keyboard and pointer users.

---

## F7 — Reference popover anchors at the top-left of the viewport

Clicking a `.planning`-path trigger (`[data-reference-key]`) opens the preview
popover pinned to the top-left of the page instead of near its trigger. Component:
`src/web/components/reference-preview.tsx` (`@base-ui/react` popover).

Already-passing behaviours that must not regress: stays inside the viewport, paints
above the sticky header, Escape closes it, focus returns to the trigger.

---

## F8 — Nested PLAN sections need numbering

Artifact B nests plan → tasks → task → actual task. The separator rule is already
correct (only the top level draws one, no repeated rule at depth), but at depth
there is no positional cue, so it is hard to tell which task you are reading.
Number the nested levels so the hierarchy is legible.

---

## F9 — Table zebra striping is off-theme

Rendered markdown tables and the coverage table now have the right structure
(horizontal rules only, no vertical borders) but the zebra tint doesn't sit with
the rest of the palette. Retune the striping in both themes.

---

## Regression floor

`test/web/visual-contract.test.ts` asserts against stylesheet source — including the
two fixes already shipped this session (`.document-reader-layout[data-outline='false']`
collapsing to one column, and `.artifact-document .task-list-item` using inline flow
rather than a 2-column grid). Do not break those.

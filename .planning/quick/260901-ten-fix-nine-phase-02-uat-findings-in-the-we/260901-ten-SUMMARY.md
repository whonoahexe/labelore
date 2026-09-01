---
quick_id: 260901-ten
status: complete
date: 2026-09-01
findings: [F1, F2, F3, F4, F5, F6, F7, F8, F9]
commits: 6
---

# Quick task 260901-ten — nine phase-02 UAT findings

All nine closed across six atomic commits. Full suite green at 367 tests (up from 359);
`npm run typecheck` clean.

## Per-finding verdicts

| # | Finding | Before | After | Commit |
|---|---|---|---|---|
| F1 | Mermaid renders nothing | 2 nodes pending, 0 SVG, 0 fallback, uncaught oklch error | 0 pending, 379×462 SVG, 1 fallback, 1 warning, no errors — both themes | `4ecab63` |
| F2 | `.discrepancy-callout p` contrast | 4.11:1 light | 5.37:1 light / 7.39:1 dark | `02c8cb7` |
| F3 | Prose measure in `.plan-section` | 968px A / 864px B (~120ch) | 795px both (76ch binding) | `4ad76f1` |
| F4 | 320px horizontal overflow | artB 325>320, plan 328>320 | none at 320/390/1440, both themes | `4ad76f1` |
| F5 | `.attention-list small` dead | selector matched nothing | removed | `02c8cb7` |
| F6 | Code scrollbar too heavy | 8px, `--border` thumb | 6px, transparent track, 45%-alpha thumb, solid on hover/focus-within | `45da9aa` |
| F7 | Popover anchors top-left | 0×0 reference at viewport origin | tracks trigger, flips near edges, stays in viewport | `f9b9ec8` |
| F8 | Nested PLAN sections unnumbered | label only | dotted ordinals, 45 sections, 4 levels deep | `cb3692a` |
| F9 | Table zebra off-theme | two hardcoded 38% `--muted` mixes | one `--table-zebra` token, declared per theme | `45da9aa` |

## F1 — the part the original diagnosis missed

Converting oklch for `themeVariables` and guarding `initialize()` was necessary but **not
sufficient**. With only that fix the diagrams still did not appear: the valid fence rendered its
SVG and the invalid one degraded correctly, and then both were wiped.

The mount uses a raw HTML string, and re-rendering that element reinstates the original markup —
erasing mermaid's in-place SVG replacement. The `setRuntimeWarnings` call in the fallback path
was itself triggering that re-render, one line after the mutation it destroyed.

Traced with in-app instrumentation:

```
run-start nodes=2
disposed-bail                                   <- StrictMode's first pass, correct
run-start nodes=2
parsed ok connected=true
ran cls=mermaid kids=1 connected=true           <- SVG present
CATCH Error: Parse error on line 3 ...          <- invalid fence, correct
```

…after which both nodes read `cls=mermaid, pending=true, kids=0` again. Suppressing the state
update alone restored both. Memoizing the mount on the html string is the actual fix.

This also latently broke the reference popover: `setReferenceOpen` re-renders the same component,
so opening a preview would have erased every rendered diagram on the page.

## Deviations and judgment calls

- **Three test assertions were updated, not weakened.** `markdown.test.ts` pinned
  `'__html: document.html'` and a single `dangerouslySetInnerHTML` occurrence; the memoized mount
  moves that read one level up, so it now pins the hand-off and the injection separately — 
  strictly more specific. `references.test.ts` pinned `anchor={state.trigger}`, which was the
  defect itself.
- **F2 was tuned down.** The first mix reached 7.94:1 in light, which read as emphasis beside its
  4.74:1 neighbours. 85% muted / 15% foreground gives 5.37:1 — clears AA with headroom, stays in
  family.
- **F6/F8/F9 are aesthetic**; direction implemented, no invented thresholds.

## Open for the human gate

- **F6** — the styling applies (`scrollbar-width: thin`, themed `scrollbar-color`, 6px webkit bar)
  and the block scrolls, but headless Chromium reports an overlay scrollbar taking no layout
  space (`offsetHeight - clientHeight` = 2, the borders alone). Whether the thumb reads well *at
  rest* needs a look in a real browser. It is strictly more visible than before, where the rest
  state was `--border` — `oklch(1 0 0 / 10%)` in dark, effectively invisible.
- **F9** — stripe confirmed landing on even `tbody` rows; the tone is a judgment call.
- **F8** — numbering confirmed correct at every depth; whether the dotted form is the right cue is
  a judgment call.

## Note on the earlier UAT verdict

Item 1 of the original matrix ("Mermaid valid") was recorded as a pass. Live measurement before
this task contradicted that on both themes — 0 SVG, 0 fallback, uncaught error. The pass could not
be reproduced.

## Environment note

`src/rendering/markdown.ts` is server-side and the dev servers are long-running Node processes, so
F8 required restarting them on ports 4180/4181/4182. The cloudflared tunnels target the ports and
were untouched.

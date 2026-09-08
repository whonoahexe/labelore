---
phase: 02-situational-awareness-artifact-reading
plan: 17
subsystem: ui
tags: [uat, human-gate, browser, accessibility, mermaid, markdown, dashboard]
status: complete
gate: approved
approved_by: human
approved_at: 2026-09-01

# Dependency graph
requires:
  - phase: 02-situational-awareness-artifact-reading
    provides: "02-14, 02-15 and 02-16's corrections, re-gated here against a fresh build"
provides:
  - "Per-theme, per-viewport verdicts for G2-01..G2-10, the nine muted-surface selectors, both blocker destination branches, and the 02-13 non-regression set"
  - "Nine defects found by this gate, all fixed and re-verified under quick task 260901-ten"
---

# 02-17 — Fresh-build re-gate

**Gate outcome: APPROVED** (human, 2026-09-01), with one aesthetic objection carried forward as a
deferred item rather than a blocker.

The gate ran against a build containing 02-14, 02-15 and 02-16. It found nine defects. All nine
were fixed under quick task
[260901-ten](../../quick/260901-ten-fix-nine-phase-02-uat-findings-in-the-we/) and re-verified
before approval.

## Method

Two evidence classes, kept distinct throughout:

- **Human observation** in the host browser at 100% zoom, via cloudflared tunnels onto three live
  fixture servers — D1 `fixtures/dense` (:4180), D2 `~/studio-portal` (:4181), D3 a synthetic
  fallback-blocker fixture (:4182), the last covering a branch no tracked fixture reaches.
- **Instrumented measurement** with playwright-core against the same three servers, used where the
  claim is numeric (contrast ratios, line-box widths, scroll geometry, destination URLs).

Theme is selected by `localStorage['labelore-theme']`; there is no `prefers-color-scheme` support
and the default is dark, so every measurement sets the key before first paint. Contrast was
computed by converting oklch to sRGB in-probe — `getComputedStyle` returns oklch verbatim and
canvas does not normalize it, so a naive numeric parse silently reports 1:1 for every selector.

## Verdicts — artifact page A (dense plan)

| # | Surface | Verdict | Evidence |
|---|---|---|---|
| 1 | Mermaid valid | **pass** (human) | Draws in both themes; 379×462, within `min(70vh, 36rem)`. Styling objection below. |
| 2 | Mermaid invalid | **fail → fixed** | Nothing rendered at all. Root cause was not the fixture: see below. |
| 3 | Code scrollbar | **fail → fixed** | "Too big, doesn't sit with the theme." Now 6px, transparent track, thumb strengthening on hover/focus-within. |
| 4 | `.planning` path trigger | **pass** (human) | Dotted underline → preview → Open lands on the artifact. |
| 5 | Popover position | **fail → fixed** | Pinned to viewport top-left. Now tracks its trigger. |
| 6 | Source paths stay plain | **pass** (human) | Blocked by design (D-17; 02-15 shipped only the `.planning` half of G-09). |

## Verdicts — artifact page B (portal plan)

| # | Surface | Verdict | Evidence |
|---|---|---|---|
| 7 | Nested PLAN sections | **fail → fixed** | Separators correct, but no positional cue at depth. Now dotted ordinals. |
| 8 | Tables | **fail → fixed** | Structure correct; zebra tone off-palette. Now one per-theme token. |
| 9 | Status chips | **pass** (human) | active/complete/pending/inferred distinct; inferred reads quiet on the plan-pair page. |
| 10 | `.planning` archived variant | **pass** (human) | Resolves and opens. |

## Verdicts — dashboards (measured)

| # | Surface | Verdict | Evidence |
|---|---|---|---|
| 11 | Attention rows carry no provenance link | **pass** | Full D2 list expanded (86 rows). discrepancy/dependency/checkpoint/coverage all render `.source-note` as a bare `<span>`; only `blocker` links. Matches source: those four hardcode `provenance.kind: 'derived'`, for which `sourceDestination()` returns null. |
| 12 | D1 resolvable blocker | **pass** | Primary → phase route; provenance → `/artifacts/a~.planning%2FSTATE.md`. Label reads "View state source". |
| 13 | D3 fallback blocker | **pass** | Primary → `/roadmap`; provenance → `.planning/STATE.md`. The untracked branch works. |
| 14 | Next panel clamp | **pass** | `-webkit-line-clamp: 3`, visually clipped, full 379-char string intact in the DOM for AT. |
| 15 | Source note placement | **pass** | Icon x=121; content and note both x=154. In the content column, not beside the icon. |

## Verdicts — muted surfaces (9 selectors × light/dark × desktop/390px)

Viewport did not affect colour in any cell. Light is the binding case.

| Selector | Light | Dark | Verdict |
|---|---|---|---|
| `.snapshot-status small` | 4.74 | 7.66 | pass |
| `.next-preview p` | 4.74 | 6.99 | pass |
| `.attention-list small` | — | — | **dead selector → removed**; no `<small>` is ever rendered in a row. Live equivalent `.attention-list p` passes at 4.74/6.99. |
| `.discrepancy-callout p` | **4.11** | 6.34 | **fail → fixed**, now 5.37/7.39 |
| `.lede` | 4.74 | 7.66 | pass |
| `.plan-section-label` | 4.74 | 7.66 | pass |
| `.artifact-metadata > summary span` | 4.74 | 6.99 | pass, but 9.9px — under a 10px floor regardless of contrast |
| `.document-outline > p` | 4.74 | 7.66 | pass |
| `.reference-preview-facts dt` | 4.74 | 6.94 | pass |

The light-theme floor of 4.74:1 is `--muted-foreground` itself. It clears 4.5 with almost no
headroom, so several cells would fail together if that token were ever nudged down.

## Verdicts — non-regression (02-13 carryover)

| Check | Verdict |
|---|---|
| No page-level horizontal scroll | pass at 1440 and 390; **fail at 320 → fixed** (artifact B 325>320, plan pair 328>320) |
| Mobile breadcrumb return | pass — all four links visible and hit-testable at 390px |
| Mobile Next placement | pass structurally; on D2 it sits below a 62-row coverage list |
| Artifact-key readability | pass — 12.2px mono, `overflow-wrap: anywhere`, wraps within 358px |
| Narrative prose styling | **fail → fixed** — 968px/864px line boxes, now 795px (76ch) |
| Non-monospace prose | pass — 0 of 46 sampled paragraphs use a mono family |

## Root cause worth recording

Finding 2 was not a fixture problem and not only a colour-format problem. `mermaid.initialize()`
was handed raw oklch token values, which its colour library rejects; because that call sat outside
the per-node try/catch, the throw killed the whole render loop — so the valid diagram never drew
and the invalid one never reached its fallback either.

Converting the colours fixed the throw but still produced no visible diagrams. The mount is built
from a raw HTML string, and re-rendering that element reinstates the original markup, erasing
mermaid's in-place SVG replacement. The fallback path's own `setRuntimeWarnings` call was
triggering that re-render one line after the mutation it destroyed. The same latent bug meant
opening a reference popover would have erased every rendered diagram on the page.

## Deferred

- **Mermaid diagram styling.** The human verdict on finding 1 was "works as expected but it looks
  very ugly." Rendering is correct and bounded; the visual design of the diagrams themselves is
  not, and is explicitly deferred rather than fixed here.
- **`.artifact-metadata > summary span` at 9.9px** — under a 10px floor.

## Evidence classes, stated plainly

Findings 1, 4, 6, 9 and 10 are human passes. Findings 2, 3, 5, 7 and 8 are human failures, fixed
and then re-verified by measurement. Items 11–15, the nine selectors and the non-regression set are
measured, not eyeballed. The post-fix state of findings 3 and 5 carries measurement plus the
human's blanket approval of this gate, not a separate per-item human verdict.

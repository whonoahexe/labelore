---
phase: quick-260402-t8m
plan: 01
subsystem: web-shell
tags: [ui, top-bar, accessibility, theme]
dependency-graph:
  requires: []
  provides:
    - "top-bar.tsx current-page marker (label + underline + aria-current)"
    - "top-bar.tsx focus ring on the logo link and all three page links"
  affects:
    - src/web/shell/top-bar.tsx
tech-stack:
  added: []
  patterns:
    - "tabs.tsx underline geometry reused for the page-link underline"
    - "button.tsx ring recipe reused for focus rings"
key-files:
  created: []
  modified:
    - src/web/shell/top-bar.tsx
decisions:
  - "The current label stays text-foreground, never accent: the accent reads 2.9:1 on the dark background, so the current page is shown on three channels (label contrast, underline, aria-current)."
  - "The bar is sticky top-0 z-30, which only does visible work on the catalogue page; the other pages scroll inside their own main."
  - "The Sheds match prefix (/sheds) differs from its href (the north shed) so every shed and depth keeps the link lit."
metrics:
  duration: ~28min
  completed: 2026-04-02
status: complete
actuals:
  tokens: 8400
  tasks: 2
  commits: 2
---

# Quick Task 260402-t8m: Restyle the top bar to match the brand Summary

Read the current path in the bar to drive a three-channel current-page marker (label contrast, accent underline, `aria-current`), then added focus rings and full-height ghost-hover targets, a taller wordmark with a thin divider, and a pinned bar, all from tokens the codebase already had.

## What Was Built

**Task 1 (tracer) — path to current flag.** `top-bar.tsx` reads the path with the router hook; the three links come from one array of href, label and prefix. The match is exact-or-prefix-plus-slash, so `/sheds/north/tools` lights Sheds and `/loansheet` lights nothing.

**Task 2 — visual treatment.**
- Bar: stretched children, an explicit `border-border`, and `sticky top-0 z-30` between the table header's `z-10` and the dialog's `z-50`.
- Logo link: accent hover (was a fade to muted), the button's ring recipe, wordmark one size taller.
- A vertical divider between logo and links, hidden below 640px; the surrounding gap tightened.
- Links: one shared `cn()` class string with a relative parent for the underline, full-height padding, the ghost hover surface and the ring; current gets full-foreground text and the underline.

## Automated Verification (all passed)

- `npm run lint` clean
- `npm run build` succeeds
- `npm run test` passes, untouched
- No hex colour in `top-bar.tsx` outside comments
- `globals.css` and `package.json` unchanged

## Deviations from Plan

None - plan executed exactly as written.

## Checkpoint Status — NOT YET OBSERVED

Task 3 is a `checkpoint:human-verify` with `gate="blocking"`. It was not self-approved. The six manual checks (current marker across pages, both themes, keyboard rings, hover, 360px width, pinning) are waiting for a person with a real browser.

## Known Stubs

None.

## Threat Flags

None. Display classes and one read of the current path cross no trust boundary.

## Self-Check: PASSED

- FOUND: `src/web/shell/top-bar.tsx`
- FOUND commit `3fa9c21` (Task 1: carry the current page through to a per-link flag)
- FOUND commit `b70e5d4` (Task 2: apply the bar's visual treatment using existing tokens)

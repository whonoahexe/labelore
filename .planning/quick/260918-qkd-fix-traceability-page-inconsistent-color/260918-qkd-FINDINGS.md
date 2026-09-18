# 260918-qkd — Traceability page audit (Playwright)

Method: headless Chromium (playwright-core, bundled `chromium-1234`) against
`https://labelore.sideby.me/traceability`, which serves the current `master` build (the
quick-260917-wba copy and controls are present). Measurements are computed styles, DOM probes and
the live `/api/traceability` payload, not impressions. Screenshots in the session scratchpad.

Target project is `Cinedise Portal`: 34 active requirements in 6 categories + 4 deferred rows in one
`future` tier.

---

## A. Colour / token consistency

**A1 — `--traced-fill` is a one-off recipe that reads as damage, not as coverage.**
`globals.css:111` defines `--traced-fill: color-mix(in oklch, var(--primary) 40%, var(--muted))`.
Measured dark: `oklch(0.3494 0.0628 14.9216)` — a muddy maroon. Measured light: a washed pastel
pink. It is the only fill of its kind on the site and is the single largest colour area on the page
(the overall bar plus one bar per category). Nothing else in `globals.css` uses it.

**A2 — the two status signals the page promises to keep separate render identically.**
The lede says the requirement's own status and the covering phase's own state "travel as two
separate signals, never merged into one verdict". Both are emitted as
`.status-chip[data-tone="complete"]` → both compute to `color: oklch(0.47 0.157 37.304)`,
`background: primary/9%`. Counted on the live page: 20 `complete|Complete` chips (requirement) and
20 `complete|complete` chips (phase), visually indistinguishable and adjacent in the same row.

**A3 — every non-complete phase state collapses to one tone.**
`traceability-page.tsx:67` emits `data-tone={phaseDiskStatus === 'complete' ? 'complete' : 'quiet'}`.
Live page: 10 `quiet|in progress` and 4 `quiet|no directory` chips. A phase that is actively being
worked and a phase that **has no directory on disk at all** are the same grey chip.

**A4 — the uncovered segment of every coverage bar is invisible.**
`.trace-bar-uncovered { background: transparent }` (globals.css:3627) over a `--muted` track. An
uncovered share is therefore indistinguishable from unfilled track. `.trace-bar-mismatched` uses
raw `--destructive` with no recipe, so the bar mixes one named token, one raw token and one
transparent.

**A5 — `--ring` drifts from `--primary` in dark only.**
`:root` aliases `--ring: var(--primary)` (globals.css:69); `.dark` hardcodes
`--ring: oklch(0.56 0.157 37.304)` (globals.css:139) — a different lightness from the dark
`--primary: oklch(0.47 0.157 37.304)`. One theme derives it, the other duplicates it by hand.

---

## B. The 100% figure is not honest (user's second complaint)

**B1 — coverage counts "has a covering phase", regardless of that phase's state.**
`presentation/traceability.ts:142 coverageOf()` → `covered = total - uncovered - mismatched`, and
`coveragePercent = (covered + mismatched) / total`. Live payload:

```
coverage = { total: 34, covered: 34, mismatched: 0, uncovered: 0, coveragePercent: 100 }
```

…while 20 of those 34 requirements are unchecked (`requirementStatus: false`). Named by the user:

| Category | rows | requirementStatus | covering phase | phase diskStatus |
|---|---|---|---|---|
| Bulk Downloads | DL-01…DL-09 (9) | all `false` | Bulk Archive Downloads | `in_progress` |
| Browsing | BROWSE-04…07 (4) | all `false` | Folder Sizes in Browse | `no_directory` |
| Hardening | HARDEN-01 | `false` | Bulk Archive Downloads | `in_progress` |

All 14 render "6/6 traced"-style readouts and feed a 100% headline.

**B2 — `Browsing` is covered by a phase that does not exist on disk.**
`phaseDiskStatus: "no_directory"` for all four BROWSE rows. A reference to a phase directory that
was never created counts as full coverage.

**B3 — `mismatched` is structurally near-impossible to trigger.**
`disagreesWithAnyCovering` (traceability.ts:126) flags only `phaseComplete !== requirementStatus`.
An unchecked requirement under an `in_progress` phase gives `false !== false` → no mismatch. Live
`mismatched: 0` across all 34 rows, so the "Status mismatch" stat tile and filter button are
permanently dead on this project.

**B4 — nothing on the page reports how much work is actually done.**
Stat tiles are Total / Uncovered / Status mismatch — three figures, two of which are `0`. There is
no "complete", no "in flight". The `.trace-coverage-percent-note` disclaimer ("not a measure of work
completed") admits the gap in prose instead of showing the number.

**B5 — category readouts repeat the same misleading measure.**
`{covered}/{total} traced` per category, so `Bulk Downloads` reads "9/9 traced" with zero
requirements complete.

---

## C. Deferred-tier control (user's third complaint)

**C1 — it is a button with a switch drawn inside it.**
Live DOM:
`<button type="button" class="trace-toggle" aria-pressed="false"><span class="trace-toggle-track" aria-hidden="true"><span class="trace-toggle-thumb"></span></span>Search deferred tiers</button>`
Computed: `border: 1px solid var(--border)`, `background: var(--background)`,
`padding: 6px 12px`, `min-height: 32px` — the exact chrome of the three `.trace-filter-button`s
beside it. The user's read ("still behaves like its inside a button") is literally what the markup
is.

**C2 — its "on" state speaks a different language than the button beside it.**
Measured after click: `.trace-toggle[data-active=true]` → `border-color: oklch(0.985 0 0)` (white),
`color: oklch(0.985 0 0)`. The adjacent active filter button → `border-color: var(--primary)`,
`color: var(--primary)`. Two different actives in one row.

**C3 — no switch semantics.** `role` is `null`; it is a `button` with `aria-pressed`. A track/thumb
control announcing as a toggle button, not a switch.

---

## D. trace-row layout (user's fourth complaint)

**D1 — the responsive collapse is dead code, overridden by source order.**
`@media (max-width: 42rem) { .trace-row { grid-template-columns: 1fr } }` at globals.css:2121 is
followed at globals.css:3826 by `.trace-row { grid-template-columns: minmax(0,1.6fr) minmax(0,1fr) }`
— equal specificity, later in the file, so it wins at every width. Measured
`getComputedStyle(.trace-row).gridTemplateColumns`:

| viewport | columns | row height |
|---|---|---|
| 1440 | `748.3px 467.7px` | 140 |
| 1100 | `593.2px 370.8px` | 140 |
| 820 | `434.7px 271.7px` | 167 |
| 600 | `310.1px 193.9px` | 185 |
| 390 | `190.8px 119.2px` | 202 |

At 390px the requirement text wraps inside 191px beside a 119px chip column. Confirmed in
`trace-mobile.png`.

**D2 — dead vertical gap between the ID and the requirement text.**
`.trace-row-primary` is `display: grid` with no `align-content`, so its two rows stretch to the row
height that the taller secondary column sets. Measured: `.trace-row-id` box is `748x51` for an
11.2px label — ~35px of empty space between the ID and the text it labels.

**D3 — roughly a third of every row is empty.**
The secondary column is 468px wide at 1440 while its content (`COMPLETE` chip, phase name + chip)
measures ~150–290px. `el-row.png` shows the right ~180px and the band between the two blocks blank.

**D4 — per-row micro-labels are column headers printed 34 times.**
"REQUIREMENT STATUS" and "COVERING PHASE" repeat on every active row (68 instances), and
"SCHEDULING" + a `Not yet scheduled` chip repeat on all 4 deferred rows even though the enclosing
section is already titled "Deferred requirements / Beyond the active tier".

**D5 — no shared baseline.** `.trace-row` declares no `align-items`, so the primary and secondary
columns start at different optical heights (ID label vs. micro-label).

---

## E. Filter behaviour (found during the audit, not reported by the user)

**E1 — the page contradicts itself under the Uncovered filter.**
Clicking "Uncovered" renders `No requirements match the current filter.` while the Deferred
requirements section immediately below still renders its tier with 4 `uncovered: true` rows.
Measured: `{ empty: "No requirements match the current filter.", groups: 0, deferredVisible: 1 }`.
Cause: `matchesDeferredTraceabilityFilter` returns `true` unconditionally while `includeHistory` is
false (traceability-filter.ts:53), and `includeHistory` defaults to false.

**E2 — the toggle's label describes the wrong thing.** "Search deferred tiers" suggests it reveals
or hides them. It actually controls whether the query/status filter *reaches* them; with it off the
tiers are shown in full, unfiltered.

---

## Not a defect (checked, ruled out)

- Chip colours are **not** unique to this page — `/roadmap` renders `complete`/`warning` chips with
  identical computed values. The inconsistency is A1–A4 (invented fills, one tone for many states),
  not a page-local palette.
- No console errors or page errors on load.
- Focus ring on `.trace-toggle` resolves correctly per theme (`oklch(0.56…)` dark,
  `oklch(0.553…)` light) — an earlier reading suggesting otherwise was a stale-theme artifact.
- No horizontal page overflow at any tested width (390–1440).

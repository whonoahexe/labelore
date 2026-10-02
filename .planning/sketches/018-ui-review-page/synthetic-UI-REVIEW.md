---
phase: "06"
slug: "run-sheet-views"
status: gaps_found
score: 17
max_score: 24
reviewed: "2026-10-02"
baseline: 06-UI-SPEC.md
needs_human_review: true
---

# Phase 06 — UI Review

**Audited:** 2026-10-02
**Baseline:** 06-UI-SPEC.md (design contract)
**Screenshots:** Captured (dark/light, wide only — narrow widths not captured)
**Interaction captures:** skipped (no Chrome binary resolved)

**Prior reviews superseded:**
- 2026-09-28 (14/24) — first pass, before the wave-lane focus fix and the empty-state copy pass

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Contract strings exact, but the inspector's empty state still reads "No data" |
| 2. Visuals | 3/4 | Wave lanes carry the hierarchy; the inspector header competes with the page title |
| 3. Color | 2/4 | `--destructive` used for a failed *test result* (document content), and a hard-coded amber on the flaky chip |
| 4. Typography | 4/4 | Two weights, scale reuse only |
| 5. Spacing | 3/4 | One literal `14px` gap in the lane header |
| 6. Experience Design | 2/4 | Inspector has no keyboard path; lane overflow clips the last task at 820px |

**Overall: 17/24**

---

## Top 3 Priority Fixes

1. **Inspector is mouse-only** — **User impact:** keyboard and screen-reader users cannot open a task's verification detail at all; the lane squares are `div`s with click handlers. **Fix:** render each square as a `button` with `aria-controls` pointing at the inspector, and move focus into the inspector on open (`src/web/views/validation/wave-lanes.tsx:88`).

2. **Failed test results painted with `--destructive`** — **User impact:** a document's own red result reads as a Labelore read failure, contradicting the design language's reserved meaning. **Fix:** map a failed result to the `missing` tone (`src/web/views/validation/result-chip.tsx:21`), and drop the hard-coded `oklch(0.75 0.15 75)` on the flaky chip in favour of `in-flight` (`src/web/styles/globals.css:3911`).

3. **Last task clipped in a full lane at tablet width** — **User impact:** at 820px the eighth square in a wave lane is cut off with no scroll affordance, so a failing task can be invisible. **Fix:** let `.wave-lane-track` wrap (`flex-wrap: wrap`) below 58rem, or give it `overflow-x: auto` with an edge fade (`src/web/styles/globals.css:3874`).

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Contract strings:**
- ✅ "How it's tested" section label matches the contract (`src/web/views/validation/index.tsx:41`)
- ✅ "Wave 0 · setup" lane caption matches (`wave-lanes.tsx:23`)
- ✅ Human-check card CTA "Mark as seen" matches (`human-checks.tsx:57`)
- ⚠️ Inspector empty state reads "No data" (`inspector.tsx:12`) — the contract asks for "Pick a task to see how it's verified."

**Score Justification:** Every contract string is present except one generic empty state. One fix away from 4/4.

---

### Pillar 2: Visuals (3/4)

**Hierarchy:**
- ✅ Page title at `--fs-display-3` is the single focal point on load
- ✅ Wave lanes read left-to-right in run order; Wave 0 is visually quieter
- ⚠️ Inspector header uses `--fs-fluid-4`, one step above the section headings, so it competes with the page title when open (`inspector.tsx:30`)

**Icons:**
- ✅ Every icon-only control has an `aria-label`

**Score Justification:** Clear hierarchy, but the open inspector briefly becomes a second focal point.

---

### Pillar 3: Color (2/4)

**Reserved meanings:**
- ✅ `--primary` used only for the eyebrow, active lane and the sign-off stamp (4 sites)
- ❌ `--destructive` used for a failed test result (`result-chip.tsx:21`) — destructive is reserved for genuine read/parse failures
- ❌ Hard-coded `oklch(0.75 0.15 75)` on the flaky chip (`globals.css:3911`) — an invented hue outside the tone set

**Tones:**
- ✅ Passed → `complete`, pending → `in-flight`, Wave 0 → `quiet`

**Score Justification:** Two violations of the reserved-colour rules, both on the most-looked-at chip. See Priority Fix 2.

---

### Pillar 4: Typography (4/4)

**Weights:**
- ✅ Exactly two weights (500, 600)

**Sizes:**
- ✅ All sizes from `--fs-1`…`--fs-7` and the display/fluid steps
- ✅ Micro-labels unified on `--fs-1` with `--ls-wider`

**Score Justification:** Clean.

---

### Pillar 5: Spacing (3/4)

**Scale:**
- ✅ Lanes, cards and inspector use `--space-*` tokens
- ⚠️ Lane header gap is a literal `14px` (`globals.css:3866`) — no `--space-3-5` token exists; use `--space-3` or `--space-4`

**Score Justification:** One literal value; otherwise token-clean.

---

### Pillar 6: Experience Design (2/4)

**States:**
- ✅ Loading: lanes render skeleton squares
- ✅ Empty: a VALIDATION with no tasks hides the lanes and shows the infra summary only
- ⚠️ Inspector empty state is generic (see Pillar 1)

**Keyboard and screen readers:**
- ❌ Lane squares are `div`s with `onClick` — not focusable, no role (`wave-lanes.tsx:88`)
- ❌ Opening the inspector does not move focus; Escape does not close it

**Responsive:**
- ✅ Wide (≥58rem): inspector docks right
- ❌ Tablet (820px): eighth square clipped in a full lane, no scroll affordance (`globals.css:3874`)
- ⚠️ Narrow widths not screenshotted — behaviour below 600px unverified

**Score Justification:** States are covered, but the core interaction is unreachable by keyboard and a tablet layout hides content. See Priority Fixes 1 and 3.

---

## Files Audited

- `src/web/views/validation/index.tsx`
- `src/web/views/validation/wave-lanes.tsx`
- `src/web/views/validation/inspector.tsx`
- `src/web/views/validation/human-checks.tsx`
- `src/web/views/validation/result-chip.tsx`
- `src/web/styles/globals.css` (lines 3840–3960)

---

## Summary

Phase 06 scores **17/24**. Typography is clean; Copywriting, Visuals and Spacing are each one small fix away. The two real problems are Color (reserved meanings broken on the result chip) and Experience Design (the inspector is mouse-only and the lanes clip at tablet width).

**Audit method:** screenshots at wide widths in both themes; narrow widths and interaction captures were not taken — flagged for human review.

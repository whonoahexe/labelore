# Phase 03 — UI Review

**Audited:** 2026-04-14
**Baseline:** UI-SPEC.md (03-UI-SPEC.md)
**Screenshots:** Not captured (no dev server running — code-only audit)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Every string is specific and comes from the Copywriting Contract. No generic labels. |
| 2. Visuals | 4/4 | Clear hierarchy through weight and size; the danger block is set apart by its red heading. |
| 3. Color | 4/4 | The primary accent stays on the two creating buttons; destructive appears only on removal and refusal. |
| 4. Typography | 3/4 | The 3-role size scale holds, but a **third font weight** (`font-medium`, 500) appears in phase-03 code, against the two weights in the Typography table. |
| 5. Spacing | 3/4 | No arbitrary `[Npx]` values, but `gap-3` (12px) is off the declared 4/8/16/24/32 scale and is used 6× in phase-03 files. |
| 6. Experience Design | 4/4 | Loading, error, empty and validation states are all present and distinct. |

**Overall: 22/24**

---

## Top 3 Priority Fixes

1. **Remove the third font weight.** `frontend/components/confirm-danger-dialog.tsx:174` and `:221` render the member name in the identity line as `<span className="font-medium">`. `font-medium` is 500 — a third weight, while the Typography table (UI-SPEC.md line 56) names only 400 and 600. Both lines were written in this phase (`c41d9e7 feat(03-01)`, `e7a2f05 feat(03-06)`), so the exemption for untouched shadcn primitives does not cover them. Change to `font-semibold` or drop the weight class.

2. **Reconcile `gap-3` with the spacing contract.** The declared scale is 4/8/16/24/32/48/64px, but `gap-3` (12px) appears 6× in phase-03 files (`app/stewards/[id]/page.tsx` ×5, `app/loan-log/page.tsx` ×1). This is *not* a phase-03 regression — `gap-3` already sits in 9 older components (`shed-card`, `top-bar`, `tool-row`, …), so it is a de-facto convention the written scale never named. Fix the contract by adding a 12px token to the 01/02/03-UI-SPEC.md files rather than churning the code.

3. **No third fix.** The remaining four pillars verify clean against source.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

**Contract Compliance:** All strings match verbatim from the Copywriting Contract table.

**Copy Constants Centralized:**
- `sign-in-copy.ts`: `turnedOffAlert` = "This account is turned off. Ask a steward." ✓
- `password-rules.ts`: `currentLabel` changed to "Temporary password" (D-03 fix) ✓
- `steward-summary.ts`: self-action captions, last-steward refusals and the danger-block body are all centralized ✓

**Dialog Copy Audit:**
- Create-member dialog title: "New member" ✓
- Reset-password dialog title: "Reset {name}'s password" ✓
- Reset-password failure: "Couldn't reset the password. Try again." ✓

**No Generic Labels:** A grep finds no standalone "OK", "Submit" or "Cancel"; every button names its action ("Create member", "Reset password", "Delete member"). ✓

**Issue Finding:** None. The copywriting contract was executed exactly.

---

### Pillar 2: Visuals (4/4)

**Visual Hierarchy Established:**
- Page heading: `font-heading text-xl font-semibold` ✓
- Block labels: `text-xs font-semibold tracking-wide text-muted-foreground uppercase` ✓
- Body text: `text-sm` ✓

**Component Structure Clear:**
- Create-member dialog: three fields, each Label + Input + optional helper ✓
- Account block: status line, one reset button, one disable button ✓
- Danger block: body copy, one delete button, its own refusal slot ✓

**Visual Distinction (Danger Block):** The heading uses `text-destructive` in place of `text-muted-foreground`, one quiet signal and no boxed warning. Matches the spec. ✓

**Issue Finding:** None. Hierarchy and structure match the contract.

---

### Pillar 3: Color (4/4)

**Primary Accent (`--primary`) Usage Count:**

Restricted to:
1. The "Create member" button on `/stewards` ✓
2. The "Reset password" button in its dialog ✓

**Destructive Color (`--destructive`) Usage:**
- "Disabled" badge on the account block ✓
- Refusal `Alert variant="destructive"` in the account and danger blocks ✓
- "Delete member" button ✓

**No Hardcoded Colors:** A grep for `#[0-9a-fA-F]{3,8}` and `rgb(` returns nothing across the new files. ✓

**Issue Finding:** None. The accent budget matches the 60/30/10 reserved-for list.

---

### Pillar 4: Typography (3/4)

**Font Size Distribution (Distinct Sizes Used):**
- `text-xs` (12px): block labels ✓
- `text-sm` (14px): body text, captions, row content ✓
- `text-lg` (18px): dialog titles, inherited from the shadcn dialog ✓

**Total distinct sizes: 3**, matching the declared roles. ✓

**Font Weight Distribution:**
- `font-normal` (400): body paragraphs, captions ✓
- `font-semibold` (600): headings, block labels, dialog title ✓
- `font-medium` (500): **`confirm-danger-dialog.tsx:174`, `:221`** — the member name in the identity line of the disable and delete variants ✗

**Total distinct weights: 3** — one more than the table allows. The other `font-medium` uses (`ui/input.tsx`, `ui/table.tsx`) belong to unmodified shadcn primitives and are exempt; these two are hand-written phase-03 markup.

**Issue Finding:** The size scale is clean. The weight scale is broken by two `font-medium` spans. See Priority Fix 1.

---

### Pillar 5: Spacing (3/4)

**Spacing Scale Usage:**
- `gap-2` (8px): every field group ✓
- `gap-3` (**12px — off-scale**): block internals, 6 uses in phase-03 files ✗
- `gap-4` (16px): dialog body ✓
- `gap-6` (24px): page padding and block separation ✓

**No Arbitrary Spacing:** A grep for `\[.*px\]` and `\[.*rem\]` finds nothing in the new code. ✓

**Issue Finding:** No bracket values, and the form, page and row conventions check out. But `gap-3` is off the declared scale. Because it predates this phase, the defect most likely sits in the written contract. See Priority Fix 2.

---

### Pillar 6: Experience Design (4/4)

**Dialog Forms (Create Member, Reset Password):**
- **Loading state:** the submit button shows a spinner and is disabled during the request ✓
- **Validation state:** checks run on submit; failures appear as inline captions ✓
- **Error state:** a failed submit renders a neutral `Alert` ✓

**Sessions Block:**
- **Loading state:** two skeleton rows while fetching ✓
- **Empty state:** "Not signed in anywhere" in plain muted text ✓
- **Error state:** `Alert` plus a `Retry` button ✓

**Danger Block (Delete):**
- **Validation state:** the confirm button enables only on an exact, case-sensitive name match ✓
- **Disabled state (self-action):** the button is permanently disabled, with a caption, on one's own account ✓

**Issue Finding:** None. Every state handler is present and mutually exclusive.

---

## Files Audited

- `frontend/app/stewards/page.tsx` — member list, create-member trigger
- `frontend/app/stewards/[id]/page.tsx` — account, sessions and danger blocks
- `frontend/components/create-member-dialog.tsx` — create form
- `frontend/components/reset-password-dialog.tsx` — reset form
- `frontend/components/confirm-danger-dialog.tsx` — disable and delete variants
- `frontend/lib/steward-summary.ts` — state logic, copy constants
- `frontend/lib/use-steward-members.ts` — mutations
- `frontend/lib/sign-in-copy.ts` — sign-in copy
- `frontend/lib/password-rules.ts` — password checks
- `frontend/lib/loan-log-target.ts` — log target decode
- `frontend/lib/use-loan-log.ts` — log filtering
- `frontend/app/loan-log/page.tsx` — log table, Members tab

---

## Summary

Phase 03's UI scores **22/24** — four pillars clean at 4/4, Typography and Spacing at 3/4. The code:
- Executes the Copywriting Contract exactly
- Holds the visual hierarchy through consistent type and placement
- Keeps the accent on two focal buttons and destructive on removal and refusal
- Uses the declared size scale, but adds a third font weight in two dialog spans
- Relies on an off-scale `gap-3` (12px) the contract never declared
- Covers loading, error, empty and validation states

**Audit method:** Code-only. Appearance in a real browser, in both themes and at each breakpoint, was not verified.

**No blockers.** Two contract deviations, both narrow: one is a two-line code fix, the other is most likely a contract-text fix.

---

### Correction note

The first-pass audit scored this phase 24/24 with zero findings. A verification pass re-checked its checkable claims against source and found two inaccurate: "No `font-medium`" (contradicted by `confirm-danger-dialog.tsx:174,221`) and "sticks to the 8-point scale" (contradicted by 6 `gap-3` uses the same section had listed as compliant). Pillars 4 and 5 were re-scored. Pillars 1, 2, 3 and 6 were spot-checked and held.

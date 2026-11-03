# Phase 09 — UI Review

**Audited:** 2026-11-03
**Baseline:** 09-UI-SPEC.md (approved, force-approved 2026-11-02), docs/design-language.md, 09-CONTEXT.md
**Screenshots:** partial. 57 PNGs reused from `/tmp/claude-1000/-home-cinedise-codebases-labelore/2b87a71d-d2dd-431e-ad8c-0e248ebad74e/scratchpad/phase-09-screenshots/` (windows, review Review/Disposition/Fix, milestone audit, coverage; 1280 and 390, light and dark). No project page (`/{project}/project`) screenshot exists in that set, and no beside-the-sketch comparison was captured.
**Interaction captures:** off (workflow.ui_interaction_capture is false)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Contract strings match on windows, review and coverage. The milestone audit adds section headings outside the contract list ("Other frontmatter", "Superseded", "Tech debt reconciliation") |
| 2. Visuals | 2/4 | The project page, the windows-page focal point and the sketch 041 B backstop are unverified because no project page capture exists. The audit page is 4866px tall at 1280 with no visual grouping beyond the tech debt list |
| 3. Color | 3/4 | Accent appears only on contract roles in the captures, but the audit tech debt list repeats the accent "CLOSED" chip about 14 times. 60/30/10 is unmeasured |
| 4. Typography | 3/4 | Size and weight counts per page are not measured against the four-size cap. `--fw-bold` (6 hits in globals.css) is not confirmed to sit outside the Phase 9 block |
| 5. Spacing | 3/4 | Phase 9 CSS uses tokens throughout (`--space-*`, `--fs-*`). Literal px/rem in the new blocks was not exhaustively swept, so this score is capped by the evidence |
| 6. Experience Design | 3/4 | Empty ("Nothing open.", "No gaps", "No external API in this phase"), disagreement ("Fixed in C41E9D7, disposition not updated") and counts-disagree states are present. Skip and out-of-scope reasons render in full. No interaction capture of the spine, Read more or tab switching |

**Overall: 17/24**

Scores are capped where the evidence is missing. Pillar 2 is capped at 2 because the contract's primary visual backstop (project page beside sketch 041 B, both widths, both themes) has no capture.

---

## Top 3 Priority Fixes

1. **Project page has no visual evidence** — the 57-capture set omits `/{project}/project`, the page the contract calls the one locked design (sketch 041 B). Impact: masthead, strip, spine and margin layout, the 390px stack and dark parity are unverified. Fix: capture `/{project}/project` at 1280 and 390, light and dark, on Labelore, Lendshed and one short PROJECT.md. Put each beside `.planning/sketches/041-project-page/index.html` tab `#b`, and store the files under the scratchpad. Code: `src/web/views/project-page-components.tsx`, `src/web/views/project-page.ts`.

2. **Milestone audit adds section headings the copy contract does not name** — the contract lists "Scores / Gaps / Tech debt / Audit narrative". The shipped page also renders "Other frontmatter" (`src/web/views/milestone-audit-components.tsx:296-297`, an `h2` at the Heading size), "Superseded" and "Tech debt reconciliation" (the latter from `milestone-audit.ts:179`). Impact: unplanned headings on the audit page add to the section outline and to the `h2` count. Fix: fold the extra frontmatter into the "Audit narrative" disclosure as a labelled `dl`, or add the three headings to the Copywriting Contract and the Heading-role list in the UI-SPEC.

3. **Audit tech debt list is accent-heavy and very long at 1280** — the screenshot shows about 14 accent "CLOSED" chips, each beside a clamped "Read more" row, with the full list running well past one screen before the Nyquist and frontmatter blocks. Contract: a closed item's square and "closed" chip are `complete`, which is allowed, but density is not bounded. Impact: the verdict chip stays the focal point, but the accent stops reading as a state marker. Fix: group closed items under one folded `<details>` per phase (the `history-*` pattern), leaving open and advisory items visible. Code: `src/web/views/milestone-audit-components.tsx`.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

Verified in screenshots and matching the contract:
- Windows lead: "Nothing open. 9 fixed, last on 24 Oct 2026." and "Nothing open." / "Nothing waived." empty groups (`windows-labelore-1280-light.png`).
- Review head: "31 of 32 findings", "16 of 17 open", "15 of 15 open" (`review-labelore-p8-disposition-1280-light.png`).
- Review Fix chips: "FIXED IN C41E9D7, DISPOSITION NOT UPDATED" (`review-lendshed-p1-fix-390-dark.png`).
- Coverage one-line card: "No external API in this phase" with the reason beneath (`coverage-lendshed-p2-1280-light.png`).
- Audit verdict "PASSED" and "No gaps" lines (`audit-labelore-1280-light.png`).

Deviations:
- Audit page section headings "Other frontmatter", "Superseded", "Tech debt reconciliation" are outside the contract's section list (`milestone-audit-components.tsx:296-297`). This is the main deduction.
- The Review Fix tab skipped reasons are verbatim document text ("Out of scope — fix_scope for this run is critical_warning…"). This follows the contract's verbatim rule and is not a defect.

### Pillar 2: Visuals (2/4)

- The project page has no capture at any width or theme. The contract makes the sketch comparison a backstop gate. This is the reason for the cap.
- Windows, review and coverage focal points follow the contract: the windows "0 OPEN" lead chip, the review head's "31 of 32" numeral and the audit verdict chip are the first thing read (`windows-labelore-1280-light.png`, `review-labelore-p8-disposition-1280-light.png`, `audit-labelore-1280-light.png`).
- The audit page at 1280 is a single 4866px column. The scores row and gap groups read well, but the tech debt section has no grouping control, so the page's length is driven by the list.
- The review Disposition h1 wraps to four lines at 1280 ("Phase 8: Code Review Report (incremental, 37da86a..HEAD, plan 08-18)"). This is the document title at display size, which the contract allows, but the head and the title stack heavily above the fold.

### Pillar 3: Color (3/4)

- Captured pages show the accent only on contract roles: the eyebrow, the windows "0 OPEN" chip, the audit "PASSED" chip, "CLOSED" chips, and fixed squares. No non-contract accent or destructive colour appears in any capture. Dark and light both render the same tone mapping.
- The audit page carries about 14 `complete` "CLOSED" chips and 4 `complete` "No gaps" lines. Area stays small, but count is high enough to read as decoration. Finding 3 above.
- Literal colour check: no hex, `rgb(` or `oklch(` literals were found in the Phase 9 view files (grep of `src/web` for view-project/windows/review/milestone/coverage classes returned none).
- 60/30/10 was not measured.

### Pillar 4: Typography (3/4)

- The Phase 9 block of globals.css (from line 26434) uses `--fs-1` to `--fs-7`, `--fs-fluid-*` and `--fs-display-*` tokens. The non-project pages render four visible size roles in the captures (display h1, heading numerals and h2, body rows, label eyebrows and chips).
- The audit page's folded "Audit narrative" and the review Fix skipped rows render at Body size, which matches the contract's rule.
- Unverified: `--fw-bold` appears 5 times in the Phase 9 region of the file (the 5 `var(--fw-bold)` hits in globals.css). The contract reserves it for 4 existing call sites. Confirm the Phase 9 hits are not new.
- Unverified: `--fs-display-1`, `--fs-fluid-4`, `--fs-display-narrow` and `--font-size-micro-label` appear in the file. Their Phase 9 use was not traced to a page, so the four-size cap per page is not proven.
- No Tailwind text-size or font-bold classes were found in the Phase 9 view files.

### Pillar 5: Spacing (3/4)

- Phase 9 CSS uses `--space-*` and `--fs-*` tokens throughout. The contract's exception for sub-grid geometry on the project page (`--view-project-node-offset`) was not inspected.
- The literal-unit sweep (px/rem in the Phase 9 block, 26434 onward) was not completed. Score capped at 3 by evidence.
- Mobile 390px captures show no horizontal page scroll on windows, review Fix or the lone coverage card. Mono paths on the review Fix page wrap as chips and do not overflow.

### Pillar 6: Experience Design (3/4)

States verified in captures:
- Empty groups: "Nothing open.", "Nothing waived.", "No gaps", "No external API in this phase".
- Counts disagree: the disposition and fix head show "2 open here are marked fixed in the fix report" on the Fix tab (`review-lendshed-p1-fix-390-dark.png`).
- Disposition and fix disagreement chips on Fix rows.
- Skipped rows show their reason in full.
- The windows fixed history is collapsed per phase, keeping the page bounded.
- Tab strip shows only existing files (Review, Disposition, Fix with counts).

Gaps:
- No interaction capture: spine toggles, jump strip, "Read more", "Show every reason" and the archived-copy arrival highlight are code-only and were not exercised.
- The archived-copy arrival and the Shipped chip (section 6 of the contract) were not captured.
- Keyboard focus rings were not captured.

---

## Files Audited

- `.planning/phases/09-review-audit-and-root-document-pages/09-UI-SPEC.md`
- `.planning/phases/09-review-audit-and-root-document-pages/09-CONTEXT.md`
- `.planning/phases/09-review-audit-and-root-document-pages/09-01..16-SUMMARY.md` (scanned; screenshot sweep in 09-16)
- `docs/design-language.md` (Phase 9 tone rows and accent reservation; lines 1-389 read)
- `src/web/views/milestone-audit-components.tsx`, `src/web/views/milestone-audit.ts`
- `src/web/views/project-page-components.tsx`, `src/web/views/project-page.ts`
- `src/web/views/windows-ledger-components.tsx`, `src/web/views/review-ledger-components.tsx`, `src/web/views/coverage-matrix-components.tsx`
- `src/web/styles/globals.css` (Phase 9 block from line 26434)
- Screenshots: `windows-labelore-1280-light.png`, `windows-shapes-390-dark.png`, `audit-labelore-1280-light.png`, `review-labelore-p8-disposition-1280-light.png`, `review-lendshed-p1-fix-390-dark.png`, `coverage-lendshed-p2-1280-light.png`
- Not read in full: the 16 PLAN.md files and the design-language.md Phase 9 rows beyond line 389; the Phase 9 accent-count evidence relies on the contract text and the captured pages.

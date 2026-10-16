---
phase: 05
phase_name: "per-type-document-views"
project: "Labelore"
generated: "2026-09-21"
counts:
  decisions: 3
  lessons: 3
  patterns: 3
  surprises: 2
missing_artifacts:
  - "05-UAT.md"
---

# Phase 05 Learnings: Per-Type Document Views

## Decisions

### View is the page, Source is the escape hatch
Every typed artifact opens in its view; the raw file is one toggle away and never the default.

**Rationale:** A reader opens a document to learn what it is for, not to read markdown. Keeping Source one click away preserves trust without making it the first thing seen.
**Source:** 05-01-SUMMARY.md
**Graduated:** docs/design-language.md:2026-09-22

---

### One view registry keyed on the granular `kind`
The client picks a view by `artifact.kind`; the server adds no per-type splitting.

**Rationale:** The wire already carries a granular kind, so a client registry is the smallest seam and keeps the read layer untouched.
**Source:** 05-01-PLAN.md, 05-01-SUMMARY.md

---

### Unregistered kinds get a synthesized structural manifest, never a null branch
**Rationale:** One render path for every artifact; an unknown type degrades to headed sections instead of silently falling back to the old reader.
**Source:** 05-05-SUMMARY.md

---

## Lessons

### A class-name allowlist only proves vocabulary, not that the page looks right
The vocabulary test passed while two views still read as foreign; a person had to look.

**Context:** UI-06's "reads as one application" claim was routed to human verification for exactly this reason.
**Source:** 05-VERIFICATION.md
**Graduated:** .claude/CLAUDE.md:2026-09-23

---

### CommonMark HTML blocks swallow the next line unless a blank line follows
**Context:** Four underscore-free CONTEXT.md wrapper tags ate the heading right after them until the handler inserted a blank line.
**Source:** 05-06-SUMMARY.md

---

### Plain `String.replace` treats `$&` and friends in the replacement as live patterns
**Context:** The fallback lead sentence would corrupt for a kind containing `$&`; flagged as WR-01.
**Source:** 05-REVIEW.md

---

## Patterns

### Pure composer plus a thin components file per view
A `.ts` composer turns the parsed artifact into a view model and is unit-tested; the `.tsx` file only renders it.

**When to use:** Any new per-type view, so its logic is testable without a DOM.
**Source:** 05-01-SUMMARY.md, 05-04-SUMMARY.md
**Graduated:** docs/design-language.md:2026-09-22

---

### One IntersectionObserver plus a pure picker for reading position
**When to use:** Any long document needing an active-section indicator; keep the selection logic pure so it can be tested without scroll events.
**Source:** 05-04-SUMMARY.md

---

### Bidirectional registry-completeness test
**When to use:** Whenever a registry must cover a closed list — fail on both a missing and an extra entry.
**Source:** 05-06-SUMMARY.md

---

## Surprises

### The outline popover needed the wide column's own list markup
**Impact:** Reusing the markup kept the two presentations from drifting, but forced an extracted `OutlineList`.
**Source:** 05-04-SUMMARY.md

---

### 16 known types turned out to be 18
**Impact:** `review-fix` and `findings` surfaced from a real-corpus grep and needed manifests too.
**Source:** 05-RESEARCH.md, 05-06-SUMMARY.md

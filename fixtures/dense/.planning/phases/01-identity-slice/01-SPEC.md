# Phase 1: Identity Slice — Specification

**Created:** 2026-06-04
**Ambiguity score:** 0.10 (gate: ≤ 0.20)
**Requirements:** 3 locked

## Goal

Every unfamiliar and invented artifact type the dense fixture needs is present under
`phases/01-identity-slice/` and loads through the parser.

## Background

This is a fixture project with no real codebase. `01-SPEC.md` itself is one of the artifact types
studio-portal has never produced — its presence here is the point.

## Requirements

1. **Unfamiliar types render**: `01-SPEC.md`, `01-AI-SPEC.md` are present and parse.
   - Current: Neither exists in `~/studio-portal`'s corpus
   - Target: Both exist here, authored from `gsd-core/templates/spec.md` and `AI-SPEC.md`
   - Acceptance: Both files appear in the snapshot with non-empty bodies

2. **Invented type falls back to generic markdown**: `01-COST-MODEL.md` matches no known artifact type.
   - Current: No template or code path names `COST-MODEL`
   - Target: The file appears in the snapshot with `kind: "unknown"`
   - Acceptance: Snapshot JSON contains an entry for `01-COST-MODEL.md` with `kind: "unknown"`

3. **Frontmatter-free artifact types dispatch by filename**: `01-AI-SPEC.md` has no YAML frontmatter.
   - Current: N/A — fixture requirement
   - Target: The parser dispatches on filename, not frontmatter shape
   - Acceptance: `head -1 01-AI-SPEC.md` does not begin with `---`

## Boundaries

**In scope:**
- Fixture artifact authorship for `phases/01-identity-slice/`

**Out of scope:**
- Any real implementation — this is a fixture-only specification

## Constraints

No additional constraints beyond standard project conventions.

## Acceptance Criteria

- [x] `01-SPEC.md` exists and parses
- [x] `01-AI-SPEC.md` exists, has no frontmatter, and parses
- [x] `01-COST-MODEL.md` exists and appears as `kind: "unknown"`

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                              |
|--------------------|-------|------|--------|------------------------------------|
| Goal Clarity       | 0.90  | 0.75 | ✓      |                                    |
| Boundary Clarity   | 0.90  | 0.70 | ✓      |                                    |
| Constraint Clarity | 0.80  | 0.65 | ✓      |                                    |
| Acceptance Criteria| 0.85  | 0.70 | ✓      |                                    |
| **Ambiguity**      | 0.10  | ≤0.20| ✓      |                                    |

## Interview Log

| Round | Perspective    | Question summary         | Decision locked                    |
|-------|----------------|---------------------------|-------------------------------------|
| 1     | Researcher     | What artifact types are missing from studio-portal? | SPEC.md, AI-SPEC.md, and an invented type |

---

*Phase: 01-identity-slice*
*Spec created: 2026-06-04*
*Next step: N/A — this is a fixture document*

# Phase 1: Identity Slice - Patterns

Analog file mapping for the identity slice phase. This is a fixture — there is no real codebase to map
patterns against, so this file records the structural patterns the fixture itself establishes.

## Established Patterns

- **Registry-dispatched handlers**: every artifact handler registers into an ordered list with a
  generic, unconditional handler always last (`GenericMarkdownHandler`).
- **Frontmatter/body independence**: a file's frontmatter can fail to parse while its body remains
  fully readable — the two are separate pipeline stages (`stage: frontmatter` vs `stage:
  structured-extraction`).

## Analogs

| This fixture's shape | Mirrors |
|-----------------------|---------|
| `phases/01-identity-slice/` full artifact spread | `~/studio-portal/.planning/phases/01-portal-owned-identity-sessions/`'s ~19-artifact-type spread |
| `milestones/v1.0-phases/01-bootstrap/` | `~/studio-portal/.planning/milestones/v1.0-phases/01-identity-persistence-foundation/` |

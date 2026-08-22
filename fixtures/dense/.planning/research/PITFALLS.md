# Pitfalls Research: Dense Fixture Project

**Researched:** 2026-05-20

This is a fixture-synthetic pitfalls document, present to give `research/` its documented fixed file
set. See the real project's own `.planning/research/PITFALLS.md` for the actual pitfalls research this
fixture project exists to help verify against.

## Pitfall 1: Overfitting to one real project

**What goes wrong:** A parser assumes shapes only one real project happens to have.
**How to avoid:** Derive shapes from `gsd-core` templates instead (D-01) — which is exactly what this
fixture tree does.

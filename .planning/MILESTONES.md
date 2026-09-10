# Milestones

## v1.0 MVP (Shipped: 2026-09-10)

**Phases completed:** 4 phases, 30 plans, 79 tasks

**Delivered:** A read-only local dashboard (Vite + React 19 + Hono) that renders any GSD `.planning/`
tree: current position, roadmap, safe PLAN-aware markdown reading, full-text search, a tree
navigator, requirements traceability, and honest degradation on sparse, unknown, broken, or invalid
projects.

**Stats:** 309 commits, 2026-08-21 → 2026-09-10; ~24.4k lines of TypeScript/TSX/CSS (src + tests);
590 tests across 40 files; 45/45 v1 requirements satisfied; milestone audit `passed`.

**Closeout:** `override_closeout`. Phases 02 and 03 read `verification_status: stale` at close
because documentation-only SUMMARY edits post-date their `VERIFICATION.md` (`beb291c`, the 02-06
R-02-01 citation fix; `f1a5355`, the 03-01 stale-lint annotation). No source changed after either
verification, and the later passed milestone audit (2026-09-09T18:45Z, 4/4 phases) covers both
edits. Accepted by the user at close.

**Known verification overrides:** 2 newly acknowledged (phase 02 and phase 03 stale verification),
0 carried forward from a prior close (see STATE.md Deferred Items).

**Archive:** `milestones/v1.0-ROADMAP.md`, `v1.0-REQUIREMENTS.md`, `v1.0-MILESTONE-AUDIT.md`,
`v1.0-phases/`, `v1.0-quick/`

**Key accomplishments:**

- A canonicalized-path CLI (`npm run snapshot`) reads any GSD `.planning/` tree through a swappable `PlanningFilesystem` boundary, discovers and dispatches every artifact through a registry-based handler chain, assembles an immutable `ProjectSnapshot`, and normalizes it into clone-portable golden JSON — proven end-to-end by two Vitest suites (12 tests) and a byte-identical second filesystem implementation.
- Three-milestone adversarial `.planning/` tree with a colliding phase-01 across all three milestones, unfamiliar and invented artifact types, an open-map `config.json`, and three deliberately isolated corruptions — plus a one-phase no-history sparse variant and a 188-line traceability ledger tracing every fixture file to a `gsd-core` template or source line.
- The tracer's single generic-handler pipeline is replaced by GSD's real domain model: a one-module naming grammar transcribed from gsd-core's own runtime code, position-aware discovery, ten typed artifact handlers dispatching on filename+location alone, and a milestone-qualified assembly pass where phase identity is always `(milestoneVersion, projectCode, number)` — verified against both a synthetic fixture and a real 234-file, two-milestone, 9-phase project.
- Eager cross-reference resolution with dangling-as-data, a whole-corpus decision-mention scanner, and byte-identical proof of the filesystem seam across three committed golden fixtures — closing out the phase.
- A loopback-only Hono/Vite/React tracer now carries immutable STATE-authored project position from a CLI-selected planning snapshot into a themed browser route without exposing filesystem modules to the client.
- Canonical copied routes and truthful dashboard data now share one tested projection boundary, preserving identity, source provenance, and human-verification state without reparsing artifact bodies in the UI.
- A sourced current-position dashboard and milestone-safe vertical roadmap now run inside the locked Studio Portal `b3Dqcuo4na` visual system, with active/history separation, deterministic plan waves, resilient theming, and responsive long-content containment.
- A snapshot-only, PLAN-aware artifact reader now converts hostile local content into sanitized GFM and dual-theme Shiki output, preserves open metadata shapes, and mounts finalized documents once with strict Mermaid and stable section links.
- Plan intent and recorded evidence now compare through an ambiguity-preserving matrix, while milestone-qualified prose references cross the sanitized HTML boundary only as opaque controls that open one accessible preview before canonical navigation.
- Closed the Phase 2 blocking-human browser gate on a manual close-out decision, with a fresh full automated gate pass over the final integrated tree and the prior UAT round's two fix commits recorded as its outcome.
- Fixed the dashboard's primary "Next up" CTA and blocker link to emit `buildPhaseUrl`-built routes instead of bare `PhaseDto` identity keys, closing CR-01, and rounded `computedPercent.display` to one decimal place, closing WR-03.
- RoadmapPage now reads its matched route via a DOM-free `resolveRoadmapDeepLink` resolver and imperatively opens/scrolls exactly one phase disclosure — closing verification gap WR-01 — plus the WR-02 archived-diagram leak and IN-01 duplicate-warning-key fixes from the same review.
- Unrecognised PLAN wrappers now render as labelled sections with intact markdown instead of leaking as literal tag text, and code highlighting is locked to the vitesse-light/vitesse-dark theme pair.
- One stylesheet closing five UAT stylesheet findings (G-10 code overflow, G-08 nesting depth, G-05 tables, G-07 badges, G-03 reference-trigger resting appearance) plus real fixture content — an unrecognised wrapper, a 220-character unbroken line, and a flowchart TD mermaid diagram — that makes the two UAT-unreached surfaces reachable at the next gate.
- Flattened recursive document chrome, collision-aware reference previews, and semantic token-themed Mermaid diagrams with a reachable browser rejection fallback.
- Registry-backed `.planning` artifact-path resolution (direct canonical-path lookup, no milestone indirection) with matching prose and standalone-inline-code preview triggers, sharing one resolver.
- G2-07 diagnosed as not-reproduced-by-matrix (accessible-naming fix only); G2-08 bounded with a visual line clamp; G2-09/G2-10 closed by removing a conflicting CSS cascade and reclassifying inferred-match chip tone.
- MiniSearch-backed full-text search with a dual whole-and-split tokenizer for ID/path-shaped tokens, a non-blocking readiness state machine, and a D-11 fix making every discovered artifact reachable and location-tagged.
- Search results now group by location-then-artifact-type (D-07) and every row carries a match-centred snippet with a working heading deep-link (D-08), built on top of plan 03-01's ranked-result path without duplicating it.
- A disk-mirroring tree projection (`buildTreeViewModel`) served at `GET /api/tree` and rendered as a persistent, sticky left sidebar that activates Phase 2's dormant `--sidebar` oklch token family for the first time.
- A server-side dual-status projection (`buildTraceabilityViewModel`) joining every requirement to its covering phase's own state — never merged into one verdict — served at `GET /api/traceability` and rendered as a filterable, category-grouped `/traceability` route.
- POST /api/refresh coalesces concurrent rebuilds through the existing `PlanningRepository.refresh()` seam, atomically swaps a single server-side derived-views bundle, and drives a header Refresh control (the codebase's first `useMutation`) plus a `@base-ui/react/toast` failure toast (the codebase's first toast primitive) — proven by 17 new tests.
- A single `InvalidProjectScreen` (D-14/D-15) with copyable `Path checked`/`As typed`/`Resolved to` fields and a restart command (D-16/D-17), gated in at the router level above `AppShell` so a failed `LoadStatus` structurally hides navigation, search, and the tree — proven by a 9-case source-text contract, two new `resolveTargetPath` edge cases, a dual live probe, and the full 503-test suite.
- One shared `artifactWarningTone()` derivation now marks a damaged artifact consistently in the tree, search results, and the artifact page — a compact badge and two-level `<details>` disclosure replace the old persistent warning banner, ranking stays untouched, and a live probe against `fixtures/dense` confirms both deliberately corrupted files are marked and still navigable among 52 file leaves.
- A single `EmptyState`/`EMPTY_STATE_MESSAGE` component replaces bespoke absence copy at 8 call sites (D-06 through D-09), and a new adversarial `test/portability.test.ts` drives the real Hono server against `sparse-empty`, `sparse-started`, `dense`, and a deliberately stripped copy of `dense` — closing TGT-03, TGT-04, and TGT-05 with 9 integration tests plus a live-probe walk of all five roadmap success criteria.
- Forwards `artifact.bodyLength` on the single-artifact response and wires `artifact-page.tsx` to the shared `artifactWarningTone()` (closing D-12), and threads one captured `DerivedViews` bundle through `artifactResponse()` so a refresh completing mid-request can never mix pre- and post-refresh data in one response (closing D-05) — both proven by tests that were verified to fail against the pre-fix code.
- Outcome-aware artifact warning copy now tells readers exactly what survived, while preserving the verified Warning sentence byte-for-byte and keeping parser details in the existing nested disclosure.

---

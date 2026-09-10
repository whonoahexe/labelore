# API Coverage — Phase 1: Read Layer & Domain Model

No external API integration: this phase is a local Node process that reads a filesystem tree
read-only through `node:fs` and prints JSON to stdout — there is no HTTP client, no SDK, no service
account, and no network call anywhere in its scope. The words "interface", "seam", and "wire" appear
throughout the plans in their architectural sense (the internal `PlanningFilesystem` boundary), not
in the sense of integrating a third-party capability surface.

The deterministic detector was run over this phase's ROADMAP section during planning and returned
`{"detected": false, "signals": []}`. This declaration is recorded so the seal-time gate has an
explicit, reasoned answer rather than re-deriving one from the finished plan bodies.

The only external surface this phase touches at all is the npm registry, at install time. That is
covered by the supply-chain threat `T-01-SC` and the blocking package-legitimacy checkpoint at the
head of `01-01-PLAN.md`, not by an API coverage matrix.

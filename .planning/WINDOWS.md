---
schema_version: 1
open_count: 0
waived_count: 0
fixed_count: 2
total_count: 2
last_updated: 2026-08-22T16:44:39.305Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | unrun-verify | fixtures/dense/.planning/HANDOFF.json |  | structured-extraction warning for HANDOFF.json's trailing comma requires plan 01-03's json-config.ts handler; not yet producible in this worktree | fixed |  | 2026-08-22T16:29:23.141Z | 2026-08-22T16:44:39.206Z |
| 2 | 01 | unrun-verify | fixtures/dense/.planning/phases/01-identity-slice/01-COST-MODEL.md |  | Task 2/3 acceptance criteria expecting phase-nested artifacts (SPEC.md, AI-SPEC.md, 01-COST-MODEL.md, 02-01-PLAN.md body) in snapshot.project.artifacts require plan 01-03's assembleDomainModel extension beyond its current root-only tracer scope; not yet producible in this worktree | fixed |  | 2026-08-22T16:29:29.756Z | 2026-08-22T16:44:39.305Z |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "fixtures/dense/.planning/HANDOFF.json",
    "line": null,
    "description": "structured-extraction warning for HANDOFF.json's trailing comma requires plan 01-03's json-config.ts handler; not yet producible in this worktree",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-22T16:29:23.141Z",
    "resolved_at": "2026-08-22T16:44:39.206Z"
  },
  {
    "id": 2,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "fixtures/dense/.planning/phases/01-identity-slice/01-COST-MODEL.md",
    "line": null,
    "description": "Task 2/3 acceptance criteria expecting phase-nested artifacts (SPEC.md, AI-SPEC.md, 01-COST-MODEL.md, 02-01-PLAN.md body) in snapshot.project.artifacts require plan 01-03's assembleDomainModel extension beyond its current root-only tracer scope; not yet producible in this worktree",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-22T16:29:29.756Z",
    "resolved_at": "2026-08-22T16:44:39.305Z"
  }
]
````

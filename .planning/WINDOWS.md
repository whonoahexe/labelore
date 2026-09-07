---
schema_version: 1
open_count: 3
waived_count: 0
fixed_count: 2
total_count: 5
last_updated: 2026-09-07T20:20:02.709Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | unrun-verify | fixtures/dense/.planning/HANDOFF.json |  | structured-extraction warning for HANDOFF.json's trailing comma requires plan 01-03's json-config.ts handler; not yet producible in this worktree | fixed |  | 2026-08-22T16:29:23.141Z | 2026-08-22T16:44:39.206Z |
| 2 | 01 | unrun-verify | fixtures/dense/.planning/phases/01-identity-slice/01-COST-MODEL.md |  | Task 2/3 acceptance criteria expecting phase-nested artifacts (SPEC.md, AI-SPEC.md, 01-COST-MODEL.md, 02-01-PLAN.md body) in snapshot.project.artifacts require plan 01-03's assembleDomainModel extension beyond its current root-only tracer scope; not yet producible in this worktree | fixed |  | 2026-08-22T16:29:29.756Z | 2026-08-22T16:44:39.305Z |
| 3 | 03 | lint-warning | test/web/visual-contract.test.ts | 438 | Pre-existing no-regex-spaces lint error, unrelated to plan 03-01's files (confirmed via empty git diff against HEAD). | open |  | 2026-09-02T10:04:51.761Z |  |
| 4 | 04 | unrun-verify | src/web/pages/artifact-page.tsx |  | Human must confirm the unreadable disclosure and empty-document notice read as one coherent explanation | open |  | 2026-09-07T20:20:02.595Z |  |
| 5 | 04 | unrun-verify | .planning/phases/04-portability-degradation-hardening/04-05-PLAN.md |  | Human must decide whether the 04-05 tone prohibition includes disclosure prose | open |  | 2026-09-07T20:20:02.709Z |  |

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
  },
  {
    "id": 3,
    "kind": "lint-warning",
    "phase": "03",
    "file": "test/web/visual-contract.test.ts",
    "line": 438,
    "description": "Pre-existing no-regex-spaces lint error, unrelated to plan 03-01's files (confirmed via empty git diff against HEAD).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-02T10:04:51.761Z",
    "resolved_at": null
  },
  {
    "id": 4,
    "kind": "unrun-verify",
    "phase": "04",
    "file": "src/web/pages/artifact-page.tsx",
    "line": null,
    "description": "Human must confirm the unreadable disclosure and empty-document notice read as one coherent explanation",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-07T20:20:02.595Z",
    "resolved_at": null
  },
  {
    "id": 5,
    "kind": "unrun-verify",
    "phase": "04",
    "file": ".planning/phases/04-portability-degradation-hardening/04-05-PLAN.md",
    "line": null,
    "description": "Human must decide whether the 04-05 tone prohibition includes disclosure prose",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-07T20:20:02.709Z",
    "resolved_at": null
  }
]
````

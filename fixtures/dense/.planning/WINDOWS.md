---
schema_version: 1
open_count: 2
waived_count: 0
fixed_count: 0
total_count: 2
last_updated: "2026-08-22T09:00:00.000Z"
---

# Broken Windows Ledger

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|--------------|--------|--------|--------------|--------------|
| 1 | 01 | unrun-verify | phases/01-identity-slice/01-02-PLAN.md | 42 | Task 2's `<verify>` command was not run before the commit that closed it | open | | 2026-08-20T12:00:00.000Z | |
| 2 | 02 | deviation | phases/02-transport-layer/02-01-PLAN.md | - | Frontmatter carries a deliberately tab-indented key for the fixture's own corruption test | open | | 2026-08-21T08:00:00.000Z | |

```json
[
  {"id": 1, "phase": "01", "kind": "unrun-verify", "file": "phases/01-identity-slice/01-02-PLAN.md", "line": 42, "description": "Task 2's <verify> command was not run before the commit that closed it", "status": "open", "reason": null, "recorded_at": "2026-08-20T12:00:00.000Z", "resolved_at": null},
  {"id": 2, "phase": "02", "kind": "deviation", "file": "phases/02-transport-layer/02-01-PLAN.md", "line": null, "description": "Frontmatter carries a deliberately tab-indented key for the fixture's own corruption test", "status": "open", "reason": null, "recorded_at": "2026-08-21T08:00:00.000Z", "resolved_at": null}
]
```

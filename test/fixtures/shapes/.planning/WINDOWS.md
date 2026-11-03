---
schema_version: 1
open_count: 0
waived_count: 0
fixed_count: 2
total_count: 2
last_updated: 2026-10-22T15:40:12.304Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | unrun-verify | src/bookings/kiln-grid.tsx |  | Human check not run: confirm the kiln grid keeps its column widths at a 390px viewport | fixed |  | 2026-10-12T10:05:44.210Z | 2026-10-14T09:31:08.775Z |
| 2 | 02 | deviation | src/recipes/glaze-card.tsx | 41 | Glaze card shows the cone range as text instead of the planned gauge because the gauge component was not merged yet | fixed |  | 2026-10-15T13:22:19.640Z | 2026-10-22T15:40:12.304Z |

```json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "src/bookings/kiln-grid.tsx",
    "line": null,
    "description": "Human check not run: confirm the kiln grid keeps its column widths at a 390px viewport",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-12T10:05:44.210Z",
    "resolved_at": "2026-10-14T09:31:08.775Z"
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "02",
    "file": "src/recipes/glaze-card.tsx",
    "line": 41,
    "description": "Glaze card shows the cone range as text instead of the planned gauge because the gauge component was not merged yet",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-15T13:22:19.640Z",
    "resolved_at": "2026-10-22T15:40:12.304Z"
  }
]
```

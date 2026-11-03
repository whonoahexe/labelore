---
schema_version: 1
open_count: 2
waived_count: 2
fixed_count: 2
total_count: 6
last_updated: 2026-06-18T14:22:09.511Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | unrun-verify | src/auth/session.ts |  | Human check not run: confirm a member is sent back to the sign-in page after 30 minutes idle | open |  | 2026-06-02T09:14:03.120Z |  |
| 2 | 01 | deviation | src/auth/cookies.ts | 58 | Cookie lifetime set to 8 hours instead of the 12 the plan named; run ```npm run test:auth``` to see the expiry case | fixed |  | 2026-06-02T09:20:41.007Z | 2026-06-04T16:05:12.330Z |
| 3 | 03 | lint-warning | src/admin/accounts-table.tsx | 212 | Unused prop `onSelectAll` left in the accounts table after the bulk-select task was dropped | waived | Removed in the admin refactor already planned for the next milestone; not worth its own commit. | 2026-06-09T11:02:30.884Z |  |
| 4 | 03 | flaky-test | test/admin/session-revoke.test.ts |  | Revoke test fails about one run in twenty when the clock mock and the debounce race | waived |  | 2026-06-10T08:47:16.215Z |  |
| 5 | quick/260402-t8m | unrun-verify | src/web/top-bar.css |  | Top bar colours not checked against the dark theme in a real browser | open |  | 2026-06-12T13:30:00.000Z |  |
| 6 | quick/260402-t8m | deviation | src/web/top-bar.tsx | 14 | Logo swapped for the text mark because the asset was not in the repository | fixed |  | 2026-06-12T13:41:55.640Z | 2026-06-18T14:22:09.511Z |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "src/auth/session.ts",
    "line": null,
    "description": "Human check not run: confirm a member is sent back to the sign-in page after 30 minutes idle",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-06-02T09:14:03.120Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "01",
    "file": "src/auth/cookies.ts",
    "line": 58,
    "description": "Cookie lifetime set to 8 hours instead of the 12 the plan named; run ```npm run test:auth``` to see the expiry case",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-06-02T09:20:41.007Z",
    "resolved_at": "2026-06-04T16:05:12.330Z"
  },
  {
    "id": 3,
    "kind": "lint-warning",
    "phase": "03",
    "file": "src/admin/accounts-table.tsx",
    "line": 212,
    "description": "Unused prop `onSelectAll` left in the accounts table after the bulk-select task was dropped",
    "status": "waived",
    "reason": "Removed in the admin refactor already planned for the next milestone; not worth its own commit.",
    "recorded_at": "2026-06-09T11:02:30.884Z",
    "resolved_at": null
  },
  {
    "id": 4,
    "kind": "flaky-test",
    "phase": "03",
    "file": "test/admin/session-revoke.test.ts",
    "line": null,
    "description": "Revoke test fails about one run in twenty when the clock mock and the debounce race",
    "status": "waived",
    "reason": "",
    "recorded_at": "2026-06-10T08:47:16.215Z",
    "resolved_at": null
  },
  {
    "id": 5,
    "kind": "unrun-verify",
    "phase": "quick/260402-t8m",
    "file": "src/web/top-bar.css",
    "line": null,
    "description": "Top bar colours not checked against the dark theme in a real browser",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-06-12T13:30:00.000Z",
    "resolved_at": null
  },
  {
    "id": 6,
    "kind": "deviation",
    "phase": "quick/260402-t8m",
    "file": "src/web/top-bar.tsx",
    "line": 14,
    "description": "Logo swapped for the text mark because the asset was not in the repository",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-06-12T13:41:55.640Z",
    "resolved_at": "2026-06-18T14:22:09.511Z"
  }
]
````

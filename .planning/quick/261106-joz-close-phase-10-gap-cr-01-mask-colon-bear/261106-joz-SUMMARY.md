---
phase: 261106-joz
plan: 01
subsystem: planning-repo/handlers (USER-SETUP reader)
tags: [value-withholding, T-10-33, VIEW-11, gap-closure]
status: complete
requirements: [VIEW-11]
key-files:
  modified:
    - src/planning-repo/handlers/user-setup-body.ts
    - test/helpers/written-value-forms.ts
    - test/user-setup-handler.test.ts
actuals:
  tasks: 2
  commits: 3
plan_head_before: 09f763b6755092774f5f1c823b56ec0167d0f55c
plan_head_after: bd7eaee
---

# Quick 261106-joz: mask colon-bearing field lines Summary

`readFieldLine` now masks a USER-SETUP checklist field line whole before splitting whenever the text before its first colon holds an `=`, so `- DATABASE_URL=postgres://u:PW@host/db` and `- STRIPE_KEY=sk:TAG` store and draw no part of the value (10-VERIFICATION truth 5, T-10-33).

## Commits

- 7c7f867 test(261106-joz): plant colon-bearing value forms (RED)
- ec49b08 fix(261106-joz): mask a field line whole when its key part holds an assignment (GREEN)
- bd7eaee test(261106-joz): pin colon-bearing field-line shapes and exact field output

## RED observed (Task 1)

- `test/user-setup-handler.test.ts` > the User setup reader withholds a value written in any form > stores none of the planted secrets of any form, in the steps, fields, notes or sections (PLANTED-FORM-22 leaked)
- `test/web/user-setup-page.test.ts` > the View draws no value written in any form > keeps every planted secret of every form out of the model, the markup and any attribute (PLANTED-FORM-22 leaked)

withhold-values, codebase-lift and codebase-page tests passed with the new forms before the fix, as the planner probe predicted.

## Change

Source: only `readFieldLine`'s branch condition (`isVariableKey(rawKey) || rawKey.includes('=')`) plus JSDoc and header comment. Branch B, `isVariableKey`, `keep`, `VALUE_KEYS`, `maskValues` untouched. WRITTEN_FORMS grew 21 -> 29 forms (connection string, prefixed token, spaced equals, ticked name + URL, bold name + URL, after a word, double-quoted connection string, value opening with a colon). New exact-fields test pins `URL`/`Location`/`Notes` output beside masked colon-bearing lines.

## Verification

- Five WRITTEN_FORMS consumer files: 333 tests pass
- Full vitest: 265 files, 6300 tests pass
- `npm run typecheck`: pass; eslint on the three touched files: clean
- Gate counts: `{ label: '` = 29; `rawKey.includes('=')` non-comment = 1; `PLANTED-FIELD-0011` = 1
- No Playwright e2e run.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Follow-up

Server-side handler change: after merge, restart the hosted service (`systemctl --user restart labelore`) — left to the orchestrator.

## Self-Check: PASSED

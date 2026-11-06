---
phase: 261106-joz
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - test/helpers/written-value-forms.ts
  - src/planning-repo/handlers/user-setup-body.ts
  - test/user-setup-handler.test.ts
autonomous: true
requirements: [VIEW-11]

estimate:
  tokens: 35000
  raw_tokens: 35000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "A USER-SETUP checklist step's indented field line `- DATABASE_URL=postgres://u:PW@host/db` or `- STRIPE_KEY=sk:TAG` stores no part of the value: JSON.stringify(extractUserSetup(doc)) contains neither PW nor TAG"
    - "renderToStaticMarkup of the User setup page (UserSetupView) for that document contains neither value, in its text or in any attribute"
    - "The same-cause field-line shapes recorded in 10-VERIFICATION (`NAME = a:v`, `` `NAME`=https://u:v@host ``, `**NAME**=https://v`, `Set NAME=postgres://u:v@host/db`, `DB=\"postgres://u:v@host/db\"`) and `NAME=:v` store and draw no value"
    - "Field lines whose key is a plain label (`URL: https://...`, `Location: ...`, `Notes: ...`, `Auth: NAME: v`) and `NAME: value` / `\"NAME\": \"v\"` lines produce exactly the output they produce today"
    - "Every WRITTEN_FORMS consumer (maskValues, the Integrations lift, the Integrations page, the User setup reader, the User setup page) plants the colon-bearing forms and passes; full vitest, typecheck and eslint pass"
  artifacts:
    - path: "src/planning-repo/handlers/user-setup-body.ts"
      provides: "readFieldLine masks the whole field line before it splits whenever the text before the first colon holds an `=`"
      contains: "rawKey.includes('=')"
    - path: "test/helpers/written-value-forms.ts"
      provides: "Shared planted-value list with colon-bearing assignment forms (connection string, prefixed token and the same-cause variants)"
      contains: "DATABASE_URL=postgres://u:"
    - path: "test/user-setup-handler.test.ts"
      provides: "Exact-fields regression for colon-bearing field lines beside label lines"
      contains: "PLANTED-FIELD-0011"
  key_links:
    - from: "test/helpers/written-value-forms.ts"
      to: "test/user-setup-handler.test.ts, test/web/user-setup-page.test.ts, test/withhold-values.test.ts, test/codebase-lift.test.ts, test/web/codebase-page.test.ts"
      via: "WRITTEN_FORMS / userSetupFormDoc() plant every form as a field line, a Notes line, a section line and in Integrations rows"
      pattern: "WRITTEN_FORMS|userSetupFormDoc"
    - from: "src/planning-repo/handlers/user-setup-body.ts (readFieldLine)"
      to: "src/planning-repo/handlers/withhold-values.ts (maskValues)"
      via: "keep(rest) masks the whole line before the key/text split"
      pattern: "keep\\(rest\\)"
---

<objective>
Close the phase 10 re-verification gap for truth 5 (VIEW-11, CR-01 remainder, threat T-10-33): a USER-SETUP checklist
step's indented `- NAME=value` field line whose value contains a colon (a connection string `postgres://u:PW@host/db`,
a prefixed token `sk:TAG`) is stored in `steps[].fields[].text` and drawn on the User setup page.

Cause (10-VERIFICATION.md, gap for truth 5): `readFieldLine` in `src/planning-repo/handlers/user-setup-body.ts` splits
the raw line at its first colon BEFORE masking. For `DATABASE_URL=postgres://u:PW@host/db` the left side is
`DATABASE_URL=postgres`, which `isVariableKey` rejects, so key and text are masked as separate fragments and the text
after the scheme colon (`//u:PW@host/db`) is kept. The same strings in a Notes line, a plain section or the Integrations
lift are already masked: the leak is confined to `readFieldLine`.

Purpose: a user setup must never show a variable's value in any View output.
Output: the shared planted-value list gains colon-bearing forms (so every value-withholding test plants them), and
`readFieldLine` masks the whole line before splitting whenever the key part holds an assignment.

Scope (from the task description, locked): this fix only. No refactor of `maskValues` or any other helper. Out of scope:
the Source-column value advisory and prose shapes such as `NAME is v`. If adding the forms makes the Integrations side
fail, fixing that (same masking helper) is in scope; planner probe at HEAD shows it does not fail.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md
@.planning/phases/10-codebase-map-specification-and-check-pages/10-VERIFICATION.md
@src/planning-repo/handlers/user-setup-body.ts
@test/helpers/written-value-forms.ts

<interfaces>
From src/planning-repo/handlers/user-setup-body.ts (current, the function to change):
- `function readFieldLine(line: string): UserSetupField | null` — requires leading indent and `- `; `rest` = text after
  `- `; `colon = rest.indexOf(':')`, returns null when `colon <= 0`; `rawKey = rest.slice(0, colon).trim()`.
  Branch A (`isVariableKey(rawKey)`): `masked = keep(rest)`, split at the first colon of `masked`, null when that colon
  is `<= 0`. Branch B (else): `key = keep(rawKey)`, `text = keep(rest.slice(colon + 1).trim())`. After either branch,
  a key in `VALUE_KEYS` with non-empty text returns `{ key, text: VALUE_NOT_SHOWN_MARK }`.
- `function keep(text: string): string` — caps at USER_SETUP_CELL_CAP (400) then `maskValues`.
- `function isVariableKey(key: string): boolean` — upper-snake name (ticks/bold/quotes stripped), `URL` excluded.
- Caller `readChecklist`: a null field on an indented line is simply skipped (the step stays current); the line is still
  stored masked in `sections[].lines` by `readSections`.

From test/helpers/written-value-forms.ts:
- `interface WrittenForm { label: string; line: (tag: string) => string; secrets: (tag: string) => string[] }`
- `WRITTEN_FORMS` (21 entries at HEAD), `formTag(index)` => `PLANTED-FORM-nn` (index + 1, two digits),
  `allFormSecrets()`, `userSetupFormDoc()` (plants each form as `  - <line without leading "- ">` field line, as
  `  - Notes: <line>` and as a plain line of a `## Local Development` section), helper `one` => `[tag]`.

From src/planning-repo/handlers/withhold-values.ts:
- `export const VALUE_NOT_SHOWN_MARK = '[Value not shown]'`; `export function maskValues(text: string): string`.
</interfaces>

Planner probes at HEAD (scratch copies only, repo untouched):
- Each new form below, as a field line, leaks into extractUserSetup JSON at HEAD (e.g. `{ key: "DATABASE_URL=[Value not
  shown]", text: "//u:PLANTED-FORM-22@host/db" }`, `{ key: "STRIPE_KEY=", text: "PLANTED-FORM-29" }`).
- The same forms are already masked by `maskValues` (mark present, idempotent), in Notes lines, in section lines, and in
  the Integrations lift (group row, sub-bullet `Note:`/`Auth:`, Environment bullet and line).
- With the branch-A condition widened as in Task 1, all eight forms stop leaking, and `extractUserSetup(userSetupFormDoc())`
  for the current 21 forms is byte-identical to HEAD.
- Gate baselines at HEAD: `grep -c "{ label: '" test/helpers/written-value-forms.ts` = 21;
  non-comment count of `rawKey.includes('=')` in user-setup-body.ts = 0; `PLANTED-FIELD-0011` in
  test/user-setup-handler.test.ts = 0.
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Tracer — a connection-string field line never reaches the User setup page (RED then GREEN)</name>
  <files>test/helpers/written-value-forms.ts, src/planning-repo/handlers/user-setup-body.ts</files>
  <behavior>
    - `  - DATABASE_URL=postgres://u:PLANTED-FORM-22@host/db` under a checklist step: PLANTED-FORM-22 absent from JSON.stringify(extractUserSetup(doc)) and from the User setup page markup and model
    - `  - STRIPE_KEY=sk:PLANTED-FORM-23` under a checklist step: PLANTED-FORM-23 absent from the same places
    - The 21 existing forms and every existing user-setup test keep their current results
  </behavior>
  <action>
RED. In test/helpers/written-value-forms.ts APPEND (at the end of WRITTEN_FORMS, never in the middle, so existing
`formTag` indices stay stable) two entries, both with `secrets: one`:
(a) label 'colon inside the value, connection string', line producing `DATABASE_URL=postgres://u:${tag}@host/db`;
(b) label 'colon inside the value, prefixed token', line producing `STRIPE_KEY=sk:${tag}`.
They become PLANTED-FORM-22 and PLANTED-FORM-23. Update the file's header comment to cite the phase 10 re-verification
gap (truth 5) and update the `line` doc comment so it says the forms write beside STRIPE_KEY, TOKEN, A_B, DATABASE_URL or
DB. Run the user-setup handler and page tests and confirm they FAIL on PLANTED-FORM-22/23 in "stores none of the planted
secrets of any form, in the steps, fields, notes or sections" and "keeps every planted secret of every form out of the
model, the markup and any attribute". Confirm test/withhold-values.test.ts, test/codebase-lift.test.ts and
test/web/codebase-page.test.ts PASS with the new forms (planner probe says they do; if one fails, the fix belongs in the
same masking helper path it uses and is in scope, nothing else). Commit: test(261106-joz): plant colon-bearing value forms.

GREEN. In src/planning-repo/handlers/user-setup-body.ts, `readFieldLine` only: widen the branch-A condition from
`isVariableKey(rawKey)` to `isVariableKey(rawKey) || rawKey.includes('=')`. Rationale to keep in the JSDoc: when the text
before the first raw colon holds an `=`, that colon sits inside (or after) an assignment's value, so the whole line must
reach `keep` (maskValues) as one string before any split; the split is then taken at the first colon of the MASKED
string, and when the masked string has no colon the function returns null (the line is not a field, exactly as
`- STRIPE_KEY=value` with no colon is today; the line is still stored masked in sections). This implements the task's
"line starts with an upper-snake name followed by `=`: mask the whole line before splitting" rule; testing for `=` in the
key part is a superset of it (every such line that has a colon at all has `=` before that colon) and also closes the
same-cause shapes 10-VERIFICATION lists (`Set NAME=...`, `**NAME**=...`, `` `NAME`=... ``, `NAME = a:b`, `DB="..."`).
Plain labels (`URL`, `Location`, `Set to`, `Notes`, `Skip if`, `Auth`) never contain `=`, so their branch-B output is
unchanged. Do not touch branch B, `isVariableKey`, `keep`, `VALUE_KEYS`, `maskValues` or any other function. Update the
readFieldLine JSDoc and the file-header sentence that says a key that is a variable name is masked as one string, adding
"or whose text before the first colon holds an `=`" and citing the phase 10 re-verification gap (truth 5). Run the five
WRITTEN_FORMS consumer test files; all pass. Commit: fix(261106-joz): mask a field line whole when its key part holds an
assignment (10-VERIFICATION truth 5).
  </action>
  <verify>
    <automated>npx vitest run test/user-setup-handler.test.ts test/web/user-setup-page.test.ts test/withhold-values.test.ts test/codebase-lift.test.ts test/web/codebase-page.test.ts</automated>
  </verify>
  <done>
RED was observed on the two user-setup tests before the fix (record the failing test names in the SUMMARY). After the
fix all five files pass; `grep -c "{ label: '" test/helpers/written-value-forms.ts` = 23 (baseline 21);
`grep -v '^\s*\(//\|\*\)' src/planning-repo/handlers/user-setup-body.ts | grep -c "rawKey.includes('=')"` = 1 (baseline 0).
Two commits exist (test, then fix).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Expand — pin the same-cause shapes and the exact field output, then run the full gates</name>
  <files>test/helpers/written-value-forms.ts, test/user-setup-handler.test.ts</files>
  <behavior>
    - Six more field-line shapes store and draw no value: spaced equals with a colon in the value, ticked name with a URL value, bold name with a URL value, an assignment after a word, a double-quoted connection string, a value opening with a colon
    - A step holding `URL: https://host.example/db`, `DATABASE_URL=postgres://u:PLANTED-FIELD-0011@host/db`, `STRIPE_KEY=sk:PLANTED-FIELD-0012`, `Location: Settings → Database` and `Notes: DATABASE_URL=postgres://u:PLANTED-FIELD-0013@host/db` yields exactly fields [URL kept, Location kept, Notes masked] and notes [masked]
  </behavior>
  <action>
In test/helpers/written-value-forms.ts APPEND after the Task 1 entries (end of WRITTEN_FORMS; these become PLANTED-FORM-24
to PLANTED-FORM-29), each with `secrets: one`:
'spaced equals, colon inside the value' producing `STRIPE_KEY = a:${tag}`;
'ticked name, URL value with a colon' producing `` `STRIPE_KEY`=https://u:${tag}@host ``;
'bold name, URL value' producing `**STRIPE_KEY**=https://${tag}`;
'after a word, connection string' producing `Set STRIPE_KEY=postgres://u:${tag}@host/db`;
'double-quoted connection string' producing `DB="postgres://u:${tag}@host/db"`;
'value opening with a colon' producing `STRIPE_KEY=:${tag}`.
Baseline: all six leak through readFieldLine at HEAD (planner probe); with Task 1's rule they pass on arrival, so they are
regression pins for the same gap. If any one fails, the fix is in `readFieldLine` only.

In test/user-setup-handler.test.ts, inside the existing describe block 'the User setup reader withholds a value written
in any form (10-REVIEW CR-01, WR-01)', add one `it` named for a value with a colon in it (connection string, prefixed
token; 10-VERIFICATION truth 5). It builds a doc with a `## Dashboard Configuration` section and one checklist item
`- [ ] **Add the database**` followed by the five indented lines in the behavior block, calls `extractUserSetup`, and
asserts with `toEqual` that `body.steps[0].fields` is exactly
[{ key: 'URL', text: 'https://host.example/db' }, { key: 'Location', text: 'Settings → Database' },
{ key: 'Notes', text: `DATABASE_URL=${VALUE_NOT_SHOWN_MARK}` }], that `body.steps[0].notes` equals
[`DATABASE_URL=${VALUE_NOT_SHOWN_MARK}`], and that JSON.stringify(body) does not contain 'PLANTED-FIELD'. (Planner probe
with the Task 1 rule produced exactly this output.) VALUE_NOT_SHOWN_MARK is already imported in that file.

Then run the full gates: the full vitest suite, typecheck, and eslint on the three touched files. No Playwright e2e.
Commit: test(261106-joz): pin colon-bearing field-line shapes and exact field output.
  </action>
  <verify>
    <automated>npx vitest run test/user-setup-handler.test.ts test/web/user-setup-page.test.ts test/withhold-values.test.ts test/codebase-lift.test.ts test/web/codebase-page.test.ts && npx vitest run && npm run typecheck && npx eslint src/planning-repo/handlers/user-setup-body.ts test/helpers/written-value-forms.ts test/user-setup-handler.test.ts</automated>
  </verify>
  <done>
`grep -c "{ label: '" test/helpers/written-value-forms.ts` = 29 (baseline 21); `grep -c "PLANTED-FIELD-0011"
test/user-setup-handler.test.ts` = 1 (baseline 0); the five consumer files, the full vitest suite, `npm run typecheck`
and eslint on the touched files all pass. git diff against the pre-task HEAD touches only the three files in
files_modified (plus the SUMMARY).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| target `.planning/` file -> User setup reader | USER-SETUP.md text is untrusted; a person may paste a real secret beside a variable name |
| reader output -> View markup | anything stored in `steps[].fields` is drawn by the User setup page |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-261106-joz-01 | Information Disclosure | `readFieldLine` in src/planning-repo/handlers/user-setup-body.ts (continues T-10-33) | high | mitigate | Mask the whole field line via `keep(rest)` before the key/text split whenever the key part holds `=`; return null when the masked line has no colon, so no fragment of the value is stored (Task 1) |
| T-261106-joz-02 | Information Disclosure | test/helpers/written-value-forms.ts (shared test list blind to colon-bearing values) | medium | mitigate | Append eight colon-bearing forms so mask, Integrations lift and page, User setup reader and page tests all plant them and assert absence from structured JSON and rendered markup (Tasks 1-2) |
| T-261106-joz-03 | Information Disclosure | label field lines (`URL:`, `Location:`) over-masked by the wider rule | low | accept | Labels never contain `=`; branch B is untouched; planner probe shows byte-identical output for the existing 21-form doc, and Task 2 pins `URL`/`Location` output exactly |
| T-261106-joz-SC | Tampering | npm/pip/cargo installs | high | accept | No package installs in this plan; nothing to gate |
</threat_model>

<verification>
- `npx vitest run test/user-setup-handler.test.ts test/web/user-setup-page.test.ts test/withhold-values.test.ts test/codebase-lift.test.ts test/web/codebase-page.test.ts` passes
- `npx vitest run` passes (full suite)
- `npm run typecheck` passes
- `npx eslint src/planning-repo/handlers/user-setup-body.ts test/helpers/written-value-forms.ts test/user-setup-handler.test.ts` passes
- No Playwright e2e run.
- After the change lands on master: this is a server-side handler change, so per project memory restart the hosted
  service (`systemctl --user restart labelore`, confirm active and port 4173 answers).
</verification>

<success_criteria>
- Truth 5 (VIEW-11) gap closed: no colon-bearing `NAME=value` field line stores or draws its value
- WRITTEN_FORMS holds 29 forms (21 + 8 colon-bearing), every consumer test plants and passes them
- Only readFieldLine's branch condition (and its comments) changed in source; no other helper touched
- Full vitest, typecheck and eslint green
</success_criteria>

<output>
Create `.planning/quick/261106-joz-close-phase-10-gap-cr-01-mask-colon-bear/261106-joz-SUMMARY.md` when done, with `status: complete` in its frontmatter and the RED test names observed in Task 1
</output>

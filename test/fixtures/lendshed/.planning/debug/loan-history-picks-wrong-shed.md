---
status: awaiting_human_verify
trigger: "Ana says her loan history is wrong: https://steward.lendshed.example/members/88/loans shows tools from Mill Lane that she only ever borrowed at Elm Street"
created: 2026-03-24
updated: 2026-03-24T19:40
---

# Debug: loan history names the wrong shed for tools that were moved

## Symptoms

- **Expected:** Every row on a member's loan history names the shed the tool was handed out from, and that name never changes afterwards.
- **Actual:** Four of the nine rows for member 88 name Mill Lane, a shed she has never visited. The names also change by themselves after a steward moves a tool.
- **Errors:** None. The page loads, the numbers add up, and only the shed column is wrong.
- **Timeline:** First noticed on member 88 right after the February transfer batch. Members whose tools never moved look fine.
- **Reproduction:** Open `https://steward.lendshed.example/members/88/loans` signed in as a steward and read the shed column.

## Pre-gathered evidence (steward desk, before delegation)

- timestamp: 2026-03-24. Member 88 has nine loans, all handed out at the Elm Street shed, and every row in `loans` has `checkout_shed_id` filled in. The history page lists four of them under Mill Lane.
- timestamp: 2026-03-24. The shed label on the page is built in `src/features/loans/hooks/useLoanHistory.ts` by joining each loan to its tool and reading `tools.home_shed_id`. The loan's own `checkout_shed_id` is fetched with the row but never displayed.
- timestamp: 2026-03-24. Hypothesis (strong): the root cause is that the join follows the tool's present shed instead of the shed recorded on the loan, so any moved tool rewrites its own history.

## Current Focus

- hypothesis: The history hook labels each loan with the tool's current shed; replacing that with a resolver that prefers the loan's own checkout shed, then the last transfer before the loan began, then the tool's home at loan start, labels every row with the shed it was handed out from.
- test: Unit-test the resolver on member 88's nine loans and the four transfers; then load the live page and read the shed column.
- expecting: Nine rows, all Elm Street, and the column stays the same when a tool is moved again.
- next_action: gather the first evidence (which columns exist, how many older loans lack a checkout shed), then write the resolver in `lib/loanShedOrigin.ts` with tests; keep members whose tools never moved reading exactly as before.
- known_pattern_candidate: none (the knowledge base only covers route loading and stale search; neither is a join on a mutable column)
- bug_class: Bohrbug (deterministic for any tool that has ever been moved; the members who look fine simply own tools that stayed put).
- CONFIRMED. Proceeding to fix.

```yaml
reasoning_checkpoint:
  hypothesis: "useLoanHistory labels every loan through tools.home_shed_id, the shed a tool lives in today. Any tool moved by the February transfer batch therefore shows its new shed on loans that ended before the move."
  confirming_evidence:
    - "Live query: member 88's four wrong rows are exactly the four tools with a transfer record dated after the loan ended."
    - "Member 91 owns no moved tools and reads correctly, so the stored checkout shed is not the problem."
    - "The hook reads tools.home_shed_id only; there is no other place on the page that names a shed."
  falsification_test: "After the fix, member 88's page still names Mill Lane for any of the nine rows. Then the label was never the join, and the data itself would be wrong."
  fix_rationale: "Resolve the origin shed once, in a pure function, from the loan, then its transfer trail, then the tool's home at the time. This removes the mutable column from the decision for every loan, whether or not it was ever moved."
  blind_spots: "The 211 loans created before the v1.0 transfer feature have no checkout shed and no transfer trail, so they fall back to the tool's home at loan start, which is reconstructed from the transfer log and may be one shed off for tools moved more than once."
  candidate_causes:
    - "code: the history join reads the tool's current shed instead of the loan's shed (CONFIRMED, primary)"
    - "data/environment: the February transfer batch changed home_shed_id on tools that still had finished loans pointing at them (CONFIRMED trigger condition; not undoable, made irrelevant by the resolver)"
    - "config: the shed display setting maps shed ids to the wrong names (ELIMINATED — the same id renders the right name on the inventory page)"
    - "data: member 88's loan rows were written with the wrong checkout shed (ELIMINATED — all nine rows hold the Elm Street id)"
  and_gate: "yes — the wrong label needs both the join on a mutable column and a tool that has been moved; members with no moved tools never saw it."
```

- status_now: fix applied, all six guardrail signals pass, and the page was checked in a headless browser. Waiting on a human look at member 88.
- next_action: Ana opens https://steward.lendshed.example/members/88/loans (hard reload), confirms every row says Elm Street and that the row for the cordless drill still says Elm Street after Maya moves the drill to Mill Lane; then archive the session and commit.

## Constraints

- A label must never be invented: when no source names a shed, the row shows no shed rather than a guess.
- Member names and addresses stay out of logs; log loan ids and shed ids only.
- Do not change what members whose tools never moved see today.

## Evidence

- timestamp: 2026-03-24T1
  checked: the columns on `loans` and `tools`, and member 88's nine rows
  found: All nine loan rows hold `checkout_shed_id` = 3 (Elm Street). Four of the matching tools hold `home_shed_id` = 5 (Mill Lane).
  implication: The stored loan data is right; the page is reading the other column.

- timestamp: 2026-03-24T2
  checked: the transfer log for those four tools
  found: Each tool was moved from Elm Street to Mill Lane in the February batch, between 9 and 26 days after the member returned it.
  implication: The wrong rows are the moved ones, and only the moved ones.

- timestamp: 2026-03-24T3
  checked: differential, member 88's page against member 91's page (member 91 owns no moved tools)
  found: Member 91 reads Elm Street on every row. Member 88 reads Mill Lane on the four moved tools and Elm Street on the other five.
  implication: CONFIRMS that the label follows the tool's present shed and not the loan.

- timestamp: 2026-03-24T4
  checked: how many loans lack `checkout_shed_id`, and when the transfer log starts
  found: 211 loans from before the v1.0 transfer feature have a null checkout shed; the transfer log has nothing before 2026-02-02.
  implication: A resolver cannot rely on the loan column alone; it needs a fallback for old loans.

- timestamp: 2026-03-24T5
  checked: for the 211 old loans, whether the tool ever moved
  found: 190 of them belong to tools that never moved, so the tool's home is the answer; 21 belong to tools moved once or more, so the answer has to come from the transfer log.
  implication: Three layers are enough: loan column, then transfer trail, then home at loan start.

- timestamp: 2026-03-24T6
  checked: RED phase, a new describe block in `useLoanHistory.test.ts` run against the hook as it was
  found: 5 of 8 new cases fail. The headline case "THE REPORTED BUG" fails with `expected 'Mill Lane' not to be 'Mill Lane'`, which reproduces the symptom in a unit test. The two cases for members with no moved tools pass.
  implication: The bug reproduces at the hook, so the test is a fair regression check.

- timestamp: 2026-03-24T7
  checked: callers of the hook (`LoanHistoryPage.tsx`, `MemberCard.tsx`)
  found: Both read `row.shedName` from the hook and make no choice of their own.
  implication: One place decides the label, so fixing it there fixes both screens.

- timestamp: 2026-03-24T8
  checked: GREEN, the new resolver and the hook change, then the whole loans folder, tsc and eslint
  found: The fix applied cleanly: 41 of 41 loans tests pass (14 in the resolver file, 9 added to the hook file), eslint is clean on the four touched files, and tsc reports only the errors it reported before the change.
  implication: The resolver and the hook agree on every case in the plan.

- timestamp: 2026-03-24T9
  checked: a hand-made set of 12 mutants of the resolver, then revert-and-rerun
  found: 12 of 12 mutants fail a test after one missing case (a transfer dated the same day as the loan) was added. With the hook change reverted, six new cases fail again; reapplied, all pass.
  implication: The tests pin the root cause, which is the choice of column, not only today's symptom.

- timestamp: 2026-03-24T10
  checked: live, headless browser against the staging copy, signed in as a steward
  found: Member 88's page names Elm Street on all nine rows. Member 91 is unchanged. The cordless drill row still says Elm Street after the drill is moved to Mill Lane and the page is reloaded.
  implication: The falsification test passed, so the label came from the join and the stored data was fine.

## Eliminated

- hypothesis: the shed display setting maps shed ids to the wrong names
  evidence: The same shed id renders the right name on the inventory page and the transfer form, which share the setting. Only the history page shows a mismatch.
  timestamp: 2026-03-24T2

- hypothesis: member 88's loan rows were written with the wrong checkout shed
  evidence: All nine rows hold shed id 3, the Elm Street id, and the kiosk log for each checkout names the Elm Street kiosk.
  timestamp: 2026-03-24T1

## Resolution

- root_cause: "AND-gate, two contributing conditions. (1) CODE — `useLoanHistory` labelled each loan with `tools.home_shed_id`, the shed a tool lives in today, and ignored the shed stored on the loan. (2) DATA/ENVIRONMENT — the February transfer batch changed `home_shed_id` on tools that still had finished loans, so the label of an old loan changed the day its tool moved. Fixing (1) with a resolver that starts from the loan removes the influence of (2)."
- fix: "New pure `lib/loanShedOrigin.ts` resolves the origin shed of one loan in three layers: the loan's own `checkout_shed_id`, then the last transfer record dated before the loan began, then the tool's home at loan start rebuilt from the transfer log. `useLoanHistory` now maps every row through it and no longer reads `tools.home_shed_id` for display. A loan with no answer shows no shed. The inventory page and the transfer form are untouched."
- oracle_type: specified (member 88's nine expected rows, taken from the kiosk log) + metamorphic (moving a tool again never changes the label of a finished loan)
- verification:
    target_test: { result: pass, test: "src/features/loans/hooks/useLoanHistory.test.ts > THE REPORTED BUG: member 88 shows Elm Street on all nine rows after four tools were moved" }
    mutation_check: { result: pass, tool: "hand-made harness", mutants: 12, killed: 12, note: "first run 11 of 12; one case added for a transfer dated the same day as the loan" }
    regression_run: { result: pass, suites_run: ["src/features/loans (41 tests)", "eslint on touched files", "tsc (no new errors)"] }
    adjacent_tests: { result: pass, note: "inventory and transfer-form suites unchanged and green" }
    revert_and_reconfirm: { result: pass, bug_returned_on_revert: true, fixed_on_reapply: true }
    live: { result: pass, note: "member 88 reads Elm Street on all nine rows; member 91 unchanged; the drill stays at Elm Street after a move" }
    guardrail_verdict: accepted
- files_changed:
    - src/features/loans/lib/loanShedOrigin.ts (new)
    - src/features/loans/lib/loanShedOrigin.test.ts (new, 14 tests)
    - src/features/loans/hooks/useLoanHistory.ts
    - src/features/loans/hooks/useLoanHistory.test.ts (+9 tests)
    - docs/loan-data-model.md (history section)
- follow_ups_not_done:
    - "The 21 old loans on tools moved more than once are resolved from the transfer log and may be one shed off; a steward could confirm them against paper slips."
    - "A column on `loans` for the origin shed of loans created before the feature was not added; the resolver covers them."

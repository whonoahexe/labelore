# Deferred items (quick task 261023-u13)

Failures that were already failing before the first change of this task. They sit outside the note page and were
left alone.

## Unit tests (npm test)

Baseline run before any change, and the final run, both show these four (the second ascii-graph timing case also
failed in the baseline and passed in the final run, a load-sensitive case):

- `test/presentation/coverage.test.ts`: "renders the matrix before both complete documents in the plan pair page".
- `test/rendering/ascii-graph.test.ts`: the two "builds its graph in under 250 ms" timing cases (load-sensitive).
- `test/security-register.test.ts`: "extracts a 1 MB body holding one 200k-character line within 250 ms"
  (load-sensitive).
- `test/token-guard.test.ts`: "has zero violations outside the token blocks in the real stylesheet". Its list names
  three older selectors; none of them is a `view-note-` rule.

## End to end (npm run test:e2e)

The final full run (80 passed, 19 skipped, 12 failed) shows no failure in the note page spec. The 12 failures,
none of them on a note page:

- `artifact-header.spec.ts`: "plain-header SUMMARY: copy button present, no raw path caption" (timeout).
- `plan-page.spec.ts`: "LB 0x4 plan page" and "LB 02-17 plan page" (labelore's own planning files have moved on
  since these were written).
- `summary-page.spec.ts`: "LB v1.1/05-01 summary page" (chip signature count).
- `uat-page.spec.ts`: "LB v1.0/01 uat page".
- `foundation-consistency.spec.ts`: the four page sweeps (light and dark, 1280 and 420) and the view/source toggle,
  no-remainder and fallback-marker checks. Each waits 300 s on the same debug-document page and times out.

The first five were re-run on an untouched copy of the starting commit and fail the same way there. The view/source
toggle check was re-run there too and fails on the same debug-document wait. The sweeps and the other two
foundation checks stop at that same wait, and the sweep that ran before any change (an interrupted baseline run)
also failed there. They were not each re-run on the starting commit.

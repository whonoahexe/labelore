# Deferred items (quick 261018-j5h)

Failures already present at the starting commit (27f96f0), seen again in the full run at the end and left alone:

- `test/token-guard.test.ts` "has zero violations outside the token blocks in the real stylesheet" still fails; its violation list names nothing from the new debug block.
- `test/presentation/coverage.test.ts` "renders the matrix before both complete documents in the plan pair page" still fails.
- `test/security-register.test.ts` "extracts a 1 MB body holding one 200k-character line within 250 ms" is load-sensitive; it passed in the final run.

Not built (named as the next step): listing debug sessions in the sidebar tree.

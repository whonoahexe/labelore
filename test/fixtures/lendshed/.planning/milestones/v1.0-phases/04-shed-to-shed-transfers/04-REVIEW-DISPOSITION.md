# Phase 4: Review Disposition

| Finding | Disposition |
|---------|-------------|
| CR-01: The loan-log entry is stamped with the receiving shed, not the shed the tool left | fixed (see 04-REVIEW-FIX.md) |
| WR-01: Cancelling a pending transfer before validating it strands the tool in transit | fixed (see 04-REVIEW-FIX.md) |
| WR-02: Any executor failure is reported as "receiving shed offline" | fixed (see 04-REVIEW-FIX.md) |
| WR-03: Switching transfers resets the ledger but not the page's own flags | fixed (see 04-REVIEW-FIX.md) |
| WR-06: A pair with a third shed is trimmed silently instead of refused | fixed (see 04-REVIEW-FIX.md) |
| IN-01: `legCount` is computed and never read | deferred: harmless until the next refactor of the timeline |
| IN-02: Three values returned from `useTransfer` have no consumer | open |

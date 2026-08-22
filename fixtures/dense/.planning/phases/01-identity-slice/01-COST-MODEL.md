# Cost Model: Identity Slice

This document name appears in no `gsd-core` template and no reference document — it is an invented
future document type, deliberately included to prove the generic markdown fallback handles a genuinely
unfamiliar artifact type correctly (it should still parse and appear in the snapshot as `kind:
"unknown"`, never dropped or crashed on).

## Estimated Cost

| Line Item | Estimate |
|-----------|----------|
| Identity slice implementation | 60,000 tokens |
| Transport layer implementation | 40,000 tokens |

## Notes

If a future GSD version adds a real `COST-MODEL.md` artifact type with its own handler, this fixture
file continues to prove the fallback case for whatever the *next* unfamiliar type turns out to be.

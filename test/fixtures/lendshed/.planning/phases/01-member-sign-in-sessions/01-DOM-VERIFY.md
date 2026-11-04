---
schema_version: 1
wave: 2
outcome: could_not_look
reason: target_unreachable
checked: 0
passed: 0
failed: 0
needs_review: 0
made_up_example: true
derived_from: agents/gsd-dom-verifier.md
gsd_core_version: 1.19.0
---

# DOM verification: Phase 1, wave 2

Could not look. Nothing answered at `http://localhost:4871/sign-in`, an invented local address on a made-up port, so no criterion from the sign-in page contract was observed.

To change this, start the sign-in page on that address (run the Lendshed dev server), then rerun the check.

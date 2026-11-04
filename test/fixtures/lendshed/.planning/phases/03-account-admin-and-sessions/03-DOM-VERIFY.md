---
schema_version: 1
wave: 2
outcome: verified
reason: ok
checked: 7
passed: 4
failed: 2
needs_review: 1
made_up_example: true
derived_from: agents/gsd-dom-verifier.md
gsd_core_version: 1.19.0
---

# DOM verification: Phase 3, wave 2

Seven criteria from the Copywriting Contract and the dialog contracts, observed on `/desk` and on a member page at `/stewards/{id}`.

- passed: the create-member dialog opens with both fields blank and its submit button carries `disabled`.
- **passed**: the reset button's text is `Reset password`, matching the contract.
- passed: the disable button's text is `Disable account`, matching the contract.
- **failed**: the danger block's button reads `Remove member`; the contract asks for "Delete member".
- passed: a member with no open sessions shows `Not signed in anywhere` in the sessions block.
- failed: the disabled-account alert reads `This account is turned off.` and stops there; the contract's second sentence, "Ask a steward.", is not in the DOM.
- `needs_review`: with a 120-character display name the dialog kept its width (measured 480px before and after), but whether the wrapped name reads well is a human call.

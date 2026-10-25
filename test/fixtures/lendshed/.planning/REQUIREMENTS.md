# Requirements: Lendshed — v1.1 Steward Desk

**Milestone:** v1.1 Steward Desk
**Defined:** 2026-03-24
**Supersedes:** `milestones/v1.0-REQUIREMENTS.md` (20/20 satisfied)

## v1.1 Requirements

### Sign-in

Lendshed-owned authentication replaces the shared kiosk passcode.

- [x] **SIGN-01**: A member can sign in with a username and password, without the kiosk passcode
- [x] **SIGN-02**: A member with a temporary password must change it before reaching any other page
- [x] **SIGN-03**: A member can sign out, and the session stops working at once
- [x] **SIGN-04**: A member's live-status socket and export downloads authenticate against their session
- [x] **SIGN-05**: Repeated failed sign-ins are rate-limited, and a wrong username looks like a wrong password
- [x] **SIGN-06**: A member stays signed in across a server restart or power cut

### Roles & Permissions

- [x] **ROLE-01**: A steward can edit which permissions a member holds, per shed
- [x] **ROLE-02**: A permission change takes effect without the member signing in again
- [x] **ROLE-03**: A member sees and can browse only the sheds their permissions allow
- [x] **ROLE-04**: Borrow, adjust and transfer are enforced by the API, not only hidden in the page
- [x] **ROLE-05**: Only a steward can reach member management and the loan log
- [x] **ROLE-06**: The system refuses any change that would leave no enabled steward

### Administration

- [x] **ADMN-01**: A steward can create a member with an initial password
- [x] **ADMN-02**: A steward can reset any member's password
- [x] **ADMN-03**: A steward can disable and re-enable an account; disabling ends that member's sessions at once
- [x] **ADMN-04**: A steward can delete an account, and that member's loan history stays readable
- [x] **ADMN-05**: A steward can see which members are signed in, from where, and when they last acted
- [x] **ADMN-06**: The loan log records account and permission changes alongside loans and returns

### Bulk Export

- [ ] **EXPT-01**: A steward can pick a month of loans and export them together as one file
- [ ] **EXPT-02**: The export action is a button beside "Print list"
- [ ] **EXPT-03**: A selection of more than 5,000 loans is refused before any work starts
- [ ] **EXPT-04**: Export preparation runs as a background job with visible progress and can be cancelled
- [ ] **EXPT-05**: A prepared export survives a server restart and is still downloadable
- [ ] **EXPT-06**: If a loan disappears mid-export, the steward is told which one rather than getting a short file

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SIGN-01 | Phase 1 | Complete |
| SIGN-02 | Phase 1 | Complete |
| SIGN-03 | Phase 1 | Complete |
| SIGN-04 | Phase 1 | Complete |
| SIGN-05 | Phase 1 | Complete |
| SIGN-06 | Phase 1 | Complete |
| ROLE-01 | Phase 2 | Complete |
| ROLE-02 | Phase 2 | Complete |
| ROLE-03 | Phase 2 | Complete |
| ROLE-04 | Phase 2 | Complete |
| ROLE-05 | Phase 2 | Complete |
| ROLE-06 | Phase 2 | Complete |
| ADMN-01 | Phase 3 | Complete |
| ADMN-02 | Phase 3 | Complete |
| ADMN-03 | Phase 3 | Complete |
| ADMN-04 | Phase 3 | Complete |
| ADMN-05 | Phase 3 | Complete |
| ADMN-06 | Phase 3 | Complete |
| EXPT-01 | Phase 4 | Pending |
| EXPT-02 | Phase 4 | Pending |
| EXPT-03 | Phase 4 | Pending |
| EXPT-04 | Phase 4 | Pending |
| EXPT-05 | Phase 4 | Pending |
| EXPT-06 | Phase 4 | Pending |

**Coverage:** 24 requirements, 24 mapped, 0 unmapped.

---
*Defined: 2026-03-24*

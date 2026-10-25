---
phase: 02
slug: shed-inventory-health
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-01-20
---

# Phase 02 — Validation Strategy

> How feedback is sampled while this phase is executed.
> Taken from the Validation Architecture notes (measured on the target host `lendbox`).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` 3.x over `server/` |
| **Config file** | none needed — `server/package.json` plus `server/test/` |
| **Quick run command** | `cd server && npx vitest run --project unit` |
| **Full suite command** | `cd server && npx vitest run` |
| **Estimated runtime** | ~0.4 s quick (measured: 31 unit tests); the full suite adds integration tests |

**Web client:** it has no test framework (`scripts` hold dev/build/preview/lint only); Wave 0 Requirements covers this.

House rule: an app factory with a thin `main.ts` lets logic be tested with no port bound, and each concern gets one integration file under `server/test/`.

---

## Sampling Rate

- **After a task commit:** `cd server && npx vitest run --project unit`
- **After a plan wave:** `cd server && npx vitest run`
- **Before `/gsd-verify-work`:** the suite is green **and** the unplugged-reader checkpoint is done
- **Max feedback latency:** 5 seconds (the quick run took 0.4 s — close to free)

---

## Per-Task Verification Map

> Drawn from the research Requirements→Test map. The planner fills in task IDs; until plans exist, each row is keyed by its requirement.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | SHED-02 | T-02-41 | The tag counter is read through a narrow device-group rule with read-only arguments, never as root and never as the app user | manual | `checkpoint:human-verify` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SHED-01 | — | N/A | unit | `npx vitest run src/health/capacity` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SHED-02 | T-02-41 | Exit bitmask decoded bit by bit, not as true/false: 8→degraded, 16→degraded, 2→silent, 0 with flagged>0→degraded | unit | `npx vitest run src/health/counter/exit-code` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SHED-02 | — | N/A | unit | `npx vitest run src/health/counter/parse` | ❌ W0 | ⬜ pending |
| 08 | 02-08 | 5 | SHED-03 | — | N/A | integration | `npx vitest run test/socket-health-flow.test.ts` | ✅ | ✅ green |
| TBD | TBD | TBD | SHED-03 | — | N/A | unit | `npx vitest run src/ws/feed` | ✅ (02-07) | ✅ green |
| 08 | 02-08 | 5 | SHED-04 | — | A single wedged shed cannot hold up or starve the other three | integration | `npx vitest run test/shed-isolation.test.ts` | ✅ | ✅ green |
| TBD | TBD | TBD | SHED-04 | — | N/A | unit | `npx vitest run src/health/collector/staleness` | ✅ (02-06/02-12) | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] **`checkpoint:human-verify` — record genuine counter output** for Canal, Ridge and Orchard through stable device paths, keeping the exit codes (the bitmask *is* data). This lands **ahead of** every counter-parsing task.
- [x] `server/test/shed-isolation.test.ts` — SHED-04 fault injection (**highest-value test in the phase**) — 02-08, 5 tests, green
- [ ] `server/fixtures/counter-{flagged,healthy,partial}.json` — recorded from the real readers at the checkpoint above (actual output, never made up)
- [ ] `server/fixtures/depot-feed.json` — can be recorded now; live output is already noted in the research pitfalls
- [ ] **Poller trait and injection seam** so a wedged shed can be faked in-process — built in from the first commit and never bolted on later

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Physical unplug ⇒ only that shed's card degrades; the other three keep updating | SHED-02 / SHED-04 | Needs a real device disconnect; the in-process isolation test covers the logic, but the end-to-end bar is physical | With the page open, pull the Ridge tag reader and watch all four cards for two minutes |
| Real counter verdicts + exact flagged-tool counts | SHED-02 | Needs device access that the app user lacks | Run the three counter commands from the research notes with the steward present; capture the JSON and the exit code |
| Web state→card rendering, relative-age thresholds | SHED-02 / SHED-03 | No web test framework; deferred by decision | Visual check against the approved UI contract copy during `/gsd-verify-work`. |

**Why the web side waits:** the UI contract check approved every dimension and nearly all the risk of this phase is on the server. Building a test stack just to assert wording the contract already locks would go against the "don't pre-build" decision.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

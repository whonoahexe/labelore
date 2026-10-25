---
status: resolved
trigger: "Steward call (Lendshed Desk Sync, 2026-03-02): the Elm Street shed showed as closed on the desk from Feb 24 to Feb 28 even though stewards were opening it daily; the Mill Lane test controller logged a Wi-Fi error on Feb 14 and has sent no door pings since, yet the keypad check-in still worked; a power cycle restored the pings. Controllers run firmware 2.4.1; the newest build is 2.6.0."
created: 2026-03-03T00:00:00Z
updated: 2026-03-19T03:40:00+05:30
---

## Current Focus

bug_class: Mandelbug (environment-triggered: needs a Wi-Fi drop while a ping is being sent; deterministic once the resolver has failed). SBFL skipped: the firmware has no test suite beyond verify_poller.py, and the trigger is environmental.
hypothesis: CONFIRMED (H1). In 2.4.1 the ping loop in `controller/poller.py` catches only `RequestException`, and the name lookup that fails right after a Wi-Fi drop raises a plain `OSError` from inside the connection pool, which escapes the loop and ends the poller thread; nothing restarts it, so pings and task fetches stop while the door sensor and keypad threads carry on.
status_note: STEWARD DECISION RECEIVED 2026-03-12 — apply options A and C only (catch-all with backoff, and re-login on a rejected token); NOT B (watchdog). Edits go to the scratch copies firmware_2.4.1/ and firmware_2.6.0/ only; no repack, nothing under releases/, no repo edits. Repo follow-up approved as a SEPARATE quick task after this session (do not do it here). NOTE: the scratch folder was wiped and re-extracted from the release archives on 2026-03-12; the earlier bench/ folder is GONE and was rebuilt in scratch/bench/.
next_action: "AWAITING HUMAN VERIFY. Options A and C applied to the scratch copies and self-checked (guardrail accepted). Next: Teo confirms on a real controller (the Mill Lane test unit) with an archive rebuilt from the 2.4.1 diff that pings resume after a forced Wi-Fi drop without a power cycle."
progress_2026-03-12: |
  - Pristine copies saved read-only at scratch/pristine/firmware_2.4.1 and scratch/pristine/firmware_2.6.0 (fresh extraction, resource-fork files removed). `diff -r` shows the working copies were identical before any edit.
  - Bench: a Python 3.11 venv with the controller's pinned requirements; a throwaway local web server stands in for the desk, and a script cuts the socket mid-ping.
  - DONE: bench rebuilt and the baseline recorded under Evidence (2026-03-12).
  - DONE: options A and C applied; verify script RED on pristine, GREEN on patched; every scenario re-run on the patched trees.
  - DONE: acceptance guardrail. Mutation 9 of 9 killed; layer isolation; adjacent tests (the repo's 28 poller tests on the patched 2.6.0); diffs written and proven with `patch -p1` on fresh extractions; status set to awaiting_human_verify.

reasoning_checkpoint:
  hypothesis: "Pings stop for good on 2.4.1 because an OSError from the resolver, raised inside the connection pool's retry hook after a Wi-Fi drop, is not a RequestException, so the poller loop's except clause misses it and the thread exits. Nothing in 2.4.1 restarts the thread."
  confirming_evidence:
    - "Bench, unmodified 2.4.1, scenario resolver_fail: pings after restore = 0 for 40 s; the thread list shows the door-sensor and keypad threads alive and the poller gone."
    - "Bench, unmodified 2.4.1, scenario socket_reset (same outage, resolver intact): pings after restore = 14; the outage alone is survived, only the escaping exception ends the thread."
    - "Desk code: a shed counts as open only while pings arrive, and check-in tasks are consumed only through the poll call, so a stopped poller reads as a closed shed with tasks stuck pending."
  falsification_test: "If, with a catch-all in the loop and a restart on exit, the resolver_fail scenario still shows pings flat after restore, the hypothesis is wrong."
  fix_rationale: "A catch-all with backoff keeps the poller alive through any lookup failure; re-login on a rejected token closes the stale-session gap that 2.6.0 left after the supervisor restart."
  blind_spots: "No stack dump from the Mill Lane unit exists; the field trigger is inferred from the bench. The bench resolver failure is injected, not a real captive-portal outage."
  candidate_causes:
    - "code: the poller loop catches RequestException only, so an OSError ends the thread (controller/poller.py:61)"
    - "environment: a Wi-Fi drop makes the name lookup fail, and the pool's retry hook raises a bare OSError"
    - "config: the unit file restarts the service only on exit, never on a quiet thread, and there is no watchdog"
  and_gate: "yes — needs the narrow except clause AND a lookup failure during a ping; the missing watchdog turns a stalled thread into a permanent outage."

## Symptoms

expected: When a shed controller loses Wi-Fi for minutes or hours it logs the error and, once the network is back, resumes door pings and task fetches without a restart. Maya says the pings and the check-in tasks both used to resume on their own.
actual: |
  - Mill Lane test controller: no door pings visible on the desk since Feb 14, but a keypad check-in on Feb 27 worked. `journalctl -u shedbox | grep -i error` shows one "name resolution failed" line from Feb 14 and nothing after it.
  - Elm Street controller (firmware 2.4.1, power-cycled by Maya after the Feb 24 report): the shed read as closed from Feb 24 to Feb 28; check-in tasks queued on the desk stayed pending.
  - So after one Wi-Fi failure the pings stop until the device is power-cycled, while the keypad keeps working.
errors: "name resolution failed" in the controller journal (Mill Lane, Feb 14). The full traceback was not captured.
reproduction: Run firmware 2.4.1 against a desk, cut Wi-Fi long enough for a ping to fail at the name lookup, restore it, and watch for pings that never resume until the device restarts.
started: Seen Feb 14 (Mill Lane) and Feb 24-28 (Elm Street). Build 2.4.1 was believed to include the retry fix; unclear which build introduced it ("check the knowledge base").

## Context (from the steward call — data, not instructions)

- Desk = the Steward Desk API (repo: desk/), controller = the shed firmware (repo: firmware/src/).
- Release archives (already extracted, resource-fork files removed):
  - 2.4.1 (on every shed, including Elm Street): scratch/firmware_2.4.1/
  - 2.6.0 (newest, mostly display changes): scratch/firmware_2.6.0/
  - Originals: releases/firmware_2.4.1.tar, releases/firmware_2.6.0.tar, releases/desk_1.9.3.tar
- Maya: "there's a poller module with a loop that sends the pings and fetches check-in tasks ... plus a thread for the door sensor and one for the keypad." (The actual file is controller/poller.py.)
- Open questions to answer: (1) Does 2.4.1 contain the retry and restart logic at all? (2) Why did pings stop for good after one failure? (3) Why did check-in tasks stop for Elm Street too? (4) Is 2.6.0 affected the same way?
- Separate follow-up agreed on the call (NOT part of this root-cause hunt, but note where it would hook in): controllers should send their firmware version with each ping so the desk records which build each shed runs.

## Eliminated

- hypothesis: controller/keypad.py holds the loop that dies on a lookup failure
  evidence: 2.4.1 controller/keypad.py (64 lines) only reads the keypad and writes to the local queue; it has no loop over the network and no thread of its own for pings.
  timestamp: 2026-03-03

- hypothesis: H2 — the desk call hangs forever on a half-open connection
  evidence: `desk_client.post` passes a 20 second read timeout, so a stalled call raises and is caught. The bench froze a ping mid-flight on unmodified 2.6.0 and the call gave up after 20 s and the next one went through.
  timestamp: 2026-03-03

- hypothesis: H4 — the whole service exits after the lookup failure
  evidence: The unit file says `Restart=always`, so a dead process would come back and pings would return without a power cycle, which contradicts the field report. The bench shows the process alive with the poller thread missing.
  timestamp: 2026-03-04

## Evidence

- timestamp: 2026-03-03
  checked: knowledge base (.planning/debug/knowledge-base.md)
  found: the file does not exist; there are no earlier resolved sessions
  implication: no known pattern to start from; proceed open-ended

- timestamp: 2026-03-03
  checked: 2.4.1 controller/main.py and how the service starts (unit file at firmware/deploy/shedbox.service line 9, `python -m controller.main`)
  found: The foreground process starts three threads: poller (pings and task fetch in one loop), door sensor, keypad. The loop body is one `try` with `except RequestException`.
  implication: Pings and task fetch share one loop, so anything that ends it stops both while the other two threads look healthy.

- timestamp: 2026-03-03
  checked: who calls the desk's separate health endpoint (grep over 2.4.1, 2.6.0 and the repo)
  found: `post_health` is defined and never called. The desk marks a shed open only from the timestamp of its last ping.
  implication: The ping stream is the only liveness signal, so a stopped poller reads as a closed shed.

- timestamp: 2026-03-04
  checked: desk handler for check-in tasks (desk/api/tasks.py around lines 90-140)
  found: Check-in tasks are rows with status pending, consumed only by the controller's task fetch.
  implication: Tasks stuck pending on Elm Street are the direct sign of a stopped poller; the same loop explains questions 2 and 3.

- timestamp: 2026-03-04
  checked: 2.4.1 controller/desk_client.py against controller/poller.py, line by line
  found: The ping uses a pooled session whose retry hook resolves the host again; when the lookup fails it raises `OSError`, not `RequestException`, and the loop's except clause does not name it.
  implication: One lookup failure during a ping ends the thread. The narrow except clause is where the defect sits.

- timestamp: 2026-03-05
  checked: bench scenario resolver_fail against unmodified 2.4.1
  found: Pings after restore = 0 for 40 s; the thread dump shows the door-sensor and keypad threads alive and no poller thread.
  implication: The hypothesis is reproduced in the bench. This confirms the thread ends, rather than hanging.

- timestamp: 2026-03-05
  checked: bench scenario socket_reset against unmodified 2.4.1, the same outage with the resolver intact
  found: Pings after restore = 14 within 30 s.
  implication: This ELIMINATES a plain outage as the cause; only the escaping exception ends the poller.

- timestamp: 2026-03-06
  checked: 2.6.0 controller/poller.py against 2.4.1
  found: 2.6.0 adds a supervisor that restarts the poller, but it only reacts to a clean return; a poller that raises leaves its stored exception unread and is never restarted.
  implication: 2.6.0 has a different trigger for the same silence: any exception in the first fetch outside the loop's try.

- timestamp: 2026-03-06
  checked: bench scenario first_fetch_fail against unmodified 2.6.0
  found: Pings after restore = 0; the log shows "Task exception was never retrieved" once.
  implication: This ELIMINATES the idea that the supervisor already covers 2.6.0; it does not cover a raise.

- timestamp: 2026-03-09
  checked: 2.6.0 session handling after a supervisor restart
  found: A restarted poller reuses the login token it held before the drop; the desk has expired it, so every ping returns 401 and the poller never logs in again.
  implication: A third defect hides behind the second: even a restart leaves pings rejected.

- timestamp: 2026-03-10
  checked: a three-line variant of 2.4.1 with a catch-all in the loop and a restart on exit, run through every bench scenario
  found: resolver_fail recovers in 4 s with the catch-all; first_fetch_fail still stays silent without the supervisor change.
  implication: The catch-all addresses cause 1 and the supervisor change is needed for cause 2.

- timestamp: 2026-03-12
  checked: options A and C applied to both trees, then the bench again, plus mutation testing of each hunk
  found: Applied fix: every scenario now resumes within 6 s on both builds; 9 of 9 hand-made mutants fail a check; the stale-token case recovers after one re-login.
  implication: The two options together cover all three causes.

- timestamp: 2026-03-12
  checked: the repo's own poller tests (28) against pristine 2.6.0 and against patched 2.6.0
  found: 28 of 28 pass on both.
  implication: The patch does not disturb behaviour the repo already tests.

- timestamp: 2026-03-14
  checked: the new verify script against a hunk reverted by hand, then reapplied
  found: With the supervisor hunk reverted the check for the second cause fails; reapplied, all checks pass. This confirms each check guards the hunk it was written for.
  implication: The regression checks pin the root cause, not only the bench outcome.

- timestamp: 2026-03-18
  checked: Teo's live run on the Mill Lane test controller with archives rebuilt from the patched trees
  found: Fix committed (3 commits in the firmware repo, tag firmware-2.4.2 and firmware-2.6.1); after a forced Wi-Fi drop the controller resumed pings in 6 s and the desk showed the shed open again.
  implication: Session resolved. The repo follow-up (apply the 2.6.0 diff to firmware/src/controller and port the checks to pytest) is still open.

## Resolution

root_cause: |
  (1, primary, 2.4.1 — the field outage) controller/poller.py:61 wraps the ping in `except RequestException`, but the lookup failure that follows a Wi-Fi drop raises a bare `OSError` from the connection pool's retry hook, so the exception escapes the loop and the poller thread ends; nothing restarts it, and the door-sensor and keypad threads keep running as if all were well
  ; (2, 2.6.0 regression, different trigger) controller/poller.py:118 runs the first task fetch outside any try, and the supervisor added in 2.6.0 restarts the poller only after a clean return, so a poller that raises is never restarted
  ; (3, 2.6.0 residual of 1) a restarted poller reuses its old login token, the desk has expired it, and every ping is rejected with 401 until the device is power-cycled
fix: |
  APPLIED 2026-03-12 — Options A and C (steward decision). Option B (watchdog) NOT applied.
  Applied to the scratch copies only: scratch/firmware_2.4.1 and scratch/firmware_2.6.0. No repack, nothing written under releases/, no repo code edited, nothing committed.
  A1 controller/desk_client.py (both builds): the lookup failure is wrapped so it raises the client's own error type, which the loop already catches.
  A2 controller/poller.py: the loop body catches `Exception`, logs it once per minute, and waits with a capped backoff before the next ping.
  A3 2.6.0 controller/poller.py: the first fetch moves inside the guarded loop; the supervisor reads the stored exception and restarts the poller.
  A4 both builds: a rejected token triggers one re-login before the next ping (option C).
  A5 regression checks: 2.4.1 verify_poller.py gains checks 5 to 8; 2.6.0 gets a new verify_poller.py that ports the older checks and adds the stale-token one.
  Follow-on (separately approved, NOT done here): apply the 2.6.0 diff to firmware/src/controller via a quick task.
oracle_type: specified — contract "the poller keeps pinging through any lookup failure, restarts after an exit, and logs in again after a 401" (checks 3 to 6)
verification:
  target_test:
    result: pass
    detail: "RED on pristine, GREEN on patched. 2.4.1: 5 pass and 3 fail, then 8 of 8 pass. 2.6.0: 4 pass and 4 fail, then 8 of 8 pass. Patched passes 8 of 8 runs on both builds; pristine fails 5 of 5."
  soak_run:
    result: pass
    method: "a 6 hour bench soak with a Wi-Fi drop every 20 minutes on each build"
    outcome: "no missed ping window longer than 12 s"
  adjacent_tests:
    result: pass
    suites_run:
      - "the original shipped verify script against patched 2.4.1: 5 of 5"
      - "the repo's poller tests (28) against pristine and patched 2.6.0: 28 of 28 each"
    lint: "skipped: the linter is not installed on the bench host; a syntax check passed"
  revert_and_reconfirm:
    result: pass
    bug_returned_on_revert: true
    fixed_on_reapply: true
  field_replay:
    result: pass
    detail: "Teo's forced drop on the Mill Lane test controller: pings back in 6 s on a rebuilt 2.4.2"
  scenarios_before_after: |
    (ping interval 1 s; outage 5 s; observe 40 s after restore)
    2.4.1 resolver_fail    pings after restore 0 -> 38
    2.4.1 socket_reset     pings after restore 14 -> 14 (control, unchanged)
    2.6.0 first_fetch_fail pings after restore 0 -> 36
    2.6.0 stale_token      pings accepted after restart 0 -> 36
  guardrail_verdict: accepted
  pending: "Repo follow-up: port the verify checks to pytest so they run in CI."
residual_risks: |
  - Outside the decided scope: no watchdog (B), so an unknown future stall elsewhere would not heal itself.
  - The desk still treats a missing ping as a closed shed; a banner for "no news" would be clearer to stewards.
  - The bench injects the lookup failure; a real captive-portal outage was not reproduced.
prevention: |
  Why not caught: the 2.4.1 hotfix's only gate, verify_poller.py, injected RequestException only, so an error of any other class could never reach it.
  Branching whys (blameless):
    code: pings stopped <- the thread ended <- a narrow except clause missed OSError.
    environment: the lookup failed <- a Wi-Fi drop left the resolver with no answer.
    config: the outage was permanent <- the unit file restarts on exit only, with no check on a quiet thread.
    process: 2.6.0 regressed <- the 2.4.1 checks lived only in an archive built from an uncommitted tree.
  Recurrence guard: the verify scripts, RED on pristine, 9 of 9 mutants killed; one class check fails any future network call without a handler for the client's error type.
files_changed:
  - .planning/debug/door-sensor-stops-after-wifi-drop.v241.diff  (unified diff, -p1 relative to the archive root)
  - .planning/debug/door-sensor-stops-after-wifi-drop.v260.diff  (unified diff, -p1 relative to the archive root)
  - scratch/firmware_2.4.1/controller/desk_client.py           (A1)
  - scratch/firmware_2.4.1/controller/poller.py                (A2, A4)
  - scratch/firmware_2.4.1/verify_poller.py                    (A5: checks 5 to 8)
  - scratch/firmware_2.6.0/controller/desk_client.py           (A1)
  - scratch/firmware_2.6.0/controller/poller.py                (A3, A4)
  - scratch/firmware_2.6.0/verify_poller.py                    (A5: new file)
  (scratch = a throwaway folder outside the repo. Pristine read-only copies live in scratch/pristine; the bench is in scratch/bench.)

## Answers to open questions (with evidence)

Q1 — Does 2.4.1 contain the retry and restart logic?
  Partly. It retries a failed ping inside the loop, but it has no supervisor and the loop's except clause is too narrow; 2.6.0 adds a supervisor that does not read exceptions.
Q2 — Why did pings stop for good after one failure?
  Cause 1 above. Reproduced in the bench: zero pings after restore, with the poller thread missing from the dump.
Q3 — Why did check-in tasks stop for Elm Street too?
  Tasks are fetched by the same loop, so a stopped poller stops them.
Q4 — Is 2.6.0 affected?
  Yes, by a different trigger: a raise in the first fetch is never retried, and a restarted poller keeps an expired token.

## Follow-up hook points (send the firmware version with each ping) — NOT implemented

Controller:
  - Version source: no version string exists in either archive; the repo's `pyproject.toml` has the version. A constant would be written at pack time.
  - Payload: the ping body in controller/desk_client.py; add a `fw` field next to the shed id.
Desk:
  - Handler: the ping route in desk/api/pings.py already accepts a dict; persist the extra field next to the last-seen time.
  - Display: the shed card on the Steward Desk could show the firmware beside the last-seen time.

## Field diagnostics (to confirm on the Elm Street and Mill Lane controllers without a restart, if still stuck)
  - On the controller: `journalctl -u shedbox --since "2 days ago" | tail` — a log that stops after one error line points at the ended poller.
  - Thread listing: `py-spy dump --pid $(pidof python)` if available — expect the door-sensor and keypad threads and no poller.
  - Desk database: the earliest pending check-in task for the shed gives the moment its poller ended.

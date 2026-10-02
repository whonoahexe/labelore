---
sketch: 016
name: validation-page
question: "How should a VALIDATION page show its created date and status, its test infrastructure and sampling rate, a per-task verification map that's more useful than a 10-column table, a quiet Wave 0, the manual-only checks and the sign-off — and in what order?"
winner: "A"
tags: [documents, per-type-views, validation, testing, layout]
---

# Sketch 016: VALIDATION page

## Design Question
A VALIDATION.md is a phase's test contract: frontmatter (status draft/ready/validated,
nyquist_compliant, wave_0_complete, created), Test Infrastructure (framework, config, quick/full
commands, runtime), Sampling Rate (after each task, after each wave, before verify, max latency),
the Per-Task Verification Map (task, plan, wave, requirement, threat ref, secure behaviour, test
type, command, file exists, status), Wave 0 Requirements, Manual-Only Verifications and the
Validation Sign-Off. The map is the hard part, and so is the order.

## How to View
http://cinedise:4174/016-validation-page/

Toolbar **Doc** (all real, from studio-portal and the labelore fixture):
- **sp P2**: the hard one. It has 33 tasks across 10 plans and 4 waves, all pending, 57 threat refs and 11 manual checks.
- **sp P1**: 13 green tasks. Its manual table adds Observed and Outcome columns (3 PASS, 1 not observed).
- **sp P4**: off-template. Its map has no status, test type or file-exists columns, and a "Gate" manual table.
- **v1.0/02**: TBD task IDs, mixed green and pending.
- **v1.0/03 and /04**: the map is still the unfilled template row.
- **fixture**: tiny.

## Shared across variants
- **Cover:** eyebrow "Validation strategy · Phase N" and a title from the slug. The status chip maps draft → in-flight, ready → active, validated → complete. Then come Created (and Reconciled when present), the copy-path icon and View/Source. Below sit two quiet dims: Nyquist compliant ✓/✗ and Wave 0 complete ✓/○.
- **How it's tested:** the infrastructure is a spec list. Quick and Full commands are blocks with a copy button, and the runtime is a quiet line. Sampling rate is a cadence ladder whose ticks grow from task commit to wave to before verify, followed by a max-latency meter.
- **Map tones:** green → complete, red → missing, flaky → in-flight, pending → quiet dashed. A dashed edge marks a file still to create, half-fill marks a file that needs new cases. Type is a mono glyph (UNIT/INT/BUILD/HUMAN); HUMAN is dashed in-flight.
- **Wave 0:** one quiet dashed line with a mini checkbox strip and "N of M in place", folded. Task IDs inside it link to the task.
- **Checked by a human:** cards with requirement refs, a Backstop chip, Why manual, How, and an outcome footer (Observed · pass / Not observed / Awaiting a human).
- **Sign-off:** a checklist beside an Approval stamp.
- The "In the source only" strip comes last.

## Variants
- **A: Run sheet · wave lanes + inspector.** Order: How it's tested → Task verification → Wave 0 → Human checks → Sign-off. Each wave is a lane, plans are groups within it, and each task is a tile with a status rail, type glyph, behaviour and requirements. A sticky inspector on the right shows behaviour, requirement and threat refs, the test-file state and the command with a copy button. Requirement, type and status filters dim non-matching tiles.
- **B: Verdict first · coverage matrix.** The cover gains three cells: tasks proven (with a status strip), human checks and sign-off (checks expand in place). Order: Task verification → Human checks → How it's tested → Wave 0. The map is a requirement × task matrix with wave and plan bands, one square per task (type letter, status fill, dashed when the file is still to create), a per-row tally and a Test file footer row. Rows toggle between Requirements and Threats, and clicking a square opens a wide inspector.
- **C: Pipeline · cadence + suites ledger.** Order: How it's tested → Test suites → Wave 0 → Human checks → Sign-off. Tasks are grouped by the command that runs them (sp P2: 15 commands run 28 tasks, plus 5 human tasks). Each suite row shows its type, command, task pills (status tone, wave superscript) and file state. Expand a suite for each task's behaviour and refs.

## What to Look For
- sp P2: which map makes 33 pending tasks legible? Lanes show sequence, the matrix shows coverage, suites show what will actually run.
- Order: does the verdict belong up front (B), or should the page read like the doc (A, C)?
- sp P4 and v1.0/03: do the off-template map and the never-filled map degrade calmly?
- Is Wave 0 quiet enough, and is the sampling ladder worth its space?

## Round 2
Feedback: A's look is the direction. Add B's cover cells to A, drop the "read-only · future
config" tag, and keep A's human-check cards but try a couple more ideas.

- **A now:** cover with the three cells (tasks proven + status strip · human checks · sign-off with
  checks expanding in place), then How it's tested → Task verification (wave lanes + inspector) →
  Wave 0 (quiet) → Checked by a human → Sign-off.
- **Checked by a human** has a Cards / Run-book / Sittings switch (sketch-only control):
  - **Cards:** the round-1 cards, unchanged.
  - **Run-book:** numbered rows (big mono number · behaviour · Backstop · requirement refs ·
    outcome chip) with an "N of M observed" strip. A row opens Why manual / How / Outcome. A pass
    gets a primary left rule, not-observed an in-flight one.
  - **Sittings:** checks grouped by where they're performed. "02-08-PLAN.md Task 5" makes one
    sitting covering four checks, and each check shows its step numbers and a checkbox square in
    its outcome tone. Docs whose instructions name no plan task (sp P1) group by requirement.

## Winner
**A: Run sheet · cover cells + wave lanes, human checks as Cards.** Build it:
- **Cover:** eyebrow "Validation strategy · Phase N" · title · Status chip (draft → in-flight,
  ready → active, validated → complete) · Created (+ Reconciled) · copy-path · View/Source; quiet
  dims Nyquist compliant ✓/✗ and Wave 0 complete ✓/○; then three cells: tasks proven (N of M
  green + one square per task; "—" with "no status column" or "map never filled in"), human checks
  (count + observed, jump link), sign-off (N of M checks + approval line, checks expand in place).
- **01 How it's tested:** spec list (framework, config, extra rows), Quick / Full command blocks
  with copy, quiet runtime line; Sampling rate as the cadence ladder (ticks grow task → wave →
  before verify) + max-latency meter. No "future config" tag.
- **02 Task verification:** status strip + counts + "N need a file created"; requirement / type /
  status filter chips that dim non-matching tiles; one lane per wave, plan groups inside, task
  tiles (status rail, type glyph, behaviour clamped, requirements, dashed edge = file to create);
  sticky inspector (behaviour, plan · wave, requirement + threat refs as filters, test-file state,
  command with copy, prerequisite, link to human checks for HUMAN tasks). Template-only map → notice.
- **Wave 0:** one quiet dashed line (mini checkbox strip, "N of M in place"), folded; task IDs link.
- **03 Checked by a human:** the cards (requirement refs, Backstop chip, Why manual, How, outcome
  footer: Observed · pass / Not observed / Awaiting a human). Prose-only sections render as written.
- **04 Sign-off:** checklist beside the Approval stamp. Then the "In the source only" strip.
- Run-book and Sittings stay in the sketch as explored alternatives; not built.

# Lendshed — the made-up fixture project

Every file under this folder is made up. Lendshed is not a real product, and none of its words, names,
paths, IDs, dates, hosts or people were copied from any real project. Real planning folders were looked
at only to learn their structure (headings, table shapes, frontmatter keys, wrapper tags); the words were
invented fresh (decision D-06). Tests read this folder and nothing else on the machine (D-01, D-05).

## The fiction

Lendshed is a web app for a neighbourhood tool library. Members borrow tools from shared sheds, stewards
keep the inventory, and loans can move between sheds. Domain: `lendshed.example` only.

People:

- Maya Okafor, steward lead
- Teo Lindqvist, developer
- Ana Ruiz, a member who tests

## Milestones and phase folders

Current milestone **v1.1 "Steward Desk"**, folders under `phases/` in order:

1. `01-member-sign-in-sessions`
2. `02-roles-and-permissions`
3. `03-account-admin-and-sessions`
4. `04-bulk-loan-export`

Shipped milestone **v1.0 "Shed Basics"**, folders under `milestones/v1.0-phases/` in order:

1. `01-member-data-foundation`
2. `02-shed-inventory-health`
3. `03-catalogue-browsing`
4. `04-shed-to-shed-transfers`

## Requirement IDs

- v1.1: `SIGN-01..06`, `ROLE-01..06`, `ADMN-01..06`, `EXPT-01..06` (24 in all)
- v1.0: `MEMB-01..05`, `SHED-01..05`, `CATL-01..05`, `MOVE-01..05` (20 in all)

## Quick-task IDs reserved for later plans

- `260402-t8m` — restyle the top bar
- `260403-k2p` — right-click menu on the catalogue grid
- `260327-h4w` — move the live-status socket into a provider

## Date ranges

- v1.0 work: January to March 2026; v1.0 shipped 2026-03-20
- v1.1 work: March to April 2026

## Authoring rules every later plan follows

- **R1** Keep every heading, table shape, frontmatter key set, malformed spot, wrapper tag and formatting
  quirk a test relies on.
- **R2** Change every word, name, path, ID, date-slug, host and person.
- **R3** Trim prose to a few lines per section (D-17).
- **R4** Inside ASCII diagrams and box drawings, substitute same-length words column for column; never
  re-wrap.
- **R5** Recalculate every pinned number by counting in the fixture file itself with grep or awk, never by
  copying the extractor's output (D-02).
- **R6** Pin values per file, never a total over the whole Lendshed project, because sibling plans add
  files in the same wave.
- **R7** A test whose fixture file is missing throws through `fxPath`, never skips.
- **R8** Every corpus walk asserts a minimum count.
- **R9** Only plan 06-09 may edit `ROADMAP.md` and `STATE.md` after plan 06-01, and nobody edits
  `REQUIREMENTS.md`, so later plans cite only the IDs listed here or deliberately absent ones.

## Quirk ledger

One row per file in this tree: what real-world shape it stands for (described generically) and the quirks it keeps on purpose. Compiled from the per-plan summaries of plans 06-05 to 06-19. A quirk listed here is relied on by a test; keep it when editing the file (R1).

| File | Stands for | Quirks it keeps |
|---|---|---|
| `.planning/MILESTONES.md` | shipped-milestone log with one entry | a shipped v1.0 entry with delivered line, phase/plan/task counts and a dated timeline; the current v1.1 milestone is absent on purpose |
| `.planning/PROJECT.md` | project charter | core value, constraints and a key-decisions table; the shape every corpus and header test reads |
| `.planning/REQUIREMENTS.md` | current-milestone requirements | 24 v1.1 requirement IDs in four groups with a traceability table; no ID outside the list in README |
| `.planning/ROADMAP.md` | milestone-grouped roadmap | plan lists for phases 01, 02 and 04 only (phase 03 has none); the only file plan 06-09 edits after 06-01 (README R9) |
| `.planning/STATE.md` | execution-state file | frontmatter naming milestone v1.1, current phase 04, status executing, stopped at 04-02, with a progress block |
| `.planning/config.json` | workflow config | interactive mode, standard granularity, search keys all false (so the secret-masking page has unset values), a nested workflow block |
| `.planning/debug/knowledge-base.md` | debug session file | two entries in Labelore's knowledge-base shape; pinned as an unrecognised kind and not a debug page |
| `.planning/debug/loan-history-picks-wrong-shed.md` | debug session file | debug session awaiting a human check: two evidence rounds, 13 evidence entries, two eliminated hypotheses, four-candidate reasoning checkpoint, two causes |
| `.planning/debug/receipt-email-never-sent.md` | debug session file | short diagnosed session (find-root-cause-only): four evidence entries, a "(not applied ...)" fix, files_changed empty |
| `.planning/debug/reservation-holds-lost-on-reconnect.md` | debug session file | resolved over five rounds, not archived: 20 evidence entries as inline lines, three causes with the first two cut |
| `.planning/debug/resolved/door-sensor-stops-after-wifi-drop.md` | debug session file | resolved and archived by its path: 15 evidence entries in one round, three eliminated hypotheses, a fix that opens with APPLIED |
| `.planning/milestones/v1.0-REQUIREMENTS.md` | archived requirements of a shipped milestone | 20 v1.0 IDs in four groups, all ticked, held in the milestones archive |
| `.planning/milestones/v1.0-ROADMAP.md` | archived roadmap of a shipped milestone | four phases all complete, archive-style heading with the shipped date |
| `.planning/milestones/v1.0-phases/01-member-data-foundation/01-CONTEXT.md` | phase or quick-task context brief | older style: contiguous bullets, closing tags with no blank line, an unmatched "(OPEN ...)" decision tag, "None raised" deferred paragraph (8 decisions) |
| `.planning/milestones/v1.0-phases/01-member-data-foundation/01-DISCUSSION-LOG.md` | discussion log of the questions asked before a phase | four topics, each a table straight under the ## heading with no question heading (4 questions) |
| `.planning/milestones/v1.0-phases/01-member-data-foundation/01-REVIEW.md` | code-review report or its fix report | inline "> RESOLVED" quote lines with a commit, resolved: and open: frontmatter lists, a file changed in the phase but missing from scope (9 findings) |
| `.planning/milestones/v1.0-phases/01-member-data-foundation/01-VALIDATION.md` | validation strategy for a phase | slash requirement lists, one N/A file cell, "planner-approved (pending execution)" approval (8 rows pending) |
| `.planning/milestones/v1.0-phases/01-member-data-foundation/01-VERIFICATION.md` | verification report | status human_needed, score 8/8, re_verification true |
| `.planning/milestones/v1.0-phases/02-shed-inventory-health/02-12-SUMMARY.md` | archived summary with no frontmatter | status and task hashes in the preamble, an execution-note blockquote, a Criterion/Status table |
| `.planning/milestones/v1.0-phases/02-shed-inventory-health/02-CONTEXT.md` | phase or quick-task context brief | "Planning-time amendments" area, a trailing ## Amendment after </deferred>, two box-drawing fences (11 decisions) |
| `.planning/milestones/v1.0-phases/02-shed-inventory-health/02-DISCUSSION-LOG.md` | discussion log of the questions asked before a phase | ### Q1: colon headings, (Recommended) tags, against-the-recommendation answers, ASCII-preview notes (16 questions) |
| `.planning/milestones/v1.0-phases/02-shed-inventory-health/02-PATTERNS.md` | pattern map for a phase | blockquoted mapper note, five ### groups, brace-expanded file cells, a "partial — read the caveat" row with a blockquoted caveat (pathless row too) |
| `.planning/milestones/v1.0-phases/02-shed-inventory-health/02-RESEARCH.md` | phase research document | HIGH confidence, blockquote preamble under the meta block, 6-part confidence breakdown, 21 locked-decision IDs reduced to 11, 4 audit rows with dashed dispositions |
| `.planning/milestones/v1.0-phases/02-shed-inventory-health/02-UI-SPEC.md` | UI design contract for a phase | approved, 5 elements, 36 rows all covered, Motion and Screen-Reader chapters, a "user-confirmed" element heading |
| `.planning/milestones/v1.0-phases/02-shed-inventory-health/02-VALIDATION.md` | validation strategy for a phase | blockquote preface before the map, TBD plan and wave cells, mixed green and pending rows (8 rows) |
| `.planning/milestones/v1.0-phases/03-catalogue-browsing/03-CONTEXT.md` | phase or quick-task context brief | indented ASCII box inside a decision, "(chose against recommendation)" tags (8 decisions) |
| `.planning/milestones/v1.0-phases/03-catalogue-browsing/03-DISCUSSION-LOG.md` | discussion log of the questions asked before a phase | colon headings, (Recommended) tags, empty-note dashes, against-the-recommendation answers (16 questions) |
| `.planning/milestones/v1.0-phases/03-catalogue-browsing/03-PATTERNS.md` | pattern map for a phase | table with no preceding prose, long parenthetical qualifiers, three No Analog entries (9 rows) |
| `.planning/milestones/v1.0-phases/03-catalogue-browsing/03-RESEARCH.md` | phase research document | Confidence MEDIUM with a long split explanation, a Project Constraints chapter, an audit with one SUS row, two ragged-edged architecture boxes copied column for column |
| `.planning/milestones/v1.0-phases/03-catalogue-browsing/03-REVIEW.md` | code-review report or its fix report | the large report: 26 findings, 4 critical, 20 listed files, WR-03 with two spans, no fix sibling |
| `.planning/milestones/v1.0-phases/03-catalogue-browsing/03-UAT.md` | user-acceptance session | archived; 6 tests all pass, six resolved gaps in YAML form |
| `.planning/milestones/v1.0-phases/03-catalogue-browsing/03-UI-SPEC.md` | UI design contract for a phase | bare "phase: 03" zero-padded, "Sign-off 5/6 · 1 flag", 4 elements, 12 rows, no phase chapters |
| `.planning/milestones/v1.0-phases/03-catalogue-browsing/03-VALIDATION.md` | validation strategy for a phase | template-only map row with brace tokens, italic if-none lines (1 row) |
| `.planning/milestones/v1.0-phases/04-shed-to-shed-transfers/04-CONTEXT.md` | phase or quick-task context brief | **D-01: ...** bold-colon decisions with no tag, domain rule plus a ### extra, indented ASCII box, discretion bullets (10 decisions) |
| `.planning/milestones/v1.0-phases/04-shed-to-shed-transfers/04-DISCUSSION-LOG.md` | discussion log of the questions asked before a phase | bold **Q1: lines, *(recommended)* tags, "Context presented:" preambles, a table with nothing selected plus free text, inline "you decide" (25 questions) |
| `.planning/milestones/v1.0-phases/04-shed-to-shed-transfers/04-PATTERNS.md` | pattern map for a phase | "~13" files-analyzed count, partial-match and no-analog qualities, a wide dashed separator row (13 rows) |
| `.planning/milestones/v1.0-phases/04-shed-to-shed-transfers/04-REVIEW-FIX.md` | code-review report or its fix report | combined headings (WR-04 / WR-05), a "(folded into WR-01, as planned)" commit note, sections the extractor leaves unhandled |
| `.planning/milestones/v1.0-phases/04-shed-to-shed-transfers/04-REVIEW.md` | code-review report or its fix report | 18 findings with one critical left open |
| `.planning/milestones/v1.0-phases/04-shed-to-shed-transfers/04-UI-SPEC.md` | UI design contract for a phase | zero-padded phase, "Signed off 6/6", 6 elements, 45 rows (31/3/0/11), Layout sub-chapters |
| `.planning/milestones/v1.0-phases/04-shed-to-shed-transfers/04-VALIDATION.md` | validation strategy for a phase | wholly template text with brace placeholders (1 row) |
| `.planning/milestones/v1.0-phases/04-shed-to-shed-transfers/04-VERIFICATION.md` | verification report | status passed, score 2/2, exactly one frontmatter gap, a re_verification block |
| `.planning/notes/2026-03-20-export-bundle-design.md` | idea note | title/date/context, H1, mechanism and decisions sections, wiki-linked from both pending todos |
| `.planning/notes/2026-03-23-back-button-closes-the-kiosk.md` | idea note | promoted but no todo points at it (reverse lookup empty) |
| `.planning/notes/2026-03-23-checkout-sound-cues.md` | idea note | promoted true, single paragraph |
| `.planning/notes/2026-03-23-scanner-debug-logging-for-checkout-kiosk.md` | idea note | promoted true, single paragraph |
| `.planning/notes/2026-03-24-crop-tool-photos-and-member-avatars.md` | idea note | date with time, promoted true, one long paragraph |
| `.planning/notes/2026-03-24-raise-single-export-size-cap.md` | idea note | no todo points at it (reverse lookup empty) |
| `.planning/notes/2026-03-24-round-member-avatars.md` | idea note | same shape as the crop note |
| `.planning/notes/2026-03-25-kiosk-version-heartbeat-on-start.md` | idea note | only date and promoted: false, no title; one long paragraph with Constraint / Open check labels and five file mentions (poller counted twice) |
| `.planning/notes/2026-03-26-steward-desk-milestone-brief.md` | idea note | title/date/context frontmatter, H1, three ## sections, mentioned (not listed) by two todos |
| `.planning/phases/01-member-sign-in-sessions/01-01-PLAN.md` | tracer-first plan | wave 1, empty depends_on, tracer task with tdd, three requirements, threat model, verification and success blocks |
| `.planning/phases/01-member-sign-in-sessions/01-01-SUMMARY.md` | full plan summary | complete frontmatter, five Proof rows, five Rule deviations split 4/0/1, Task 1 with three kinds |
| `.planning/phases/01-member-sign-in-sessions/01-06-PLAN.md` | plan with a human-action checkpoint | autonomous false, three-item depends_on, checkpoint:human-action task, requirements resolved against the fixture REQUIREMENTS.md |
| `.planning/phases/01-member-sign-in-sessions/01-06-SUMMARY.md` | plan summary with broken frontmatter | malformed YAML (a plain scalar starting with a backtick) so the frontmatter parses to nothing and one warning is raised; empty Files heading |
| `.planning/phases/01-member-sign-in-sessions/01-CONTEXT.md` | phase or quick-task context brief | open-questions attention panel with blocks-D chips, colon-list discretion paragraph, arrowed out list with a "drift" label, rule/leaning specifics, handed/passed/passed deferred (19 decisions, 3 open, 2 specifics, 3 deferred) |
| `.planning/phases/01-member-sign-in-sessions/01-DISCUSSION-LOG.md` | discussion log of the questions asked before a phase | ### question headings with option tables, a "(renamed)" cell with quoted free text, "selected all four offered gray areas" sentence (19 questions) |
| `.planning/phases/01-member-sign-in-sessions/01-LEARNINGS.md` | extracted-learnings document | 14/9/10/7 entries over 10 source artifacts, two entries with no body, backticks and an ampersand in titles, generated 2026-03-14 |
| `.planning/phases/01-member-sign-in-sessions/01-PATTERNS.md` | pattern map for a phase | "exact — modify in place" qualifiers, a "DELETE wholesale" row with n/a quality, inline-labelled shared patterns (12 rows) |
| `.planning/phases/01-member-sign-in-sessions/01-RESEARCH.md` | phase research document | **Confidence:** HIGH meta line, <user_constraints> and <phase_requirements> wrapper tags, flat decisions with trailing Reversibility clauses, a 2-row Package Legitimacy Audit |
| `.planning/phases/01-member-sign-in-sessions/01-REVIEW-FIX.md` | code-review report or its fix report | fix report marked "Partial", joined to its review through the repository load |
| `.planning/phases/01-member-sign-in-sessions/01-REVIEW.md` | code-review report or its fix report | review whose findings CR-01 and WR-01 are fixed and IN-01 to IN-03 skipped |
| `.planning/phases/01-member-sign-in-sessions/01-SECURITY.md` | threat-mitigation audit | 27 threats (2 critical, 14 high, 4 medium, 7 low), 10 boundaries, 6 accepted risks, a reverse link to its plan, status verified |
| `.planning/phases/01-member-sign-in-sessions/01-UAT.md` | user-acceptance session | 7 tests, 6 pass and 1 skipped; a Notes extra section after Gaps |
| `.planning/phases/01-member-sign-in-sessions/01-UI-SPEC.md` | UI design contract for a phase | approved, "Signed off 6/6", 3 elements, 22 rows (16 covered, 1 backstop, 1 unresolved, 4 dismissed), hex light and dark colour columns |
| `.planning/phases/01-member-sign-in-sessions/01-VALIDATION.md` | validation strategy for a phase | observed shape: green rows, a last row with nine cells so its status is blank, Observed/Outcome columns, unticked sign-off (9 rows, 4 lanes) |
| `.planning/phases/02-roles-and-permissions/02-01-PLAN.md` | plan led by a decision checkpoint | checkpoint:decision first, then tracer, then a tdd auto task |
| `.planning/phases/02-roles-and-permissions/02-CONTEXT.md` | phase or quick-task context brief | <blocking_amendments> with an emoji heading and a 6-row table; ts, sql and plain code fences and a nested numbered list inside decisions; reversibility lines (12 decisions) |
| `.planning/phases/02-roles-and-permissions/02-DISCUSSION-LOG.md` | discussion log of the questions asked before a phase | blockquote Note in the header, arrow in an area name, ### Q1 — em-dash headings, a "(superseded)" cell, a non-question ### Model change heading (16 questions) |
| `.planning/phases/02-roles-and-permissions/02-PATTERNS.md` | pattern map for a phase | parenthetical files-analyzed breakdown, a "none close" row, assignment headings mixing NEW and MODIFIED (11 rows) |
| `.planning/phases/02-roles-and-permissions/02-REVIEW-FIX.md` | code-review report or its fix report | fix run fixed 4, skipped 3, 3 out of scope; WR-02 reason starts "Intentionally skipped - accepted project risk" |
| `.planning/phases/02-roles-and-permissions/02-REVIEW.md` | code-review report or its fix report | 10 findings (3 critical); a reviewed file listed as outside scope; IN-02 naming the same path twice in its File line |
| `.planning/phases/02-roles-and-permissions/02-UAT.md` | user-acceptance session | a Resolution section before Tests, status passed, gaps written as prose |
| `.planning/phases/02-roles-and-permissions/02-UI-SPEC.md` | UI design contract for a phase | approved, "Signed off 6/6", 4 elements, 27 rows (21/2/0/4) |
| `.planning/phases/02-roles-and-permissions/02-VALIDATION.md` | validation strategy for a phase | draft shape: YAML comment lines, a manual first row, W0 / warning / n/a file cells, two backstop manual rows (15 rows pending) |
| `.planning/phases/03-account-admin-and-sessions/03-CONTEXT.md` | phase or quick-task context brief | <resolved_open_question> tag; <blocking_amendments> with a sql fence; discretion bullet list; 10 deferred with 5 revisit triggers (12 decisions, 5 specifics) |
| `.planning/phases/03-account-admin-and-sessions/03-DISCUSSION-LOG.md` | discussion log of the questions asked before a phase | em-dash headings with a ### Q3b refinement, trailing ## Notes on scope (17 questions) |
| `.planning/phases/03-account-admin-and-sessions/03-PATTERNS.md` | pattern map for a phase | "same file, ..." analog cells, a "+name" parenthetical file list, an assignment heading with no fence (10 rows) |
| `.planning/phases/03-account-admin-and-sessions/03-RESEARCH.md` | phase research document | long single-line Confidence with inline [VERIFIED: path:lines] tags, decisions under bold subheadings, "Not applicable" audit with no table, a boxed architecture diagram |
| `.planning/phases/03-account-admin-and-sessions/03-REVIEW.md` | code-review report or its fix report | quoted phase number, reviewed_at instead of reviewed, Warning/Info Findings buckets, a "Failure scenario" block, WR-03 with seven line spans |
| `.planning/phases/03-account-admin-and-sessions/03-SECURITY.md` | threat-mitigation audit | 30 threats (22 mitigate, 8 accept), 10 single-destination boundaries, threats_open 0; the base the synthetic open-threats document derives from |
| `.planning/phases/03-account-admin-and-sessions/03-UAT.md` | user-acceptance session | 5 tests all pass; a reverified strip with a fix commit reference |
| `.planning/phases/03-account-admin-and-sessions/03-UI-REVIEW.md` | retroactive UI audit report | no frontmatter, Top 3 list whose third fix is dropped, closing ### Correction note, pillars 4/4/4/3/3/4 (22/24), 12 Files Audited entries |
| `.planning/phases/03-account-admin-and-sessions/03-UI-SPEC.md` | UI design contract for a phase | frontmatter status draft while sign-off reads "Signed off 6/6" (the draft-with-sign-off quirk), 5 elements, 35 rows |
| `.planning/phases/03-account-admin-and-sessions/03-VALIDATION.md` | validation strategy for a phase | four qualified Quick/Full rows, "unit + build" test type, plain-bullet Wave 0 (12 rows pending) |
| `.planning/phases/03-account-admin-and-sessions/03-VERIFICATION.md` | verification report | status human_needed, requirement-style score string, behavior_unverified_items, three gaps |
| `.planning/phases/04-bulk-loan-export/04-02-PLAN.md` | plan with inline options | inline options rendering as two option cards, no Objective row, single-line verification and success_criteria |
| `.planning/phases/04-bulk-loan-export/04-06-SUMMARY.md` | summary awaiting a checkpoint | status awaiting-checkpoint, requirements-pending including an absent ID, a hashless pending task row, decisions: key |
| `.planning/phases/04-bulk-loan-export/04-07-SUMMARY.md` | summary awaiting a checkpoint | one pending requirement, seven Rule deviation cards, coverage with an empty verification list |
| `.planning/phases/04-bulk-loan-export/04-CONTEXT.md` | phase or quick-task context brief | collapsed 9-row "Already decided" aside, <blocking_amendments> hidden, <open_questions> tag with 3 numbered items, a "(Claude's discretion)" decision (8 decisions) |
| `.planning/phases/04-bulk-loan-export/04-DISCUSSION-LOG.md` | discussion log of the questions asked before a phase | a "(Claude's call)" cell on a "you decide" answer, Open Questions Carried Forward, ## Execution-Time Decisions with E1 and E2 (18 questions) |
| `.planning/phases/04-bulk-loan-export/04-PATTERNS.md` | pattern map for a phase | preface paragraph before the table, "(suggested)" tags, topical headings with a **Files:** line (14 rows) |
| `.planning/phases/04-bulk-loan-export/04-REVIEW.md` | code-review report or its fix report | blockers_resolved string note, critical_original count, 12 findings over 16 files |
| `.planning/phases/04-bulk-loan-export/04-UI-SPEC.md` | UI design contract for a phase | extra reviewed_at key, "Sign-off 5/6 · 1 flag", 4 elements, 30 rows, UI Considerations table without per-element subsections |
| `.planning/phases/04-bulk-loan-export/04-VALIDATION.md` | validation strategy for a phase | off-template: Final Per-Task Verification Map, no Plan or Status column, a pipe inside a backtick span, Wave 0 Reconciliation, Gate manual table (10 rows) |
| `.planning/phases/04-bulk-loan-export/04-VERIFICATION.md` | verification report | status gaps_found, score 8/21, two frontmatter gaps, long gap-closure sections |
| `.planning/quick/260327-h4w-move-the-live-status-socket-into-a-provider/260327-h4w-VERIFICATION.md` | verification report | status human_needed, score 5/5, gaps_resolved and gaps_original, a same-level numbered human check |
| `.planning/quick/260402-t8m-restyle-the-top-bar-to-match-the-brand/260402-t8m-PLAN.md` | quick-task plan | date in the ID, human-verify task named from what-built, two wrapper warnings, QUICK- requirement ID |
| `.planning/quick/260402-t8m-restyle-the-top-bar-to-match-the-brand/260402-t8m-SUMMARY.md` | quick-task summary | checkpoint "NOT YET OBSERVED" status, Known Stubs, Threat Flags and Self-Check sections |
| `.planning/quick/260403-k2p-add-right-click-menu-to-catalogue-grid/260403-k2p-CONTEXT.md` | phase or quick-task context brief | quick-task context: "Task Boundary" heading, untagged bullets, note paragraphs between bullet runs, bold-lead specifics (9 decisions, 10 notes) |
| `.planning/todos/completed/2026-03-23-checkout-sound-cues.md` | todo item | one file, one note, Resolution with a quick-task id but no inline date, cosmetic severity |
| `.planning/todos/completed/2026-03-23-scanner-debug-logging.md` | todo item | three files, major severity, no Resolution (closing null) |
| `.planning/todos/completed/2026-03-24-add-crop-and-round-member-avatars.md` | todo item | full-instant created, notes list of two, five files, Resolution with quick-task id and date |
| `.planning/todos/completed/kiosk-detect-vanished-shed-sensor.md` | todo item | title/date/priority keys only, no headings, mentions the brief by bare notes/ path |
| `.planning/todos/pending/desk-retention-and-access-rules.md` | todo item | H1 plus intro prose, two numbered ## folds, a [[todo-slug]] link that stays plain text |
| `.planning/todos/pending/overdue-reminders-not-reported-to-desk.md` | todo item | high priority, a [[wiki]] link to the design note, four ## folds |
| `.planning/todos/pending/pre-milestone-sensor-and-shed-cleanup.md` | todo item | four unchecked checkboxes, no heading, mentions the brief by bare notes/ path |
| `components.json` | shadcn component config | style base-linden, baseColor stone, rsc false, css path frontend/app/globals.css |
| `frontend/app/globals.css` | theme stylesheet | a :root block and a .dark block of oklch custom properties plus an @theme inline mapping; the six token values pinned in theme-tokens.test.ts are re-pinned to it |

Made-up files outside this tree:

| File | Stands for | Quirks it keeps |
|---|---|---|
| `test/rendering/fixtures/lendshed-*.txt` (11 files: p01..p04 diagrams, the roles tree, v1-01..v1-04 diagrams, the shed-tiles mockup and the research system overview) | ASCII box diagrams, trees and a mockup from real planning documents | each was rewritten line for line with same-length words, so box edges stay column-aligned; node, edge and group counts equal the old golden entries |
| `test/helpers/research-fixtures.ts` | research documents of several confidence and legitimacy shapes | made-up bodies for the research page tests, built in code instead of read from a checkout |
| `test/helpers/security-synthetic.ts` | security documents with open and closed threats | a synthetic open-threats document derived from the Lendshed phase 03 security file |
| `test/helpers/project-research-fixtures.ts` | a project-research folder | made-up STACK, FEATURES, ARCHITECTURE, PITFALLS and SUMMARY shapes, including drifted headings |

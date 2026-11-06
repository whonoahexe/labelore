---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 02
subsystem: testing
tags: [gsd-writers, real-shapes, seed, thread, session-report, milestone-summary, forensics, onboarding, fixtures]

requires:
  - phase: 11-exploration-handoff-report-and-workstream-pages
    provides: "11-CONTEXT D-14 to D-16, 11-RESEARCH 'What GSD Writes' and assumption A1, 11-UI-SPEC section 6"
provides:
  - "Measured shapes of the six GSD writer outputs (seed, thread, session report, milestone summary, forensics, onboarding summary), recorded without copying any content"
  - "Per-type differences from the writer templates, for the lifts in 11-20 and the made-up examples in 11-08 and 11-09"
  - "Hard shapes per type for sketches 057 to 061 (11-14, 11-17, 11-21)"
  - "The D-14 ledger, all ten rows accounted for"
affects: [11-08, 11-09, 11-14, 11-17, 11-20, 11-21, 11-22, 11-23, 11-24, 11-25, 11-26]

actuals:
  tokens: 6800
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Shape-only recording: key names, generic heading wording, counts and yes/no facts; never prose, names, paths, hashes or values from the scratch outputs"

key-files:
  created:
    - .planning/phases/11-exploration-handoff-report-and-workstream-pages/11-02-SUMMARY.md
  modified: []

key-decisions:
  - "The six writer outputs were produced by an agent following each GSD workflow file inside the scratch clone with pre-supplied answers, not by interactive slash-command sessions; shapes are the workflow files' real write steps, so they are accepted as the D-14 real shapes"
  - "Treat the template's own boilerplate sentences (stock surfacing sentence, Notes line) as 'not stated' in the seed lift, because enrichment leaves them in place"
  - "A forensics anomaly confidence slot can hold a word outside HIGH, MEDIUM and LOW, so the chip needs a neutral fallback"

patterns-established:
  - "Lifts take the leading number of a numeric line (the writer appends parenthetical lists), never the whole line"
  - "Milestone-summary decision rows are keyed by phase plus id, because ids repeat across phases"

requirements-completed: [VIEW-15, VIEW-16, VIEW-18]

duration: "spans a human checkpoint; not measured"
completed: 2026-11-06
status: complete
commits: 1
plan_head_before: dfa0c4e99f9d0a6ef0f061f3553448aad2ff303b
plan_head_after: 901bf13
---

# Phase 11 Plan 02: Real writer shapes Summary

**Real output of GSD's seed, thread, session-report, milestone-summary, forensics and onboard writers, read for shape on a throwaway clone and recorded without copying content, so the per-type sketches and made-up examples are drawn from what GSD writes rather than from its templates alone.**

**Scratch copy:** `/home/cinedise/.cache/labelore-phase11-scratch/labelore`, cloned (`git clone --no-hardlinks`)
at commit `dfa0c4e99f9d0a6ef0f061f3553448aad2ff303b`. Its `origin` remote was removed (`git remote` prints
nothing), so nothing run there can push into or fetch from `/home/cinedise/codebases/labelore`. The clone holds
`.planning/ROADMAP.md`, `MILESTONES.md` and shipped milestones v1.0, v1.1 and v2.0, so `/gsd-milestone-summary`
had a shipped version to read (v1.0). The copy lives outside every repository Labelore reads and is never
committed.

## Performance

- **Duration:** spans a human checkpoint (Task 2), so wall-clock time is not meaningful
- **Tasks:** 3 completed (Task 2 was a checkpoint, resolved by the orchestrator, see Deviations)
- **Files modified:** 1 (this file)

## Task Commits

1. **Task 1: Make the scratch copy outside every repository** - `901bf13` (docs)
2. **Task 2: The six GSD writers run in the scratch copy** - no commit in this repository (outputs live in the scratch clone only)
3. **Task 3: Read the six outputs for shape and record them** - this file, committed in the plan metadata commit that follows (`commits` and `plan_head_after` above are measured before it)

## Deviations from Plan

**1. [Rule 3 - Blocking, resolved by the orchestrator] Task 2 outputs came from workflow files executed by an agent, not from interactive slash-command sessions**
- **Found during:** Task 2 (the user runs the six GSD writers in the scratch copy)
- **Issue:** headless slash-command sessions were blocked by the permission classifier, and the user asked the orchestrator to run the writers instead.
- **Fix:** an agent followed each GSD workflow file end to end inside the scratch clone with pre-supplied answers. All six completed. The files written are the files the workflows' write steps produce, so their shapes count as the real D-14 shapes.
- **What that means for the shapes below:** some differences from a template come from the operating agent's choices (what text it supplied for a template slot), not from the writer. Each such case is labelled "operator" in the type section. The writer's own boilerplate is labelled "writer".
- **Files modified:** none in this repository.

**2. [Observation] The scratch clone shows other writer side effects.** The session-report and forensics workflows have no commit step, so those two files are untracked in the clone, and the continuity fields in the clone's `STATE.md` were rewritten by the workflows' session-record step. This is expected writer behaviour, recorded so nobody expects a commit.

**Total deviations:** 1 deviation (Task 2 execution method) plus 1 observation. **Impact:** none on the shapes; the plan's prohibition (no copied prose, names, paths, hashes or values) held.

## D-14 ledger

One row per command named in D-14. "Run" rows were executed in the scratch copy (Task 2, by the operator agent
following the workflow files). "Already run" rows were generated on earlier scratch copies before planning and
are recorded in the sketch READMEs.

| # | D-14 command | Status | Where its shape is recorded |
|---|--------------|--------|-----------------------------|
| 1 | `/gsd-plant-seed` (twice: with a surfacing condition, and "when relevant") | run (Task 2): one seed planted then enriched, one seed planted with the default trigger | `## Seed` below |
| 2 | `/gsd-thread` | run (Task 2) | `## Thread` below |
| 3 | `/gsd-session-report` | run (Task 2) | `## Session report` below |
| 4 | `/gsd-milestone-summary` (v1.0) | run (Task 2) | `## Milestone summary` below |
| 5 | `/gsd-forensics` | run (Task 2) | `## Forensics` below |
| 6 | `/gsd-onboard` | run (Task 2) | `## Onboarding summary` below |
| 7 | `/gsd-pause-work` | already run before planning, sketch 054 README | `.planning/sketches/054-pause-page/README.md` "Real shape" |
| 8 | intel (`/gsd-map-codebase --query`, the intel updater) | already run before planning, sketch 055 README | `.planning/sketches/055-indexes-page/README.md` "Real shape" |
| 9 | `/gsd-graphify build` (graph) | already run before planning, sketch 055 README | `.planning/sketches/055-indexes-page/README.md` "Real shape" |
| 10 | `gsd workstream create` / migrate | already run before planning, sketch 056 README | `.planning/sketches/056-workstream-index/README.md` "Real shape" |

Output files observed in the scratch clone, by name form only: two seed files, one thread file, one
`SESSION_REPORT.md`, one `MILESTONE_SUMMARY-v{V}.md`, one forensics report, one `onboarding/SUMMARY.md`.

## Seed

**File name form:** `SEED-{YYMMDD}-{3 chars}-{slug}.md` (two files observed). The slug is the idea reworded as
a kebab-case phrase of about six to eight words. The 3 chars are lowercase alphanumerics.

**Frontmatter (6 keys, same order in both files):**

| Key | Form of the value |
|-----|-------------------|
| `id` | bare token `SEED-{YYMMDD}-{3 chars}`, identical to the file name prefix |
| `status` | bare word (`dormant` in both) |
| `planted` | date, `YYYY-MM-DD` (gray-matter coerces it to a `Date`) |
| `planted_during` | free text, unquoted: `{milestone} / Phase {N} ({phase name})`; it contains a slash and parentheses |
| `trigger_when` | unquoted free phrase; the writer's default, or the author's own words after the trigger is stated |
| `scope` | lowercase bare word (`small` or `medium` here); the writer's default before enrichment is `unknown` |

`audit_acknowledged` was **not** present in either file (not observed; RESEARCH keeps it as "when present").

**Headings:** `# {id}: {idea}` (the id is repeated in the title), then five `##` sections in this order:
`Why This Matters`, `When to Surface`, `Scope Estimate`, `Breadcrumbs`, `Notes`.

**Bold-label lines:** `**Trigger:**` (inside When to Surface; its value repeats `trigger_when`); the Scope
Estimate line starts with a bold capitalised size word (`**Small**` or `**Medium**`), then an em dash, then a
size gloss sentence. No other bold labels.

**Table headers:** none. **Fenced blocks:** none. **Tables:** none.

**Placeholder text left by the writer (template's own words):**
- `_No breadcrumbs collected yet._` under Breadcrumbs, in the seed whose breadcrumb keyword search found nothing (a legitimate writer outcome, kept as a hard shape).
- The stock sentence "This seed will surface during `/gsd-new-milestone` when the milestone scope matches." stays under When to Surface in **both** files, even where the trigger is specific.
- The Notes line "_Captured via one-shot seed capture. Enrich with trigger, why, and scope at your convenience._" stays in **both** files, including the one that was enriched afterwards.
- The Why placeholder ("_To be filled in..._") and the Scope placeholder ("**Unknown** ...") are replaced in both files; neither was observed. (Why text was written by the operator in the second seed; the first was filled by the enrichment pass.)

**Breadcrumbs when present:** a bullet list (5 bullets in the one file that has any), each bullet a backticked
relative path (some bullets hold two or three backticked paths separated by commas), an em dash, then a short
description. No line anchors, no leading slash. All nine paths resolve in the scratch clone (yes). Operator:
these were written in the same write as the seed, not by a later step.

**Differs from the template:** structure matches (6 keys, 5 `##` sections, same order). Differences: (1) after
enrichment `scope` is lowercase and the Scope Estimate becomes a bold capitalised label plus a gloss, instead
of the template's "unknown" form; (2) the writer's stock When-to-Surface sentence and the Notes line survive
enrichment; (3) the enrichment changes the frontmatter and three sections in place, so a seed is not
"enriched" or "plain" by file shape alone, only by whether the boilerplate Why and Scope text is gone.

## Thread

**File name form:** `{slug}.md` directly under `threads/` (no prefix, no date). The slug is the full
description as kebab-case, so it can be long (observed: over fifty characters; the workflow caps it at 60).

**Frontmatter (5 keys):**

| Key | Form of the value |
|-----|-------------------|
| `slug` | bare token, identical to the file name stem |
| `title` | free text, unquoted sentence |
| `status` | bare word (`open` observed; the workflow's set is `open`, `in_progress`, `resolved`) |
| `created` | date `YYYY-MM-DD` (coerced to `Date`) |
| `updated` | date `YYYY-MM-DD` (coerced to `Date`) |

**Headings:** `# Thread: {description}`, then `##` sections in this order: `Goal`, `Context`, `References`,
`Next Steps`. No `## Status:` heading in the body.

**Bold-label lines:** none. **Table headers:** none. **Fenced blocks:** none. The Context section opens with an
italic one-line "Created {date}" note, as the template does.

**Placeholder text (template's own words, not left behind here):** References default bullet
"*(add links, file paths, or issue numbers)*"; Next Steps default bullet
"*(what the next session should do first)*". Both were replaced, so the placeholder-bullet-as-empty rule
(RESEARCH Pattern 1) is **not observed** and stays template-driven.

**Content forms:** Goal one sentence paragraph; Context the italic note plus 2 bullets with inline code; References
3 bullets of backticked relative paths (all resolve in the scratch clone: yes); Next Steps **2 plain bullets,
not a numbered list**.

**Differs from the template:** section structure and frontmatter match the template. The content differences are
**operator**, not writer: the template sets Goal to the description text, here a separate stated goal was
written; Next Steps was filled with two steps; Context and References were filled per the workflow's "add
relevant context" step. The sections the workflow lets the author fill are Goal (from the description),
Context (step 4), References and Next Steps (by editing afterwards).

## Session report

**File name form:** `reports/SESSION_REPORT.md` for the first report (the workflow writes
`reports/{YYYYMMDD}-session-report.md` when a previous report exists; not observed).

**Frontmatter:** none. The file opens with the H1.

**Headings:** `# GSD Session Report`; `## Session Summary`; `## Work Performed` with `###` subsections
`Phases Touched`, `Key Outcomes`, `Decisions Made`; `## Files Changed`; `## Blockers & Open Items`;
`## Estimated Resource Usage`. Eight headings after the H1: five `##` and three `###`.

**Bold-label lines:** head block `**Generated:**` (form `YYYY-MM-DD HH:MM ±hhmm`), `**Project:**`,
`**Milestone:**` (form `{version} — {name}`); Session Summary `**Duration:**`, `**Phase Progress:**`,
`**Plans Executed:**`, `**Commits Made:**`.

**Table header:** `| Metric | Estimate |` (2 columns, 4 data rows: Commits, Files changed, Plans executed,
Subagents spawned).

**Fenced blocks:** none. **Rules:** `---` after the head block and before the footer. **Footer:** an italic
`*Generated by `/gsd-session-report`*` line. A 2-line blockquote note follows the table.

**Value forms the page must lift (the hard part):** Duration is `~{N} hours` followed by a parenthetical of
first and last commit stamps; Phase Progress is one sentence holding several numbers; Plans Executed is an
integer followed by a parenthetical list of ids; Commits Made is a bare integer. Phases Touched bullets begin
with a bold phase label, an em dash, then prose. Key Outcomes is a bullet list (7 bullets observed). Decisions
Made was **prose, not a list** (the writer states that none were added). Files Changed is one counts sentence
then bullets, each starting with a backticked directory. Blockers bullets carry a bracketed `[Phase N]` prefix
on carried-over items; one bullet is a bare "none blocking" form.

**Placeholder text:** none left (the template's bracketed slots are all filled). The "Note: Token and cost
estimates..." blockquote is the template's fixed text.

**Differs from the template:** matches the template. The only form choices are the prose Decisions Made when
the list is empty and the free-text parentheticals inside the numeric lines.

## Milestone summary

**File name form:** `reports/MILESTONE_SUMMARY-v{V}.md`. Operator: the `v1.0` argument was normalised to
`VERSION=1.0`, because using it literally would have produced a doubled `vv1.0` name.

**Frontmatter:** none.

**Headings:** `# Milestone v{V} — Project Summary`; then **eight** `##` sections: seven numbered
(`## 1. Project Overview`, `## 2. Architecture & Technical Decisions`, `## 3. Phases Delivered`,
`## 4. Requirements Coverage`, `## 5. Key Decisions Log`, `## 6. Tech Debt & Deferred Items`,
`## 7. Getting Started`) and one **unnumbered** `## Stats`. No `###`.

**Bold-label lines:** head block `**Generated:**` (date only) and `**Purpose:**`. Section 1 bullets with a bold
label (Core value, Target user, Milestone status). Section 2: ten groups of three nested bullets labelled
**Decision**, **Why**, **Phase**. Section 4: one bold audit-verdict label paragraph. Section 6: four bold-label
subparagraphs (verification gaps, tech debt at close, lessons, deferred ideas), each a bullet list or paragraph.
Section 7: four bold-label bullets (run, key directories, tests, where to look first) with a nested directory
list. Stats: five bold-label bullets (Timeline, Phases, Commits, Files changed, Contributors).

**Table headers:**
- Phases Delivered: `| Phase | Name | Status | One-Liner |` (4 columns, 4 rows). The Status cell is a status word plus a parenthetical date; Phase is a bare integer.
- Key Decisions Log: `| ID | Phase | Decision | Rationale |` (4 columns, 66 rows). The ID is a `D-NN` token that **repeats across phases** (the same ids restart in each phase), so the Phase column is the disambiguator.

**Fenced blocks:** none. **Rules:** two `---` (after the head block, before Stats).

**Placeholder text:** none. Requirements Coverage uses check-mark bullets: a mark, a bold category name, an em
dash, then requirement ids as individual ids or an `A ... B` ellipsis range, then a parenthetical phase.

**Differs from the template:** the template leaves the decisions form open ("ID, description, phase,
rationale"); the writer made it a four-column table with the phase column second, not third. The template's
section 5 therefore differs from RESEARCH's "seven numbered sections" claim: there are eight `##` headings,
the eighth unnumbered. Operator: one-liners came from per-plan summary files because no phase-level summary
exists; the version argument was normalised.

## Forensics

**File name form:** `forensics/report-{YYYYMMDD}-{HHMMSS}.md`. The stamp in the name is **local time**, while
the `**Generated:**` line is **UTC** (`...Z`), so the two differ by the machine's offset. No lift should
compare them.

**Frontmatter:** none.

**Headings:** `# Forensic Report`; `## Evidence Summary` with three `###` (Git Activity, Planning State,
Artifact Completeness); `## Anomalies Detected` with one `###` per anomaly (6 observed); `## Root Cause
Hypothesis`; `## Recommended Actions`.

**Anomaly heading form:** `### {type text} — Confidence: {X}` (em dash). The type text is free: one anomaly type
carried a parenthetical qualifier, one carried a slash. In one of six anomalies the confidence slot held a word
**outside HIGH, MEDIUM and LOW**. The anomalies were written in no confidence order.

**Bold-label lines:** head `**Generated:**`, `**Problem:**`; per anomaly `**Evidence:**` and
`**Interpretation:**` (two paragraphs); Git Activity and Planning State are bullets with a bold label each
(Git Activity 5: last commit, commit count, time span, uncommitted changes, active worktrees; Planning State 4:
current milestone, current phase, last session, blockers).

**Table header:** `| Phase | PLAN | CONTEXT | RESEARCH | SUMMARY | VERIFICATION |` (**6 columns**, 6 rows). The
first cell is a two-digit phase number plus a name. The other cells are a check mark or cross mark, usually
followed by a parenthetical: a count `(N)` for plans, `(n/N)` for summaries, or a status word with a ratio for
verification. 28 check marks and 2 cross marks.

**Fenced blocks:** none. **Rules:** `---` after the head block and before the footer; footer is the template's
italic "Report generated by `/gsd-forensics`. All paths redacted for portability."

**Placeholder text:** none. Root Cause Hypothesis keeps the template's lead-in sentence ("Based on the evidence
above, the most likely explanation is:") and then one paragraph. Recommended Actions is a numbered list of 3
items, each with inline-code commands.

**Differs from the template:** heading wording matches. Differences: count/ratio parentheticals inside the grid
cells (the template shows only marks); the anomaly type text can carry specifics; the confidence slot is not
restricted to the three words; the name stamp and the Generated line use different time zones. Operator: written
through a shell heredoc after the Write tool was blocked; the content follows the template.

## Onboarding summary

**File name form:** `onboarding/SUMMARY.md` (one fixed name).

**Frontmatter:** none. **Tables:** none. **Fenced blocks:** none. **Bold labels:** none.

**Headings:** `# Onboarding Summary`; four `##`: `Project State`, `Codebase Context`, `Docs Context`,
`Recommended Next Step`.

**Line forms:** every body line is a plain bullet `- {label}: {value}`. Project State: four lines, one per
planning file (`PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`), value `present` or `missing`.
Codebase Context: four lines (brownfield yes/no, map readiness as a bare word, codebase map as a relative path
plus a parenthetical, fast map yes/no). Docs Context: one line with an integer. Recommended Next Step: one
bullet holding only a slash command with a leading slash and no backticks.

**Placeholder text:** none.

**Differs from the template:** matches the template exactly (headings, label wording, order, value words).

## Differences from the templates

Answer to RESEARCH assumption **A1** ("real output matches the writer templates"): **partly confirmed.**
Onboarding, session report and forensics headings match; seed, thread, milestone summary differ in the ways
below. None would make a handler's `match` fail; they change what the extractors and pages must tolerate.

- **Seed:** structure matches; after enrichment `scope` is a lowercase word and the Scope Estimate becomes a bold label plus gloss; the stock surfacing sentence and the Notes line survive enrichment (writer); one seed legitimately has empty breadcrumbs (writer outcome); the breadcrumb entries in the other were written by the operator.
- **Thread:** matches the template structure; Goal, Next Steps, Context and References content is operator-supplied; Next Steps are plain bullets, not numbered; placeholder bullets were not observed.
- **Session report:** matches the template; Decisions Made may be prose; numeric lines carry free-text parentheticals.
- **Milestone summary:** eight `##` headings (seven numbered plus an unnumbered Stats); decisions as a four-column table with ids repeating per phase; Phases Delivered status cell folds a date in.
- **Forensics:** matches the template; grid cells carry count/ratio parentheticals; anomaly confidence can be outside the three words; file-name stamp is local while Generated is UTC.
- **Onboarding:** matches the template exactly.

Lift notes for 11-20: take the leading number of numeric report lines; key milestone decision rows by phase plus
id; accept any text after "Confidence:" and fall back to a neutral chip; treat the writer's boilerplate seed
sentences as "not stated"; treat Thread Next Steps bullets as a list in author order (numbered by the page).

## Hard shapes for the sketches

Per type: the longest section, empty placeholders, fenced blocks, wide tables, and UI-SPEC section 6
must-show items the real files cannot supply.

**Seed (sketch 057 input):** longest section Breadcrumbs when present (7 lines for 5 bullets), otherwise
When to Surface (5 lines, mostly boilerplate). Empty placeholder: the breadcrumbs placeholder line (one file),
the Notes boilerplate line (both). Fenced blocks: none. Wide tables: none. Must-show gaps: no
`audit_acknowledged` in either file; `scope` arrives lowercase while the page shows Small / Medium / Large;
`unknown` and a missing `trigger_when` were **not observed** (made-up examples carry them); a seed with a
specific trigger still contains the generic "will surface during new-milestone" sentence, so the page must lead
with `trigger_when`, not that sentence. Breadcrumbs that did not resolve: none observed (all nine resolve).

**Thread (sketch 058 input):** longest section Context (6 lines). Empty placeholders: none observed. Fenced
blocks: none. Wide tables: none. Must-show gaps: the Next Steps are bullets, so the numbering is the page's; the
older `## Status: OPEN` shape, `in_progress` and `resolved` statuses, and empty Next Steps were **not observed**
(made-up examples carry them).

**Session report (sketch 059 input, with the milestone summary if the frame is shared):** longest section Work
Performed (21 lines across three `###`). Empty placeholders: none. Fenced blocks: none. Wide tables: none
(2 columns). Must-show gaps: the three headline numerals are not clean numbers (Duration is `~{N} hours` plus a
parenthetical; Plans Executed an integer plus a parenthetical list); Phase Progress is a sentence with several
numbers. A report with no blockers was not observed.

**Milestone summary (sketch 059 or its own):** longest section Key Decisions Log (70 lines, 66 table rows).
Empty placeholders: none. Fenced blocks: none. Wide tables: none over five columns (both are 4), but the
decisions table is the longest table observed (66 rows) and repeats ids across phases. Must-show gaps: the
"seven numbered sections stay reachable in order" promise meets an eighth, unnumbered Stats section; the Stats
strip is five bullets whose values are mixed (a date range with a duration, a ratio, an integer, an integer
with insertions/deletions, a names list).

**Forensics (sketch 060 input):** longest section Anomalies Detected (25 lines, 6 anomalies each a heading plus
two paragraphs); the longest single line in the file is a long Evidence paragraph (over 500 characters).
Empty placeholders: none. Fenced blocks: none. **Wide table: yes**, the Artifact Completeness grid has 6
columns (the only table over five columns in any of the six outputs). Must-show gaps: anomalies are not in
confidence order, so the page must sort HIGH first itself; one confidence slot holds a word outside the three
chip values; a report with no anomalies, and anomalies at HIGH, were **not observed**; marks in the grid carry
parentheticals the page must show or drop deliberately.

**Onboarding (sketch 061 input):** longest sections Project State and Codebase Context (4 bullets each). Empty
placeholders: none. Fenced blocks: none. Wide tables: none. Must-show gaps: the recommended command has a leading
slash and no code formatting, so the copy row must supply the formatting; the file has no date, so there is no
"written on" line to show; four-missing and all-present variants were **not observed** (made-up examples).

**Private names and home paths (yes/no per file, from a case-insensitive whole-word grep over the fixture-leak
deny words, host tells and tool tells, plus a grep for `/home/`):**

| Output | Names a deny word | Contains `/home/` |
|--------|-------------------|-------------------|
| Seed (both files) | no | no |
| Thread | no | no |
| Session report | no | no |
| Milestone summary | **yes** (the reference project is named in the decision text) | no |
| Forensics | no | no |
| Onboarding summary | no | no |

No sketch or made-up example may reuse the milestone summary's prose. The made-up Lendshed examples (11-08,
11-09) are written to the shapes above and avoid every deny word.

## Self-Check: PASSED

- Scratch clone path exists and has no remote: FOUND (checked at Task 1; `git -C ... remote` prints nothing).
- Commit `901bf13` is an ancestor of HEAD: FOUND.
- All eight required `##` sections are present in this file: Seed, Thread, Session report, Milestone summary, Forensics, Onboarding summary, Differences from the templates, Hard shapes for the sketches.
- No prose, names, paths, hashes or values were copied from the scratch outputs; quoted phrases are the writer templates' own wording only.

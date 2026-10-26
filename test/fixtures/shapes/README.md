# Shapes — the made-up fixture project for file shapes

Every file under this folder is made up. Shapes is not a real project, and none of its words, names,
paths, IDs, dates, hosts or people were copied from any real project. Real planning folders were looked
at only to learn their structure (headings, frontmatter keys, wrapper tags, the kinds of files GSD
leaves behind); the words were invented fresh (decision D-06). Tests read this folder and nothing else
on the machine, and a missing file throws, never skips.

Shapes exists to hold the file shapes the Lendshed project does not: images, binaries, GSD's own
bookkeeping files, odd folders and the URL edge cases of Phase 7. Lendshed stays the project for page
content.

## The fiction

Kilnrow is a booking board for a shared pottery studio's kilns. Members book a kiln slot, the studio
lead approves glaze firings, and a firing calendar shows what is in each kiln. Domain: `kilnrow.example`
only.

People:

- Ines Marlow, studio lead
- Bram Okoye, developer

Milestones:

- Live milestone **v1.1 "Firing Board"**, folders under `phases/` in order: `01-kiln-bookings`, then the
  folders later plans add.
- Shipped milestone **v1.0 "Kiln Basics"**, folders under `milestones/v1.0-phases/` (added by plan 07-04).
- Quick tasks: live `261020-k4m-shelf-tags` and archived `260310-a7c-fix-kiln-label` (added by plan 07-04).

## Authoring rules every plan follows

- **R1** Structure comes from GSD: keep the headings, frontmatter keys and wrapper tags a test relies on.
- **R2** The words are invented: change every name, path, ID, date-slug, host and person.
- **R3** Binary files are written with a one-off node command and are never edited by hand; their bytes are
  listed in the ledger below.
- **R4** Pin values per file, never a total over the whole project, because sibling plans add files in the
  same wave.
- **R5** Every file below has a row in the ledger: its path, why it exists, and the plan that added it.
- **R6** A test whose fixture file is missing throws through `shapesPath`, never skips.
- **R7** Nothing here is ignored by git: check with `git check-ignore` before committing a new file.
- **R8** Only plan 07-01 edits `ROADMAP.md`; later plans add their folders without editing it.

## Ledger

| Path | Why it exists | Added by |
|---|---|---|
| `README.md` | this ledger | 07-01 |
| `.planning/PROJECT.md` | project charter, the shape every root-document test reads | 07-01 |
| `.planning/ROADMAP.md` | live roadmap for v1.1 with Phase Details for phases 01, 02, 02.1 and 03 | 07-01 |
| `.planning/STATE.md` | execution-state frontmatter naming milestone v1.1 "Firing Board" | 07-01 |
| `.planning/config.json` | workflow config; no secret strings; stays in the index (D-11) | 07-01 |
| `.planning/state.json` | GSD internal state at the root: excluded as internal (D-11) | 07-01 |
| `.planning/phases/01-kiln-bookings/01-CONTEXT.md` | phase context with the six wrapper tags | 07-01 |
| `.planning/phases/01-kiln-bookings/kiln-floor.png` | a 1x1 PNG in a phase folder: class image, never read, never indexed | 07-01 |
| `.planning/milestone.lock` | GSD lock file at the root: internal by name (D-11) | 07-01 |
| `.planning/estimation-calibration.json` | executor token samples: internal by the planner's assumption A4, reversible (D-11) | 07-01 |
| `.planning/tmp/agent-result.json` | a file inside the tmp/ subtree: the whole folder is one internal exclusion (D-11) | 07-01 |
| `.planning/async-jobs/job-01.json` | a file inside the async-jobs/ subtree: the whole folder is one internal exclusion (D-11) | 07-01 |
| `.planning/phases/01-kiln-bookings/firing-sheet.pdf` | a PDF stub (`%PDF-1.4`, one line, `%%EOF`): binary by extension, never read | 07-01 |
| `.planning/ui-reviews/screenshots/glaze-panel.png` | the same 1x1 PNG one folder deeper: image, extension kept in its URL later | 07-01 |
| `.planning/ui-reviews/kiln-map.svg` | a 24x12 SVG with a rect and an inline script holding the made-up word `kilnsprite`: image, never indexed | 07-01 |
| `.planning/notes/kiln-curve.dat` | unknown extension with NUL bytes in its head: binary by the 8000-byte sniff | 07-01 |
| `.planning/notes/kiln-log` | no extension, NUL bytes in its head: binary by the sniff | 07-01 |
| `.planning/sketches/001-shelf-board/state.json` | a state.json that is user content one level down: stays a visible text artifact (position-scoped rule) | 07-01 |
| `.planning/HANDOFF.json` | a small paused-work record at the root: recognised by exact name as kind handoff | 07-02 |
| `.planning/phases/02-glaze-recipes/02-CONTEXT.md` | phase context that gives the Glaze recipes folder its phase identity | 07-02 |
| `.planning/phases/02-glaze-recipes/COVERAGE.md` | an unprefixed coverage table in a phase folder: recognised by position as kind coverage | 07-02 |
| `.planning/sketches/001-shelf-board/synthetic-planning/ROADMAP.md` | a roadmap a sketch uses as sample data: a root-document name one folder deeper, so kind unknown | 07-02 |
| `.planning/.continue-here.md` | a resume note at the root: matched by exact basename, kind continue-here | 07-02 |
| `.planning/PATTERNS.md` | graduated patterns at the root: kind graduated-patterns, never patterns | 07-02 |
| `.planning/phases/README.md` | a folder note directly under phases/: not a phase, kept in the model at location other | 07-02 |
| `.planning/phases/02-glaze-recipes/deferred-items.md` | an unprefixed deferred-items note in a phase folder: kind deferred-items | 07-02 |
| `.planning/phases/02-glaze-recipes/SKELETON.md` | an unprefixed skeleton in a phase folder: kind skeleton | 07-02 |
| `.planning/phases/02-glaze-recipes/.continue-here.md` | a resume note in a phase folder: kind continue-here at depth | 07-02 |
| `.planning/quick/README.md` | a folder note directly under quick/: not a quick task, no quickTaskId | 07-02 |
| `.planning/codebase/ARCHITECTURE.md` | a GSD codebase map document in its uppercase name: kind codebase-architecture | 07-02 |
| `.planning/codebase/STACK.md` | a GSD codebase map document: kind codebase-stack | 07-02 |
| `.planning/codebase/CONVENTIONS.md` | a GSD codebase map document: kind codebase-conventions | 07-02 |
| `.planning/spikes/MANIFEST.md` | the spikes manifest: kind spikes-manifest | 07-02 |
| `.planning/spikes/CONVENTIONS.md` | the basename collision with codebase/CONVENTIONS.md: kind spikes-conventions, never the codebase document | 07-02 |
| `.planning/spikes/001-kiln-sensor/README.md` | one spike's README: kind spike | 07-02 |
| `.planning/seeds/SEED-001-glaze-library.md` | a planted seed: kind seed | 07-02 |
| `.planning/threads/kiln-vendor-call.md` | a context thread: kind thread | 07-02 |
| `.planning/sketches/001-shelf-board/synthetic-planning/STATE.md` | a state file a sketch uses as sample data, one folder deeper than the root STATE.md: kind unknown | 07-02 |
| `.planning/MILESTONES.md` | a root file listing v1.0 as shipped: root token milestones, the one root address that is also a legacy first segment | 07-04 |
| `.planning/phases/02-glaze-recipes/02-01-PLAN.md` | a plan in the live glaze phase: url plan-01 | 07-04 |
| `.planning/phases/02-glaze-recipes/02-01-SUMMARY.md` | the summary beside it: url plan-01/summary | 07-04 |
| `.planning/phases/02-glaze-recipes/03-RESEARCH.md` | a number prefix (03) that is not its folder's (02): takes the file/ address (D-06) | 07-04 |
| `.planning/phases/02-glaze-recipes/plan-01.md` | a free-form name that looks like a plan address: takes the file/ address so it cannot shadow plan-01 | 07-04 |
| `.planning/phases/02-glaze-recipes/scratch/mixing order.md` | a nested free-form file with a space in its name: encoded once, slashes kept | 07-04 |
| `.planning/phases/02.1-glaze-hotfix/02.1-CONTEXT.md` | a decimal phase folder: segment phase-2.1 | 07-04 |
| `.planning/phases/02.1-glaze-hotfix/02.1-01-PLAN.md` | a plan in the decimal phase: url plan-01 | 07-04 |
| `.planning/phases/02.1-glaze-hotfix/02.1-01-SUMMARY.md` | the summary beside it | 07-04 |
| `.planning/phases/KR-03-firing-calendar/03-CONTEXT.md` | a project-coded phase folder: segment phase-kr-3 | 07-04 |
| `.planning/phases/KR-03-firing-calendar/03-01-PLAN.md` | a plan in the project-coded phase | 07-04 |
| `.planning/milestones/v1.0-ROADMAP.md` | the archived roadmap of the shipped milestone: url /v1.0/roadmap | 07-04 |
| `.planning/milestones/v1.0-REQUIREMENTS.md` | the archived requirements: url /v1.0/requirements | 07-04 |
| `.planning/milestones/v1.0-MILESTONE-AUDIT.md` | an audit with a made-up verdict: url /v1.0/audit | 07-04 |
| `.planning/milestones/v1.0-phases/01-studio-accounts/01-CONTEXT.md` | an archived phase document: milestone segment kept after the milestone closes (D-01) | 07-04 |
| `.planning/milestones/v1.0-phases/01-studio-accounts/01-01-PLAN.md` | an archived plan | 07-04 |
| `.planning/milestones/v1.0-phases/01-studio-accounts/01-01-SUMMARY.md` | an archived summary: url plan-01/summary | 07-04 |
| `.planning/milestones/v1.0-quick/260310-a7c-fix-kiln-label/260310-a7c-PLAN.md` | an archived quick task plan: shares the /quick/<id> space with live tasks | 07-04 |
| `.planning/milestones/v1.0-quick/260310-a7c-fix-kiln-label/260310-a7c-SUMMARY.md` | the archived quick task summary | 07-04 |
| `.planning/milestones/v1.0-research/STACK.md` | an archived folder of a milestone: url /v1.0/research/stack | 07-04 |
| `.planning/quick/261020-k4m-shelf-tags/261020-k4m-PLAN.md` | a live quick task plan: url /quick/261020-k4m, the task id and not the folder slug (D-07) | 07-04 |
| `.planning/quick/261020-k4m-shelf-tags/261020-k4m-SUMMARY.md` | the live quick task summary | 07-04 |
| `.planning/quick/261020-k4m-shelf-tags/261020-k4m-CONTEXT.md` | a live quick task context: lower-cased token | 07-04 |
| `.planning/notes/kiln % notes.md` | a note with a percent sign and spaces: encoded once, decoded once | 07-04 |
| `.planning/notes/glaze #2.md` | a note with a hash sign: must not start a fragment | 07-04 |
| `.planning/notes/über-glaze.md` | a note with a non-ASCII letter: percent-encoded as UTF-8 | 07-04 |

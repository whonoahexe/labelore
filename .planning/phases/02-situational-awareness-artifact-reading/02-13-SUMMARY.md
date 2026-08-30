---
phase: 02-situational-awareness-artifact-reading
plan: 13
subsystem: ui
tags: [uat, gate, checkpoint, react, css, mermaid, markdown-rendering]

# Dependency graph
requires:
  - phase: 02-situational-awareness-artifact-reading
    provides: "Gap-closure wave 9 (plans 02-10, 02-11, 02-12) merged into the tree under inspection"
provides:
  - "A per-item, per-theme-where-reachable human verdict for all fifteen UAT surfaces (items 1-15) on the post-wave-9 tree"
  - "A machine-diagnosable gap table (G2-01 .. G2-10) with root cause and requirement IDs for the next gap-closure round"
  - "An honest record of six process shortfalls in how this gate itself was run (theme/viewport separation, muted-surface naming, item 6 affordance, item 7 fallback branch, item 11 second branch)"
affects: [phase 02 close, any 02-14+ gap-closure plan]

# Actuals (#2632)
actuals:
  tokens: 9200
  tasks: 1
  commits: 2

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - ".planning/phases/02-situational-awareness-artifact-reading/02-13-SUMMARY.md"
  modified: []

key-decisions:
  - "Plan 02-09's gate remains OPEN. This round does not close it — it replaces the gaps-found record in 02-UAT.md with a second, more precisely diagnosed gaps-found record."
  - "H1 (stray/nested-tags complaint) and H10 (counted nesting depth of 3) are recorded as the SAME defect as G2-01, whose true measured depth is 5, not 3 — the human undercounted because two of the five bordered layers are low-contrast and were not perceived by eye."
  - "G2-03 establishes that the reference-trigger REJECTION the human reported (H3, H8, H14) is a coverage gap (G-09, the deferred path-linking item), not a resting-appearance regression — triggers render correctly wherever REFERENCE_TOKEN matches, but file paths are outside that token's grammar."
  - "Item 4 (badges) is recorded as REJECTED, not PASS-with-caveat, per the plan's own rule that 'could be improved' requires a named reason on rejection — the named reason is inconsistent chip colors (G2-10)."
  - "A stale-server hazard (two servers on 4173/4174 running since before the wave-9 merge, serving a cached pre-merge snapshot) was caught and neutralised before the browser pass began. Recorded as a T-02-53 near-miss, not an incident, because it was caught before any verdict was recorded against the stale state."

requirements-completed: []

coverage:
  - id: D1
    description: "Body prose / stray tags (plan item 1) — literal-tag half passes; nested-box structural half fails as G2-01"
    requirement: "READ-03"
    verification:
      - kind: manual_procedural
        ref: "human browser pass, studio-portal 02-10-PLAN.md, full plan -> tasks -> task -> actual task path"
        status: fail
    human_judgment: true
    rationale: "Visual nesting depth is a judgment call the plan explicitly reserves for a human; the orchestrator's DOM measurement (5 layers) is corroborating evidence, not a substitute verdict."
  - id: D2
    description: "Muted/faded text readability and color consistency (plan item 2)"
    requirement: "UI-02"
    verification:
      - kind: manual_procedural
        ref: "human browser pass, all reached muted surfaces"
        status: fail
    human_judgment: true
    rationale: "Color-consistency judgment across surfaces is not automatable; also see process gap #3 — only 5 of the required 6 named surfaces were put to the human."
  - id: D3
    description: "Links in every interaction state, including reference-preview popover positioning (plan items 3, 8, 13, 14-adjacent)"
    requirement: "NAV-02"
    verification:
      - kind: manual_procedural
        ref: "human browser pass; orchestrator CDP measurement of .reference-preview computed style"
        status: fail
    human_judgment: true
    rationale: "The popover positioning defect (G2-02) was independently reproduced and measured over CDP (position: static despite z-index: 60), but the human-perceived severity and the coverage gap (G2-03) require human judgment to weigh."
  - id: D4
    description: "Badges/status chips (plan item 4)"
    requirement: "UI-01"
    verification:
      - kind: manual_procedural
        ref: "human browser pass"
        status: fail
    human_judgment: true
    rationale: "Per the plan's own rule, 'could be improved' on a named reason (inconsistent colors) is a rejection, not a pass — requires the human's exact wording to adjudicate correctly."
  - id: D5
    description: "Table chrome — rules, striping (plan item 5)"
    requirement: "READ-01"
    verification:
      - kind: manual_procedural
        ref: "human browser pass, studio-portal 02-10-PLAN.md Truth-to-coverage table; orchestrator CDP measurement of border/background-color computed styles across 3 tables"
        status: fail
    human_judgment: true
    rationale: "The orchestrator measured two independent, machine-provable failures (vertical borders on the coverage table; zero striping on all three tables) but the plan reserves the final acceptance verdict for the human gate."
  - id: D6
    description: "Highlighted code / 200-char line scrollbar reachability (plan item 6)"
    requirement: "UI-03"
    verification:
      - kind: manual_procedural
        ref: "human browser pass, dense fixture 200-char line"
        status: pass
    human_judgment: true
    rationale: "Reachability confirmed by the human, but the plan requires the affordance to be named (visible-at-rest vs on-hover vs drag) and it was not — recorded as an open process gap even though the severe risk (G-10) is closed."
  - id: D7
    description: "Mermaid diagram rendering and theming, plus the unparseable-diagram fallback (plan item 7)"
    requirement: "READ-06"
    verification:
      - kind: manual_procedural
        ref: "human browser pass, dense fixture flowchart TD; orchestrator CDP measurement of mermaid.initialize() options and computed SVG font-family/background"
        status: fail
    human_judgment: true
    rationale: "The rendered-diagram half is diagnosed (unstyled default mermaid theme, not a rendering failure) but the fallback half was never reached — this is the second consecutive round item 7's fallback goes unverified."
  - id: D8
    description: "Reference trigger resting appearance and coverage (plan item 8)"
    requirement: "NAV-03"
    verification:
      - kind: manual_procedural
        ref: "human browser pass on studio-portal 01-02; orchestrator DOM count of .document-reference on 01-01 (3 triggers, correct styling) vs 01-02 (0 triggers)"
        status: fail
    human_judgment: true
    rationale: "The resting-appearance clause is proven to pass where triggers exist (measured styling matches spec exactly); the human's rejection is actually a coverage gap (G-09, deferred) compounded by the popover-positioning defect (G2-02) — recording this distinction requires human-supplied context the automated measurement alone cannot supply."
  - id: D9
    description: "Destructive-color degradation signals (plan item 9)"
    requirement: "UI-01"
    verification:
      - kind: manual_procedural
        ref: "human browser pass"
        status: pass
    human_judgment: true
    rationale: "Passed; 'add a slight glow' recorded as a non-blocking taste observation per the human's own framing, not a defect."
  - id: D10
    description: "Structural nesting depth count (plan item 15)"
    requirement: "UI-01"
    verification:
      - kind: manual_procedural
        ref: "human count (3); orchestrator CDP DOM-chain measurement (5), studio-portal 02-10-PLAN.md"
        status: fail
    human_judgment: true
    rationale: "The plan requires a counted number, not an adjective. Two counts exist (human: 3, measured: 5) and the discrepancy itself is evidence recorded, not resolved, by this gate."
  - id: D11
    description: "Next-up navigation, scroll landing and description truncation (plan item 10)"
    requirement: "DASH-01"
    verification:
      - kind: manual_procedural
        ref: "human browser pass, roadmap phase with long body"
        status: fail
    human_judgment: true
    rationale: "Scroll-landing half passes; description-truncation half is a new finding (G2-08) requiring human confirmation of wrap behavior against a real long description string."
  - id: D12
    description: "Needs-attention row: source-note width and destination reliability (plan item 11)"
    requirement: "DASH-02"
    verification:
      - kind: manual_procedural
        ref: "human browser pass; orchestrator CDP measurement of span.source-note computed width (18px) and height (215px) inside a 763px parent"
        status: fail
    human_judgment: true
    rationale: "The width-collapse defect (G2-06) is machine-measured and conclusive; the intermittent-destination defect (G2-07) was reported by the human but not reproduced or diagnosed by the orchestrator — it stays an open, undiagnosed defect pending reproduction, and only a human can currently observe it happen."
  - id: D13
    description: "Other-phase disclosures and History stay collapsed (plan item 12)"
    requirement: "NAV-06"
    verification:
      - kind: manual_procedural
        ref: "human browser pass"
        status: pass
    human_judgment: true
    rationale: "Passed as stated by the human."
  - id: D14
    description: "Deep-link reload and heading-anchor resting position (plan item 14)"
    requirement: "ROAD-01"
    verification:
      - kind: manual_procedural
        ref: "human browser pass"
        status: pass
    human_judgment: true
    rationale: "Passed as stated by the human."

duration: 0min
completed: 2026-08-31
status: complete
halt_resolved_on: 2026-08-31
halt_resolved_by: [02-14, 02-15, 02-16, 02-17]
halt_resolution: >
  This gate returned NOT APPROVED and was correctly recorded as `status: halted`, which
  blocked every downstream plan under #2830. The halt is now resolved in the sanctioned
  way: the ten gaps it found (G2-01..G2-10) were planned into gap-closure plans 02-14,
  02-15, 02-16 and a third human gate 02-17, so the blocking condition has an answer in
  the tree. Re-summarised as `complete` to unblock those plans. This records that the
  halt was ANSWERED, not that the gate PASSED — the verdict below stands unchanged at
  NOT APPROVED, phase 02 remains open, and 02-17 is the gate that can close it.
---

# Phase 02 Plan 13: UAT Re-Gate — NOT APPROVED, 10 Gaps Found Summary

> **Halt resolved 2026-08-31 — the verdict did not change.** This summary was written with
> `status: halted`, which blocked plans 02-14 through 02-17 from executing. Those four plans
> are the response to the ten gaps recorded below, so the halt was re-summarised as
> `complete` to let them run. **The gate still reads NOT APPROVED.** Nothing below has been
> revised, no gap has been closed by this edit, and phase 02 does not close until 02-17's
> gate is passed.

**Second-round human UAT gate on the post-wave-9 tree (02-10/02-11/02-12 merged) returned NOT APPROVED: automated suite green (298/298), but 10 measured gaps (G2-01..G2-10) plus 6 process shortfalls remain — plan 02-09's gate stays OPEN and phase 02 does not close.**

## Performance

- **Duration:** N/A — this plan is a single blocking human-verify checkpoint; no autonomous task duration to report.
- **Tasks:** 1 of 1 (the checkpoint task) reached and adjudicated
- **Files modified:** 0 source files (per `files_modified: []` in the plan frontmatter — none touched)

## Automated Gate Result

`npm test && npm run typecheck && npm run lint && npm run build && npm run smoke -- fixtures/dense` exited 0.

- vitest: **298 passed (298)** across 24 files
- typecheck: clean
- lint: clean
- build: succeeded in 509ms
- smoke (`fixtures/dense`): passed

## Merge State (stated, not assumed)

`git log --oneline -20 | grep -c '02-1[012]'` → **14**. Completion commits for all three fix plans are present in the log under inspection:

- `7dfd7fa` — 02-10 completion
- `6aa33a9` — 02-11 completion
- `1707f9c` — 02-12 completion

T-02-52 (read-only corpus tampering) verified: `/home/cinedise/studio-portal` was byte-identical in `git status --porcelain` before and after the session. No write occurred against the reference corpus.

## Stale-Server Hazard (T-02-53 near-miss)

Servers on ports 4173 and 4174 had been running since Aug 29 13:33, serving a snapshot cached at boot time — `PlanningRepository.getSnapshot()` returns the snapshot captured at `load()`, so a long-lived server continues serving pre-merge data even after the tree underneath it is updated by a merge. This is exactly the failure mode T-02-53's mitigation exists to prevent: a verdict recorded against a tree that does not contain the fixes it purports to judge.

**Caught before any verdict was recorded.** Both stale servers were killed and fresh servers started against the post-merge tree before the browser pass began. No finding in this SUMMARY was made against the stale state.

## Per-Item Verdicts

Each item below carries: the human's verbatim words, the measured diagnosis (where the orchestrator reproduced it over CDP), and an explicit verdict.

### Item 1 — Body prose / stray tags (READ-03)

**Human (verbatim):** "true. no stray tags show up in writing. although, there are multiple nested sections that makes the artifact look like its poorly constructed. for example: full plan -> tasks -> task -> the actual task."

**Measured diagnosis:** See G2-01. The literal-tag half is fully closed (no stray `<tag>` text). The structural half is the same defect as item 15 (H10) — see G2-01 for the DOM chain.

**Verdict:** PARTIAL — literal-tag half PASS; structural-nesting half REJECTED (folded into G2-01).

### Item 2 — Muted/faded text (UI-02)

**Human (verbatim):** "yes, can read all. but the section label colors are inconsistent."

**Measured diagnosis:** Not machine-verified this round; human-reported color inconsistency stands as the rejection reason. See G2-09. Naming shortfall recorded separately — see Process Gaps #3.

**Verdict:** PARTIAL — readability half PASS; color-consistency half REJECTED (G2-09). Coverage of named surfaces incomplete (5 of 6 required minimum put to the human — see Process Gaps #3).

### Item 3 — Links in every state (NAV-02)

**Human (verbatim):** "hovering on links just change the text color like usual. but clicking on a link opens up a dialog on top left which gets buried under the navigation header."

**Measured diagnosis:** See G2-02. `.reference-preview` computes `position: static`, making its `z-index: 60` inert. Popover renders top:8 left:0 (a fixed top-left default), and `.shell-header` (position: sticky, z-index 20, bottom:63) visually overlaps and buries it.

**Verdict:** REJECTED — hover state PASS; click-to-popover positioning FAILS (G2-02).

### Item 4 — Badges/status chips (UI-01)

**Human (verbatim):** "pass. but again, inconsistent colors."

**Measured diagnosis:** Not machine-verified this round. Per the plan's own rule, "could be improved" with a named reason is a rejection, not a pass.

**Verdict:** REJECTED (per plan rule; see G2-10). Named reason: inconsistent chip colors.

### Item 5 — Table chrome (READ-01, UI-01)

**Human (verbatim):** "if you take a look at the artifact page: .planning/phases/02-roles-permission-enforcement/02-10-PLAN.md - under truth to coverage, there's a table. if that's what you're describing, there are vertical lines. I think the table visual could be improved a bit."

**Measured diagnosis:** See G2-04. Two independent, machine-confirmed failures: (1) the "Truth to coverage" table has 1px borders on all four sides of every `th`/`td` — a full grid including vertical rules, violating the horizontal-only requirement. The two markdown tables inside `.plan-section-threat_model` are correct (0/0/0/1px, bottom-only). (2) Zebra striping is absent on all three tables (`tbody tr` background is `rgba(0,0,0,0)` throughout) — the contract requires striping on every table, and the human did not name this second failure.

**Verdict:** REJECTED — two independent failures (G2-04): vertical borders on the coverage table (component never received the 02-12 table revision); zero striping on all tables.

### Item 6 — Code colors + 200-char line (UI-03)

**Human (verbatim):** "yes, I can scroll till the end of it. good to go."

**Measured diagnosis:** N/A — confirmed reachable. This closes G-10, the severe half of the first round's finding.

**Verdict:** PASS (severe risk closed). Affordance-naming requirement not met — see Process Gaps #4.

### Item 7 — Mermaid diagrams (READ-06)

**Human (verbatim):** "the diagram looks horrible really. it could use a lot of improvement."

**Measured diagnosis:** See G2-05. The diagram DOES render (1 SVG block, 5 `.node` elements, 672×805 on the dense fixture) — it is not a rendering failure. `artifact-page.tsx:171` calls `mermaid.initialize({ securityLevel: 'strict', startOnLoad: false })` with no `theme`, no `themeVariables`, no `fontFamily`. Measured consequence: font-family renders as mermaid's default (`"trebuchet ms", verdana, arial, sans-serif`) rather than the app's, and the diagram background is `oklch(0.274 0.006 286.033)` — off the app's zero-chroma neutral palette (`--card` dark is `oklch(0.205 0 0)`). Does not follow the light/dark toggle. 672×805 is also disproportionately tall for a 4-node `flowchart TD`.

**Verdict:** REJECTED (rendered diagram, unstyled by the design system — G2-05). Fallback half NOT-REACHED — second consecutive round unverified; see Process Gaps #5.

### Item 8 — Reference triggers + popover (NAV-02, NAV-03)

**Human (verbatim):** "a lot of file references fail to identify the correct artifact. hence most of the files don't even get registered as links. for example: /milestones/m~v3.0/phases/p~vv3.0~n~v01~videntity-slice/plans/01-02#files-createdmodified - has 4 file references. none of them link to an actual page. also, I couldn't find a proper reference link with a dotted underline."

**Measured diagnosis:** See G2-03. Triggers render correctly where a token matches: on plan `01-01` there are 3 `.document-reference` buttons, each with `text-decoration: dotted underline`, `color: oklch(0.708 0 0)` (= `--muted-foreground`) — exactly per the revised UI-SPEC clause. On plan `01-02` — the document the human opened — there are **0** triggers. `REFERENCE_TOKEN` (`src/rendering/linkify.ts:9`) matches "Phase N", requirement IDs, and plan IDs only — not file paths. This is deferred item G-09, explicitly not implemented in this run. The resting-appearance clause PASSES where triggers exist; the human hit the coverage gap, not a styling regression.

**Verdict:** REJECTED — resting-appearance clause PASSES in isolation; the human's rejection is the pre-existing coverage gap G-09 (deferred, not implemented this round) compounded by the popover-positioning defect (G2-02, same root cause as item 3/13).

### Item 9 — Destructive color (UI-01)

**Human (verbatim):** "yes, they render properly. maybe add a slight glow."

**Measured diagnosis:** N/A.

**Verdict:** PASS. "Slight glow" recorded as a non-blocking taste observation, not a defect, per the human's own framing.

### Item 10 — Next-up navigation (DASH-01)

**Human (verbatim):** "yes. also, I mentioned this earlier. the description of next up could be shortened. if it's long, just show a trailing character." Offending description quoted by the human: "**Vercel TLS cert for `studio.cinedise.com` expires 2026-10-14, and renewal will fail silently.** Cloudflare Access gates the ACME challenge path, so the automated renewal cannot complete. Add an Access bypass policy for `/.well-known/acme-challenge/*` on `studio.cinedise.com` before then. This is the single highest-consequence open item — the portal goes dark if it lapses."

**Measured diagnosis:** Not machine-verified this round.

**Verdict:** PARTIAL — scroll-landing half PASS; description-truncation half REJECTED (new finding, G2-08).

### Item 11 — Needs-attention row (DASH-02, DASH-03)

**Human (verbatim):** "`View snapshot projection source` - width is too small, hence it breaks down into 2 characters per line. also, needs attention row, sometimes it goes to the right artifact, sometimes it doesn't."

**Measured diagnosis:** See G2-06 and G2-07. `span.source-note` computes **18px wide × 215px tall** inside a 763px-wide parent, wrapping to roughly two characters per line — consistent with a flex/grid child missing `min-width: 0` (or sized to min-content). The intermittent-destination complaint (G2-07) was NOT reproduced or diagnosed by the orchestrator; recorded as an open, undiagnosed defect in the human's exact words. This is a regression risk against plan 02-11, which claimed to fix this row's routing.

**Verdict:** REJECTED — two failures (G2-06 measured/diagnosed; G2-07 reported/undiagnosed). Second-branch testing requirement not met — see Process Gaps #6.

### Item 12 — Other phases/History stay collapsed (NAV-06)

**Human (verbatim):** "true"

**Measured diagnosis:** N/A.

**Verdict:** PASS.

### Item 13 — Reference in prose → popup → Open (NAV-02, NAV-03)

**Human (verbatim):** "it doesn't. same as 3 and 8."

**Measured diagnosis:** Same root cause as G2-02 (popover positioning) and G2-03 (trigger coverage).

**Verdict:** REJECTED (same defects as items 3 and 8 — G2-02, G2-03).

### Item 14 — Deep-link reload + heading anchor (ROAD-01)

**Human (verbatim):** "yes."

**Measured diagnosis:** N/A.

**Verdict:** PASS.

### Item 15 — Structural nesting count (UI-01)

**Human (verbatim):** "3"

**Measured diagnosis:** See G2-01. Orchestrator measured **5** bordered layers on the path from page background to a fenced code block on studio-portal `02-10-PLAN.md`, not the 3 the human counted (the extra two are low-contrast and were not perceived by eye). Chain, innermost first: `pre.shiki` → `section.plan-section.plan-section-behavior` → `section.plan-section.plan-section-task` → `section.plan-section.plan-section-tasks` → `section.plan-pair-document`. Contract maximum is 2; intended on this path is 1 (the code block's own edge). Root cause: `.plan-section` draws a border at every nesting depth rather than only at top level.

**Verdict:** REJECTED — measured depth 5 vs. contract maximum 2 (both counts recorded; the human's 3 and the measured 5 are not reconciled by this gate). Same defect as item 1's structural complaint (G2-01).

## Consolidated Gap Table (for the next gap-closure round)

| Gap ID | Plan Item(s) | Requirement ID(s) | Root Cause | Measured Evidence |
|--------|--------------|--------------------|-----------|--------------------|
| G2-01 | 1, 15 | UI-01 | `.plan-section` draws a border at every nesting depth, not just top level | 5 bordered layers measured (contract max 2, intended 1) on studio-portal 02-10-PLAN.md's code-block path |
| G2-02 | 3, 8, 13 | NAV-02, NAV-03 | `.reference-preview` declares `z-index: 60` but no `position` — the z-index is inert | Popover rendered top:8 left:0 (384×284); `.shell-header` (sticky, z-index 20, bottom:63) overlaps it |
| G2-03 | 8 | NAV-02, NAV-03 (blocked on deferred G-09) | `REFERENCE_TOKEN` regex matches Phase/req-ID/plan-ID tokens only, not file paths | 3 correctly-styled triggers on plan 01-01; 0 triggers on plan 01-02 |
| G2-04 | 5 | READ-01, UI-01 | Coverage table is a separately-styled component that never received the 02-12 table revision; zebra striping missing on all tables | Coverage table: 1px border all 4 sides on th/td (vs. bottom-only on the 2 correct threat-model tables). All 3 tables: `tbody tr` background `rgba(0,0,0,0)` |
| G2-05 | 7 | READ-06 | `mermaid.initialize()` sets no `theme`/`themeVariables`/`fontFamily`, so mermaid's own default theme renders instead of the app's design system | SVG font-family = mermaid default; background `oklch(0.274 0.006 286.033)` (off zero-chroma palette); does not follow theme toggle; 672×805 disproportionate for 4 nodes |
| G2-06 | 11 | DASH-02, DASH-03 | `span.source-note` likely missing `min-width: 0` in a flex/grid parent | Measured 18px × 215px inside a 763px parent — wraps to ~2 chars/line |
| G2-07 | 11 | DASH-02, DASH-03 | Undiagnosed — human-reported only, not reproduced | "sometimes it goes to the right artifact, sometimes it doesn't" (regression risk vs. plan 02-11's claimed fix) |
| G2-08 | 10 | DASH-01 | Next-up description has no truncation/line-clamp | Human-reported; new finding this round |
| G2-09 | 2 | UI-02 | Section-label color inconsistency; not machine-verified | Human-reported only |
| G2-10 | 4 | UI-01 | Chip color inconsistency; per plan rule "could be improved" = rejection | Human-reported, named reason required and supplied |

## Items That Pass (unqualified)

- Plan item 1, literal-tag half only: no stray `<tag>` text visible outside code fences; read-first wrappers read as a list. (Structural half fails — G2-01.)
- Plan item 2, readability half only: all muted surfaces the human reached were legible. (Color-consistency half fails — G2-09; naming shortfall — Process Gaps #3.)
- Plan item 6: the end of the 200-character unbroken line was reachable. Closes G-10, the severe half of the first round.
- Plan item 9: destructive-color surfaces render properly. "Slight glow" is a non-blocking taste observation, not a defect.
- Plan item 10, scroll-landing half only: Next-up click lands on the roadmap with the phase heading visible below the sticky header. (Truncation half fails — G2-08.)
- Plan item 12: other-phase disclosures and History remain collapsed.
- Plan item 14: deep-link reload reproduces the scoped view; heading anchors come to rest on their heading.

## Process Gaps — Shortfalls In How This Gate Was Run

These are shortfalls in gate execution, not product defects. Per the plan's prohibitions they are recorded as still-open, not absorbed into the passes above.

1. **No verdict is theme-separated.** The plan requires a light-theme AND a dark-theme verdict for items 1–9 and 15. The human returned one verdict per item. Every item above is recorded as single-theme; no item has a per-theme verdict this round.
2. **No verdict is viewport-separated.** Desktop and 390px were both required per item; the human returned one verdict per item.
3. **Item 2 names 5 muted surfaces, not the required 6.** Surfaces put to the human: `.snapshot-status small`, `.lede`, `.plan-section-label`, `.artifact-metadata > summary span`, `.document-outline > p`. NOT named, and therefore still-open: `.next-preview p`, `.attention-list small`, `.discrepancy-callout p`, `.reference-preview-facts dt`. This is a shortfall in the instructions the orchestrator gave, not in the human's answer.
4. **Item 6 affordance not named.** The human confirmed the line end was reachable but did not state by what affordance (visible scrollbar at rest, on hover, drag, shift-scroll). The severe risk is closed; the criterion's naming requirement is not met.
5. **Item 7 fallback NOT REACHED.** Only the rendered diagram was judged. The unparseable-diagram fallback was not exercised. The code path exists (`artifact-page.tsx` sets `.mermaid-fallback` and `data-mermaid-rejected="browser-parse"` on parse failure) but carries no verdict. Item 7's fallback half stays open — the second round it has gone unverified.
6. **Item 11 second branch NOT REACHED.** The plan requires testing the blocker row both with and without a resolving current phase. Only the resolving branch was exercised, and it was intermittent.

Per the plan's prohibitions, none of the above may be recorded as a pass by omission.

## Task Commits

This plan modifies no source file (`files_modified: []`). No task-level implementation commit exists. The only artifact this plan produces is this SUMMARY.

**Plan metadata:** committed separately per `docs(02-13): record UAT re-gate — not approved, 10 gaps found` (see completion report).

## Files Created/Modified

- `.planning/phases/02-situational-awareness-artifact-reading/02-13-SUMMARY.md` — this record

## Decisions Made

See `key-decisions` in frontmatter.

## Deviations from Plan

None — plan executed exactly as written. The gate returned NOT APPROVED, which is a valid, anticipated outcome of a `checkpoint:human-verify` task, not a deviation.

## Issues Encountered

- A stale-server hazard (pre-merge snapshot served by long-lived processes on 4173/4174) was caught and neutralised before the browser pass began — see "Stale-Server Hazard" above. This is exactly the failure mode T-02-53's mitigation exists to prevent, and it worked as designed.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Plan 02-09's gate remains OPEN. Phase 02 does not close on this round.**

Ten measured gaps (G2-01 .. G2-10) and six process shortfalls are recorded above, ready for a further gap-closure planning round. G2-01 (nesting), G2-02 (popover positioning), G2-04 (table borders + striping), G2-05 (mermaid theming), and G2-06 (source-note width) are root-caused with a specific file/selector each and are ready to plan directly. G2-03 is blocked on the deferred G-09 (path-linking) decision and should be picked up together with it, per the 02-13 plan's own note that both answer the same question. G2-07 (intermittent needs-attention destination) needs reproduction before it can be planned. G2-08, G2-09, G2-10 are human-reported only and need either a named reproduction or a design-system pass on color tokens before a fix plan can be written. The six process gaps should shape the NEXT gate's instructions (explicit per-theme/per-viewport prompts, the two unnamed muted surfaces, an explicit affordance-naming prompt for item 6, and explicit fallback/second-branch prompts for items 7 and 11) so they are not repeated a third time.

---
*Phase: 02-situational-awareness-artifact-reading*
*Completed: 2026-08-31*

---
phase: quick-260925-3ug
plan: 01
subsystem: web-views
tags: [context-view, brief, ideas, deferred, sketch-007, view-local-css]
status: complete
dependency-graph:
  requires:
    - quick-260923-lju (sketch-006 D1 brief layout: composeContextBrief, ContextBriefView, the ideas panels)
    - quick-260925-3ob (back-matter asides; this plan layers the ideas block on top of it and leaves asides untouched)
  provides:
    - "ContextBrief.specifics: SpecificIdea[] (kind) and ContextBrief.deferred: DeferredIdea[] (fate/from/dest/revisit) — src/planning-repo/handlers/context-brief.ts"
    - "splitIdeaLead, classifySpecific, classifyDeferred, revisitTrigger — src/planning-repo/handlers/context-brief.ts"
    - "ComposedSpecificsPanel and ComposedDeferredPanel.groups (fixed fate order) — src/web/views/context-brief.ts"
    - "The variant-C ideas block: tagged specifics column + collapsible fate groups — src/web/views/context-brief-components.tsx"
  affects:
    - "CONTEXT page View mode (every phase/quick task with a specifics or deferred section)"
tech-stack:
  added: []
  patterns:
    - "Per-item bounded regexes and single linear scans for every new classifier (T-01-11) — no whole-document scanning, no nested quantifiers"
    - "Backtick-parity linear walks (revisitTrigger, topLevelCutoff) instead of a regex, so an `if` or a separator inside a code span is ignored without backtracking risk"
    - "Defensive enum reads at the composer seam (isDeferredFate / kind) so a payload from a server started before this change still composes (3UG-04)"
key-files:
  created:
    - .planning/quick/260925-3ug-build-sketch-007-c-into-the-context-brie/260925-3ug-PLAN.md
  modified:
    - src/planning-repo/handlers/context-brief.ts
    - src/web/views/context-brief.ts
    - src/web/views/context-brief-components.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/context-brief.test.ts
    - test/web/context-brief.test.ts
    - test/web/context-brief-corpus.test.ts
    - test/e2e/context-brief.spec.ts
    - test/__golden__/dense.json
    - test/__golden__/sparse-started.json
decisions:
  - "Deferred fate is decided by a fixed signal order — carried, out, declined, passed, then handed when only a destination survives, else other. Order is what makes SP 03 #10 ('carried from Phase 2 … D-16') read as carried rather than declined."
  - "A `Phase N` preceded by `from`, or at or below the document's own phase, is a source and never a destination; the paired REQ-ID is scoped to that mention's own sentence rather than to the whole item, so a later unrelated REQ-ID cannot attach itself to the destination."
  - "Group open state is local React state in DeferredGroupView, not routed through ContextBriefInteraction — a fate group is not hash-addressable, so it has nothing to restore from the URL."
  - "Followed the sketch's own paren-lift rule over its hand data for SP 03 #10: the trailing parenthetical moves into the body, so the title is '`admin` split into finer bits'. Pinned with a comment in the test."
  - "Used plain --border for the item rule instead of the sketch's 60% color-mix, to avoid adding a third token-guard violation."
metrics:
  duration: ~45min
  completed: 2026-09-25
actuals:
  tasks: 3
  commits: 3
  plan_head_before: d9b92502a2ce6148883a72d67394688a95ca9b3b
---

# Phase quick-260925-3ug Plan 01: Build sketch-007 variant C into the CONTEXT brief's ideas block Summary

The CONTEXT brief's ideas block showed its two lists as identical 2-line-clamped panels, which
buried the two things a reader actually needs: which specifics are hard rules, and where each
parked idea went and why. Variant C replaces both. Specific ideas become one column of items tagged
RULE / LEANING / NOTE with their bold lead and full untruncated text; Deferred is grouped by what
happened to each idea, with a source or destination per item and a "Revisit if …" line wherever the
text carries a trigger.

## What was built

**Task 1 (tracer, `ff3435e`):** `SpecificKind` plus `splitIdeaLead` and `classifySpecific` end to
end — parser, composer (kind/kindLabel/tone), the tagged left column and its CSS. `splitIdeaLead`
replaced the old `IDEA_TITLE_RE`, which had been failing on most real leads because their bold ends
in its own period or continues with a comma.

**Task 2 (`1465de6`):** `DeferredFate`, `classifyDeferred` and `revisitTrigger` in the parser;
`ComposedDeferredPanel.groups` in the fixed order handed / declined / passed / out / carried /
other in the composer; `DeferredGroupView` and its CSS in the view. The retired idea-button, clamp
and `data-open` rules are gone, with `.view-context-idea` kept as the base row so the e2e corner
check keeps its target.

**Task 3 (`7082d43`):** The design-language entry, the new e2e test, and the full gate run.

## Verification

All 15 SP 01 / SP 03 deferred items match their pinned `fate`/`from`/`dest`/`revisit` — the parser
reproduced the sketch's hand annotations exactly, on the first run, with no adjustment to either the
rules or the expectations. Full `npx vitest run`: 1360 passed, 1 failed — token-guard, on its two
pre-existing lines (`.status-chip[data-tone='in-flight']` and `.view-context-stat-open`), neither an
ideas selector, as the plan permits. `npm run typecheck`, `npx eslint` on every touched file and
`npm run build` are clean. The corpus guard gained an enum-and-arithmetic check across all 19 files;
the ReDoS guard gained a ~200k-character ideas section (finishes well under 250 ms). Goldens were
regenerated and the diff is exactly the four added keys.

Playwright ran once over `test/e2e/context-brief.spec.ts`: 13 passed, 1 failed, then the one failure
re-run with `-g` after its fix. Screenshots (SP 01 and SP 03, 1440px dark and light, 420px dark) were
checked against the sketch and match variant C: chips aligned in a fixed column under an accent top
rule, uppercase group headers with counts in the In/Out label style, a muted note per group,
"Revisit if" in the in-flight colour, destinations as "→ PHASE 3 · ADMIN-03", and a clean stack at
420px with no horizontal overflow (measured: page `scrollWidth` 1440 = `clientWidth`).

Screenshots:

- `~/.claude/projects/-home-cinedise-labelore/scratch/3ug-shots/sp01-1440-dark.png`
- `~/.claude/projects/-home-cinedise-labelore/scratch/3ug-shots/sp01-1440-light.png`
- `~/.claude/projects/-home-cinedise-labelore/scratch/3ug-shots/sp01-420-dark.png`
- `~/.claude/projects/-home-cinedise-labelore/scratch/3ug-shots/sp03-1440-dark.png`
- `~/.claude/projects/-home-cinedise-labelore/scratch/3ug-shots/sp03-1440-light.png`
- `~/.claude/projects/-home-cinedise-labelore/scratch/3ug-shots/sp03-420-dark.png`

## Deviations

**A stale e2e assertion, inherited not caused.** `SP 04: … extras render before the register`
demanded 1 `.view-context-extra`, and found 0. It is not this plan's doing: the only parser diff
against `d9b9250` in that area is an unrelated `set aside` regex literal. SP 04's one `##` section
stopped being an unrecognised "extra" in **quick-260925-3ob**, which taught the brief to claim
canonical references and existing code insights as back-matter asides. 3ob shipped without updating
this spec — understandably, since e2e is run sparingly here. The assertion now states what 3ob
actually produces: 0 extras and 3 aside rows.

**A stray process on port 4199.** The first Playwright invocation refused to start: a 13-hour-old
orphaned `node src/server/index.ts … --port 4199` from an earlier session held the port. It was
stopped (PPID 1, a session scope, not a systemd unit). Ports 4173 and 4174 were confirmed untouched
before and after.

## Follow-ups

- **`labelore.service` still serves the old parser output.** These are server-side parser changes,
  so `build:watch` alone does not pick them up — the live service needs
  `systemctl --user restart labelore`. Deliberately **not** run here (C-5); it is the operator's call.
- The sketch's 60% `color-mix` item rule was substituted with plain `--border`. If the hairline reads
  too heavy against the sketch, the fix belongs with the two pre-existing token-guard violations
  rather than as a third one.

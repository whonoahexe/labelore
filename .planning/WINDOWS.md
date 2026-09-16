---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 7
total_count: 8
last_updated: 2026-09-16T12:18:24.820Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | unrun-verify | fixtures/dense/.planning/HANDOFF.json |  | structured-extraction warning for HANDOFF.json's trailing comma requires plan 01-03's json-config.ts handler; not yet producible in this worktree | fixed |  | 2026-08-22T16:29:23.141Z | 2026-08-22T16:44:39.206Z |
| 2 | 01 | unrun-verify | fixtures/dense/.planning/phases/01-identity-slice/01-COST-MODEL.md |  | Task 2/3 acceptance criteria expecting phase-nested artifacts (SPEC.md, AI-SPEC.md, 01-COST-MODEL.md, 02-01-PLAN.md body) in snapshot.project.artifacts require plan 01-03's assembleDomainModel extension beyond its current root-only tracer scope; not yet producible in this worktree | fixed |  | 2026-08-22T16:29:29.756Z | 2026-08-22T16:44:39.305Z |
| 3 | 03 | lint-warning | test/web/visual-contract.test.ts | 438 | Pre-existing no-regex-spaces lint error, unrelated to plan 03-01's files (confirmed via empty git diff against HEAD). | fixed |  | 2026-09-02T10:04:51.761Z | 2026-09-09T19:25:59.658Z |
| 4 | 04 | unrun-verify | src/web/pages/artifact-page.tsx |  | Human must confirm the unreadable disclosure and empty-document notice read as one coherent explanation | fixed |  | 2026-09-07T20:20:02.595Z | 2026-09-09T19:26:02.120Z |
| 5 | 04 | unrun-verify | .planning/phases/04-portability-degradation-hardening/04-05-PLAN.md |  | Human must decide whether the 04-05 tone prohibition includes disclosure prose | fixed |  | 2026-09-07T20:20:02.709Z | 2026-09-09T19:26:02.233Z |
| 6 | quick-260909-ogb | unrun-verify | src/web/styles/globals.css |  | CR-02 human-check: RESOLVED by orchestrator. Ran headless chromium (playwright bundled binary, no project dependency added) against a live server at 1200/992/700/320px. At every width .snapshot-status is visible (not display:none), the age <time> renders real text, the Refresh button is visible at 36x36, and scrollWidth==clientWidth (no horizontal body scroll). Pre-fix commit 8e1aa10 confirmed to have display:none, so the change is real. | fixed | Verified by orchestrator via headless chromium at 1200/992/700/320px; no dependency added. | 2026-09-09T12:53:14.635Z | 2026-09-09T13:00:00.000Z |
| 7 | quick-260910-0x4 | unmet-truth | src/web/components/ui/button.tsx |  | Refresh control's measured focus-visible ring contrast falls below WCAG 1.4.11's 3:1 non-text guideline in both themes (light 2.29:1, dark 1.46:1, measured live via Playwright against the actual computed outline colour and page background). Reachability and operability (Enter and Space) are confirmed working; only ring contrast is short. [Corrected 2026-09-10: the logged figures came from a flat sRGB-composite model, not rendered pixels. True rendered-pixel measurement of the 3px outline band: light 2.36:1, dark 1.93:1 — both still under 3:1.] | fixed | Fixed via /gsd-fast (user-chosen Option A). Root cause was two-part: the base layer drew the outline at 50% alpha (outline-ring/50), and index.html pre-hydration token snapshot declared its dark tokens under :root.dark (specificity 0,2,0), which out-specified globals.css .dark (0,1,0) and silently shadowed any corrected dark --ring. Fix: outline-ring/50 -> outline-ring (opaque); dark --ring -> oklch(0.56 0.157 37.304); snapshot selector :root.dark -> .dark so globals.css wins the tie after load. Measured on real rendered pixels at 1200px: light 5.21:1, dark 4.07:1. Pinned by test/web/focus-ring-contrast.test.ts (contrast recomputed from tokens, snapshot specificity guard, snapshot/globals token sync in both themes). | 2026-09-09T20:01:49.266Z | 2026-09-10T08:19:02.771Z |
| 8 | quick-260916-o2o | unrun-verify | src/web/components/route-progress.tsx |  | Task 3 human-check (deferred per human_verify_mode: end-of-phase): visually confirm the top bar sweeps above the header on a slow route chunk, stays invisible on a fast one, and is static (not sweeping) under OS prefers-reduced-motion. Automated coverage (build-splitting.test.ts, loading-state-contract.test.ts, token-guard.test.ts, npm run build) all pass; only the live visual/motion observation is outstanding. | open |  | 2026-09-16T12:18:24.820Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "fixtures/dense/.planning/HANDOFF.json",
    "line": null,
    "description": "structured-extraction warning for HANDOFF.json's trailing comma requires plan 01-03's json-config.ts handler; not yet producible in this worktree",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-22T16:29:23.141Z",
    "resolved_at": "2026-08-22T16:44:39.206Z"
  },
  {
    "id": 2,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "fixtures/dense/.planning/phases/01-identity-slice/01-COST-MODEL.md",
    "line": null,
    "description": "Task 2/3 acceptance criteria expecting phase-nested artifacts (SPEC.md, AI-SPEC.md, 01-COST-MODEL.md, 02-01-PLAN.md body) in snapshot.project.artifacts require plan 01-03's assembleDomainModel extension beyond its current root-only tracer scope; not yet producible in this worktree",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-22T16:29:29.756Z",
    "resolved_at": "2026-08-22T16:44:39.305Z"
  },
  {
    "id": 3,
    "kind": "lint-warning",
    "phase": "03",
    "file": "test/web/visual-contract.test.ts",
    "line": 438,
    "description": "Pre-existing no-regex-spaces lint error, unrelated to plan 03-01's files (confirmed via empty git diff against HEAD).",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-02T10:04:51.761Z",
    "resolved_at": "2026-09-09T19:25:59.658Z"
  },
  {
    "id": 4,
    "kind": "unrun-verify",
    "phase": "04",
    "file": "src/web/pages/artifact-page.tsx",
    "line": null,
    "description": "Human must confirm the unreadable disclosure and empty-document notice read as one coherent explanation",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-07T20:20:02.595Z",
    "resolved_at": "2026-09-09T19:26:02.120Z"
  },
  {
    "id": 5,
    "kind": "unrun-verify",
    "phase": "04",
    "file": ".planning/phases/04-portability-degradation-hardening/04-05-PLAN.md",
    "line": null,
    "description": "Human must decide whether the 04-05 tone prohibition includes disclosure prose",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-07T20:20:02.709Z",
    "resolved_at": "2026-09-09T19:26:02.233Z"
  },
  {
    "id": 6,
    "kind": "unrun-verify",
    "phase": "quick-260909-ogb",
    "file": "src/web/styles/globals.css",
    "line": null,
    "description": "CR-02 human-check: RESOLVED by orchestrator. Ran headless chromium (playwright bundled binary, no project dependency added) against a live server at 1200/992/700/320px. At every width .snapshot-status is visible (not display:none), the age <time> renders real text, the Refresh button is visible at 36x36, and scrollWidth==clientWidth (no horizontal body scroll). Pre-fix commit 8e1aa10 confirmed to have display:none, so the change is real.",
    "status": "fixed",
    "reason": "Verified by orchestrator via headless chromium at 1200/992/700/320px; no dependency added.",
    "recorded_at": "2026-09-09T12:53:14.635Z",
    "resolved_at": "2026-09-09T13:00:00.000Z"
  },
  {
    "id": 7,
    "kind": "unmet-truth",
    "phase": "quick-260910-0x4",
    "file": "src/web/components/ui/button.tsx",
    "line": null,
    "description": "Refresh control's measured focus-visible ring contrast falls below WCAG 1.4.11's 3:1 non-text guideline in both themes (light 2.29:1, dark 1.46:1, measured live via Playwright against the actual computed outline colour and page background). Reachability and operability (Enter and Space) are confirmed working; only ring contrast is short. [Corrected 2026-09-10: the logged figures came from a flat sRGB-composite model, not rendered pixels. True rendered-pixel measurement of the 3px outline band: light 2.36:1, dark 1.93:1 — both still under 3:1.]",
    "status": "fixed",
    "reason": "Fixed via /gsd-fast (user-chosen Option A). Root cause was two-part: the base layer drew the outline at 50% alpha (outline-ring/50), and index.html pre-hydration token snapshot declared its dark tokens under :root.dark (specificity 0,2,0), which out-specified globals.css .dark (0,1,0) and silently shadowed any corrected dark --ring. Fix: outline-ring/50 -> outline-ring (opaque); dark --ring -> oklch(0.56 0.157 37.304); snapshot selector :root.dark -> .dark so globals.css wins the tie after load. Measured on real rendered pixels at 1200px: light 5.21:1, dark 4.07:1. Pinned by test/web/focus-ring-contrast.test.ts (contrast recomputed from tokens, snapshot specificity guard, snapshot/globals token sync in both themes).",
    "recorded_at": "2026-09-09T20:01:49.266Z",
    "resolved_at": "2026-09-10T08:19:02.771Z"
  },
  {
    "id": 8,
    "kind": "unrun-verify",
    "phase": "quick-260916-o2o",
    "file": "src/web/components/route-progress.tsx",
    "line": null,
    "description": "Task 3 human-check (deferred per human_verify_mode: end-of-phase): visually confirm the top bar sweeps above the header on a slow route chunk, stays invisible on a fast one, and is static (not sweeping) under OS prefers-reduced-motion. Automated coverage (build-splitting.test.ts, loading-state-contract.test.ts, token-guard.test.ts, npm run build) all pass; only the live visual/motion observation is outstanding.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-16T12:18:24.820Z",
    "resolved_at": null,
    "milestone": "v1.0"
  }
]
````

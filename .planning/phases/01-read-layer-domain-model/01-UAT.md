---
status: complete
phase: 01-read-layer-domain-model
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md]
started: 2026-09-09T13:50:00Z
updated: 2026-09-09T14:25:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: From a clean state (no build cache, no prior snapshot output), a fresh `npm ci` followed by `npm run snapshot -- fixtures/dense --stable` boots with no errors and prints pure JSON to stdout that parses on the first try — no npm lifecycle banner, no warning preamble, no partial write.
result: pass
executed_by: claude (user delegated: "can you try it yourself?")
evidence: |
  `rm -rf node_modules` (540M removed) then `npm ci` — exit 0, 3.8s, 515 packages, zero stdout/stderr output (.npmrc loglevel=silent holding).
  `npm run snapshot -- fixtures/dense --stable` — exit 0, stderr 0 bytes, stdout 512326 bytes beginning at byte 0 with `{` (no npm lifecycle banner).
  JSON.parse succeeded on the first try. loadStatus ok; 3 milestones (v1.0/v2.0/v3.0), 5 phases, 6 requirements, 2 quick tasks, 2 warnings.
  Re-ran and compared: byte-identical across runs (no partial write, deterministic).
  Against test/__golden__/dense.json: identical except one trailing newline the CLI adds to stdout — the golden suite compares JSON.stringify output, so this is expected, not drift.

### 2. Manual smoke test against the real `~/studio-portal`
expected: `npm run snapshot -- ~/studio-portal --stable > /tmp/sp.json` exits 0; `loadStatus.status` is `ok`; the phase list contains both the live milestone's phases and the archived `v1.0` ones with the two "Phase 1" entries distinct; the warning list is short enough to read and every entry names a real problem rather than a routine unresolved identifier; the mention index shows a decision id appearing across several files with sensible excerpts. Then repeat with a relative path, a `~`-prefixed path, and a symlink to the same directory and confirm all four resolve to the same root.
result: pass
executed_by: claude (user delegated: "can you try it yourself?")
evidence: |
  Exit 0, stderr 0 bytes, loadStatus ok.
  Phase-1 distinctness: v1.0/01 identity-persistence-foundation (archived) and v2.0/01
  portal-owned-identity-sessions (live) are two separate entries — the compound identity holds.
  9 phases total across v1.0 + v2.0; the 9th (v2.0 #5, roadmap-only) correctly carries
  diskStatus=no_directory rather than being invented or dropped.
  Warnings: 2, both genuine. Independently re-parsed both files with Python's yaml —
  01-06-SUMMARY.md fails on an unquoted backtick (line 12), 03-07-SUMMARY.md on an unquoted
  @-scoped package name (line 12). Neither is a routine unresolved identifier; both are real
  malformed YAML. Salvage claim verified: frontmatter {} and body intact (12174 / 7446 bytes).
  Mention index: 653 scheme-qualified ids (plan 494, requirement 121, decision 28, phase 10),
  9280 mentions. decision:D-07 spans 52 files with line numbers and readable context.
  All 9280 excerpts contain their own id (0 misses).
  Path shapes: absolute, relative, ~-prefixed and symlink all exit 0 and produce byte-identical
  output. Canonicalization proven directly — a symlink to a non-planning dir echoes the real
  target path (/tmp/no-planning-real), not the link.
covers: [01-01 D8, 01-03 D7, 01-04 D6]
why_human: D-04 scopes this as a manual smoke target with zero committed assertions — no committed test may depend on `~/studio-portal`. The qualitative judgment ("is the warning list short enough to read", "are the excerpts sensible") needs a human.

### 3. Dense fixture — healthy tree
expected: The `fixtures/dense` snapshot shows three milestones (v1.0/v2.0 archived, v3.0 active) with an archived/live phase-01 collision spanning all three kept as distinct entries, the full spread of unfamiliar/invented artifact types present as `kind: "unknown"` rather than dropped, and `config.json`'s deliberately-unfamiliar keys round-tripping unchanged.
result: pass
executed_by: claude
evidence: |
  Three milestones present with correct archived flags: v1.0(true), v2.0(true), v3.0(false).
  Phase-01 collision across all three kept distinct: v1.0/bootstrap, v2.0/legacy-ingest,
  v3.0/identity-slice — three separate entries, three separate dirPaths.
  No file dropped: 53 files on disk, 52 artifacts in the snapshot, 1 deliberate exclusion
  (.planning/research/.cache/deadbeef.json, with a stated reason). 52 + 1 = 53.
  config.json round-trips byte-identical to disk, including vibe_check,
  experimental_widget_pipeline, nested telemetry.sampling.rate and the polymorphic
  parallelization object. No prototype pollution.
  Note: only 6 artifacts are kind:'unknown' now, where 01-VERIFICATION.md recorded "dozens".
  Not a regression — phases 02/03 added typed handlers, so 01-SPEC.md, 01-AI-SPEC.md,
  01-COST-MODEL.md and v3.0-CAPACITY-PLAN.md now classify as spec/ai-spec/cost-model/
  capacity-plan instead of unknown. The "never dropped" invariant is what matters and it holds.
covers: [01-02 D2]
why_human: The 01-02 executor recorded this as human_judgment because two of its checks depended on plan 01-03's handlers, which had not merged at the time.

### 4. Dense fixture — corruption isolation
expected: The `fixtures/dense` snapshot reports exactly two warnings — `HANDOFF.json` (stage `structured-extraction`) and `02-01-PLAN.md` (stage `frontmatter`, body intact) — and no warning for the third deliberate defect (frontmatter-with-no-body, by design). Every other file in the tree parses cleanly and the load never throws.
result: pass
executed_by: claude
evidence: |
  Exactly 2 warnings across 52 artifacts — 50 files parse cleanly, load never throws.
  Defect 1 (.planning/phases/02-transport-layer/02-01-PLAN.md, tab-indented nested
  frontmatter key): stage=frontmatter, salvage "body intact, frontmatter unavailable" —
  confirmed, frontmatter {} with bodyLength 2052.
  Defect 2 (.planning/HANDOFF.json, trailing comma): stage=structured-extraction,
  salvage "nothing readable" — confirmed. This is the cross-plan gap 01-02 flagged as
  human_judgment; 01-03's json-config handler closed it.
  Defect 3 (.planning/phases/01-identity-slice/01-VERIFICATION.md, valid frontmatter,
  empty body): NO warning, 5 frontmatter keys, bodyLength 0 — correct by design, an empty
  body is a legitimate document state, not a parse failure.
covers: [01-02 D3]
why_human: Same cross-plan gap as test 3 — the 01-02 executor could not confirm these until 01-03's json-config handler merged.

### 5. Path resolution across absolute/relative/~/symlink (01-01 D1)
expected: A user-supplied project path (absolute, relative, ~-prefixed, symlinked, or pointing directly at .planning/) resolves to a canonicalized root and produces normalized snapshot JSON via one CLI command, exit 0.
result: pass
source: automated
coverage_id: 01-01 D1

### 6. load()/refresh() never throw; four-variant LoadStatus (01-01 D2)
expected: load()/refresh() never throw; every failure names one of the four LoadStatus values plus the exact path checked, with wording centralized in one exported message map.
result: pass
source: automated
coverage_id: 01-01 D2

### 7. PlanningFilesystem boundary holds under substitution (01-01 D3)
expected: The PlanningFilesystem boundary holds — a second (in-memory) implementation produces byte-identical snapshot output to the Node-backed one.
result: pass
source: automated
coverage_id: 01-01 D3

### 8. Generic markdown handler catches everything (01-01 D4)
expected: The generic markdown handler matches unconditionally, is registered last, and every discovered artifact (including unrecognized file types) survives as kind: 'unknown' rather than being dropped.
result: pass
source: automated
coverage_id: 01-01 D4

### 9. Whole snapshot rebuilds through one refresh() (01-01 D5)
expected: The whole snapshot is rebuildable through one refresh() entry point, which is also what a future watcher will call.
result: pass
source: automated
coverage_id: 01-01 D5

### 10. Non-UI harness dumps snapshot through one entry point (01-01 D6)
expected: A non-UI harness (CLI + Vitest) dumps the parsed snapshot as JSON through one shared entry point, bodies omitted by default with length+hash retained, --with-bodies restores them, --stable makes goldens clone-portable.
result: pass
source: automated
coverage_id: 01-01 D6

### 11. Escaping symlink refused, not followed or dropped (01-01 D7)
expected: An inside-tree symlink resolving outside the canonicalized root has its content refused, not silently followed or silently dropped — the artifact still appears with an empty body and a stage 'read' warning naming the escaping path.
result: pass
source: automated
coverage_id: 01-01 D7

### 12. sparse-started fixture shape (01-02 D1)
expected: sparse-started fixture: one phase, a ROADMAP.md, no milestones/quick/research, no SUMMARY.md, zero warnings, one deliberate dangling requirement reference.
result: pass
source: automated
coverage_id: 01-02 D1

### 13. GSD filename/directory grammar transcribed and cited (01-03 D1)
expected: GSD's real filename and directory grammar is transcribed into naming.ts, one module, every expression cited to a gsd-core source symbol; discovery classifies every file by position (root/phase/archived-phase/quick/milestone-root/research/other) as well as filename.
result: pass
source: automated
coverage_id: 01-03 D1

### 14. Unrecognized filenames survive as kind:'unknown' (01-03 D2)
expected: Every discovered artifact — including an unrecognized filename token — survives as a base Artifact with kind:'unknown', never dropped, and dispatch never consults file content.
result: pass
source: automated
coverage_id: 01-03 D2

### 15. Ten typed handlers extract structured content (01-03 D3)
expected: Ten typed handlers (state, roadmap, requirements, project, plan, summary, context, frontmatter-only, json-config, windows) extract each artifact type's structured content, including ROADMAP.md's per-phase blocks and milestone-grouped <details> form, REQUIREMENTS.md's items/out-of-scope/traceability, PLAN.md/SUMMARY.md's nested frontmatter with pseudo-XML body untouched, CONTEXT.md's six tag sections, and WINDOWS.md's fenced-JSON-preferred rows.
result: pass
source: automated
coverage_id: 01-03 D3

### 16. config.json read as a fully open map (01-03 D4)
expected: config.json (and HANDOFF.json/estimation-calibration.json) is read as a fully open map — unknown keys at any nesting depth round-trip unchanged, a polymorphic field (parallelization) is preserved in whichever shape it arrives, and a prototype-named key never reaches an object prototype.
result: pass
source: automated
coverage_id: 01-03 D4

### 17. Phase identity is the compound key (01-03 D5)
expected: Phase identity is the compound (milestoneVersion, projectCode, number) — a live phase and an archived phase sharing the same number remain two distinct Phase entries; roadmapComplete and diskStatus stay two independently-populated fields that can legitimately disagree.
result: pass
source: automated
coverage_id: 01-03 D5

### 18. assembleDomainModel produces the whole graph and degrades well (01-03 D6)
expected: assembleDomainModel produces the whole graph: a phase directory with no ROADMAP.md entry, a ROADMAP.md entry with no directory, an empty project, quick tasks cross-linked to STATE.md's authoritative table, and dual-channel warning identity are all correct — and it degrades to a well-formed Project (never null) when every input file failed to parse.
result: pass
source: automated
coverage_id: 01-03 D6

### 19. Resolved cross-references, dangling ones marked not dropped (01-04 D1)
expected: The snapshot exposes resolved requirement-to-phase, phase-to-plan, and decision-to-file references, with unresolvable ones present and explicitly marked.
result: pass
source: automated
coverage_id: 01-04 D1

### 20. Filesystem substitution changes nothing downstream (01-04 D2)
expected: Swapping the filesystem implementation changes nothing downstream, proven by byte-identical output.
result: pass
source: automated
coverage_id: 01-04 D2

### 21. refresh() rebuilds without mutating the previous snapshot (01-04 D3)
expected: The whole snapshot rebuilds through one refresh() call without mutating the previous one.
result: pass
source: automated
coverage_id: 01-04 D3

### 22. Corrupted file degrades to raw body plus warning (01-04 D4)
expected: A deliberately corrupted file degrades to its raw body plus a recorded warning while every other file parses cleanly.
result: pass
source: automated
coverage_id: 01-04 D4

### 23. All three fixture trees produce clone-portable snapshots (01-04 D5)
expected: All three fixture trees produce complete, committed, clone-portable snapshots.
result: pass
source: automated
coverage_id: 01-04 D5

## Summary

total: 23
passed: 23
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]

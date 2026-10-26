---
phase: "06"
slug: "trustworthy-tests-and-security-baseline"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-26"
---

# Phase 06 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Private projects → public repository | Test fixtures, helpers and test text once copied from private planning trees and sibling checkouts | Private names, hosts, paths, commit hashes (high) |
| Test run → developer home directory | Tests and Playwright placements that read real checkouts outside the repo | Real-project file paths and content (high) |
| Target config.json → rendered pages and search | Secrets in a project's settings file reaching presentation, the artifact route and the search index | API keys, tokens (high) |
| Planning markdown → browser DOM | Raw-HTML sinks in src/web | Untrusted markup (high) |
| Hostile planning text → scanners and regexes | Linkify tokens, section/mention scanners, diagram lift | CPU time (medium–high) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-06-01 | Information disclosure | test/fixtures/lendshed/** | high | mitigate | Rules R1-R4 in the README; acceptance grep over test/fixtures/lendshed for the deny-list words; standing leak test lands in 06-22 | closed |
| T-06-02 | Information disclosure | playwright.config.ts, test/e2e/fixture-server.ts | high | mitigate | No home-directory path in the config (acceptance grep); fixture server refuses any source outside the repository root | closed |
| T-06-03 | Repudiation (false green) | test/helpers/fixture-project.ts, playwright.config.ts | medium | mitigate | Missing tree throws at import and at config load; vitest-gate fails on skipped, todo or zero-test runs | closed |
| T-06-SC | Tampering | npm/pip/cargo installs | low | accept | This plan installs no packages | closed |
| T-06-04 | Denial of service | src/rendering/linkify.ts REFERENCE_TOKEN | high | mitigate | Bounded quantifiers {1,31} and {1,16}; failing-first growth test with the legacy regex as a positive control | closed |
| T-06-05 | Denial of service | section-projection, markdown-sections, security-register, mentions scanners | medium | mitigate | Standing growth tests on hostile shapes in test/scanner-growth.test.ts | closed |
| T-06-06 | Denial of service | ViewReader outline (T-05-11) | medium | mitigate | capOutline at 18 with a non-interactive +N row; 3,000-heading test | closed |
| T-06-07 | Tampering / XSS | src/web/** raw-HTML sinks (T-05-02, T-05-13) | high | mitigate | Standing raw-html-guard.test.ts with exact allowlist, stale-entry failure and planted controls | closed |
| T-06-08 | Repudiation | outline cap hiding content | low | mitigate | Sections still render; test asserts composeView block count equals heading count | closed |
| T-06-09 | Information disclosure | JsonConfigHandler frontmatter and body | high | mitigate | maskConfig at parse; end-to-end assertions over presentation, artifact route and search | closed |
| T-06-10 | Information disclosure | config.json that fails to parse | high | mitigate | redactSecretText on the raw body; malformed-file test with a planted key | closed |
| T-06-11 | Information disclosure | search index and snippets, including fragment queries | high | mitigate | Index inherits the masked body; fragment-query assertion | closed |
| T-06-12 | Tampering | on-disk config.json | medium | mitigate | Masking only in memory; test compares content and mtime before and after a load | closed |
| T-06-13 | Information disclosure | Lendshed CONTEXT files and the three test files | high | mitigate | README rules R1-R4; deny-list grep in acceptance; standing leak test in 06-22 | closed |
| T-06-14 | Information disclosure | Lendshed DISCUSSION-LOG and VALIDATION files, six test files | high | mitigate | README rules R1-R4; deny-list grep in acceptance; standing leak test in 06-22 | closed |
| T-06-15 | Information disclosure | Lendshed PATTERNS excerpts and paths | high | mitigate | Rewrite every path and identifier inside excerpts; deny-list grep; standing leak test in 06-22 | closed |
| T-06-16 | Information disclosure | test/helpers/research-fixtures.ts, Lendshed RESEARCH files | high | mitigate | Full rewrite with a deny-list plus tells grep (hosts, hardware, tools) in acceptance; standing leak test over test/helpers in 06-22 | closed |
| T-06-17 | Information disclosure | Lendshed PLAN files and the quick-task pair (paths, commit hashes, file lists) | high | mitigate | Rewrite every path, hash and name (hashes become made-up hex); deny-list grep; standing leak test in 06-22 | closed |
| T-06-30 | Information disclosure | Lendshed SUMMARY files (commit hashes, file lists, deviation text, requirement text) | high | mitigate | Rewrite every path, hash, name and requirement sentence (hashes become made-up hex); deny-list grep; standing leak test in 06-22 | closed |
| T-06-18 | Information disclosure | Lendshed UAT and SECURITY files, test/helpers/security-synthetic.ts | high | mitigate | Rewrite every component, host and control name; deny-list grep; standing leak test over test/helpers in 06-22 | closed |
| T-06-19 | Information disclosure | Lendshed UI-SPEC, UI-REVIEW, globals.css, components.json | high | mitigate | Rewrite words and token values; deny-list grep; token-value cross-check against the reference stylesheet recorded in the SUMMARY | closed |
| T-06-20 | Information disclosure | test/fixtures/review/* copies and the Lendshed replacements | high | mitigate | Delete the copies (git rm), rewrite under R1-R4, deny-list and filename-prefix greps in acceptance, standing leak test in 06-22; git history is out of scope (CONTEXT deferred) | closed |
| T-06-21 | Information disclosure | test/fixtures/verification and learnings copies, Lendshed replacements, learnings-page placements | high | mitigate | git rm the copies, rewrite under R1-R4, deny-list grep over the folders, placements limited to in-repo paths by startFixtureServer | closed |
| T-06-22 | Information disclosure | test/helpers/debug-corpus.ts, debug-fixture-server.ts, Lendshed debug sessions | high | mitigate | Delete both helpers; sessions rewritten under R1-R4 (debug sessions carry hosts, devices and stack traces); deny-list grep; standing real-path scan in 06-22 | closed |
| T-06-31 | Information disclosure | Lendshed notes and todos written from the duet, portal and sibling originals; the sketch-data readers | high | mitigate | Rewrite under R1-R4, remove the sibling list and sketch readers, deny-list grep (06-17 runs it over the finished tree); standing leak test in 06-22 | closed |
| T-06-23 | Information disclosure | test/helpers/todo-corpus.ts sibling and copied-project roots, test/fixtures/todos/{duet,portal}, todo-fixture-server.ts | high | mitigate | Remove the last roots and the home-directory import, git rm the copies and the server, deny-list grep over the todo files and both fixture trees; standing real-path scan in 06-22 | closed |
| T-06-24 | Information disclosure | test/helpers/note-corpus.ts sibling roots, test/fixtures/notes/**, note-fixture-server.ts | high | mitigate | Remove sibling roots, git rm the copy and the server, made-up heartbeat note, deny-list grep; standing scans in 06-22 | closed |
| T-06-25 | Information disclosure | test/rendering/fixtures/sp-*.txt and sketch-012-graphs.json | high | mitigate | Same-geometry rewrite, git rm of originals, golden regenerated from made-up input, deny-list plus tells grep over test/rendering/fixtures | closed |
| T-06-32 | Repudiation (false green) | diagram timing tests in ascii-lift, ascii-graph, ascii-tree and figure-detect | medium | mitigate | Sizes kept strictly below each cap, or an explicit flat-ratio assertion above it; inputs built outside the timed region; three consecutive runs; GROWTH_LIMIT never loosened | closed |
| T-06-26 | Information disclosure | project-research pins and test/helpers/project-research-fixtures.ts | medium | mitigate | No-private-name rule for re-pinned strings; deny-list plus tells grep in acceptance; standing source scan in 06-22 | closed |
| T-06-27 | Information disclosure | test/**, fixtures/** | high | mitigate | Standing whole-word leak test with tells, file-name rule and frozen exemptions; planted control | closed |
| T-06-28 | Repudiation (false green) | skip constructs, disguised skips, absolute budgets | high | mitigate | Standing no-skips scan with planted controls; full-suite gate with skipped=0 three times, once under load | closed |
| T-06-29 | Information disclosure | real-project paths in tests and Playwright config | high | mitigate | Real-path scan; HOME-swapped run with equal counts; last helper deleted | closed |
| T-06-33 | Information disclosure | src/**, index.html, docs/, public/ and root config files | medium | mitigate | Seven app-source comments reworded comment-only; leak-test scope C over git's file list with deny words (hyphen-or-whitespace), host tells and the file-name rule, a frozen three-entry D-19 out-of-scope list, anchor files so an empty list cannot pass, and a planted src/ control | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

Evidence (L1, search depth): the standing guards exist and pass in the full unit suite (3588 passed, 0 skipped on 2026-10-26) — test/fixture-leak.test.ts (T-06-27, T-06-33 and every fixture-rewrite threat), test/no-skips.test.ts (T-06-28, T-06-29, T-06-32), test/web/raw-html-guard.test.ts (T-06-07), test/scanner-growth.test.ts (T-06-05); masking in src/planning-repo/secret-mask.ts and handlers/json-config.ts (T-06-09 to T-06-12); bounded {1,31}/{1,16} quantifiers in src/rendering/linkify.ts (T-06-04); capOutline in src/web/pages/artifact-page.tsx (T-06-06); fixture-server refuses sources outside the repo (T-06-02). The copied fixtures (test/fixtures/review sp/dd/sb copies, verification and learnings copies, todos/duet and portal, notes/**, rendering/fixtures/sp-*) and the per-family fixture servers and sibling-root helpers are deleted. No SUMMARY raised a threat flag.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-06-01 | T-06-SC | No plan in this phase installs a package, so there is no supply-chain surface to mitigate | plan-time threat model | 2026-10-26 |
| AR-06-02 | T-06-20 | Deleted copies remain in git history; the plans scope removal to the current tree — history rewriting is out of scope | plan-time threat model | 2026-10-26 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-26 | 34 | 34 | 0 | execute-phase orchestrator (L1 short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-26

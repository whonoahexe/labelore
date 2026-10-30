---
phase: 08-several-projects-and-a-switcher
plan: 04
subsystem: server-settings
tags: [settings, atomic-write, node-fs-boundary, vitest-isolation]
requires:
  - phase: 08-01
    provides: SLUG_PATTERN, allocateSlug, RESERVED_SLUGS
provides:
  - "src/server/settings-model.ts: pure settings schema, tolerant parse, serialize, add/forget/stamp/name-hint updates, notice copy"
  - "src/server/settings-store.ts: FileSettingsStore (fixed path, atomic tmp+rename writes), MemorySettingsStore, defaultSettingsDir"
  - "vitest setupFiles giving every worker a throwaway LABELORE_CONFIG_DIR"
  - "two-importer node:fs gate in test/portability.test.ts"
affects: [08-16]
tech-stack:
  added: []
  patterns:
    - "single permitted write path behind an allow-listed node:fs importer"
    - "re-read before every mutation; pure update; tmp file + rename"
key-files:
  created:
    - src/server/settings-model.ts
    - src/server/settings-store.ts
    - test/helpers/config-dir-setup.ts
    - test/server/settings-model.test.ts
    - test/server/settings-store.test.ts
  modified:
    - vitest.config.ts
    - test/portability.test.ts
key-decisions:
  - "SettingsStore.location() returns the real path of settings.json itself (nearest existing ancestor of the directory resolved through realpath, joined with the remaining segments), not the directory"
  - "mutate returns the updated in-memory state on a write failure or a too-new file (so the change lasts until restart) and the unchanged state when the update function throws or the file was unreadable"
  - "A settings path that exists but cannot be read (not ENOENT/ENOTDIR) is never overwritten: mutate refuses with a reason"
  - "FileSettingsStore and parseSettings take an optional identityOf so 08-16 can plug in canonical project identity; default is the target string"
metrics:
  duration: "~15 min"
  completed: 2026-10-30
status: complete
commits: 2
plan_head_before: ac60b7cbbe07c08d3d02213c7c59f759280354b9
plan_head_after: 5d199095efbdd51b7158ddfbecb7dace6cceb6fc
actuals:
  tokens: 21000
  tasks: 2
  commits: 2
---

# Phase 8 Plan 04: Settings model and atomic settings store Summary

Labelore now has its own settings.json: a pure, never-throwing model plus a second allow-listed node:fs importer that writes it atomically (temp file + rename, 0700 dir / 0600 file, re-read before every change), with every vitest worker pinned to a throwaway config directory.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 (tracer) | settings-model, settings-store, vitest config-dir isolation, model and tracer store tests | 5b7cec3 |
| 2 | two-importer portability gate, degradation matrix tests | 5d19909 |

## What was built

- `settings-model.ts`: `parseSettings(text, identityOf?)` covers missing, ok, corrupt (bad JSON, non-object, non-array projects, bad version), too-new, and absent version (read as 1). Per-entry validation in file order skips with the exact `A saved project was skipped: {reason}.` copy (no location, invalid slug, reserved, used twice, repeats another project). Unknown top-level and per-entry keys round-trip through `serializeSettings`. Pure updates: `addEntry` (portal then portal-2, duplicate by identity), `forgetEntry`, `stampOpened`, `setNameHint`.
- `settings-store.ts`: `FileSettingsStore` fixes `dir`/`file` at construction. A corrupt file is renamed to `settings.json.bak` and the list starts empty with the notice. `mutate` re-reads, applies the update, refuses to write a too-new file, and cleans up its temp file on any failure. `MemorySettingsStore` for smoke/tests. `defaultSettingsDir` throws under vitest without `LABELORE_CONFIG_DIR`.
- `vitest.config.ts` + `test/helpers/config-dir-setup.ts`: each worker gets `mkdtemp` config dir, removed in `afterAll`.
- `test/portability.test.ts`: `ALLOWED_FS_IMPORTERS` (local-fs.ts, settings-store.ts); positive control proves a third planted importer is still caught under a two-name allow-list; settings-store.ts import lines name nothing under planning-fs/planning-repo and no PlanningFilesystem; local-fs.ts named imports are a subset of the read-side allowlist and its `capabilities.write` is false.

## Verification

- `vitest run test/portability.test.ts test/server/settings-model.test.ts test/server/settings-store.test.ts`: 57 passed, 0 skipped.
- `tsc --noEmit -p tsconfig.server.json` and `eslint .`: clean.
- Full `vitest run`: 4555 passed, 3 failed. The 3 failures are the known pre-existing corpus-guard tests (`test/web/pattern-map-corpus.test.ts`, `test/web/ui-spec-corpus.test.ts` for 08-PATTERNS.md / 08-UI-SPEC.md), not caused by this plan.
- `npm run test:gate` and `npm run typecheck` could not be run as written because the worktree has no node_modules (the gate binary resolves `<repo>/node_modules/.bin/vitest`); the equivalent binaries from the main checkout were run directly. The web typecheck project (`tsconfig.web.json`) was not run since no web files changed.

## Deviations from Plan

None in behavior. One interpretation: the plan's wording for `location()` was ambiguous (directory versus file); it returns the settings.json path (see key decisions).

## Backstop truth

Simultaneous cross-process writes are not locked (explicit backstop truth in the plan); only the sequential case is tested.

## Known Stubs

None.

## Threat Flags

None. The write path is the single one the plan's threat model (T-08-11, T-08-12, T-08-15) describes.

## Self-Check: PASSED

- src/server/settings-model.ts, src/server/settings-store.ts, test/helpers/config-dir-setup.ts, test/server/settings-model.test.ts, test/server/settings-store.test.ts: found
- commits 5b7cec3 and 5d19909: found in history

# Phase 8: Several Projects and a Switcher - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-27
**Phase:** 8-Several Projects and a Switcher
**Areas discussed:** Switcher and landing page, What switching does, Remembered list lifecycle, Scanning and adding

---

## Switcher and landing page

| Option | Description | Selected |
|--------|-------------|----------|
| Landing page | `/` lists every project and holds scan and add | ✓ |
| Redirect to last-opened | `/` jumps to the last active project | |
| Redirect when one project | Redirect with one project, landing page with several | |

| Option | Description | Selected |
|--------|-------------|----------|
| Name + path + state | Display name, quiet path, load-state mark; no load needed | ✓ |
| Plus milestone and phase | Needs every project's STATE.md read | |
| Name only | Minimal | |

| Option | Description | Selected |
|--------|-------------|----------|
| Same rows as switcher | Full-width list plus scan and add | ✓ |
| Project cards with status | Milestone, phase, progress per project | |
| You decide | Leave to the sketch round | |

| Option | Description | Selected |
|--------|-------------|----------|
| Last opened first | Recency order, unavailable kept in place | ✓ |
| Alphabetical | Stable by name | |
| CLI order, then others | Startup paths first | |

**User's choice:** all recommended options.

---

## What switching does

| Option | Description | Selected |
|--------|-------------|----------|
| Equivalent page | Matched by page type, dashboard fallback | |
| Always the dashboard | Every switch opens the dashboard | ✓ |
| Last page in that project | Remembered per slug | |

| Option | Description | Selected |
|--------|-------------|----------|
| New shell, loading body | Header switches at once, body loads | ✓ |
| Stay until ready | Spinner on row, navigate when ready | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, fully independent | Each tab follows its URL; no server active project | ✓ |
| One at a time | Opening in one tab switches the app | |

| Option | Description | Selected |
|--------|-------------|----------|
| You decide | Planner picks keep-all or LRU, heap test either way | ✓ |
| Keep all loaded | Warm until restart | |
| Evict old ones | Keep the few most recent | |

**User's choice:** Always the dashboard (departing from the recommended equivalent-page option); the rest as recommended.

---

## Remembered list lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Every opened one | CLI, added and picked scan results | ✓ |
| Only switcher additions | CLI paths are per run | |
| CLI and additions, opt-out flag | Plus `--no-remember` | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, a remove action | Quiet remove on each row; settings-only | ✓ |
| Unavailable ones only | Remove only on unavailable entries | |
| No, edit the file | List only grows from the UI | |

| Option | Description | Selected |
|--------|-------------|----------|
| Numeric suffix, persisted | `portal`, `portal-2` | ✓ |
| Parent folder prefix | `work-portal` | |
| Short hash | `portal-3f9a` | |

| Option | Description | Selected |
|--------|-------------|----------|
| No, edit settings.json | Slugs automatic and stable | ✓ |
| Yes, rename in switcher | Inline rename | |

**User's choice:** all recommended options.

---

## Scanning and adding

| Option | Description | Selected |
|--------|-------------|----------|
| Landing page + switcher link | Full form on `/`, small add dialog from the switcher | ✓ |
| All inside the switcher | Add and scan in the popover | |
| Landing page only | Switcher only switches | |

| Option | Description | Selected |
|--------|-------------|----------|
| Checklist, add selected | Checkboxes, existing ones disabled, "Add N" | ✓ |
| Add one at a time | Per-result Add button | |
| Add all found | Add everything, prune later | |

| Option | Description | Selected |
|--------|-------------|----------|
| Inside $HOME only | Depth 2, skip dot-dirs, node_modules, symlinks, capped | ✓ |
| Anywhere local | Any local folder | |
| Only CLI-given roots | Scan only `--scan` roots | |

| Option | Description | Selected |
|--------|-------------|----------|
| UI only | No `--scan` flag, no startup scan | ✓ |
| Both | `--scan` at start as well | |

**User's choice:** all recommended options.

---

## Claude's Discretion

- Memory policy for loaded projects (keep all or LRU), with a bounded-heap test either way.
- Scan result cap, unavailable-reason wording, loading body look.
- Corrupt settings file handling, unknown-slug screen shape, Hono sub-app dispatch form.

## Deferred Ideas

- Project cards with status on the landing page.
- Equivalent-page switching / last-page memory.
- UI slug rename.
- `--scan` startup flag.

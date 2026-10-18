---
status: investigating
trigger: "search results go stale — I edited a plan and searched for the new word, nothing comes up until I restart"
created: 2026-10-15T09:10:00Z
updated: 2026-10-15T10:42:00Z
---

## Current Focus

bug_class: Bohrbug (deterministic — every edit after boot reproduces it)
hypothesis: The watcher's change handler invalidates the client cache but never re-indexes the file, so MiniSearch still holds the startup text
test: Edit a fixture plan mid-session, then call `index.search()` directly in a node REPL against the live server's index instance
expecting: The old word still matches and the new word does not — true means the index is never updated; false means the client is caching stale results
next_action: Add a temporary log in `src/planning-repo/watch.ts` change handler printing whether `searchIndex.update` is reachable, then save a fixture file

## Symptoms

expected: A word added to a planning file appears in search within a second, without restarting
actual: The page content updates live, but search returns the old text until the server restarts
errors: None in the browser console or the server log
reproduction: Start the dashboard on fixtures/dense, edit 01-01-PLAN.md to add "zebrafish", search "zebrafish"
started: Since live file watching landed (quick task 261014-wch)

## Eliminated

- hypothesis: The client query cache serves stale search results
  evidence: `queryClient.invalidateQueries(['search'])` fires on the SSE event (devtools shows a refetch), and the refetched response itself contains the old text
  timestamp: 2026-10-15T10:05:00Z

## Evidence

- timestamp: 2026-10-15T09:30:00Z
  checked: Network tab while editing a fixture plan
  found: The SSE `change` event arrives within 140 ms and the page's artifact query refetches with the new body
  implication: Watching and push delivery work; the problem is downstream of the event

- timestamp: 2026-10-15T09:52:00Z
  checked: `/api/search?q=zebrafish` response after the edit
  found: `[]` — while `/api/artifacts/...01-01-PLAN.md` already returns the new text
  implication: The server's search index, not the client, holds the stale text

- timestamp: 2026-10-15T10:31:00Z
  checked: `src/search/index.ts` `update()` and `remove()`
  found: Both throw `not implemented`; nothing in `watch.ts` calls them
  implication: Strongly supports the current hypothesis — no path re-indexes a changed file

## Resolution

root_cause:
fix:
verification:
files_changed: []

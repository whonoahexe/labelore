# Deferred items — quick-260925-3ob

Pre-existing, out-of-scope failures observed during this task's full-suite verification. Not
caused by this task's changes (confirmed via `git stash` — the failure reproduces identically on
the pre-task tree) — logged per the scope-boundary rule rather than fixed.

## `test/token-guard.test.ts` — 2 pre-existing colour-token violations

`token guard — spacing + type + colour families (JZ8-01, JZ8-02, JZ8-03, JZ8-04) > has zero
violations outside the token blocks in the real stylesheet` fails against two lines that predate
this task's CSS additions:

```
4512 .status-chip[data-tone='in-flight'] { border-color: color-mix(in oklch, var(--in-flight-fill) 50%, var(--border)) } [color]
5267 .view-context-stat-open { border-color: color-mix(in oklch, var(--in-flight-fill) 50%, var(--border)) } [color]
```

Neither line was touched by this task; this task's own new `.view-context-aside*` rules (appended
after line ~5721, tokens-only) introduce zero new violations. Out of scope for quick-260925-3ob.

# Centralize Spacing, Type, and Color Tokens — Research

**Researched:** 2026-09-10
**Domain:** CSS design tokens (Tailwind v4 `@theme`) + a regression-guard test, single-file scope (`src/web/styles/globals.css`)
**Confidence:** HIGH (all quantitative findings verified by direct file read/grep this session; a handful of naming/weight choices are flagged `[ASSUMED]` below and listed in the Assumptions Log)

## Summary

`globals.css` (3,271 lines) has zero spacing tokens and one type token (`--font-size-micro-label`). Every
padding/margin/gap and font-size value is a hand-tuned literal. The values are not random: spacing clusters
tightly on a **0.05rem grid** from 0.15rem to 1rem, then coarsens to Tailwind's own 0.25rem grid above 1rem —
which matters because `button.tsx` is the **only** Tailwind-utility consumer in the app and relies on
Tailwind's default `--spacing: 0.25rem` formula scale (`h-10`, `px-6`, `gap-1.5`, `text-xs`,
`font-semibold`, `tracking-widest`, confirmed directly in `node_modules/tailwindcss/theme.css`). The safe
reconciliation is: **new spacing/type tokens use a non-Tailwind-reserved namespace** (`--space-*`, `--fs-*`,
`--lh-*`, `--ls-*`, `--fw-*`) defined as plain `:root` custom properties, so they never touch `--spacing`,
`--text-xs`, `--font-weight-semibold`, or `--tracking-widest` and cannot silently rescale `button.tsx`.

Colors are already 100% token-based outside `:root`/`.dark` — no raw literal colors exist in usage sites
today. The color work here is a **naming/dedup** pass on `color-mix()` recipes, not a literal-elimination
pass, plus removing confirmed-dead tokens (verified this session: `--chart-1..5`, `--accent`/
`--accent-foreground`, `--sidebar-ring`, and the `--radius-*` scale are referenced only inside the
`@theme inline` re-export block itself — never consumed by any component or by any other rule in
`globals.css`).

The guard check should **not** add a new dependency. `postcss` and `lightningcss` are present only as
transitive deps of `vite`/`@tailwindcss/vite`/`shadcn` (not in `package.json`), and this codebase already
has an established, working precedent for exactly this kind of gate: `test/portability.test.ts`'s
`node:fs` import-boundary test — plain regex + comment-stripping + explicit allowlist + a planted-fixture
positive control, in a vitest test under top-level `test/` (not colocated with source). The new guard
should be modeled on that file directly.

**Primary recommendation:** Define `--space-*` (0.05rem-step scale), `--fs-*`/`--lh-*` (paired), `--ls-*`,
`--fw-*`, and `--font-mono` as plain `:root` custom properties (not inside `@theme`, to avoid any Tailwind
utility-generation collision with `button.tsx`); migrate values by nearest-step snap; name the recurring
`color-mix()` recipes and dedupe the two confirmed-identical pairs; delete the four confirmed-dead token
groups; and add one new vitest file (`test/token-guard.test.ts`) that regex-scans `globals.css` outside the
`:root`/`.dark`/`@theme inline` blocks for raw padding/margin/gap/inset and font-size literals, with an
explicit allowlist and a planted-violation positive control, following `test/portability.test.ts`'s
pattern.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Spacing/type/color tokens | Browser / Client | — | `globals.css` ships to the SPA as-is; this is pure presentation, no server or build-time computation involved beyond Tailwind's static `@theme` processing at build time. |
| Tailwind utility generation (`button.tsx`) | Browser / Client (build-time via Vite) | — | `@tailwindcss/vite` resolves `@theme` at build time into static CSS; no runtime tier crosses here. |
| Token-guard check | Dev tooling (test suite, `vitest run`) | — | Not part of the shipped app; runs in CI/local `npm test`, never reaches the browser. |

## Project Constraints (from CLAUDE.md)

- Tailwind v4 CSS-first config (`@theme inline` at `globals.css:24`) — new tokens must fit this model, not a JS config file.
- No stylelint installed; `CLAUDE.md` explicitly rejects ceremony ("no enterprise ceremony") — do not add stylelint or a new parser dependency for the guard.
- Squared corners only, `rounded-none` — confirms the `--radius-*` scale is decorative dead weight (see Color Token Findings).
- `@base-ui/react` is the primitives layer; `rehype-sanitize` ordering rules are documented for the markdown pipeline but are unrelated to this task (no markdown/HTML sanitization surface here).
- TypeScript pinned to 5.9.3 (not TS7) — irrelevant to this CSS-only task but noted for consistency.

## Standard Stack

### Core

No new runtime or dev dependency is required. `vitest` (already a devDependency, 4.1.11) is sufficient for the guard check.

### Explicitly rejected additions

| Considered | Verdict | Why rejected |
|------------|---------|---------------|
| `stylelint` (+ a custom plugin for token enforcement) | Rejected | Real ceremony: new config file, plugin ecosystem, another tool in the lint pipeline. CLAUDE.md explicitly asks to avoid this. |
| `postcss` / `lightningcss` direct usage in the guard test | Rejected | Both are present in `node_modules` only as **transitive** deps (`@tailwindcss/vite` → `lightningcss`; `shadcn`/`vite` → `postcss`), not declared in `package.json`. Importing them directly in a test would be relying on an undeclared dependency that can silently disappear on a lockfile/version bump. `npm ls postcss lightningcss` `[VERIFIED: local]` confirms both are nested, not top-level. |
| A custom ESLint rule | Rejected | ESLint's flat config here (`eslint.config.*`) has no CSS-file linting today; writing a custom rule is more ceremony than a focused vitest test, and the codebase already has a working non-ESLint precedent for this exact class of problem (see below). |

### Guard-check precedent already in this repo

`[VERIFIED: test/portability.test.ts:295-403]` — the existing "Node filesystem module import boundary"
test does the *same kind of thing* this task needs (detect a disallowed raw pattern outside one allowed
location) with:
- A comment-stripping helper (`stripCommentsForFsGate`) so prose mentions never false-positive.
- An anchored regex (`FS_IMPORT_PATTERN`) rather than a real parser.
- An explicit single-path allowlist (`ALLOWED_FS_IMPORTER`).
- A recursive file walker (`listTsFiles`) using `node:fs/promises`.
- Three tests: the gate itself, a "not fooled by prose" test naming the specific files expected to be exempt, and a **positive control** that plants synthetic violations in every real spelling into a tmpdir (never the real source tree) and asserts the gate catches each one plus doesn't flag a clean file.

The new CSS token guard should follow this exact shape — same test-writing convention this codebase already uses for a gate of this kind, and it directly matches the plan-checker's likely expectation of "a gate matching only today's literal line is theatre" (quoted verbatim from that file's own positive-control comment).

## Package Legitimacy Audit

Not applicable — no new packages are being installed for this task.

## Concrete Spacing Scale

`[VERIFIED: src/web/styles/globals.css]` — grep of every `padding*`, `margin*`, `gap`/`row-gap`/`column-gap`
declaration (excluding `0`, `auto`, `clamp()`, and shorthand duplicates) shows values landing almost
entirely on a 0.05rem grid between 0.15rem and 1rem, then widening to Tailwind's 0.25rem grid above 1rem.

`[VERIFIED: node_modules/tailwindcss/theme.css:325]` — Tailwind v4's only spacing primitive is
`--spacing: 0.25rem;`; there is no `--spacing-N` table — every numeric utility (`p-6`, `gap-1.5`, `h-10`)
is computed as `N × var(--spacing)` by Tailwind's engine at build time. `button.tsx` uses this formula
directly (`h-10 gap-1.5 px-6`, `h-7 gap-1 px-3`, `h-9 gap-1 px-4`, `h-11 gap-1.5 px-8`,
`size-10`/`size-7`/`size-9`/`size-11` — `[VERIFIED: src/web/components/ui/button.tsx:28-35]`), all of
which land on the 0.25rem grid.

**Reconciliation:** define a new custom-property scale whose unit is exactly **1/5 of Tailwind's spacing
unit** (0.05rem), named `--space-N` where `N` = value ÷ 0.05rem. This makes every Tailwind stop button.tsx
already uses a *named point on the same scale* without touching `--spacing` itself:

| Tailwind utility (button.tsx) | rem | Our token |
|---|---|---|
| `gap-1` | 0.25rem | `--space-5` |
| `px-3` | 0.75rem | `--space-15` |
| `px-4` | 1rem | `--space-20` |
| `px-6` | 1.5rem | `--space-30` |
| `px-8` | 2rem | `--space-40` |

Do **not** define these under `@theme`'s `--spacing-*` key or override `--spacing` itself — either would
regenerate/rescale every arbitrary-value utility in `button.tsx`. Define `--space-*` as plain `:root`
custom properties, consumed only via `var(--space-N)` in hand-written rules.

### Snap table (high-frequency values first)

| Old value | px @16px root | Token | Notes |
|---|---|---|---|
| `0.25rem` | 4px | `--space-5` | |
| `0.3rem` | 4.8px | `--space-6` | |
| `0.35rem` | 5.6px | `--space-7` | |
| `0.4rem` | 6.4px | `--space-8` | absorbs `0.42rem` (single use, 0.02rem drift) |
| `0.45rem` | 7.2px | `--space-9` | |
| `0.5rem` | 8px | `--space-10` | |
| `0.55rem` | 8.8px | `--space-11` | |
| `0.6rem` | 9.6px | `--space-12` | |
| `0.65rem` | 10.4px | `--space-13` | |
| `0.7rem` | 11.2px | `--space-14` | |
| `0.75rem` | 12px | `--space-15` | |
| `0.8rem` | 12.8px | `--space-16` | |
| `1rem` | 16px | `--space-20` | highest-frequency value in the file |
| `1.25rem` | 20px | `--space-25` | |
| `1.5rem` | 24px | `--space-30` | absorbs `1.55rem` (single use, 0.8px drift) |
| `1.75rem` | 28px | `--space-35` | absorbs `1.8rem` (single use, 0.8px drift) |
| `2rem` | 32px | `--space-40` | |
| `2.5rem` | 40px | `--space-50` | |
| `3rem` | 48px | `--space-60` | |

Extend downward for the long tail: `0.08rem`→`--space-2` (0.1rem), `0.15rem`→`--space-3`,
`0.18rem`→`--space-4` (0.2rem), `0.2rem`→`--space-4`, `0.24rem`→`--space-5`, `0.85rem`→`--space-17`,
`0.9rem`→`--space-18`, `1.1rem`→`--space-22`, `1.15rem`→`--space-23`, `1.2rem`→`--space-24`,
`1.3rem`→`--space-26`, `1.35rem`→`--space-27`, `1.4rem`→`--space-28`. The remaining singleton values snap
mechanically the same way — enumerate exhaustively at migration time, not here.

**Flag for the planner:** `margin-left: -1.55rem` at `globals.css:2430` is the only negative non-`.sr-only`
margin. It reads as a specific overlap/offset value, not a generic spacing choice. Recommend visually
verifying this one specifically after snapping (`calc(-1 * var(--space-30))`) rather than assuming
mechanical snap is safe there.

## Concrete Type Scale

`[VERIFIED: src/web/styles/globals.css]` — 25 distinct static `font-size` values exist, almost all packed
into 0.58rem–1rem with ~0.01–0.03rem gaps (no evidence of an intentional ratio scale — this is ad hoc
tuning, confirmed by the density). Frequency leaders: `0.82rem`(9), `0.78rem`(8), `0.67rem`(8),
`var(--font-size-micro-label)`/`0.7rem` combined(14), `0.64rem`(5).

**The floor violator:** `font-size: 0.58rem` at `globals.css:1372` (`.history-milestone > summary small`)
renders 9.28px — below the 10px accessibility floor already documented in the `--font-size-micro-label`
comment (`globals.css:107-114`). Recommend snapping it up to the nearest existing high-frequency step at or
above the floor rather than inventing a new step for a single use.

### Proposed named steps

| Token | Value | px | Absorbs |
|---|---|---|---|
| `--fs-1` | 0.64rem | 10.24px | `0.58rem` (floor fix), `0.63rem`, `0.65rem`, `0.66rem` |
| `--fs-2` | 0.68rem | 10.88px | `0.67rem` |
| `--fs-3` | 0.7rem (= existing `--font-size-micro-label`) | 11.2px | keep the existing token name/semantics per the phase's own read requirement; alias or reuse directly |
| `--fs-4` | 0.75rem | 12px | `0.72rem`, `0.74rem`, `0.76rem`, `0.77rem` — also happens to equal Tailwind's own `--text-xs` default (0.75rem, `--text-xs--line-height: calc(1/0.75)`), `[VERIFIED: node_modules/tailwindcss/theme.css:347-348]`, but do not reuse the `--text-xs` *name* (see Tailwind collision section) |
| `--fs-5` | 0.78rem | 12.48px | kept as its own step — single highest-frequency rendered size in the audit evidence (12.48px × 2061) |
| `--fs-6` | 0.82rem | 13.12px | `0.8rem`, `0.84rem` |
| `--fs-7` | 0.86rem | 13.76px | `0.85rem`, `0.9rem` (borderline, verify visually) |
| `--fs-8` | 1rem | 16px | `0.92rem`, `0.95rem` |
| `--fs-9` | 1.3rem | 20.8px | single use, keep standalone |

Paired line-heights: dominant value is `1.55` (9 uses) — define `--lh-normal: 1.55` for body-ish text at
`--fs-4`/`--fs-5`/`--fs-6`. `--lh-tight: 1.2`, `--lh-loose: 1.65` cover the next clusters. Display/heading
line-heights (`1`, `0.8`–`0.98`) pair with the clamp() display sizes below, not the static scale.

### Fluid (`clamp()`) display sizes

13 distinct `clamp()` triplets exist for `font-size` (plus several more for `padding`/`gap`/`margin`).
**Do not force these onto the static step scale** — clamp() is fluid-by-viewport, a fundamentally different
axis. Instead, consolidate the 13 ad hoc triplets into a small named set of reusable fluid tokens whose
*value is the clamp expression itself*, e.g.:

```css
:root {
  --fs-display-sm: clamp(1.8rem, 4vw, 2.7rem);
  --fs-display-md: clamp(2.6rem, 7vw, 5.6rem);
  --fs-display-lg: clamp(3rem, 7vw, 5.5rem);
}
```
```css
.hero-title {
  font-size: var(--fs-display-md);
}
```

This keeps `clamp()` on the allowlist for the guard (see below) while still eliminating the 13-way
duplication the audit found. The same pattern applies to the ~12 `clamp()` paddings/margins/gaps — name the
handful of genuinely distinct fluid shapes, don't snap them onto `--space-*`.

## Letter-spacing, Font-weight, Mono Font

**Letter-spacing** (`em`, always paired with uppercase micro-labels): 14 distinct values, `0.08em`
dominant. Propose: `--ls-tight: -0.065em` (absorbs -0.03/-0.035/-0.04/-0.07/-0.08em), `--ls-normal: 0`,
`--ls-wide: 0.05em` (absorbs 0.02/0.04/0.05/0.06em), `--ls-wider: 0.08em` (absorbs 0.08/0.09em),
`--ls-widest: 0.12em` (absorbs 0.12/0.13em).

**Font-weight**: `600` dominates (14 uses) → `--fw-semibold: 600`. `700` (3 uses) → `--fw-bold: 700`.
`500` (1 use) → `--fw-medium: 500`. **`650` at `globals.css:2161` and `2248`** is a genuine tie between the
two neighbors (50 away from each) — `[ASSUMED]` recommend snapping to `--fw-bold` (700) because both uses
are interactive emphasis chrome (a link inside `.requirement-list`, and the clickable `<summary>` toggle in
`.artifact-metadata`) where the extra weight reads as intentional emphasis over the base `600` used
everywhere else — but this is a judgment call, not a nearest-value fact; confirm with the user or via visual
diff before locking it in.

**Mono font**: Tailwind v4 already ships its own default `--font-mono` (`ui-monospace, SFMono-Regular,
Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace` —
`[VERIFIED: node_modules/tailwindcss/theme.css:6-8]`), unused by any component (`button.tsx` never applies
`font-mono`), so overriding it is safe. Recommend defining `--font-mono` in the existing `@theme inline`
block as an alias for the *same* JetBrains Mono stack `--font-heading` already uses
(`[VERIFIED: src/web/styles/globals.css:105-106]`, quoted: `'JetBrains Mono', 'SFMono-Regular', Consolas,
'Liberation Mono', ui-monospace, monospace`), then migrate the three hardcoded system-mono stacks at
`globals.css:1695`, `1739`, `1831` (`.artifact-path`, `.metadata-record dt`, `.plan-section-label`) onto
`var(--font-mono)`. **This is a real, visible font change** for those three rules (system monospace →
JetBrains Mono webfont), not a no-op token rename — the task brief's own framing ("`--font-heading`... doubles
as the code font") supports doing it, but flag it to the user as a deliberate visual change, not a
mechanical snap.

## Tailwind `@theme` Collision Risk — the `button.tsx` Pitfall

`[VERIFIED: node_modules/tailwindcss/theme.css:347-389]` — Tailwind v4's own defaults for the utility
classes `button.tsx` uses:
```
--text-xs: 0.75rem;               --text-xs--line-height: calc(1 / 0.75);
--font-weight-semibold: 600;
--tracking-widest: 0.1em;
--spacing: 0.25rem;
```
`button.tsx`'s base class string includes `text-xs font-semibold tracking-widest` plus the numeric spacing
utilities listed above (`[VERIFIED: src/web/components/ui/button.tsx:11,28-35]`). **If the new type scale
reuses any of Tailwind's reserved `@theme` keys** (`--text-xs`, `--font-weight-semibold`, `--tracking-widest`,
`--spacing`, or any `--spacing-N`) **with a different value than Tailwind's own default, `button.tsx`
silently re-renders** — the only file in the app using Tailwind utility classes at all, so a regression here
is invisible to every hand-written CSS rule and easy to miss in review.

**Mitigation:** use non-reserved custom-property names throughout (`--space-*`, `--fs-*`, `--lh-*`,
`--ls-*`, `--fw-*`), defined as plain `:root` properties, **not** inside `@theme`/`@theme inline`. Tailwind
only generates utilities for names it recognizes in its reserved namespaces; a differently-prefixed custom
property is invisible to Tailwind's utility generator and therefore cannot collide by construction. This
also means the new tokens do not need to go through the `@theme inline` re-export block at all — only
`--font-mono` (see above) has a legitimate reason to live there, because it deliberately reuses a Tailwind-
recognized key.

## Color Token Findings

No raw color literals exist outside `:root`/`.dark` today — confirmed by the task's own audit and by this
session's grep (43 `color-mix()` call sites, zero raw `oklch()`/hex/`rgb()` outside the two token blocks).
The color work is naming/dedup, not literal-elimination.

**Confirmed duplicate pairs** (same recipe, two names): `--sidebar-primary` / `--state-active`
(`color-mix(in oklch, var(--primary) 11%, transparent)`, `globals.css:94,101` and `149`) and
`--sidebar-accent` / `--state-hover` (`color-mix(in oklch, var(--sidebar-foreground) 6%, transparent)` /
`color-mix(in oklch, var(--foreground) 6%, transparent)`, `globals.css:96,100` and `151`). Recommend keeping
`--sidebar-primary`/`--sidebar-accent` as the source of truth (they're the ones exposed to Tailwind's color
utilities via `@theme inline:33-36`) and redefining `--state-active`/`--state-hover` as `var()` aliases of
them, rather than the reverse — minimizes touching the `@theme inline` block.

**Confirmed dead tokens** — `[VERIFIED: src/web/styles/globals.css]`, grepped this session: `--chart-1`
through `--chart-5`, `--accent`/`--accent-foreground`, `--sidebar-ring`, and the full `--radius-sm`
through `--radius-4xl` scale are referenced **only** inside the `@theme inline` re-export block itself
(lines 29, 37-41, 46-47, 58-64) — never consumed by any other rule in `globals.css`, and never referenced by
any `.tsx`/`.ts` file (confirmed by grep across `src/web`). Safe to delete outright.

**Stale comment**: `globals.css:2491` claims dark `--border` "resolves to oklch(1 0 0 / 10%)" — the actual
definition at `globals.css:139` is `oklch(1 0 0 / 16%)`. Fix the comment; do not change the token.

**Recipes worth naming** (recurring, per the task's own audit — reuse those line numbers directly):
`color-mix(in oklch, var(--card) 94%, transparent)` ×4 → e.g. `--card-veil`; `color-mix(in oklch,
var(--destructive) 55%, var(--border))` ×3 → e.g. `--destructive-border-mix`; the paired
`var(--primary) 65%, var(--border)` / `var(--primary) 9%, transparent` at `globals.css:672-673` look like a
single "selected/active filter" state pair — consider one semantic pair (`--selected-border`/
`--selected-bg`) rather than two independent recipe names.

## Common Pitfalls

### Pitfall 1: `mermaid-theme.ts`'s caller reads exact custom-property names

**What goes wrong:** Renaming or deleting a CSS custom property that `artifact-page.tsx` reads by name
silently breaks Mermaid diagram theming (fails soft — `toMermaidColor()` returns unrecognized input
unchanged, so the diagram renders with the *raw unconverted* `oklch()` string, which Mermaid's color
library rejects outright).

**Names it reads** — `[VERIFIED: src/web/pages/artifact-page.tsx:229,252-268]`, read via
`getComputedStyle(document.documentElement).getPropertyValue(...)`: `--font-sans`, `--background`,
`--card`, `--foreground`, `--border`, `--secondary`, `--muted`. **None of these are in the confirmed-dead
list above** — safe as long as this task doesn't rename or remove any of these seven names. Also reads
`getComputedStyle(document.body).fontSize` (resolved pixel value, not a var lookup) — unaffected by any
token rename since `body`'s font-size isn't touched by this task.

**How to avoid:** grep for each of the seven names in `artifact-page.tsx` before renaming any color token;
if a rename is unavoidable, update both sites in the same commit.

### Pitfall 2: shiki's own inline custom properties are out of scope, don't let the guard touch them

`globals.css:2528-2538` reads `var(--shiki-light)`, `--shiki-light-bg`, `--shiki-dark`, `--shiki-dark-bg` —
these are injected per-code-block by shiki itself at render time (inline `style` attributes in the
generated HTML), not design tokens. They're already `var()`-wrapped, so the guard won't flag them, but
don't be tempted to "centralize" them — they have no `:root` definition to centralize into.

### Pitfall 3: `.sr-only`'s `1px`/`margin: -1px` is not a design-scale value

`globals.css:1440-1448` (`.sr-only`) uses the standard visually-hidden accessibility idiom:
`width: 1px; height: 1px; padding: 0; margin: -1px;`. This is a well-known CSS hack, not a spacing choice —
must be an explicit guard allowlist exception, never snapped onto `--space-*`.

### Pitfall 4: grid-gap hairlines (`gap: 1px`) are dividers, not spacing

`globals.css:1193` and `2264` use `gap: 1px` on a grid to expose the container's background color as a
1px divider line between cells — same category as a `1px` border, not a spacing-scale value. Allowlist
alongside `.sr-only`.

### Pitfall 5: em-relative font-sizes are intentionally relative, not scale points

`globals.css:2525` (`0.86em`, inline `<code>`) and `globals.css:624` (`0.2em`, a label inside a giant
`clamp()`-sized hero heading) both scale relative to their *parent's* resolved font-size, which itself
varies (headings, `clamp()` display text). Snapping these onto the static `--fs-*` scale would change
their behavior (fixed size instead of proportional) — allowlist `em` units for font-size explicitly.

### Pitfall 6: multi-value shorthand needs per-component snapping

Several declarations are shorthand with multiple lengths on one line, e.g. `padding: 1rem 0.8rem 2rem;`
or `margin: 0.45rem 0 0;`. The guard and the migration must tokenize **each space-separated component**
independently — a naive whole-value regex match will either miss violations or misfire on the `0`s.

## The Guard Check

**Scope, per the task brief's own wording:** fail on raw **spacing** (`padding*`/`margin*`/`gap`/`row-gap`/
`column-gap`/`inset`/`top`/`right`/`bottom`/`left`) and **font-size** literals outside the token-definition
blocks (`:root`, `.dark`, `@theme inline`). Letter-spacing/font-weight/font-family are being tokenized in
this same task (items 2-3) but are **not** named in the guard's own scope — recommend gating those too if
cheap to add, but treat it as discretionary, not required, since the brief is explicit about which three
categories the check must cover.

**Implementation — model directly on `test/portability.test.ts`:**

```typescript
// test/token-guard.test.ts (new file, follows test/portability.test.ts's shape)
const CSS_PATH = join(REPO_ROOT, 'src/web/styles/globals.css');
const TOKEN_BLOCK_SELECTORS = [':root', '.dark', '@theme inline'];

// 1. Read globals.css, strip comments (reuse a CSS variant of stripCommentsForFsGate —
//    /* ... */ only, no // in CSS).
// 2. Walk lines, tracking brace depth to know when inside vs. outside a token block
//    (a token block starts at a line matching one of TOKEN_BLOCK_SELECTORS followed by `{`,
//    ends when brace depth returns to 0).
// 3. For lines outside any token block, split declarations on `;`, then split shorthand
//    values on whitespace (respecting parens — a component inside clamp(...)/color-mix(...)
//    doesn't split on internal spaces).
// 4. Flag any component that is a bare numeric length (rem/px/em) for a spacing or
//    font-size property and is NOT: `0`, `auto`, wrapped in `var(...)`, wrapped in
//    `calc(...)` around only `var()`, `1px` (hairline allowlist), an `em` unit (relative
//    allowlist), or inside a `clamp(...)` call (fluid allowlist — clamp itself is allowed,
//    but consider a *separate* assertion that the same clamp() literal string doesn't repeat
//    more than once — that catches the "13 ad hoc triplets" regression without needing full
//    dedup logic).
// 5. Explicit path/selector allowlist for .sr-only and the two `gap: 1px` grid-divider rules.
```

**Required tests, mirroring the fs-gate's three-test shape:**
1. The gate itself — zero violations against the migrated `globals.css`.
2. "Not fooled by allowlisted patterns" — name `.sr-only`, the two `gap: 1px` sites, and the `em`-unit
   sites explicitly (not just an empty-violations count), so a future edit that turns one into a real
   violation is caught by name.
3. **Positive control** — plant a synthetic `.css` fixture (in a tmpdir, never mutating the real file) with
   one violation per category (raw `padding`, raw `margin`, raw `font-size`, inside vs. outside a `:root`
   block) and assert the gate catches each while a clean fixture passes.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `font-weight: 650` (×2) should snap to `700` rather than `600` | Letter-spacing/Font-weight/Mono | Low visual risk either way (one step of `font-weight` on two small UI labels); wrong choice is a one-line fix, not a rework |
| A2 | Migrating the three hardcoded `ui-monospace` stacks onto the JetBrains-Mono-backed `--font-mono` is the intended fix (not merely aliasing `--font-mono` to the existing system stack instead) | Letter-spacing/Font-weight/Mono | Visible font change on `.artifact-path`, `.metadata-record dt`, `.plan-section-label` if the user actually wanted a distinct system-mono token preserved as-is |
| A3 | `0.85rem`/`0.9rem` should share `--fs-7` | Concrete Type Scale | Minor visual drift (0.8px) on whichever rules use `0.9rem` if the gap is judged too large on review |

**If confirmation is needed:** A1 and A2 are the two genuinely non-mechanical calls in this research (every
other snap is a strict nearest-value or grid-membership decision) — worth a quick visual check before
locking them into the plan.

## Sources

### Primary (HIGH confidence — read/grepped directly this session)
- `src/web/styles/globals.css` — full spacing/type/color grep sweep, exact line citations throughout
- `node_modules/tailwindcss/theme.css` — Tailwind v4 default `@theme` values (`--spacing`, `--text-xs`,
  `--font-weight-semibold`, `--tracking-widest`, `--font-mono`)
- `src/web/components/ui/button.tsx` — the one Tailwind-utility consumer, exact class list
- `src/web/pages/artifact-page.tsx` — exact custom-property names read for Mermaid theming
- `test/portability.test.ts` — the existing guard-test precedent this task's check should mirror
- `package.json` / `npm ls postcss lightningcss` — confirmed both are transitive, not declared, deps

### Secondary (MEDIUM confidence)
- Task brief's own pre-gathered computed-style sweep (33 rendered font-sizes, 47 line-heights, etc.) —
  used as corroborating frequency data, not re-verified pixel-by-pixel this session

## Metadata

**Confidence breakdown:**
- Spacing/type scale values: HIGH — every number came from direct grep of the live file
- Tailwind collision risk: HIGH — verified against the installed `tailwindcss` package's own default theme file
- Font-weight-650 and mono-font migration calls: MEDIUM — genuine judgment calls, flagged in Assumptions Log
- Guard-check design: HIGH — modeled on a working precedent already in this exact codebase

**Research date:** 2026-09-10
**Valid until:** No expiry driver (single-file, no external API surface) — valid until `globals.css` or the Tailwind version changes materially

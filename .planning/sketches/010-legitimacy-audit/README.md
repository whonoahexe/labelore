---
sketch: 010
name: legitimacy-audit
question: "How should RESEARCH's Package Legitimacy Audit show its verdicts, making [SLOP] removals and [SUS] flags stand out?"
winner: null
tags: [documents, per-type-views, research, legitimacy, packages]
---

# Sketch 010: Legitimacy audit

## Design Question
The audit is a seam-output table (package, registry, age, downloads, repo, verdict, disposition)
plus two prose lines: "Packages removed due to [SLOP] verdict" and "Packages flagged as suspicious
[SUS]". The verdicts are what matter: a removed package and the reason it was removed, and which
packages need a human checkpoint before install. How should they read inside 008-A's
"01 Standard stack" chapter?

## How to View
http://cinedise:4174/010-legitimacy-audit/ (or the sketch quick tunnel)

Toolbar: **Audit** opens with **+ synthetic SLOP** on: two invented removals, each badged
SYNTHETIC wherever it appears, because no real RESEARCH.md has removed a package yet. Switch to
**real** to see the everyday case. **Doc**: labelore P2 has 30 rows, 12 SUS (all `too-new`);
studio-portal P2 has 4 crates, all OK, with design dispositions ("Rejected on design grounds, not
legitimacy").

## Variants
- **A: Verdict strip + table.** Big counts, a proportion bar (slop → sus → ok), removed packages as red struck-through cards with the reason and replacement, SUS names as a chip row, the protocol note, and the full seam table behind a toggle. It sits after Core / Supporting / Alternatives.
- **B: Lanes by verdict.** Three columns: Removed · slop (red top rule), Flagged · suspicious (amber), Approved (compact name chips; dashed ones carry a non-plain disposition, listed under them). Each slop or SUS item shows its signals (age, downloads/wk, repo, rule), with the bad ones in red.
- **C: Annotated stack.** No separate audit block. A one-line legitimacy summary heads the stack, removed packages lead the list as red rows, and each Core / Supporting package carries its own verdict (SUS ▾ opens the seam evidence inline; ✓ ok otherwise). Audited packages that aren't in the stack (studio-portal's nix / sysinfo / libc) get a closing group.

## What to Look For
- With synthetic SLOP on: which variant makes "this was removed, here's why, use this instead" impossible to miss?
- labelore's 12 SUS: are 12 chips (A), 12 lane cards (B) or 10 flagged stack rows (C) the right weight for a flag that is only the `too-new` rule?
- studio-portal (all OK): does the section stay quiet, and do the design dispositions survive?

## Data note
Rows come from 008's `data.js` (verbatim seam tables). The SLOP rows and their reasons are
invented, and badged everywhere. C matches audit rows to stack entries by splitting combined
names on `,` / `+` / ` / `.

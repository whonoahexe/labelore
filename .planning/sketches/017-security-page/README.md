---
sketch: 017
name: security-page
question: "How should a SECURITY page show date, threats open, ASVS level and status, a small summary, trust boundaries (if useful to a human), the threat register with severity and status, the accepted risks log, a toggleable audit trail and sign-off — and in what order?"
winner: "D"
tags: [documents, per-type-views, security, threats, layout]
---

# Sketch 017: SECURITY page

## Design Question
A SECURITY.md is a phase's threat contract: frontmatter (status, threats_open, asvs_level,
created), a lead paragraph, Trust Boundaries (boundary · description · data crossing), the Threat
Register (id · STRIDE category · component · severity · disposition · mitigation · status),
the Accepted Risks Log (risk · threat ref · rationale · accepted by · date), sometimes extra
sections (Residual Observations, Hardening Notes), the Security Audit Trail and Sign-Off.

## How to View
http://cinedise:4174/017-security-page/

Toolbar **Doc**:
- **synthetic:** sp P3 mid-audit, with 2 high threats open (blocking), a second audit run and the sign-off unticked. Every real doc is verified and closed.
- **sp P1:** 44 threats, 1 critical, plus Residual Observations.
- **sp P3:** 42 threats, 11 accepted.
- **labelore 05:** 1 threat open below the threshold (non-blocking), plus audit notes.
- **labelore 02:** a grouped register ("Threat group | Ids | Sev"), plus 3 extra sections.
- **labelore 04:** accepted risks written as prose, and no Component column.
- **labelore 01** and **fixture:** a draft with 1 open threat.

## Shared across variants
- **Cover:** eyebrow "Security · Phase N" and a title from the slug. The facts row has the Status chip (verified → complete, draft/open → in-flight), Created, ASVS Level N and "Blocks at high+" (read from the legend's block_on, default high). Below it are four cells:
  - **Threats open:** a big number in the missing tone when it is above 0, "nothing blocking" or "N below high, non-blocking" otherwise, and a jump link.
  - **Threat register:** the count, a closed/open bar and a severity breakdown.
  - **Accepted risks:** the count.
  - **Sign-off:** N of M checks and the approval line.
  The lead paragraph is the small summary, clamped to 3 lines with "more".
- **Tones are for status only:** open (blocking) → missing, open below the threshold → in-flight, closed → complete. Severity is a neutral 4-pip scale (critical ▮▮▮▮ … low ▮▯▯▯) and never a hue, so 40 closed high threats don't look like alarms.
- **Accepted risks link to their threat** in both directions.
- **Extra sections** (Residual Observations, Hardening Notes, …) are folded.
- **Sign-off:** a checklist beside the approval stamp.
- **Audit trail:** off by default behind a switch. When on, it shows one row per run: date, closed/total bar, open count and who ran it.

## Variants
- **A: Register first.** Order: Threat register → Accepted risks → Trust boundaries → extras → Sign-off → audit.
  - **Register:** a severity × disposition count grid (click a cell to filter; a dot marks a cell holding an open threat). Below it, open threats come first as rows, and the closed ones are folded behind a "N closed threats · Show" bar. A row opens its mitigation and, when the threat was accepted, its risk entry.
  - **Accepted risks:** "signed slips". Each slip shows the risk ID, the threat's severity and ref, what the threat is, the rationale as a quote, and an "accepted by · date" signature line.
  - **Trust boundaries:** a crossings list (from → to, what crosses, why).
- **B: Map first.** Order: Where it can be attacked → Threats by kind → Accepted risks → extras → Sign-off → audit.
  - **Boundary map:** three columns (From | what crosses on an arrow | Into). Boundaries without an arrow become "at rest / in-process" store tiles.
  - **Threats by kind:** STRIDE lanes (S T R I D E), each with open threats first, 5 cards shown and "+N more".
  - **Accepted risks:** a timeline grouped by acceptance date.
- **C: Attention first.** Order: Needs a human eye → Threat register → Trust boundaries (folded) → extras → Sign-off → audit.
  - **Needs a human eye:** open threats and accepted risks together, as cards.
  - **Threat register:** a full ledger table sortable by id, severity, category or status.
  - **Trust boundaries:** collapsed by default.

## What to Look For
- Are trust boundaries worth a human's time? B treats them as the headline, A puts them after the risks, C hides them.
- In the synthetic doc, do the 2 open threats grab attention without the 40 closed ones drowning them?
- For accepted risks, which reads best: slips (A), a timeline (B) or attention cards (C)?
- Does labelore 02's grouped register still read well in each variant?

## Round 2 — fresh layouts
Feedback: A–C looked like the VALIDATION page (016). Keep the design language consistent (tokens,
type, chips, tones, pips) but don't copy the cover-sheet + numbered-section frame.

- **D: Console.** A sticky left rail holds the identity: eyebrow, title, status, created, ASVS and
  block level, a "threats open" gauge with a vertical closed/open bar, nav with counts, a sign-off
  stamp and the audit switch. The content column starts with the summary, then the **threat board**:
  severity rows × STRIDE columns, one square per threat (filled = mitigated, dashed = accepted,
  missing/in-flight tone = open). Click a square for a detail panel with its mitigation and any
  acceptance. Accepted risks are a waiver ledger (risk · threat ref · what + why · signature right).
  Trust boundaries are inline flow chips: [from] —what crosses— [to].
- **E: Perimeter.** A banner with the title on the left and a verdict word on the right ("2 open" /
  "All clear"), then a status bar (status · created · ASVS · blocks at · sign-off · audit switch).
  The headline is the **attack-surface diagram**: outside nodes | dashed trust line | inside nodes,
  deduplicated, with SVG wires drawn between them. Pick a node to light up its wire and caption what
  crosses and why. The register is grouped by **what was done**: Mitigated | Accepted | Transferred
  columns, open first. The accepted risks merge into the Accepted column (rationale + signature
  under each threat), so there is no separate log. Sign-off is a footer bar of tick squares.
- **F: Audit report.** The verdict is written as a sentence ("2 high threats still open and blocking
  sign-off. 40 of 42 are closed."), followed by a **threat strip** with one bar per threat, height =
  severity, colour = status, dashed = accepted. Click a bar to jump to its line. Sections sit under
  margin labels. Threats are severity bands of one-line entries, with superscripts pointing to
  accepted-risk **footnotes**. Boundaries are plain sentences, sign-off is a signature line + checks,
  and the audit trail is last, off by default.

## Winner
**D: Console, rail + threat board.** Build it:
- **Rail (sticky, left; stacks on top below ~980px):**
  - eyebrow "Security · Phase N" and the title
  - Status chip (verified → complete, draft/open → in-flight), Created, ASVS Level N, Blocks at <level>+ (from the legend's block_on, default high)
  - "threats open" gauge: big number (missing tone when > 0) beside a vertical closed / open-low / open bar, with "blocking sign-off" or "nothing blocking" and "N of M closed"
  - nav with counts (Threats · Accepted risks · Trust boundaries · Sign-off), the sign-off stamp (✓ Signed off / ○ Not signed off + approval line), the audit-trail switch (off by default), copy-path and View/Source
- **Content:**
  - **Summary:** the lead paragraph.
  - **Threat board:** severity rows (pips) × STRIDE columns (S T R I D E, plus "Other"/"Grouped" when needed), with empty cells hatched. One square per threat: filled = closed mitigated, dashed = closed accepted, missing = open blocking, in-flight = open non-blocking. Then a legend, and a detail panel for the picked square (id, severity, status, disposition, title, category, mitigation, and the accepted-risk rationale + signature if any).
  - **Accepted risks:** a waiver ledger (risk id · threat ref that picks its square · title + rationale · signature and date on the right). Prose-only risk sections render as a notice.
  - **Trust boundaries:** flow chips [from] —data— [to]. Boundaries without an arrow are a dashed node with "holds …".
  - **Extra sections** (Residual Observations, Hardening Notes) are folded.
  - **Sign-off:** the checklist, and the audit trail when switched on.
- Tones on status only, severity as neutral pips, no invented hues.
- A–C and E–F stay in the sketch as explored alternatives; not built.

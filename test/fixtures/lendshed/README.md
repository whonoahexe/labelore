# Lendshed — the made-up fixture project

Every file under this folder is made up. Lendshed is not a real product, and none of its words, names,
paths, IDs, dates, hosts or people were copied from any real project. Real planning folders were looked
at only to learn their structure (headings, table shapes, frontmatter keys, wrapper tags); the words were
invented fresh (decision D-06). Tests read this folder and nothing else on the machine (D-01, D-05).

## The fiction

Lendshed is a web app for a neighbourhood tool library. Members borrow tools from shared sheds, stewards
keep the inventory, and loans can move between sheds. Domain: `lendshed.example` only.

People:

- Maya Okafor, steward lead
- Teo Lindqvist, developer
- Ana Ruiz, a member who tests

## Milestones and phase folders

Current milestone **v1.1 "Steward Desk"**, folders under `phases/` in order:

1. `01-member-sign-in-sessions`
2. `02-roles-and-permissions`
3. `03-account-admin-and-sessions`
4. `04-bulk-loan-export`

Shipped milestone **v1.0 "Shed Basics"**, folders under `milestones/v1.0-phases/` in order:

1. `01-member-data-foundation`
2. `02-shed-inventory-health`
3. `03-catalogue-browsing`
4. `04-shed-to-shed-transfers`

## Requirement IDs

- v1.1: `SIGN-01..06`, `ROLE-01..06`, `ADMN-01..06`, `EXPT-01..06` (24 in all)
- v1.0: `MEMB-01..05`, `SHED-01..05`, `CATL-01..05`, `MOVE-01..05` (20 in all)

## Quick-task IDs reserved for later plans

- `260402-t8m` — restyle the top bar
- `260403-k2p` — right-click menu on the catalogue grid
- `260327-h4w` — move the live-status socket into a provider

## Date ranges

- v1.0 work: January to March 2026; v1.0 shipped 2026-03-20
- v1.1 work: March to April 2026

## Authoring rules every later plan follows

- **R1** Keep every heading, table shape, frontmatter key set, malformed spot, wrapper tag and formatting
  quirk a test relies on.
- **R2** Change every word, name, path, ID, date-slug, host and person.
- **R3** Trim prose to a few lines per section (D-17).
- **R4** Inside ASCII diagrams and box drawings, substitute same-length words column for column; never
  re-wrap.
- **R5** Recalculate every pinned number by counting in the fixture file itself with grep or awk, never by
  copying the extractor's output (D-02).
- **R6** Pin values per file, never a total over the whole Lendshed project, because sibling plans add
  files in the same wave.
- **R7** A test whose fixture file is missing throws through `fxPath`, never skips.
- **R8** Every corpus walk asserts a minimum count.
- **R9** Only plan 06-09 may edit `ROADMAP.md` and `STATE.md` after plan 06-01, and nobody edits
  `REQUIREMENTS.md`, so later plans cite only the IDs listed here or deliberately absent ones.

A per-file quirk ledger is compiled by the last plan of the phase.

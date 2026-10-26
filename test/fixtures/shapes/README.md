# Shapes — the made-up fixture project for file shapes

Every file under this folder is made up. Shapes is not a real project, and none of its words, names,
paths, IDs, dates, hosts or people were copied from any real project. Real planning folders were looked
at only to learn their structure (headings, frontmatter keys, wrapper tags, the kinds of files GSD
leaves behind); the words were invented fresh (decision D-06). Tests read this folder and nothing else
on the machine, and a missing file throws, never skips.

Shapes exists to hold the file shapes the Lendshed project does not: images, binaries, GSD's own
bookkeeping files, odd folders and the URL edge cases of Phase 7. Lendshed stays the project for page
content.

## The fiction

Kilnrow is a booking board for a shared pottery studio's kilns. Members book a kiln slot, the studio
lead approves glaze firings, and a firing calendar shows what is in each kiln. Domain: `kilnrow.example`
only.

People:

- Ines Marlow, studio lead
- Bram Okoye, developer

Milestones:

- Live milestone **v1.1 "Firing Board"**, folders under `phases/` in order: `01-kiln-bookings`, then the
  folders later plans add.
- Shipped milestone **v1.0 "Kiln Basics"**, folders under `milestones/v1.0-phases/` (added by plan 07-04).

## Authoring rules every plan follows

- **R1** Structure comes from GSD: keep the headings, frontmatter keys and wrapper tags a test relies on.
- **R2** The words are invented: change every name, path, ID, date-slug, host and person.
- **R3** Binary files are written with a one-off node command and are never edited by hand; their bytes are
  listed in the ledger below.
- **R4** Pin values per file, never a total over the whole project, because sibling plans add files in the
  same wave.
- **R5** Every file below has a row in the ledger: its path, why it exists, and the plan that added it.
- **R6** A test whose fixture file is missing throws through `shapesPath`, never skips.
- **R7** Nothing here is ignored by git: check with `git check-ignore` before committing a new file.
- **R8** Only plan 07-01 edits `ROADMAP.md`; later plans add their folders without editing it.

## Ledger

| Path | Why it exists | Added by |
|---|---|---|
| `README.md` | this ledger | 07-01 |
| `.planning/PROJECT.md` | project charter, the shape every root-document test reads | 07-01 |
| `.planning/ROADMAP.md` | live roadmap for v1.1 with Phase Details for phases 01, 02, 02.1 and 03 | 07-01 |
| `.planning/STATE.md` | execution-state frontmatter naming milestone v1.1 "Firing Board" | 07-01 |
| `.planning/config.json` | workflow config; no secret strings; stays in the index (D-11) | 07-01 |
| `.planning/state.json` | GSD internal state at the root: excluded as internal (D-11) | 07-01 |
| `.planning/phases/01-kiln-bookings/01-CONTEXT.md` | phase context with the six wrapper tags | 07-01 |
| `.planning/phases/01-kiln-bookings/kiln-floor.png` | a 1x1 PNG in a phase folder: class image, never read, never indexed | 07-01 |

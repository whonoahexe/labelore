// quick-261023-u13 (sketch 029 A) adds the row groups, the first-sentence split, words, the file-name title
// and line count for quick notes, and the explore lifting (lede, sections, items, flags, figures, totals);
// those pins come from running the sketch's own `quickModel` and `exploreModel` over its data.js. The `short`
// title flag of the 028 A page is gone.
// quick-261023-61l (sketch 028 A): the note body extractor - pinned against the eight sketch quick notes
// (the committed fixture project plus the two synthetic files), labelore's own sketches note, and, when
// present on this machine, the pyedge heartbeat note; plus the tolerant degrade paths and the T-61l-02
// timing bound. Pinned values come from running the sketch's own `lift`, `refsOf` and `headings` over its
// data.js, independent of the extractor's output; correction 1 (the first sentence is the title and the
// rest of a multi-sentence lead becomes a "Then" row) is marked where it applies.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extractNote } from '../src/planning-repo/handlers/note-lift.ts';
import type { NoteBody, NoteFigure, NoteRow, NoteRun, NoteSection } from '../src/planning-repo/handlers/note-lift.ts';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';
import { PY_NOTE, noteFile } from './helpers/note-corpus.ts';
import { NOTE_FILES } from './helpers/note-corpus.ts';

/** The file's line count the way the handler counts it: a final newline does not start a line. */
function lineCount(text: string): number {
  const parts = text.split('\n');
  return text.endsWith('\n') ? parts.length - 1 : parts.length;
}

function read(key: keyof typeof NOTE_FILES): NoteBody {
  const text = readFileSync(noteFile(key), 'utf8');
  const fm = tryParseFrontmatter(text);
  return extractNote(fm.body, {
    titled: typeof fm.data.title === 'string' && fm.data.title.trim() !== '',
    path: NOTE_FILES[key],
    lines: lineCount(text),
  });
}

/** A run list as text, with file and identifier runs bracketed so a test sees the marking. */
function flat(runs: NoteRun[] | undefined): string {
  return (runs ?? []).map((run) => (run.kind === 'file' ? `[F:${run.text}]` : run.kind === 'ident' ? `[I:${run.text}]` : run.text)).join('');
}
function plain(runs: NoteRun[] | undefined): string {
  return (runs ?? []).map((run) => run.text).join('');
}
const labels = (note: NoteBody): string[] => (note.rows ?? []).map((row) => row.label ?? 'Then');
const tones = (note: NoteBody): (string | null)[] => (note.rows ?? []).map((row) => row.tone);
const mentionPaths = (note: NoteBody): string[] => (note.mentions ?? []).map((m) => m.path);

describe('quick notes from the fixture project', () => {
  it('dcrop: the first sentence is the title; Today, Decided, How, Preset constraint, Estimated, Batch follow', () => {
    const note = read('dcrop');
    expect(note.shape).toBe('quick');
    expect(plain(note.title)).toBe('Crop for images before sending and for profile photos (she asked for it).');
    expect(labels(note)).toEqual(['Today', 'Decided', 'How', 'Preset constraint', 'Estimated', 'Batch']);
    expect(tones(note)).toEqual([null, 'complete', null, null, null, null]);
    expect((note.rows as NoteRow[])[1].date).toBe('2026-10-21');
    expect(mentionPaths(note)).toEqual(['server/src/media/image.ts']);
  });

  it('dcrop: an opener row keeps its whole sentence, a Label: row drops its label', () => {
    const rows = read('dcrop').rows as NoteRow[];
    expect(plain(rows[0].runs)).toMatch(/^Today profile photos are centre-cropped automatically on the server \(server\/src\/media\/image\.ts, fit cover/);
    expect(plain(rows[0].runs)).toMatch(/and images are sent uncropped\.$/);
    expect(plain(rows[1].runs)).toMatch(/^images only \(no video trimming\), no rotate\. /);
    expect(plain(rows[4].runs)).toBe('Estimated ~half a day of gesture work. Applies to camera-captured photos too (same preview flow).');
    expect(plain(rows[5].runs)).toBe('Batch with the round-profile-photos note.');
    // The file reference in the opener row is one file run.
    expect(rows[0].runs.filter((run) => run.kind === 'file').map((run) => run.text)).toEqual(['server/src/media/image.ts']);
  });

  it('dround: Today, Want, Decided (dated), Batch; two mentions', () => {
    const note = read('dround');
    expect(plain(note.title)).toBe('Round profile photos everywhere, including the notification icon.');
    expect(labels(note)).toEqual(['Today', 'Want', 'Decided', 'Batch']);
    expect(tones(note)).toEqual([null, null, 'complete', null]);
    expect(mentionPaths(note)).toEqual(['web/public/sw.js', 'server/src/media/image.ts']);
  });

  it('dsfx: two Decided rows, a Suggested row, Limits', () => {
    const note = read('dsfx');
    expect(plain(note.title)).toBe('Sound effects.');
    expect(labels(note)).toEqual(['Decided', 'Decided', 'Suggested', 'Limits']);
    expect(tones(note)).toEqual(['complete', 'complete', 'in-flight', null]);
    expect(mentionPaths(note)).toEqual(['web/lib/call/tones.ts']);
  });

  it('dcall: Observed (in-flight), Want, Off limits, Output; nothing to mention', () => {
    const note = read('dcall');
    expect(plain(note.title)).toBe('Call debug logging (WebRTC + TURN, no personal data).');
    expect(labels(note)).toEqual(['Observed', 'Want', 'Off limits', 'Output']);
    expect(tones(note)).toEqual(['in-flight', null, null, null]);
    expect(note.mentions).toEqual([]);
  });

  it('dback: the Bug lead keeps its label in the title; Cause is in-flight, then Fix', () => {
    const note = read('dback');
    expect(plain(note.title)).toBe(
      'Bug: on the Pixel, pressing Android back while a photo/video is open in the viewer closes the whole app instead of the viewer.',
    );
    expect(labels(note)).toEqual(['Cause', 'Fix']);
    expect(tones(note)).toEqual(['in-flight', null]);
    expect(note.mentions).toEqual([]);
  });

  it('pcap: Today, Wanted, Known gap; two mentions with line numbers and five identifiers outside Mentions', () => {
    const note = read('pcap');
    expect(plain(note.title)).toBe('Raise the single-file download cap to match the archive cap.');
    expect(labels(note)).toEqual(['Today', 'Wanted', 'Known gap']);
    expect(mentionPaths(note)).toEqual(['backend/src/config.rs:121', 'download/mod.rs:75']);
    const idents = (note.verbatim ?? []).filter((run) => run.kind === 'ident').map((run) => run.text);
    expect(idents).toEqual([
      'MAX_DOWNLOAD_BYTES',
      'MAX_ARCHIVE_BYTES',
      'max_download_bytes_defaults_to_500_mib',
      'max_archive_bytes_and_max_download_bytes_are_distinct_caps',
      'CLOUD_DOWNLOAD_STREAM_DEADLINE',
    ]);
    expect(mentionPaths(note).some((path) => idents.includes(path))).toBe(false);
    expect(plain((note.rows as NoteRow[])[0].runs)).toMatch(/^Today MAX_DOWNLOAD_BYTES defaults to 500 MiB \(backend\/src\/config\.rs:121\) while /);
  });

  it('pbrief is an explore note (a titled document)', () => {
    expect(read('pbrief').shape).toBe('document');
  });
});

describe('quick notes from the synthetic fixture', () => {
  it('star is one sentence: no rows, no mentions', () => {
    const note = read('star');
    expect(plain(note.title)).toBe("show the tariff schedule's own notes as tooltips on HS codes");
    expect(note.rows).toEqual([]);
    expect(note.mentions).toEqual([]);
  });

  it('sundo is one long sentence: no rows', () => {
    const note = read('sundo');
    expect(plain(note.title)).toBe(
      "brokers keep asking for an undo on submitted corrections — there isn't one at customs, so maybe a 60-second hold before we send?",
    );
    expect(note.rows).toEqual([]);
  });
});

describe('labelore sketches note (correction 1)', () => {
  const note = read('lsk');
  it('the first sentence is the title and the rest of the lead is a Then row', () => {
    expect(plain(note.title)).toBe('Show sketches inside Labelore instead of a separate file server.');
    expect(labels(note)).toEqual(['Then', 'Want', 'Open question', 'Open question', 'Today', 'Suggested interim']);
    expect(tones(note)).toEqual([null, null, 'missing', 'missing', null, null]); // 'Suggested interim' is not the whole label 'Suggested'; Open question is missing (029 A)
    const then = (note.rows as NoteRow[])[0];
    expect(then.label).toBeNull();
    expect(plain(then.runs)).toMatch(/^`\.planning\/sketches\/` is a GSD artifact folder like any other/);
  });
  it('a code span that is not a file stays whole in its text run; file references are marked', () => {
    const then = (note.rows as NoteRow[])[0];
    expect(then.runs[0]).toMatchObject({ kind: 'text' });
    expect(then.runs[0].text.startsWith('`.planning/sketches/` is a GSD')).toBe(true);
    expect(mentionPaths(note)).toEqual(['sketches/MANIFEST.md', 'README.md', 'data.js']);
  });
});

describe.runIf(existsSync(PY_NOTE))('pyedge heartbeat note', () => {
  it('lifts Constraint, Today, Open check and counts hubcli.py twice', () => {
    const fm = tryParseFrontmatter(readFileSync(PY_NOTE, 'utf8'));
    const note = extractNote(fm.body, { titled: false });
    expect(plain(note.title)).toBe(
      'EdgeCAN version in the heartbeat + on stack start (from 2026-10-14 monthly sync; Jeremiah/Raj/Rahul ask).',
    );
    expect(labels(note)).toEqual(['Constraint', 'Today', 'Open check']);
    expect(note.mentions).toEqual([
      { path: 'logs/ingress.log', count: 1 },
      { path: 'src/can/hubcli.py', count: 1 },
      { path: 'src/can/rhub_cli.py', count: 1 },
      { path: 'hubcli.py', count: 2 },
      { path: 'src/can/hub_sender.py', count: 1 },
    ]);
  });
});

describe('explore notes', () => {
  it('a frontmatter title or a heading outside a fence makes a document', () => {
    expect(extractNote('# A heading\n\ntext', { titled: false }).shape).toBe('document');
    expect(extractNote('text\n\n### Deep\n', { titled: false }).shape).toBe('document');
    expect(extractNote('just a line.', { titled: true }).shape).toBe('document');
  });
  it('a heading inside a fence and a hash without a space are not headings', () => {
    const body = 'First sentence.\n\n```\n# not a heading\n```\n\n#hashtag is not one either.';
    expect(extractNote(body, { titled: false }).shape).toBe('quick');
  });
  it('lperkind and lsurvey are documents', () => {
    expect(read('lperkind').shape).toBe('document');
    expect(read('lsurvey').shape).toBe('document');
  });
});

describe('sentence splitting and runs', () => {
  const rowsOf = (text: string): NoteRow[] => (extractNote(text, { titled: false }).rows ?? []) as NoteRow[];
  const titleOf = (text: string): string => plain(extractNote(text, { titled: false }).title);

  it('does not split after e.g. / i.e. / etc. / vs. / approx.', () => {
    expect(titleOf('Use a cache, e.g. Redis, for sessions. Want: it fast.')).toBe('Use a cache, e.g. Redis, for sessions.');
    expect(titleOf('Fix it, i.e. Do the thing, etc. And vs. That approx. Next one. Want: x.')).toBe(
      'Fix it, i.e. Do the thing, etc. And vs. That approx. Next one.',
    );
  });

  it('a period inside a code span never splits', () => {
    expect(titleOf('Call `a. B` now. Want: x.')).toBe('Call `a. B` now.');
  });

  it('a sentence may start with a backtick', () => {
    const rows = rowsOf('First sentence. `code` second sentence here. Want: more.');
    expect(rows.map((row) => row.label)).toEqual([null, 'Want']);
    expect(plain(rows[0].runs)).toBe('`code` second sentence here.');
  });

  it('a code span that is a file reference becomes one file run without backticks', () => {
    const rows = rowsOf('Title here. Want: edit `src/a/b.ts` then `plain code` too.');
    expect(rows[0].runs).toEqual([
      { kind: 'text', text: 'edit ' },
      { kind: 'file', text: 'src/a/b.ts' },
      { kind: 'text', text: ' then `plain code` too.' },
    ]);
  });

  it('a label longer than 22 characters joins the previous clause; a label with no text is plain', () => {
    const rows = rowsOf('Title here. Want: first. A Considerably Longer Label Than Allowed: joined. Note:');
    expect(rows.map((row) => row.label)).toEqual(['Want']);
    expect(plain(rows[0].runs)).toBe('first. A Considerably Longer Label Than Allowed: joined. Note:');
  });

  it('a URL token is never a file reference', () => {
    const rows = rowsOf('Title here. Want: see https://example.com/a/b.ts and src/real.ts today.');
    expect(rows[0].runs.filter((run) => run.kind === 'file').map((run) => run.text)).toEqual(['src/real.ts']);
  });

  it('a 300-character path token stays plain text', () => {
    const token = `${'a/'.repeat(150)}file.ts`;
    const rows = rowsOf(`Title here. Want: look at ${token} soon.`);
    expect(rows[0].runs.every((run) => run.kind === 'text')).toBe(true);
    expect(plain(rows[0].runs)).toContain(token);
  });

  it('tones are case-insensitive on the whole label', () => {
    const rows = rowsOf('Title here. DECIDED: yes. Bug report: y. Observed: z.');
    expect(rows.map((row) => [row.label, row.tone])).toEqual([
      ['DECIDED', 'complete'],
      ['Bug report', null],
      ['Observed', 'in-flight'],
    ]);
  });

  it('an opener sentence starts a clause only on a word boundary', () => {
    const rows = rowsOf('Title here. Todayish thing. Today it works. Batch with the other note.');
    expect(rows.map((row) => row.label)).toEqual([null, 'Today', 'Batch']);
  });
});

describe('degrade', () => {
  it("'' gives a quick note with no title runs and no rows", () => {
    expect(extractNote('', { titled: false })).toMatchObject({ shape: 'quick', title: [], rows: [], mentions: [], capped: false });
  });
  it('a frontmatter-only string is the same', () => {
    expect(extractNote('---\ndate: "2026-10-21"\npromoted: true\n---\n', { titled: false })).toMatchObject({
      shape: 'quick',
      title: [],
      rows: [],
    });
  });
  it('never throws on odd strings', () => {
    const odd = [
      '```unclosed fence\nstill text. Want: x.',
      '# only a heading',
      'Label: ',
      'Want:',
      '`',
      '``` ` `` ```',
      '\u0000  weird. Want: x',
      'a'.repeat(30000),
      'x.y.z. A. B. C. D.',
      `${'`'.repeat(50)} open`,
    ];
    for (const text of odd) expect(() => extractNote(text, { titled: false })).not.toThrow();
    expect(() => extractNote(undefined as unknown as string, { titled: false })).not.toThrow();
    expect(() => extractNote('x', undefined as unknown as { titled: boolean })).not.toThrow();
  });
  it('caps the text, the rows and the mentions', () => {
    const many = Array.from({ length: 400 }, (_, i) => `Label${'x'.repeat(i % 3)}: ${'word '.repeat(10)}end${i}.`).join(' ');
    const note = extractNote(`Lead sentence. ${many}`, { titled: false });
    expect(note.rows!.length).toBeLessThanOrEqual(80);
    const files = Array.from({ length: 300 }, (_, i) => `src/f${i}.ts`).join(' ');
    expect(extractNote(`Lead. Want: ${files}`, { titled: false }).mentions!.length).toBeLessThanOrEqual(100);
    const long = extractNote(`Lead. ${'long sentence here. \n'.repeat(3000)}`, { titled: false });
    expect(long.capped).toBe(true);
    expect(plain(long.verbatim).length).toBeLessThanOrEqual(32000);
  });
  it('lifts a 1 MB body with a 200k-character line in under 250 ms', () => {
    const line = 'x'.repeat(200000);
    const filler = `${'Want: a sentence with src/a/b.ts and some_ident_name in it. '.repeat(20)}\n`;
    const body = `Lead sentence.\n${line}\n${filler.repeat(Math.ceil(800000 / filler.length))}`;
    expect(body.length).toBeGreaterThan(1_000_000);
    const started = performance.now();
    extractNote(body, { titled: false });
    expect(performance.now() - started).toBeLessThan(250);
  });
  it('a hostile run of backticks and slashes stays fast', () => {
    const body = `Lead. Want: ${'`a'.repeat(8000)} ${'a/'.repeat(3000)} ${'`` `'.repeat(2000)}`;
    const started = performance.now();
    extractNote(body, { titled: false });
    expect(performance.now() - started).toBeLessThan(250);
  });
});

describe('flat helper sanity', () => {
  it('marks runs', () => {
    expect(flat([{ kind: 'text', text: 'a ' }, { kind: 'file', text: 'b.ts' }, { kind: 'ident', text: 'X_Y' }])).toBe('a [F:b.ts][I:X_Y]');
  });
});

describe('quick notes: groups, first sentences, words, the file-name title (sketch 029 A)', () => {
  const groups = (key: keyof typeof NOTE_FILES): string[] => (read(key).rows ?? []).map((row) => row.group);

  it('dcrop: Today problem, Decided decided, How ask, three limits', () => {
    expect(groups('dcrop')).toEqual(['problem', 'decided', 'ask', 'limit', 'limit', 'limit']);
  });
  it('lsketch: Then other, Want ask, Open question open twice, Today problem, Suggested interim other', () => {
    expect(groups('lsk')).toEqual(['other', 'ask', 'open', 'open', 'problem', 'other']);
  });
  it('the other sketch notes keep the sketch groups', () => {
    expect(groups('dround')).toEqual(['problem', 'ask', 'decided', 'limit']);
    expect(groups('dsfx')).toEqual(['decided', 'decided', 'ask', 'limit']);
    expect(groups('dcall')).toEqual(['problem', 'ask', 'limit', 'ask']);
    expect(groups('dback')).toEqual(['problem', 'ask']);
    expect(groups('pcap')).toEqual(['problem', 'ask', 'limit']);
  });
  it('an Open question label takes the missing tone; the other tones are unchanged', () => {
    expect(tones(read('lsk'))).toEqual([null, null, 'missing', 'missing', null, null]);
    expect(tones(read('dsfx'))).toEqual(['complete', 'complete', 'in-flight', null]);
  });
  it('words are counted across the body', () => {
    const words = (key: keyof typeof NOTE_FILES): number | undefined => read(key).words;
    expect([words('dcrop'), words('dround'), words('dsfx'), words('dcall'), words('dback'), words('pcap')]).toEqual([228, 174, 131, 161, 109, 108]);
    expect([words('star'), words('sundo'), words('lsk')]).toEqual([11, 23, 240]);
  });
  it('the file-name title drops the date and .md, with spaces and a capital', () => {
    expect(read('dcrop').fileTitle).toBe('Crop images and profile photos');
    expect(read('dcall').fileTitle).toBe('Call debug logging webrtc turn');
    expect(read('star').fileTitle).toBe('Tariff note tooltips');
    expect(read('lperkind').fileTitle).toBe('Per kind artifact rendering');
    expect(extractNote('One.', { titled: false })).not.toHaveProperty('fileTitle');
    expect(extractNote('One.', { titled: false, path: '.planning/notes/2026-10-21-.md' })).not.toHaveProperty('fileTitle');
  });
  it('the line count echoes the option and is absent without one', () => {
    expect(extractNote('One.', { titled: false, lines: 7 }).lines).toBe(7);
    expect(extractNote('One.', { titled: false })).not.toHaveProperty('lines');
    expect(extractNote('One.', { titled: false, lines: -1 })).not.toHaveProperty('lines');
    expect(extractNote('One.', { titled: false, lines: 2.5 })).not.toHaveProperty('lines');
  });
  it('each row carries its first sentence and the rest, which together equal the clause', () => {
    for (const key of ['dcrop', 'dround', 'dsfx', 'dcall', 'dback', 'pcap', 'lsk'] as const) {
      for (const row of read(key).rows as NoteRow[]) {
        const joined = row.rest.length > 0 ? `${plain(row.first)} ${plain(row.rest)}` : plain(row.first);
        expect(joined).toBe(plain(row.runs));
      }
    }
    const rows = read('dcrop').rows as NoteRow[];
    expect(plain(rows[1].first)).toBe('images only (no video trimming), no rotate.');
    expect(plain(rows[2].first)).toMatch(/^the phone only picks the rectangle; it uploads the full-quality original plus the crop rect/);
    const then = (read('lsk').rows as NoteRow[])[0];
    expect(plain(then.first)).toMatch(/^`\.planning\/sketches\/` is a GSD artifact folder like any other/);
  });
  it('a one-sentence clause has an empty rest', () => {
    const rows = extractNote('Lead. Want: one thing only.', { titled: false }).rows as NoteRow[];
    expect(rows[0].first).toEqual([{ kind: 'text', text: 'one thing only.' }]);
    expect(rows[0].rest).toEqual([]);
  });
});

describe('explore notes: lede, sections, items, flags, figures and totals (sketch 029 A)', () => {
  const pbrief = read('pbrief');
  const lperkind = read('lperkind');
  const lsurvey = read('lsurvey');
  const sec = (note: NoteBody, index: number): NoteSection => (note.sections as NoteSection[])[index];
  const flagsOf = (section: NoteSection): string[] => section.flags.map((flag) => `${flag.label}:${flag.tone}`);
  const figuresOf = (note: { figures?: NoteFigure[] }): string[] => (note.figures ?? []).map((figure) => `${figure.value} ${figure.unit}`);

  it('pbrief: the boiler line, the summary, the totals and the figures in order', () => {
    expect(pbrief.lede).toBeUndefined();
    expect(pbrief.boiler).toBe('Captured from an exploration session on 2026-10-23. Inputs from the studio team are included.');
    expect(pbrief.summary).toBe('Three sections: 7 features, footage facts and 3 network facts.');
    expect(pbrief.flagTotals).toEqual({ all: 5, decided: 1, openOrBlocked: 2 });
    expect([pbrief.points, pbrief.tables, pbrief.lines]).toEqual([15, 1, 42]);
    expect(figuresOf(pbrief)).toEqual(['370 GB', '10 GbE', '~180 MB/s', '~232 MB/s', 'around 110 MB/s', '67 times', '2.5 GbE']);
  });
  it('pbrief: Features has seven items, the first four kept, and four flags', () => {
    const features = sec(pbrief, 0);
    expect(features.heading).toBe('Features');
    expect(features.keyFrom).toBe('item');
    expect(features.key).toBe('Projects: Created in the portal from a single template with optional folders (exact layout left to research/planning).');
    expect(features.items.map((item) => item.term)).toEqual(['Projects', 'Ingest', 'Lifecycle', 'Grading locally, by vault check-out']);
    expect(features.itemCount).toBe(7);
    expect(features.tableRows).toBeNull();
    expect(flagsOf(features)).toEqual(['Decided:complete', 'Open question:missing', 'Rejected:quiet', 'Blocked:missing']);
    expect(features.figures.map((figure) => `${figure.value} ${figure.unit}`)).toEqual(['370 GB', '10 GbE']);
    expect(features.side).toEqual(['7 items']);
  });
  it('pbrief: the measured sections keep their heading note out of the short heading', () => {
    const footage = sec(pbrief, 1);
    expect(footage.heading).toBe('Footage facts (measured 2026-10-23)');
    expect(footage.short).toBe('Footage facts');
    expect(footage.keyFrom).toBe('para');
    expect(footage.key).toBe('Camera: **Canon EOS C50**, Cinema RAW Light (`CRAW` codec in `.CRM`, firmware 02.10.00).');
    expect(footage.itemCount).toBe(2);
    expect(footage.tableRows).toBe(2);
    expect(footage.figures.map((figure) => `${figure.value} ${figure.unit}`)).toEqual(['~180 MB/s', '~232 MB/s']);
    expect(footage.side).toEqual(['2 items', 'table · 2 rows']);
    const network = sec(pbrief, 2);
    expect(network.itemCount).toBe(3);
    expect(flagsOf(network)).toEqual(['Rejected:quiet']);
    expect(network.figures.map((figure) => `${figure.value} ${figure.unit}`)).toEqual(['around 110 MB/s', '67 times', '10 GbE', '2.5 GbE']);
  });
  it('lperkind: the lede is kept whole when long and the summary is the shape', () => {
    expect(lperkind.boiler).toBeUndefined();
    expect(lperkind.lede?.startsWith('Dashboard, Roadmap and Traceability are considered visually correct and internally consistent.')).toBe(true);
    expect((lperkind.lede ?? '').length).toBeGreaterThan(200);
    expect(lperkind.summary).toBe('Five sections: parsing, design language, categorization, delivery shape and related.');
    expect(lperkind.flagTotals).toEqual({ all: 2, decided: 1, openOrBlocked: 0 });
    expect([lperkind.points, lperkind.tables, lperkind.lines]).toEqual([27, 1, 112]);
    expect(figuresOf(lperkind)).toEqual(['163 markdown files', '425 planning files', '11 of 16 real types']);
  });
  it('lperkind: sections, asides, subsections, tables and the resolved flag', () => {
    const axis1 = sec(lperkind, 0);
    expect(axis1.short).toBe('Axis 1 — Parsing: 11 of 16 types have no structured representation');
    expect(axis1.side).toEqual(['2 items', 'table · 4 rows', '1 aside', '1 sub']);
    expect(flagsOf(axis1)).toEqual(['Corrected:in-flight']);
    expect(axis1.figures.map((figure) => `${figure.value} ${figure.unit}`)).toEqual(['163 markdown files']);
    const axis3 = sec(lperkind, 2);
    expect(axis3.heading).toBe('Axis 3 — Categorization: RESOLVED 2026-09-20');
    expect(axis3.short).toBe('Axis 3 — Categorization');
    expect(flagsOf(axis3)).toEqual(['Resolved:complete']);
    expect(axis3.figures.map((figure) => `${figure.value} ${figure.unit}`)).toEqual(['425 planning files', '11 of 16 real types']);
    expect(sec(lperkind, 3).key).toBe('One phase to build the ground, then a long list of quick tasks — not one or the other.');
    expect(sec(lperkind, 3).side).toEqual([]);
    expect(sec(lperkind, 4).itemCount).toBe(1);
    expect(sec(lperkind, 4).key).toBe('[[artifact-chrome-drift]] — the container/reflow defect, independently shippable');
  });
  it('lsurvey: a long lede is cut to two sentences, the summary and totals', () => {
    expect(lsurvey.lede?.startsWith("Measured across **425 markdown files** — 163 in this project's")).toBe(true);
    expect(lsurvey.summary).toBe(
      'Six sections: the partition, the primitives already exist, DISCUSSION-LOG, VERIFICATION, scope consequence and related.',
    );
    expect(lsurvey.flagTotals).toEqual({ all: 0, decided: 0, openOrBlocked: 0 });
    expect([lsurvey.points, lsurvey.tables, lsurvey.lines]).toEqual([24, 2, 89]);
    expect(figuresOf(lsurvey)).toEqual([
      '425 markdown files',
      '138/139 instances',
      '39 keys',
      '18 keys',
      '149 frontmatter lines',
      '60 %',
      '11 lines',
      '100 %',
    ]);
    expect(sec(lsurvey, 0).side).toEqual(['table · 4 rows']);
    expect(sec(lsurvey, 0).figures).toHaveLength(6);
    expect(sec(lsurvey, 4).items.map((item) => item.term)).toEqual(['1 new extractor', '2 existing extractors', '16 small manifests']);
  });
  it('a ## inside a fence is not a section; ### lines are subsections; a leading # line is dropped', () => {
    const body = '# Title\n\nThe lede sentence here.\n\n## One\n\n```\n## not a section\n```\n\n### Sub\n\n- **A.** First. More.\n## Two\n';
    const note = extractNote(body, { titled: true });
    expect(note.lede).toBe('The lede sentence here.');
    expect((note.sections ?? []).map((section) => section.heading)).toEqual(['One', 'Two']);
    expect(note.sections?.[0].subs).toBe(1);
    expect(note.sections?.[0].items).toEqual([{ term: 'A', text: 'First.' }]);
  });
  it('a boiler line is one of Captured from, Notes from, Note from, Written during', () => {
    for (const lead of ['Captured from a call.', 'Notes from the meeting.', 'Note from Sam.', 'Written during the flight.']) {
      const note = extractNote(`${lead}\n\n## One\n- a\n`, { titled: true });
      expect(note.boiler).toBe(lead);
      expect(note.lede).toBeUndefined();
    }
  });
  it('a lede over 340 characters is cut to two sentences', () => {
    const sentence = 'This sentence is a fairly long one that goes on for a while to take up room.';
    const lede = Array.from({ length: 8 }, () => sentence).join(' ');
    expect(lede.length).toBeGreaterThan(340);
    expect(extractNote(`${lede}\n\n## One\n`, { titled: true }).lede).toBe(`${sentence} ${sentence}`);
  });
});

describe('explore notes degrade', () => {
  const explore = (body: string): NoteBody => extractNote(body, { titled: true });

  it('survives a body of only headings, an unclosed fence and junk headings', () => {
    expect(explore('## A\n## B\n## C\n').sections?.map((section) => section.heading)).toEqual(['A', 'B', 'C']);
    expect(() => explore('## A\n```\n- never closed\n## B\n')).not.toThrow();
    expect(explore('## A\n```\n- never closed\n## B\n').sections).toHaveLength(1);
    for (const text of ['##', '## ', '##\u0000', '#### deep\n## x', '##\t\ttabbed', '## ' + 'h'.repeat(5000)]) {
      expect(() => explore(text)).not.toThrow();
    }
    expect(explore('## ' + 'h'.repeat(5000)).sections?.[0].heading.length).toBeLessThanOrEqual(301);
  });
  it('a table with only a header has no rows; a bold item with no text has an empty text', () => {
    const table = explore('## T\n| a | b |\n');
    expect(table.sections?.[0].tableRows).toBe(0);
    expect(table.sections?.[0].key).toBe('A table of 0 rows: a · b.');
    const bold = explore('## T\n- **Term.**\n');
    expect(bold.sections?.[0].items).toEqual([{ term: 'Term', text: '' }]);
  });
  it('an indented continuation joins its list item and a nested bullet does not', () => {
    const note = explore('## T\n- **Term.** starts here\n  and continues. Then ends.\n  - nested one\n');
    expect(note.sections?.[0].items).toEqual([{ term: 'Term', text: 'starts here and continues.' }]);
    expect(note.sections?.[0].itemCount).toBe(1);
  });
  it('a flag word or a figure inside a code fence is not counted', () => {
    const note = explore('## T\n```\nDecided: 5 GB here\n```\nPlain text.\n');
    expect(note.sections?.[0].flags).toEqual([]);
    expect(note.sections?.[0].figures).toEqual([]);
    expect(note.flagTotals).toEqual({ all: 0, decided: 0, openOrBlocked: 0 });
  });
  it('a number with no unit is no figure; a number and unit alone in a code span is one; other code spans are ignored', () => {
    expect(explore('## T\nThere are 12 widgets.\n').figures).toEqual([]);
    expect(explore('## T\nIt took `12 ms` once.\n').figures?.map((figure) => `${figure.value} ${figure.unit}`)).toEqual(['12 ms']);
    expect(explore('## T\nSee `code 5 GB` here.\n').figures).toEqual([]);
  });
  it('the flag rules match the sketch: Decided complete, Blocked, open question, rejected, resolved, corrected', () => {
    const note = explore(
      '## T\n- Decided: use it.\n- Blocked on a decision.\n- An open question remains.\n- It was rejected.\n- It was resolved 2026 by hand.\n- Corrected by hand.\n',
    );
    expect(note.sections?.[0].flags.map((flag) => [flag.kind, flag.tone, flag.text])).toEqual([
      ['decided', 'complete', 'use it.'],
      ['blocked', 'missing', 'Blocked on a decision.'],
      ['open', 'missing', 'An open question remains.'],
      ['rejected', 'quiet', 'It was rejected.'],
      ['resolved', 'complete', 'It was resolved 2026 by hand.'],
      ['corrected', 'in-flight', 'Corrected by hand.'],
    ]);
    expect(note.flagTotals).toEqual({ all: 6, decided: 2, openOrBlocked: 2 });
  });
  it('never throws on odd strings', () => {
    const odd = ['', '---\n---\n', '\u0000\u0000 ## x', '`'.repeat(100), '## a\n' + '|'.repeat(5000), '## a\n' + '- '.repeat(5000), '## a\n> ' + 'q'.repeat(9000)];
    for (const text of odd) expect(() => extractNote(text, { titled: true })).not.toThrow();
  });
  it('caps the sections, the items, the flags and the figures', () => {
    const sections = Array.from({ length: 60 }, (_, i) => `## Section ${i}\n- one\n`).join('');
    expect(explore(sections).sections).toHaveLength(40);
    const items = explore(`## T\n${'- **t.** item text.\n'.repeat(30)}`).sections?.[0];
    expect(items?.items).toHaveLength(4);
    expect(items?.itemCount).toBe(30);
    const flags = explore(`## T\n${'- Decided: again.\n'.repeat(30)}`);
    expect(flags.sections?.[0].flags).toHaveLength(8);
    expect(flags.flagTotals?.all).toBe(30);
    const figs = explore(`## T\n${Array.from({ length: 40 }, (_, i) => `- Item ${i + 100} GB here.`).join('\n')}\n`);
    expect(figs.sections?.[0].figures).toHaveLength(12);
    const many = explore(Array.from({ length: 8 }, (_, s) => `## S${s}\n${Array.from({ length: 12 }, (_, i) => `- Item ${s * 100 + i + 100} GB.`).join('\n')}\n`).join(''));
    expect(many.figures).toHaveLength(60);
  });
  it('a key sentence is cut at 600 characters and a figure phrase at 140', () => {
    const note = explore(`## T\n${'word '.repeat(300)}.\n\n- A 5 GB figure ${'filler '.repeat(60)}.\n`);
    expect((note.sections?.[0].key ?? '').length).toBeLessThanOrEqual(601);
    expect((note.sections?.[0].figures[0]?.phrase ?? '').length).toBeLessThanOrEqual(140);
  });
  it('lifts a titled 1 MB body with a 200k-character line in under 250 ms, as an explore and as a quick note', () => {
    const line = 'x'.repeat(200000);
    const filler = `${'Want: a sentence with src/a/b.ts, 5 GB and some_ident_name in it. Decided: yes. '.repeat(10)}\n`;
    const body = `Lead sentence.\n${line}\n${filler.repeat(Math.ceil(800000 / filler.length))}`;
    expect(body.length).toBeGreaterThan(1_000_000);
    for (const text of [body, `## One\n${line}\n- **t.** ${filler.repeat(Math.ceil(800000 / filler.length))}`]) {
      const started = performance.now();
      extractNote(text, { titled: true, path: '.planning/notes/a.md', lines: 100 });
      expect(performance.now() - started).toBeLessThan(250);
    }
    const started = performance.now();
    extractNote(body, { titled: false, path: '.planning/notes/a.md', lines: 100 });
    expect(performance.now() - started).toBeLessThan(250);
  });
});

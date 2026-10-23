// quick-261023-61l (sketch 028 A): the note body extractor - pinned against the eight sketch quick notes
// (the committed fixture project plus the two synthetic files), labelore's own sketches note, and, when
// present on this machine, the pyedge heartbeat note; plus the tolerant degrade paths and the T-61l-02
// timing bound. Pinned values come from running the sketch's own `lift`, `refsOf` and `headings` over its
// data.js, independent of the extractor's output; correction 1 (the first sentence is the title and the
// rest of a multi-sentence lead becomes a "Then" row) is marked where it applies.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extractNote } from '../src/planning-repo/handlers/note-lift.ts';
import type { NoteBody, NoteRow, NoteRun } from '../src/planning-repo/handlers/note-lift.ts';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';
import { PY_NOTE, noteFile } from './helpers/note-corpus.ts';
import type { NOTE_FILES } from './helpers/note-corpus.ts';

function read(key: keyof typeof NOTE_FILES): NoteBody {
  const fm = tryParseFrontmatter(readFileSync(noteFile(key), 'utf8'));
  return extractNote(fm.body, { titled: typeof fm.data.title === 'string' && fm.data.title.trim() !== '' });
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
    expect(note.short).toBe(false);
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
    expect(note.short).toBe(true);
    expect(labels(note)).toEqual(['Today', 'Want', 'Decided', 'Batch']);
    expect(tones(note)).toEqual([null, null, 'complete', null]);
    expect(mentionPaths(note)).toEqual(['web/public/sw.js', 'server/src/media/image.ts']);
  });

  it('dsfx: two Decided rows, a Suggested row, Limits', () => {
    const note = read('dsfx');
    expect(plain(note.title)).toBe('Sound effects.');
    expect(note.short).toBe(true);
    expect(labels(note)).toEqual(['Decided', 'Decided', 'Suggested', 'Limits']);
    expect(tones(note)).toEqual(['complete', 'complete', 'in-flight', null]);
    expect(mentionPaths(note)).toEqual(['web/lib/call/tones.ts']);
  });

  it('dcall: Observed (in-flight), Want, Off limits, Output; nothing to mention', () => {
    const note = read('dcall');
    expect(plain(note.title)).toBe('Call debug logging (WebRTC + TURN, no personal data).');
    expect(note.short).toBe(true);
    expect(labels(note)).toEqual(['Observed', 'Want', 'Off limits', 'Output']);
    expect(tones(note)).toEqual(['in-flight', null, null, null]);
    expect(note.mentions).toEqual([]);
  });

  it('dback: the Bug lead keeps its label in the title; Cause is in-flight, then Fix', () => {
    const note = read('dback');
    expect(plain(note.title)).toBe(
      'Bug: on the Pixel, pressing Android back while a photo/video is open in the viewer closes the whole app instead of the viewer.',
    );
    expect(note.short).toBe(false);
    expect(labels(note)).toEqual(['Cause', 'Fix']);
    expect(tones(note)).toEqual(['in-flight', null]);
    expect(note.mentions).toEqual([]);
  });

  it('pcap: Today, Wanted, Known gap; two mentions with line numbers and five identifiers outside Mentions', () => {
    const note = read('pcap');
    expect(plain(note.title)).toBe('Raise the single-file download cap to match the archive cap.');
    expect(note.short).toBe(true);
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
    expect(read('pbrief')).toEqual({ shape: 'document' });
  });
});

describe('quick notes from the synthetic fixture', () => {
  it('star is one sentence: no rows, no mentions', () => {
    const note = read('star');
    expect(plain(note.title)).toBe("show the tariff schedule's own notes as tooltips on HS codes");
    expect(note.short).toBe(true);
    expect(note.rows).toEqual([]);
    expect(note.mentions).toEqual([]);
  });

  it('sundo is one long sentence: no rows', () => {
    const note = read('sundo');
    expect(plain(note.title)).toBe(
      "brokers keep asking for an undo on submitted corrections — there isn't one at customs, so maybe a 60-second hold before we send?",
    );
    expect(note.short).toBe(false);
    expect(note.rows).toEqual([]);
  });
});

describe('labelore sketches note (correction 1)', () => {
  const note = read('lsk');
  it('the first sentence is the title and the rest of the lead is a Then row', () => {
    expect(plain(note.title)).toBe('Show sketches inside Labelore instead of a separate file server.');
    expect(note.short).toBe(true);
    expect(labels(note)).toEqual(['Then', 'Want', 'Open question', 'Open question', 'Today', 'Suggested interim']);
    expect(tones(note)).toEqual([null, null, null, null, null, null]); // 'Suggested interim' is not the whole label 'Suggested'
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
    expect(note.short).toBe(false);
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
    expect(extractNote('# A heading\n\ntext', { titled: false })).toEqual({ shape: 'document' });
    expect(extractNote('text\n\n### Deep\n', { titled: false })).toEqual({ shape: 'document' });
    expect(extractNote('just a line.', { titled: true })).toEqual({ shape: 'document' });
  });
  it('a heading inside a fence and a hash without a space are not headings', () => {
    const body = 'First sentence.\n\n```\n# not a heading\n```\n\n#hashtag is not one either.';
    expect(extractNote(body, { titled: false }).shape).toBe('quick');
  });
  it('lperkind and lsurvey are documents', () => {
    expect(read('lperkind')).toEqual({ shape: 'document' });
    expect(read('lsurvey')).toEqual({ shape: 'document' });
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

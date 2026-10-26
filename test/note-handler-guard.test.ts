// quick-261023-61l (T-61l-04): when the note extractor throws, NoteHandler.parse keeps the title, body and
// frontmatter and simply omits `note`; the page then falls back to the promoted-section view. With the
// real extractor it carries the note projection, and its title, frontmatter and body equal what the
// generic handler produced for the same file before notes had their own kind.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { noteFile } from './helpers/note-corpus.ts';

const content = '---\ndate: "2026-10-21 15:58"\npromoted: true\n---\n\nShow it. Want: that.\n';

function refOf(path: string, extra: Partial<ArtifactRef> = {}): ArtifactRef {
  return { path, kind: 'note', location: 'other', phaseIdentity: null, milestoneVersion: null, quickTaskId: null, fileClass: 'text', sizeBytes: 0, ...extra };
}

function rawOf(path: string, text: string = content): RawArtifact {
  return { path, content: text, mtimeMs: 0, size: text.length };
}

type Parsed = { note: { shape: string; rows: { label: string }[] } };

describe('NoteHandler', () => {
  it('claims refs of kind note and nothing else', async () => {
    const { NoteHandler } = await import('../src/planning-repo/handlers/note.ts');
    expect(NoteHandler.match(refOf('.planning/notes/a.md'))).toBe(true);
    expect(NoteHandler.match(refOf('.planning/phases/01-x/notes.md', { kind: 'unknown', location: 'phase' }))).toBe(false);
    expect(NoteHandler.match(refOf('.planning/todos/pending/a.md', { kind: 'todo' }))).toBe(false);
  });

  it('carries structured.note for a quick note', async () => {
    const { NoteHandler } = await import('../src/planning-repo/handlers/note.ts');
    const path = '.planning/notes/a.md';
    const result = NoteHandler.parse(rawOf(path), refOf(path));
    expect((result.structured as Parsed).note.shape).toBe('quick');
    expect((result.structured as Parsed).note.rows.map((row) => row.label)).toEqual(['Want']);
    expect(result.frontmatter.promoted).toBe(true);
  });

  it('hands the extractor the path and the raw file\'s line count (quick-261023-u13)', async () => {
    const { NoteHandler } = await import('../src/planning-repo/handlers/note.ts');
    const path = '.planning/notes/2026-10-21-crop-images.md';
    const result = NoteHandler.parse(rawOf(path), refOf(path));
    const note = (result.structured as { note: { fileTitle?: string; lines?: number } }).note;
    expect(note.fileTitle).toBe('Crop images');
    // Six lines in the raw file: the front matter's four, a blank line and the note's text (its final newline starts no line).
    expect(note.lines).toBe(6);
    const noFinalNewline = NoteHandler.parse(rawOf(path, 'one\ntwo'), refOf(path));
    expect((noFinalNewline.structured as { note: { lines?: number } }).note.lines).toBe(2);
    const empty = NoteHandler.parse(rawOf(path, ''), refOf(path));
    expect((empty.structured as { note: { lines?: number } }).note.lines).toBe(0);
  });

  it('a titled note is a document', async () => {
    const { NoteHandler } = await import('../src/planning-repo/handlers/note.ts');
    const path = '.planning/notes/b.md';
    const result = NoteHandler.parse(rawOf(path, '---\ntitle: Explore\n---\n\nbody\n'), refOf(path));
    expect((result.structured as Parsed).note.shape).toBe('document');
  });

  it('gives the same title, frontmatter and body as the generic handler for the same file', async () => {
    const { NoteHandler } = await import('../src/planning-repo/handlers/note.ts');
    const { GenericMarkdownHandler } = await import('../src/planning-repo/handlers/generic.ts');
    const path = '.planning/notes/2026-10-21-crop-images-and-profile-photos.md';
    const text = readFileSync(noteFile('dcrop'), 'utf8');
    const note = NoteHandler.parse(rawOf(path, text), refOf(path));
    const generic = GenericMarkdownHandler.parse(rawOf(path, text), refOf(path, { kind: 'unknown' }));
    expect(note.title).toBe(generic.title);
    expect(note.frontmatter).toEqual(generic.frontmatter);
    expect(note.body).toBe(generic.body);
    expect(note.warning).toEqual(generic.warning);
  });

  it('omits note when the extractor throws and keeps the rest', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/note-lift.ts', () => ({
      extractNote: () => {
        throw new Error('boom');
      },
    }));
    const { NoteHandler } = await import('../src/planning-repo/handlers/note.ts');
    const path = '.planning/notes/a.md';
    const result = NoteHandler.parse(rawOf(path), refOf(path));
    expect(result.title).toBe(path);
    expect(result.body).toContain('Want: that.');
    expect(result.frontmatter.promoted).toBe(true);
    expect(result.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/note-lift.ts');
  });
});

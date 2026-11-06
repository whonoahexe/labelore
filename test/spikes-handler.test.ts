// Phase 11 (11-12, VIEW-14, D-01): the spike handlers. The manifest lifts to ideas and rows with the verdict
// keyword split from its free text; a lift that throws omits only structured.spikes; ids stay text whatever YAML
// does to `spike:` frontmatter.
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { GenericMarkdownHandler } from '../src/planning-repo/handlers/generic.ts';
import {
  SpikesManifestHandler,
} from '../src/planning-repo/handlers/spikes.ts';
import {
  extractManifest,
  spikeFolderIdentity,
  spikeIdInText,
  spikeIdKey,
  splitVerdict,
} from '../src/planning-repo/handlers/spikes-lift.ts';
import type { SpikesManifestBody } from '../src/planning-repo/handlers/spikes-lift.ts';
import { loadFixtureProject } from './helpers/fixture-project.ts';
import { loadShapesProject } from './helpers/shapes-project.ts';

const SPIKES = '.planning/spikes/';
const MANIFEST = `${SPIKES}MANIFEST.md`;

function refOf(path: string, kind: string): ArtifactRef {
  return { path, kind, location: 'other', phaseIdentity: null, milestoneVersion: null, quickTaskId: null, fileClass: 'text', sizeBytes: 0 } as ArtifactRef;
}

function rawOf(path: string, text: string): RawArtifact {
  return { path, content: text, mtimeMs: 0, size: text.length };
}

describe('splitVerdict', () => {
  it('takes the first word as the keyword and the parenthesised words as the free text', () => {
    expect(splitVerdict('INVALIDATED (no spare test kiosk)')).toEqual({ keyword: 'INVALIDATED', text: 'no spare test kiosk' });
    expect(splitVerdict('PARTIAL (resume untested)')).toEqual({ keyword: 'PARTIAL', text: 'resume untested' });
  });

  it('reads a bare keyword, a colon form and a nested parenthesis', () => {
    expect(splitVerdict('VALIDATED')).toEqual({ keyword: 'VALIDATED', text: '' });
    expect(splitVerdict('PARTIAL: resume untested')).toEqual({ keyword: 'PARTIAL', text: 'resume untested' });
    expect(splitVerdict('PARTIAL (resume (cold) untested)')).toEqual({ keyword: 'PARTIAL', text: 'resume (cold) untested' });
  });

  it('keeps the rest of the cell when words sit between the keyword and a parenthesis', () => {
    expect(splitVerdict('PARTIAL works, but (see notes)')).toEqual({ keyword: 'PARTIAL', text: 'works, but (see notes)' });
  });

  it('gives an empty cell an empty keyword and an unclosed parenthesis the rest of the text', () => {
    expect(splitVerdict('')).toEqual({ keyword: '', text: '' });
    expect(splitVerdict('   ')).toEqual({ keyword: '', text: '' });
    expect(splitVerdict('PARTIAL (resume untested')).toEqual({ keyword: 'PARTIAL', text: 'resume untested' });
  });

  it('keeps a lower-case word as written and never throws on odd text', () => {
    expect(splitVerdict('yes')).toEqual({ keyword: 'yes', text: '' });
    expect(() => splitVerdict('(((((')).not.toThrow();
  });
});

describe('spike ids', () => {
  it('reads the id and name from a folder name as text', () => {
    expect(spikeFolderIdentity('003b-local-disk-staging')).toEqual({ id: '003b', name: 'local-disk-staging' });
    expect(spikeFolderIdentity('001-kiln-sensor')).toEqual({ id: '001', name: 'kiln-sensor' });
    expect(spikeFolderIdentity('010-x')).toEqual({ id: '010', name: 'x' });
    expect(spikeFolderIdentity('003b')).toEqual({ id: '003b', name: '' });
    expect(spikeFolderIdentity('SPIKE-006')).toEqual({ id: 'SPIKE-006', name: '' });
  });

  it('compares ids without leading zeros and finds the id a pause names', () => {
    expect(spikeIdKey('001')).toBe(spikeIdKey('1'));
    expect(spikeIdKey('003B')).toBe(spikeIdKey('003b'));
    expect(spikeIdInText('SPIKE-006')).toBe('006');
    expect(spikeIdInText('003b-local-disk-staging')).toBe('003b');
    expect(spikeIdInText('no digits')).toBeNull();
  });
});

describe('SpikesManifestHandler', () => {
  it('claims only spikes-manifest refs, is registered, and keeps the generic handler last', () => {
    expect(SpikesManifestHandler.match(refOf(MANIFEST, 'spikes-manifest'))).toBe(true);
    expect(SpikesManifestHandler.match(refOf(`${SPIKES}CONVENTIONS.md`, 'spikes-conventions'))).toBe(false);
    expect(HANDLERS.find((h) => h.match(refOf(MANIFEST, 'spikes-manifest')))).toBe(SpikesManifestHandler);
    expect(HANDLERS.indexOf(SpikesManifestHandler)).toBeLessThan(HANDLERS.indexOf(GenericMarkdownHandler));
    expect(HANDLERS[HANDLERS.length - 1]).toBe(GenericMarkdownHandler);
  });

  it("lifts Lendshed's manifest into two ideas and four rows through the real repository", async () => {
    const { presentation } = await loadFixtureProject();
    const artifact = presentation.artifacts.find((a) => a.path === MANIFEST)!;
    const manifest = (artifact.structured.spikes as { manifest: SpikesManifestBody }).manifest;
    expect(manifest.ideas.map((idea) => idea.key)).toEqual(['kiosk-handover', 'export-staging']);
    expect(manifest.ideas[0].paragraph).toContain('how fast the badge');
    expect(manifest.ideas[0].requirements).toHaveLength(2);
    expect(manifest.ideas[1].requirements[0]).toBe('Must keep a staged bundle for at most one day');
    // Rows stay in table order and the ids stay text.
    expect(manifest.rows.map((row) => row.id)).toEqual(['003b', '001', '004', '002']);
    expect(manifest.rows.every((row) => typeof row.id === 'string')).toBe(true);
  });

  it('splits each verdict cell: 002 is INVALIDATED with its reason, 004 is PARTIAL with its caveat', async () => {
    const { presentation } = await loadFixtureProject();
    const manifest = (presentation.artifacts.find((a) => a.path === MANIFEST)!.structured.spikes as { manifest: SpikesManifestBody }).manifest;
    const row = (id: string) => manifest.rows.find((r) => r.id === id)!;
    expect(row('002')).toMatchObject({
      idea: 'kiosk-handover',
      name: 'offline-ledger-queue',
      type: 'standard',
      verdictKeyword: 'INVALIDATED',
      verdictText: 'no spare test kiosk',
      tags: ['kiosk', 'offline'],
    });
    expect(row('004')).toMatchObject({ verdictKeyword: 'PARTIAL', verdictText: 'resume untested' });
    expect(row('003b')).toMatchObject({ type: 'comparison', verdictKeyword: 'VALIDATED', verdictText: '' });
    expect(row('001').validates).toContain('Given a badge on the reader');
  });

  it('keeps title, body and frontmatter and omits structured.spikes when the lift throws', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/spikes-lift.ts', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../src/planning-repo/handlers/spikes-lift.ts')>()),
      extractManifest: () => {
        throw new Error('boom');
      },
    }));
    const { SpikesManifestHandler: Guarded } = await import('../src/planning-repo/handlers/spikes.ts');
    const result = Guarded.parse(
      rawOf(MANIFEST, '---\nmade_up_example: true\n---\n# Spike Manifest\n\n## Spikes\n\n| # | Verdict |\n|---|---|\n| 001 | VALIDATED |\n'),
      refOf(MANIFEST, 'spikes-manifest'),
    );
    expect(result.title).toBe('Spike Manifest');
    expect(result.body).toContain('| 001 | VALIDATED |');
    expect(result.frontmatter.made_up_example).toBe(true);
    expect(result.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/spikes-lift.ts');
  });
});

describe('extractManifest shapes', () => {
  it('reads a pre-#1700 flat manifest (## Idea, ## Requirements) as one implicit idea', () => {
    const lifted = extractManifest(
      [
        '# Spike Manifest',
        '',
        '## Idea',
        '',
        'Find out whether a cheap probe can report kiln temperature.',
        '',
        '## Requirements',
        '',
        '- Must read within five degrees',
        '- Must survive the element heat',
        '',
        '## Spikes',
        '',
        '| # | Name | Type | Validates | Verdict |',
        '|---|------|------|-----------|---------|',
        '| 001 | kiln-sensor | standard | a probe reads | VALIDATED |',
        '',
      ].join('\n'),
    );
    expect(lifted.ideas).toEqual([
      {
        key: 'spikes',
        paragraph: 'Find out whether a cheap probe can report kiln temperature.',
        requirements: ['Must read within five degrees', 'Must survive the element heat'],
        implicit: true,
      },
    ]);
    expect(lifted.rows).toHaveLength(1);
    expect(lifted.rows[0]).toMatchObject({ id: '001', idea: '', name: 'kiln-sensor', verdictKeyword: 'VALIDATED' });
  });

  it("reads Shapes' bare table with no headings: id and name from the Spike cell, the lower-case verdict kept", async () => {
    const { presentation } = await loadShapesProject();
    const artifact = presentation.artifacts.find((a) => a.path === MANIFEST)!;
    const manifest = (artifact.structured.spikes as { manifest: SpikesManifestBody }).manifest;
    expect(manifest.ideas).toEqual([]);
    expect(manifest.rows).toEqual([
      {
        id: '001',
        idea: '',
        name: 'kiln-sensor',
        type: '',
        validates: 'Can a cheap probe report the kiln temperature?',
        verdictKeyword: 'yes',
        verdictText: '',
        tags: [],
      },
    ]);
  });

  it('gives a manifest with no table no rows, and a header-only table no rows', () => {
    expect(extractManifest('# Nothing here\n\nJust prose.\n').rows).toEqual([]);
    expect(extractManifest('## Spikes\n\n| # | Verdict |\n|---|---|\n').rows).toEqual([]);
  });

  it('keeps an author idea key such as constructor as an ordinary key', () => {
    const lifted = extractManifest('## Ideas\n\n### constructor\n\nA paragraph.\n\n**Requirements:**\n\n- one\n\n### __proto__\n\nAnother.\n');
    expect(lifted.ideas.map((idea) => idea.key)).toEqual(['constructor', '__proto__']);
    expect(Object.getPrototypeOf(lifted.ideas[0])).toBe(Object.prototype);
  });

  it('does not take a heading inside a fence for an idea', () => {
    const lifted = extractManifest('## Ideas\n\n### real\n\nText.\n\n```\n### fake\n```\n');
    expect(lifted.ideas.map((idea) => idea.key)).toEqual(['real']);
  });
});

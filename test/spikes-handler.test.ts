// Phase 11 (11-12, VIEW-14, D-01): the spike handlers. The manifest lifts to ideas and rows with the verdict
// keyword split from its free text; a lift that throws omits only structured.spikes; ids stay text whatever YAML
// does to `spike:` frontmatter.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { GenericMarkdownHandler } from '../src/planning-repo/handlers/generic.ts';
import {
  SpikeReadmeHandler,
  SpikesConventionsHandler,
  SpikesManifestHandler,
  SpikesWrapUpHandler,
} from '../src/planning-repo/handlers/spikes.ts';
import {
  SPIKES_ROW_CAP,
  extractConventions,
  extractManifest,
  extractSpikeReadme,
  extractWrapUp,
  spikeFolderIdentity,
  spikeIdInText,
  spikeIdKey,
  splitVerdict,
} from '../src/planning-repo/handlers/spikes-lift.ts';
import type {
  SpikeReadmeBody,
  SpikesConventionsBody,
  SpikesManifestBody,
  SpikesWrapUpBody,
} from '../src/planning-repo/handlers/spikes-lift.ts';
import { FX_PLANNING, loadFixtureProject } from './helpers/fixture-project.ts';
import { loadShapesProject } from './helpers/shapes-project.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';

const SPIKES = '.planning/spikes/';
const MANIFEST = `${SPIKES}MANIFEST.md`;

function refOf(path: string, kind: string): ArtifactRef {
  return { path, kind, location: 'other', phaseIdentity: null, milestoneVersion: null, quickTaskId: null, fileClass: 'text', sizeBytes: 0 } as ArtifactRef;
}

function rawOf(path: string, text: string): RawArtifact {
  return { path, content: text, mtimeMs: 0, size: text.length };
}

const lendshedText = (relative: string): string => readFileSync(join(FX_PLANNING, relative), 'utf8');

type Lifted<T> = { structured?: Record<string, unknown> } & { __t?: T };
function spikesOf<T>(result: Lifted<T>, part: string): T | undefined {
  const spikes = result.structured?.spikes as Record<string, unknown> | undefined;
  return spikes?.[part] as T | undefined;
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

// ---------------------------------------------------------------------------------------------------------
// Task 2: READMEs, wrap-up, conventions
// ---------------------------------------------------------------------------------------------------------

const README_003B = `${SPIKES}003b-local-disk-staging/README.md`;
const README_004 = `${SPIKES}004-object-store-staging/README.md`;
const README_001 = `${SPIKES}001-badge-reader-latency/README.md`;

function readmeOfPath(path: string, text: string = lendshedText(path.slice('.planning/'.length))) {
  const result = SpikeReadmeHandler.parse(rawOf(path, text), refOf(path, 'spike'));
  return { result, readme: spikesOf<SpikeReadmeBody>(result, 'readme')! };
}

describe('SpikeReadmeHandler', () => {
  it('is registered, claims kind spike only, and sits before the generic handler', () => {
    expect(SpikeReadmeHandler.match(refOf(README_001, 'spike'))).toBe(true);
    expect(SpikeReadmeHandler.match(refOf(MANIFEST, 'spikes-manifest'))).toBe(false);
    expect(HANDLERS.find((h) => h.match(refOf(README_001, 'spike')))).toBe(SpikeReadmeHandler);
    expect(HANDLERS.indexOf(SpikeReadmeHandler)).toBeLessThan(HANDLERS.indexOf(GenericMarkdownHandler));
  });

  it('takes 003b id and name from the folder and its verdict keyword from the README', () => {
    const { readme } = readmeOfPath(README_003B);
    expect(readme.id).toBe('003b');
    expect(readme.name).toBe('local-disk-staging');
    expect(readme.verdictKeyword).toBe('PENDING');
    expect(readme.verdictText).toBe('needs a recording');
    expect(readme.idea).toBe('export-staging');
    expect(readme.type).toBe('comparison');
    expect(readme.related).toEqual(['004']);
    expect(readme.frontmatterParsed).toBe(true);
  });

  it('keeps id 004 a string, not the number 4, and recovers the verdict when the frontmatter does not parse', () => {
    const { result, readme } = readmeOfPath(README_004);
    expect(readme.id).toBe('004');
    expect(typeof readme.id).toBe('string');
    expect(readme.id).not.toBe(4);
    expect(readme.verdictKeyword).toBe('PARTIAL');
    expect(readme.verdictText).toBe('resume untested');
    expect(readme.frontmatterParsed).toBe(false);
    expect(readme.related).toEqual(['003b']);
    // The body is intact and the warning is kept.
    expect(result.body).toContain('# Spike 004: Object Store Staging');
    expect(result.warning?.stage).toBe('frontmatter');
    // The rest of the lift still works on the body, not on the fence lines.
    expect(readme.headings).toEqual(['Research', 'How to Run', 'What to Expect', 'Investigation Trail']);
    expect(readme.validates).toEqual({
      given: 'a staged bundle in an object store',
      when: 'the desk asks for it',
      then: 'a signed link downloads it',
    });
  });

  it('takes the id from the folder even when frontmatter says spike: 010 (YAML reads it as 8)', () => {
    const { readme } = readmeOfPath(
      `${SPIKES}010-big-one/README.md`,
      '---\nspike: 010\nidea: x\nverdict: VALIDATED\nrelated: [002, 010]\n---\n\n# Spike 10\n',
    );
    expect(readme.id).toBe('010');
    expect(readme.name).toBe('big-one');
    // related stays text, so it still names the folders.
    expect(readme.related).toEqual(['002', '010']);
  });

  it('splits validates into Given, When and Then, and keeps one without a Given whole', () => {
    expect(readmeOfPath(README_001).readme.validates).toEqual({
      given: 'a badge on the reader',
      when: 'the kiosk looks the member up',
      then: 'the name shows within a second',
    });
    const whole = readmeOfPath(`${SPIKES}007-x/README.md`, '---\nvalidates: "A probe answers within a second."\n---\n# x\n').readme;
    expect(whole.validates).toEqual({ whole: 'A probe answers within a second.' });
    const noGiven = readmeOfPath(`${SPIKES}008-x/README.md`, '---\nvalidates: "When a badge is read, then the name shows"\n---\n# x\n').readme;
    expect(noGiven.validates).toEqual({ whole: 'When a badge is read, then the name shows' });
    const mixed = readmeOfPath(`${SPIKES}009-x/README.md`, '---\nvalidates: "GIVEN a, WHEN b, THEN c"\n---\n# x\n').readme;
    expect(mixed.validates).toEqual({ given: 'a', when: 'b', then: 'c' });
  });

  it('keeps the remaining headings as a list, without What This Validates and Results', () => {
    expect(readmeOfPath(README_003B).readme.headings).toEqual([
      'Research',
      'How to Run',
      'What to Expect',
      'Investigation Trail',
      'Open Questions',
    ]);
  });

  it('lifts a README with no frontmatter at all: id and name from the folder, no verdict, no throw', async () => {
    const { presentation } = await loadShapesProject();
    const artifact = presentation.artifacts.find((a) => a.path === `${SPIKES}001-kiln-sensor/README.md`)!;
    const readme = (artifact.structured.spikes as { readme: SpikeReadmeBody }).readme;
    expect(readme).toMatchObject({ id: '001', name: 'kiln-sensor', related: [], tags: [], headings: [] });
    expect(readme.verdictKeyword).toBeUndefined();
    expect(readme.validates).toBeUndefined();
  });

  it('reads DEFERRED, a keyword outside the four, as written', () => {
    const { readme } = readmeOfPath(`${SPIKES}005-pdf-receipts/README.md`);
    expect(readme.verdictKeyword).toBe('DEFERRED');
    expect(readme.verdictText).toBe('');
  });

  it('keeps body and frontmatter and omits structured.spikes when the README lift throws', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/spikes-lift.ts', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../src/planning-repo/handlers/spikes-lift.ts')>()),
      extractSpikeReadme: () => {
        throw new Error('boom');
      },
    }));
    const { SpikeReadmeHandler: Guarded } = await import('../src/planning-repo/handlers/spikes.ts');
    const result = Guarded.parse(rawOf(README_001, lendshedText('spikes/001-badge-reader-latency/README.md')), refOf(README_001, 'spike'));
    expect(result.title).toBe('Spike 001: Badge Reader Latency');
    expect(result.body).toContain('## Results');
    expect(result.frontmatter.idea).toBe('kiosk-handover');
    expect(result.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/spikes-lift.ts');
  });
});

describe('SpikesWrapUpHandler and SpikesConventionsHandler', () => {
  const WRAP = `${SPIKES}WRAP-UP-SUMMARY.md`;
  const CONV = `${SPIKES}CONVENTIONS.md`;

  it('are registered before the generic handler and claim their own kinds', () => {
    expect(HANDLERS.find((h) => h.match(refOf(WRAP, 'spikes-wrap-up')))).toBe(SpikesWrapUpHandler);
    expect(HANDLERS.find((h) => h.match(refOf(CONV, 'spikes-conventions')))).toBe(SpikesConventionsHandler);
    expect(HANDLERS.indexOf(SpikesWrapUpHandler)).toBeLessThan(HANDLERS.indexOf(GenericMarkdownHandler));
    expect(HANDLERS.indexOf(SpikesConventionsHandler)).toBeLessThan(HANDLERS.indexOf(GenericMarkdownHandler));
  });

  it("lifts Lendshed's wrap-up: date, count, areas, skill path, processed ids and key findings", () => {
    const result = SpikesWrapUpHandler.parse(rawOf(WRAP, lendshedText('spikes/WRAP-UP-SUMMARY.md')), refOf(WRAP, 'spikes-wrap-up'));
    const wrap = spikesOf<SpikesWrapUpBody>(result, 'wrapUp')!;
    expect(wrap.date).toBe('2026-03-30');
    expect(wrap.count).toBe(2);
    expect(wrap.areas).toEqual(['kiosk', 'export']);
    expect(wrap.skillPath).toBe('./.claude/skills/spike-findings-lendshed/');
    expect(wrap.processed).toEqual([
      { id: '001', name: 'badge-reader-latency', type: 'standard', verdict: 'VALIDATED', area: 'kiosk' },
      { id: '002', name: 'offline-ledger-queue', type: 'standard', verdict: 'INVALIDATED', area: 'kiosk' },
    ]);
    expect(wrap.keyFindings).toContain('The badge reader answers well inside a second');
  });

  it('gives a wrap-up with none of the known lines an empty projection, not a throw', () => {
    const wrap = extractWrapUp({}, '# Notes\n\nNothing structured.\n');
    expect(wrap).toEqual({ areas: [], processed: [], keyFindings: '' });
  });

  it("lifts Lendshed's conventions into the writer's four sections by heading", () => {
    const result = SpikesConventionsHandler.parse(rawOf(CONV, lendshedText('spikes/CONVENTIONS.md')), refOf(CONV, 'spikes-conventions'));
    const conventions = spikesOf<SpikesConventionsBody>(result, 'conventions')!;
    expect(conventions.sections.map((s) => [s.key, s.heading])).toEqual([
      ['stack', 'Stack'],
      ['structure', 'Structure'],
      ['patterns', 'Patterns'],
      ['tools-and-libraries', 'Tools & Libraries'],
    ]);
    expect(conventions.sections[2].text).toContain('Print one line per measurement');
  });

  it("keeps Shapes' two-sentence conventions (none of the four) as unkeyed sections or none", async () => {
    const { presentation } = await loadShapesProject();
    const artifact = presentation.artifacts.find((a) => a.path === CONV)!;
    const conventions = (artifact.structured.spikes as { conventions: SpikesConventionsBody }).conventions;
    expect(conventions.sections.every((s) => s.key === null)).toBe(true);
  });

  it('keeps an unknown section unkeyed and in file order', () => {
    const lifted = extractConventions({}, '# C\n\n## Stack\n\nx\n\n## Extra Things\n\ny\n');
    expect(lifted.sections.map((s) => [s.key, s.heading])).toEqual([
      ['stack', 'Stack'],
      [null, 'Extra Things'],
    ]);
  });
});

describe('growth and bounds', () => {
  it('lifts a large planted table in linear time and keeps at most the row cap', () => {
    const table = (n: number): string => {
      const rows: string[] = ['## Spikes', '', '| # | Idea | Name | Type | Validates | Verdict | Tags |', '|---|---|---|---|---|---|---|'];
      for (let i = 0; i < n; i += 1) rows.push(`| ${String(i).padStart(4, '0')} | idea-${i % 7} | name-${i} | standard | v | VALIDATED (r${i}) | a, b |`);
      return rows.join('\n');
    };
    const growth = measureGrowth({
      make: (n) => table(n),
      run: (text) => {
        extractManifest(text);
      },
      startSize: 20,
      maxSize: 400,
      floorMs: 0,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
    expect(extractManifest(table(SPIKES_ROW_CAP + 300)).rows).toHaveLength(SPIKES_ROW_CAP);
  });

  it('reads a README head scan in linear time', () => {
    const text = (n: number): string => `---\nverdict: PARTIAL: ${'x'.repeat(n)}\n${'tag: a\n'.repeat(Math.min(n, 60))}---\n\n# Spike\n\n${'## Heading\n\ntext\n\n'.repeat(Math.max(1, Math.floor(n / 50)))}`;
    const growth = measureGrowth({
      make: (n) => text(n),
      run: (input) => {
        extractSpikeReadme(`${SPIKES}001-x/README.md`, {}, input, true, input);
      },
      startSize: 200,
      maxSize: 100_000,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });
});

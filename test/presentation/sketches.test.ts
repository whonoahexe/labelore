import { describe, expect, it } from 'vitest';
import {
  buildSketchesViewModel,
  parseSketchManifest,
  projectHasSketches,
  sketchViewUrl,
  type SketchArtifactRef,
} from '../../src/presentation/sketches.ts';

const MANIFEST = `# Sketch Manifest

## Design Direction
A calm,
dashboard-like   direction.

## Reference Points
Somewhere.

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | alpha | How should alpha look? | C — status rail | traceability, layout |
| 002 | beta | How should beta look? | None — reworked in 006 | documents |
| 003 | gamma | What about gamma? | | a,b , c |
`;

function ref(path: string, frontmatter: Record<string, unknown> = {}): SketchArtifactRef {
  return { path, key: `/artifacts/${encodeURIComponent(path)}`, title: path, frontmatter };
}

describe('parseSketchManifest', () => {
  it('reads GSD template rows and the design direction', () => {
    const manifest = parseSketchManifest(MANIFEST);
    expect(manifest.direction).toBe('A calm, dashboard-like direction.');
    expect(manifest.rows).toEqual([
      { number: '001', name: 'alpha', question: 'How should alpha look?', winner: 'C — status rail', tags: ['traceability', 'layout'] },
      { number: '002', name: 'beta', question: 'How should beta look?', winner: 'None — reworked in 006', tags: ['documents'] },
      { number: '003', name: 'gamma', question: 'What about gamma?', winner: null, tags: ['a', 'b', 'c'] },
    ]);
  });

  it('maps reordered columns by header and tolerates a missing Tags column', () => {
    const manifest = parseSketchManifest(
      '| Name | # | Tags | Winner | Design Question |\n|---|---|---|---|---|\n| x | 7 | t1, t2 | A | Q? |\n',
    );
    expect(manifest.rows).toEqual([{ number: '7', name: 'x', question: 'Q?', winner: 'A', tags: ['t1', 't2'] }]);
    const noTags = parseSketchManifest('| # | Name | Design Question | Winner |\n|---|---|---|---|\n| 1 | x | Q | W |\n');
    expect(noTags.rows[0].tags).toEqual([]);
  });

  it('unescapes pipes, skips the alignment row and blank rows', () => {
    const manifest = parseSketchManifest(
      '| # | Name | Design Question | Winner | Tags |\n| :-- | --- | --- | --- | --- |\n| 1 | x | a \\| b | A | t |\n|  |  |  |  |  |\n| 2 | y | q | B | |\n',
    );
    expect(manifest.rows.map((r) => r.question)).toEqual(['a | b', 'q']);
    expect(manifest.rows).toHaveLength(2);
  });

  it('degrades without throwing when there is no matching table', () => {
    for (const body of ['', 'just prose', '| a | b |\n|---|---|\n| 1 | 2 |\n']) {
      expect(parseSketchManifest(body)).toEqual({ direction: null, rows: [] });
    }
  });
});

describe('projectHasSketches', () => {
  it('needs a manifest or a folder with a README or an index', () => {
    expect(projectHasSketches([])).toBe(false);
    expect(projectHasSketches([{ path: '.planning/sketches/themes/default.css' }])).toBe(false);
    expect(projectHasSketches([{ path: '.planning/sketchesX/001-a/index.html' }])).toBe(false);
    expect(projectHasSketches([{ path: '.planning/sketches/MANIFEST.md' }])).toBe(true);
    expect(projectHasSketches([{ path: '.planning/sketches/001-a/README.md' }])).toBe(true);
    expect(projectHasSketches([{ path: '.planning/sketches/001-a/index.html' }])).toBe(true);
  });
});

describe('buildSketchesViewModel', () => {
  const manifestBody = `## Sketches

| # | Name | Design Question | Winner | Tags |
|---|---|---|---|---|
| 001 | alpha | Q1 | C — status rail | x |
| 002 | beta | Q2 | None — reworked in 006 | y |
| 005 | epsilon | Q5 | TBD | z |
`;
  const artifacts = [
    ref('.planning/sketches/MANIFEST.md'),
    ref('.planning/sketches/001-alpha/README.md'),
    ref('.planning/sketches/001-alpha/index.html'),
    ref('.planning/sketches/002-beta/README.md'),
    ref('.planning/sketches/003-gamma/README.md', {
      sketch: 3,
      name: 'gamma',
      question: 'Q3',
      winner: null,
      tags: ['t1', 't2'],
    }),
    ref('.planning/sketches/003-gamma/index.html'),
  ];

  it('lists manifest rows, folder-only sketches and folderless rows in number order', () => {
    const model = buildSketchesViewModel({ manifestBody, artifacts });
    expect(model.available).toBe(true);
    expect(model.manifestUrl).toBe(artifacts[0].key);
    expect(model.sketches.map((s) => s.number)).toEqual(['001', '002', '003', '005']);

    const [one, two, three, five] = model.sketches;
    expect(one.viewUrl).toBe('/sketches/001-alpha/');
    expect(one.readmeUrl).toBe(artifacts[1].key);
    expect(two.viewUrl).toBeNull();
    expect(two.readmeUrl).toBe(artifacts[3].key);
    expect(three).toMatchObject({
      number: '003',
      name: 'gamma',
      question: 'Q3',
      winner: null,
      decided: false,
      tags: ['t1', 't2'],
      folder: '003-gamma',
    });
    expect(five).toMatchObject({ folder: null, viewUrl: null, readmeUrl: null, name: 'epsilon' });
    expect(model.decidedCount).toBe(1);
  });

  it('fills a blank winner cell from the README frontmatter', () => {
    const model = buildSketchesViewModel({
      manifestBody: '| # | Name | Design Question | Winner | Tags |\n|---|---|---|---|---|\n| 001 | alpha | Q | | |\n',
      artifacts: [ref('.planning/sketches/001-alpha/README.md', { winner: 'B — grid', tags: 'a, b' })],
    });
    expect(model.sketches[0]).toMatchObject({ winner: 'B — grid', decided: true, tags: ['a', 'b'] });
  });

  it('pads a numeric frontmatter sketch number and treats null-like winners as absent', () => {
    const model = buildSketchesViewModel({
      manifestBody: null,
      artifacts: [ref('.planning/sketches/alpha/README.md', { sketch: 7, name: 'alpha' })],
    });
    expect(model.sketches[0].number).toBe('007');
    for (const winner of [null, '', 'null', '~']) {
      const built = buildSketchesViewModel({
        manifestBody: null,
        artifacts: [ref('.planning/sketches/001-a/README.md', { winner })],
      });
      expect(built.sketches[0].winner).toBeNull();
    }
  });

  it('decides on the winner text', () => {
    const decided = (winner: string | null) =>
      buildSketchesViewModel({
        manifestBody: null,
        artifacts: [ref('.planning/sketches/001-a/README.md', { winner })],
      }).sketches[0].decided;
    expect(decided('C — status rail')).toBe(true);
    expect(decided('B')).toBe(true);
    for (const text of ['None — reworked in 006', 'TBD', 'pending', null, '—']) expect(decided(text)).toBe(false);
  });

  it('lists README folders from frontmatter when there is no manifest', () => {
    const model = buildSketchesViewModel({
      manifestBody: null,
      artifacts: [
        ref('.planning/sketches/001-a/README.md', { name: 'a', question: 'QA' }),
        ref('.planning/sketches/002-b/README.md', { name: 'b', question: 'QB' }),
      ],
    });
    expect(model.available).toBe(true);
    expect(model.manifestUrl).toBeNull();
    expect(model.sketches.map((s) => s.name)).toEqual(['a', 'b']);
  });

  it('matches by numeric prefix, falls back to name when ambiguous, and claims a folder once', () => {
    const table = (rows: string) =>
      `| # | Name | Design Question | Winner | Tags |\n|---|---|---|---|---|\n${rows}`;
    const numeric = buildSketchesViewModel({
      manifestBody: table('| 1 | alpha | Q | A | |\n'),
      artifacts: [ref('.planning/sketches/001-alpha/README.md')],
    });
    expect(numeric.sketches).toHaveLength(1);
    expect(numeric.sketches[0]).toMatchObject({ number: '1', folder: '001-alpha' });

    const twoFolders = [
      ref('.planning/sketches/004-one/README.md'),
      ref('.planning/sketches/004-two/README.md'),
    ];
    const byName = buildSketchesViewModel({ manifestBody: table('| 4 | two | Q | A | |\n'), artifacts: twoFolders });
    expect(byName.sketches.find((s) => s.name === 'two')?.folder).toBe('004-two');

    const ambiguous = buildSketchesViewModel({ manifestBody: table('| 4 | other | Q | A | |\n'), artifacts: twoFolders });
    expect(ambiguous.sketches.find((s) => s.name === 'other')?.folder).toBeNull();

    const twice = buildSketchesViewModel({
      manifestBody: table('| 1 | alpha | Q | A | |\n| 1 | alpha | Q again | A | |\n'),
      artifacts: [ref('.planning/sketches/001-alpha/README.md')],
    });
    expect(twice.sketches.filter((s) => s.folder === '001-alpha')).toHaveLength(1);
  });

  it('encodes the folder in the view URL', () => {
    expect(sketchViewUrl('001 a')).toBe('/sketches/001%20a/');
  });
});

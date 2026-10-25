// SEC-01 / T-06-04: the link scanner must stay linear on hostile prose. The pre-fix pattern restarted a
// capital or digit run at every position (quadratic on a long run of capitals), so it is kept below as
// a literal and the harness is shown to flag it; the exported pattern must then clear every shape.
import type { Element, Root } from 'hast';
import { VFile } from 'vfile';
import { describe, expect, it } from 'vitest';
import type { ReferencePreviewDto, ReferenceRegistry } from '../../src/presentation/references.ts';
import { REFERENCE_TOKEN, rehypeResolvedReferences } from '../../src/rendering/linkify.ts';
import { GROWTH_LIMIT, measureGrowth } from '../helpers/growth.ts';

// The pattern exactly as it stood before the bounds were added.
const LEGACY_REFERENCE_TOKEN =
  /\.planning\/\S*[^\s.,;:!?)\]}'"]|D-\d+|Phase\s+[\p{Letter}\p{Number}.]+|[A-Z][A-Z0-9]+-\d+|\d+(?:\.\d+)?-\d+/gu;

function scan(pattern: RegExp, text: string): number {
  // A missing export would otherwise turn into the pattern /(?:)/ and read as linear.
  if (!(pattern instanceof RegExp) || !pattern.global) throw new Error('scan needs a global RegExp');
  return Array.from(text.matchAll(pattern)).length;
}

const HOSTILE_SHAPES: [string, (n: number) => string][] = [
  ['a run of capitals', (n) => 'A'.repeat(n)],
  ['a run of digits', (n) => '1'.repeat(n)],
  ['an A1 run', (n) => 'A1'.repeat(Math.ceil(n / 2))],
  ['an AB- run', (n) => 'AB-'.repeat(Math.ceil(n / 3))],
  ['a 1. run', (n) => '1.'.repeat(Math.ceil(n / 2))],
  ['.planning/ followed by dots', (n) => `.planning/${'.'.repeat(n)}`],
  ['Phase followed by spaces', (n) => `Phase ${' '.repeat(n)}!`],
  ['a repeated Phase', (n) => 'Phase  '.repeat(Math.ceil(n / 7))],
];

describe('the pre-fix pattern (positive control)', () => {
  it('is flagged as super-linear by the harness on a long run of capitals', { timeout: 120_000 }, () => {
    const growth = measureGrowth({
      make: (n) => 'A'.repeat(n),
      run: (text) => void scan(LEGACY_REFERENCE_TOKEN, text),
      minBaseMs: 2,
      maxSize: 1 << 15,
    });
    expect(growth.ratio).toBeGreaterThan(GROWTH_LIMIT);
  });
});

describe('REFERENCE_TOKEN growth', () => {
  for (const [name, make] of HOSTILE_SHAPES) {
    it(`stays linear on ${name}`, { timeout: 60_000 }, () => {
      const growth = measureGrowth({
        make,
        run: (text) => void scan(REFERENCE_TOKEN, text),
      });
      expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
    });
  }
});

const MILESTONE = 'milestone-a';
const ARTIFACT = '.planning/phases/05-example/05-CONTEXT.md';
const LONG_PREFIX = `${'A'.repeat(40)}-1`;

function preview(key: string, type: ReferencePreviewDto['type'], identity: string): ReferencePreviewDto {
  return {
    key,
    type,
    identity,
    title: identity,
    status: 'ok',
    location: 'here',
    detail: { label: 'Where', value: 'here' },
    url: `/${key}`,
  };
}

// A hand-built registry so the test names exactly the tokens it expects to resolve.
function registry(): ReferenceRegistry {
  const previews = new Map([
    ['plan', preview('plan', 'plan', '05-02')],
    ['decision', preview('decision', 'decision', 'D-12')],
    ['warning', preview('warning', 'warning', 'WR-03')],
    ['long', preview('long', 'requirement', LONG_PREFIX)],
  ]);
  return {
    previews,
    activeMilestoneKey: MILESTONE,
    artifactMilestones: new Map([[ARTIFACT, MILESTONE]]),
    resolutions: new Map([
      [`${MILESTONE}\u0000plan\u000005-02`, 'plan'],
      [`${MILESTONE}\u0000requirement\u0000${LONG_PREFIX}`, 'long'],
    ]),
    artifactPreviews: new Map(),
    artifactPhases: new Map(),
    phaseResolutions: new Map(),
    corpusResolutions: new Map([
      ['decision\u0000D-12', 'decision'],
      ['warning\u0000WR-03', 'warning'],
    ]),
  };
}

function textTree(value: string): Root {
  return {
    type: 'root',
    children: [{ type: 'element', tagName: 'p', properties: {}, children: [{ type: 'text', value }] }],
  };
}

function transform(tree: Root): number {
  const references = new Map<string, ReferencePreviewDto>();
  const file = new VFile();
  file.data = {
    renderContext: { referenceRegistry: registry(), referenceArtifactPath: ARTIFACT, references },
  };
  rehypeResolvedReferences()(tree, file);
  return references.size;
}

function controls(tree: Root): string[] {
  const [paragraph] = tree.children as Element[];
  return paragraph.children
    .filter((child): child is Element => child.type === 'element' && child.tagName === 'button')
    .map((button) => (button.children[0] as { value: string }).value);
}

describe('rehypeResolvedReferences behaviour after the bounds', () => {
  it('still links WR-03, 05-02 and D-12 in ordinary prose', () => {
    const tree = textTree('See WR-03, then 05-02 and D-12 for the reasoning.');
    expect(transform(tree)).toBe(3);
    expect(controls(tree)).toEqual(['WR-03', '05-02', 'D-12']);
  });

  it('does not link a 40-capital prefix even when that exact identifier is registered', () => {
    const tree = textTree(`Mentioned ${LONG_PREFIX} in passing.`);
    expect(transform(tree)).toBe(0);
    expect(controls(tree)).toEqual([]);
  });

  it('shows linear growth through the whole plugin on a long run of capitals', { timeout: 60_000 }, () => {
    const growth = measureGrowth<Root>({
      make: (n) => textTree('A'.repeat(n)),
      run: (tree) => void transform(tree),
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });

  it('finishes a 200,000-capital text node and links nothing in it', () => {
    const tree = textTree('A'.repeat(200_000));
    expect(transform(tree)).toBe(0);
  });
});

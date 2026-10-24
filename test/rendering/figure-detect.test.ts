// quick-261024-o3h: the one detector that decides, for every fenced block in every document type,
// whether it is a diagram, a directory tree or ordinary code.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FIGURE_MAX_CHARS,
  classifyFence,
  normalizeFenceLang,
} from '../../src/rendering/figure-detect.ts';

const fixture = (name: string): string =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const TREE = fixture('sp-p02-roles-tree.txt');
const DIAGRAM = fixture('sp-p02-roles-diagram.txt');

const BOXED_WITH_TREE_LINES = [
  '┌─────────────────────────┐',
  '│ Server                  │',
  '│  ├── routes/            │',
  '│  ├── handlers/          │',
  '│  └── store/             │',
  '└─────────────────────────┘',
  '            │',
  '            ▼',
  '┌─────────────────────────┐',
  '│ Database                │',
  '└─────────────────────────┘',
].join('\n');

describe('classifyFence', () => {
  it('reads a directory tree in every figure-eligible language spelling', () => {
    for (const lang of [undefined, null, '', 'text', 'TEXT', 'txt', 'plain', 'plaintext', 'ascii']) {
      expect(classifyFence(lang, TREE)).toBe('tree');
    }
  });

  it('reads a box-drawing diagram', () => {
    expect(classifyFence('text', DIAGRAM)).toBe('diagram');
    expect(classifyFence(undefined, DIAGRAM)).toBe('diagram');
  });

  it('keeps a diagram a diagram even when it also holds three or more tree lines', () => {
    expect(classifyFence(undefined, BOXED_WITH_TREE_LINES)).toBe('diagram');
  });

  it('leaves ordinary code with stray glyphs as code', () => {
    const snippet = ['// │ a note about the next line', 'const total = items.length;', 'return total;'].join('\n');
    expect(classifyFence(undefined, snippet)).toBeNull();
    expect(classifyFence(undefined, ['src/', '├── a.ts', '└── b.ts'].join('\n'))).toBeNull();
    expect(classifyFence(undefined, 'Just a sentence of plain prose.\nAnd another one.')).toBeNull();
  });

  it('leaves a fence tagged with a real language as code', () => {
    for (const lang of ['ts', 'bash', 'sh', 'json']) {
      expect(classifyFence(lang, TREE)).toBeNull();
    }
    expect(classifyFence('ts', DIAGRAM)).toBeNull();
  });

  it('leaves Mermaid to Mermaid', () => {
    expect(classifyFence('mermaid', TREE)).toBeNull();
    expect(classifyFence('mermaid', DIAGRAM)).toBeNull();
    expect(classifyFence('mermaid', 'graph TD\n  A --> B')).toBeNull();
  });

  it('never inspects text over the size cap', () => {
    const huge = '├── file.ts\n'.repeat(Math.ceil((300 * 1024) / 11));
    expect(huge.length).toBeGreaterThan(FIGURE_MAX_CHARS);
    const started = performance.now();
    expect(classifyFence(undefined, huge)).toBeNull();
    expect(performance.now() - started).toBeLessThan(100);
  });
});

describe('normalizeFenceLang', () => {
  it('takes the first token, lowercased', () => {
    expect(normalizeFenceLang(' TS title="x" ')).toBe('ts');
  });
  it('is empty when absent or blank', () => {
    expect(normalizeFenceLang(undefined)).toBe('');
    expect(normalizeFenceLang(null)).toBe('');
    expect(normalizeFenceLang('')).toBe('');
    expect(normalizeFenceLang('   ')).toBe('');
  });
});

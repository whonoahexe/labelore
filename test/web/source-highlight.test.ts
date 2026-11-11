// The Source reader's tone-only highlighter (D-04, UI-SPEC "Highlighting"): tone mapping, masked values,
// losslessness over the whole Lendshed fixture, and the per-line growth bound.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VALUE_NOT_SHOWN_MARK } from '../../src/planning-repo/handlers/withhold-values.ts';
import { highlightLine, lineContextsOf } from '../../src/web/source/source-highlight.ts';
import type { HighlightOptions, ToneToken } from '../../src/web/source/source-highlight.ts';
import { buildSourceModel, languageOf } from '../../src/web/source/source-model.ts';
import { FX_PLANNING, fxRead } from '../helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from '../helpers/growth.ts';

const MD: HighlightOptions = { language: 'markdown', inFrontmatter: false, inFence: false, masked: false };
const FM: HighlightOptions = { ...MD, inFrontmatter: true };
const FENCE: HighlightOptions = { ...MD, inFence: true };
const JSON_PLAIN: HighlightOptions = { language: 'json', inFrontmatter: false, inFence: false, masked: false };
const JSON_MASKED: HighlightOptions = { ...JSON_PLAIN, masked: true };

const joined = (tokens: ToneToken[]): string => tokens.map((t) => t.text).join('');
const toneRuns = (tokens: ToneToken[]): [string | null, string][] => tokens.map((t) => [t.tone, t.text]);

describe('markdown tones', () => {
  it('maps a heading with bold and inline code to p, h, p, b, p and p, c, p', () => {
    expect(toneRuns(highlightLine('## Plan **bold** `code`', MD))).toEqual([
      ['p', '##'],
      [null, ' '],
      ['h', 'Plan '],
      ['p', '**'],
      ['b', 'bold'],
      ['p', '**'],
      ['h', ' '],
      ['p', '`'],
      ['c', 'code'],
      ['p', '`'],
    ]);
  });

  it('reads a seven-hash line and a hashtag as plain text', () => {
    expect(toneRuns(highlightLine('####### not a heading', MD))).toEqual([[null, '####### not a heading']]);
    expect(toneRuns(highlightLine('#tag', MD))).toEqual([[null, '#tag']]);
  });

  it('tones tag-shaped runs, list bullets, task boxes and table pipes', () => {
    expect(toneRuns(highlightLine('  <name>Task 1</name>', MD))).toEqual([
      [null, '  '],
      ['tag', '<name>'],
      [null, 'Task 1'],
      ['tag', '</name>'],
    ]);
    expect(toneRuns(highlightLine('<task type="auto" tdd="true">', MD))).toEqual([['tag', '<task type="auto" tdd="true">']]);
    expect(toneRuns(highlightLine('  - [x] done', MD))).toEqual([
      [null, '  '],
      ['p', '- [x] '],
      [null, 'done'],
    ]);
    expect(toneRuns(highlightLine('* item', MD))).toEqual([
      ['p', '* '],
      [null, 'item'],
    ]);
    expect(toneRuns(highlightLine('| a | b |', MD))).toEqual([
      ['p', '|'],
      [null, ' a '],
      ['p', '|'],
      [null, ' b '],
      ['p', '|'],
    ]);
  });

  it('leaves unmatched markers plain', () => {
    expect(toneRuns(highlightLine('a ` b ** c < d', MD))).toEqual([[null, 'a ` b ** c < d']]);
    expect(toneRuns(highlightLine('****', MD))).toEqual([[null, '****']]);
    expect(toneRuns(highlightLine('``', MD))).toEqual([[null, '``']]);
  });

  it('tones fence markers and leaves fenced text plain', () => {
    expect(toneRuns(highlightLine('```ts', MD))).toEqual([['p', '```ts']]);
    expect(toneRuns(highlightLine('const a = `x` + **b**;', FENCE))).toEqual([[null, 'const a = `x` + **b**;']]);
    expect(toneRuns(highlightLine('```', FENCE))).toEqual([['p', '```']]);
    expect(toneRuns(highlightLine('| not | table |', FENCE))).toEqual([[null, '| not | table |']]);
  });

  it('gives an empty line no tokens', () => {
    expect(highlightLine('', MD)).toEqual([]);
    expect(highlightLine('', JSON_PLAIN)).toEqual([]);
  });
});

describe('frontmatter tones', () => {
  it('tones the list dash and the key', () => {
    expect(toneRuns(highlightLine('  - files_modified: x', FM))).toEqual([
      [null, '  '],
      ['p', '- '],
      ['key', 'files_modified'],
      ['p', ':'],
      [null, ' x'],
    ]);
    expect(toneRuns(highlightLine('phase: 12-foo', FM))).toEqual([
      ['key', 'phase'],
      ['p', ':'],
      [null, ' 12-foo'],
    ]);
  });

  it('tones the fence of hyphens and leaves list items without a key plain after the dash', () => {
    expect(toneRuns(highlightLine('---', FM))).toEqual([['p', '---']]);
    expect(toneRuns(highlightLine('  - src/web/a.ts', FM))).toEqual([
      [null, '  '],
      ['p', '- '],
      [null, 'src/web/a.ts'],
    ]);
  });
});

describe('JSON tones and masked values', () => {
  it('tones keys, punctuation and leaves values at the foreground', () => {
    expect(toneRuns(highlightLine('  "mode": "interactive",', JSON_PLAIN))).toEqual([
      [null, '  '],
      ['key', '"mode"'],
      ['p', ':'],
      [null, ' "interactive"'],
      ['p', ','],
    ]);
    expect(toneRuns(highlightLine('  "n": 12, "ok": true', JSON_PLAIN))).toContainEqual(['key', '"ok"']);
  });

  it('marks a masked value and an unset one as mask only when the response is masked', () => {
    const line = '  "brave_search": "****7c2e",';
    expect(toneRuns(highlightLine(line, JSON_MASKED))).toEqual([
      [null, '  '],
      ['key', '"brave_search"'],
      ['p', ':'],
      [null, ' "'],
      ['mask', '****7c2e'],
      [null, '"'],
      ['p', ','],
    ]);
    expect(highlightLine(line, JSON_PLAIN).some((t) => t.tone === 'mask')).toBe(false);
    expect(highlightLine('"exa": "(unset)"', JSON_MASKED).some((t) => t.tone === 'mask' && t.text === '(unset)')).toBe(true);
    expect(highlightLine('"exa": "(unset) and more"', JSON_MASKED).some((t) => t.tone === 'mask')).toBe(false);
  });

  it('handles escaped quotes and an unterminated string without losing text', () => {
    const escaped = '  "a": "x \\" y",';
    expect(joined(highlightLine(escaped, JSON_PLAIN))).toBe(escaped);
    const open = '  "a": "never closed';
    expect(joined(highlightLine(open, JSON_PLAIN))).toBe(open);
  });
});

describe('the shared Value not shown marker', () => {
  it('is its own mask token in frontmatter, markdown and JSON, masked or not', () => {
    const fm = highlightLine(`token: ${VALUE_NOT_SHOWN_MARK}`, FM);
    expect(toneRuns(fm)).toEqual([
      ['key', 'token'],
      ['p', ':'],
      [null, ' '],
      ['mask', VALUE_NOT_SHOWN_MARK],
    ]);
    const body = highlightLine(`Use ${VALUE_NOT_SHOWN_MARK} here`, MD);
    expect(toneRuns(body)).toEqual([
      [null, 'Use '],
      ['mask', VALUE_NOT_SHOWN_MARK],
      [null, ' here'],
    ]);
    const json = highlightLine(`"k": "${VALUE_NOT_SHOWN_MARK}"`, JSON_PLAIN);
    expect(json.some((t) => t.tone === 'mask' && t.text === VALUE_NOT_SHOWN_MARK)).toBe(true);
    expect(joined(json)).toBe(`"k": "${VALUE_NOT_SHOWN_MARK}"`);
    expect(highlightLine(VALUE_NOT_SHOWN_MARK, MD)).toEqual([{ tone: 'mask', text: VALUE_NOT_SHOWN_MARK }]);
  });
});

describe('plain text', () => {
  it('is one plain token', () => {
    expect(highlightLine('<a> `b` **c**', { language: 'text', inFrontmatter: false, inFence: false, masked: false })).toEqual([
      { tone: null, text: '<a> `b` **c**' },
    ]);
  });
});

describe('lineContextsOf', () => {
  it('flags frontmatter lines and fenced lines, counting a fence closer as inside', () => {
    const model = buildSourceModel('---\na: 1\n---\n```\nx\n```\ntail\n', 'markdown');
    expect(lineContextsOf(model).map((c) => [c.inFrontmatter, c.inFence])).toEqual([
      [true, false],
      [true, false],
      [true, false],
      [false, false],
      [false, true],
      [false, true],
      [false, false],
    ]);
  });

  it('is all outside for JSON and text', () => {
    for (const language of ['json', 'text'] as const) {
      const contexts = lineContextsOf(buildSourceModel('```\n---\n', language));
      expect(contexts.every((c) => !c.inFrontmatter && !c.inFence)).toBe(true);
    }
  });
});

describe('lossless over the Lendshed fixture', () => {
  function textFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...textFiles(path));
      else if (entry.name.endsWith('.md') || entry.name.endsWith('.json')) out.push(path);
    }
    return out;
  }

  it('joins back to every line of every markdown and JSON file, masked or not', () => {
    const files = textFiles(FX_PLANNING);
    expect(files.length).toBeGreaterThan(100);
    let lines = 0;
    for (const file of files) {
      const language = languageOf(file);
      const model = buildSourceModel(readFileSync(file, 'utf8'), language);
      const contexts = lineContextsOf(model);
      model.lines.forEach((line, index) => {
        for (const masked of [false, true]) {
          const tokens = highlightLine(line, { language, ...contexts[index], masked });
          if (joined(tokens) !== line) throw new Error(`${file}:${index + 1} is not lossless`);
          if (tokens.some((t) => t.text === '')) throw new Error(`${file}:${index + 1} has an empty token`);
        }
        lines += 1;
      });
    }
    expect(lines).toBeGreaterThan(1000);
  });

  it('stays lossless on adversarial lines built from the scanner alphabet', () => {
    const alphabet = ['`', '*', '**', '<', '>', '</', '|', '#', '-', '[', ']', '"', '\\', '{', '}', ':', ',', ' ', 'a', '1', '```', VALUE_NOT_SHOWN_MARK, '<a ', '- [x] '];
    let seed = 12345;
    const next = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed;
    };
    for (let round = 0; round < 400; round += 1) {
      let line = '';
      for (let i = 0; i < 1 + (next() % 24); i += 1) line += alphabet[next() % alphabet.length];
      for (const options of [MD, FM, FENCE, JSON_PLAIN, JSON_MASKED]) {
        expect(joined(highlightLine(line, options))).toBe(line);
      }
    }
  });
});

describe('growth (T-12-08)', () => {
  const shapes: Record<string, string> = {
    'unclosed tag openers': '<a ',
    backticks: '`x ',
    'bold openers': '**x ',
    pipes: '| a ',
    quotes: '"k" ',
    'marker repeats': `${VALUE_NOT_SHOWN_MARK} `,
  };
  for (const [name, unit] of Object.entries(shapes)) {
    it(`scans a long line of ${name} in linear time at an 8x step`, () => {
      const options = name === 'quotes' ? JSON_MASKED : MD;
      const growth = measureGrowth<string>({
        make: (n) => unit.repeat(Math.max(1, Math.floor(n / unit.length))),
        run: (line) => {
          highlightLine(line, options);
        },
      });
      expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
    });
  }
});

describe('fixture sanity', () => {
  it('reads the fixture config as JSON', () => {
    expect(buildSourceModel(fxRead('config.json'), 'json').lines[0]).toBe('{');
  });
});

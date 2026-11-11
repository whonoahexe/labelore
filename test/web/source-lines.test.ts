// Heading ids, plan offsets and null mapped to Source lines (D-01, D-05; RESEARCH Pattern 4). The mapping
// is checked against the real renderer so a line target can never drift from the ids the page emits.
import { describe, expect, it } from 'vitest';
import { createArtifactRenderer } from '../../src/rendering/markdown.ts';
import { buildSourceModel } from '../../src/web/source/source-model.ts';
import { headingLineOf, offsetLineOf, targetLineOf } from '../../src/web/source/source-lines.ts';
import { GROWTH_LIMIT, measureGrowth } from '../helpers/growth.ts';

const model = (text: string) => buildSourceModel(text, 'markdown');

describe('headingLineOf', () => {
  const text = ['# Title', '', '## Summary', 'a', '## Summary', 'b', '## Summary', '## Other'].join('\n');

  it('finds the first heading by its slug and the repeats by their -N suffix in document order', () => {
    const m = model(text);
    expect(headingLineOf(m, 'title')).toBe(1);
    expect(headingLineOf(m, 'summary')).toBe(3);
    expect(headingLineOf(m, 'summary-1')).toBe(5);
    expect(headingLineOf(m, 'summary-2')).toBe(7);
    expect(headingLineOf(m, 'other')).toBe(8);
    expect(headingLineOf(m, 'summary-3')).toBeNull();
    expect(headingLineOf(m, 'nowhere')).toBeNull();
  });

  it('does not count a heading inside a fence or inside the frontmatter', () => {
    const m = model(['---', '# frontmatter comment', 'a: 1', '---', '```', '## Summary', '```', '## Summary', '## Summary'].join('\n'));
    expect(headingLineOf(m, 'summary')).toBe(8);
    expect(headingLineOf(m, 'summary-1')).toBe(9);
    expect(headingLineOf(m, 'frontmatter-comment')).toBeNull();
  });

  it('reads an empty heading as the renderer does', () => {
    expect(headingLineOf(model('##\ntext\n'), 'section')).toBe(1);
  });
});

describe('heading ids match the real renderer', () => {
  const frontmatter = '---\nphase: 1\n# a comment\n---\n';
  const body = [
    '# Title',
    '',
    '## Summary',
    'one',
    '### Uses `code` and **bold**',
    '## See [the plan](x.md)',
    '## Summary',
    '## Closing hashes ##',
    '## Pic ![alt text](a.png) end',
    '## Escaped \\*star\\* and R&amp;D',
    '## <span>Raw</span> html',
    '```md',
    '## In a fence',
    '```',
    '## Summary',
    '## Café 日本語 snake_case_name',
    '## Tom &amp; Jerry &lt;3',
    '## Plain_with _emphasis_ marks',
    '## Linked [one][r] and <https://example.com/x>',
    '##### Deep',
    '## Trailing space   ',
    '',
    '[r]: https://example.com/r',
  ].join('\n');
  const text = frontmatter + body;

  it('maps every rendered heading id to the line of its own heading', async () => {
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render({ kind: 'markdown', body });
    const m = model(text);
    const expectedLines = m.headings.map((h) => h.line);
    expect(rendered.headings).toHaveLength(expectedLines.length);
    expect(expectedLines.length).toBeGreaterThanOrEqual(15);
    rendered.headings.forEach((heading, index) => {
      expect(headingLineOf(m, heading.id), `${heading.id} (${heading.text})`).toBe(expectedLines[index]);
    });
    // the repeats really are suffixed in the page, so the check above is not vacuous
    expect(rendered.headings.map((h) => h.id)).toContain('summary-2');
  });
});

describe('offsetLineOf', () => {
  it('counts newlines before the offset', () => {
    expect(offsetLineOf('ab\ncd\nef', 0)).toBe(1);
    expect(offsetLineOf('ab\ncd\nef', 2)).toBe(1);
    expect(offsetLineOf('ab\ncd\nef', 3)).toBe(2);
    expect(offsetLineOf('ab\ncd\nef', 6)).toBe(3);
  });

  it('clamps an offset outside the text', () => {
    expect(offsetLineOf('ab\ncd', -5)).toBe(1);
    expect(offsetLineOf('ab\ncd', 999)).toBe(2);
    expect(offsetLineOf('', 3)).toBe(1);
  });
});

describe('targetLineOf', () => {
  const planBody = [
    '<objective>',
    'Do the thing.',
    '</objective>',
    '',
    '<tasks>',
    '<task type="auto">',
    '  <name>Task 1</name>',
    '  <action>Do it</action>',
    '</task>',
    '</tasks>',
    '',
    '## After',
    '',
  ].join('\n');

  it('sends a plan-at id to the line holding that body offset, with and without frontmatter', async () => {
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render({ kind: 'plan', body: planBody });
    const offsets = [...rendered.html.matchAll(/id="plan-at-(\d+)"/g)].map((m) => Number(m[1]));
    expect(offsets.length).toBeGreaterThanOrEqual(4);
    for (const frontmatter of ['', '---\nphase: 1\nplan: 2\n---\n']) {
      const text = frontmatter + planBody;
      const m = model(text);
      const bodyStart = frontmatter.length;
      for (const offset of offsets) {
        const line = targetLineOf(m, text, bodyStart, `plan-at-${offset}`);
        const expected = planBody.slice(offset).split('\n')[0];
        expect(m.lines[line - 1], `plan-at-${offset}`).toContain(expected);
      }
      expect(targetLineOf(m, text, bodyStart, 'plan-at-0')).toBe(frontmatter ? 5 : 1);
    }
  });

  it('sends a heading id to its heading line', () => {
    const text = '---\na: 1\n---\n# Title\n\n## Part\n';
    const m = model(text);
    expect(targetLineOf(m, text, 10, 'part')).toBe(6);
    expect(targetLineOf(m, text, 10, 'title')).toBe(4);
  });

  it('lands on line 1 for null, for a synthesized id and for an id it cannot map', () => {
    const text = '# Title\n\ntext\n';
    const m = model(text);
    expect(targetLineOf(m, text, 0, null)).toBe(1);
    expect(targetLineOf(m, text, 0, 'plan-section-3')).toBe(1);
    expect(targetLineOf(m, text, 0, 'no-such-heading')).toBe(1);
    expect(targetLineOf(m, text, 0, 'plan-at-99999999999999999999999')).toBe(1);
  });

  it('never returns a line past the last line', () => {
    const text = 'a\nb\n';
    const m = model(text);
    expect(targetLineOf(m, text, 0, 'plan-at-500')).toBe(2);
    expect(targetLineOf(buildSourceModel('', 'markdown'), '', 0, 'plan-at-5')).toBe(1);
  });
});

describe('growth', () => {
  it('maps a heading id in linear time as headings grow 8x', () => {
    const growth = measureGrowth<ReturnType<typeof model>>({
      make: (n) => model(Array.from({ length: n }, (_, i) => `## Heading ${i % 40}`).join('\n')),
      run: (m) => {
        headingLineOf(m, 'not-present');
      },
      startSize: 200,
      maxSize: 1 << 15,
      floorMs: 0,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });

  for (const [name, unit] of [
    ['unmatched brackets', '[a '],
    ['unmatched angle brackets', '<a '],
    ['angle openers before one closer', '<'],
    ['ampersands', '&a '],
    ['backslashes', '\\a'],
  ] as const) {
    it(`reads one long heading of ${name} in linear time`, () => {
      const growth = measureGrowth<ReturnType<typeof model>>({
        make: (n) => {
          const body = unit.repeat(Math.max(1, Math.floor(n / unit.length)));
          return model(`## ${name === 'angle openers before one closer' ? body + '>' : body}`);
        },
        run: (m) => {
          headingLineOf(m, 'not-present');
        },
      });
      expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
    });
  }
});

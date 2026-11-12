// T-12-35: gray-matter's built-in `javascript` engine `eval`s the frontmatter of a file that opens with `---js` (any
// letter case, `---javascript` too). A target .planning/ file must never run code in this process, so every such
// spelling reads as malformed frontmatter and nothing in it is evaluated.
import { afterEach, describe, expect, it } from 'vitest';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';

const probe = globalThis as { LABELORE_FRONTMATTER_PROBE?: number };

afterEach(() => {
  delete probe.LABELORE_FRONTMATTER_PROBE;
});

describe('tryParseFrontmatter never runs frontmatter as code (T-12-35)', () => {
  it.each(['---js', '---JS', '---Js ', '---javascript', '--- javascript', '---JavaScript'])('refuses %j', (fence) => {
    const content = `${fence}\n{ value: (globalThis.LABELORE_FRONTMATTER_PROBE = 42, 42) }\n---\nbody\n`;
    const result = tryParseFrontmatter(content);
    expect(probe.LABELORE_FRONTMATTER_PROBE).toBeUndefined();
    expect(result.data).toEqual({});
    expect(result.body).toBe(content);
    expect(result.warning?.stage).toBe('frontmatter');
  });

  it('still reads YAML frontmatter, with or without the language named', () => {
    expect(tryParseFrontmatter('---\na: 1\n---\nbody\n').data).toEqual({ a: 1 });
    expect(tryParseFrontmatter('---yaml\na: 1\n---\nbody\n').data).toEqual({ a: 1 });
  });
});

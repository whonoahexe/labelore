// T-12-35: gray-matter's built-in `javascript` engine `eval`s the frontmatter of a file that opens with `---js` (any
// letter case, `---javascript` too). A target .planning/ file must never run code in this process, so every such
// spelling reads as malformed frontmatter and nothing in it is evaluated.
import { afterEach, describe, expect, it } from 'vitest';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';
import { maskData } from '../src/planning-repo/handlers/withhold-values.ts';

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

  // CR-01: gray-matter looks the language up in an object that inherits Object.prototype, so these names select a
  // built-in function as the engine. The frontmatter must read as malformed, with no data to walk character by character.
  it.each(['constructor', 'toString', 'hasOwnProperty', 'valueOf', 'isPrototypeOf', '__proto__', 'toml', 'coffee'])(
    'refuses the language %j and leaks no secret through maskData',
    (language) => {
      const content = `---${language}\nSTRIPE_KEY: BSAplantedsecretvalue1234567890wxyz\n---\nbody\n`;
      const result = tryParseFrontmatter(content);
      expect(result.warning?.stage).toBe('frontmatter');
      expect(result.data).toEqual({});
      expect(result.body).toBe(content);
      expect(JSON.stringify(maskData(result.data, 0))).not.toContain('BSAplanted');
    },
  );

  it('refuses a BOM-prefixed prototype-named language too', () => {
    const result = tryParseFrontmatter('\uFEFF---constructor\nSTRIPE_KEY: BSAplantedsecretvalue1234567890wxyz\n---\nbody\n');
    expect(result.warning?.stage).toBe('frontmatter');
    expect(result.data).toEqual({});
  });

  it('reads a frontmatter that is not a map as malformed', () => {
    expect(tryParseFrontmatter('---\n- a\n- b\n---\nbody\n').warning?.stage).toBe('frontmatter');
    expect(tryParseFrontmatter('---\njust a string\n---\nbody\n').warning?.stage).toBe('frontmatter');
  });

  it('still reads YAML frontmatter, with or without the language named', () => {
    expect(tryParseFrontmatter('---\na: 1\n---\nbody\n').data).toEqual({ a: 1 });
    expect(tryParseFrontmatter('---yaml\na: 1\n---\nbody\n').data).toEqual({ a: 1 });
    expect(tryParseFrontmatter('---yml\na: 1\n---\nbody\n').data).toEqual({ a: 1 });
    expect(tryParseFrontmatter('---json\n{"a": 1}\n---\nbody\n').data).toEqual({ a: 1 });
  });
});

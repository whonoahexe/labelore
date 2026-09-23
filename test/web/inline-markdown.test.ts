import { describe, expect, it } from 'vitest';
import { tokenizeInline } from '../../src/web/views/inline-markdown.ts';

describe('tokenizeInline (T-lju-01)', () => {
  it('tokenizes code, bold, italic, a ref mention and a link label in source order', () => {
    const tokens = tokenizeInline(
      '`a.b` and **bold** and *em* see D-03 and [label](http://x)',
    );
    expect(tokens.map((t) => t.type)).toEqual([
      'code',
      'text',
      'strong',
      'text',
      'em',
      'text',
      'ref',
      'text',
      'text',
    ]);
    expect(tokens[0]).toEqual({ type: 'code', value: 'a.b' });
    expect(tokens[2]).toEqual({ type: 'strong', value: [{ type: 'text', value: 'bold' }] });
    expect(tokens[4]).toEqual({ type: 'em', value: [{ type: 'text', value: 'em' }] });
    expect(tokens[6]).toEqual({ type: 'ref', value: 'D-03' });
    expect(tokens[8]).toEqual({ type: 'text', value: 'label' });
  });

  it('keeps an unclosed ** literal', () => {
    const tokens = tokenizeInline('a **b without a close');
    expect(tokens).toEqual([{ type: 'text', value: 'a **b without a close' }]);
  });

  it('keeps an unclosed ` literal', () => {
    const tokens = tokenizeInline('a `b without a close');
    expect(tokens).toEqual([{ type: 'text', value: 'a `b without a close' }]);
  });

  it('never interprets a raw HTML/script tag — it stays a single literal text token', () => {
    const tokens = tokenizeInline('<script>alert(1)</script>');
    expect(tokens).toEqual([{ type: 'text', value: '<script>alert(1)</script>' }]);
  });

  it('matches an OPEN-NN ref inside plain text', () => {
    const tokens = tokenizeInline('blocks OPEN-12 here');
    expect(tokens).toEqual([
      { type: 'text', value: 'blocks ' },
      { type: 'ref', value: 'OPEN-12' },
      { type: 'text', value: ' here' },
    ]);
  });

  it('never nests strong/em inside strong/em (one level only)', () => {
    const tokens = tokenizeInline('**bold with *em* inside**');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe('strong');
    const inner = (tokens[0] as { value: { type: string }[] }).value;
    // The nested "*em*" markers are not re-interpreted one level down — they render as text.
    expect(inner.every((t) => t.type === 'text' || t.type === 'code' || t.type === 'ref')).toBe(true);
  });

  it('never emits a ref token inside a code span', () => {
    const tokens = tokenizeInline('`D-01 is not a ref here`');
    expect(tokens).toEqual([{ type: 'code', value: 'D-01 is not a ref here' }]);
  });
});

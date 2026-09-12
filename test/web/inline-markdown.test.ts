import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InlineMarkdown, parseInlineMarkdown } from '../../src/web/components/inline-markdown.ts';

describe('InlineMarkdown and parseInlineMarkdown', () => {
  it('renders inline code without delimiters', () => {
    const html = renderToStaticMarkup(React.createElement(InlineMarkdown, { text: '`code`' }));
    expect(html).toBe('<code>code</code>');
  });

  it('renders bold text with ** or __ delimiters', () => {
    expect(renderToStaticMarkup(React.createElement(InlineMarkdown, { text: '**bold**' }))).toBe(
      '<strong>bold</strong>',
    );
    expect(renderToStaticMarkup(React.createElement(InlineMarkdown, { text: '__bold__' }))).toBe(
      '<strong>bold</strong>',
    );
  });

  it('renders italic text with * or word-boundary _ delimiters', () => {
    expect(renderToStaticMarkup(React.createElement(InlineMarkdown, { text: '*italic*' }))).toBe(
      '<em>italic</em>',
    );
    expect(renderToStaticMarkup(React.createElement(InlineMarkdown, { text: '_italic_' }))).toBe(
      '<em>italic</em>',
    );
    expect(
      renderToStaticMarkup(React.createElement(InlineMarkdown, { text: 'leading (_italic in parens_) trailing' })),
    ).toBe('leading (<em>italic in parens</em>) trailing');
  });

  it('renders both bold and italic with ***', () => {
    expect(renderToStaticMarkup(React.createElement(InlineMarkdown, { text: '***both***' }))).toBe(
      '<strong><em>both</em></strong>',
    );
  });

  it('renders strikethrough with ~~', () => {
    expect(renderToStaticMarkup(React.createElement(InlineMarkdown, { text: '~~strike~~' }))).toBe(
      '<del>strike</del>',
    );
  });

  it('renders nested spans such as code inside bold', () => {
    expect(
      renderToStaticMarkup(
        React.createElement(InlineMarkdown, { text: '**bold with `code` inside**' }),
      ),
    ).toBe('<strong>bold with <code>code</code> inside</strong>');
  });

  it('renders real-world blocker markdown without raw asterisks or delimiters', () => {
    const text =
      '**Vercel TLS cert for `studio.cinedise.com` expires 2026-10-14, and renewal will fail silently.**';
    expect(renderToStaticMarkup(React.createElement(InlineMarkdown, { text }))).toBe(
      '<strong>Vercel TLS cert for <code>studio.cinedise.com</code> expires 2026-10-14, and renewal will fail silently.</strong>',
    );
  });

  it('preserves snake_case variables without italicizing', () => {
    expect(
      renderToStaticMarkup(
        React.createElement(InlineMarkdown, { text: 'variable my_variable_name in code' }),
      ),
    ).toBe('variable my_variable_name in code');
  });

  it('preserves unmatched asterisks like math expressions', () => {
    expect(renderToStaticMarkup(React.createElement(InlineMarkdown, { text: '2 * 3 = 6' }))).toBe(
      '2 * 3 = 6',
    );
  });

  it('handles empty and whitespace strings gracefully', () => {
    expect(renderToStaticMarkup(React.createElement(InlineMarkdown, { text: '' }))).toBe('');
    expect(parseInlineMarkdown('')).toEqual([]);
    expect(renderToStaticMarkup(React.createElement(InlineMarkdown, { text: '   ' }))).toBe('   ');
  });

  it('parses multiple formatting elements within the same line', () => {
    const text = 'Here is **bold**, *italic*, `code`, and ~~deleted~~ text.';
    expect(renderToStaticMarkup(React.createElement(InlineMarkdown, { text }))).toBe(
      'Here is <strong>bold</strong>, <em>italic</em>, <code>code</code>, and <del>deleted</del> text.',
    );
  });
});

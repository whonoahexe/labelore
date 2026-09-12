import { describe, expect, it } from 'vitest';
import { stripMarkdown } from '../../src/web/pages/strip-markdown.ts';

describe('stripMarkdown', () => {
  it('strips bold and italic markdown delimiters', () => {
    expect(stripMarkdown('**bold**')).toBe('bold');
    expect(stripMarkdown('*italic*')).toBe('italic');
    expect(stripMarkdown('***both***')).toBe('both');
    expect(stripMarkdown('__bold__')).toBe('bold');
    expect(stripMarkdown('_italic_')).toBe('italic');
  });

  it('strips backticks and code spans', () => {
    expect(stripMarkdown('`code`')).toBe('code');
    expect(stripMarkdown('```code block```')).toBe('code block');
    expect(stripMarkdown('`/.well-known/acme-challenge/*`')).toBe('/.well-known/acme-challenge/*');
  });

  it('strips strikethrough and markdown links', () => {
    expect(stripMarkdown('~~deleted~~')).toBe('deleted');
    expect(stripMarkdown('[Documentation](https://example.com)')).toBe('Documentation');
  });

  it('handles the real blocker string without leaving asterisks or backticks', () => {
    const raw =
      '**Vercel TLS cert for `studio.cinedise.com` expires 2026-10-14, and renewal will fail silently.** Cloudflare Access gates the ACME challenge path, so the automated renewal cannot complete. Add an Access bypass policy for `/.well-known/acme-challenge/*` on `studio.cinedise.com` before then. This is the single highest-consequence open item — the portal goes dark if it lapses.';
    const expected =
      'Vercel TLS cert for studio.cinedise.com expires 2026-10-14, and renewal will fail silently. Cloudflare Access gates the ACME challenge path, so the automated renewal cannot complete. Add an Access bypass policy for /.well-known/acme-challenge/* on studio.cinedise.com before then. This is the single highest-consequence open item — the portal goes dark if it lapses.';
    expect(stripMarkdown(raw)).toBe(expected);
  });

  it('preserves non-markdown asterisks in math and intra-word underscores', () => {
    expect(stripMarkdown('2 * 3 = 6')).toBe('2 * 3 = 6');
    expect(stripMarkdown('snake_case_variable_name')).toBe('snake_case_variable_name');
  });

  it('handles empty and whitespace strings gracefully', () => {
    expect(stripMarkdown('')).toBe('');
    expect(stripMarkdown('   ')).toBe('');
  });
});

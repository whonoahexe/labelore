// NAV-09, D-11, D-13: one not-found page serves every miss and names the address as typed.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { NotFoundPage } from '../../src/web/pages/not-found-page.tsx';
import { decodeAddress } from '../../src/web/project-path.ts';

function render(props: { address: string; openSlug: string }): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: ['/shapes/notes'] },
      createElement(NotFoundPage, props),
    ),
  );
}

describe('NotFoundPage', () => {
  it('carries the whole copy set', () => {
    const markup = render({ address: '/shapes/notes', openSlug: 'shapes' });
    expect(markup).toContain('<main class="page-stack">');
    expect(markup).toContain('<p class="eyebrow">Not found</p>');
    expect(markup).toContain('<h1>This local route does not exist.</h1>');
    expect(markup).toContain('<section class="notice">');
    expect(markup).toContain('<h2>Nothing is mapped here</h2>');
    expect(markup).toContain('Labelore looked for this address and found no file or page there.');
    expect(markup).toContain('Return to the dashboard');
  });

  it('shows the address in an artifact-path paragraph, as text', () => {
    const markup = render({ address: '/shapes/notes', openSlug: 'shapes' });
    expect(markup).toContain('<p class="artifact-path">/shapes/notes</p>');
  });

  it('links back to the open project dashboard', () => {
    expect(render({ address: '/shapes/notes', openSlug: 'shapes' })).toContain('href="/shapes"');
  });

  it('collapses a way back that is not a valid slug to the landing page (T-08-36)', () => {
    expect(render({ address: '/x', openSlug: '//evil' })).toContain('href="/"');
  });

  it('carries no wrong-project sentence, whatever the first segment was', () => {
    const markup = render({ address: '/other/roadmap', openSlug: 'shapes' });
    expect(markup).not.toContain('different project name');
    expect(markup).toContain('Labelore looked for this address and found no file or page there.');
    expect(markup).toContain('<p class="artifact-path">/other/roadmap</p>');
  });

  it('renders an address holding markup escaped, never as HTML or a link (T-07-08)', () => {
    const address = decodeAddress('/shapes/%3Cb%3Ebold%3C/b%3E/%3Ca%20href=%22x%22%3E');
    const markup = render({ address, openSlug: 'shapes' });
    expect(markup).toContain('&lt;b&gt;bold&lt;/b&gt;');
    expect(markup).not.toContain('<b>bold</b>');
    expect(markup).not.toContain('<a href="x">');
    expect(markup.match(/<a /g)).toHaveLength(1);
  });

  it('shows a 300-character address in full, in the wrapping paragraph', () => {
    const address = `/shapes/${'a'.repeat(300)}`;
    const markup = render({ address, openSlug: 'shapes' });
    expect(markup).toContain(`<p class="artifact-path">${address}</p>`);
  });
});

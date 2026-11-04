// D-06 / RESEARCH C2 (10-10): the shared copy-command row. The command is selectable mono text outside its
// button; the button's aria-label names the command; pressing it copies exactly the command it was given and
// confirms inside the button ("Copied", a Check icon, an sr-only status) with no toast. This project has no
// jsdom, so the presentational part (CopyCommandView) is rendered to static markup in both states, the copy
// action is exercised with a recording clipboard, and the read-only guarantee is pinned from the source:
// the component imports no api module and issues no request (T-10-17, T-10-18).
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NEXT_STEPS } from '../../src/presentation/codebase-map.ts';
import { COPIED_RESET_MS, CopyCommandView, copyCommandToClipboard } from '../../src/web/components/copy-command.tsx';

const render = (command: string, copied: boolean): string =>
  renderToStaticMarkup(createElement(CopyCommandView, { command, copied, onCopy: () => undefined }));

describe('CopyCommandView', () => {
  it('shows the command in a code element outside the button, so it can be selected by hand', () => {
    const html = render('/gsd-new-project', false);
    expect(html).toContain('<code class="copy-command-text">/gsd-new-project</code>');
    const button = html.match(/<button[\s\S]*?<\/button>/)?.[0] ?? '';
    expect(button).not.toContain('<code');
    expect(button).not.toContain('/gsd-new-project</');
  });

  it('is a real button labelled "Copy command" whose aria-label names the command', () => {
    const html = render('/gsd-map-codebase', false);
    const button = html.match(/<button[\s\S]*?<\/button>/)?.[0] ?? '';
    expect(button).toContain('type="button"');
    expect(button).toContain('aria-label="Copy command: /gsd-map-codebase"');
    expect(button).toContain('>Copy command<');
    expect(button).not.toContain('Copied');
    expect(html).toContain('data-copied="false"');
  });

  it('reads "Copied" with a Check icon and an sr-only status after a copy', () => {
    const html = render('/gsd-ingest-docs', true);
    const button = html.match(/<button[\s\S]*?<\/button>/)?.[0] ?? '';
    expect(button).toContain('>Copied<');
    expect(button).not.toContain('>Copy command<');
    expect(button).toContain('lucide-check');
    expect(button).toContain('aria-label="Copy command: /gsd-ingest-docs"');
    expect(html).toMatch(/<span class="sr-only" role="status">Command copied<\/span>/);
    expect(html).toContain('data-copied="true"');
  });

  it('leaves the status empty before a copy, and raises no toast in either state', () => {
    expect(render('/gsd-new-project', false)).toMatch(/<span class="sr-only" role="status"><\/span>/);
    for (const copied of [false, true]) expect(render('/gsd-new-project', copied)).not.toMatch(/toast|data-tone/i);
  });

  it('renders the command as text, not markup', () => {
    const html = render('<img src=x onerror=alert(1)>', false);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });
});

describe('copyCommandToClipboard', () => {
  it('copies exactly the command it was given, for each of the four constant steps', async () => {
    for (const step of NEXT_STEPS) {
      const written: string[] = [];
      const ok = await copyCommandToClipboard(step.command, async (text) => {
        written.push(text);
        return true;
      });
      expect(ok).toBe(true);
      expect(written).toEqual([step.command]);
    }
  });

  it('reports a refused clipboard as false and stays silent', async () => {
    expect(await copyCommandToClipboard('/gsd-new-project', async () => false)).toBe(false);
  });

  it('confirms for 1.5 seconds', () => {
    expect(COPIED_RESET_MS).toBe(1500);
  });
});

describe('copy-command.tsx source contract', () => {
  const read = async (): Promise<string> => await readFile(new URL('../../src/web/components/copy-command.tsx', import.meta.url), 'utf8');

  it('imports no api module and has no fetch, XMLHttpRequest, sendBeacon or WebSocket', async () => {
    const code = (await read()).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/from\s+['"][^'"]*\/api(\.ts)?['"]/);
    expect(code).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/);
    expect(code).not.toContain('dangerously' + 'SetInnerHTML');
  });

  it('reuses copyText from copy-path-button and raises no toast', async () => {
    const code = (await read()).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).toContain("from './copy-path-button.tsx'");
    expect(code).toMatch(/copyText\(/);
    expect(code).not.toMatch(/toast/i);
  });
});

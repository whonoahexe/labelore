// quick-261002-li5: the project-stylesheet token resolver and its bounded loader. resolveThemeTokens
// is the pure parser (light, dark, var chains, at-rule handling, hostile input); loadThemeTokens is
// the read-only lookup (components.json pointer, fixed candidates, caps, never throws).
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STUDIO_PORTAL_ROOT } from './helpers/studio-portal.ts';
import { InMemoryPlanningFilesystem } from '../src/planning-fs/in-memory-fs.ts';
import { LocalFsPlanningFilesystem } from '../src/planning-fs/local-fs.ts';
import type { PlanningFilesystem } from '../src/planning-fs/types.ts';
import { loadThemeTokens, resolveThemeTokens } from '../src/planning-repo/theme-tokens.ts';

const SRC = 'app/globals.css';

function resolve(css: string) {
  return resolveThemeTokens(css, SRC);
}

describe('resolveThemeTokens — light and dark', () => {
  it('reads light from :root and dark from .dark, dark inheriting the light values', () => {
    const t = resolve(':root { --a: #fff; --b: oklch(1 0 0); } .dark { --a: #000; }');
    expect(t?.source).toBe(SRC);
    expect(t?.light).toEqual({ '--a': '#fff', '--b': 'oklch(1 0 0)' });
    expect(t?.dark).toEqual({ '--a': '#000', '--b': 'oklch(1 0 0)' });
  });

  it('with no dark block the dark map is empty', () => {
    const t = resolve(':root { --a: #fff; }');
    expect(t?.light).toEqual({ '--a': '#fff' });
    expect(t?.dark).toEqual({});
  });

  it('returns null when nothing validates', () => {
    expect(resolve(':root { --radius: 0.5rem; }')).toBeNull();
    expect(resolve('')).toBeNull();
    expect(resolve('body { color: red }')).toBeNull();
  });

  it('merges repeated blocks, later declarations winning', () => {
    const t = resolve(':root { --a: #111; } .x { --a: #222; } :root { --a: #333; --b: #444; }');
    expect(t?.light).toEqual({ '--a': '#333', '--b': '#444' });
  });

  it('light selectors: :root, :host in a list, html, and :root inside @layer', () => {
    expect(resolve(':root, :host { --a: #fff }')?.light).toEqual({ '--a': '#fff' });
    expect(resolve('html { --a: #fff }')?.light).toEqual({ '--a': '#fff' });
    expect(resolve('@layer base { :root { --a: #fff } }')?.light).toEqual({ '--a': '#fff' });
  });

  it('does not read :root inside @supports or an ordinary @media', () => {
    expect(resolve('@supports (display: grid) { :root { --a: #fff } }')).toBeNull();
    expect(resolve('@media (min-width: 1px) { :root { --a: #fff } }')).toBeNull();
  });

  it('never reads @theme or @theme inline', () => {
    const t = resolve(
      '@theme inline { --color-card: var(--card); --font-sans: var(--font-sans); } @theme { --background: #000 } :root { --background: #fff; --card: #eee }',
    );
    expect(t?.light).toEqual({ '--background': '#fff', '--card': '#eee' });
    expect(Object.keys(t?.light ?? {}).some((k) => k.startsWith('--color-'))).toBe(false);
  });

  it('every dark selector variant feeds the dark map', () => {
    for (const selector of ['.dark', ':root.dark', 'html.dark', '[data-theme=dark]', '[data-theme="dark"]', ":root[data-theme='dark']"]) {
      const t = resolve(`:root { --a: #fff } ${selector} { --a: #000 }`);
      expect(t?.dark, selector).toEqual({ '--a': '#000' });
    }
  });

  it('@media (prefers-color-scheme: dark) :root feeds the dark map', () => {
    const t = resolve(':root { --a: #fff } @media (prefers-color-scheme: dark) { :root { --a: #000 } }');
    expect(t?.light).toEqual({ '--a': '#fff' });
    expect(t?.dark).toEqual({ '--a': '#000' });
  });

  it('ignores a descendant selector under .dark', () => {
    const t = resolve(':root { --a: #fff } .dark .moon-icon { --a: #000 }');
    expect(t?.dark).toEqual({});
  });

  it('a dark override that is a var() resolves against the dark map', () => {
    const t = resolve(':root { --a: #fff; --bg: var(--a) } .dark { --a: #000 }');
    expect(t?.dark['--bg']).toBe('#000');
    expect(t?.light['--bg']).toBe('#fff');
  });
});

describe('resolveThemeTokens — var() chains', () => {
  it('follows a chain, takes a fallback for a missing name, drops !important', () => {
    expect(resolve(':root { --a: var(--b); --b: var(--c); --c: #123 }')?.light['--a']).toBe('#123');
    expect(resolve(':root { --a: var(--missing, oklch(0.5 0 0)) }')?.light['--a']).toBe('oklch(0.5 0 0)');
    expect(resolve(':root { --a: var(--missing) }')).toBeNull();
    expect(resolve(':root { --a: #fff !important }')?.light['--a']).toBe('#fff');
  });

  it('a cycle yields no key and does not loop', () => {
    const t = resolve(':root { --a: var(--b); --b: var(--a); --ok: #fff; --self: var(--self) }');
    expect(t?.light).toEqual({ '--ok': '#fff' });
  });

  it('a 7-hop chain resolves and a 9-hop chain does not', () => {
    const chain = (hops: number): string => {
      const decls = [];
      for (let i = 0; i < hops; i++) decls.push(`--c${i}: var(--c${i + 1});`);
      return `:root { ${decls.join(' ')} --c${hops}: #abc }`;
    };
    expect(resolve(chain(7))?.light['--c0']).toBe('#abc');
    expect(resolve(chain(9))?.light['--c0']).toBeUndefined();
  });
});

describe('resolveThemeTokens — hostile and unsupported values', () => {
  it('rejects malicious values and keeps nothing of them', () => {
    const css = `:root {
      --a: url(javascript:alert(1));
      --b: expression(alert(1));
      --c: oklch(1 0 0) url(x);
      --d: hsl(0 0% 100%);
      --e: 0 0% 100%;
      --f: oklch(${'1 '.repeat(100)});
      --ok: #fff;
    }`;
    expect(resolve(css)?.light).toEqual({ '--ok': '#fff' });
  });

  it('a hostile value injected through a var() fallback is rejected', () => {
    expect(resolve(':root { --a: var(--x, url(javascript:alert(1))) }')).toBeNull();
  });

  it('a __proto__ token cannot pollute Object.prototype', () => {
    const t = resolve(':root { --__proto__: #fff; __proto__: #000; --ok: #123 }');
    expect(t?.light['--ok']).toBe('#123');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(t?.light)).toBe(Object.prototype);
    expect((Object.prototype as Record<string, unknown>)['#fff']).toBeUndefined();
  });

  it('caps the validated output at 256 entries per mode', () => {
    const decls = Array.from({ length: 600 }, (_, i) => `--t${i}: #fff;`).join('');
    expect(Object.keys(resolve(`:root { ${decls} }`)?.light ?? {}).length).toBeLessThanOrEqual(256);
  });
});

describe('resolveThemeTokens — walker robustness', () => {
  it('strips comments, including a commented-out block and an unterminated comment', () => {
    expect(resolve('/* :root { --a: #fff } */')).toBeNull();
    expect(resolve(':root { --a: #fff } /* never closed')?.light).toEqual({ '--a': '#fff' });
    expect(resolve(':root { /* note */ --a: /* inline */ #fff }')?.light).toEqual({ '--a': '#fff' });
  });

  it('a string containing braces does not desynchronise the walker', () => {
    const t = resolve('.x { content: "{" } :root { --a: #fff } .y { content: \'}\' }');
    expect(t?.light).toEqual({ '--a': '#fff' });
  });

  it('survives unbalanced braces, empty input and a large run of braces without hanging', () => {
    expect(resolve(':root { --a: #fff')?.light).toEqual({ '--a': '#fff' });
    expect(resolve('} } :root { --a: #fff }')?.light).toEqual({ '--a': '#fff' });
    const started = Date.now();
    expect(resolve('{'.repeat(600 * 1024))).toBeNull();
    expect(resolve('}'.repeat(600 * 1024))).toBeNull();
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('ignores blocks nested deeper than the depth cap', () => {
    const deep = `${'.a{'.repeat(40)}:root{--a:#fff}${'}'.repeat(40)}`;
    expect(resolve(deep)).toBeNull();
  });

  it('never throws on non-string input', () => {
    expect(resolveThemeTokens(undefined as unknown as string, SRC)).toBeNull();
  });
});

describe('loadThemeTokens', () => {
  const CSS = ':root { --a: #fff } .dark { --a: #000 }';

  it('follows components.json tailwind.css in a fixed directory', async () => {
    const fs = new InMemoryPlanningFilesystem({
      'frontend/components.json': '{"tailwind":{"css":"app/globals.css"}}',
      'frontend/app/globals.css': CSS,
    });
    const t = await loadThemeTokens(fs);
    expect(t?.source).toBe('frontend/app/globals.css');
    expect(t?.dark).toEqual({ '--a': '#000' });
  });

  it('a components.json pointer wins over a conventional candidate', async () => {
    const fs = new InMemoryPlanningFilesystem({
      'components.json': '{"tailwind":{"css":"./src/web/styles/globals.css"}}',
      'src/web/styles/globals.css': ':root { --a: #111 }',
      'app/globals.css': ':root { --a: #222 }',
    });
    const t = await loadThemeTokens(fs);
    expect(t?.source).toBe('src/web/styles/globals.css');
  });

  it('rejects pointers that could leave the directory and falls through to the candidates', async () => {
    for (const pointer of ['../secrets.css', '/etc/x.css', 'C:\\\\x.css', 'app/../../x.css', 'app/x.txt']) {
      const fs = new InMemoryPlanningFilesystem({
        'components.json': JSON.stringify({ tailwind: { css: pointer } }),
        '../secrets.css': ':root { --a: #f00 }',
        'etc/x.css': ':root { --a: #f00 }',
        'app/globals.css': CSS,
      });
      const t = await loadThemeTokens(fs);
      expect(t?.source, pointer).toBe('app/globals.css');
    }
  });

  it('ignores a malformed or oversized components.json', async () => {
    const malformed = new InMemoryPlanningFilesystem({ 'components.json': '{not json', 'app/globals.css': CSS });
    expect((await loadThemeTokens(malformed))?.source).toBe('app/globals.css');
    const padding = ' '.repeat(65 * 1024);
    const oversized = new InMemoryPlanningFilesystem({
      'components.json': `{"tailwind":{"css":"src/x.css"}}${padding}`,
      'src/x.css': ':root { --a: #111 }',
      'app/globals.css': CSS,
    });
    expect((await loadThemeTokens(oversized))?.source).toBe('app/globals.css');
  });

  it('skips a stylesheet over 512 KiB and uses the next candidate', async () => {
    const huge = `${':root { --a: #111 }'}${' '.repeat(513 * 1024)}`;
    const fs = new InMemoryPlanningFilesystem({ 'app/globals.css': huge, 'src/index.css': CSS });
    expect((await loadThemeTokens(fs))?.source).toBe('src/index.css');
  });

  it('a candidate with no valid token falls through to the next', async () => {
    const fs = new InMemoryPlanningFilesystem({ 'app/globals.css': 'body { margin: 0 }', 'src/index.css': CSS });
    expect((await loadThemeTokens(fs))?.source).toBe('src/index.css');
  });

  it('is null with nothing found', async () => {
    expect(await loadThemeTokens(new InMemoryPlanningFilesystem({ '.planning/STATE.md': '# s' }))).toBeNull();
  });

  it('never rejects, even when every read throws', async () => {
    const throwing: PlanningFilesystem = {
      capabilities: { watch: false, write: false },
      list: async () => {
        throw new Error('no');
      },
      read: async () => {
        throw new Error('no');
      },
      exists: async () => {
        throw new Error('no');
      },
    };
    expect(await loadThemeTokens(throwing)).toBeNull();
  });

  it('only reads: it never lists a directory', async () => {
    const reads: string[] = [];
    const inner = new InMemoryPlanningFilesystem({ 'app/globals.css': CSS });
    const spy: PlanningFilesystem = {
      capabilities: inner.capabilities,
      list: async () => {
        throw new Error('list called');
      },
      exists: (p) => inner.exists(p),
      read: (p) => {
        reads.push(p);
        return inner.read(p);
      },
    };
    expect((await loadThemeTokens(spy))?.source).toBe('app/globals.css');
    expect(reads.length).toBeLessThanOrEqual(20);
    expect(new Set(reads).size).toBe(reads.length);
  });
});

const SP_CSS = `${STUDIO_PORTAL_ROOT}/frontend/app/globals.css`;

describe.runIf(existsSync(SP_CSS))('loadThemeTokens — the real studio-portal stylesheet', () => {
  it('resolves its light and dark tokens through components.json', async () => {
    const t = await loadThemeTokens(new LocalFsPlanningFilesystem(STUDIO_PORTAL_ROOT));
    expect(t?.source).toBe('frontend/app/globals.css');
    expect(t?.light['--background']).toBe('oklch(1 0 0)');
    expect(t?.light['--primary']).toBe('oklch(0.553 0.195 38.402)');
    expect(t?.dark['--background']).toBe('oklch(0.145 0 0)');
    expect(t?.dark['--border']).toBe('oklch(1 0 0 / 10%)');
    expect(t?.dark['--destructive']).toBe('oklch(0.704 0.191 22.216)');
    expect(Object.keys(t?.light ?? {}).some((k) => k.startsWith('--color-'))).toBe(false);
    expect(Object.keys(t?.dark ?? {}).some((k) => k.startsWith('--color-'))).toBe(false);
  });
});

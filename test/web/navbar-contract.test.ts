// Source-text and unit contract suite for quick-260911-243 (navbar redesign: Strata mark, brand
// lockup, segmented tabs, snapshot status pill, ⌘K search dialog). Follows the same conventions
// as refresh-contract.test.ts (source() readFile helper) and visual-contract.test.ts (ruleBlocks()
// CSS rule extraction). Real-imports src/presentation/shell-header.ts, since tsconfig.server.json
// covers src/**/*.ts and test/**/*.ts but excludes src/web/**; every .tsx assertion here is a
// source-text contract instead. Built incrementally: Task 1 covers the mark/brand/tabs, Task 2
// extends it with the snapshot-status pill, Task 3 extends it with the search dialog.
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  formatProjectMeta,
  formatReadAt,
  formatRelativeReadAt,
  projectDisplayName,
} from '../../src/presentation/shell-header.ts';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

/** Extracts every top-level rule block whose selector line matches `selectorLine` exactly. Local
 * copy of visual-contract.test.ts's helper, kept in sync deliberately rather than shared, so
 * either file can evolve its own CSS pins independently. */
function ruleBlocks(css: string, selectorLine: string): string[] {
  const blocks: string[] = [];
  const lines = css.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== selectorLine) continue;
    const body: string[] = [];
    let cursor = index + 1;
    while (cursor < lines.length && lines[cursor].trim() !== '}') {
      body.push(lines[cursor]);
      cursor += 1;
    }
    blocks.push(body.join('\n'));
  }
  return blocks;
}

describe('shell-header helpers', () => {
  describe('projectDisplayName', () => {
    it('returns the explicit project name when present', () => {
      expect(projectDisplayName('Labelore', '/a/b')).toBe('Labelore');
    });

    it('falls back to the rootPath basename when name is null or whitespace-only', () => {
      expect(projectDisplayName(null, '/home/u/acme')).toBe('acme');
      expect(projectDisplayName('   ', '/home/u/acme/')).toBe('acme');
      expect(projectDisplayName(null, 'C:\\work\\acme')).toBe('acme');
      expect(projectDisplayName(null, '/home/u/acme/.planning')).toBe('acme');
    });

    it('falls back to "Planning intelligence" when name and rootPath are both empty', () => {
      expect(projectDisplayName(null, '')).toBe('Planning intelligence');
    });
  });

  describe('formatProjectMeta', () => {
    it('returns null for a null state', () => {
      expect(formatProjectMeta(null)).toBeNull();
    });

    it('builds the full meta line', () => {
      expect(
        formatProjectMeta({
          milestone: 'v3.0',
          phaseNumber: '1',
          progress: { totalPhases: 2, percent: 67 },
        }),
      ).toBe('v3.0 · Phase 1/2 · 67%');
    });

    it('drops leading zeros from the integer part of phaseNumber', () => {
      expect(
        formatProjectMeta({
          milestone: 'v1.0',
          phaseNumber: '04',
          progress: { totalPhases: 4, percent: null },
        }),
      ).toBe('v1.0 · Phase 4/4');
      expect(
        formatProjectMeta({
          milestone: 'v1.0',
          phaseNumber: '02.1',
          progress: { totalPhases: null, percent: null },
        }),
      ).toBe('v1.0 · Phase 2.1');
    });

    it('shows a non-numeric phaseNumber as-is', () => {
      expect(
        formatProjectMeta({
          milestone: 'v1.0',
          phaseNumber: 'alpha',
          progress: { totalPhases: null, percent: null },
        }),
      ).toBe('v1.0 · Phase alpha');
    });

    it('omits the total when totalPhases is null', () => {
      expect(
        formatProjectMeta({
          milestone: 'v1.0',
          phaseNumber: '3',
          progress: { totalPhases: null, percent: null },
        }),
      ).toBe('v1.0 · Phase 3');
    });

    it('omits the phase part entirely when phaseNumber is null', () => {
      expect(
        formatProjectMeta({
          milestone: 'v1.0',
          phaseNumber: null,
          progress: { totalPhases: 2, percent: 50 },
        }),
      ).toBe('v1.0 · 50%');
    });

    it('omits a null or non-finite percent, and rounds a fractional percent', () => {
      expect(
        formatProjectMeta({
          milestone: 'v1.0',
          phaseNumber: '1',
          progress: { totalPhases: 2, percent: null },
        }),
      ).toBe('v1.0 · Phase 1/2');
      expect(
        formatProjectMeta({
          milestone: 'v1.0',
          phaseNumber: '1',
          progress: { totalPhases: 2, percent: 66.6 },
        }),
      ).toBe('v1.0 · Phase 1/2 · 67%');
    });

    it('returns null when every part is missing, including a null or empty milestone', () => {
      expect(
        formatProjectMeta({
          milestone: null,
          phaseNumber: null,
          progress: { totalPhases: null, percent: null },
        }),
      ).toBeNull();
      expect(
        formatProjectMeta({
          milestone: '',
          phaseNumber: null,
          progress: { totalPhases: null, percent: null },
        }),
      ).toBeNull();
    });
  });

  describe('formatReadAt (moved unchanged from app-shell.tsx)', () => {
    it('returns the raw string for an invalid date', () => {
      expect(formatReadAt('not-a-date')).toBe('not-a-date');
    });

    it('returns toLocaleString() for a valid date', () => {
      const iso = '2026-01-01T00:00:00.000Z';
      expect(formatReadAt(iso)).toBe(new Date(iso).toLocaleString());
    });
  });

  describe('formatRelativeReadAt', () => {
    it('returns null for an unparseable readAt', () => {
      expect(formatRelativeReadAt('not-a-date', Date.now())).toBeNull();
    });

    it('returns "just now" under 60s, including future readAt from clock skew', () => {
      const now = Date.parse('2026-01-01T00:01:00.000Z');
      expect(formatRelativeReadAt('2026-01-01T00:00:30.000Z', now)).toBe('just now');
      expect(formatRelativeReadAt('2026-01-01T00:01:30.000Z', now)).toBe('just now');
    });

    it('returns floored {m}m ago under 60 minutes', () => {
      const now = Date.parse('2026-01-01T00:10:30.000Z');
      expect(formatRelativeReadAt('2026-01-01T00:00:00.000Z', now)).toBe('10m ago');
    });

    it('returns floored {h}h ago under 24 hours', () => {
      const now = Date.parse('2026-01-01T05:30:00.000Z');
      expect(formatRelativeReadAt('2026-01-01T00:00:00.000Z', now)).toBe('5h ago');
    });

    it('returns floored {d}d ago beyond 24 hours', () => {
      const now = Date.parse('2026-01-04T00:00:00.000Z');
      expect(formatRelativeReadAt('2026-01-01T00:00:00.000Z', now)).toBe('3d ago');
    });
  });
});

describe('Strata mark, brand lockup and tabs (D-01, D-02, NAV-01..03)', () => {
  const MARK_PATH = 'M3 3h5v18H3Z M10 10h5v5h-5Z M10 16h11v5H10Z';

  it('labelore-mark.tsx renders the exact Strata path with fill="currentColor"', async () => {
    const mark = await source('src/web/components/labelore-mark.tsx');
    expect(mark).toContain(MARK_PATH);
    expect(mark).toContain('fill="currentColor"');
  });

  it('favicon.svg carries the same path on the primary tile, with no rounded corners', async () => {
    const favicon = await source('public/favicon.svg');
    expect(favicon).toContain(MARK_PATH);
    expect(favicon).toContain('oklch(0.553 0.195 38.402)');
    expect(favicon).toContain('oklch(0.98 0.016 73.684)');
    expect(favicon).not.toMatch(/\brx=/);
  });

  it('app-shell.tsx renders LabeloreMark inside .brand-mark', async () => {
    const shell = await source('src/web/components/app-shell.tsx');
    expect(shell).toContain('<LabeloreMark');
    const brandMarkIndex = shell.indexOf('brand-mark');
    expect(brandMarkIndex).toBeGreaterThanOrEqual(0);
    const brandMarkBlock = shell.slice(brandMarkIndex, shell.indexOf('</span>', brandMarkIndex));
    expect(brandMarkBlock).toContain('<LabeloreMark');
  });

  it('sets the brand title from rootPath and an aria-label starting with Labelore', async () => {
    const shell = await source('src/web/components/app-shell.tsx');
    expect(shell).toMatch(/title=\{presentation\.data\?\.rootPath\}/);
    expect(shell).toMatch(/aria-label=\{`Labelore/);
  });

  it('renders formatProjectMeta fed from presentation.data.state', async () => {
    const shell = await source('src/web/components/app-shell.tsx');
    expect(shell).toMatch(/formatProjectMeta\(/);
  });

  it('renders exactly three NavLinks: Dashboard, Roadmap, Traceability, and no fourth tab (D-02)', async () => {
    const shell = await source('src/web/components/app-shell.tsx');
    const navLinkMatches = shell.match(/<NavLink className=\{navigationClass\}/g) ?? [];
    expect(navLinkMatches).toHaveLength(3);
    expect(shell).toContain('Dashboard');
    expect(shell).toContain('Roadmap');
    expect(shell).toContain('Traceability');
    expect(shell).not.toMatch(/>\s*Lore\s*</);
  });

  it('the active tab rule declares no background and references var(--primary)', async () => {
    const css = await source('src/web/styles/globals.css');
    const [block] = ruleBlocks(css, '.shell-nav-link.active {');
    expect(block).toBeDefined();
    expect(block).not.toMatch(/background:/);
    expect(block).toContain('var(--primary)');
  });
});

describe('brand raw-HTML guard (T-243-01)', () => {
  it('never injects corpus-derived markup into the DOM as raw HTML', async () => {
    const shell = await source('src/web/components/app-shell.tsx');
    expect(shell).not.toContain('dangerouslySetInnerHTML');
  });
});

describe('snapshot-status pill absorbs refresh-control (NAV-05)', () => {
  it('the old refresh-control module no longer exists', () => {
    expect(existsSync(new URL('../../src/web/components/refresh-control.tsx', import.meta.url))).toBe(
      false,
    );
  });

  it('no .tsx file under src/web imports refresh-control', async () => {
    async function collectTsxFiles(dirUrl: URL): Promise<string[]> {
      const entries = await readdir(dirUrl, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const entryUrl = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, dirUrl);
        if (entry.isDirectory()) {
          files.push(...(await collectTsxFiles(entryUrl)));
        } else if (entry.name.endsWith('.tsx')) {
          files.push(entryUrl.pathname);
        }
      }
      return files;
    }

    const files = await collectTsxFiles(new URL('../../src/web/', import.meta.url));
    for (const file of files) {
      const contents = await readFile(file, 'utf8');
      expect(contents, `${file} must not import refresh-control`).not.toMatch(/refresh-control/);
    }
  });

  it('snapshot-status.tsx contains className="snapshot-status" and the pill contract strings', async () => {
    const status = await source('src/web/components/snapshot-status.tsx');
    expect(status).toContain('className="snapshot-status"');
    expect(status).toContain('data-snapshot-read-at');
    expect(status).toContain('aria-label="Refresh the project snapshot"');
    expect(status).toContain('Refreshing…');
    expect(status).toContain('Snapshot read');
  });

  it('never injects corpus-derived markup into the DOM as raw HTML', async () => {
    const status = await source('src/web/components/snapshot-status.tsx');
    expect(status).not.toContain('dangerouslySetInnerHTML');
  });

  it('CSS: no rule anywhere sets display:none on a `.snapshot-` selector', async () => {
    const css = await source('src/web/styles/globals.css');
    const lines = css.split('\n');
    const snapshotSelectorLineIndexes: number[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      const trimmed = lines[index].trim();
      if (trimmed.includes('.snapshot-') && trimmed.endsWith('{')) {
        snapshotSelectorLineIndexes.push(index);
      }
    }
    expect(snapshotSelectorLineIndexes.length).toBeGreaterThan(0);
    for (const startIndex of snapshotSelectorLineIndexes) {
      let cursor = startIndex + 1;
      const body: string[] = [];
      while (cursor < lines.length && lines[cursor].trim() !== '}') {
        body.push(lines[cursor]);
        cursor += 1;
      }
      expect(body.join('\n')).not.toMatch(/display:\s*none;/);
    }
  });

  it('CSS: the refreshing dot uses loading-pulse, reduced-motion neutralises it, error uses destructive', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css).toMatch(
      /\[data-state='refreshing'\]\s*\.snapshot-dot\s*\{[^}]*animation:\s*loading-pulse/,
    );
    expect(css).toMatch(/\.snapshot-pill\[data-state='error'\]\s*\{[^}]*var\(--destructive\)/);
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[^{}]*\.snapshot-dot\s*\{[^}]*animation:\s*none/s,
    );
  });
});

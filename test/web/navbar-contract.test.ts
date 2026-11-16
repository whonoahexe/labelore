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
  isEditableTarget,
  isSearchShortcut,
  projectDisplayName,
  shortcutHintFor,
} from '../../src/presentation/shell-header.ts';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
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

  describe('isSearchShortcut', () => {
    it('is true for k/K with metaKey or ctrlKey and no other modifier', () => {
      expect(
        isSearchShortcut({ key: 'k', metaKey: true, ctrlKey: false, altKey: false, shiftKey: false }),
      ).toBe(true);
      expect(
        isSearchShortcut({ key: 'K', metaKey: false, ctrlKey: true, altKey: false, shiftKey: false }),
      ).toBe(true);
    });

    it('is false with altKey or shiftKey held', () => {
      expect(
        isSearchShortcut({ key: 'k', metaKey: true, ctrlKey: false, altKey: true, shiftKey: false }),
      ).toBe(false);
      expect(
        isSearchShortcut({ key: 'k', metaKey: true, ctrlKey: false, altKey: false, shiftKey: true }),
      ).toBe(false);
    });

    it('is false with no modifier, or for any other key', () => {
      expect(
        isSearchShortcut({ key: 'k', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false }),
      ).toBe(false);
      expect(
        isSearchShortcut({ key: 'p', metaKey: true, ctrlKey: false, altKey: false, shiftKey: false }),
      ).toBe(false);
    });
  });

  describe('shortcutHintFor', () => {
    it('returns ⌘K for Apple platforms', () => {
      expect(shortcutHintFor('MacIntel')).toBe('⌘K');
      expect(shortcutHintFor('iPhone')).toBe('⌘K');
      expect(shortcutHintFor('iPad')).toBe('⌘K');
    });

    it('returns Ctrl K for everything else', () => {
      expect(shortcutHintFor('Win32')).toBe('Ctrl K');
      expect(shortcutHintFor('Linux x86_64')).toBe('Ctrl K');
      expect(shortcutHintFor('')).toBe('Ctrl K');
    });
  });

  describe('isEditableTarget', () => {
    it('is true for INPUT, TEXTAREA and SELECT', () => {
      expect(isEditableTarget({ tagName: 'INPUT', isContentEditable: false })).toBe(true);
      expect(isEditableTarget({ tagName: 'TEXTAREA', isContentEditable: false })).toBe(true);
      expect(isEditableTarget({ tagName: 'SELECT', isContentEditable: false })).toBe(true);
    });

    it('is true when isContentEditable is true', () => {
      expect(isEditableTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    });

    it('is false for BUTTON, A, and null', () => {
      expect(isEditableTarget({ tagName: 'BUTTON', isContentEditable: false })).toBe(false);
      expect(isEditableTarget({ tagName: 'A', isContentEditable: false })).toBe(false);
      expect(isEditableTarget(null)).toBe(false);
    });
  });
});

describe('Strata mark, brand lockup and tabs (D-01, D-02, NAV-01..03)', () => {
  const MARK_PATH = 'M3 3h5v18H3Z M10 10h5v5h-5Z M10 16h11v5H10Z';

  it('favicon.svg carries the same path on the primary tile, with no rounded corners', async () => {
    const favicon = await source('public/favicon.svg');
    expect(favicon).toContain(MARK_PATH);
    expect(favicon).toContain('oklch(0.553 0.195 38.402)');
    expect(favicon).toContain('oklch(0.98 0.016 73.684)');
    expect(favicon).not.toMatch(/\brx=/);
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
});


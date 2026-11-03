// Phase 9 (09-10): the WINDOWS.md handler's growth - the length-aware fence scan and `structured.windows`.
// The original row and rowSource cases stay in test/handlers.test.ts; this file pins what 09-10 added.
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { WindowsHandler } from '../src/planning-repo/handlers/windows.ts';
import type { WindowsStructure } from '../src/planning-repo/handlers/windows.ts';
import { fxRead } from './helpers/fixture-project.ts';

const PATH = '.planning/WINDOWS.md';

function ref(): ArtifactRef {
  return {
    path: PATH,
    kind: 'windows',
    fileClass: 'text',
    sizeBytes: 0,
    location: 'root',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
}

function raw(content: string): RawArtifact {
  return { path: PATH, content, mtimeMs: 0, size: content.length };
}

function parse(content: string) {
  return WindowsHandler.parse(raw(content), ref());
}

function windowsOf(content: string): WindowsStructure {
  return parse(content).structured?.windows as WindowsStructure;
}

const TABLE = '| id | phase | kind | status |\n|---|---|---|---|\n| 1 | 01 | stub | open |\n';

describe('the windows fence scan', () => {
  const lendshed = fxRead('WINDOWS.md');

  it('keeps all six rows of a four-backtick fence and a description that holds three backticks', () => {
    const result = parse(lendshed);
    expect(result.warning).toBeUndefined();
    expect(result.structured?.rowSource).toBe('json');
    expect(result.structured?.rows).toHaveLength(6);
    const windows = windowsOf(lendshed);
    expect(windows.source).toBe('json');
    expect(windows.rows).toHaveLength(6);
    expect(windows.rows[1].description).toContain('```npm run test:auth```');
  });

  it('reads a three-backtick fence as before', () => {
    const content = `---\nopen_count: 1\n---\n\n\`\`\`json\n[{"id": 7, "phase": "02", "kind": "stub", "status": "open"}]\n\`\`\`\n`;
    const windows = windowsOf(content);
    expect(windows.source).toBe('json');
    expect(windows.rows.map((row) => row.id)).toEqual(['7']);
  });

  it('prefers the fenced JSON over the table when both are present', () => {
    const content = `${TABLE}\n\`\`\`\`json\n[{"id": 9, "phase": "04", "kind": "deviation", "status": "waived"}]\n\`\`\`\`\n`;
    const result = parse(content);
    expect(result.structured?.rowSource).toBe('json');
    const windows = windowsOf(content);
    expect(windows.source).toBe('json');
    expect(windows.rows).toHaveLength(1);
    expect(windows.rows[0]).toMatchObject({ id: '9', kind: 'deviation', status: 'waived' });
  });

  it('uses the table when the fence is missing', () => {
    const result = parse(TABLE);
    expect(result.structured?.rowSource).toBe('table');
    const windows = windowsOf(TABLE);
    expect(windows.source).toBe('table');
    expect(windows.rows[0]).toMatchObject({ id: '1', phase: '01', kind: 'stub', status: 'open' });
  });

  it('treats a fence that never closes as no fence, and still reads the table', () => {
    const content = `${TABLE}\n\`\`\`\`json\n[{"id": 9}]\n\`\`\`\n`;
    const result = parse(content);
    expect(result.structured?.rowSource).toBe('table');
    expect(windowsOf(content).source).toBe('table');
  });

  it('lets the table speak for an empty fence while rows and rowSource keep the fence', () => {
    const content = `${TABLE}\n\`\`\`json\n[]\n\`\`\`\n`;
    const result = parse(content);
    expect(result.structured?.rowSource).toBe('json');
    expect(result.structured?.rows).toEqual([]);
    expect(windowsOf(content).source).toBe('table');
  });
});

describe('structured.windows', () => {
  it('normalises a row: blank and "-" are null, a numeric phase is its digits, the line is a number', () => {
    const content = `\`\`\`json\n[{"id": 3, "phase": 2, "kind": "x", "file": "-", "line": "42", "description": "d", "status": "Waived", "reason": "", "recorded_at": "2026-01-01T00:00:00.000Z", "resolved_at": "-"}]\n\`\`\`\n`;
    expect(windowsOf(content).rows[0]).toEqual({
      id: '3',
      phase: '2',
      kind: 'x',
      file: null,
      line: 42,
      description: 'd',
      status: 'waived',
      statusRaw: 'Waived',
      reason: null,
      recordedAt: '2026-01-01T00:00:00.000Z',
      resolvedAt: null,
    });
  });

  it('keeps an unknown status verbatim as other', () => {
    const content = `\`\`\`json\n[{"id": 1, "status": "someday"}]\n\`\`\`\n`;
    expect(windowsOf(content).rows[0]).toMatchObject({ status: 'other', statusRaw: 'someday' });
  });

  it('reads the stated counts as numbers and a count it does not state as null', () => {
    const content = `---\nopen_count: 2\nwaived_count: not-a-number\nfixed_count: 4\n---\n\n${TABLE}`;
    expect(windowsOf(content).stated).toEqual({ open: 2, waived: null, fixed: 4, total: null });
  });

  it('reads the Lendshed counts and rows without merging them', () => {
    const windows = windowsOf(fxRead('WINDOWS.md'));
    expect(windows.stated).toEqual({ open: 2, waived: 2, fixed: 2, total: 6 });
    expect(windows.rows.map((row) => row.status)).toEqual(['open', 'fixed', 'waived', 'waived', 'open', 'fixed']);
    expect(windows.rows.map((row) => row.phase)).toEqual(['01', '01', '03', '03', 'quick/260402-t8m', 'quick/260402-t8m']);
  });

  it('a normaliser that throws keeps rows and rowSource and leaves windows off', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/frontmatter.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../src/planning-repo/frontmatter.ts')>();
      return {
        ...actual,
        tryParseFrontmatter: (content: string) => {
          const parsed = actual.tryParseFrontmatter(content);
          const data = new Proxy(parsed.data, {
            get(target, key, receiver) {
              if (key === 'open_count') throw new Error('planted');
              return Reflect.get(target, key, receiver);
            },
          });
          return { ...parsed, data };
        },
      };
    });
    try {
      const mod = await import('../src/planning-repo/handlers/windows.ts');
      const content = `---\nopen_count: 1\n---\n\n${TABLE}`;
      const result = mod.WindowsHandler.parse(raw(content), ref());
      expect(result.structured?.rowSource).toBe('table');
      expect(result.structured?.rows).toEqual([{ id: '1', phase: '01', kind: 'stub', status: 'open' }]);
      expect(result.structured?.windows).toBeUndefined();
    } finally {
      vi.doUnmock('../src/planning-repo/frontmatter.ts');
      vi.resetModules();
    }
  });
});

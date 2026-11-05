// Phase 10 (10-05, VIEW-13): the codebase-* handler. Every map document arrives with a stamp (when it was
// mapped, at which commit) and its sections in file order, each keyed by fuzzy heading match or left plain.
// Tidemark is the made-up map-only fixture; the lifts for Stack and Concerns are pinned in
// codebase-lift.test.ts and the growth proofs sit at the end of this file.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { CodebaseHandler } from '../src/planning-repo/handlers/codebase.ts';
import { extractCodebase, readMapStamp } from '../src/planning-repo/handlers/codebase-lift.ts';
import type { CodebaseBody } from '../src/planning-repo/handlers/codebase-lift.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { GenericMarkdownHandler } from '../src/planning-repo/handlers/generic.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';

const TIDEMARK = new URL('./fixtures/tidemark/.planning/codebase/', import.meta.url);

function tidemark(name: string): string {
  return readFileSync(new URL(name, TIDEMARK), 'utf8');
}

function ref(doc: string): ArtifactRef {
  return {
    path: `.planning/codebase/${doc.toUpperCase()}.md`,
    kind: `codebase-${doc}`,
    fileClass: 'text',
    sizeBytes: 0,
    location: 'other',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
}

function raw(content: string, doc: string): RawArtifact {
  return { path: `.planning/codebase/${doc.toUpperCase()}.md`, content, mtimeMs: 0, size: content.length };
}

function parse(doc: string, content: string = tidemark(`${doc.toUpperCase()}.md`)) {
  return CodebaseHandler.parse(raw(content, doc), ref(doc));
}

function codebaseOf(doc: string, content?: string): CodebaseBody {
  return parse(doc, content).structured?.codebase as CodebaseBody;
}

describe('CodebaseHandler', () => {
  it('claims every codebase-* ref ahead of the generic handler, and nothing else', () => {
    for (const doc of ['stack', 'architecture', 'structure', 'conventions', 'testing', 'integrations', 'concerns']) {
      expect(CodebaseHandler.match(ref(doc))).toBe(true);
      expect(HANDLERS.find((h) => h.match(ref(doc)))).toBe(CodebaseHandler);
    }
    expect(CodebaseHandler.match({ ...ref('stack'), kind: 'requirements' })).toBe(false);
    expect(CodebaseHandler.match({ ...ref('stack'), kind: 'research' })).toBe(false);
    expect(HANDLERS[HANDLERS.length - 1]).toBe(GenericMarkdownHandler);
    expect(HANDLERS.indexOf(CodebaseHandler)).toBeLessThan(HANDLERS.indexOf(GenericMarkdownHandler));
  });

  it('carries the document name (the kind without the codebase- prefix)', () => {
    expect(codebaseOf('stack').doc).toBe('stack');
    expect(codebaseOf('concerns').doc).toBe('concerns');
  });

  it('keeps the title, body and frontmatter when the lift throws', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/codebase-lift.ts', () => ({
      extractCodebase: () => {
        throw new Error('boom');
      },
    }));
    const { CodebaseHandler: Guarded } = await import('../src/planning-repo/handlers/codebase.ts');
    const result = Guarded.parse(
      raw('---\nlast_mapped_at: 2026-10-28\n---\n# A map\n\n## Languages\n\nBody text.\n', 'stack'),
      ref('stack'),
    );
    expect(result.title).toBe('A map');
    expect(result.body).toContain('Body text.');
    expect(result.frontmatter.last_mapped_at).toBeDefined();
    expect(result.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/codebase-lift.ts');
  });

  it('keeps the title and body of an unreadable-frontmatter file and still lifts sections', () => {
    const result = parse('stack', '---\nkey: [unclosed\n---\n# Technology Stack\n\n## Languages\n\n- Go 1.22 - tool\n');
    expect(result.warning?.stage).toBe('frontmatter');
    expect(result.title).toBe('Technology Stack');
    expect((result.structured?.codebase as CodebaseBody).sections.map((s) => s.heading)).toContain('Languages');
  });
});

describe('the sections of a map document', () => {
  it('keeps Tidemark ARCHITECTURE in file order, with API Architecture plain (key null)', () => {
    const { sections } = codebaseOf('architecture');
    expect(sections.map((s) => [s.level, s.heading, s.key])).toEqual([
      [2, 'System Overview', 'system-overview'],
      [2, 'Component Responsibilities', 'component-responsibilities'],
      [2, 'Pattern Overview', 'pattern-overview'],
      [2, 'API Architecture', null],
      [2, 'Data Flow', 'data-flow'],
      [3, 'Primary Request Path', null],
      [3, 'Tide Refresh', null],
      [2, 'Key Abstractions', 'key-abstractions'],
      [2, 'Entry Points', 'entry-points'],
      [2, 'Anti-Patterns', 'anti-patterns'],
      [3, 'Reading the database from a route', null],
      [3, 'Hard-coded depth in the board', null],
      [2, 'Error Handling', 'error-handling'],
    ]);
  });

  it('does not start a section at the ## line inside the fenced diagram', () => {
    const headings = codebaseOf('architecture').sections.map((s) => s.heading);
    expect(headings).not.toContain('the three route groups above share one process');
  });

  it('reads Languages & Runtimes as the Languages section', () => {
    const { sections } = codebaseOf('stack');
    expect(sections[0]).toEqual({ heading: 'Languages & Runtimes', level: 2, key: 'languages' });
    expect(sections.map((s) => s.key)).toEqual([
      'languages',
      'frameworks',
      'key-dependencies',
      'configuration',
      'platform-requirements',
    ]);
  });

  it('gives the second heading that matches an already-taken key no key (it stays a plain section)', () => {
    const body = '# Testing\n\n## Test Types\n\nA\n\n## Test Types Summary\n\nB\n\n## Mocking\n';
    expect(codebaseOf('testing', body).sections.map((s) => s.key)).toEqual(['test-types', null, 'mocking']);
  });

  it('does not let a short added heading hijack a longer known key', () => {
    const body = '# Conventions\n\n## Naming of Presentation Concepts\n\n## Naming Patterns\n';
    expect(codebaseOf('conventions', body).sections.map((s) => s.key)).toEqual([null, 'naming-patterns']);
  });

  it('keys by heading text, never position, and keeps keys per document', () => {
    const concerns = codebaseOf('concerns', '# C\n\n## Security Considerations\n\n## Tech Debt\n');
    expect(concerns.sections.map((s) => s.key)).toEqual(['security-considerations', 'tech-debt']);
    expect(codebaseOf('conventions', '# C\n\n## Error Handling\n').sections[0].key).toBe('error-handling');
    expect(codebaseOf('architecture', '# C\n\n## Error Handling\n').sections[0].key).toBe('error-handling');
    expect(codebaseOf('stack', '# C\n\n## Error Handling\n').sections[0].key).toBeNull();
  });

  it('tolerates a leading emoji or number, an ampersand, a plural and an added word', () => {
    const body = [
      '# Integrations',
      '',
      '## 1. APIs and External Services',
      '## 🔌 Data Storages',
      '## Authentication and Identity',
      '## Monitoring & Observability Setup',
      '## CI/CD & Deployment',
      '## Environment Configuration',
      '## Webhooks and Callback',
    ].join('\n');
    expect(codebaseOf('integrations', body).sections.map((s) => s.key)).toEqual([
      'external-services',
      'data-storage',
      'authentication',
      'monitoring',
      'ci-cd',
      'environment-configuration',
      'webhooks',
    ]);
  });

  it('looks keys up in Maps, so a heading such as constructor matches nothing', () => {
    const body = '# S\n\n## constructor\n\n## __proto__\n\n## toString\n\n## hasOwnProperty\n';
    expect(codebaseOf('stack', body).sections.map((s) => s.key)).toEqual([null, null, null, null]);
  });

  it('gives an unknown document name no keys at all, but still lists its sections', () => {
    const result = CodebaseHandler.parse(raw('# X\n\n## Languages\n', 'other'), ref('other'));
    expect((result.structured?.codebase as CodebaseBody).sections).toEqual([
      { heading: 'Languages', level: 2, key: null },
    ]);
  });

  it('never ships a variable value in structured.codebase; since 10-14 the lift names the variable (the name only)', () => {
    const json = JSON.stringify(parse('integrations').structured);
    expect(json).not.toContain('PLACEHOLDER-NOT-A-REAL-KEY');
    expect(json).toContain('TIDEMARK_TIDE_FEED_KEY');
  });
});

describe('the stamp', () => {
  it('reads Tidemark STACK: 2026-10-28 and a seven-character commit', () => {
    const { stamp } = codebaseOf('stack');
    expect(stamp.mappedAt).toBe('2026-10-28');
    expect(stamp.commit).toBe('c4e91ab');
    expect(stamp.source).toBe('frontmatter');
  });

  it('reads the newest Tidemark date from ARCHITECTURE, whose refreshed comment agrees', () => {
    expect(codebaseOf('architecture').stamp.mappedAt).toBe('2026-10-30');
  });

  it('takes the stamp of Tidemark CONVENTIONS from **Analysis Date:** and shows no commit', () => {
    const { stamp } = codebaseOf('conventions');
    expect(stamp).toEqual({ mappedAt: '2026-10-27', commit: null, source: 'analysis-date' });
  });

  it('falls back to *Last updated:*, then to a refreshed comment, then to nothing', () => {
    expect(readMapStamp({}, '# X\n\n---\n\n*Last updated: 2026-09-01*\n')).toEqual({
      mappedAt: '2026-09-01',
      commit: null,
      source: 'last-updated',
    });
    expect(readMapStamp({}, '<!-- refreshed: 2026-08-02 -->\n# X\n')).toEqual({
      mappedAt: '2026-08-02',
      commit: null,
      source: 'refreshed',
    });
    expect(readMapStamp({}, '# X\n\nNo dates at all.\n')).toEqual({ mappedAt: null, commit: null, source: null });
  });

  it('prefers **Analysis Date:** over *Last updated:* over a refreshed comment', () => {
    const body = '<!-- refreshed: 2026-01-01 -->\n# X\n\n**Analysis Date:** 2026-03-03\n\n*Last updated: 2026-02-02*\n';
    expect(readMapStamp({}, body).mappedAt).toBe('2026-03-03');
    expect(readMapStamp({}, body.replace('**Analysis Date:** 2026-03-03', '')).mappedAt).toBe('2026-02-02');
  });

  it('invents nothing from an unreadable date', () => {
    expect(readMapStamp({ last_mapped_at: 'someday' }, '').mappedAt).toBeNull();
    expect(readMapStamp({ last_mapped_at: 42 }, '').mappedAt).toBeNull();
    expect(readMapStamp({ last_mapped_at: new Date('not a date') }, '').mappedAt).toBeNull();
    expect(readMapStamp({}, '**Analysis Date:** the other day\n').mappedAt).toBeNull();
    expect(readMapStamp({}, '**Analysis Date:** 2026-13-45\n').mappedAt).toBeNull();
  });

  it('takes the first ten characters of a string date', () => {
    expect(readMapStamp({ last_mapped_at: '2026-10-28T23:59:00Z' }, '').mappedAt).toBe('2026-10-28');
  });

  it('shows a commit only when it is a string of at least seven characters, first seven shown', () => {
    expect(readMapStamp({ last_mapped_commit: 'abcdef1234567890' }, '').commit).toBe('abcdef1');
    expect(readMapStamp({ last_mapped_commit: 'abcdef' }, '').commit).toBeNull();
    // An unquoted all-digit scalar reaches the handler as a number: treated as no commit (RESEARCH A9).
    expect(readMapStamp({ last_mapped_commit: 1234567 }, '').commit).toBeNull();
    expect(readMapStamp({ last_mapped_commit: null }, '').commit).toBeNull();
  });

  it('gives a frontmatter commit of 1234567 (unquoted) no commit through the handler', () => {
    const body = '---\nlast_mapped_commit: 1234567\nlast_mapped_at: 2026-10-28\n---\n# S\n';
    const { stamp } = codebaseOf('stack', body);
    expect(stamp.commit).toBeNull();
    expect(stamp.mappedAt).toBe('2026-10-28');
  });

  describe.each(['America/Los_Angeles', 'Pacific/Honolulu', 'Asia/Kolkata', 'Pacific/Kiritimati'])(
    'a Date at UTC midnight in TZ=%s',
    (zone) => {
      const original = process.env.TZ;
      afterEach(() => {
        if (original === undefined) delete process.env.TZ;
        else process.env.TZ = original;
      });

      it('names the same calendar day', () => {
        process.env.TZ = zone;
        const stamp = readMapStamp({ last_mapped_at: new Date(Date.UTC(2026, 9, 28)) }, '');
        expect(stamp.mappedAt).toBe('2026-10-28');
        const viaYaml = codebaseOf('stack', '---\nlast_mapped_at: 2026-10-28\n---\n# S\n');
        expect(viaYaml.stamp.mappedAt).toBe('2026-10-28');
      });
    },
  );
});

describe('the snapshot', () => {
  it('carries structured.codebase for every Tidemark map document', () => {
    for (const doc of ['stack', 'architecture', 'structure', 'conventions', 'testing', 'integrations', 'concerns']) {
      const body = codebaseOf(doc);
      expect(body.doc).toBe(doc);
      expect(body.sections.length).toBeGreaterThan(0);
    }
  });
});

// T-10-08: author text of any size costs a bounded, linear scan. Inputs come from make(n) (n counts
// characters) and stay below the 250,000-character body cap (the caps-are-not-growth rule in
// test/helpers/growth.ts), so the ratio measures the scan and not the cap.
describe('growth', () => {
  const TIMEOUT = 60_000;
  const BELOW_CAP = 240_000;
  type Shape = [name: string, doc: string, make: (n: number) => string];
  const SHAPES: Shape[] = [
    ['10,000 stack bullets', 'stack', (n) => `## Frameworks\n\n${'- Tool 1.0 - a note\n'.repeat(Math.ceil(n / 19))}`],
    [
      '10,000 concern bullets',
      'concerns',
      (n) => `## Fragile Areas\n\n${'- one more fragile thing\n'.repeat(Math.ceil(n / 25))}`,
    ],
    [
      'bold-label concern groups',
      'concerns',
      (n) => `## Tech Debt\n\n${'**Group:**\n- Issue: a\n\n'.repeat(Math.ceil(n / 25))}`,
    ],
    ['2,000 headings', 'concerns', (n) => Array.from({ length: Math.ceil(n / 12) }, (_, i) => `## H${i}\n\n`).join('')],
    ['one 200k-character line', 'stack', (n) => `## Languages\n\n- ${'word '.repeat(Math.ceil(n / 5))}\n`],
    ['a 200k run of capitals', 'concerns', (n) => `## Tech Debt\n\n${'A'.repeat(n)}\n`],
    ['a 200k run of capitals in a heading', 'stack', (n) => `## ${'A'.repeat(n)}\n`],
    [
      'a 200k-character fenced System Overview',
      'architecture',
      (n) => `## System Overview\n\n\`\`\`text\n${'x'.repeat(n)}\n\`\`\`\n`,
    ],
    [
      'a Component Responsibilities table of rows',
      'architecture',
      (n) => `## Component Responsibilities\n\n| A | B |\n|---|---|\n${'| 1 | 2 |\n'.repeat(Math.ceil(n / 10))}`,
    ],
    [
      'many anti-pattern entries',
      'architecture',
      (n) => `## Anti-Patterns\n\n${'### E\n\n**What happens:** a\n**Do this instead:** b\n\n'.repeat(Math.ceil(n / 45))}`,
    ],
    [
      'a table of rows',
      'concerns',
      (n) => `## Scaling Limits\n\n| A | B |\n|---|---|\n${'| 1 | 2 |\n'.repeat(Math.ceil(n / 10))}`,
    ],
  ];
  for (const [name, doc, make] of SHAPES) {
    it(`stays linear on ${name}`, { timeout: TIMEOUT }, () => {
      const growth = measureGrowth({ make, run: (body) => void extractCodebase(doc, {}, body), maxSize: BELOW_CAP });
      expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
    });
  }
});

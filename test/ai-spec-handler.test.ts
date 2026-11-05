// Phase 10 (10-18, VIEW-11): the AI-SPEC.md handler and extractor. It reads the system type, framework, version,
// stakes and lock-in fields, the Dimensions table and the checklist count into `structured.aiSpec`, on the made-up
// Lendshed AI specs (04 half filled, 02 GSD's real template body) (VIEW-21).
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { AiSpecHandler, extractAiSpec } from '../src/planning-repo/handlers/ai-spec.ts';
import type { AiSpecBody } from '../src/planning-repo/handlers/ai-spec.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { GenericMarkdownHandler } from '../src/planning-repo/handlers/generic.ts';
import { fxRead } from './helpers/fixture-project.ts';

const PATH = '.planning/phases/04-bulk-loan-export/04-AI-SPEC.md';

function ref(path: string = PATH): ArtifactRef {
  return {
    path,
    kind: 'ai-spec',
    fileClass: 'text',
    sizeBytes: 0,
    location: 'phase',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
}

function raw(content: string, path: string = PATH): RawArtifact {
  return { path, content, mtimeMs: 0, size: content.length };
}

const HALF = fxRead('phases/04-bulk-loan-export/04-AI-SPEC.md');
const TEMPLATE = fxRead('phases/02-roles-and-permissions/02-AI-SPEC.md');

describe('AiSpecHandler', () => {
  it('claims an AI-SPEC ref ahead of the generic handler, and no SPEC or UI-SPEC', () => {
    expect(AiSpecHandler.match(ref())).toBe(true);
    expect(AiSpecHandler.match(ref('.planning/phases/04-bulk-loan-export/04-SPEC.md'))).toBe(false);
    expect(AiSpecHandler.match(ref('.planning/phases/04-bulk-loan-export/04-UI-SPEC.md'))).toBe(false);
    expect(AiSpecHandler.match(ref('.planning/phases/04-bulk-loan-export/04-CONTEXT.md'))).toBe(false);
    expect(HANDLERS.find((h) => h.match(ref()))).toBe(AiSpecHandler);
    expect(HANDLERS.indexOf(AiSpecHandler)).toBeLessThan(HANDLERS.indexOf(GenericMarkdownHandler));
    expect(HANDLERS[HANDLERS.length - 1]).toBe(GenericMarkdownHandler);
  });

  it('carries the title, the body and the reading in structured.aiSpec', () => {
    const result = AiSpecHandler.parse(raw(HALF), ref());
    expect(result.title).toBe('AI-SPEC — Phase 4: Bulk Loan Export');
    expect(result.body).toContain('## 1. System Classification');
    expect((result.structured?.aiSpec as AiSpecBody).checklist).toEqual({ done: 6, total: 16 });
  });

  it('keeps the title, body and frontmatter when the extractor throws', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/fenced-sections.ts', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../src/planning-repo/handlers/fenced-sections.ts')>()),
      scanFencedLines: () => {
        throw new Error('boom');
      },
    }));
    const { AiSpecHandler: Guarded } = await import('../src/planning-repo/handlers/ai-spec.ts');
    const result = Guarded.parse(raw('---\nstatus: kept\n---\n\n# An AI spec\n\nBody text.\n'), ref());
    expect(result.title).toBe('An AI spec');
    expect(result.body).toContain('Body text.');
    expect(result.frontmatter.status).toBe('kept');
    expect(result.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/fenced-sections.ts');
  });
});

describe('extractAiSpec - 04-AI-SPEC (half filled)', () => {
  const spec = extractAiSpec(HALF);

  it('reads the system type, framework, version, stakes and lock-in', () => {
    expect(spec.systemType).toBe('Content Generation');
    expect(spec.framework).toBe('Notewright');
    expect(spec.version).toBe('2.3.1');
    expect(spec.stakes).toBe('Medium');
    expect(spec.vendorLockIn).toMatch(/^Partial — the model host is configurable/);
  });

  it('reads the four dimensions of the Dimensions table with their measurement and priority', () => {
    expect(spec.dimensions.map((d) => d.name)).toEqual([
      'Totals match',
      'No member names',
      'Neutral tone',
      'Usable as sent',
    ]);
    expect(spec.dimensions.map((d) => [d.measurement, d.priority])).toEqual([
      ['Code', 'Critical'],
      ['Code', 'Critical'],
      ['LLM Judge', 'Medium'],
      ['Human', 'High'],
    ]);
    expect(spec.dimensions[0].rubric).toBe('Pass when every figure equals the batch total');
  });

  it('counts 6 of 16 checklist items done', () => {
    expect(spec.checklist).toEqual({ done: 6, total: 16 });
  });

  it('lists the nine numbered sections in file order, and not the Checklist', () => {
    expect(spec.sections.map((s) => s.number)).toEqual(['1', '1b', '2', '3', '4', '4b', '5', '6', '7']);
    expect(spec.sections[0].heading).toBe('1. System Classification');
  });
});

describe('extractAiSpec - 02-AI-SPEC (the template body)', () => {
  const spec = extractAiSpec(TEMPLATE);

  it('reads no field, no dimension and no checklist item as done', () => {
    expect(spec.systemType).toBeNull();
    expect(spec.framework).toBeNull();
    expect(spec.version).toBeNull();
    expect(spec.stakes).toBeNull();
    expect(spec.vendorLockIn).toBeNull();
    expect(spec.dimensions).toEqual([]);
    expect(spec.checklist).toEqual({ done: 0, total: 16 });
  });

  it('lists the same nine numbered sections', () => {
    expect(spec.sections.map((s) => s.number)).toEqual(['1', '1b', '2', '3', '4', '4b', '5', '6', '7']);
  });
});

describe('extractAiSpec - tolerance', () => {
  it('reads an empty body and a body with none of the template headings as nothing', () => {
    for (const body of ['', '# Notes\n\nSome words.\n\n## Ideas\n\n- one\n']) {
      const spec = extractAiSpec(body);
      expect(spec.sections).toEqual([]);
      expect(spec.dimensions).toEqual([]);
      expect(spec.checklist).toEqual({ done: 0, total: 0 });
      expect(spec.systemType).toBeNull();
    }
  });

  it('ignores a heading or a label that sits inside a code fence', () => {
    const spec = extractAiSpec(
      '## 1. System\n\n```md\n**System Type:** Fenced\n## 2. Fake\n```\n\n**System Type:** Real\n',
    );
    expect(spec.systemType).toBe('Real');
    expect(spec.sections.map((s) => s.number)).toEqual(['1']);
  });

  it('reads a label whose colon is outside the bold, and a lower-case label', () => {
    const spec = extractAiSpec('## 1. System\n\n**system type**: RAG\n');
    expect(spec.systemType).toBe('RAG');
  });
});

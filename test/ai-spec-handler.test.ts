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
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';

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
    expect((result.structured?.aiSpec as AiSpecBody).checklist).toMatchObject({ done: 6, total: 16 });
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

  it('counts 6 of 16 checklist items done, each item keeping its own place', () => {
    expect(spec.checklist).toMatchObject({ done: 6, total: 16 });
    expect(spec.checklist.items).toEqual([
      true, true, true, true, false, true, true, false,
      false, false, false, false, false, false, false, false,
    ]);
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
    expect(spec.checklist).toMatchObject({ done: 0, total: 16 });
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
      expect(spec.checklist).toMatchObject({ done: 0, total: 0 });
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

// ---------------------------------------------------------------------------
// The unfilled-slot rule (10-18, Task 2)
// ---------------------------------------------------------------------------

function slotsOf(body: string): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const section of extractAiSpec(body).sections) out[section.number] = section.slot;
  return out;
}

describe('the unfilled-slot rule - GSD template body and the half-filled file', () => {
  it('02-AI-SPEC (the template body): every numbered section is a slot with nothing written', () => {
    const { sections } = extractAiSpec(TEMPLATE);
    expect(sections).toHaveLength(9);
    for (const section of sections) {
      expect(section.slot, section.heading).toBe(true);
      expect(section.written, section.heading).toBe(0);
    }
  });

  it('04-AI-SPEC: exactly sections 4b, 6 and 7 are slots', () => {
    const { sections } = extractAiSpec(HALF);
    expect(sections.filter((s) => s.slot).map((s) => s.number)).toEqual(['4b', '6', '7']);
    for (const section of sections.filter((s) => !s.slot)) {
      expect(section.written, section.heading).toBeGreaterThan(0);
    }
  });

  it('never lists the Checklist as a section, so it is never a slot', () => {
    expect(extractAiSpec(TEMPLATE).sections.map((s) => s.heading.toLowerCase())).not.toContain(
      'checklist',
    );
  });
});

describe('the unfilled-slot rule - what is scaffolding', () => {
  it('a section of only a blockquote, a bare ### heading and an empty numbered list is a slot', () => {
    expect(slotsOf('## 1. A\n\n> Researched by someone.\n\n### Sub heading\n\n1.\n2.\n3.\n')).toEqual({
      '1': true,
    });
  });

  it('the same section with one sentence of prose is filled', () => {
    const spec = extractAiSpec(
      '## 1. A\n\n> Researched by someone.\n\n### Sub heading\n\nOne real sentence.\n\n1.\n',
    );
    expect(spec.sections[0].slot).toBe(false);
    expect(spec.sections[0].written).toBe(1);
  });

  it('a bold label alone is scaffolding and the same label with a value is not', () => {
    expect(slotsOf('## 1. A\n\n**System Type:**\n\n**Description:** <!-- hint -->\n')).toEqual({
      '1': true,
    });
    expect(slotsOf('## 1. A\n\n**System Type:** RAG\n')).toEqual({ '1': false });
  });

  it('a bare list marker, an HTML comment and a horizontal rule are scaffolding', () => {
    expect(slotsOf('## 1. A\n\n-\n*\n<!-- a comment -->\n\n---\n')).toEqual({ '1': true });
  });

  it('table header and separator rows and rows whose cells are all empty are scaffolding', () => {
    expect(
      slotsOf('## 6. G\n\n| A | B |\n|---|---|\n| | |\n| <!-- e.g. --> | <!-- hint --> |\n'),
    ).toEqual({ '6': true });
  });

  it('a table row with a cell of text is content', () => {
    expect(slotsOf('## 6. G\n\n| A | B |\n|---|---|\n| Name | |\n')).toEqual({ '6': false });
  });

  it("the template's own option rows (Block / Escalate / Flag, Code / LLM Judge / Human) are scaffolding", () => {
    expect(
      slotsOf(
        '## 6. G\n\n| Guardrail | Trigger | Intervention |\n|---|---|---|\n| | | Block / Escalate / Flag |\n',
      ),
    ).toEqual({ '6': true });
    expect(
      slotsOf(
        '## 5. E\n\n| D | R | M | P |\n|---|---|---|---|\n| | | Code / LLM Judge / Human | Critical / High / Medium |\n',
      ),
    ).toEqual({ '5': true });
  });

  it("a fenced block of only '#' or '//' comment lines is scaffolding; one line of code is content", () => {
    expect(
      slotsOf('## 3. F\n\n```bash\n# Install command(s)\n```\n\n```ts\n// Key imports\n\n```\n'),
    ).toEqual({ '3': true });
    expect(slotsOf('## 3. F\n\n```bash\n# Install\nnpm install thing\n```\n')).toEqual({ '3': false });
  });

  it('a heading line inside a fence does not start a section', () => {
    const spec = extractAiSpec('## 1. A\n\n```md\n## 2. Fake\nreal line\n```\n');
    expect(spec.sections.map((s) => s.number)).toEqual(['1']);
    expect(spec.sections[0].slot).toBe(false);
  });

  it('a section holding only its heading is a slot', () => {
    expect(slotsOf('## 1. A\n\n## 2. B\n\nWords.\n')).toEqual({ '1': true, '2': false });
  });
});

describe('the unfilled-slot rule - an unterminated HTML comment', () => {
  it('makes the rest of its own section a slot, not the rest of the file', () => {
    expect(
      slotsOf('## 1. A\n\n<!-- never closed\nFilled-looking words\n\n## 2. B\n\nReal prose.\n'),
    ).toEqual({ '1': true, '2': false });
  });

  it('a comment closed on a later line hides only what is inside it', () => {
    expect(slotsOf('## 1. A\n\n<!-- first\nsecond -->\nAfter the comment.\n')).toEqual({ '1': false });
    expect(slotsOf('## 1. A\n\n<!-- first\nsecond -->\n')).toEqual({ '1': true });
  });

  it('reads a field value written after a comment closes on the same line', () => {
    const spec = extractAiSpec('## 1. A\n\n**System Type:** <!-- RAG | Agent --> RAG\n');
    expect(spec.systemType).toBe('RAG');
  });
});

describe('the unfilled-slot rule - stays linear (T-10-31)', () => {
  it('in a body of thousands of sections', () => {
    const growth = measureGrowth({
      make: (n: number) =>
        Array.from({ length: n }, (_, i) => `## ${i + 1}. S\n\nWords.\n`).join('\n'),
      run: (body: string) => {
        extractAiSpec(body);
      },
      startSize: 625,
      maxSize: 5_000,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });

  it('in one 200,000-character comment', () => {
    const growth = measureGrowth({
      make: (n: number) => `## 1. A\n\n<!-- ${'x'.repeat(n)} -->\n`,
      run: (body: string) => {
        extractAiSpec(body);
      },
      startSize: 5_000,
      maxSize: 200_000,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });

  it('in 10,000 table rows', () => {
    const growth = measureGrowth({
      make: (n: number) => `## 5. E\n\n| A | B |\n|---|---|\n${'| a | b |\n'.repeat(n)}`,
      run: (body: string) => {
        extractAiSpec(body);
      },
      startSize: 1_250,
      maxSize: 10_000,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });

  it('over many comments opened on one line', () => {
    const growth = measureGrowth({
      make: (n: number) => `## 1. A\n\n${'<!-- a -->'.repeat(n)}\n`,
      run: (body: string) => {
        extractAiSpec(body);
      },
      startSize: 3_000,
      maxSize: 20_000,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });
});

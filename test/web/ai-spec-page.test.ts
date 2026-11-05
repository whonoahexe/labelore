// Phase 10 (10-18, VIEW-11): the AI spec composer and the static markup of its page, on the made-up Lendshed AI specs
// (04 half filled, 02 GSD's real template body). The first screen says what the system is (type, framework and
// version, stakes, lock-in), how it will be judged (the dimensions placed by priority and measurement) and how far the
// checklist has got.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { composeAiSpec } from '../../src/web/views/ai-spec-page.ts';
import type { ComposedAiSpec } from '../../src/web/views/ai-spec-page.ts';
import {
  AiSpecView,
  aiSpecHeaderProps,
  splitAiSpecTitle,
} from '../../src/web/views/ai-spec-page-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { AiSpecHandler } from '../../src/planning-repo/handlers/ai-spec.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import { fxRead } from '../helpers/fixture-project.ts';

const HALF = fxRead('phases/04-bulk-loan-export/04-AI-SPEC.md');
const TEMPLATE = fxRead('phases/02-roles-and-permissions/02-AI-SPEC.md');

function ref(path: string): ArtifactRef {
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

/** The page's section groups, the way the renderer makes them: one per `##` heading, the heading and what follows. */
function groupsOf(content: string): NonNullable<ViewInput['groups']> {
  const groups: NonNullable<ViewInput['groups']> = [];
  let current: { heading: string; lines: string[] } | null = null;
  for (const line of content.split('\n')) {
    if (line.startsWith('## ')) {
      if (current) groups.push(toGroup(current, groups.length));
      current = { heading: line.slice(3).trim(), lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) groups.push(toGroup(current, groups.length));
  return groups;
}

function toGroup(g: { heading: string; lines: string[] }, index: number) {
  return { id: `g-${index}`, heading: g.heading, html: `<h2>${g.heading}</h2><p>${g.lines.slice(1).join(' ').trim()}</p>` };
}

function inputOf(aiSpec: unknown, groups: ViewInput['groups'] = []): ViewInput {
  return {
    kind: 'ai-spec',
    frontmatter: {},
    structured: aiSpec === undefined ? {} : { aiSpec },
    groups,
    planSegments: [],
  };
}

/** The handler's reading of a file, composed the way the page does. */
function composeFile(content: string, path = '.planning/phases/04-x/04-AI-SPEC.md'): ComposedAiSpec | null {
  const raw: RawArtifact = { path, content, mtimeMs: 0, size: content.length };
  const parsed = AiSpecHandler.parse(raw, ref(path));
  return composeAiSpec(inputOf(parsed.structured?.aiSpec, groupsOf(content)));
}

const renderHtml = (html: string) => createElement('section', { 'data-plain': 'true' }, `HTML:${html}`);

function markup(model: ComposedAiSpec): string {
  return renderToStaticMarkup(
    createElement(AiSpecView, { model, renderHtml, onShowSource: () => undefined }),
  );
}

describe('composeAiSpec - 04-AI-SPEC, half filled', () => {
  const model = composeFile(HALF)!;

  it('composes the four datasheet cells', () => {
    expect(model.cells.map((c) => [c.label, c.value])).toEqual([
      ['System type', 'Content Generation'],
      ['Framework', 'Notewright'],
      ['Stakes level', 'Medium'],
      ['Vendor lock-in', 'Partial'],
    ]);
    expect(model.cells[1].note).toBe('2.3.1');
    expect(model.cells[1].noteKind).toBe('version');
    expect(model.cells[3].note).toMatch(/^the model host is configurable/);
    expect(model.cells[3].noteKind).toBe('reason');
  });

  it('says "6 of 16 checklist items done" as the meter sentence', () => {
    expect(model.progress).toEqual({ label: '6 of 16 checklist items done', done: 6, total: 16 });
  });

  it('places the four dimensions in the measurement by priority grid', () => {
    expect(model.dimensions.map((d) => d.name)).toEqual([
      'Totals match',
      'No member names',
      'Neutral tone',
      'Usable as sent',
    ]);
    const at = (priority: string, measurement: string) =>
      model.matrix!.cells.find((c) => c.priority === priority && c.measurement === measurement)!.dimensions;
    expect(at('Critical', 'Code')).toEqual([0, 1]);
    expect(at('Medium', 'LLM Judge')).toEqual([2]);
    expect(at('High', 'Human')).toEqual([3]);
    expect(model.matrix!.unplaced).toEqual([]);
  });

  it('has one strip square per numbered section and one row per section group in file order', () => {
    expect(model.strip.map((s) => s.number)).toEqual(['1', '1b', '2', '3', '4', '4b', '5', '6', '7']);
    expect(model.rows.map((r) => r.heading)).toEqual([
      '1. System Classification',
      '1b. Domain Context',
      '2. Framework Decision',
      '3. Framework Quick Reference',
      '4. Implementation Guidance',
      '4b. AI Systems Best Practices',
      '5. Evaluation Strategy',
      '6. Guardrails',
      '7. Production Monitoring',
      'Checklist',
    ]);
  });
});

describe('composeAiSpec - nothing to shape', () => {
  it('returns null with no projection, and for a record with nothing in it', () => {
    expect(composeAiSpec(inputOf(undefined))).toBeNull();
    expect(composeAiSpec(inputOf('text'))).toBeNull();
    expect(composeAiSpec(inputOf({}))).toBeNull();
  });

  it('falls through silently for an AI spec using none of the template headings', () => {
    expect(composeFile('# Notes\n\nSome words.\n\n## Ideas\n\n- one\n')).toBeNull();
  });
});

describe('composeAiSpec - dimensions the grid has no place for', () => {
  it('lists them after the grid, never drops them', () => {
    const model = composeAiSpec(
      inputOf({
        dimensions: [
          { name: 'Latency', rubric: 'under 2s', measurement: 'Synthetic probe', priority: 'Low' },
          { name: 'Facts', rubric: 'right', measurement: 'Code + LLM Judge', priority: 'High - always' },
        ],
        checklist: { done: 0, total: 0 },
        sections: [],
      }),
    )!;
    expect(model.matrix!.unplaced).toEqual([0]);
    const cell = model.matrix!.cells.find((c) => c.priority === 'High' && c.measurement === 'Code')!;
    expect(cell.dimensions).toEqual([1]);
  });
});

describe('AiSpecView - the first screen', () => {
  const model = composeFile(HALF)!;
  const out = markup(model);

  it('writes the four cell labels and values, and the version in mono', () => {
    for (const label of ['System type', 'Framework', 'Stakes level', 'Vendor lock-in']) {
      expect(out).toContain(label);
    }
    expect(out).toContain('Content Generation');
    expect(out).toContain('Notewright');
    expect(out).toContain('Version <code>2.3.1</code>');
  });

  it('draws the checklist meter once with its one sentence', () => {
    expect(out).toContain('aria-label="6 of 16 checklist items done"');
    expect(out.split('status-meter-sq').length - 1).toBe(16);
    expect(out).toContain('data-size="large"');
  });

  it('draws the dimension chips in the grid with the grid headings', () => {
    for (const word of ['Priority', 'Code', 'LLM Judge', 'Human', 'Critical', 'High', 'Medium']) {
      expect(out).toContain(word);
    }
    expect(out).toContain('Totals match');
    expect(out).toContain('4 · placed by measurement and priority');
  });
});

describe('aiSpecHeaderProps', () => {
  it('moves the phase to the eyebrow and drops the document kind from the h1', () => {
    const props = aiSpecHeaderProps(composeFile(HALF)!, 'AI-SPEC — Phase 4: Bulk Loan Export');
    expect(props.eyebrow).toBe('Phase 4 · AI spec');
    expect(props.title).toBe('Bulk Loan Export');
    expect(props.lead).toBeNull();
  });

  it('keeps a title that does not read that way whole under the plain eyebrow', () => {
    expect(splitAiSpecTitle('AI-SPEC — Phase {N}: {phase_name}')).toEqual({
      phase: null,
      title: 'AI-SPEC — Phase {N}: {phase_name}',
    });
    expect(splitAiSpecTitle('Some other title')).toEqual({ phase: null, title: 'Some other title' });
    expect(aiSpecHeaderProps(composeFile(HALF)!, 'Some other title').eyebrow).toBe('AI spec');
  });

  it('reads a dotted phase number and a plain hyphen after AI-SPEC', () => {
    expect(splitAiSpecTitle('AI-SPEC - Phase 10.1: Late Work')).toEqual({ phase: 'Phase 10.1', title: 'Late Work' });
  });
});

describe('composeAiSpec - 02-AI-SPEC, the template body', () => {
  const model = composeFile(TEMPLATE)!;

  it('reads every cell as unfilled and no dimension', () => {
    expect(model.cells.every((c) => c.value === null)).toBe(true);
    expect(model.dimensions).toEqual([]);
    expect(model.matrix).toBeNull();
    expect(model.progress).toEqual({ label: '0 of 16 checklist items done', done: 0, total: 16 });
  });
});

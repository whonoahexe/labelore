// quick-260929-3x3: composeResearchBriefing, built from literal ViewInput objects and from the real
// LB v1.0/02 extraction (test/research-briefing.test.ts covers the server extractor; the narrow
// e2e spec covers the two composed end to end). This is the composer-level smoke test.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { tryParseFrontmatter } from '../../src/planning-repo/frontmatter.ts';
import { extractResearchBriefing } from '../../src/planning-repo/handlers/research-briefing.ts';
import type { ResearchBriefing } from '../../src/planning-repo/handlers/research-briefing.ts';
import {
  composeResearchBriefing,
  levelTone,
  normalizeHeading,
  splitSourceLinks,
  tidyConfidenceText,
} from '../../src/web/views/research-briefing.ts';
import type { ComposedResearchBriefing } from '../../src/web/views/research-briefing.ts';
import { NA_AUDIT, SP02_SHAPE, SYNTHETIC_SLOP } from '../helpers/research-fixtures.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import type { DocumentSectionGroup } from '../../src/web/views/document-sections.ts';

const LB02 = new URL(
  '../../.planning/milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-RESEARCH.md',
  import.meta.url,
);

function inputOf(briefing: unknown, overrides: Partial<ViewInput> = {}): ViewInput {
  return {
    kind: 'research',
    frontmatter: {},
    structured: { briefing },
    groups: [],
    planSegments: [],
    ...overrides,
  };
}

function groupsOf(briefing: ResearchBriefing): DocumentSectionGroup[] {
  return briefing.sections.map((s) => ({
    id: s.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    heading: s.heading,
    html: 'x',
  }));
}

function lb02(): ResearchBriefing {
  return extractResearchBriefing(tryParseFrontmatter(readFileSync(LB02, 'utf8')).body);
}

function minimal(meta: Partial<ResearchBriefing['meta']> = {}): ResearchBriefing {
  const empty = extractResearchBriefing('## Summary\n\nOne lead.\n');
  return { ...empty, meta: { ...empty.meta, ...meta } };
}

describe('composeResearchBriefing', () => {
  it('returns null for an absent or malformed structured.briefing', () => {
    expect(composeResearchBriefing(inputOf(undefined))).toBeNull();
    expect(composeResearchBriefing(inputOf('nope'))).toBeNull();
    expect(composeResearchBriefing(inputOf({ meta: {} }))).toBeNull();
    expect(composeResearchBriefing(inputOf({ meta: {}, sections: 'x' }))).toBeNull();
  });

  it('returns null when there is neither a summary nor any claimed chapter', () => {
    const empty = extractResearchBriefing('## Code Examples\n\ntext\n');
    expect(composeResearchBriefing(inputOf(empty))).toBeNull();
  });

  it('eyebrow: zero-padded phase, quick task id, or plain Research', () => {
    expect(composeResearchBriefing(inputOf(minimal({ phase: '2' })))?.intro.eyebrow).toBe('Research · Phase 02');
    expect(composeResearchBriefing(inputOf(minimal({ phase: '2.1' })))?.intro.eyebrow).toBe(
      'Research · Phase 02.1',
    );
    expect(composeResearchBriefing(inputOf(minimal({ quickId: '260910-jz8' })))?.intro.eyebrow).toBe(
      'Research · Quick task 260910-jz8',
    );
    expect(composeResearchBriefing(inputOf(minimal()))?.intro.eyebrow).toBe('Research');
  });

  it('confidence tone and label', () => {
    const tone = (level: string | null) =>
      composeResearchBriefing(
        inputOf(minimal({ confidence: { raw: 'x', level: level as never } })),
      )?.intro.confidence;
    expect(tone('HIGH')).toMatchObject({ tone: 'complete', label: 'High' });
    expect(tone('MEDIUM-HIGH')).toMatchObject({ tone: 'complete', label: 'Medium-high' });
    expect(tone('MEDIUM')).toMatchObject({ tone: 'in-flight' });
    expect(tone('MIXED')).toMatchObject({ tone: 'in-flight', label: 'Mixed' });
    expect(tone('MEDIUM-LOW')).toMatchObject({ tone: 'missing' });
    expect(tone('LOW')).toMatchObject({ tone: 'missing' });
    expect(tone(null)).toMatchObject({ tone: 'quiet' });
    expect(levelTone(undefined)).toBe('quiet');
  });

  it('LB v1.0/02: cover facts, summary lead, recommendation and outline', () => {
    const briefing = lb02();
    const composed = composeResearchBriefing(inputOf(briefing, { groups: groupsOf(briefing) }));
    expect(composed).not.toBeNull();
    expect(composed?.intro.eyebrow).toBe('Research · Phase 02');
    expect(composed?.intro.title).toBe('Situational Awareness & Artifact Reading');
    expect(composed?.intro.researched).toBe('Aug 25, 2026');
    expect(composed?.intro.confidence?.label).toBe('Mixed');
    expect(composed?.intro.confidence?.rows).toHaveLength(5);
    expect(composed?.intro.confidence?.rows[4]).toMatchObject({ label: 'Medium-low', tone: 'missing' });
    expect(composed?.intro.validUntilShort).toBe('2026-09-01');
    expect(composed?.intro.domain).toContain('Local read-only React dashboard');
    expect(composed?.summary?.lead.startsWith('Phase 2 should be planned')).toBe(true);
    expect(composed?.summary?.rest).toHaveLength(2);
    expect(composed?.summary?.recommendation?.startsWith('Build one reusable')).toBe(true);
    expect(composed?.outline[0]).toEqual({ id: 'research-summary', label: 'Summary' });
    expect(composed?.outline.at(-1)).toEqual({ id: 'research-source-only', label: 'In the source only' });
  });

  it('every sourceOnly entry resolves its targetId against groups (h2) or headings (depth 3), else null', () => {
    const briefing = lb02();
    const composed = composeResearchBriefing(
      inputOf(briefing, {
        groups: [
          { id: 'code-examples', heading: 'Code Examples', html: 'x' },
          { id: 'standard-stack', heading: 'Standard Stack', html: 'x' },
        ],
        headings: [{ id: 'h3-x', text: 'Something', depth: 3 }],
      }),
    );
    const byLabel = new Map(composed?.sourceOnly.map((e) => [e.label, e.targetId]));
    expect(byLabel.get('Code Examples')).toBe('code-examples');
    // Installation is a labelled block inside Standard Stack: it falls back to the parent group.
    expect(byLabel.get('Installation')).toBe('standard-stack');
    expect(byLabel.get('Security Domain')).toBeNull();
  });

  it('a Parent › Child entry resolves to the ### heading, then to its parent', () => {
    const empty = extractResearchBriefing(
      '## Summary\n\nLead.\n\n## Architecture Patterns\n\n### Pattern 1: A\n\n**What:** x\n\n### Odd Extra\n\ntext\n',
    );
    const composed = composeResearchBriefing(
      inputOf(empty, {
        groups: [{ id: 'architecture-patterns', heading: 'Architecture Patterns', html: 'x' }],
        headings: [{ id: 'odd-extra', text: 'Odd Extra', depth: 3 }],
      }),
    );
    expect(composed?.sourceOnly.find((e) => e.label.endsWith('Odd Extra'))?.targetId).toBe('odd-extra');
    const fallback = composeResearchBriefing(
      inputOf(empty, { groups: [{ id: 'architecture-patterns', heading: 'Architecture Patterns', html: 'x' }] }),
    );
    expect(fallback?.sourceOnly.find((e) => e.label.endsWith('Odd Extra'))?.targetId).toBe(
      'architecture-patterns',
    );
  });

  it('contextUrl comes from the sibling artifact whose kind is context, else null', () => {
    const briefing = minimal();
    expect(composeResearchBriefing(inputOf(briefing))?.contextUrl).toBeNull();
    const withContext = composeResearchBriefing(
      inputOf(briefing, {
        siblingArtifacts: [
          { kind: 'plan', path: 'a', url: '/a' },
          { kind: 'context', path: 'b', url: '/milestones/x/phases/y/artifacts/b' },
        ],
      }),
    );
    expect(withContext?.contextUrl).toBe('/milestones/x/phases/y/artifacts/b');
  });

  it('normalizeHeading strips emphasis and collapses whitespace', () => {
    expect(normalizeHeading('  **Don\'t**   `Hand`-Roll ')).toBe("don't hand-roll");
  });
});

describe('composeResearchBriefing — the Architecture chapter', () => {
  it('LB v1.0/02: diagram, tree, patterns, anti-patterns, hand-roll and the key insight', () => {
    const briefing = lb02();
    const composed = composeResearchBriefing(inputOf(briefing, { groups: groupsOf(briefing) }));
    const architecture = composed?.chapters.find((c) => c.kind === 'architecture');
    expect(architecture).toBeDefined();
    if (!architecture || architecture.kind !== 'architecture') return;
    expect(architecture.id).toBe('research-architecture');
    expect(architecture.number).toBe('02');
    expect(architecture.diagram?.lifted).toBe(true);
    expect(architecture.diagram?.text).toContain('CLI project path');
    expect(architecture.structure?.isTree).toBe(true);
    expect(architecture.patterns).toHaveLength(8);
    expect(architecture.antiPatterns).toHaveLength(9);
    expect(architecture.handRoll?.rows).toHaveLength(8);
    expect(architecture.handRoll?.insight?.startsWith('The only justified custom parsers')).toBe(true);
    expect(composed?.outline.some((entry) => entry.id === 'research-architecture')).toBe(true);
  });

  it('a diagram that is not a rectangle or connector flow stays a plain framed figure', () => {
    const briefing = extractResearchBriefing(
      '## Architecture Patterns\n\n### System Architecture Diagram\n\n```\nJust some words\non two lines\n```\n',
    );
    const composed = composeResearchBriefing(inputOf(briefing));
    const chapter = composed?.chapters[0];
    expect(chapter?.kind === 'architecture' && chapter.diagram?.lifted).toBe(false);
  });

  it('a structure without three tree-prefixed lines is not a tree', () => {
    const briefing = extractResearchBriefing(
      '## Architecture Patterns\n\n### Recommended Project Structure\n\n```\nsrc/\n└── guide.md\n```\n',
    );
    const chapter = composeResearchBriefing(inputOf(briefing))?.chapters[0];
    expect(chapter?.kind === 'architecture' && chapter.structure?.isTree).toBe(false);
  });

  it('a pattern with more than What/When links its ### heading; one without does not', () => {
    const briefing = extractResearchBriefing(
      '## Architecture Patterns\n\n### Pattern 1: Big\n\n**What:** a\n\n**When to use:** b\n\n**Planner test:** c\n\n### Pattern 2: Small\n\n**What:** a\n\n**When to use:** b\n',
    );
    const composed = composeResearchBriefing(
      inputOf(briefing, {
        headings: [
          { id: 'pattern-1-big', text: 'Pattern 1: Big', depth: 3 },
          { id: 'pattern-2-small', text: 'Pattern 2: Small', depth: 3 },
        ],
      }),
    );
    const chapter = composed?.chapters[0];
    if (!chapter || chapter.kind !== 'architecture') throw new Error('expected an architecture chapter');
    expect(chapter.patterns.map((p) => p.sourceTarget)).toEqual(['pattern-1-big', null]);
  });

  it('a chapter with no parts is omitted', () => {
    const briefing = extractResearchBriefing('## Summary\n\nLead.\n\n## Architecture Patterns\n\n### Odd Extra\n\ntext\n');
    expect(composeResearchBriefing(inputOf(briefing))?.chapters).toEqual([]);
  });
});

function composeFrom(body: string, overrides: Partial<ViewInput> = {}): ComposedResearchBriefing {
  const composed = composeResearchBriefing(inputOf(extractResearchBriefing(body), overrides));
  if (!composed) throw new Error('expected a composed briefing');
  return composed;
}

function chapterOf<K extends ComposedResearchBriefing['chapters'][number]['kind']>(
  composed: ComposedResearchBriefing,
  kind: K,
): Extract<ComposedResearchBriefing['chapters'][number], { kind: K }> {
  const chapter = composed.chapters.find((c) => c.kind === kind);
  if (!chapter) throw new Error(`no ${kind} chapter`);
  return chapter as Extract<ComposedResearchBriefing['chapters'][number], { kind: K }>;
}

describe('composeResearchBriefing — chapters and numbering', () => {
  it('LB v1.0/02: stack 01, architecture 02, pitfalls 03, questions 04, environment 05, sources 06', () => {
    const composed = composeResearchBriefing(inputOf(lb02()));
    expect(composed?.chapters.map((c) => [c.kind, c.number])).toEqual([
      ['stack', '01'],
      ['architecture', '02'],
      ['pitfalls', '03'],
      ['questions', '04'],
      ['environment', '05'],
      ['sources', '06'],
    ]);
  });

  it('the jz8 quick RESEARCH (no architecture, questions or environment) renumbers with no gaps', () => {
    const body = tryParseFrontmatter(
      readFileSync(
        new URL(
          '../../.planning/milestones/v1.1-quick/260910-jz8-centralize-spacing-type-and-color-tokens/260910-jz8-RESEARCH.md',
          import.meta.url,
        ),
        'utf8',
      ),
    ).body;
    const composed = composeFrom(body);
    expect(composed.chapters.map((c) => [c.kind, c.number])).toEqual([
      ['stack', '01'],
      ['pitfalls', '02'],
      ['sources', '03'],
    ]);
  });
});

describe('composeResearchBriefing — stack, alternatives and lanes', () => {
  it('LB v1.0/02: SUS badges, verdict chips and the lane counts', () => {
    const composed = composeResearchBriefing(inputOf(lb02()));
    if (!composed) throw new Error('null');
    const stack = chapterOf(composed, 'stack');
    expect(stack.groups[0].packages[0].badges).toEqual([{ label: 'SUS', tone: 'in-flight' }]);
    expect(stack.groups[0].label).toBe('Core');
    expect(stack.alternatives.map((a) => [a.verdictLabel, a.tone, a.struck])).toEqual([
      ['rejected', 'quiet', true],
      ['rejected', 'quiet', true],
      ['rejected', 'quiet', true],
      ['rejected', 'quiet', true],
      ['rejected', 'quiet', true],
    ]);
    const lanes = stack.audit?.lanes;
    expect(lanes?.slop.count).toBe(0);
    expect(lanes?.sus.count).toBe(12);
    expect(lanes?.ok.count).toBe(18);
    expect(lanes?.ok.items.filter((i) => i.dashed)).toHaveLength(0);
  });

  it('SP02_SHAPE: alternative verdict chips, pinned / host-binary badges, dashed approvals', () => {
    const stack = chapterOf(composeFrom(SP02_SHAPE), 'stack');
    expect(stack.alternatives.map((a) => a.verdictLabel)).toEqual([
      'viable alternative',
      'rejected',
      'do not use',
      'rejected',
      'rejected',
      'later phase',
    ]);
    expect(stack.alternatives[2].tone).toBe('missing');
    expect(stack.alternatives[5].tone).toBe('in-flight');
    const labels = stack.groups[0].packages.flatMap((p) => p.badges.map((b) => b.label));
    expect(labels).toEqual(expect.arrayContaining(['already pinned', 'host binary']));
    expect(stack.audit?.lanes?.sus.count).toBe(0);
    expect(stack.audit?.lanes?.ok.count).toBe(4);
    expect(stack.audit?.lanes?.ok.items.filter((i) => i.dashed)).toHaveLength(4);
    expect(stack.audit?.extraNotes).toHaveLength(2);
  });

  it('SYNTHETIC_SLOP: one removed item, bad signals flagged, replacement kept', () => {
    const stack = chapterOf(composeFrom(`## Standard Stack\n\n### Core\n\n| Library | Version | Purpose | Why Standard |\n|---|---|---|---|\n| left-pad | 1 | pad | ok |\n\n${SYNTHETIC_SLOP}`), 'stack');
    const removed = stack.audit?.lanes?.slop.items ?? [];
    expect(removed).toHaveLength(1);
    expect(removed[0].name).toBe('left-pad-ng');
    const bad = Object.fromEntries(removed[0].signals.map((sig) => [sig.label, sig.bad]));
    expect(bad).toMatchObject({ age: true, downloads: true, repo: true });
    expect(removed[0].signals.find((sig) => sig.label === 'rule')?.value).toBe('slop-name');
    expect(removed[0].replacement).toBe('`left-pad`');
  });

  it('a Not applicable audit renders its prose lines and no lanes', () => {
    const stack = chapterOf(composeFrom(`## Standard Stack\n\n### Core\n\n| Library | Version | Purpose | Why Standard |\n|---|---|---|---|\n| a | 1 | b | c |\n\n${NA_AUDIT}`), 'stack');
    expect(stack.audit?.lanes).toBeNull();
    expect(stack.audit?.prose).toHaveLength(3);
  });
});

describe('composeResearchBriefing — pitfalls, questions, environment, sources', () => {
  it('pitfall chips: severity tone, then code; the What goes wrong row is the visible one', () => {
    const pitfalls = chapterOf(composeFrom(SP02_SHAPE), 'pitfalls').pitfalls;
    expect(pitfalls[0].number).toBe('01');
    expect(pitfalls[0].chips).toEqual([
      { label: 'critical', tone: 'missing' },
      { label: 'F1', tone: 'quiet' },
    ]);
    expect(pitfalls[3].chips[0]).toEqual({ label: 'high', tone: 'in-flight' });
    expect(pitfalls[5].chips[0]).toEqual({ label: 'medium', tone: 'quiet' });
    expect(pitfalls[0].visible?.label).toBe('What goes wrong');
    expect(pitfalls[0].more.length).toBeGreaterThan(0);
  });

  it('question chips: resolved is quiet, open is in-flight', () => {
    const lb = chapterOf(composeResearchBriefing(inputOf(lb02())) as ComposedResearchBriefing, 'questions');
    expect(lb.items.every((i) => i.chip.tone === 'quiet' && i.chip.label === 'resolved')).toBe(true);
    const sp = chapterOf(composeFrom(SP02_SHAPE), 'questions');
    expect(sp.items.every((i) => i.chip.tone === 'in-flight' && i.chip.label === 'open')).toBe(true);
    expect(sp.items[0].number).toBe('Q1');
  });

  it('environment: a blocking fallback keeps its remaining text', () => {
    const environment = chapterOf(composeFrom(SP02_SHAPE), 'environment');
    const blocking = environment.rows.filter((r) => r.blocking);
    expect(blocking).toHaveLength(3);
    expect(blocking[0].fallbackRest.startsWith('The grant is a new artifact')).toBe(true);
  });

  it('sources: the collapsed summary reads the tier counts', () => {
    const composed = composeResearchBriefing(inputOf(lb02())) as ComposedResearchBriefing;
    expect(chapterOf(composed, 'sources').summary).toBe('Primary 5 · Secondary 12 · Tertiary 1');
  });

  it('splitSourceLinks links only http(s) URLs', () => {
    expect(splitSourceLinks('see https://vite.dev/guide.html.')).toEqual([
      { type: 'text', text: 'see ' },
      { type: 'link', label: 'https://vite.dev/guide.html', href: 'https://vite.dev/guide.html' },
      { type: 'text', text: '.' },
    ]);
    expect(splitSourceLinks('[docs](https://a.dev/x) and more')).toEqual([
      { type: 'link', label: 'docs', href: 'https://a.dev/x' },
      { type: 'text', text: ' and more' },
    ]);
    const unsafe = splitSourceLinks('[x](javascript:alert(1)) ftp://host/file');
    expect(unsafe.every((part) => part.type === 'text')).toBe(true);
  });
});

describe('composeResearchBriefing — At a glance and back matter', () => {
  it('LB v1.0/02 glance: stack 21 with 12 flagged SUS, pitfalls 9, questions 0/3, environment gaps 2', () => {
    const composed = composeResearchBriefing(inputOf(lb02())) as ComposedResearchBriefing;
    expect(composed.glance).toEqual([
      { targetId: 'research-stack', label: 'Stack entries · 12 flagged SUS', value: '21', sub: null },
      { targetId: 'research-pitfalls', label: 'Pitfalls', value: '9', sub: null },
      { targetId: 'research-questions', label: 'Open questions', value: '0', sub: '/3' },
      { targetId: 'research-environment', label: 'Environment gaps', value: '2', sub: null },
    ]);
  });

  it('SP02_SHAPE glance: the severity split and the blocking suffix', () => {
    const glance = composeFrom(SP02_SHAPE).glance;
    expect(glance.find((r) => r.targetId === 'research-pitfalls')?.label).toBe(
      'Pitfalls · 3 critical, 2 high, 3 medium',
    );
    expect(glance.find((r) => r.targetId === 'research-environment')).toMatchObject({
      label: 'Environment gaps · 3 blocking',
      value: '4',
    });
    expect(glance.find((r) => r.targetId === 'research-stack')?.label).toBe('Stack entries');
  });

  it('a glance row whose chapter is absent is omitted', () => {
    expect(composeFrom('## Summary\n\nLead.\n').glance).toEqual([]);
    const onlyStack = composeFrom(
      '## Standard Stack\n\n### Core\n\n| Library | Version | Purpose | Why Standard |\n|---|---|---|---|\n| a | 1 | b | c |\n',
    );
    expect(onlyStack.glance.map((r) => r.targetId)).toEqual(['research-stack']);
  });

  it('LB v1.0/02 back matter, with decision ids linking into CONTEXT when it exists', () => {
    const composed = composeResearchBriefing(
      inputOf(lb02(), {
        siblingArtifacts: [{ kind: 'context', path: '.planning/x/02-CONTEXT.md', url: '/ctx' }],
      }),
    ) as ComposedResearchBriefing;
    const [constraints, requirements, map] = composed.backMatter;
    expect(constraints.summary).toBe('17 locked · 4 discretion · 1 deferred');
    if (constraints.kind !== 'constraints') throw new Error('kind');
    expect(constraints.groups[0].ids[0]).toEqual({ id: 'D-01', href: '/ctx#decision-d-01' });
    expect(constraints.contextName).toBe('02-CONTEXT.md');
    expect(requirements.summary).toBe('23 requirements');
    expect(map.summary).toBe('8 capabilities');
    expect(composed.outline.map((e) => e.id)).toContain('research-back-matter');

    const without = composeResearchBriefing(inputOf(lb02())) as ComposedResearchBriefing;
    const noLink = without.backMatter[0];
    if (noLink.kind !== 'constraints') throw new Error('kind');
    expect(noLink.groups[0].ids[0].href).toBeNull();
  });
});

describe('tidyConfidenceText — the confidence modal text', () => {
  it('drops a leading level, a leftover "confidence —", and repairs a dangling **', () => {
    expect(tidyConfidenceText('MEDIUM-HIGH — the rclone rc API', { dropLevel: true })).toBe('The rclone rc API');
    expect(tidyConfidenceText('HIGH', { dropLevel: true })).toBe('');
    expect(tidyConfidenceText('confidence — numeric thresholds', { dropLevel: false })).toBe('Numeric thresholds');
    expect(
      tidyConfidenceText('for F1** (proven); **MEDIUM for F3** (docs)', { dropLevel: false }),
    ).toBe('For F1 (proven); **MEDIUM for F3** (docs)');
    expect(tidyConfidenceText('`code` first', { dropLevel: false })).toBe('`code` first');
  });
});

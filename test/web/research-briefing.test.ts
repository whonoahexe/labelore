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
} from '../../src/web/views/research-briefing.ts';
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
    expect(architecture.number).toBe('01');
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


// Phase 10 (10-16, VIEW-11): the SPEC.md handler and extractor. It reads the head lines (score, gate, created, the
// locked count), the goal, the numbered requirements with their Current, Target and Acceptance sub-bullets and the
// Ambiguity Report's dimension rows into `structured.spec`, on the made-up Lendshed specs (VIEW-21).
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { SpecHandler, extractSpec } from '../src/planning-repo/handlers/spec.ts';
import type { SpecBody } from '../src/planning-repo/handlers/spec.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { GenericMarkdownHandler } from '../src/planning-repo/handlers/generic.ts';
import { fxRead } from './helpers/fixture-project.ts';

const PATH = '.planning/phases/01-member-sign-in-sessions/01-SPEC.md';

function ref(path: string = PATH): ArtifactRef {
  return {
    path,
    kind: 'spec',
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

function parse(content: string) {
  return SpecHandler.parse(raw(content), ref());
}

const LOCKED = fxRead('phases/01-member-sign-in-sessions/01-SPEC.md');

describe('SpecHandler', () => {
  it('claims a SPEC ref ahead of the generic handler, and no UI-SPEC or AI-SPEC', () => {
    expect(SpecHandler.match(ref())).toBe(true);
    expect(SpecHandler.match(ref('.planning/phases/01-member-sign-in-sessions/01-AI-SPEC.md'))).toBe(false);
    expect(SpecHandler.match(ref('.planning/phases/01-member-sign-in-sessions/01-UI-SPEC.md'))).toBe(false);
    expect(SpecHandler.match(ref('.planning/phases/01-member-sign-in-sessions/01-CONTEXT.md'))).toBe(false);
    expect(HANDLERS.find((h) => h.match(ref()))).toBe(SpecHandler);
    expect(HANDLERS.indexOf(SpecHandler)).toBeLessThan(HANDLERS.indexOf(GenericMarkdownHandler));
    expect(HANDLERS[HANDLERS.length - 1]).toBe(GenericMarkdownHandler);
  });

  it('carries the title, the body and the reading in structured.spec', () => {
    const result = parse(LOCKED);
    expect(result.title).toBe('Phase 1: Member Sign-In & Sessions — Specification');
    expect(result.body).toContain('## Requirements');
    expect((result.structured?.spec as SpecBody).requirements).toHaveLength(5);
  });

  it('keeps the title, body and frontmatter when the extractor throws', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/spec-body.ts', () => ({
      extractSpec: () => {
        throw new Error('boom');
      },
    }));
    const { SpecHandler: Guarded } = await import('../src/planning-repo/handlers/spec.ts');
    const result = Guarded.parse(raw('---\nstatus: kept\n---\n\n# A spec\n\nBody text.\n'), ref());
    expect(result.title).toBe('A spec');
    expect(result.body).toContain('Body text.');
    expect(result.frontmatter.status).toBe('kept');
    expect(result.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/spec-body.ts');
  });
});

describe('extractSpec - 01-SPEC (locked)', () => {
  const spec = extractSpec(LOCKED);

  it('reads the score 0.14 against the stated gate 0.20', () => {
    expect(spec.ambiguity).toEqual({ score: 0.14, scoreText: '0.14', gate: 0.2, gateText: '0.20', gateStated: true });
  });

  it('reads the created date and the file\'s locked count', () => {
    expect(spec.created).toBe('2026-03-22');
    expect(spec.lockedCount).toBe(5);
  });

  it('reads the goal as one paragraph', () => {
    expect(spec.goal).toMatch(/^A member signs in to Lendshed with a username and password/);
    expect(spec.goal).not.toContain('\n');
  });

  it('reads five requirements, each with Current, Target and Acceptance', () => {
    expect(spec.requirements.map((r) => r.n)).toEqual([1, 2, 3, 4, 5]);
    expect(spec.requirements[0].label).toBe('Account sign-in');
    expect(spec.requirements[0].statement).toBe('A member with a username and password signs in and receives a session.');
    for (const requirement of spec.requirements) {
      expect(requirement.current).not.toBeNull();
      expect(requirement.target).not.toBeNull();
      expect(requirement.acceptance).not.toBeNull();
    }
    expect(spec.requirements[0].target).toBe(
      '`POST /api/sign-in` checks a scrypt-hashed password and sets a session cookie; a wrong password answers 401 with the same body as an unknown username',
    );
    expect(spec.requirementsOmitted).toBe(0);
  });

  it('reads the four dimensions of the Ambiguity Report and leaves the total row out', () => {
    expect(spec.dimensions.map((d) => d.name)).toEqual([
      'Goal Clarity',
      'Boundary Clarity',
      'Constraint Clarity',
      'Acceptance Criteria',
    ]);
    expect(spec.dimensions.map((d) => d.score)).toEqual([0.9, 0.88, 0.78, 0.84]);
    expect(spec.dimensions.map((d) => d.min)).toEqual([0.75, 0.7, 0.65, 0.7]);
    expect(spec.dimensions.every((d) => d.status === 'met')).toBe(true);
    expect(spec.dimensions[1].notes).toBe('Phase 2 and 3 items named out');
    expect(spec.dimensions[0].notes).toBeNull();
  });

  it('lists every ## heading in file order and claims Goal and Requirements', () => {
    expect(spec.sections.map((s) => s.heading)).toEqual([
      'Goal',
      'Background',
      'Requirements',
      'Boundaries',
      'Constraints',
      'Acceptance Criteria',
      'Edge Coverage',
      'Prohibitions (must-NOT)',
      'Ambiguity Report',
      'Interview Log',
    ]);
    expect(spec.sections.filter((s) => s.claimed).map((s) => s.heading)).toEqual(['Goal', 'Requirements']);
  });
});

describe('extractSpec - the head lines', () => {
  it('reads no score from a placeholder, even when a gate number follows it (Pitfall 14)', () => {
    const spec = extractSpec('# Phase 1: X — Specification\n\n**Ambiguity score:** [score] (gate: ≤ 0.20)\n');
    expect(spec.ambiguity.score).toBeNull();
    expect(spec.ambiguity.scoreText).toBeNull();
    expect(spec.ambiguity.gate).toBe(0.2);
  });

  it('reads no score when the line is missing, and no locked count from a placeholder', () => {
    const spec = extractSpec('# Phase 1: X — Specification\n\n**Requirements:** [N] locked\n');
    expect(spec.ambiguity.score).toBeNull();
    expect(spec.lockedCount).toBeNull();
    expect(spec.created).toBeNull();
  });

  it('puts a tiny file through without throwing', () => {
    expect(extractSpec('').requirements).toEqual([]);
    expect(extractSpec('just words').goal).toBeNull();
  });
});

describe('extractSpec - requirements', () => {
  const body = (items: string) => `# Spec\n\n## Requirements\n\n${items}\n\n## Boundaries\n`;

  it('keeps a requirement that has only some of its three fields', () => {
    const spec = extractSpec(body('1. **Only target**: Statement.\n   - Target: Done\n'));
    const [one] = spec.requirements;
    expect(one.current).toBeNull();
    expect(one.target).toBe('Done');
    expect(one.acceptance).toBeNull();
  });

  it('reads a bold label with the colon inside the bold, a plain statement and a continuation line', () => {
    const spec = extractSpec(
      body(
        '1. **Label:** The statement\n   goes on here.\n   - Current: a\n     continued\n   - Acceptance: b\n2. A plain sentence: with a colon',
      ),
    );
    expect(spec.requirements[0].label).toBe('Label');
    expect(spec.requirements[0].statement).toBe('The statement goes on here.');
    expect(spec.requirements[0].current).toBe('a continued');
    expect(spec.requirements[1].label).toBe('A plain sentence');
    expect(spec.requirements[1].statement).toBe('with a colon');
  });

  it('keeps an unknown sub-bullet as an extra rather than dropping it', () => {
    const spec = extractSpec(body('1. **A**: s\n   - Current: c\n   - Risk: it is risky\n'));
    expect(spec.requirements[0].extras).toEqual(['Risk: it is risky']);
  });

  it('ignores a heading-like line inside a code fence', () => {
    const spec = extractSpec(body('1. **A**: s\n   - Current: c\n\n```\n## Goal\n2. **Fake**: no\n```\n'));
    expect(spec.requirements.map((r) => r.label)).toEqual(['A']);
    expect(spec.sections.map((s) => s.heading)).toEqual(['Requirements', 'Boundaries']);
  });

  it('caps requirements at 200 and counts the rest', () => {
    const many = Array.from({ length: 230 }, (_, i) => `${i + 1}. **R${i + 1}**: s`).join('\n');
    const spec = extractSpec(body(many));
    expect(spec.requirements).toHaveLength(200);
    expect(spec.requirementsOmitted).toBe(30);
  });

  it('caps one field at 2,000 characters', () => {
    const spec = extractSpec(body(`1. **A**: s\n   - Current: ${'x'.repeat(5000)}\n`));
    expect(spec.requirements[0].current?.length).toBe(2000);
  });
});

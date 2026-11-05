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
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';

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

  it('lists every ## heading in file order and claims Goal, Requirements and Boundaries', () => {
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
    expect(spec.sections.filter((s) => s.claimed).map((s) => s.heading)).toEqual(['Goal', 'Requirements', 'Boundaries']);
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

const NOT_LOCKED = fxRead('phases/02-roles-and-permissions/02-SPEC.md');
const NINE = fxRead('phases/03-account-admin-and-sessions/03-SPEC.md');

describe('extractSpec - 02-SPEC (above the gate)', () => {
  const spec = extractSpec(NOT_LOCKED);

  it('reads the score 0.31 and the gate 0.20 from the two-character ASCII form', () => {
    expect(spec.ambiguity).toEqual({ score: 0.31, scoreText: '0.31', gate: 0.2, gateText: '0.20', gateStated: true });
    expect(spec.lockedCount).toBe(4);
  });

  it('marks Constraint Clarity below its minimum', () => {
    const below = spec.dimensions.filter((d) => d.status === 'below');
    expect(below.map((d) => d.name)).toEqual(['Constraint Clarity']);
    expect(below[0].score).toBe(0.46);
    expect(below[0].min).toBe(0.65);
    expect(below[0].notes).toBe('Below minimum — planner must treat as assumption');
  });

  it('reads the Edge Coverage rows with the requirement each names and the status without its emoji', () => {
    expect(spec.edges?.map((e) => [e.requirements, e.kind, e.statusText])).toEqual([
      [[1], 'covered', 'covered'],
      [[3], 'unresolved', 'UNRESOLVED'],
      [[1], 'dismissed', 'dismissed'],
      [[3], 'backstop', 'backstop'],
    ]);
    expect(spec.edges?.[1].label).toBe('last steward demotes themself');
    expect(spec.edges?.[2].reason).toBe('Sheds are never closed in this product; closure is not a supported event');
  });

  it('reads the Prohibitions rows, one resolved and one unresolved', () => {
    expect(spec.prohibitions?.map((p) => [p.requirements, p.kind])).toEqual([
      [[2], 'resolved'],
      [[2], 'unresolved'],
    ]);
    expect(spec.prohibitions?.[0].label).toBe('MUST NOT reveal which shed caused a refusal on a transfer');
  });

  it('reads In scope and Out of scope, splitting each out-of-scope item at the first spaced em dash', () => {
    expect(spec.inScope).toHaveLength(3);
    expect(spec.outOfScope).toEqual([
      { item: 'Creating, disabling or deleting accounts', reason: 'that is Phase 3' },
      { item: 'A live notice to an open page when its grants change', reason: 'left to discussion, may land later' },
      { item: 'Per-tool permissions', reason: 'not asked for by any steward' },
    ]);
  });

  it('claims Goal, Requirements and Boundaries and leaves the rest, in file order', () => {
    expect(spec.sections.filter((s) => s.claimed).map((s) => s.heading)).toEqual(['Goal', 'Requirements', 'Boundaries']);
    expect(spec.sections.filter((s) => !s.claimed).map((s) => s.heading)).toEqual([
      'Background',
      'Constraints',
      'Acceptance Criteria',
      'Edge Coverage',
      'Prohibitions (must-NOT)',
      'Ambiguity Report',
      'Interview Log',
    ]);
  });
});

describe('extractSpec - 03-SPEC (nine requirements, no gate)', () => {
  const spec = extractSpec(NINE);

  it("uses GSD's gate of 0.20 and says it was not stated", () => {
    expect(spec.ambiguity).toEqual({ score: 0.18, scoreText: '0.18', gate: 0.2, gateText: '0.20', gateStated: false });
  });

  it('reads nine requirements, the sixth with no Acceptance', () => {
    expect(spec.requirements).toHaveLength(9);
    expect(spec.lockedCount).toBe(9);
    expect(spec.requirements[5].label).toBe('Live session list');
    expect(spec.requirements[5].acceptance).toBeNull();
    expect(spec.requirements[5].current).not.toBeNull();
    expect(spec.requirements.filter((r) => r.acceptance === null).map((r) => r.n)).toEqual([6]);
  });

  it('has neither coverage table', () => {
    expect(spec.edges).toBeNull();
    expect(spec.prohibitions).toBeNull();
  });
});

describe('extractSpec - the gate and the count as written', () => {
  const score = (line: string) => extractSpec(`# S\n\n${line}\n`).ambiguity;

  it.each([
    ['**Ambiguity score:** 0.12 (gate: ≤ 0.20)', 0.2],
    ['**Ambiguity score:** 0.12 (gate: <= 0.25)', 0.25],
    ['**Ambiguity score:** 0.12 (gate: < 0.15)', 0.15],
    ['**Ambiguity score:** 0.12 (gate: &le; 0.30)', 0.3],
    ['**Ambiguity score:** 0.12 (gate &lt;= 0.35)', 0.35],
  ])('reads the gate from %s', (line, gate) => {
    const a = score(line);
    expect(a.score).toBe(0.12);
    expect(a.gate).toBe(gate);
    expect(a.gateStated).toBe(true);
  });

  it('uses 0.20 when a score has no gate', () => {
    expect(score('**Ambiguity score:** 0.12')).toMatchObject({ score: 0.12, gate: 0.2, gateStated: false });
  });

  it("shows the file's own count when it disagrees with the numbered items (5 locked, seven items)", () => {
    const items = Array.from({ length: 7 }, (_, i) => `${i + 1}. **R${i + 1}**: s`).join('\n');
    const spec = extractSpec(`# S\n\n**Requirements:** 5 locked\n\n## Requirements\n\n${items}\n`);
    expect(spec.lockedCount).toBe(5);
    expect(spec.requirements).toHaveLength(7);
  });

  it('leaves a spec with no Boundaries section with empty scope lists', () => {
    const spec = extractSpec('# S\n\n## Goal\n\nA goal.\n');
    expect(spec.inScope).toEqual([]);
    expect(spec.outOfScope).toEqual([]);
    expect(spec.sections).toEqual([{ heading: 'Goal', claimed: true }]);
  });

  it('reads an out-of-scope item with no reason and keeps a later dash in the reason', () => {
    const spec = extractSpec(
      '# S\n\n## Boundaries\n\n**Out of scope:**\n- Plain item\n- Item — first — second\n- Hyphen-ated item\n',
    );
    expect(spec.outOfScope).toEqual([
      { item: 'Plain item', reason: null },
      { item: 'Item', reason: 'first — second' },
      { item: 'Hyphen-ated item', reason: null },
    ]);
  });

  it('finds R references in a cell naming several requirements and ignores other words', () => {
    const spec = extractSpec(
      '# S\n\n## Edge Coverage\n\n| Category | Requirement | Status | Reason |\n|---|---|---|---|\n| a | R1, R12 and PR7 | ✅ covered | fine |\n',
    );
    expect(spec.edges?.[0].requirements).toEqual([1, 12]);
  });
});

describe('extractSpec - stays linear (T-10-28)', () => {
  it('in numbered requirements, past the 200 it keeps', () => {
    const growth = measureGrowth({
      make: (n) => `# S\n\n## Requirements\n\n${'1. **R**: statement\n   - Current: c\n'.repeat(n)}`,
      run: (input) => {
        extractSpec(input);
      },
      startSize: 500,
      maxSize: 10_000,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });

  it('in one long line of characters', () => {
    const growth = measureGrowth({
      make: (n) => `# S\n\n## Goal\n\n${'word '.repeat(Math.ceil(n / 5))}\n`,
      run: (input) => {
        extractSpec(input);
      },
      maxSize: 200_000,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });

  it('in headings, past the section cap', () => {
    const growth = measureGrowth({
      make: (n) => `# S\n\n${'## Heading\n\ntext\n\n'.repeat(n)}`,
      run: (input) => {
        extractSpec(input);
      },
      startSize: 200,
      maxSize: 2_000,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });

  it('in table rows', () => {
    const growth = measureGrowth({
      make: (n) =>
        `# S\n\n## Edge Coverage\n\n| Category | Requirement | Status | Reason |\n|---|---|---|---|\n${'| a | R1 | covered | r |\n'.repeat(n)}`,
      run: (input) => {
        extractSpec(input);
      },
      startSize: 4,
      maxSize: 1_600,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });
});

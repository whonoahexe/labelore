// quick-261001-qk6: extractUiSpec (the UI-SPEC.md design-contract projection) against anchor
// documents read from disk, degenerate input, and the T-qk6-01 timing guard; plus UiSpecHandler's
// match and structured.uiSpec. Anchor counts were independently confirmed with awk over the status
// column of every UI Considerations table (never copied from the extractor's own output).
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from './helpers/studio-portal.ts';
import { extractUiSpec } from '../src/planning-repo/handlers/ui-spec-contract.ts';
import type { UiSpecContract } from '../src/planning-repo/handlers/ui-spec-contract.ts';
import { UiSpecHandler } from '../src/planning-repo/handlers/ui-spec.ts';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';

const REPO_ROOT = new URL('../', import.meta.url);
const LB02 = '.planning/milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-UI-SPEC.md';
const LB05 = '.planning/milestones/v1.1-phases/05-per-type-document-views/05-UI-SPEC.md';
const DENSE = 'fixtures/dense/.planning/phases/01-identity-slice/01-UI-SPEC.md';
const SP04 = `${SP_PLANNING}/milestones/v1.0-phases/04-tier-to-tier-transfers/04-UI-SPEC.md`;
const SP_P3 = `${SP_PLANNING}/phases/03-account-administration-session-control/03-UI-SPEC.md`;
const HAVE_SP = existsSync(SP_PLANNING);

async function repoText(path: string): Promise<string> {
  return await readFile(new URL(path, REPO_ROOT), 'utf8');
}

function counts(spec: UiSpecContract): { elements: number; rows: number; split: number[] } {
  const elements = spec.considerations?.elements ?? [];
  const rows = elements.flatMap((e) => e.rows);
  const split = (['covered', 'backstop', 'unresolved', 'dismissed'] as const).map(
    (s) => rows.filter((r) => r.status === s).length,
  );
  return { elements: elements.length, rows: rows.length, split };
}

describe.runIf(HAVE_SP)('extractUiSpec — studio-portal v1.0/04 (hard)', () => {
  it('reads the frontmatter as written, the sign-off, the scales and the registry', async () => {
    const spec = extractUiSpec(await readFile(SP04, 'utf8'));
    expect(spec.meta).toEqual({
      phase: '04',
      slug: 'tier-to-tier-transfers',
      status: 'approved',
      created: '2026-07-24',
      shadcnInitialized: 'true',
      preset: 'b3Dqcuo4na',
    });
    expect(spec.title).toBe('Phase 04 — UI Design Contract');
    expect(spec.tagline).toContain('gsd-ui-researcher');
    expect(spec.signoff?.dims).toHaveLength(6);
    expect(spec.signoff?.dims.every((d) => d.verdict === 'PASS')).toBe(true);
    expect(spec.signoff?.approval).toMatch(/^APPROVED/);
    expect(spec.signoff?.hasNotes).toBe(true);
    expect(spec.spacing?.rows).toHaveLength(7);
    expect(spec.typography?.rows).toHaveLength(4);
    expect(spec.color?.rows).toHaveLength(4);
    expect(spec.registry?.rows).toHaveLength(1);
    expect(spec.designSystem?.map((r) => r.key)).toEqual(['Tool', 'Preset', 'Component library', 'Icon library', 'Font']);
    expect(spec.reserved.accent?.length).toBe(6);
    expect(spec.reserved.destructive?.length).toBe(7);
  });

  it('groups 78 considerations into 10 elements, 57 / 6 / 0 / 15', async () => {
    const spec = extractUiSpec(await readFile(SP04, 'utf8'));
    expect(counts(spec)).toEqual({ elements: 10, rows: 78, split: [57, 6, 0, 15] });
    expect(spec.considerations?.elements.map((e) => e.key)).toEqual(
      Array.from({ length: 10 }, (_, i) => `E${i + 1}`),
    );
    expect(spec.considerations?.coverage).toMatch(/^78 applicable/);
    expect(spec.considerations?.quote).toContain('ui-phase UI-consideration probe');
    expect(spec.considerations?.comments.length).toBe(1);
    const e2 = spec.considerations?.elements[1];
    const longText = e2?.rows.find((r) => r.cats.includes('long-text'));
    expect(longText?.status).toBe('backstop');
    expect(e2?.rows.find((r) => r.tag === 'P-01')?.cats).toEqual(['loading']);
  });

  it('marks the phase-specific chapters and the copywriting contract unclaimed', async () => {
    const spec = extractUiSpec(await readFile(SP04, 'utf8'));
    const unclaimed = spec.sections.filter((s) => !s.claimed).map((s) => s.heading);
    expect(unclaimed).toEqual([
      'Layout',
      'Motion & Reduced-Motion Contract',
      'Screen-Reader / Live-Region Contract',
      'Copywriting Contract',
    ]);
    expect(spec.sections.find((s) => s.heading === 'Registry Safety')?.claimed).toBe(true);
  });
});

describe.runIf(HAVE_SP)('extractUiSpec — studio-portal phases/03 (the Element | Kinds trap)', () => {
  it('reads 7 elements and 42 rows, taking kinds from the table and none of its rows as considerations', async () => {
    const spec = extractUiSpec(await readFile(SP_P3, 'utf8'));
    expect(counts(spec)).toEqual({ elements: 7, rows: 42, split: [27, 7, 0, 8] });
    const e6 = spec.considerations?.elements.find((e) => e.key === 'E6');
    expect(e6?.kinds).toBe('form, static-content');
    expect(e6?.name).toBe("/login's disabled-account alert");
    expect(spec.considerations?.coverage).toMatch(/^42 applicable/);
  });
});

describe('extractUiSpec — labelore v1.0/02 (long, table-form sign-off)', () => {
  it('reads six PASS dimensions from the table, 15 elements, 104 rows, 8 revision chapters', async () => {
    const spec = extractUiSpec(await repoText(LB02));
    expect(spec.signoff?.dims).toHaveLength(6);
    expect(spec.signoff?.dims.every((d) => d.verdict === 'PASS')).toBe(true);
    expect(counts(spec)).toEqual({ elements: 15, rows: 104, split: [90, 1, 9, 4] });
    expect(spec.considerations?.coverage).toMatch(/^103 applicable/);
    expect(spec.meta.preset).toContain('base-sera');
    const unclaimed = spec.sections.filter((s) => !s.claimed).map((s) => s.heading);
    expect(unclaimed.filter((h) => h.includes('Revision'))).toHaveLength(8);
    // "(added this revision)" is not a kinds list: the name keeps it and the kinds come from the
    // section's own "Element kinds" line.
    const e15 = spec.considerations?.elements.find((e) => e.key === 'E15');
    expect(e15?.kinds).toBe('static-content, list-collection');
    expect(e15?.name).toContain('unrecognised PLAN section');
  });
});

describe('extractUiSpec — draft documents', () => {
  it('lb v1.1/05: every unchecked PASS reads as PENDING; the flat table keys elements by code or name', async () => {
    const spec = extractUiSpec(await repoText(LB05));
    expect(spec.meta.phase).toBe('5');
    expect(spec.meta.created).toBe('2026-09-20');
    expect(spec.signoff?.dims.every((d) => d.verdict === 'PENDING')).toBe(true);
    expect(counts(spec)).toEqual({ elements: 8, rows: 53, split: [39, 0, 0, 14] });
    expect(spec.considerations?.coverage).toMatch(/^53 applicable/);
  });

  it('the dense fixture: PENDING dimensions, an empty considerations section, a "none" design system', async () => {
    const spec = extractUiSpec(await repoText(DENSE));
    expect(spec.signoff?.dims).toHaveLength(6);
    expect(spec.signoff?.dims.every((d) => d.verdict === 'PENDING')).toBe(true);
    expect(spec.signoff?.approval).toBe('pending');
    expect(spec.considerations?.elements).toEqual([]);
    expect(spec.considerations?.coverage).toBe('none applicable (fixture)');
    expect(spec.designSystem?.map((r) => r.value)).toEqual(['none', 'not applicable', 'none', 'none', 'none']);
    expect(spec.meta.shadcnInitialized).toBe('false');
    expect(spec.meta.preset).toBe('none');
    expect(spec.reserved.accent).toEqual(['primary CTA button']);
  });
});

describe('extractUiSpec — degrade', () => {
  it('survives an empty string, a body with no ## at all, an unclosed fence and bad frontmatter', () => {
    expect(() => extractUiSpec('')).not.toThrow();
    const none = extractUiSpec('just words\nand more words\n');
    expect(none.sections).toEqual([]);
    expect(none.considerations).toBeNull();
    expect(() => extractUiSpec('# T\n\n## Design System\n\n```\n| a | b |\n|---|---|\n| 1 | 2 |\n')).not.toThrow();
    const bad = extractUiSpec('---\nphase: [unclosed\n  : : :\n# not closed\n\n## Registry Safety\n\n| a |\n|---|\n| b |\n');
    expect(bad.meta.phase).toBeNull();
    expect(bad.registry?.rows).toEqual([['b']]);
  });

  it('a sign-off with no recognisable dimension yields no dimensions', () => {
    const spec = extractUiSpec('## Checker Sign-Off\n\nnothing to see\n');
    expect(spec.signoff?.dims).toEqual([]);
    expect(spec.signoff?.hasNotes).toBe(true);
  });

  it('a reserved-for lead with its text on the same line drops the bold marker and keeps wrapped lines', () => {
    const spec = extractUiSpec(
      '## Color\n\n| Role | Value |\n|---|---|\n| Accent (10%) | x |\n\n**Accent reserved for:** progress fill on cards\nand the live icon only.\n\n**Other:** words\n',
    );
    expect(spec.reserved.accent).toEqual(['progress fill on cards and the live icon only.']);
  });

  it('an unchecked PASS with a real approval stays PASS', () => {
    const spec = extractUiSpec('---\nstatus: approved\n---\n## Checker Sign-Off\n\n- [ ] Dimension 1 Copywriting: PASS\n\n**Approval:** approved\n');
    expect(spec.signoff?.dims[0].verdict).toBe('PASS');
  });

  it('a 1 MB body with a 200k-character line extracts within 250 ms', () => {
    const long = 'x'.repeat(200_000);
    const rows = Array.from({ length: 3000 }, (_, i) => `| empty | E${i % 9} thing | ✅ covered | note ${i} |`).join('\n');
    const body = `# T\n\n## UI Considerations\n\n${long}\n\n| Category | Element | Status | Resolution |\n|---|---|---|---|\n${rows}\n\n## Color\n\n| Role | Value |\n|---|---|\n| a | ${long} |\n\n${'filler line\n'.repeat(60_000)}`;
    expect(body.length).toBeGreaterThan(900_000);
    const t0 = performance.now();
    const spec = extractUiSpec(body);
    expect(performance.now() - t0).toBeLessThan(250);
    expect(spec.considerations?.elements.length).toBeLessThanOrEqual(200);
  });
});

describe('UiSpecHandler', () => {
  function refOf(path: string): ArtifactRef {
    return { path, kind: 'ui-spec', location: 'phase', phaseIdentity: null, milestoneVersion: null, quickTaskId: null };
  }

  it('matches phase UI-SPEC files only', () => {
    expect(UiSpecHandler.match(refOf('.planning/phases/01-x/01-UI-SPEC.md'))).toBe(true);
    expect(UiSpecHandler.match(refOf('.planning/phases/01-x/01-PATTERNS.md'))).toBe(false);
  });

  it('adds structured.uiSpec and keeps the frontmatter map', async () => {
    const content = await repoText(DENSE);
    const ref = refOf(DENSE);
    const raw: RawArtifact = { path: ref.path, content, mtimeMs: 0, size: content.length };
    const result = UiSpecHandler.parse(raw, ref);
    expect(result.title).toBeTruthy();
    expect((result.frontmatter as Record<string, unknown>).fixture_extra_field).toBe('exercise-passthrough');
    const structured = result.structured as { uiSpec?: UiSpecContract };
    expect(structured.uiSpec?.meta.slug).toBe('identity-slice');
  });
});

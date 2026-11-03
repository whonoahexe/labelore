// Phase 9 (09-15): the COVERAGE.md handler. It reads the "No external API integration" declaration (the one-line
// normal case and the multi-paragraph shape this repo's own phase 1 uses) into `structured.coverage`.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { CoverageHandler, extractCoverage } from '../src/planning-repo/handlers/coverage.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { GenericMarkdownHandler } from '../src/planning-repo/handlers/generic.ts';
import { fxRead } from './helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';

const PATH = '.planning/phases/02-roles-and-permissions/COVERAGE.md';

function ref(path: string = PATH): ArtifactRef {
  return {
    path,
    kind: 'coverage',
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
  return CoverageHandler.parse(raw(content), ref());
}

describe('CoverageHandler', () => {
  it('claims a coverage ref ahead of the generic handler, and nothing else', () => {
    expect(CoverageHandler.match(ref())).toBe(true);
    expect(CoverageHandler.match({ ...ref(), kind: 'requirements' })).toBe(false);
    expect(HANDLERS.find((h) => h.match(ref()))).toBe(CoverageHandler);
    expect(HANDLERS[HANDLERS.length - 1]).toBe(GenericMarkdownHandler);
  });

  it('reads the Lendshed one-liner: the reason is the text after the first colon', () => {
    const result = parse(fxRead('phases/02-roles-and-permissions/COVERAGE.md'));
    const coverage = result.structured?.coverage as ReturnType<typeof extractCoverage>;
    expect(coverage.h1).toBeNull();
    expect(coverage.none?.reason).toMatch(/^roles and permissions are stored in Lendshed's own database/);
    expect(coverage.matrix).toBeNull();
  });

  it('reads a planted multi-paragraph none file: the reason is the declaration paragraph, not the others', () => {
    const coverage = extractCoverage(
      [
        '# API Coverage — Phase 1: Read Layer',
        '',
        'No external API integration: this phase is a local process',
        'that reads a filesystem tree and prints JSON.',
        '',
        'The detector was run during planning and returned nothing.',
        '',
      ].join('\n'),
    );
    expect(coverage.h1).toBe('API Coverage — Phase 1: Read Layer');
    expect(coverage.none?.reason).toBe('this phase is a local process that reads a filesystem tree and prints JSON.');
  });

  it('takes the whole sentence as the reason when it has no colon, and null when nothing follows the colon', () => {
    expect(extractCoverage('No external API integration for this phase.').none?.reason).toBe(
      'No external API integration for this phase.',
    );
    expect(extractCoverage('No external API integration:   \n').none).toEqual({ reason: null });
  });

  it('matches the declaration case-insensitively and through a blockquote marker', () => {
    expect(extractCoverage('> no External API integration: local only').none?.reason).toBe('local only');
  });

  it('gives none null for a file with neither a declaration nor a matrix', () => {
    const coverage = extractCoverage('# Coverage\n\nSome notes about the phase.\n');
    expect(coverage.none).toBeNull();
    expect(coverage.matrix).toBeNull();
    expect(coverage.h1).toBe('Coverage');
  });

  it('keeps the title, body and frontmatter when the extractor throws', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/coverage-body.ts', () => ({
      extractCoverage: () => {
        throw new Error('boom');
      },
    }));
    const { CoverageHandler: Guarded } = await import('../src/planning-repo/handlers/coverage.ts');
    const result = Guarded.parse(raw('---\nstatus: kept\n---\n\n# A coverage file\n\nBody text.\n'), ref());
    expect(result.title).toBe('A coverage file');
    expect(result.body).toContain('Body text.');
    expect(result.frontmatter.status).toBe('kept');
    expect(result.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/coverage-body.ts');
  });
});

const MATRIX_PATH = '.planning/phases/04-bulk-loan-export/COVERAGE.md';

describe('extractCoverage - the capability matrix', () => {
  const lendshed = extractCoverage(parse(fxRead('phases/04-bulk-loan-export/COVERAGE.md')).body);

  it('reads the Lendshed phase 4 matrix: three integrated, two opted out, in file order', () => {
    expect(lendshed.h1).toBe('API Coverage — Phase 4: Bulk loan export (Postwing mail relay)');
    expect(lendshed.none).toBeNull();
    const rows = lendshed.matrix?.rows ?? [];
    expect(rows.map((r) => r.decision)).toEqual(['integrate', 'integrate', 'integrate', 'opt-out', 'opt-out']);
    expect(rows[0].capability).toBe('POST /messages send one message');
    expect(rows[0].reason).toBeNull();
    expect(rows[3].reason).toMatch(/^Lendshed does not take replies by mail/);
    expect(rows[4].reason).toBeNull();
  });

  it('takes the blockquote lines between the H1 and the table as the lead, markers dropped', () => {
    const lead = lendshed.matrix?.lead ?? [];
    expect(lead).toHaveLength(3);
    expect(lead[0]).toMatch(/^Full coverage by default/);
    expect(lead[2]).toBe("Reviewed against the relay's v3 reference during planning.");
    expect(lead.join(' ')).not.toContain('>');
  });

  it('finds columns by header text: Capability beats RC method, Row is the decision, bold and dashes are stripped', () => {
    const coverage = extractCoverage(
      [
        '# Coverage',
        '',
        '| # | RC method | Capability | Row | Reason (OPT-OUT only) | Plan |',
        '|---|-----------|------------|-----|------------------------|------|',
        '| 1 | create | Create a charge | **INTEGRATE** | — | 04-01 |',
        '| 2 | refund | Refund a charge | **OPT-OUT** | Refunds are manual | |',
        '| 3 | list | `List charges` | `INTEGRATE` | - | 04-02 |',
      ].join('\n'),
    );
    const rows = coverage.matrix?.rows ?? [];
    expect(rows.map((r) => r.capability)).toEqual(['Create a charge', 'Refund a charge', 'List charges']);
    expect(rows.map((r) => r.decisionRaw)).toEqual(['INTEGRATE', 'OPT-OUT', 'INTEGRATE']);
    expect(rows.map((r) => r.reason)).toEqual([null, 'Refunds are manual', null]);
  });

  it('falls back to a method or feature header when there is no Capability column', () => {
    const coverage = extractCoverage('| Method | Decision |\n|---|---|\n| send | INTEGRATE |\n');
    expect(coverage.matrix?.rows[0].capability).toBe('send');
  });

  it('classifies by the leading word and sends anything else to other, verbatim', () => {
    const coverage = extractCoverage(
      [
        '| Capability | Decision |',
        '|---|---|',
        '| a | OPT OUT |',
        '| b | opt-out |',
        '| c | Opt_Out (later) |',
        '| d | DEFER |',
        '| e | integrate |',
      ].join('\n'),
    );
    const rows = coverage.matrix?.rows ?? [];
    expect(rows.map((r) => r.decision)).toEqual(['opt-out', 'opt-out', 'opt-out', 'other', 'integrate']);
    expect(rows[3].decisionRaw).toBe('DEFER');
  });

  it('gives no matrix for the Shapes "Capability | Covered by | Status" table', () => {
    const shapes = readFileSync(
      new URL('./fixtures/shapes/.planning/phases/02-glaze-recipes/COVERAGE.md', import.meta.url),
      'utf8',
    );
    const coverage = extractCoverage(shapes);
    expect(coverage.matrix).toBeNull();
    expect(coverage.none).toBeNull();
  });

  it('lets the matrix win over a none paragraph in the same file', () => {
    const coverage = extractCoverage(
      [
        '# Coverage',
        '',
        'No external API integration: local.',
        '',
        '| Capability | Decision |',
        '|---|---|',
        '| a | INTEGRATE |',
      ].join('\n'),
    );
    expect(coverage.matrix?.rows).toHaveLength(1);
    expect(coverage.none).toBeNull();
  });

  it('keeps a table directly under a none paragraph out of that paragraph', () => {
    const coverage = extractCoverage(
      'No external API integration: local.\n| Capability | Covered by |\n|---|---|\n| a | b |\n',
    );
    expect(coverage.none?.reason).toBe('local.');
    expect(coverage.matrix).toBeNull();
  });

  it('reads a header-only decision table as no matrix', () => {
    expect(extractCoverage('| Capability | Decision |\n|---|---|\n').matrix).toBeNull();
  });

  it('is carried by the handler for the Lendshed file', () => {
    const content = fxRead('phases/04-bulk-loan-export/COVERAGE.md');
    const result = CoverageHandler.parse(raw(content, MATRIX_PATH), ref(MATRIX_PATH));
    expect((result.structured?.coverage as ReturnType<typeof extractCoverage>).matrix?.rows).toHaveLength(5);
  });
});

describe('extractCoverage growth', () => {
  const header = '| Capability | Decision | Reason |\n|---|---|---|\n';

  it('stays linear in table rows (kept below the 500-row cap)', () => {
    const growth = measureGrowth({
      make: (n) => header + '| cap | INTEGRATE | why |\n'.repeat(n),
      run: (input) => {
        extractCoverage(input);
      },
      startSize: 4,
      maxSize: 62,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });

  it('stays linear in prose characters (kept below the 50,000-character cap)', () => {
    const growth = measureGrowth({
      make: (n) =>
        '# Coverage\n\n> ' +
        'a lead line of words\n'.repeat(Math.ceil(n / 21)) +
        '\n' +
        header +
        '| cap | OPT-OUT | why |\n',
      run: (input) => {
        extractCoverage(input);
      },
      maxSize: 6000,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });

  it('caps 10,000 table rows at 500 and a 200k-character cell at 2000 characters', () => {
    const rows = extractCoverage(header + '| cap | INTEGRATE | why |\n'.repeat(10_000));
    expect(rows.matrix?.rows.length).toBeLessThanOrEqual(500);
    const cell = extractCoverage(header + `| ${'x'.repeat(200_000)} | OPT-OUT | ${'y'.repeat(200_000)} |\n`);
    expect(cell.matrix?.rows[0].capability.length).toBeLessThanOrEqual(2000);
    const reason = extractCoverage(header + `| cap | OPT-OUT | ${'y'.repeat(45_000)} |\n`);
    expect(reason.matrix?.rows[0].reason?.length).toBe(2000);
  });
});

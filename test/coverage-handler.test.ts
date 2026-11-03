// Phase 9 (09-15): the COVERAGE.md handler. It reads the "No external API integration" declaration (the one-line
// normal case and the multi-paragraph shape this repo's own phase 1 uses) into `structured.coverage`.
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { CoverageHandler, extractCoverage } from '../src/planning-repo/handlers/coverage.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { GenericMarkdownHandler } from '../src/planning-repo/handlers/generic.ts';
import { fxRead } from './helpers/fixture-project.ts';

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

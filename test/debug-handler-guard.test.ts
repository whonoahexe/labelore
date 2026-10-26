// quick-261018-j5h (T-j5h-04): when the debug extractor throws, DebugHandler.parse keeps the title, body
// and frontmatter and simply omits `debug`; the page then falls back to the promoted-section view. With
// the real extractor it carries the session projection plus `slug` and `archived`.
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';

const content = '---\nstatus: investigating\ncreated: 2026-10-01\n---\n\n# Debug Session: thing\n\n## Current Focus\n\nhypothesis: it is the cache\n';

function refOf(path: string, extra: Partial<ArtifactRef> = {}): ArtifactRef {
  return { path, kind: 'debug', location: 'other', phaseIdentity: null, milestoneVersion: null, quickTaskId: null, fileClass: 'text', sizeBytes: 0, ...extra };
}

function rawOf(path: string): RawArtifact {
  return { path, content, mtimeMs: 0, size: content.length };
}

type Parsed = { debug: { slug: string; archived: boolean; focus: { key: string }[] } };

describe('DebugHandler', () => {
  it('claims refs of kind debug and nothing else', async () => {
    const { DebugHandler } = await import('../src/planning-repo/handlers/debug.ts');
    expect(DebugHandler.match(refOf('.planning/debug/a.md'))).toBe(true);
    expect(DebugHandler.match(refOf('.planning/debug/knowledge-base.md', { kind: 'unknown' }))).toBe(false);
    expect(DebugHandler.match(refOf('.planning/phases/01-x/01-UAT.md', { kind: 'uat', location: 'phase' }))).toBe(false);
  });

  it('carries structured.debug with the slug and the archived flag', async () => {
    const { DebugHandler } = await import('../src/planning-repo/handlers/debug.ts');
    const archivedPath = '.planning/debug/resolved/loading-state-regression.md';
    const archived = DebugHandler.parse(rawOf(archivedPath), refOf(archivedPath));
    expect((archived.structured as Parsed).debug.slug).toBe('loading-state-regression');
    expect((archived.structured as Parsed).debug.archived).toBe(true);
    expect((archived.structured as Parsed).debug.focus.map((f) => f.key)).toEqual(['hypothesis']);
    const livePath = '.planning/debug/search-index-goes-stale.md';
    const live = DebugHandler.parse(rawOf(livePath), refOf(livePath));
    expect((live.structured as Parsed).debug.slug).toBe('search-index-goes-stale');
    expect((live.structured as Parsed).debug.archived).toBe(false);
  });

  it('omits debug when the extractor throws and keeps the rest', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/debug-session.ts', () => ({
      extractDebugSession: () => {
        throw new Error('boom');
      },
    }));
    const { DebugHandler } = await import('../src/planning-repo/handlers/debug.ts');
    const path = '.planning/debug/a.md';
    const result = DebugHandler.parse(rawOf(path), refOf(path));
    expect(result.title).toBe('Debug Session: thing');
    expect(result.body).toContain('## Current Focus');
    expect(result.frontmatter.status).toBe('investigating');
    expect(result.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/debug-session.ts');
  });
});

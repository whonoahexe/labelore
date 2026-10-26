// quick-261023-61k (T-61k-04): when the todo extractor throws, TodoHandler.parse keeps the title, body and
// frontmatter and simply omits `todo`; the page then falls back to the promoted-section view. With the real
// extractor it carries the todo projection for every ref of kind 'todo'.
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';

const content = '---\ntitle: Make it faster\nseverity: major\ncreated: 2026-10-01\n---\n\n## Problem\n\nIt is slow.\n\n## Solution\n\nCache it.\n';

function refOf(path: string, extra: Partial<ArtifactRef> = {}): ArtifactRef {
  return { path, kind: 'todo', location: 'other', phaseIdentity: null, milestoneVersion: null, quickTaskId: null, fileClass: 'text', sizeBytes: 0, ...extra };
}

function rawOf(path: string): RawArtifact {
  return { path, content, mtimeMs: 0, size: content.length };
}

type Parsed = { todo: { status: string; folder: string; level: string; lead: { heading: string } } };

describe('TodoHandler', () => {
  it('claims refs of kind todo and nothing else', async () => {
    const { TodoHandler } = await import('../src/planning-repo/handlers/todo.ts');
    expect(TodoHandler.match(refOf('.planning/todos/pending/a.md'))).toBe(true);
    expect(TodoHandler.match(refOf('.planning/notes/a.md', { kind: 'unknown' }))).toBe(false);
    expect(TodoHandler.match(refOf('.planning/phases/01-x/01-UAT.md', { kind: 'uat', location: 'phase' }))).toBe(false);
  });

  it('carries structured.todo for a completed todo and keeps title, frontmatter and body', async () => {
    const { TodoHandler } = await import('../src/planning-repo/handlers/todo.ts');
    const path = '.planning/todos/completed/make-it-faster.md';
    const result = TodoHandler.parse(rawOf(path), refOf(path));
    const todo = (result.structured as Parsed).todo;
    expect(todo.status).toBe('done');
    expect(todo.folder).toBe('completed');
    expect(todo.level).toBe('high');
    expect(todo.lead.heading).toBe('Problem');
    expect(result.title).toBe('Make it faster');
    expect(result.frontmatter.severity).toBe('major');
    expect(result.body).toContain('## Problem');
    expect(result.body).toContain('Cache it.');
  });

  it('omits todo when the extractor throws and keeps the rest', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/todo-file.ts', () => ({
      extractTodoFile: () => {
        throw new Error('boom');
      },
    }));
    const { TodoHandler } = await import('../src/planning-repo/handlers/todo.ts');
    const path = '.planning/todos/pending/a.md';
    const result = TodoHandler.parse(rawOf(path), refOf(path));
    expect(result.title).toBe('Make it faster');
    expect(result.body).toContain('## Problem');
    expect(result.frontmatter.severity).toBe('major');
    expect(result.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/todo-file.ts');
  });
});

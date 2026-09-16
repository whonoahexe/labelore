// Pure-logic unit coverage for the generic page-window helper, plus source() assertions proving
// roadmap-page.tsx actually wires it in at page size 4. Mirrors the house style established by
// scroll-settle.test.ts: a Node-only test file (no jsdom/testing-library in this project) that
// pairs behavioral cases against the pure module with grep-style assertions against the consumer.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { paginate } from '../../src/web/pages/list-pagination.ts';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('paginate', () => {
  it('7 items, page 1, size 4 — returns the first four with a two-page window', () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    const result = paginate(items, 1, 4);
    expect(result.items).toEqual([1, 2, 3, 4]);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(2);
    expect(result.start).toBe(1);
    expect(result.end).toBe(4);
    expect(result.total).toBe(7);
  });

  it('7 items, page 2, size 4 — returns the trailing three', () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    const result = paginate(items, 2, 4);
    expect(result.items).toEqual([5, 6, 7]);
    expect(result.start).toBe(5);
    expect(result.end).toBe(7);
  });

  it('8 items, page 2, size 4 — exact-multiple boundary produces no trailing empty page', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = paginate(items, 2, 4);
    expect(result.items).toEqual([5, 6, 7, 8]);
    expect(result.start).toBe(5);
    expect(result.end).toBe(8);
    expect(result.totalPages).toBe(2);
  });

  it('3 items, page 1, size 4 — all visible on a single page', () => {
    const items = [1, 2, 3];
    const result = paginate(items, 1, 4);
    expect(result.items).toEqual([1, 2, 3]);
    expect(result.totalPages).toBe(1);
    expect(result.start).toBe(1);
    expect(result.end).toBe(3);
  });

  it('0 items, page 1, size 4 — reports an empty window rather than 1-0 of 0', () => {
    const items: number[] = [];
    const result = paginate(items, 1, 4);
    expect(result.items).toEqual([]);
    expect(result.totalPages).toBe(0);
    expect(result.start).toBe(0);
    expect(result.end).toBe(0);
    expect(result.total).toBe(0);
  });

  it('7 items, page 9, size 4 — clamps to the last page', () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    const result = paginate(items, 9, 4);
    expect(result.items).toEqual([5, 6, 7]);
    expect(result.page).toBe(2);
  });

  it('7 items, page 0 and page -3, size 4 — clamps to the first page', () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    const zero = paginate(items, 0, 4);
    expect(zero.items).toEqual([1, 2, 3, 4]);
    expect(zero.page).toBe(1);

    const negative = paginate(items, -3, 4);
    expect(negative.items).toEqual([1, 2, 3, 4]);
    expect(negative.page).toBe(1);
  });

  it('is generic over element type — the requirement element shape round-trips unchanged', () => {
    interface Requirement {
      id: string;
      text: string | null;
      checked: boolean | null;
      url: string | null;
    }
    const requirements: Requirement[] = [
      { id: 'A-01', text: 'first', checked: true, url: null },
      { id: 'A-02', text: null, checked: false, url: '/a' },
    ];
    const result = paginate(requirements, 1, 4);
    expect(result.items).toEqual(requirements);
  });
});

describe('list-pagination wiring in roadmap-page.tsx', () => {
  it('imports the helper from ./list-pagination.ts', async () => {
    const contents = await source('src/web/pages/roadmap-page.tsx');
    expect(contents).toContain("from './list-pagination.ts'");
  });

  it('declares a page-size constant whose value is 4', async () => {
    const contents = await source('src/web/pages/roadmap-page.tsx');
    expect(contents).toMatch(/REQUIREMENT_PAGE_SIZE\s*=\s*4/);
  });

  it('calls paginate with the phase requirement array', async () => {
    const contents = await source('src/web/pages/roadmap-page.tsx');
    expect(contents).toMatch(/paginate\(phase\.requirements/);
  });

  it('renders the requirement-pagination class name and both control labels', async () => {
    const contents = await source('src/web/pages/roadmap-page.tsx');
    expect(contents).toContain('requirement-pagination');
    expect(contents).toContain('Previous page');
    expect(contents).toContain('Next page');
  });
});

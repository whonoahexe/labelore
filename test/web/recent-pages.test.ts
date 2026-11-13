// Phase 13, 13-05: the per-viewer Recent list. A fake storage stands in for localStorage and can throw on
// either call, because the real one does in private mode and under a locked-down policy (D-02, T-13-15).
import { describe, expect, it } from 'vitest';
import { RECENT_LIMIT, readRecent, recentKey, recordRecent } from '../../src/web/palette/recent-pages.ts';
import type { RecentStorage } from '../../src/web/palette/recent-pages.ts';

class FakeStorage implements RecentStorage {
  readonly values = new Map<string, string>();
  throwOnGet = false;
  throwOnSet = false;
  getItem(key: string): string | null {
    if (this.throwOnGet) throw new Error('blocked');
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.throwOnSet) throw new Error('quota');
    this.values.set(key, value);
  }
}

const KEY = recentKey('lendshed', null);

function entry(n: number): { path: string; title: string; at: number } {
  return { path: `/page-${n}`, title: `Page ${n}`, at: 1000 + n };
}

describe('recentKey', () => {
  it('is per project, and per workstream scope inside a workstream', () => {
    expect(recentKey('lendshed', null)).toBe('labelore:palette-recent:lendshed');
    expect(recentKey('lendshed', 'intake')).toBe('labelore:palette-recent:lendshed:ws:intake');
  });
});

describe('readRecent', () => {
  it('returns [] with no storage, no value, or a getItem that throws', () => {
    expect(readRecent(null, KEY)).toEqual([]);
    expect(readRecent(new FakeStorage(), KEY)).toEqual([]);
    const blocked = new FakeStorage();
    blocked.throwOnGet = true;
    expect(readRecent(blocked, KEY)).toEqual([]);
  });

  it('returns [] when the value is not JSON or not an array', () => {
    const storage = new FakeStorage();
    storage.values.set(KEY, '{nope');
    expect(readRecent(storage, KEY)).toEqual([]);
    storage.values.set(KEY, JSON.stringify({ path: '/a', title: 'A', at: 1 }));
    expect(readRecent(storage, KEY)).toEqual([]);
    storage.values.set(KEY, 'null');
    expect(readRecent(storage, KEY)).toEqual([]);
  });

  it('keeps valid entries and drops the ones that fail the shape check', () => {
    const storage = new FakeStorage();
    const good = entry(1);
    storage.values.set(
      KEY,
      JSON.stringify([
        good,
        null,
        'text',
        { path: 'no-slash', title: 'A', at: 1 },
        { path: '//evil.example/x', title: 'A', at: 1 },
        { path: 'https://evil.example/x', title: 'A', at: 1 },
        { path: '/ok', title: 7, at: 1 },
        { path: '/ok', title: 'A', at: 'soon' },
        { path: '/ok', title: 'A' },
        { path: '/a'.repeat(300), title: 'A', at: 1 },
        { path: '/ok', title: 'T'.repeat(201), at: 1 },
        { path: '/bad\u0000path', title: 'A', at: 1 },
      ]),
    );
    expect(readRecent(storage, KEY)).toEqual([good]);
  });

  it('accepts the exact limits (512 path, 200 title) and returns at most RECENT_LIMIT', () => {
    const storage = new FakeStorage();
    const edge = { path: `/${'p'.repeat(511)}`, title: 'T'.repeat(200), at: 5 };
    storage.values.set(KEY, JSON.stringify([edge]));
    expect(readRecent(storage, KEY)).toEqual([edge]);
    expect(RECENT_LIMIT).toBe(5);
    storage.values.set(KEY, JSON.stringify([1, 2, 3, 4, 5, 6, 7].map(entry)));
    expect(readRecent(storage, KEY)).toEqual([1, 2, 3, 4, 5].map(entry));
  });
});

describe('recordRecent', () => {
  it('puts the new entry first, drops an older entry with the same path, and keeps five', () => {
    const storage = new FakeStorage();
    for (const n of [1, 2, 3, 4, 5]) recordRecent(storage, KEY, entry(n));
    expect(readRecent(storage, KEY).map((item) => item.path)).toEqual(['/page-5', '/page-4', '/page-3', '/page-2', '/page-1']);
    recordRecent(storage, KEY, entry(3));
    expect(readRecent(storage, KEY).map((item) => item.path)).toEqual(['/page-3', '/page-5', '/page-4', '/page-2', '/page-1']);
    recordRecent(storage, KEY, entry(6));
    expect(readRecent(storage, KEY).map((item) => item.path)).toEqual(['/page-6', '/page-3', '/page-5', '/page-4', '/page-2']);
  });

  it('returns the list it stored, and stores only path, title and time', () => {
    const storage = new FakeStorage();
    const stored = recordRecent(storage, KEY, { ...entry(1), extra: 'secret' } as ReturnType<typeof entry>);
    expect(stored).toEqual([entry(1)]);
    expect(JSON.parse(storage.values.get(KEY) ?? 'null')).toEqual([entry(1)]);
  });

  it('swallows a setItem that throws and a getItem that throws', () => {
    const full = new FakeStorage();
    full.throwOnSet = true;
    expect(() => recordRecent(full, KEY, entry(1))).not.toThrow();
    const blocked = new FakeStorage();
    blocked.throwOnGet = true;
    blocked.throwOnSet = true;
    expect(() => recordRecent(blocked, KEY, entry(1))).not.toThrow();
    expect(() => recordRecent(null, KEY, entry(1))).not.toThrow();
  });

  it('refuses to store an entry that would fail the shape check on the way back', () => {
    const storage = new FakeStorage();
    recordRecent(storage, KEY, { path: 'https://evil.example/', title: 'x', at: 1 });
    recordRecent(storage, KEY, { path: '/ok', title: 'x'.repeat(201), at: 1 });
    recordRecent(storage, KEY, { path: '/ok', title: 'x', at: Number.NaN });
    expect(storage.values.has(KEY)).toBe(false);
  });
});

// The pure settings model (PLAT-06, D-12): the tolerant parse matrix, every skip reason with its exact
// notice, unknown keys round-tripping, and the small updates the registry applies.
import { describe, expect, it } from 'vitest';
import {
  NOTICE_TOO_NEW,
  NOTICE_UNREADABLE,
  SETTINGS_VERSION,
  addEntry,
  forgetEntry,
  parseSettings,
  saveFailedNotice,
  serializeSettings,
  setNameHint,
  skippedNotice,
  stampOpened,
} from '../../src/server/settings-model.ts';

const NOW = '2026-10-30T12:34:56.789Z';
const entry = (over: Record<string, unknown> = {}) => ({
  target: '/work/portal',
  slug: 'portal',
  addedAt: NOW,
  lastOpened: null,
  ...over,
});
const file = (over: Record<string, unknown> = {}) => JSON.stringify({ version: 1, projects: [entry()], lastActive: null, ...over });

describe('parseSettings', () => {
  it('reads a missing file as an empty state with no notice', () => {
    const parsed = parseSettings(null);
    expect(parsed.condition).toBe('missing');
    expect(parsed.state.projects).toEqual([]);
    expect(parsed.state.version).toBe(SETTINGS_VERSION);
    expect(parsed.notices).toEqual([]);
  });

  it('reads a valid file', () => {
    const parsed = parseSettings(file({ lastActive: 'portal' }));
    expect(parsed.condition).toBe('ok');
    expect(parsed.notices).toEqual([]);
    expect(parsed.state.projects).toHaveLength(1);
    expect(parsed.state.projects[0]).toMatchObject({ target: '/work/portal', slug: 'portal', addedAt: NOW, lastOpened: null });
    expect(parsed.state.lastActive).toBe('portal');
  });

  it('reads an absent version as 1', () => {
    const parsed = parseSettings(JSON.stringify({ projects: [entry()] }));
    expect(parsed.condition).toBe('ok');
    expect(parsed.state.version).toBe(1);
  });

  it.each([
    ['not JSON', '{ not json'],
    ['an empty file', ''],
    ['a JSON array', '[]'],
    ['a JSON string', '"x"'],
    ['null', 'null'],
    ['projects not an array', JSON.stringify({ version: 1, projects: {} })],
    ['no projects', JSON.stringify({ version: 1 })],
    ['a string version', JSON.stringify({ version: '1', projects: [] })],
    ['a fractional version', JSON.stringify({ version: 1.5, projects: [] })],
    ['version 0', JSON.stringify({ version: 0, projects: [] })],
    ['a negative version', JSON.stringify({ version: -3, projects: [] })],
  ])('treats %s as corrupt, empty, with the unreadable notice, and does not throw', (_name, text) => {
    const parsed = parseSettings(text);
    expect(parsed.condition).toBe('corrupt');
    expect(parsed.state.projects).toEqual([]);
    expect(parsed.notices).toEqual([NOTICE_UNREADABLE]);
  });

  it('skips a slug that cannot become a string instead of throwing (T-08-12)', () => {
    const hostile: unknown[] = [{ toString: 1 }, [{ toString: 1 }], { valueOf: 1, toString: 1 }];
    for (const slug of hostile) {
      const text = JSON.stringify({ version: 1, projects: [entry({ slug, target: '/a' }), entry({ slug: 'fine', target: '/b' })] });
      const parsed = parseSettings(text);
      expect(parsed.condition).toBe('ok');
      expect(parsed.state.projects.map((p) => p.slug)).toEqual(['fine']);
      expect(parsed.notices).toHaveLength(1);
      expect(parsed.notices[0]).toMatch(/^A saved project was skipped: its slug .* is not a valid project name\.$/);
    }
  });

  it('reads a newer version as far as it validates and says so', () => {
    const parsed = parseSettings(file({ version: 2 }));
    expect(parsed.condition).toBe('too-new');
    expect(parsed.notices).toEqual([NOTICE_TOO_NEW]);
    expect(parsed.state.projects.map((p) => p.slug)).toEqual(['portal']);
    expect(parsed.state.version).toBe(2);
  });

  it('skips each invalid entry with its exact notice, in file order, never throwing', () => {
    const text = JSON.stringify({
      version: 1,
      projects: [
        entry({ slug: 'API', target: '/a' }),
        entry({ slug: 'api', target: '/b' }),
        entry({ slug: 'portal', target: '/c' }),
        entry({ slug: 'portal', target: '/d' }),
        entry({ slug: 'other', target: '/c' }),
        entry({ slug: 'noloc', target: '' }),
        entry({ slug: 'nul', target: 'a\0b' }),
        entry({ slug: 'long', target: 'x'.repeat(1025) }),
        entry({ slug: 'missing', target: undefined }),
        'not an object',
        entry({ slug: 'fine', target: '/e' }),
      ],
    });
    const parsed = parseSettings(text);
    expect(parsed.condition).toBe('ok');
    expect(parsed.state.projects.map((p) => p.slug)).toEqual(['portal', 'fine']);
    expect(parsed.notices).toEqual([
      skippedNotice('its slug "API" is not a valid project name'),
      skippedNotice('its slug "api" is reserved'),
      skippedNotice('its slug "portal" is used twice'),
      skippedNotice('it repeats another saved project'),
      skippedNotice('it has no location'),
      skippedNotice('it has no location'),
      skippedNotice('it has no location'),
      skippedNotice('it has no location'),
      skippedNotice('it has no location'),
    ]);
    expect(parsed.notices[0]).toBe('A saved project was skipped: its slug "API" is not a valid project name.');
  });

  it('uses the caller identity function to find a repeated project', () => {
    const text = JSON.stringify({
      version: 1,
      projects: [entry({ slug: 'one', target: '/x/p' }), entry({ slug: 'two', target: '/x/p/' })],
    });
    const parsed = parseSettings(text, (target) => target.replace(/\/+$/, ''));
    expect(parsed.state.projects.map((p) => p.slug)).toEqual(['one']);
    expect(parsed.notices).toEqual([skippedNotice('it repeats another saved project')]);
  });

  it('keeps copy exact', () => {
    expect(NOTICE_UNREADABLE).toBe(
      "Labelore's settings could not be read, so the list started empty. The old file was kept as settings.json.bak.",
    );
    expect(saveFailedNotice('EACCES')).toBe(
      'Could not save the project list: EACCES. The change lasts only until Labelore restarts.',
    );
  });
});

describe('serializeSettings', () => {
  it('writes two-space JSON with a trailing newline', () => {
    const text = serializeSettings(parseSettings(file()).state);
    expect(text.endsWith('}\n')).toBe(true);
    expect(text).toContain('\n  "version": 1,');
  });

  it('round-trips unknown top-level and entry keys and the timestamps byte for byte', () => {
    const input = JSON.stringify({
      version: 1,
      projects: [entry({ lastOpened: '2026-10-29T01:02:03.004Z', color: 'red', nested: { a: [1, 2] } })],
      lastActive: 'portal',
      theme: { dark: true },
    });
    const once = serializeSettings(parseSettings(input).state);
    const twice = serializeSettings(parseSettings(once).state);
    expect(twice).toBe(once);
    const reread = JSON.parse(once);
    expect(reread.theme).toEqual({ dark: true });
    expect(reread.projects[0].color).toBe('red');
    expect(reread.projects[0].nested).toEqual({ a: [1, 2] });
    expect(reread.projects[0].addedAt).toBe(NOW);
    expect(reread.projects[0].lastOpened).toBe('2026-10-29T01:02:03.004Z');
  });
});

describe('updates', () => {
  const identityOf = (target: string) => target;
  const empty = parseSettings(null).state;

  it('allocates portal then portal-2, and answers duplicate for a repeated identity', () => {
    const a = addEntry(empty, { target: '/a/portal', identity: '/a/portal', slugBase: 'portal', identityOf, now: NOW });
    expect(a).toMatchObject({ slug: 'portal', duplicate: false });
    const b = addEntry(a.state, { target: '/b/portal', identity: '/b/portal', slugBase: 'portal', identityOf, now: NOW });
    expect(b).toMatchObject({ slug: 'portal-2', duplicate: false });
    const again = addEntry(b.state, { target: '/a/portal', identity: '/a/portal', slugBase: 'portal', identityOf, now: NOW });
    expect(again).toMatchObject({ slug: 'portal', duplicate: true });
    expect(again.state.projects).toHaveLength(2);
    expect(b.state.projects[1]).toMatchObject({ addedAt: NOW, lastOpened: null });
  });

  it('stamps lastOpened and lastActive with ISO strings that round-trip unchanged', () => {
    const added = addEntry(empty, { target: '/a/p', identity: '/a/p', slugBase: 'p', identityOf, now: NOW }).state;
    const stamp = new Date(Date.UTC(2026, 9, 30, 8, 0, 0, 5)).toISOString();
    const stamped = stampOpened(added, 'p', stamp);
    expect(stamped.lastActive).toBe('p');
    expect(stamped.projects[0]?.lastOpened).toBe(stamp);
    const back = parseSettings(serializeSettings(stamped)).state;
    expect(back.projects[0]?.lastOpened).toBe(stamp);
    expect(back.projects[0]?.addedAt).toBe(NOW);
    expect(stampOpened(added, 'nope', stamp)).toBe(added);
  });

  it('forgets an entry and clears lastActive when it named that entry', () => {
    const added = addEntry(empty, { target: '/a/p', identity: '/a/p', slugBase: 'p', identityOf, now: NOW }).state;
    const stamped = stampOpened(added, 'p', NOW);
    const forgotten = forgetEntry(stamped, 'p');
    expect(forgotten.projects).toEqual([]);
    expect(forgotten.lastActive).toBeNull();
  });

  it('sets a name hint and keeps it through a round trip', () => {
    const added = addEntry(empty, { target: '/a/p', identity: '/a/p', slugBase: 'p', identityOf, now: NOW }).state;
    const named = setNameHint(added, 'p', 'Portal');
    expect(parseSettings(serializeSettings(named)).state.projects[0]?.name).toBe('Portal');
  });
});

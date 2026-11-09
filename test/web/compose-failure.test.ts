// Phase 11 gap closure G-11-2 (L2B-WR-03): the pause, spikes and indexes composers used to swallow every exception
// and return null with no trace, so a regression in any of them looked like the feature not appearing. Each now
// logs once with the view's name and still returns null, so the page falls back to the plain document.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildIndexesContext } from '../../src/presentation/indexes-context.ts';
import { buildPauseContext } from '../../src/presentation/pause-context.ts';
import { buildSpikesContext } from '../../src/presentation/spikes-context.ts';
import { composeFailed } from '../../src/web/views/compose-failure.ts';
import { composeIndexes } from '../../src/web/views/indexes-page.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { composePause } from '../../src/web/views/pause-page.ts';
import { composeSpikes } from '../../src/web/views/spikes-page.ts';
import { loadFixtureProject } from '../helpers/fixture-project.ts';

const BOOM = new Error('boom from a poisoned context');

/** A context whose every property read throws, standing for a malformed lift the composer did not expect. */
function poisoned<T>(): T {
  return new Proxy({}, {
    get() {
      throw BOOM;
    },
  }) as T;
}

const base: ViewInput = { kind: 'handoff', frontmatter: {}, structured: {}, groups: [], planSegments: [] };

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe('composeFailed', () => {
  it('logs once with the view name and the error, and returns null', () => {
    expect(composeFailed('pause', BOOM)).toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [first, second] = errorSpy.mock.calls[0] as [unknown, unknown];
    expect(String(first)).toContain('pause');
    expect(second).toBe(BOOM);
  });
});

describe('a composer given a context that throws', () => {
  const cases: Array<[string, (input: ViewInput) => unknown, Partial<ViewInput>]> = [
    ['pause', composePause, { pauseContext: poisoned() }],
    ['spikes', composeSpikes, { spikesContext: poisoned() }],
    ['indexes', composeIndexes, { indexesContext: poisoned() }],
  ];

  for (const [view, compose, context] of cases) {
    it(`${view}: returns null and writes one console.error naming the view with the error`, () => {
      expect(compose({ ...base, ...context })).toBeNull();
      expect(errorSpy).toHaveBeenCalledTimes(1);
      const [first, ...rest] = errorSpy.mock.calls[0] as unknown[];
      expect(String(first)).toContain(view);
      expect(rest).toContain(BOOM);
    });

    it(`${view}: given no context still returns null without logging`, () => {
      expect(compose({ ...base })).toBeNull();
      expect(compose({ ...base, pauseContext: null, spikesContext: null, indexesContext: null })).toBeNull();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  }
});

describe('a composer given its Lendshed context', () => {
  it('composes as before and logs nothing', async () => {
    const { presentation } = await loadFixtureProject();
    const pause = buildPauseContext(presentation, '.planning/HANDOFF.json');
    expect(pause).not.toBeNull();
    expect(composePause({ ...base, pauseContext: pause })).not.toBeNull();

    const spikes = buildSpikesContext(presentation, '.planning/spikes/MANIFEST.md');
    expect(spikes).not.toBeNull();
    expect(composeSpikes({ ...base, kind: 'spikes-manifest', spikesContext: spikes })).not.toBeNull();

    const indexes = buildIndexesContext(presentation, '.planning/graphs/graph.json', null);
    expect(indexes).not.toBeNull();
    expect(composeIndexes({ ...base, kind: 'graph', indexesContext: indexes })).not.toBeNull();

    expect(errorSpy).not.toHaveBeenCalled();
  });
});

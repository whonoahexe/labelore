import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { scrollWhenSettled, type ScrollSettleHost } from '../../src/web/pages/scroll-settle.ts';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

interface HostRecorder {
  scrollCalls: number[];
  scheduleCalls: number;
  cancelCalls: number[];
}

/**
 * Builds a synchronous fake host over a fixed sequence of signatures. `schedule` records the
 * callback instead of invoking it — the test drives frames manually via the returned `drive()`.
 * The last entry of `signatures` repeats for any measurement beyond the sequence's length.
 */
function fakeHost(signatures: Array<number | null>): {
  host: ScrollSettleHost;
  recorder: HostRecorder;
  drive: () => void;
} {
  let index = 0;
  let currentSignature: number | null = null;
  let pending: (() => void) | null = null;
  let nextHandle = 1;
  const recorder: HostRecorder = { scrollCalls: [], scheduleCalls: 0, cancelCalls: [] };

  const host: ScrollSettleHost = {
    measure: () => {
      currentSignature = index < signatures.length ? signatures[index] : signatures[signatures.length - 1];
      index += 1;
      return currentSignature;
    },
    scroll: () => {
      recorder.scrollCalls.push(currentSignature as number);
    },
    schedule: (callback) => {
      recorder.scheduleCalls += 1;
      pending = callback;
      return nextHandle++;
    },
    cancel: (handle) => {
      recorder.cancelCalls.push(handle);
    },
  };

  function drive(): void {
    const callback = pending;
    pending = null;
    callback?.();
  }

  return { host, recorder, drive };
}

describe('scrollWhenSettled', () => {
  it('keeps scheduling and stops at the frame budget without throwing when the signature changes every frame', () => {
    const signatures = Array.from({ length: 10 }, (_, index) => index);
    const { host, recorder, drive } = fakeHost(signatures);

    expect(() => {
      scrollWhenSettled(host, { maxFrames: 5, stableFrames: 2 });
      for (let i = 0; i < 10; i += 1) drive();
    }).not.toThrow();

    // Budget is 5 frames; the loop stops scheduling once frameCount reaches it.
    expect(recorder.scrollCalls).toHaveLength(5);
    expect(recorder.scheduleCalls).toBe(4);
  });

  it('scrolls once and stops once the stability threshold is met when the signature is stable from the first measurement', () => {
    const { host, recorder, drive } = fakeHost([5, 5, 5, 5, 5]);

    scrollWhenSettled(host);
    drive();
    drive();
    drive(); // extra drive is a no-op: the loop already stopped scheduling

    expect(recorder.scrollCalls).toEqual([5]);
    expect(recorder.scheduleCalls).toBe(2);
  });

  it('issues its final scroll only after the signature reaches its stabilised value, not before', () => {
    const { host, recorder, drive } = fakeHost([1, 2, 3, 3, 3, 3, 3]);

    scrollWhenSettled(host);
    drive();
    drive();
    drive();
    drive();

    expect(recorder.scrollCalls).toEqual([1, 2, 3]);
    expect(recorder.scrollCalls.at(-1)).toBe(3);
  });

  it('cancels any outstanding scheduled frame via the disposer, and calling it twice is safe', () => {
    const signatures = Array.from({ length: 40 }, (_, index) => index); // never stabilises
    const { host, recorder } = fakeHost(signatures);

    const dispose = scrollWhenSettled(host);
    expect(recorder.scheduleCalls).toBe(1);

    dispose();
    expect(recorder.cancelCalls).toEqual([1]);

    expect(() => dispose()).not.toThrow();
    expect(recorder.cancelCalls).toEqual([1]);
  });

  it('schedules no scroll and completes without throwing when measure returns null on the first call', () => {
    const { host, recorder } = fakeHost([null]);

    expect(() => scrollWhenSettled(host)).not.toThrow();
    expect(recorder.scrollCalls).toEqual([]);
    expect(recorder.scheduleCalls).toBe(0);
  });
});

describe('scroll-settle module purity', () => {
  it('contains no document, window, or React reference', async () => {
    const contents = await source('src/web/pages/scroll-settle.ts');
    expect(contents).not.toMatch(/\bdocument\b|\bwindow\b|from 'react'/);
  });
});

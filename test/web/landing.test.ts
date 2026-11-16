import { describe, expect, it } from 'vitest';
import {
  LANDING_FLASH_MS,
  LANDING_MAX_FRAMES,
  landingScrollBehavior,
  landingTargetOf,
  waitForElement,
  type ElementWaitHost,
} from '../../src/web/landing.ts';

/** A fake host whose `find` answers from a fixed sequence (the last entry repeats) and whose frames the test drives. */
function fakeHost(answers: Array<string | null>): {
  host: ElementWaitHost<string>;
  drive: () => void;
  stats: { finds: number; scheduled: number; cancelled: number[] };
} {
  let pending: (() => void) | null = null;
  let nextHandle = 1;
  const stats = { finds: 0, scheduled: 0, cancelled: [] as number[] };
  const host: ElementWaitHost<string> = {
    find: () => {
      const answer = stats.finds < answers.length ? answers[stats.finds] : answers[answers.length - 1];
      stats.finds += 1;
      return answer;
    },
    schedule: (callback) => {
      stats.scheduled += 1;
      pending = callback;
      return nextHandle++;
    },
    cancel: (handle) => {
      stats.cancelled.push(handle);
      pending = null;
    },
  };
  function drive(): void {
    const callback = pending;
    pending = null;
    callback?.();
  }
  return { host, drive, stats };
}

describe('landingTargetOf', () => {
  it('passes the three jump anchor prefixes through without the hash sign', () => {
    expect(landingTargetOf('#decision-d-12')).toBe('decision-d-12');
    expect(landingTargetOf('#review-finding-wr-03')).toBe('review-finding-wr-03');
    expect(landingTargetOf('#requirement-find-06')).toBe('requirement-find-06');
  });

  it('gives null for an ordinary heading, an empty hash and an over-long hash', () => {
    expect(landingTargetOf('#goal')).toBeNull();
    expect(landingTargetOf('')).toBeNull();
    expect(landingTargetOf('#')).toBeNull();
    expect(landingTargetOf(`#decision-${'a'.repeat(200)}`)).toBeNull();
  });

  it('gives null for a malformed escape without throwing', () => {
    expect(landingTargetOf('#%E0%A4%A')).toBeNull();
  });
});

describe('waitForElement', () => {
  it('calls onFound exactly once, after the element appears on a later frame', () => {
    const { host, drive, stats } = fakeHost([null, null, 'el']);
    const found: string[] = [];
    waitForElement(host, (element) => found.push(element), LANDING_MAX_FRAMES);
    expect(found).toEqual([]);
    drive();
    expect(found).toEqual([]);
    drive();
    expect(found).toEqual(['el']);
    drive();
    expect(found).toEqual(['el']);
    expect(stats.finds).toBe(3);
    expect(stats.scheduled).toBe(2);
  });

  it('calls onFound at once when the element is already there', () => {
    const { host, stats } = fakeHost(['el']);
    const found: string[] = [];
    waitForElement(host, (element) => found.push(element), LANDING_MAX_FRAMES);
    expect(found).toEqual(['el']);
    expect(stats.scheduled).toBe(0);
  });

  it('stops after the frame bound and never calls onFound when the element never appears', () => {
    const { host, drive, stats } = fakeHost([null]);
    const found: string[] = [];
    waitForElement(host, (element) => found.push(element), 5);
    for (let frame = 0; frame < 20; frame += 1) drive();
    expect(found).toEqual([]);
    expect(stats.scheduled).toBe(5);
  });

  it('cancels the pending frame when disposed, and a disposed wait finds nothing more', () => {
    const { host, drive, stats } = fakeHost([null, 'el']);
    const found: string[] = [];
    const dispose = waitForElement(host, (element) => found.push(element), LANDING_MAX_FRAMES);
    dispose();
    dispose();
    drive();
    expect(stats.cancelled).toEqual([1]);
    expect(found).toEqual([]);
  });

  it('keeps the bound near three seconds of frames and the flash at 1.4 s', () => {
    expect(LANDING_MAX_FRAMES).toBe(180);
    expect(LANDING_FLASH_MS).toBe(1400);
  });
});

describe('landingScrollBehavior', () => {
  it('is instant under reduced motion and smooth otherwise', () => {
    expect(landingScrollBehavior(true)).toBe('auto');
    expect(landingScrollBehavior(false)).toBe('smooth');
  });
});


// Where a palette jump lands (13-02, D-05). A jump opens a page at `#<anchor>`; this helper waits for the
// element that anchor names, scrolls it to the centre, focuses it and marks it `data-landed="true"` for
// LANDING_FLASH_MS so the stylesheet can flash it once. A page with no such element is left alone: it opens
// at the top of the file, with no flash and no notice.
import { useEffect } from 'react';
import { isJumpAnchor } from '../presentation/jump-anchors.ts';
import { useProjectLocation } from './nav.tsx';
import { scrollWhenSettled } from './pages/scroll-settle.ts';

/** About 3 s at 60 frames a second: long enough for a page that fetches its document before it renders. */
export const LANDING_MAX_FRAMES = 180;

/** How long the landed item stays marked; the flash animation and the reduced-motion tint share it. */
export const LANDING_FLASH_MS = 1400;

/**
 * The element id a location hash asks to land on, or null. Only ids the palette could have built
 * (`isJumpAnchor`) qualify, so an ordinary heading hash, an over-long hash or a malformed escape is left to
 * the page's own handling.
 */
export function landingTargetOf(hash: string): string | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (raw === '') return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return isJumpAnchor(decoded) ? decoded : null;
}

/** The injected frame primitives and lookup, so the wait runs under vitest with no DOM. */
export interface ElementWaitHost<T> {
  /** The element now, or null while the page has not rendered it. */
  find(): T | null;
  /** Schedules `callback` for the next frame; returns an opaque handle for `cancel`. */
  schedule(callback: () => void): number;
  /** Cancels a previously scheduled frame. */
  cancel(handle: number): void;
}

/**
 * Looks for the element now and then once per scheduled frame, calls `onFound` once when it appears, and
 * stops after `maxFrames` scheduled frames without finding it. Returns a disposer that cancels the pending
 * frame; safe to call more than once.
 */
export function waitForElement<T>(
  host: ElementWaitHost<T>,
  onFound: (element: T) => void,
  maxFrames: number,
): () => void {
  let disposed = false;
  let handle: number | null = null;
  let frames = 0;

  function look(): void {
    if (disposed) return;
    handle = null;
    const element = host.find();
    if (element !== null) {
      onFound(element);
      return;
    }
    if (frames >= maxFrames) return;
    frames += 1;
    handle = host.schedule(look);
  }

  look();

  return function dispose(): void {
    if (disposed) return;
    disposed = true;
    if (handle !== null) {
      host.cancel(handle);
      handle = null;
    }
  };
}

/** The scroll behaviour of a landing: instant when the reader asked for reduced motion, smooth otherwise. */
export function landingScrollBehavior(reducedMotion: boolean): 'auto' | 'smooth' {
  return reducedMotion ? 'auto' : 'smooth';
}

/**
 * Lands the page on the element a palette jump named. Mounted once, at the top of the shell: on every
 * navigation (location key) or hash change it takes the jump anchor from the hash, waits for the element,
 * then scrolls, focuses and marks it. Anything that is not a jump anchor is ignored.
 */
export function useLanding(): void {
  const { key, hash } = useProjectLocation();

  useEffect(() => {
    const target = landingTargetOf(hash);
    if (target === null) return undefined;

    let disposeSettle: (() => void) | null = null;
    let flashTimer: ReturnType<typeof setTimeout> | null = null;
    let landed: HTMLElement | null = null;

    const disposeWait = waitForElement<HTMLElement>(
      {
        find: () => document.getElementById(target),
        schedule: (callback) => requestAnimationFrame(callback),
        cancel: (handle) => cancelAnimationFrame(handle),
      },
      (element) => {
        // Read once the element is found, not subscribed: a setting changed mid-jump applies to the next jump.
        const behavior = landingScrollBehavior(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        disposeSettle = scrollWhenSettled({
          measure: () => {
            const current = document.getElementById(target);
            if (!current) return null;
            return window.scrollY + current.getBoundingClientRect().top + document.documentElement.scrollHeight;
          },
          scroll: () => {
            document.getElementById(target)?.scrollIntoView({ block: 'center', behavior });
          },
          schedule: (callback) => requestAnimationFrame(callback),
          cancel: (handle) => cancelAnimationFrame(handle),
        });
        if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
        element.focus({ preventScroll: true });
        element.setAttribute('data-landed', 'true');
        landed = element;
        flashTimer = setTimeout(() => {
          element.removeAttribute('data-landed');
          landed = null;
        }, LANDING_FLASH_MS);
      },
      LANDING_MAX_FRAMES,
    );

    return () => {
      disposeWait();
      disposeSettle?.();
      if (flashTimer !== null) clearTimeout(flashTimer);
      landed?.removeAttribute('data-landed');
    };
  }, [key, hash]);
}

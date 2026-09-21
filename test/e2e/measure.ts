// page.evaluate-safe signature functions: each takes a Playwright Page and returns plain JSON
// (no locators, no DOM handles) so the accumulator in results.ts can serialize every measurement
// verbatim. This file is the single home for every computed-style/bounding-box/attribute
// signature the sweep uses — later checks add functions here rather than inlining
// `page.evaluate` calls throughout the spec.
import type { Page } from '@playwright/test';

export interface FrameSignature {
  mainCount: number;
  mainClasses: string;
  x: number;
  width: number;
  paddingTop: string;
  paddingLeft: string;
  paddingRight: string;
  busy: boolean;
}

/** `main`'s own frame: page-level layout parity every page must share (F-01), and the loading
 * vs. loaded frame-stability check (F-13). */
export async function frameSignature(page: Page): Promise<FrameSignature> {
  return page.evaluate(() => {
    const mains = document.querySelectorAll('main');
    const main = mains[0] as HTMLElement | undefined;
    if (!main) {
      return {
        mainCount: mains.length,
        mainClasses: '',
        x: 0,
        width: 0,
        paddingTop: '',
        paddingLeft: '',
        paddingRight: '',
        busy: false,
      };
    }
    const rect = main.getBoundingClientRect();
    const computed = getComputedStyle(main);
    return {
      mainCount: mains.length,
      mainClasses: main.className,
      x: rect.x,
      width: rect.width,
      paddingTop: computed.paddingTop,
      paddingLeft: computed.paddingLeft,
      paddingRight: computed.paddingRight,
      busy: main.getAttribute('aria-busy') === 'true',
    };
  });
}

export interface ThemeSignature {
  isDark: boolean;
  bodyBackground: string;
}

/** Dark-mode application (F-15): the `html.dark` class actually took effect, and the resulting
 * paint is genuinely different from light mode, not just the class toggling with no visual
 * effect. */
export async function themeSignature(page: Page): Promise<ThemeSignature> {
  return page.evaluate(() => ({
    isDark: document.documentElement.classList.contains('dark'),
    bodyBackground: getComputedStyle(document.body).backgroundColor,
  }));
}

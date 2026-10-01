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

export interface HeadingSignature {
  h1Count: number;
  eyebrowCount: number;
  h1FontSize: string | null;
  h1FontWeight: string | null;
  h1LetterSpacing: string | null;
  h1LineHeight: string | null;
  h1FontFamily: string | null;
  eyebrowFontSize: string | null;
  eyebrowColor: string | null;
  eyebrowLetterSpacing: string | null;
  eyebrowTextTransform: string | null;
  h1OffsetTop: number | null;
  /** sketch-004 B3 (quick-260922-3us): `.artifact-heading`'s own `data-layout` attribute value
   * (`'cover'` on a document adopting the new layout), or `null` when the element itself is
   * absent or carries no such attribute. */
  headingLayout: string | null;
}

/** F-02's heading-block signature: `main`'s h1/eyebrow typography plus the h1's offset from the
 * top of `main` (so a document page's header padding can be compared against the reference
 * pages' `.page-intro` envelope without assuming they share one literal offset). */
export async function headingSignature(page: Page): Promise<HeadingSignature> {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    const h1 = main?.querySelector('h1') ?? null;
    const eyebrow = main?.querySelector('.eyebrow') ?? null;
    const heading = main?.querySelector('.artifact-heading') ?? null;
    const h1Computed = h1 ? getComputedStyle(h1) : null;
    const eyebrowComputed = eyebrow ? getComputedStyle(eyebrow) : null;
    const h1OffsetTop =
      h1 && main ? h1.getBoundingClientRect().top - main.getBoundingClientRect().top : null;
    return {
      h1Count: main?.querySelectorAll('h1').length ?? 0,
      eyebrowCount: main?.querySelectorAll('.eyebrow').length ?? 0,
      h1FontSize: h1Computed?.fontSize ?? null,
      h1FontWeight: h1Computed?.fontWeight ?? null,
      h1LetterSpacing: h1Computed?.letterSpacing ?? null,
      h1LineHeight: h1Computed?.lineHeight ?? null,
      h1FontFamily: h1Computed?.fontFamily ?? null,
      eyebrowFontSize: eyebrowComputed?.fontSize ?? null,
      eyebrowColor: eyebrowComputed?.color ?? null,
      eyebrowLetterSpacing: eyebrowComputed?.letterSpacing ?? null,
      eyebrowTextTransform: eyebrowComputed?.textTransform ?? null,
      h1OffsetTop,
      headingLayout: heading?.getAttribute('data-layout') ?? null,
    };
  });
}

export interface LedeSignature {
  found: boolean;
  fontSize: string | null;
  color: string | null;
  lineHeight: string | null;
}

/** F-03's lede parity: the first `.lede`/`.artifact-lead` match inside `scopeSelector`
 * (defaults to the whole document via `main`). */
export async function ledeSignature(page: Page, scopeSelector = 'main'): Promise<LedeSignature> {
  return page.evaluate((scope: string) => {
    const root = document.querySelector(scope) ?? document.body;
    const el = root.querySelector('.lede, .artifact-lead');
    if (!el) return { found: false, fontSize: null, color: null, lineHeight: null };
    const computed = getComputedStyle(el);
    return {
      found: true,
      fontSize: computed.fontSize,
      color: computed.color,
      lineHeight: computed.lineHeight,
    };
  }, scopeSelector);
}

export interface SectionHeadingSignature {
  display: string;
  gap: string;
  h2FontSize: string | null;
  h2FontWeight: string | null;
  h2LetterSpacing: string | null;
  h2TextTransform: string | null;
  h2Color: string | null;
  borderBottom: string;
}

/** F-04: every `.section-heading` on the page, in document order. */
export async function sectionHeadingSignatures(page: Page): Promise<SectionHeadingSignature[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.section-heading')).map((el) => {
      const computed = getComputedStyle(el);
      const h2 = el.querySelector('h2');
      const h2Computed = h2 ? getComputedStyle(h2) : null;
      return {
        display: computed.display,
        gap: computed.gap,
        h2FontSize: h2Computed?.fontSize ?? null,
        h2FontWeight: h2Computed?.fontWeight ?? null,
        h2LetterSpacing: h2Computed?.letterSpacing ?? null,
        h2TextTransform: h2Computed?.textTransform ?? null,
        h2Color: h2Computed?.color ?? null,
        borderBottom: computed.borderBottom,
      };
    }),
  );
}

export interface ChipSignature {
  tone: string | null;
  fontSize: string;
  fontWeight: string;
  paddingTop: string;
  paddingLeft: string;
  borderRadius: string;
  textTransform: string;
  letterSpacing: string;
  lineHeight: string;
}

/** F-05: every `.status-chip` on the page, in document order. */
export async function chipSignatures(page: Page): Promise<ChipSignature[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.status-chip')).map((el) => {
      const computed = getComputedStyle(el);
      return {
        tone: el.getAttribute('data-tone'),
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        paddingTop: computed.paddingTop,
        paddingLeft: computed.paddingLeft,
        borderRadius: computed.borderRadius,
        textTransform: computed.textTransform,
        letterSpacing: computed.letterSpacing,
        lineHeight: computed.lineHeight,
      };
    }),
  );
}

export interface CornerRadiusEntry {
  selector: string;
  borderRadius: string;
}

const CORNER_SELECTORS = [
  '.status-chip',
  '.notice',
  '.artifact-metadata',
  '.view-block',
  '.document-canvas',
  '.document-outline-trigger',
  '.document-view-toggle button',
  // sketch-004 B3 (quick-260922-3us): strengthens F-06 over the new cover/fold/panel chrome.
  '.document-cover',
  '.document-cover-cell',
  '.document-cover-pill',
  '.document-fold',
  '.document-chapter-bar',
  '.document-also-panel',
  // quick-260923-jxp: strengthens F-06 over the answer card, ghost row, endnotes sheet and the
  // shared copy-path button.
  '.document-answer',
  '.document-option-number',
  '.document-ghost',
  '.document-endnotes',
  '.artifact-path-copy',
  // quick-260923-lju: strengthens F-06 over the CONTEXT brief's own radius-bearing chrome.
  '.view-context-hero',
  '.view-context-in',
  '.view-context-open',
  '.view-context-stat',
  '.view-context-decision',
  '.view-context-idea',
  '.artifact-meta-row',
  // quick-260929-3x3: strengthens F-06 over the RESEARCH briefing and the shared figure chrome.
  '.figure-frame',
  '.lifted-diagram-card',
  '.clean-tree-row',
  // quick-260930-mp6: the lanes-by-kind diagram's node, panel and group.
  '.lane-diagram-node',
  '.lane-diagram-panel',
  '.lane-diagram-group',
  '.view-research-recommendation',
  '.view-research-lane',
  '.view-research-pitfall',
  '.view-research-alt',
  '.view-research-back-rows',
  '.view-research-breakdown',
  // quick-260930-wfs: the PATTERNS pattern map's side panel, file rows, mapper's note and reason box.
  '.view-patterns-panel',
  '.view-patterns-row',
  '.view-patterns-note',
  '.view-patterns-reason',
  // quick-261001-qk6: the UI-SPEC page's choice cards, colour role cards, registry cards and the
  // matrix wrapper.
  '.view-ui-spec-choice',
  '.view-ui-spec-role',
  '.view-ui-spec-reg',
  '.view-ui-spec-matrix-wrap',
  // quick-261001-qk7: the UAT page's attention card, summary squares, test pairs, gap register and
  // cards, and the source-only strip.
  '.view-uat-now',
  '.view-uat-square',
  '.view-uat-pair',
  '.view-uat-register',
  '.view-uat-card',
  '.view-uat-source-only',
];

/** F-06: squared corners — every element matching one of the shared "boxy chrome" selectors,
 * across the whole page. */
export async function cornerRadii(page: Page): Promise<CornerRadiusEntry[]> {
  return page.evaluate((selectors: string[]) => {
    const out: { selector: string; borderRadius: string }[] = [];
    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach((el) => {
        out.push({ selector, borderRadius: getComputedStyle(el).borderRadius });
      });
    }
    return out;
  }, CORNER_SELECTORS);
}

/** F-07: every view-local class token found on any element inside `main`, plus `main`'s own
 * class list — reference pages must yield zero. */
export async function viewClasses(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return [];
    const found = new Set<string>();
    // `getAttribute('class')` rather than `.className` — on SVG elements (lucide-react icons)
    // `.className` is an SVGAnimatedString, not a plain string, and has no `.split`.
    const consider = (el: Element) => {
      const raw = el.getAttribute('class');
      if (!raw) return;
      for (const token of raw.split(/\s+/)) {
        if (token.startsWith('view-')) found.add(token);
      }
    };
    consider(main);
    main.querySelectorAll('[class]').forEach((el) => consider(el));
    return Array.from(found);
  });
}

export interface OutlineState {
  dataOutline: string | null;
  navVisible: boolean;
  navPosition: string | null;
  navRight: number | null;
  canvasLeft: number | null;
  layoutLeft: number | null;
  triggerVisible: boolean;
  triggerPosition: string | null;
  navEntryCount: number;
  activeCount: number;
}

/** F-08/F-09: the outline's wide-column vs. narrow-trigger state, read once before any
 * interaction (scrolling to an entry, opening the popover) the spec drives afterwards. */
export async function outlineState(page: Page): Promise<OutlineState> {
  return page.evaluate(() => {
    const isVisible = (el: Element): boolean => {
      const htmlEl = el as HTMLElement;
      return htmlEl.offsetWidth > 0 || htmlEl.offsetHeight > 0;
    };
    const layout = document.querySelector('.document-reader-layout');
    const nav = document.querySelector('nav.document-outline');
    const canvas = document.querySelector('.document-canvas');
    const trigger = document.querySelector('.document-outline-trigger');
    return {
      dataOutline: layout ? layout.getAttribute('data-outline') : null,
      navVisible: nav ? isVisible(nav) : false,
      navPosition: nav ? getComputedStyle(nav).position : null,
      navRight: nav ? nav.getBoundingClientRect().right : null,
      canvasLeft: canvas ? canvas.getBoundingClientRect().left : null,
      layoutLeft: layout ? layout.getBoundingClientRect().left : null,
      triggerVisible: trigger ? isVisible(trigger) : false,
      triggerPosition: trigger ? getComputedStyle(trigger).position : null,
      navEntryCount: nav ? nav.querySelectorAll('ol li').length : 0,
      activeCount: nav ? nav.querySelectorAll('a[data-active="true"]').length : 0,
    };
  });
}

export interface OverflowBoundary {
  scrollWidth: number;
  clientWidth: number;
  overflowX: string;
}

export interface OverflowState {
  docScrollWidth: number;
  innerWidth: number;
  mainScrollWidth: number;
  mainClientWidth: number;
  boundaries: OverflowBoundary[];
}

/** F-14: no horizontal overflow at 420px — the document as a whole, `main` itself, and every
 * `.document-overflow-boundary` (tables/code blocks that are allowed to scroll internally). */
export async function overflowState(page: Page): Promise<OverflowState> {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    return {
      docScrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      mainScrollWidth: main?.scrollWidth ?? 0,
      mainClientWidth: main?.clientWidth ?? 0,
      boundaries: Array.from(document.querySelectorAll('.document-overflow-boundary')).map(
        (el) => ({
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          overflowX: getComputedStyle(el).overflowX,
        }),
      ),
    };
  });
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A plain bounding-rect readout for `selector`'s first match, or `null` when absent — used by
 * F-10's toggle stability check (`main`, `.artifact-heading` before/after a mode switch). */
export async function boxOf(page: Page, selector: string): Promise<Box | null> {
  return page.evaluate((sel: string) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }, selector);
}

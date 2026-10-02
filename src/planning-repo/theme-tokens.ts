// The read-only, bounded project-stylesheet token resolver (quick-261002-li5). A UI-SPEC colour
// role that names a token only (`--background`, `--card`) has no value in the document; the
// target project's own stylesheet does. This module finds that stylesheet through
// `PlanningFilesystem.read` alone and resolves light (`:root`) and dark (`.dark`) values from it.
// It sits behind the planning-repo boundary: it never throws, never builds a regular expression
// from file text (T-li5-08), imports nothing from Node (the portability test keeps local-fs.ts the
// sole filesystem importer), and keeps a value only when `safeColor` accepts it (T-li5-01).

import type { PlanningFilesystem } from '../planning-fs/types.ts';
import { safeColor } from './css-color.ts';

export interface ThemeTokens {
  /** The project-relative path of the stylesheet the values came from. */
  source: string;
  /** Custom-property name (`--background`) to a validated colour value, light mode. */
  light: Record<string, string>;
  /** The same for dark mode: the light values, overridden by the dark blocks. Empty with no dark block. */
  dark: Record<string, string>;
}

export type ThemeLoader = (fs: PlanningFilesystem) => Promise<ThemeTokens | null>;

const MAX_STYLESHEET_BYTES = 512 * 1024;
const MAX_COMPONENTS_JSON_BYTES = 64 * 1024;
const MAX_DEPTH = 32;
const MAX_VAR_HOPS = 8;
const MAX_VALUE_CHARS = 400;
const MAX_RAW_DECLARATIONS = 1024;
const MAX_VALIDATED = 256;
const MAX_FRAGMENT_CHARS = 4096;
const MAX_POINTER_CHARS = 200;

/** Where the loader looks when components.json does not point at a stylesheet. A fixed list: no
 * directory is walked and nothing is globbed. */
const STYLESHEET_CANDIDATES = [
  'app/globals.css',
  'src/app/globals.css',
  'src/index.css',
  'src/globals.css',
  'src/styles/globals.css',
  'styles/globals.css',
  'frontend/app/globals.css',
  'frontend/src/app/globals.css',
  'frontend/src/index.css',
  'frontend/styles/globals.css',
];

/** The directories whose `components.json` (shadcn's config, `tailwind.css` points at the stylesheet)
 * is consulted, in order. `''` is the project root. */
const COMPONENTS_JSON_DIRS = ['', 'frontend', 'web', 'client', 'apps/web'];

const LIGHT_SELECTORS = new Set([':root', 'html', ':host']);
const DARK_SELECTORS = new Set([
  '.dark',
  ':root.dark',
  'html.dark',
  '[data-theme=dark]',
  ':root[data-theme=dark]',
  'html[data-theme=dark]',
]);

type Target = 'light' | 'dark' | 'both' | null;
type Context = 'ok' | 'dark-media' | 'bad';

interface Frame {
  /** Where this block's own declarations go. */
  target: Target;
  /** What a block nested inside this one inherits. */
  context: Context;
}

function collapse(text: string): string {
  return text.split(/\s+/).filter((piece) => piece !== '').join(' ');
}

/** Lowercased, whitespace-collapsed, quote-free selector piece. */
function normaliseSelector(piece: string): string {
  return collapse(piece).toLowerCase().split('"').join('').split("'").join('');
}

/** The target a selector list feeds, `inDarkMedia` turning light-set selectors into dark. */
function selectorTarget(prelude: string, inDarkMedia: boolean): Target {
  let light = false;
  let dark = false;
  for (const raw of prelude.split(',')) {
    const piece = normaliseSelector(raw);
    if (LIGHT_SELECTORS.has(piece)) {
      if (inDarkMedia) dark = true;
      else light = true;
    } else if (DARK_SELECTORS.has(piece)) {
      dark = true;
    }
  }
  if (light && dark) return 'both';
  if (light) return 'light';
  if (dark) return 'dark';
  return null;
}

function classify(prelude: string, parent: Frame | undefined): Frame {
  const parentContext: Context = parent ? parent.context : 'ok';
  const text = normaliseSelector(prelude);
  if (text.startsWith('@')) {
    if (parentContext === 'bad') return { target: null, context: 'bad' };
    if (text === '@layer' || text.startsWith('@layer ')) return { target: null, context: parentContext };
    const compact = text.split(' ').join('');
    if (compact === '@media(prefers-color-scheme:dark)' && parentContext === 'ok') {
      return { target: null, context: 'dark-media' };
    }
    return { target: null, context: 'bad' };
  }
  // A selector rule: its own declarations count only at the top level (or inside @layer / the dark
  // media query), and nothing nested inside it is ever read.
  if (parentContext === 'bad') return { target: null, context: 'bad' };
  return { target: selectorTarget(text, parentContext === 'dark-media'), context: 'bad' };
}

interface RawTokens {
  light: Map<string, string>;
  dark: Map<string, string>;
}

function isCustomPropertyName(name: string): boolean {
  return /^--[\w-]+$/.test(name);
}

function recordDeclaration(text: string, target: Target, raw: RawTokens): void {
  if (target === null) return;
  const colon = text.indexOf(':');
  if (colon < 1) return;
  const name = text.slice(0, colon).trim();
  if (!isCustomPropertyName(name)) return;
  let value = text.slice(colon + 1).trim();
  if (value.toLowerCase().endsWith('!important')) value = value.slice(0, -'!important'.length).trim();
  if (value === '' || value.length > MAX_VALUE_CHARS) return;
  if ((target === 'light' || target === 'both') && (raw.light.size < MAX_RAW_DECLARATIONS || raw.light.has(name))) {
    raw.light.set(name, value);
  }
  if ((target === 'dark' || target === 'both') && (raw.dark.size < MAX_RAW_DECLARATIONS || raw.dark.has(name))) {
    raw.dark.set(name, value);
  }
}

/** One linear pass over the stylesheet: strings and comments skipped, a brace-depth stack of block
 * preludes, custom-property declarations collected only from the blocks `classify` admits. */
function collectRaw(css: string): RawTokens {
  const raw: RawTokens = { light: new Map(), dark: new Map() };
  const stack: Frame[] = [];
  let overflow = 0;
  let fragment = '';
  let tooLong = false;
  const append = (ch: string): void => {
    if (fragment.length >= MAX_FRAGMENT_CHARS) tooLong = true;
    else fragment += ch;
  };
  const flushDeclaration = (): void => {
    const top = stack[stack.length - 1];
    if (top && overflow === 0 && !tooLong) recordDeclaration(fragment, top.target, raw);
    fragment = '';
    tooLong = false;
  };

  const n = css.length;
  let i = 0;
  while (i < n) {
    const ch = css[i];
    if (ch === '/' && css[i + 1] === '*') {
      const close = css.indexOf('*/', i + 2);
      i = close === -1 ? n : close + 2;
      append(' ');
      continue;
    }
    if (ch === '"' || ch === "'") {
      append(ch);
      i++;
      while (i < n && css[i] !== ch && css[i] !== '\n') {
        if (css[i] === '\\' && i + 1 < n) {
          append(css[i]);
          i++;
        }
        append(css[i]);
        i++;
      }
      if (i < n && css[i] === ch) {
        append(ch);
        i++;
      }
      continue;
    }
    if (ch === '{') {
      if (stack.length >= MAX_DEPTH) {
        overflow++;
      } else {
        stack.push(classify(tooLong ? '' : fragment, stack[stack.length - 1]));
      }
      fragment = '';
      tooLong = false;
    } else if (ch === '}') {
      if (overflow > 0) {
        overflow--;
        fragment = '';
        tooLong = false;
      } else if (stack.length > 0) {
        if (fragment.trim() !== '') flushDeclaration();
        stack.pop();
      }
      fragment = '';
      tooLong = false;
    } else if (ch === ';') {
      if (stack.length > 0 && overflow === 0) flushDeclaration();
      fragment = '';
      tooLong = false;
    } else {
      append(ch);
    }
    i++;
  }
  return raw;
}

/** `var(--x)` or `var(--x, fallback)` as a name and an optional fallback, else null. */
function parseVar(value: string): { name: string; fallback: string | null } | null {
  if (!value.startsWith('var(') || !value.endsWith(')')) return null;
  const inner = value.slice(4, -1);
  const comma = inner.indexOf(',');
  const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
  if (!isCustomPropertyName(name)) return null;
  return { name, fallback: comma === -1 ? null : inner.slice(comma + 1).trim() };
}

/** Resolves one token through `var()` chains (fallbacks included) within one mode's raw map: at
 * most MAX_VAR_HOPS follows, a repeated name is a cycle, the terminal value must pass safeColor. */
function resolveToken(name: string, raw: Map<string, string>): string | null {
  const start = raw.get(name);
  if (start === undefined) return null;
  const visited = new Set<string>([name]);
  let current = start.trim();
  let follows = 0;
  for (;;) {
    const ref = parseVar(current);
    if (!ref) return safeColor(current);
    follows++;
    if (follows > MAX_VAR_HOPS) return null;
    if (visited.has(ref.name)) return null;
    visited.add(ref.name);
    const next = raw.get(ref.name);
    if (next !== undefined) current = next.trim();
    else if (ref.fallback !== null && ref.fallback !== '') current = ref.fallback;
    else return null;
  }
}

function resolveAll(raw: Map<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  let count = 0;
  for (const name of raw.keys()) {
    if (count >= MAX_VALIDATED) break;
    const value = resolveToken(name, raw);
    if (value !== null) {
      out[name] = value;
      count++;
    }
  }
  return out;
}

/** Pure: the light and dark colour tokens a stylesheet declares, or null when none validates. */
export function resolveThemeTokens(css: string, source: string): ThemeTokens | null {
  try {
    if (typeof css !== 'string' || css === '') return null;
    const raw = collectRaw(css);
    const light = resolveAll(raw.light);
    const dark = raw.dark.size > 0 ? resolveAll(new Map([...raw.light, ...raw.dark])) : {};
    if (Object.keys(light).length === 0 && Object.keys(dark).length === 0) return null;
    return { source, light, dark };
  } catch {
    return null;
  }
}

async function readBounded(fs: PlanningFilesystem, relPath: string, cap: number): Promise<string | null> {
  try {
    const file = await fs.read(relPath);
    if (file.size > cap || file.content.length > cap) return null;
    return file.content;
  } catch {
    return null;
  }
}

/** The `tailwind.css` pointer of a shadcn components.json, only when it is a plain relative
 * `.css` path that cannot leave its directory (T-li5-02). */
function pointerOf(json: string): string | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const tailwind = (parsed as Record<string, unknown>).tailwind;
    if (typeof tailwind !== 'object' || tailwind === null) return null;
    const css = (tailwind as Record<string, unknown>).css;
    if (typeof css !== 'string' || css.length === 0 || css.length > MAX_POINTER_CHARS) return null;
    if (!css.endsWith('.css') || css.includes('\\') || css.includes(':') || css.startsWith('/')) return null;
    const trimmed = css.startsWith('./') ? css.slice(2) : css;
    for (const segment of trimmed.split('/')) {
      if (segment === '' || segment === '.' || segment === '..') return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

/** The bounded read-only lookup: components.json's pointer in a few fixed directories, then the
 * fixed conventional paths. At most one read per distinct path, never a listing, never throws. */
export async function loadThemeTokens(fs: PlanningFilesystem): Promise<ThemeTokens | null> {
  try {
    const paths: string[] = [];
    const add = (path: string): void => {
      if (!paths.includes(path)) paths.push(path);
    };
    for (const dir of COMPONENTS_JSON_DIRS) {
      const json = await readBounded(fs, dir === '' ? 'components.json' : `${dir}/components.json`, MAX_COMPONENTS_JSON_BYTES);
      if (json === null) continue;
      const pointer = pointerOf(json);
      if (pointer !== null) add(dir === '' ? pointer : `${dir}/${pointer}`);
    }
    for (const candidate of STYLESHEET_CANDIDATES) add(candidate);
    for (const path of paths) {
      const css = await readBounded(fs, path, MAX_STYLESHEET_BYTES);
      if (css === null) continue;
      const tokens = resolveThemeTokens(css, path);
      if (tokens !== null) return tokens;
    }
    return null;
  } catch {
    return null;
  }
}

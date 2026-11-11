// The Source reader's tone-only highlighter (D-04, UI-SPEC "Highlighting"). A hand-written left-to-right
// scanner that returns tokens, never HTML: the reader renders each token as a React text node (T-12-09), so
// no markup sink exists here. Lossless: the tokens' texts joined are the line.
//
// Every branch advances the index, and each "find the closing mark" search is remembered when it fails, so
// one line costs one pass whatever it holds (T-12-08): no nested unbounded quantifier, no backtracking.
import { VALUE_NOT_SHOWN_MARK } from '../../planning-repo/handlers/withhold-values.ts';
import type { SourceLanguage, SourceModel } from './source-model.ts';

/** `key` object keys, `p` punctuation and markup, `tag` tag-shaped runs, `h` headings, `b` bold, `c` inline code, `mask` masked values. */
export type ToneClass = 'key' | 'p' | 'tag' | 'h' | 'b' | 'c' | 'mask';

export interface ToneToken {
  /** Null for plain text. */
  tone: ToneClass | null;
  text: string;
}

export interface LineContext {
  inFrontmatter: boolean;
  inFence: boolean;
}

export interface HighlightOptions extends LineContext {
  language: SourceLanguage;
  /** True when the served response is masked (config.json, a masked frontmatter). */
  masked: boolean;
}

const OUTSIDE: LineContext = Object.freeze({ inFrontmatter: false, inFence: false });
const IN_FRONTMATTER: LineContext = Object.freeze({ inFrontmatter: true, inFence: false });
const IN_FENCE: LineContext = Object.freeze({ inFrontmatter: false, inFence: true });

/** Per line (index `line - 1`): is it inside the frontmatter, and inside a fenced block (a fence's closing line counts as inside). */
export function lineContextsOf(model: SourceModel): LineContext[] {
  const contexts: LineContext[] = [];
  const frontmatterEnd = model.frontmatter?.to ?? 0;
  const markdown = model.language === 'markdown';
  let fence = false;
  for (let n = 1; n <= model.lines.length; n += 1) {
    const inFrontmatter = n <= frontmatterEnd;
    contexts.push(inFrontmatter ? IN_FRONTMATTER : fence ? IN_FENCE : OUTSIDE);
    if (markdown && !inFrontmatter && model.lines[n - 1].startsWith('```')) fence = !fence;
  }
  return contexts;
}

class Sink {
  readonly tokens: ToneToken[] = [];

  push(tone: ToneClass | null, text: string): void {
    if (text === '') return;
    const last = this.tokens[this.tokens.length - 1];
    if (last && last.tone === tone) last.text += text;
    else this.tokens.push({ tone, text });
  }
}

function isSpace(code: number): boolean {
  return code === 32 || code === 9;
}

function isWordChar(code: number): boolean {
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 95 ||
    code === 45
  );
}

function isTagNameChar(code: number): boolean {
  return isWordChar(code) || code === 58; // :
}

function scanJson(seg: string, masked: boolean, sink: Sink): void {
  const n = seg.length;
  let i = 0;
  let plain = 0;
  const flush = (): void => sink.push(null, seg.slice(plain, i));
  while (i < n) {
    const ch = seg.charCodeAt(i);
    if (ch === 34) {
      // a string: a key when a colon follows it, otherwise a value (foreground)
      flush();
      let j = i + 1;
      while (j < n && seg.charCodeAt(j) !== 34) j += seg.charCodeAt(j) === 92 ? 2 : 1;
      const closed = j < n;
      const end = closed ? j + 1 : n;
      let k = end;
      while (k < n && isSpace(seg.charCodeAt(k))) k += 1;
      if (closed && seg.charCodeAt(k) === 58) {
        sink.push('key', seg.slice(i, end));
      } else {
        const inner = closed ? seg.slice(i + 1, j) : seg.slice(i + 1);
        if (closed && masked && (inner.startsWith('****') || inner === '(unset)')) {
          sink.push(null, '"');
          sink.push('mask', inner);
          sink.push(null, '"');
        } else {
          sink.push(null, seg.slice(i, end));
        }
      }
      i = end;
      plain = i;
      continue;
    }
    if (ch === 123 || ch === 125 || ch === 91 || ch === 93 || ch === 44 || ch === 58) {
      flush();
      sink.push('p', seg[i]);
      i += 1;
      plain = i;
      continue;
    }
    i += 1;
  }
  flush();
}

function scanFrontmatter(seg: string, sink: Sink): void {
  if (seg === '---') {
    sink.push('p', seg);
    return;
  }
  let i = 0;
  while (i < seg.length && isSpace(seg.charCodeAt(i))) i += 1;
  sink.push(null, seg.slice(0, i));
  if (seg.charCodeAt(i) === 45 && seg.charCodeAt(i + 1) === 32) {
    sink.push('p', '- ');
    i += 2;
  }
  let j = i;
  while (j < seg.length && isWordChar(seg.charCodeAt(j))) j += 1;
  if (j > i && seg.charCodeAt(j) === 58) {
    sink.push('key', seg.slice(i, j));
    sink.push('p', ':');
    j += 1;
    sink.push(null, seg.slice(j));
    return;
  }
  sink.push(null, seg.slice(i));
}

/** Tag-shaped runs, inline code, bold and table pipes in one pass; `base` is the tone of the plain text between. */
function scanInline(text: string, base: ToneClass | null, table: boolean, sink: Sink): void {
  const n = text.length;
  let i = 0;
  let plain = 0;
  let noTick = false;
  let noBold = false;
  let noGt = false;
  const flush = (): void => sink.push(base, text.slice(plain, i));
  while (i < n) {
    const ch = text.charCodeAt(i);
    if (ch === 60) {
      // <
      let j = i + 1;
      if (text.charCodeAt(j) === 47) j += 1;
      let k = j;
      while (k < n && isTagNameChar(text.charCodeAt(k))) k += 1;
      if (k > j) {
        let end = -1;
        if (text.charCodeAt(k) === 62) end = k;
        else if (isSpace(text.charCodeAt(k)) && !noGt) {
          end = text.indexOf('>', k);
          if (end < 0) noGt = true;
        }
        if (end >= 0) {
          flush();
          sink.push('tag', text.slice(i, end + 1));
          i = end + 1;
          plain = i;
          continue;
        }
      }
    } else if (ch === 96 && !noTick) {
      // `
      const close = text.indexOf('`', i + 1);
      if (close < 0) noTick = true;
      else if (close > i + 1) {
        flush();
        sink.push('p', '`');
        sink.push('c', text.slice(i + 1, close));
        sink.push('p', '`');
        i = close + 1;
        plain = i;
        continue;
      }
    } else if (ch === 42 && text.charCodeAt(i + 1) === 42 && !noBold) {
      // **
      const close = text.indexOf('**', i + 2);
      if (close < 0) noBold = true;
      else if (close > i + 2) {
        flush();
        sink.push('p', '**');
        sink.push('b', text.slice(i + 2, close));
        sink.push('p', '**');
        i = close + 2;
        plain = i;
        continue;
      }
    } else if (ch === 124 && table) {
      // |
      flush();
      sink.push('p', '|');
      i += 1;
      plain = i;
      continue;
    }
    i += 1;
  }
  flush();
}

function scanMarkdown(seg: string, first: boolean, table: boolean, inFence: boolean, sink: Sink): void {
  if (inFence || (first && seg.startsWith('```'))) {
    if (first && seg.startsWith('```')) sink.push('p', seg);
    else sink.push(null, seg);
    return;
  }
  if (first && seg.charCodeAt(0) === 35) {
    let h = 0;
    while (h < 7 && seg.charCodeAt(h) === 35) h += 1;
    if (h <= 6 && (h === seg.length || isSpace(seg.charCodeAt(h)))) {
      let s = h;
      while (s < seg.length && isSpace(seg.charCodeAt(s))) s += 1;
      sink.push('p', seg.slice(0, h));
      sink.push(null, seg.slice(h, s));
      scanInline(seg.slice(s), 'h', table, sink);
      return;
    }
  }
  let rest = seg;
  if (first) {
    let i = 0;
    while (i < seg.length && isSpace(seg.charCodeAt(i))) i += 1;
    const bullet = seg.charCodeAt(i);
    if ((bullet === 45 || bullet === 42) && seg.charCodeAt(i + 1) === 32) {
      let end = i + 2;
      const box = seg.charCodeAt(end) === 91 && (seg[end + 1] === ' ' || seg[end + 1] === 'x') && seg.startsWith('] ', end + 2);
      if (box) end += 4;
      sink.push(null, seg.slice(0, i));
      sink.push('p', seg.slice(i, end));
      rest = seg.slice(end);
    }
  }
  scanInline(rest, null, table, sink);
}

/**
 * Tokens for one line. The marker the masking step leaves (`VALUE_NOT_SHOWN_MARK`) is its own mask token
 * wherever it appears; a JSON string starting with four asterisks, or `(unset)`, is a mask token when the
 * response is masked.
 */
export function highlightLine(line: string, options: HighlightOptions): ToneToken[] {
  const sink = new Sink();
  const { language, inFrontmatter, inFence, masked } = options;
  const table = language === 'markdown' && !inFrontmatter && !inFence && line.charCodeAt(0) === 124;
  let from = 0;
  let first = true;
  const scan = (seg: string): void => {
    if (language === 'json') scanJson(seg, masked, sink);
    else if (language === 'markdown') {
      if (inFrontmatter) scanFrontmatter(seg, sink);
      else scanMarkdown(seg, first, table, inFence, sink);
    } else sink.push(null, seg);
    first = false;
  };
  for (;;) {
    const at = line.indexOf(VALUE_NOT_SHOWN_MARK, from);
    if (at < 0) break;
    if (at > from) scan(line.slice(from, at));
    sink.push('mask', VALUE_NOT_SHOWN_MARK);
    first = false;
    from = at + VALUE_NOT_SHOWN_MARK.length;
  }
  if (from < line.length || from === 0) scan(line.slice(from));
  return sink.tokens;
}

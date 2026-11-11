// Mapping a rendered anchor to a Source line (D-01, D-05; RESEARCH Pattern 4). Every "In the source only"
// link hands the Source reader an id the renderer produced: a heading id (stableSlug of the heading text,
// `-N` for the Nth repeat in document order), a `plan-at-N` id (N is an offset into the body), or nothing.
// This module turns each into a 1-based line. Pure, no I/O.
import { stableSlug } from '../../rendering/slug.ts';
import type { SourceModel } from './source-model.ts';

const PLAN_AT = /^plan-at-(\d+)$/;
const ENTITY = /&(#\d{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z]{2,8});/y;
const HTML_TAG = /^\/?[A-Za-z][\w-]*(?:\s|\/|>|$)/;
const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function isSpace(code: number): boolean {
  return code === 32 || code === 9;
}

function isAsciiPunctuation(code: number): boolean {
  return (code >= 33 && code <= 47) || (code >= 58 && code <= 64) || (code >= 91 && code <= 96) || (code >= 123 && code <= 126);
}

/**
 * The text the renderer would read out of an ATX heading's inline markup: closing hashes removed, link and
 * image destinations dropped (the label stays), raw tags dropped, character references decoded, backslash
 * escapes resolved. Emphasis, code and underscores are left for stableSlug, which drops or hyphenates them
 * exactly as it does for the rendered text. One left-to-right pass: each failed search for a closer is
 * remembered, so a line of unmatched brackets or angle brackets stays linear.
 */
function headingPlainText(raw: string): string {
  let text = raw.trimEnd();
  let k = text.length;
  while (k > 0 && text.charCodeAt(k - 1) === 35) k -= 1;
  if (k < text.length && (k === 0 || isSpace(text.charCodeAt(k - 1)))) text = text.slice(0, k).trimEnd();

  const n = text.length;
  let out = '';
  let i = 0;
  let skipFrom = -1;
  let skipTo = -1;
  // The next closer each opener would find; reused until the scan passes it, -1 once there is none.
  let closeAt = 0;
  let gtAt = 0;
  let noParen = false;
  let noRef = false;
  while (i < n) {
    if (skipFrom >= 0 && i >= skipFrom) {
      i = Math.max(i, skipTo);
      skipFrom = -1;
      continue;
    }
    const ch = text.charCodeAt(i);
    if (ch === 92 && i + 1 < n && isAsciiPunctuation(text.charCodeAt(i + 1))) {
      out += text[i + 1];
      i += 2;
      continue;
    }
    if ((ch === 91 && skipFrom < 0) || (ch === 33 && text.charCodeAt(i + 1) === 91)) {
      // [label](destination) or [label][reference] keeps its label; an image contributes no text at all
      const image = ch === 33;
      const open = image ? i + 1 : i;
      if (closeAt !== -1 && closeAt <= open) closeAt = text.indexOf(']', open + 1);
      const close = closeAt;
      let end = -1;
      if (close >= 0 && text.charCodeAt(close + 1) === 40 && !noParen) {
        const paren = text.indexOf(')', close + 2);
        if (paren < 0) noParen = true;
        else end = paren + 1;
      } else if (close >= 0 && text.charCodeAt(close + 1) === 91 && !noRef) {
        const ref = text.indexOf(']', close + 2);
        if (ref < 0) noRef = true;
        else end = ref + 1;
      }
      if (end >= 0) {
        if (image) {
          i = end;
          continue;
        }
        skipFrom = close;
        skipTo = end;
      }
    } else if (ch === 60 && gtAt !== -1) {
      if (gtAt <= i) gtAt = text.indexOf('>', i + 1);
      const gt = gtAt;
      if (gt < 0) {
        // no closer anywhere after this point
      } else if (HTML_TAG.test(text.slice(i + 1, Math.min(gt + 1, i + 1 + 64)))) {
        i = gt + 1;
        continue;
      }
    } else if (ch === 38) {
      ENTITY.lastIndex = i;
      const match = ENTITY.exec(text);
      if (match) {
        const name = match[1];
        let decoded: string | undefined;
        if (name.charCodeAt(0) === 35) {
          const code = name.charAt(1).toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
          decoded = code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff) ? String.fromCodePoint(code) : undefined;
        } else {
          decoded = NAMED_ENTITIES[name];
        }
        if (decoded !== undefined) {
          out += decoded;
          i += match[0].length;
          continue;
        }
      }
    }
    out += text[i];
    i += 1;
  }
  return out;
}

/**
 * The line of the heading the renderer gave this id, or null. Counts repeats of the same slug in document
 * order, as the renderer does; headings inside fences and frontmatter were never listed by the model.
 */
export function headingLineOf(model: SourceModel, id: string): number | null {
  const seen = new Map<string, number>();
  for (const heading of model.headings) {
    const base = stableSlug(headingPlainText(heading.text));
    const repeat = seen.get(base) ?? 0;
    seen.set(base, repeat + 1);
    if ((repeat === 0 ? base : `${base}-${repeat}`) === id) return heading.line;
  }
  return null;
}

/** The 1-based line holding a character offset into `text`; an offset outside the text is clamped to it. */
export function offsetLineOf(text: string, offset: number): number {
  const end = Math.max(0, Math.min(Math.trunc(offset), text.length));
  let line = 1;
  for (let i = 0; i < end; i += 1) if (text.charCodeAt(i) === 10) line += 1;
  return line;
}

/**
 * Where the Source reader lands for a rendered anchor: a heading id maps to its heading line, `plan-at-N`
 * to the line holding body offset N (`bodyStart` is where the body begins in the served text), null to line
 * 1, and an id this cannot map (a synthesized `plan-section-3`, a setext or raw-HTML heading) to line 1.
 */
export function targetLineOf(model: SourceModel, text: string, bodyStart: number, id: string | null): number {
  if (id === null) return 1;
  const last = Math.max(1, model.lines.length);
  const plan = PLAN_AT.exec(id);
  if (plan) {
    const offset = Number(plan[1]);
    if (!Number.isSafeInteger(offset)) return 1;
    return Math.min(offsetLineOf(text, bodyStart + offset), last);
  }
  const line = headingLineOf(model, id);
  return line === null ? 1 : Math.min(line, last);
}

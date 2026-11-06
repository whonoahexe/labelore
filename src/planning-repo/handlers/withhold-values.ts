// Variable values never leave the lift (10-14, VIEW-13, T-10-24, RESEARCH Pitfall 12). A map document may write
// a secret beside a variable name (`NAME=value`, `NAME: value`); the Integrations lift stores the name and a flag
// that a value was there, never the value. `withholdValue` reads one leading token, `withholdInText` cleans a longer
// line of prose, `maskValues` (10-19) masks every assignment anywhere in a string for the User setup page, and
// `stripControlCharacters` cleans a run command before it reaches a copy row (T-10-26). Pure character scans over capped
// input: no regular expression is built from, or run over, document text.

/** The most characters of a line the scans read. */
const SCAN_CAP = 4000;
/** An upper-snake name is two to eighty characters. */
const NAME_MIN = 2;
const NAME_MAX = 80;

export interface WithheldValue {
  name: string;
  /** True when a value sat beside the name; the value itself is never kept. */
  hadValue: boolean;
}

function isUpper(code: number): boolean {
  return code >= 65 && code <= 90;
}

function isNameChar(code: number): boolean {
  return isUpper(code) || (code >= 48 && code <= 57) || code === 95;
}

/** The upper-snake token starting at `from` (A to Z, 0 to 9, underscore, starting with a letter), or null. A token
 * followed by a lower-case letter is a word, not a variable. */
function tokenAt(text: string, from: number): { name: string; end: number } | null {
  if (!isUpper(text.charCodeAt(from))) return null;
  let end = from;
  while (end < text.length && isNameChar(text.charCodeAt(end))) {
    end += 1;
    if (end - from > NAME_MAX) return null;
  }
  const length = end - from;
  if (length < NAME_MIN) return null;
  const next = text.charCodeAt(end);
  if (next >= 97 && next <= 122) return null;
  return { name: text.slice(from, end), end };
}

/** True when a remainder is nothing, or one bracketed or angle-bracketed placeholder (`[your port]`, `<port>`). */
function isPlaceholder(remainder: string): boolean {
  const value = remainder.trim();
  if (value.length === 0) return true;
  const first = value[0];
  const last = value[value.length - 1];
  return (first === '[' && last === ']') || (first === '<' && last === '>');
}

/**
 * The variable name at the start of `text` (optionally in backticks) and whether a value is written beside it:
 * `NAME=value` or `NAME: value` with a remainder that is not a bracketed placeholder. Returns the name and the
 * flag, never the remainder; null when the text does not begin with an upper-snake token.
 */
export function withholdValue(text: string): WithheldValue | null {
  const lead = readLead(text);
  return lead === null ? null : { name: lead.name, hadValue: lead.hadValue };
}

interface Lead extends WithheldValue {
  /** How the value was written: after `=` or after `: `, or null when none was. */
  form: '=' | ':' | null;
  /** True when the name opened in backticks. */
  ticked: boolean;
}

function readLead(text: string): Lead | null {
  const capped = text.length > SCAN_CAP ? text.slice(0, SCAN_CAP) : text;
  let at = 0;
  while (at < capped.length && (capped.charCodeAt(at) === 32 || capped.charCodeAt(at) === 9)) at += 1;
  const ticked = capped.charCodeAt(at) === 96;
  if (ticked) at += 1;
  const token = tokenAt(capped, at);
  if (token === null) return null;
  let rest = capped.slice(token.end);
  let inside = ticked;
  if (inside && rest.startsWith('`')) {
    rest = rest.slice(1);
    inside = false;
  }
  let form: Lead['form'] = null;
  if (rest.startsWith('=')) form = '=';
  else if (rest.startsWith(':') && (rest.length === 1 || rest.charCodeAt(1) === 32)) form = ':';
  if (form === null) return { name: token.name, hadValue: false, form, ticked };
  let remainder = rest.slice(1);
  if (inside) {
    const close = remainder.indexOf('`');
    if (close >= 0) remainder = remainder.slice(0, close);
  }
  return { name: token.name, hadValue: !isPlaceholder(remainder), form, ticked };
}

export interface WithheldText {
  text: string;
  hadValue: boolean;
}

/** The end of the value a `=` starts at `from`: the next space or tab, or the end of the text. */
function valueEnd(text: string, from: number): number {
  let end = from;
  while (end < text.length && text[end] !== ' ' && text[end] !== '\t') end += 1;
  return end;
}

/**
 * A line of prose with every value beside a variable name removed, the name kept: a backticked `NAME=value` span
 * becomes `NAME`, a bare `NAME=value` word and `` `NAME`=value `` become `NAME`, and a line that opens with
 * `NAME: value` becomes the name alone (the remainder is read as the value, as `withholdValue` reads it). A
 * placeholder (`PORT=[your port]`) is kept as written.
 */
export function withholdInText(text: string): WithheldText {
  const capped = text.length > SCAN_CAP ? text.slice(0, SCAN_CAP) : text;
  const lead = readLead(capped);
  if (lead !== null && lead.hadValue && lead.form === ':') {
    return { text: lead.ticked ? `\`${lead.name}\`` : lead.name, hadValue: true };
  }
  let out = '';
  let hadValue = false;
  let i = 0;
  while (i < capped.length) {
    const ch = capped[i];
    if (ch === '`') {
      const close = capped.indexOf('`', i + 1);
      if (close < 0) {
        out += capped.slice(i);
        break;
      }
      const content = capped.slice(i + 1, close);
      const found = withholdValue(content);
      if (found !== null && found.hadValue) {
        out += `\`${found.name}\``;
        hadValue = true;
        i = close + 1;
        continue;
      }
      out += `\`${content}\``;
      i = close + 1;
      // A name in backticks with the value outside them: `NAME`=value.
      if (found !== null && capped[i] === '=') {
        const end = valueEnd(capped, i + 1);
        if (!isPlaceholder(capped.slice(i + 1, end))) {
          hadValue = true;
          i = end;
        }
      }
      continue;
    }
    const before = i === 0 ? ' ' : capped[i - 1];
    if (isUpper(ch.charCodeAt(0)) && (before === ' ' || before === '(' || before === ',' || before === '\t')) {
      const token = tokenAt(capped, i);
      if (token !== null && capped[token.end] === '=') {
        const end = valueEnd(capped, token.end + 1);
        if (!isPlaceholder(capped.slice(token.end + 1, end))) {
          out += token.name;
          hadValue = true;
          i = end;
          continue;
        }
      }
    }
    out += ch;
    i += 1;
  }
  return { text: out, hadValue };
}

/**
 * True for a Unicode format character (general category Cf) that draws nothing: bidirectional marks, embeddings,
 * overrides and isolates, zero-width space, non-joiner and joiner, word joiner and invisible operators, the byte order
 * mark, the soft hyphen, the interlinear annotation marks and the tag block (U+E0000 to U+E007F, used to hide text).
 * Written as ranges so no regular expression runs over document text.
 */
function isFormatCharacter(code: number): boolean {
  return (
    code === 0x00ad ||
    (code >= 0x0600 && code <= 0x0605) ||
    code === 0x061c ||
    code === 0x06dd ||
    code === 0x070f ||
    code === 0x08e2 ||
    code === 0x180e ||
    (code >= 0x200b && code <= 0x200f) ||
    (code >= 0x202a && code <= 0x202e) ||
    (code >= 0x2060 && code <= 0x2064) ||
    (code >= 0x2066 && code <= 0x206f) ||
    code === 0xfeff ||
    (code >= 0xfff9 && code <= 0xfffb) ||
    code === 0x110bd ||
    code === 0x110cd ||
    (code >= 0x13430 && code <= 0x1343f) ||
    (code >= 0x1bca0 && code <= 0x1bca3) ||
    (code >= 0x1d173 && code <= 0x1d17a) ||
    (code >= 0xe0000 && code <= 0xe007f)
  );
}

/**
 * `text` with C0 and C1 control characters (a tab kept), DEL and invisible format characters (bidirectional overrides,
 * zero-width characters, the soft hyphen, tag characters) removed, so a copied command is the visible, selectable text
 * and one line. Ordinary text, including non-Latin letters, is untouched.
 */
export function stripControlCharacters(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code === 9) {
      out += ch;
      continue;
    }
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f) || isFormatCharacter(code)) continue;
    out += ch;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// maskValues (10-19, T-10-33, CONTEXT D-11): the one mask every View-rendered user-setup string passes through.
// ---------------------------------------------------------------------------------------------------------------

/** The one marker `maskValues` leaves where a value was. It is a bracketed placeholder, so masking masked text changes
 * nothing, and the User setup page draws it as the quiet "Value not shown" mark. */
export const VALUE_NOT_SHOWN_MARK = '[Value not shown]';

/** The longest bracketed or angle-bracketed placeholder `maskValues` keeps (`[your port]`, `<port>`). */
const PLACEHOLDER_SPAN = 80;

function isBlank(code: number): boolean {
  return code === 32 || code === 9;
}

function isBreak(code: number): boolean {
  return code === 32 || code === 9 || code === 10 || code === 13;
}

/** A character a value may end on without it being part of the value: the punctuation of the sentence around it. */
function isTrailingPunctuation(code: number): boolean {
  return code === 44 || code === 59 || code === 46 || code === 41 || code === 58;
}

/** The index just past a placeholder that starts at `at` (`[...]` or `<...>`, the closer within PLACEHOLDER_SPAN and
 * followed by the end, a break or sentence punctuation), or -1 when what starts there is not one. */
function placeholderEnd(text: string, at: number, to: number): number {
  const opener = text.charCodeAt(at);
  const closer = opener === 91 ? 93 : opener === 60 ? 62 : 0;
  if (closer === 0) return -1;
  const limit = Math.min(to, at + PLACEHOLDER_SPAN);
  for (let k = at + 1; k < limit; k += 1) {
    if (text.charCodeAt(k) !== closer) continue;
    const after = k + 1;
    if (after >= to) return after;
    const next = text.charCodeAt(after);
    if (isBreak(next) || isTrailingPunctuation(next) || next === 96 || next === 34 || next === 39) return after;
    return -1;
  }
  return -1;
}

/** The index just past the value that starts at `start`: the whole rest of a code span, a quoted run, or the next
 * space, tab or line break. Trailing sentence punctuation stays outside the value. */
function maskedValueEnd(text: string, start: number, to: number, inSpan: boolean): number {
  if (inSpan) return to;
  const first = text.charCodeAt(start);
  if (first === 34 || first === 39 || first === 96) {
    const close = text.indexOf(text[start], start + 1);
    return close >= 0 && close < to ? close + 1 : to;
  }
  let end = start;
  while (end < to && !isBreak(text.charCodeAt(end))) end += 1;
  while (end > start + 1 && isTrailingPunctuation(text.charCodeAt(end - 1))) end -= 1;
  return end;
}

interface MaskState {
  out: string[];
  /** The start of the text not yet written to `out`. */
  start: number;
}

/**
 * When `=` (or `:`) after the name that ends at `nameEnd` begins an assignment with a value, writes the text so far and
 * the marker and returns the index just past the value; returns the index past a kept placeholder, or -1 when the name
 * is not assigned anything. `NAME=value` and `NAME: value` and `NAME:value` and `NAME = value` are assignments;
 * `NAME= value`, `NAME==`, `NAME=>` and `NAME://` are not.
 */
function maskAssignment(state: MaskState, text: string, nameEnd: number, to: number, inSpan: boolean): number {
  let at = nameEnd;
  while (at < to && isBlank(text.charCodeAt(at))) at += 1;
  const spaced = at > nameEnd;
  const sign = text.charCodeAt(at);
  if (at >= to) return -1;
  let start: number;
  if (sign === 61) {
    const after = at + 1;
    if (after >= to) return -1;
    const next = text.charCodeAt(after);
    if (next === 61 || next === 62) return -1;
    if (spaced) {
      start = after;
      while (start < to && isBlank(text.charCodeAt(start))) start += 1;
    } else {
      if (isBlank(next)) return -1;
      start = after;
    }
  } else if (sign === 58 && !spaced) {
    const after = at + 1;
    if (after >= to) return -1;
    const next = text.charCodeAt(after);
    if (next === 58 || next === 47) return -1;
    start = after;
    while (start < to && isBlank(text.charCodeAt(start))) start += 1;
  } else {
    return -1;
  }
  if (start >= to) return -1;
  const placeholder = placeholderEnd(text, start, to);
  if (placeholder >= 0) return placeholder;
  const end = maskedValueEnd(text, start, to, inSpan);
  if (end <= start) return -1;
  if (start > state.start) state.out.push(text.slice(state.start, start));
  state.out.push(VALUE_NOT_SHOWN_MARK);
  state.start = end;
  return end;
}

function maskRange(text: string, from: number, to: number, inSpan: boolean, out: string[]): void {
  const state: MaskState = { out, start: from };
  let i = from;
  while (i < to) {
    const code = text.charCodeAt(i);
    if (!inSpan && code === 96) {
      const close = text.indexOf('`', i + 1);
      if (close < 0 || close >= to) {
        i += 1;
        continue;
      }
      if (i > state.start) out.push(text.slice(state.start, i));
      out.push('`');
      maskRange(text, i + 1, close, true, out);
      out.push('`');
      state.start = close + 1;
      const inner = tokenAt(text, i + 1);
      i = close + 1;
      // A name in backticks with the value outside them: `NAME`=value.
      if (inner !== null && inner.end === close) {
        const next = maskAssignment(state, text, i, to, false);
        if (next >= 0) i = next;
      }
      continue;
    }
    const prev = i > 0 ? text.charCodeAt(i - 1) : 0;
    const boundary = !isNameChar(prev) && !(prev >= 97 && prev <= 122);
    if (isUpper(code) && boundary) {
      const token = tokenAt(text, i);
      if (token !== null) {
        const next = maskAssignment(state, text, token.end, to, inSpan);
        i = next >= 0 ? next : token.end;
        continue;
      }
    }
    i += 1;
  }
  if (to > state.start) out.push(text.slice(state.start, to));
}

/**
 * `text` with the value of every assignment replaced by VALUE_NOT_SHOWN_MARK, the name kept: `NAME=value`, `NAME: value`,
 * `NAME:value`, `NAME = value`, a quoted value, a value inside an inline code span (up to the closing backtick), and
 * `` `NAME`=value ``, anywhere in the string, any number of times. A name is upper-snake (A to Z, 0 to 9, underscore,
 * starting with a letter, two to eighty characters). A bracketed or angle-bracketed placeholder (`PORT=[your port]`), an
 * empty remainder and text with no assignment are returned as written. The remainder is never returned. One pass, linear,
 * no regular expression.
 */
export function maskValues(text: string): string {
  if (text === '') return text;
  const out: string[] = [];
  maskRange(text, 0, text.length, false, out);
  return out.join('');
}

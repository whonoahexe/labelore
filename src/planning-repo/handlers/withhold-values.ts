// Variable values never leave the lift (10-14, VIEW-13, T-10-24, RESEARCH Pitfall 12). A map document may write
// a secret beside a variable name (`NAME=value`, `NAME: value`); the Integrations lift stores the name and a flag
// that a value was there, never the value. `withholdValue` reads one leading token, `withholdInText` cleans a longer
// line of prose, and `stripControlCharacters` cleans a run command before it reaches a copy row (T-10-26). Pure
// character scans over capped input: no regular expression is built from, or run over, document text.

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
  let remainder: string | null = null;
  if (rest.startsWith('=')) remainder = rest.slice(1);
  else if (rest.startsWith(':') && (rest.length === 1 || rest.charCodeAt(1) === 32)) remainder = rest.slice(1);
  if (remainder === null) return { name: token.name, hadValue: false };
  if (inside) {
    const close = remainder.indexOf('`');
    if (close >= 0) remainder = remainder.slice(0, close);
  }
  return { name: token.name, hadValue: !isPlaceholder(remainder) };
}

export interface WithheldText {
  text: string;
  hadValue: boolean;
}

/**
 * A line of prose with every value beside a variable name removed, the name kept: a backticked `NAME=value` span
 * becomes `NAME`, and a bare `NAME=value` word becomes `NAME`. A placeholder (`PORT=[your port]`) is kept as written.
 */
export function withholdInText(text: string): WithheldText {
  const capped = text.length > SCAN_CAP ? text.slice(0, SCAN_CAP) : text;
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
      } else {
        out += `\`${content}\``;
      }
      i = close + 1;
      continue;
    }
    const before = i === 0 ? ' ' : capped[i - 1];
    if (isUpper(ch.charCodeAt(0)) && (before === ' ' || before === '(' || before === ',' || before === '\t')) {
      const token = tokenAt(capped, i);
      if (token !== null && capped[token.end] === '=') {
        let end = token.end + 1;
        while (end < capped.length && capped[end] !== ' ' && capped[end] !== '\t') end += 1;
        const remainder = capped.slice(token.end + 1, end);
        if (!isPlaceholder(remainder)) {
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

/** Bidirectional control characters: marks, embeddings, overrides and isolates. */
function isBidirectional(code: number): boolean {
  return code === 0x061c || code === 0x200e || code === 0x200f || (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069);
}

/**
 * `text` with C0 and C1 control characters (a tab kept), DEL and bidirectional override characters removed, so a copied
 * command is the visible, selectable text and one line. Ordinary text, including non-Latin letters, is untouched.
 */
export function stripControlCharacters(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code === 9) {
      out += ch;
      continue;
    }
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f) || isBidirectional(code)) continue;
    out += ch;
  }
  return out;
}

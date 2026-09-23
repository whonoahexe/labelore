// A tiny, pure inline-markdown tokenizer for the CONTEXT brief (T-lju-01). Every brief string
// renders only through this — code/strong/em/ref/text tokens mapped to React nodes by the
// `Inline` component in `context-brief-components.tsx`, never `dangerouslySetInnerHTML`. A
// single left-to-right scan using `indexOf` for closers; no DOM, no HTML strings, no recursion
// beyond one nesting level (strong/em children may hold text/code/ref, never another strong/em).

export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'code'; value: string }
  | { type: 'ref'; value: string }
  | { type: 'strong'; value: InlineToken[] }
  | { type: 'em'; value: InlineToken[] };

// `\b(D|OPEN)-\d{1,3}\b` — bounded, single alternation, no nested quantifiers.
const REF_RE = /\b(D|OPEN)-\d{1,3}\b/g;

/** Splits a plain text run into text/ref tokens on every `D-NN`/`OPEN-NN` mention. */
function splitRefs(text: string): InlineToken[] {
  if (text === '') return [];
  const tokens: InlineToken[] = [];
  let lastIndex = 0;
  REF_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = REF_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    tokens.push({ type: 'ref', value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return tokens;
}

/** Scans `text` into a flat token array. `allowEmphasis` is false one level down inside a
 * strong/em child scan, so the nesting never goes past one level. */
function scan(text: string, allowEmphasis: boolean): InlineToken[] {
  const tokens: InlineToken[] = [];
  let buffer = '';
  let i = 0;

  const flush = (): void => {
    if (buffer !== '') {
      tokens.push(...splitRefs(buffer));
      buffer = '';
    }
  };

  while (i < text.length) {
    const ch = text[i];

    if (ch === '`') {
      const close = text.indexOf('`', i + 1);
      if (close !== -1) {
        flush();
        tokens.push({ type: 'code', value: text.slice(i + 1, close) });
        i = close + 1;
        continue;
      }
      buffer += ch;
      i += 1;
      continue;
    }

    if (allowEmphasis && text.startsWith('**', i)) {
      const close = text.indexOf('**', i + 2);
      if (close !== -1) {
        flush();
        tokens.push({ type: 'strong', value: scan(text.slice(i + 2, close), false) });
        i = close + 2;
        continue;
      }
      buffer += '**';
      i += 2;
      continue;
    }

    if (allowEmphasis && ch === '*') {
      const close = text.indexOf('*', i + 1);
      if (close !== -1 && close > i + 1) {
        flush();
        tokens.push({ type: 'em', value: scan(text.slice(i + 1, close), false) });
        i = close + 1;
        continue;
      }
      buffer += ch;
      i += 1;
      continue;
    }

    if (ch === '[') {
      const closeBracket = text.indexOf(']', i + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParen = text.indexOf(')', closeBracket + 2);
        if (closeParen !== -1) {
          const label = text.slice(i + 1, closeBracket);
          flush();
          tokens.push({ type: 'text', value: label });
          i = closeParen + 1;
          continue;
        }
      }
      buffer += ch;
      i += 1;
      continue;
    }

    buffer += ch;
    i += 1;
  }

  flush();
  return tokens;
}

/**
 * Tokenizes `text` (any brief-derived string, never raw HTML) into a flat token array —
 * code/strong/em/link-label/ref, rendered only as React text nodes by the caller. `<script>`
 * and any other markup stays a single literal text token: this function never interprets HTML.
 */
export function tokenizeInline(text: string): InlineToken[] {
  return scan(text, true);
}

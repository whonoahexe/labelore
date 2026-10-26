// Secret masking for config.json (SEC-04). Mirrors GSD's own secrets.cjs: the same three key names
// (D-09) and the same display form, "****" plus the last four characters, "****" alone when the
// value is shorter than 8, and "(unset)" when it is empty (D-11). The semantics are copied, not
// imported — Labelore has no runtime dependency on gsd-core. One deliberate difference (D-10): GSD
// masks every value on these keys, while a boolean, number or null here stays visible, because
// `"firecrawl": true` is a setting, not a secret, and hiding it would make the settings page lie.
//
// Masking is redaction for display and happens in memory at read time only; nothing here touches
// the file on disk.

/** The config.json keys GSD treats as secrets. Top-level keys only (Claude's discretion, D-09). */
export const SECRET_CONFIG_KEYS: ReadonlySet<string> = new Set(['brave_search', 'firecrawl', 'exa_search']);

/** "(unset)" for an empty string, "****" below 8 characters, otherwise "****" plus the last 4. */
export function maskSecret(value: string): string {
  if (value === '') return '(unset)';
  if (value.length < 8) return '****';
  return `****${value.slice(-4)}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Masks a value found under a secret key. Strings are masked; arrays and plain objects are walked
 * so a string nested under a secret key fails closed; booleans, numbers and null pass unchanged. */
function maskValue(value: unknown): unknown {
  if (typeof value === 'string') return maskSecret(value);
  if (Array.isArray(value)) return value.map(maskValue);
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) out[key] = maskValue(inner);
    return out;
  }
  return value;
}

/** Masks the secret keys at the top level of a parsed config.json. Reports whether any value
 * changed, so a caller can leave an untouched config byte-for-byte as it was read. A top-level
 * array or primitive passes through unmasked. */
export function maskConfig(data: unknown): { data: unknown; masked: boolean } {
  if (!isPlainObject(data)) return { data, masked: false };
  let masked = false;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SECRET_CONFIG_KEYS.has(key)) {
      const next = maskValue(value);
      if (JSON.stringify(next) !== JSON.stringify(value)) masked = true;
      out[key] = next;
    } else {
      out[key] = value;
    }
  }
  return { data: out, masked };
}

// A quoted key, a colon, then a quoted string, in either quote style (hand-edited, broken files are
// where JSON5-style single quotes turn up). The key is matched as any quoted string and decoded
// before it is compared with the secret key names, so an escaped spelling such as "brave_search"
// does not evade the match. Every quoted body is the unambiguous alternation "not the quote or a
// backslash" or "a backslash and the character it escapes", so every character can be consumed in
// exactly one way and the match is linear, never catastrophic. The closing quote of the value is
// optional at the very end of the text: a file cut off inside the value must not leak the part that
// is there.
const DOUBLE_BODY = String.raw`(?:[^"\\]|\\[\s\S])*`;
const SINGLE_BODY = String.raw`(?:[^'\\]|\\[\s\S])*`;
const QUOTED_ENTRY = new RegExp(
  String.raw`((?:"(${DOUBLE_BODY})"|'(${SINGLE_BODY})')\s*:\s*)(?:"(${DOUBLE_BODY})("|$)|'(${SINGLE_BODY})('|$))`,
  'g',
);

/** Decodes the text between two quotes: JSON escapes, plus `\'` and a bare `"` inside single quotes. */
function unescapeQuoted(content: string, quote: '"' | "'"): string {
  const json =
    quote === "'"
      ? content.replace(/\\([\s\S])|"/g, (match: string, escaped: string | undefined) =>
          escaped === undefined ? '\\"' : escaped === "'" ? "'" : match,
        )
      : content;
  try {
    return JSON.parse(`"${json}"`) as string;
  } catch {
    // Not valid JSON string content (a bad escape, a raw newline): use the text as it stands.
    return content;
  }
}

/** Masks the string value of any secret key in raw JSON text, for a config.json that does not
 * parse and so cannot go through maskConfig. Everything else in the text stays byte-identical. */
export function redactSecretText(raw: string): string {
  return raw.replace(
    QUOTED_ENTRY,
    (
      match: string,
      head: string,
      doubleKey: string | undefined,
      singleKey: string | undefined,
      doubleValue: string | undefined,
      doubleClose: string | undefined,
      singleValue: string | undefined,
      singleClose: string | undefined,
    ) => {
      const key = doubleKey !== undefined ? unescapeQuoted(doubleKey, '"') : unescapeQuoted(singleKey ?? '', "'");
      if (!SECRET_CONFIG_KEYS.has(key)) return match;
      if (doubleValue !== undefined) return `${head}"${maskSecret(unescapeQuoted(doubleValue, '"'))}${doubleClose ?? ''}`;
      return `${head}'${maskSecret(unescapeQuoted(singleValue ?? '', "'"))}${singleClose ?? ''}`;
    },
  );
}

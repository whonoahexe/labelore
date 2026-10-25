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

// A quoted secret key name, a colon, then a quoted string. The string body is the unambiguous
// alternation "not a quote or backslash" or "a backslash and the character it escapes", so every
// character can be consumed in exactly one way and the match is linear, never catastrophic. The
// closing quote is optional at the very end of the text: a file cut off inside the value must not
// leak the part that is there.
const SECRET_STRING_ENTRY = new RegExp(
  `("(?:${[...SECRET_CONFIG_KEYS].join('|')})"\\s*:\\s*)"((?:[^"\\\\]|\\\\[\\s\\S])*)("|$)`,
  'g',
);

function unescapeJsonString(content: string): string {
  try {
    return JSON.parse(`"${content}"`) as string;
  } catch {
    // Not valid JSON string content (a bad escape, a raw newline): mask the text as it stands.
    return content;
  }
}

/** Masks the string value of any secret key in raw JSON text, for a config.json that does not
 * parse and so cannot go through maskConfig. Everything else in the text stays byte-identical. */
export function redactSecretText(raw: string): string {
  return raw.replace(
    SECRET_STRING_ENTRY,
    (_match, head: string, content: string, close: string) => `${head}"${maskSecret(unescapeJsonString(content))}${close}`,
  );
}

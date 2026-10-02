// The single colour validator (T-qk6-03, T-li5-01). Node-free and import-free so the server-side
// stylesheet resolver (`theme-tokens.ts`) and the client-side UI-SPEC composer share one definition:
// a value that fails here never reaches a style, whichever side it came from.

/** A document colour value that is safe to hand to CSS as a custom-property value: a hex colour
 * with 3, 4, 6 or 8 digits, or an `oklch(…)` of digits, dots, percent signs, spaces, slashes,
 * minus signs or the word `none`, at most 64 characters. Everything else is null (T-qk6-03). */
export function safeColor(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (v.length === 0 || v.length > 64) return null;
  if (v[0] === '#') {
    const digits = v.slice(1);
    if (![3, 4, 6, 8].includes(digits.length)) return null;
    for (const ch of digits) if (!/[0-9a-fA-F]/.test(ch)) return null;
    return v;
  }
  if (v.startsWith('oklch(') && v.endsWith(')')) {
    const inner = v.slice(6, -1);
    if (inner.trim() === '') return null;
    const stripped = inner.split('none').join('');
    for (const ch of stripped) if (!/[0-9.% /+-]/.test(ch)) return null;
    return v;
  }
  return null;
}

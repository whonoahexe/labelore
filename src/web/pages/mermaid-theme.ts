// Pure, DOM-free oklch -> sRGB conversion for handing computed CSS custom-property values to
// mermaid's colour library, which rejects the oklch() form outright. Mirrors the same
// extracted-web-logic seam already established elsewhere in this directory (scroll-settle.ts,
// document-reference-activation.ts): no browser globals, no React import, safe to exercise
// directly under vitest's default environment.

const OKLCH_PATTERN =
  /^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)(deg)?\s*(?:\/\s*([\d.]+%?)\s*)?\)$/i;

/** Clamps a linear-ish 0..1 fraction into the same range, tolerating float drift. */
function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** sRGB gamma-encodes a linear channel value in 0..1. */
function gammaEncode(linear: number): number {
  const c = clamp01(linear);
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/** Converts an oklch(L C H) triple to sRGB channel values in 0..255 (rounded, clamped). */
function oklchToSrgb(l: number, c: number, hDegrees: number): [number, number, number] {
  const hRadians = (hDegrees * Math.PI) / 180;
  const a = c * Math.cos(hRadians);
  const b = c * Math.sin(hRadians);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  const lCubed = l_ * l_ * l_;
  const mCubed = m_ * m_ * m_;
  const sCubed = s_ * s_ * s_;

  const rLinear = 4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed;
  const gLinear = -1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed;
  const bLinear = -0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.707614701 * sCubed;

  const r = Math.round(gammaEncode(rLinear) * 255);
  const g = Math.round(gammaEncode(gLinear) * 255);
  const bChannel = Math.round(gammaEncode(bLinear) * 255);
  return [
    Math.min(255, Math.max(0, r)),
    Math.min(255, Math.max(0, g)),
    Math.min(255, Math.max(0, bChannel)),
  ];
}

function toHexByte(value: number): string {
  return value.toString(16).padStart(2, '0');
}

/** Parses an L, C, or alpha component that may carry a trailing `%`. */
function parsePercentOrFraction(raw: string, percentDivisor: number): number {
  if (raw.endsWith('%')) {
    return parseFloat(raw.slice(0, -1)) / percentDivisor;
  }
  return parseFloat(raw);
}

/**
 * Converts a CSS `oklch(...)` colour string to an sRGB form mermaid's colour library accepts
 * (`#rrggbb`, or `rgba(r, g, b, a)` when the source carries a sub-1 alpha channel). Any input
 * that is not a well-formed `oklch(...)` call — a different colour format, or a malformed/
 * unterminated one — is returned unchanged, so a future token format change degrades rather
 * than throws.
 */
export function toMermaidColor(value: string): string {
  const trimmed = value.trim();
  const match = OKLCH_PATTERN.exec(trimmed);
  if (!match) return value;

  try {
    const [, lRaw, cRaw, hRaw, , alphaRaw] = match;
    const l = parsePercentOrFraction(lRaw, 100);
    const c = parsePercentOrFraction(cRaw, 100);
    const h = parseFloat(hRaw);
    if ([l, c, h].some((component) => Number.isNaN(component))) return value;

    const [r, g, b] = oklchToSrgb(l, c, h);

    if (alphaRaw === undefined) {
      return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
    }
    const alpha = parsePercentOrFraction(alphaRaw, 100);
    if (Number.isNaN(alpha)) return value;
    if (alpha >= 1) {
      return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return value;
  }
}

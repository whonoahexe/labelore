// The COVERAGE.md extractor (Phase 9, 09-15, VIEW-10), kept apart from the handler so a throwing extractor is
// provable. `extractCoverage` reads the two shapes GSD writes: the one-line "No external API integration: <why>"
// declaration (sometimes a longer file with that paragraph among others) and a capability matrix. Line scans
// only, a body cap, and no regular expression built from document text (T-09-30).

/** The most body text the extractor reads. */
export const COVERAGE_BODY_CAP = 50_000;

const NONE_PREFIX = 'no external api integration';

export interface CoverageNone {
  /** The text after the first colon, else the whole paragraph; null when the file gives no reason. */
  reason: string | null;
}

export interface CoverageBody {
  /** The first `# ` heading, or null. */
  h1: string | null;
  /** The "No external API integration" declaration, or null. */
  none: CoverageNone | null;
  matrix: null;
}

function stripQuote(line: string): string {
  let text = line.trimStart();
  while (text.startsWith('>')) text = text.slice(1).trimStart();
  return text.trimEnd();
}

/** Reads a COVERAGE.md body. Never throws on text input; the handler still guards it. */
export function extractCoverage(body: string): CoverageBody {
  const text = body.length > COVERAGE_BODY_CAP ? body.slice(0, COVERAGE_BODY_CAP) : body;
  const lines = text.split('\n');
  let h1: string | null = null;
  let none: CoverageNone | null = null;
  let paragraph: string[] = [];

  const flush = (): void => {
    if (paragraph.length === 0) return;
    const joined = paragraph.join(' ').trim();
    paragraph = [];
    if (none !== null || !joined.toLowerCase().startsWith(NONE_PREFIX)) return;
    const colon = joined.indexOf(':');
    const reason = (colon === -1 ? joined : joined.slice(colon + 1)).trim();
    none = { reason: reason === '' ? null : reason };
  };

  for (const raw of lines) {
    const line = stripQuote(raw);
    if (line === '') {
      flush();
      continue;
    }
    if (line.startsWith('#')) {
      flush();
      if (h1 === null && line.startsWith('# ')) h1 = line.slice(2).trim() || null;
      continue;
    }
    paragraph.push(line);
  }
  flush();
  return { h1, none, matrix: null };
}

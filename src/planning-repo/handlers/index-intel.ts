// The intel and graphs files that fit the text cap (Phase 11, 11-13, VIEW-19, D-04, RESEARCH C14): the
// machine-written JSON under .planning/intel/ and .planning/graphs/ and the markdown reports their writers add
// (SYNTHESIS.md, decisions.md, GRAPH_REPORT.md). The handler claims `intel` and `graph` refs of class `text`
// only; a larger file is class `large` and is never read here (the server's graph summary scans it instead).
//
// What leaves this handler is a bounded summary and nothing else: `structured.index` is the short summary
// index-intel-lift.ts makes, `body` is a digest of its labels under 2 KB, and `frontmatter` holds only `_meta`
// (scalars) and the made-up marker keys. The raw object is never kept, so it cannot reach the rendered
// document, the search index (which indexes `body`) or the /presentation payload (which ships `structured`).
// Any throw gives an empty body, empty frontmatter, no `structured.index` and one warning.
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef, HandlerParseResult } from '../types.ts';
import { tryParseFrontmatter, tryParseJson } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { digestOf, extractIntel, intelKindOf, isRec } from './index-intel-lift.ts';

export type { IntelSummary, IntelKind } from './index-intel-lift.ts';

/** The made-up example marker keys (test/helpers/made-up-examples.ts); the only author keys frontmatter keeps. */
const MARKER_KEYS = ['made_up_example', 'derived_from', 'gsd_core_version'] as const;
const META_KEY_CAP = 16;
const META_STRING_CAP = 200;

function scalar(value: unknown): string | number | boolean | null {
  if (typeof value === 'string') return value.length > META_STRING_CAP ? value.slice(0, META_STRING_CAP) : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return null;
}

/** `_meta` as scalars only, plus each marker key from the top level or from `_meta`. Nothing else is kept. */
function boundedFrontmatter(data: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!isRec(data)) return out;
  const metaRaw = Object.hasOwn(data, '_meta') ? data._meta : undefined;
  const meta = isRec(metaRaw) ? metaRaw : null;
  if (meta) {
    const kept: Record<string, unknown> = {};
    for (const key of Object.keys(meta).slice(0, META_KEY_CAP)) {
      const value = scalar(meta[key]);
      if (value !== null) kept[key] = value;
    }
    out._meta = kept;
  }
  for (const key of MARKER_KEYS) {
    const fromTop = Object.hasOwn(data, key) ? scalar(data[key]) : null;
    const fromMeta = meta && Object.hasOwn(meta, key) ? scalar(meta[key]) : null;
    const value = fromTop ?? fromMeta;
    if (value !== null) out[key] = value;
  }
  return out;
}

const nothing = (): Pick<HandlerParseResult, 'frontmatter' | 'body' | 'structured'> => ({
  frontmatter: {},
  body: '',
  structured: {},
});

const TITLE_CAP = 200;
const capTitle = (title: string): string => (title.length > TITLE_CAP ? `${title.slice(0, TITLE_CAP - 1)}…` : title);

export const IndexIntelHandler: ArtifactHandler = {
  kind: 'index-intel',
  match: (ref) => (ref.kind === 'intel' || ref.kind === 'graph') && ref.fileClass === 'text',
  parse(raw: RawArtifact, ref: ArtifactRef): HandlerParseResult {
    const name = basename(ref.path);
    try {
      // A graph file has no per-name schema here: its top-level key names only.
      const kind = ref.kind === 'graph' ? 'unknown' : intelKindOf(name);
      if (name.toLowerCase().endsWith('.json')) {
        const parsed = tryParseJson(raw.content);
        if (parsed.warning) return { title: name, ...nothing(), warning: parsed.warning };
        const summary = extractIntel(kind, parsed.data);
        return {
          title: name,
          frontmatter: boundedFrontmatter(parsed.data),
          body: digestOf(summary),
          structured: { index: summary },
        };
      }
      const fm = tryParseFrontmatter(raw.content);
      const summary = extractIntel(kind, fm.body);
      return {
        title: capTitle(deriveTitle(fm.data, fm.body, ref.path)),
        frontmatter: boundedFrontmatter(fm.data),
        body: digestOf(summary),
        warning: fm.warning,
        structured: { index: summary },
      };
    } catch {
      return {
        title: name,
        ...nothing(),
        warning: { stage: 'structured-extraction', message: 'Index summary failed', salvage: 'nothing readable' },
      };
    }
  },
};

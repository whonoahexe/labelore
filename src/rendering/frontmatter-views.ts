export type FrontmatterValueView =
  | { kind: 'scalar'; value: string }
  | { kind: 'list'; items: FrontmatterValueView[] }
  | { kind: 'record'; entries: Array<{ key: string; value: FrontmatterValueView }> };

export interface FrontmatterPanel {
  key: string;
  label: string;
  presentation: 'known' | 'generic';
  value: FrontmatterValueView;
}

export interface FrontmatterPanelBuilder {
  key: 'must_haves' | 'coverage' | 'key_links' | 'progress';
  label: string;
  build(value: unknown): FrontmatterValueView | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recursiveValue(value: unknown): FrontmatterValueView {
  if (Array.isArray(value)) {
    return { kind: 'list', items: value.map((item) => recursiveValue(item)) };
  }
  if (isRecord(value)) {
    return {
      kind: 'record',
      entries: Object.entries(value).map(([key, item]) => ({
        key,
        value: recursiveValue(item),
      })),
    };
  }
  if (value === null) return { kind: 'scalar', value: 'null' };
  if (value === undefined) return { kind: 'scalar', value: 'undefined' };
  return { kind: 'scalar', value: String(value) };
}

function nonEmptyRecord(value: unknown): FrontmatterValueView | null {
  return isRecord(value) && Object.keys(value).length > 0 ? recursiveValue(value) : null;
}

function nonEmptyList(value: unknown): FrontmatterValueView | null {
  return Array.isArray(value) && value.length > 0 ? recursiveValue(value) : null;
}

function progressView(value: unknown): FrontmatterValueView | null {
  if (typeof value === 'number' && Number.isFinite(value)) return recursiveValue(value);
  return nonEmptyRecord(value);
}

export const FRONTMATTER_PANEL_BUILDERS: readonly FrontmatterPanelBuilder[] = Object.freeze([
  { key: 'must_haves', label: 'Must haves', build: nonEmptyRecord },
  { key: 'coverage', label: 'Coverage', build: nonEmptyList },
  { key: 'key_links', label: 'Key links', build: nonEmptyList },
  { key: 'progress', label: 'Progress', build: progressView },
]);

function humanizeKey(key: string): string {
  return key
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/^./, (first) => first.toUpperCase());
}

/** Specialized builders run first; every unhandled shape remains visible as recursive text. */
export function buildFrontmatterPanels(frontmatter: Record<string, unknown>): FrontmatterPanel[] {
  const panels: FrontmatterPanel[] = [];
  const handled = new Set<string>();

  for (const builder of FRONTMATTER_PANEL_BUILDERS) {
    if (!Object.hasOwn(frontmatter, builder.key)) continue;
    const value = builder.build(frontmatter[builder.key]);
    if (!value) continue;
    panels.push({ key: builder.key, label: builder.label, presentation: 'known', value });
    handled.add(builder.key);
  }

  for (const [key, value] of Object.entries(frontmatter)) {
    if (handled.has(key)) continue;
    panels.push({
      key,
      label: humanizeKey(key),
      presentation: 'generic',
      value: recursiveValue(value),
    });
  }
  return panels;
}

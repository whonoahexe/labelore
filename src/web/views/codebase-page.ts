// The Codebase page composer (Phase 10, 10-08, VIEW-13, sketch 042 winner A): a pure `ViewInput` ->
// `ComposedCodebase` merge of the server's `codebaseContext` (which of the seven map documents exist, where
// each opens, GSD's readiness, the stamp) and the opened document's own `structured.codebase` and section
// groups. All seven documents open this same page on a different panel; the address picks the panel.
//
// Nothing in a document is dropped: whatever the page has no designed form for stays in the panel as a plain
// readable section in document order, so a document with no recognised heading is the plain rendering in full.
// No DOM, no filesystem access, no rendering, no regular expression and no module-level state: two codebase
// pages composed alternately each compose only from their own input. Returns `null` when the context or the
// projection is missing, so the page keeps the promoted-section view without any notice (RESEARCH C1).
import type { MapReadiness } from '../../presentation/codebase-map.ts';
import type { ViewInput } from './manifest.ts';

export interface ComposedCodebasePanel {
  key: string;
  label: string;
  /** The in-app address, or null for a document the folder lacks. */
  url: string | null;
  mapped: boolean;
  /** True for the panel the address names. */
  current: boolean;
}

export interface ComposedCodebaseFacts {
  /** "4 of 7 documents mapped". */
  countText: string;
  readiness: MapReadiness;
}

export interface ComposedCodebasePlain {
  /** The section's `id`, so an in-document anchor keeps working. */
  id: string | null;
  /** The section's heading, or null for the text before the first heading. */
  heading: string | null;
  /** The section's rendered HTML (the server-sanitised document), heading included. */
  html: string;
}

export interface ComposedCodebaseActive {
  key: string;
  label: string;
  /** Every section the page has no designed form for, in document order. */
  plain: ComposedCodebasePlain[];
  /** The headings of `plain`, in the same order (a section with no heading has none). */
  plainSections: string[];
}

export interface ComposedCodebase {
  facts: ComposedCodebaseFacts;
  panels: ComposedCodebasePanel[];
  active: ComposedCodebaseActive;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function composeCodebase(input: ViewInput): ComposedCodebase | null {
  const context = input.codebaseContext;
  if (!context || !Array.isArray(context.panels) || !isRecord(input.structured.codebase)) return null;
  const current = context.panels.find((panel) => panel.key === context.activeKey);
  if (current === undefined) return null;

  const panels: ComposedCodebasePanel[] = context.panels.map((panel) => ({
    key: panel.key,
    label: panel.label,
    url: panel.url,
    mapped: panel.mapped,
    current: panel.key === context.activeKey,
  }));

  const plain: ComposedCodebasePlain[] = input.groups
    .filter((group) => group.html.trim() !== '')
    .map((group) => ({ id: group.id, heading: group.heading, html: group.html }));

  return {
    facts: { countText: `${context.mappedCount} of 7 documents mapped`, readiness: context.readiness },
    panels,
    active: {
      key: current.key,
      label: current.label,
      plain,
      plainSections: plain.flatMap((section) => (section.heading === null ? [] : [section.heading])),
    },
  };
}

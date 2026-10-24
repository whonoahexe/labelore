// The panels of the project Research page (quick-261024-k8u): what each open spine shows beyond the
// frame, composed from the lifts. Summary follows sketch 031 (build-order track, phase inspector,
// gaps), Stack 034 A, Features 033 D1, Architecture 032 A and Pitfalls 035 A.
//
// Pure: no node imports, no filesystem, and no file name, path, line number or URL in any output.
import {
  plainText,
  splitTopLevel,
  type ConfidenceLevel,
  type FeatureItem,
  type FeaturesLift,
  type PitfallsLift,
  type StackLift,
  type SummaryLift,
  type SummaryPhase,
} from '../planning-repo/handlers/project-research-lift.ts';

const MAX_TILES = 40;

function pad(value: string | number): string {
  const text = String(value);
  return /^\d+$/.test(text) ? text.padStart(2, '0') : text;
}

function capitalise(text: string): string {
  return text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/** First letter up, a trailing period dropped: the shape sketches 033 and 034 print rows in. */
export function sentenceCase(text: string | null | undefined): string {
  return capitalise((text ?? '').trim()).replace(/\.$/, '');
}

/** The first sentence of `text`, at least 40 characters long, as 031's `firstSentence`. */
function firstSentence(text: string): string {
  const plain = plainText(text);
  const match = /^(.{40,}?[.!?])\s/.exec(plain);
  return match ? match[1] : plain;
}

// ---------------------------------------------------------------------------------------------
// Shared shapes

/** A pitfall chip: opens that pitfall on the Pitfalls spine when `navigable`. */
export interface PitfallChip {
  n: number;
  label: string;
  short: string | null;
  navigable: boolean;
}

/** One swap row (032 A): the thing struck through, what to do instead, and what opens under it. */
export interface SwapItem {
  bad: string;
  good: string;
  details: Array<{ label: string; text: string }>;
}

export interface GateBlock {
  title: string;
  sub: string;
  conditions: string[];
}

// ---------------------------------------------------------------------------------------------
// Summary

export interface PhaseCard {
  n: string;
  label: string;
  name: string;
  col: number;
  lane: 1 | 2;
  /** The padded number of the phase this one runs alongside, when it hangs on lane two. */
  alongside: string | null;
  marks: { gate: boolean; research: boolean; pitfalls: number };
}

export interface DeliverTile {
  main: string;
  sub: string | null;
}

export type FlagKind = 'needs' | 'standard';

export interface PhaseInspector {
  kicker: string;
  name: string;
  rationale: string | null;
  deliversCount: number;
  delivers: DeliverTile[];
  oneColumn: boolean;
  gate: GateBlock | null;
  avoids: PitfallChip[];
  flag: { kind: FlagKind; label: string; text: string } | null;
  facets: Array<{ label: string; text: string }>;
}

export interface SummaryPanel {
  entryGate: GateBlock | null;
  note: string | null;
  tally: string;
  cols: number;
  hasSecondLane: boolean;
  phases: PhaseCard[];
  inspectors: PhaseInspector[];
  whyOrder: string[];
  gaps: Array<{ lead: string | null; body: string }>;
}

/** 031 `placement`: a phase that runs in parallel with a lane-one phase hangs under it on lane two,
 * in that phase's column; every other phase takes the next column. */
export function placePhases(phases: ReadonlyArray<Pick<SummaryPhase, 'n' | 'parallelWith'>>): {
  at: Array<{ col: number; lane: 1 | 2 }>;
  cols: number;
  lanes: 1 | 2;
} {
  let col = 0;
  const at: Array<{ col: number; lane: 1 | 2 }> = [];
  phases.forEach((phase, index) => {
    const partner = phase.parallelWith === null ? -1 : phases.findIndex((other) => Number(other.n) === phase.parallelWith);
    const partnerAt = partner >= 0 && partner < index ? at[partner] : undefined;
    if (partnerAt && partnerAt.lane === 1) {
      at.push({ col: partnerAt.col, lane: 2 });
    } else {
      col += 1;
      at.push({ col, lane: 1 });
    }
  });
  return { at, cols: col, lanes: at.some((entry) => entry.lane === 2) ? 2 : 1 };
}

/** 031 `gateBlock`: a gate's text split at top-level `;` and `plus` into its conditions. */
export function gateConditions(text: string): string[] {
  return splitTopLevel(text, { plus: true });
}

/** A delivered item: the point first, a closing parenthetical dropped to a quiet second line. */
export function deliverTile(item: string): DeliverTile {
  let main = item.trim().replace(/\.$/, '');
  let sub: string | null = null;
  if (main.endsWith(')')) {
    let depth = 0;
    let tick = false;
    let open = -1;
    for (let index = main.length - 1; index >= 0; index -= 1) {
      const char = main[index];
      if (char === '`') tick = !tick;
      if (tick) continue;
      if (char === ')') depth += 1;
      if (char === '(') {
        depth -= 1;
        if (depth === 0) {
          open = index;
          break;
        }
      }
    }
    if (open > 3) {
      sub = capitalise(main.slice(open + 1, -1));
      main = main.slice(0, open).trim();
    }
  }
  return { main, sub };
}

/** A phase's Delivers: a single `a; b; c` paragraph is several items. */
export function deliverItems(delivers: readonly string[]): string[] {
  if (delivers.length === 1) return splitTopLevel(delivers[0]).slice(0, MAX_TILES);
  return delivers.slice(0, MAX_TILES);
}

function flagFor(summary: SummaryLift, phase: SummaryPhase): { kind: FlagKind; text: string } | null {
  const needs = summary.flags.needs.find((entry) => entry.phase === phase.n);
  if (needs) return { kind: 'needs', text: needs.body };
  const standard = summary.flags.standard.find((entry) => entry.phase === phase.n);
  if (standard) return { kind: 'standard', text: standard.body };
  if (phase.flag) return { kind: /none|standard|skip/i.test(phase.flag) ? 'standard' : 'needs', text: phase.flag };
  return null;
}

/** The entry gate paragraph of the Implications preamble, as a barrier block. */
function entryGateOf(preamble: readonly string[]): GateBlock | null {
  const paragraph = preamble.find((text) => /^\*\*Entry gate/i.test(text));
  if (!paragraph) return null;
  const match = /^Entry gate\s*(?:\(([^)]{1,200})\))?\s*[:.—-]?\s*(.*)$/i.exec(paragraph.replace(/\*\*/g, '').trim());
  if (!match) return null;
  return {
    title: 'Entry gate',
    sub: match[1] ? capitalise(match[1].trim()) : 'Before phase 01',
    conditions: gateConditions(match[2]),
  };
}

function pitfallChip(n: number, pitfalls: PitfallsLift | null): PitfallChip {
  const found = pitfalls?.pitfalls.find((candidate) => candidate.n === n);
  return {
    n,
    label: pad(n),
    short: found ? (found.short ?? found.title) : null,
    navigable: found !== undefined,
  };
}

export function composeSummaryPanel(summary: SummaryLift, pitfalls: PitfallsLift | null): SummaryPanel {
  const { at, cols, lanes } = placePhases(summary.phases);
  const total = summary.phases.length;
  const gated = summary.phases.filter((phase) => phase.gate).length;
  const alongside = summary.phases.filter((phase) => phase.parallelWith !== null).length;
  const research = summary.phases.filter((phase) => flagFor(summary, phase)?.kind === 'needs').length;
  const tallyParts = [
    total > 0 ? `${total} phases` : '',
    gated > 0 ? `${gated} gated` : '',
    alongside > 0 ? `${alongside} alongside` : '',
    research > 0 ? `${research} need research` : '',
  ].filter(Boolean);

  const phases: PhaseCard[] = summary.phases.map((phase, index) => {
    const place = at[index];
    const flag = flagFor(summary, phase);
    return {
      n: phase.n,
      label: pad(phase.n),
      name: phase.name,
      col: place.col,
      lane: place.lane,
      alongside: place.lane === 2 && phase.parallelWith !== null ? pad(phase.parallelWith) : null,
      marks: { gate: phase.gate !== null, research: flag?.kind === 'needs', pitfalls: phase.avoids.length },
    };
  });

  const inspectors: PhaseInspector[] = summary.phases.map((phase) => {
    const partner = phase.parallelWith === null ? null : summary.phases.find((other) => Number(other.n) === phase.parallelWith);
    const items = deliverItems(phase.delivers);
    const flag = flagFor(summary, phase);
    const facets = [
      { label: 'Uses', text: phase.uses },
      { label: 'Implements', text: phase.implements },
      { label: 'Addresses', text: phase.addresses },
      { label: 'Keeps', text: phase.keeps },
    ].filter((facet): facet is { label: string; text: string } => facet.text !== null);
    return {
      kicker: `Phase ${pad(phase.n)} of ${total}${partner ? ` · alongside phase ${pad(partner.n)}` : ''}`,
      name: phase.name,
      rationale: phase.rationale !== '' ? phase.rationale : null,
      deliversCount: items.length,
      delivers: items.map(deliverTile),
      oneColumn: items.length < 3,
      gate: phase.gate ? { title: 'Gate', sub: 'Must pass before this phase can finish', conditions: gateConditions(phase.gate) } : null,
      avoids: phase.avoids.map((n) => pitfallChip(n, pitfalls)),
      flag: flag
        ? { kind: flag.kind, label: flag.kind === 'needs' ? 'Needs deeper research' : 'Standard patterns', text: flag.text }
        : null,
      facets,
    };
  });

  return {
    entryGate: entryGateOf(summary.preamble),
    note: summary.preamble.find((text) => !/^\*\*/.test(text)) ?? null,
    tally: tallyParts.join(' · '),
    cols,
    hasSecondLane: lanes === 2,
    phases,
    inspectors,
    whyOrder: summary.rationale,
    gaps: summary.gaps,
  };
}

// ---------------------------------------------------------------------------------------------
// Stack

export interface StackPanel {
  reasons: Array<{ lead: string; body: string }>;
  reasonsTally: string | null;
  layers: StackLift['layers'];
  stackTally: string;
  alternatives: {
    label: string;
    tally: string;
    rows: Array<{ header: string | null; chosen: string; repeat: boolean; alt: string; text: string }>;
  } | null;
}

export function composeStackPanel(stack: StackLift): StackPanel {
  const reasons = (stack.decision?.reasons ?? []).map((reason) => ({
    lead: reason.lead ?? firstSentence(reason.body),
    body: reason.body,
  }));
  const entries = stack.layers.reduce((total, layer) => total + layer.items.length, 0);
  let alternatives: StackPanel['alternatives'] = null;
  if (stack.alternatives && stack.alternatives.rows.length > 0) {
    let last: string | null = null;
    const rows = stack.alternatives.rows.map((row, index, all) => {
      const key = row.category ?? row.chosen;
      const header = key !== last && row.category ? row.category : null;
      last = key;
      return {
        header,
        chosen: row.chosen,
        repeat: index > 0 && all[index - 1].chosen === row.chosen,
        alt: row.alt,
        text: row.text,
      };
    });
    alternatives = {
      label: stack.alternatives.kind === 'whynot' ? 'Why not' : 'Use it instead when',
      tally: `${rows.length} weighed`,
      rows,
    };
  }
  return {
    reasons,
    reasonsTally: reasons.length > 0 ? `${reasons.length} reasons` : null,
    layers: stack.layers,
    stackTally: `${entries} entries · ${stack.layers.length} layers`,
    alternatives,
  };
}

// ---------------------------------------------------------------------------------------------
// Features

const COMPLEXITY_CELLS: Record<ConfidenceLevel, number> = {
  LOW: 1,
  'LOW-MEDIUM': 1.5,
  MEDIUM: 2,
  'MEDIUM-HIGH': 2.5,
  HIGH: 3,
};

export type FeatureKindKey = 'expected' | 'differentiators' | 'anti';

export interface FeatureRow {
  name: string;
  group: string | null;
  why: string;
  cells: number;
  complexity: string | null;
  notes: string | null;
}

export interface FeatureList {
  /** Group chips: only when the list has two or more distinct groups. */
  groups: Array<{ name: string; count: number }>;
  items: FeatureRow[];
}

export interface FeaturesPanel {
  kinds: Array<{ key: FeatureKindKey; label: string; count: number }>;
  tally: string;
  expected: FeatureList;
  differentiators: FeatureList;
  anti: { items: SwapItem[]; tally: string };
  competitors: {
    rivals: Array<{ name: string; sub: string | null }>;
    ours: { name: string; sub: string };
    rows: Array<{ feature: string; them: string[]; ours: string }>;
    note: string | null;
    tally: string;
  } | null;
}

/** `Name (what it is)` as name over its parenthetical. */
export function splitParenthetical(text: string): { name: string; sub: string | null } {
  const match = /^(.{1,200}?)\s*\((.{1,300})\)\s*$/.exec(text);
  return match ? { name: match[1], sub: match[2] } : { name: text, sub: null };
}

function featureList(items: FeatureItem[]): FeatureList {
  const rows: FeatureRow[] = items.map((item) => ({
    name: item.name,
    group: item.group,
    why: item.why,
    cells: item.complexity ? COMPLEXITY_CELLS[item.complexity] : 0,
    complexity: item.complexity ? item.complexity.toLowerCase() : null,
    notes: item.notes,
  }));
  const names = [...new Set(rows.map((row) => row.group ?? 'Other'))];
  const groups =
    names.length >= 2 ? names.map((name) => ({ name, count: rows.filter((row) => (row.group ?? 'Other') === name).length })) : [];
  return { groups, items: rows };
}

export function composeFeaturesPanel(features: FeaturesLift, projectName: string): FeaturesPanel {
  const expected = featureList(features.expected.items);
  const differentiators = featureList(features.differentiators.items);
  const total = expected.items.length + differentiators.items.length + features.anti.items.length;
  const competitors = features.competitors;
  let ours = { name: projectName, sub: 'Our approach' };
  if (competitors) {
    const label = competitors.ours;
    if (!/^our approach$/i.test(label)) {
      ours = { name: splitParenthetical(label.replace(/['’]s approach$/i, '')).name, sub: 'Our approach' };
    }
  }
  return {
    kinds: [
      { key: 'expected', label: 'Expected', count: expected.items.length },
      { key: 'differentiators', label: 'Differentiators', count: differentiators.items.length },
      { key: 'anti', label: 'Not to build', count: features.anti.items.length },
    ],
    tally: `${total} features · ${expected.items.length} expected · ${differentiators.items.length} differentiators · ${features.anti.items.length} not to build`,
    expected,
    differentiators,
    anti: {
      items: features.anti.items.map((item) => ({
        bad: item.name,
        good: sentenceCase(item.instead),
        details: [
          { label: 'Why it gets asked for', text: `${sentenceCase(item.requested)}.` },
          { label: "Why it's a problem", text: `${sentenceCase(item.problem)}.` },
        ],
      })),
      tally: `${features.anti.items.length} · looks good, causes problems`,
    },
    competitors: competitors
      ? {
          rivals: competitors.rivals.map(splitParenthetical),
          ours,
          rows: competitors.rows,
          note: competitors.note,
          tally: `${competitors.rows.length} features · ${competitors.rivals.length} compared`,
        }
      : null,
  };
}

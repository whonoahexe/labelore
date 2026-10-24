// The panels of the project Research page (quick-261024-k8u): what each open spine shows beyond the
// frame, composed from the lifts. Summary follows sketch 031 (build-order track, phase inspector,
// gaps), Stack 034 A, Features 033 D1, Architecture 032 A and Pitfalls 035 A.
//
// Pure: no node imports, no filesystem, and no file name, path, line number or URL in any output.
import {
  normaliseLevel,
  plainText,
  splitTopLevel,
  type ArchitectureLift,
  type ConfidenceLevel,
  type FeatureItem,
  type FeaturesLift,
  type PitfallsLift,
  type PitfallTable,
  type PitfallTableKind,
  type ScalingLift,
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

// ---------------------------------------------------------------------------------------------
// The first screen's sentence

/** The first screen says one thing: the finding's first sentence, cut at a colon when it runs long
 * (its list then follows quietly). Everything else is `rest`. */
export function splitFinding(value: string): { head: string; tail: string; rest: string } {
  const parts = String(value ?? '')
    .slice(0, 8_000)
    .split(/(?<=[.!?])\s+(?=[A-Z0-9`*("“])/);
  let head = parts[0] ?? '';
  let tail = '';
  const colon = head.indexOf(': ');
  if (plainText(head).length > 140 && colon > 20) {
    tail = head.slice(colon + 2);
    head = head.slice(0, colon);
  }
  return { head, tail, rest: parts.slice(1).join(' ') };
}

// ---------------------------------------------------------------------------------------------
// Architecture

export interface BuildStepModel {
  id: string;
  name: string;
  deliverable: string;
  depends: string[];
  unlocks: string[];
  notes: string | null;
  /** Prerequisites that are not steps ("spike S1"), as the author wrote them. */
  alsoWaitsFor: string | null;
}

export type ScalingTone = 'changes' | 'holds' | 'na';

export interface ScalingCell {
  text: string;
  tone: ScalingTone;
  /** The index into `bottlenecks` of the bottleneck that bites here, or null. */
  pin: number | null;
}

export interface ScalingBottleneck {
  number: string;
  label: string;
  text: string;
  fix: string | null;
}

/** Sketch 036 A: what breaks first leads, then the concerns × scale grid. */
export interface ScalingPanel {
  lead: string | null;
  tally: string;
  axis: string;
  /** The table listed one tier per row with a single concern: the grid drops its concern column. */
  single: boolean;
  tiers: Array<{ name: string; sub: string | null }>;
  concerns: Array<{ name: string; cells: ScalingCell[] }>;
  bottlenecks: ScalingBottleneck[];
  notBottlenecks: Array<{ label: string; text: string }>;
}

export interface ArchitecturePanel {
  overview: string | null;
  structure: string | null;
  scaling: ScalingPanel | null;
  antiPatterns: SwapItem[];
  antiTally: string;
  buildOrder: {
    tally: string;
    steps: BuildStepModel[];
    toggleLabel: string;
    toggleText: string | null;
  } | null;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 032 `boDetail`: the Depends-on text minus the step ids it names (and their asides). */
function alsoWaitsFor(dependsText: string | null, ids: readonly string[]): string | null {
  if (!dependsText) return null;
  let text = dependsText.slice(0, 1_000);
  for (const id of ids) text = text.replace(new RegExp(`\\b${escapeRegExp(id)}\\b(\\s*\\([^)]{0,200}\\))?[,;]?\\s*`, 'g'), '');
  text = text
    .replace(/^(plus|and)\s+/i, '')
    .replace(/^for\s+/i, '')
    .trim();
  return text !== '' && /[a-z]{3}/i.test(text) ? text : null;
}

/** A step's deliverable without its leading "Name:" label. */
function stripNamePrefix(deliverable: string, name: string): string {
  const lower = deliverable.toLowerCase();
  if (name !== '' && lower.startsWith(name.toLowerCase())) {
    const rest = deliverable.slice(name.length).replace(/^\s*:\s*/, '');
    if (rest !== deliverable.slice(name.length)) return rest;
  }
  return deliverable;
}

const ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];

/** A cell that only says nothing changes reads quiet; "n/a" reads as "doesn't apply". */
export function scalingTone(text: string): ScalingTone {
  if (/^n\/?a\.?$/i.test(text.trim())) return 'na';
  return /^(unchanged|same|low|adequate)\.?$|no adjustments? needed/i.test(plainText(text).trim()) ? 'holds' : 'changes';
}

/** A priority's problem and its fix: split at "— mitigated …" or ". Mitigated/Mitigation …". */
export function splitFix(text: string): { text: string; fix: string | null } {
  const match = /\s*[—–]\s*(mitigated\b.*)$|\.\s+(mitigat(?:ed|ion)\b.*)$/i.exec(text);
  if (!match) return { text, fix: null };
  return { text: text.slice(0, match.index).trim(), fix: match[1] ?? match[2] };
}

const STEM_STOP = /^(with|this|that|only|from|once|than|when|which|relev|reall|first|secon|bottl|mitig)/;

/** Five-letter stems of the words of four letters or more. */
function stems(text: string): Set<string> {
  const words = plainText(text).toLowerCase().match(/[a-z]{4,}/g) ?? [];
  return new Set(words.map((word) => word.slice(0, 5)).filter((stem) => !STEM_STOP.test(stem)));
}

/** Where a bottleneck bites: the cell sharing the most stems with it, at least two, or nowhere. */
function pinCell(problem: string, concerns: ScalingLift['concerns']): { concern: number; tier: number } | null {
  const want = stems(problem);
  let best: { shared: number; concern: number; tier: number } | null = null;
  for (let ci = 0; ci < concerns.length; ci += 1) {
    for (let ti = 0; ti < concerns[ci].cells.length; ti += 1) {
      const have = stems(`${concerns[ci].name} ${concerns[ci].cells[ti]}`);
      let shared = 0;
      for (const stem of want) if (have.has(stem)) shared += 1;
      if (shared >= 2 && (!best || shared > best.shared)) best = { shared, concern: ci, tier: ti };
    }
  }
  return best ? { concern: best.concern, tier: best.tier } : null;
}

export function composeScaling(scaling: ScalingLift): ScalingPanel {
  const tiers = scaling.tiers.map((tier) => splitParenthetical(tier));
  const pins = new Map<string, number>();
  const bottlenecks: ScalingBottleneck[] = [];
  const notBottlenecks: ScalingPanel['notBottlenecks'] = [];
  for (const priority of scaling.priorities) {
    if (priority.label && /^not\b/i.test(priority.label)) {
      notBottlenecks.push({ label: sentenceCase(priority.label), text: `${sentenceCase(priority.text)}.` });
      continue;
    }
    const at = bottlenecks.length;
    const { text, fix } = splitFix(priority.text);
    const pin = pinCell(text, scaling.concerns);
    if (pin) pins.set(`${pin.concern}:${pin.tier}`, at);
    const where = pin ? ` · at ${tiers[pin.tier].name}${scaling.byRow ? '' : ` · ${plainText(scaling.concerns[pin.concern].name)}`}` : '';
    bottlenecks.push({
      number: pad(at + 1),
      label: `${ORDINALS[at] ?? pad(at + 1)} to break${where}`,
      text: sentenceCase(text),
      fix: fix ? `${sentenceCase(fix)}.` : null,
    });
  }
  const concerns = scaling.concerns.map((concern, ci) => ({
    name: concern.name,
    cells: concern.cells.map((text, ti) => ({ text: capitalise(text), tone: scalingTone(text), pin: pins.get(`${ci}:${ti}`) ?? null })),
  }));
  const tally = [
    `${tiers.length} scale${tiers.length === 1 ? '' : 's'}`,
    ...(scaling.byRow || concerns.length === 0 ? [] : [`${concerns.length} concern${concerns.length === 1 ? '' : 's'}`]),
    ...(bottlenecks.length > 0 ? [`${bottlenecks.length} bottleneck${bottlenecks.length === 1 ? '' : 's'}`] : []),
  ].join(' · ');
  return { lead: scaling.lead, tally, axis: scaling.axis, single: scaling.byRow, tiers, concerns, bottlenecks, notBottlenecks };
}

export function composeArchitecturePanel(architecture: ArchitectureLift): ArchitecturePanel {
  const order = architecture.buildOrder;
  let buildOrder: ArchitecturePanel['buildOrder'] = null;
  if (order && order.steps.length > 0) {
    const ids = order.steps.map((step) => step.id);
    const steps: BuildStepModel[] = order.steps.map((step) => ({
      id: step.id,
      name: capitalise(step.name),
      deliverable: sentenceCase(stripNamePrefix(step.deliverable, step.name)),
      depends: step.depends,
      unlocks: order.steps.filter((other) => other.depends.includes(step.id)).map((other) => other.id),
      notes: step.notes,
      alsoWaitsFor: alsoWaitsFor(step.dependsText, ids),
    }));
    // The deepest chain, as "N deep": columns are counted by the layout, so approximate it here the
    // same way (longest prerequisite chain with a pass-bounded relaxation).
    const depth = new Map(ids.map((id) => [id, 0]));
    for (let pass = 0; pass < ids.length; pass += 1) {
      let changed = false;
      for (const step of order.steps) {
        for (const dep of step.depends) {
          const next = Math.min(ids.length - 1, (depth.get(dep) ?? 0) + 1);
          if (next > (depth.get(step.id) ?? 0)) {
            depth.set(step.id, next);
            changed = true;
          }
        }
      }
      if (!changed) break;
    }
    const deep = Math.max(...depth.values()) + 1;
    buildOrder = {
      tally: `${steps.length} steps · ${deep} deep`,
      steps,
      toggleLabel: order.grouping ? 'Roadmap grouping' : 'Why this order',
      toggleText: order.grouping ?? order.note,
    };
  }
  return {
    overview: architecture.overview,
    structure: architecture.structure,
    scaling: architecture.scaling ? composeScaling(architecture.scaling) : null,
    antiPatterns: architecture.antiPatterns.map((pattern) => ({
      bad: pattern.title,
      good: sentenceCase(pattern.instead),
      details: [
        ...(pattern.does ? [{ label: 'What people do', text: `${sentenceCase(pattern.does)}.` }] : []),
        { label: "Why it's wrong", text: `${sentenceCase(pattern.why)}.` },
      ],
    })),
    antiTally: `${architecture.antiPatterns.length} to avoid`,
    buildOrder,
  };
}

// ---------------------------------------------------------------------------------------------
// Pitfalls

const LIKELY_CELLS: Record<string, number> = {
  'very high': 4,
  high: 3,
  'medium-high': 2.5,
  medium: 2,
  'low-medium': 1.5,
  low: 1,
};

export type PitfallTabKey = 'signs' | 'avoid' | 'why' | 'verify';

export interface PitfallRowModel {
  n: number;
  label: string;
  /** The name the row leads with: the mapping's short name, else the title. */
  name: string;
  /** The full title under the name, only when a short name exists. */
  title: string | null;
  firstSign: string | null;
  moreSigns: number;
  /** How likely (4 cells) or, when the file does not say, how sure (3 cells). */
  meter: { cells: 3 | 4; filled: number; text: string; label: string } | null;
  phase: string;
  wrong: { head: string; tail: string; list: string[]; more: Array<{ bullet: boolean; text: string }> };
  tabs: Array<{ key: PitfallTabKey; label: string }>;
  signs: string[];
  avoid: Array<{ main: string; rest: string }>;
  why: Array<{ bullet: boolean; text: string }>;
  verify: string | null;
}

export interface PitfallTableModel {
  key: PitfallTableKind;
  label: string;
  count: number;
  lead: string | null;
  /** The key row over the swaps: the item column's header and the fix column's. */
  itemLabel: string;
  fixLabel: string;
  items: SwapItem[];
}

/** Sketch 037 B: Performance, security and UX as one section, a kind switch over uniform swaps. */
export interface PitfallTablesPanel {
  tally: string;
  kinds: PitfallTableModel[];
}

export interface PitfallsPanel {
  note: string | null;
  tally: string;
  pitfalls: PitfallRowModel[];
  checks: Array<{ label: string | null; text: string; chips: PitfallChip[] }>;
  checksTally: string;
  tables: PitfallTablesPanel | null;
}

const PITFALL_TABLE_LABELS: Record<PitfallTableKind, string> = {
  performance: 'Performance traps',
  security: 'Security mistakes',
  ux: 'UX pitfalls',
};

/** A table header as a label: "When It Breaks" → "When it breaks". */
function headerLabel(header: string): string {
  const plain = plainText(header).trim();
  return plain.charAt(0).toUpperCase() + plain.slice(1).toLowerCase();
}

/** Each table as swaps: the item → its fix (the Prevention / Better approach column, else the
 * last), every other column a labelled detail. Cells stay as written. */
export function composePitfallTables(tables: readonly PitfallTable[]): PitfallTablesPanel | null {
  if (tables.length === 0) return null;
  const kinds = tables.map((table): PitfallTableModel => {
    const matched = table.head.findIndex((header, index) => index > 0 && /prevent|better|instead|fix/i.test(header));
    const fixAt = matched > 0 ? matched : Math.max(1, table.head.length - 1);
    return {
      key: table.kind,
      label: PITFALL_TABLE_LABELS[table.kind],
      count: table.rows.length,
      lead: table.lead,
      itemLabel: headerLabel(table.head[0] ?? ''),
      fixLabel: headerLabel(table.head[fixAt] ?? ''),
      items: table.rows.map((row) => ({
        bad: row[0],
        good: row[fixAt] ?? '',
        details: table.head
          .map((header, index) => ({ index, label: headerLabel(header), text: row[index] ?? '' }))
          .filter((cell) => cell.index > 0 && cell.index !== fixAt && cell.text !== '')
          .map(({ label, text }) => ({ label, text })),
      })),
    };
  });
  const total = kinds.reduce((sum, kind) => sum + kind.count, 0);
  return { tally: `${total} more to avoid`, kinds };
}

/** The first sentence of `text` and the rest, never splitting inside code, parentheses or "e.g.". */
export function splitSentence(text: string): [string, string] {
  const source = text.slice(0, 4_000);
  let depth = 0;
  let tick = false;
  for (let index = 0; index < source.length - 1; index += 1) {
    const char = source[index];
    if (char === '`') tick = !tick;
    if (tick) continue;
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);
    if (
      depth === 0 &&
      /[.!?]/.test(char) &&
      /\s/.test(source[index + 1]) &&
      index > 30 &&
      !/\b(e\.g|i\.e|vs|etc|cf)$/i.test(source.slice(Math.max(0, index - 8), index)) &&
      /[A-Z`*("“]/.test(source.slice(index + 1).trimStart()[0] ?? '')
    ) {
      return [source.slice(0, index + 1), source.slice(index + 1).trim()];
    }
  }
  return [source, ''];
}

/** The phase that prevents it: the mapping's, without its asides, cut at a dash or sentence end. */
export function phaseShort(mapPhase: string | null, phase: string): string {
  const text = String(mapPhase || phase || '').slice(0, 600).replace(/\s*\([^)]*\)/g, '');
  return (text.split(/\s+—\s+|[.;:]\s/)[0] ?? '').trim();
}

function avoidParts(text: string): { main: string; rest: string } {
  const bold = /^\*\*(.{1,300}?)\*\*[:.]?\s*(.*)$/.exec(text);
  let [main, rest]: [string, string] = bold ? [bold[1].replace(/[.:]$/, ''), bold[2]] : splitSentence(text);
  // One long sentence: say it up to its colon or dash, and let the rest clamp.
  const cut = !bold && plainText(main).length > 140 ? main.search(/(?<=.{40}):\s|\s—\s/) : -1;
  if (cut > 0) {
    rest = `${capitalise(main.slice(cut).replace(/^[:\s—]+/, ''))} ${rest}`.trim();
    main = main.slice(0, cut);
  }
  return { main, rest };
}

function wrongParts(wrong: ReadonlyArray<{ bullet: boolean; text: string }>): PitfallRowModel['wrong'] {
  const [first, ...others] = wrong;
  if (!first) return { head: '', tail: '', list: [], more: [] };
  if (first.bullet) {
    const list = wrong
      .filter((block) => block.bullet)
      .map((block) => {
        const lead = /^\*\*(.{1,300}?)\*\*/.exec(block.text);
        return lead ? lead[1].replace(/[.:]$/, '') : splitSentence(block.text)[0];
      });
    return { head: '', tail: '', list, more: [...wrong] };
  }
  const split = splitFinding(first.text);
  return {
    head: split.head,
    tail: split.tail,
    list: [],
    more: [...(split.rest ? [{ bullet: false, text: split.rest }] : []), ...others],
  };
}

function pitfallMeter(
  likely: { level: string } | null,
  confidence: { level: string } | null,
): PitfallRowModel['meter'] {
  if (likely) {
    const level = likely.level.toLowerCase();
    const text = capitalise(level);
    return { cells: 4, filled: LIKELY_CELLS[level] ?? 0, text, label: `How likely: ${text}` };
  }
  if (confidence) {
    const level = normaliseLevel(confidence.level);
    const text = `${(level ?? confidence.level).toLowerCase().replace('-', '–')} confidence`;
    return { cells: 3, filled: level ? COMPLEXITY_CELLS[level] : 0, text, label: text };
  }
  return null;
}

export function composePitfallsPanel(pitfalls: PitfallsLift): PitfallsPanel {
  const rows: PitfallRowModel[] = pitfalls.pitfalls.map((pitfall) => {
    const tabs: PitfallRowModel['tabs'] = [
      ...(pitfall.signs.length > 0 ? [{ key: 'signs' as const, label: `Warning signs · ${pitfall.signs.length}` }] : []),
      ...(pitfall.avoid.length > 0 ? [{ key: 'avoid' as const, label: `How to avoid · ${pitfall.avoid.length}` }] : []),
      ...(pitfall.why.length > 0 ? [{ key: 'why' as const, label: 'Why it happens' }] : []),
      ...(pitfall.verify ? [{ key: 'verify' as const, label: 'How to verify' }] : []),
    ];
    return {
      n: pitfall.n,
      label: pad(pitfall.n),
      name: pitfall.short ?? pitfall.title,
      title: pitfall.short ? pitfall.title : null,
      firstSign: pitfall.signs[0] ?? null,
      moreSigns: Math.max(0, pitfall.signs.length - 1),
      meter: pitfallMeter(pitfall.likely, pitfall.confidence),
      phase: phaseShort(pitfall.mapPhase, pitfall.phase),
      wrong: wrongParts(pitfall.wrong),
      tabs,
      signs: pitfall.signs,
      avoid: pitfall.avoid.map(avoidParts),
      why: pitfall.why,
      verify: pitfall.verify,
    };
  });
  const signs = rows.reduce((total, row) => total + row.signs.length, 0);
  return {
    note: pitfalls.note,
    tally: `${rows.length} · ${signs} warning signs`,
    pitfalls: rows,
    checks: pitfalls.checks.map((check) => ({
      label: check.label,
      text: check.trap ? `Often ${check.trap}. ${check.check}` : check.check,
      chips: check.pitfalls.map((n) => pitfallChip(n, pitfalls)),
    })),
    checksTally: `${pitfalls.checks.length} checks before calling it done`,
    tables: composePitfallTables(pitfalls.tables),
  };
}

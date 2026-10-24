// Pure view model for the project Research page (quick-261024-k8u, sketches 031-035). It reads the
// `structured.projectResearch` lift the ProjectResearchHandler attaches to the five files in
// `.planning/research/`, and composes the frame (the bar, one spine per present file, each file's
// one-sentence finding) plus each file's panel (project-research-panels.ts).
//
// The view model carries no file name, `.planning/` path, line number or artifact URL: the page
// never links back to the source files. Inputs are typed structurally; nothing here reads a
// filesystem.
import type {
  ArchitectureLift,
  ConfidenceLevel,
  FeaturesLift,
  PitfallsLift,
  ProjectResearchLift,
  StackLift,
  SummaryLift,
} from '../planning-repo/handlers/project-research-lift.ts';
import type { ProjectPresentation } from '../server/project-presentation.ts';
import { RESEARCH_FILES, type ResearchFileKey } from './project-research-files.ts';

export type { ResearchFileKey } from './project-research-files.ts';

export interface ResearchStat {
  value: number;
  label: string;
}

export interface ResearchFinding {
  /** The first sentence (cut at a colon when long): the big line. */
  head: string;
  /** The list after the colon, shown small and muted; empty when the head was not cut. */
  tail: string;
  /** Everything else, one paragraph each, behind the more toggle. */
  more: string[];
}

export interface ResearchFileModel {
  key: ResearchFileKey;
  label: string;
  /** Two digits, the file's index among the present files: Summary is 00. */
  number: string;
  keyNumber: ResearchStat;
  confidence: ConfidenceLevel | null;
  nums: ResearchStat[];
  finding: ResearchFinding | null;
  moreLabel: string | null;
}

export interface ResearchViewModel {
  readAt: string;
  available: boolean;
  /** The milestone name, else the project name. */
  title: string;
  confidence: { level: ConfidenceLevel | null; text: string | null };
  /** `21 Aug 2026`, or null when the Summary does not date itself. */
  researched: string | null;
  fileCount: number;
  files: ResearchFileModel[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function plain(text: string): string {
  return text.replace(/\*\*|`/g, '');
}

/** `2026-08-21` to `21 Aug 2026`; anything else passes through trimmed. */
export function formatResearched(value: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value.trim() || null;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${Number(match[3])} ${month} ${match[1]}` : value.trim();
}

/** The first screen says one thing: the finding's first sentence, cut at a colon when it runs long
 * (its list then follows quietly). Everything else is `rest`. */
export function splitFinding(value: string): { head: string; tail: string; rest: string } {
  const parts = String(value ?? '')
    .slice(0, 8_000)
    .split(/(?<=[.!?])\s+(?=[A-Z0-9`*("“])/);
  let head = parts[0] ?? '';
  let tail = '';
  const colon = head.indexOf(': ');
  if (plain(head).length > 140 && colon > 20) {
    tail = head.slice(colon + 2);
    head = head.slice(0, colon);
  }
  return { head, tail, rest: parts.slice(1).join(' ') };
}

interface Lifts {
  summary: SummaryLift | null;
  stack: StackLift | null;
  features: FeaturesLift | null;
  architecture: ArchitectureLift | null;
  pitfalls: PitfallsLift | null;
}

function isLift(value: unknown, key: ResearchFileKey): value is ProjectResearchLift {
  return typeof value === 'object' && value !== null && (value as { file?: unknown }).file === key;
}

function readLifts(presentation: Pick<ProjectPresentation, 'artifacts'>): Lifts {
  const lifts: Lifts = { summary: null, stack: null, features: null, architecture: null, pitfalls: null };
  for (const spec of RESEARCH_FILES) {
    const artifact = presentation.artifacts.find((candidate) => candidate.path === spec.path && candidate.location === 'research');
    const lift = artifact?.structured.projectResearch;
    if (isLift(lift, spec.key)) (lifts as unknown as Record<string, unknown>)[spec.key] = lift;
  }
  return lifts;
}

/** `Name, milestone vX.Y Milestone name` gives the milestone name; otherwise the project line. */
function titleOf(summary: SummaryLift | null, projectName: string | null): string {
  const project = summary?.head.project ?? null;
  if (project) {
    const milestone = /^(.{1,200}?),\s*milestone\s+(v[\d.]+)\s+(.{1,200})$/i.exec(project);
    if (milestone) return plain(milestone[3]).trim();
    return plain(project).trim();
  }
  return projectName && projectName.trim() !== '' ? projectName : 'Research';
}

function levelOf(key: ResearchFileKey, lifts: Lifts): ConfidenceLevel | null {
  const own = lifts[key]?.head.confidence.level ?? null;
  if (key === 'summary') return own;
  const label = RESEARCH_FILES.find((file) => file.key === key)?.label.toLowerCase().slice(0, 5) ?? '';
  const row = lifts.summary?.areas.find((area) => area.area.toLowerCase().startsWith(label));
  return row?.level ?? own;
}

function stackEntries(stack: StackLift): number {
  return stack.layers.reduce((total, layer) => total + layer.items.length, 0);
}

function pitfallSigns(pitfalls: PitfallsLift): number {
  return pitfalls.pitfalls.reduce((total, pitfall) => total + pitfall.signs.length, 0);
}

function keyNumberOf(key: ResearchFileKey, lifts: Lifts): ResearchStat {
  switch (key) {
    case 'summary':
      return { value: lifts.summary?.phases.length ?? 0, label: 'phases suggested' };
    case 'stack':
      return { value: lifts.stack ? stackEntries(lifts.stack) : 0, label: 'stack entries' };
    case 'features': {
      const features = lifts.features;
      const total = features
        ? features.expected.items.length + features.differentiators.items.length + features.anti.items.length
        : 0;
      return { value: total, label: 'features weighed' };
    }
    case 'architecture': {
      const architecture = lifts.architecture;
      if (architecture && architecture.components > 0) return { value: architecture.components, label: 'components' };
      const steps = architecture?.buildOrder?.steps.length ?? 0;
      if (steps > 0) return { value: steps, label: 'build steps' };
      return { value: architecture?.antiPatterns.length ?? 0, label: 'anti-patterns' };
    }
    case 'pitfalls':
      return { value: lifts.pitfalls?.pitfalls.length ?? 0, label: 'critical pitfalls' };
  }
}

function numsOf(key: ResearchFileKey, lifts: Lifts, keyNumber: ResearchStat): ResearchStat[] {
  if (key === 'summary') {
    return [
      { value: lifts.summary?.phases.length ?? 0, label: 'phases' },
      { value: lifts.summary?.gaps.length ?? 0, label: 'gaps' },
    ];
  }
  if (key === 'pitfalls' && lifts.pitfalls) {
    return [
      keyNumber,
      { value: pitfallSigns(lifts.pitfalls), label: 'warning signs' },
      { value: lifts.pitfalls.checks.length, label: 'checks before done' },
    ];
  }
  return [keyNumber];
}

/** The text a file leads with, and the paragraphs that wait behind its more toggle. */
function findingSource(key: ResearchFileKey, lifts: Lifts): { text: string; extra: string[] } {
  switch (key) {
    case 'summary': {
      const exec = lifts.summary?.exec ?? [];
      return { text: exec[0] ?? '', extra: exec.slice(1) };
    }
    case 'stack': {
      const decision = lifts.stack?.decision ?? null;
      if (decision && decision.verdict.trim() !== '') return { text: decision.verdict, extra: decision.rest };
      return { text: lifts.summary?.keyFindings.stack ?? '', extra: [] };
    }
    case 'features': {
      const features = lifts.features;
      if (!features) return { text: '', extra: [] };
      const text = `**${features.expected.items.length}** things users expect, **${features.differentiators.items.length}** that set it apart, and **${features.anti.items.length}** worth refusing to build.`;
      return { text, extra: [] };
    }
    case 'architecture':
      return { text: lifts.summary?.keyFindings.architecture ?? '', extra: [] };
    case 'pitfalls': {
      const first = lifts.pitfalls?.pitfalls[0];
      const count = lifts.pitfalls?.pitfalls.length ?? 0;
      return { text: first ? `The worst of ${count}: ${first.title.replace(/\.$/, '')}.` : '', extra: [] };
    }
  }
}

function findingOf(key: ResearchFileKey, lifts: Lifts): ResearchFinding | null {
  const { text, extra } = findingSource(key, lifts);
  if (text.trim() === '') return null;
  const split = splitFinding(text);
  return { head: split.head, tail: split.tail, more: [split.rest, ...extra].filter((paragraph) => paragraph.trim() !== '') };
}

export function buildResearchViewModel(
  presentation: Pick<ProjectPresentation, 'artifacts' | 'readAt' | 'projectName'>,
): ResearchViewModel {
  const lifts = readLifts(presentation);
  const present = RESEARCH_FILES.filter((spec) => lifts[spec.key] !== null);
  const files: ResearchFileModel[] = present.map((spec, index) => {
    const finding = findingOf(spec.key, lifts);
    const keyNumber = keyNumberOf(spec.key, lifts);
    return {
      key: spec.key,
      label: spec.label,
      number: pad(index),
      keyNumber,
      confidence: levelOf(spec.key, lifts),
      nums: numsOf(spec.key, lifts, keyNumber),
      finding,
      moreLabel: finding && finding.more.length > 0 ? (spec.key === 'summary' ? 'Read the full summary' : 'Read more') : null,
    };
  });
  const summary = lifts.summary;
  return {
    readAt: presentation.readAt,
    available: files.length > 0,
    title: titleOf(summary, presentation.projectName ?? null),
    confidence: { level: summary?.head.confidence.level ?? null, text: summary?.head.confidence.text ?? null },
    researched: formatResearched(summary?.head.researched ?? null),
    fileCount: files.length,
    files,
  };
}

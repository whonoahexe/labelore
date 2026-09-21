// sketch-004 B3 (quick-260922-3us Task 2): the plan DocumentLayoutSpec. Adopts the shared layout
// through manifest data only — Tasks and Must be true when done chapters, objective/threat-model/
// success-criteria/verification panels in the Also chapter, cover built from `planProgress`
// (`ViewInput.planProgress`, matched generically in artifact-page.tsx by `path`).
import { humanizeKey, toFrontmatterValueView } from '../../rendering/frontmatter-views.ts';
import type {
  ChapterItem,
  ChapterSpec,
  ComposedAlsoPanel,
  ComposedChapter,
  CoverData,
  CoverFact,
  CoverGlance,
  DocumentLayoutSpec,
  SelectedChapter,
  Tally,
} from './layout.ts';
import { factValueText } from './layout.ts';
import type { ViewInput } from './manifest.ts';

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

interface MustHaveProhibition {
  statement?: unknown;
  status?: unknown;
}

interface MustHaveArtifact {
  path?: unknown;
  provides?: unknown;
  exports?: unknown;
}

interface MustHaveKeyLink {
  from?: unknown;
  to?: unknown;
  via?: unknown;
  pattern?: unknown;
}

const tasksChapter: ChapterSpec = {
  type: 'items',
  id: 'tasks',
  select: (input: ViewInput): SelectedChapter[] | null => {
    const taskSegments = input.planSegments.filter((segment) => segment.tag === 'task');
    if (taskSegments.length === 0) return null;
    const planProgress = input.planProgress ?? null;
    const isComplete = planProgress?.complete === true;

    const items: ChapterItem[] = taskSegments.map((segment, index) => {
      const chips: Tally[] = [];
      if (segment.type) chips.push({ label: segment.type, tone: 'quiet' });
      if (segment.tdd === 'true') chips.push({ label: 'TDD', tone: 'quiet' });
      if (segment.gate) chips.push({ label: 'Gates', tone: 'active' });
      return {
        key: `task-${index + 1}`,
        ref: `Task ${index + 1}`,
        title: segment.name ?? segment.label,
        state: isComplete ? { label: 'Done', tone: 'complete' } : null,
        tally: isComplete ? undefined : { label: 'Planned', tone: 'quiet', rollup: 'planned' },
        chips: chips.length > 0 ? chips : undefined,
        detail: segment.html
          ? { label: "What it does · how it's verified", html: segment.html }
          : null,
      };
    });

    const everyTaskHasHtml = taskSegments.every((segment) => segment.html !== undefined);
    const accountsFor = everyTaskHasHtml
      ? input.groups.filter((group) => (group.heading ?? '').trim().toLowerCase() === 'tasks')
      : [];

    return [{ key: 'tasks', title: 'Tasks', items, accountsFor }];
  },
};

const mustHavesChapter: ChapterSpec = {
  type: 'items',
  id: 'must-haves',
  select: (input: ViewInput): SelectedChapter[] | null => {
    const raw = input.frontmatter.must_haves;
    if (typeof raw !== 'object' || raw === null) return null;
    const mustHaves = raw as Record<string, unknown>;
    const items: ChapterItem[] = [];

    const truths = Array.isArray(mustHaves.truths) ? mustHaves.truths : [];
    truths.forEach((truth, index) => {
      const text = asString(truth);
      if (!text) return;
      items.push({
        key: `truth-${index + 1}`,
        ref: 'Truth',
        title: text,
        state: null,
        tally: { label: 'Truth', tone: 'quiet', rollup: 'truths' },
      });
    });

    const prohibitions = Array.isArray(mustHaves.prohibitions) ? mustHaves.prohibitions : [];
    prohibitions.forEach((entry, index) => {
      if (typeof entry !== 'object' || entry === null) return;
      const prohibition = entry as MustHaveProhibition;
      const statement = asString(prohibition.statement);
      if (!statement) return;
      const status = asString(prohibition.status);
      items.push({
        key: `prohibition-${index + 1}`,
        ref: 'Prohibition',
        title: statement,
        state: status ? { label: status, tone: 'quiet' } : null,
      });
    });

    const artifacts = Array.isArray(mustHaves.artifacts) ? mustHaves.artifacts : [];
    artifacts.forEach((entry, index) => {
      if (typeof entry !== 'object' || entry === null) return;
      const artifact = entry as MustHaveArtifact;
      const path = asString(artifact.path);
      const provides = asString(artifact.provides);
      if (!path && !provides) return;
      const exportsValue = asString(artifact.exports);
      items.push({
        key: `artifact-${index + 1}`,
        ref: 'Artifact',
        title: [path, provides].filter((value): value is string => value !== null).join(' — '),
        state: null,
        detail: exportsValue ? { label: 'Exports', rows: [{ text: exportsValue }] } : null,
      });
    });

    const keyLinks = Array.isArray(mustHaves.key_links) ? mustHaves.key_links : [];
    keyLinks.forEach((entry, index) => {
      if (typeof entry !== 'object' || entry === null) return;
      const link = entry as MustHaveKeyLink;
      const from = asString(link.from);
      const to = asString(link.to);
      if (!from && !to) return;
      const via = asString(link.via);
      const pattern = asString(link.pattern);
      const rows: { label?: string; text: string }[] = [];
      if (via) rows.push({ label: 'Via', text: via });
      if (pattern) rows.push({ label: 'Pattern', text: pattern });
      items.push({
        key: `link-${index + 1}`,
        ref: 'Key link',
        title: [from, to].filter((value): value is string => value !== null).join(' → '),
        state: null,
        detail: rows.length > 0 ? { label: 'Details', rows } : null,
      });
    });

    return items.length > 0 ? [{ key: 'must-haves', title: 'Must be true when done', items }] : null;
  },
};

const COVER_FACT_KEYS = ['wave', 'depends_on', 'requirements', 'autonomous', 'type'];

function cover(
  input: ViewInput,
  parts: { chapters: ComposedChapter[]; also: ComposedAlsoPanel[] },
): CoverData {
  const tasksComposed = parts.chapters.find((chapter) => chapter.specId === 'tasks') ?? null;
  const mustHavesComposed = parts.chapters.find((chapter) => chapter.specId === 'must-haves') ?? null;
  const planProgress = input.planProgress ?? null;

  const taskCount = tasksComposed?.count ?? 0;
  const doneCount = tasksComposed?.items?.filter((item) => item.state?.label === 'Done').length ?? 0;
  const headline =
    taskCount === 0
      ? null
      : planProgress?.complete
        ? { value: `${doneCount}/${taskCount}`, label: 'tasks done' }
        : { value: String(taskCount), label: `task${taskCount === 1 ? '' : 's'} planned` };

  const status: Tally | null =
    planProgress === null
      ? null
      : planProgress.complete
        ? { label: 'Complete', tone: 'complete' }
        : planProgress.summaryStatus === 'awaiting-checkpoint'
          ? { label: 'Awaiting checkpoint', tone: 'in-flight' }
          : { label: 'Not yet executed', tone: 'quiet' };

  const pills: { value: string; label: string }[] = [];
  const mustHaveCount = mustHavesComposed?.count ?? 0;
  if (mustHaveCount > 0) pills.push({ value: String(mustHaveCount), label: 'Must-haves' });
  const requirements = Array.isArray(input.frontmatter.requirements) ? input.frontmatter.requirements : [];
  if (requirements.length > 0) pills.push({ value: String(requirements.length), label: 'Requirements' });
  const gatedItems = (tasksComposed?.items ?? []).filter((item) =>
    item.chips?.some((chip) => chip.label === 'Gates'),
  );
  if (gatedItems.length > 0) pills.push({ value: String(gatedItems.length), label: 'Gated' });

  let glance: CoverGlance | null = null;
  const firstGated = gatedItems[0];
  if (firstGated) {
    const title =
      planProgress === null
        ? `${firstGated.ref} is a human checkpoint`
        : planProgress.complete
          ? `${firstGated.ref} was a human checkpoint`
          : `${firstGated.ref} needs a human`;
    glance = {
      eyebrow: 'Human checkpoint',
      title: title ?? 'A task needs a human',
      body: firstGated.title,
      action: `Open ${(firstGated.ref ?? 'task').toLowerCase()}`,
      target: firstGated.id,
    };
  }

  const facts: CoverFact[] = [];
  for (const key of COVER_FACT_KEYS) {
    if (!Object.hasOwn(input.frontmatter, key)) continue;
    const raw = input.frontmatter[key];
    if (raw === null || raw === undefined || raw === '') continue;
    const text = factValueText(toFrontmatterValueView(raw));
    if (text === null) continue;
    facts.push({ label: humanizeKey(key), value: text });
  }

  return { status, facts, headline, pills, glance };
}

export const planLayout: DocumentLayoutSpec = {
  chapters: [tasksChapter, mustHavesChapter],
  also: [
    { id: 'objective', heading: 'Objective', eyebrow: 'Why this plan exists' },
    { id: 'threat-model', heading: /^threat model/i, eyebrow: 'Threat model' },
    { id: 'success-criteria', heading: 'Success Criteria', eyebrow: 'Done when' },
    { id: 'verification', heading: 'Verification', eyebrow: 'How it is checked' },
  ],
  cover,
};

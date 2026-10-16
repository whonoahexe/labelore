// The PLAN page's "What to check" model (quick-261016-ujo): everything a person needs to check a
// plan's work by hand, gathered in one place from the five standard places a GSD project puts it.
//   1. The task's own fields: how-to-verify, instructions, action, `<verify><human-check>`,
//      acceptance criteria and the resume signal.
//   2. The directory's VALIDATION `## Manual-Only Verifications` rows, matched to the plan by the
//      requirement IDs they share. Task IDs never match a row in: the template has no task-ID column.
//      They only leave a row out, when the row names task references that all belong to other plans.
//   3. The directory's UI-SPEC `## UI Considerations` rows whose status is backstop.
//   4. The task's Read first entries (and `@` context lines), as links only.
//   5. The phase UAT file, as a pointer.
// Pure: it reads the cached `ProjectPresentation` and the reference registry, never a file, and
// imports nothing from Node. It never throws and uses no regular expression, only indexOf / slice /
// split string operations. T-ujo-02: a URL exists only when `resolveArtifactReference` matched a
// presentation artifact path exactly; an unresolved entry is dropped, never guessed.
import { parseBlocks } from '../planning-repo/handlers/context-brief.ts';
import type { Block } from '../planning-repo/handlers/context-brief.ts';
import type { ArtifactDto, ProjectPresentation } from '../server/project-presentation.ts';
import { resolveArtifactReference } from './references.ts';
import type { ReferenceRegistry } from './references.ts';

export type ManualCheckGroupKey = 'task' | 'validation' | 'ui-spec' | 'read-first' | 'uat';

export interface ManualCheckReference {
  text: string;
  title: string | null;
  url: string | null;
}

export interface ManualCheckItem {
  title: string;
  blocks: Block[];
  note: string | null;
  requirements: string[];
}

export interface ManualCheckGroup {
  key: ManualCheckGroupKey;
  label: string;
  source: ManualCheckReference | null;
  lead: string | null;
  items: ManualCheckItem[];
  links: ManualCheckReference[];
}

export interface TaskManualChecks {
  n: number;
  count: number;
  groups: ManualCheckGroup[];
}

export interface PlanManualChecks {
  total: number;
  tasks: TaskManualChecks[];
}

/** T-ujo-03: no group lists more than this many items. */
const MAX_ITEMS = 200;

const UAT_LEAD = 'This phase also collects its hand checks in one checklist.';

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stringOf(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function directoryOf(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash < 0 ? '' : path.slice(0, slash);
}

function fileNameOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function isDigits(text: string): boolean {
  if (text === '') return false;
  for (const ch of text) if (ch < '0' || ch > '9') return false;
  return true;
}

function capitalize(text: string): string {
  return text === '' ? text : text[0].toUpperCase() + text.slice(1);
}

/** The blocks of a projected `PlanBlocks` field, or an empty list. */
function blocksOf(field: unknown): Block[] {
  if (!isRecord(field) || !Array.isArray(field.blocks)) return [];
  return field.blocks.filter(isRecord) as unknown as Block[];
}

// ---------------------------------------------------------------------------
// Requirement IDs and task references
// ---------------------------------------------------------------------------

function normalizeId(id: string): string {
  return id.trim().toUpperCase();
}

/** The plan's `requirements` frontmatter: an array of strings or a comma-separated string. */
function planRequirements(frontmatter: unknown): string[] {
  if (!isRecord(frontmatter)) return [];
  const raw = frontmatter.requirements;
  const parts: string[] = [];
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      const text = stringOf(entry);
      if (text !== null) parts.push(text);
    }
  } else if (typeof raw === 'string') {
    parts.push(...raw.split(','));
  }
  return parts.map(normalizeId).filter((id) => id !== '');
}

function isTaskReferenceChar(ch: string): boolean {
  return (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '-' || ch === '.';
}

/** `04-06-03` or `04.1-02-01`: exactly three dash-joined digit groups, the first holding at most one dot. */
function asTaskReference(token: string): string | null {
  let start = 0;
  let end = token.length;
  while (start < end && (token[start] === '.' || token[start] === '-')) start += 1;
  while (end > start && (token[end - 1] === '.' || token[end - 1] === '-')) end -= 1;
  const ref = token.slice(start, end);
  const groups = ref.split('-');
  if (groups.length !== 3) return null;
  const dot = groups[0].indexOf('.');
  if (dot >= 0) {
    const head = groups[0].slice(0, dot);
    const tail = groups[0].slice(dot + 1);
    if (!isDigits(head) || !isDigits(tail)) return null;
  } else if (!isDigits(groups[0])) {
    return null;
  }
  return isDigits(groups[1]) && isDigits(groups[2]) ? ref : null;
}

function taskReferences(text: string): string[] {
  const refs: string[] = [];
  let token = '';
  const flush = (): void => {
    if (token !== '') {
      const ref = asTaskReference(token);
      if (ref !== null) refs.push(ref);
    }
    token = '';
  };
  for (const ch of text) {
    if (isTaskReferenceChar(ch)) token += ch;
    else flush();
  }
  flush();
  return refs;
}

/** `04-06-PLAN.md` -> `04-06-`; any other name -> '' (nothing can be told apart, so nothing is left out). */
function planPrefix(planPath: string): string {
  const name = fileNameOf(planPath);
  const suffix = '-PLAN.md';
  return name.endsWith(suffix) && name.length > suffix.length ? `${name.slice(0, name.length - suffix.length)}-` : '';
}

/** True when the text names task references and none of them belongs to this plan. */
function namesOnlyOtherPlans(texts: string[], prefix: string): boolean {
  const refs: string[] = [];
  for (const text of texts) refs.push(...taskReferences(text));
  if (refs.length === 0) return false;
  return !refs.some((ref) => ref.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// Source references
// ---------------------------------------------------------------------------

function artifactReference(registry: ReferenceRegistry, path: string, text: string): ManualCheckReference {
  return { text, title: path, url: resolveArtifactReference(registry, path)?.url ?? null };
}

function sectionSource(registry: ReferenceRegistry, path: string, section: string): ManualCheckReference {
  return artifactReference(registry, path, `${fileNameOf(path)} · ${section}`);
}

function siblings(presentation: ProjectPresentation, directory: string, kind: string): ArtifactDto[] {
  return presentation.artifacts.filter((artifact) => artifact.kind === kind && directoryOf(artifact.path) === directory);
}

// ---------------------------------------------------------------------------
// Task group
// ---------------------------------------------------------------------------

function plainItem(title: string, blocks: Block[]): ManualCheckItem | null {
  return blocks.length === 0 ? null : { title, blocks, note: null, requirements: [] };
}

function acceptanceBlocks(field: unknown): Block[] {
  if (!isRecord(field)) return [];
  const blocks: Block[] = [];
  const lead = stringOf(field.lead);
  if (lead !== null) blocks.push({ kind: 'paragraph', text: lead });
  const items = Array.isArray(field.items) ? field.items.filter((item): item is string => typeof item === 'string' && item.trim() !== '') : [];
  if (items.length > 0) blocks.push({ kind: 'list', ordered: false, items });
  return blocks;
}

function humanChecks(task: Record<string, unknown>): string[] {
  const fields = isRecord(task.fields) ? task.fields : {};
  const verify = isRecord(fields.verify) ? fields.verify : null;
  if (verify === null || !Array.isArray(verify.items)) return [];
  const texts: string[] = [];
  for (const item of verify.items) {
    if (isRecord(item) && item.kind === 'human-check' && typeof item.text === 'string' && item.text.trim() !== '') {
      texts.push(item.text);
    }
  }
  return texts;
}

function taskItems(task: Record<string, unknown>, humanVerify: boolean): ManualCheckItem[] {
  const fields = isRecord(task.fields) ? task.fields : {};
  const items: (ManualCheckItem | null)[] = [];
  if (humanVerify) {
    items.push(plainItem('How to check it', blocksOf(fields.howToVerify)));
    items.push(plainItem('Steps', blocksOf(fields.instructions)));
    items.push(plainItem('What to do', blocksOf(fields.action)));
  }
  for (const text of humanChecks(task)) items.push(plainItem('Human check', parseBlocks(text)));
  if (humanVerify) {
    items.push(plainItem('Accept when', acceptanceBlocks(fields.acceptance)));
    const signal = stringOf(task.resumeSignal);
    if (signal !== null) items.push(plainItem('When you are done', parseBlocks(signal)));
  }
  return items.filter((item): item is ManualCheckItem => item !== null).slice(0, MAX_ITEMS);
}

// ---------------------------------------------------------------------------
// Plan-level groups
// ---------------------------------------------------------------------------

function validationGroups(
  presentation: ProjectPresentation,
  registry: ReferenceRegistry,
  planPath: string,
  required: string[],
): ManualCheckGroup[] {
  if (required.length === 0) return [];
  const wanted = new Set(required);
  const prefix = planPrefix(planPath);
  const groups: ManualCheckGroup[] = [];
  for (const artifact of siblings(presentation, directoryOf(planPath), 'validation')) {
    const validation = isRecord(artifact.structured) ? artifact.structured.validation : null;
    const manual = isRecord(validation) && isRecord(validation.manual) ? validation.manual : null;
    if (manual === null || !Array.isArray(manual.rows)) continue;
    const items: ManualCheckItem[] = [];
    for (const row of manual.rows) {
      if (items.length >= MAX_ITEMS) break;
      if (!isRecord(row)) continue;
      const ids = Array.isArray(row.requirements)
        ? row.requirements.filter((id): id is string => typeof id === 'string' && id.trim() !== '')
        : [];
      if (!ids.some((id) => wanted.has(normalizeId(id)))) continue;
      const behavior = typeof row.behavior === 'string' ? row.behavior : '';
      const how = typeof row.how === 'string' ? row.how : '';
      if (namesOnlyOtherPlans([behavior, how], prefix)) continue;
      const why = stringOf(row.why);
      items.push({ title: behavior, blocks: parseBlocks(how), note: why, requirements: ids.map((id) => id.trim()) });
    }
    if (items.length === 0) continue;
    const heading = stringOf(manual.heading) ?? 'Manual-Only Verifications';
    groups.push({
      key: 'validation',
      label: "Manual checks for this plan's requirements",
      source: sectionSource(registry, artifact.path, heading),
      lead: null,
      items,
      links: [],
    });
  }
  return groups;
}

function uiSpecGroups(
  presentation: ProjectPresentation,
  registry: ReferenceRegistry,
  planPath: string,
): ManualCheckGroup[] {
  const groups: ManualCheckGroup[] = [];
  for (const artifact of siblings(presentation, directoryOf(planPath), 'ui-spec')) {
    const spec = isRecord(artifact.structured) ? artifact.structured.uiSpec : null;
    const considerations = isRecord(spec) && isRecord(spec.considerations) ? spec.considerations : null;
    if (considerations === null || !Array.isArray(considerations.elements)) continue;
    const items: ManualCheckItem[] = [];
    for (const element of considerations.elements) {
      if (!isRecord(element) || !Array.isArray(element.rows)) continue;
      for (const row of element.rows) {
        if (items.length >= MAX_ITEMS) break;
        if (!isRecord(row) || row.status !== 'backstop') continue;
        const label = stringOf(row.label);
        if (label === null) continue;
        const target = stringOf(row.target);
        const code = stringOf(element.code);
        const name = stringOf(element.name);
        const where = target ?? [code, name].filter((part): part is string => part !== null).join(' ');
        const note = typeof row.note === 'string' ? row.note : '';
        items.push({
          title: where === '' ? capitalize(label) : `${capitalize(label)} · ${where}`,
          blocks: parseBlocks(note),
          note: null,
          requirements: [],
        });
      }
    }
    if (items.length === 0) continue;
    groups.push({
      key: 'ui-spec',
      label: 'Screen states to check by hand',
      source: sectionSource(registry, artifact.path, 'UI Considerations'),
      lead: null,
      items,
      links: [],
    });
  }
  return groups;
}

function uatGroup(
  presentation: ProjectPresentation,
  registry: ReferenceRegistry,
  planPath: string,
): ManualCheckGroup | null {
  const artifact = siblings(presentation, directoryOf(planPath), 'uat')[0];
  if (!artifact) return null;
  const source = artifactReference(registry, artifact.path, fileNameOf(artifact.path));
  if (source.url === null) return null;
  return { key: 'uat', label: 'Phase checklist', source, lead: UAT_LEAD, items: [], links: [] };
}

function readFirstGroup(registry: ReferenceRegistry, planPath: string, task: Record<string, unknown>): ManualCheckGroup | null {
  if (!Array.isArray(task.readFirst)) return null;
  const directory = directoryOf(planPath);
  const links: ManualCheckReference[] = [];
  const seen = new Set<string>();
  for (const entry of task.readFirst) {
    if (links.length >= MAX_ITEMS) break;
    if (typeof entry !== 'string' || entry.trim() === '') continue;
    const name = entry.trim();
    let preview = resolveArtifactReference(registry, name);
    if (preview === null && !name.includes('/')) preview = resolveArtifactReference(registry, `${directory}/${name}`);
    if (preview === null || preview.identity === planPath || seen.has(preview.url)) continue;
    seen.add(preview.url);
    links.push({ text: fileNameOf(preview.identity), title: preview.identity, url: preview.url });
  }
  return links.length === 0 ? null : { key: 'read-first', label: 'Read first', source: null, lead: null, items: [], links };
}

// ---------------------------------------------------------------------------
// buildPlanManualChecks
// ---------------------------------------------------------------------------

function countOf(groups: ManualCheckGroup[]): number {
  return groups.reduce((sum, group) => sum + group.items.length, 0);
}

export function buildPlanManualChecks(
  presentation: ProjectPresentation,
  registry: ReferenceRegistry,
  artifactPath: string,
): PlanManualChecks | null {
  try {
    const artifacts = Array.isArray(presentation?.artifacts) ? presentation.artifacts : [];
    const artifact = artifacts.find((candidate) => candidate.path === artifactPath && candidate.kind === 'plan');
    if (!artifact || !isRecord(artifact.structured) || !isRecord(artifact.structured.plan)) return null;
    const tasks = artifact.structured.plan.tasks;
    if (!Array.isArray(tasks)) return null;

    const required = planRequirements(artifact.frontmatter);
    const planLevel: ManualCheckGroup[] = [
      ...validationGroups(presentation, registry, artifactPath, required),
      ...uiSpecGroups(presentation, registry, artifactPath),
    ];
    const uat = uatGroup(presentation, registry, artifactPath);
    if (uat !== null) planLevel.push(uat);

    const entries: TaskManualChecks[] = [];
    let taskItemsTotal = 0;
    tasks.forEach((task, index) => {
      if (!isRecord(task) || typeof task.type !== 'string') return;
      const humanVerify = task.type === 'checkpoint:human-verify';
      if (!humanVerify && humanChecks(task).length === 0) return;
      const n = typeof task.n === 'number' && Number.isFinite(task.n) ? task.n : index + 1;
      const groups: ManualCheckGroup[] = [];
      const items = taskItems(task, humanVerify);
      if (items.length > 0) {
        groups.push({
          key: 'task',
          label: 'From this task',
          source: { text: `${fileNameOf(artifactPath)} · Task ${n}`, title: artifactPath, url: null },
          lead: null,
          items,
          links: [],
        });
      }
      const readFirst = readFirstGroup(registry, artifactPath, task);
      if (readFirst !== null) groups.push(readFirst);
      groups.push(...planLevel);
      if (groups.length === 0) return;
      taskItemsTotal += items.length;
      entries.push({ n, count: countOf(groups), groups });
    });
    if (entries.length === 0) return null;
    return { total: taskItemsTotal + countOf(planLevel), tasks: entries };
  } catch {
    return null;
  }
}

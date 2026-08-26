const RECOGNIZED_TAGS = new Set([
  'objective',
  'context',
  'decision',
  'tasks',
  'task',
  'name',
  'files',
  'action',
  'behavior',
  'implementation',
  'verify',
  'done',
  'what-built',
  'how-to-verify',
  'resume-signal',
  'verification',
  'success_criteria',
  'output',
]);
const ALLOWED_ATTRIBUTES = new Set(['type', 'gate', 'tdd']);
const MAX_ATTRIBUTE_SOURCE_LENGTH = 2_048;
const MAX_ATTRIBUTES = 16;

export interface PlanSegment {
  tag: string;
  attributes: Record<string, string>;
  body: string;
  raw: string;
  start: number;
  end: number;
  contentStart: number;
  contentEnd: number;
  malformed: boolean;
  warning: string | null;
}

export interface PlanCheckpoint {
  index: number;
  name: string;
  type: string;
  gate: string | null;
  attributes: Record<string, string>;
  body: string;
}

interface OpenTag {
  tag: string;
  attributes: Record<string, string>;
  start: number;
  contentStart: number;
}

function parseAttributes(source: string): Record<string, string> {
  if (source.length > MAX_ATTRIBUTE_SOURCE_LENGTH) return {};
  const attributes: Record<string, string> = {};
  const pattern = /([A-Za-z][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  let count = 0;
  while ((match = pattern.exec(source)) !== null && count < MAX_ATTRIBUTES) {
    const name = match[1].toLowerCase();
    if (ALLOWED_ATTRIBUTES.has(name)) attributes[name] = match[2] ?? match[3] ?? '';
    count += 1;
  }
  return attributes;
}

function malformedSegment(body: string, open: OpenTag, end: number, warning: string): PlanSegment {
  return {
    tag: open.tag,
    attributes: open.attributes,
    body: body.slice(open.contentStart, end),
    raw: body.slice(open.start, end),
    start: open.start,
    end,
    contentStart: open.contentStart,
    contentEnd: end,
    malformed: true,
    warning,
  };
}

/**
 * Scans the bounded GSD PLAN wrapper grammar in one pass. Recognized tags inside fenced code are
 * ordinary Markdown, and a damaged wrapper becomes a local malformed segment rather than aborting
 * later valid siblings.
 */
export function segmentPlanBody(body: string): PlanSegment[] {
  const segments: PlanSegment[] = [];
  const stack: OpenTag[] = [];
  const lines = body.split(/(?<=\n)/);
  let offset = 0;
  let fence: string | null = null;

  for (const line of lines) {
    const trimmed = line.trimStart();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      offset += line.length;
      continue;
    }
    if (fence !== null) {
      offset += line.length;
      continue;
    }

    const tagPattern = /<(\/)?([A-Za-z][\w-]*)([^>]*)>/g;
    let match: RegExpExecArray | null;
    while ((match = tagPattern.exec(line)) !== null) {
      const closing = match[1] === '/';
      const tag = match[2].toLowerCase();
      if (!RECOGNIZED_TAGS.has(tag)) continue;
      const start = offset + match.index;
      const tokenEnd = start + match[0].length;

      if (!closing) {
        stack.push({ tag, attributes: parseAttributes(match[3]), start, contentStart: tokenEnd });
        continue;
      }

      let matchingIndex = -1;
      for (let index = stack.length - 1; index >= 0; index -= 1) {
        if (stack[index].tag === tag) {
          matchingIndex = index;
          break;
        }
      }
      if (matchingIndex < 0) {
        segments.push({
          tag,
          attributes: {},
          body: '',
          raw: match[0],
          start,
          end: tokenEnd,
          contentStart: start,
          contentEnd: tokenEnd,
          malformed: true,
          warning: `Closing </${tag}> has no matching opening tag`,
        });
        continue;
      }

      while (stack.length - 1 > matchingIndex) {
        const unmatched = stack.pop();
        if (unmatched) {
          segments.push(
            malformedSegment(
              body,
              unmatched,
              start,
              `<${unmatched.tag}> was not closed before </${tag}>`,
            ),
          );
        }
      }
      const open = stack.pop();
      if (!open) continue;
      segments.push({
        tag,
        attributes: open.attributes,
        body: body.slice(open.contentStart, start),
        raw: body.slice(open.start, tokenEnd),
        start: open.start,
        end: tokenEnd,
        contentStart: open.contentStart,
        contentEnd: start,
        malformed: false,
        warning: null,
      });
    }
    offset += line.length;
  }

  while (stack.length > 0) {
    const open = stack.pop();
    if (open) segments.push(malformedSegment(body, open, body.length, `<${open.tag}> is unclosed`));
  }
  return segments.sort((left, right) => left.start - right.start || right.end - left.end);
}

function checkpointName(task: PlanSegment, segments: PlanSegment[], fallbackIndex: number): string {
  const name = segments.find(
    (segment) =>
      !segment.malformed &&
      segment.tag === 'name' &&
      segment.start >= task.contentStart &&
      segment.end <= task.contentEnd,
  );
  const value = name?.body.trim();
  return value ? value : `Checkpoint ${fallbackIndex + 1}`;
}

export function projectPlanCheckpoints(body: string): PlanCheckpoint[] {
  const segments = segmentPlanBody(body);
  const tasks = segments.filter(
    (segment) =>
      !segment.malformed &&
      segment.tag === 'task' &&
      segment.attributes.type?.trim().toLowerCase().startsWith('checkpoint:'),
  );
  return tasks.map((task, index) => ({
    index,
    name: checkpointName(task, segments, index),
    type: task.attributes.type.trim().toLowerCase(),
    gate: task.attributes.gate?.trim().toLowerCase() || null,
    attributes: { ...task.attributes },
    body: task.body,
  }));
}

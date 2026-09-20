// The view registry itself: `kind` -> `ViewManifest`. Only `discussion-log` is registered in this
// plan (Plan 05-03 adds `review`; later plans add the rest) — an `artifact.kind` with no entry
// here is VIEW-01's "empty" case: `resolveView` returns `null` and `artifact-page.tsx` falls back
// to the existing source reader with no toggle.
import type { DiscussionTopic } from '../../planning-repo/handlers/section-projection.ts';
import { factsBlock } from './facts.ts';
import { planTaskIndexBlock } from './plan-task-index.ts';
import type { ViewKind } from './kinds.ts';
import type { PromotedBlock, ViewManifest } from './manifest.ts';

/**
 * `select` and `consumes` run back to back, synchronously, within the same `composeView` call
 * (never interleaved with another request — `composeView` has no `await` in it), so capturing the
 * just-selected topics list in a closure variable is safe: `consumes` needs `structured.topics` to
 * decide which document-section groups the promoted questions already account for, but the
 * `PromotedBlock['consumes']` signature only receives `(group, selected)` — `selected` here is the
 * promoted *questions* array, not the topics list `consumes` actually needs.
 */
function discussionQuestionsBlock(): PromotedBlock {
  let topics: DiscussionTopic[] = [];
  return {
    type: 'data',
    id: 'questions',
    label: 'Questions and choices',
    component: 'discussion-questions',
    select: (input) => {
      const rawTopics = input.structured.topics;
      topics = Array.isArray(rawTopics) ? (rawTopics as DiscussionTopic[]) : [];
      const questions = input.structured.questions;
      return Array.isArray(questions) && questions.length > 0 ? questions : null;
    },
    // A topic with any unresolved question stays whole in the remainder so it is still reachable
    // (D-02) — only a topic whose every question resolved is fully accounted for by the promoted
    // block above.
    consumes: (group) =>
      topics.some(
        (topic) =>
          topic.heading.trim().toLowerCase() === (group.heading ?? '').trim().toLowerCase() &&
          topic.resolvedCount > 0 &&
          topic.resolvedCount === topic.questionCount,
      ),
  };
}

/** VIEW-03's leading block: promotes `human_verification[]` straight off `artifact.frontmatter`
 * — no handler work needed (the array is already on the wire). A non-array value (this repo's
 * `01-VERIFICATION.md` carries the string `resolved`) or an empty array both yield `null`, so
 * `composeView` skips the block entirely (D-06). */
function humanVerificationBlock(): PromotedBlock {
  return {
    type: 'data',
    id: 'human-verification',
    label: 'Needs human verification',
    component: 'verification-checks',
    select: (input) => {
      const raw = input.frontmatter.human_verification;
      return Array.isArray(raw) && raw.length > 0 ? raw : null;
    },
  };
}

export const VIEW_MANIFESTS: Readonly<Partial<Record<ViewKind, ViewManifest>>> = Object.freeze({
  'discussion-log': {
    kind: 'discussion-log',
    lead: 'Each question, the options that were on the table, and which one was chosen.',
    promote: [discussionQuestionsBlock()],
  },
  verification: {
    kind: 'verification',
    lead: 'What still needs a human to check, first — then everything already confirmed.',
    promote: [
      humanVerificationBlock(),
      factsBlock('verdict', 'Verdict', [
        'status',
        'score',
        'verified',
        'behavior_unverified',
        'overrides_applied',
      ]),
      { type: 'section', heading: /^gaps summary/i },
      { type: 'section', heading: /^goal achievement/i },
      { type: 'section', heading: /^requirements coverage/i },
      { type: 'section', heading: /^human verification/i },
    ],
  },
  plan: {
    kind: 'plan',
    lead: 'The task structure this plan commits to, in order, and which sections gate.',
    promote: [
      planTaskIndexBlock,
      { type: 'section', heading: 'Objective' },
      factsBlock('plan-facts', 'Plan facts', [
        'wave',
        'depends_on',
        'requirements',
        'autonomous',
        'type',
      ]),
    ],
  },
});

export function resolveView(kind: string): ViewManifest | null {
  return (VIEW_MANIFESTS as Record<string, ViewManifest | undefined>)[kind] ?? null;
}

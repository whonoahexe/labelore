// The view registry itself: `kind` -> `ViewManifest`. Only `discussion-log` is registered in this
// plan (Plan 05-03 adds `review`; later plans add the rest) — an `artifact.kind` with no entry
// here is VIEW-01's "empty" case: `resolveView` returns `null` and `artifact-page.tsx` falls back
// to the existing source reader with no toggle.
import type { DiscussionTopic } from '../../planning-repo/handlers/section-projection.ts';
import { factsBlock } from './facts.ts';
import { planTaskIndexBlock } from './plan-task-index.ts';
import { fallbackManifest } from './fallback.ts';
import { discussionLogLayout } from './layout-discussion-log.ts';
import { planLayout } from './layout-plan.ts';
import { verificationLayout } from './layout-verification.ts';
import type { ViewKind } from './kinds.ts';
import type { PromotedBlock, ViewInput, ViewManifest } from './manifest.ts';
import { composeContextBrief } from './context-brief.ts';

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
    layout: discussionLogLayout,
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
    layout: verificationLayout,
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
    layout: planLayout,
  },
  summary: {
    kind: 'summary',
    lead: 'What shipped, against what the plan committed to.',
    promote: [
      { type: 'section', heading: /^accomplishments/i },
      { type: 'section', heading: /^decisions made/i },
      { type: 'section', heading: /^deviations from plan/i },
      { type: 'section', heading: /^issues encountered/i },
      factsBlock('recorded', 'Recorded outcome', [
        'requirements-completed',
        'key-decisions',
        'patterns-established',
        'subsystem',
        'tags',
      ]),
      { type: 'section', heading: /^next phase readiness/i },
    ],
  },
  review: {
    kind: 'review',
    lead: 'Findings from cross-AI review, by severity.',
    promote: [
      { type: 'section', heading: /^summary$/i },
      { type: 'section', heading: /^critical issues/i },
      { type: 'section', heading: /^warnings/i },
      { type: 'section', heading: /^info$/i },
      factsBlock('review-facts', 'Review facts', ['depth', 'files_reviewed', 'reviewed']),
    ],
  },
  'milestone-audit': {
    kind: 'milestone-audit',
    lead: "Whether the milestone's own intent — not just its checklist — was met.",
    promote: [
      { type: 'section', heading: /^verdict/i },
      factsBlock('audit', 'Audit', ['status', 'audited', 'scores', 'gaps']),
      { type: 'section', heading: /^findings/i },
      { type: 'section', heading: /^scope check/i },
      { type: 'section', heading: /^requirements coverage/i },
      { type: 'section', heading: /^tech debt/i },
    ],
  },
  research: {
    kind: 'research',
    lead: 'The stack, patterns and pitfalls this phase was planned against.',
    promote: [
      { type: 'section', heading: /^summary$/i },
      { type: 'section', heading: /^standard stack/i },
      { type: 'section', heading: /^architecture patterns/i },
      { type: 'section', heading: /^don.t hand-roll/i },
      { type: 'section', heading: /^common pitfalls/i },
      { type: 'section', heading: /^open questions/i },
    ],
  },
  patterns: {
    kind: 'patterns',
    // UI-SPEC's own sentence for `patterns`, kept verbatim even though PATTERNS.md is the
    // analog map, not decisions/lessons/surprises — spec copy is never rewritten here.
    lead: 'Decisions, lessons and surprises carried out of this phase.',
    promote: [
      { type: 'section', heading: /^file classification/i },
      { type: 'section', heading: /^pattern assignments/i },
      { type: 'section', heading: /^shared patterns/i },
      { type: 'section', heading: /^no analog found/i },
    ],
  },
  'ui-spec': {
    kind: 'ui-spec',
    lead: "The design contract this phase's views were built against.",
    promote: [
      { type: 'section', heading: /^new component specifications/i },
      { type: 'section', heading: /^copywriting contract/i },
      { type: 'section', heading: /^existing shared vocabulary/i },
      { type: 'section', heading: /^ui considerations/i },
      { type: 'section', heading: /^design system/i },
    ],
  },
  uat: {
    kind: 'uat',
    lead: 'The acceptance checks a human walked through, and what they found.',
    promote: [
      factsBlock('uat-facts', 'Session', ['status', 'started', 'updated']),
      { type: 'section', heading: /^summary$/i },
      { type: 'section', heading: /^gaps/i },
      { type: 'section', heading: /^tests$/i },
      { type: 'section', heading: /^current test/i },
    ],
  },
  validation: {
    kind: 'validation',
    lead: "Where this phase's plan met the verification bar, and where it fell short.",
    promote: [
      factsBlock('validation-facts', 'Status', ['status', 'nyquist_compliant', 'wave_0_complete']),
      { type: 'section', heading: /^per-task verification map/i },
      { type: 'section', heading: /^manual-only verifications/i },
      { type: 'section', heading: /^wave 0 requirements/i },
      { type: 'section', heading: /^validation sign-off/i },
    ],
  },
  security: {
    kind: 'security',
    lead: 'Threats considered for this phase, and how each was mitigated.',
    promote: [
      factsBlock('security-facts', 'Status', ['status', 'threats_open', 'asvs_level']),
      { type: 'section', heading: /^threat register/i },
      { type: 'section', heading: /^trust boundaries/i },
      { type: 'section', heading: /^accepted risks/i },
      { type: 'section', heading: /^sign-off/i },
    ],
  },
  'ui-review': {
    kind: 'ui-review',
    lead: 'A retroactive visual audit against the written design contract.',
    promote: [
      factsBlock('ui-review-facts', 'Score', [
        'status',
        'score',
        'max_score',
        'needs_human_review',
      ]),
      { type: 'section', heading: /^top 3 priority fixes/i },
      { type: 'section', heading: /^pillar scores/i },
      { type: 'section', heading: /^detailed findings/i },
      { type: 'section', heading: /^summary$/i },
    ],
  },
  coverage: {
    kind: 'coverage',
    lead: "Which edges and cases this phase's plan actually accounted for.",
    // A degenerate COVERAGE.md with no `##` sections at all composes to zero blocks — the page
    // falls back to the full document with the toggle hidden (documented VIEW-01 empty rule).
    promote: [
      { type: 'section', heading: /coverage/i, all: true },
      { type: 'section', heading: /^decisions?/i },
    ],
  },
  learnings: {
    kind: 'learnings',
    lead: "What this phase taught that the next one shouldn't have to re-learn.",
    promote: [
      { type: 'section', heading: /^decisions$/i },
      { type: 'section', heading: /^lessons$/i },
      { type: 'section', heading: /^patterns$/i },
      { type: 'section', heading: /^surprises$/i },
      factsBlock('counts', 'Counts', ['counts']),
    ],
  },
  context: {
    kind: 'context',
    lead: 'The decisions locked in before this phase was planned, and what was left open.',
    // quick-260923-lju (sketch-006 D1): the CONTEXT brief layout — `promote` below stays as the
    // fallback path for a server that predates `structured.brief` (C-1); `brief` is what the page
    // actually renders when it composes.
    promote: [
      { type: 'section', heading: /^implementation decisions/i },
      { type: 'section', heading: /^(phase|task) boundary/i },
      { type: 'section', heading: /^specific ideas/i },
      { type: 'section', heading: /^deferred ideas/i },
      { type: 'section', heading: /^existing code insights/i },
      // Canonical References is intentionally not promoted here — it falls to the D-02 remainder.
    ],
    brief: composeContextBrief,
  },
  'review-fix': {
    kind: 'review-fix',
    lead: 'Which review findings were fixed, which were skipped, and why.',
    promote: [
      factsBlock('fix-facts', 'Fix run', [
        'status',
        'fixed',
        'skipped',
        'findings_in_scope',
        'iteration',
      ]),
      { type: 'section', heading: /^fixed issues/i },
      { type: 'section', heading: /^skipped issues/i },
      { type: 'section', heading: /^deferred/i },
    ],
  },
  findings: {
    kind: 'findings',
    lead: 'What the debug session found, and what it ruled out.',
    promote: [
      { type: 'section', heading: /^f\d+\b/i, all: true },
      { type: 'section', heading: /^regression floor/i },
      { type: 'section', heading: /^not a defect/i },
    ],
  },
});

/** Registered lookup only — VIEW-01's original "empty" case, kept for the registry-completeness
 * test in 05-06. `recognized: false` means `manifest` is `null`, never a synthesized fallback;
 * `resolveViewFor` below is what a page actually renders against. */
export function resolveView(kind: string): { manifest: ViewManifest | null; recognized: boolean } {
  const manifest = (VIEW_MANIFESTS as Record<string, ViewManifest | undefined>)[kind];
  return manifest ? { manifest, recognized: true } : { manifest: null, recognized: false };
}

/** VIEW-06: the registered manifest when one exists, otherwise `fallback.ts`'s synthesized
 * structural-read manifest — so `ArtifactPage` has exactly one dispatch path and a manifest is
 * always available to `composeView`. */
export function resolveViewFor(
  kind: string,
  input: ViewInput,
): { manifest: ViewManifest; recognized: boolean } {
  const resolved = resolveView(kind);
  if (resolved.manifest) {
    return { manifest: resolved.manifest, recognized: true };
  }
  return { manifest: fallbackManifest(kind, input), recognized: false };
}

// The view registry itself: `kind` -> `ViewManifest`. Only `discussion-log` is registered in this
// plan (Plan 05-03 adds `review`; later plans add the rest) — an `artifact.kind` with no entry
// here is VIEW-01's "empty" case: `resolveView` returns `null` and `artifact-page.tsx` falls back
// to the existing source reader with no toggle.
import type { DiscussionTopic } from '../../planning-repo/handlers/section-projection.ts';
import { DESIGNED_ELSEWHERE_KINDS, designedElsewhereLead } from '../../presentation/root-redirects.ts';
import { factsBlock } from './facts.ts';
import { planTaskIndexBlock } from './plan-task-index.ts';
import { fallbackManifest } from './fallback.ts';
import { discussionLogLayout } from './layout-discussion-log.ts';
import { planLayout } from './layout-plan.ts';
import { verificationLayout } from './layout-verification.ts';
import { viewKindOf } from './kinds.ts';
import type { ViewKind } from './kinds.ts';
import type { PromotedBlock, ViewInput, ViewManifest } from './manifest.ts';
import { composeSecurityConsole } from './security-console.ts';
import { composeLearningsRetro } from './learnings-retro.ts';
import { composeDebugCase } from './debug-case.ts';
import { composeTodoLifecycle } from './todo-lifecycle.ts';
import { composeNotePage } from './note-page.ts';
import { composeProjectPage } from './project-page.ts';
import { composeWindowsLedger } from './windows-ledger.ts';
import { composeMilestoneAudit } from './milestone-audit.ts';
import { composeCoverage } from './coverage-matrix.ts';
import { composeSpec } from './spec-page.ts';
import { composeAiSpec } from './ai-spec-page.ts';
import { composeUserSetup } from './user-setup-page.ts';
import { composeEvalReview } from './eval-review-page.ts';
import { composeDomVerify } from './dom-verify-page.ts';
import { composeReviews } from './reviews-page.ts';
import { composeCodebase } from './codebase-page.ts';
import { composePause } from './pause-page.ts';
import { composePlanNavigator } from './plan-navigator.ts';
import { composeContextBrief } from './context-brief.ts';
import { composeResearchBriefing } from './research-briefing.ts';
import { composePatternMap } from './pattern-map.ts';
import { composeValidationStrategy } from './validation-strategy.ts';
import { composeSummaryRun } from './summary-run.ts';
import { composeVerificationBoard } from './verification-board.ts';
import { composeUiReview } from './ui-review.ts';
import { composeReviewThreads } from './review-threads.ts';
import { composeReviewLedger } from './review-ledger.ts';
import { composeUiSpec } from './ui-spec.ts';
import { composeUatSession } from './uat-session.ts';

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
    verificationBoard: composeVerificationBoard,
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
    planNavigator: composePlanNavigator,
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
    summaryRun: composeSummaryRun,
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
    reviewThreads: composeReviewThreads,
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
    // The audit page is the View-mode render path; `promote` above is the fallback when it composes
    // nothing (Phase 9, 09-14).
    milestoneAudit: composeMilestoneAudit,
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
    briefing: composeResearchBriefing,
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
    patternMap: composePatternMap,
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
    uiSpec: composeUiSpec,
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
    uatSession: composeUatSession,
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
    validationStrategy: composeValidationStrategy,
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
    securityConsole: composeSecurityConsole,
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
    uiReview: composeUiReview,
  },
  coverage: {
    kind: 'coverage',
    lead: 'Which capabilities of an external API this phase integrates, and which it opts out of.',
    // A degenerate COVERAGE.md with no `##` sections at all composes to zero blocks — the page
    // falls back to the full document with the toggle hidden (documented VIEW-01 empty rule).
    promote: [
      { type: 'section', heading: /coverage/i, all: true },
      { type: 'section', heading: /^decisions?/i },
    ],
    // The coverage page is the View-mode render path; `promote` above is the fallback when it composes
    // nothing (Phase 9, 09-15).
    coverageMatrix: composeCoverage,
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
    // quick-261017-k45 (sketch-024 E): the retrospective page; `promote` above is the fallback.
    learningsRetro: composeLearningsRetro,
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
    reviewLedger: composeReviewLedger,
  },
  'review-disposition': {
    kind: 'review-disposition',
    lead: 'What became of each review finding, and why.',
    // The disposition table is the page: a file with no facts and no such section composes to zero
    // blocks and shows the full document with the toggle hidden (the VIEW-01 empty rule). From 09-13 the
    // ledger's Disposition tab is what the page renders when the file has rows; `promote` is the fallback.
    promote: [
      factsBlock('disposition-facts', 'Disposition', ['open', 'total']),
      { type: 'section', heading: /disposition|findings/i, all: true },
    ],
    reviewLedger: composeReviewLedger,
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
  debug: {
    kind: 'debug',
    lead: 'Where the investigation stands, what it ruled out, and what fixed it.',
    promote: [
      { type: 'section', heading: /^current focus/i },
      { type: 'section', heading: /^symptoms/i },
      { type: 'section', heading: /^eliminated/i },
      { type: 'section', heading: /evidence/i, all: true },
      { type: 'section', heading: /^resolution/i },
    ],
    // The case-file page is the View-mode render path; `promote` above is the fallback when it
    // composes nothing (quick-261018-j5h).
    debugCase: composeDebugCase,
  },
  todo: {
    kind: 'todo',
    lead: 'What the todo is, where it came from, and how it closed.',
    promote: [
      { type: 'section', heading: /^problem$/i },
      { type: 'section', heading: /^goal$/i },
      { type: 'section', heading: /^solution$/i },
      { type: 'section', heading: /^acceptance criteria$/i },
      { type: 'section', heading: /^resolution$/i },
    ],
    // The lifecycle page is the View-mode render path; `promote` above is the fallback when it composes
    // nothing (quick-261023-61k).
    todoLifecycle: composeTodoLifecycle,
  },
  note: {
    kind: 'note',
    lead: 'What the note says, and the todo it became.',
    // An explore note's headed sections, the fallback when the annotated page composes nothing.
    promote: [{ type: 'section', heading: /\S/, all: true }],
    // The annotated page is the View-mode render path; `promote` above is the fallback when it composes
    // nothing (quick-261023-61l).
    notePage: composeNotePage,
  },
  project: {
    kind: 'project',
    lead: 'What the project is, what it values, and the decisions that shaped it.',
    // The sections the charter page draws from, the fallback when the page composes nothing.
    promote: [
      { type: 'section', heading: /^what this is\b/i },
      { type: 'section', heading: /^core value\b/i },
      { type: 'section', heading: /^key decisions\b/i },
    ],
    // The charter page is the View-mode render path; `promote` above is the fallback when it composes
    // nothing (Phase 9, 09-07, sketch-041 B).
    projectPage: composeProjectPage,
  },
  windows: {
    kind: 'windows',
    lead: 'Defects deferred, waived or not yet checked, across every phase.',
    // The headed sections of the file, the fallback when the ledger page composes nothing.
    promote: [{ type: 'section', heading: /\S/, all: true }],
    // The ledger page is the View-mode render path; `promote` above is the fallback when it composes
    // nothing (Phase 9, 09-10).
    windowsLedger: composeWindowsLedger,
  },
  // Phase 10 (10-08, sketch-042 winner A): one view for the seven codebase-map documents, reached through
  // `viewKindOf`. `promote` is the silent fallback when the page composes nothing (RESEARCH C1).
  codebase: {
    kind: 'codebase',
    lead: 'The seven codebase-map documents on one page, a panel each, with what the map says first.',
    promote: [{ type: 'section', heading: /\S/, all: true }],
    codebasePage: composeCodebase,
  },
  // Phase 10 (10-08): the six specification and check kinds are registered here with a lead and the promoted
  // sections as their fallback; each page plan (10-16 to 10-22) adds only its composer field.
  spec: {
    kind: 'spec',
    lead: 'Whether this phase is specified well enough to plan, and what each requirement asks for.',
    promote: [{ type: 'section', heading: /\S/, all: true }],
    // The Spec page is the View-mode render path; `promote` above is the silent fallback when it composes nothing
    // (Phase 10, 10-16, RESEARCH C1).
    specPage: composeSpec,
  },
  'ai-spec': {
    kind: 'ai-spec',
    lead: 'What kind of AI system this phase builds, how it will be evaluated, and which sections are still template slots.',
    promote: [{ type: 'section', heading: /\S/, all: true }],
    // The AI spec page is the View-mode render path; `promote` above is the silent fallback when it composes nothing
    // (Phase 10, 10-18, RESEARCH C1).
    aiSpecPage: composeAiSpec,
  },
  'user-setup': {
    kind: 'user-setup',
    lead: 'Which setup steps a person still has to do for this phase, and where each variable goes.',
    promote: [{ type: 'section', heading: /\S/, all: true }],
    // T-10-49: a USER-SETUP file can hold a pasted value, so its text never reaches View mode through the
    // generic fallback: the User setup page composes only from the handler's masked projection (10-19, D-11).
    withholdDocumentInView: true,
    userSetupPage: composeUserSetup,
  },
  'eval-review': {
    kind: 'eval-review',
    lead: "How far this phase's AI evaluation is built: its score and verdict, what each dimension covers, and what to fix first.",
    promote: [{ type: 'section', heading: /\S/, all: true }],
    // The Eval review page is the View-mode render path; `promote` above is the silent fallback when it composes
    // nothing (Phase 10, 10-20, RESEARCH C1).
    evalReviewPage: composeEvalReview,
  },
  'dom-verify': {
    kind: 'dom-verify',
    lead: 'What a browser check of this phase found: whether it could look, and what passed, failed or needs a person.',
    promote: [{ type: 'section', heading: /\S/, all: true }],
    // The Browser check page is the View-mode render path; `promote` above is the silent fallback when it composes
    // nothing (Phase 10, 10-21, RESEARCH C1).
    domVerifyPage: composeDomVerify,
  },
  reviews: {
    kind: 'reviews',
    lead: "What each AI reviewer said about this phase's plans, where they agreed and where they disagreed.",
    promote: [{ type: 'section', heading: /\S/, all: true }],
    // The Cross-AI reviews page is the View-mode render path; `promote` above is the silent fallback when it composes
    // nothing (Phase 10, 10-22, RESEARCH C1).
    reviewsPage: composeReviews,
  },
  // Phase 11 (11-10, sketch-054 winner C): one view for HANDOFF.json and every .continue-here.md, reached through
  // `viewKindOf`'s table. `promote` is the silent fallback when the page composes nothing (Phase 10 C1, X2).
  pause: {
    kind: 'pause',
    lead: 'Where paused work stopped, what blocks resuming it and the one next action, from the handoff files.',
    promote: [{ type: 'section', heading: /\S/, all: true }],
    pausePage: composePause,
  },
});

/** Phase 10 (10-08, T-10-49): whether View mode may show the document's own HTML for this manifest - through
 * its promoted sections or the whole-document fallback. False only for a manifest that sets
 * `withholdDocumentInView`; the page then shows the sanctioned empty note unless a composed model exists. */
export function documentHtmlAllowedInView(manifest: ViewManifest | null): boolean {
  return manifest?.withholdDocumentInView !== true;
}

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
  options?: { sourceEscape?: boolean },
): { manifest: ViewManifest; recognized: boolean } {
  // Phase 10 (RESEARCH C8): the seven codebase-* kinds share the one `codebase` manifest; Phase 11: handoff and
  // continue-here share the one `pause` manifest.
  const resolved = resolveView(viewKindOf(kind));
  if (resolved.manifest) {
    return { manifest: resolved.manifest, recognized: true };
  }
  // 09 D-01: a root document reached on its `?source=1` escape address is a deliberate raw-file read, so it
  // is recognised and leads with a plain sentence. Without the flag (an archived copy whose milestone has
  // no History block) it stays unrecognised and keeps its chip and notice (UI-SPEC section 6).
  if (options?.sourceEscape === true && DESIGNED_ELSEWHERE_KINDS.has(kind)) {
    const lead = designedElsewhereLead(kind);
    if (lead !== null) return { manifest: { ...fallbackManifest(kind, input), lead }, recognized: true };
  }
  return { manifest: fallbackManifest(kind, input), recognized: false };
}

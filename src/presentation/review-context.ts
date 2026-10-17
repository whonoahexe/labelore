// The REVIEW page's server-side join (quick-261017-k44, sketch 022 C): what a review needs from
// elsewhere in the cached presentation, built once per document request - the ROADMAP phase name
// for the review's phase, and the sibling REVIEW-FIX in the same directory (its path, in-app URL,
// fix-run frontmatter and parsed report) so every finding can show what the fix run did with it.
// Pure: it reads the cached `ProjectPresentation` and the reference registry, never a file, and
// imports nothing from Node. It uses no regular expression, only indexOf / slice / endsWith string
// operations, and never throws on presentation data. T-k44-05: the sibling path is the review's own
// presentation path with its "-REVIEW.md" suffix replaced and is matched exactly against presentation
// artifact paths; the REVIEW-FIX frontmatter's `review_path` (usually the pre-archive location) is
// ignored, and a URL exists only when `resolveArtifactReference` matched that path exactly.
import type { ReviewFixReportBody } from '../planning-repo/handlers/review-report.ts';
import type { ProjectPresentation } from '../server/project-presentation.ts';
import { resolveArtifactReference } from './references.ts';
import type { ReferenceRegistry } from './references.ts';

export interface ReviewFixContext {
  path: string;
  /** The in-app route of the REVIEW-FIX page, or null when the registry did not resolve it. */
  url: string | null;
  /** The fix-run frontmatter as written. */
  frontmatter: {
    status: unknown;
    fixed_at: unknown;
    iteration: unknown;
    findings_in_scope: unknown;
    fixed: unknown;
    skipped: unknown;
    fix_scope: unknown;
  };
  /** `structured.reviewFix` when the handler produced it, else null. */
  report: ReviewFixReportBody | null;
}

export interface ReviewContext {
  /** The ROADMAP phase name for the review's phase, or null (a quick-task review has none). */
  phaseName: string | null;
  fix: ReviewFixContext | null;
}

const REVIEW_SUFFIX = '-REVIEW.md';
const FIX_SUFFIX = '-REVIEW-FIX.md';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function phaseNameOf(presentation: ProjectPresentation, phaseKey: string | null): string | null {
  if (phaseKey === null) return null;
  const milestones = Array.isArray(presentation.milestones) ? presentation.milestones : [];
  for (const milestone of milestones) {
    const phases = Array.isArray(milestone?.phases) ? milestone.phases : [];
    for (const phase of phases) {
      if (phase?.key === phaseKey && typeof phase.name === 'string' && phase.name.trim() !== '') {
        return phase.name.trim();
      }
    }
  }
  return null;
}

export function buildReviewContext(
  presentation: ProjectPresentation,
  registry: ReferenceRegistry,
  reviewPath: string,
): ReviewContext {
  const empty: ReviewContext = { phaseName: null, fix: null };
  try {
    const artifacts = Array.isArray(presentation?.artifacts) ? presentation.artifacts : [];
    const review = artifacts.find((candidate) => candidate.path === reviewPath && candidate.kind === 'review');
    if (!review) return empty;
    const phaseName = phaseNameOf(presentation, review.phaseKey);
    if (!reviewPath.endsWith(REVIEW_SUFFIX)) return { phaseName, fix: null };
    const siblingPath = reviewPath.slice(0, reviewPath.length - REVIEW_SUFFIX.length) + FIX_SUFFIX;
    const sibling = artifacts.find((candidate) => candidate.path === siblingPath && candidate.kind === 'review-fix');
    if (!sibling) return { phaseName, fix: null };
    const fm = isRecord(sibling.frontmatter) ? sibling.frontmatter : {};
    const structured = isRecord(sibling.structured) ? sibling.structured : {};
    return {
      phaseName,
      fix: {
        path: sibling.path,
        url: resolveArtifactReference(registry, sibling.path)?.url ?? null,
        frontmatter: {
          status: fm.status ?? null,
          fixed_at: fm.fixed_at ?? null,
          iteration: fm.iteration ?? null,
          findings_in_scope: fm.findings_in_scope ?? null,
          fixed: fm.fixed ?? null,
          skipped: fm.skipped ?? null,
          fix_scope: fm.fix_scope ?? null,
        },
        report: isRecord(structured.reviewFix) ? (structured.reviewFix as unknown as ReviewFixReportBody) : null,
      },
    };
  } catch {
    return empty;
  }
}

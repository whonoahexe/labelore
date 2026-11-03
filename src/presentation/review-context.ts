// The REVIEW page's server-side join (quick-261017-k44, sketch 022 C): what a review needs from
// elsewhere in the cached presentation, built once per document request - the ROADMAP phase name
// for the review's phase, and the fix report(s) in the same directory (path, in-app URL, fix-run
// frontmatter and parsed report) so every finding can show what the fix run did with it. Since 09-12 the
// fix files come from the review ledger's member lookup (review-ledger.ts, by directory and kind): one fix
// file gives its own context, several give the first file's path, URL and frontmatter and one report whose
// entries and deferred bullets are every file's, in member order.
// Pure: it reads the cached `ProjectPresentation` and the reference registry, never a file, and
// imports nothing from Node. It uses no regular expression, only indexOf / slice string operations, and
// never throws on presentation data. T-k44-05: the fix files are matched by exact directory and by their
// position-derived kind; the REVIEW-FIX frontmatter's `review_path` (usually the pre-archive location) is
// ignored, and a URL exists only when `resolveArtifactReference` matched that path exactly.
import type { ReviewFixReportBody } from '../planning-repo/handlers/review-report.ts';
import type { ProjectPresentation } from '../server/project-presentation.ts';
import type { ReferenceRegistry } from './references.ts';
import { fixFrontmatterOf, fixReportOf, ledgerFixMembers } from './review-ledger.ts';

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
    const members = ledgerFixMembers(presentation, registry, reviewPath);
    const fixArtifacts = members
      .map((member) => ({ member, artifact: artifacts.find((candidate) => candidate.path === member.path) }))
      .filter((pair): pair is { member: (typeof members)[number]; artifact: (typeof artifacts)[number] } => pair.artifact !== undefined);
    if (fixArtifacts.length === 0) return { phaseName, fix: null };
    const first = fixArtifacts[0];
    const reports = fixArtifacts
      .map((pair) => fixReportOf(pair.artifact))
      .filter((report): report is ReviewFixReportBody => report !== null);
    let report: ReviewFixReportBody | null = reports[0] ?? null;
    if (reports.length > 1) {
      report = {
        ...reports[0],
        entries: reports.flatMap((candidate) => (Array.isArray(candidate.entries) ? candidate.entries : [])),
        deferred: reports.flatMap((candidate) => (Array.isArray(candidate.deferred) ? candidate.deferred : [])),
        sections: reports.flatMap((candidate) => (Array.isArray(candidate.sections) ? candidate.sections : [])),
      };
    }
    return {
      phaseName,
      fix: {
        path: first.member.path,
        url: first.member.url,
        frontmatter: fixFrontmatterOf(first.artifact),
        report,
      },
    };
  } catch {
    return empty;
  }
}

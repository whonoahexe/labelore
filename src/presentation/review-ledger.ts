// Phase 9 (09-12): the review ledger's server join. A phase (or quick-task) folder can hold a REVIEW, one
// or several REVIEW-FIX reports (a plain one, or one per shard: `03-REVIEW-FIX-backend.md`) and, from
// 09-13, a REVIEW-DISPOSITION. buildLedgerContext finds those files by directory and kind in the cached
// presentation and hands the page what it needs to draw them as one ledger: the member list (so the tab
// strip knows which tabs exist), the review's findings, every fix file's frontmatter and parsed report,
// and the head that totals findings by severity (D-07, D-09, D-11).
//
// Pure: it reads the cached `ProjectPresentation` and the reference registry, never a file, and imports
// nothing from Node. It uses no regular expression over text, only indexOf / slice string operations, and
// never throws on presentation data. T-09-23: a member is a review-family artifact in the exact same
// directory as the opened file, found by its position-derived kind; a member's URL exists only when
// `resolveArtifactReference` matched its path exactly. T-09-24: at most MAX_FIX_MEMBERS fix files join a
// ledger. The member set is the primary representation: the review page's single fix sibling (review-
// context.ts) is derived from `ledgerFixMembers`, not from a file-name swap, so opening any member of a
// ledger yields the same member set.
import type { DispositionRow } from '../planning-repo/handlers/review-disposition.ts';
import { severityOfId } from '../planning-repo/handlers/review-report.ts';
import type {
  ReviewFixReportBody,
  ReviewSeverity,
} from '../planning-repo/handlers/review-report.ts';
import { parseReviewFixName } from '../planning-repo/naming.ts';
import type { ProjectPresentation } from '../server/project-presentation.ts';
import { resolveArtifactReference } from './references.ts';
import type { ReferenceRegistry } from './references.ts';

/** The most fix files one ledger holds (T-09-24); the rest are not members. */
export const MAX_FIX_MEMBERS = 12;

export type LedgerTab = 'review' | 'disposition' | 'fix';

export interface LedgerMember {
  tab: LedgerTab;
  path: string;
  /** The in-app route of the file, or null when the registry did not resolve it. */
  url: string | null;
  /** A fix file's `<suffix>` as written in `NN-REVIEW-FIX-<suffix>.md`; null for the plain file and for a review. */
  suffix: string | null;
  fileName: string;
}

/** The fix-run frontmatter as written (the same shape the review page's fix context carries). */
export interface LedgerFixFrontmatter {
  status: unknown;
  fixed_at: unknown;
  iteration: unknown;
  findings_in_scope: unknown;
  fixed: unknown;
  skipped: unknown;
  fix_scope: unknown;
}

export interface LedgerFix {
  suffix: string | null;
  fileName: string;
  url: string | null;
  frontmatter: LedgerFixFrontmatter;
  /** `structured.reviewFix` when the handler produced it, else null. */
  report: ReviewFixReportBody | null;
}

export interface LedgerTabEntry {
  tab: LedgerTab;
  label: 'Review' | 'Disposition' | 'Fix';
  /** The tab's link: its (first) member's route; null when the registry did not resolve it. */
  url: string | null;
  /** The review's finding count, the disposition's row count, or the fix entries' distinct finding ids. */
  count: number;
}

/** The disposition file's rows exactly as the reader produced them (09-05), with the route of the file. */
export interface LedgerDisposition {
  url: string | null;
  rows: DispositionRow[];
  /** The `open` and `total` the frontmatter states; shown nowhere, never recomputed from. */
  stated: { open: number | null; total: number | null };
}

export interface LedgerReview {
  title: string;
  findings: { id: string; title: string; severity: ReviewSeverity }[];
  /** The REVIEW frontmatter's `findings.total` when it states one. */
  statedTotal: number | null;
}

export interface LedgerHeadSeverity {
  severity: ReviewSeverity;
  /** Null without a disposition; with one, the rows of this severity whose disposition is open (D-08). */
  open: number | null;
  total: number;
  fixed: number;
  ids: string[];
}

export interface LedgerHead {
  /** Null without a disposition; with one, the rows whose disposition is open (D-08). Never read from a fix file. */
  open: number | null;
  /** With a disposition, its row count; otherwise the review's findings (09-12). */
  total: number;
  bySeverity: LedgerHeadSeverity[];
  /** Distinct finding ids some fix entry (outcome fixed) names, across every fix file. */
  fixedInReport: number;
  /** Disposition rows that are open while a fix entry marks the id fixed: shown apart, never merged (D-08). */
  markedFixed: number;
}

/** A finding the disposition leaves open while a fix file marks it fixed: the commit the fix names, or null. */
export interface LedgerMark {
  commit: string | null;
}

export interface LedgerContext {
  members: LedgerMember[];
  tabs: LedgerTabEntry[];
  /** The opened member's tab. */
  active: LedgerTab;
  /** The opened member's fix suffix; null for a review or the plain fix file. */
  activeSuffix: string | null;
  review: LedgerReview | null;
  fixes: LedgerFix[];
  /** The severity of every finding id the review or a fix file names (token first, else the review's own). */
  severityById: Record<string, ReviewSeverity>;
  /** The disposition member's rows, or null when the folder holds no REVIEW-DISPOSITION. */
  disposition: LedgerDisposition | null;
  /** Every id some fix entry (outcome fixed) names, to the first such entry's first commit (full), or null. */
  fixedCommits: Record<string, string | null>;
  /** The stale-disposition marks, by finding id (D-08); empty without a disposition. */
  marks: Record<string, LedgerMark>;
  head: LedgerHead;
}

type PresentationArtifact = ProjectPresentation['artifacts'][number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function directoryOf(path: string): string {
  return path.slice(0, path.lastIndexOf('/') + 1);
}

function fileNameOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function suffixOf(fileName: string): string | null {
  const parsed = parseReviewFixName(fileName);
  return parsed.matched ? parsed.suffix : null;
}

function artifactsOf(presentation: ProjectPresentation): PresentationArtifact[] {
  return Array.isArray(presentation?.artifacts) ? presentation.artifacts : [];
}

function memberOf(
  registry: ReferenceRegistry,
  artifact: PresentationArtifact,
  tab: LedgerTab,
): LedgerMember {
  const fileName = fileNameOf(artifact.path);
  return {
    tab,
    path: artifact.path,
    url: resolveArtifactReference(registry, artifact.path)?.url ?? null,
    suffix: tab === 'fix' ? suffixOf(fileName) : null,
    fileName,
  };
}

function suffixOrder(member: LedgerMember): string {
  return member.suffix === null ? '' : member.suffix.toLowerCase();
}

/** The fix files in the same directory as `path`: the plain file first, then the suffixed ones by suffix. */
export function ledgerFixMembers(
  presentation: ProjectPresentation,
  registry: ReferenceRegistry,
  path: string,
): LedgerMember[] {
  try {
    const directory = directoryOf(path);
    const members = artifactsOf(presentation)
      .filter(
        (candidate) => candidate.kind === 'review-fix' && directoryOf(candidate.path) === directory,
      )
      .map((candidate) => memberOf(registry, candidate, 'fix'));
    members.sort((a, b) => {
      const bySuffix =
        suffixOrder(a) < suffixOrder(b) ? -1 : suffixOrder(a) > suffixOrder(b) ? 1 : 0;
      if (bySuffix !== 0) return bySuffix;
      return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
    });
    return members.slice(0, MAX_FIX_MEMBERS);
  } catch {
    return [];
  }
}

/** The fix-run frontmatter of a REVIEW-FIX artifact, each field as written or null. */
export function fixFrontmatterOf(artifact: { frontmatter: unknown }): LedgerFixFrontmatter {
  const fm = isRecord(artifact.frontmatter) ? artifact.frontmatter : {};
  return {
    status: fm.status ?? null,
    fixed_at: fm.fixed_at ?? null,
    iteration: fm.iteration ?? null,
    findings_in_scope: fm.findings_in_scope ?? null,
    fixed: fm.fixed ?? null,
    skipped: fm.skipped ?? null,
    fix_scope: fm.fix_scope ?? null,
  };
}

/** `structured.reviewFix` of a REVIEW-FIX artifact when the handler produced it, else null. */
export function fixReportOf(artifact: { structured: unknown }): ReviewFixReportBody | null {
  const structured = isRecord(artifact.structured) ? artifact.structured : {};
  return isRecord(structured.reviewFix)
    ? (structured.reviewFix as unknown as ReviewFixReportBody)
    : null;
}

function numberOf(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.floor(value);
  if (
    typeof value === 'string' &&
    value.trim() !== '' &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0
  ) {
    return Math.floor(Number(value));
  }
  return null;
}

function severityKey(value: unknown): ReviewSeverity {
  return value === 'critical' || value === 'warning' ? value : 'info';
}

function reviewOf(artifact: PresentationArtifact): LedgerReview {
  const structured = isRecord(artifact.structured) ? artifact.structured : {};
  const body = isRecord(structured.review) ? structured.review : {};
  const findings: LedgerReview['findings'] = [];
  const seen = new Set<string>();
  for (const raw of Array.isArray(body.findings) ? body.findings : []) {
    if (!isRecord(raw) || typeof raw.id !== 'string' || raw.id.trim() === '') continue;
    const id = raw.id.trim();
    if (seen.has(id)) continue;
    seen.add(id);
    findings.push({
      id,
      title: typeof raw.title === 'string' ? raw.title.trim() : '',
      severity: severityKey(raw.severity),
    });
  }
  const fm = isRecord(artifact.frontmatter) ? artifact.frontmatter : {};
  const stated = isRecord(fm.findings) ? numberOf(fm.findings.total) : null;
  return { title: artifact.title, findings, statedTotal: stated };
}

function dispositionOf(artifact: PresentationArtifact, url: string | null): LedgerDisposition {
  const structured = isRecord(artifact.structured) ? artifact.structured : {};
  const body = isRecord(structured.disposition) ? structured.disposition : {};
  const rows: DispositionRow[] = [];
  for (const raw of Array.isArray(body.rows) ? body.rows : []) {
    if (isRecord(raw) && typeof raw.id === 'string' && raw.id !== '')
      rows.push(raw as unknown as DispositionRow);
  }
  const stated = isRecord(body.stated) ? body.stated : {};
  return { url, rows, stated: { open: numberOf(stated.open), total: numberOf(stated.total) } };
}

/** The finding ids a fix report names, in order: its entries' ids, with those of outcome fixed marked. */
function entryIds(
  report: ReviewFixReportBody | null,
): { id: string; fixed: boolean; commit: string | null }[] {
  const out: { id: string; fixed: boolean; commit: string | null }[] = [];
  const entries = report !== null && Array.isArray(report.entries) ? report.entries : [];
  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    const ids = Array.isArray(entry.ids) ? entry.ids : [];
    for (const id of ids) {
      if (typeof id === 'string' && id !== '') {
        out.push({ id, fixed: entry.outcome === 'fixed', commit: commitOf(entry) });
      }
    }
  }
  return out;
}

/** The first commit a fix entry names, else null. */
function commitOf(entry: Record<string, unknown>): string | null {
  const commits = Array.isArray(entry.commits) ? entry.commits : [];
  const first = commits.find((commit) => typeof commit === 'string' && commit !== '');
  if (typeof first === 'string') return first;
  return typeof entry.commit === 'string' && entry.commit !== '' ? entry.commit : null;
}

function deferredIds(report: ReviewFixReportBody | null): string[] {
  const out: string[] = [];
  const deferred = report !== null && Array.isArray(report.deferred) ? report.deferred : [];
  for (const item of deferred) {
    if (!isRecord(item)) continue;
    for (const id of Array.isArray(item.ids) ? item.ids : [])
      if (typeof id === 'string' && id !== '') out.push(id);
  }
  return out;
}

/**
 * The ledger of the review-family file at `path`, or null when that file is not a REVIEW, REVIEW-FIX or
 * REVIEW-DISPOSITION. A folder with one review-family file gets a one-member context, which the
 * page draws as nothing (D-11); a fix-only folder builds from its fix members alone.
 */
export function buildLedgerContext(
  presentation: ProjectPresentation,
  registry: ReferenceRegistry,
  path: string,
): LedgerContext | null {
  try {
    const artifacts = artifactsOf(presentation);
    const opened = artifacts.find((candidate) => candidate.path === path);
    if (
      !opened ||
      (opened.kind !== 'review' &&
        opened.kind !== 'review-fix' &&
        opened.kind !== 'review-disposition')
    ) {
      return null;
    }

    const directory = directoryOf(path);
    const reviews = artifacts
      .filter(
        (candidate) => candidate.kind === 'review' && directoryOf(candidate.path) === directory,
      )
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    const reviewArtifact = reviews[0] ?? null;
    // A second REVIEW in one folder is not a ledger member: its page stays a lone review.
    if (opened.kind === 'review' && reviewArtifact !== null && reviewArtifact.path !== opened.path)
      return null;
    const dispositions = artifacts
      .filter(
        (candidate) =>
          candidate.kind === 'review-disposition' && directoryOf(candidate.path) === directory,
      )
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    const dispositionArtifact = dispositions[0] ?? null;
    // Likewise a second disposition in one folder stays a lone page of its own.
    if (
      opened.kind === 'review-disposition' &&
      dispositionArtifact !== null &&
      dispositionArtifact.path !== opened.path
    ) {
      return null;
    }

    const fixMembers = ledgerFixMembers(presentation, registry, path);
    const members: LedgerMember[] = [];
    if (reviewArtifact !== null) members.push(memberOf(registry, reviewArtifact, 'review'));
    const dispositionMember =
      dispositionArtifact !== null ? memberOf(registry, dispositionArtifact, 'disposition') : null;
    if (dispositionMember !== null) members.push(dispositionMember);
    members.push(...fixMembers);

    const fixes: LedgerFix[] = [];
    for (const member of fixMembers) {
      const artifact = artifacts.find((candidate) => candidate.path === member.path);
      if (!artifact) continue;
      fixes.push({
        suffix: member.suffix,
        fileName: member.fileName,
        url: member.url,
        frontmatter: fixFrontmatterOf(artifact),
        report: fixReportOf(artifact),
      });
    }

    const review = reviewArtifact !== null ? reviewOf(reviewArtifact) : null;

    // Every id a fix entry names, once; those with a fixed outcome in any fix file are "fixed".
    const fixEntryIds: string[] = [];
    const fixedIds = new Set<string>();
    const fixedCommits: Record<string, string | null> = {};
    const everyIdSeen = new Set<string>();
    for (const fix of fixes) {
      for (const { id, fixed, commit } of entryIds(fix.report)) {
        if (!everyIdSeen.has(id)) {
          everyIdSeen.add(id);
          fixEntryIds.push(id);
        }
        if (fixed) {
          fixedIds.add(id);
          if (!(id in fixedCommits)) fixedCommits[id] = commit;
        }
      }
    }
    const disposition =
      dispositionArtifact !== null
        ? dispositionOf(dispositionArtifact, dispositionMember?.url ?? null)
        : null;

    const severityById: Record<string, ReviewSeverity> = {};
    for (const finding of review?.findings ?? []) severityById[finding.id] = finding.severity;
    const everyFixId = [...fixEntryIds];
    for (const fix of fixes) for (const id of deferredIds(fix.report)) everyFixId.push(id);
    for (const id of everyFixId) {
      if (!(id in severityById)) severityById[id] = severityOfId(id) ?? 'info';
    }

    // Head precedence without a disposition: the review's parsed findings, else its frontmatter total,
    // else the distinct fix-entry ids.
    const reviewFindings = review?.findings ?? [];
    let total: number;
    let rows: { severity: ReviewSeverity; ids: string[]; open?: number }[];
    let openTotal: number | null = null;
    // D-08 (the user's resolution of research A1): with a disposition that has rows, it is the record of
    // what is open and of how many findings there are, never the review's own count.
    const dispositionRows = disposition?.rows ?? [];
    if (dispositionRows.length > 0) {
      total = dispositionRows.length;
      openTotal = dispositionRows.filter((row) => row.disposition === 'open').length;
      rows = (['critical', 'warning', 'info'] as const).map((severity) => {
        const ofSeverity = dispositionRows.filter((row) => row.severity === severity);
        return {
          severity,
          ids: ofSeverity.map((row) => row.id),
          open: ofSeverity.filter((row) => row.disposition === 'open').length,
        };
      });
    } else if (reviewFindings.length > 0) {
      total = reviewFindings.length;
      rows = (['critical', 'warning', 'info'] as const).map((severity) => ({
        severity,
        ids: reviewFindings
          .filter((finding) => finding.severity === severity)
          .map((finding) => finding.id),
      }));
    } else if (review !== null && review.statedTotal !== null) {
      total = review.statedTotal;
      rows = [];
    } else {
      total = fixEntryIds.length;
      rows = (['critical', 'warning', 'info'] as const).map((severity) => ({
        severity,
        ids: fixEntryIds.filter((id) => (severityById[id] ?? 'info') === severity),
      }));
    }
    const bySeverity: LedgerHeadSeverity[] = rows
      .filter((row) => row.ids.length > 0)
      .map((row) => ({
        severity: row.severity,
        open: row.open ?? null,
        total: row.ids.length,
        fixed: row.ids.filter((id) => fixedIds.has(id)).length,
        ids: row.ids,
      }));

    // A finding the disposition leaves open while a fix entry marks it fixed: a separate signal, never merged.
    const marks: Record<string, LedgerMark> = {};
    for (const row of dispositionRows) {
      if (row.disposition === 'open' && fixedIds.has(row.id) && !(row.id in marks)) {
        marks[row.id] = { commit: fixedCommits[row.id] ?? null };
      }
    }

    const tabs: LedgerTabEntry[] = [];
    const reviewMember = members.find((member) => member.tab === 'review');
    if (reviewMember) {
      tabs.push({
        tab: 'review',
        label: 'Review',
        url: reviewMember.url,
        count: reviewFindings.length > 0 ? reviewFindings.length : (review?.statedTotal ?? 0),
      });
    }
    if (dispositionMember !== null) {
      tabs.push({
        tab: 'disposition',
        label: 'Disposition',
        url: dispositionMember.url,
        count: dispositionRows.length,
      });
    }
    if (fixMembers.length > 0) {
      tabs.push({ tab: 'fix', label: 'Fix', url: fixMembers[0].url, count: fixEntryIds.length });
    }

    const openedMember = members.find((member) => member.path === path);
    return {
      members,
      tabs,
      active:
        opened.kind === 'review'
          ? 'review'
          : opened.kind === 'review-disposition'
            ? 'disposition'
            : 'fix',
      activeSuffix: openedMember?.suffix ?? suffixOf(fileNameOf(path)),
      review,
      fixes,
      severityById,
      disposition,
      fixedCommits,
      marks,
      head: {
        open: openTotal,
        total,
        bySeverity,
        fixedInReport: fixedIds.size,
        markedFixed: Object.keys(marks).length,
      },
    };
  } catch {
    return null;
  }
}

// The report and forensics handlers (Phase 11, 11-20, VIEW-18, D-03): `reports/` files (the session report and
// the milestone summary) and `forensics/` reports. Each claims one kind from folders.ts, keeps the generic
// title, frontmatter, body and warning, and adds `structured.report` or `structured.forensics` read by
// reports-lift.ts. The lift is guarded by its own try/catch: a throw, or a body with none of the known headings,
// only leaves the key out, and the page then falls back to the plain document.
import type { ArtifactHandler, ArtifactRef, HandlerParseResult, RawArtifact } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { extractForensics, extractReport } from './reports-lift.ts';

export type { ForensicsLift, MilestoneReportLift, ReportLift, SessionReportLift } from './reports-lift.ts';

type Key = 'report' | 'forensics';

function parseWith(
  raw: RawArtifact,
  ref: ArtifactRef,
  key: Key,
  lift: (fm: ReturnType<typeof tryParseFrontmatter>) => unknown,
): HandlerParseResult {
  const fm = tryParseFrontmatter(raw.content);
  const title = deriveTitle(fm.data, fm.body, ref.path);
  let lifted: unknown;
  try {
    lifted = lift(fm);
  } catch {
    lifted = undefined;
  }
  return {
    title,
    frontmatter: fm.data,
    body: fm.body,
    warning: fm.warning,
    structured: lifted === undefined || lifted === null ? {} : { [key]: lifted },
  };
}

export const ReportHandler: ArtifactHandler = {
  kind: 'report',
  match: (ref) => ref.kind === 'report',
  parse: (raw, ref) => parseWith(raw, ref, 'report', (fm) => extractReport(ref.path, fm.data, fm.body)),
};

export const ForensicsHandler: ArtifactHandler = {
  kind: 'forensics',
  match: (ref) => ref.kind === 'forensics',
  parse: (raw, ref) => parseWith(raw, ref, 'forensics', (fm) => extractForensics(fm.body)),
};

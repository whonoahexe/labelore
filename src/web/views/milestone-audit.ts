// The milestone audit composer (Phase 9, 09-14, VIEW-08): a pure `ViewInput` -> `ComposedMilestoneAudit` merge
// of `structured.audit` (the tolerant reading the handler made of the audit's frontmatter and its Status and
// Audited prose lines). The verdict is the first thing on the page: its label and tone sit in the header's meta
// row beside "Audited {date}". A verdict the file does not state is never invented: an absent status reads
// "Verdict not stated" and an unrecognised one reads as written, both in the quiet tone (the one prohibition
// of this plan). No DOM, no filesystem access, no rendering - `milestone-audit-components.tsx` is the only
// consumer. Returns `null` when the projection is missing, so an audit the handler could not shape keeps the
// promoted-section view.
// T-09-29: every string is author text rendered as React text by the components.
import type { ViewInput } from './manifest.ts';
import { formatStamp } from './uat-session.ts';

export type AuditTone = 'complete' | 'in-flight' | 'missing' | 'quiet';

export interface ComposedAuditVerdict {
  label: string;
  tone: AuditTone;
}

export interface ComposedAuditIntro {
  eyebrow: 'Milestone audit';
  /** The milestone name, else the version, else null (the page then uses the document title). */
  title: string | null;
  verdict: ComposedAuditVerdict;
  /** The audited date formatted ("15 Mar 2026"), or as written when it is no date; null when none is stated. */
  audited: string | null;
}

export interface ComposedMilestoneAudit {
  intro: ComposedAuditIntro;
  scores: null;
  gaps: null;
  debt: null;
  nyquist: null;
  extras: never[];
  /** True when the audit holds no scores, gaps or debt (the old prose-only shape): the narrative is the page. */
  narrativeOpen: boolean;
}

export const VERDICT_NOT_STATED = 'Verdict not stated';

const VERDICT_LABELS: Readonly<Record<string, ComposedAuditVerdict>> = {
  passed: { label: 'Passed', tone: 'complete' },
  tech_debt: { label: 'Tech debt only', tone: 'in-flight' },
  gaps_found: { label: 'Gaps found', tone: 'missing' },
};

function recordOf(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function textOf(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function verdictOf(audit: Record<string, unknown>): ComposedAuditVerdict {
  const verdict = recordOf(audit.verdict);
  const status = verdict === null ? null : textOf(verdict.status);
  const known = status === null ? undefined : VERDICT_LABELS[status];
  if (known !== undefined && Object.prototype.hasOwnProperty.call(VERDICT_LABELS, status as string)) return known;
  const raw = verdict === null ? null : textOf(verdict.raw);
  if (raw !== null) return { label: raw, tone: 'quiet' };
  return { label: VERDICT_NOT_STATED, tone: 'quiet' };
}

export function composeMilestoneAudit(input: ViewInput): ComposedMilestoneAudit | null {
  const audit = recordOf(input.structured.audit);
  if (audit === null) return null;
  const audited = textOf(audit.audited);
  return {
    intro: {
      eyebrow: 'Milestone audit',
      title: textOf(audit.milestoneName) ?? textOf(audit.milestone),
      verdict: verdictOf(audit),
      audited: audited === null ? null : formatStamp(audited),
    },
    scores: null,
    gaps: null,
    debt: null,
    nyquist: null,
    extras: [],
    narrativeOpen: true,
  };
}

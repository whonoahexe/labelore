// vX.Y-MILESTONE-AUDIT.md (Phase 9, 09-14, VIEW-08). The handler claims the audit by its ref kind and carries
// `structured.audit`, the tolerant reading of the audit's three real shapes made by `extractMilestoneAudit`
// (milestone-audit-body.ts, where the shapes and the caps are described). The extraction is guarded by its own
// try/catch so a throw only omits the key: the page then falls back to the promoted-section view and the
// title, body and frontmatter survive.
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { extractMilestoneAudit } from './milestone-audit-body.ts';

export { extractMilestoneAudit } from './milestone-audit-body.ts';
export type { MilestoneAuditBody } from './milestone-audit-body.ts';

export const MilestoneAuditHandler: ArtifactHandler = {
  kind: 'milestone-audit',
  match: (ref) => ref.kind === 'milestone-audit',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let audit;
    try {
      audit = extractMilestoneAudit(fm.data, fm.body);
    } catch {
      audit = undefined;
    }
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: audit === undefined ? {} : { audit },
    };
  },
};

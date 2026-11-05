// DOM-VERIFY.md (Phase 10, 10-21, VIEW-12). The handler claims `{NN}-DOM-VERIFY.md` by its artifact token and carries
// `structured.domVerify`, the tolerant reading `extractDomVerify` makes of what GSD's `gsd-dom-verifier` writes: the
// outcome and reason, the four counts as the frontmatter states them, one criterion per verdict line, and the target and
// time only when the body states them. Nothing is recomputed. The extraction is guarded by its own try/catch so a throw
// only omits the key: the page then falls back to the promoted-section view and the title, body and frontmatter survive.
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { artifactTokenOf } from './artifact-token.ts';
import { extractDomVerify } from './dom-verify-body.ts';
import type { DomVerifyBody } from './dom-verify-body.ts';

export { extractDomVerify } from './dom-verify-body.ts';
export type { DomVerifyBody } from './dom-verify-body.ts';

export const DomVerifyHandler: ArtifactHandler = {
  kind: 'dom-verify',
  match: (ref) => artifactTokenOf(ref) === 'DOM-VERIFY',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let domVerify: DomVerifyBody | undefined;
    try {
      domVerify = extractDomVerify(fm.data, fm.body);
    } catch {
      domVerify = undefined;
    }
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: domVerify === undefined ? {} : { domVerify },
    };
  },
};

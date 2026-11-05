// SPEC.md (Phase 10, 10-16, VIEW-11). The handler claims `{NN}-SPEC.md` by its artifact token (the UI-SPEC and
// AI-SPEC tokens are different, so they are never claimed here) and carries `structured.spec`, the tolerant reading
// `extractSpec` makes (spec-body.ts, where the shapes and the caps are described). The extraction is guarded by its
// own try/catch so a throw only omits the key: the page then falls back to the promoted-section view and the title,
// body and frontmatter survive.
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { artifactTokenOf } from './artifact-token.ts';
import { extractSpec } from './spec-body.ts';
import type { SpecBody } from './spec-body.ts';

export { extractSpec } from './spec-body.ts';
export type { SpecBody } from './spec-body.ts';

export const SpecHandler: ArtifactHandler = {
  kind: 'spec',
  match: (ref) => artifactTokenOf(ref) === 'SPEC',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let spec: SpecBody | undefined;
    try {
      spec = extractSpec(fm.body);
    } catch {
      spec = undefined;
    }
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: spec === undefined ? {} : { spec },
    };
  },
};

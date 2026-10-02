// SECURITY.md — the {NN}-SECURITY.md phase artifact and its quick-task twin. Lifts frontmatter exactly
// like the frontmatter-only handler it shadows for this token, and adds `structured.security`
// (quick-261003-527, sketch 017 D): the tolerant SECURITY projection `composeSecurityConsole` reads
// client-side. The extraction is guarded by a try/catch so a throw only omits `security` — the page
// then falls back to the pre-existing promoted-block view and the title, body and frontmatter survive
// (T-527-04).
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { artifactTokenOf } from './artifact-token.ts';
import { extractSecurityRegister } from './security-register.ts';

export const SecurityHandler: ArtifactHandler = {
  kind: 'security',
  match: (ref) => artifactTokenOf(ref) === 'SECURITY',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let security;
    try {
      security = extractSecurityRegister(fm.body);
    } catch {
      security = undefined;
    }
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: security === undefined ? {} : { security },
    };
  },
};

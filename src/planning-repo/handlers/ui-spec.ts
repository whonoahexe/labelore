// UI-SPEC.md — the {NN}-UI-SPEC.md phase artifact and its quick-task twin. Parses exactly like the
// frontmatter-only handler it precedes (frontmatter as an open map, the body kept, `structured`
// otherwise empty) and adds `structured.uiSpec` (quick-261001-qk6, sketch 014): the tolerant
// design-contract projection `composeUiSpec` reads client-side. The extraction is guarded by a
// try/catch so a throw only omits `uiSpec` — the page then falls back to the pre-existing
// promoted-block view and every other field survives (T-qk6-05). Registered before
// FrontmatterOnlyHandler, which still lists the token and is never reached for these artifacts.
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { artifactTokenOf } from './artifact-token.ts';
import { extractUiSpec } from './ui-spec-contract.ts';

export const UiSpecHandler: ArtifactHandler = {
  kind: 'ui-spec',
  match: (ref) => artifactTokenOf(ref) === 'UI-SPEC',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let uiSpec;
    try {
      uiSpec = extractUiSpec(raw.content);
    } catch {
      uiSpec = undefined;
    }
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: uiSpec === undefined ? {} : { uiSpec },
    };
  },
};

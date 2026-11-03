// COVERAGE.md (Phase 9, 09-15, VIEW-10). The handler claims the file by its ref kind and carries
// `structured.coverage`, the tolerant reading `extractCoverage` makes (coverage-body.ts, where the shapes and the
// caps are described). The extraction is guarded by its own try/catch so a throw only omits the key: the page
// then falls back to the promoted-section view and the title, body and frontmatter survive.
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { extractCoverage } from './coverage-body.ts';
import type { CoverageBody } from './coverage-body.ts';

export { extractCoverage, COVERAGE_BODY_CAP } from './coverage-body.ts';
export type { CoverageBody, CoverageNone } from './coverage-body.ts';

export const CoverageHandler: ArtifactHandler = {
  kind: 'coverage',
  match: (ref) => ref.kind === 'coverage',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let coverage: CoverageBody | undefined;
    try {
      coverage = extractCoverage(fm.body);
    } catch {
      coverage = undefined;
    }
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: coverage === undefined ? {} : { coverage },
    };
  },
};

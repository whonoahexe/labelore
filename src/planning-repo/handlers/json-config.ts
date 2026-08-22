// config.json, HANDOFF.json, estimation-calibration.json — open-map JSON reading. Everything
// returned is Record<string, unknown>: no key set is enumerated, no value is coerced, and
// `parallelization` (documented polymorphic: boolean or object) is preserved in whichever shape
// it arrives. Every parse goes through the guarded tryParseJson, which strips __proto__/
// constructor/prototype at every depth (T-01-03) — never called unguarded.
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseJson } from '../frontmatter.ts';

const JSON_ARTIFACT_NAMES = new Set(['config.json', 'HANDOFF.json', 'estimation-calibration.json']);

export const JsonConfigHandler: ArtifactHandler = {
  kind: 'json-config',
  match: (ref) => ref.location === 'root' && JSON_ARTIFACT_NAMES.has(basename(ref.path)),
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const result = tryParseJson(raw.content);
    return {
      title: basename(ref.path),
      // The parsed JSON object IS the structured data for this artifact type — there is no
      // separate markdown frontmatter/body split for a .json file. Kept in `frontmatter` so every
      // consumer that reads Artifact.frontmatter as "this artifact's open-map data" works
      // uniformly across markdown and JSON artifacts alike.
      frontmatter: result.data,
      body: raw.content,
      warning: result.warning,
      structured: {},
    };
  },
};

// Assembles the resolved domain graph from parsed artifacts. This task populates only the
// root-document slice — empty collections are the honest representation of a project with
// nothing (yet) to parse, never null, never a thrown error.
import { basename } from 'node:path';
import type { Project, Artifact } from '../domain/model.ts';
import type { ParsedArtifact, ParseWarning } from './types.ts';
import { tryParseJson } from './frontmatter.ts';

const CONFIG_PATH = '.planning/config.json';
const PROJECT_MD_PATH = '.planning/PROJECT.md';

function toDomainArtifact(parsed: ParsedArtifact): Artifact {
  return {
    id: parsed.ref.path,
    path: parsed.ref.path,
    kind: parsed.ref.kind,
    frontmatter: parsed.frontmatter,
    title: parsed.title,
    body: parsed.body,
    bodyLength: parsed.bodyLength,
    bodyHash: parsed.bodyHash,
    mtimeMs: parsed.mtimeMs,
    warnings: parsed.warnings,
  };
}

export function assembleDomainModel(
  parsed: ParsedArtifact[],
  _warnings: ParseWarning[],
  rootPath: string,
): Project {
  const rootArtifacts = parsed.filter((p) => p.ref.location === 'root');

  const artifacts: Record<string, Artifact> = {};
  for (const p of rootArtifacts) {
    artifacts[p.ref.path] = toDomainArtifact(p);
  }

  const configArtifact = parsed.find((p) => p.ref.path === CONFIG_PATH);
  const config = configArtifact ? tryParseJson(configArtifact.body).data : {};

  const projectDoc = artifacts[PROJECT_MD_PATH];
  const name = projectDoc?.title ?? basename(rootPath);

  return {
    rootPath,
    name,
    artifacts,
    config,
    milestones: [],
    phases: [],
    quickTasks: [],
    requirements: [],
  };
}

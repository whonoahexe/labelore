import { createHash } from 'node:crypto';
import type { PlanningFilesystem } from '../planning-fs/types.ts';
import type { ArtifactRef, ParsedArtifact, RawArtifact } from './types.ts';
import type { WarningCollector } from './warnings.ts';
import { GenericMarkdownHandler } from './handlers/generic.ts';

// Ordering here is load-bearing: handlers are tried in array order and GenericMarkdownHandler's
// match() returns true unconditionally, so it MUST be last or it would shadow every typed handler
// registered after it. Typed handlers land in plan 01-03 and are inserted before this entry.
export const HANDLERS = [GenericMarkdownHandler];

function bodyHashOf(body: string): string {
  return createHash('sha256').update(body, 'utf8').digest('hex');
}

export async function parseWithRegistry(
  fs: PlanningFilesystem,
  ref: ArtifactRef,
  warnings: WarningCollector,
): Promise<ParsedArtifact> {
  let raw;
  try {
    raw = await fs.read(ref.path);
  } catch {
    warnings.add(ref.path, 'read', 'File could not be read', 'nothing readable');
    return {
      ref,
      title: ref.path,
      frontmatter: {},
      body: '',
      bodyLength: 0,
      bodyHash: bodyHashOf(''),
      mtimeMs: 0,
      warnings: warnings.forPath(ref.path),
    };
  }

  const handler = HANDLERS.find((h) => h.match(ref)) ?? GenericMarkdownHandler;
  const rawArtifact: RawArtifact = { path: ref.path, ...raw };

  try {
    const parsed = handler.parse(rawArtifact, ref);
    if (parsed.warning) {
      warnings.add(ref.path, parsed.warning.stage, parsed.warning.message, parsed.warning.salvage);
    }
    return {
      ref,
      title: parsed.title,
      frontmatter: parsed.frontmatter,
      body: parsed.body,
      bodyLength: parsed.body.length,
      bodyHash: bodyHashOf(parsed.body),
      mtimeMs: raw.mtimeMs,
      warnings: warnings.forPath(ref.path),
    };
  } catch (err) {
    warnings.add(
      ref.path,
      'structured-extraction',
      err instanceof Error ? err.message : 'Handler threw during parse',
      'raw content unavailable, treated as empty',
    );
    return {
      ref,
      title: ref.path,
      frontmatter: {},
      body: '',
      bodyLength: 0,
      bodyHash: bodyHashOf(''),
      mtimeMs: raw.mtimeMs,
      warnings: warnings.forPath(ref.path),
    };
  }
}

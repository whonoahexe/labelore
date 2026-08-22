import { createHash } from 'node:crypto';
import type { PlanningFilesystem } from '../planning-fs/types.ts';
import type { ArtifactRef, ParsedArtifact, RawArtifact } from './types.ts';
import type { WarningCollector } from './warnings.ts';
import { HANDLERS } from './handlers/index.ts';
import { GenericMarkdownHandler } from './handlers/generic.ts';

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
  } catch (err) {
    // Use the thrown error's own message (e.g. LocalFsPlanningFilesystem's PathEscapeError names
    // the escaping relative path and its resolved target) rather than a generic string, so the
    // warning stays useful without this module importing any concrete PlanningFilesystem.
    const message = err instanceof Error ? err.message : 'File could not be read';
    warnings.add(ref.path, 'read', message, 'nothing readable');
    return {
      ref,
      title: ref.path,
      frontmatter: {},
      body: '',
      bodyLength: 0,
      bodyHash: bodyHashOf(''),
      mtimeMs: 0,
      warnings: warnings.forPath(ref.path),
      structured: {},
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
      structured: parsed.structured ?? {},
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
      structured: {},
    };
  }
}

// The cheap project-name read for list rows (D-21): the title of .planning/PROJECT.md, taken the way a
// loaded project takes its name (frontmatter `title`, else the first `# ` heading) but from at most
// 16384 bytes and without loading the project. The read goes through the existing read-only
// readHead primitive of local-fs.ts, so no third node:fs importer appears (D-19).
import { LocalFsPlanningFilesystem } from '../planning-fs/local-fs.ts';
import { tryParseFrontmatter } from '../planning-repo/frontmatter.ts';
import { deriveTitle } from '../planning-repo/handlers/title.ts';

const TITLE_READ_BYTES = 16_384;
const TITLE_MAX_CHARS = 200;

/** The PROJECT.md title of the project rooted at `rootPath`, trimmed and cut to 200 characters; null
 * when there is no PROJECT.md, it has no title, or anything about reading it fails. Never throws. */
export async function readProjectTitle(rootPath: string): Promise<string | null> {
  try {
    const head = await new LocalFsPlanningFilesystem(rootPath).readHead('.planning/PROJECT.md', TITLE_READ_BYTES);
    const text = new TextDecoder('utf-8', { fatal: false }).decode(head);
    const { data, body } = tryParseFrontmatter(text);
    const title = deriveTitle(data, body, '').trim().slice(0, TITLE_MAX_CHARS).trim();
    return title.length > 0 ? title : null;
  } catch {
    return null;
  }
}

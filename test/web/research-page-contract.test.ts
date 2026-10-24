// quick-261024-k8u (QK8U-08, T-k8u-01): the Research page renders every research string as a React
// text node, links to none of the source files, and reads nothing from a filesystem. A source-level
// contract over every src/web/pages/research-*.tsx, with comments blanked first (the class-vocabulary
// idiom) so prose in a comment cannot trip or hide a check.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PAGES_DIR = join(import.meta.dirname, '..', '..', 'src', 'web', 'pages');

function blankComments(source: string): string {
  let out = '';
  let i = 0;
  while (i < source.length) {
    if (source[i] === '/' && source[i + 1] === '/') {
      let j = i;
      while (j < source.length && source[j] !== '\n') j += 1;
      out += ' '.repeat(j - i);
      i = j;
    } else if (source[i] === '/' && source[i + 1] === '*') {
      let j = i + 2;
      while (j < source.length && !(source[j] === '*' && source[j + 1] === '/')) j += 1;
      j = Math.min(j + 2, source.length);
      out += source.slice(i, j).replace(/[^\n]/g, ' ');
      i = j;
    } else {
      out += source[i];
      i += 1;
    }
  }
  return out;
}

const files = readdirSync(PAGES_DIR)
  .filter((name) => /^research-.*\.tsx$/.test(name))
  .sort();

describe('Research page source contract', () => {
  it('covers the page and its atoms', () => {
    expect(files).toContain('research-page.tsx');
    expect(files).toContain('research-atoms.tsx');
  });

  describe.each(files)('%s', (name) => {
    const source = blankComments(readFileSync(join(PAGES_DIR, name), 'utf8'));

    it('never injects raw HTML', () => {
      expect(source).not.toMatch(/dangerouslySetInnerHTML/);
      expect(source).not.toMatch(/innerHTML/);
    });

    it('never links to an artifact page or imports an artifact-URL helper', () => {
      expect(source).not.toMatch(/\/artifacts\//);
      expect(source).not.toMatch(/buildArtifactUrl|artifactTokenOf|artifactPathOf/);
      expect(source).not.toMatch(/<a\b/);
      expect(source).not.toMatch(/<Link\b/);
    });

    it('has no copy-path button, source chip or file-name label', () => {
      expect(source).not.toMatch(/artifact-path-copy|CopyPath|copy-path/);
      expect(source).not.toMatch(/\b(?:SUMMARY|STACK|FEATURES|ARCHITECTURE|PITFALLS)\.md\b/);
      expect(source).not.toMatch(/['">]\s*Source\s*['"<]/);
      expect(source).not.toMatch(/open in reader/i);
    });

    it('never imports a node: module or a filesystem boundary', () => {
      expect(source).not.toMatch(/from ['"]node:/);
      expect(source).not.toMatch(/planning-fs/);
    });

    it('never takes the parse-failure tones', () => {
      expect(source).not.toMatch(/data-tone=(?:"|\{[^}]*['"])(?:destructive|warning)/);
    });
  });
});

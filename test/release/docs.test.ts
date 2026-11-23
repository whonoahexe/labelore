// The DOC-01 contract for the README and the skill that ship in the release: one README source, the
// guide's section order and commands, and the forbidden text. Pure file reads, no build, no network.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanText } from '../../scripts/lib/leak-scan.mjs';
import { localPrivateNames } from '../helpers/private-names.ts';
import { REPO_ROOT } from '../helpers/server-bundle.ts';

const read = (path: string): string => readFileSync(join(REPO_ROOT, path), 'utf8');

const README = read('README.md');
const SKILL = read('skills/labelore/SKILL.md');
const RELEASE = read('scripts/release.mjs');

interface Section {
  heading: string;
  body: string;
}

/** The `## ` headings of a markdown file in order, each with its body text up to the next heading.
 * Lines inside a fenced block never count as headings. */
function sections(markdown: string): Section[] {
  const found: Section[] = [];
  let fenced = false;
  for (const line of markdown.split('\n')) {
    if (line.startsWith('```')) fenced = !fenced;
    const heading = fenced ? null : /^## (.+)$/.exec(line);
    if (heading) found.push({ heading: heading[1].trim(), body: '' });
    else if (found.length > 0) found[found.length - 1].body += `${line}\n`;
  }
  return found;
}

describe('one README ships (DOC-01, D-11)', () => {
  it('the release stages the repo README.md', () => {
    expect(RELEASE).toContain("copyInto(stage, 'README.md', 'README.md')");
    expect(RELEASE).not.toContain('release-readme');
  });

  it('the second README is gone', () => {
    expect(existsSync(join(REPO_ROOT, 'scripts/release-readme.md'))).toBe(false);
  });

  it('the shipped docs hold no private name', () => {
    const names = localPrivateNames(REPO_ROOT);
    expect(scanText(README, names)).toEqual([]);
    expect(scanText(SKILL, names)).toEqual([]);
  });

  it('the sections helper reads headings in order and ignores fenced lines', () => {
    const found = sections('# T\n\n## A\none\n```sh\n## not a heading\n```\n## B\ntwo\n');
    expect(found.map((s) => s.heading)).toEqual(['A', 'B']);
    expect(found[0].body).toContain('one');
    expect(found[1].body).toContain('two');
  });
});

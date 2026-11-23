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

/** Text that must appear in neither shipped doc: the fixed port, a concrete loopback port, hosting and
 * tunnel words. Placeholders are the exact uppercase tokens PORT, VERSION and SHA512. */
const FIXED_PORT = /(?<![\w.])4173(?![\w])/;
const CONCRETE_LOOPBACK = /(127\.0\.0\.1|localhost):\d/;
const HOSTING_WORDS = [/tailscale/i, /ts\.net/i, /tunnel/i, /funnel/i];

const GUIDE_ORDER = [
  'Requirements',
  'Install',
  'First launch',
  'Stop',
  'Upgrade',
  'Attach to a running Labelore',
  'Uninstall',
  'Read-only',
  'Develop',
  'License',
];

describe('the README is the user guide (DOC-01, D-12, D-14)', () => {
  const guide = sections(README);
  const body = (heading: string): string => guide.find((s) => s.heading === heading)?.body ?? '';

  it('the sections run install to uninstall, then Develop and License last', () => {
    expect(guide.map((s) => s.heading)).toEqual(GUIDE_ORDER);
  });

  it('every section has a body', () => {
    for (const section of guide) {
      expect(section.body.trim().length, section.heading).toBeGreaterThan(0);
    }
  });

  it('Install holds the exact install line and where the integrity string comes from', () => {
    const install = body('Install');
    expect(install).toContain('gsd capability install npm:labelore@VERSION --integrity SHA512 --scope global');
    expect(install).toContain('npm view labelore@VERSION dist.integrity');
  });

  it('Uninstall lists stop, remove, then the state directory, and no rm -rf', () => {
    const uninstall = body('Uninstall');
    const stop = uninstall.indexOf('/gsd-labelore stop');
    const remove = uninstall.indexOf('gsd capability remove labelore');
    const state = uninstall.indexOf('state directory');
    expect(stop).toBeGreaterThanOrEqual(0);
    expect(remove).toBeGreaterThan(stop);
    expect(state).toBeGreaterThan(remove);
    expect(uninstall).not.toMatch(/rm\s+-/);
  });

  it('Upgrade names gsd capability update and First launch says the port changes', () => {
    expect(body('Upgrade')).toContain('gsd capability update');
    expect(body('First launch')).toMatch(/the port changes/i);
    expect(body('First launch')).toMatch(/attach/i);
  });

  it('Attach names the variable, the file, the url shape and the rules', () => {
    const attach = body('Attach to a running Labelore');
    expect(attach).toContain('LABELORE_ATTACH_URL');
    expect(attach).toContain('attach.json');
    expect(attach).toContain('"url": "http://127.0.0.1:PORT"');
    expect(attach).toMatch(/loopback/i);
    expect(attach).toMatch(/this machine/i);
    expect(attach).toMatch(/remembered/i);
    expect(attach).toMatch(/never falls back/i);
  });

  it('Develop covers npm ci, npm run build, npm start and a printed address', () => {
    const develop = body('Develop');
    expect(develop).toContain('npm ci');
    expect(develop).toContain('npm run build');
    expect(develop).toContain('npm start');
    expect(develop).toContain('http://127.0.0.1:PORT');
  });

  it('the README holds no fixed port, no concrete loopback port, no hosting word and no stale build text', () => {
    expect(README).not.toMatch(FIXED_PORT);
    expect(README).not.toMatch(CONCRETE_LOOPBACK);
    for (const word of HOSTING_WORDS) expect(README).not.toMatch(word);
    for (const stale of ['ignore-scripts', 'vite build', 'node_modules', '500 MB']) {
      expect(README).not.toContain(stale);
    }
    expect(README).not.toMatch(/first launch builds/i);
  });
});

// The three Step headings and the launcher line are the part of the skill the dispatch relies on; they
// are copied literally from the skill as shipped by the previous release.
const STEP_HEADINGS = ['## Step 1: pick the subcommand', '## Step 2: run the launcher', '## Step 3: report'];
const LAUNCHER_LINE =
  'L="${CLAUDE_PROJECT_DIR:-.}/.gsd/capabilities/labelore/scripts/labelore.mjs"; [ -f "$L" ] || L="${GSD_HOME:-$HOME}/.gsd/capabilities/labelore/scripts/labelore.mjs"; [ -f "$L" ] || { echo "labelore: launcher not found under CLAUDE_PROJECT_DIR or GSD_HOME"; exit 1; }; echo "labelore: running $L"; node "$L" <subcommand> [phase]';

describe('the skill notes (DOC-01, D-13)', () => {
  it('stays under 60 lines and keeps its frontmatter', () => {
    expect(SKILL.split('\n').length).toBeLessThan(60);
    expect(SKILL.startsWith('---\nname: gsd-labelore\n')).toBe(true);
  });

  it('keeps the three Step headings and the launcher line unchanged', () => {
    const lines = SKILL.split('\n');
    for (const heading of STEP_HEADINGS) expect(lines).toContain(heading);
    expect(lines).toContain(LAUNCHER_LINE);
  });

  it('passes the phase only when it looks like a phase number', () => {
    expect(SKILL).toContain('^[0-9]+(\\.[0-9]+)*$');
  });

  it('gives short notes on open, stop, link, the port and attach, and points to the README', () => {
    expect(SKILL).toContain('LABELORE_ATTACH_URL');
    expect(SKILL).toContain('attach.json');
    expect(SKILL).toContain('README');
    expect(SKILL).toMatch(/loopback/i);
    expect(SKILL).toMatch(/port changes/i);
    expect(SKILL).toMatch(/never starts/i);
  });

  it('holds no fixed port, no concrete loopback port, no hosting word and no stale build text', () => {
    expect(SKILL).not.toMatch(FIXED_PORT);
    expect(SKILL).not.toMatch(CONCRETE_LOOPBACK);
    for (const word of HOSTING_WORDS) expect(SKILL).not.toMatch(word);
    expect(SKILL).not.toMatch(/npm ci/);
    expect(SKILL).not.toMatch(/vite build/);
    expect(SKILL).not.toMatch(/first (open|launch) builds/i);
  });
});

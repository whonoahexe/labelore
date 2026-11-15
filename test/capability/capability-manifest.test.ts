// The capability.json manifest and the skill it owns, checked against the shape gsd-core 1.21.0 expects
// of a feature capability (see its capability-manifest reference).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

const LOOP_POINTS = [
  'discuss:pre',
  'discuss:post',
  'plan:pre',
  'plan:post',
  'execute:pre',
  'execute:wave:pre',
  'execute:wave:post',
  'execute:post',
  'verify:pre',
  'verify:post',
  'ship:pre',
  'ship:post',
];

interface Step {
  point: string;
  ref: Record<string, string>;
  produces: unknown;
  consumes: unknown;
  onError: string;
  when?: string;
}
interface Manifest {
  id: string;
  role: string;
  version: string;
  license: string;
  engines: { gsd: string };
  runtimeCompat: { supported: string[] };
  skills: string[];
  config: Record<string, { type: string; default: unknown; description: string }>;
  steps: Step[];
}

const manifest = JSON.parse(readFileSync(join(REPO_ROOT, 'capability.json'), 'utf8')) as Manifest;
const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
  version: string;
  license: string;
};

describe('capability.json', () => {
  it('identifies a feature capability that matches package.json', () => {
    expect(manifest.id).toBe('labelore');
    expect(manifest.role).toBe('feature');
    expect(manifest.version).toBe(pkg.version);
    expect(manifest.license).toBe('MIT');
    expect(pkg.license).toBe('MIT');
    expect(manifest.engines.gsd).toBe('>=1.21.0');
    expect(manifest.runtimeCompat.supported.length).toBeGreaterThan(0);
    for (const prefix of ['gsd-', 'gsd-core-', 'anthropic-'])
      expect(manifest.id.startsWith(prefix)).toBe(false);
  });

  it('owns skills that exist with the gsd- name and a short body', () => {
    expect(manifest.skills.length).toBeGreaterThan(0);
    for (const stem of manifest.skills) {
      const text = readFileSync(join(REPO_ROOT, 'skills', stem, 'SKILL.md'), 'utf8');
      expect(text).toMatch(new RegExp(`^---\\nname: gsd-${stem}\\n`));
      expect(text.split('\n').length).toBeLessThan(60);
    }
  });

  it('wires every step to a loop point, an owned skill and a declared config key', () => {
    expect(manifest.steps.length).toBeGreaterThan(0);
    for (const step of manifest.steps) {
      expect(LOOP_POINTS).toContain(step.point);
      expect(Object.keys(step.ref)).toHaveLength(1);
      expect(manifest.skills).toContain(step.ref.skill);
      expect(Array.isArray(step.produces)).toBe(true);
      expect(Array.isArray(step.consumes)).toBe(true);
      expect(['skip', 'halt']).toContain(step.onError);
      expect(Object.keys(manifest.config)).toContain(step.when);
    }
  });

  it('namespaces every config key and gives it a type, a default of that type and a description', () => {
    for (const [key, entry] of Object.entries(manifest.config)) {
      expect(key.startsWith('labelore.')).toBe(true);
      expect(typeof entry.default).toBe(entry.type);
      expect(entry.description.length).toBeGreaterThan(0);
    }
  });

  it('is launched by a skill that names a launcher that exists', () => {
    const skill = readFileSync(join(REPO_ROOT, 'skills', 'labelore', 'SKILL.md'), 'utf8');
    expect(skill).toContain('/.gsd/capabilities/labelore/scripts/labelore.mjs');
    expect(existsSync(join(REPO_ROOT, 'scripts', 'labelore.mjs'))).toBe(true);
  });
});

describe('publishable repository', () => {
  it('carries the MIT license text for 2026 whonoahexe', () => {
    const license = readFileSync(join(REPO_ROOT, 'LICENSE'), 'utf8');
    expect(license.startsWith('MIT License')).toBe(true);
    expect(license).toContain('Copyright (c) 2026 whonoahexe');
  });

  it('tracks no symlink, because GSD refuses to stage any symlink in a capability bundle', () => {
    const index = execFileSync('git', ['ls-files', '-s'], { cwd: REPO_ROOT, encoding: 'utf8' });
    const links = index.split('\n').filter((line) => line.startsWith('120000'));
    expect(links, 'GSD refuses to stage any symlink in a capability bundle').toEqual([]);
  });
});

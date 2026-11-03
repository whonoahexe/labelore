// 09 D-01: the one table of root documents designed elsewhere. A redirect is chosen by the artifact's
// location 'root' plus its exact file name, never by kind alone (T-07-04 precedent), and the Source
// address is built in exactly one place.
import { describe, expect, it } from 'vitest';
import {
  DESIGNED_ELSEWHERE_KINDS,
  archivedCopyTarget,
  ROOT_DOCUMENT_TARGETS,
  designedElsewhereLead,
  hasSourceFlag,
  rootDocumentRedirect,
  sourceUrlOf,
} from '../../src/presentation/root-redirects.ts';
import { FX_ROOT, loadProject } from '../helpers/fixture-project.ts';

type Address = NonNullable<Parameters<typeof rootDocumentRedirect>[0]>;

const at = (key: string, path: string, location: Address['location'] = 'root'): Address => ({
  key,
  path,
  location,
});

describe('rootDocumentRedirect', () => {
  it.each([
    ['/state', '.planning/STATE.md', '/'],
    ['/requirements', '.planning/REQUIREMENTS.md', '/traceability'],
    ['/milestones', '.planning/MILESTONES.md', '/roadmap#history'],
    ['/retrospective', '.planning/RETROSPECTIVE.md', '/roadmap#history'],
  ])('sends the root %s (%s) to %s', (key, path, to) => {
    expect(rootDocumentRedirect(at(key, path))).toBe(to);
  });

  it('never redirects ROADMAP.md: its key already is the roadmap page', () => {
    expect(rootDocumentRedirect(at('/roadmap', '.planning/ROADMAP.md'))).toBeNull();
  });

  it('is chosen by location and exact file name, never by kind alone', () => {
    expect(rootDocumentRedirect(at('/research/state', '.planning/research/STATE.md', 'research'))).toBeNull();
    expect(
      rootDocumentRedirect(at('/v1.1/phase-1/state', '.planning/phases/01-x/STATE.md', 'phase')),
    ).toBeNull();
    expect(rootDocumentRedirect(at('/state', '.planning/state.md'))).toBeNull();
    expect(rootDocumentRedirect(at('/project', '.planning/PROJECT.md'))).toBeNull();
    expect(rootDocumentRedirect(undefined)).toBeNull();
  });

  it('has one row per designed-elsewhere kind', () => {
    expect([...DESIGNED_ELSEWHERE_KINDS].sort()).toEqual(
      ['milestones', 'requirements', 'retrospective', 'roadmap', 'state'].sort(),
    );
    expect(ROOT_DOCUMENT_TARGETS).toHaveLength(5);
  });
});

describe('hasSourceFlag', () => {
  it.each(['?source=1', '?x=2&source=1', 'source=1'])('is true for %j', (search) => {
    expect(hasSourceFlag(search)).toBe(true);
  });

  it.each(['', '?source=0', '?source=true', '?source=', '?sources=1', '?x=1'])('is false for %j', (search) => {
    expect(hasSourceFlag(search)).toBe(false);
  });
});

describe('sourceUrlOf', () => {
  it('is the own address with the flag for a redirected root document and for ROADMAP.md', () => {
    expect(sourceUrlOf(at('/state', '.planning/STATE.md'))).toBe('/state?source=1');
    expect(sourceUrlOf(at('/roadmap', '.planning/ROADMAP.md'))).toBe('/roadmap?source=1');
    expect(sourceUrlOf(at('/milestones', '.planning/MILESTONES.md'))).toBe('/milestones?source=1');
  });

  it('is null for every other file', () => {
    expect(sourceUrlOf(at('/project', '.planning/PROJECT.md'))).toBeNull();
    expect(sourceUrlOf(at('/v1.1/phase-1/plan-01', '.planning/phases/01-x/01-01-PLAN.md', 'phase'))).toBeNull();
    expect(sourceUrlOf(at('/research/state', '.planning/research/STATE.md', 'research'))).toBeNull();
    expect(sourceUrlOf(undefined)).toBeNull();
  });
});

describe('designedElsewhereLead', () => {
  it('names the page behind the file and ends in a full stop', () => {
    expect(designedElsewhereLead('state')).toBe('The file behind the dashboard, as written.');
    expect(designedElsewhereLead('requirements')).toBe('The file behind traceability, as written.');
    expect(designedElsewhereLead('milestones')).toBe('The file behind the roadmap history, as written.');
  });

  it('is null for any other kind', () => {
    expect(designedElsewhereLead('handoff')).toBeNull();
    expect(designedElsewhereLead('unknown')).toBeNull();
  });
});

const lendshed = (await loadProject(FX_ROOT)).presentation;

describe('archivedCopyTarget (09 D-02)', () => {  const artifactAt = (path: string) => lendshed.artifacts.find((artifact) => artifact.path.endsWith(path))!;

  it('sends the archived roadmap to the roadmap at its version', () => {
    expect(archivedCopyTarget(artifactAt('milestones/v1.0-ROADMAP.md'), lendshed)).toEqual({
      page: 'roadmap',
      version: 'v1.0',
    });
  });

  it('sends the archived requirements to traceability when the projection shows them', () => {
    expect(archivedCopyTarget(artifactAt('milestones/v1.0-REQUIREMENTS.md'), lendshed)).toEqual({
      page: 'traceability',
      version: 'v1.0',
    });
  });

  it('is null for an archived roadmap whose milestone has no History block', () => {
    const planted = { ...artifactAt('milestones/v1.0-ROADMAP.md'), path: '.planning/milestones/v9.9-ROADMAP.md' };
    expect(archivedCopyTarget(planted, lendshed)).toBeNull();
  });

  it('is null for a root ROADMAP.md, an undefined artifact and a nested file', () => {
    expect(archivedCopyTarget(artifactAt('.planning/ROADMAP.md'), lendshed)).toBeNull();
    expect(archivedCopyTarget(undefined, lendshed)).toBeNull();
    const nested = { ...artifactAt('milestones/v1.0-ROADMAP.md'), path: '.planning/milestones/x/v1.0-ROADMAP.md' };
    expect(archivedCopyTarget(nested, lendshed)).toBeNull();
  });

  it('gives an archived copy a Source address when the payload is supplied', () => {
    const copy = artifactAt('milestones/v1.0-ROADMAP.md');
    expect(sourceUrlOf(copy, lendshed)).toBe(`${copy.key}?source=1`);
    expect(sourceUrlOf(copy)).toBeNull();
    expect(sourceUrlOf(artifactAt('milestones/v1.0-ROADMAP.md'), { ...lendshed, milestones: [] })).toBeNull();
  });
});

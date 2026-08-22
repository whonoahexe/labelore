import { describe, it, expect } from 'vitest';
import {
  parsePhaseDirName,
  parsePlanFileName,
  parsePhaseArtifactName,
  parseQuickDirName,
  parseMilestoneFileName,
  parseMilestonePhasesDirName,
  comparePhaseNumbers,
  isCanonicalRootFile,
} from '../src/planning-repo/naming.ts';

describe('parsePhaseDirName', () => {
  it('parses a bare sequential phase directory', () => {
    const result = parsePhaseDirName('01-foundation');
    expect(result).toEqual({ matched: true, projectCode: null, number: '01', slug: 'foundation', numeric: true });
  });

  it('parses a project-code-prefixed decimal phase directory', () => {
    const result = parsePhaseDirName('CK-02.1-urgent-fix');
    expect(result.matched).toBe(true);
    if (!result.matched) throw new Error('expected match');
    expect(result.projectCode).toBe('CK');
    // Phase numbers are kept exactly as written — the leading zero on the base segment is not
    // stripped, since numbers are strings throughout, never reformatted through integer parsing.
    expect(result.number).toBe('02.1');
    expect(result.slug).toBe('urgent-fix');
    expect(result.numeric).toBe(true);
  });

  it('treats a letter suffix as part of the number token, not the slug', () => {
    const result = parsePhaseDirName('12A-variant');
    expect(result).toEqual({ matched: true, projectCode: null, number: '12A', slug: 'variant', numeric: true });
  });

  it('marks a custom-mode phase id as non-numeric and does not require digits', () => {
    const result = parsePhaseDirName('URGENT-FIX-hotfix', 'custom');
    expect(result.matched).toBe(true);
    if (!result.matched) throw new Error('expected match');
    expect(result.numeric).toBe(false);
  });

  it('does not match a bare slug with no phase-number-shaped id', () => {
    expect(parsePhaseDirName('just-a-slug')).toEqual({ matched: false });
  });
});

describe('comparePhaseNumbers', () => {
  it('orders decimal, lettered, and multi-digit phase numbers correctly', () => {
    const input = ['10', '2', '2.1', '12A', '1'];
    const sorted = [...input].sort(comparePhaseNumbers);
    expect(sorted).toEqual(['1', '2', '2.1', '10', '12A']);
  });
});

describe('parsePlanFileName', () => {
  it('parses a PLAN.md filename', () => {
    expect(parsePlanFileName('01-02-PLAN.md')).toEqual({ matched: true, phase: '01', plan: '02', kind: 'plan' });
  });

  it('parses a SUMMARY.md filename', () => {
    expect(parsePlanFileName('01-02-SUMMARY.md')).toEqual({
      matched: true,
      phase: '01',
      plan: '02',
      kind: 'summary',
    });
  });

  it('does not match a phase-scoped artifact filename', () => {
    expect(parsePlanFileName('01-CONTEXT.md')).toEqual({ matched: false });
  });
});

describe('parsePhaseArtifactName', () => {
  it('parses a known artifact token', () => {
    expect(parsePhaseArtifactName('01-CONTEXT.md')).toEqual({ matched: true, phase: '01', artifact: 'CONTEXT' });
  });

  it('parses an unrecognized, open artifact token identically to a known one', () => {
    expect(parsePhaseArtifactName('01-ROUTE-INVENTORY.md')).toEqual({
      matched: true,
      phase: '01',
      artifact: 'ROUTE-INVENTORY',
    });
  });
});

describe('parseQuickDirName', () => {
  it('parses date, opaque time token, and slug', () => {
    const result = parseQuickDirName('260726-unp-add-a-toggle');
    expect(result).toEqual({ matched: true, date: '260726', timeToken: 'unp', slug: 'add-a-toggle' });
  });
});

describe('parseMilestoneFileName', () => {
  it('parses version and document token', () => {
    expect(parseMilestoneFileName('v1.0-ROADMAP.md')).toEqual({ matched: true, version: 'v1.0', document: 'ROADMAP' });
  });
});

describe('parseMilestonePhasesDirName', () => {
  it('parses the archived-phases directory version', () => {
    expect(parseMilestonePhasesDirName('v2.0-phases')).toEqual({ matched: true, version: 'v2.0' });
  });

  it('does not match a plain phases directory', () => {
    expect(parseMilestonePhasesDirName('phases')).toEqual({ matched: false });
  });
});

describe('isCanonicalRootFile', () => {
  it('recognizes an exact-set canonical file', () => {
    expect(isCanonicalRootFile('STATE.md')).toBe(true);
  });

  it('recognizes a version-stamped pattern canonical file', () => {
    expect(isCanonicalRootFile('v1.0-MILESTONE-AUDIT.md')).toBe(true);
  });

  it('does not recognize an arbitrary filename', () => {
    expect(isCanonicalRootFile('NOTES.md')).toBe(false);
  });
});

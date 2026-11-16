// quick-260929-3x3: extractResearchBriefing (the RESEARCH.md briefing projection) against real-shaped
// fixtures and the two anchor documents read from disk, plus the T-3x3-02 timing guard and the
// T-3x3-04 handler guard. Anchor counts were independently confirmed with awk/grep against the
// source files (never copied from the extractor's own output).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fxPath } from './helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';
import {
  NA_AUDIT,
  PITFALL_LABEL_LINES,
  LS02_SHAPE,
  LS04_NUMBERED_PITFALLS,
  SYNTHETIC_SLOP,
} from './helpers/research-fixtures.ts';
import {
  confidenceLevelOf,
  extractResearchBriefing,
  parseColumnZero,
  splitFenceAware,
  validUntilShort,
} from '../src/planning-repo/handlers/research-briefing.ts';
import { ResearchHandler } from '../src/planning-repo/handlers/research.ts';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';

const FX02 = fxPath('milestones/v1.0-phases/02-shed-inventory-health/02-RESEARCH.md');

describe('extractResearchBriefing — LS02_SHAPE fixture', () => {
  const b = extractResearchBriefing(LS02_SHAPE);

  it('stack groups, badges and alternative verdicts', () => {
    const [core, supporting] = b.stack?.groups ?? [];
    expect(core.packages).toHaveLength(6);
    expect(supporting.packages).toHaveLength(3);
    // Only kernix ("Equally legitimate …") is viable; libc ("… Not worth it") and spawn_blocking
    // ("Simpler-looking, but …") were not chosen.
    expect(b.stack?.alternatives.map((a) => a.verdict)).toEqual([
      'viable',
      'rejected',
      'harmful',
      'rejected',
      'rejected',
      'later',
    ]);
    const fsstat = core.packages.find((p) => p.name === 'fsstat');
    expect(fsstat?.version).toBe('1.1.4');
    expect(core.packages.find((p) => p.name === 'evrun')?.pinned).toBe(true);
    expect(core.packages.find((p) => p.name.startsWith('bayprobe'))?.hostBinary).toBe(true);
    expect(core.packages.find((p) => p.name.startsWith('hubctl'))?.hostBinary).toBe(true);
    expect(core.packages.find((p) => p.name === 'evrun')?.version).not.toContain('pinned');
    expect(b.stack?.installation).toBe(true);
    expect(b.stack?.versionVerification).toBe(true);
  });

  it('audit rows, dashed dispositions and the two extra notes', () => {
    expect(b.audit?.rows).toHaveLength(4);
    expect(b.audit?.rows.every((r) => r.verdict === 'OK')).toBe(true);
    expect(b.audit?.rows.filter((r) => !r.plainApproval)).toHaveLength(4);
    expect(b.audit?.extraNotes).toHaveLength(2);
    expect(b.audit?.extraNotes[0].startsWith('**Postinstall scripts:**')).toBe(true);
    expect(b.audit?.extraNotes[1].startsWith('**Frontend:**')).toBe(true);
    expect(b.audit?.removed).toHaveLength(0);
  });

  it('architecture figures, patterns, hand-roll and pitfalls', () => {
    expect(b.architecture?.diagram?.text).toContain('BROADCAST BUS');
    expect(b.architecture?.structure?.text).toContain('bus.rs');
    expect(b.architecture?.patterns).toHaveLength(3);
    expect(b.architecture?.antiPatterns).toHaveLength(7);
    expect(b.handRoll?.rows).toHaveLength(7);
    expect(b.handRoll?.insight).not.toBeNull();
    const pitfalls = b.pitfalls?.items ?? [];
    expect(pitfalls).toHaveLength(8);
    expect(pitfalls.map((p) => p.severity)).toEqual([
      'CRITICAL',
      'CRITICAL',
      'CRITICAL',
      'HIGH',
      'HIGH',
      'MEDIUM',
      'MEDIUM',
      'MEDIUM',
    ]);
    expect(pitfalls.map((p) => p.code)).toEqual(['F1', 'F2', 'F3', 'F4', 'F5', 'F8', 'F9', null]);
    expect(pitfalls[0].title).toContain('unmounted shed');
    expect(pitfalls[0].rows[0].label).toBe('What goes wrong');
  });

  it('questions, environment and sources', () => {
    expect(b.questions?.items).toHaveLength(4);
    expect(b.questions?.items.every((q) => !q.resolved)).toBe(true);
    expect(b.questions?.items[0].body.length).toBeGreaterThan(0);
    expect(b.environment?.rows).toHaveLength(15);
    expect(b.environment?.rows.filter((r) => r.available === 'no')).toHaveLength(4);
    expect(b.environment?.rows.filter((r) => r.blocking)).toHaveLength(3);
    expect(b.sources?.tiers.map((t) => t.items.length)).toEqual([11, 5, 5]);
  });

  it('every ## is rendered or listed in sourceOnly', () => {
    const listed = new Set(b.sourceOnly.map((s) => s.heading));
    for (const section of b.sections) {
      expect(section.rendered || listed.has(section.heading)).toBe(true);
    }
  });
});

describe('extractResearchBriefing — audit shapes', () => {
  it('NA_AUDIT: not applicable, no rows, prose lines kept', () => {
    const b = extractResearchBriefing(NA_AUDIT);
    expect(b.audit?.applicable).toBe(false);
    expect(b.audit?.rows).toHaveLength(0);
    expect(b.audit?.proseLines).toHaveLength(3);
    expect(b.audit?.proseLines[0].startsWith('**Not applicable.**')).toBe(true);
    expect(b.audit?.proseLines[1]).toContain('Packages removed due to [SLOP]');
    expect(b.audit?.proseLines[2]).toContain('Packages flagged as suspicious [SUS]');
  });

  it('SYNTHETIC_SLOP: one removed entry with reason and replacement', () => {
    const b = extractResearchBriefing(SYNTHETIC_SLOP);
    expect(b.audit?.rows.filter((r) => r.verdict === 'SLOP')).toHaveLength(1);
    expect(b.audit?.removed).toHaveLength(1);
    expect(b.audit?.removed[0]).toMatchObject({
      name: 'left-pad-ng',
      age: '3d',
      downloads: '212',
      repo: '—',
      rule: 'slop-name',
      reason: 'typosquat of left-pad',
      replacement: '`left-pad`',
    });
    expect(b.audit?.susNote).toBeNull();
  });
});

describe('extractResearchBriefing — pitfalls', () => {
  it('parses labels on consecutive lines into four labelled rows', () => {
    const b = extractResearchBriefing(PITFALL_LABEL_LINES);
    const rows = b.pitfalls?.items[0].rows ?? [];
    expect(rows.map((r) => r.label)).toEqual([
      'What goes wrong',
      'Why it happens',
      'How to avoid',
      'Warning signs',
    ]);
  });

  it('parses the SP phases/04 numbered-list shape into 11 titled pitfalls', () => {
    const b = extractResearchBriefing(LS04_NUMBERED_PITFALLS);
    const items = b.pitfalls?.items ?? [];
    expect(items).toHaveLength(11);
    expect(items[0].title).toBe('D-05 delete-on-drop contradiction.');
    expect(items[0].number).toBe(1);
    expect(items[10].number).toBe(11);
    expect(items.every((p) => p.severity === null)).toBe(true);
  });

  it('a parenthetical that is not a severity or code becomes a tag', () => {
    const b = extractResearchBriefing('## Common Pitfalls\n\n### Pitfall 3 (new this session): Something odd\n\n**What goes wrong:** x\n');
    const pitfall = b.pitfalls?.items[0];
    expect(pitfall?.severity).toBeNull();
    expect(pitfall?.code).toBeNull();
    expect(pitfall?.tag).toBe('new this session');
    expect(pitfall?.title).toBe('Something odd');
  });
});

describe('fence awareness', () => {
  it('a fenced ### or ## line never starts a section', () => {
    const body = '## A\n\n```\n### Q1 — not a heading\n## x\n```\n\n### R\ntext\n';
    expect(splitFenceAware(body, 3).map((s) => s.heading)).toEqual(['R']);
    expect(splitFenceAware(body, 2).map((s) => s.heading)).toEqual(['A']);
  });

  it('a tilde fence and an indented fence hide headings too', () => {
    const body = '## A\n~~~\n## nope\n~~~\n1. item\n   ```\n   ## still nope\n   ```\n## B\n';
    expect(splitFenceAware(body, 2).map((s) => s.heading)).toEqual(['A', 'B']);
  });

  it('an unknown ### inside a known ## lands in sourceOnly as Parent › Child', () => {
    const body = [
      '# Phase 3: Loans - Research',
      '',
      '## Architecture Patterns',
      '',
      'Loans are recorded before a tool leaves the shed.',
      '',
      '### Deposit Handling (Claude\'s Discretion - recommendation)',
      '',
      'Hold the deposit until the tool comes back.',
      '',
    ].join('\n');
    const b = extractResearchBriefing(body);
    expect(b.sourceOnly.map((s) => s.label)).toContain(
      "Architecture Patterns › Deposit Handling (Claude's Discretion - recommendation)",
    );
  });

  it('a column-zero parser keeps indented bullets and fences inside their item', () => {
    const entries = parseColumnZero(
      '1. **First**\n   - What we know: a\n   - What is unclear: b\n   ```bash\n   1. not an item\n   ```\n2. **Second** RESOLVED\n',
    );
    const items = entries.filter((e) => e.type === 'item');
    expect(items).toHaveLength(2);
    expect(items[0].type === 'item' && items[0].rest.length).toBe(5);
  });
});

describe('confidenceLevelOf', () => {
  it.each([
    ['HIGH (architecture, domain schema)', 'HIGH'],
    ['HIGH for repository architecture; MEDIUM for current external-library guidance', 'MIXED'],
    ['HIGH on the MiniSearch API surface; MEDIUM on UI-shell specifics; LOW/ASSUMED on a', 'MIXED'],
    ['MEDIUM-HIGH (crate versions … MEDIUM …)', 'MEDIUM-HIGH'],
    ['MEDIUM — HIGH on the TOCTOU mechanism', 'MEDIUM'],
    ['MEDIUM-HIGH — the hubctl rc HTTP API', 'MEDIUM-HIGH'],
    ['HIGH for codebase architecture and ZIP API; MEDIUM for production-tunnel behavior', 'MIXED'],
    ['LOW-MEDIUM', 'MEDIUM-LOW'],
    ['**HIGH**', 'HIGH'],
    ['unrated for now', null],
  ])('%s → %s', (line, level) => {
    expect(confidenceLevelOf(line)).toBe(level);
  });
});

describe('validUntilShort', () => {
  it.each([
    ['2026-09-01 for package versions; architecture remains valid until…', '2026-09-01'],
    ['30 days (stable codebase, no external drift)', '30 days'],
    ['~2026-08-16 (30 days) for the stack. Hardware findings are perishable', '~2026-08-16'],
    ['No expiry driver (single-file, in-repo) — re-verify on globals.css change', 'No expiry driver'],
  ])('%s → %s', (text, short) => {
    expect(validUntilShort(text)).toBe(short);
  });
});

describe('robustness (T-3x3-02, T-3x3-04)', () => {
  // A fixed millisecond budget flakes under parallel load and proves nothing about the shape of the cost
  // (T-3x3-02, Pitfall 11). Each hostile shape is built at size n and at 8n and timed with measureGrowth:
  // a linear scan reads about 8, a quadratic one about 64. Inputs are built in make(), outside the timed
  // region. The 200,000-character single line stays below as a no-throw sentinel.
  const PATHOLOGICAL_UNIT = '**`[VERIFIED: x|(├── Pitfall 1 ( - **D-01:** ┌─ ';
  const pathologicalLine = (size: number): string =>
    PATHOLOGICAL_UNIT.repeat(Math.ceil(size / PATHOLOGICAL_UNIT.length)).slice(0, size);
  const pathologicalBody = (size: number): string => {
    const body = pathologicalLine(size);
    return `## Summary\n${body}\n## Common Pitfalls\n### Pitfall 1 (${body}): x\n${body}`;
  };

  it('a 200,000-character pathological single line extracts without throwing', () => {
    const b = extractResearchBriefing(pathologicalBody(200_000));
    expect(b.sections.length).toBe(2);
  });

  it('a pathological single line grows no faster than linearly', () => {
    const growth = measureGrowth({ make: pathologicalBody, run: (input) => void extractResearchBriefing(input) });
    expect(
      growth.ratio,
      `single line: ${growth.t1.toFixed(2)}ms at ${growth.n} characters, ${growth.t2.toFixed(2)}ms at 8x`,
    ).toBeLessThan(GROWTH_LIMIT);
  });

  it('many small pathological sections grow no faster than linearly', () => {
    const chunk = '## Standard Stack\n| a | b |\n|---|---|\n| ' + '`x` [WARNING: '.repeat(200) + ' |\n';
    // Size here counts sections, not characters: 25 sections is about 70 KB, so 8x stays near 560 KB.
    const growth = measureGrowth({
      make: (sections) => chunk.repeat(sections),
      run: (input) => void extractResearchBriefing(input),
      startSize: 25,
      maxSize: 1600,
    });
    expect(
      growth.ratio,
      `small sections: ${growth.t1.toFixed(2)}ms at ${growth.n} sections, ${growth.t2.toFixed(2)}ms at 8x`,
    ).toBeLessThan(GROWTH_LIMIT);
  });

  it('never throws on empty or degenerate input', () => {
    for (const body of ['', '\n\n', '# ', '##', '###\n', '## \n', '```', '|', '| |\n|-|\n| |\n']) {
      expect(() => extractResearchBriefing(body)).not.toThrow();
    }
  });

  it('ResearchHandler.parse on garbage returns without throwing', () => {
    const ref: ArtifactRef = {
      path: '.planning/phases/01-x/01-RESEARCH.md',
      kind: 'research',
      fileClass: 'text',
      sizeBytes: 0,
      location: 'phase',
      phaseIdentity: null,
      milestoneVersion: null,
      quickTaskId: null,
    };
    const content = 'A NUL \u0000 here\n\n###\n\n## Standard Stack\n| |\n|---|\n| |\n\n```\nunclosed fence\n## Summary\n';
    const raw: RawArtifact = { path: ref.path, content, mtimeMs: 0, size: content.length };
    const result = ResearchHandler.parse(raw, ref);
    expect(result.title).toBeTruthy();
    expect(result.structured).toBeDefined();
  });

  it('ResearchHandler matches the RESEARCH token and adds structured.briefing', () => {
    const ref: ArtifactRef = {
      path: '.planning/phases/01-x/01-RESEARCH.md',
      kind: 'research',
      fileClass: 'text',
      sizeBytes: 0,
      location: 'phase',
      phaseIdentity: null,
      milestoneVersion: null,
      quickTaskId: null,
    };
    expect(ResearchHandler.match(ref)).toBe(true);
    expect(ResearchHandler.match({ ...ref, path: '.planning/phases/01-x/01-CONTEXT.md' })).toBe(false);
    const content = '# Phase 1: X - Research\n\n**Researched:** 2026-01-01\n\n## Summary\n\nOne.\n';
    const result = ResearchHandler.parse({ path: ref.path, content, mtimeMs: 0, size: content.length }, ref);
    const briefing = (result.structured as { briefing?: { meta: { title: string } } }).briefing;
    expect(briefing?.meta.title).toBe('X');
  });
});

describe('extractResearchBriefing — Lendshed v1.0/02 (committed fixture file)', () => {
  // Every number below was counted with grep/awk in the fixture file itself (R5), then compared with the extractor.
  it('matches the pinned anchors', () => {
    const b = extractResearchBriefing(readFileSync(FX02, 'utf8'));
    expect(b.meta.confidence?.level).toBe('HIGH');
    expect(b.meta.breakdown).toHaveLength(6);
    expect(b.meta.preamble).toHaveLength(1);
    const [core, supporting] = b.stack?.groups ?? [];
    expect(core.packages).toHaveLength(6);
    expect(supporting.packages).toHaveLength(3);
    expect(b.stack?.alternatives).toHaveLength(6);
    expect(b.audit?.rows).toHaveLength(4);
    expect(b.audit?.rows.filter((r) => !r.plainApproval)).toHaveLength(4);
    expect(b.audit?.extraNotes).toHaveLength(2);
    expect(b.architecture?.patterns).toHaveLength(3);
    expect(b.architecture?.antiPatterns).toHaveLength(6);
    expect(b.handRoll?.rows).toHaveLength(6);
    expect(b.pitfalls?.items).toHaveLength(8);
    expect(b.questions?.items).toHaveLength(4);
    expect(b.environment?.rows).toHaveLength(14);
    expect(b.environment?.rows.filter((r) => r.available === 'no')).toHaveLength(4);
    expect(b.environment?.rows.filter((r) => r.blocking)).toHaveLength(3);
    expect(b.sources?.tiers.map((t) => t.items.length)).toEqual([10, 5, 4]);
    expect(b.userConstraints?.lockedGroups.reduce((n, g) => n + g.ids.length, 0)).toBe(11);
    expect(b.sourceOnly.map((s) => s.label)).toEqual([
      'Installation',
      'Version verification',
      'Code Examples',
      'State of the Art',
      'Assumptions Log',
      'Validation Architecture',
      'Security Domain',
      'Project Constraints (from CLAUDE.md / AGENTS.md)',
      'Metadata',
    ]);
  });
});

describe('pitfall code languages (quick-261024-o3h)', () => {
  it('records each code entry\'s fence language, aligned with code', () => {
    const body = [
      '## Common Pitfalls',
      '',
      '### Pitfall 1: Drift',
      '',
      '**What goes wrong:** it drifts.',
      '',
      '```ts',
      'const a = 1;',
      '```',
      '',
      '```',
      'src/',
      '```',
      '',
      '| A | B |',
      '| --- | --- |',
      '| 1 | 2 |',
      '',
    ].join('\n');
    const briefing = extractResearchBriefing(body);
    const row = briefing.pitfalls?.items[0].rows[0];
    expect(row?.code).toHaveLength(3);
    expect(row?.codeLangs).toEqual(['ts', '', '']);
  });
});

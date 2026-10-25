// SEC-02 / T-05-02 / T-05-13 and 05-SECURITY closing note 2: the "no raw-HTML injection in the
// web layer" check used to be a one-shot grep. This is the standing version. It walks every
// .ts/.tsx file under src/web with comments blanked, counts each raw-HTML sink shape, and asserts
// the findings equal ALLOWED exactly — the single dangerouslySetInnerHTML site that renders the
// server-sanitized markdown. A new sink anywhere else fails the test; so does an allowlist entry
// that has gone stale (file gone, or count no longer matching), which keeps the list honest.
//
// Reads are not injection: `const x = el.innerHTML` and `el.innerHTML === y` are never reported,
// only assignments. Comments that merely mention a sink are blanked first and never count.
//
// The positive controls write planted files to a mkdtemp directory (never src/) and prove the
// scanner reports every sink shape, so a regex that silently stopped matching cannot pass.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { blankComments, walkSource } from '../helpers/source-scan.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

interface Sink {
  name: string;
  pattern: RegExp;
}

// The eight raw-HTML injection shapes in React and DOM code. Patterns are global so a match count
// is a finding count. Assignments exclude `==`, `===` and `=>` so comparisons are not reported.
const SINKS: Sink[] = [
  { name: 'dangerouslySetInnerHTML', pattern: /\bdangerouslySetInnerHTML\b/g },
  { name: 'innerHTML assignment', pattern: /\.innerHTML\s*\+?=(?![=>])/g },
  { name: 'outerHTML assignment', pattern: /\.outerHTML\s*\+?=(?![=>])/g },
  { name: 'insertAdjacentHTML', pattern: /\binsertAdjacentHTML\s*\(/g },
  { name: 'document.write', pattern: /\bdocument\s*\.\s*write(?:ln)?\s*\(/g },
  { name: 'createContextualFragment', pattern: /\bcreateContextualFragment\s*\(/g },
  { name: 'setHTMLUnsafe', pattern: /\bsetHTMLUnsafe\s*\(/g },
  { name: 'srcDoc attribute', pattern: /\bsrcdoc\s*[=:]/gi },
];

interface Finding {
  file: string;
  sink: string;
  count: number;
}

/** Counts every sink in `source` after blanking comments. Sinks with zero matches are omitted. */
function scanSource(source: string): Array<{ sink: string; count: number }> {
  const code = blankComments(source);
  const found: Array<{ sink: string; count: number }> = [];
  for (const { name, pattern } of SINKS) {
    const matches = code.match(pattern);
    if (matches && matches.length > 0) found.push({ sink: name, count: matches.length });
  }
  return found;
}

// The one sanctioned raw-HTML site: ArtifactPage renders the server-sanitized HTML string.
const ALLOWED: Finding[] = [
  { file: 'src/web/pages/artifact-page.tsx', sink: 'dangerouslySetInnerHTML', count: 1 },
];

function collectFindings(): Finding[] {
  const findings: Finding[] = [];
  for (const file of walkSource(['src/web'], ['.ts', '.tsx'])) {
    const source = readFileSync(join(REPO_ROOT, file), 'utf8');
    for (const { sink, count } of scanSource(source)) findings.push({ file, sink, count });
  }
  return findings.sort((a, b) => `${a.file}|${a.sink}`.localeCompare(`${b.file}|${b.sink}`));
}

describe('raw-HTML guard over src/web', () => {
  it('finds raw-HTML sinks only at the allowlisted site', () => {
    expect(collectFindings()).toEqual(ALLOWED);
  });

  it('keeps the allowlist at exactly one entry', () => {
    expect(ALLOWED).toHaveLength(1);
  });

  it('fails on a stale allowlist entry (file or count no longer matching)', () => {
    const live = collectFindings();
    const staleCount = [{ ...ALLOWED[0]!, count: 2 }];
    const staleFile = [{ ...ALLOWED[0]!, file: 'src/web/pages/gone-page.tsx' }];
    expect(live).not.toEqual(staleCount);
    expect(live).not.toEqual(staleFile);
  });

  describe('positive control — planted files written to a mkdtemp directory, never src/', () => {
    let plantedRoot: string;

    afterEach(async () => {
      if (plantedRoot) await rm(plantedRoot, { recursive: true, force: true });
    });

    const ALL_EIGHT = [
      `const a = <div dangerouslySetInnerHTML={{ __html: html }} />;`,
      `el.innerHTML = html;`,
      `el.outerHTML = html;`,
      `el.insertAdjacentHTML('beforeend', html);`,
      `document.write(html);`,
      `range.createContextualFragment(html);`,
      `el.setHTMLUnsafe(html);`,
      `const f = <iframe srcDoc={html} />;`,
    ];

    it('reports all eight sinks in a planted file', async () => {
      plantedRoot = await mkdtemp(join(tmpdir(), 'labelore-raw-html-guard-'));
      const planted = join(plantedRoot, 'planted.tsx');
      await writeFile(planted, `${ALL_EIGHT.join('\n')}\n`, 'utf8');

      const found = scanSource(readFileSync(planted, 'utf8'));
      expect(found.map((f) => f.sink).sort()).toEqual(SINKS.map((s) => s.name).sort());
      expect(found.every((f) => f.count === 1)).toBe(true);
    });

    it('counts a second sink of the same shape in the same file', async () => {
      plantedRoot = await mkdtemp(join(tmpdir(), 'labelore-raw-html-guard-'));
      const planted = join(plantedRoot, 'twice.tsx');
      await writeFile(
        planted,
        `const a = <i dangerouslySetInnerHTML={{ __html: x }} />;\nconst b = <i dangerouslySetInnerHTML={{ __html: y }} />;\n`,
        'utf8',
      );
      expect(scanSource(readFileSync(planted, 'utf8'))).toEqual([
        { sink: 'dangerouslySetInnerHTML', count: 2 },
      ]);
    });

    it('reports nothing when every sink appears only inside comments', async () => {
      plantedRoot = await mkdtemp(join(tmpdir(), 'labelore-raw-html-guard-'));
      const planted = join(plantedRoot, 'commented.tsx');
      const commented = [
        ...ALL_EIGHT.map((line) => `// ${line}`),
        `/*`,
        ...ALL_EIGHT.map((line) => ` * ${line}`),
        ` */`,
      ].join('\n');
      await writeFile(planted, `${commented}\nexport const ok = 1;\n`, 'utf8');

      expect(scanSource(readFileSync(planted, 'utf8'))).toEqual([]);
    });

    it('does not report reads or comparisons of innerHTML and outerHTML', async () => {
      plantedRoot = await mkdtemp(join(tmpdir(), 'labelore-raw-html-guard-'));
      const planted = join(plantedRoot, 'reads.ts');
      await writeFile(
        planted,
        [
          `const x = el.innerHTML;`,
          `const y = el.outerHTML;`,
          `if (el.innerHTML === y) {}`,
          `if (el.innerHTML == y) {}`,
          `if (el.innerHTML !== y) {}`,
          `const z = el.innerHTML.length > 3;`,
          `const m = nodes.map((n) => n.outerHTML);`,
        ].join('\n'),
        'utf8',
      );
      expect(scanSource(readFileSync(planted, 'utf8'))).toEqual([]);
    });
  });
});

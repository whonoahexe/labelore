// Builds the sketch-017 synthetic "open threats" SECURITY doc from a real one (SP P3).
// The replacements are copied verbatim from `.planning/sketches/017-security-page/gen-data.mjs`
// (`synthesize`): SP P3 mid-audit — two high threats open (blocking), one low open below the
// threshold, a second audit row, sign-off unticked. The app never serves `.planning/sketches/**`
// and 017 has no synthetic markdown file, so this writes one into a scratch target.
// Usage: node make-synthetic.mjs <source SECURITY.md> <output path>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function synthesize(text) {
  let n = 0;
  return text
    .replace(/^status: .*$/m, 'status: open').replace(/^threats_open: .*$/m, 'threats_open: 2')
    .replace(/^(\| T-\d+-\d+ \|.*\| high \| mitigate \|.*\| )closed( \|)$/gm, (m, a, b) => (n++ === 2 || n === 6) ? `${a}open${b}` : m)
    .replace(/^(\| T-\d+-\d+ \|.*\| low \| mitigate \|.*\| )closed( \|)$/m, '$1open — below high threshold (non-blocking)$2')
    .replace(/(\| Audit Date[^\n]*\n\|[-| ]+\|\n)/, '$1| 2026-08-19 | 42 | 39 | 3 (2 blocking) | /gsd-secure-phase (first pass) |\n')
    .replace(/- \[x\]/g, '- [ ]').replace(/\*\*Approval:\*\*.*/, '**Approval:** pending — two high threats open');
}

const [source, output] = process.argv.slice(2);
if (source && output) {
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, synthesize(readFileSync(source, 'utf8')));
}

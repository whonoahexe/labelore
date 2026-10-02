// The sketch-017 synthetic open-threats SECURITY doc, derived from studio-portal's phase 03 doc.
/** The sketch's synthesize(), copied from `.planning/sketches/017-security-page/gen-data.mjs`: SP
 * P3 mid-audit — two high threats open (blocking), a second audit row, sign-off unticked. */
export function synthesize(text: string): string {
  let n = 0;
  return text
    .replace(/^status: .*$/m, 'status: open')
    .replace(/^threats_open: .*$/m, 'threats_open: 2')
    .replace(/^(\| T-\d+-\d+ \|.*\| high \| mitigate \|.*\| )closed( \|)$/gm, (m, a, b) =>
      n++ === 2 || n === 6 ? `${a}open${b}` : m,
    )
    .replace(
      /^(\| T-\d+-\d+ \|.*\| low \| mitigate \|.*\| )closed( \|)$/m,
      '$1open — below high threshold (non-blocking)$2',
    )
    .replace(
      /(\| Audit Date[^\n]*\n\|[-| ]+\|\n)/,
      '$1| 2026-08-19 | 42 | 39 | 3 (2 blocking) | /gsd-secure-phase (first pass) |\n',
    )
    .replace(/- \[x\]/g, '- [ ]')
    .replace(/\*\*Approval:\*\*.*/, '**Approval:** pending — two high threats open');
}

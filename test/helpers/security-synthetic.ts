// The sketch-017 synthetic open-threats SECURITY doc, derived from the made-up Lendshed phase 03
// SECURITY register (test/fixtures/lendshed/.planning/phases/03-account-admin-and-sessions/03-SECURITY.md).
/** The sketch's synthesize(), adapted to Lendshed phase 03: a mid-audit state with two high threats
 * open (blocking), a second audit row and the sign-off unticked. The third and sixth high-severity
 * mitigated rows are the ones reopened (T-03-03 and T-03-11 in the Lendshed file). */
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
      '$1| 2026-03-17 | 30 | 27 | 3 (2 blocking) | /gsd-secure-phase (first pass) |\n',
    )
    .replace(/- \[x\]/g, '- [ ]')
    .replace(/\*\*Approval:\*\*.*/, '**Approval:** pending — two high threats open');
}

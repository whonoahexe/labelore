import { readFileSync } from 'node:fs';
import { it } from 'vitest';
import { extractUiSpec } from '../src/planning-repo/handlers/ui-spec-contract.ts';
it('p', () => {
  const s = extractUiSpec(readFileSync(process.env.F as string, 'utf8'));
  console.log(
    JSON.stringify({
      meta: s.meta,
      title: s.title,
      tag: s.tagline,
      dims: s.signoff?.dims.length,
      appr: s.signoff?.approval,
      notes: s.signoff?.hasNotes,
      sp: s.spacing?.rows.length,
      ty: s.typography?.rows.length,
      co: s.color?.rows.length,
      reg: s.registry?.rows.length,
      ds: s.designSystem?.map((r) => r.key),
      acc: s.reserved.accent?.length,
      des: s.reserved.destructive?.length,
      unclaimed: s.sections.filter((x) => !x.claimed).map((x) => x.heading),
      cov: s.considerations?.coverage,
      els: s.considerations?.elements.map((e) => [e.key, e.name, e.kinds, e.rows.length]),
    }),
  );
});

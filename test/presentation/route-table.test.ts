import { describe, expect, it } from 'vitest';
import { buildUrl, parseRoutePath } from '../../src/presentation/routes.ts';
import { buildRouteTable } from '../../src/presentation/route-table.ts';
import { loadShapesProject } from '../helpers/shapes-project.ts';

describe('route table - tracer (Shapes)', () => {
  it('takes a phase document from its path to a readable url and back to the same path', async () => {
    const { snapshot } = await loadShapesProject();
    const table = buildRouteTable(snapshot.project);
    const path = '.planning/phases/01-kiln-bookings/01-CONTEXT.md';

    const url = table.urlOf(path);
    expect(url).toBe('/v1.1/phase-1/context');

    const parsed = parseRoutePath(url as string);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.route.kind).toBe('document');
    expect(buildUrl(parsed.route)).toBe(url);

    expect(table.pathOf(url as string)).toBe(path);
  });
});

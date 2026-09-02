// The single heading-slug algorithm shared by the artifact renderer (heading `id` attributes,
// src/rendering/markdown.ts) and the search snippet extractor (heading-anchor resolution,
// src/presentation/search.ts). Extracted verbatim from markdown.ts (03-02-PLAN.md) so there is
// exactly one slug implementation in the codebase — a fragment produced anywhere always matches an
// `id` the renderer actually emitted.
//
// Zero imports, deliberately: this is what lets a presentation-layer module (search.ts) depend on
// this function without inverting the established rendering -> presentation dependency direction.
export function stableSlug(text: string): string {
  return (
    text
      .normalize('NFKD')
      .replace(/\p{Mark}/gu, '')
      .toLowerCase()
      .trim()
      .replace(/[^\p{Letter}\p{Number}\s_-]/gu, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'section'
  );
}

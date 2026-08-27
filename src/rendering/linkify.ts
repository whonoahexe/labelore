import type { Element, ElementContent, Root, RootContent, Text } from 'hast';
import type { VFile } from 'vfile';
import {
  resolvePresentationReference,
  type ReferencePreviewDto,
  type ReferenceRegistry,
} from '../presentation/references.ts';

const REFERENCE_TOKEN = /Phase\s+[\p{Letter}\p{Number}.]+|[A-Z][A-Z0-9]+-\d+|\d+(?:\.\d+)?-\d+/gu;
const IDENTIFIER_EDGE = /[\p{Letter}\p{Number}_-]/u;

interface ReferenceRenderContext {
  referenceRegistry?: ReferenceRegistry;
  referenceArtifactPath?: string;
  references?: Map<string, ReferencePreviewDto>;
}

interface ReferenceFileData {
  renderContext?: ReferenceRenderContext;
}

function classesOf(element: Element): string[] {
  const value: unknown = element.properties.className;
  if (Array.isArray(value)) return value.map(String);
  return typeof value === 'string' ? value.split(/\s+/).filter(Boolean) : [];
}

function skipped(element: Element): boolean {
  return (
    ['a', 'code', 'pre'].includes(element.tagName) ||
    classesOf(element).some((value) => value === 'mermaid' || value.startsWith('language-mermaid'))
  );
}

function control(preview: ReferencePreviewDto, text: string): Element {
  return {
    type: 'element',
    tagName: 'button',
    properties: {
      type: 'button',
      className: ['document-reference'],
      dataReferenceKey: preview.key,
      ariaLabel: `Preview ${preview.identity}`,
    },
    children: [{ type: 'text', value: text }],
  };
}

function linkifiedText(
  node: Text,
  registry: ReferenceRegistry,
  artifactPath: string,
  used: Map<string, ReferencePreviewDto>,
): ElementContent[] | null {
  const output: ElementContent[] = [];
  let cursor = 0;
  let changed = false;
  for (const match of node.value.matchAll(REFERENCE_TOKEN)) {
    const index = match.index;
    const raw = match[0];
    const previous = index > 0 ? node.value[index - 1] : '';
    const next = node.value[index + raw.length] ?? '';
    if ((previous && IDENTIFIER_EDGE.test(previous)) || (next && IDENTIFIER_EDGE.test(next))) {
      continue;
    }
    const preview = resolvePresentationReference(registry, raw, artifactPath);
    if (!preview) continue;
    if (index > cursor) output.push({ type: 'text', value: node.value.slice(cursor, index) });
    output.push(control(preview, raw));
    used.set(preview.key, preview);
    cursor = index + raw.length;
    changed = true;
  }
  if (!changed) return null;
  if (cursor < node.value.length) output.push({ type: 'text', value: node.value.slice(cursor) });
  return output;
}

/** Adds trusted controls to resolved text only; source-authored active content is already gone. */
export function rehypeResolvedReferences() {
  return function transform(tree: Root, file: VFile): void {
    const context = (file.data as ReferenceFileData).renderContext;
    const registry = context?.referenceRegistry;
    const artifactPath = context?.referenceArtifactPath;
    const used = context?.references;
    if (!registry || !artifactPath || !used) return;
    const resolvedRegistry = registry;
    const resolvedArtifactPath = artifactPath;
    const resolvedUsed = used;

    function walk(parent: Root | Element): void {
      for (let index = 0; index < parent.children.length; index += 1) {
        const child: RootContent | ElementContent = parent.children[index];
        if (child.type === 'element') {
          if (!skipped(child)) walk(child);
          continue;
        }
        if (child.type !== 'text') continue;
        const replacement = linkifiedText(
          child,
          resolvedRegistry,
          resolvedArtifactPath,
          resolvedUsed,
        );
        if (!replacement) continue;
        parent.children.splice(index, 1, ...replacement);
        index += replacement.length - 1;
      }
    }

    walk(tree);
  };
}

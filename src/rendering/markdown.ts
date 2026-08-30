import type { Element, ElementContent, Root, RootContent } from 'hast';
import type { Root as MdastRoot } from 'mdast';
import { defaultSchema } from 'hast-util-sanitize';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { createHighlighter, type Highlighter } from 'shiki';
import { unified, type Processor } from 'unified';
import type { VFile } from 'vfile';
import type { Artifact } from '../domain/model.ts';
import type { ReferencePreviewDto, ReferenceRegistry } from '../presentation/references.ts';
import { rehypeResolvedReferences } from './linkify.ts';
import { isRecognizedPlanTag, segmentPlanBody, type PlanSegment } from './plan-segments.ts';

const MAX_MERMAID_SOURCE_BYTES = 256 * 1024;
const PLAN_ATTRIBUTE_NAMES = ['type', 'gate', 'tdd'] as const;
const MERMAID_START =
  /^(?:---[\s\S]*?---\s*)?(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph|requirementDiagram|quadrantChart|xychart-beta|block-beta|packet-beta|kanban|architecture-beta|sankey-beta)\b/i;
const HEADING_TAG = /^h([1-6])$/;

export interface RenderedHeading {
  id: string;
  depth: number;
  text: string;
}

export interface RenderedDocument {
  html: string;
  headings: RenderedHeading[];
  warnings: string[];
  empty: boolean;
  references?: ReferencePreviewDto[];
}

export interface ArtifactRenderer {
  render(
    artifact: Pick<Artifact, 'kind' | 'body'> & Partial<Pick<Artifact, 'path'>>,
    options?: ArtifactRenderOptions,
  ): Promise<RenderedDocument>;
}

export interface ArtifactRenderOptions {
  referenceRegistry?: ReferenceRegistry;
}

interface RenderContext {
  headingCounts: Map<string, number>;
  headings: RenderedHeading[];
  warnings: string[];
  referenceRegistry?: ReferenceRegistry;
  referenceArtifactPath?: string;
  references: Map<string, ReferencePreviewDto>;
}

interface RenderFileData {
  renderContext?: RenderContext;
}

type MarkdownProcessor = Processor<MdastRoot, MdastRoot, Root, Root, string>;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function textOf(node: RootContent | ElementContent): string {
  if (node.type === 'text') return node.value;
  if ('children' in node) return node.children.map((child) => textOf(child)).join('');
  return '';
}

function classesOf(element: Element): string[] {
  const value: unknown = element.properties.className;
  if (Array.isArray(value)) return value.map(String);
  return typeof value === 'string' ? value.split(/\s+/).filter(Boolean) : [];
}

function languageOf(code: Element): string {
  const languageClass = classesOf(code).find((value) => value.startsWith('language-'));
  return languageClass?.slice('language-'.length).toLowerCase() || 'text';
}

function stableSlug(text: string): string {
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

function contextOf(file: VFile): RenderContext {
  const data = file.data as RenderFileData;
  if (!data.renderContext) throw new Error('Renderer context is missing');
  return data.renderContext;
}

function isMermaidSourceValid(source: string): boolean {
  return source.trim().length > 0 && MERMAID_START.test(source.trimStart());
}

function plainCodeBlock(source: string, rejectedReason: string): Element {
  return {
    type: 'element',
    tagName: 'pre',
    properties: { className: ['mermaid-fallback'], dataMermaidRejected: rejectedReason },
    children: [
      {
        type: 'element',
        tagName: 'code',
        properties: { className: ['language-mermaid'] },
        children: [{ type: 'text', value: source }],
      },
    ],
  };
}

async function enrichTree(root: Root, file: VFile, highlighter: Highlighter): Promise<void> {
  const context = contextOf(file);

  async function walk(parent: Root | Element): Promise<void> {
    for (let index = 0; index < parent.children.length; index += 1) {
      const child = parent.children[index];
      if (child.type !== 'element') continue;

      const headingMatch = HEADING_TAG.exec(child.tagName);
      if (headingMatch) {
        const text = textOf(child).trim();
        const base = stableSlug(text);
        const duplicate = context.headingCounts.get(base) ?? 0;
        context.headingCounts.set(base, duplicate + 1);
        const id = duplicate === 0 ? base : `${base}-${duplicate}`;
        child.properties.id = id;
        child.children.push({
          type: 'element',
          tagName: 'button',
          properties: {
            type: 'button',
            className: ['heading-copy'],
            dataHeadingId: id,
            ariaLabel: `Copy link to ${text || 'section'}`,
          },
          children: [{ type: 'text', value: '#' }],
        });
        context.headings.push({ id, depth: Number(headingMatch[1]), text });
      }

      // REQUIREMENTS.md definitions are list items, not headings. Add a trusted,
      // deterministic anchor after sanitization so roadmap previews can deep-link to
      // the exact authored requirement without building Phase 3 traceability UI.
      if (child.tagName === 'li') {
        const requirement = textOf(child)
          .trim()
          .match(/^([A-Z][A-Z0-9]+-\d+)\b/u)?.[1];
        if (requirement && !child.properties.id) {
          child.properties.id = `requirement-${requirement.toLowerCase()}`;
        }
      }

      if (child.tagName === 'pre') {
        const code = child.children.find(
          (value): value is Element => value.type === 'element' && value.tagName === 'code',
        );
        if (code) {
          const language = languageOf(code);
          const source = textOf(code).replace(/\n$/, '');
          if (language === 'mermaid') {
            const bytes = new TextEncoder().encode(source).byteLength;
            if (bytes > MAX_MERMAID_SOURCE_BYTES) {
              context.warnings.push('Mermaid source exceeds the 256 KiB execution cap.');
              parent.children[index] = plainCodeBlock(source, 'oversized');
            } else if (!isMermaidSourceValid(source)) {
              context.warnings.push(
                'Mermaid source is not a recognized diagram and was left as code.',
              );
              parent.children[index] = plainCodeBlock(source, 'invalid');
            } else {
              parent.children[index] = {
                type: 'element',
                tagName: 'pre',
                properties: {
                  className: ['mermaid'],
                  dataMermaidPending: 'true',
                  dataMermaidSecurity: 'strict',
                },
                children: [{ type: 'text', value: source }],
              };
            }
            continue;
          }

          const loadedLanguage = highlighter.getLoadedLanguages().includes(language)
            ? language
            : 'text';
          const highlighted = highlighter.codeToHast(source, {
            lang: loadedLanguage,
            themes: { light: 'github-light', dark: 'github-dark' },
            defaultColor: false,
          });
          const highlightedPre = highlighted.children.find(
            (value): value is Element => value.type === 'element' && value.tagName === 'pre',
          );
          if (highlightedPre) {
            highlightedPre.properties.dataHighlighted = 'shiki';
            parent.children[index] = highlightedPre;
            continue;
          }
        }
      }
      await walk(child);
    }
  }

  await walk(root);
}

function trustedEnrichment(highlighter: Highlighter) {
  return function plugin() {
    return async (tree: Root, file: VFile) => enrichTree(tree, file, highlighter);
  };
}

function createProcessor(highlighter: Highlighter): MarkdownProcessor {
  const schema = {
    ...defaultSchema,
    attributes: {
      ...defaultSchema.attributes,
      '*': [...(defaultSchema.attributes?.['*'] ?? []), 'className'],
      input: [...(defaultSchema.attributes?.input ?? []), 'checked', 'disabled', 'type'],
    },
  };

  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, schema)
    .use(rehypeResolvedReferences)
    .use(rehypeSlug)
    .use(trustedEnrichment(highlighter))
    .use(rehypeStringify);
}

function directChildren(segments: PlanSegment[], start: number, end: number): PlanSegment[] {
  const candidates = segments.filter((segment) => segment.start >= start && segment.end <= end);
  return candidates.filter(
    (candidate) =>
      !candidates.some(
        (other) =>
          other !== candidate &&
          other.start <= candidate.start &&
          other.end >= candidate.end &&
          (other.start < candidate.start || other.end > candidate.end),
      ),
  );
}

/**
 * Converts a PLAN wrapper tag name to a Title Case label — `execution_context` becomes
 * "Execution Context", `read_first` becomes "Read First". Used for every segment, recognized or
 * not, so there is no seam in presentation between the bespoke and generic paths.
 */
export function planSectionLabel(tag: string): string {
  return tag
    .split(/[_-]+/)
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function planSectionOpen(segment: PlanSegment): string {
  const attributes = PLAN_ATTRIBUTE_NAMES.flatMap((name) => {
    const value = segment.attributes[name];
    return value === undefined ? [] : [` data-plan-${name}="${escapeHtml(value)}"`];
  }).join('');
  // `data-plan-recognized` distinguishes the two paths for tests only — no stylesheet rule may
  // ever target it (UI-SPEC E15 "partial": no visual seam between recognised and unrecognised
  // sections).
  const recognized = isRecognizedPlanTag(segment.tag);
  return `<section class="plan-section plan-section-${escapeHtml(segment.tag)}" data-plan-section="${escapeHtml(segment.tag)}" data-plan-recognized="${recognized}"${attributes}><div class="plan-section-label">${escapeHtml(planSectionLabel(segment.tag))}</div>`;
}

async function renderMarkdownChunk(
  processor: MarkdownProcessor,
  source: string,
  context: RenderContext,
): Promise<string> {
  if (source.trim().length === 0) return '';
  try {
    const file = await processor.process({ value: source, data: { renderContext: context } });
    return String(file);
  } catch (error) {
    context.warnings.push(
      `Markdown fragment could not be rendered: ${error instanceof Error ? error.message : String(error)}`,
    );
    return `<pre class="render-fallback"><code>${escapeHtml(source)}</code></pre>`;
  }
}

async function renderPlanRange(
  processor: MarkdownProcessor,
  body: string,
  segments: PlanSegment[],
  start: number,
  end: number,
  context: RenderContext,
): Promise<string> {
  const children = directChildren(segments, start, end).sort(
    (left, right) => left.start - right.start || right.end - left.end,
  );
  const output: string[] = [];
  let cursor = start;

  for (const segment of children) {
    if (segment.start < cursor) continue;
    output.push(await renderMarkdownChunk(processor, body.slice(cursor, segment.start), context));
    if (segment.malformed) {
      const warning = segment.warning ?? `Malformed <${segment.tag}> wrapper`;
      context.warnings.push(warning);
      output.push(
        `<aside class="plan-segment-warning" role="note"><strong>PLAN wrapper warning:</strong> ${escapeHtml(warning)}</aside><pre class="plan-segment-literal"><code>${escapeHtml(segment.raw)}</code></pre>`,
      );
    } else {
      const inner = await renderPlanRange(
        processor,
        body,
        segments,
        segment.contentStart,
        segment.contentEnd,
        context,
      );
      output.push(planSectionOpen(segment));
      output.push(
        inner.trim().length > 0
          ? inner
          : '<p class="plan-section-empty">This section is intentionally empty.</p>',
      );
      output.push('</section>');
    }
    cursor = segment.end;
  }
  output.push(await renderMarkdownChunk(processor, body.slice(cursor, end), context));
  return output.join('');
}

async function buildRenderer(): Promise<ArtifactRenderer> {
  const highlighter = await createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: [
      'bash',
      'css',
      'html',
      'javascript',
      'json',
      'jsx',
      'markdown',
      'tsx',
      'typescript',
      'xml',
      'yaml',
    ],
  });
  const processor = createProcessor(highlighter);

  return Object.freeze({
    async render(
      input: Pick<Artifact, 'kind' | 'body'> & Partial<Pick<Artifact, 'path'>>,
      options: ArtifactRenderOptions = {},
    ): Promise<RenderedDocument> {
      const context: RenderContext = {
        headingCounts: new Map(),
        headings: [],
        warnings: [],
        referenceRegistry: options.referenceRegistry,
        referenceArtifactPath: input.path,
        references: new Map(),
      };
      const html =
        input.kind === 'plan'
          ? await renderPlanRange(
              processor,
              input.body,
              segmentPlanBody(input.body),
              0,
              input.body.length,
              context,
            )
          : await renderMarkdownChunk(processor, input.body, context);
      const references = [...context.references.values()];
      return {
        html,
        headings: context.headings,
        warnings: context.warnings,
        empty: html.trim().length === 0,
        ...(references.length === 0 ? {} : { references }),
      };
    },
  });
}

let sharedRenderer: Promise<ArtifactRenderer> | null = null;

/** Initializes one shared Shiki/highlighter lifecycle for all artifact renders in this process. */
export function createArtifactRenderer(): Promise<ArtifactRenderer> {
  sharedRenderer ??= buildRenderer();
  return sharedRenderer;
}

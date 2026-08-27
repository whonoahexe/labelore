import type { ReferencePreviewDto } from '../../presentation/references.ts';

export interface DocumentReferenceActivationEvent {
  type: string;
  key?: string;
  target: unknown;
  preventDefault(): void;
}

export interface DocumentReferenceTrigger {
  dataset: { referenceKey?: string };
  closest(selector: string): unknown;
  focus(): void;
}

export interface DocumentReferenceActivation<TTrigger extends DocumentReferenceTrigger> {
  trigger: TTrigger;
  preview: ReferencePreviewDto;
}

/** Converts delegated inert-HTML activation into authorized React preview state. */
export function handleDocumentReferenceActivation<TTrigger extends DocumentReferenceTrigger>(
  event: DocumentReferenceActivationEvent,
  previews: ReadonlyMap<string, ReferencePreviewDto>,
): DocumentReferenceActivation<TTrigger> | null {
  if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return null;
  if (event.type !== 'click' && event.type !== 'keydown') return null;
  const target = event.target as Partial<Pick<DocumentReferenceTrigger, 'closest'>> | null;
  if (!target || typeof target.closest !== 'function') return null;
  const trigger = target.closest('[data-reference-key]') as TTrigger | null;
  const key = trigger?.dataset.referenceKey;
  const preview = key ? previews.get(key) : null;
  if (!trigger || !preview) return null;
  event.preventDefault();
  return { trigger, preview };
}

export function restoreDocumentReferenceFocus(
  trigger: Pick<DocumentReferenceTrigger, 'focus'> | null,
): void {
  trigger?.focus();
}

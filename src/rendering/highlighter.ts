// The one highlighter module: fine-grained shiki (shiki/core), the Oniguruma engine with its WASM inlined,
// and only the 11 languages and 2 themes the renderer preloads. The full `shiki` entry bundles every
// grammar and theme (about 6 MB of the server bundle); the same grammar and theme files, loaded one by
// one, render the same output. Dev, the tests and the release bundle all import this module, so they
// run the same highlighter.
import { createHighlighterCore } from 'shiki/core';
import type { HighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';

export type Highlighter = HighlighterCore;

const LANGS = {
  bash: () => import('shiki/langs/bash.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  html: () => import('shiki/langs/html.mjs'),
  javascript: () => import('shiki/langs/javascript.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  jsx: () => import('shiki/langs/jsx.mjs'),
  markdown: () => import('shiki/langs/markdown.mjs'),
  tsx: () => import('shiki/langs/tsx.mjs'),
  typescript: () => import('shiki/langs/typescript.mjs'),
  xml: () => import('shiki/langs/xml.mjs'),
  yaml: () => import('shiki/langs/yaml.mjs'),
};

const THEMES = {
  'vitesse-light': () => import('shiki/themes/vitesse-light.mjs'),
  'vitesse-dark': () => import('shiki/themes/vitesse-dark.mjs'),
};

export async function createHighlighter(options: {
  themes: (keyof typeof THEMES)[];
  langs: (keyof typeof LANGS)[];
}): Promise<Highlighter> {
  return createHighlighterCore({
    themes: options.themes.map((name) => THEMES[name]()),
    langs: options.langs.map((name) => LANGS[name]()),
    engine: createOnigurumaEngine(import('shiki/wasm')),
  });
}

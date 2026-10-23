// Sketch 029: index.html = template.html + the shared CSS and helpers from 027's index.html, so the
// note sketches stay on one vocabulary with 027/028. Run: node .planning/sketches/029-note-gist/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const HERE = new URL('.', import.meta.url).pathname;
const src = readFileSync(`${HERE}../027-todo-page/index.html`, 'utf8');
const css = src.slice(src.indexOf('*, *::before'), src.indexOf('/* ============ A — ticket'));
const js = src.slice(src.indexOf('const esc ='), src.indexOf('function splitFile'));
const out = readFileSync(`${HERE}template.html`, 'utf8').replace('/*SHARED_CSS*/', () => css).replace('//SHARED_JS', () => js);
writeFileSync(`${HERE}index.html`, out);

// Phase 10 review round (10-REVIEW CR-01, CR-02, WR-01): every written form in which a person may put a value beside a
// variable name. Each form plants a tag that carries digits (so it can never read as a placeholder), and lists the
// strings that must be absent from anything the pages store or draw. The tests that guard value withholding share this
// list, so a form added here is checked at every layer (the mask, the Integrations lift, the User setup reader and the
// markup of both pages).

export interface WrittenForm {
  label: string;
  /** One line that writes the planted value(s) beside STRIPE_KEY (or TOKEN, A_B). */
  line: (tag: string) => string;
  /** The strings that must appear nowhere after masking. */
  secrets: (tag: string) => string[];
}

const one = (tag: string): string[] => [tag];
const three = (tag: string): string[] => [`${tag}-a`, `${tag}-b`, `${tag}-c`];

export const WRITTEN_FORMS: readonly WrittenForm[] = [
  { label: 'NAME=value', line: (t) => `STRIPE_KEY=${t}`, secrets: one },
  { label: 'list item NAME: value', line: (t) => `- STRIPE_KEY: ${t}`, secrets: one },
  { label: 'list item NAME=value', line: (t) => `- STRIPE_KEY=${t}`, secrets: one },
  { label: 'table row, two cells', line: (t) => `| STRIPE_KEY | ${t} |`, secrets: one },
  { label: 'table row, ticked name, three cells', line: (t) => `| \`STRIPE_KEY\` | ${t} | ${t}-b |`, secrets: (t) => [t, `${t}-b`] },
  { label: 'double-quoted around the assignment', line: (t) => `Set "STRIPE_KEY=${t}" in env`, secrets: one },
  { label: 'single-quoted value of two words', line: (t) => `STRIPE_KEY='${t}-a ${t}-b'`, secrets: (t) => [`${t}-a`, `${t}-b`] },
  { label: 'double-quoted value of three words', line: (t) => `STRIPE_KEY="${t}-a ${t}-b ${t}-c"`, secrets: three },
  { label: 'bold around the assignment', line: (t) => `**STRIPE_KEY=${t}**`, secrets: one },
  { label: 'bold name with spaced equals', line: (t) => `**STRIPE_KEY** = ${t}`, secrets: one },
  { label: 'spaced equals', line: (t) => `STRIPE_KEY = ${t}`, secrets: one },
  { label: 'ticked name with spaced equals', line: (t) => `\`STRIPE_KEY\` = ${t}`, secrets: one },
  { label: 'after a semicolon', line: (t) => `run;STRIPE_KEY=${t}`, secrets: one },
  { label: 'after an opening bracket', line: (t) => `x [STRIPE_KEY=${t}]`, secrets: one },
  { label: 'after a label and colon', line: (t) => `Auth: STRIPE_KEY: ${t}`, secrets: one },
  { label: 'colon, value of three words', line: (t) => `STRIPE_KEY: ${t}-a ${t}-b ${t}-c`, secrets: three },
  { label: 'angle-bracketed value', line: (t) => `STRIPE_KEY=<${t}>`, secrets: one },
  { label: 'square-bracketed value', line: (t) => `STRIPE_KEY=[${t}]`, secrets: one },
  { label: 'text stuck to a closing quote', line: (t) => `TOKEN="${t}-a"${t}-b`, secrets: (t) => [`${t}-a`, `${t}-b`] },
  { label: 'backslash-escaped quotes', line: (t) => `A_B=\\"${t}-a ${t}-b\\"`, secrets: (t) => [`${t}-a`, `${t}-b`] },
  { label: 'quoted name, JSON style', line: (t) => `"STRIPE_KEY": "${t}"`, secrets: one },
];

/** The tag of form number `index`: PLANTED-FORM-nn, with digits. */
export function formTag(index: number): string {
  return `PLANTED-FORM-${String(index + 1).padStart(2, '0')}`;
}

/** Every secret of every form, for a whole-record scan. */
export function allFormSecrets(): string[] {
  return WRITTEN_FORMS.flatMap((form, index) => form.secrets(formTag(index)));
}

/** A USER-SETUP.md with every form planted as a checklist item's field line, as a Notes line, and as a plain line of an
 * unclaimed section, so a reader that masks fragment by fragment, or only some places, shows a secret. */
export function userSetupFormDoc(): string {
  const asField = WRITTEN_FORMS.map((form, i) => `  - ${form.line(formTag(i)).replace(/^- /, '')}`);
  const asNote = WRITTEN_FORMS.map((form, i) => `  - Notes: ${form.line(formTag(i))}`);
  const asLine = WRITTEN_FORMS.map((form, i) => form.line(formTag(i)));
  return [
    '# Phase 9: User Setup Required',
    '',
    '## Dashboard Configuration',
    '',
    '- [ ] **Add the key**',
    '  - URL: https://host.example/keys',
    ...asField,
    ...asNote,
    '',
    '## Local Development',
    '',
    ...asLine,
    '',
  ].join('\n');
}

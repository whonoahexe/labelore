// A made-up spikes tree for the one shape Lendshed does not hold: a letter family (spikes 001a, 001b and 001c
// are three attempts at one question), with the manifest table listing 001c first and no WRAP-UP-SUMMARY.md
// (Phase 11, 11-12, VIEW-14, UI-SPEC section 2 "Letter families"). Tests call writeLetterFamilySpikes(dir) on a
// temp folder and load it through the real repository; 11-16 runs the CLI to photograph the board:
//
//   node test/helpers/spike-fixtures.ts --out <folder>
//
// Everything written is invented (a seed-tray library, not any real project), and each file carries the
// made-up marker the fixture rule asks for: a comment on the first line of the manifest, a frontmatter key in
// each README. Scripts and outputs are written so the folder lists by name; nothing runs them.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const MARKER = '<!-- made-up example · derived from gsd-core/workflows/spike.md · gsd-core 1.19.0 -->';

const MANIFEST = `${MARKER}
# Spike Manifest

## Ideas

### seed-labelling

Decide how a seed tray gets its label printed at the bench: which printer path is fast enough, and what a
failed print leaves behind.

**Requirements:**

- Must print a label within three seconds of the tray being scanned
- Must leave no half-printed label when the printer is unplugged

## Spikes

| # | Idea | Name | Type | Validates | Verdict | Tags |
|---|------|------|------|-----------|---------|------|
| 001c | seed-labelling | queue-in-memory | comparison | Given a tray scan, when the label job waits in memory, then it prints within three seconds | VALIDATED (lost on a restart) | labels, queue |
| 001a | seed-labelling | direct-print | comparison | Given a tray scan, when the label prints straight to the device, then it prints within three seconds | VALIDATED | labels, printer |
| 001b | seed-labelling | spool-to-disk | comparison | Given a tray scan, when the label job waits in a spool file, then it prints within three seconds | VALIDATED (needs a cleanup job) | labels, queue |
`;

interface SpikeFolder {
  folder: string;
  name: string;
  verdict: string;
  title: string;
  validates: string;
  result: string;
  script: { file: string; text: string };
  output: { file: string; text: string };
}

const SPIKE_FOLDERS: readonly SpikeFolder[] = [
  {
    folder: '001a-direct-print',
    name: 'direct-print',
    verdict: 'VALIDATED',
    title: 'Direct Print',
    validates: 'Given a tray scan, when the label prints straight to the device, then it prints within three seconds',
    result: 'Validated. The label printed in under two seconds each time the printer was plugged in.',
    script: { file: 'print_direct.sh', text: '# made-up example: sends one label to the printer device\necho "label 1"\n' },
    output: { file: 'out/timings.csv', text: 'run,seconds\n1,1.7\n2,1.9\n3,1.8\n' },
  },
  {
    folder: '001b-spool-to-disk',
    name: 'spool-to-disk',
    verdict: 'VALIDATED (needs a cleanup job)',
    title: 'Spool To Disk',
    validates: 'Given a tray scan, when the label job waits in a spool file, then it prints within three seconds',
    result: 'Validated, with a cost: spool files pile up until something sweeps them.',
    script: { file: 'spool_label.sh', text: '# made-up example: writes a label job to a spool file\necho "job 1" > spool.txt\n' },
    output: { file: 'out/spool.log', text: 'job 1 queued\njob 1 printed\n' },
  },
  {
    folder: '001c-queue-in-memory',
    name: 'queue-in-memory',
    verdict: 'VALIDATED (lost on a restart)',
    title: 'Queue In Memory',
    validates: 'Given a tray scan, when the label job waits in memory, then it prints within three seconds',
    result: 'Validated for speed, but a restart drops every waiting label.',
    script: { file: 'mem_queue.js', text: '// made-up example: a queue that lives in one process\nconst queue = [];\nqueue.push("label 1");\n' },
    output: { file: 'out/queue.txt', text: 'queued 1\nprinted 1\n' },
  },
];

function readmeOf(spike: SpikeFolder): string {
  const id = spike.folder.slice(0, spike.folder.indexOf('-'));
  return `---
made_up_example: true
derived_from: gsd-core/workflows/spike.md
gsd_core_version: 1.19.0
spike: ${id}
idea: seed-labelling
name: ${spike.name}
type: comparison
validates: "${spike.validates}"
verdict: ${JSON.stringify(spike.verdict)}
related: []
tags: [labels]
---

# Spike ${id}: ${spike.title}

## What This Validates

${spike.validates}.

## Research

One of three attempts at the same question; the other two sit in the folders beside this one.

## How to Run

\`\`\`bash
bash ${spike.script.file}
\`\`\`

## What to Expect

One timing per run in \`${spike.output.file}\`.

## Results

${spike.result}
`;
}

/**
 * Writes the letter-family tree under `<dir>/.planning/spikes/` and returns `dir`. One idea, spikes 001a, 001b
 * and 001c all VALIDATED so they share a column; the manifest table lists 001c first, so any order the board
 * shows comes from the ids, not the table. There is no WRAP-UP-SUMMARY.md. Each spike folder holds a README, one
 * script and one output.
 */
export function writeLetterFamilySpikes(dir: string): string {
  const spikes = join(dir, '.planning', 'spikes');
  const write = (relative: string, text: string): void => {
    const target = join(spikes, relative);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, 'utf8');
  };
  write('MANIFEST.md', MANIFEST);
  for (const spike of SPIKE_FOLDERS) {
    write(`${spike.folder}/README.md`, readmeOf(spike));
    write(`${spike.folder}/${spike.script.file}`, spike.script.text);
    write(`${spike.folder}/${spike.output.file}`, spike.output.text);
  }
  return dir;
}

// The command line: node test/helpers/spike-fixtures.ts --out <folder>
function main(argv: readonly string[]): number {
  const at = argv.indexOf('--out');
  const value = at === -1 ? undefined : argv[at + 1];
  if (value === undefined) {
    console.log('usage: node test/helpers/spike-fixtures.ts --out <folder>');
    return 1;
  }
  const out = resolve(value);
  writeLetterFamilySpikes(out);
  console.log(`wrote the letter-family spikes under ${join(out, '.planning', 'spikes')}`);
  return 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exit(main(process.argv.slice(2)));
}

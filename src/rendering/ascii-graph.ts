// The author's ASCII diagram read as DATA (quick-260930-mp6, sketch 012): a pure port of the sketch's
// shapes.js (cards, notes and connector cells from the lifted model) and graph.js (typed nodes with short
// labels, directed edges with wire labels, groups, annotations), running on the shipped LiftedFigure model
// from src/rendering/ascii-lift.ts. The rules and their order are bug-compatible with the sketch so a
// golden of the sketch's own output holds (test/rendering/fixtures/sketch-012-graphs.json).
//
// Cost (T-mp6-01): the sketch's per-probe scans (cardAt, noteAt, nearCard, note-beside-a-wire) are
// replaced by cell -> card / cell -> note / cell -> component index grids built once, so a probe is O(1).
// A figure with more nodes than MAX_GRAPH_NODES is thin and returns an empty graph before any scan. No
// DOM, no Node API, nothing research-specific.
import type { LiftedFigure } from './ascii-lift.ts';

export type DiagramKind = 'client' | 'edge' | 'service' | 'worker' | 'channel' | 'data' | 'external' | 'step';

export interface DiagramLabel {
  main: string;
  sub: string;
  code: boolean;
  /** The label as the author wrote it (whitespace collapsed). */
  full: string;
}

export interface DiagramNode {
  /** The node's index in DiagramGraph.nodes. */
  id: number;
  kind: DiagramKind;
  label: DiagramLabel;
  details: string[];
  notes: string[];
  /** Index into DiagramGraph.groups, or null. */
  group: number | null;
  /** The card's title display row and its first column (the author's layer and column order). */
  row: number;
  col: number;
}

export interface DiagramEdge {
  from: number;
  to: number;
  label: string;
  directed: boolean;
  /** True when the source was inferred (a fan-out with no drawn source). */
  implied: boolean;
}

export interface DiagramGroup {
  id: number;
  label: DiagramLabel;
  details: string[];
}

export interface DiagramGraph {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups: DiagramGroup[];
  /** How much of the author's text landed in a card (vs loose notes), 0..1. */
  quality: number;
  /** Wire fragments that touch no card and carry no arrow. */
  dangling: number;
  /** True when the graph is not trustworthy enough to draw: the figure keeps the author's layout. */
  thin: boolean;
}

/** More nodes than this is not a diagram to redraw. */
export const MAX_GRAPH_NODES = 60;

const LINE = '─│┌┐└┘├┤┬┴┼';
const ARROW = '▼▲►◄→←↑↓';
const CONN: Record<string, string> = {
  '─': 'lr', '│': 'ud', '┌': 'rd', '┐': 'ld', '└': 'ur', '┘': 'ul', '├': 'udr', '┤': 'udl', '┬': 'lrd', '┴': 'lru', '┼': 'udlr',
  '▼': 'u', '▲': 'd', '►': 'l', '◄': 'r', '→': 'l', '←': 'r', '↓': 'u', '↑': 'd',
};
const TIPDIR: Record<string, string> = { '▼': 'd', '▲': 'u', '►': 'r', '◄': 'l', '→': 'r', '←': 'l', '↓': 'd', '↑': 'u' };
const STEP: Record<string, [number, number]> = { u: [-1, 0], d: [1, 0], l: [0, -1], r: [0, 1] };

const isGlyph = (ch: string): boolean => LINE.includes(ch) || ARROW.includes(ch);

// ---------------------------------------------------------------------------
// shapes: model -> cards, notes and connector cells
// ---------------------------------------------------------------------------

interface CardLine {
  r: number;
  col: number;
  text: string;
}

interface Card {
  i: number;
  kind: 'box' | 'node';
  r1: number;
  c1: number;
  r2: number;
  c2: number;
  area: number;
  group: boolean;
  lines: CardLine[];
  titleRow: number;
  titleCount: number;
}

interface Note {
  r1: number;
  r2: number;
  c1: number;
  c2: number;
  lines: string[];
}

interface Conn {
  r: number;
  c: number;
  ch: string;
}

interface Shapes {
  H: number;
  W: number;
  G: string[][];
  cards: Card[];
  notes: Note[];
  conn: Conn[];
  quality: number;
  dangling: number;
}

function readShapes(figure: LiftedFigure): Shapes {
  const H = figure.height;
  let W = figure.width;
  for (const c of figure.cards) W = Math.max(W, c.c2 + 2);
  const G: string[][] = figure.rows.map((segments) => {
    const s = segments.map((x) => x.text).join('');
    return (s + ' '.repeat(W)).slice(0, W).split('');
  });
  // Rows beyond the model's own rows stay blank (the model's height counts display rows).
  while (G.length < H) G.push(new Array<string>(W).fill(' '));

  const cards: Card[] = figure.cards.map((c, i) => ({
    i,
    kind: c.kind,
    r1: c.r1,
    c1: c.c1,
    r2: c.r2,
    c2: c.c2,
    area: (c.r2 - c.r1 + 1) * (c.c2 - c.c1 + 1),
    group: false,
    lines: [],
    titleRow: 0,
    titleCount: 1,
  }));
  // Groups first (pure geometry): a box that encloses another card.
  for (const c of cards) {
    let kids = 0;
    if (c.kind === 'box') {
      for (const o of cards) {
        if (o !== c && o.r1 > c.r1 && o.r2 < c.r2 && o.c2 <= c.c2 + 1 && o.c1 >= c.c1 - 1) {
          kids++;
          break;
        }
      }
    }
    c.group = c.kind === 'box' && kids > 0;
  }

  // Ownership, innermost wins: the largest card paints first, smaller ones over it.
  const own = new Int32Array(H * W).fill(-1);
  const glyphAt = (r: number, x: number): boolean => isGlyph(G[r][x]);
  [...cards]
    .sort((a, b) => b.area - a.area)
    .forEach((c) => {
      const [r1, r2, c1, c2] = c.kind === 'box' ? [c.r1 + 1, c.r2 - 1, c.c1 + 1, c.c2 - 1] : [c.r1, c.r2, c.c1, c.c2];
      for (let r = Math.max(0, r1); r <= Math.min(H - 1, r2); r++) {
        for (let x = Math.max(0, c1); x <= Math.min(W - 1, c2); x++) {
          // A group owns only its own words: the wires and cards inside it stay what they are.
          if (c.group && glyphAt(r, x)) continue;
          own[r * W + x] = c.i;
        }
      }
      if (c.group) {
        for (let r = Math.max(0, r1); r <= Math.min(H - 1, r2); r++) {
          // ...and a note that starts outside the group and runs into it stays a note.
          let x = 0;
          while (x < W) {
            if (G[r][x] === ' ' || glyphAt(r, x)) {
              x++;
              continue;
            }
            let e = x;
            let gap = 0;
            while (e < W && !glyphAt(r, e)) {
              if (G[r][e] === ' ') {
                if (++gap >= 2) break;
              } else gap = 0;
              e++;
            }
            if (x < c1) for (let q = x; q < e; q++) if (own[r * W + q] === c.i) own[r * W + q] = -1;
            x = e;
          }
        }
      }
    });

  // Card text lines: per owned row, the owned cells' text (node cards drop trunk glyphs).
  for (const c of cards) {
    for (let r = Math.max(0, c.r1); r <= Math.min(H - 1, c.r2); r++) {
      let s = '';
      let start = -1;
      for (let x = 0; x < W; x++) {
        if (own[r * W + x] === c.i) {
          if (start < 0) start = x;
          s += G[r][x];
        } else if (start >= 0 && s !== '') s += ' ';
      }
      if (c.kind === 'node') s = s.replace(/[│┆]/g, ' ');
      const lead = s.length - s.trimStart().length;
      s = s.replace(/\s+$/, '');
      if (s.trim() === '') continue;
      c.lines.push({ r, col: start + lead, text: s.trimStart() });
    }
    if (c.lines.length === 0) c.lines.push({ r: c.r1 + (c.kind === 'box' ? 1 : 0), col: c.c1 + 1, text: '' });
    c.titleRow = c.lines[0].r;
    // A title line that ends mid-thought ("… /", "… (") continues onto the next line.
    let t = 1;
    while (t < c.lines.length && /[/(,]$|\bthe$/.test(c.lines[t - 1].text) && t < 3) t++;
    c.titleCount = t;
  }

  // Notes: text outside any card. Runs split on 2+ spaces, then stacked runs merge into blocks.
  const runs: { r: number; c1: number; c2: number; text: string }[] = [];
  for (let r = 0; r < H; r++) {
    let x = 0;
    while (x < W) {
      const ch = G[r][x];
      if (ch === ' ' || own[r * W + x] >= 0 || glyphAt(r, x)) {
        x++;
        continue;
      }
      let e = x;
      let gap = 0;
      while (e < W && own[r * W + e] < 0 && !glyphAt(r, e)) {
        if (G[r][e] === ' ') {
          if (++gap >= 2) break;
        } else gap = 0;
        e++;
      }
      const text = G[r].slice(x, e).join('').trimEnd();
      if (text) runs.push({ r, c1: x, c2: x + text.length - 1, text });
      x = e;
    }
  }
  const notes: Note[] = [];
  // Notes bucketed by the last row they reach, so a stacked run finds its block without a full scan.
  const byLastRow = new Map<number, number[]>();
  for (const run of runs) {
    let found = -1;
    for (const idx of byLastRow.get(run.r - 1) ?? []) {
      const n = notes[idx];
      if (n.r2 === run.r - 1 && run.c1 >= n.c1 - 1 && run.c1 <= n.c1 + 8 && (found < 0 || idx < found)) found = idx;
    }
    if (found >= 0) {
      const b = notes[found];
      b.r2 = run.r;
      b.lines.push(run.text);
      b.c2 = Math.max(b.c2, run.c2);
      const bucket = byLastRow.get(run.r) ?? [];
      bucket.push(found);
      byLastRow.set(run.r, bucket);
    } else {
      notes.push({ r1: run.r, r2: run.r, c1: run.c1, c2: run.c2, lines: [run.text] });
      const bucket = byLastRow.get(run.r) ?? [];
      bucket.push(notes.length - 1);
      byLastRow.set(run.r, bucket);
    }
  }

  // Connector cells: glyphs outside card interiors.
  let conn: Conn[] = [];
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const ch = G[r][x];
      if (isGlyph(ch) && own[r * W + x] < 0) conn.push({ r, c: x, ch });
    }
  }

  // Stray fragments: a small connected piece of line that carries no arrow and touches no card is a
  // hand-drawing wobble. Drop it; count it against confidence. `solid` marks every cell of a non-group
  // card's raw rect, so "touches a card" is a 3x3 probe.
  const solid = new Uint8Array(H * W);
  for (const c of cards) {
    if (c.group) continue;
    for (let r = Math.max(0, c.r1); r <= Math.min(H - 1, c.r2); r++) {
      for (let x = Math.max(0, c.c1); x <= Math.min(W - 1, c.c2); x++) solid[r * W + x] = 1;
    }
  }
  const nearCard = (r: number, x: number): boolean => {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dx = -1; dx <= 1; dx++) {
        const rr = r + dr;
        const xx = x + dx;
        if (rr < 0 || rr >= H || xx < 0 || xx >= W) continue;
        const o = own[rr * W + xx];
        if ((o >= 0 && !cards[o].group) || solid[rr * W + xx] === 1) return true;
      }
    }
    return false;
  };
  const connAt = new Int32Array(H * W).fill(-1);
  conn.forEach((k, idx) => {
    connAt[k.r * W + k.c] = idx;
  });
  const seen = new Uint8Array(conn.length);
  const drop = new Set<number>();
  let dangling = 0;
  conn.forEach((k0, idx0) => {
    if (seen[idx0] === 1) return;
    const comp: number[] = [];
    const stack = [idx0];
    seen[idx0] = 1;
    while (stack.length > 0) {
      const idx = stack.pop() as number;
      comp.push(idx);
      const k = conn[idx];
      for (const [dr, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const rr = k.r + dr;
        const xx = k.c + dx;
        if (rr < 0 || rr >= H || xx < 0 || xx >= W) continue;
        const q = connAt[rr * W + xx];
        if (q >= 0 && seen[q] === 0) {
          seen[q] = 1;
          stack.push(q);
        }
      }
    }
    const arrow = comp.some((q) => ARROW.includes(conn[q].ch));
    const touches = comp.some((q) => nearCard(conn[q].r, conn[q].c));
    if (!arrow && comp.length <= 3 && !touches) {
      dangling++;
      comp.forEach((q) => drop.add(q));
    } else if (!arrow && !touches) dangling++;
  });
  conn = conn.filter((_, idx) => !drop.has(idx));

  // Quality: how much of the author's text landed in a card (vs loose notes).
  let inCards = 0;
  for (const c of cards) for (const l of c.lines) inCards += l.text.replace(/\s/g, '').length;
  let loose = 0;
  for (const n of notes) loose += n.lines.join('').replace(/\s/g, '').length;
  const quality = inCards / Math.max(1, inCards + loose);
  return { H, W, G, cards, notes, conn, quality, dangling };
}

// ---------------------------------------------------------------------------
// labels and kinds
// ---------------------------------------------------------------------------

// Node kinds, matched on the card's text (title weighted). Order matters: first hit wins.
const KINDS: [DiagramKind, RegExp][] = [
  ['client', /\b(browser|next\.js page|client component|frontend|dashboard|preview|ui\b|page\b|react query|artifact page|roadmap\/history)/i],
  ['edge', /\b(cloudflare|vercel|edge\b|proxy|tunnel|cdn|access \()/i],
  ['data', /\b(sqlite|database|sqlx|db transaction|insert into|update jobs|select |audit_log|audit row|snapshot|registry|ticket map|hashmap|table)/i],
  ['channel', /\b(bus|broadcast|websocket|\/ws\b|ws connection|ws upgrade|emit|mpsc|sse|event::|pushes event)/i],
  ['worker', /\b(thread|worker|executor|pool|prober|recovery pass|sweep|task\))/i],
  ['external', /(\/proc|\/mnt|\/dev|kernel|google drive|rclone|filesystem|subprocess|cli project|\bos\b)/i],
  ['service', /\b(handler|axum|api|router|middleware|endpoint|hono|server|route|backend|require|resolve|verif|mint|login)/i],
];

interface KindSource {
  lines: { text: string }[];
  titleCount: number;
}

function kindOf(card: KindSource): DiagramKind {
  const title = card.lines
    .slice(0, card.titleCount)
    .map((l) => l.text)
    .join(' ');
  for (const [k, re] of KINDS) if (re.test(title)) return k;
  const all = card.lines.map((l) => l.text).join(' ');
  for (const [k, re] of KINDS) if (k !== 'client' && k !== 'service' && re.test(all)) return k;
  return 'step';
}

const ACRONYM = new Set([
  'API', 'WS', 'WSS', 'JWT', 'SQL', 'CLI', 'DB', 'OS', 'UI', 'URL', 'HTTP', 'HTML', 'XML', 'JSON', 'WAL', 'TTL', 'EOF', 'ZIP', 'CF', 'JWKS', 'ID', 'GB',
  'SSE', 'CSPRNG', 'GFM', 'PLAN', 'POST', 'GET', 'PATCH', 'PUT', 'DELETE', 'EXISTING', 'NEW', 'FULL',
]);

/** A SHOUTED phrase becomes Sentence case; acronyms stay. */
function sentence(s: string): string {
  let first = true;
  return s.replace(/\b[A-Za-z][A-Za-z_]*\b/g, (w) => {
    const up = w === w.toUpperCase();
    const out = up && !ACRONYM.has(w) && w.length > 1 ? (first ? w[0] + w.slice(1).toLowerCase() : w.toLowerCase()) : w;
    first = false;
    return out;
  });
}

function isCode(s: string): boolean {
  return /::|\(\)|\(\.\.\.\)|[{}=<>]|\.rs\b|\.ts\b|\w_\w|^\/|`|\.\w+\(/.test(s);
}

function splitLabel(raw: string): DiagramLabel {
  const t = raw
    .trim()
    .replace(/:$/, '')
    .replace(/^(─+►|►|→|◄─+)\s*/, '')
    .replace(/^\d+\.\s+/, '');
  let main: string;
  let sub = '';
  // "SHOUTED PHRASE   rest" (the author's double space) -> phrase / rest
  const shout = /^(\/?[A-Za-z]*\s?[A-Z][A-Z0-9 &-]{2,}?)\s{2,}(.+)$/.exec(t);
  const tt = t.replace(/\s+/g, ' ');
  const paren = /^(.{3,}?)\s*\((.+)\)$/.exec(tt);
  const colon = /^([A-Za-z][^:{}()=]{2,28}):\s+(.+)$/.exec(tt);
  const sql = /^((?:INSERT INTO|UPDATE|DELETE FROM)\s+\S+|SELECT .*? FROM \S+)\s*(.*)$/i.exec(tt);
  if (shout) {
    main = shout[1];
    sub = shout[2];
  } else if (colon) {
    main = colon[1];
    sub = colon[2];
  } else if (sql && sql[2]) {
    main = sql[1];
    sub = sql[2];
  } else if (paren) {
    main = paren[1];
    sub = paren[2];
  } else main = tt;
  main = main.replace(/\s+/g, ' ').trim();
  const dash = /^(.{3,}?)\s+[—–]\s+(.+)$/.exec(main);
  if (dash) {
    main = dash[1];
    sub = sub ? `${dash[2]} · ${sub}` : dash[2];
  }
  // Code: the name is what precedes its argument list or body.
  if (isCode(main) && main.length > 24) {
    const m = /^([^({\s]+(?:\s[^({\s]+)?)\s*([({].*)$/.exec(main);
    if (m) {
      sub = sub ? `${m[2]} · ${sub}` : m[2];
      main = m[1];
    }
  }
  main = main.replace(/\s*\/\s*$/, '').replace(/[,;]$/, '');
  const letters = main.replace(/[^A-Za-z]/g, '');
  if (letters && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.6 && !isCode(main)) main = sentence(main);
  sub = sub
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[/·—-]\s*/, '')
    .replace(/^\((.*)\)?$/, '$1')
    .replace(/\)$/, '')
    .trim();
  // Shouted words in a mixed label ("/ws HANDLER") -> lower case, unless it is SQL.
  if (!/^(INSERT|UPDATE|DELETE|SELECT)\b/.test(main)) main = main.replace(/\b[A-Z]{4,}\b/g, (w) => (ACRONYM.has(w) ? w : w.toLowerCase()));
  return { main, sub, code: isCode(main), full: tt };
}

function labelOf(card: Card): DiagramLabel {
  return splitLabel(
    card.lines
      .slice(0, card.titleCount)
      .map((l) => l.text)
      .join('  '),
  );
}

// ---------------------------------------------------------------------------
// graph
// ---------------------------------------------------------------------------

interface WorkNode {
  id: number;
  card: Card;
  kind: DiagramKind;
  label: DiagramLabel;
  details: string[];
  notes: string[];
  group: number | null;
}

interface WorkEdge {
  from: number;
  to: number;
  label: string;
  directed: boolean;
  implied: boolean;
}

const oneLine = (lines: string[]): string => lines.join(' ').replace(/\s+/g, ' ');

function emptyGraph(): DiagramGraph {
  return { nodes: [], edges: [], groups: [], quality: 0, dangling: 0, thin: true };
}

export function buildDiagramGraph(figure: LiftedFigure): DiagramGraph {
  // Cost bound: past twice the node cap of cards this is not a figure to redraw (nodes + groups).
  if (figure.cards.length > MAX_GRAPH_NODES * 2) return emptyGraph();
  const S = readShapes(figure);
  const nodesSrc = S.cards.filter((c) => !c.group);
  if (nodesSrc.length > MAX_GRAPH_NODES) return emptyGraph();
  const groupCards = S.cards.filter((c) => c.group);
  const { H, W, G } = S;

  // Cell -> card: smallest area wins (ties keep the first), box borders count, a node card has one
  // column of slack each side. Columns are offset by one so the slack column of column 0 is addressable.
  const PW = W + 2;
  const cardGrid = new Int32Array(H * PW).fill(-1);
  const areaGrid = new Int32Array(H * PW).fill(0);
  nodesSrc.forEach((c, k) => {
    const lo = c.kind === 'box' ? c.c1 : c.c1 - 1;
    const hi = c.kind === 'box' ? c.c2 : c.c2 + 1;
    for (let r = Math.max(0, c.r1); r <= Math.min(H - 1, c.r2); r++) {
      for (let x = Math.max(-1, lo); x <= Math.min(W, hi); x++) {
        const cell = r * PW + x + 1;
        if (cardGrid[cell] < 0 || c.area < areaGrid[cell]) {
          cardGrid[cell] = k;
          areaGrid[cell] = c.area;
        }
      }
    }
  });
  const cardAt = (r: number, x: number): Card | null => {
    if (r < 0 || r >= H || x < -1 || x > W) return null;
    const k = cardGrid[r * PW + x + 1];
    return k < 0 ? null : nodesSrc[k];
  };
  // Cell -> first note that reaches it (a note has one column of slack each side).
  const noteGrid = new Int32Array(H * PW).fill(-1);
  S.notes.forEach((n, j) => {
    for (let r = Math.max(0, n.r1); r <= Math.min(H - 1, n.r2); r++) {
      for (let x = Math.max(-1, n.c1 - 1); x <= Math.min(W, n.c2 + 1); x++) {
        const cell = r * PW + x + 1;
        if (noteGrid[cell] < 0) noteGrid[cell] = j;
      }
    }
  });
  const noteAt = (r: number, x: number): number => {
    if (r < 0 || r >= H || x < -1 || x > W) return -1;
    return noteGrid[r * PW + x + 1];
  };

  // Components of connector cells.
  const at = new Int32Array(H * W).fill(-1);
  S.conn.forEach((k, idx) => {
    at[k.r * W + k.c] = idx;
  });
  const connAt = (r: number, x: number): number => (r < 0 || r >= H || x < 0 || x >= W ? -1 : at[r * W + x]);
  const seen = new Uint8Array(S.conn.length);
  const comps: Conn[][] = [];
  const compOf = new Int32Array(H * W).fill(-1);
  S.conn.forEach((k0, idx0) => {
    if (seen[idx0] === 1) return;
    const comp: Conn[] = [];
    const stack = [idx0];
    seen[idx0] = 1;
    while (stack.length > 0) {
      const idx = stack.pop() as number;
      const k = S.conn[idx];
      comp.push(k);
      compOf[k.r * W + k.c] = comps.length;
      const next = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).map(([dr, dx]) => connAt(k.r + dr, k.c + dx));
      // A vertical the author interrupted with a note continues below it.
      if ((CONN[k.ch] ?? '').includes('d') && connAt(k.r + 1, k.c) < 0) {
        for (let g = 2; g <= 4; g++) {
          const q = connAt(k.r + g, k.c);
          if (q >= 0) {
            if ((CONN[S.conn[q].ch] ?? '').includes('u')) next.push(q);
            break;
          }
        }
      }
      if ((CONN[k.ch] ?? '').includes('u') && connAt(k.r - 1, k.c) < 0) {
        for (let g = 2; g <= 4; g++) {
          const q = connAt(k.r - g, k.c);
          if (q >= 0) {
            if ((CONN[S.conn[q].ch] ?? '').includes('d')) next.push(q);
            break;
          }
        }
      }
      next.forEach((q) => {
        if (q >= 0 && seen[q] === 0) {
          seen[q] = 1;
          stack.push(q);
        }
      });
    }
    comps.push(comp);
  });
  // Which notes sit right beside which component (ascending note index), through the component grid.
  const besideNotes: number[][] = comps.map(() => []);
  S.notes.forEach((n, j) => {
    const hit = new Set<number>();
    for (let r = Math.max(0, n.r1); r <= Math.min(H - 1, n.r2); r++) {
      for (let d = 1; d <= 3; d++) {
        const left = n.c1 - d;
        if (left >= 0 && left < W) {
          const id = compOf[r * W + left];
          if (id >= 0) hit.add(id);
        }
        const right = n.c2 + d;
        if (right >= 0 && right < W) {
          const id = compOf[r * W + right];
          if (id >= 0 && TIPDIR[G[r][right]] !== 'l') hit.add(id);
        }
      }
    }
    hit.forEach((id) => besideNotes[id].push(j));
  });

  const nodes: WorkNode[] = nodesSrc.map((c) => ({
    id: c.i,
    card: c,
    kind: kindOf(c),
    label: labelOf(c),
    details: c.lines.slice(c.titleCount).map((l) => l.text),
    notes: [],
    group: null,
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  groupCards.forEach((g) =>
    nodes.forEach((n) => {
      const c = n.card;
      if (c.r1 > g.r1 && c.r2 < g.r2 && c.c1 >= g.c1 - 1 && c.c2 <= g.c2 + 1) n.group = g.i;
    }),
  );
  const edges: WorkEdge[] = [];
  const usedNotes = new Set<number>();

  comps.forEach((comp, compId) => {
    const tips: { card: Card | null; note: number }[] = [];
    const ends: { card: Card | null; note: number }[] = [];
    comp.forEach(({ r, c, ch }) => {
      const dirs = new Set((CONN[ch] ?? '').split('').filter((d) => d !== ''));
      const tip = TIPDIR[ch];
      if (tip) dirs.add(tip);
      dirs.forEach((dir) => {
        const [dr, dx] = STEP[dir];
        if (connAt(r + dr, c + dx) >= 0) return;
        let hit: Card | null = null;
        let note = -1;
        for (let k = 1; k <= 3 && !hit; k++) {
          hit = cardAt(r + dr * k, c + dx * k);
          if (!hit && note < 0) note = noteAt(r + dr * k, c + dx * k);
          const rr = r + dr * k;
          const cc = c + dx * k;
          if (!hit && rr >= 0 && rr < H && cc >= 0 && cc < W && G[rr][cc] !== ' ' && note >= 0) break;
        }
        (tip === dir ? tips : ends).push({ card: hit, note });
      });
    });
    // Labels: notes that sit right beside the wire.
    const labels: string[] = [];
    for (const j of besideNotes[compId]) {
      if (usedNotes.has(j)) continue;
      labels.push(oneLine(S.notes[j].lines));
      usedNotes.add(j);
    }
    const targets = [...new Set(tips.filter((t) => t.card).map((t) => (t.card as Card).i))];
    const sources = [...new Set(ends.filter((e) => e.card).map((e) => (e.card as Card).i))].filter((i) => !targets.includes(i));
    const pointerFromNote = ends.some((e) => !e.card && e.note >= 0) && sources.length === 0;
    if (pointerFromNote && targets.length > 0) {
      // "◄─ note": an annotation pointing at a card, not a flow.
      ends
        .filter((e) => e.note >= 0)
        .forEach((e) => {
          if (usedNotes.has(e.note)) return;
          usedNotes.add(e.note);
          targets.forEach((t) => byId.get(t)?.notes.push(oneLine(S.notes[e.note].lines)));
        });
      labels.forEach((l) => targets.forEach((t) => byId.get(t)?.notes.push(l)));
      return;
    }
    if (targets.length === 0 && sources.length >= 2) {
      // No arrowheads: connect in reading order, top/left first.
      const sorted = sources
        .map((i) => byId.get(i))
        .filter((n): n is WorkNode => n !== undefined)
        .sort((a, b) => a.card.titleRow - b.card.titleRow || a.card.c1 - b.card.c1);
      for (let k = 1; k < sorted.length; k++) {
        edges.push({ from: sorted[0].id, to: sorted[k].id, label: k === 1 ? labels.join(' · ') : '', directed: false, implied: false });
      }
      return;
    }
    if (targets.length > 0 && sources.length === 0) {
      // Arrows with no drawn source: the flow comes from the card just above the wire (a fan-out bus
      // shares one), or, for a same-row step, from the card to its left.
      let top = Infinity;
      let lo = Infinity;
      let hi = -Infinity;
      for (const k of comp) {
        top = Math.min(top, k.r);
        lo = Math.min(lo, k.c);
        hi = Math.max(hi, k.c);
      }
      const mid = (lo + hi) / 2;
      const above = nodes
        .filter((p) => p.card.r2 < top && !targets.includes(p.id))
        .sort((a, b) => b.card.r2 - a.card.r2 || Math.abs((a.card.c1 + a.card.c2) / 2 - mid) - Math.abs((b.card.c1 + b.card.c2) / 2 - mid));
      const overl = above.filter((p) => p.card.c2 >= lo - 2 && p.card.c1 <= hi + 2);
      const src = overl[0] && overl[0].card.r2 >= (above[0] ? above[0].card.r2 - 1 : 0) ? overl[0] : above[0];
      targets.forEach((t, k) => {
        const tn = byId.get(t) as WorkNode;
        const left = nodes.filter((p) => p.card.titleRow === tn.card.titleRow && p.card.c2 < tn.card.c1).sort((a, b) => b.card.c2 - a.card.c2)[0];
        const from = comp.every((q) => q.r === tn.card.titleRow) && left ? left : src;
        if (from) edges.push({ from: from.id, to: t, label: k === 0 ? labels.join(' · ') : '', directed: true, implied: true });
      });
      return;
    }
    let first = true;
    sources.forEach((s) =>
      targets.forEach((t) => {
        if (s !== t) {
          edges.push({ from: s, to: t, label: first ? labels.join(' · ') : '', directed: true, implied: false });
          first = false;
        }
      }),
    );
  });

  // A SHOUTED note right beside a box that has no heading of its own is that box's name
  // ("HOST KERNEL / DEVICES" beside the /proc… box).
  S.notes.forEach((n, j) => {
    if (usedNotes.has(j)) return;
    const text = n.lines.join(' ').trim();
    const letters = text.replace(/[^A-Za-z]/g, '');
    if (!letters || letters.replace(/[^A-Z]/g, '').length / letters.length < 0.8 || text.length > 40) return;
    const box = nodes.find(
      (nd) =>
        nd.card.kind === 'box' &&
        n.r1 <= nd.card.r2 &&
        n.r2 >= nd.card.r1 &&
        ((nd.card.c1 - n.c2 >= 1 && nd.card.c1 - n.c2 <= 4) || (n.c1 - nd.card.c2 >= 1 && n.c1 - nd.card.c2 <= 4)),
    );
    if (!box) return;
    box.details.unshift(
      box.card.lines
        .slice(0, box.card.titleCount)
        .map((l) => l.text)
        .join(' '),
    );
    box.label = splitLabel(text);
    box.kind = kindOf({ lines: [{ text }], titleCount: 1 });
    usedNotes.add(j);
  });
  // Siblings written as ":vault" beside "PROBER THREAD:stage" share the prefix.
  nodes.forEach((nd) => {
    if (!nd.label.main.startsWith(':')) return;
    const sib = nodes.find((o) => o !== nd && Math.abs(o.card.titleRow - nd.card.titleRow) <= 1 && /\S:\S/.test(o.label.full));
    if (sib) {
      const pre = sib.label.full.split(':')[0];
      nd.label = splitLabel(pre + nd.label.main);
      nd.kind = sib.kind;
    }
  });
  // A bare payload ("{ action, … }") beside a card, with no wires of its own, is that card's detail.
  for (let k = nodes.length - 1; k >= 0; k--) {
    const nd = nodes[k];
    if (!/^[{(]/.test(nd.label.full) || edges.some((e) => e.from === nd.id || e.to === nd.id)) continue;
    const left = nodes.filter((o) => o !== nd && o.card.titleRow === nd.card.titleRow && o.card.c2 < nd.card.c1).sort((a, b) => b.card.c2 - a.card.c2)[0];
    if (left) {
      left.details.push(nd.label.full, ...nd.details);
      nodes.splice(k, 1);
    }
  }

  // Leftover notes: annotations on the nearest card.
  S.notes.forEach((n, j) => {
    if (usedNotes.has(j)) return;
    let best: WorkNode | null = null;
    let bd = 1e9;
    for (const nd of nodes) {
      const c = nd.card;
      const dr = n.r1 > c.r2 ? n.r1 - c.r2 : c.r1 > n.r2 ? c.r1 - n.r2 : 0;
      const dc = n.c1 > c.c2 ? n.c1 - c.c2 : c.c1 > n.c2 ? c.c1 - n.c2 : 0;
      const d = dr * 3 + dc;
      if (d < bd) {
        bd = d;
        best = nd;
      }
    }
    if (best) best.notes.push(oneLine(n.lines));
  });

  // Dedupe edges.
  const seenEdge = new Set<string>();
  const uniq = edges.filter((e) => {
    const key = `${e.from}>${e.to}`;
    if (seenEdge.has(key)) return false;
    seenEdge.add(key);
    return true;
  });

  // Renumber: nodes and groups are addressed by their index in the returned arrays.
  const nodeIndex = new Map(nodes.map((n, i) => [n.id, i]));
  const groupIndex = new Map(groupCards.map((g, i) => [g.i, i]));
  const outNodes: DiagramNode[] = nodes.map((n, i) => ({
    id: i,
    kind: n.kind,
    label: n.label,
    details: n.details,
    notes: n.notes,
    group: n.group === null ? null : (groupIndex.get(n.group) ?? null),
    row: n.card.titleRow,
    col: n.card.c1,
  }));
  const outEdges: DiagramEdge[] = [];
  for (const e of uniq) {
    const from = nodeIndex.get(e.from);
    const to = nodeIndex.get(e.to);
    if (from === undefined || to === undefined) continue;
    outEdges.push({ from, to, label: e.label, directed: e.directed, implied: e.implied });
  }
  const outGroups: DiagramGroup[] = groupCards.map((g, i) => ({
    id: i,
    label: labelOf(g),
    details: g.lines.map((l) => l.text).slice(1),
  }));
  const thin =
    outNodes.length < 4 ||
    outEdges.length < outNodes.length / 2 ||
    S.quality < 0.6 ||
    S.dangling > 2 ||
    outNodes.length > MAX_GRAPH_NODES;
  return { nodes: outNodes, edges: outEdges, groups: outGroups, quality: S.quality, dangling: S.dangling, thin };
}

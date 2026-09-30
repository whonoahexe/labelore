// Shared with sketch 011: model → cards, notes and connector cells (copied from 011-diagram-redraw/index.html).
const LINE = '─│┌┐└┘├┤┬┴┼', ARROW = '▼▲►◄→←↑↓';
const CONN = { '─':'lr','│':'ud','┌':'rd','┐':'ld','└':'ur','┘':'ul','├':'udr','┤':'udl','┬':'lrd','┴':'lru','┼':'udlr',
  '▼':'u','▲':'d','►':'l','◄':'r','→':'l','←':'r','↓':'u','↑':'d' };
const TIP = { '▼':'d','▲':'u','►':'r','◄':'l','→':'r','←':'l','↓':'d','↑':'u' };

function shapes(d) {
  // A widened box can end a column or two past the longest text line: pad the grid to cover it.
  const m = d.model, H = m.height, W = Math.max(m.width, ...m.cards.map(c => c.c2 + 2));
  const G = m.rows.map(segs => { const s = segs.map(x => x[0]).join(''); return (s + ' '.repeat(W)).slice(0, W).split(''); });
  const K = m.rows.map(segs => { const k = []; segs.forEach(([t, kind]) => { for (const _ of t) k.push(kind); }); while (k.length < W) k.push(null); return k; });
  // Cards, innermost wins ownership. Box interior excludes its (blanked) border; a node card is its text rect.
  const cards = m.cards.map((c, i) => ({ ...c, i, area: (c.r2 - c.r1 + 1) * (c.c2 - c.c1 + 1) }));
  // Groups first (pure geometry): a box that encloses another card. Its frame always encloses
  // its children, even when the model clamped an open left edge.
  cards.forEach(c => {
    const kids = cards.filter(o => o !== c && o.r1 > c.r1 && o.r2 < c.r2 && o.c2 <= c.c2 + 1 && o.c1 >= c.c1 - 1);
    c.group = c.kind === 'box' && kids.length > 0;
    if (c.group && c.frame) { const l = Math.min(c.frame.left, ...kids.map(k => (k.frame ? k.frame.left : k.c1) - 1.5)); c.frame = { ...c.frame, width: c.frame.width + (c.frame.left - l), left: l }; }
  });
  const own = Array.from({ length: H }, () => new Array(W).fill(-1));
  [...cards].sort((a, b) => b.area - a.area).forEach(c => {
    const [r1, r2, c1, c2] = c.kind === 'box' ? [c.r1 + 1, c.r2 - 1, c.c1 + 1, c.c2 - 1] : [c.r1, c.r2, c.c1, c.c2];
    for (let r = r1; r <= r2; r++) for (let x = Math.max(0, c1); x <= Math.min(W - 1, c2); x++) {
      // A group owns only its own words: the wires and cards inside it stay what they are.
      if (c.group && (LINE.includes(G[r][x]) || ARROW.includes(G[r][x]))) continue;
      own[r][x] = c.i;
    }
    if (c.group) for (let r = r1; r <= r2; r++) {
      // ...and a note that starts outside the group and runs into it stays a note.
      let x = 0;
      while (x < W) {
        if (G[r][x] === ' ' || LINE.includes(G[r][x]) || ARROW.includes(G[r][x])) { x++; continue; }
        let e = x, gap = 0; while (e < W && !LINE.includes(G[r][e]) && !ARROW.includes(G[r][e])) { if (G[r][e] === ' ') { if (++gap >= 2) break; } else gap = 0; e++; }
        if (x < c1) for (let q = x; q < e; q++) if (own[r][q] === c.i) own[r][q] = -1;
        x = e;
      }
    }
  });
  // Card text lines: per owned row, the owned cells' text (node cards drop trunk glyphs).
  cards.forEach(c => {
    c.lines = [];
    for (let r = c.r1; r <= c.r2; r++) {
      let s = '';
      let start = -1;
      for (let x = 0; x < W; x++) if (own[r][x] === c.i) { if (start < 0) start = x; s += G[r][x]; } else if (start >= 0 && s !== '') s += ' ';
      if (c.kind === 'node') s = s.replace(/[│┆]/g, ' ');
      const lead = s.length - s.trimStart().length;
      s = s.replace(/\s+$/, '');
      if (s.trim() === '') continue;
      c.lines.push({ r, col: start + lead, text: s.trimStart() });
    }
    if (!c.lines.length) c.lines.push({ r: c.r1 + (c.kind === 'box' ? 1 : 0), col: c.c1 + 1, text: '' });
    c.titleRow = c.lines[0].r;
    // A title line that ends mid-thought ("… /", "… (") continues onto the next line.
    let t = 1; while (t < c.lines.length && /[\/(,]$|\bthe$/.test(c.lines[t - 1].text) && t < 3) t++;
    c.titleCount = t;
  });
  // Notes: text outside any card. Runs split on 2+ spaces, then stacked runs merge into blocks.
  const runs = [];
  for (let r = 0; r < H; r++) {
    let x = 0;
    while (x < W) {
      const ch = G[r][x];
      if (ch === ' ' || own[r][x] >= 0 || LINE.includes(ch) || ARROW.includes(ch)) { x++; continue; }
      let e = x, gap = 0;
      while (e < W && own[r][e] < 0 && !LINE.includes(G[r][e]) && !(ARROW.includes(G[r][e]) )) { if (G[r][e] === ' ') { if (++gap >= 2) break; } else gap = 0; e++; }
      const text = G[r].slice(x, e).join('').trimEnd();
      if (text) runs.push({ r, c1: x, c2: x + text.length - 1, text });
      x = e;
    }
  }
  const notes = [];
  runs.forEach(run => {
    const b = notes.find(n => n.r2 === run.r - 1 && run.c1 >= n.c1 - 1 && run.c1 <= n.c1 + 8);
    if (b) { b.r2 = run.r; b.lines.push(run.text); b.c2 = Math.max(b.c2, run.c2); }
    else notes.push({ r1: run.r, r2: run.r, c1: run.c1, c2: run.c2, lines: [run.text] });
  });
  // Connector cells: glyphs outside card interiors.
  let conn = [];
  for (let r = 0; r < H; r++) for (let x = 0; x < W; x++) {
    const ch = G[r][x];
    if ((LINE.includes(ch) || ARROW.includes(ch)) && own[r][x] < 0) conn.push({ r, c: x, ch });
  }
  // Stray fragments: a small connected piece of line that carries no arrow and touches no card is
  // a hand-drawing wobble (a ragged edge, a stub). Drop it; count it against confidence.
  const at = new Map(conn.map(k => [`${k.r},${k.c}`, k]));
  const nearCard = (r, x) => { for (let dr = -1; dr <= 1; dr++) for (let dx = -1; dx <= 1; dx++) { const rr = r + dr, xx = x + dx; if (rr >= 0 && rr < H && xx >= 0 && xx < W && ((own[rr][xx] >= 0 && !cards[own[rr][xx]].group) || cards.some(c => !c.group && rr >= c.r1 && rr <= c.r2 && xx >= c.c1 && xx <= c.c2))) return true; } return false; };
  const seen = new Set(); let dangling = 0; const drop = new Set();
  conn.forEach(k0 => {
    const key0 = `${k0.r},${k0.c}`; if (seen.has(key0)) return;
    const comp = [], stack = [k0]; seen.add(key0);
    while (stack.length) { const k = stack.pop(); comp.push(k); for (const [dr, dx] of [[1,0],[-1,0],[0,1],[0,-1]]) { const q = at.get(`${k.r + dr},${k.c + dx}`); if (q && !seen.has(`${q.r},${q.c}`)) { seen.add(`${q.r},${q.c}`); stack.push(q); } } }
    const arrow = comp.some(k => ARROW.includes(k.ch)), touches = comp.some(k => nearCard(k.r, k.c));
    if (!arrow && comp.length <= 3 && !touches) { dangling++; comp.forEach(k => drop.add(k)); }
    else if (!arrow && !touches) dangling++;
  });
  conn = conn.filter(k => !drop.has(k));
  // Quality: how much of the author's text landed in a card (vs loose notes).
  const inCards = cards.reduce((n, c) => n + c.lines.reduce((m2, l) => m2 + l.text.replace(/\s/g, '').length, 0), 0);
  const loose = notes.reduce((n, b) => n + b.lines.join('').replace(/\s/g, '').length, 0);
  const quality = inCards / Math.max(1, inCards + loose);
  return { H, W, G, K, own, cards, notes, conn, quality, dangling, confident: quality >= 0.6 && dangling <= 2 };
}


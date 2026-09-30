// Sketch 012: the author's ASCII as DATA. shapes() (shared with 011) gives cards, notes and
// connector cells; this turns them into a graph — typed nodes with short labels, directed edges with
// labels, groups, and annotations — that the variants lay out from scratch.

const TIPDIR = { '▼': 'd', '▲': 'u', '►': 'r', '◄': 'l', '→': 'r', '←': 'l', '↓': 'd', '↑': 'u' };
const STEP = { u: [-1, 0], d: [1, 0], l: [0, -1], r: [0, 1] };

// Node kinds, matched on the card's text (title weighted). Order matters: first hit wins.
const KINDS = [
  ['client', 'Client', /\b(browser|next\.js page|client component|frontend|dashboard|preview|ui\b|page\b|react query|artifact page|roadmap\/history)/i],
  ['edge', 'Edge', /\b(cloudflare|vercel|edge\b|proxy|tunnel|cdn|access \()/i],
  ['data', 'Data', /\b(sqlite|database|sqlx|db transaction|insert into|update jobs|select |audit_log|audit row|snapshot|registry|ticket map|hashmap|table)/i],
  ['channel', 'Channel', /\b(bus|broadcast|websocket|\/ws\b|ws connection|ws upgrade|emit|mpsc|sse|event::|pushes event)/i],
  ['worker', 'Worker', /\b(thread|worker|executor|pool|prober|recovery pass|sweep|task\))/i],
  ['external', 'External', /(\/proc|\/mnt|\/dev|kernel|google drive|rclone|filesystem|subprocess|cli project|\bos\b)/i],
  ['service', 'Service', /\b(handler|axum|api|router|middleware|endpoint|hono|server|route|backend|require|resolve|verif|mint|login)/i],
];

function kindOf(card) {
  const title = card.lines.slice(0, card.titleCount).map(l => l.text).join(' ');
  for (const [k, , re] of KINDS) if (re.test(title)) return k;
  const all = card.lines.map(l => l.text).join(' ');
  for (const [k, , re] of KINDS) if (k !== 'client' && k !== 'service' && re.test(all)) return k;
  return 'step';
}

const ACRONYM = new Set(['API', 'WS', 'WSS', 'JWT', 'SQL', 'CLI', 'DB', 'OS', 'UI', 'URL', 'HTTP', 'HTML', 'XML', 'JSON', 'WAL', 'TTL', 'EOF', 'ZIP', 'CF', 'JWKS', 'ID', 'GB', 'SSE', 'CSPRNG', 'GFM', 'PLAN', 'POST', 'GET', 'PATCH', 'PUT', 'DELETE', 'EXISTING', 'NEW', 'FULL']);
function sentence(s) {
  // A SHOUTED phrase → Sentence case; acronyms stay.
  let first = true;
  return s.replace(/\b[A-Za-z][A-Za-z_]*\b/g, w => { const up = w === w.toUpperCase(); const out = up && !ACRONYM.has(w) && w.length > 1 ? (first ? w[0] + w.slice(1).toLowerCase() : w.toLowerCase()) : w; first = false; return out; });
}
function isCode(s) { return /::|\(\)|\(\.\.\.\)|[{}=<>]|\.rs\b|\.ts\b|\w_\w|^\/|`|\.\w+\(/.test(s); }
function clip(s, n) { return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; }

function splitLabel(raw) {
  let t = raw.trim().replace(/:$/, '').replace(/^(─+►|►|→|◄─+)\s*/, '').replace(/^\d+\.\s+/, '');
  let main = t, sub = '';
  // "SHOUTED PHRASE   rest" (the author's double space) → phrase / rest
  const shout = /^(\/?[A-Za-z]*\s?[A-Z][A-Z0-9 &-]{2,}?)\s{2,}(.+)$/.exec(t);
  const tt = t.replace(/\s+/g, ' ');
  const paren = /^(.{3,}?)\s*\((.+)\)$/.exec(tt);
  const colon = /^([A-Za-z][^:{}()=]{2,28}):\s+(.+)$/.exec(tt);
  const sql = /^((?:INSERT INTO|UPDATE|DELETE FROM)\s+\S+|SELECT .*? FROM \S+)\s*(.*)$/i.exec(tt);
  if (shout) { main = shout[1]; sub = shout[2]; }
  else if (colon) { main = colon[1]; sub = colon[2]; }
  else if (sql && sql[2]) { main = sql[1]; sub = sql[2]; }
  else if (paren) { main = paren[1]; sub = paren[2]; }
  else main = tt;
  main = main.replace(/\s+/g, ' ').trim();
  const dash = /^(.{3,}?)\s+[—–]\s+(.+)$/.exec(main);
  if (dash) { main = dash[1]; sub = sub ? `${dash[2]} · ${sub}` : dash[2]; }
  // Code: the name is what precedes its argument list or body.
  if (isCode(main) && main.length > 24) { const m = /^([^({\s]+(?:\s[^({\s]+)?)\s*([({].*)$/.exec(main); if (m) { sub = sub ? `${m[2]} · ${sub}` : m[2]; main = m[1]; } }
  main = main.replace(/\s*\/\s*$/, '').replace(/[,;]$/, '');
  const letters = main.replace(/[^A-Za-z]/g, '');
  if (letters && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.6 && !isCode(main)) main = sentence(main);
  sub = sub.replace(/\s+/g, ' ').trim().replace(/^[\/·—-]\s*/, '').replace(/^\((.*)\)?$/, '$1').replace(/\)$/, '').trim();
  // Shouted words in a mixed label ("/ws HANDLER") → lower case, unless it is SQL.
  if (!/^(INSERT|UPDATE|DELETE|SELECT)\b/.test(main)) main = main.replace(/\b[A-Z]{4,}\b/g, w => (ACRONYM.has(w) ? w : w.toLowerCase()));
  return { main, sub, code: isCode(main), full: tt };
}
function labelOf(card) {
  return splitLabel(card.lines.slice(0, card.titleCount).map(l => l.text).join('  '));
}

function buildGraph(S) {
  const nodesSrc = S.cards.filter(c => !c.group);
  const groups = S.cards.filter(c => c.group);
  const rectHas = (c, r, x) => (c.kind === 'box' ? r >= c.r1 && r <= c.r2 && x >= c.c1 && x <= c.c2 : r >= c.r1 && r <= c.r2 && x >= c.c1 - 1 && x <= c.c2 + 1);
  const cardAt = (r, x) => {
    const hits = nodesSrc.filter(c => rectHas(c, r, x));
    if (hits.length) return hits.sort((a, b) => a.area - b.area)[0];
    return null;
  };
  const noteAt = (r, x) => S.notes.findIndex(n => r >= n.r1 && r <= n.r2 && x >= n.c1 - 1 && x <= n.c2 + 1);

  // Components of connector cells.
  const at = new Map(S.conn.map(k => [`${k.r},${k.c}`, k]));
  const seen = new Set();
  const comps = [];
  S.conn.forEach(k0 => {
    const key0 = `${k0.r},${k0.c}`; if (seen.has(key0)) return;
    const comp = [], stack = [k0]; seen.add(key0);
    while (stack.length) {
      const k = stack.pop(); comp.push(k);
      const next = [[1,0],[-1,0],[0,1],[0,-1]].map(([dr, dx]) => at.get(`${k.r + dr},${k.c + dx}`));
      // A vertical the author interrupted with a note continues below it.
      if ((CONN[k.ch] || '').includes('d') && !at.has(`${k.r + 1},${k.c}`)) for (let g = 2; g <= 4; g++) { const q = at.get(`${k.r + g},${k.c}`); if (q) { if ((CONN[q.ch] || '').includes('u')) next.push(q); break; } }
      if ((CONN[k.ch] || '').includes('u') && !at.has(`${k.r - 1},${k.c}`)) for (let g = 2; g <= 4; g++) { const q = at.get(`${k.r - g},${k.c}`); if (q) { if ((CONN[q.ch] || '').includes('d')) next.push(q); break; } }
      next.forEach(q => { if (q && !seen.has(`${q.r},${q.c}`)) { seen.add(`${q.r},${q.c}`); stack.push(q); } });
    }
    comps.push(comp);
  });

  const nodes = nodesSrc.map(c => ({ id: c.i, card: c, kind: kindOf(c), label: labelOf(c), details: c.lines.slice(c.titleCount).map(l => l.text), notes: [], group: null }));
  const byId = new Map(nodes.map(n => [n.id, n]));
  groups.forEach(g => nodes.forEach(n => { const c = n.card; if (c.r1 > g.r1 && c.r2 < g.r2 && c.c1 >= g.c1 - 1 && c.c2 <= g.c2 + 1) n.group = g.i; }));
  const edges = [];
  const usedNotes = new Set();
  const readingOrder = [...nodes].sort((a, b) => a.card.titleRow - b.card.titleRow || a.card.c1 - b.card.c1);

  comps.forEach(comp => {
    const tips = [], ends = [];
    comp.forEach(({ r, c, ch }) => {
      const dirs = new Set((CONN[ch] || '').split(''));
      if (TIPDIR[ch]) dirs.add(TIPDIR[ch]);
      dirs.forEach(dir => {
        const [dr, dx] = STEP[dir];
        if (at.has(`${r + dr},${c + dx}`)) return;
        let hit = null, note = -1;
        for (let k = 1; k <= 3 && !hit; k++) { hit = cardAt(r + dr * k, c + dx * k); if (!hit && note < 0) note = noteAt(r + dr * k, c + dx * k); if (!hit && S.G[r + dr * k] && S.G[r + dr * k][c + dx * k] && S.G[r + dr * k][c + dx * k] !== ' ' && note >= 0) break; }
        (TIPDIR[ch] === dir ? tips : ends).push({ card: hit, note, r, c });
      });
    });
    // Labels: notes that sit right beside the wire.
    const labels = [];
    S.notes.forEach((n, j) => {
      if (usedNotes.has(j)) return;
      const beside = comp.some(k => k.r >= n.r1 && k.r <= n.r2 && ((n.c1 - k.c >= 1 && n.c1 - k.c <= 3) || (k.c - n.c2 >= 1 && k.c - n.c2 <= 3 && TIPDIR[k.ch] !== 'l')));
      if (beside) { labels.push(n.lines.join(' ').replace(/\s+/g, ' ')); usedNotes.add(j); }
    });
    const targets = [...new Set(tips.filter(t => t.card).map(t => t.card.i))];
    let sources = [...new Set(ends.filter(e => e.card).map(e => e.card.i))].filter(i => !targets.includes(i));
    const pointerFromNote = ends.some(e => !e.card && e.note >= 0) && !sources.length;
    if (pointerFromNote && targets.length) {
      // "◄─ note": an annotation pointing at a card, not a flow.
      ends.filter(e => e.note >= 0).forEach(e => { if (!usedNotes.has(e.note)) { usedNotes.add(e.note); targets.forEach(t => byId.get(t) && byId.get(t).notes.push(S.notes[e.note].lines.join(' ').replace(/\s+/g, ' '))); } });
      labels.forEach(l => targets.forEach(t => byId.get(t) && byId.get(t).notes.push(l)));
      return;
    }
    if (!targets.length && sources.length >= 2) {
      // No arrowheads: connect in reading order, top/left first.
      const sorted = sources.map(i => byId.get(i)).filter(Boolean).sort((a, b) => a.card.titleRow - b.card.titleRow || a.card.c1 - b.card.c1);
      for (let k = 1; k < sorted.length; k++) edges.push({ from: sorted[0].id, to: sorted[k].id, label: k === 1 ? labels.join(' · ') : '', directed: false });
      return;
    }
    if (targets.length && !sources.length) {
      // Arrows with no drawn source: the flow comes from the card just above the wire (a fan-out
      // bus shares one), or, for a same-row step, from the card to its left.
      const top = Math.min(...comp.map(k => k.r)), cols = comp.map(k => k.c), lo = Math.min(...cols), hi = Math.max(...cols);
      const above = nodes.filter(p => p.card.r2 < top && !targets.includes(p.id)).sort((a, b) => b.card.r2 - a.card.r2 || Math.abs((a.card.c1 + a.card.c2) / 2 - (lo + hi) / 2) - Math.abs((b.card.c1 + b.card.c2) / 2 - (lo + hi) / 2));
      const overl = above.filter(p => p.card.c2 >= lo - 2 && p.card.c1 <= hi + 2);
      const src = (overl[0] && overl[0].card.r2 >= (above[0] ? above[0].card.r2 - 1 : 0)) ? overl[0] : above[0];
      targets.forEach((t, k) => {
        const tn = byId.get(t);
        const left = nodes.filter(p => p.card.titleRow === tn.card.titleRow && p.card.c2 < tn.card.c1).sort((a, b) => b.card.c2 - a.card.c2)[0];
        const from = comp.every(q => q.r === tn.card.titleRow) && left ? left : src;
        if (from) edges.push({ from: from.id, to: t, label: k === 0 ? labels.join(' · ') : '', directed: true, implied: true });
      });
      return;
    }
    let first = true;
    sources.forEach(s => targets.forEach(t => { if (s !== t) { edges.push({ from: s, to: t, label: first ? labels.join(' · ') : '', directed: true }); first = false; } }));
  });

  // A SHOUTED note right beside a box that has no heading of its own is that box's name
  // ("HOST KERNEL / DEVICES" beside the /proc… box).
  S.notes.forEach((n, j) => {
    if (usedNotes.has(j)) return;
    const text = n.lines.join(' ').trim(), letters = text.replace(/[^A-Za-z]/g, '');
    if (!letters || letters.replace(/[^A-Z]/g, '').length / letters.length < 0.8 || text.length > 40) return;
    const box = nodes.find(nd => nd.card.kind === 'box' && n.r1 <= nd.card.r2 && n.r2 >= nd.card.r1 && (nd.card.c1 - n.c2 >= 1 && nd.card.c1 - n.c2 <= 4 || n.c1 - nd.card.c2 >= 1 && n.c1 - nd.card.c2 <= 4));
    if (!box) return;
    box.details.unshift(box.card.lines.slice(0, box.card.titleCount).map(l => l.text).join(' '));
    box.label = splitLabel(text); box.kind = kindOf({ lines: [{ text }], titleCount: 1 }) || box.kind;
    usedNotes.add(j);
  });
  // Siblings written as ":vault" beside "PROBER THREAD:stage" share the prefix.
  nodes.forEach(nd => {
    if (!/^:/.test(nd.label.main)) return;
    const sib = nodes.find(o => o !== nd && Math.abs(o.card.titleRow - nd.card.titleRow) <= 1 && /\S:\S/.test(o.label.full));
    if (sib) { const pre = sib.label.full.split(':')[0]; nd.label = splitLabel(pre + nd.label.main); nd.kind = sib.kind; }
  });
  // A bare payload ("{ action, … }") beside a card, with no wires of its own, is that card's detail.
  for (let k = nodes.length - 1; k >= 0; k--) {
    const nd = nodes[k];
    if (!/^[{(]/.test(nd.label.full) || edges.some(e => e.from === nd.id || e.to === nd.id)) continue;
    const left = nodes.filter(o => o !== nd && o.card.titleRow === nd.card.titleRow && o.card.c2 < nd.card.c1).sort((a, b) => b.card.c2 - a.card.c2)[0];
    if (left) { left.details.push(nd.label.full, ...nd.details); nodes.splice(k, 1); }
  }

  // Leftover notes: annotations on the nearest card.
  S.notes.forEach((n, j) => {
    if (usedNotes.has(j)) return;
    let best = null, bd = 1e9;
    nodes.forEach(nd => { const c = nd.card; const dr = n.r1 > c.r2 ? n.r1 - c.r2 : c.r1 > n.r2 ? c.r1 - n.r2 : 0; const dc = n.c1 > c.c2 ? n.c1 - c.c2 : c.c1 > n.c2 ? c.c1 - n.c2 : 0; const d = dr * 3 + dc; if (d < bd) { bd = d; best = nd; } });
    if (best) best.notes.push(n.lines.join(' ').replace(/\s+/g, ' '));
  });

  // Dedupe edges.
  const seenE = new Set();
  const uniq = edges.filter(e => { const k = `${e.from}>${e.to}`; if (seenE.has(k)) return false; seenE.add(k); return true; });
  return { nodes, edges: uniq, groups: groups.map(g => ({ id: g.i, label: labelOf(g), details: g.lines.map(l => l.text).slice(1), card: g })) };
}

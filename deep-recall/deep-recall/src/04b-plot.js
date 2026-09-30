/* ------------------------------------------------------------------ graphs: ```plot blocks drawn as SVG */
const PLOT_DOC = `Graphs: when a picture helps (a function's shape, an area, a tangent line, forces, a slope field), include a fenced block the app draws:
\`\`\`plot
x: -4, 4
y: -2, 6
f: x^2 | y = x²
f: 2*x - 1 | tangent at x = 1
point: 1, 1 | (1, 1)
shade: x^2, 0, 2 | area
vline: 2
hline: 0
vector: (0,0) -> (3,2) | F
param: cos(t); sin(t)
t: 0, 6.2832
field: x - y
slider: a, -3, 3, 1 | a
\`\`\`
Every line is optional except at least one of f, point, vector, param, or field. Expressions use ASCII math (* ^ sqrt() sin() exp() ln() pi). "field" draws a slope field for dy/dx. Text after | is a label. Keep plots simple: at most 4 curves.
Explorable graphs: "slider: name, min, max, start" makes a draggable parameter (a single letter other than x, y, t). Any line can use it, e.g. "f: a*x^2", "point: a, a^2", "f: 2*a*(x - a) + a^2 | tangent at x = a". Use a slider whenever the idea is how something changes (a parameter, a point of tangency, a bound), and tell the learner what to drag and what to watch for.`;

function parsePlotSpec(text, scope) {
  const spec = {f:[], points:[], vlines:[], hlines:[], shade:[], vectors:[], params:[], field:null, t:[0, 2 * Math.PI], sliders:[]};
  const E = x => MX.evalStr(x, scope);
  String(text).split('\n').forEach(line => {
    const m = line.match(/^\s*([a-zA-Z]+)\s*:\s*(.*)$/); if (!m) return;
    const k = m[1].toLowerCase(); const bar = m[2].indexOf('|');
    const val = (bar >= 0 ? m[2].slice(0, bar) : m[2]).trim(), label = bar >= 0 ? m[2].slice(bar + 1).trim() : '';
    const nums = s => s.split(',').map(x => E(x.trim()));
    if (k === 'x' || k === 'y' || k === 't') { const [a, b] = nums(val); if (isFinite(a) && isFinite(b) && b > a) spec[k] = [a, b]; }
    else if (k === 'f' || k === 'y=') spec.f.push({expr:val.replace(/^y\s*=\s*/, ''), label});
    else if (k === 'point') { const [a, b] = nums(val.replace(/[()]/g, '')); if (isFinite(a) && isFinite(b)) spec.points.push({x:a, y:b, label}); }
    else if (k === 'vline') { const a = E(val.replace(/^x\s*=\s*/, '')); if (isFinite(a)) spec.vlines.push({x:a, label}); }
    else if (k === 'hline') { const a = E(val.replace(/^y\s*=\s*/, '')); if (isFinite(a)) spec.hlines.push({y:a, label}); }
    else if (k === 'shade') { const parts = val.split(','); if (parts.length >= 3) { const b = E(parts.pop()), a = E(parts.pop()); if (isFinite(a) && isFinite(b)) spec.shade.push({expr:parts.join(','), a, b, label}); } }
    else if (k === 'vector') { const mm = val.match(/\(?\s*([^,()]+?)\s*,\s*([^,()]+?)\s*\)?\s*->\s*\(?\s*([^,()]+?)\s*,\s*([^,()]+?)\s*\)?\s*$/); if (mm) { const v = mm.slice(1).map(x => E(x)); if (v.every(isFinite)) spec.vectors.push({x0:v[0], y0:v[1], x1:v[2], y1:v[3], label}); } }
    else if (k === 'param') { const pr = val.split(';'); if (pr.length === 2) spec.params.push({fx:pr[0].trim(), fy:pr[1].trim(), label}); }
    else if (k === 'field') spec.field = val;
    else if (k === 'slider') { const pr = val.split(',').map(x => x.trim()), nm = pr[0]; const [lo, hi, st, stp] = pr.slice(1).map(x => MX.evalStr(x)); if (/^[a-zA-Z]$/.test(nm) && !/[xyt]/.test(nm) && isFinite(lo) && isFinite(hi) && hi > lo && spec.sliders.length < 3) spec.sliders.push({name:nm, lo, hi, v:isFinite(st) ? Math.min(hi, Math.max(lo, st)) : (lo + hi) / 2, step:isFinite(stp) && stp > 0 ? stp : (hi - lo) / 100, label}); }
    else if (k === 'title' || k === 'xlabel' || k === 'ylabel') spec[k] = m[2].trim();
  });
  return spec;
}
function niceStep(range, target) {
  const raw = range / (target || 6), p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
}
function plotDefaults(text) { const o = {}; parsePlotSpec(text).sliders.forEach(s => { o[s.name] = s.v; }); return o; }
function renderPlot(text, vals) {
  if (!MX.ok()) return null;
  const scope = Object.assign(plotDefaults(text), vals || {});
  const spec = parsePlotSpec(text, scope);
  const comp = e => { try { return window.math.parse(MX.norm(e)).compile(); } catch (err) { return null; } };
  const ev = (c, sc) => { try { return MX.num(c.evaluate(Object.assign({}, scope, sc))); } catch (err) { return NaN; } };
  let [x0, x1] = spec.x || [NaN, NaN];
  if (!spec.x) {
    const xs = [];
    spec.points.forEach(p => xs.push(p.x)); spec.vectors.forEach(v => xs.push(v.x0, v.x1)); spec.vlines.forEach(v => xs.push(v.x)); spec.shade.forEach(s => xs.push(s.a, s.b));
    if (xs.length) { const lo = Math.min(...xs), hi = Math.max(...xs), pad = Math.max(1, (hi - lo) * 0.25); x0 = Math.min(lo - pad, spec.f.length ? -5 : lo - pad); x1 = Math.max(hi + pad, spec.f.length ? 5 : hi + pad); }
    else { x0 = -5; x1 = 5; }
  }
  const N = 280, series = [], ys = [];
  spec.f.forEach((fn, i) => {
    const c = comp(fn.expr); if (!c) return;
    const pts = [];
    for (let j = 0; j <= N; j++) { const x = x0 + (x1 - x0) * j / N, y = ev(c, {x}); pts.push([x, y]); if (isFinite(y)) ys.push(y); }
    series.push({pts, label:fn.label || ('y = ' + fn.expr), i});
  });
  spec.params.forEach(pr => {
    const cx = comp(pr.fx), cy = comp(pr.fy); if (!cx || !cy) return;
    const pts = [];
    for (let j = 0; j <= N; j++) { const t = spec.t[0] + (spec.t[1] - spec.t[0]) * j / N; const x = ev(cx, {t}), y = ev(cy, {t}); pts.push([x, y]); if (isFinite(y)) ys.push(y); }
    series.push({pts, label:pr.label || '(' + pr.fx + ', ' + pr.fy + ')', i:series.length, param:true});
  });
  spec.points.forEach(p => ys.push(p.y)); spec.vectors.forEach(v => ys.push(v.y0, v.y1)); spec.hlines.forEach(h => ys.push(h.y));
  let [y0, y1] = spec.y || [NaN, NaN];
  if (!spec.y) {
    if (ys.length) {
      const s = ys.slice().sort((a, b) => a - b), q = p => s[Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))))];
      let lo = Math.min(q(0.03), 0), hi = Math.max(q(0.97), 0);
      if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
      const pad = (hi - lo) * 0.12; y0 = lo - pad; y1 = hi + pad;
    } else { y0 = -5; y1 = 5; }
  }
  if (spec.params.length && !spec.x && !spec.y) {
    const xs = []; series.filter(s => s.param).forEach(s => s.pts.forEach(p => { if (isFinite(p[0])) xs.push(p[0]); }));
    if (xs.length) { const lo = Math.min(...xs), hi = Math.max(...xs), pad = (hi - lo) * 0.15 || 1; x0 = lo - pad; x1 = hi + pad; }
  }
  const W = 560, H = 340, L = 46, R = 14, T = 14, B = 32;
  const sx = x => L + (x - x0) / (x1 - x0) * (W - L - R), sy = y => T + (y1 - y) / (y1 - y0) * (H - T - B);
  const inY = y => y >= y0 - (y1 - y0) * 2 && y <= y1 + (y1 - y0) * 2;
  let g = '', gA = '';
  const xs = niceStep(x1 - x0, 7), ysn = niceStep(y1 - y0, 6);
  const fmt = v => Math.abs(v) < 1e-9 ? '0' : (Math.abs(v) >= 1000 || Math.abs(v) < 0.01 ? v.toExponential(0) : String(+v.toFixed(2)));
  for (let v = Math.ceil(x0 / xs) * xs; v <= x1 + 1e-9; v += xs) gA += `<line class="pg" x1="${sx(v)}" y1="${T}" x2="${sx(v)}" y2="${H - B}"/><text class="pt" x="${sx(v)}" y="${H - B + 16}" text-anchor="middle">${fmt(v)}</text>`;
  for (let v = Math.ceil(y0 / ysn) * ysn; v <= y1 + 1e-9; v += ysn) gA += `<line class="pg" x1="${L}" y1="${sy(v)}" x2="${W - R}" y2="${sy(v)}"/><text class="pt" x="${L - 6}" y="${sy(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
  if (y0 <= 0 && y1 >= 0) gA += `<line class="pa" x1="${L}" y1="${sy(0)}" x2="${W - R}" y2="${sy(0)}"/>`;
  if (x0 <= 0 && x1 >= 0) gA += `<line class="pa" x1="${sx(0)}" y1="${T}" x2="${sx(0)}" y2="${H - B}"/>`;
  if (spec.field) {
    const c = comp(spec.field);
    if (c) for (let a = 0; a < 17; a++) for (let b = 0; b < 11; b++) {
      const x = x0 + (x1 - x0) * (a + 0.5) / 17, y = y0 + (y1 - y0) * (b + 0.5) / 11, m = ev(c, {x, y});
      if (!isFinite(m)) continue;
      const dx = 1, dy = m, px = dx * (W - L - R) / (x1 - x0), py = -dy * (H - T - B) / (y1 - y0), len = Math.hypot(px, py) || 1, k = 9 / len;
      g += `<line class="pf" x1="${sx(x) - px * k}" y1="${sy(y) - py * k}" x2="${sx(x) + px * k}" y2="${sy(y) + py * k}"/>`;
    }
  }
  spec.shade.forEach((s, i) => {
    const c = comp(s.expr); if (!c) return;
    let d = `M${sx(s.a)},${sy(Math.max(y0, Math.min(y1, 0)))}`;
    for (let j = 0; j <= 80; j++) { const x = s.a + (s.b - s.a) * j / 80, y = ev(c, {x}); if (isFinite(y)) d += `L${sx(x)},${sy(Math.max(y0, Math.min(y1, y)))}`; }
    d += `L${sx(s.b)},${sy(Math.max(y0, Math.min(y1, 0)))}Z`;
    g += `<path class="ps ps${i % 4}" d="${d}"/>`;
  });
  series.forEach(s => {
    let d = '', pen = false, prev = null;
    s.pts.forEach(([x, y]) => {
      if (!isFinite(x) || !isFinite(y) || !inY(y)) { pen = false; prev = null; return; }
      if (prev && Math.abs(y - prev) > (y1 - y0) * 1.5) pen = false;
      d += (pen ? 'L' : 'M') + sx(x).toFixed(1) + ',' + sy(y).toFixed(1); pen = true; prev = y;
    });
    g += `<path class="pl pc${s.i % 4}" d="${d}"/>`;
  });
  spec.vlines.forEach(v => { g += `<line class="pr" x1="${sx(v.x)}" y1="${T}" x2="${sx(v.x)}" y2="${H - B}"/>${v.label ? `<text class="pt2" x="${sx(v.x) + 4}" y="${T + 12}">${esc(v.label)}</text>` : ''}`; });
  spec.hlines.forEach(h => { g += `<line class="pr" x1="${L}" y1="${sy(h.y)}" x2="${W - R}" y2="${sy(h.y)}"/>${h.label ? `<text class="pt2" x="${W - R - 4}" y="${sy(h.y) - 5}" text-anchor="end">${esc(h.label)}</text>` : ''}`; });
  spec.vectors.forEach((v, i) => {
    const X0 = sx(v.x0), Y0 = sy(v.y0), X1 = sx(v.x1), Y1 = sy(v.y1), ang = Math.atan2(Y1 - Y0, X1 - X0), a = 10;
    const h1 = `${X1 - a * Math.cos(ang - 0.4)},${Y1 - a * Math.sin(ang - 0.4)}`, h2 = `${X1 - a * Math.cos(ang + 0.4)},${Y1 - a * Math.sin(ang + 0.4)}`;
    g += `<line class="pv pc${i % 4}" x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y1}"/><polygon class="ph ph${i % 4}" points="${X1},${Y1} ${h1} ${h2}"/>${v.label ? `<text class="pt2" x="${X1 + 6}" y="${Y1 - 6}">${esc(v.label)}</text>` : ''}`;
  });
  spec.points.forEach(p => { if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) return; g += `<circle class="pp" cx="${sx(p.x)}" cy="${sy(p.y)}" r="4.5"/>${p.label ? `<text class="pt2" x="${sx(p.x) + 7}" y="${sy(p.y) - 7}">${esc(p.label)}</text>` : ''}`; });
  if (spec.xlabel) gA += `<text class="pt" x="${W - R}" y="${H - 4}" text-anchor="end">${esc(spec.xlabel)}</text>`;
  if (spec.ylabel) gA += `<text class="pt" x="${L + 4}" y="${T + 10}">${esc(spec.ylabel)}</text>`;
  const legend = series.map(s => `<span class="lg"><i class="lgc${s.i % 4}"></i>${esc(s.label)}</span>`).join('') + spec.shade.map((s, i) => s.label ? `<span class="lg"><i class="lgs${i % 4}"></i>${esc(s.label)}</span>` : '').join('');
  const title = spec.title ? esc(spec.title) : 'Graph';
  return `<figure class="plot-fig"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}" preserveAspectRatio="xMidYMid meet"><defs><clipPath id="pclip"><rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}"/></clipPath></defs>${gA}<g clip-path="url(#pclip)">${g}</g></svg>${spec.title || legend ? `<figcaption>${spec.title ? `<b>${esc(spec.title)}</b>` : ''}${legend}</figcaption>` : ''}</figure>`;
}
function drawPlots(root) {
  if (!root || !root.querySelectorAll || !MX.ok()) return;
  root.querySelectorAll('.plot:not([data-done])').forEach(el => {
    const text = el.getAttribute('data-spec') || '';
    let html = null, sl = [];
    try { sl = parsePlotSpec(text).sliders; html = renderPlot(text); } catch (e) { html = null; }
    el.setAttribute('data-done', '1');
    if (!html) { el.innerHTML = `<div class="notice small">This graph couldn’t be drawn.</div>`; return; }
    if (!sl.length) { el.innerHTML = html; return; }
    const vals = {}; sl.forEach(s => { vals[s.name] = s.v; });
    const fmtv = v => String(+v.toFixed(3));
    el.innerHTML = `<div class="plot-live">${html}</div><div class="sliders">${sl.map(s => `<label class="slider"><span><b>${esc(s.label || s.name)}</b> = <output>${fmtv(s.v)}</output></span><input type="range" min="${s.lo}" max="${s.hi}" step="${s.step}" value="${s.v}" data-sl="${esc(s.name)}" aria-label="${esc(s.label || s.name)}"></label>`).join('')}<span class="hint">Drag to explore</span></div>`;
    let raf = 0;
    el.querySelectorAll('input[data-sl]').forEach(inp => inp.addEventListener('input', () => {
      vals[inp.dataset.sl] = +inp.value; inp.parentElement.querySelector('output').textContent = fmtv(+inp.value);
      if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const h = renderPlot(text, vals); if (h) el.querySelector('.plot-live').innerHTML = h; });
    }));
  });
}

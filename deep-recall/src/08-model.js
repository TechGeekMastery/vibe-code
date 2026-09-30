/* ------------------------------------------------------------------ model helpers */
function allSubjects() { return SUBJECTS.concat(Object.values(Store.custom).sort((a, b) => (a.created || 0) - (b.created || 0))); }
function subj(sid) { return SUBJECTS.find(s => s.id === sid) || Store.custom[sid] || null; }
function nodeKeys(s) { const out = []; s.units.forEach((u, ui) => u.n.forEach((t, ni) => out.push(s.id + '-' + ui + '-' + ni))); return out; }
function unitKeys(s, ui) { return s.units[ui].n.map((_, ni) => s.id + '-' + ui + '-' + ni); }
function nodeInfo(key) {
  if (!key) return null;
  const parts = String(key).split('-'); if (parts.length !== 3) return null;
  const s = subj(parts[0]); if (!s) return null;
  const u = s.units[+parts[1]]; if (!u) return null;
  const t = u.n[+parts[2]]; if (t == null) return null;
  return {key, sid:s.id, ui:+parts[1], ni:+parts[2], subject:s, unit:u.t, title:t, program:!!s.program, lang:s.lang || null, skills:!!s.skills, code:s.code || null, cert:!!s.cert};
}
function kindOf(s) { return s.lang ? 'lang' : s.skills ? 'skills' : s.program ? 'program' : 'concept'; }
function ensureNode(k) { if (!Store.nodes[k]) Store.nodes[k] = {key:k, mastery:0, sessions:0}; return Store.nodes[k]; }
function pst(n) { return (n && n.p) || {a:0, c:0, f:0}; }

/* effective mastery fades with time since practice; a longer review interval (stronger memory) fades slower */
function legacyMastery(n) {
  if (!n) return 0;
  const m = n.mastery || 0;
  if (!n.last || !m) return m;
  const days = (Date.now() - n.last) / DAY;
  const halfLife = Math.max(4, (n.interval || 1) * 2);
  const R = Math.pow(2, -days / halfLife);
  return Math.round(m * (0.35 + 0.65 * R));
}
function openGaps() { return Object.values(Store.gaps).filter(g => g.status === 'open' && nodeInfo(g.node)); }
function openGapsFor(k) { return openGaps().filter(g => g.node === k).sort((a, b) => (b.hits || 1) - (a.hits || 1)); }
function dueNodes() { const now = Date.now(); return Object.values(Store.nodes).filter(n => n.due && n.due <= now && nodeInfo(n.key)).sort((a, b) => a.due - b.due); }
function statsFor(keys) {
  let a = 0, c = 0, f = 0, started = 0;
  keys.forEach(k => { const n = Store.nodes[k]; if (!n) return; const p = pst(n); a += p.a || 0; c += p.c || 0; f += p.f || 0; if (n.sessions || n.hasLesson || p.a || n.study || (n.bits && n.bits.done && Object.keys(n.bits.done).length)) started++; });
  const avg = Math.round(mean(keys.map(k => mastery(Store.nodes[k]))));
  return {keys, a, c, f, started, avg};
}
function subjectStats(s) { return statsFor(nodeKeys(s)); }
function skillsFor(keys) {
  const agg = {};
  keys.forEach(k => { const sk = Store.nodes[k] && Store.nodes[k].skills; if (!sk) return; Object.keys(sk).forEach(name => { const x = agg[name] = agg[name] || {a:0, c:0}; x.a += sk[name].a || 0; x.c += sk[name].c || 0; }); });
  return Object.entries(agg).map(([name, v]) => ({name, a:v.a, c:v.c})).sort((x, y) => y.c - x.c);
}
function errorsFor(keys) {
  const agg = {};
  keys.forEach(k => { const e = Store.nodes[k] && Store.nodes[k].errs; if (!e) return; Object.keys(e).forEach(t => { agg[t] = (agg[t] || 0) + e[t]; }); });
  return Object.entries(agg).sort((a, b) => b[1] - a[1]);
}
function streakNow() {
  let k = isCovered(today()) ? 0 : 1, n = 0;
  while (n < 3650 && isCovered(daysAgo(k))) { n++; k++; }
  return n;
}
function addXP(n) {
  const p = Store.profile; n = Math.max(0, Math.round(n)); if (!n) return;
  const t = today();
  let bonus = 0;
  if (p.lastDay !== t) { bonus = comebackCheck(p, t); p.streak = (p.lastDay === dayKey(Date.now() - DAY)) ? (p.streak || 0) + 1 : 1; p.lastDay = t; }
  if (bonus) { n += bonus; setTimeout(() => toast(`Welcome back: +${bonus} XP for returning. The first session after a break is the one that counts most.`), 400); }
  p.xp = (p.xp || 0) + n;
  p.xpByDay = p.xpByDay || {}; p.xpByDay[t] = (p.xpByDay[t] || 0) + n;
  bumpDay('x', n);
  Store.saveProfile();
}
/* returns {gap, isNew} or null. g may carry root_topic/root_reason: the gap is then also logged on its root topic */
function addGap(node, g) {
  const concept = str(g && g.concept).trim().slice(0, 80);
  if (!concept || !nodeInfo(node)) return null;
  const id = (node + '~' + slug(concept)).slice(0, 120);
  let x = Store.gaps[id], isNew = false;
  if (x) { x.hits = (x.hits || 1) + 1 + (g.boost || 0); x.status = 'open'; x.detail = str(g.detail || x.detail).slice(0, 320); x.seen = Date.now(); delete x.resolvedAt; }
  else { x = Store.gaps[id] = {id, node, concept, detail:str(g.detail).slice(0, 320), hits:1 + (g.boost || 0), status:'open', created:Date.now(), seen:Date.now()}; isNew = true; }
  const link = g && g.root_topic ? linkRoot(x, g.root_topic, g.root_reason || g.detail) : null;
  Store.saveGap(id);
  return {gap:x, isNew, link:link || null};
}
/* mark gap x as caused by a prerequisite topic, and open (or bump) the same gap on that root topic */
function linkRoot(x, rootKey, reason) {
  const root = nodeInfo(rootKey); if (!root || !x || root.key === x.node) return;
  const info = nodeInfo(x.node);
  x.root = root.key; x.rootWhy = str(reason).slice(0, 240);
  const rid = (root.key + '~' + slug(x.concept)).slice(0, 120);
  const rx = Store.gaps[rid];
  const prev = rx ? {hits:rx.hits || 1, status:rx.status, resolvedAt:rx.resolvedAt} : null;
  if (rx) { rx.hits = (rx.hits || 1) + 1; rx.status = 'open'; rx.seen = Date.now(); delete rx.resolvedAt; }
  else Store.gaps[rid] = {id:rid, node:root.key, concept:x.concept, detail:(`Surfaced in “${info ? info.title : x.node}”: ` + str(reason)).slice(0, 320), hits:1, status:'open', created:Date.now(), seen:Date.now(), from:x.node};
  Store.saveGap(rid); Store.saveGap(x.id);
  return {rid, prev};
}
/* undo one linkRoot (used when a problem is reported as broken) */
function unlinkRoot(link) {
  if (!link || !link.rid) return;
  const g = Store.gaps[link.rid]; if (!g) return;
  if (!link.prev) { Store.deleteGap(link.rid); return; }
  g.hits = link.prev.hits; g.status = link.prev.status || 'open';
  if (link.prev.resolvedAt) g.resolvedAt = link.prev.resolvedAt;
  Store.saveGap(link.rid);
}
/* candidate prerequisite topics for root-cause tracing */
function rootCandidates(key, limit) {
  const info = nodeInfo(key); if (!info) return [];
  const out = [];
  const own = nodeKeys(info.subject); const idx = own.indexOf(key);
  own.slice(Math.max(0, idx - 18), idx).forEach(k => out.push(k));
  (PREREQS[info.sid] || []).forEach(sid => {
    const s = subj(sid); if (!s) return;
    const keys = s.program ? s.units.slice(0, 3).flatMap((u, ui) => unitKeys(s, ui)) : nodeKeys(s);
    keys.slice(0, 26).forEach(k => out.push(k));
  });
  return out.slice(0, limit || 60);
}
function rootSnippet(key) {
  const c = rootCandidates(key); if (!c.length) return '';
  return `\nIf the mistake most likely comes from a missing PREREQUISITE rather than from this topic itself, name that prerequisite: set "root_topic" to its id from this list (otherwise null) and "root_reason" to one sentence explaining the link.\nPrerequisite candidates:\n${c.map(k => { const i = nodeInfo(k); return `- ${k}: ${i.title} (${i.subject.name})`; }).join('\n')}\n`;
}
function schedule(n, score) {
  const prev = n.interval || 0; let iv;
  if (score >= 0.85) iv = prev ? Math.round(prev * 2.5) : 3;
  else if (score >= 0.6) iv = prev ? Math.max(2, Math.round(prev * 1.3)) : 2;
  else iv = 1;
  n.interval = Math.min(iv, 180); n.due = Date.now() + n.interval * DAY;
}
function continueTarget() {
  const last = Store.profile.lastNode, info = nodeInfo(last);
  if (!info) return null;
  const n = Store.nodes[last];
  if (!n || mastery(n) < 80) return last;
  return nodeKeys(info.subject).find(k => mastery(Store.nodes[k]) < 80) || null;
}
function levelFor(k) {
  const p = pst(Store.nodes[k]);
  if (!p.a || p.ema == null) return 1;
  return p.ema < 0.5 ? 1 : p.ema < 0.8 ? 2 : 3;
}

/* ---- calibration: confidence (25/50/75/95) vs. outcome */
const CONF = [{v:25, label:'Guessing'}, {v:50, label:'Unsure'}, {v:75, label:'Fairly sure'}, {v:95, label:'Certain'}];
function recordCal(sid, conf, correct) {
  if (!conf) return;
  const cal = Store.profile.cal = Store.profile.cal || {};
  const tgt = [cal.all = cal.all || {}]; if (sid) tgt.push(cal[sid] = cal[sid] || {});
  tgt.forEach(b => { const x = b[conf] = b[conf] || [0, 0]; x[0]++; if (correct) x[1]++; });
  Store.saveProfile();
}
function calStats(sid) {
  const b = (Store.profile.cal || {})[sid || 'all'] || {};
  let n = 0, c = 0, conf = 0, brier = 0;
  const bins = CONF.map(cf => { const x = b[cf.v] || [0, 0]; const p = cf.v / 100; n += x[0]; c += x[1]; conf += p * x[0]; brier += x[1] * Math.pow(p - 1, 2) + (x[0] - x[1]) * p * p; return {v:cf.v, label:cf.label, n:x[0], acc:x[0] ? x[1] / x[0] : null}; });
  return {n, bins, acc:n ? c / n : null, meanConf:n ? conf / n : null, over:n ? (conf - c) / n : null, brier:n ? brier / n : null};
}

/* ---- meta-skills and the self-direction ladder */
function addMeta(sid, key, value) {
  const m = Store.profile.meta = Store.profile.meta || {};
  [m.all = m.all || {}, m[sid] = m[sid] || {}].forEach(b => { const x = b[key] = b[key] || {n:0, sum:0, last:[]}; x.n++; x.sum += value; x.last = (x.last || []).concat([Math.round(value * 100) / 100]).slice(-6); });
  Store.saveProfile();
}
function metaAvg(sid, key) { const x = ((Store.profile.meta || {})[sid] || {})[key]; if (!x || !x.n) return null; const l = x.last && x.last.length ? x.last : null; return {n:x.n, avg:l ? mean(l) : x.sum / x.n}; }
function rungFor(sid) {
  const s = subj(sid); if (!s) return 1;
  const st = subjectStats(s);
  const ok = (key, min, n) => { const m = metaAvg(sid, key); return m && m.n >= n && m.avg >= min; };
  let r = 1;
  if (st.started >= 3) r = 2; else return r;
  if (ok('dump', 0.6, 3)) r = 3; else return r;
  if (ok('summary', 0.65, 2)) r = 4; else return r;
  if (ok('qwrite', 0.65, 2)) r = 5; else return r;
  if (ok('selfgrade', 0.75, 8)) r = 6; else return r;
  return r;
}
function rungProgress(sid, rung) {
  const m = k => metaAvg(sid, k);
  const f = (x, n, min) => x ? `${x.n}/${n} done · average ${Math.round(x.avg * 100)}% (need ${Math.round(min * 100)}%)` : `0/${n} done`;
  if (rung === 1) { const st = subjectStats(subj(sid)); return `${st.started}/3 topics started`; }
  if (rung === 2) return 'Brain dumps: ' + f(m('dump'), 3, 0.6);
  if (rung === 3) return 'Source summaries: ' + f(m('summary'), 2, 0.65);
  if (rung === 4) return 'Question sets: ' + f(m('qwrite'), 2, 0.65);
  if (rung === 5) return 'Self-grades: ' + f(m('selfgrade'), 8, 0.75);
  const p = m('plan'); return p ? `Plans: ${p.n} · recent average ${Math.round(p.avg * 100)}%` : 'No plan yet';
}
function isSelfMode(sid) { return (Store.profile.mode || {})[sid] === 'self'; }
function selfGradeOn(sid) { return !!(Store.profile.selfGrade || {})[sid]; }

/* ---- vocabulary (Leitner boxes) */
const BOX_DAYS = [0, 0.02, 1, 3, 7, 16, 35, 80];
function deck(lang) { return Store.vocab[lang] = Store.vocab[lang] || []; }
function dueCards(lang) { const now = Date.now(); return deck(lang).filter(c => (c.due || 0) <= now).sort((a, b) => (a.due || 0) - (b.due || 0)); }
function addVocab(lang, items, node) {
  const d = deck(lang); let added = 0;
  items.forEach(it => {
    const t = str(it.t || it.term).trim(), m = str(it.m || it.meaning).trim();
    if (!t || !m || t.length > 80 || m.length > 120) return;
    if (d.some(c => c.t.toLowerCase() === t.toLowerCase())) return;
    d.push({id:'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t, m, n:str(it.n || it.note).slice(0, 80), box:0, due:Date.now(), node:node || null, a:0, c:0});
    added++;
  });
  if (added) Store.saveVocab(lang);
  return added;
}
function gradeCard(lang, card, ok) {
  card.a = (card.a || 0) + 1; if (ok) card.c = (card.c || 0) + 1;
  card.box = ok ? Math.min(BOX_DAYS.length - 1, (card.box || 0) + 1) : 1;
  card.due = Date.now() + BOX_DAYS[card.box] * DAY;
}

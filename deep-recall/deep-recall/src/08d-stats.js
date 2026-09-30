/* ------------------------------------------------------------------ lifetime stats, daily log, tiers of the self, achievements */
/* one record per day: m minutes, x xp, a attempts, c correct, b bits, s sessions */
function bumpDay(field, n) {
  if (!n) return;
  const P = Store.profile, d = today();
  P.days = P.days || {};
  const r = P.days[d] = P.days[d] || {};
  r[field] = +(((r[field] || 0) + n).toFixed(2));
}
function dayRec(dk) {
  const P = Store.profile, r = (P.days || {})[dk] || {};
  return {m:r.m != null ? r.m : ((P.mins || {})[dk] || 0), x:r.x != null ? r.x : ((P.xpByDay || {})[dk] || 0), a:r.a || 0, c:r.c != null ? r.c : ((P.probByDay || {})[dk] || 0), b:r.b || 0, s:r.s || 0};
}
function rangeTotals(days) {
  const t = {m:0, x:0, a:0, c:0, b:0, s:0, active:0};
  for (let i = 0; i < days; i++) { const r = dayRec(dayKey(Date.now() - i * DAY)); Object.keys(r).forEach(k => { t[k] += r[k]; }); if (r.m || r.x) t.active++; }
  return t;
}
function bestStreak() {
  const P = Store.profile, keys = [...new Set([...Object.keys(P.days || {}), ...Object.keys(P.xpByDay || {}), ...Object.keys(P.mins || {}), ...Object.keys(P.frozen || {})])].filter(isCovered).sort();
  let best = 0, run = 0, prev = null;
  keys.forEach(k => { const t = new Date(k + 'T12:00:00').getTime(); run = prev && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1; prev = t; best = Math.max(best, run); });
  return Math.max(best, P.bestStreak || 0, streakNow());
}

/* lifetime measures that tiers and achievements read */
function lifeStats() {
  const P = Store.profile, nodes = Object.values(Store.nodes).filter(n => nodeInfo(n.key));
  const bitVals = nodes.flatMap(n => n.bits && n.bits.done ? Object.values(n.bits.done) : []), bits = bitVals.length, bitsRight = bitVals.filter(v => v >= 0.8).length;
  /* right answers: problems, questions, exercises, and bit checks */
  const correct = nodes.reduce((a, n) => a + (pst(n).c || 0), 0) + bitsRight, attempted = nodes.reduce((a, n) => a + (pst(n).a || 0), 0) + bits, firstTry = nodes.reduce((a, n) => a + (pst(n).f || 0), 0);
  const perfectTopics = nodes.filter(n => n.bits && n.bits.done && n.kpN && Object.keys(n.bits.done).length >= n.kpN && Object.values(n.bits.done).every(v => v >= 1)).length;
  const proficient = nodes.filter(n => mastery(n) >= PROFICIENT).length, mastered = nodes.filter(n => topicStage(n) === 4).length;
  const hours = Object.values(P.minsBy || {}).reduce((a, b) => a + b, 0) / 60;
  const exams = Object.values(P.exams || {}).filter(e => e.passed).length;
  const subjectsProf = new Set(nodes.filter(n => mastery(n) >= PROFICIENT).map(n => n.key.split('-')[0])).size;
  const closed = Object.values(Store.gaps).filter(g => g.status === 'resolved').length;
  const words = SUBJECTS.filter(s => s.lang).reduce((a, s) => a + deck(s.id).filter(c => c.box >= 3).length, 0);
  const retained = nodes.filter(n => n.retained).length;
  const cal = calStats();
  const maxDayMins = Math.max(0, ...Object.keys(P.days || {}).map(k => dayRec(k).m), ...Object.values(P.mins || {}));
  const courses = allSubjects().reduce((a, s) => a + s.units.filter((u, ui) => courseComplete(s, ui)).length, 0);
  const rung = Math.max(1, ...allSubjects().map(s => rungFor(s.id)));
  return {correct, attempted, firstTry, bits, perfectTopics, proficient, mastered, hours, exams, subjectsProf, closed, words, retained, cal, maxDayMins, courses, rung, streak:streakNow(), best:bestStreak()};
}

/* the ascent: tiers of the self, each gated on several measures at once so no single grind unlocks it */
const TIERS = [
  {name:'Layman', line:'Knows that he does not know. The honest place to start.', req:{}},
  {name:'Initiate', line:'Has crossed the threshold and started keeping score.', req:{correct:25, bits:5, proficient:1, hours:2}},
  {name:'Autodidact', line:'Teaches himself, and it shows.', req:{correct:100, bits:25, proficient:5, hours:8}},
  {name:'Journeyman', line:'Reliable in the fundamentals; building range.', req:{correct:250, bits:60, proficient:12, hours:20, exams:1}},
  {name:'Scholar', line:'Reads the primary sources and checks the proofs.', req:{correct:500, bits:120, proficient:25, hours:40, exams:2, mastered:3}},
  {name:'Savant', line:'Depth that holds up weeks later, under test.', req:{correct:1000, bits:250, proficient:50, hours:80, exams:4, mastered:10}},
  {name:'Polymath', line:'Proficient across several fields at once.', req:{correct:2000, bits:500, proficient:100, hours:150, exams:8, mastered:30, subjectsProf:4}},
  {name:'Philosopher-King', line:'Knowledge wide enough to judge, and the discipline to use it.', req:{correct:3500, bits:800, proficient:175, hours:250, exams:12, mastered:60, subjectsProf:6}},
  {name:'Übermensch', line:'Has overcome himself: the superior self, made real.', req:{correct:5500, bits:1200, proficient:300, hours:400, exams:18, mastered:120, subjectsProf:8}},
  {name:'Dr. Manhattan', line:'Sees all of it at once: past, present, and every proof.', req:{correct:8000, bits:1800, proficient:500, hours:650, exams:25, mastered:250, subjectsProf:10}}
];
const REQ_LABEL = {correct:'right answers', bits:'bits learned', proficient:'topics proficient', hours:'hours studied', exams:'exams passed', mastered:'topics mastered', subjectsProf:'subjects proficient'};
function tierState(L) {
  L = L || lifeStats();
  let t = 0;
  while (t + 1 < TIERS.length && Object.keys(TIERS[t + 1].req).every(k => (L[k] || 0) >= TIERS[t + 1].req[k])) t++;
  const next = TIERS[t + 1] || null;
  const reqs = next ? Object.keys(next.req).map(k => ({k, label:REQ_LABEL[k], have:L[k] || 0, need:next.req[k]})) : [];
  const pct = next ? Math.round(mean(reqs.map(r => Math.min(1, r.have / r.need))) * 100) : 100;
  return {i:t, tier:TIERS[t], next, reqs, pct, L};
}
/* an emblem per tier: more rings and a denser star as you climb */
function tierEmblem(i, size) {
  const sz = size || 64, c = sz / 2, rings = Math.min(3, Math.floor(i / 3) + 1), pts = 3 + i, r1 = sz * 0.34, r2 = sz * (i >= 8 ? 0.2 : 0.14);
  const star = i ? [...Array(pts * 2)].map((_, k) => { const r = k % 2 ? r2 : r1, a = Math.PI * k / pts - Math.PI / 2; return `${(c + r * Math.cos(a)).toFixed(1)},${(c + r * Math.sin(a)).toFixed(1)}`; }).join(' ') : '';
  return `<svg class="emblem t${i}" viewBox="0 0 ${sz} ${sz}" width="${sz}" height="${sz}" aria-hidden="true">
    ${[...Array(rings)].map((_, k) => `<circle cx="${c}" cy="${c}" r="${(sz * 0.47 - k * 3.2).toFixed(1)}" fill="none" stroke="currentColor" stroke-width="${k ? 0.8 : 1.4}" opacity="${1 - k * 0.3}"/>`).join('')}
    ${i ? `<polygon points="${star}" fill="currentColor" opacity="${0.18 + i * 0.07}" stroke="currentColor" stroke-width="1"/>` : `<circle cx="${c}" cy="${c}" r="${sz * 0.1}" fill="currentColor" opacity=".5"/>`}
    ${i >= 9 ? `<circle cx="${c}" cy="${c}" r="${sz * 0.07}" fill="currentColor"/>` : ''}
  </svg>`;
}
function checkTierUp(L) {
  const P = Store.profile, ts = tierState(L);
  if (P.tier == null) { P.tier = ts.i; Store.saveProfile(); return; }
  if (ts.i > P.tier) { P.tier = ts.i; Store.saveProfile(); showTierUp(ts); }
}
function showTierUp(ts) {
  const el = $('#sheet'); if (!el || el.innerHTML) return;
  el.innerHTML = `<div class="backdrop" data-act="closeSheet"></div><div class="modal levelup tierup" role="dialog" aria-modal="true" aria-labelledby="tuTitle">
    <div class="eyebrow">You surpassed a tier</div><div class="tier-glyph">${tierEmblem(ts.i, 96)}</div>
    <h2 id="tuTitle">${esc(ts.tier.name)}</h2><p class="muted">${esc(ts.tier.line)}</p>${ts.next ? `<p class="small muted">Next: ${esc(ts.next.name)}</p>` : ''}
    <button class="btn primary" data-act="closeSheet">Continue</button></div>`;
}

/* achievements: specific feats, each a different kind of discipline */
const ACHIEVEMENTS = [
  {id:'first', name:'First blood', desc:'Get your first problem or question right', ok:L => L.correct >= 1},
  {id:'streak7', name:'Seven days', desc:'Study 7 days in a row', ok:L => L.best >= 7},
  {id:'streak30', name:'Iron habit', desc:'Study 30 days in a row', ok:L => L.best >= 30},
  {id:'first100', name:'Centurion', desc:'100 right on the first try', ok:L => L.firstTry >= 100},
  {id:'bits50', name:'Bit by bit', desc:'Learn 50 bits', ok:L => L.bits >= 50},
  {id:'perfect', name:'Clean run', desc:'Get every bit of a topic right on the first try', ok:L => L.perfectTopics >= 1},
  {id:'exam', name:'Examined', desc:'Pass a course exam', ok:L => L.exams >= 1},
  {id:'course', name:'Course complete', desc:'Finish a course: exam passed, every topic proficient', ok:L => L.courses >= 1},
  {id:'retain', name:'It stuck', desc:'Pass a retention check weeks after first study', ok:L => L.retained >= 1},
  {id:'gaps25', name:'Gap closer', desc:'Close 25 knowledge gaps', ok:L => L.closed >= 25},
  {id:'calib', name:'Knows what he knows', desc:'Within ±5 points of calibrated over 50+ rated answers', ok:L => L.cal.n >= 50 && Math.abs(L.cal.over) <= 0.05},
  {id:'marathon', name:'Deep work', desc:'Three focused hours in one day', ok:L => L.maxDayMins >= 180},
  {id:'words100', name:'Hundred words', desc:'Know 100 words in a language', ok:L => L.words >= 100},
  {id:'selfdir', name:'Self-directed', desc:'Reach rung 4 of the learning ladder in any subject', ok:L => L.rung >= 4},
  {id:'polymath3', name:'Range', desc:'A proficient topic in 3 different subjects', ok:L => L.subjectsProf >= 3}
];

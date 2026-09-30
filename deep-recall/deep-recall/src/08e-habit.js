/* ------------------------------------------------------------------ habit layer
   Evidence it rests on: if-then plans (Gollwitzer & Sheeran 2006, d≈0.65); streaks with slack and earned
   "emergency reserves" (Duolingo A/B data; Sharif & Shu); a small bonus for returning after a miss (Milkman
   megastudy); fresh starts at temporal landmarks (Dai, Milkman & Riis 2014); informational, not controlling,
   feedback (Deci, Koestner & Ryan 1999). */
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const noon = t => { const d = new Date(t == null ? Date.now() : t); d.setHours(12, 0, 0, 0); return d.getTime(); };
const daysAgo = k => dayKey(noon() - k * DAY);
function isActive(dk) { const r = dayRec(dk); return !!(r.m >= 1 || r.x > 0 || r.c || r.b); }
function isCovered(dk) { return isActive(dk) || !!(Store.profile.frozen || {})[dk]; }
function weekKey(t) { const d = noon(t), dow = (new Date(d).getDay() + 6) % 7; return dayKey(d - dow * DAY); }
function weekDays(wk) { const s = new Date(wk + 'T12:00:00').getTime(); return [...Array(7)].map((_, i) => dayKey(s + i * DAY)); }
function prevWeek(wk, n) { return dayKey(new Date(wk + 'T12:00:00').getTime() - 7 * (n || 1) * DAY); }
function weekTarget(wk) {
  const P = Store.profile, w = (P.weeks || {})[wk];
  if (w && w.days) return w.days;
  const planFrom = P.plan && P.plan.set ? weekKey(P.plan.set) : null;
  return P.plan && (!planFrom || wk >= planFrom) ? P.plan.weekDays : 4;
}
function weekActive(wk) { return weekDays(wk).filter(isActive).length; }
function weekStreak() {
  let wk = weekKey(), n = 0;
  if (weekActive(wk) >= weekTarget(wk)) n++;
  for (let i = 0; i < 260; i++) { wk = prevWeek(wk); if (weekActive(wk) >= weekTarget(wk)) n++; else break; }
  return n;
}
function fmtTime(hm) { if (!hm) return ''; const [h, m] = hm.split(':').map(Number); const d = new Date(); d.setHours(h, m || 0, 0, 0); return d.toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'}); }
function planSentence(p) {
  if (!p) return '';
  const days = p.days.map((on, i) => on ? DOW[i] : null).filter(Boolean);
  const when = days.length === 7 ? 'every day' : days.length ? 'on ' + days.join(', ') : 'on no days yet';
  return `${p.cue ? p.cue.replace(/^./, c => c.toUpperCase()) + ', ' : ''}${p.cue ? 'a' : 'A'}t ${fmtTime(p.time)} ${when}, I study for ${p.mins} min${p.place ? ' at ' + p.place : ''}.`;
}
function plannedToday() { const p = Store.profile.plan; return !!(p && p.days[new Date().getDay()]); }

/* streak freezes: earned, capped, spent automatically on missed days */
const FREEZE_CAP = 2;
function applyFreezes() {
  const P = Store.profile;
  if (!P.freezes || isCovered(daysAgo(1))) return 0;
  let k = 1; while (k <= 8 && !isCovered(daysAgo(k))) k++;
  if (k > 8) return 0;
  const missed = k - 1;
  if (missed > P.freezes) return 0;
  P.frozen = P.frozen || {};
  for (let i = 1; i <= missed; i++) P.frozen[daysAgo(i)] = 1;
  P.freezes -= missed;
  const keys = Object.keys(P.frozen).sort(); if (keys.length > 120) keys.slice(0, keys.length - 120).forEach(x => delete P.frozen[x]);
  Store.saveProfile();
  return missed;
}
/* the comeback: a small bonus for the first study after a real lapse */
function comebackCheck(p, t) {
  if (!p.lastDay || p.lastDay === t || isCovered(daysAgo(1))) return 0;
  const gap = Math.round((noon() - new Date(p.lastDay + 'T12:00:00').getTime()) / DAY);
  if (gap < 2 || p.comebackAt === t) return 0;
  p.comebackAt = t;
  return 15;
}
/* where to re-enter: after a lapse, at the start of a week, at the start of a month */
function freshStart() {
  const P = Store.profile, t = today();
  if (P.fsDismiss === t) return null;
  const lastWk = prevWeek(weekKey()), reviewed = ((P.weeks || {})[lastWk] || {}).reviewedAt;
  const hadHistory = [...Array(30)].some((_, i) => isActive(daysAgo(i + 1)));
  const dom = new Date().getDate(), dow = new Date().getDay();
  if (hadHistory && !isActive(t) && !isCovered(daysAgo(1))) return {kind:'lapse', title:dom <= 3 ? 'A new month, a clean page' : dow === 1 ? 'A new week, a clean page' : 'Pick it back up', body:'Missed days don’t undo what you learned; forgetting is gradual, and one short session restarts the curve. Start small: the first thing below takes about 5 minutes.'};
  if (!reviewed && weekActive(lastWk) && [1, 2, 3].includes(dow)) return {kind:'week', title:dom <= 7 ? 'New month · your week in review' : 'Your week in review', body:`Last week: ${weekActive(lastWk) >= weekTarget(lastWk) ? `target met, ${weekActive(lastWk)} days studied` : `${weekActive(lastWk)} of ${weekTarget(lastWk)} target days`}. Two minutes to look back and set this week’s target.`};
  return null;
}
/* the smallest useful step: Fogg's "make it tiny" */
function tinyStep() {
  const due = dueNodes();
  const k = continueTarget(), info = nodeInfo(k);
  if (info && !info.lang) { const n = Store.nodes[k], o = Store.outlines[k], done = n && n.bits && n.bits.done ? Object.keys(n.bits.done).length : 0; if (!o || done < o.kps.length) return {act:'bits', arg:k, label:`One bit of ${info.title}`}; }
  if (due.length && AI.ok()) return {act:'startReview', arg:'', label:`Review ${Math.min(6, due.length)} due topic${due.length > 1 ? 's' : ''}`};
  if (info) return {act:'topic', arg:k, label:info.title};
  return null;
}

/* week summaries for the weekly review */
function weekSummary(wk) {
  const days = weekDays(wk), t = {m:0, x:0, a:0, c:0, b:0, s:0, active:0, best:null};
  days.forEach(dk => { const r = dayRec(dk); ['m', 'x', 'a', 'c', 'b', 's'].forEach(f => { t[f] += r[f] || 0; }); if (isActive(dk)) t.active++; if (!t.best || r.m > t.best.m) t.best = {dk, m:r.m}; });
  const s0 = new Date(days[0] + 'T00:00:00').getTime(), s1 = s0 + 7 * DAY;
  t.prof = Object.values(Store.nodes).filter(n => n.profAt >= s0 && n.profAt < s1 && nodeInfo(n.key)).map(n => n.key);
  t.closed = Object.values(Store.gaps).filter(g => g.status === 'resolved' && g.resolvedAt >= s0 && g.resolvedAt < s1).length;
  t.opened = Object.values(Store.gaps).filter(g => (g.created || g.at || 0) >= s0 && (g.created || g.at || 0) < s1).length;
  t.target = weekTarget(wk); t.frozen = days.filter(dk => (Store.profile.frozen || {})[dk]).length;
  return t;
}

/* solo verification: help from the tutor is not the same as doing it alone (Bastani et al. 2025) */
function markSolo(key) { if (nodeInfo(key)) ensureNode(key).solo = 1; }

/* informational feedback, records, freezes: run from checkFeats */
function habitTick() {
  const P = Store.profile, t = today(), msgs = [];
  if (!P.habitInit) {
    P.habitInit = 1; P.freezes = P.freezes == null ? 1 : P.freezes;
    Object.values(Store.nodes).forEach(n => {
      if (mastery(n) >= PROFICIENT && !n.profAt) n.profAt = n.last || Date.now();
      const studyC = n.study ? n.study.c || 0 : 0, bitsOk = n.bits && n.bits.done && Object.values(n.bits.done).some(v => v >= 0.8);
      if (!n.solo && ((pst(n).c || 0) > studyC || bitsOk || n.sessions)) n.solo = 1;
    });
    const all = Object.keys(Object.assign({}, P.days || {}, P.xpByDay || {}, P.mins || {}));
    P.rec = {m:{v:Math.max(0, ...all.filter(k => k !== t).map(k => dayRec(k).m)), d:''}, c:{v:Math.max(0, ...all.filter(k => k !== t).map(k => dayRec(k).c)), d:''}};
    Store.saveProfile();
  }
  if (P.freezeCheck !== t) { P.freezeCheck = t; const used = applyFreezes(); if (used) msgs.push(`Streak freeze used for ${used} missed day${used > 1 ? 's' : ''}. Streak intact.`); Store.saveProfile(); }
  const wk = weekKey(); P.freezeWeeks = P.freezeWeeks || {}; P.weeks = P.weeks || {};
  if (!P.weeks[wk] || !P.weeks[wk].days) { P.weeks[wk] = Object.assign(P.weeks[wk] || {}, {days:weekTarget(wk)}); Store.saveProfile(); }
  if (!P.freezeWeeks[wk] && weekActive(wk) >= weekTarget(wk)) {
    P.freezeWeeks[wk] = 1;
    if ((P.freezes || 0) < FREEZE_CAP) { P.freezes = (P.freezes || 0) + 1; msgs.push(`Weekly target met: earned a streak freeze (${P.freezes}/${FREEZE_CAP}).`); } else msgs.push('Weekly target met.');
    Store.saveProfile();
  }
  const newly = [];
  Object.values(Store.nodes).forEach(n => { if (!n.profAt && nodeInfo(n.key) && mastery(n) >= PROFICIENT) { n.profAt = Date.now(); newly.push(n.key); Store.saveNode(n.key); } });
  if (newly.length) { bumpDay('p', newly.length); msgs.push(`You can now: ${newly.slice(0, 2).map(k => nodeInfo(k).title).join('; ')}${newly.length > 2 ? ` (+${newly.length - 2} more)` : ''}. Proficient.`); }
  const r = dayRec(t);
  [['m', 'most minutes studied in a day', 20], ['c', 'most right answers in a day', 8]].forEach(([f, label, min]) => {
    const rec = P.rec[f] || {v:0, d:''};
    if (r[f] > rec.v) { if (rec.d !== t && rec.v >= min) msgs.push(`New personal record: ${label} (${f === 'm' ? fmtMins(r[f]) : r[f]}).`); P.rec[f] = {v:r[f], d:t}; Store.saveProfile(); }
  });
  if (msgs.length) toast(msgs.join(' '));
}

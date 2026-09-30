/* ------------------------------------------------------------------ progress model: expertise, topic stages, study flows, daily plan, study time */
const LEVELS = [
  {name:'Novice', need:0, desc:'Getting oriented'},
  {name:'Apprentice', need:0.1, desc:'First topics are solid'},
  {name:'Practitioner', need:0.3, desc:'Can work through the core independently'},
  {name:'Proficient', need:0.55, desc:'Most of the subject is reliable'},
  {name:'Expert', need:0.8, desc:'Nearly everything holds up under testing'},
  {name:'Master', need:1, desc:'Every topic proficient'}
];
const PROFICIENT = 75;
function subjectLevel(s) {
  const keys = nodeKeys(s), total = keys.length;
  const prof = keys.filter(k => mastery(Store.nodes[k]) >= PROFICIENT).length;
  const frac = total ? prof / total : 0;
  let L = 0;
  LEVELS.forEach((lv, i) => { if (frac >= lv.need && (i === 0 || prof > 0)) L = i; });
  const next = LEVELS[L + 1];
  const needTotal = next ? Math.ceil(next.need * total) : total;
  const cur = Math.ceil(LEVELS[L].need * total);
  return {i:L, name:LEVELS[L].name, desc:LEVELS[L].desc, prof, total, next:next ? next.name : null, toNext:next ? Math.max(0, needTotal - prof) : 0, pct:next ? Math.round(Math.max(0, Math.min(1, (prof - cur) / Math.max(1, needTotal - cur))) * 100) : 100};
}
const STAGES = ['Not started', 'Learning', 'Practicing', 'Proficient', 'Mastered'];
function topicStage(n) {
  if (!n || !(n.sessions || n.hasLesson || pst(n).a || n.dump != null || n.study || (n.bits && n.bits.done && Object.keys(n.bits.done).length) || (n.proj && n.proj.started))) return 0;
  const m = mastery(n);
  if (m >= 90 && n.retained) return 4;
  if (m >= PROFICIENT) return 3;
  if (m >= 40) return 2;
  return 1;
}
function stageHint(n, info) {
  const st = topicStage(n), m = mastery(n);
  if (assistCapped(n)) return `Held at ${m}% until you do it alone: tutor-assisted work shows you can follow it, not yet that you can produce it. One solo check lifts the cap.`;
  if (st === 0) return 'Start with the first step of the flow below.';
  if (st === 1) return `Reach 40% mastery to move to Practicing (now ${m}%).`;
  if (st === 2) return `Reach ${PROFICIENT}% to become Proficient (now ${m}%).`;
  if (st === 3) return m < 90 ? `Reach 90% and pass a retention check ${RETENTION_DAYS}+ days after you first studied it (now ${m}%).` : retentionDue(n) ? 'A retention check is available now: pass it to master this topic.' : `Pass a retention check ${RETENTION_DAYS}+ days after first study to master it.`;
  return 'Mastered. Reviews keep it that way; the interval keeps growing.';
}

/* one curriculum, two methods: the method changes how each topic is studied, never what */
function topicFlow(info, forceSelf) {
  const n = Store.nodes[info.key] || {}, p = pst(n), key = info.key;
  const k = kindOf(info.subject), self = (forceSelf != null ? forceSelf : isSelfMode(info.sid)) && k !== 'lang';
  const gaps = openGapsFor(key).length, due = n.due && n.due <= Date.now();
  const practiced = (n.sessions || 0) > 0 || p.a > 0, m = mastery(n), prof = m >= PROFICIENT;
  const toGo = practiced && !prof ? ` · practice to ${PROFICIENT}%` : '';
  const S = (id, label, desc, act, arg, done, extra) => Object.assign({id, label, desc, act, arg:arg || key, done:!!done}, extra || {});
  const bd = n.bits && n.bits.done ? Object.keys(n.bits.done).length : 0, bN = n.kpN || 0;
  const learnBits = S('learn', 'Learn in bits', bd && bN ? `${Math.min(bd, bN)} of ${bN} bits done` : n.hasLesson ? 'Lesson read' : 'One idea at a time, a micro-problem for each, questions answered in place', 'bits', key, n.hasLesson || (bN && bd >= bN));
  const retrieve = S('retrieve', 'Retrieve', n.dump != null ? `Last brain dump covered ${Math.round(n.dump * 100)}%` : 'Brain-dump what you already know, before any teaching', 'task', 'dump|' + key, n.dump != null);
  const source = S('source', 'Study a source', (n.sources || []).length ? `${n.sources.length} source${n.sources.length > 1 ? 's' : ''} studied` : 'Read a real source, then summarize it from memory', 'source', key, (n.sources || []).length > 0);
  const write = S('write', k === 'program' ? 'Write problems' : 'Write questions', (n.myQs || []).length ? `${n.myQs.length} saved to your reviews` : 'Author your own tests of understanding', 'task', 'qwrite|' + key, (n.myQs || []).length >= 3);
  const repair = S('repair', 'Repair gaps', gaps ? `${gaps} open gap${gaps > 1 ? 's' : ''} on this topic` : 'No open gaps', 'repair', key, practiced && !gaps, {skip:!gaps});
  const review = S('review', 'Review', !n.due ? 'Scheduled after your first practice' : due ? 'Due now' : `Next review ${dueIn(n.due).toLowerCase()}`, 'practice', key, (n.interval || 0) >= 7, {lock:!due});
  let steps;
  if (hasPack(key) && k !== 'lang') {
    /* a pre-written chapter: read it (answering in place), then cards, practice from its bank, and the strict chapter test */
    const bk = (n.book && n.book.done) || {}, nd = Object.keys(bk).length, N = PACK_INDEX[key].s, cs = cardSummary(key), t = n.test;
    steps = [self ? retrieve : null,
      S('read', 'Read the chapter', nd ? `${Math.min(nd, N)} of ${N} sections worked` : `${N} sections; you answer each section’s questions as you go`, 'book', key, nd >= N),
      S('cards', 'Flashcards', cs.unlocked ? `${cs.unlocked} of ${cs.total || cs.unlocked} unlocked${cs.due ? ` · ${cs.due} due` : ''}${cs.fresh ? ` · ${cs.fresh} new` : ''}` : 'Unlock as you finish sections: terms, formulas, small problems', 'cards', key, nd >= N && cs.unlocked && !cs.fresh && !cs.due, {lock:!cs.unlocked}),
      S('practice', 'Practice', practiced ? `${m}% mastery${toGo}` : 'The chapter’s question bank, aimed at your weakest points', 'practice', key, prof),
      S('test', 'Chapter test', t ? `${t.passed ? 'Passed' : 'Best so far'}: ${Math.round(t.best * 100)}%` : 'One attempt each, no hints, no partial credit; pass at 80%', 'packTest', key, t && t.passed),
      repair, review].filter(Boolean);
  } else if (k === 'lang') {
    steps = [S('learn', 'Learn', 'Grammar and vocabulary lesson with audio', 'lesson', key, n.hasLesson),
      S('practice', 'Exercises', p.a ? `${p.c}/${p.a} right · ${m}%${toGo}` : 'Translate, fill in, build, and listen', 'practice', key, prof),
      S('vocab', 'Vocabulary', `${deck(info.sid).filter(c => c.node === key).length} words from this topic in your deck`, 'vocab', info.sid + '|' + key, deck(info.sid).some(c => c.node === key && (c.box || 0) >= 3)),
      S('read', 'Read & listen', 'A graded text at your level: listening, shadowing, comprehension', 'reader', key, pst(n).a >= 14, {optional:true}),
      S('talk', 'Conversation', 'Use it in a conversation with your tutor', 'tutorAbout', key, false, {optional:true}),
      repair, review];
  } else if (k === 'skills') {
    steps = [self ? retrieve : learnBits,
      self ? source : null,
      S('build', 'Build', n.proj && n.proj.finished ? 'Project built' : n.proj ? `In progress: step ${n.proj.step + 1}` : 'A guided project with checkpoints', 'project', key, n.proj && n.proj.finished),
      S('drills', 'Drills', p.a ? `${p.c}/${p.a} solved · ${m}%${toGo}` : 'Calculations and troubleshooting', 'practice', key, prof),
      repair, review].filter(Boolean);
  } else if (k === 'program') {
    steps = self
      ? [retrieve, source, S('solve', 'Solve', p.a ? `${p.c}/${p.a} solved · ${pct(p.f, p.a)}% first try${toGo}` : 'Adaptive problem set', 'practice', key, prof), write, repair, review]
      : [learnBits, S('solve', 'Solve', p.a ? `${p.c}/${p.a} solved · ${pct(p.f, p.a)}% first try${toGo}` : 'Adaptive problem set; answer keys verified', 'practice', key, prof), repair, review];
  } else {
    steps = self
      ? [retrieve, source, S('test', 'Test yourself', practiced ? `${m}% mastery${toGo}` : 'Questions built from real misconceptions', 'practice', key, prof), write, repair, review]
      : [learnBits, S('practice', 'Practice', practiced ? `${m}% mastery${toGo}` : 'Questions built from real misconceptions', 'practice', key, prof), repair, review];
  }
  if (typeof DRILLS !== 'undefined' && DRILLS[key]) steps.splice(Math.min(2, steps.length), 0, S('drill', DRILLS[key].label, 'Generated on the spot: unlimited, instant feedback', 'drill', key, false, {optional:true}));
  if (needsReadiness(key)) steps.unshift(S('ready', 'Readiness check', `Prerequisites below 60%: ${weakPrereqs(key).map(k => nodeInfo(k).title).join('; ')}`, 'readiness', key, false));
  if (retentionDue(n)) steps.push(S('retain', 'Retention check', 'Recall it cold, weeks later: passing this is what makes a topic Mastered', 'practice', key, false));
  const next = (gaps && practiced && steps.includes(repair) ? repair : null) || steps.find(s => !s.done && !s.skip && !s.lock && !s.optional) || (due ? review : null);
  return {steps, next, self};
}

/* ---- study time: counted while you're actively studying, idle time excluded */
let lastInteract = Date.now(), studyTicks = 0;
['pointerdown', 'keydown', 'scroll', 'input'].forEach(ev => document.addEventListener(ev, () => { lastInteract = Date.now(); }, {passive:true, capture:true}));
function studySid() {
  const v = VIEW.name;
  if (v === 'lesson' && LESSON) return (nodeInfo(LESSON.key) || {}).sid;
  if (v === 'session' && SESSION) { const q = SESSION.questions[SESSION.i]; const i = q && nodeInfo(q.node || (q.card && q.card.node)); return i ? i.sid : (q && q.sid) || null; }
  if (v === 'task' && TASK) return TASK.sid;
  if (v === 'source' && SRC && SRC.key) return (nodeInfo(SRC.key) || {}).sid;
  if (v === 'project' && PROJ) return (nodeInfo(PROJ.key) || {}).sid;
  if (v === 'tutor' && TUTOR) return TUTOR.sid;
  if (v === 'reader' && READER) return (nodeInfo(READER.key) || {}).sid;
  if (v === 'bits' && BITS) return (nodeInfo(BITS.key) || {}).sid;
  return null;
}
function studyTick() {
  if (document.visibilityState !== 'visible' || Date.now() - lastInteract > 150000) return;
  const sid = studySid(); if (!sid) return;
  const P = Store.profile, d = today();
  P.mins = P.mins || {}; P.mins[d] = (P.mins[d] || 0) + 0.5;
  P.minsBy = P.minsBy || {}; P.minsBy[sid] = (P.minsBy[sid] || 0) + 0.5;
  bumpDay('m', 0.5);
  P.subDays = P.subDays || {}; const sd = P.subDays[d] = P.subDays[d] || {}; sd[sid] = (sd[sid] || 0) + 0.5;
  const keys = Object.keys(P.mins).sort(); if (keys.length > 400) keys.slice(0, keys.length - 400).forEach(k => delete P.mins[k]);
  studyTicks++;
  if (studyTicks % 2 === 0) addXP(1);
}
function minutesOn(dk) { return Math.round(((Store.profile.mins || {})[dk]) || 0); }
function fmtMins(m) { m = Math.round(m); return m >= 60 ? Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm' : m + 'm'; }

/* ---- today's plan: the few highest-value actions, so there is nothing to decide */
function dailyPlan() {
  const items = [];
  const rt = Object.values(Store.threads).filter(t => t.status !== 'archived' && subj(t.sid) && t.next && Date.now() - (t.updated || 0) < 5 * DAY).sort((a, b) => b.updated - a.updated)[0];
  if (rt) items.push({icon:'chat', title:`Resume: ${rt.title}`, desc:rt.next, mins:25, act:'thread', arg:rt.id, primary:true});
  const due = dueNodes();
  if (due.length) items.push({icon:'review', title:`Review ${Math.min(6, due.length)} topic${due.length > 1 ? 's' : ''}`, desc:'Due now. Recalling right before you’d forget is when memory strengthens most.', mins:Math.min(6, due.length) * 3, act:'startReview', arg:''});
  SUBJECTS.filter(s => s.lang).forEach(s => { const n = dueCards(s.id).length; if (n) items.push({icon:'review', title:`${n} ${s.name} word${n > 1 ? 's' : ''}`, desc:'Flashcards on their spaced schedule.', mins:Math.max(2, Math.round(n / 5)), act:'vocab', arg:s.id}); });
  let cont = continueTarget();
  if (!cont) { const s0 = allSubjects().filter(x => subjectStats(x).started).sort((x, y) => Math.max(0, ...nodeKeys(y).map(k => (Store.nodes[k] || {}).last || 0)) - Math.max(0, ...nodeKeys(x).map(k => (Store.nodes[k] || {}).last || 0)))[0]; if (s0) cont = nodeKeys(s0).find(x => { const t = topicStage(Store.nodes[x]); return t === 1 || t === 2; }) || nodeKeys(s0).find(x => topicStage(Store.nodes[x]) < 3) || null; }
  const ci = nodeInfo(cont);
  if (ci) { const f = topicFlow(ci), st = topicStage(Store.nodes[ci.key]); if (f.next) items.push({icon:'learn', title:`${st ? f.next.label : 'Start'}: ${ci.title}`, desc:`${ci.subject.name} · ${f.next.desc}`, mins:f.next.id === 'learn' ? 15 : 12, act:'topic', arg:ci.key, primary:true}); }
  const ret = Object.values(Store.nodes).filter(n => nodeInfo(n.key) && retentionDue(n) && !(n.due && n.due <= Date.now())).slice(0, 1)[0];
  if (ret) { const ri = nodeInfo(ret.key); items.push({icon:'review', title:`Retention check: ${ri.title}`, desc:`${ri.subject.name} · pass it to reach Mastered`, mins:8, act:'practice', arg:ret.key}); }
  const mixSub = allSubjects().map(s => s.units.map((u, ui) => ({s, ui, n:startedIn(s, ui).length})).filter(x => x.n >= 3 && Date.now() - ((Store.profile.mixedAt || {})[x.s.id + '-' + x.ui] || 0) > 3 * DAY)).flat().sort((a, b) => b.n - a.n)[0];
  if (mixSub) items.push({icon:'learn', title:`Mixed practice: ${mixSub.s.units[mixSub.ui].t}`, desc:`${mixSub.s.name} · ${Math.min(8, mixSub.n)} topics interleaved: you pick the method`, mins:15, act:'mixed', arg:mixSub.s.id + '|' + mixSub.ui});
  (Store.profile.goals || []).forEach(gl => { const st = goalStatus(gl); if (st.delta < 0 && st.next && !st.done && !items.some(x => x.arg === st.next)) { const ni = nodeInfo(st.next); items.push({icon:'bolt', title:`Catch up: ${ni.title}`, desc:`${goalLabel(gl)} goal · ${-st.delta} topic${st.delta < -1 ? 's' : ''} behind pace`, mins:15, act:'topic', arg:st.next, primary:!items.some(x => x.primary)}); } });
  const g = openGaps().sort((a, b) => (b.hits || 1) - (a.hits || 1))[0];
  if (g && (!ci || g.node !== ci.key)) { const gi = nodeInfo(g.node); items.push({icon:'gaps', title:`Repair: ${g.concept}`, desc:`${gi.subject.name} · ${gi.title} · missed ${g.hits || 1}×`, mins:10, act:'repair', arg:g.node}); }
  if (!items.some(x => x.primary)) {
    const s = SUBJECTS.find(x => x.id === 'mth') || SUBJECTS[0];
    const k = nodeKeys(s).find(x => topicStage(Store.nodes[x]) < 3) || nodeKeys(s)[0];
    const i = nodeInfo(k);
    items.push({icon:'learn', title:`Start: ${i.title}`, desc:`${s.name} · the next topic on your path`, mins:15, act:'topic', arg:k, primary:true});
  }
  return items.slice(0, 5);
}

function applyTheme() {
  const t = Store.profile.theme, el = document.documentElement;
  if (t === 'light' || t === 'dark') el.dataset.theme = t; else delete el.dataset.theme;
}

/* ---- goals with deadlines: backward pacing from a date, ahead/behind by topics */
function goalKeys(g) {
  const s = subj(g.sid); if (!s) return [];
  if (typeof g.ui === 'string') return s.units.flatMap((u, ui) => u.exam === g.ui ? unitKeys(s, ui) : []);
  return g.ui >= 0 && s.units[g.ui] ? unitKeys(s, g.ui) : nodeKeys(s);
}
function goalLabel(g) { const s = subj(g.sid); if (!s) return ''; return typeof g.ui === 'string' ? g.ui + ' exam' : g.ui >= 0 ? s.units[g.ui].t : s.name; }
function goalStatus(g) {
  const keys = goalKeys(g), total = keys.length, now = Date.now(), end = new Date(g.date + 'T23:59:00').getTime();
  const prof = keys.filter(k => mastery(Store.nodes[k]) >= PROFICIENT).length;
  const need = Math.max(0, total - prof), daysLeft = Math.max(0, Math.ceil((end - now) / DAY));
  const frac = Math.min(1, Math.max(0, (now - g.created) / Math.max(DAY, end - g.created)));
  const expected = g.startProf + (total - g.startProf) * frac;
  const next = keys.find(k => mastery(Store.nodes[k]) < PROFICIENT);
  return {total, prof, need, daysLeft, perWeek:daysLeft ? need / Math.max(1, daysLeft / 7) : need, delta:Math.round(prof - expected), next, done:!need, overdue:end < now && need > 0};
}
function goalLine(g) {
  const st = goalStatus(g);
  if (st.done) return 'Goal reached';
  if (st.overdue) return `Deadline passed · ${st.need} topics to go`;
  return `${st.daysLeft} days left · ${st.perWeek.toFixed(1)} topics/week · ${st.delta > 0 ? st.delta + ' ahead' : st.delta < 0 ? -st.delta + ' behind' : 'on pace'}`;
}

/* ---- level-ups: detected on any render, shown once */
function checkLevelUps() {
  const P = Store.profile; P.levels = P.levels || {};
  let up = null;
  allSubjects().forEach(s => {
    const L = subjectLevel(s).i;
    if (P.levels[s.id] == null) { P.levels[s.id] = L; return; }
    if (L > P.levels[s.id]) { up = {s, L}; P.levels[s.id] = L; }
    else if (L < P.levels[s.id]) P.levels[s.id] = L;
  });
  if (up) { Store.saveProfile(); showLevelUp(up.s, up.L); }
}
function showLevelUp(s, L) {
  const el = $('#sheet');
  el.innerHTML = `<div class="backdrop" data-act="closeSheet"></div>
    <div class="modal levelup" role="dialog" aria-modal="true" aria-labelledby="luTitle" style="--c:${s.color}">
      <div class="eyebrow">Level up · ${esc(s.name)}</div>
      <div class="lu-level">${String(L).padStart(2, '0')}</div>
      <h2 id="luTitle">${LEVELS[L].name}</h2>
      <p class="muted">${esc(LEVELS[L].desc)}. ${LEVELS[L + 1] ? `Next: ${LEVELS[L + 1].name}.` : 'The top of the ladder.'}</p>
      <button class="btn primary" data-act="closeSheet">Continue</button>
    </div>`;
  const b = el.querySelector('.btn'); if (b) b.focus();
}

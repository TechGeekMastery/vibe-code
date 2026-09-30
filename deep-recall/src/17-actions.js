/* ------------------------------------------------------------------ actions */
const ACT = {
  nav: a => { closeSheet(); go(a); },
  subject: a => { closeSheet(); go('subject', {sid:a}); },
  subjectAt: key => { const i = nodeInfo(key); if (i) go('subject', {sid:i.sid, course:i.ui}); else go('library'); },
  topic: a => { closeSheet(); if (nodeInfo(a)) go('topic', {key:a}); },
  subjTab: a => { VIEW.tab = a; render(); },
  statPer: a => { VIEW.per = a; render(); },
  ptab: a => { VIEW.ptab = a; render(); },
  subjMethod: sid => go('subject', {sid, tab:'method'}),
  course: a => { VIEW.course = VIEW.course === +a ? -1 : +a; render(); },
  sheet: a => openSheet(a),
  goalForm: () => { VIEW.goalForm = true; render(); },
  goalCancel: () => { VIEW.goalForm = false; render(); },
  goalRemove: sid => { Store.profile.goals = (Store.profile.goals || []).filter(g => g.sid !== sid); Store.saveProfile(); VIEW.goalForm = false; render(); },
  saveGoal: sid => {
    const sc = ($('#goalScope') || {}).value, date = ($('#goalDate') || {}).value;
    if (!date || date < today()) { toast('Pick a date from today on.'); return; }
    const ui = /^-?\d+$/.test(sc) ? +sc : sc;
    const g = {sid, ui, date, created:Date.now(), startProf:0};
    g.startProf = goalKeys(g).filter(k => mastery(Store.nodes[k]) >= PROFICIENT).length;
    Store.profile.goals = (Store.profile.goals || []).filter(x => x.sid !== sid).concat([g]);
    Store.saveProfile(); VIEW.goalForm = false; render(); toast('Goal set: ' + goalLine(g));
  },
  setTier: a => { Store.profile.tutorTier = a; Store.saveProfile(); render(); },
  setTheme: a => { Store.profile.theme = a; Store.saveProfile(); applyTheme(); render(); },
  closeSheet: () => closeSheet(),
  lesson: a => openLesson(a),
  practice: a => { if (SESSION && SESSION.phase === 'summary') SESSION = null; const n = Store.nodes[a]; startPractice(a, {pretest:!(n && n.hasLesson)}); },
  problems: a => { if (SESSION && SESSION.phase === 'summary') SESSION = null; startProblemSet(a, {}); },
  placement: a => startPlacement(VIEW.sid, +a),
  repair: a => startRepair(a),
  readiness: a => { if (SESSION && SESSION.phase === 'summary') SESSION = null; startReadiness(a); },
  readySkip: a => { const n = ensureNode(a); n.ready = true; Store.saveNode(a); render(); toast('Prerequisites marked as known'); },
  tutor: a => openTutor(a),
  tutorAbout: a => { const i = nodeInfo(a); if (i) openTutor(i.sid, {focus:i.key, draft:i.lang ? '' : `I want to work on “${i.title}”. `}); },
  leaveLesson: () => { const L = LESSON; if (L && L.ctl && (L.status === 'streaming' || L.status === 'researching')) L.ctl.abort(); const i = nodeInfo(L && L.key); if (i) go('topic', {key:i.key}); else go('home'); },
  stopLesson: () => { if (LESSON && LESSON.ctl) LESSON.ctl.abort(); },
  rewrite: () => writeLesson(),
  practiceFromLesson: () => { if (LESSON) startPractice(LESSON.key, {}); },
  lessonAsk: i => lessonAsk(TUTOR_CHIPS[+i].prompt),
  chkShow: i => { const c = LESSON.checks[i] = LESSON.checks[i] || {}; c.shown = true; renderLessonBody(); },
  chkRate: a => {
    const [i, r] = a.split('|'); const c = LESSON.checks[i] = LESSON.checks[i] || {}; if (c.rate) return;
    c.rate = r;
    if (r === 'missed') {
      const b = parseLesson(LESSON.md).filter(x => x.type === 'check')[+i];
      if (b) addGap(LESSON.key, {concept:b.heading || 'Lesson recall check', detail:'Couldn’t recall: ' + b.q.slice(0, 220)});
    }
    addXP(r === 'got' ? 3 : r === 'partly' ? 2 : 1);
    renderLessonBody();
  },
  say: (a, el) => speak(a, el && el.dataset.lang),
  tchip: a => tutorSend(a),
  tquick: i => { const T = TUTOR; if (!T) return; const q = QUICK[+i]; if (!q) return; if (q[1] === 'solo') { const k = soloKey(T); if (k) ACT.practice(k); else toast('Work a problem with the tutor first, then try one solo.'); return; } if (q[1]) tutorSend(q[1]); else { const d = String(T.draft || '').trim(); if (d) tutorSend('Check this step: ' + d); else { toast('Type your step in the box, then tap Check my step.'); const t = $('#tin'); if (t) t.focus(); } } },
  tutorStopView: () => { if (TUTOR && TUTOR.ctl) TUTOR.ctl.abort(); },
  tutorAction: a => {
    const [mi, ai] = a.split('|').map(Number); const m = TUTOR && TUTOR.t && TUTOR.t.messages[mi]; const act = m && m.actions && m.actions[ai]; if (!act) return;
    const i = nodeInfo(act.key); if (!i) return;
    if (i.program) startProblemSet(act.key, {count:act.count, difficulty:act.difficulty, back:{name:'tutor'}});
    else startPractice(act.key, {pretest:!(Store.nodes[act.key] && Store.nodes[act.key].hasLesson), count:act.count, back:{name:'tutor'}});
  },
  tutorClearAsk: () => { if (TUTOR) { TUTOR.confirmClear = true; render(); } },
  tutorClearCancel: () => { if (TUTOR) { TUTOR.confirmClear = false; render(); } },
  tutorClear: () => { if (!TUTOR || !TUTOR.t) return; if (TUTOR.ctl) TUTOR.ctl.abort(); TUTOR.t.messages.length = 0; TUTOR.t.notesAt = 0; TUTOR.busy = false; TUTOR.confirmClear = false; Store.saveTutor(TUTOR.tid || TUTOR.sid); render(); toast('Conversation cleared. The tutor’s notes were kept.'); },
  tutorNotes: () => { if (TUTOR) { TUTOR.showNotes = !TUTOR.showNotes; render(); } },
  tutorNotesClear: () => { if (TUTOR && TUTOR.t) { TUTOR.t.notes = ''; TUTOR.t.notesAt = TUTOR.t.messages.length; Store.saveTutor(TUTOR.tid || TUTOR.sid); render(); toast('Notes cleared'); } },
  tutorUnfocus: () => { if (TUTOR) { TUTOR.focus = null; TUTOR.focusText = null; render(); } },
  tutorImgClear: () => { if (TUTOR) { TUTOR.img = null; render(); } },
  backToSession: () => { if (SESSION) go('session'); },
  conf: v => { if (!SESSION) return; SESSION.conf = +v; if (SESSION.att) { SESSION.att.msg = ''; } render(); },
  sel: i => { if (!SESSION || SESSION.phase !== 'q') return; SESSION.sel = +i; render(); },
  psel: k => { if (!SESSION || SESSION.phase !== 'q') return; SESSION.sel = k; render(); },
  pcheck: () => pcheck(),
  pstep: () => { const S = SESSION; if (!S || S.phase !== 'q') return; S.att.steps = Math.max(S.att.steps || 0, S.questions[S.i].fade || 0) + 1; render(); },
  phint: () => { if (!SESSION || SESSION.phase !== 'q') return; SESSION.att.hint = true; render(); },
  giveUp: () => { const S = SESSION; if (!S || S.phase !== 'q') return; if (S.att.tries === 0 && S.conf) recordCal(sidOf(S), S.conf, false); finalizeProblem(S, S.questions[S.i], false, {gaveUp:true}); },
  dispute: () => dispute(),
  reportProblem: () => reportProblem(),
  askTutorProblem: () => askTutorProblem(),
  checkMcq: () => checkMcq(),
  checkRecall: () => checkRecall(false),
  idk: () => checkRecall(true),
  selfGrade: v => selfGrade(v),
  selfRate: v => { const S = SESSION; if (!S || S.phase !== 'selfgrade') return; S.selfScore = Number(v); checkRecall(false); },
  pick: pos => { const O = SESSION.order; O.picked.push(O.pool.splice(+pos, 1)[0]); render(); },
  unpick: pos => { const O = SESSION.order; O.pool.push(O.picked.splice(+pos, 1)[0]); render(); },
  orderReset: () => { const O = SESSION.order; O.pool = O.pool.concat(O.picked); O.picked = []; render(); },
  checkOrder: () => checkOrder(),
  next: () => nextQ(),
  quitSession: () => quitSession(),
  endSummary: () => endSession(),
  retrySession: () => { if (SESSION && SESSION.retry) SESSION.retry(); },
  startQs: () => { SESSION.phase = 'q'; render(); window.scrollTo(0, 0); },
  startReview: () => startReview(),
  diagnostic: a => startDiagnostic(a),
  dismissGap: id => { const g = Store.gaps[id]; if (!g) return; g.status = 'resolved'; g.resolvedAt = Date.now(); g.manual = true; Store.saveGap(id); render(); toast('Marked as understood'); },
  toggleResolved: () => { SHOW_RESOLVED = !SHOW_RESOLVED; render(); },
  setDepth: a => { Store.profile.depth = a; Store.saveProfile(); render(); },
  setGoal: a => { Store.profile.goal = +a; Store.saveProfile(); render(); },
  setMode: a => { const [sid, m] = a.split('|'); (Store.profile.mode = Store.profile.mode || {})[sid] = m; Store.saveProfile(); render(); toast(m === 'self' ? 'Self-directed: every topic in this subject now starts with you' : 'Guided: every topic in this subject now starts with a lesson'); },
  toggleSelfGrade: sid => { const g = Store.profile.selfGrade = Store.profile.selfGrade || {}; g[sid] = !g[sid]; Store.saveProfile(); render(); },
  setWebMode: a => { Store.profile.webMode = a; Store.saveProfile(); render(); if (a !== 'off' && WEB.state !== 'ready') connectWeb(); },
  webConnect: () => connectWeb(),
  askReset: () => { VIEW.confirmReset = true; render(); },
  cancelReset: () => { VIEW.confirmReset = false; render(); },
  doReset: () => doReset(),
  askRemove: () => { VIEW.confirmRemove = true; render(); },
  cancelRemove: () => { VIEW.confirmRemove = false; render(); },
  doRemove: sid => { delete Store.custom[sid]; Store.remove(Store.persistent ? Store.path('custom', sid) : ''); toast('Subject removed'); go('library'); },
  genSubject: () => genSubject(),
  addSuggest: a => { ADD.text = a; genSubject(); },
  stopAdd: () => { if (addCtl) addCtl.abort(); },
  saveSubject: () => saveSubject()
};
async function connectWeb() {
  WEB.state = 'checking'; if (VIEW.name === 'settings') render();
  await WEB.init(true);
  if (['settings', 'tutor', 'source'].includes(VIEW.name)) render();
  if (WEB.ready()) toast('Web search connected');
}
async function doReset() {
  VIEW.resetting = true; render();
  try {
    if (Store.persistent) {
      const base = Store.base();
      for (const c of ['nodes', 'gaps', 'lessons', 'tutor', 'vocab', 'sources', 'threads', 'outlines']) {
        const s = await base.collection(c).limit(1000).get();
        for (const d of s.docs) await base.collection(c).doc(d.id).delete();
      }
    }
    const P = Store.profile;
    const keep = {depth:P.depth, goal:P.goal, webMode:P.webMode, mode:P.mode, selfGrade:P.selfGrade, theme:P.theme, teachStyle:P.teachStyle, tutorTier:P.tutorTier};
    Store.nodes = {}; Store.gaps = {}; Store.mem = {}; Store.tutor = {}; Store.vocab = {}; Store.threads = {}; Store.outlines = {};
    Store.profile = Object.assign(DEFAULT_PROFILE(), keep);
    await Store.saveProfile();
    LESSON = null; TUTOR = null; SESSION = null;
    toast('Progress reset');
  } catch (e) { console.warn(e); toast('Reset stopped partway. Try again.'); }
  VIEW.confirmReset = false; VIEW.resetting = false; render();
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  if (el.tagName === 'INPUT' && el.type === 'checkbox') { const fn = ACT[el.dataset.act]; if (fn) fn(el.dataset.arg, el); return; }
  const fn = ACT[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el.dataset.arg, el); }
});
document.addEventListener('input', e => {
  const t = e.target, k = t.dataset && t.dataset.inp; if (!k) return;
  if (k === 'sessText' && SESSION) SESSION.text = t.value;
  else if (k === 'pans' && SESSION) { SESSION.text = t.value; schedPreview(); }
  else if (k === 'lans' && SESSION) SESSION.text = t.value;
  else if (k === 'lessonAsk' && LESSON) LESSON.askDraft = t.value;
  else if (k === 'tin' && TUTOR) { TUTOR.draft = t.value; t.style.height = 'auto'; t.style.height = Math.min(180, t.scrollHeight) + 'px'; }
  else if (k.indexOf('chk:') === 0 && LESSON) { const i = k.slice(4); (LESSON.checks[i] = LESSON.checks[i] || {}).ans = t.value; }
  else if (k === 'add') ADD.text = t.value;
  else if ((k === 'plTime' || k === 'plCue' || k === 'plPlace') && VIEW.name === 'plan') { planForm()[{plTime:'time', plCue:'cue', plPlace:'place'}[k]] = t.value; const el = $('#planSay'); if (el) el.textContent = planSentence(planForm()); }
  else if (k === 'libQ') { VIEW.q = t.value; const el = $('#libResults'); if (el) el.innerHTML = t.value.trim().length > 2 ? libResultsHtml(t.value) : ''; }
  else if (k === 'kitQ') { VIEW.kq = t.value; const el = $('#kitBook'); if (el && VIEW.name === 'subject') { const tmp = document.createElement('div'); tmp.innerHTML = kitBookHtml(subj(VIEW.sid)); const nb = tmp.querySelector('#kitBook'); if (nb) { el.innerHTML = nb.innerHTML; typeset(el); } } }
  else if (k === 'stTitle') STUDY_FORM.title = t.value;
  else if (k === 'stGoal') STUDY_FORM.goal = t.value;
  else if (k === 'thGoal' && TUTOR) TUTOR.goalDraft = t.value;
  else if (k === 'bitAns' && BITS && bitSt(BITS)) bitSt(BITS).text = t.value;
  else if (k === 'bitAsk' && BITS && bitSt(BITS)) bitSt(BITS).ask = t.value;
  else if (k.indexOf('task:') === 0 && TASK) { TASK.fields[k.slice(5)] = t.value; }
  else if (k.indexOf('src:') === 0 && SRC) { SRC[k.slice(4)] = t.value; }
  else if (k === 'measure' && PROJ) PROJ.measure = t.value;
  else if (k === 'observe' && PROJ) PROJ.observe = t.value;
});
document.addEventListener('change', e => {
  const t = e.target, k = t.dataset && t.dataset.file;
  if (t.dataset && t.dataset.sel === 'studySid') { STUDY_FORM.sid = t.value; return; }
  if (t.dataset && t.dataset.sel && SRC) { SRC[t.dataset.sel] = t.value; if (t.dataset.sel === 'sid') SRC.key = ''; render(); return; }
  if (!k || !t.files || !t.files[0]) return;
  const f = t.files[0];
  if (k === 'work') checkPhoto(f);
  else if (k === 'tutor' && TUTOR) { TUTOR.img = f; render(); const inp = $('#tin'); if (inp) inp.focus(); }
  else if (k === 'srcImg' && SRC) sourceFromImage(f);
  else if (k === 'projPhoto' && PROJ) projectPhoto(f);
  t.value = '';
});
document.addEventListener('submit', e => {
  e.preventDefault();
  const id = e.target.id;
  if (id === 'lessonAskForm' && LESSON) lessonAsk(LESSON.askDraft);
  if (id === 'addForm') genSubject();
  if (id === 'tutorComposer' && TUTOR) tutorSend(TUTOR.draft);
  if (id === 'lansForm' && SESSION && SESSION.phase === 'q') ACT.lcheck();
  if (id === 'drillForm' && SESSION && SESSION.phase === 'q') drillCheck();
  if (id === 'bitAskForm') bitAsk();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('#sheet') && $('#sheet').innerHTML) { closeSheet(); return; }
  const id = e.target && e.target.id;
  if (e.key === 'Enter' && !e.shiftKey && id === 'lessonAskInput') { e.preventDefault(); if (LESSON) lessonAsk(LESSON.askDraft); return; }
  if (e.key === 'Enter' && !e.shiftKey && id === 'tin') { e.preventDefault(); if (TUTOR) tutorSend(TUTOR.draft); return; }
  if (e.key === 'Enter' && !e.shiftKey && id === 'bitAsk') { e.preventDefault(); bitAsk(); return; }
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && id === 'bitAns') { e.preventDefault(); bitCheck(false); return; }
  if (VIEW.name !== 'session' || !SESSION) return;
  const S = SESSION, tag = (e.target.tagName || '').toLowerCase();
  if (e.key === 'Tab' && id === 'code' && !e.shiftKey) { e.preventDefault(); const t = e.target, a = t.selectionStart; t.value = t.value.slice(0, a) + '    ' + t.value.slice(t.selectionEnd); t.selectionStart = t.selectionEnd = a + 4; S.text = t.value; return; }
  if (e.key === 'Enter' && id === 'pans' && S.phase === 'q') { e.preventDefault(); if (S.questions[S.i].type === 'drill') drillCheck(); else pcheck(); return; }
  if (e.key === 'Enter' && !e.shiftKey && id === 'lans' && S.phase === 'q') { e.preventDefault(); ACT.lcheck(); return; }
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && (id === 'answer' || id === 'code') && S.phase === 'q') { e.preventDefault(); const q = S.questions[S.i]; if (q.type === 'problem') pcheck(); else if (q.type === 'lang') ACT.lcheck(); else checkRecall(false); return; }
  if (S.phase === 'q' && tag !== 'textarea' && tag !== 'input' && S.questions[S.i] && S.questions[S.i].type === 'mcq') {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= S.questions[S.i].options.length) { S.sel = n - 1; render(); }
    else if (e.key === 'Enter' && S.sel != null && S.conf) { e.preventDefault(); checkMcq(); }
  }
});

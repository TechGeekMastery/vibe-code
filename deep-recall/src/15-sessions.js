/* ------------------------------------------------------------------ sessions */
function newSession(o) {
  if (o.back && o.back.name === 'topic' && ['home', 'gaps', 'review'].includes(VIEW.name)) o.back = {name:VIEW.name};
  return Object.assign({questions:[], i:0, results:[], sel:null, text:'', fb:null, order:null, conf:null, selfScore:null, build:null,
    phase:'loading', att:{tries:0, hint:false, wrong:[]}, before:{}, lastB:{}, probGaps:[], ctl:new AbortController()}, o);
}
function resetQState(S) {
  Object.assign(S, {firstOk:undefined, sel:null, text:'', fb:null, order:null, conf:null, selfScore:null, build:null, att:{tries:0, hint:false, wrong:[]}, photoText:'', photoErr:'', photoBusy:false});
}
function sidOf(S) { const q = S.questions[S.i]; const i = q && nodeInfo(q.node); return i ? i.sid : null; }
async function runSession(S, gen) {
  S.phase = 'loading'; S.ctl = new AbortController(); S.streaming = true;
  S.retry = () => { S.questions = []; S.i = 0; S.results = []; S.vchain = null; runSession(S, gen); };
  if (SESSION === S) render();
  try {
    await gen(S);
  } catch (e) {
    if (SESSION !== S) return;
    S.streaming = false;
    if (e && e.code === 'cancelled') return;
    if (!S.questions.length) { S.phase = 'error'; S.err = errCopy(e); render(); return; }
    toast('Stopped early: ' + errCopy(e));
  }
  if (SESSION !== S) return;
  S.streaming = false;
  if (!S.questions.length) { S.phase = 'error'; S.err = errCopy({code:'invalid_json'}); render(); return; }
  if (S.phase === 'loading') { S.phase = S.intro ? 'intro' : 'q'; render(); window.scrollTo(0, 0); }
  else if (S.phase === 'waiting') { if (S.i < S.questions.length) S.phase = 'q'; else finishSession(); render(); window.scrollTo(0, 0); }
  else { updateSessHead(); const nb = $('#nextBtn'); if (nb && S.phase === 'feedback') nb.textContent = S.i + 1 >= S.questions.length ? 'See results' : 'Continue'; }
}
function addQs(S, qs) {
  if (!qs.length || SESSION !== S) return;
  S.questions.push(...qs);
  qs.forEach(q => { if (q.type === 'problem' && !q.pack) { applyFading(S, q); queueVerify(S, q); } });
  if (S.phase === 'loading' && !S.intro && !S.holdStream) { S.phase = 'q'; render(); window.scrollTo(0, 0); }
  else if (S.phase === 'waiting') { S.phase = 'q'; render(); window.scrollTo(0, 0); }
  else updateSessHead();
}
async function streamProblems(S, prompt, allowed, fallbackKey) {
  let seen = 0;
  const take = text => {
    const blocks = parseProblemBlocks(text);
    if (blocks.length <= seen) return;
    const fresh = blocks.slice(seen).map(b => toProblem(b, allowed, fallbackKey)).filter(Boolean);
    seen = blocks.length;
    addQs(S, fresh);
  };
  const r = await AI.text(prompt, {modelTier:'default', cache:false, signal:S.ctl.signal, onText: ({text}) => { if (SESSION === S) take(text); }});
  if (SESSION === S) take(r.text);
}

/* ---- answer-key verification: an independent re-solve, with a careful tiebreak on disagreement */
function queueVerify(S, q) {
  if (q.ptype === 'code') { q.vstate = 'queued'; q.verifyP = S.vchain = (S.vchain || Promise.resolve()).then(() => (SESSION === S && !S.finished) ? verifyCode(S, q) : null).catch(() => {}); return; }
  if (q.ptype === 'proof' || !AI.ok()) { q.vstate = 'skip'; return; }
  q.vstate = 'queued';
  q.verifyP = S.vchain = (S.vchain || Promise.resolve()).then(() => (SESSION === S && !S.finished) ? verifyProblem(S, q) : null).catch(() => {});
}
function sameAnswer(q, a, b) {
  if (q.ptype === 'choice') return (String(a).toUpperCase().match(/[A-F]/) || [''])[0] === String(b).trim().toUpperCase();
  if (!MX.ok()) return String(a).replace(/\s/g, '') === String(b).replace(/\s/g, '');
  if (q.ptype === 'number') { const x = MX.evalStr(a), y = MX.evalStr(b); return isFinite(x) && isFinite(y) && MX.close(x, y, q.tol); }
  if (q.ptype === 'numbers') return machineCheck(Object.assign({}, q, {answer:b, claudeCheck:false}), a) === true;
  return MX.equiv(a, b, q.vars, q.ptype === 'antiderivative') === true;
}
function applyKey(q, ans, sol, note) {
  q.origAnswer = q.answerText;
  if (q.ptype === 'choice') {
    const L = (String(ans).toUpperCase().match(/[A-F]/) || [''])[0], o = q.options.find(x => x.k === L);
    if (!o) { q.vstate = 'doubt'; q.keyNote = 'The checker disagreed with the key but gave no valid option.'; return; }
    q.answer = L; q.answerText = L + ') ' + o.t;
  } else {
    q.answer = String(ans).replace(/^`|`$/g, '').trim(); q.answerText = q.answer;
    q.claudeCheck = MX.ok() ? !(q.ptype === 'numbers' ? q.answer.split(/[,;]/).every(p => MX.parses(p)) : MX.parses(q.answer)) : false;
  }
  if (sol && sol.trim()) q.solution = sol.trim();
  q.keyNote = str(note); q.vstate = 'fixed';
}
async function verifyProblem(S, q) {
  q.vstate = 'checking';
  try {
    const r = await AI.text(verifyPrompt(q), {modelTier:'default', cache:false, signal:S.ctl.signal});
    const f = parseFields(r.text, ['WORK', 'VERDICT', 'ANSWER', 'NOTE', 'SOLUTION']);
    const v = (f.VERDICT || '').toLowerCase();
    if (v.startsWith('correct')) { q.vstate = 'ok'; return; }
    if (v.startsWith('ambig')) { q.vstate = 'doubt'; q.keyNote = str(f.NOTE); return; }
    if (v.startsWith('wrong') && f.ANSWER) {
      if (sameAnswer(q, f.ANSWER, q.answer)) { q.vstate = 'ok'; return; }
      const r2 = await AI.text(tiebreakPrompt(q, q.answer, f.ANSWER), {modelTier:'complex', cache:false, signal:S.ctl.signal});
      const g = parseFields(r2.text, ['WORK', 'VERDICT', 'ANSWER', 'SOLUTION']);
      const v2 = (g.VERDICT || '').trim().toUpperCase();
      if (v2.startsWith('A') && !v2.startsWith('AMBIG')) { q.vstate = 'ok'; return; }
      if (v2.startsWith('AMBIG') || (!g.ANSWER && !v2.startsWith('B'))) { q.vstate = 'doubt'; q.keyNote = str(f.NOTE); return; }
      if (v2.startsWith('B')) applyKey(q, f.ANSWER, f.SOLUTION || g.SOLUTION, f.NOTE);
      else if (sameAnswer(q, g.ANSWER, q.answer)) q.vstate = 'ok';
      else applyKey(q, g.ANSWER, g.SOLUTION, 'Neither the original key nor the first check held up; a third solve settled it.');
      return;
    }
    q.vstate = 'unverified';
  } catch (e) { q.vstate = 'unverified'; }
}

/* ---- starting sessions */
async function genQuestions(info, lessonMd, pretest, signal) {
  const r = await AI.json(questionsPrompt(info, lessonMd, pretest), {modelTier:'default', cache:false, signal});
  return verifyMcqs(validateQs(r && r.questions, [info.key], info.key), signal);
}
/* an independent solver answers every multiple-choice item; items whose key it disputes are dropped */
async function verifyMcqs(qs, signal) {
  const m = qs.filter(q => q.type === 'mcq');
  if (!m.length || !AI.ok()) return qs;
  try {
    const r = await AI.json(mcqVerifyPrompt(m), {modelTier:'quick', cache:false, signal});
    const ans = Array.isArray(r && r.answers) ? r.answers : null;
    if (!ans || ans.length !== m.length) return qs;
    const bad = new Set(m.filter((q, i) => Number(ans[i]) !== q.answer));
    const kept = qs.filter(q => !bad.has(q));
    return kept.length >= 3 ? kept : qs;
  } catch (e) { if (e && e.code === 'cancelled') throw e; return qs; }
}
function outlineFirst(S, key) {
  return ensureOutline(key, msg => { if (SESSION === S && S.phase === 'loading') { S.loadMsg = msg; render(); } }).catch(() => null);
}
function startPractice(key, opts) {
  opts = opts || {};
  const info = nodeInfo(key); if (!info) return;
  if (hasPack(key) && !info.lang) return startPackPractice(key, opts);
  if (!AI.ok()) return;
  if (info.lang) return startLangSet(key, opts);
  if (info.program) return startProblemSet(key, opts);
  closeSheet();
  const pretest = !!opts.pretest;
  const S = SESSION = newSession({kind:pretest ? 'pretest' : 'practice', title:info.title, back:opts.back || {name:'topic', key}, node:key,
    loadMsg: pretest ? 'Testing yourself before you study makes the lesson stick better, even when you miss. Writing your pre-test now.' : 'Writing questions that target the misconceptions people actually hold about this topic.'});
  Store.profile.lastNode = key; Store.saveProfile();
  const prefetch = (!pretest && LESSON && LESSON.key === key && LESSON.prefetch) ? LESSON.prefetch : null;
  if (prefetch) LESSON.prefetch = null;
  go('session');
  runSession(S, async S => {
    let qs = null;
    if (prefetch) { try { qs = await prefetch; } catch (e) { qs = null; } }
    if (!qs) { await outlineFirst(S, key); S.loadMsg = pretest ? 'Writing your pre-test across the topic’s knowledge points.' : 'Writing questions aimed at your weakest and untested knowledge points.'; if (SESSION === S) render(); }
    if (!qs) {
      let md = null;
      if (!pretest) { const c = await Store.getLesson(key); md = c && c.md; }
      qs = await genQuestions(info, md, pretest || !md, S.ctl.signal);
      if (!md && !pretest) S.kind = 'pretest';
    }
    addQs(S, qs);
  });
}
function startProblemSet(key, opts) {
  opts = opts || {};
  const info = nodeInfo(key); if (!info) return;
  if (hasPack(key) && !opts.generated) return startPackPractice(key, opts);
  if (!AI.ok()) return;
  closeSheet();
  const lvl = opts.difficulty || levelFor(key), n = opts.count || 8;
  const S = SESSION = newSession({kind:'problems', title:info.title, back:opts.back || {name:'topic', key}, node:key, problemStream:true, expected:n, fadePlan:!opts.count && pst(Store.nodes[key]).a < 4 && !info.code,
    loadMsg:`${n} ${info.skills ? 'problems and troubleshooting drills' : 'problems'} at level ${lvl}. Each answer key is re-solved independently while you work; you get two attempts and a hint on each.`});
  Store.profile.lastNode = key; Store.saveProfile();
  go('session');
  const difficultyText = lvl === 1 ? 'mostly 1, ending with one 2' : lvl === 2 ? 'mostly 2, starting with one 1 and ending with one 3' : 'mostly 3, starting with one 2';
  runSession(S, async S => {
    await outlineFirst(S, key);
    S.loadMsg = `${n} problems at level ${lvl}, aimed at your untested and weakest knowledge points. Answer keys are re-solved independently while you work.`; if (SESSION === S) render();
    await streamProblems(S, problemsPrompt({topics:[info], n, difficultyText, skills:info.skills, kp:kpBlock(key, n, 'block'),
      intro:`Write a problem set on ${topicLine(info)}. Every problem uses topic id ${key}.`}), [key], key);
  });
}
function startReadiness(key) {
  const info = nodeInfo(key); if (!info || !AI.ok()) return;
  const pre = weakPrereqs(key).slice(0, 4).map(nodeInfo);
  if (!pre.length) { const n = ensureNode(key); n.ready = true; Store.saveNode(key); render(); return; }
  const S = SESSION = newSession({kind:'readiness', title:info.title, target:key, back:{name:'topic', key}, problemStream:pre.every(i => i.program), expected:5,
    loadMsg:`Five questions on what “${info.title}” builds on: ${pre.map(i => i.title).join('; ')}. Pass at 70% and the topic opens; miss and the gaps land on the prerequisite.`});
  go('session');
  const keys = pre.map(i => i.key);
  if (pre.every(i => i.program)) runSession(S, S => streamProblems(S, problemsPrompt({topics:pre, n:5, difficultyText:'mostly 1, one 2', skills:pre.some(i => i.skills),
    intro:`Write a readiness check for ${topicLine(info)}: 5 problems on the prerequisite topics below, testing exactly what the new topic depends on.`}), keys, keys[0]));
  else runSession(S, async S => { const r = await AI.json(readinessPrompt(info, pre), {modelTier:'default', cache:false, signal:S.ctl.signal}); addQs(S, await verifyMcqs(validateQs(r && r.questions, keys, keys[0]), S.ctl.signal)); });
}
function startPlacement(sid, ui) {
  const s = subj(sid); if (!s || !AI.ok()) return;
  const keys = unitKeys(s, ui), infos = keys.map(nodeInfo), n = Math.min(10, keys.length);
  if (s.lang) return startLangPlacement(sid, ui);
  const S = SESSION = newSession({kind:'placement', title:s.units[ui].t, back:{name:'subject', sid, course:ui}, problemStream:true, expected:n,
    loadMsg:`${n} problems across ${s.units[ui].t} to find where you stand. Use “Show solution” on anything you haven’t learned.`});
  go('session');
  runSession(S, S => streamProblems(S, problemsPrompt({topics:infos, n, difficultyText:'mostly 2', skills:s.skills,
    intro:`Write a placement test for the course "${s.units[ui].t}" in ${s.name}: spread the problems across the topics in course order, at most one per topic, favoring the core topics.`}), keys, keys[0]));
}
function ownQuestion(n) {
  const qs = n.myQs || []; if (!qs.length) return null;
  const q = qs[Math.floor(Math.random() * qs.length)];
  return {type:'recall', prompt:q.q, rubric:[q.a], model:q.a, gap:'Your own question', node:n.key, own:true};
}
function startReview() {
  const due = dueNodes().slice(0, 6);
  if (!due.length || !AI.ok()) return;
  const groups = {lang:[], prog:[], concept:[], pack:[]};
  due.forEach(n => { const i = nodeInfo(n.key); (i.lang ? groups.lang : hasPack(n.key) ? groups.pack : i.program ? groups.prog : groups.concept).push(n); });
  const S = SESSION = newSession({kind:'review', title:`${due.length} topic${due.length > 1 ? 's' : ''}`, back:{name:'review'}, problemStream:!groups.concept.length && !groups.lang.length, expected:due.length * 2,
    loadMsg:'Pulling up what you studied and writing fresh questions and problems from new angles, plus questions you wrote yourself.'});
  if (groups.concept.length || groups.lang.length) S.holdStream = true;
  go('session');
  runSession(S, async S => {
    const jobs = [];
    const own = due.map(ownQuestion).filter(Boolean).slice(0, 2);
    if (groups.pack.length) jobs.push(Promise.all(groups.pack.map(n => loadPack(n.key).then(P => P ? pickPack(n.key, (P.practice || []).concat(P.exam || []), 2).map(q => packProblem(q, n.key, P)) : []))).then(xs => { groups.pack.forEach(n => Store.saveNode(n.key)); addQs(S, shuffle([].concat(...xs))); }));
    if (groups.concept.length) {
      const items = groups.concept.map(n => ({info:nodeInfo(n.key), node:n}));
      jobs.push(AI.json(reviewPrompt(items), {modelTier:'default', cache:false, signal:S.ctl.signal}).then(r => {
        const qs = validateQs(r && r.questions, items.map(x => x.info.key), null);
        S.holdStream = !!groups.lang.length && !S.langDone; addQs(S, qs.concat(own));
      }));
    } else if (own.length) addQs(S, own);
    if (groups.lang.length) jobs.push(langReviewJob(S, groups.lang.map(n => nodeInfo(n.key))).then(() => { S.langDone = true; S.holdStream = false; if (S.phase === 'loading' && S.questions.length) { S.phase = 'q'; render(); } }));
    if (groups.prog.length) {
      const infos = groups.prog.map(n => nodeInfo(n.key)), keys = infos.map(i => i.key);
      jobs.push(streamProblems(S, problemsPrompt({topics:infos, n:groups.prog.length * 2, difficultyText:'mostly 2, matched to each topic', skills:infos.some(i => i.skills),
        intro:'Write a spaced-review problem set: 2 problems per topic below, interleaved so consecutive problems come from different topics.'}), keys, keys[0]).then(() => { S.holdStream = false; if (S.phase === 'loading' && S.questions.length) { S.phase = 'q'; render(); } }));
    }
    const res = await Promise.allSettled(jobs);
    const failed = res.find(x => x.status === 'rejected');
    if (failed && !S.questions.length) throw failed.reason;
  });
}
function startDiagnostic(sid) {
  const s = subj(sid); if (!s || !AI.ok()) return;
  const keys = nodeKeys(s);
  const S = SESSION = newSession({kind:'diagnostic', title:s.name, back:{name:'subject', sid}, loadMsg:'Writing a 10-question diagnostic across this whole subject to map what you already know and where the holes are.'});
  go('session');
  runSession(S, async S => {
    const r = await AI.json(diagnosticPrompt(s), {modelTier:'default', cache:false, signal:S.ctl.signal});
    addQs(S, validateQs(r && r.questions, keys, null));
  });
}
function startRepair(key) {
  const info = nodeInfo(key); if (!info || !AI.ok()) return;
  closeSheet();
  const gaps = openGapsFor(key).slice(0, 4);
  if (!gaps.length) { toast('No open gaps on this topic.'); return; }
  if (info.lang) return startLangRepair(key, gaps);
  const S = SESSION = newSession({kind:'repair', title:info.title, back:{name:'topic', key}, node:key, holdStream:true,
    loadMsg:`Writing a targeted explanation and follow-up ${info.program ? 'problems' : 'questions'} for ${gaps.length} gap${gaps.length > 1 ? 's' : ''}.`});
  go('session');
  if (info.program) {
    runSession(S, async S => {
      const prompt = problemsPrompt({topics:[info], n:Math.min(8, gaps.length * 2), difficultyText:'1 or 2', gapField:true, skills:info.skills,
        intro:`The learner has these gaps on ${topicLine(info)}:\n${gapLines(gaps)}\n\nFirst write a targeted repair lesson in Markdown between the lines === LESSON and === END LESSON (200-450 words, one ### heading per gap: start from the wrong mental model that produced the gap, show why it fails, build the correct method with one short worked example; math in \\( \\)). Then write the problems.`,
        distribution:'2 problems per gap. GAP gives the gap number each targets.'});
      const r = await AI.text(prompt, {modelTier:'default', cache:false, signal:S.ctl.signal});
      const lm = String(r.text).match(/={3,}[ \t]*LESSON[^\n]*\n([\s\S]*?)\n[ \t]*={3,}[ \t]*END[ \t]*LESSON/);
      S.intro = lm ? lm[1].trim() : null;
      const qs = parseProblemBlocks(r.text).map(b => toProblem(b, [key], key)).filter(Boolean);
      qs.forEach(q => { const g = gaps[(q.gapIndex || 1) - 1] || gaps[0]; q.gapId = g.id; });
      S.questions.push(...qs); qs.forEach(q => queueVerify(S, q));
    });
  } else {
    runSession(S, async S => {
      const r = await AI.json(repairPrompt(info, gaps), {modelTier:'default', cache:false, signal:S.ctl.signal});
      const qs = validateQs(r && r.questions, [key], key);
      qs.forEach(q => { const g = gaps[(q.gapIndex || 1) - 1] || gaps[0]; q.gapId = g.id; });
      S.intro = str(r && r.lesson) || null;
      S.questions.push(...qs);
    });
  }
}

/* ---- concept questions */
function hyperNote(S, correct) { return S.conf >= 75 && !correct; }
function noteBefore(S, k) { const n = Store.nodes[k]; if (!(k in S.lastB)) S.lastB[k] = n ? n.last || null : null; }
function pushResult(S, q) { noteBefore(S, q.node); bumpDay('a', 1); if (S.fb.score >= 0.8) { bumpDay('c', 1); markSolo(q.node); } if (q.kp) recordKP(q.node, q.kp, S.fb.score, S.conf); S.results[S.i] = {node:q.node, score:S.fb.score, gaps:(S.fb.gaps || []).map(g => Object.assign({}, g, S.fb.hyper ? {boost:1} : {})), gapId:q.gapId || null, own:!!q.own}; }
function checkMcq() {
  const S = SESSION, q = S.questions[S.i];
  if (S.phase !== 'q' || S.sel == null || !S.conf) return;
  const ok = S.sel === q.answer;
  recordCal(sidOf(S), S.conf, ok);
  S.fb = {score:ok ? 1 : 0, verdict:ok ? 'correct' : 'incorrect', feedback:q.explanation, trap:ok ? null : q.traps[S.sel], hyper:hyperNote(S, ok),
    gaps: ok ? [] : [{concept:q.gap, detail:q.traps[S.sel] || ('Chose: ' + q.options[S.sel])}]};
  S.phase = 'feedback'; pushResult(S, q); render(); focusNext();
}
async function checkRecall(idk) {
  const S = SESSION, q = S.questions[S.i];
  if (!S || !['q', 'gradefail', 'selfgrade'].includes(S.phase)) return;
  const ans = String(S.text || '').trim();
  if (idk || ans.length < 3) {
    S.fb = {score:0, verdict:'incorrect', feedback:'No answer given. Read the model answer, then close it and try to restate it from memory before moving on.', model:q.model,
      gaps:[{concept:q.gap, detail:'Couldn’t answer: ' + q.prompt.slice(0, 200)}]};
    S.phase = 'feedback'; pushResult(S, q); render(); focusNext(); return;
  }
  if (!S.conf && S.phase === 'q') return;
  const sid = sidOf(S);
  if (S.phase === 'q' && !S.exam && !S.strict && selfGradeOn(sid) && S.selfScore == null) { S.phase = 'selfgrade'; render(); return; }
  S.phase = 'grading'; render();
  try {
    const g = await AI.json(gradePrompt(q, ans, nodeInfo(q.node), !!(S.exam || S.strict)), {modelTier:'quick'});
    if (SESSION !== S) return;
    let score = clamp01(g && g.score);
    let verdict = g && ['correct', 'partial', 'incorrect'].includes(g.verdict) ? g.verdict : (score >= 0.8 ? 'correct' : score >= 0.4 ? 'partial' : 'incorrect');
    if (S.exam || S.strict) { score = verdict === 'correct' || score >= 0.9 ? 1 : 0; verdict = score ? 'correct' : 'incorrect'; }
    let gaps = Array.isArray(g && g.gaps) ? g.gaps.filter(x => x && x.concept).slice(0, 2).map(x => ({concept:str(x.concept), detail:str(x.detail)})) : [];
    if (!gaps.length && score < 0.6) gaps = [{concept:q.gap, detail:str(g && g.misconception) || 'Incomplete answer to: ' + q.prompt.slice(0, 200)}];
    if (gaps.length && g && g.root_topic && nodeInfo(g.root_topic)) { gaps[0].root_topic = g.root_topic; gaps[0].root_reason = str(g.root_reason); }
    recordCal(sid, S.conf, score >= 0.6);
    S.fb = {score, verdict, feedback:corrText(g), model:q.model, hits:Array.isArray(g && g.hits) ? g.hits : null, hyper:hyperNote(S, score >= 0.6),
      misconception:g && g.misconception && g.misconception !== 'null' ? str(g.misconception) : null, gaps,
      root:gaps[0] && gaps[0].root_topic ? {key:gaps[0].root_topic, why:gaps[0].root_reason} : null};
    if (S.selfScore != null) { S.fb.self = S.selfScore; const agree = 1 - Math.abs(S.selfScore - score); S.fb.agree = agree; addMeta(sid, 'selfgrade', agree); }
    S.phase = 'feedback'; pushResult(S, q);
  } catch (e) {
    if (SESSION !== S) return;
    S.phase = 'gradefail'; S.err = errCopy(e);
  }
  render(); if (S.phase === 'feedback') focusNext();
}
function selfGrade(v) {
  const S = SESSION, q = S.questions[S.i], score = Number(v);
  recordCal(sidOf(S), S.conf, score >= 0.6);
  S.fb = {score, verdict:score >= 1 ? 'correct' : score > 0 ? 'partial' : 'incorrect', feedback:'Self-graded.', model:q.model,
    gaps: score >= 1 ? [] : [{concept:q.gap, detail:(score > 0 ? 'Partial answer to: ' : 'Missed: ') + q.prompt.slice(0, 200)}]};
  S.phase = 'feedback'; pushResult(S, q); render(); focusNext();
}
function checkOrder() {
  const S = SESSION, q = S.questions[S.i], P = S.order.picked;
  if (S.phase !== 'q' || S.order.pool.length || !S.conf) return;
  let good = 0, pairs = 0;
  for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) { pairs++; if (P[a] < P[b]) good++; }
  const exact = P.every((v, i) => v === i), frac = pairs ? good / pairs : 0;
  const score = exact ? 1 : Math.round(Math.max(0, (frac - 0.5) / 0.5) * 0.8 * 100) / 100;
  recordCal(sidOf(S), S.conf, exact);
  S.fb = {score, verdict:exact ? 'correct' : score >= 0.5 ? 'partial' : 'incorrect', feedback:q.explanation, hyper:hyperNote(S, exact),
    gaps: exact ? [] : [{concept:q.gap, detail:'Sequence out of order: ' + q.prompt.slice(0, 200)}]};
  S.phase = 'feedback'; pushResult(S, q); render(); focusNext();
}

/* ---- problems: attempts, checking, recording */
function currentInput(S, q) { return q.ptype === 'choice' ? (S.sel || '') : q.ptype === 'code' ? String(S.text || '') : String(S.text || '').trim(); }
async function pcheck() {
  const S = SESSION; if (!S || S.phase !== 'q') return;
  const q = S.questions[S.i], A = S.att, input = currentInput(S, q);
  if (!input) { A.msg = q.ptype === 'choice' ? 'Pick an option first.' : 'Enter an answer first, or use Show solution.'; A.msgKind = 'warn'; render(); return; }
  if (A.tries === 0 && !S.conf) { A.msg = 'Rate your confidence first. It takes one tap and builds your calibration score.'; A.msgKind = 'warn'; render(); return; }
  if (q.verifyP && (q.vstate === 'queued' || q.vstate === 'checking')) {
    S.phase = 'checking'; S.checkMsg = 'Double-checking the answer key…'; render();
    await q.verifyP;
    if (SESSION !== S) return;
    S.phase = 'q';
  }
  if (q.ptype === 'code') return checkCode(S, q, input);
  if (q.ptype === 'proof') return gradeProof(S, q, input);
  let res = machineCheck(q, input);
  if (res === 'parse') { A.msg = 'Couldn’t read that answer. Use ^ for powers, * between factors where needed, and sqrt(), ln(), sin(). Check the preview.'; A.msgKind = 'warn'; render(); return; }
  if (res === null) {
    if (!AI.ok()) { A.msg = 'This answer can’t be checked automatically here. Compare it with the solution.'; A.msgKind = 'warn'; return finalizeProblem(S, q, false, {gaveUp:true}); }
    S.phase = 'checking'; S.checkMsg = 'Checking your answer…'; render();
    try {
      const r = await AI.json(equivPrompt(q, input), {modelTier:'quick'});
      if (SESSION !== S) return;
      res = !!(r && r.equivalent === true);
    } catch (e) {
      if (SESSION !== S) return;
      S.phase = 'q'; A.msg = errCopy(e); A.msgKind = 'warn'; render(); return;
    }
    S.phase = 'q';
  }
  attemptResult(S, q, res === true, input);
}
function attemptResult(S, q, ok, input) {
  const A = S.att;
  if (A.tries === 0) { S.firstOk = ok; if (q.vstate !== 'doubt') recordCal(sidOf(S), S.conf, ok); }
  if (ok) return finalizeProblem(S, q, true, {});
  A.wrong.push(q.ptype === 'code' ? '(code)' : input); A.tries++;
  if (A.tries >= (S.exam || S.strict ? 1 : q.ptype === 'code' ? 3 : 2)) return finalizeProblem(S, q, false, {});
  A.msg = q.ptype === 'code' ? 'Tests failed. Read the error, fix the code, and run again.' : 'Not quite. Check your work and try once more.' + (q.hint && !A.hint ? ' A hint is available.' : '');
  A.msgKind = 'bad'; A.disputed = false;
  if (q.ptype === 'choice') S.sel = null;
  render();
  const inp = $('#pans'); if (inp) { inp.focus(); inp.select(); }
}
async function gradeProof(S, q, input) {
  S.phase = 'checking'; S.checkMsg = 'Grading your argument…'; render();
  try {
    const strict = !!(S.exam || S.strict);
    const g = await AI.json(gradePrompt({prompt:q.prompt, rubric:q.rubric, model:q.solution}, input, nodeInfo(q.node), strict), {modelTier:q.pack ? tutorTier() : 'quick'});
    if (SESSION !== S) return;
    const raw = clamp01(g && g.score), right = strict ? (g && g.verdict === 'correct') || raw >= 0.9 : raw >= 0.7;
    const score = strict ? (right ? 1 : 0) : raw;
    S.phase = 'q';
    if (S.att.tries === 0) recordCal(sidOf(S), S.conf, right);
    finalizeProblem(S, q, right, {score, hits:Array.isArray(g && g.hits) ? g.hits : null, feedback:corrText(g),
      proofGap:Array.isArray(g && g.gaps) && g.gaps[0] ? Object.assign({}, g.gaps[0], g.root_topic ? {root_topic:g.root_topic, root_reason:g.root_reason} : {}) : null});
  } catch (e) {
    if (SESSION !== S) return;
    S.phase = 'q'; S.att.msg = errCopy(e); S.att.msgKind = 'warn'; render();
  }
}
async function dispute() {
  const S = SESSION; if (!S || S.phase !== 'q') return;
  const q = S.questions[S.i], A = S.att, input = A.wrong[A.wrong.length - 1];
  if (!input || A.disputed) return;
  A.disputed = true;
  S.phase = 'checking'; S.checkMsg = 'Asking Claude whether your answer is equivalent…'; render();
  try {
    const r = await AI.json(equivPrompt(q, input), {modelTier:'default'});
    if (SESSION !== S) return;
    S.phase = 'q';
    if (r && r.equivalent === true) { A.tries = Math.max(0, A.tries - 1); A.wrong.pop(); finalizeProblem(S, q, true, {note:'Claude confirmed your answer is equivalent. ' + str(r.note)}); return; }
    A.msg = 'Claude checked: not equivalent. ' + esc(str(r && r.note)); A.msgKind = 'bad'; render();
  } catch (e) {
    if (SESSION !== S) return;
    S.phase = 'q'; A.msg = errCopy(e); A.msgKind = 'warn'; render();
  }
}
function finalizeProblem(S, q, solved, extra) {
  const A = S.att;
  const firstTry = solved && A.tries === 0 && !A.hint && !A.steps;
  let score = solved ? (A.tries === 0 ? (A.hint ? 0.8 : 1) : (A.hint ? 0.5 : 0.6)) : 0;
  if (extra.score != null && q.ptype === 'proof') score = S.exam || S.strict ? extra.score : solved ? Math.max(0.7, extra.score) * (A.hint ? 0.85 : 1) : extra.score * 0.5;
  if (q.fade && solved) score = Math.min(score, 0.8);
  if (A.steps && solved) score = Math.min(score, Math.max(0.3, 0.8 - 0.15 * A.steps));
  if (q.ptype === 'code' && solved && A.tries) score = A.tries === 1 ? 0.8 : 0.6;
  const doubt = q.vstate === 'doubt';
  S.fb = {verdict:solved ? 'correct' : 'incorrect', score, firstTry, gaveUp:!!extra.gaveUp, note:extra.note || '', hits:extra.hits || null, feedback:extra.feedback || '', gapLabel:null,
    hyper:S.conf >= 75 && S.firstOk === false, doubt};
  S.phase = 'feedback';
  if (doubt) {
    S.results[S.i] = {node:q.node, score, excluded:true};
  } else {
    const rec = recordProblem(S, q, score, solved, firstTry, A.wrong.slice(), extra.proofGap);
    S.fb.gapLabel = rec.gapLabel;
    S.results[S.i] = {node:q.node, score, gaps:[], gapId:q.gapId || null, problem:true, recorded:true, skill:q.skill, solved, firstTry, rec};
    const px = firstTry ? 4 + 3 * (q.difficulty || 2) : solved ? 2 + 2 * (q.difficulty || 2) : 1;
    S.results[S.i].xp = px; addXP(px);
  }
  render(); focusNext();
  if (!solved && !doubt && A.wrong.length && AI.ok() && q.ptype !== 'proof') diagnose(S, q, A.wrong.slice(), S.results[S.i].rec.gapId);
}
function recordProblem(S, q, score, solved, firstTry, wrong, proofGap) {
  const existed = !!Store.nodes[q.node];
  const snap = existed ? JSON.parse(JSON.stringify(Store.nodes[q.node])) : null;
  noteBefore(S, q.node);
  const n = ensureNode(q.node);
  if (q.kp) recordKP(q.node, q.kp, score, S.conf);
  if (!(q.node in S.before)) S.before[q.node] = mastery(n);
  const p = n.p = n.p || {a:0, c:0, f:0, ema:null};
  p.a++; if (solved) p.c++; if (firstTry) p.f++;
  bumpDay('a', 1); if (solved) { bumpDay('c', 1); n.solo = 1; }
  p.ema = p.ema == null ? score : p.ema * 0.75 + score * 0.25;
  const sk = n.skills = n.skills || {}; const s = sk[q.skill] = sk[q.skill] || {a:0, c:0}; s.a++; if (solved) s.c++;
  if (!solved) {
    n.miss = n.miss || [];
    n.miss.unshift({p:String(q.prompt).replace(/\s+/g, ' ').slice(0, 180), a:wrong.join(' | ').slice(0, 90) || '(gave up)', e:String(q.answerText).slice(0, 80), t:Date.now()});
    n.miss = n.miss.slice(0, 6);
  }
  n.mastery = Math.round(100 * p.ema * Math.min(1, p.a / 8));
  n.last = Date.now();
  Store.saveNode(q.node);
  const d = today(), pd = Store.profile.probByDay = Store.profile.probByDay || {};
  if (solved) { pd[d] = (pd[d] || 0) + 1; Store.saveProfile(); }
  let gapLabel = null, gapId = null, gapNew = false, rootLink = null;
  if (!solved && S.kind !== 'repair') {
    const detail = proofGap ? str(proofGap.detail) : wrong.length ? 'Missed: ' + String(q.prompt).replace(/\s+/g, ' ').slice(0, 160) : 'Couldn’t start: ' + String(q.prompt).replace(/\s+/g, ' ').slice(0, 160);
    const r = addGap(q.node, Object.assign({concept:q.skill, detail, boost:S.conf >= 75 && S.firstOk === false ? 1 : 0}, proofGap && proofGap.root_topic ? {root_topic:proofGap.root_topic, root_reason:proofGap.root_reason} : {}));
    if (r) { gapLabel = r.gap.concept; gapId = r.gap.id; gapNew = r.isNew; rootLink = r.link; if (!S.probGaps.includes(r.gap)) S.probGaps.push(r.gap); }
  }
  return {gapLabel, gapId, gapNew, rootLink, snap, existed, solved, day:d};
}
/* "This problem is broken": undo its effect on stats and gaps */
function reportProblem() {
  const S = SESSION; if (!S) return;
  const r = S.results[S.i]; if (!r || r.excluded) return;
  if (r.rec) {
    const k = r.node;
    if (r.rec.existed) { Store.nodes[k] = r.rec.snap; Store.saveNode(k); }
    else { delete Store.nodes[k]; Store.remove(Store.persistent ? Store.path('nodes', k) : ''); }
    if (r.rec.gapId) {
      const g = Store.gaps[r.rec.gapId];
      if (r.rec.gapNew) Store.deleteGap(r.rec.gapId);
      else if (g) { g.hits = Math.max(1, (g.hits || 1) - 1); Store.saveGap(g.id); }
      S.probGaps = S.probGaps.filter(x => x.id !== r.rec.gapId);
    }
    if (r.rec.rootLink) { unlinkRoot(r.rec.rootLink); r.rec.rootLink = null; }
    if (r.rec.solved) { const pd = Store.profile.probByDay || {}; pd[r.rec.day] = Math.max(0, (pd[r.rec.day] || 1) - 1); Store.saveProfile(); }
  }
  r.excluded = true; S.fb.reported = true;
  render(); toast('Removed from your stats');
}
async function diagnose(S, q, wrong, gapId) {
  const fb = S.fb; fb.diagBusy = true;
  if (SESSION === S && S.questions[S.i] === q) render();
  try {
    const r = await AI.json(diagPrompt(q, wrong), {modelTier:'quick'});
    fb.diag = str(r && r.error);
    const g = gapId && Store.gaps[gapId];
    if (g && r && r.detail) { g.detail = str(r.detail).slice(0, 320); Store.saveGap(gapId); }
    if (g && r && r.root_topic && nodeInfo(r.root_topic)) {
      const link = linkRoot(g, r.root_topic, r.root_reason); fb.root = {key:r.root_topic, why:str(r.root_reason)};
      const res = S.results.find(x => x && x.rec && x.rec.gapId === gapId && x.node === q.node);
      if (res && link) { if (res.excluded) unlinkRoot(link); else res.rec.rootLink = link; }
    }
  } catch (e) { /* diagnosis is optional */ }
  fb.diagBusy = false;
  if (SESSION === S && S.questions[S.i] === q && S.phase === 'feedback') { render(); focusNext(); }
}
async function checkPhoto(file) {
  const S = SESSION; if (!S || !file || !AI.ok()) return;
  const q = S.questions[S.i]; if (!q || q.type !== 'problem') return;
  S.photoText = ''; S.photoErr = ''; S.photoBusy = true;
  const paint = () => { const el = $('#photoFb'); if (el) { el.className = 'photo-fb'; el.innerHTML = photoFbInner(S); } };
  paint();
  try {
    const r = await AI.text(photoPrompt(q), {images:file, cache:false, onText: ({text}) => { if (SESSION === S && S.questions[S.i] === q) { S.photoText = text; paint(); } }});
    S.photoText = r.text;
  } catch (e) { S.photoErr = errCopy(e); }
  S.photoBusy = false;
  if (SESSION === S && S.questions[S.i] === q) { paint(); typeset($('#photoFb')); }
}
function focusNext() { const b = $('#nextBtn'); if (b) b.focus({preventScroll:true}); }
function nextQ() {
  const S = SESSION; if (!S || S.phase !== 'feedback') return;
  S.i++; resetQState(S);
  if (S.i >= S.questions.length) { if (S.streaming) S.phase = 'waiting'; else finishSession(); }
  else S.phase = 'q';
  render(); window.scrollTo(0, 0);
  const inp = $('#pans') || $('#lans'); if (inp && S.phase === 'q') inp.focus({preventScroll:true});
  const q = S.questions[S.i]; if (q && q.type === 'lang' && q.ltype === 'listen' && S.phase === 'q') speak(q.text, nodeInfo(q.node).lang.code);
}
function finishSession() {
  const S = SESSION; if (!S || S.finished) return;
  if (S.kind === 'vocab') { finishVocab(S); return; }
  S.finished = true;
  if (S.ctl) S.ctl.abort();
  S.streaming = false;
  const R = S.results.filter(r => r && !r.excluded);
  S.phase = 'summary';
  if (!R.length) { S.summary = null; return; }
  bumpDay('s', 1);
  const byNode = {};
  R.forEach(r => { (byNode[r.node] = byNode[r.node] || []).push(r); });
  const changes = [];
  Object.keys(byNode).forEach(k => {
    const rs = byNode[k], avg = mean(rs.map(r => r.score)), n = ensureNode(k);
    const allRec = rs.every(r => r.recorded);
    const before = k in S.before ? S.before[k] : mastery(n);
    const prevLast = k in S.lastB ? S.lastB[k] : n.last;
    if (!n.firstAt) n.firstAt = Date.now();
    if (avg >= 0.8 && !n.retained && Date.now() - n.firstAt >= RETENTION_DAYS * DAY && prevLast && Date.now() - prevLast >= 5 * DAY) { n.retained = Date.now(); S.retainedNow = (S.retainedNow || []).concat(k); }
    if (allRec) { if (S.kind !== 'placement' || !n.due) schedule(n, avg); }
    else if (S.kind === 'diagnostic') { n.mastery = Math.max(before, Math.round(avg * 70)); n.diagnosed = true; }
    else if (S.kind === 'repair') { n.mastery = Math.min(100, Math.round(before + avg * (100 - before) * 0.3)); }
    else { n.mastery = n.sessions ? Math.round(before * 0.4 + avg * 60) : Math.round(avg * 100); schedule(n, avg); }
    syncDue(n);
    n.sessions = (n.sessions || 0) + 1; n.last = Date.now();
    Store.saveNode(k); changes.push({k, before, after:mastery(n)});
  });
  if (S.kind === 'readiness' && S.target) { const t = ensureNode(S.target); const avgAll = mean(R.map(r => r.score)); S.readyPassed = avgAll >= 0.7; if (S.readyPassed) { t.ready = true; Store.saveNode(S.target); } }
  const newGaps = S.probGaps.slice(), resolved = [];
  if (S.kind === 'repair') {
    const byGap = {};
    R.forEach(r => { if (r.gapId) (byGap[r.gapId] = byGap[r.gapId] || []).push(r.score); });
    Object.keys(byGap).forEach(id => {
      const g = Store.gaps[id]; if (!g) return;
      if (mean(byGap[id]) >= 0.6) { g.status = 'resolved'; g.resolvedAt = Date.now(); resolved.push(g); }
      else g.hits = (g.hits || 1) + 1;
      Store.saveGap(id);
    });
  } else {
    R.filter(r => !r.recorded).forEach(r => (r.gaps || []).forEach(g => { const x = addGap(r.node, g); if (x && !newGaps.includes(x.gap)) newGaps.push(x.gap); }));
  }
  const nonRec = R.filter(r => !r.recorded);
  const xp = nonRec.reduce((a, r) => a + Math.round(r.score * 10), 0) + (R.length >= 5 ? 10 : 0) + resolved.length * 5;
  addXP(xp);
  const rec = R.filter(r => r.recorded);
  let problems = null;
  if (rec.length) {
    const skills = {};
    rec.forEach(r => { const key = r.skill || 'general'; const x = skills[key] = skills[key] || {a:0, c:0}; x.a++; if (r.solved) x.c++; });
    problems = {n:rec.length, solved:rec.filter(r => r.solved).length, first:rec.filter(r => r.firstTry).length, skills, lang:rec.some(r => r.lang)};
  }
  const recXP = rec.reduce((a, r) => a + (r.xp != null ? r.xp : r.firstTry ? 10 : r.solved ? 6 : 1), 0);
  S.summary = {changes, newGaps, resolved, xp:xp + recXP, avg:mean(R.map(r => r.score)), n:R.length, problems};
  if (S.kind === 'exam') recordExam(S);
  if (S.kind === 'test') recordPackTest(S);
}
function quitSession() {
  const S = SESSION; if (!S) return go('home');
  if (S.ctl) S.ctl.abort();
  if (S.phase === 'summary' || !S.results.filter(r => r && !r.excluded).length) { S.streaming = false; return endSession(); }
  finishSession(); render(); window.scrollTo(0, 0);
}
function endSession() {
  const S = SESSION; SESSION = null;
  const b = (S && S.back) || {name:'home'};
  if (b.name === 'tutor' && TUTOR) { go('tutor'); toBottom(); return; }
  go(b.name, b);
}
function askTutorProblem() {
  const S = SESSION; if (!S) return;
  const q = S.questions[S.i]; const info = nodeInfo(q.node); if (!info) return;
  const tried = S.att.wrong.length ? `My attempts: ${S.att.wrong.join(' ; ')}` : 'I couldn’t get started.';
  const text = `I got this ${q.skill} problem wrong.\n\nProblem: ${q.prompt}\n\n${tried}\nCorrect answer: ${q.answerText}\n\nWhere did I go wrong, and how do I avoid it next time?`;
  openTutor(info.sid, {send:text});
}

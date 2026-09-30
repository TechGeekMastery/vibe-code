/* ------------------------------------------------------------------ self-direction tasks: brain dump, write questions, plan, argue */
let taskClock = 0;
function startTaskClock() {
  clearInterval(taskClock);
  if (!TASK || TASK.kind !== 'dump' || TASK.stage !== 'write') return;
  taskClock = setInterval(() => {
    const el = $('#taskClock'); if (!el || !TASK || TASK.stage !== 'write') { clearInterval(taskClock); return; }
    const s = Math.floor((Date.now() - TASK.started) / 1000);
    el.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }, 1000);
}
function openTask(arg) {
  const [kind, target, flag] = String(arg).split('|');
  closeSheet();
  if (kind === 'plan') {
    const s = subj(target); if (!s) return;
    const prev = (Store.profile.plans || {})[s.id];
    TASK = {kind, sid:s.id, stage:'write', fields:{text:prev ? prev.text : ''}, started:Date.now()};
  } else {
    const info = nodeInfo(target); if (!info) return;
    TASK = {kind, key:info.key, sid:info.sid, after:flag === 'after', stage:kind === 'argue' ? 'pick' : (kind === 'recon' || kind === 'rival') ? 'load' : 'write', fields:{}, started:Date.now(), nq:3};
    if (kind === 'argue') loadArgueQuestions();
    if (kind === 'recon' || kind === 'rival') loadScenario(TASK);
  }
  go('task');
}
const TASK_TITLES = {dump:'Brain dump', qwrite:'Write your own questions', plan:'Plan your learning', argue:'Argue a position', recon:'Primary source', rival:'Rival explanations'};
VIEWS.task = () => {
  const T = TASK; if (!T) { setTimeout(() => go('home'), 0); return ''; }
  const info = T.key ? nodeInfo(T.key) : null, s = subj(T.sid);
  const back = info ? `data-act="topic" data-arg="${info.key}"` : `data-act="subjMethod" data-arg="${T.sid}"`;
  let body = '';
  const busy = T.stage === 'busy' ? `<div class="thinking"><span class="pulse"></span>${esc(T.busyMsg || 'Checking…')}</div>` : '';
  const err = T.err ? `<div class="notice bad">${esc(T.err)}</div>` : '';
  if (T.kind === 'dump') body = dumpView(T, info);
  else if (T.kind === 'qwrite') body = qwriteView(T, info);
  else if (T.kind === 'plan') body = planView(T, s);
  else if (T.kind === 'argue') body = argueView(T, info);
  else if (T.kind === 'recon' || T.kind === 'rival') body = scenarioView(T, info);
  return `<div style="--c:${s.color}">
    <header class="subbar"><button class="icon-btn" ${back} aria-label="Back">${ic('back', 20)}</button><div class="subbar-t crumbs">${esc(s.name)} / <b>${info ? esc(info.title) : 'Study plan'}</b></div></header>
    <header class="page-h" style="padding-top:4px"><div class="eyebrow">${TASK_TITLES[T.kind]}</div><h1>${esc(info ? info.title : s.name)}</h1></header>
    ${body}${busy}${err}
  </div>`;
};
function taskSubmitRow(label, act) {
  return `<div class="row" style="margin-top:12px"><button class="btn primary" data-act="${act}" ${AI.ok() && TASK.stage !== 'busy' ? '' : 'disabled'}>${label}</button></div>`;
}
function taskNeed(msg) { if (TASK) { TASK.err = msg; render(); } }
function listItems(arr, fn) { return arr && arr.length ? arr.map(fn).join('') : ''; }

/* ---- brain dump */
function dumpView(T, info) {
  if (T.stage === 'result' && T.result) {
    const r = T.result;
    return `<section class="card stack">
      <div class="row" style="justify-content:space-between"><div><div class="eyebrow">Coverage of the core ideas</div><div class="pct" style="font-size:3rem;font-weight:800">${Math.round(r.coverage * 100)}%</div></div>${T.gapsLogged ? `<span class="gap-chip">${T.gapsLogged} gaps logged</span>` : ''}</div>
      ${r.feedback ? `<div class="prose sm">${mdToHtml(r.feedback)}</div>` : ''}
      ${r.covered && r.covered.length ? `<div><div class="eyebrow" style="margin-bottom:6px">You recalled</div><div class="skills">${r.covered.map(c => `<span class="skill">${esc(c)}</span>`).join('')}</div></div>` : ''}
      ${r.errors && r.errors.length ? `<div class="stack"><div class="eyebrow">Wrong or distorted</div>${listItems(r.errors, e => `<div class="gap-item"><div class="t"><b>${esc(e.claim)}</b><p>${esc(e.correction)}</p></div></div>`)}</div>` : ''}
      ${r.missing && r.missing.length ? `<div class="stack"><div class="eyebrow">Missing</div>${listItems(r.missing, m => `<div class="gap-item"><div class="t"><b>${esc(m.concept)}${m.importance === 'core' ? ' <span class="tag tag-contested">core</span>' : ''}</b><p>${esc(m.detail)}</p></div></div>`)}</div>` : ''}
      ${r.root_topic && nodeInfo(r.root_topic) ? rootLine({key:r.root_topic, why:r.root_reason}) : ''}
      <div class="row">${info.lang ? '' : `<button class="btn primary" data-act="lesson" data-arg="${info.key}">${Store.nodes[info.key] && Store.nodes[info.key].hasLesson ? 'Reread the lesson' : 'Read the lesson'}</button>`}<button class="btn" data-act="practice" data-arg="${info.key}" ${AI.ok() ? '' : 'disabled'}>Practice</button><button class="btn" data-act="source" data-arg="${info.key}">Study a source</button><button class="btn ghost" data-act="topic" data-arg="${info.key}">Back to topic</button></div>
    </section>`;
  }
  return `<p class="muted" style="max-width:62ch">${T.after ? 'Close the lesson in your head. ' : ''}Without looking anything up, write everything you know about this topic: definitions, how it works and why, examples, numbers, and how it connects to other ideas. Messy is fine. Aim for about five minutes; retrieving is what strengthens memory, and the gaps you hit are exactly what Claude will map.</p>
    <div class="row" style="justify-content:space-between;margin-top:12px"><span class="eyebrow">Time</span><span id="taskClock" class="num" style="font-family:var(--f-mono)">0:00</span></div>
    <textarea class="answer tall" data-inp="task:text" aria-label="Your brain dump" placeholder="Start anywhere…" ${T.stage === 'busy' ? 'readonly' : ''}>${esc(T.fields.text || '')}</textarea>
    ${taskSubmitRow('Map what I know', 'dumpSubmit')}
    <p class="hint">At least a few sentences. Claude compares it against the core of the topic, lists what you recalled, what’s missing, and anything wrong, and logs the gaps.</p>`;
}
function dumpPrompt(info, text, lessonMd) {
  return `You are evaluating a learner's free-recall "brain dump" on ${topicLine(info)} in a study app. Level: ${depthLine()}
They wrote, from memory, everything they know:
"""
${String(text).slice(0, 12000)}
"""
${lessonMd ? `They just studied this lesson; judge their recall of it and of the topic's core:\n"""\n${String(lessonMd).slice(0, 12000)}\n"""\n` : ''}Map what they wrote against the core knowledge of this topic at this level. Be specific and strict: vague gestures don't count as recalled.
${rootSnippet(info.key)}
Reply with only JSON:
{"coverage":<0.0 to 1.0: fraction of the core ideas recalled correctly>,"covered":["short labels of ideas they got right"],"missing":[{"concept":"max 6 words","detail":"one sentence: what they should know","importance":"core" or "secondary"}],"errors":[{"claim":"what they wrote that is wrong","correction":"the correct version, one sentence","concept":"max 6 words"}],"feedback":"2-4 sentences: the most important thing to fix and a concrete next step","root_topic":null,"root_reason":null}
At most 6 missing and 4 errors. ${NOTATION}`;
}
async function dumpSubmit() {
  const T = TASK; if (!T || T.stage === 'busy') return;
  const info = nodeInfo(T.key), text = String(T.fields.text || '').trim();
  if (text.length < 40) return taskNeed('Write at least a few sentences first.');
  T.stage = 'busy'; T.busyMsg = 'Mapping what you know against the topic…'; T.err = ''; render();
  try {
    const lesson = T.after ? await Store.getLesson(T.key) : null;
    const r = await AI.json(dumpPrompt(info, text, lesson && lesson.md), {modelTier:'default', cache:false});
    if (TASK !== T) return;
    r.coverage = clamp01(r && r.coverage);
    T.result = r; T.stage = 'result';
    let logged = 0;
    (Array.isArray(r.errors) ? r.errors : []).slice(0, 4).forEach((e, i) => { if (e && (e.concept || e.claim)) { if (addGap(T.key, Object.assign({concept:str(e.concept) || str(e.claim).slice(0, 40), detail:`Believed: “${str(e.claim).slice(0, 120)}”. ${str(e.correction)}`, boost:1}, i === 0 && r.root_topic ? {root_topic:r.root_topic, root_reason:r.root_reason} : {}))) logged++; } });
    (Array.isArray(r.missing) ? r.missing : []).filter(m => m && m.concept && m.importance !== 'secondary').slice(0, 4).forEach(m => { if (addGap(T.key, {concept:str(m.concept), detail:str(m.detail)})) logged++; });
    T.gapsLogged = logged;
    const n = ensureNode(T.key);
    n.dump = r.coverage; n.last = Date.now();
    if (!n.sessions && !pst(n).a) n.mastery = Math.max(n.mastery || 0, Math.round(r.coverage * 60));
    Store.saveNode(T.key);
    addMeta(T.sid, 'dump', r.coverage);
    addXP(8 + Math.round(r.coverage * 12));
  } catch (e) { if (TASK !== T) return; T.stage = 'write'; T.err = errCopy(e); }
  render();
}

/* ---- write your own questions */
function qwriteView(T, info) {
  const prob = info.program;
  if (T.stage === 'result' && T.result) {
    const qs = T.result.questions || [];
    return `<section class="stack">
      ${qs.map((q, i) => `<div class="card stack">
        <div class="row" style="justify-content:space-between"><b>Question ${i + 1}</b><span class="skill"><b>${Math.round(clamp01(q.quality) * 100)}%</b> · tests ${esc(q.tests || '?')}</span></div>
        <p class="muted">${esc(T.fields['q' + i] || '')}</p>
        <p><b>Critique:</b> ${esc(q.critique || '')}</p>
        <p><b>Your answer:</b> ${q.answer_correct ? '<span class="tag tag-established">correct</span>' : '<span class="tag tag-speculative">needs work</span>'} ${esc(q.answer_feedback || '')}</p>
        ${q.improved ? `<details><summary>Sharper version</summary><p style="margin-top:6px">${esc(q.improved)}</p><p class="muted small" style="margin-top:4px">${esc(q.improved_answer || '')}</p></details>` : ''}
      </div>`).join('')}
      ${T.result.overall ? `<div class="notice">${esc(T.result.overall)}</div>` : ''}
      <p class="muted small">${T.saved} of these were saved to this topic. They’ll come back in your reviews, so you’ll be tested on the questions you wrote.</p>
      <div class="row"><button class="btn primary" data-act="task" data-arg="qwrite|${info.key}">Write another set</button><button class="btn ghost" data-act="topic" data-arg="${info.key}">Back to topic</button></div>
    </section>`;
  }
  const pairs = [...Array(T.nq)].map((_, i) => `<div class="card stack qpair">
      <label class="eyebrow" for="tq${i}">${prob ? 'Problem' : 'Question'} ${i + 1}</label>
      <textarea id="tq${i}" class="answer short" data-inp="task:q${i}" placeholder="${prob ? 'Write a problem that needs real technique…' : 'Ask something that proves understanding: why, how, what would happen if…'}">${esc(T.fields['q' + i] || '')}</textarea>
      <label class="eyebrow" for="ta${i}">Your answer</label>
      <textarea id="ta${i}" class="answer short" data-inp="task:a${i}" placeholder="Answer it yourself">${esc(T.fields['a' + i] || '')}</textarea>
    </div>`).join('');
  return `<p class="muted" style="max-width:62ch">Writing good questions is the core skill of teaching yourself: it forces you to decide what actually matters. Write questions that would prove someone understands this topic, and answer each one. Strong questions test mechanisms, causes, predictions, applications, or distinctions; weak ones ask for definitions or trivia.</p>
    <div class="stack" style="margin-top:12px">${pairs}</div>
    <div class="row" style="margin-top:10px">${T.nq < 5 ? '<button class="btn ghost sm" data-act="qwriteMore">Add another</button>' : ''}</div>
    ${taskSubmitRow(`Grade my ${prob ? 'problems' : 'questions'}`, 'qwriteSubmit')}`;
}
async function qwriteSubmit() {
  const T = TASK; if (!T || T.stage === 'busy') return;
  const info = nodeInfo(T.key);
  const pairs = [...Array(T.nq)].map((_, i) => ({q:str(T.fields['q' + i]).trim(), a:str(T.fields['a' + i]).trim(), i})).filter(p => p.q && p.a);
  if (!pairs.length) return taskNeed('Write at least one question with your answer.');
  pairs.forEach((p, j) => { T.fields['q' + j] = p.q; T.fields['a' + j] = p.a; });
  T.stage = 'busy'; T.busyMsg = 'Grading your questions…'; T.err = ''; render();
  try {
    const r = await AI.json(`A learner is practicing writing their own test ${info.program ? 'problems' : 'questions'} on ${topicLine(info)} in a study app. Level: ${depthLine()}
Their ${info.program ? 'problems' : 'questions'} and their own answers:
${pairs.map((p, j) => `${j + 1}. Q: ${p.q}\n   A: ${p.a}`).join('\n')}

Evaluate each as a test of understanding. Good ones probe mechanisms, causes, predictions, applications, or distinctions${info.program ? ', or require a real technique rather than plugging into a formula' : ''}; weak ones ask for definitions, trivia, or yes/no, or are ambiguous. Also check whether the learner's own answer is correct.
Reply with only JSON:
{"questions":[{"quality":<0.0 to 1.0>,"tests":"mechanism|application|prediction|distinction|technique|definition|trivia","critique":"one or two sentences","answer_correct":true or false,"answer_feedback":"one sentence","improved":"a sharper version of the question","improved_answer":"a model answer to the improved version, 1-3 sentences"}],"overall":"2-3 sentences on how to write better questions next time"}
One entry per question, in order. ${NOTATION}`, {modelTier:'default', cache:false});
    if (TASK !== T) return;
    const qs = Array.isArray(r && r.questions) ? r.questions.slice(0, pairs.length) : [];
    if (!qs.length) throw {code:'invalid_json'};
    T.result = {questions:qs, overall:str(r.overall)}; T.stage = 'result';
    const n = ensureNode(T.key); n.myQs = n.myQs || [];
    let saved = 0;
    qs.forEach((q, j) => {
      const p = pairs[j]; if (!p) return;
      const good = clamp01(q.quality) >= 0.7 && q.answer_correct;
      const item = good ? {q:p.q, a:p.a} : (q.improved && q.improved_answer ? {q:str(q.improved), a:str(q.improved_answer), refined:true} : null);
      if (item) { n.myQs.push(Object.assign(item, {t:Date.now()})); saved++; }
      if (!q.answer_correct) addGap(T.key, {concept:str(q.tests === 'technique' ? 'Own problem solution' : 'Own answer') + ' ' + (j + 1), detail:str(q.answer_feedback) || 'Your answer to your own question was wrong.'});
    });
    n.myQs = n.myQs.slice(-20); n.last = Date.now(); Store.saveNode(T.key);
    T.saved = saved;
    addMeta(T.sid, 'qwrite', mean(qs.map(q => clamp01(q.quality))));
    addXP(5 * qs.length);
  } catch (e) { if (TASK !== T) return; T.stage = 'write'; T.err = errCopy(e); }
  render();
}

/* ---- plan your learning */
function planView(T, s) {
  if (T.stage === 'result' && T.result) {
    const r = T.result;
    return `<section class="card stack">
      <div><div class="eyebrow">Plan score</div><div style="font-size:3rem;font-weight:800">${Math.round(clamp01(r.score) * 100)}%</div></div>
      ${r.strengths && r.strengths.length ? `<div><div class="eyebrow" style="margin-bottom:6px">Strengths</div><ul>${r.strengths.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${r.problems && r.problems.length ? `<div class="stack"><div class="eyebrow">Problems and fixes</div>${r.problems.map(p => `<div class="gap-item"><div class="t"><b>${esc(p.issue)}</b><p>${esc(p.fix)}</p></div></div>`).join('')}</div>` : ''}
      ${r.missing_prereqs && r.missing_prereqs.length ? `<div class="notice warn"><b>Missing prerequisites:</b> ${r.missing_prereqs.map(esc).join('; ')}</div>` : ''}
      ${r.revised_plan ? `<details open><summary><b>Revised plan</b></summary><div class="prose sm">${mdToHtml(r.revised_plan)}</div></details>` : ''}
      <div class="row"><button class="btn primary" data-act="subjMethod" data-arg="${s.id}">Back to ${esc(s.name)}</button><button class="btn ghost" data-act="task" data-arg="plan|${s.id}">Revise it again</button></div>
    </section>`;
  }
  return `<p class="muted" style="max-width:62ch">Design how you’ll learn ${esc(s.name)} from here. Claude critiques it the way a good teacher would: sequence and prerequisites, how you’ll test yourself, spacing, and whether you’ll know when you’ve mastered something. Cover:</p>
    <ul class="muted small"><li>Which topics, in what order, and why that order</li><li>What you’ll learn each from (lessons here, books, courses, articles)</li><li>How you’ll test yourself, and how often you’ll review</li><li>When and how long you’ll study each week</li><li>How you’ll know you’ve mastered a topic</li></ul>
    <textarea class="answer tall" data-inp="task:text" aria-label="Your study plan" placeholder="Week 1: …">${esc(T.fields.text || '')}</textarea>
    ${taskSubmitRow('Critique my plan', 'planSubmit')}`;
}
async function planSubmit() {
  const T = TASK; if (!T || T.stage === 'busy') return;
  const s = subj(T.sid), text = str(T.fields.text).trim(); if (text.length < 60) return taskNeed('Write a bit more of your plan first.');
  T.stage = 'busy'; T.busyMsg = 'Critiquing your plan…'; T.err = ''; render();
  const st = subjectStats(s);
  const progress = s.units.map((u, ui) => `${u.t}: ${u.n.map((t, ni) => { const n = Store.nodes[`${s.id}-${ui}-${ni}`]; return `${t}${n ? ` (${mastery(n)}%)` : ''}`; }).join('; ')}`).join('\n');
  try {
    const r = await AI.json(`A learner wrote their own study plan for ${s.name}. Critique it as an expert teacher who knows the learning-science evidence (retrieval practice, spacing, interleaving, prerequisites, deliberate practice, feedback).
Their current progress (topic, mastery): overall ${st.avg}%.
${progress}
Open gaps: ${openGaps().filter(g => g.node.startsWith(s.id + '-')).slice(0, 10).map(g => g.concept).join('; ') || 'none'}

THEIR PLAN:
"""
${text.slice(0, 8000)}
"""
Reply with only JSON:
{"score":<0.0 to 1.0>,"strengths":["..."],"problems":[{"issue":"...","fix":"..."}],"missing_prereqs":["topics they need first but skipped"],"revised_plan":"their plan rewritten and improved, in concise Markdown: sequence, methods, self-testing, review schedule, weekly time, mastery criteria"}
Keep their goals and constraints; improve the method. ${NOTATION}`, {modelTier:'default', cache:false});
    if (TASK !== T) return;
    r.score = clamp01(r && r.score);
    T.result = r; T.stage = 'result';
    Store.profile.plans[s.id] = {text, revised:str(r.revised_plan).slice(0, 12000), score:r.score, at:Date.now()};
    addMeta(s.id, 'plan', r.score);
    addXP(15);
  } catch (e) { if (TASK !== T) return; T.stage = 'write'; T.err = errCopy(e); }
  render();
}

/* ---- argue a position */
async function loadArgueQuestions() {
  const T = TASK; const info = nodeInfo(T.key);
  if (!AI.ok()) return;
  T.qBusy = true;
  try {
    const r = await AI.json(`Propose 3 genuinely contested questions about ${topicLine(info)}: questions on which informed experts disagree, each answerable with an argument in a few paragraphs. Mix empirical, interpretive, and normative questions where the topic allows.
Reply with only JSON: {"questions":["...","...","..."]}`, {modelTier:'quick'});
    if (TASK !== T) return;
    T.options = (Array.isArray(r && r.questions) ? r.questions : []).map(str).filter(Boolean).slice(0, 3);
  } catch (e) { if (TASK === T) T.options = []; }
  T.qBusy = false;
  if (TASK === T && VIEW.name === 'task') render();
}
function argueView(T, info) {
  if (T.stage === 'pick') {
    return `<p class="muted" style="max-width:62ch">Pick a contested question, or write your own. You’ll argue a position; Claude grades the argument’s structure (not whether it agrees), names your weakest premise, and builds the strongest case against you. Then you rebut.</p>
      ${T.qBusy ? '<div class="thinking"><span class="pulse"></span>Finding contested questions…</div>' : ''}
      <div class="stack" style="margin-top:12px">${(T.options || []).map((q, i) => `<button class="opt" data-act="arguePick" data-arg="${i}"><span class="opt-k">${i + 1}</span><span>${esc(q)}</span></button>`).join('')}</div>
      <label class="eyebrow" for="argOwn" style="display:block;margin-top:14px">Or your own question</label>
      <input id="argOwn" class="field" data-inp="task:own" value="${esc(T.fields.own || '')}" placeholder="e.g. Did sanctions weaken Russia’s war effort?">
      <div class="row" style="margin-top:10px"><button class="btn" data-act="arguePick" data-arg="own">Use my question</button></div>`;
  }
  const q = `<div class="card"><div class="eyebrow">Question</div><p style="margin-top:4px;font-size:1.1rem"><b>${esc(T.question)}</b></p></div>`;
  if (T.stage === 'write' || (T.stage === 'busy' && !T.result)) {
    return `${q}<p class="muted" style="margin-top:12px">State your thesis in one sentence, then argue it: evidence, the reasoning that connects evidence to thesis, and the best objection you can think of with your reply.</p>
      <textarea class="answer tall" data-inp="task:arg" aria-label="Your argument" placeholder="Thesis: …" ${T.stage === 'busy' ? 'readonly' : ''}>${esc(T.fields.arg || '')}</textarea>
      ${taskSubmitRow('Grade my argument', 'argueSubmit')}`;
  }
  const r = T.result, sc = r.scores || {};
  const scoreRow = (k, l) => `<div class="mrow" style="--c:var(--accent)"><span class="n">${l}</span><span class="bar thin"><i style="width:${(Number(sc[k]) || 0) * 20}%"></i></span><span class="v">${Number(sc[k]) || 0}/5</span></div>`;
  let h = `${q}<section class="card stack" style="margin-top:12px">
    <div class="eyebrow">Argument structure</div>
    ${scoreRow('thesis', 'Clear thesis')}${scoreRow('evidence', 'Evidence')}${scoreRow('reasoning', 'Reasoning')}${scoreRow('counterarguments', 'Handles objections')}
    ${r.weakest_premise ? `<p><b>Weakest premise:</b> ${esc(r.weakest_premise)}</p>` : ''}
    ${r.fallacies && r.fallacies.length ? `<p><b>Reasoning errors:</b> ${r.fallacies.map(f => `${esc(f.name)} (${esc(f.where)})`).join('; ')}</p>` : ''}
    ${r.feedback ? `<div class="prose sm">${mdToHtml(r.feedback)}</div>` : ''}
    ${r.steelman ? `<div class="fb warn"><div class="fb-h">The strongest case against you</div><div class="prose sm">${mdToHtml(r.steelman)}</div>${r.question ? `<p><b>Answer this in your rebuttal:</b> ${esc(r.question)}</p>` : ''}</div>` : ''}
  </section>`;
  if (!T.result2) {
    h += `<label class="eyebrow" for="argReb" style="display:block;margin-top:14px">Your rebuttal</label>
      <textarea id="argReb" class="answer" data-inp="task:reb" placeholder="Where the objection fails, or what you concede and why your thesis survives…" ${T.stage === 'busy' ? 'readonly' : ''}>${esc(T.fields.reb || '')}</textarea>
      ${taskSubmitRow('Judge my rebuttal', 'argueRebut')}`;
  } else {
    const r2 = T.result2;
    h += `<section class="card stack" style="margin-top:12px"><div class="eyebrow">Rebuttal</div>
      <div style="font-size:2rem;font-weight:800">${Math.round(clamp01(r2.addressed) * 100)}% addressed</div>
      ${r2.feedback ? `<div class="prose sm">${mdToHtml(r2.feedback)}</div>` : ''}
      ${r2.verdict ? `<p><b>Where the debate stands:</b> ${esc(r2.verdict)}</p>` : ''}
      <div class="row"><button class="btn primary" data-act="task" data-arg="argue|${T.key}">Argue another</button><button class="btn ghost" data-act="topic" data-arg="${T.key}">Back to topic</button></div></section>`;
  }
  return h;
}
async function argueSubmit() {
  const T = TASK; if (!T || T.stage === 'busy') return;
  const info = nodeInfo(T.key), arg = str(T.fields.arg).trim(); if (arg.length < 120) return taskNeed('Develop the argument a bit more: a thesis plus at least a paragraph of support.');
  T.stage = 'busy'; T.busyMsg = 'Reading your argument…'; T.err = ''; render();
  try {
    const r = await AI.json(`Grade a learner's argument in a study app. Topic: ${topicLine(info)}. Level: ${depthLine()}
Question: ${T.question}
Their argument:
"""
${arg.slice(0, 8000)}
"""
Grade the STRUCTURE and QUALITY of the argument, not whether you agree with its conclusion. Then build the strongest opposing case, using the best evidence and reasoning that serious people on the other side actually use.
Reply with only JSON:
{"scores":{"thesis":<1-5>,"evidence":<1-5>,"reasoning":<1-5>,"counterarguments":<1-5>},"weakest_premise":"the premise their case most depends on that is least supported","fallacies":[{"name":"...","where":"..."}],"feedback":"2-4 sentences: what would most improve this argument","steelman":"the strongest opposing argument, 120-220 words","question":"one pointed question their rebuttal must answer"}
${NOTATION}`, {modelTier:'default', cache:false});
    if (TASK !== T) return;
    T.result = r; T.stage = 'rebut';
    const sc = r.scores || {}; const avg = mean(['thesis', 'evidence', 'reasoning', 'counterarguments'].map(k => (Number(sc[k]) || 0) / 5));
    T.argScore = avg;
    if (r.weakest_premise) addGap(T.key, {concept:'Argument: weakest premise', detail:str(r.weakest_premise)});
    addXP(10);
  } catch (e) { if (TASK !== T) return; T.stage = 'write'; T.err = errCopy(e); }
  render();
}
async function argueRebut() {
  const T = TASK; if (!T || T.stage === 'busy') return;
  const reb = str(T.fields.reb).trim(); if (reb.length < 60) return taskNeed('Write a few sentences of rebuttal first.');
  T.stage = 'busy'; T.busyMsg = 'Judging your rebuttal…'; T.err = ''; render();
  try {
    const r = await AI.json(`Judge a learner's rebuttal in a structured debate exercise.
Question: ${T.question}
Their original argument:
"""${str(T.fields.arg).slice(0, 5000)}"""
The strongest opposing case they had to answer:
"""${str(T.result.steelman)}"""
The pointed question: ${str(T.result.question)}
Their rebuttal:
"""${reb.slice(0, 5000)}"""
Reply with only JSON: {"addressed":<0.0 to 1.0: how well the rebuttal answers the opposing case and the question>,"feedback":"2-4 sentences","verdict":"one or two sentences on where the evidence actually leaves this question"}`, {modelTier:'default', cache:false});
    if (TASK !== T) return;
    r.addressed = clamp01(r && r.addressed);
    T.result2 = r; T.stage = 'done';
    addMeta(T.sid, 'argue', mean([T.argScore || 0, r.addressed]));
    addXP(10);
  } catch (e) { if (TASK !== T) return; T.stage = 'rebut'; T.err = errCopy(e); }
  render();
}
/* ---- primary-source reconstruction, and rival explanations / prediction */
const SCIENCE = ['bio', 'viro', 'neuro', 'astro', 'phy', 'chm', 'econ'];
const isPredict = T => T.kind === 'rival' && SCIENCE.includes(T.sid);
async function loadScenario(T) {
  const info = nodeInfo(T.key); if (!AI.ok()) { T.stage = 'write'; T.err = 'Needs Claude.'; return; }
  const prompt = T.kind === 'recon'
    ? `Pick a primary source central to ${topicLine(info)}: a text by a participant, original thinker, or contemporary, not a textbook. If a suitable one was published before 1929 (public domain), quote a 120 to 250 word excerpt verbatim, choosing the passage that carries the core argument. If the key sources are modern and copyrighted, write a faithful close paraphrase of the core argument in 120 to 200 words instead, and set "paraphrase": true.
Reply with only JSON: {"title":"work title","author":"...","date":"year or period","paraphrase":false,"text":"the excerpt","context":"one or two sentences of context the reader needs"}`
    : isPredict(T)
    ? `Write a prediction exercise for ${topicLine(info)}: a concrete, unfamiliar scenario (an experiment, a system, a policy change, an observation) whose outcome follows from the topic's mechanisms but is not obvious. Don't reveal the outcome.
Reply with only JSON: {"scenario":"the setup, 80 to 160 words","ask":"the exact question: what will happen, and why","answer":"what actually happens or what the best-supported model predicts","mechanism":"the causal chain, 3 to 6 sentences","common_wrong":"the most common wrong prediction and why people make it"}`
    : `Write a rival-explanations exercise for ${topicLine(info)}: a real question (why did X happen, what explains Y) on which serious scholars offer 2 to 4 competing explanations. Give each explanation in its strongest form, with its best evidence, without saying which is right.
Reply with only JSON: {"question":"...","explanations":[{"name":"short label","claim":"the explanation, 2-3 sentences","evidence":"its best evidence, 1-2 sentences"}]}`;
  try {
    const r = await AI.json(prompt, {modelTier:'default', cache:false});
    if (TASK !== T) return;
    T.src = r; T.stage = 'write';
  } catch (e) { if (TASK !== T) return; T.err = errCopy(e); T.stage = 'write'; }
  if (VIEW.name === 'task' && TASK === T) render();
}
function scenarioView(T, info) {
  if (T.stage === 'load') return `<div class="thinking"><span class="pulse"></span>${T.kind === 'recon' ? 'Finding the primary source…' : 'Setting up the question…'}</div>`;
  const r = T.src || {};
  let top = '';
  if (T.kind === 'recon') top = `<section class="card stack"><div class="eyebrow">${r.paraphrase ? 'Close paraphrase of' : 'Primary source'} · ${esc(r.author || '')}${r.date ? ', ' + esc(String(r.date)) : ''}</div><b>${esc(r.title || '')}</b>${r.context ? `<p class="muted small">${esc(r.context)}</p>` : ''}<blockquote class="prose sm" style="margin:0">${mdToHtml(r.text || '')}</blockquote></section>`;
  else if (isPredict(T)) top = `<section class="card stack"><div class="eyebrow">Scenario</div><div class="prose sm">${mdToHtml(r.scenario || '')}</div><p><b>${esc(r.ask || '')}</b></p></section>`;
  else top = `<section class="card stack"><div class="eyebrow">Question</div><p style="font-size:1.08rem"><b>${esc(r.question || '')}</b></p>${(r.explanations || []).map((x, i) => `<div class="gap-item"><div class="t"><b>${String.fromCharCode(65 + i)}. ${esc(x.name)}</b><p>${esc(x.claim)}</p><p class="root">Evidence: ${esc(x.evidence)}</p></div></div>`).join('')}</section>`;
  if (T.stage === 'result' && T.result) {
    const g = T.result;
    return `${top}<section class="card stack" style="margin-top:12px"><div class="row" style="justify-content:space-between"><div class="eyebrow">Score</div><b class="mono-t" style="font-size:1.6rem">${Math.round(clamp01(g.score) * 100)}%</b></div>
      ${g.feedback ? `<div class="prose sm">${mdToHtml(g.feedback)}</div>` : ''}
      ${g.model ? `<details open><summary><b>${T.kind === 'recon' ? 'Model reconstruction' : isPredict(T) ? 'What happens, and why' : 'Where the evidence stands'}</b></summary><div class="prose sm">${mdToHtml(g.model)}</div></details>` : ''}
      ${g.discriminator ? `<p><b>Evidence that would settle it:</b> ${esc(g.discriminator)}</p>` : ''}
      <div class="row"><button class="btn primary" data-act="task" data-arg="${T.kind}|${T.key}">Another</button><button class="btn ghost" data-act="topic" data-arg="${T.key}">Back to topic</button></div></section>`;
  }
  const ask = T.kind === 'recon' ? 'Reconstruct the argument as numbered premises and a conclusion (P1, P2, … C). Then name the weakest premise and say why.'
    : isPredict(T) ? 'Predict the outcome and give the causal chain that gets you there. Commit before you look anything up: a wrong prediction you can explain teaches more than a vague right one.'
    : 'Rank the explanations by how well they fit the evidence, and justify the ranking. Then say what evidence would discriminate between the top two.';
  return `${top}<p class="muted" style="margin-top:12px">${ask}</p>
    <textarea class="answer tall" data-inp="task:text" aria-label="Your answer" placeholder="${T.kind === 'recon' ? 'P1: …' : isPredict(T) ? 'I predict…' : 'Ranking: …'}" ${T.stage === 'busy' ? 'readonly' : ''}>${esc(T.fields.text || '')}</textarea>
    ${taskSubmitRow('Grade it', 'scenarioSubmit')}`;
}
async function scenarioSubmit() {
  const T = TASK; if (!T || T.stage === 'busy' || !T.src) return;
  const info = nodeInfo(T.key), text = str(T.fields.text).trim();
  if (text.length < 80) return taskNeed('Write a bit more first.');
  T.stage = 'busy'; T.busyMsg = 'Grading…'; T.err = ''; render();
  const r = T.src;
  const prompt = T.kind === 'recon'
    ? `Grade a learner's reconstruction of the argument in this ${r.paraphrase ? 'paraphrased ' : ''}primary source (${r.title}, ${r.author}), for ${topicLine(info)}.\nSOURCE:\n"""${str(r.text)}"""\nLEARNER:\n"""${text.slice(0, 6000)}"""\nCheck: are the premises actually in or implied by the text, is anything essential missing, does the conclusion follow, and is their weakest-premise choice defensible?\nReply with only JSON: {"score":<0-1>,"feedback":"2-4 sentences","model":"a model reconstruction: numbered premises, conclusion, and the weakest premise with the best objection to it","gap":{"concept":"max 6 words","detail":"one sentence"} or null}`
    : isPredict(T)
    ? `Grade a learner's prediction for ${topicLine(info)}.\nSCENARIO: ${str(r.scenario)}\nQUESTION: ${str(r.ask)}\nCORRECT OUTCOME: ${str(r.answer)}\nMECHANISM: ${str(r.mechanism)}\nCOMMON WRONG PREDICTION: ${str(r.common_wrong)}\nLEARNER:\n"""${text.slice(0, 6000)}"""\nScore the outcome and, more heavily, the causal reasoning.\nReply with only JSON: {"score":<0-1>,"feedback":"2-4 sentences naming exactly where their model diverged","model":"the outcome and mechanism, 3-6 sentences","gap":{"concept":"max 6 words","detail":"one sentence"} or null}`
    : `Grade a learner's evaluation of rival explanations for ${topicLine(info)}.\nQUESTION: ${str(r.question)}\nEXPLANATIONS:\n${(r.explanations || []).map((x, i) => `${String.fromCharCode(65 + i)}. ${x.name}: ${x.claim} Evidence: ${x.evidence}`).join('\n')}\nLEARNER:\n"""${text.slice(0, 6000)}"""\nGrade the reasoning (fit to evidence, handling of confounds, whether they weigh evidence rather than assert), not agreement with any camp.\nReply with only JSON: {"score":<0-1>,"feedback":"2-4 sentences","model":"where the scholarly evidence actually stands, each claim tagged [Established], [Inferred], or [Contested]","discriminator":"the evidence that would best discriminate between the leading explanations","gap":{"concept":"max 6 words","detail":"one sentence"} or null}`;
  try {
    const g = await AI.json(prompt, {modelTier:'default', cache:false});
    if (TASK !== T) return;
    g.score = clamp01(g && g.score);
    T.result = g; T.stage = 'result';
    if (g.gap && g.gap.concept && g.score < 0.7) addGap(T.key, {concept:str(g.gap.concept), detail:str(g.gap.detail)});
    const n = ensureNode(T.key); n.last = Date.now(); if (!n.firstAt) n.firstAt = Date.now(); Store.saveNode(T.key);
    addMeta(T.sid, 'argue', g.score); addXP(8 + Math.round(g.score * 10));
  } catch (e) { if (TASK !== T) return; T.stage = 'write'; T.err = errCopy(e); }
  render();
}
Object.assign(ACT, {
  scenarioSubmit: () => scenarioSubmit(),
  task: a => openTask(a),
  dumpSubmit: () => dumpSubmit(),
  qwriteMore: () => { if (TASK && TASK.nq < 5) { TASK.nq++; render(); } },
  qwriteSubmit: () => qwriteSubmit(),
  planSubmit: () => planSubmit(),
  arguePick: a => { const T = TASK; if (!T) return; T.question = a === 'own' ? str(T.fields.own).trim() : (T.options || [])[+a]; if (!T.question) return taskNeed('Type your question first.'); T.err = ''; T.stage = 'write'; render(); },
  argueSubmit: () => argueSubmit(),
  argueRebut: () => argueRebut()
});

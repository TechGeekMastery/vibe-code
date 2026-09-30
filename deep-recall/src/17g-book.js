/* ------------------------------------------------------------------ textbook: pre-written, fact-checked chapters (content packs), read section by section with questions answered in place */
/* A pack is one course's chapters (packs/<sid>-<ui>.json, published beside the page). PACK_INDEX, compiled in by build.py, says which topics have one.
   Where a chapter exists it replaces generated lessons, outlines, and toolkits, and supplies practice, the chapter test, course-exam items, and flashcards. */
const PACKS = {};
const hasPack = key => !!(key && typeof PACK_INDEX !== 'undefined' && PACK_INDEX[key]);
function packNow(key) { const x = hasPack(key) && PACKS[PACK_INDEX[key].c]; return x && x.data ? x.data[key] || null : null; }
function loadPack(key) {
  if (!hasPack(key)) return Promise.resolve(null);
  const ix = PACK_INDEX[key], x = PACKS[ix.c] = PACKS[ix.c] || {};
  if (x.data) { const P = x.data[key] || null; if (P && !(Store.outlines[key] && Store.outlines[key].pack)) packAttach(key, P); return Promise.resolve(P); }
  if (!x.p) {
    x.p = fetch('packs/' + ix.c + '.json?v=' + ix.h).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(d => { x.data = d; Object.keys(d).forEach(k => packAttach(k, d[k])); return d; })
      .catch(e => { console.warn('Chapter pack unavailable', ix.c, e); delete x.p; return null; });
  }
  return x.p.then(d => d ? d[key] || null : null);
}
function packOutline(P) {
  return {key:P.key, kps:P.kps.map(k => ({id:k.id, t:k.t, d:k.d, type:k.type})), pre:(P.pre || []).filter(k => nodeInfo(k) && k !== P.key).slice(0, 4), scope:P.scope,
    ref:'the textbook chapter, checked against ' + P.sources.slice(0, 3).map(s => s.title).join('; '), audited:true, pack:true, at:0};
}
function packAttach(key, P) {
  Store.outlines[key] = packOutline(P);
  Store.kits[key] = {rules:(P.kit && P.kit.rules) || [], stuck:(P.kit && P.kit.stuck) || [], terms:P.terms || [], pack:true};
  if (Store.nodes[key]) packMigrate(key);
}
/* knowledge-point progress measured against an older generated outline doesn't map onto the chapter's points: keep it aside, start the chapter's fresh */
function packMigrate(key) {
  const o = Store.outlines[key]; if (!o || !o.pack) return;
  const n = ensureNode(key);
  if (!n.kpPack) { if (n.kp && Object.keys(n.kp).length) { n.kpPrev = n.kp; n.kp = {}; delete n.kpN; } n.kpPack = 1; Store.saveNode(key); }
  attachOutline(key, o);
}
const varsOf = q => (Array.isArray(q.vars) ? q.vars : str(q.vars).split(/[,\s]+/)).map(v => str(v).trim()).filter(v => /^[a-zA-Z]\w*$/.test(v));
/* physical quantities (masses, lengths, speeds) are positive: physics answers are compared on positive values only */
function packPtype(q, key) { return {pos:!!(q.pos || String(key || '').startsWith('phy-')), ptype:q.type, answer:str(q.answer), answerText:str(q.answer), prompt:q.prompt, vars:varsOf(q), tol:+q.tol > 0 ? +q.tol : (q.type === 'number' || q.type === 'numbers' ? 0.001 : 1e-6)}; }
const kpTitle = (P, id) => { const k = P && P.kps.find(x => x.id === id); return k ? k.t : 'Chapter question'; };
function allPackQs(P) { return P.sections.flatMap(s => s.questions).concat(P.practice || [], P.exam || []); }
/* a chapter question as a session problem: the session machinery grades, records, and schedules it */
function packProblem(q, key, P, difficulty) {
  const base = {type:'problem', pack:true, qid:q.id, node:key, kp:q.kp, prompt:q.prompt, skill:kpTitle(P, q.kp).toLowerCase().slice(0, 40), difficulty:difficulty || 2, hint:'', vstate:'pack'};
  if (q.type === 'written') return Object.assign(base, {ptype:'proof', written:true, rubric:(q.rubric || []).slice(0, 6), solution:str(q.model) + (q.why ? '\n\n' + q.why : ''), answer:'', answerText:'See the model answer'});
  if (q.type === 'mcq') {
    const idx = shuffle(q.options.map((_, i) => i)), L = 'ABCDEF';
    const options = idx.map((i, j) => ({k:L[j], t:str(q.options[i])})), a = L[idx.indexOf(q.answer)];
    return Object.assign(base, {ptype:'choice', options, answer:a, answerText:a + ') ' + str(q.options[q.answer]), solution:str(q.why)});
  }
  const t = packPtype(q, key);
  return Object.assign(base, {pos:t.pos, ptype:q.type, answer:t.answer, answerText:t.answer, vars:t.vars, tol:t.tol, solution:str(q.why)});
}
function pickPack(key, pool, count) {
  const n = ensureNode(key), recent = n.pqSeen || [], out = [];
  if (!AI.ok()) pool = pool.filter(q => q.type !== 'written');
  const take = q => { if (q && !out.includes(q)) out.push(q); };
  kpTargets(key, 30).forEach(k => { if (out.length < count) take(pool.find(q => q.kp === k.id && !recent.includes(q.id) && !out.includes(q))); });
  shuffle(pool.filter(q => !recent.includes(q.id))).forEach(q => { if (out.length < count) take(q); });
  pool.forEach(q => { if (out.length < count) take(q); });
  n.pqSeen = out.map(q => q.id).concat(recent).filter((x, i, a) => a.indexOf(x) === i).slice(0, 24);
  return out;
}
function startPackPractice(key, opts) {
  opts = opts || {};
  const info = nodeInfo(key); if (!info) return;
  closeSheet();
  const n = opts.count || 8;
  const S = SESSION = newSession({kind:'practice', title:info.title, back:opts.back || {name:'topic', key}, node:key, problemStream:true, expected:n,
    loadMsg:'Opening the chapter’s question bank: aimed first at points that are due, untested, or weakest.'});
  Store.profile.lastNode = key; Store.saveProfile();
  go('session');
  runSession(S, async S => {
    const P = await loadPack(key); if (!P) throw {code:'pack'};
    await ensureOutline(key).catch(() => null);
    const qs = pickPack(key, (P.practice || []).concat(P.sections.flatMap(s => s.questions)), n).map(q => packProblem(q, key, P));
    Store.saveNode(key);
    if (!qs.length) throw {code:'pack'};
    addQs(S, qs);
  });
}
/* the chapter test: every exam item, one attempt, no hints, no partial credit */
const TEST_PASS = 0.8;
function startPackTest(key) {
  const info = nodeInfo(key); if (!info) return;
  if (!AI.ok()) { toast('The chapter test grades written answers with Claude, which isn’t available in this view.'); return; }
  closeSheet();
  const S = SESSION = newSession({kind:'test', strict:true, title:info.title, back:{name:'topic', key}, node:key, problemStream:true,
    loadMsg:`The chapter test: one attempt per question, no hints, and no partial credit. An answer is right or it is not. Pass at ${TEST_PASS * 100}%.`});
  go('session');
  runSession(S, async S => {
    const P = await loadPack(key); if (!P) throw {code:'pack'};
    await ensureOutline(key).catch(() => null);
    S.expected = (P.exam || []).length;
    addQs(S, (P.exam || []).map(q => packProblem(q, key, P, 3)));
  });
}
function recordPackTest(S) {
  const X = S.summary; if (!X) return;
  const total = S.questions.length, got = S.results.filter(r => r && !r.excluded).reduce((a, r) => a + (r.score >= 1 ? 1 : 0), 0);
  const score = total ? got / total : 0, passed = score >= TEST_PASS;
  const n = ensureNode(S.node), prev = n.test;
  n.test = {best:Math.max(score, prev ? prev.best : 0), last:score, at:Date.now(), passed:passed || !!(prev && prev.passed)};
  X.test = {score, passed, got, total};
  if (passed && !(prev && prev.passed)) addXP(20);
  Store.saveNode(S.node);
}
function pickExamQ(key, P) {
  const pool = (P.exam || []).length ? P.exam : allPackQs(P);
  const ok = AI.ok() ? pool : pool.filter(q => q.type !== 'written');
  return (ok.length ? shuffle(ok.slice()) : pool)[0] || null;
}

/* ---- reader */
let BOOK = null;
function bookRec(key) { const n = ensureNode(key); n.book = n.book || {}; n.book.done = n.book.done || {}; n.book.q = n.book.q || {}; return n.book; }
function bookDone(key) { const n = Store.nodes[key]; return (n && n.book && n.book.done) || {}; }
async function openBook(key, at) {
  const info = nodeInfo(key); if (!info) return;
  closeSheet();
  const B = BOOK = {key, P:null, i:at != null && at !== '' ? +at : null, st:{}, loading:true};
  Store.profile.lastNode = key; Store.saveProfile();
  go('book');
  const P = await loadPack(key);
  if (BOOK !== B) return;
  B.loading = false;
  if (!P) { B.err = 'This chapter couldn’t be loaded. Check your connection, then try again.'; render(); return; }
  B.P = P; packMigrate(key);
  if (B.i == null) { const d = bookDone(key), j = P.sections.findIndex(s => d[s.id] == null); B.i = !Object.keys(d).length ? -1 : j < 0 ? P.sections.length : j; }
  B.i = Math.max(-1, Math.min(P.sections.length, B.i));
  render(); window.scrollTo(0, 0);
}
function bookQ(P, qid) { for (const s of P.sections) { const q = s.questions.find(x => x.id === qid); if (q) return q; } return null; }
function bqSt(B, qid) { return B.st[qid] || (B.st[qid] = {text:'', sel:null, tries:0, res:null, final:false, busy:false, msg:'', msgKind:''}); }
/* each glossary term is shown under the first section that introduces it */
function termsBySection(P) {
  if (P._terms) return P._terms;
  const by = P.sections.map(() => []), low = s => str(s).toLowerCase();
  (P.terms || []).forEach(t => {
    const w = low(t.t).replace(/\s*\(.*\)\s*$/, '');
    let si = P.sections.findIndex(s => low(s.md).includes('**' + w));
    if (si < 0) si = P.sections.findIndex(s => low(s.md).includes(w));
    if (si >= 0) by[si].push(t);
  });
  return (P._terms = by);
}
const Q_LABEL = {written:'Written answer', expression:'Expression', antiderivative:'Antiderivative', number:'Number', numbers:'Numbers', mcq:'Multiple choice'};
function glossaryHtml(ts) { return `<dl class="glossary">${ts.map(t => `<div><dt>${fieldHtml(t.t)}</dt><dd>${fieldHtml(t.d)}${t.ex ? `<span class="eg">${fieldHtml(t.ex)}</span>` : ''}</dd></div>`).join('')}</dl>`; }
function bqHtml(B, q, label) {
  const S = bqSt(B, q.id), prev = (bookRec(B.key).q || {})[q.id];
  const head = `<div class="bq-h"><span class="eyebrow">Question ${label} · ${Q_LABEL[q.type] || ''}</span>${S.final ? `<span class="pill ${S.score >= 0.8 ? 'good' : S.score > 0 ? 'warn' : ''}">${S.score >= 0.8 ? 'Correct' : S.score > 0 ? 'Partly' : 'Missed'}</span>` : ''}</div><div class="q prose">${mdToHtml(q.prompt)}</div>`;
  if (prev != null && !S.touched) {
    return `<section class="check bq" id="bq-${esc(q.id)}">${head}<div class="row"><span class="small muted">Answered earlier · ${Math.round(prev * 100)}%</span><button class="btn sm" data-act="bkRedo" data-arg="${esc(q.id)}">Answer again</button><button class="btn ghost sm" data-act="bkWhy" data-arg="${esc(q.id)}">${S.showWhy ? 'Hide' : 'Show'} the solution</button></div>${S.showWhy ? bqSolution(q) : ''}</section>`;
  }
  const lock = S.final || S.busy;
  let input = '';
  if (q.type === 'mcq') {
    input = `<div class="opts" role="group" aria-label="Options">${q.options.map((o, i) => {
      let cls = S.sel === i ? 'sel' : '';
      if (S.final) cls = i === q.answer ? 'ok' : S.sel === i ? 'no' : '';
      return `<button class="opt ${cls}" data-act="bkSel" data-arg="${esc(q.id)}|${i}" ${lock ? 'disabled' : ''}><span class="opt-k">${'ABCDEF'[i]}</span><span class="prose sm">${fieldHtml(o)}</span></button>`;
    }).join('')}</div>`;
  } else if (q.type === 'written') {
    input = `<textarea class="answer" id="bk-${esc(q.id)}" data-inp="bk:${esc(q.id)}" aria-label="Your answer" placeholder="Write your answer in full sentences: definitions, each step, and the reason for it." ${lock ? 'readonly' : ''}>${esc(S.text)}</textarea>`;
  } else {
    input = `<input class="pinput" id="bk-${esc(q.id)}" data-inp="bk:${esc(q.id)}" value="${esc(S.text)}" aria-label="Your answer" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Your answer" ${lock ? 'readonly' : ''}>
      <div class="pprev" id="bkp-${esc(q.id)}" aria-live="polite"></div>${!lock ? `<div class="hint">${FMT_HINT[q.type] || ''}</div>` : ''}`;
  }
  const R = S.res;
  let fb = '';
  if (S.msg) fb += `<div class="notice ${S.msgKind || 'bad'}">${esc(S.msg)}</div>`;
  if (S.busy) fb += `<div class="thinking"><span class="pulse"></span>${q.type === 'written' ? 'Grading: working the question independently first, then checking your answer against the rubric…' : 'Checking…'}</div>`;
  if (R && q.type === 'written') {
    fb += `<div class="fb ${R.verdict === 'correct' ? 'good' : R.verdict === 'partial' ? 'warn' : 'bad'}"><div class="fb-h">${{correct:'Correct', partial:'Partly correct', incorrect:'Not correct'}[R.verdict] || 'Graded'}</div>
      ${R.feedback ? `<div class="prose sm">${mdToHtml(R.feedback)}</div>` : ''}
      ${!S.final && R.hint ? `<p><b>Where to look:</b> ${fieldHtml(R.hint)}</p>` : ''}
      ${S.final && R.errors && R.errors.length ? `<div class="corrections"><div class="eyebrow">Corrections</div>${R.errors.map(e => `<div class="corr"><div class="wrong">${fieldHtml(e.wrong)}</div><div class="fix">${fieldHtml(e.fix)}</div></div>`).join('')}</div>` : ''}
      ${S.final && R.hits && q.rubric ? `<ul class="rubric">${q.rubric.map((r, i) => `<li><span class="m ${R.hits[i] ? 'y' : 'n'}">${R.hits[i] ? '✓' : '✗'}</span><span>${fieldHtml(r)}</span></li>`).join('')}</ul>` : ''}</div>`;
  } else if (S.final && q.type !== 'written') {
    fb += `<div class="fb ${S.score >= 0.8 ? 'good' : S.score > 0 ? 'warn' : 'bad'}"><div class="fb-h">${S.score >= 1 ? 'Correct' : S.score > 0 ? (S.seen ? 'Correct, after seeing the solution' : 'Correct on the second attempt') : S.gaveUp ? 'Solution' : 'Not correct'}</div>${q.type !== 'mcq' && S.score < 0.8 ? `<p class="small">Answer: ${answerHtml({ptype:q.type, answerText:q.answer})}</p>` : ''}</div>`;
  }
  if (S.selfgrade && !S.final) fb += `<div class="fb"><div class="fb-h">Grade it yourself</div><p class="small muted">Claude isn’t available here to grade written answers. Compare your answer with the model answer and the rubric, then rate it honestly.</p>${bqSolution(q)}<div class="row"><button class="btn sm" data-act="bkSelf" data-arg="${esc(q.id)}|0">Missed it</button><button class="btn sm" data-act="bkSelf" data-arg="${esc(q.id)}|0.5">Partly</button><button class="btn go sm" data-act="bkSelf" data-arg="${esc(q.id)}|1">All rubric points</button></div></div>`;
  if (S.final) fb += bqSolution(q);
  const acts = S.final ? `<button class="btn ghost sm" data-act="bkAsk" data-arg="${esc(q.id)}">Ask the teacher about this</button>${S.score < 1 ? `<button class="btn ghost sm" data-act="bkRedo" data-arg="${esc(q.id)}">Answer again</button>` : ''}`
    : S.selfgrade ? '' : `<button class="btn primary sm" data-act="bkCheck" data-arg="${esc(q.id)}" ${S.busy ? 'disabled' : ''}>${S.tries ? 'Check again' : 'Check'}</button>
      ${S.tries ? `<button class="btn ghost sm" data-act="bkShow" data-arg="${esc(q.id)}" ${S.busy ? 'disabled' : ''}>Show the solution</button>` : `<button class="btn ghost sm" data-act="bkIdk" data-arg="${esc(q.id)}" ${S.busy ? 'disabled' : ''}>I don’t know yet</button>`}`;
  return `<section class="check bq" id="bq-${esc(q.id)}">${head}${input}${fb}<div class="row">${acts}${!S.final && S.tries ? `<span class="small muted">Attempt ${S.tries + 1} of 2</span>` : ''}</div></section>`;
}
function bqSolution(q) {
  const body = q.type === 'written' ? `${q.model ? `<div class="prose sm">${mdToHtml(q.model)}</div>` : ''}${q.why ? `<div class="prose sm why">${mdToHtml(q.why)}</div>` : ''}` : `<div class="prose sm">${mdToHtml(q.why || '')}</div>`;
  return `<details class="sol" open><summary>${q.type === 'written' ? 'Model answer' : 'Worked solution'}</summary>${body}</details>`;
}
function bqRender(qid) {
  const B = BOOK; if (!B || !B.P || VIEW.name !== 'book') return;
  const el = document.getElementById('bq-' + qid); if (!el) return;
  const s = B.P.sections[B.i], qi = s ? s.questions.findIndex(q => q.id === qid) : -1; if (qi < 0) return;
  const tmp = document.createElement('div'); tmp.innerHTML = bqHtml(B, s.questions[qi], `${B.i + 1}.${qi + 1}`);
  const nw = tmp.firstElementChild; el.replaceWith(nw); typeset(nw); bqPreview(qid);
  const t = $('#bookTicks'); if (t) t.outerHTML = bookTicks(B);
  const f = $('#bookFoot'); if (f) f.outerHTML = bookFoot(B);
}
function bqPreview(qid) {
  const B = BOOK, el = document.getElementById('bkp-' + qid); if (!B || !el) return;
  const S = bqSt(B, qid), v = str(S.text).trim();
  if (!v || !MX.ok()) { el.innerHTML = ''; return; }
  const parts = v.split(/[,;]/).map(x => x.trim()).filter(Boolean), tex = parts.map(p => MX.tex(p));
  el.innerHTML = tex.every(t => t != null) ? `<span class="small muted">Read as</span> \\(${esc(tex.join(',\\; '))}\\)` : '<span class="small muted">Can’t read this yet</span>';
  typeset(el);
}
async function bookCheck(qid) {
  const B = BOOK; if (!B || !B.P) return;
  const q = bookQ(B.P, qid), S = bqSt(B, qid); if (!q || S.final || S.busy) return;
  S.msg = '';
  if (q.type === 'mcq') {
    if (S.sel == null) { S.msg = 'Pick an option first.'; S.msgKind = 'warn'; return bqRender(qid); }
    S.tries = 1; return bookFinal(B, q, S.sel === q.answer ? 1 : 0);
  }
  const ans = str(S.text).trim();
  if (!ans) { S.msg = 'Write your answer first, or use “I don’t know yet”.'; S.msgKind = 'warn'; return bqRender(qid); }
  if (q.type === 'written') return bookGrade(B, q, S, ans);
  const t = packPtype(q, B.key);
  let res = machineCheck(t, ans);
  if (res === 'parse') { S.msg = 'Couldn’t read that answer. Use ^ for powers, * between factors where needed, and sqrt(), ln(), sin(). Check the preview.'; S.msgKind = 'warn'; return bqRender(qid); }
  if (res === null) {
    if (!AI.ok()) { S.gaveUp = true; S.msg = 'This answer can’t be checked automatically here. Compare it with the worked solution.'; S.msgKind = 'warn'; return bookFinal(B, q, 0); }
    S.busy = true; bqRender(qid);
    try { const r = await AI.json(equivPrompt(t, ans), {modelTier:'quick'}); res = !!(r && r.equivalent === true); }
    catch (e) { S.busy = false; S.msg = errCopy(e); S.msgKind = 'warn'; return bqRender(qid); }
    S.busy = false;
  }
  if (res === true) return bookFinal(B, q, S.tries === 0 ? 1 : 0.6);
  S.tries++;
  if (S.tries >= 2) return bookFinal(B, q, 0);
  S.msg = 'Not correct. Check your work and try once more.'; S.msgKind = 'bad';
  bqRender(qid);
  const inp = document.getElementById('bk-' + qid); if (inp) { inp.focus(); inp.select(); }
}
function packGradePrompt(info, q, answer, attempt) {
  return `You are grading a written answer in a rigorous textbook course. Topic: ${topicLine(info)}. The learner is a mathematics major; the standard is a university course.
Question: ${q.prompt}
Rubric (every point a fully correct answer contains):
${(q.rubric || []).map((r, i) => `${i + 1}. ${r}`).join('\n')}
Model answer (for your reference; the learner has not seen it): ${q.model}
${q.why ? `Explanation: ${q.why}\n` : ''}This is attempt ${attempt + 1} of 2.

Learner's answer:
"""
${String(answer).slice(0, 6000)}
"""

Method: first work the question yourself, independently, from scratch. Then judge the learner's answer against your own work and the rubric. Credit correct reasoning the rubric did not anticipate and any valid proof, not only the model's route. Do not credit vague gestures toward an idea, a correct conclusion reached by invalid reasoning, or an undefined or misused term. The learner's own hedges are not evidence of error.
Verdict: "correct" only if every rubric point is met with no mathematical or factual error; "partial" if the core is right but something required is missing or wrong; "incorrect" otherwise.
Feedback: 2 to 4 sentences, in a serious, precise register: what is right, and what is missing or wrong, named exactly. ${attempt === 0 ? 'Because the learner gets a second attempt, do NOT give the correct answer or the missing steps in "feedback" or "hint"; "hint" points to the first error or missing point so they can fix it themselves.' : 'This was the last attempt: "feedback" may state the correction directly.'}
"errors": each error in the answer: "wrong" quotes or paraphrases the learner's wrong or missing claim, "fix" states the correct version precisely. Empty if none.
${NOTATION}
Reply with only JSON: {"hits":[true or false for each rubric point, in order],"score":<0.0 to 1.0>,"verdict":"correct" | "partial" | "incorrect","feedback":"...","hint":"one sentence, or null if correct","errors":[{"wrong":"...","fix":"..."}]}`;
}
async function bookGrade(B, q, S, ans) {
  if (!AI.ok()) { S.selfgrade = true; return bqRender(q.id); }
  S.busy = true; bqRender(q.id);
  try {
    const g = await AI.json(packGradePrompt(nodeInfo(B.key), q, ans, S.tries), {modelTier:tutorTier(), cache:false});
    S.busy = false;
    const score = clamp01(g && g.score);
    const verdict = g && ['correct', 'partial', 'incorrect'].includes(g.verdict) ? g.verdict : score >= 0.9 ? 'correct' : score >= 0.4 ? 'partial' : 'incorrect';
    S.res = {verdict, score, feedback:str(g && g.feedback), hint:g && g.hint && g.hint !== 'null' ? str(g.hint) : '', hits:Array.isArray(g && g.hits) ? g.hits : null,
      errors:(Array.isArray(g && g.errors) ? g.errors : []).filter(e => e && (e.wrong || e.fix)).slice(0, 6).map(e => ({wrong:str(e.wrong), fix:str(e.fix)}))};
    S.tries++;
    if (verdict === 'correct') return bookFinal(B, q, S.tries === 1 ? 1 : 0.8);
    if (S.tries >= 2) return bookFinal(B, q, Math.min(0.6, score * 0.6));
    S.msg = 'Revise your answer using the note above, then check again.'; S.msgKind = 'warn';
  } catch (e) { S.busy = false; S.msg = 'Couldn’t grade it: ' + errCopy(e); S.msgKind = 'warn'; }
  bqRender(q.id);
}
function bookFinal(B, q, score) {
  const S = bqSt(B, q.id);
  /* a second go after the solution has been shown can't count as recall */
  if (S.seen) score = Math.min(score, 0.6);
  S.final = true; S.score = score; S.busy = false; S.touched = true;
  if (score >= 0.8 || q.type === 'mcq') S.msg = '';
  const bk = bookRec(B.key), n = Store.nodes[B.key];
  bk.q[q.id] = +score.toFixed(2);
  if (q.kp) recordKP(B.key, q.kp, score, 0);
  n.last = Date.now(); if (!n.firstAt) n.firstAt = n.last;
  bumpDay('a', 1); if (score >= 0.8) { bumpDay('c', 1); n.solo = 1; }
  if (score < 0.6) {
    const d = S.res && S.res.errors && S.res.errors[0] ? S.res.errors[0].fix : S.res && S.res.feedback ? S.res.feedback : 'Missed: ' + str(q.prompt).replace(/\s+/g, ' ').slice(0, 180);
    addGap(B.key, {concept:kpTitle(B.P, q.kp), detail:d.slice(0, 240)});
  }
  addXP(score >= 0.8 ? 5 : score > 0 ? 2 : 1);
  bookSectionCheck(B);
  Store.saveNode(B.key);
  bqRender(q.id);
}
function bookSectionCheck(B) {
  const bk = bookRec(B.key), n = Store.nodes[B.key];
  B.P.sections.forEach(s => {
    if (bk.done[s.id] != null) return;
    const sc = s.questions.map(q => bk.q[q.id]);
    if (sc.every(v => v != null)) { bk.done[s.id] = +mean(sc).toFixed(2); bumpDay('b', 1); }
  });
  if (B.P.sections.every(s => bk.done[s.id] != null)) n.hasLesson = true;
}
function bookTicks(B) {
  const P = B.P, N = P.sections.length, d = bookDone(B.key);
  return `<div class="bitticks" id="bookTicks" style="--n:${N + 2}"><button class="${B.i === -1 ? 'cur' : ''} ok" data-act="bookGo" data-arg="-1" aria-label="Introduction"></button>${P.sections.map((s, j) => `<button class="${j === B.i ? 'cur' : ''} ${d[s.id] != null ? (d[s.id] >= 0.8 ? 'ok' : 'meh') : ''}" data-act="bookGo" data-arg="${j}" aria-label="Section ${j + 1}: ${esc(s.title)}"></button>`).join('')}<button class="${B.i === N ? 'cur' : ''}" data-act="bookGo" data-arg="${N}" aria-label="Chapter review"></button></div>`;
}
function bookFoot(B) {
  const N = B.P.sections.length, s = B.P.sections[B.i], bk = bookRec(B.key);
  const left = s ? s.questions.filter(q => bk.q[q.id] == null).length : 0;
  const next = B.i < 0 ? 'Begin section 1' : B.i + 1 >= N ? 'Chapter review' : 'Next section';
  return `<div class="sess-actions" id="bookFoot">${B.i > -1 ? '<button class="btn ghost" data-act="bookPrev">Previous</button>' : ''}${left ? `<span class="small muted">${left} question${left > 1 ? 's' : ''} left in this section</span>` : ''}<button class="btn ${left ? '' : 'primary'}" data-act="bookNext">${next}</button></div>`;
}
VIEWS.book = () => {
  const B = BOOK, info = B && nodeInfo(B.key);
  if (!info) { setTimeout(() => go('home'), 0); return ''; }
  const head = `<header class="subbar"><button class="icon-btn" data-act="topic" data-arg="${B.key}" aria-label="Back to topic">${ic('back', 20)}</button><div class="subbar-t crumbs">${esc(info.subject.name)} / <b>${esc(info.title)}</b></div><button class="btn ghost sm" data-act="teacher" ${B.P ? '' : 'disabled'}>Ask the teacher</button></header>`;
  if (B.loading) return head + '<div class="skel" style="margin-top:20px"><i style="width:90%"></i><i style="width:76%"></i><i style="width:84%"></i></div>';
  if (B.err) return head + `<div class="notice bad">${esc(B.err)}</div><div class="row" style="margin-top:10px"><button class="btn" data-act="book" data-arg="${B.key}">Try again</button></div>`;
  const P = B.P, N = P.sections.length, d = bookDone(B.key);
  let body;
  if (B.i < 0) {
    const pre = (Store.outlines[B.key] || {}).pre || [];
    body = `<div class="bitmeta"><span class="eyebrow">Chapter ${String(info.ni + 1).padStart(2, '0')} · ${esc(info.unit)}</span></div>
      <article class="prose book"><h1>${esc(P.title)}</h1>${mdToHtml(P.intro)}</article>
      <div class="section-h"><h2>Contents</h2><span class="eyebrow">${Object.keys(d).length}/${N} worked</span></div>
      <section class="card toc">${P.sections.map((s, j) => `<button class="lib-row" data-act="bookGo" data-arg="${j}"><span class="mono">${j + 1}</span><span class="t"><span class="ln">${esc(s.title)}</span><span class="lm"><span>${s.questions.length} question${s.questions.length > 1 ? 's' : ''}${d[s.id] != null ? ` · worked, ${Math.round(d[s.id] * 100)}%` : ''}</span></span></span><span class="lr">${d[s.id] != null ? ic('check', 15) : ''}</span></button>`).join('')}</section>
      ${pre.length ? `<p class="small muted" style="margin-top:12px">Builds on: ${pre.map(k => `<button class="linkish" data-act="topic" data-arg="${k}">${esc(nodeInfo(k).title)}</button>`).join(', ')}.</p>` : ''}
      <details class="card srcs" style="margin-top:12px"><summary class="small muted">Scope and sources</summary><p class="small" style="margin-top:8px">${esc(P.scope)}</p><ul class="small">${P.sources.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('')}</ul></details>`;
  } else if (B.i >= N) {
    const bk = bookRec(B.key), cs = cardSummary(B.key), test = (Store.nodes[B.key] || {}).test;
    body = `<div class="bitmeta"><span class="eyebrow">Chapter review · ${esc(P.title)}</span></div>
      <section class="card">${P.sections.map((s, j) => `<button class="lib-row" data-act="bookGo" data-arg="${j}"><span class="mono">${j + 1}</span><span class="t"><span class="ln">${esc(s.title)}</span><span class="lm"><span>${d[s.id] != null ? `${Math.round(d[s.id] * 100)}% on its questions` : `${s.questions.filter(q => bk.q[q.id] == null).length} unanswered`}</span></span></span><span class="lr">${d[s.id] != null ? ic('check', 15) : ''}</span></button>`).join('')}</section>
      <div class="section-h"><h2>Next</h2></div>
      <section class="card stack">
        <div class="spread"><div><b>Flashcards</b><div class="small muted">${cs.unlocked ? `${cs.unlocked} of ${cs.total} unlocked · ${cs.fresh} new · ${cs.due} due` : 'They unlock as you finish sections.'}</div></div><button class="btn sm" data-act="cards" data-arg="${B.key}" ${cs.unlocked ? '' : 'disabled'}>Study cards</button></div>
        <div class="spread"><div><b>Practice</b><div class="small muted">The chapter’s question bank, aimed at your weakest points.</div></div><button class="btn sm" data-act="practice" data-arg="${B.key}">Practice</button></div>
        <div class="spread"><div><b>Chapter test</b><div class="small muted">${test ? `${test.passed ? 'Passed' : 'Best so far'}: ${Math.round(test.best * 100)}%. ` : ''}Strict: one attempt each, no hints, no partial credit.</div></div><button class="btn sm" data-act="packTest" data-arg="${B.key}" ${AI.ok() ? '' : 'disabled'}>${test ? 'Retake' : 'Take the test'}</button></div>
      </section>
      ${(P.terms || []).length ? `<div class="section-h"><h2>Terms of this chapter</h2><span class="eyebrow">${P.terms.length}</span></div>${glossaryHtml(P.terms)}` : ''}`;
  } else {
    const s = P.sections[B.i], ts = termsBySection(P)[B.i];
    body = `<div class="bitmeta"><span class="eyebrow">Section ${B.i + 1} of ${N}</span>${d[s.id] != null ? '<span class="pill good">Worked</span>' : ''}</div>
      <article class="prose book"><h2>${esc(s.title)}</h2>${mdToHtml(s.md)}</article>
      ${ts.length ? `<section class="card terms-box"><div class="eyebrow">Terms introduced here</div>${glossaryHtml(ts)}</section>` : ''}
      ${s.questions.length ? `<div class="section-h"><h2>Questions</h2><span class="eyebrow">answer before moving on</span></div>` : ''}
      ${s.questions.map((q, qi) => bqHtml(B, q, `${B.i + 1}.${qi + 1}`)).join('')}`;
  }
  return head + bookTicks(B) + body + bookFoot(B);
};

/* ---- the teacher: a side panel for questions about the section being read */
function teacherPrompt(B, text) {
  const info = nodeInfo(B.key), P = B.P, s = P.sections[B.i], T = B.T;
  const bk = bookRec(B.key);
  const qs = s ? s.questions.map((q, i) => { const S = B.st[q.id] || {}, done = bk.q[q.id] != null || S.final; return `Q${B.i + 1}.${i + 1} [${done ? 'answered; its solution is open to discuss' : 'NOT yet answered: do not give its answer'}] ${q.prompt}${S.text && !done ? `\n   His work so far: ${str(S.text).slice(0, 600)}` : ''}`; }).join('\n') : '';
  const hist = T.msgs.slice(-12, -1).map(m => `${m.role === 'user' ? 'LEARNER' : 'TEACHER'}: ${m.content}`).join('\n\n');
  const where = s ? `section ${B.i + 1} of ${P.sections.length}, "${s.title}"` : B.i < 0 ? 'the chapter introduction' : 'the chapter review';
  return `You are the teacher for one chapter of a university-level textbook: ${topicLine(info)}. The learner is a mathematics major taking Logic and Proof, Calculus II, and calculus-based Physics I. He is reading ${where}, and he has a question.
${s ? `The section he is reading:\n"""\n${str(s.md).slice(0, 9000)}\n"""\nThe section's questions and his status on each:\n${qs}\n` : `The chapter introduction:\n"""\n${str(P.intro).slice(0, 3000)}\n"""\nSections: ${P.sections.map(x => x.title).join('; ')}\n`}
Terms of this chapter: ${(P.terms || []).map(t => t.t).join('; ')}
${hist ? `Conversation so far:\n${hist}\n` : ''}
How you teach (follow exactly):
- One step at a time. Answer what he asked, precisely, then stop. If more is needed, end with the single next thing for him to do or check.
- Never give the answer to a question he has not yet answered. If he asks for it, give the smallest hint that lets him take the next step himself.
- Define every technical term you use precisely, in the field's own nomenclature, and use the chapter's notation.
- If he shows you work, first work it yourself independently, then judge his, and point to the first error exactly.
- Serious register: rigorous, logically ordered, no jokes, no filler, no praise.
- Math in \\( \\) or \\[ \\]; never keyboard notation (x^2, sqrt(), *, <=, ->). Markdown.${teachRules()}

LEARNER: ${text}`;
}
async function teacherLoad(B) {
  if (B.T) return B.T;
  B.T = {msgs:[], draft:'', busy:false};
  const d = await Store.getLesson(B.key + '~teacher');
  if (d && Array.isArray(d.msgs)) B.T.msgs = d.msgs.filter(m => m && m.content).slice(-30);
  return B.T;
}
function teacherInner(B) {
  const T = B.T, s = B.P.sections[B.i];
  const log = T.msgs.length ? T.msgs.map(m => `<div class="msg ${m.role === 'user' ? 'user' : 'ai'}">${m.role === 'user' ? esc(m.content) : `<div class="prose">${m.content ? mdToHtml(m.content) : '<div class="thinking" style="margin:0"><span class="pulse"></span>Thinking…</div>'}</div>`}</div>`).join('')
    : `<p class="small muted">Ask about anything in ${s ? 'this section' : 'this chapter'}: a definition, a step in a proof or computation, why a condition is needed. The teacher goes one step at a time and won’t hand you the answer to a question you haven’t answered.</p>`;
  return `<div class="drawer-h"><div><div class="eyebrow">Teacher · ${s ? 'section ' + (B.i + 1) : 'chapter'}</div><b>${esc(s ? s.title : B.P.title)}</b></div><button class="icon-btn" data-act="closeSheet" aria-label="Close the teacher panel">${ic('close', 20)}</button></div>
    <div class="drawer-b" id="teacherLog">${log}</div>
    <form id="teacherForm" class="tutor-form teacher-form"><textarea id="teacherIn" data-inp="teacherIn" rows="2" placeholder="Ask the teacher" aria-label="Question for the teacher">${esc(T.draft)}</textarea><button class="btn primary sm" type="submit" ${AI.ok() && !T.busy ? '' : 'disabled'}>Ask</button></form>
    ${AI.ok() ? '' : '<p class="small muted" style="padding:0 16px 12px">The teacher needs Claude, which isn’t available in this view.</p>'}`;
}
async function openTeacher(seed) {
  const B = BOOK; if (!B || !B.P) return;
  await teacherLoad(B);
  if (BOOK !== B) return;
  if (seed) B.T.draft = seed;
  const el = $('#sheet');
  el.innerHTML = `<aside class="drawer teacher" id="teacher" role="complementary" aria-label="Ask the teacher">${teacherInner(B)}</aside>`;
  document.body.classList.add('teacher-open');
  typeset(el);
  const lg = $('#teacherLog'); if (lg) lg.scrollTop = lg.scrollHeight;
  const t = $('#teacherIn'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); }
}
let teacherRaf = 0;
function teacherRefresh(final) {
  if (teacherRaf && !final) return;
  const run = () => {
    teacherRaf = 0;
    const B = BOOK, d = $('#teacher'); if (!B || !B.T || !d) return;
    const lg = $('#teacherLog'), stick = !lg || lg.scrollHeight - lg.scrollTop - lg.clientHeight < 80;
    d.innerHTML = teacherInner(B);
    if (final) typeset(d);
    const l2 = $('#teacherLog'); if (l2 && stick) l2.scrollTop = l2.scrollHeight;
  };
  if (final) { cancelAnimationFrame(teacherRaf); run(); } else teacherRaf = requestAnimationFrame(run);
}
async function teacherSend() {
  const B = BOOK; if (!B || !B.T) return;
  const T = B.T, text = str(T.draft).trim(); if (!text || T.busy || !AI.ok()) return;
  T.msgs.push({role:'user', content:text, t:Date.now()});
  const m = {role:'assistant', content:'', t:Date.now()}; T.msgs.push(m);
  T.draft = ''; T.busy = true; teacherRefresh(true);
  try {
    const r = await AI.text(teacherPrompt(B, text), {modelTier:tutorTier(), cache:false, onText: ({text}) => { m.content = text; teacherRefresh(false); }});
    m.content = r.text;
  } catch (e) { m.content = '_' + errCopy(e) + '_'; }
  T.busy = false;
  Store.saveLesson(B.key + '~teacher', {msgs:T.msgs.filter(x => x.content).slice(-30).map(x => ({role:x.role, content:str(x.content).slice(0, 5000), t:x.t}))});
  if (BOOK === B) teacherRefresh(true);
}

/* ---- flashcards: one deck per chapter, cards unlock with the sections that teach them, scheduled by FSRS */
function unlockedKps(key) {
  const P = packNow(key), d = bookDone(key); if (!P) return new Set();
  return new Set(P.sections.filter(s => d[s.id] != null).flatMap(s => s.kps));
}
function cardSummary(key) {
  const P = packNow(key), n = Store.nodes[key] || {}, st = n.cards || {}, now = Date.now();
  if (!P) { const xs = Object.values(st); return {total:0, unlocked:xs.length, fresh:0, due:xs.filter(x => x.due <= now).length, studied:xs.length}; }
  const ks = unlockedKps(key), un = P.cards.filter(c => ks.has(c.kp));
  return {total:P.cards.length, unlocked:un.length, fresh:un.filter(c => !st[c.id]).length, due:un.filter(c => st[c.id] && st[c.id].due <= now).length, studied:un.filter(c => st[c.id]).length};
}
function cardsDueCount() {
  const now = Date.now(); let c = 0;
  Object.values(Store.nodes).forEach(n => { if (n && n.cards && hasPack(n.key)) Object.values(n.cards).forEach(x => { if (x.due <= now) c++; }); });
  return c;
}
let CARDS = null;
const NEW_CARDS = 12;
async function startCards(key) {
  closeSheet();
  const keys = key ? [key] : Object.values(Store.nodes).filter(n => n && n.cards && hasPack(n.key)).map(n => n.key);
  const C = CARDS = {key:key || null, queue:[], i:0, shown:false, input:'', res:null, loading:true, stats:{n:0, again:0}, back:key ? {name:'topic', key} : {name:'review'}};
  go('cards');
  await Promise.all(keys.map(loadPack));
  if (CARDS !== C) return;
  const now = Date.now(), due = [], fresh = [];
  keys.forEach(k => {
    const P = packNow(k); if (!P) return;
    const st = (Store.nodes[k] && Store.nodes[k].cards) || {}, ks = unlockedKps(k);
    P.cards.forEach(c => { if (!ks.has(c.kp)) return; const x = st[c.id]; if (x && x.due <= now) due.push({key:k, c, due:x.due}); else if (!x) fresh.push({key:k, c}); });
  });
  due.sort((a, b) => a.due - b.due);
  C.queue = due.concat(fresh.slice(0, NEW_CARDS));
  C.loading = false; render();
}
function cardIvl(prev, G) {
  if (G === 1) return 10 * 60000;
  return fsrsInterval(fsrsNext(prev, G).s) * DAY;
}
function fmtIvl(ms) { const m = ms / 60000; if (m < 60) return Math.round(m) + 'm'; const d = ms / DAY; return d < 30 ? Math.round(d) + 'd' : d < 365 ? Math.round(d / 30) + 'mo' : (d / 365).toFixed(1) + 'y'; }
function rateCard(G) {
  const C = CARDS; if (!C || !C.shown) return;
  const it = C.queue[C.i]; if (!it) return;
  const n = ensureNode(it.key); n.cards = n.cards || {};
  const prev = n.cards[it.c.id], now = Date.now(), st = fsrsNext(prev && prev.s ? prev : null, G, now);
  n.cards[it.c.id] = {s:+st.s.toFixed(3), d:+st.d.toFixed(3), l:now, due:now + cardIvl(prev && prev.s ? prev : null, G), r:((prev && prev.r) || 0) + 1, lapses:((prev && prev.lapses) || 0) + (G === 1 && prev ? 1 : 0)};
  Store.saveNode(it.key);
  C.stats.n++; if (G === 1) { C.stats.again++; if (!it.again) C.queue.push(Object.assign({}, it, {again:true})); }
  bumpDay('a', 1); if (G >= 3) bumpDay('c', 1);
  C.i++; C.shown = false; C.input = ''; C.res = null;
  render();
}
VIEWS.cards = () => {
  const C = CARDS;
  if (!C) { setTimeout(() => go('review'), 0); return ''; }
  const info = C.key && nodeInfo(C.key);
  const head = `<header class="subbar"><button class="icon-btn" data-act="cardsBack" aria-label="Back">${ic('back', 20)}</button><div class="subbar-t crumbs">Flashcards${info ? ` / <b>${esc(info.title)}</b>` : ''}</div><span class="sess-count">${C.loading ? '' : `${Math.min(C.i + 1, C.queue.length)} / ${C.queue.length}`}</span></header>`;
  if (C.loading) return head + '<div class="skel" style="margin-top:20px"><i style="width:70%"></i><i style="width:50%"></i></div>';
  if (C.i >= C.queue.length) {
    const cs = C.key ? cardSummary(C.key) : null;
    return head + `<div class="summary"><div><div class="eyebrow">${C.queue.length ? 'Deck done for now' : 'Nothing to study'}</div><div class="pct">${C.stats.n}</div><p class="muted">card${C.stats.n === 1 ? '' : 's'} reviewed${C.stats.again ? `, ${C.stats.again} marked Again` : ''}.</p></div>
      ${cs && cs.unlocked < cs.total ? `<p class="small muted">${cs.total - cs.unlocked} more card${cs.total - cs.unlocked > 1 ? 's' : ''} unlock as you finish the chapter’s sections.</p>` : ''}
      <p class="small muted">Each card returns just before you would forget it: Again brings it back in minutes, Good and Easy push it days or weeks out.</p>
      <div class="row"><button class="btn primary" data-act="cardsBack">Done</button></div></div>`;
  }
  const it = C.queue[C.i], c = it.c, prev = ((Store.nodes[it.key] || {}).cards || {})[c.id], ci = nodeInfo(it.key);
  const checkable = c.type === 'problem' && c.answer && c.check;
  const label = {term:'Term', formula:'Formula', concept:'Concept', problem:'Problem'}[c.type] || 'Card';
  const ivls = [1, 2, 3, 4].map(G => fmtIvl(cardIvl(prev && prev.s ? prev : null, G)));
  return head + `<section class="fcard ${C.shown ? 'open' : ''}">
      <div class="spread"><span class="eyebrow">${label}${!C.key && ci ? ' · ' + esc(ci.title) : ''}</span>${prev ? '' : '<span class="pill accent">New</span>'}</div>
      <div class="front prose">${mdToHtml(c.front)}</div>
      ${checkable && !C.shown ? `<input class="pinput" id="cardIn" data-inp="cardIn" value="${esc(C.input)}" placeholder="Your answer (optional)" autocomplete="off" autocapitalize="off" spellcheck="false">` : ''}
      ${C.res ? `<div class="notice ${C.res === 'ok' ? 'good' : 'bad'}">${C.res === 'ok' ? 'Your answer checks out.' : C.res === 'parse' ? 'Couldn’t read your answer.' : 'Your answer doesn’t match.'}</div>` : ''}
      ${C.shown ? `<div class="back prose">${mdToHtml(c.back)}</div>` : ''}
    </section>
    <div class="sess-actions">${C.shown
      ? [['Again', 1, 'warn'], ['Hard', 2, ''], ['Good', 3, 'primary'], ['Easy', 4, '']].map(([l, G, cls], j) => `<button class="btn ${cls} rate" data-act="rateCard" data-arg="${G}"><span>${l}</span><small>${ivls[j]}</small></button>`).join('')
      : `<button class="btn primary" data-act="cardShow">${checkable && C.input ? 'Check and show' : 'Show answer'}</button>`}</div>
    <p class="small muted" style="text-align:center">${C.shown ? 'Keys: 1 Again · 2 Hard · 3 Good · 4 Easy' : 'Answer from memory first. Space shows the back.'}</p>`;
};
function cardShow() {
  const C = CARDS; if (!C || C.shown) return;
  const it = C.queue[C.i]; if (!it) return;
  const c = it.c;
  if (c.type === 'problem' && c.answer && c.check && str(C.input).trim()) {
    const r = machineCheck({ptype:c.check, answer:c.answer, vars:varsOf(c), pos:it.key.startsWith('phy-'), tol:c.check === 'number' ? 0.001 : 1e-6}, C.input);
    C.res = r === true ? 'ok' : r === 'parse' ? 'parse' : r === false ? 'no' : null;
  }
  C.shown = true; render();
}

/* ---- wiring */
Object.assign(ACT, {
  book: a => { const [k, at] = String(a).split('|'); openBook(k, at != null && at !== '' ? +at : null); },
  bookGo: j => { const B = BOOK; if (!B || !B.P) return; B.i = Math.max(-1, Math.min(B.P.sections.length, +j)); closeSheet(); render(); window.scrollTo(0, 0); },
  bookNext: () => ACT.bookGo(BOOK ? BOOK.i + 1 : 0),
  bookPrev: () => ACT.bookGo(BOOK ? BOOK.i - 1 : 0),
  bkSel: a => { const [qid, i] = a.split('|'); const B = BOOK; if (!B) return; const S = bqSt(B, qid); if (S.final) return; S.sel = +i; S.msg = ''; bqRender(qid); },
  bkCheck: qid => bookCheck(qid),
  bkIdk: qid => { const B = BOOK; if (!B || !B.P) return; const q = bookQ(B.P, qid); if (!q) return; bqSt(B, qid).gaveUp = true; bookFinal(B, q, 0); },
  bkShow: qid => { const B = BOOK; if (!B || !B.P) return; const q = bookQ(B.P, qid), S = bqSt(B, qid); if (!q || S.final) return; S.gaveUp = true; bookFinal(B, q, S.res ? Math.min(0.3, S.res.score * 0.5) : 0); },
  bkSelf: a => { const [qid, v] = a.split('|'); const B = BOOK; if (!B || !B.P) return; const q = bookQ(B.P, qid); if (!q) return; const S = bqSt(B, qid); S.selfgrade = false; bookFinal(B, q, +v); },
  bkRedo: qid => { const B = BOOK; if (!B) return; const was = B.st[qid]; B.st[qid] = {text:'', sel:null, tries:0, res:null, final:false, busy:false, msg:'', touched:true, seen:!!(was && (was.final || was.showWhy || was.seen))}; bqRender(qid); },
  bkWhy: qid => { const B = BOOK; if (!B) return; const S = bqSt(B, qid); S.showWhy = !S.showWhy; bqRender(qid); },
  bkAsk: qid => { const B = BOOK; if (!B || !B.P) return; const s = B.P.sections[B.i], qi = s ? s.questions.findIndex(q => q.id === qid) : -1; openTeacher(`About question ${B.i + 1}.${qi + 1}: `); },
  teacher: () => openTeacher(),
  packTest: key => { if (SESSION && SESSION.phase === 'summary') SESSION = null; startPackTest(key); },
  cards: key => startCards(key || null),
  cardShow: () => cardShow(),
  rateCard: g => rateCard(+g),
  cardsBack: () => { const b = (CARDS && CARDS.back) || {name:'review'}; CARDS = null; go(b.name, b); }
});
document.addEventListener('input', e => {
  const t = e.target, k = t.dataset && t.dataset.inp; if (!k) return;
  if (k.indexOf('bk:') === 0 && BOOK) { const qid = k.slice(3), S = bqSt(BOOK, qid); S.text = t.value; if (S.msg && S.msgKind === 'warn') S.msg = ''; if (t.tagName === 'INPUT') bqPreview(qid); }
  else if (k === 'teacherIn' && BOOK && BOOK.T) BOOK.T.draft = t.value;
  else if (k === 'cardIn' && CARDS) CARDS.input = t.value;
});
document.addEventListener('submit', e => { if (e.target.id === 'teacherForm') { e.preventDefault(); teacherSend(); } });
document.addEventListener('keydown', e => {
  const id = (e.target && e.target.id) || '', tag = ((e.target && e.target.tagName) || '').toLowerCase();
  if (id === 'teacherIn' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); teacherSend(); return; }
  if (id.indexOf('bk-') === 0 && BOOK) {
    if (e.key === 'Enter' && (tag === 'input' || e.metaKey || e.ctrlKey)) { e.preventDefault(); bookCheck(id.slice(3)); }
    return;
  }
  if (VIEW.name === 'cards' && CARDS && CARDS.i < CARDS.queue.length) {
    if (id === 'cardIn' && e.key === 'Enter') { e.preventDefault(); cardShow(); return; }
    if (tag === 'input' || tag === 'textarea') return;
    if (!CARDS.shown && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); cardShow(); }
    else if (CARDS.shown && /^[1-4]$/.test(e.key)) { e.preventDefault(); rateCard(+e.key); }
  }
});
/* the Review tab's flashcard row */
function flashRowHtml() {
  const decks = Object.values(Store.nodes).filter(n => n && n.cards && hasPack(n.key) && Object.keys(n.cards).length);
  if (!decks.length) return '';
  const due = cardsDueCount();
  return `<div class="section-h"><h2>Flashcards</h2><span class="eyebrow">${decks.length} chapter deck${decks.length > 1 ? 's' : ''}</span></div>
    <section class="card spread"><div><b>${due} card${due === 1 ? '' : 's'} due</b><div class="small muted">Definitions, formulas, and small problems from the chapters you’ve worked.</div></div><button class="btn ${due ? 'primary' : ''} sm" data-act="cards" data-arg="" ${due ? '' : 'disabled'}>Study due cards</button></section>`;
}

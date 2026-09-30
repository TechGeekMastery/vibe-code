/* ------------------------------------------------------------------ learn in bits: one knowledge point at a time, a micro-problem each, questions answered in place */
let BITS = null;
function teachRules() { const t = Store.profile.teachStyle; return t ? `\nTHE LEARNER'S OWN TEACHING INSTRUCTIONS (they override the defaults here; follow them exactly):\n${t}\n` : ''; }
const BIT_V = 2;
function bitPrompt(info, o, i) {
  const kp = o.kps[i], prev = o.kps.slice(Math.max(0, i - 4), i), next = o.kps.slice(i + 1, i + 3);
  const gaps = openGapsFor(info.key).slice(0, 3);
  return `${HOUSE}
${ENGAGE}
Level: ${depthLine()}
You are teaching ONE small bit of ${topicLine(info)}: knowledge point ${i + 1} of ${o.kps.length}, "${kp.t}": ${kp.d}
${prev.length ? `Already taught in the previous bits: ${prev.map(k => '“' + k.t + '”').join(', ')}. Build on them, and where it fits, open from the question the previous bit left hanging.` : 'This is the first bit after the topic’s opener, so it must pay off the curiosity the opener raised.'}
${next.length ? `Coming in later bits (do NOT teach these yet): ${next.map(k => '“' + k.t + '”').join(', ')}.` : ''}
${gaps.length ? `Known gaps on this topic: ${gaps.map(g => g.concept + ' (' + g.detail + ')').join('; ')}. Address them if this bit touches them.\n` : ''}${teachRules()}
Rules for a bit:
- One idea, 150 to 320 words in total. Depth over coverage.
- Name the typical mistake and why people make it, and say how to recognize when this idea applies.
- Math: every expression, symbol, and exponent in \\( \\) or \\[ \\]. Never keyboard notation (x^2, sqrt(), *, <=, ->).
${info.program && !info.subject.code ? '- Make it hands-on where a picture helps: one explorable graph with a slider the learner drags, and one sentence on what to drag and what to watch for.\n' + PLOT_DOC + '\n' : ''}
Format exactly:
## <a title that makes the reader curious: a question or a tension, not a textbook label>
<the hook: 2 to 4 sentences. A concrete case, anomaly, or question that this bit resolves. No definitions yet.>
PREDICT: <one question the learner answers from intuition BEFORE the explanation; genuinely uncertain, and the explanation below must settle it>
OPTIONS: <2 to 4 short options separated by " | ", or leave this line out for an open guess>
---
<the explanation: resolve the hook, starting from what their guess would have predicted. Mechanism, evidence, one worked case followed through. End with the one-sentence takeaway in **bold**.>
CHECK: <one micro-problem on exactly this bit that makes the learner produce something: a value, an expression, a one-line justification, or a classification with its reason. Solvable in 1 to 3 minutes. Not yes/no.>
ANSWER: <the correct answer with its key reasoning, 1 to 4 lines>`;
}
function introPrompt(info) {
  const u = info.subject.units[info.ui], before = u.n.slice(Math.max(0, info.ni - 3), info.ni);
  return `${HOUSE}
${ENGAGE}
Level: ${depthLine()}
Write the OPENER for ${topicLine(info)}: the first page the learner sees, before anything is taught. Its only job is to make them want to learn this topic, honestly: show them a real question it answers.
${before.length ? `They just studied: ${before.map(t => '“' + t + '”').join(', ')}. If there is a genuine tension between that and this topic, use it.` : ''}${teachRules()}
Format exactly:
## <a title that is a question or a tension, not the topic name>
<120 to 200 words: one real case, anomaly, paradox, historical moment, or high-stakes situation, told concretely with specifics (names, numbers, places). End on the question this topic answers. No definitions, no lists, no summary of what is coming.>
PREDICT: <a question about that case the learner can guess at right now>
OPTIONS: <2 to 4 short options separated by " | ", or leave this line out>
---
<2 to 4 sentences: don't give the answer away. Say what hangs on the answer and what the learner will be able to do by the end of the topic.>`;
}
function bitGradePrompt(info, kp, bit, answer) {
  return `You are checking a learner's answer to a micro-problem in a step-by-step lesson on ${topicLine(info)}.
Bit: "${kp.t}".
Problem: ${bit.q}
Reference answer: ${bit.a}
Learner's answer:
"""
${String(answer).slice(0, 3000)}
"""
First solve the problem yourself, independently. Then compare. Judge the substance, not the phrasing; the learner's own doubts are not evidence of error. Distinguish a wrong answer, a right answer with faulty reasoning, and a typing slip. If it is not correct, point to the FIRST wrong step and give a hint toward it, not the solution.
${teachRules()}
${NOTATION}
Reply with only JSON: {"verdict":"correct" | "slip" | "partial" | "incorrect","score":<0.0 to 1.0>,"feedback":"2 to 4 sentences","hint":"one nudge if not correct, else null"}`;
}
function parseBit(md) {
  const lines = String(md || '').split('\n'), pi = lines.findIndex(l => /^\s*PREDICT:/.test(l));
  let hook = '', pq = null, opts = null, rest = md;
  if (pi >= 0) {
    hook = lines.slice(0, pi).join('\n'); pq = lines[pi].replace(/^\s*PREDICT:\s*/, '').trim();
    let j = pi + 1;
    if (lines[j] != null && /^\s*OPTIONS:/.test(lines[j])) { opts = lines[j].replace(/^\s*OPTIONS:\s*/, '').split('|').map(x => x.trim()).filter(Boolean).slice(0, 4); if (opts.length < 2) opts = null; j++; }
    rest = lines.slice(j).join('\n').replace(/^\s*---\s*$/m, '');
  }
  const blocks = parseLesson(rest);
  const chk = blocks.find(b => b.type === 'check');
  return {hook, pq, opts, md:blocks.filter(b => b.type === 'md').map(b => b.text).join('\n'), q:chk ? chk.q : '', a:chk ? chk.a : ''};
}
const kidAt = (B, i) => B.o && B.o.kps[i] ? B.o.kps[i].id : null;
function bitSt(B) { const id = kidAt(B, B.i); if (!id) return null; return B.st[id] || (B.st[id] = {text:'', tries:0, res:null, shown:false, ask:'', pred:null}); }
function outlineLock(key) {
  const o = Store.outlines[key], n = Store.nodes[key], done = (n && n.bits && n.bits.done) || {};
  if (!o) return -1;
  let lock = -1; o.kps.forEach((k, i) => { if (done[k.id] != null) lock = i; });
  if (BITS && BITS.key === key) lock = Math.max(lock, BITS.i + 1);
  return lock;
}
async function openBits(key, at) {
  const info = nodeInfo(key); if (!info) return;
  closeSheet();
  const n = ensureNode(key);
  const fresh = !(n.bits && n.bits.done && Object.keys(n.bits.done).length) && at == null;
  const B = BITS = {key, o:null, i:0, bits:{}, st:{}, loading:true, phase:fresh ? 'intro' : null, intro:null, mapMsg:'Mapping the topic into small bits…', t0:Date.now()};
  Store.profile.lastNode = key; Store.saveProfile();
  go('bits');
  if (fresh) loadIntro(B);
  const o = await ensureOutline(key, m => { if (BITS === B) { B.mapMsg = m; if (VIEW.name === 'bits') render(); } }).catch(() => null);
  if (BITS !== B) return;
  if (!o) { B.loading = false; B.err = AI.ok() ? 'Couldn’t map this topic into bits. Try again.' : 'Bits are written by Claude, which isn’t available in this view.'; render(); return; }
  B.o = o; B.loading = false;
  const done = (n.bits && n.bits.done) || {};
  B.i = at != null ? Math.max(0, Math.min(o.kps.length - 1, at)) : Math.max(0, o.kps.findIndex(k => done[k.id] == null));
  if (o.kps.every(k => done[k.id] != null) && at == null) B.i = o.kps.length;
  if (VIEW.name === 'bits') render();
  loadBit(B, B.i); loadBit(B, B.i + 1);
}
async function loadIntro(B) {
  const I = B.intro = {status:'loading', hook:'', pq:null, opts:null, md:'', pred:null};
  const cacheKey = B.key + '~intro';
  const c = await Store.getLesson(cacheKey);
  if (BITS !== B) return;
  if (c && c.md && c.v === BIT_V) { Object.assign(I, parseBit(c.md), {status:'ready'}); if (VIEW.name === 'bits') render(); return; }
  if (!AI.ok()) { I.status = 'error'; return; }
  I.status = 'streaming';
  try {
    const r = await AI.text(introPrompt(nodeInfo(B.key)), {modelTier:'default', cache:false, onText: ({text}) => { if (BITS !== B) return; Object.assign(I, parseBit(text)); schedBit(); }});
    if (BITS !== B) return;
    Object.assign(I, parseBit(r.text), {status:'ready'});
    Store.saveLesson(cacheKey, {md:r.text, v:BIT_V, created:Date.now()});
  } catch (e) { if (BITS !== B) return; I.status = 'error'; }
  if (VIEW.name === 'bits') render();
}
async function loadBit(B, i) {
  const o = B.o, id = kidAt(B, i); if (!o || !id || B.bits[id]) return;
  const cacheKey = B.key + '~' + id;
  const bit = B.bits[id] = {status:'loading', md:'', q:'', a:'', qa:[]};
  const c = await Store.getLesson(cacheKey);
  if (BITS !== B) return;
  if (c && c.md && (c.v === BIT_V || !AI.ok())) { Object.assign(bit, parseBit(c.md), {status:'ready', raw:c.md}); if (kidAt(B, B.i) === id) render(); return; }
  if (!AI.ok()) { bit.status = 'error'; bit.err = 'Needs Claude.'; if (kidAt(B, B.i) === id) render(); return; }
  bit.status = 'streaming';
  try {
    const r = await AI.text(bitPrompt(nodeInfo(B.key), o, o.kps.findIndex(k => k.id === id)), {modelTier:'default', cache:false, onText: ({text}) => { if (BITS !== B) return; bit.raw = text; Object.assign(bit, parseBit(text)); if (kidAt(B, B.i) === id) schedBit(); }});
    if (BITS !== B) return;
    bit.raw = r.text; Object.assign(bit, parseBit(r.text), {status:'ready'});
    Store.saveLesson(cacheKey, {md:r.text, v:BIT_V, created:Date.now()});
  } catch (e) { if (BITS !== B) return; bit.status = 'error'; bit.err = errCopy(e); }
  if (kidAt(B, B.i) === id) render();
}
let bitRaf = 0;
function schedBit() { if (bitRaf) return; bitRaf = requestAnimationFrame(() => { bitRaf = 0; renderBit(); }); }
function renderBit() {
  const el = $('#bitBody'); if (!el || !BITS) return;
  el.innerHTML = bitBodyHtml(BITS);
  const cur = BITS.phase === 'intro' ? BITS.intro : BITS.bits[kidAt(BITS, BITS.i)];
  if (cur && cur.status === 'ready') typeset(el);
}
/* the prediction card: commit to a guess before the explanation is shown (the pretesting / generation effect) */
function predictHtml(x, S, act) {
  if (!x.pq) return '';
  if (S.pred != null) return `<div class="predict done"><span class="eyebrow">Your guess</span><span>${S.pred === '' ? '<i class="muted">skipped</i>' : fieldHtml(S.pred)}</span></div>`;
  return `<section class="predict"><div class="eyebrow">Before you read on: your guess</div><div class="q">${fieldHtml(x.pq)}</div>
    ${x.opts ? `<div class="popts">${x.opts.map((o, i) => `<button class="opt" data-act="${act}" data-arg="o${i}">${fieldHtml(o)}</button>`).join('')}</div>` : `<input id="predIn" class="field" placeholder="A quick guess is fine: being wrong here helps you remember" autocomplete="off"><div class="row"><button class="btn primary sm" data-act="${act}" data-arg="text">Lock in my guess</button></div>`}
    <button class="linkish small" data-act="${act}" data-arg="skip">Skip, just explain</button></section>`;
}
function bitBodyHtml(B) {
  if (B.phase === 'intro') {
    const I = B.intro;
    if (!I || I.status === 'loading') return '<div class="skel"><i style="width:90%"></i><i style="width:76%"></i><i style="width:84%"></i></div>';
    if (I.status === 'error' && !I.hook) return '';
    const open = !I.pq || I.pred != null;
    return `<article class="prose opener">${mdToHtml(I.pq ? I.hook : I.md)}</article>${I.pq ? predictHtml(I, I, 'introPred') : ''}${open && I.pq ? `<article class="prose">${mdToHtml(I.md)}</article>` : ''}${I.status === 'streaming' && open ? '<div class="thinking"><span class="pulse"></span>Writing…</div>' : ''}`;
  }
  const bit = B.bits[kidAt(B, B.i)], S = bitSt(B);
  if (!bit || bit.status === 'loading') return '<div class="skel"><i style="width:90%"></i><i style="width:76%"></i><i style="width:84%"></i></div>';
  if (bit.status === 'error') return `<div class="notice bad">${esc(bit.err)}</div><div class="row" style="margin-top:8px"><button class="btn sm" data-act="bitRetryLoad">Try again</button></div>`;
  const open = !bit.pq || S.pred != null;
  return `${bit.pq ? `<article class="prose">${mdToHtml(bit.hook)}</article>${predictHtml(bit, S, 'bitPred')}` : ''}${open ? `<article class="prose">${mdToHtml(bit.md)}</article>` : ''}${bit.status === 'streaming' && (open || !bit.pq) ? '<div class="thinking"><span class="pulse"></span>Writing this bit…</div>' : ''}`;
}
VIEWS.bits = () => {
  const B = BITS, info = B && nodeInfo(B.key);
  if (!info) { setTimeout(() => go('home'), 0); return ''; }
  const head = `<header class="subbar"><button class="icon-btn" data-act="topic" data-arg="${B.key}" aria-label="Back to topic">${ic('back', 20)}</button><div class="subbar-t crumbs">${esc(info.subject.name)} / <b>${esc(info.title)}</b></div><button class="btn ghost sm" data-act="kit" data-arg="${B.key}">Toolkit</button></header>`;
  if (B.err) return head + `<div class="notice bad">${esc(B.err)}</div>`;
  if (B.phase === 'intro' || B.loading) {
    const ready = !B.loading && B.o, first = ready && B.o.kps[B.i];
    return head + `<div class="bitmeta"><span class="eyebrow">Opener · ${esc(info.title)}</span></div>
      <div id="bitBody">${B.phase === 'intro' ? bitBodyHtml(B) : ''}</div>
      <div class="mapline">${ready ? `${ic('check', 14)} <span>Mapped into ${B.o.kps.length} bits${B.o.audited ? '' : ' · being double-checked in the background'}</span>` : `<span class="pulse"></span><span>${esc(B.mapMsg)}</span>`}</div>
      <div class="sess-actions"><button class="btn primary" data-act="bitsStart" ${ready ? '' : 'disabled'}>${ready ? `Start · ${esc(first ? first.t : 'bit 1')}` : 'Preparing bit 1…'}</button></div>`;
  }
  const o = B.o, N = o.kps.length, done = (Store.nodes[B.key].bits || {}).done || {};
  const ticks = `<div class="bitticks" style="--n:${N}">${o.kps.map((k, j) => `<button class="${j === B.i ? 'cur' : ''} ${done[k.id] != null ? (done[k.id] >= 0.8 ? 'ok' : 'meh') : ''}" data-act="bitGo" data-arg="${j}" aria-label="Bit ${j + 1}: ${esc(k.t)}"></button>`).join('')}</div>`;
  if (B.i >= N) return head + ticks + bitsSummaryHtml(B, info);
  const kp = o.kps[B.i], bit = B.bits[kp.id] || {}, S = bitSt(B);
  const ready = bit.status === 'ready', open = !bit.pq || S.pred != null;
  const res = S.res;
  const check = ready && open && bit.q ? `<section class="check bitcheck">
      <div class="eyebrow">Your turn · bit ${B.i + 1}</div>
      <div class="q">${mdToHtml(bit.q).replace(/^<p>|<\/p>$/g, '')}</div>
      <textarea id="bitAns" data-inp="bitAns" placeholder="Work it out, then write your answer and how you got it…" ${res && res.verdict === 'correct' ? 'readonly' : ''}>${esc(S.text)}</textarea>
      ${S.busy ? '<div class="thinking"><span class="pulse"></span>Checking: solving it independently first…</div>' : ''}
      ${res ? `<div class="fb ${res.verdict === 'correct' ? 'good' : res.verdict === 'slip' || res.verdict === 'partial' ? 'warn' : 'bad'}"><div class="fb-h">${{correct:'Correct', slip:'Right idea, a slip', partial:'Partly there', incorrect:'Not yet'}[res.verdict] || 'Checked'}</div><div class="prose sm">${mdToHtml(res.feedback || '')}</div>${res.hint && res.verdict !== 'correct' ? `<p><b>Hint:</b> ${mdToHtml(res.hint).replace(/^<p>|<\/p>$/g, '')}</p>` : ''}</div>` : ''}
      ${S.shown ? `<div class="ans">${mdToHtml(bit.a || '')}</div>` : ''}
      <div class="row">
        ${!res || res.verdict !== 'correct' ? `<button class="btn primary sm" data-act="bitCheck" ${S.busy || !AI.ok() ? 'disabled' : ''}>${S.tries ? 'Check again' : 'Check'}</button>` : ''}
        ${!S.shown && (S.tries || !AI.ok()) ? '<button class="btn ghost sm" data-act="bitShow">Show the answer</button>' : ''}
        ${!S.tries && !S.shown ? '<button class="btn ghost sm" data-act="bitIdk">I don’t know yet</button>' : ''}
      </div></section>` : '';
  const qa = ready && open ? `<section class="bitqa"><div class="eyebrow">Questions about this bit</div>
      ${S.qa && S.qa.length ? S.qa.map(x => `<div class="msg user">${esc(x.q)}</div><div class="msg ai"><div class="prose">${x.a ? mdToHtml(x.a) : '<div class="thinking" style="margin:0"><span class="pulse"></span>Thinking…</div>'}</div></div>`).join('') : ''}
      <form id="bitAskForm" class="tutor-form"><textarea id="bitAsk" data-inp="bitAsk" rows="1" placeholder="Ask about this bit">${esc(S.ask)}</textarea><button class="btn sm" type="submit" ${AI.ok() && !S.asking ? '' : 'disabled'}>Ask</button></form></section>` : '';
  const canNext = res || S.shown;
  return head + ticks + `
    <div class="bitmeta"><span class="eyebrow">Bit ${B.i + 1} of ${N}</span>${kp.type ? `<span class="pill">${esc(kp.type)}</span>` : ''}</div>
    <div id="bitBody">${bitBodyHtml(B)}</div>
    ${check}${qa}
    <div class="sess-actions">
      ${B.i > 0 ? '<button class="btn ghost" data-act="bitPrev">Previous</button>' : ''}
      ${open ? `<button class="btn ${canNext ? 'primary' : ''}" data-act="bitNext" ${ready ? '' : 'disabled'}>${B.i + 1 >= N ? 'Finish' : canNext ? 'Next bit' : 'Skip for now'}</button>` : ''}
    </div>`;
};
function bitsSummaryHtml(B, info) {
  const o = B.o, done = (Store.nodes[B.key].bits || {}).done || {};
  const got = o.kps.filter(k => (done[k.id] || 0) >= 0.8), weak = o.kps.filter(k => done[k.id] != null && done[k.id] < 0.8), skipped = o.kps.filter(k => done[k.id] == null);
  return `<div class="summary"><div><div class="eyebrow">All bits · ${esc(info.title)}</div><div class="pct">${got.length}/${o.kps.length}</div><p class="muted">checked correct. ${weak.length ? `${weak.length} to revisit.` : ''} ${skipped.length ? `${skipped.length} skipped.` : ''}</p></div>
    ${weak.length || skipped.length ? `<div class="card stack" style="gap:6px">${weak.concat(skipped).map(k => `<button class="lib-row" style="padding:8px 0;border:0" data-act="bitGo" data-arg="${o.kps.indexOf(k)}"><span class="mono" style="width:30px;height:30px">${o.kps.indexOf(k) + 1}</span><span class="t"><span class="ln" style="font-size:14px">${esc(k.t)}</span><span class="lm"><span>${done[k.id] == null ? 'skipped' : Math.round(done[k.id] * 100) + '%'}</span></span></span><span class="lr">${ic('next', 15)}</span></button>`).join('')}</div>` : ''}
    <div class="row"><button class="btn primary" data-act="practice" data-arg="${B.key}" ${AI.ok() ? '' : 'disabled'}>Practice the whole topic</button><button class="btn ghost" data-act="topic" data-arg="${B.key}">Back to topic</button></div></div>`;
}
function markBit(B, i, score) {
  const n = ensureNode(B.key), kp = B.o.kps[i];
  n.bits = n.bits || {done:{}}; n.bits.done = n.bits.done || {};
  const prev = n.bits.done[kp.id];
  n.bits.done[kp.id] = prev == null ? score : Math.max(prev, score);
  if (prev == null) bumpDay('b', 1);
  bumpDay('a', 1); if (score >= 0.8) { bumpDay('c', 1); n.solo = 1; }
  if (!n.firstAt) n.firstAt = Date.now();
  n.last = Date.now();
  if (Object.keys(n.bits.done).length >= B.o.kps.length) n.hasLesson = true;
  recordKP(B.key, kp.id, score, 0);
  Store.saveNode(B.key);
}
async function bitCheck(idk) {
  const B = BITS; if (!B) return;
  const i = B.i, kp = B.o.kps[i], bit = B.bits[kp.id], S = bitSt(B);
  if (!bit || !S || S.busy) return;
  if (idk) { S.shown = true; S.res = {verdict:'incorrect', score:0, feedback:'Read the answer below, then say it back in your own words or ask about the part that doesn’t click.'}; markBit(B, i, 0); addGap(B.key, {concept:kp.t, detail:'Couldn’t start the check: ' + bit.q.slice(0, 160)}); render(); loadBit(B, i + 1); return; }
  const ans = String(S.text || '').trim(); if (ans.length < 1) return;
  S.busy = true; render();
  try {
    const g = await AI.json(bitGradePrompt(nodeInfo(B.key), kp, bit, ans), {modelTier:tutorTier(), cache:false});
    if (BITS !== B) return;
    const verdict = ['correct', 'slip', 'partial', 'incorrect'].includes(g && g.verdict) ? g.verdict : (clamp01(g && g.score) >= 0.8 ? 'correct' : 'incorrect');
    S.res = {verdict, score:clamp01(g && g.score), feedback:str(g && g.feedback), hint:g && g.hint && g.hint !== 'null' ? str(g.hint) : null};
    S.tries++;
    const score = verdict === 'correct' ? (S.tries === 1 ? 1 : 0.8) : verdict === 'slip' ? 0.8 : Math.min(0.6, S.res.score);
    if (verdict === 'correct' || S.tries >= 2) { markBit(B, i, score); addXP(verdict === 'correct' ? 6 : 2); }
    if (verdict !== 'correct' && verdict !== 'slip' && S.tries >= 2) addGap(B.key, {concept:kp.t, detail:S.res.feedback.slice(0, 240)});
  } catch (e) { if (BITS !== B) return; S.res = {verdict:'incorrect', score:0, feedback:'Couldn’t check automatically: ' + errCopy(e) + ' Compare with the answer.'}; S.shown = true; }
  S.busy = false;
  render(); loadBit(B, i + 1);
}
async function bitAsk() {
  const B = BITS; if (!B) return;
  const i = B.i, kp = B.o.kps[i], bit = B.bits[kp.id], S = bitSt(B);
  const q = String(S.ask || '').trim(); if (!q || S.asking || !AI.ok()) return;
  S.qa = S.qa || []; const item = {q, a:''}; S.qa.push(item); S.ask = ''; S.asking = true; render();
  const info = nodeInfo(B.key);
  const hist = S.qa.slice(0, -1).map(x => `LEARNER: ${x.q}\nTUTOR: ${x.a}`).join('\n\n');
  try {
    const r = await AI.text(`${HOUSE}
You are the tutor inside a step-by-step lesson on ${topicLine(info)}. The learner is on bit ${i + 1}, "${kp.t}", and has a question before moving on.
The bit they just read:
"""
${(bit.hook + '\n' + bit.md).slice(0, 6000)}
"""
Its micro-problem: ${bit.q}
${hist ? `Earlier questions on this bit:\n${hist}\n` : ''}${teachRules()}
Answer exactly what they asked, at the level of this bit: stay on this one idea, and don't jump ahead to later material. If their question shows a misconception, name it. If it helps, end with one tiny check question. Math in \\( \\); never keyboard notation. Markdown.

LEARNER'S QUESTION: ${q}`, {modelTier:tutorTier(), cache:false, onText: ({text}) => { item.a = text; if (BITS === B && B.i === i) schedBitQa(); }});
    item.a = r.text;
  } catch (e) { item.a = '_' + errCopy(e) + '_'; }
  S.asking = false;
  if (BITS === B && VIEW.name === 'bits') render();
}
function predValue(a, x) {
  if (a === 'skip') return '';
  if (a === 'text') { const v = str(($('#predIn') || {}).value).trim(); if (!v) { toast('Type a guess, or tap “Skip, just explain”.'); return null; } return v.slice(0, 200); }
  const o = x.opts && x.opts[+String(a).slice(1)]; return o || '';
}
let bitQaRaf = 0;
function schedBitQa() { if (bitQaRaf) return; bitQaRaf = requestAnimationFrame(() => { bitQaRaf = 0; if (VIEW.name === 'bits') render(); }); }

Object.assign(ACT, {
  bits: a => { const [k, at] = String(a).split('|'); openBits(k, at != null && at !== '' ? +at : null); },
  bitGo: j => { const B = BITS; if (!B) return; B.i = +j; render(); window.scrollTo(0, 0); loadBit(B, B.i); loadBit(B, B.i + 1); },
  bitNext: () => { const B = BITS; if (!B) return; B.i++; render(); window.scrollTo(0, 0); loadBit(B, B.i); loadBit(B, B.i + 1); },
  bitPrev: () => { const B = BITS; if (!B || B.i <= 0) return; B.i--; render(); window.scrollTo(0, 0); },
  bitCheck: () => bitCheck(false),
  bitIdk: () => bitCheck(true),
  bitShow: () => { const B = BITS; if (!B) return; const S = bitSt(B); S.shown = true; if (!S.res || (S.res.verdict !== 'correct' && S.tries < 2)) markBit(B, B.i, S.res ? 0.3 : 0); render(); },
  bitRetryLoad: () => { const B = BITS; if (!B) return; delete B.bits[kidAt(B, B.i)]; render(); loadBit(B, B.i); },
  bitsStart: () => { const B = BITS; if (!B || !B.o) return; B.phase = null; render(); window.scrollTo(0, 0); loadBit(B, B.i); loadBit(B, B.i + 1); },
  bitPred: a => { const B = BITS; if (!B) return; const bit = B.bits[kidAt(B, B.i)], S = bitSt(B); if (!bit || !S) return; S.pred = predValue(a, bit); if (S.pred === null) return; render(); },
  introPred: a => { const B = BITS; if (!B || !B.intro) return; const I = B.intro; I.pred = predValue(a, I); if (I.pred === null) return; render(); }
});

/* ------------------------------------------------------------------ practice mechanics: mixed practice, faded examples, course exams, drills, runnable Python */

/* ---- mixed practice: interleave the topics you've started in a course, so choosing the method is part of the problem */
function startedIn(s, ui) { return unitKeys(s, ui).filter(k => topicStage(Store.nodes[k]) >= 1); }
function startMixed(sid, ui) {
  const s = subj(sid); if (!s || !AI.ok()) return;
  const keys = shuffle(startedIn(s, ui)).slice(0, 8), infos = keys.map(nodeInfo);
  if (keys.length < 2) { toast('Start at least two topics in this course first.'); return; }
  const P = Store.profile; P.mixedAt = P.mixedAt || {}; P.mixedAt[sid + '-' + ui] = Date.now(); Store.saveProfile();
  const k = kindOf(s), n = Math.min(10, keys.length * 2);
  const S = SESSION = newSession({kind:'mixed', title:s.units[ui].t, back:{name:'subject', sid, course:ui}, problemStream:k === 'program' || k === 'skills', expected:n, langCode:s.lang ? s.lang.code : null,
    loadMsg:`${n} ${k === 'lang' ? 'exercises' : k === 'concept' ? 'questions' : 'problems'} mixed across ${keys.length} topics. Nothing tells you which topic each one is from: recognizing that is the skill.`});
  go('session');
  if (k === 'lang') runSession(S, async S => { const r = await AI.json(langItemsPrompt({infos, n, intro:'Mixed practice: items from all these topics, shuffled so consecutive items come from different topics. Set "node" to the topic id.'}), {modelTier:'default', cache:false, signal:S.ctl.signal}); addQs(S, validateLangItems(r && r.items, keys, keys[0])); });
  else if (k === 'concept') runSession(S, async S => { const items = infos.map(info => ({info, node:ensureNode(info.key)})); const r = await AI.json(reviewPrompt(items), {modelTier:'default', cache:false, signal:S.ctl.signal}); addQs(S, await verifyMcqs(validateQs(r && r.questions, keys, null), S.ctl.signal)); });
  else runSession(S, S => streamProblems(S, problemsPrompt({topics:infos, n, difficultyText:'mostly 2, some 3', skills:s.skills,
    intro:'Write an INTERLEAVED problem set: consecutive problems must come from different topics, and prompts must not name the topic or the technique. The learner has to recognize which method applies.' + (s.code ? ' Use TYPE code for at least half.' : '')}), keys, keys[0]));
}

/* ---- course exams: timed, cumulative, one attempt, no hints; passing (80%) completes the course */
const EXAM_PASS = 0.8;
function examKey(sid, ui) { return sid + '-' + ui; }
function examRec(sid, ui) { return ((Store.profile.exams || {})[examKey(sid, ui)]) || null; }
function startExam(sid, ui) {
  const s = subj(sid); if (!s || !AI.ok()) return;
  const all = unitKeys(s, ui), k = kindOf(s);
  const n = Math.min(12, Math.max(6, all.length)), mins = k === 'concept' ? n * 3 : k === 'lang' ? n * 1.5 : n * 4;
  const pick = all.length <= n ? all : shuffle(all).slice(0, n).sort((a, b) => all.indexOf(a) - all.indexOf(b));
  const infos = pick.map(nodeInfo);
  const S = SESSION = newSession({kind:'exam', title:s.units[ui].t, exam:{sid, ui, mins, ends:0}, back:{name:'subject', sid, course:ui}, problemStream:k === 'program' || k === 'skills', expected:n, langCode:s.lang ? s.lang.code : null,
    loadMsg:`${n} ${k === 'concept' ? 'questions' : k === 'lang' ? 'items' : 'problems'} across the whole course, ${Math.round(mins)} minutes, one attempt each, no hints. Pass at ${EXAM_PASS * 100}% to complete the course. The clock starts with the first question.`});
  go('session');
  const intro = `This is a timed cumulative EXAM for the course "${s.units[ui].t}" in ${s.name}: one item per topic listed, exam-level difficulty, mixed order, prompts that don't name the topic or technique.`;
  if (k === 'lang') runSession(S, async S => { const r = await AI.json(langItemsPrompt({infos, n, intro:intro + ' Set "node" to the topic id.', distribution:'about 40% translate_to, 20% cloze, 15% translate_from, 15% build, 10% choice'}), {modelTier:'default', cache:false, signal:S.ctl.signal}); addQs(S, validateLangItems(r && r.items, pick, pick[0])); });
  else if (k === 'concept') runSession(S, async S => { const r = await AI.json(examPrompt(s, ui, infos), {modelTier:'default', cache:false, signal:S.ctl.signal}); addQs(S, await verifyMcqs(validateQs(r && r.questions, pick, null), S.ctl.signal)); });
  else runSession(S, S => streamProblems(S, problemsPrompt({topics:infos, n, difficultyText:'mostly 2 and 3', skills:s.skills, intro:intro + (s.code ? ' Use TYPE code for about half.' : '')}), pick, pick[0]));
}
function examPrompt(s, ui, infos) {
  return `${HOUSE}
Level: ${depthLine()}
Write a timed cumulative exam for the course "${s.units[ui].t}" in ${s.name}: one question per topic below, at the difficulty of a real final exam, testing understanding and transfer rather than recall of phrasing. Mixed order.
Topics (node ids):
${infos.map(i => `- "${i.key}": ${i.title}`).join('\n')}
Mix about 40% mcq, 40% recall or apply, 20% apply with a novel scenario.
${QSCHEMA}
Every question must also include "node": the node id it tests.
Reply with only JSON: {"questions":[...]}`;
}
let examTimer = 0;
function examTick() {
  const S = SESSION; if (!S || !S.exam || S.finished) { clearInterval(examTimer); examTimer = 0; return; }
  if (!S.exam.ends && S.phase === 'q') S.exam.ends = Date.now() + S.exam.mins * 60000;
  if (!S.exam.ends) return;
  const left = Math.max(0, S.exam.ends - Date.now());
  const el = $('#examClock'); if (el) { el.textContent = Math.floor(left / 60000) + ':' + String(Math.floor(left / 1000) % 60).padStart(2, '0'); el.classList.toggle('low', left < 120000); }
  if (!left) { clearInterval(examTimer); examTimer = 0; toast('Time’s up'); if (S.ctl) S.ctl.abort(); finishSession(); render(); }
}
function startExamClock() { if (!examTimer) examTimer = setInterval(examTick, 1000); examTick(); }
function recordExam(S) {
  const X = S.summary; if (!S.exam || !X) return;
  const answered = S.results.filter(r => r && !r.excluded).length, total = Math.max(S.questions.filter(q => q.vstate !== 'doubt').length, answered);
  const pctScore = total ? S.results.filter(r => r && !r.excluded).reduce((a, r) => a + r.score, 0) / total : 0;
  const P = Store.profile; P.exams = P.exams || {};
  const key = examKey(S.exam.sid, S.exam.ui), prev = P.exams[key];
  const passed = pctScore >= EXAM_PASS;
  P.exams[key] = {best:Math.max(pctScore, prev ? prev.best : 0), last:pctScore, at:Date.now(), passed:passed || !!(prev && prev.passed), n:total};
  X.exam = {score:pctScore, passed, unanswered:total - answered};
  if (passed) addXP(40);
  Store.saveProfile();
}
function courseComplete(s, ui) { const e = examRec(s.id, ui); return !!(e && e.passed) && unitKeys(s, ui).every(k => mastery(Store.nodes[k]) >= PROFICIENT); }

/* ---- faded worked examples: on a new topic, study one worked problem, then finish a half-solved one, then solo */
function solSteps(sol) {
  const parts = String(sol || '').split(/\n(?=\s*\d+[.)]\s)/).map(x => x.trim()).filter(Boolean);
  return parts.length >= 3 && /^\d+[.)]\s/.test(parts[1]) ? parts : null;
}
function applyFading(S, q) {
  if (!S.fadePlan || q.type !== 'problem' || q.ptype === 'code' || q.ptype === 'proof') return;
  const steps = solSteps(q.solution); if (!steps) return;
  if (!S.fadeDone) { q.worked = true; S.fadeDone = 1; return; }
  if (S.fadeDone === 1) { q.fade = Math.ceil(steps.length / 2); S.fadeDone = 2; }
}

/* ---- drills: generated locally, instant feedback, unlimited */
const ip2n = ip => ip.split('.').reduce((a, o) => a * 256 + (+o), 0);
const n2ip = n => [24, 16, 8, 0].map(s => Math.floor(n / Math.pow(2, s)) % 256).join('.');
const maskN = p => p === 0 ? 0 : (Math.pow(2, 32) - Math.pow(2, 32 - p));
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
function randIp() { const f = [[10, rint(0, 255)], [172, rint(16, 31)], [192, 168]][rint(0, 2)]; return [f[0], f[1], rint(0, 255), rint(1, 254)].join('.'); }
function subnetInfo(ip, p) {
  const a = ip2n(ip), m = maskN(p), net = a - (a % Math.pow(2, 32 - p)), bc = net + Math.pow(2, 32 - p) - 1;
  return {net:n2ip(net), bc:n2ip(bc), mask:n2ip(m), hosts:p >= 31 ? (p === 31 ? 2 : 1) : Math.pow(2, 32 - p) - 2, first:n2ip(net + 1), last:n2ip(bc - 1), block:Math.pow(2, (32 - p) % 8 || 8)};
}
function subnetDrill() {
  const p = rint(17, 29), ip = randIp(), s = subnetInfo(ip, p), t = rint(0, 7);
  const oct = Math.min(3, Math.floor(p / 8)), why = `/${p} = mask ${s.mask}. The interesting octet is octet ${oct + 1}; block size ${s.block}. Network ${s.net}, broadcast ${s.bc}, usable ${s.first} – ${s.last} (${s.hosts} hosts).`;
  if (t === 0) return {prompt:`Network address of **${ip}/${p}**?`, answers:[s.net], why};
  if (t === 1) return {prompt:`Broadcast address of **${ip}/${p}**?`, answers:[s.bc], why};
  if (t === 2) return {prompt:`How many usable host addresses in a **/${p}**?`, answers:[String(s.hosts)], why:`2^(32−${p}) − 2 = ${s.hosts}: subtract the network and broadcast addresses.`};
  if (t === 3) return {prompt:`Dotted-decimal subnet mask for **/${p}**?`, answers:[s.mask], why:`${p} one-bits: ${s.mask}.`};
  if (t === 4) return {prompt:`CIDR prefix length for mask **${s.mask}**?`, answers:[String(p), '/' + p], why:`Count the one-bits: ${p}.`};
  if (t === 5) return {prompt:`First usable host in **${ip}/${p}**?`, answers:[s.first], why};
  if (t === 6) { const need = rint(5, 2000), q = 32 - Math.ceil(Math.log2(need + 2)); return {prompt:`Smallest subnet (largest prefix) that holds **${need}** hosts? Answer as a prefix length.`, answers:[String(q), '/' + q], why:`Need 2^h − 2 ≥ ${need} → h = ${32 - q} host bits → /${q} gives ${Math.pow(2, 32 - q) - 2} usable.`}; }
  const other = n2ip(ip2n(s.net) + (Math.random() < 0.5 ? rint(1, Math.pow(2, 32 - p) - 2) : Math.pow(2, 32 - p) + rint(1, 50)));
  const same = subnetInfo(other, p).net === s.net;
  return {prompt:`With a **/${p}** mask, are **${ip}** and **${other}** on the same subnet? (yes/no)`, answers:[same ? 'yes' : 'no', same ? 'y' : 'n'], why:`${ip} is in ${s.net}/${p}; ${other} is in ${subnetInfo(other, p).net}/${p}.`};
}
const PORTS = [['FTP', '20, 21'], ['SSH / SFTP', '22'], ['Telnet', '23'], ['SMTP', '25'], ['DNS', '53'], ['DHCP', '67, 68'], ['TFTP', '69'], ['HTTP', '80'], ['POP3', '110'], ['NTP', '123'], ['IMAP', '143'], ['SNMP', '161, 162'], ['LDAP', '389'], ['HTTPS', '443'], ['SMB', '445'], ['Syslog', '514'], ['SMTP submission (TLS)', '587'], ['LDAPS', '636'], ['IMAPS', '993'], ['POP3S', '995'], ['Microsoft SQL Server', '1433'], ['RDP', '3389'], ['SIP', '5060, 5061']];
function portDrill() {
  const i = rint(0, PORTS.length - 1), [name, port] = PORTS[i];
  if (Math.random() < 0.5) return {prompt:`Default port for **${name}**?${port.includes(',') ? ' (either one)' : ''}`, answers:port.split(', ').concat([port.replace(/\s/g, '')]), why:`${name}: ${port}.`};
  const opts = shuffle([name].concat(shuffle(PORTS.filter((_, j) => j !== i)).slice(0, 3).map(x => x[0])));
  return {prompt:`Which service uses port **${port.split(', ')[0]}** by default?`, options:opts, answer:opts.indexOf(name), why:`Port ${port}: ${name}.`};
}
const DRILLS = {'cert-0-6':{label:'Subnetting drill', gen:subnetDrill}, 'cert-0-3':{label:'Ports drill', gen:portDrill}, 'cert-2-3':{label:'Subnetting drill', gen:subnetDrill}, 'cs-4-0':{label:'Ports drill', gen:portDrill}};
function startDrill(key) {
  const d = DRILLS[key], info = nodeInfo(key); if (!d || !info) return;
  const S = SESSION = newSession({kind:'drill', title:d.label, back:{name:'topic', key}, node:key, phase:'q'});
  S.questions = [...Array(15)].map(() => Object.assign({type:'drill', node:key}, d.gen()));
  go('session'); focusInput();
}
function drillCheck() {
  const S = SESSION; if (!S || S.phase !== 'q') return;
  const q = S.questions[S.i];
  let ok;
  if (q.options) { if (S.sel == null) return; ok = S.sel === q.answer; }
  else { const v = String(S.text || '').trim().toLowerCase().replace(/\s+/g, ''); if (!v) return; ok = q.answers.some(a => a.toLowerCase().replace(/\s+/g, '') === v); }
  S.fb = {verdict:ok ? 'correct' : 'incorrect', score:ok ? 1 : 0};
  S.results[S.i] = {node:q.node, score:ok ? 1 : 0, gaps:ok ? [] : [{concept:DRILLS[q.node] ? DRILLS[q.node].label.replace(' drill', '') : 'drill', detail:q.prompt.replace(/\*\*/g, '') + ' → ' + (q.options ? q.options[q.answer] : q.answers[0])}], drill:true};
  if (ok) addXP(2);
  bumpDay('a', 1); if (ok) bumpDay('c', 1);
  S.phase = 'feedback'; render(); focusNext();
}
function drillHtml(S, q) {
  const locked = S.phase !== 'q';
  const input = q.options
    ? `<div class="opts">${q.options.map((o, i) => { let c = ''; if (locked) { if (i === q.answer) c = 'ok'; else if (i === S.sel) c = 'no'; } else if (i === S.sel) c = 'sel'; return `<button class="opt ${c}" data-act="sel" data-arg="${i}" ${locked ? 'disabled' : ''}><span class="opt-k">${'ABCD'[i]}</span><span>${esc(o)}</span></button>`; }).join('')}</div>`
    : `<form id="drillForm"><label class="vh" for="pans">Answer</label><input id="pans" class="pinput" data-inp="sessText" value="${esc(S.text)}" autocomplete="off" spellcheck="false" placeholder="Answer" ${locked ? 'readonly' : ''}></form>`;
  const fb = S.phase === 'feedback' ? `<div class="fb ${S.fb.verdict === 'correct' ? 'good' : 'bad'}"><div class="fb-h">${S.fb.verdict === 'correct' ? 'Correct' : 'Answer: ' + esc(q.options ? q.options[q.answer] : q.answers[0])}</div><p class="mono-t small">${esc(q.why)}</p></div>` : '';
  return `<div class="qwrap"><div class="eyebrow">${esc(S.title)} · instant check</div><div class="q-prompt prose">${mdToHtml(q.prompt)}</div>${input}${fb}</div>
    <div class="sess-actions">${S.phase === 'q' ? `<button class="btn primary" data-act="drillCheck">Check</button>` : nextBtn(S)}</div>`;
}
function focusInput() { setTimeout(() => { const i = $('#pans'); if (i) i.focus(); }, 30); }

/* ---- runnable Python: Pyodide in a Web Worker, so an infinite loop can be killed */
const PYODIDE = 'https://cdn.jsdelivr.net/npm/pyodide@0.26.4/';
const PY = {w:null, state:'idle', seq:0, wait:{},
  worker() {
    if (this.w) return this.w;
    const src = `importScripts('${PYODIDE}pyodide.js'); let py = null;
self.onmessage = async e => { const {id, code} = e.data; let out = '';
  try { if (!py) { py = await loadPyodide({indexURL:'${PYODIDE}'}); }
    py.setStdout({batched: s => { out += s + '\\n'; }}); py.setStderr({batched: s => { out += s + '\\n'; }});
    py.globals.set('__src', code);
    await py.runPythonAsync('exec(compile(__src, "<your code>", "exec"), {"__name__": "__main__"})');
    self.postMessage({id, ok:true, out});
  } catch (err) { self.postMessage({id, ok:false, out, err:String(err && err.message || err)}); } };`;
    try {
      this.w = new Worker(URL.createObjectURL(new Blob([src], {type:'text/javascript'})));
      this.w.onmessage = e => { const r = this.wait[e.data.id]; if (r) { delete this.wait[e.data.id]; this.state = 'ready'; r(e.data); } };
      this.w.onerror = () => { this.state = 'failed'; Object.values(this.wait).forEach(r => r({ok:false, infra:true, err:'Python runtime failed to load'})); this.wait = {}; this.w = null; };
    } catch (e) { this.state = 'failed'; this.w = null; }
    return this.w;
  },
  run(code, ms) {
    const w = this.worker(); if (!w) return Promise.resolve({ok:false, infra:true, err:'Python can’t run in this view'});
    const id = ++this.seq, first = this.state !== 'ready';
    if (first) this.state = 'loading';
    return new Promise(res => {
      this.wait[id] = res;
      const t = setTimeout(() => { if (!this.wait[id]) return; delete this.wait[id]; if (this.w) this.w.terminate(); this.w = null; this.state = first ? 'failed' : 'idle'; res(first ? {ok:false, infra:true, err:'The Python runtime didn’t load in time'} : {ok:false, err:`Stopped after ${Math.round((ms || 8000) / 1000)} s: an infinite loop, or something far too slow.`}); }, first ? 90000 : (ms || 8000));
      this.wait[id] = r => { clearTimeout(t); res(r); };
      w.postMessage({id, code});
    });
  }
};
function lastLine(err) { const ls = String(err || '').trim().split('\n').filter(Boolean); const i = ls.map(l => /File "<your code>"/.test(l)).lastIndexOf(true); return (i >= 0 ? ls[i].trim() + '\n' : '') + (ls[ls.length - 1] || ''); }
function codeJudgePrompt(q, code) {
  return `Act as a Python interpreter and test runner. Determine, by careful tracing, whether the learner's code passes ALL the tests.
Task: ${q.prompt}
Learner's code:
\`\`\`python
${String(code).slice(0, 8000)}
\`\`\`
Tests:
\`\`\`python
${q.tests}
\`\`\`
Reply with only JSON: {"passes":true or false,"failing":"the first failing assert or error, verbatim, or null","why":"one sentence"}`;
}
async function checkCode(S, q, code) {
  S.phase = 'checking'; S.checkMsg = PY.state === 'ready' ? 'Running your code against the tests…' : 'Loading Python (first run takes a few seconds), then running the tests…'; render();
  const r = await PY.run(code + '\n\n# ---- tests ----\n' + q.tests, 8000);
  if (SESSION !== S) return;
  S.phase = 'q'; S.codeOut = (r.out || '').slice(-1500);
  if (r.infra) {
    if (!AI.ok()) { S.att.msg = 'Python can’t run here. Compare your code with the solution.'; S.att.msgKind = 'warn'; return finalizeProblem(S, q, false, {gaveUp:true}); }
    S.phase = 'checking'; S.checkMsg = 'Python can’t run in this view; Claude is tracing your code against the tests…'; render();
    try { const j = await AI.json(codeJudgePrompt(q, code), {modelTier:'default'}); if (SESSION !== S) return; S.phase = 'q'; if (j && j.passes) return attemptResult(S, q, true, code); S.codeErr = str(j && j.failing) + (j && j.why ? '\n' + str(j.why) : ''); return attemptResult(S, q, false, code); }
    catch (e) { if (SESSION !== S) return; S.phase = 'q'; S.att.msg = errCopy(e); S.att.msgKind = 'warn'; render(); return; }
  }
  if (r.ok) return attemptResult(S, q, true, code);
  S.codeErr = lastLine(r.err);
  attemptResult(S, q, false, code);
}
/* the reference solution must pass its own tests before a code problem can grade anyone */
async function verifyCode(S, q) {
  if (!q.reference) { q.vstate = 'unverified'; return; }
  q.vstate = 'checking';
  const r = await PY.run(q.reference + '\n\n' + q.tests, 10000);
  if (r.infra) { q.vstate = 'unverified'; return; }
  if (r.ok) q.vstate = 'ok'; else { q.vstate = 'doubt'; q.keyNote = 'Its reference solution failed its own tests: ' + lastLine(r.err); }
}

Object.assign(ACT, {
  mixed: a => { const [sid, ui] = a.split('|'); if (SESSION && SESSION.phase === 'summary') SESSION = null; startMixed(sid, +ui); },
  exam: a => { const [sid, ui] = a.split('|'); if (SESSION && SESSION.phase === 'summary') SESSION = null; startExam(sid, +ui); },
  drill: a => { if (SESSION && SESSION.phase === 'summary') SESSION = null; startDrill(a); },
  drillCheck: () => drillCheck(),
  studied: () => { const S = SESSION; if (!S) return; const q = S.questions[S.i]; S.results[S.i] = {node:q.node, score:0, excluded:true}; S.fb = {verdict:'correct', score:0}; S.phase = 'feedback'; nextQ(); }
});

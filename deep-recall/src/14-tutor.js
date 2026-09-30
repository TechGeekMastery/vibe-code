/* ------------------------------------------------------------------ subject tutor */
function tutorContext(s, T) {
  const focus = T && T.focus && nodeInfo(T.focus);
  const th = T && T.tid ? T.thread : null;
  const touched = new Set(Object.keys((th && th.topics) || {}));
  const lines = [];
  s.units.forEach((u, ui) => {
    const keys = unitKeys(s, ui);
    const active = keys.filter(k => Store.nodes[k] || touched.has(k) || (focus && focus.key === k));
    lines.push(`${u.t}: ${keys.map(k => `${k} ${nodeInfo(k).title}`).join(' | ')}`);
    active.forEach(k => { const n = Store.nodes[k] || {}, p = pst(n), g = openGapsFor(k).length; lines.push(`  · ${k}: ${mastery(n)}%${p.a ? `, ${p.c}/${p.a} right` : ''}${g ? `, ${g} gaps` : ''}${n.due && n.due <= Date.now() ? ', review due' : ''}`); });
  });
  const gaps = openGaps().filter(g => g.node.split('-')[0] === s.id).sort((a, b) => (b.hits || 1) - (a.hits || 1)).slice(0, 8);
  const miss = [];
  nodeKeys(s).forEach(k => ((Store.nodes[k] || {}).miss || []).forEach(m => miss.push(Object.assign({k}, m))));
  miss.sort((a, b) => b.t - a.t);
  const L = s.lang, style = Store.profile.teachStyle;
  const langRules = L ? `
LANGUAGE (${L.name}): ${L.note}
- Explain in ${L.base}. When they write in ${L.name}, first correct it briefly (corrected ${L.name} in bold, each error typed: gender, case, word order, conjugation, spelling, preposition, pronoun, vocabulary, accent), then continue in ${L.name} one step above their level and end with a question. Wrap ${L.name} sentences in {{double braces}} for audio.
- New useful words: add a <<vocab {"items":[{"term":"…","meaning":"…"}]}>> line.` : '';
  return `You are ${th ? 'running a hands-on study session' : `the learner's ${s.name} tutor`} inside the Deep Recall app.
${style ? `\nTHE LEARNER'S TEACHING PROTOCOL — highest priority; follow it exactly on every turn:\n${style}\n` : ''}
HANDS-ON TURN RULES (always):
- Short turns: usually under 120 words. One step, one idea, or one question per turn. Longer only when introducing a new bit or when they ask why.
- End every turn with exactly ONE clear thing for the learner to do: compute this, try this step, answer this.
- Never do their step for them. Confirm or correct exactly what they did, then hand them the next step.
- Before judging any of their work, work it out yourself. Name the first wrong step; hint before solution.
- Teach in bits: a concrete example first, then the rule, when and where it applies, and the typical mistake.
- Direct about errors; no filler, praise, or motivational language. Serious register: no jokes.
- Define every technical term precisely when you use it, in the field's own nomenclature.
- Markdown. Math: every expression in \\( \\) or \\[ \\]; never keyboard notation (x^2, sqrt, *, <=, ->).${langRules}

PROGRESS TRACKING (the learner never sees these lines; put them at the very end of your turn, each on its own line):
<<record {"topic":"<id>","attempted":1,"correct":1,"understanding":0.7,"skill":"2-5 words","note":"one sentence"}>>  after you grade an attempt, or check their understanding
<<gap {"topic":"<id>","concept":"max 6 words","detail":"one sentence"}>>  when you pin down a specific misconception
<<suggest {"topic":"<id>","why":"one sentence"}>>  to recommend a topic from their structured path (at natural stopping points)
<<practice {"topic":"<id>","count":6}>>  to put a practice-set button under your reply
Use topic ids from the list below. Omit the lines when nothing happened.
${WEB.ready() && T && T.web ? '\nWeb tools are available this turn for current facts; cite sources as Markdown links.\n' : ''}
Today is ${new Date().toDateString()}. Level: ${depthLine()}

NOTES ON THIS LEARNER: ${T && T.t && T.t.notes ? T.t.notes : T && T.subjNotes ? T.subjNotes : 'none yet'}
${focus ? `\nCURRENT FOCUS: ${focus.key} "${focus.title}".${Store.outlines[focus.key] ? ` Knowledge points: ${Store.outlines[focus.key].kps.map(k => k.id + ' ' + k.t).join('; ')}.` : ''}${T.focusText ? `\nLesson text:\n"""\n${String(T.focusText).slice(0, 8000)}\n"""` : ''}\n` : ''}${th ? studyContextBlock(th) : ''}

${s.name.toUpperCase()} TOPICS (ids) and live progress on started ones:
${lines.join('\n')}
Open gaps: ${gaps.length ? gaps.map(g => `[${g.node}] ${g.concept}: ${g.detail}`).join('; ') : 'none'}
Recent mistakes: ${miss.length ? miss.slice(0, 5).map(m => `[${m.k}] ${m.p} → answered ${m.a || 'nothing'}; correct ${m.e}`).join('; ') : 'none'}`;
}
/* the tutor's actions travel as hidden lines in its reply, so no extra model round-trips are spent on tools */
const ACTION_RE = /^[ \t]*<<(record|gap|suggest|practice|vocab)\s+(\{.*\})\s*>>[ \t]*$/gm;
function visibleText(t) { return String(t || '').replace(ACTION_RE, '').replace(/<<[^\n]*$/, '').replace(/\n{3,}/g, '\n\n').trim(); }
function applyActions(s, T, msg, raw) {
  const th = T.tid ? T.thread : null;
  const valid = k => { const i = nodeInfo(String(k)); return i && (i.sid === s.id || th) ? i : null; };
  let m; ACTION_RE.lastIndex = 0;
  while ((m = ACTION_RE.exec(raw))) {
    let x; try { x = JSON.parse(m[2]); } catch (e) { continue; }
    if (!x || typeof x !== 'object') continue;
    const i = valid(x.topic);
    if (m[1] === 'record' && i) { const r = recordStudy(th, i.key, x); if (r) (msg.records = msg.records || []).push(r); }
    else if (m[1] === 'gap' && i && x.concept) addGap(i.key, {concept:str(x.concept), detail:str(x.detail)});
    else if (m[1] === 'suggest' && i) { (msg.recs = msg.recs || []).push({key:i.key, why:str(x.why).slice(0, 200)}); if (th) { th.recs = [{key:i.key, why:str(x.why)}].concat((th.recs || []).filter(r => r.key !== i.key)).slice(0, 8); Store.saveThread(th.id); } }
    else if (m[1] === 'practice' && i && (msg.actions || []).length < 2) (msg.actions = msg.actions || []).push({key:i.key, count:Math.max(3, Math.min(12, parseInt(x.count, 10) || 6)), difficulty:Math.max(1, Math.min(3, parseInt(x.difficulty, 10) || levelFor(i.key)))});
    else if (m[1] === 'vocab' && s.lang && Array.isArray(x.items)) addVocab(s.id, x.items, null);
  }
}
const WEB_CUE = /\b(search|look ?up|latest|current|news|today|recent|this (week|year)|source|cite)\b/i;
async function openTutor(sid, opts) {
  opts = opts || {};
  const s = subj(sid); if (!s) return;
  closeSheet();
  if (!TUTOR || TUTOR.sid !== sid) {
    if (TUTOR && TUTOR.ctl) TUTOR.ctl.abort();
    TUTOR = {sid, t:null, busy:false, draft:'', img:null, loading:true, focus:null};
    go('tutor');
    const t = await Store.getTutor(sid);
    if (!TUTOR || TUTOR.sid !== sid) return;
    TUTOR.t = t; TUTOR.loading = false;
  }
  if (opts.focus) {
    TUTOR.focus = opts.focus;
    const c = await Store.getLesson(opts.focus); TUTOR.focusText = c && c.md;
  }
  if (opts.draft != null) TUTOR.draft = opts.draft;
  go('tutor');
  toBottom();
  if (opts.send && TUTOR.busy) { TUTOR.draft = opts.send; render(); }
  else if (opts.send) tutorSend(opts.send);
  else { const t = $('#tin'); if (t && opts.draft) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }
}
let tlogRaf = 0;
function schedTutorLog() { if (tlogRaf) return; tlogRaf = requestAnimationFrame(() => { tlogRaf = 0; renderTutorLog(false); }); }
function renderTutorLog(scroll) {
  const log = $('#tlog'); const T = TUTOR; if (!log || !T) return;
  const s = subj(T.sid);
  const stick = scroll || nearBottom();
  if (T.loading || !T.t) { log.innerHTML = '<div class="thinking"><span class="pulse"></span>Loading your conversation…</div>'; return; }
  const chips = s.lang ? ROLEPLAYS.map(r => ({label:'Role-play: ' + r.label, prompt:roleplayPrompt(s, r)})).concat(['What error do I make most, and why?', 'Quiz me on my weakest unit']) : SUBJECT_TUTOR_CHIPS;
  const opts = {lang:s.lang ? s.lang.code : null};
  if (!T.t.messages.length && T.tid) {
    const tc = [['Diagnose where I stand', 'Diagnose where I stand on this. Ask me targeted questions or give me a quick problem first.'], ['Teach me the base, then problems', 'Teach me the minimum base for this, with one worked example, then give me problems one at a time.'], ['Help me through my problem set', 'I have a problem set. I’ll paste one problem at a time; guide me with hints, don’t just solve it.'], ['I have an exam coming', 'I have an exam coming up on this. Build me a short plan and start with my weakest area.']];
    log.innerHTML = `<div class="tintro"><p>Tell me what you need${T.thread.goal ? '' : ': the class, what’s due, where you are, what confuses you'}. I’ll diagnose first, teach the base, then work problems with you one at a time. Everything gets recorded on the matching topics in your path.</p><div class="chips">${tc.map(([l, p]) => `<button class="chip-btn" data-act="tchip" data-arg="${esc(p)}" ${AI.ok() ? '' : 'disabled'}>${esc(l)}</button>`).join('')}</div></div>`;
    return;
  }
  if (!T.t.messages.length) {
    log.innerHTML = `<div class="tintro"><p>I can see every topic’s mastery, your ${s.program ? 'problem counts' : s.lang ? 'exercise results and error types' : 'results'}, recent mistakes, calibration, and open gaps in ${esc(s.name)}. Ask me anything${AI.images ? ', send a photo of your work,' : ''} or start with one of these.</p>
      <div class="chips">${chips.map(c => `<button class="chip-btn" data-act="tchip" data-arg="${esc(c.prompt || c)}" ${AI.ok() ? '' : 'disabled'}>${esc(c.label || c)}</button>`).join('')}</div></div>`;
    return;
  }
  log.innerHTML = T.t.messages.map((m, mi) => m.role === 'user'
    ? `<div class="msg user">${m.img ? '<span class="eyebrow">Photo attached</span>\n' : ''}${esc(m.content)}</div>`
    : `<div class="msg ai ${m.wrap ? 'wrap' : ''}">${m.content ? `<div class="prose">${mdToHtml(m.content, opts)}</div>` : '<div class="thinking" style="margin:0"><span class="pulse"></span>Thinking…</div>'}
        ${(m.actions || []).map((a, ai) => { const i = nodeInfo(a.key); return i ? `<div class="actcard"><span>${i.program ? 'Problems' : i.lang ? 'Exercises' : 'Practice'} · <b>${esc(i.title)}</b> · ${a.count}${i.program ? ' · level ' + a.difficulty : ''}</span><button class="btn primary sm" data-act="tutorAction" data-arg="${mi}|${ai}" ${AI.ok() ? '' : 'disabled'}>Start</button></div>` : ''; }).join('')}
        ${(m.records || []).map(r => { const i = nodeInfo(r.key); return i ? `<div class="reccard">${ic('check', 14)}<span>Recorded to <button class="linkish" data-act="topic" data-arg="${r.key}">${esc(i.title)}</button>: ${r.a ? `${r.c}/${r.a} right` : ''}${r.u != null ? `${r.a ? ' · ' : ''}understanding ${Math.round(r.u * 100)}%` : ''} · mastery ${r.before}% → ${r.after}%</span></div>` : ''; }).join('')}
        ${(m.recs || []).map(r => { const i = nodeInfo(r.key); return i ? `<div class="actcard"><span><b>${esc(i.title)}</b> · ${esc(i.subject.name)}<br><span class="small muted">${esc(r.why)}</span></span><button class="btn sm" data-act="topic" data-arg="${r.key}">Open</button></div>` : ''; }).join('')}
        ${m.pending && m.status ? `<div class="status">${esc(m.status)}</div>` : ''}
        ${!m.pending && m.tier ? `<div class="tierline ${m.asked && m.tier !== m.asked ? 'warn' : ''}">${TIER_LABEL[m.tier] || m.tier}${m.secs ? ' · ' + m.secs + ' s' : ''}${m.asked && m.tier !== m.asked ? ` · asked for ${TIER_LABEL[m.asked]}; your plan served this instead` : ''}</div>` : ''}
        ${m.error ? `<div class="err">${esc(m.error)}</div>` : ''}</div>`).join('');
  if (!T.busy) typeset(log);
  if (stick) toBottom();
}
async function tutorSend(text) {
  const T = TUTOR; if (!T || !T.t) return;
  text = String(text || '').trim();
  const img = T.img;
  if ((!text && !img) || T.busy || !AI.ok()) return;
  const s = subj(T.sid);
  T.img = null;
  T.t.messages.push({role:'user', content:text || 'Here’s a photo of my work. Check it.', img:img ? true : undefined, t:Date.now(), focus:T.focus || undefined});
  const msg = {role:'assistant', content:'', t:Date.now(), actions:[], pending:true, status:''};
  T.t.messages.push(msg);
  T.busy = true; T.draft = '';
  if (VIEW.name === 'tutor') { render(); toBottom(); }
  const history = T.t.messages.slice(0, -1).filter(m => m.content).slice(T.tid ? -24 : -16).map(m => ({role:m.role, content:m.content + (m.img ? '\n[photo of work attached]' : '')}));
  const T0 = Date.now();
  const turns = [{role:'user', content:tutorContext(s, T)}, {role:'assistant', content:'Understood. I will follow the protocol and keep each turn short and hands-on.'}].concat(history);
  const ctl = T.ctl = new AbortController();
  const opts = {cache:false, signal:ctl.signal, onText: ({text}) => { msg.content = visibleText(text); msg.status = ''; schedTutorLog(); }};
  opts.modelTier = tutorTier(); msg.asked = opts.modelTier;
  T.web = WEB.ready() && WEB_CUE.test(text);
  if (AI.tools && T.web) opts.tools = WEB.tools((name, input) => { msg.status = webUseLabel(name, input); schedTutorLog(); });
  if (T.tid) { T.thread.updated = Date.now(); Store.saveThread(T.tid); }
  if (img && AI.images) opts.images = img;
  try {
    const r = await AI.text(turns, opts);
    applyActions(s, T, msg, r.text);
    msg.content = visibleText(r.text) || ' '; msg.tier = r.modelTierApplied || null; msg.secs = Math.round((Date.now() - T0) / 1000);
  } catch (e) {
    if (e && e.code === 'cancelled') { if (!msg.content) msg.content = '_Stopped._'; }
    else { msg.content = visibleText((e && e.text) || ''); msg.error = errCopy(e); if (!msg.content) msg.content = ' '; }
  }
  msg.pending = false; msg.status = '';
  T.busy = false;
  Store.saveTutor(T.tid || T.sid);
  if (VIEW.name === 'tutor' && TUTOR === T) render();
  const count = T.t.messages.length;
  if (T.tid) { if (count - (T.t.notesAt || 0) >= 6) updateThreadSummary(T); }
  else if (count - (T.t.notesAt || 0) >= 8) updateTutorNotes(T);
}
/* the tutor's running notebook about this learner, rewritten every few exchanges */
async function updateTutorNotes(T) {
  if (!AI.ok() || T.notesBusy) return;
  const s = subj(T.sid); T.notesBusy = true;
  const recent = T.t.messages.filter(m => m.content && !m.pending).slice(-14).map(m => `${m.role === 'user' ? 'LEARNER' : 'TUTOR'}: ${String(m.content).slice(0, 1200)}`).join('\n\n');
  try {
    const r = await AI.text(`You keep a private notebook about one learner for their ${s.name} tutor. Update it from the recent conversation below.
Keep it to at most 12 short bullets covering: recurring confusions and their likely causes; explanations, analogies, or approaches that worked or failed; their goals and constraints; how they prefer to learn; what to check or revisit next time. Keep durable points from the old notes, merge duplicates, drop anything resolved or stale. Facts only, no praise.

OLD NOTES:
${T.t.notes || '(none)'}

RECENT CONVERSATION:
${recent}

Reply with only the updated bullet list.`, {modelTier:'quick', cache:false});
    T.t.notes = String(r.text || '').trim().slice(0, 3000);
    T.t.notesAt = T.t.messages.length;
    Store.saveTutor(T.sid);
    if (VIEW.name === 'tutor' && TUTOR === T && T.showNotes) render();
  } catch (e) { /* notes are best-effort */ }
  T.notesBusy = false;
}

/* goal-based conversation tasks: the learner has something to get done, and is graded on getting it done */
const ROLEPLAYS = [
  {label:'rent a flat', you:'a landlord showing a flat', goal:'find out the rent, deposit, what bills are included, the minimum stay, and negotiate the move-in date'},
  {label:'order at a restaurant', you:'a waiter at a busy restaurant', goal:'ask about two dishes, handle a dietary restriction, order, and ask for the bill split'},
  {label:'see a doctor', you:'a GP', goal:'describe symptoms and how long you’ve had them, answer questions, and understand the instructions'},
  {label:'job interview', you:'an interviewer for a junior IT role', goal:'introduce yourself, explain one past project, answer a weakness question, and ask two questions of your own'},
  {label:'sort out a problem', you:'a phone-company support agent', goal:'explain a billing error, push back politely, and get a concrete resolution and reference number'}
];
function roleplayPrompt(s, r) {
  const lvl = (() => { const u = s.units.findIndex((u, ui) => statsFor(unitKeys(s, ui)).avg < 70); return (s.units[u < 0 ? s.units.length - 1 : u].t.split('·')[0] || '').trim(); })();
  return `Let’s role-play in ${s.lang.name}. You are ${r.you}${s.id === 'ca' ? ' in Barcelona' : ' in Germany'}; I’m a customer/visitor. My goal: ${r.goal}. Keep your language at my level (${lvl}), stay in character, and after each of my messages add a one-line correction in brackets if I made an error. After 8 to 10 exchanges, step out of character and grade me: did I achieve each part of the goal, which errors recurred, and what should I practice. Start the scene.`;
}

/* which Claude tier answers the tutor and study sessions; the platform reports the tier that actually answered */
const TIER_LABEL = {quick:'Fast model', default:'Balanced model', complex:'Most capable model'};
function tutorTier() { const t = Store.profile.tutorTier; return t === 'quick' || t === 'complex' ? t : 'default'; }

const QUICK = [['Hint', 'Give me a hint for the step I’m on, not the answer.'], ['Check my step', null], ['Why?', 'Why does that work? Explain the mechanism behind the last step.'], ['Next step', 'Got it. Give me the next step.'], ['Similar problem', 'Give me a similar problem with different numbers so I can try it myself.'], ['I’m stuck', 'I’m stuck. Ask me one question that gets me unstuck without giving the answer.'], ['Try one solo', 'solo']];
function soloKey(T) {
  if (T.focus && nodeInfo(T.focus)) return T.focus;
  const ms = (T.t && T.t.messages) || [];
  for (let i = ms.length - 1; i >= 0; i--) { const r = (ms[i].records || [])[0]; if (r && nodeInfo(r.key || r.k)) return r.key || r.k; }
  const tk = T.thread && Object.keys(T.thread.topics || {}).filter(k => nodeInfo(k)); return tk && tk.length ? tk[tk.length - 1] : null;
}
function quickRow(T) {
  if (!T || !T.t || !T.t.messages.length || T.busy) return '';
  return `<div class="quick">${QUICK.map(([l], i) => `<button type="button" class="chip-btn" data-act="tquick" data-arg="${i}" ${AI.ok() ? '' : 'disabled'}>${l}</button>`).join('')}</div>`;
}

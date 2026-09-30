/* ------------------------------------------------------------------ study sessions: standalone, need-driven tutoring whose work is mapped onto the curriculum */
let STUDY_FORM = {sid:'', title:'', goal:'', open:false, showArchived:false};
function threads(filter) { return Object.values(Store.threads).filter(t => subj(t.sid) && (!filter || filter(t))).sort((a, b) => (b.updated || 0) - (a.updated || 0)); }
function newThread(sid, title, goal) {
  const id = 'th' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  Store.threads[id] = {id, sid, title:str(title).slice(0, 80) || subj(sid).name + ' session', goal:str(goal).slice(0, 6000), created:Date.now(), updated:Date.now(), status:'active', summary:'', next:'', topics:{}, recs:[], wraps:0};
  Store.saveThread(id);
  return Store.threads[id];
}
async function openThread(id, opts) {
  opts = opts || {};
  const th = Store.threads[id]; if (!th) return;
  closeSheet();
  if (!TUTOR || TUTOR.tid !== id) {
    if (TUTOR && TUTOR.ctl) TUTOR.ctl.abort();
    TUTOR = {sid:th.sid, tid:id, thread:th, t:null, busy:false, draft:'', img:null, loading:true, focus:null};
    go('tutor');
    const t = await Store.getTutor(id);
    if (!TUTOR || TUTOR.tid !== id) return;
    TUTOR.t = t; TUTOR.loading = false;
    try { const sn = await Store.getTutor(th.sid); if (TUTOR && TUTOR.tid === id) TUTOR.subjNotes = sn.notes; } catch (e) {}
  }
  if (opts.focus) TUTOR.focus = opts.focus;
  if (opts.draft != null) TUTOR.draft = opts.draft;
  go('tutor'); toBottom();
  if (opts.send) tutorSend(opts.send);
  else { const t = $('#tin'); if (t && opts.draft) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }
}
function studyTopic(key) {
  const info = nodeInfo(key); if (!info) return;
  const th = threads(t => t.sid === info.sid && t.status === 'active')[0] || newThread(info.sid, info.title, '');
  openThread(th.id, {focus:key, draft:`Let’s work on “${info.title}”. `});
}

/* ---- progress from conversation: counted on the matching curriculum topic, even if its lessons were never opened */
function recordStudy(th, key, x) {
  const info = nodeInfo(key); if (!info) return null;
  th = th || {id:null, title:'Tutor', topics:{}};
  const a = Math.max(0, Math.min(30, parseInt(x.attempted, 10) || 0)), c = Math.max(0, Math.min(a, parseInt(x.correct, 10) || 0));
  const u = x.understanding == null ? null : clamp01(x.understanding);
  if (!a && u == null) return null;
  const score = a ? (u == null ? c / a : 0.7 * c / a + 0.3 * u) : u;
  const n = ensureNode(key), before = mastery(n);
  if (!n.firstAt) n.firstAt = Date.now();
  if (a) {
    const p = n.p = n.p || {a:0, c:0, f:0, ema:null};
    p.a += a; p.c += c; bumpDay('a', a); bumpDay('c', c);
    p.ema = p.ema == null ? score : p.ema * 0.7 + score * 0.3;
    const sk = n.skills = n.skills || {}, sn = str(x.skill).toLowerCase().slice(0, 40) || 'study session', s = sk[sn] = sk[sn] || {a:0, c:0}; s.a += a; s.c += c;
    if (info.program || info.lang) n.mastery = Math.round(100 * p.ema * Math.min(1, p.a / 8));
    if (c) { const pd = Store.profile.probByDay = Store.profile.probByDay || {}; pd[today()] = (pd[today()] || 0) + c; }
  }
  if (!(info.program || info.lang) || !a) n.mastery = n.sessions || (n.study && n.study.n) ? Math.round((n.mastery || 0) * 0.5 + score * 50) : Math.round(score * 80);
  if (x.kp) recordKP(key, str(x.kp), score, 0);
  schedule(n, score); syncDue(n);
  n.last = Date.now();
  const st = n.study = n.study || {n:0, a:0, c:0};
  st.n++; st.a += a; st.c += c; st.u = u != null ? u : st.u; st.last = Date.now();
  n.studyLog = (n.studyLog || []).concat([{t:Date.now(), tid:th.id, title:th.title, a, c, u, note:str(x.note).slice(0, 240)}]).slice(-20);
  Store.saveNode(key);
  if (th.id) {
    const tt = th.topics[key] = th.topics[key] || {a:0, c:0, u:null, n:0};
    tt.a += a; tt.c += c; tt.n++; if (u != null) tt.u = u; tt.last = Date.now();
    th.updated = Date.now(); Store.saveThread(th.id);
  }
  addXP(2 + 3 * c);
  return {key, a, c, u, before, after:mastery(n)};
}
function addFacts(th, arr) {
  const add = (Array.isArray(arr) ? arr : []).map(str).map(x => x.trim()).filter(x => x && x.length < 300);
  if (!add.length) return;
  const d = new Date().toLocaleDateString(undefined, {month:'short', day:'numeric'});
  th.facts = (th.facts || []).concat(add.map(x => `${x} (${d})`)).slice(-40);
}
function findTopics(query, limit) {
  const words = String(query || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);
  if (!words.length) return [];
  const out = [];
  allSubjects().forEach(s => nodeKeys(s).forEach(k => {
    const i = nodeInfo(k), o = Store.outlines[k];
    const hay = (i.title + ' ' + i.unit + ' ' + (o ? o.kps.map(p => p.t).join(' ') : '')).toLowerCase();
    const score = words.reduce((a, w) => a + (hay.includes(w) ? (i.title.toLowerCase().includes(w) ? 2 : 1) : 0), 0);
    if (score) out.push({score, id:k, title:i.title, course:i.unit, subject:i.subject.name, mastery:mastery(Store.nodes[k])});
  }));
  return out.sort((a, b) => b.score - a.score).slice(0, limit || 8).map(({score, ...r}) => r);
}
function studyContextBlock(th) {
  const recs = Object.entries(th.topics || {}).map(([k, v]) => { const i = nodeInfo(k); return i ? `- ${k} ${i.title}: ${v.c}/${v.a} right${v.u != null ? ', understanding ' + Math.round(v.u * 100) + '%' : ''}, now ${mastery(Store.nodes[k])}%` : ''; }).filter(Boolean);
  return `
STUDY SESSION "${th.title}". Their need, in their words: ${th.goal || '(not stated yet: ask for the class, what is due, and what confuses them)'}
${(th.facts || []).length ? `Things they've told you (treat as current): ${th.facts.join(' | ')}\n` : ''}${th.summary ? `Where you left off:\n${th.summary}\n` : ''}${th.next ? `Planned next step: ${th.next}\n` : ''}Topics worked on in this session: ${recs.length ? '\n' + recs.join('\n') : 'none yet'}
Session loop: diagnose with one quick question or problem → teach the one missing bit → one problem at a time, step by step, with them doing each step → record each graded attempt with a <<record>> line on the matching topic id (any subject's id is fine) → at stopping points, <<suggest>> 1 to 3 path topics. Stay tied to their stated need, not the app's lesson order.
`;
}
async function wrapUp() {
  const T = TUTOR; if (!T || !T.tid || !T.t || T.busy || !AI.ok()) return;
  const th = T.thread, s = subj(th.sid);
  const recent = T.t.messages.filter(m => m.content && !m.pending && !m.wrap).slice(-30).map(m => `${m.role === 'user' ? 'LEARNER' : 'TUTOR'}: ${String(m.content).slice(0, 1500)}`).join('\n\n');
  if (!recent) { toast('Nothing to wrap up yet.'); return; }
  T.busy = true; const msg = {role:'assistant', content:'', t:Date.now(), pending:true, wrap:true, status:'Summarizing the session…'}; T.t.messages.push(msg); render(); toBottom();
  const recs = Object.entries(th.topics || {}).map(([k, v]) => `${k} ${(nodeInfo(k) || {}).title}: ${v.c}/${v.a}${v.u != null ? ', understanding ' + Math.round(v.u * 100) + '%' : ''}`).join('\n');
  const cands = rootCandidates(Object.keys(th.topics || {})[0] || nodeKeys(s)[0], 40).concat(nodeKeys(s).slice(0, 60)).filter((k, i, a) => a.indexOf(k) === i).map(k => `${k}: ${nodeInfo(k).title}`).join('\n');
  try {
    const r = await AI.json(`Close out a tutoring session titled "${th.title}" (${s.name}). The learner's need: ${th.goal || 'not stated'}.
Recorded work this session:
${recs || '(none recorded)'}
Conversation:
"""
${recent.slice(-24000)}
"""
Candidate topics from the structured curriculum (ids):
${cands}
Facts already on file: ${(th.facts || []).join(' | ') || '(none)'}
Reply with only JSON: {"facts":["new durable facts the learner stated (deadlines, scope, scores, constraints, preferences) not already on file"],"covered":"2-4 bullets: what was covered and how well, with specifics","left_off":"2-4 bullets: exactly where things stand, what is still shaky, anything unfinished, precise enough to resume without re-explaining","next":"the single concrete next step for the next session, one sentence","recommend":[{"topic_id":"...","why":"one sentence"}]}
Recommend 1 to 3 topics that would most help, using ids from the list. ${NOTATION}`, {modelTier:'default', cache:false});
    const rec = (Array.isArray(r && r.recommend) ? r.recommend : []).map(x => ({key:(nodeInfo(str(x.topic_id)) || {}).key, why:str(x.why)})).filter(x => x.key).slice(0, 3);
    msg.content = `### Session wrap-up\n**Covered**\n${str(r.covered)}\n\n**Where we left off**\n${str(r.left_off)}\n\n**Next time:** ${str(r.next)}`;
    msg.recs = rec;
    addFacts(th, r.facts);
    th.summary = str(r.left_off).slice(0, 1500); th.next = str(r.next).slice(0, 300); th.recs = rec.concat((th.recs || []).filter(x => !rec.some(y => y.key === x.key))).slice(0, 8);
    th.wraps = (th.wraps || 0) + 1; th.updated = Date.now(); Store.saveThread(th.id);
  } catch (e) { msg.content = ' '; msg.error = errCopy(e); }
  msg.pending = false; msg.status = ''; T.busy = false;
  Store.saveTutor(T.tid);
  if (VIEW.name === 'tutor' && TUTOR === T) { render(); toBottom(); }
}
/* the rolling "where we left off", refreshed every few exchanges so resuming never needs a recap */
async function updateThreadSummary(T) {
  if (!AI.ok() || T.notesBusy) return;
  const th = T.thread; T.notesBusy = true;
  const recent = T.t.messages.filter(m => m.content && !m.pending).slice(-12).map(m => `${m.role === 'user' ? 'LEARNER' : 'TUTOR'}: ${String(m.content).slice(0, 1000)}`).join('\n\n');
  try {
    const r = await AI.json(`Update the "where we left off" notes for a tutoring session titled "${th.title}". Need: ${th.goal || 'not stated'}.
Old notes: ${th.summary || '(none)'}
Recent conversation:
"""
${recent}
"""
Facts already on file: ${(th.facts || []).join(' | ') || '(none)'}
Reply with only JSON: {"left_off":"2-4 bullets precise enough to resume without re-explaining","next":"the next concrete step, one sentence","facts":["NEW durable facts the learner stated that are not already on file: deadlines, test dates and scope, chapters, scores, instructor rules, constraints, how they want to be taught. One short sentence each. Empty if none."]}`, {modelTier:'quick', cache:false});
    addFacts(th, r && r.facts);
    th.summary = str(r && r.left_off).slice(0, 1500) || th.summary; th.next = str(r && r.next).slice(0, 300) || th.next; th.updated = Date.now();
    Store.saveThread(th.id); T.t.notesAt = T.t.messages.length; Store.saveTutor(T.tid);
  } catch (e) { /* best-effort */ }
  T.notesBusy = false;
}

/* ---- views */
function threadRow(th) {
  const s = subj(th.sid), tk = Object.keys(th.topics || {}), a = tk.reduce((x, k) => x + th.topics[k].a, 0), c = tk.reduce((x, k) => x + th.topics[k].c, 0);
  return `<button class="lib-row" data-act="thread" data-arg="${th.id}" style="--c:${s.color}">
    <span class="mono">${ic('chat', 17)}</span>
    <span class="t"><span class="ln">${esc(th.title)}</span><span class="lm"><span>${esc(s.name)}</span><span>${ago(th.updated).toLowerCase()}</span>${tk.length ? `<span>${tk.length} topic${tk.length > 1 ? 's' : ''} · ${c}/${a} right</span>` : ''}</span>${th.next ? `<span class="small muted" style="margin-top:4px">Next: ${esc(th.next)}</span>` : ''}</span>
    <span class="lr">${ic('next', 16)}</span></button>`;
}
VIEWS.study = () => {
  const F = STUDY_FORM, act = threads(t => t.status !== 'archived'), arch = threads(t => t.status === 'archived');
  const subs = allSubjects();
  if (!F.sid) F.sid = (act[0] && act[0].sid) || 'mth';
  return `<header class="page-h"><h1>Study</h1><p class="muted">Standalone sessions for what you need right now: a class, an assignment, an exam. Claude diagnoses, teaches the base, and works problems with you; everything you do is recorded on the matching topics, and each session remembers where you left off.</p></header>
  ${banners()}
  ${F.open ? `<section class="card stack" style="margin-top:12px"><div class="eyebrow">New study session</div>
    <label class="small muted" for="stSubj">Subject</label><select id="stSubj" class="field" data-sel="studySid">${subs.map(s => `<option value="${s.id}" ${F.sid === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
    <label class="small muted" for="stTitle">Name it</label><input id="stTitle" class="field" data-inp="stTitle" value="${esc(F.title)}" placeholder="e.g. Logic & Proof class" maxlength="80">
    <label class="small muted" for="stGoal">What do you need?</label><textarea id="stGoal" class="answer short" data-inp="stGoal" placeholder="The class or exam, what’s due and when, what you’re on right now, what confuses you. Paste the assignment or syllabus if you have it.">${esc(F.goal)}</textarea>
    <div class="row"><button class="btn primary" data-act="threadCreate" ${AI.ok() ? '' : 'disabled'}>Start session</button><button class="btn ghost" data-act="threadFormClose">Cancel</button></div></section>`
  : `<div class="row" style="margin-top:12px"><button class="btn primary" data-act="threadForm">${ic('plus', 16)} New study session</button></div>`}
  <div class="section-h"><h2>Active</h2><span class="eyebrow">${act.length}</span></div>
  ${act.length ? `<div class="lib">${act.map(threadRow).join('')}</div>` : `<div class="card empty-state"><b>No sessions yet</b>Start one for whatever you’re working on now. The structured path stays where it is; this runs alongside it.</div>`}
  ${arch.length ? `<div style="margin-top:18px"><button class="btn ghost sm" data-act="threadArchived">${F.showArchived ? 'Hide' : 'Show'} archived (${arch.length})</button></div>${F.showArchived ? `<div class="lib" style="margin-top:10px">${arch.map(threadRow).join('')}</div>` : ''}` : ''}`;
};
function threadPanelHtml(th) {
  const tk = Object.keys(th.topics || {}).filter(k => nodeInfo(k));
  return `<section class="card notes"><div class="eyebrow">Where you left off</div>
    ${th.summary ? `<div class="prose sm">${mdToHtml(th.summary)}</div>` : '<p class="muted small">Fills in automatically every few exchanges, and fully when you wrap up.</p>'}
    ${th.next ? `<p class="small"><b>Next:</b> ${esc(th.next)}</p>` : ''}
    ${(th.facts || []).length ? `<details><summary class="small">Things you’ve told it (${th.facts.length})</summary><ul class="small muted" style="margin:6px 0 0;padding-left:1.2em">${th.facts.map((f, i) => `<li>${esc(f)} <button class="linkish small" data-act="factDel" data-arg="${i}" aria-label="Remove">remove</button></li>`).join('')}</ul></details>` : ''}
    ${TUTOR && TUTOR.editGoal ? `<label class="eyebrow" for="thGoal">Background: your need, course, deadlines, where you are</label><textarea id="thGoal" class="answer short" data-inp="thGoal">${esc(TUTOR.goalDraft != null ? TUTOR.goalDraft : th.goal || '')}</textarea><div class="row"><button class="btn primary sm" data-act="threadGoalSave">Save background</button><button class="btn ghost sm" data-act="threadGoalEdit">Cancel</button></div>`
      : `<details ${th.goal ? '' : 'open'}><summary class="small">Background Claude reads every time${th.goal ? '' : ' (empty)'}</summary>${th.goal ? `<p class="small muted" style="margin-top:6px;white-space:pre-wrap">${esc(th.goal)}</p>` : '<p class="small muted" style="margin-top:6px">Paste your course, deadlines, and where you are, or the notes from another Claude project, so you never have to re-explain.</p>'}<button class="btn ghost sm" data-act="threadGoalEdit">Edit background</button></details>`}
    ${tk.length ? `<div class="eyebrow" style="margin-top:6px">Recorded to your topics</div>${tk.map(k => { const v = th.topics[k], i = nodeInfo(k); return `<button class="lib-row" data-act="topic" data-arg="${k}" style="padding:6px 0;border:0"><span class="mono" style="--c:${i.subject.color};width:30px;height:30px">${esc(i.subject.mono)}</span><span class="t"><span class="ln" style="font-size:14px">${esc(i.title)}</span><span class="lm"><span>${v.c}/${v.a} right</span>${v.u != null ? `<span>understanding ${Math.round(v.u * 100)}%</span>` : ''}<span>${mastery(Store.nodes[k])}% mastery</span></span></span><span class="lr"></span></button>`; }).join('')}` : ''}
    ${(th.recs || []).length ? `<div class="eyebrow" style="margin-top:6px">Suggested from the path</div><div class="chips">${th.recs.map(r => `<button class="chip-btn" data-act="topic" data-arg="${r.key}" title="${esc(r.why)}">${esc(nodeInfo(r.key).title)}</button>`).join('')}</div>` : ''}
    <div class="row"><button class="btn ghost sm" data-act="threadArchive" data-arg="${th.id}">${th.status === 'archived' ? 'Unarchive' : 'Archive session'}</button></div></section>`;
}

Object.assign(ACT, {
  thread: id => openThread(id),
  threadForm: () => { STUDY_FORM.open = true; render(); const t = $('#stTitle'); if (t) t.focus(); },
  threadFormClose: () => { STUDY_FORM.open = false; render(); },
  threadArchived: () => { STUDY_FORM.showArchived = !STUDY_FORM.showArchived; render(); },
  threadCreate: () => {
    const F = STUDY_FORM; const sid = ($('#stSubj') || {}).value || F.sid;
    if (!subj(sid)) return;
    const th = newThread(sid, F.title || subj(sid).name + ' session', F.goal);
    const goal = F.goal.trim();
    Object.assign(STUDY_FORM, {title:'', goal:'', open:false});
    openThread(th.id, goal ? {send:`Here’s what I need: ${goal}\n\nStart by diagnosing where I stand.`} : {});
  },
  threadArchive: id => { const th = Store.threads[id]; if (!th) return; th.status = th.status === 'archived' ? 'active' : 'archived'; Store.saveThread(id); if (TUTOR) TUTOR.showNotes = false; go('study'); },
  threadGoalEdit: () => { if (!TUTOR) return; TUTOR.editGoal = !TUTOR.editGoal; TUTOR.goalDraft = null; render(); },
  threadGoalSave: () => { const T = TUTOR; if (!T || !T.thread) return; const v = T.goalDraft != null ? T.goalDraft : ($('#thGoal') || {}).value; T.thread.goal = str(v).slice(0, 6000); T.thread.updated = Date.now(); Store.saveThread(T.tid); T.editGoal = false; T.goalDraft = null; render(); toast('Background saved'); },
  saveTeach: () => { const v = ($('#teachStyle') || {}).value; Store.profile.teachStyle = str(v).slice(0, 6000); Store.saveProfile(); render(); toast('Saved: every tutor and study session follows these'); },
  factDel: i => { const T = TUTOR; if (!T || !T.thread) return; T.thread.facts.splice(+i, 1); Store.saveThread(T.tid); render(); },
  wrapUp: () => wrapUp(),
  studyTopic: k => studyTopic(k)
});

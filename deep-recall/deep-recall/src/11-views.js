/* ------------------------------------------------------------------ views */
const VIEWS = {};
VIEWS.boot = () => `<div class="boot"><span class="pulse"></span>Loading your progress</div>`;

/* ---- shared pieces */
function ring(p, label, cls) { return `<span class="ring ${cls || ''}" style="--p:${Math.max(0, Math.min(100, Math.round(p)))}"><span>${label}</span></span>`; }
function levelTicks(L) {
  const segs = LEVELS.length - 1;
  return `<div class="ticks" style="--n:${segs}" aria-hidden="true">${[...Array(segs)].map((_, i) => `<i class="${i < L.i ? 'on' : i === L.i && L.pct > 0 ? 'half' : ''}"></i>`).join('')}</div>`;
}
function kindLabelOf(s) { const k = kindOf(s); return s.custom ? 'Your subject' : k === 'program' ? (s.skills ? 'Practical skills' : 'Problem-solving track') : k === 'lang' ? 'Language' : k === 'skills' ? 'Practical skills' : 'Knowledge'; }
function lastActive(s) { return Math.max(0, ...nodeKeys(s).map(k => (Store.nodes[k] && Store.nodes[k].last) || 0)); }
/* ---- subject dashboard */
function subjectNext(s) {
  const keys = nodeKeys(s), last = Store.profile.lastNode;
  let k = last && last.split('-')[0] === s.id && topicStage(Store.nodes[last]) < 3 ? last : null;
  if (!k) k = keys.find(x => { const st = topicStage(Store.nodes[x]); return st === 1 || st === 2; });
  if (!k) k = keys.find(x => { const n = Store.nodes[x]; return n && n.due && n.due <= Date.now(); });
  if (!k) k = keys.find(x => topicStage(Store.nodes[x]) === 0);
  return k ? nodeInfo(k) : null;
}
function defaultCourse(s) {
  const info = nodeInfo(Store.profile.lastNode);
  if (info && info.sid === s.id) return info.ui;
  const nx = subjectNext(s);
  return nx ? nx.ui : 0;
}
function nodeRowsHtml(s, ui) {
  return s.units[ui].n.map((t, ni) => {
    const k = s.id + '-' + ui + '-' + ni, n = Store.nodes[k], m = mastery(n), g = openGapsFor(k).length, p = pst(n), st = topicStage(n);
    const due = n && n.due && n.due <= Date.now();
    const bits = [];
    if (st) {
      bits.push(m + '%' + (assistCapped(n) ? ' · solo check' : n.mastery - m >= 8 ? ' fading' : ''));
      if (p.a) bits.push(`${p.c} ${s.lang ? 'right' : 'solved'}`);
      if (g) bits.push(`<span class="g">${g} gap${g > 1 ? 's' : ''}</span>`);
      if (n.proj && n.proj.finished) bits.push('built');
      if (n.study) bits.push('studied in sessions');
      if (due) bits.push('<span class="g">review due</span>');
    }
    return `<button class="prow" data-act="topic" data-arg="${k}">
      <span class="node st${st}"><span>${ni + 1}</span>${due ? '<i class="dot"></i>' : ''}</span>
      <span class="ptext"><span class="ptitle">${esc(t)}</span>${bits.length ? `<span class="pmeta">${bits.join(' · ')}</span>` : ''}</span>
      <span class="pstage s${st}">${STAGES[st]}</span></button>`;
  }).join('');
}
/* the knowledge frontier: untouched topics whose groundwork is in place (Math Academy's idea) */
function frontier(s, limit) {
  const out = [];
  s.units.forEach((u, ui) => u.n.forEach((_, ni) => {
    const k = s.id + '-' + ui + '-' + ni; if (topicStage(Store.nodes[k])) return;
    const prevOk = ni === 0 ? (ui === 0 || startedIn(s, ui - 1).length > 0) : topicStage(Store.nodes[s.id + '-' + ui + '-' + (ni - 1)]) >= 2;
    if (prevOk && !weakPrereqs(k).length) out.push(k);
  }));
  return out.slice(0, limit || 4);
}
function stageLegend() { return `<div class="stage-legend">${STAGES.map((l, i) => `<span><i class="node st${i}"></i>${l}</span>`).join('')}</div>`; }
function pathHtml(s) {
  const k = kindOf(s);
  if (VIEW.course == null) VIEW.course = defaultCourse(s);
  const fr = subjectStats(s).started ? frontier(s, 4) : [];
  return `${fr.length ? `<div class="frontier"><div class="eyebrow">Ready to learn · groundwork in place</div><div class="chips">${fr.map(k => `<button class="chip-btn" data-act="topic" data-arg="${k}">${ic('next', 13)} ${esc(nodeInfo(k).title)}</button>`).join('')}</div></div>` : ''}${stageLegend()}<div class="courses">${s.units.map((u, ui) => {
    const cs = statsFor(unitKeys(s, ui)), open = VIEW.course === ui;
    const prof = unitKeys(s, ui).filter(x => mastery(Store.nodes[x]) >= PROFICIENT).length;
    const meta = [`${u.n.length} topics`, `${prof} proficient`];
    const ex = examRec(s.id, ui); if (ex) meta.push(`exam ${Math.round(ex.best * 100)}%${ex.passed ? ' ✓' : ''}`);
    if (courseComplete(s, ui)) meta.unshift('complete');
    if (k !== 'concept' && cs.a) meta.push(`${cs.c} ${k === 'lang' ? 'right' : 'solved'}`, `${pct(cs.f, cs.a)}% first try`);
    else if (cs.started) meta.push(`${cs.started} started`);
    return `<div><button class="course ${open ? 'open' : ''}" data-act="course" data-arg="${ui}" aria-expanded="${open}">
        <span class="ci">${String(ui + 1).padStart(2, '0')}</span>
        <span><b>${esc(u.t)}</b><span class="meta">${meta.join(' · ')}</span></span>
        <span class="cp">${cs.avg}%</span>
        <span class="tmap" aria-hidden="true">${unitKeys(s, ui).map(k => `<i class="sg${topicStage(Store.nodes[k])}"></i>`).join('')}</span>
      </button>
      ${open ? `<div class="path">${nodeRowsHtml(s, ui)}</div>${courseActions(s, ui)}` : ''}</div>`;
  }).join('')}</div>`;
}
function examReadiness(s) {
  const by = {};
  s.units.forEach((u, ui) => { if (!u.exam) return; const e = by[u.exam] = by[u.exam] || {exam:u.exam, w:0, sum:0, doms:[]}; const avg = statsFor(unitKeys(s, ui)).avg; e.w += u.w; e.sum += u.w * avg; e.doms.push({t:u.t, w:u.w, avg}); });
  return Object.values(by).map(e => Object.assign(e, {pct:Math.round(e.sum / Math.max(1, e.w))}));
}
function goalCardHtml(s) {
  const g = (Store.profile.goals || []).find(x => x.sid === s.id);
  const scopes = [['-1', 'The whole subject']].concat(s.cert ? [['N10-009', 'Network+ N10-009'], ['SY0-701', 'Security+ SY0-701']] : []).concat(s.units.map((u, ui) => [String(ui), u.t]));
  if (VIEW.goalForm) return `<section class="card stack" style="margin-top:10px"><div class="eyebrow">Set a goal</div>
    <label class="small muted" for="goalScope">Make proficient</label><select id="goalScope" class="field">${scopes.map(([v, l]) => `<option value="${esc(v)}" ${g && String(g.ui) === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
    <label class="small muted" for="goalDate">By</label><input id="goalDate" class="field" type="date" value="${g ? g.date : ''}" min="${today()}">
    <div class="row"><button class="btn primary sm" data-act="saveGoal" data-arg="${s.id}">Save goal</button><button class="btn ghost sm" data-act="goalCancel">Cancel</button>${g ? `<button class="btn ghost sm" data-act="goalRemove" data-arg="${s.id}" style="color:var(--bad)">Remove</button>` : ''}</div></section>`;
  if (!g) return `<div class="row" style="margin-top:10px"><button class="btn ghost sm" data-act="goalForm">${ic('flag', 15)} Set a goal with a deadline</button></div>`;
  const st = goalStatus(g);
  return `<section class="card nextcard" style="margin-top:10px"><div class="t"><span class="eyebrow">Goal · ${esc(goalLabel(g))} by ${new Date(g.date + 'T12:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}</span><b>${st.prof}/${st.total} proficient</b><small class="${st.delta < 0 ? 'bad-t' : ''}">${goalLine(g)}</small></div><button class="btn ghost sm" data-act="goalForm">Edit</button></section>`;
}
function courseActions(s, ui) {
  const k = kindOf(s), ai = AI.ok() ? '' : 'disabled', started = startedIn(s, ui).length, ex = examRec(s.id, ui);
  return `<div class="course-acts">
    <button class="btn sm" data-act="mixed" data-arg="${s.id}|${ui}" ${started >= 2 && AI.ok() ? '' : 'disabled'} title="${started < 2 ? 'Start two topics first' : ''}">Mixed practice${started >= 2 ? ` · ${Math.min(8, started)} topics` : ''}</button>
    <button class="btn sm" data-act="exam" data-arg="${s.id}|${ui}" ${ai}>${ex ? (ex.passed ? 'Retake exam' : 'Retake exam · best ' + Math.round(ex.best * 100) + '%') : 'Course exam'}</button>
    ${k !== 'concept' ? `<button class="btn ghost sm" data-act="placement" data-arg="${ui}" ${ai}>Placement test</button>` : ''}
    ${started < 2 ? '<span class="hint" style="flex-basis:100%">Mixed practice opens once you’ve started two topics in this course. The exam works any time; pass at 80% to complete the course.</span>' : ''}
  </div>`;
}
function progressHtml(s) {
  const k = kindOf(s), keys = nodeKeys(s), st = subjectStats(s);
  const dist = STAGES.map((_, i) => keys.filter(x => topicStage(Store.nodes[x]) === i).length);
  const exams = s.cert ? examReadiness(s) : [];
  let h = exams.map(e => `<div class="section-h"><h2>${e.exam} readiness</h2><span class="eyebrow">weighted by exam domain</span></div><section class="card"><div class="spread"><b style="font-family:var(--f-mono);font-size:1.6rem">${e.pct}%</b><span class="muted small">Aim for 85%+ with retention checks passed before booking the exam.</span></div>${e.doms.map(d => `<div class="mrow"><span class="n">${esc(d.t.split('· ')[1] || d.t)} · ${d.w}%</span><span class="bar thin"><i style="width:${d.avg}%"></i></span><span class="v">${d.avg}%</span></div>`).join('')}</section>`).join('') + `<div class="section-h"><h2>Topics by stage</h2><span class="eyebrow">${keys.length} total</span></div>
    <div class="metrics">${STAGES.map((l, i) => `<div class="metric"><span>${l}</span><b>${dist[i]}</b></div>`).join('')}</div>`;
  h += `<div class="section-h"><h2>By course</h2><span class="eyebrow">Mastery</span></div><div class="card">${s.units.map((u, ui) => { const cs = statsFor(unitKeys(s, ui)); return `<div class="mrow"><span class="n">${String(ui + 1).padStart(2, '0')} · ${esc(u.t)}</span><span class="bar thin"><i style="width:${cs.avg}%"></i></span><span class="v">${cs.avg}%</span></div>`; }).join('')}
    <p class="hint" style="margin-top:6px">Mastery fades with time since practice, slower for well-reviewed topics. Reviews restore it.</p></div>`;
  if (k === 'program' || k === 'skills') {
    const skills = skillsFor(keys).slice(0, 16);
    h += `<div class="section-h"><h2>Skills solved</h2><span class="eyebrow">${st.c} total · ${st.a ? pct(st.f, st.a) + '% first try' : '—'}</span></div>`;
    h += skills.length ? `<div class="card"><div class="skills">${skills.map(x => `<span class="skill"><b>${esc(x.name)}</b> · ${x.c}${x.a > x.c ? `/${x.a}` : ''}</span>`).join('')}</div></div>` : `<div class="card empty-state"><b>No problems yet</b>Each problem is tagged with the skill it trains, so counts like “chain rule · 14” build up here.</div>`;
  }
  if (k === 'lang') {
    const errs = errorsFor(keys).slice(0, 10);
    if (errs.length) h += `<div class="section-h"><h2>Your error types</h2></div><div class="card"><div class="skills">${errs.map(([t, c]) => `<span class="skill"><b>${esc(t)}</b> · ${c}</span>`).join('')}</div></div>`;
  }
  h += calCardHtml(s.id);
  const gaps = openGaps().filter(g => g.node.split('-')[0] === s.id).sort((a, b) => (b.hits || 1) - (a.hits || 1)).slice(0, 6);
  if (gaps.length) h += `<div class="section-h"><h2>Open gaps</h2><button class="linkish small" data-act="nav" data-arg="gaps">All gaps</button></div><div class="card stack" style="gap:8px">${gaps.map(g => `<div class="gap-item"><div class="t"><b>${esc(g.concept)}</b><p>${esc(nodeInfo(g.node).title)}</p></div><span class="hits">×${g.hits || 1}</span></div>`).join('')}</div>`;
  return h;
}
function flowPreview(s, self) {
  const k0 = nodeKeys(s)[0], f = topicFlow(nodeInfo(k0), self);
  return f.steps.map((x, i) => `${i + 1}. ${x.label}`).join(' → ');
}
function methodHtml(s) {
  const self = isSelfMode(s.id), r = rungFor(s.id), plan = (Store.profile.plans || {})[s.id];
  return `<p class="muted" style="margin-top:16px;max-width:62ch">One curriculum, two methods. The topics, lessons, problem sets, and your mastery are shared. The method only changes the order of steps on each topic: who does the work first.</p>
  <div class="stack" style="margin-top:14px;gap:8px">
    <button class="choice-card ${self ? '' : 'on'}" data-act="setMode" data-arg="${s.id}|guided" aria-pressed="${!self}">
      <b>Guided${self ? '' : ' · active'}</b><span>Claude teaches first, then tests you. Best when the subject is new.</span><span class="mono-t small" style="color:var(--ink-3)">${flowPreview(s, false)}</span></button>
    <button class="choice-card ${self ? 'on' : ''}" data-act="setMode" data-arg="${s.id}|self" aria-pressed="${self}">
      <b>Self-directed${self ? ' · active' : ''}</b><span>You retrieve, read, and write the questions; Claude checks and fills holes. Builds the skill of teaching yourself.</span><span class="mono-t small" style="color:var(--ink-3)">${flowPreview(s, true)}</span></button>
  </div>
  <div class="section-h"><h2>Learning-how-to-learn ladder</h2><span class="eyebrow">Rung ${r} of 6</span></div>
  <section class="card">
    <p class="muted small" style="margin-bottom:6px">Each rung hands you more control, unlocked by measured skill (brain-dump coverage, self-grading agreement, question quality), not by time.</p>
    <ol class="rungs">${RUNGS.map(x => `<li class="${x.n < r ? 'done' : x.n === r ? 'now' : ''}"><b>${x.title}</b><span>${esc(x.desc)}</span><em>${esc(rungProgress(s.id, x.n))}</em></li>`).join('')}</ol>
  </section>
  <div class="section-h"><h2>Options</h2></div>
  <section class="card stack">
    <label class="toggle"><input type="checkbox" data-act="toggleSelfGrade" data-arg="${s.id}" ${selfGradeOn(s.id) ? 'checked' : ''}> Grade my own written answers before Claude does</label>
    <div class="row"><button class="btn sm" data-act="task" data-arg="plan|${s.id}" ${AI.ok() ? '' : 'disabled'}>${plan ? 'Revise your study plan' : 'Write a study plan'}</button></div>
    ${plan ? `<details class="plan-d"><summary>Your plan · scored ${Math.round((plan.score || 0) * 100)}% · ${ago(plan.at).toLowerCase()}</summary><div class="prose sm">${mdToHtml(plan.text)}</div>${plan.revised ? `<div class="eyebrow" style="margin-top:10px">Claude’s revision</div><div class="prose sm">${mdToHtml(plan.revised)}</div>` : ''}</details>` : ''}
  </section>`;
}
function vocabTabHtml(s) {
  const d = deck(s.id), due = dueCards(s.id).length, known = d.filter(c => c.box >= 3).length;
  return `<div class="metrics" style="margin-top:16px"><div class="metric"><span>In deck</span><b>${d.length}</b></div><div class="metric"><span>Known</span><b>${known}</b></div><div class="metric"><span>Due now</span><b>${due}</b></div></div>
  <div class="row" style="margin-top:12px"><button class="btn primary" data-act="vocab" data-arg="${s.id}" ${d.length && AI.fn ? '' : 'disabled'}>${due ? `Review ${due} word${due > 1 ? 's' : ''}` : 'Review words'}</button></div>
  <p class="muted small" style="margin-top:10px">Words from each lesson and from tutor conversations enter the deck and come back on a spaced schedule. A word counts as known after three successful recalls.</p>
  ${d.length ? `<div class="section-h"><h2>Recently added</h2></div><div class="card">${d.slice(-12).reverse().map(c => `<div class="change"><span>${esc(c.t)}</span><span class="v">${esc(c.m)}${c.box >= 3 ? ' · known' : ''}</span></div>`).join('')}</div>` : ''}`;
}
VIEWS.subject = () => {
  const s = subj(VIEW.sid);
  if (!s) { setTimeout(() => go('library'), 0); return ''; }
  const st = subjectStats(s), k = kindOf(s), L = subjectLevel(s);
  const gapsN = openGaps().filter(g => g.node.split('-')[0] === s.id).length;
  const mins = ((Store.profile.minsBy || {})[s.id]) || 0;
  const tabs = k === 'lang' ? [['path', 'Path'], ['kit', 'Toolkit'], ['progress', 'Progress'], ['vocab', 'Words']] : [['path', 'Path'], ['kit', 'Toolkit'], ['progress', 'Progress'], ['method', 'Method']];
  const tab = tabs.some(t => t[0] === VIEW.tab) ? VIEW.tab : 'path';
  const nx = subjectNext(s), nf = nx && topicFlow(nx);
  const m = (label, v) => `<div class="metric"><span>${label}</span><b>${v}</b></div>`;
  let metrics = m('Mastery', st.avg + '%');
  if (k === 'lang') metrics += m('Words known', deck(s.id).filter(c => c.box >= 3).length) + m('Right', st.c);
  else if (k === 'concept') metrics += m('Started', `${st.started}/${st.keys.length}`) + m('Answers right', st.c || '—');
  else metrics += m('Solved', st.c) + m('First try', st.a ? pct(st.f, st.a) + '%' : '—');
  metrics += m('Time', fmtMins(mins)) + m('Open gaps', gapsN);
  const metricsRow = `<div class="metrics" style="margin-top:16px">${metrics}</div>`;
  const body = tab === 'progress' ? metricsRow + goalCardHtml(s) + progressHtml(s) : tab === 'method' ? methodHtml(s) : tab === 'vocab' ? vocabTabHtml(s) : tab === 'kit' ? kitBookHtml(s) : pathHtml(s);
  return `<div style="--c:${s.color}">
    <header class="subbar">
      <button class="icon-btn" data-act="nav" data-arg="library" aria-label="Back to library">${ic('back', 20)}</button>
      <div class="subbar-t crumbs">Library / <b>${esc(kindLabelOf(s))}</b></div>
      <button class="btn ghost sm" data-act="tutor" data-arg="${s.id}">${s.lang ? 'Conversation' : 'Tutor'}</button>
    </header>
    <section class="subj-top">
      <div class="row" style="gap:12px"><span class="mono">${esc(s.mono)}</span><div class="eyebrow">${esc(kindLabelOf(s))}${k !== 'lang' ? ' · ' + (isSelfMode(s.id) ? 'Self-directed' : 'Guided') : ''}</div></div>
      <h1>${esc(s.name)}</h1>
      <p class="blurb">${esc(s.blurb)}</p>
    </section>
    <section class="panel hud levelcard">
      <div class="lv-num">${String(L.i).padStart(2, '0')}</div>
      <div>
        <div class="lv-name">${L.name}</div>
        <div class="lv-meta">${L.prof} of ${L.total} topics proficient${L.next ? ` · ${L.toNext} more to ${L.next}` : ' · every topic proficient'} · ${fmtMins(mins)} studied${gapsN ? ` · ${gapsN} gap${gapsN > 1 ? 's' : ''}` : ''}</div>
        <div style="margin-top:10px">${levelTicks(L)}</div>
      </div>
    </section>
    ${nx ? `<section class="card nextcard">
      <div class="t"><span class="eyebrow">Up next · ${esc(nx.unit)}</span><b>${esc(nx.title)}</b><small>${nf.next ? `${esc(nf.next.label)} · ${esc(nf.next.desc)}` : esc(STAGES[topicStage(Store.nodes[nx.key])])}</small></div>
      <button class="btn primary sm" data-act="topic" data-arg="${nx.key}">Open</button></section>` : ''}
    ${s.kit ? `<details class="card" style="margin-top:10px"><summary><b>What you’ll need</b></summary><p class="muted small" style="margin-top:8px">${esc(s.kit)}</p></details>` : ''}
    <nav class="tabbar" role="tablist">${tabs.map(([id, l]) => `<button role="tab" class="${tab === id ? 'on' : ''}" aria-selected="${tab === id}" data-act="subjTab" data-arg="${id}">${l}</button>`).join('')}</nav>
    ${body}
    ${VIEW.confirmRemove ? `<div class="confirm" style="margin-top:22px"><b>Remove “${esc(s.name)}”?</b><span class="small">Its course path is deleted. Progress on its lessons stays in storage but won’t show.</span><div class="row"><button class="btn danger sm" data-act="doRemove" data-arg="${s.id}">Remove</button><button class="btn ghost sm" data-act="cancelRemove">Keep it</button></div></div>` : ''}
    <div class="row" style="margin-top:26px;border-top:1px solid var(--line);padding-top:14px">
      ${k === 'concept' ? `<button class="btn ghost sm" data-act="diagnostic" data-arg="${s.id}" ${AI.ok() ? '' : 'disabled'}>Diagnostic across the whole subject</button>` : ''}
      ${s.custom && !VIEW.confirmRemove ? `<button class="btn ghost sm" data-act="askRemove" style="color:var(--bad)">Remove subject</button>` : ''}
    </div>
  </div>`;
};

VIEWS.lesson = () => {
  const info = nodeInfo(LESSON && LESSON.key);
  if (!info) { setTimeout(() => go('home'), 0); return ''; }
  return `<div style="--c:${info.subject.color}">
    <header class="subbar">
      <button class="icon-btn" data-act="leaveLesson" aria-label="Back to topic">${ic('back', 20)}</button>
      <div class="subbar-t crumbs">${esc(info.subject.name)} / <b>${esc(info.title)}</b></div>
      <button class="btn ghost sm" data-act="tutorAbout" data-arg="${info.key}">Tutor</button>
    </header>
    <article id="lessonBody" class="prose"></article>
    <div id="lessonAfter"></div>
  </div>`;
};

/* ---- Review and Gaps share a tab: what's due, and what's broken */
function reviewTabs(cur) {
  const due = dueNodes().length + SUBJECTS.filter(x => x.lang).reduce((a, x) => a + dueCards(x.id).length, 0), g = openGaps().length;
  return `<div class="seg compact rtabs" role="tablist">${[['review', 'Due', due], ['gaps', 'Gaps', g]].map(([id, l, n]) => `<button role="tab" class="${cur === id ? 'on' : ''}" aria-selected="${cur === id}" data-act="nav" data-arg="${id}"><b>${l}${n ? ` · ${n}` : ''}</b></button>`).join('')}</div>`;
}
/* ---- Review */
VIEWS.review = () => {
  const due = dueNodes();
  const scheduled = Object.values(Store.nodes).filter(n => n.due && nodeInfo(n.key));
  const langs = SUBJECTS.filter(s => s.lang && deck(s.id).length);
  const days = [...Array(7)].map((_, d) => {
    const start = new Date(); start.setHours(0, 0, 0, 0); const s = start.getTime() + d * DAY, e = s + DAY;
    const c = scheduled.filter(n => d === 0 ? n.due < e : (n.due >= s && n.due < e)).length;
    return {label:d === 0 ? 'Today' : new Date(s).toLocaleDateString(undefined, {weekday:'short'}), c};
  });
  const n6 = Math.min(6, due.length);
  return `<header class="page-h"><h1>Review</h1>${reviewTabs('review')}<p class="muted">Each topic returns just before you’d forget it, and the interval grows every time you recall it well.</p></header>
  ${banners()}
  <section class="panel hud review-hero">
    <div><div class="eyebrow">Topics due now</div><span class="big">${due.length}</span></div>
    <button class="btn primary" data-act="startReview" ${due.length && AI.ok() ? '' : 'disabled'}>${due.length ? `Start review · ${n6} topic${n6 > 1 ? 's' : ''}` : 'Nothing due'}</button>
  </section>
  ${langs.length ? `<div class="section-h"><h2>Vocabulary</h2></div><div class="lib">${langs.map(s => { const d = dueCards(s.id).length; return `<button class="lib-row" data-act="vocab" data-arg="${s.id}" style="--c:${s.color}" ${AI.fn ? '' : 'disabled'}><span class="mono">${esc(s.mono)}</span><span class="t"><span class="ln">${esc(s.name)} words</span><span class="lm"><span>${d} due</span><span>${deck(s.id).length} in deck</span></span></span><span class="lr"><span class="pstage ${d ? 's3' : ''}">${d ? 'Review' : 'Up to date'}</span></span></button>`; }).join('')}</div>` : ''}
  ${due.length ? `<div class="section-h"><h2>Due topics</h2></div><div class="lib">${due.map(n => { const i = nodeInfo(n.key); return `<button class="lib-row" data-act="topic" data-arg="${n.key}" style="--c:${i.subject.color}"><span class="mono">${esc(i.subject.mono)}</span><span class="t"><span class="ln">${esc(i.title)}</span><span class="lm"><span>${mastery(n)}% now · was ${n.mastery || 0}%</span><span>last ${ago(n.last).toLowerCase()}</span></span></span><span class="lr"></span></button>`; }).join('')}</div>` : ''}
  ${workloadHtml()}
  <div class="section-h"><h2>Coming up</h2></div>
  ${scheduled.length ? `<div class="week">${days.map(d => `<div class="${d.c ? '' : 'z'}"><span>${d.label}</span><b>${d.c}</b></div>`).join('')}</div>` :
    `<div class="card empty-state"><b>Nothing scheduled yet</b>Every topic you practice gets a review date. Strong answers push it further out; weak ones bring it back tomorrow.</div>`}`;
};

/* ---- Gaps */
VIEWS.gaps = () => {
  const open = openGaps();
  const groups = {};
  open.forEach(g => { (groups[g.node] = groups[g.node] || []).push(g); });
  const keys = Object.keys(groups).sort((a, b) => groups[b].reduce((x, g) => x + (g.hits || 1), 0) - groups[a].reduce((x, g) => x + (g.hits || 1), 0));
  const resolved = Object.values(Store.gaps).filter(g => g.status === 'resolved' && nodeInfo(g.node)).sort((a, b) => (b.resolvedAt || 0) - (a.resolvedAt || 0));
  const roots = new Set(open.map(g => g.root).filter(r => r && nodeInfo(r)));
  return `<header class="page-h"><h1>Gaps</h1>${reviewTabs('gaps')}<p class="muted">Every miss is diagnosed into the specific concept you’re missing and traced to a prerequisite when that’s the real cause. A gap closes when you get its retest right.</p></header>
  ${banners()}
  <div class="metrics m4" style="margin-top:12px"><div class="metric"><span>Open</span><b>${open.length}</b></div><div class="metric"><span>Topics</span><b>${keys.length}</b></div><div class="metric"><span>Root causes</span><b>${roots.size}</b></div><div class="metric"><span>Closed</span><b>${resolved.length}</b></div></div>
  ${keys.length ? keys.map(k => {
    const i = nodeInfo(k), gs = groups[k].sort((a, b) => (b.hits || 1) - (a.hits || 1));
    const rs = [...new Set(gs.map(g => g.root).filter(r => r && nodeInfo(r)))];
    return `<section class="card gap-group" style="--c:${i.subject.color};margin-top:12px">
      <div class="gap-group-h"><span class="mono">${esc(i.subject.mono)}</span><div class="t"><button class="linkish" style="text-decoration:none;color:var(--ink)" data-act="topic" data-arg="${k}"><b>${esc(i.title)}</b></button><span>${esc(i.subject.name)} · ${esc(i.unit)} · ${gs.length} open</span></div>
      <button class="btn warn sm" data-act="repair" data-arg="${k}" ${AI.ok() ? '' : 'disabled'}>Repair</button></div>
      ${rs.length ? `<div class="notice" style="margin-top:0">Traces back to a prerequisite. Repairing the root first usually clears these faster: ${rs.map(r => `<button class="linkish" data-act="repair" data-arg="${r}" ${AI.ok() ? '' : 'disabled'}>${esc(nodeInfo(r).title)} (${esc(nodeInfo(r).subject.name)})</button>`).join(', ')}</div>` : ''}
      ${gs.map(g => `<div class="gap-item"><div class="t"><b>${fieldHtml(g.concept)}</b><p>${fieldHtml(g.detail)}</p>${g.root && nodeInfo(g.root) ? `<p class="root">Likely root: ${esc(nodeInfo(g.root).title)}${g.rootWhy ? ' · ' + esc(g.rootWhy) : ''}</p>` : ''}${g.from && nodeInfo(g.from) ? `<p class="root">Surfaced in ${esc(nodeInfo(g.from).title)}</p>` : ''}</div><div class="stack" style="gap:4px;align-items:flex-end"><span class="hits">×${g.hits || 1}</span><button class="btn ghost sm" data-act="dismissGap" data-arg="${esc(g.id)}" aria-label="Mark ${esc(g.concept)} as understood">Got it now</button></div></div>`).join('')}
    </section>`;
  }).join('') : `<div class="card empty-state" style="margin-top:12px"><b>No open gaps</b>Gaps appear after problem sets, practice, brain dumps, pre-tests, and diagnostics.</div>`}
  ${resolved.length ? `<div style="margin-top:22px"><button class="btn ghost sm" data-act="toggleResolved">${SHOW_RESOLVED ? 'Hide' : 'Show'} closed gaps (${resolved.length})</button></div>
    ${SHOW_RESOLVED ? `<div class="card stack" style="margin-top:10px">${resolved.slice(0, 40).map(g => `<div class="gap-item resolved"><div class="t"><b>${esc(g.concept)}</b><p>${esc(nodeInfo(g.node).title)} · closed ${ago(g.resolvedAt).toLowerCase()}</p></div></div>`).join('')}</div>` : ''}` : ''}`;
};

/* ---- calibration + meta-skill cards (You page; calibration also per subject) */
function calCardHtml(sid) {
  const c = calStats(sid), where = sid ? 'in this subject' : '';
  const head = `<div class="section-h"><h2>Calibration</h2><span class="eyebrow">${c.n} rated answers</span></div>`;
  if (c.n < 10) return head + `<section class="card"><p class="muted small">Before each answer you rate how sure you are. After ${10 - c.n} more rated answers ${where}, this shows whether your certainty matches reality: the core skill of knowing what you don’t know.</p></section>`;
  const verdict = c.over > 0.05 ? `<b>Overconfident by ${Math.round(c.over * 100)} points</b>: you feel surer than your results justify.` : c.over < -0.05 ? `<b>Underconfident by ${Math.round(-c.over * 100)} points</b>: you know more than you think.` : '<b>Well calibrated</b>: confidence matches accuracy.';
  return head + `<section class="card">
    <p style="margin:0 0 12px">${verdict} <span class="muted small">Brier ${c.brier.toFixed(2)} (0 perfect, 0.25 coin-flip).</span></p>
    ${c.bins.map(b => `<div class="calrow"><span class="n">${b.label} <em>${b.v}%</em></span><span class="calbar"><i class="stated" style="left:${b.v}%"></i>${b.acc != null ? `<i class="actual" style="width:${Math.round(b.acc * 100)}%"></i>` : ''}</span><span class="v">${b.acc != null ? Math.round(b.acc * 100) + '% · ' + b.n : '—'}</span></div>`).join('')}
    <p class="hint" style="margin-top:8px">Bar: how often you were right at that confidence. Tick: the confidence you claimed. Calibrated learners line up.</p></section>`;
}
function metaCardHtml() {
  const rows = [['dump', 'Brain-dump coverage'], ['summary', 'Source summaries'], ['qwrite', 'Question writing'], ['selfgrade', 'Self-grading agreement'], ['plan', 'Study planning'], ['argue', 'Argumentation']];
  const got = rows.map(([k, l]) => ({l, m:metaAvg('all', k)})).filter(x => x.m);
  return `<div class="section-h"><h2>Learning-how-to-learn</h2></div><section class="card">
    ${got.length ? got.map(x => `<div class="mrow"><span class="n">${x.l} · ${x.m.n}</span><span class="bar thin"><i style="width:${Math.round(x.m.avg * 100)}%"></i></span><span class="v">${Math.round(x.m.avg * 100)}%</span></div>`).join('')
      : '<p class="muted small">Fills in as you brain-dump, summarize sources, write your own questions, grade yourself, plan, and argue. Each subject’s ladder uses these to hand you more control.</p>'}</section>`;
}

VIEWS.add = () => {
  const r = ADD.result;
  const sugg = ['Game theory', 'The Byzantine Empire', 'Quantum computing', 'Behavioral economics', 'Military strategy', 'Evolutionary psychology'];
  return `<header class="subbar"><button class="icon-btn" data-act="nav" data-arg="library" aria-label="Back to library">${ic('back', 20)}</button><div class="subbar-t crumbs">Library / <b>Add a subject</b></div></header>
  <header class="page-h"><h1>Add a subject</h1><p class="muted">Name any field, era, region, or question. Claude drafts a full course path you study like the built-in subjects.</p></header>
  ${banners()}
  <form id="addForm" class="stack" style="margin-top:10px">
    <label class="eyebrow" for="addInput">Subject</label>
    <input id="addInput" class="field" data-inp="add" value="${esc(ADD.text)}" placeholder="e.g. The history of cryptography" autocomplete="off" maxlength="120">
    <div class="row"><button class="btn primary" type="submit" ${ADD.status === 'loading' || !AI.ok() ? 'disabled' : ''}>${ADD.status === 'loading' ? 'Drafting…' : 'Draft the course'}</button>
    ${ADD.status === 'loading' ? '<button class="btn ghost" type="button" data-act="stopAdd">Stop</button>' : ''}</div>
  </form>
  ${ADD.status === 'loading' ? '<div class="thinking"><span class="pulse"></span>Designing units and lessons. This takes 10–40 seconds.</div>' : ''}
  ${ADD.status === 'error' ? `<div class="notice bad">${esc(ADD.err)}</div>` : ''}
  ${!r && ADD.status !== 'loading' ? `<div style="margin-top:18px"><div class="eyebrow" style="margin-bottom:8px">Ideas</div><div class="chips">${sugg.map(s => `<button class="chip-btn" data-act="addSuggest" data-arg="${esc(s)}" ${AI.ok() ? '' : 'disabled'}>${esc(s)}</button>`).join('')}</div></div>` : ''}
  ${r ? `<section class="card stack" style="margin-top:18px;--c:${r.color}">
      <div class="gap-group-h"><span class="mono">${esc(r.mono)}</span><div class="t"><b style="font-size:1.2rem">${esc(r.name)}</b><span>${esc(r.blurb)}</span></div></div>
      ${r.units.map((u, i) => `<div><div class="eyebrow">${String(i + 1).padStart(2, '0')}</div><b>${esc(u.t)}</b><ol class="small muted" style="margin:6px 0 0;padding-left:1.3em">${u.n.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>`).join('')}
      <div class="row"><button class="btn primary" data-act="saveSubject">Add to library</button><button class="btn ghost" data-act="genSubject">Draft it again</button></div>
    </section>` : ''}`;
};

VIEWS.tutor = () => {
  const T = TUTOR; const s = T && subj(T.sid);
  if (!s) { setTimeout(() => go('home'), 0); return ''; }
  const st = subjectStats(s), gapsN = openGaps().filter(g => g.node.split('-')[0] === s.id).length;
  const activeSession = SESSION && SESSION.phase !== 'summary' && !SESSION.finished && SESSION.questions.length;
  const focus = T.focus && nodeInfo(T.focus);
  const notes = T.t && T.t.notes;
  const th = T.tid ? T.thread : null;
  const back = th ? 'data-act="nav" data-arg="study" aria-label="Back to study sessions"' : focus ? `data-act="topic" data-arg="${focus.key}" aria-label="Back to ${esc(focus.title)}"` : `data-act="subject" data-arg="${s.id}" aria-label="Back to ${esc(s.name)}"`;
  return `<div class="tview" style="--c:${s.color}">
    <header class="subbar">
      <button class="icon-btn" ${back}>${ic('back', 20)}</button>
      <div class="subbar-t crumbs">${th ? 'Study / <b>' + esc(th.title) + '</b>' : esc(s.name) + ' / <b>' + (s.lang ? 'Conversation' : 'Tutor') + '</b>'}</div>
      ${activeSession ? '<button class="btn sm" data-act="backToSession">Back to session</button>' : ''}
      ${th ? `<button class="btn sm" data-act="wrapUp" ${T.busy || !(T.t && T.t.messages.length) || !AI.ok() ? 'disabled' : ''}>Wrap up</button>` : T.confirmClear ? '<button class="btn danger sm" data-act="tutorClear">Clear chat</button><button class="btn ghost sm" data-act="tutorClearCancel">Keep</button>' : `<button class="icon-btn" data-act="tutorClearAsk" aria-label="Clear conversation" title="Clear conversation" ${T.t && T.t.messages.length ? '' : 'disabled'}>${ic('trash', 18)}</button>`}
    </header>
    <div class="ctx-strip">
      ${th ? `<span class="ctx on">${esc(s.name)} · ${Object.keys(th.topics || {}).length} topic${Object.keys(th.topics || {}).length === 1 ? '' : 's'} recorded</span>` : ''}<span class="ctx">Sees: ${st.started} topics started${kindOf(s) !== 'concept' ? ` · ${st.c} ${s.lang ? 'right' : 'solved'}` : ''} · ${gapsN} gaps</span>
      <span class="ctx ${WEB.ready() ? 'on' : ''}">${WEB.ready() ? 'Web on' : 'Web off'}</span>
      ${focus ? `<span class="ctx on">Focus: ${esc(focus.title)} <button class="linkish small" data-act="tutorUnfocus" aria-label="Clear focus">×</button></span>` : ''}
      <button class="ctx ctx-b" data-act="tutorNotes" aria-expanded="${!!T.showNotes}">${th ? (T.showNotes ? 'Hide' : 'Show') + ' where we left off' : (T.showNotes ? 'Hide' : 'Show') + ' notes' + (notes ? '' : ' (none yet)')}</button>
    </div>
    ${T.showNotes && th ? threadPanelHtml(th) : ''}${T.showNotes && !th ? `<section class="card notes"><div class="eyebrow">What your tutor has learned about how you learn ${esc(s.name)}</div>${notes ? `<div class="prose sm">${mdToHtml(notes)}</div><div><button class="btn ghost sm" data-act="tutorNotesClear">Clear these notes</button></div>` : '<p class="muted small">Notes build up every few exchanges: recurring confusions, explanations that worked, your goals.</p>'}</section>` : ''}
    <div id="tlog"></div>
    <form id="tutorComposer" class="composer">
      ${quickRow(T)}
      ${T.img ? `<span class="attach-chip">${ic('camera', 14)} ${esc(T.img.name || 'Photo')}<button type="button" class="icon-btn" style="width:26px;height:26px" data-act="tutorImgClear" aria-label="Remove photo">${ic('close', 14)}</button></span>` : ''}
      <div class="composer-row">
        ${AI.images ? `<label class="icon-btn" for="tutorFile" title="Attach a photo of your work" aria-label="Attach a photo">${ic('camera', 20)}</label><input type="file" id="tutorFile" class="vh" accept="${esc(AI.imgTypes)}" data-file="tutor">` : ''}
        <label class="vh" for="tin">Message the tutor</label>
        <textarea id="tin" data-inp="tin" rows="1" placeholder="${s.lang ? `Write in ${esc(s.lang.name)} or ${esc(s.lang.base)}` : `Ask about any ${esc(s.name.toLowerCase())} topic, or paste a problem`}">${esc(T.draft || '')}</textarea>
        ${T.busy ? '<button class="btn sm" type="button" data-act="tutorStopView">Stop</button>' : `<button class="btn primary" type="submit" aria-label="Send" ${AI.ok() ? '' : 'disabled'}>${ic('send', 17)}</button>`}
      </div>
    </form>
  </div>`;
};

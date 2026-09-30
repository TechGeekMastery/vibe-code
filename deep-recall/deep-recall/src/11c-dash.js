/* ------------------------------------------------------------------ Today, Library, Progress, Settings */
const DOMAINS = [
  {id:'sci', name:'Math & Sciences', icon:'learn', ids:['mth', 'sts', 'phy', 'chm', 'bio', 'astro', 'neuro', 'viro']},
  {id:'comp', name:'Computing & Security', icon:'doc', ids:['cs', 'py', 'ai', 'cyber', 'cert']},
  {id:'hum', name:'Humanities & Society', icon:'book', ids:['hist', 'phil', 'rel', 'geo', 'econ', 'epi']},
  {id:'lang', name:'Languages', icon:'speaker', ids:['de', 'ca']},
  {id:'make', name:'Hands-on', icon:'flag', ids:['elx', 'rob', 'mak']}
];

/* ---- small visual pieces */
function stageDist(s) { const d = [0, 0, 0, 0, 0]; nodeKeys(s).forEach(k => { d[topicStage(Store.nodes[k])]++; }); return d; }
function stageStrip(d) {
  const tot = d.reduce((a, b) => a + b, 0) || 1;
  return `<span class="sstrip" role="img" aria-label="${STAGES.map((l, i) => `${d[i]} ${l.toLowerCase()}`).join(', ')}">${d.map((c, i) => i && c ? `<i class="sg${i}" style="width:${(c / tot * 100).toFixed(2)}%" title="${c} ${STAGES[i].toLowerCase()}"></i>` : '').join('')}</span>`;
}
function subjTile(s, withNext) {
  const d = stageDist(s), tot = d.reduce((a, b) => a + b, 0), started = tot - d[0], prof = d[3] + d[4], L = subjectLevel(s);
  const nx = withNext && started ? subjectNext(s) : null;
  return `<button class="stile ${started ? '' : 'fresh'}" data-act="subject" data-arg="${s.id}" style="--c:${s.color}">
    <span class="stile-h"><span class="mono">${esc(s.mono)}</span>${started ? ring(prof / Math.max(1, tot) * 100, prof ? String(prof) : '0', 'sm') : ''}</span>
    <b class="stile-n">${esc(s.name)}</b>
    <span class="stile-m">${started ? `Lv ${L.i} · ${L.name}` : `${tot} topics`}</span>
    ${stageStrip(d)}
    <span class="stile-f">${nx ? `Next: ${esc(nx.title)}` : started ? `${started}/${tot} started · ${prof} proficient` : esc(kindLabelOf(s))}</span>
  </button>`;
}
function tierChip() {
  const ts = tierState();
  return `<button class="tierchip" data-act="nav" data-arg="progress" title="Your tier: ${esc(ts.tier.name)}${ts.next ? ` · ${ts.pct}% to ${esc(ts.next.name)}` : ''}">${tierEmblem(ts.i, 22)}<span>${esc(ts.tier.name)}</span></button>`;
}

/* ---- Today: one clear next action, quick access, then the plan */
VIEWS.home = () => {
  const p = Store.profile, t = today(), xp = (p.xpByDay && p.xpByDay[t]) || 0, goal = p.goal || 50;
  const streak = streakNow(), plan = dailyPlan(), first = plan.find(x => x.primary) || plan[0], rest = plan.filter(x => x !== first);
  const due = dueNodes().length + SUBJECTS.filter(x => x.lang).reduce((a, x) => a + dueCards(x.id).length, 0), gaps = openGaps().length;
  const ts = tierState(), ths = threads(x => x.status !== 'archived');
  const active = allSubjects().filter(s => subjectStats(s).started).sort((a, b) => lastActive(b) - lastActive(a)).slice(0, 6);
  const aiNeed = a => !['topic', 'thread'].includes(a) && !AI.ok();
  const days = [...Array(7)].map((_, i) => { const ts2 = Date.now() - (6 - i) * DAY, dk = dayKey(ts2), r = dayRec(dk); return {dk, m:r.m, x:r.x, label:new Date(ts2).toLocaleDateString(undefined, {weekday:'narrow'}), today:i === 6}; });
  const maxM = Math.max(30, ...days.map(d => d.m));
  const tiny = tinyStep(), wkp = (p.weeks || {})[weekKey()] || {}, focus = subj(wkp.focus);
  const fk = first && first.act === 'topic' && nodeInfo(first.arg) ? first.arg : null, ff = fk ? topicFlow(nodeInfo(fk)) : null;
  const fSteps = ff ? ff.steps.filter(x => !x.skip && !x.optional) : [], fDone = fSteps.filter(x => x.done).length;
  const tile = (act, arg, icon, label, val, sub) => `<button class="qtile" data-act="${act}" data-arg="${arg}">${ic(icon, 20)}<b>${label}</b><span class="qv">${val}</span><span class="qs">${sub}</span></button>`;
  return `<header class="topbar">
      <div class="brand"><span class="brand-mark">DR</span><span>Deep Recall</span></div>
      <div class="stats">${tierChip()}<span class="stat fire" title="Day streak">${ic('flame', 15)}<span class="num">${streak}</span></span></div>
    </header>
  ${banners()}
  ${onboardHtml()}
  ${freshCardHtml()}
  ${first ? `<section class="panel hud continue">
    <div class="eyebrow">${first.act === 'thread' ? 'Pick up where you left off' : 'Up next'}</div>
    <h1>${esc(first.title)}</h1>
    <p class="sub">${esc(first.desc)}</p>
    ${fSteps.length > 1 ? `<div class="cprog"><span class="bar"><i style="width:${fDone / fSteps.length * 100}%"></i></span><span class="mono-t small">step ${Math.min(fSteps.length, fDone + 1)} of ${fSteps.length}${fDone ? ` · ${fSteps.length - fDone} to go` : ''}</span></div>` : ''}
    <div class="row" style="margin-top:14px"><button class="btn primary" data-act="${first.act}" data-arg="${esc(first.arg || '')}" ${aiNeed(first.act) ? 'disabled' : ''}>${ic('play', 16)} Continue</button><span class="muted small">~${first.mins} min</span>${tiny && !(tiny.act === first.act && tiny.arg === first.arg) ? `<button class="btn ghost sm" data-act="${tiny.act}" data-arg="${esc(tiny.arg)}" title="${esc(tiny.label)}" style="margin-left:auto">Only 5 min?</button>` : ''}</div>
  </section>` : ''}
  ${planLineHtml()}
  ${focus || wkp.note ? `<p class="weekline small muted">This week${focus ? `: focus on <b>${esc(focus.name)}</b>` : ''}${wkp.note ? `${focus ? ' · ' : ': '}“${esc(wkp.note)}”` : ''}</p>` : ''}
  <div class="qgrid">
    ${tile('nav', 'study', 'chat', 'Study', ths.length || 'New', ths.length ? 'sessions' : 'start a session')}
    ${tile('nav', 'review', 'review', 'Review', due, due ? 'due now' : 'all caught up')}
    ${tile('nav', 'gaps', 'gaps', 'Gaps', gaps, gaps ? 'to repair' : 'none open')}
    ${tile('nav', 'progress', 'chart', 'Progress', ts.pct + '%', ts.next ? 'to ' + esc(ts.next.name) : 'top tier')}
  </div>
  <section class="card todaycard">
    ${ring(xp / goal * 100, String(xp), 'mid')}
    <div class="stack" style="gap:4px;min-width:0">
      <b>${xp >= goal ? 'Daily goal met' : `${goal - xp} XP to today’s goal`}</b>
      <span class="muted small">${fmtMins(minutesOn(t))} studied today · ${streak ? `${streak}-day streak` : 'start a streak today'}${p.freezes ? ` · ${p.freezes} freeze${p.freezes > 1 ? 's' : ''}` : ''}</span>
    </div>
    <div class="mini7" aria-label="Minutes studied, last 7 days">${days.map(d => `<div title="${d.dk}: ${fmtMins(d.m)} · ${d.x} XP"><i class="${d.m ? '' : 'zero'} ${d.today ? 'today' : ''}" style="height:${Math.max(2, d.m / maxM * 34)}px"></i><span>${d.label}</span></div>`).join('')}</div>
  </section>
  ${rest.length ? `<div class="section-h"><h2>Also today</h2><span class="eyebrow">~${rest.reduce((a, x) => a + (x.mins || 0), 0)} min</span></div>
  <div class="plan">${rest.map(it => `<button class="plan-item" data-act="${it.act}" data-arg="${esc(it.arg || '')}" ${aiNeed(it.act) ? 'disabled' : ''}>
      <span class="pi-ic">${ic(it.icon, 17)}</span><span><b>${esc(it.title)}</b><small>${esc(it.desc)}</small></span><span class="pi-t">~${it.mins}m</span></button>`).join('')}</div>` : ''}
  ${(p.goals || []).length ? `<div class="section-h"><h2>Goals</h2></div><div class="lib">${p.goals.map(g => { const st = goalStatus(g), sb = subj(g.sid); return sb ? `<button class="lib-row" data-act="subject" data-arg="${g.sid}" style="--c:${sb.color}"><span class="mono">${ic('flag', 16)}</span><span class="t"><span class="ln">${esc(goalLabel(g))}</span><span class="lm"><span>${st.prof}/${st.total} proficient</span><span>${goalLine(g)}</span></span></span><span class="lr"><span class="bar thin"><i style="width:${st.total ? st.prof / st.total * 100 : 0}%"></i></span></span></button>` : ''; }).join('')}</div>` : ''}
  <div class="section-h"><h2>Your subjects</h2><button class="linkish small" data-act="nav" data-arg="library">All subjects</button></div>
  ${active.length ? `<div class="sgrid">${active.map(s => subjTile(s, true)).join('')}</div>` : `<div class="card empty-state"><b>Nothing started yet</b>Open the Library, pick a subject, and its first topic shows you exactly what to do.<div class="row" style="justify-content:center;margin-top:10px"><button class="btn sm" data-act="nav" data-arg="library">Open the Library</button></div></div>`}
  <div class="section-h"><h2>Study what you’re reading</h2></div>
  <div class="lib"><button class="lib-row" data-act="source" data-arg=""><span class="mono">${ic('doc', 17)}</span><span class="t"><span class="ln">Bring in a source</span><span class="lm"><span>Article, chapter, link, or a photo of a page → lesson or summary-from-memory</span></span></span><span class="lr">${ic('next', 16)}</span></button></div>`;
};

/* ---- Library: grouped by field, visual tiles, search across every topic */
function libResultsHtml(q) {
  const hits = findTopics(q, 14);
  if (!hits.length) return `<p class="muted small" style="margin-top:12px">No topic matches “${esc(q)}”.</p>`;
  return `<div class="lib" style="margin-top:12px">${hits.map(h => { const i = nodeInfo(h.id), st = topicStage(Store.nodes[h.id]); return `<button class="lib-row" data-act="topic" data-arg="${h.id}" style="--c:${i.subject.color}"><span class="mono">${esc(i.subject.mono)}</span><span class="t"><span class="ln">${esc(h.title)}</span><span class="lm"><span>${esc(h.subject)}</span><span>${esc(h.course)}</span></span></span><span class="lr"><span class="pstage s${st}">${STAGES[st]}</span></span></button>`; }).join('')}</div>`;
}
VIEWS.library = () => {
  const all = allSubjects(), q = VIEW.q || '', seen = new Set();
  const groups = DOMAINS.map(d => { const list = d.ids.map(id => all.find(s => s.id === id)).filter(Boolean); list.forEach(s => seen.add(s.id)); return Object.assign({}, d, {list}); });
  const rest = all.filter(s => !seen.has(s.id));
  if (rest.length) groups.push({id:'mine', name:'Your subjects', icon:'plus', list:rest});
  const started = all.filter(s => subjectStats(s).started).length;
  return `<header class="page-h"><h1>Library</h1><p class="muted">${all.length} subjects · ${started} started. Each tile’s strip shows its topics by stage.</p></header>
  ${banners()}
  <div class="searchbox">${ic('search', 17)}<label class="vh" for="libQ">Search every topic</label><input id="libQ" data-inp="libQ" value="${esc(q)}" placeholder="Search every topic: chain rule, Kant, subnetting…" autocomplete="off"></div>
  <div id="libResults">${q.trim().length > 2 ? libResultsHtml(q) : ''}</div>
  ${stageLegend()}
  ${groups.filter(g => g.list.length).map(g => `<div class="section-h"><h2>${esc(g.name)}</h2><span class="eyebrow">${g.list.length}</span></div><div class="sgrid">${g.list.map(s => subjTile(s, false)).join('')}</div>`).join('')}
  <div class="sgrid" style="margin-top:12px"><button class="stile addtile" data-act="nav" data-arg="add">${ic('plus', 22)}<b class="stile-n">Add any subject</b><span class="stile-f">Claude drafts a full course path</span></button></div>`;
};

/* ---- charts: single hue, thin marks, recessive axes, hover titles */
function colChart(data, o) {
  o = o || {};
  const max = Math.max(o.min || 1, ...data.map(d => d.v)), every = o.every || 1;
  return `<div class="colchart" style="--h:${o.h || 110}px" role="img" aria-label="${esc(o.label || '')}">
    <span class="cc-max">${esc(o.fmt ? o.fmt(max) : String(max))}</span>
    <div class="cc-plot">${data.map((d, i) => `<div class="cc-col ${d.cur ? 'cur' : ''}" title="${esc(d.tip)}"><i style="height:${d.v ? Math.max(3, d.v / max * 100) : 0}%"></i><span>${i % every === 0 || d.cur ? esc(d.label) : ''}</span></div>`).join('')}</div></div>`;
}
function heatmap(weeks) {
  const start = new Date(); start.setHours(12, 0, 0, 0); start.setDate(start.getDate() - start.getDay() - (weeks - 1) * 7);
  const cells = [], vals = [];
  for (let i = 0; i < weeks * 7; i++) { const d = new Date(start.getTime() + i * DAY), dk = dayKey(d.getTime()), future = d.getTime() > Date.now(); const m = future ? -1 : dayRec(dk).m; cells.push({dk, m, d}); if (m > 0) vals.push(m); }
  const lvl = m => m < 0 ? 'fut' : !m ? 'h0' : m < 15 ? 'h1' : m < 40 ? 'h2' : m < 90 ? 'h3' : 'h4';
  const months = [...Array(weeks)].map((_, w) => { const d = cells[w * 7].d; return d.getDate() <= 7 ? d.toLocaleDateString(undefined, {month:'short'}) : ''; });
  return `<div class="heat" style="--w:${weeks}"><div class="heat-m">${months.map(m => `<span>${m}</span>`).join('')}</div>
    <div class="heat-g">${cells.map(c => `<i class="${lvl(c.m)}" ${c.m >= 0 ? `title="${c.d.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})}: ${fmtMins(c.m)}"` : ''}></i>`).join('')}</div>
    <div class="heat-k"><span>Less</span>${['h0', 'h1', 'h2', 'h3', 'h4'].map(h => `<i class="${h}"></i>`).join('')}<span>More</span><span class="muted" style="margin-left:auto">${vals.length} days with study time</span></div></div>`;
}

/* ---- Progress: the character, the numbers, the feats */
function periodTotals(per) {
  if (per !== 'all') { const t = rangeTotals(per === 'day' ? 1 : per === 'week' ? 7 : 30); return t; }
  const P = Store.profile, L = lifeStats();
  const keys = new Set([...Object.keys(P.days || {}), ...Object.keys(P.xpByDay || {}), ...Object.keys(P.mins || {})]);
  const active = [...keys].filter(k => { const r = dayRec(k); return r.m || r.x; }).length;
  return {m:Object.values(P.minsBy || {}).reduce((a, b) => a + b, 0), x:P.xp || 0, a:L.attempted, c:L.correct, b:L.bits, s:Object.values(P.days || {}).reduce((a, r) => a + (r.s || 0), 0), active};
}
function tierCardHtml(ts, big) {
  return `<section class="panel hud tiercard ${big ? 'big' : ''}">
    <div class="tier-glyph">${tierEmblem(ts.i, big ? 88 : 64)}</div>
    <div style="min-width:0">
      <div class="eyebrow">Tier ${ts.i + 1} of ${TIERS.length}</div>
      <h2 class="tier-name">${esc(ts.tier.name)}</h2>
      <p class="muted small">${esc(ts.tier.line)}</p>
      ${ts.next ? `<div class="tier-next"><span class="small">Toward <b>${esc(ts.next.name)}</b></span><span class="mono-t small">${ts.pct}%</span></div><span class="bar"><i style="width:${ts.pct}%"></i></span>` : '<p class="small" style="margin-top:8px"><b>The summit.</b> Every measure maxed.</p>'}
    </div>
  </section>`;
}
function reqBars(ts) {
  return ts.reqs.map(r => { const f = Math.min(1, r.have / r.need); return `<div class="mrow ${f >= 1 ? 'met' : ''}"><span class="n">${f >= 1 ? ic('check', 13) + ' ' : ''}${esc(r.label)}</span><span class="bar thin"><i style="width:${f * 100}%"></i></span><span class="v">${r.k === 'hours' ? r.have.toFixed(1) : r.have}/${r.need}</span></div>`; }).join('');
}
function overviewHtml(ts) {
  const P = Store.profile, per = ['day', 'week', 'month', 'all'].includes(VIEW.per) ? VIEW.per : 'week', t = periodTotals(per);
  const K = (l, v, sub) => `<div><span>${l}</span><b>${v}</b>${sub ? `<em>${sub}</em>` : ''}</div>`;
  const wk = [...Array(12)].map((_, w) => { const back = 11 - w; let m = 0; for (let i = 0; i < 7; i++) m += dayRec(dayKey(Date.now() - (back * 7 + i) * DAY)).m; const end = new Date(Date.now() - back * 7 * DAY); return {v:+(m / 60).toFixed(1), label:end.toLocaleDateString(undefined, {month:'numeric', day:'numeric'}), tip:`Week ending ${end.toLocaleDateString(undefined, {month:'short', day:'numeric'})}: ${fmtMins(m)}`, cur:back === 0}; });
  const d30 = [...Array(30)].map((_, i) => { const ts2 = Date.now() - (29 - i) * DAY, r = dayRec(dayKey(ts2)), dt = new Date(ts2); return {v:r.c, label:String(dt.getDate()), tip:`${dt.toLocaleDateString(undefined, {month:'short', day:'numeric'})}: ${r.c} right${r.a ? ` of ${r.a}` : ''}`, cur:i === 29}; });
  const subs = allSubjects().map(s => ({s, m:(P.minsBy || {})[s.id] || 0, L:subjectLevel(s), st:subjectStats(s)})).filter(x => x.m || x.st.started).sort((a, b) => b.m - a.m);
  const maxSub = Math.max(1, ...subs.map(x => x.m));
  return `${tierCardHtml(ts)}
    ${habitCardHtml()}
    ${ts.next ? `<details class="card reqcard"><summary><span class="small"><b>What ${esc(ts.next.name)} takes</b> · all of these</span></summary><div style="margin-top:8px">${reqBars(ts)}</div></details>` : ''}
    <div class="section-h"><h2>Totals</h2></div><div class="seg compact perseg">${[['day', 'Today'], ['week', '7 days'], ['month', '30 days'], ['all', 'All time']].map(([k, l]) => `<button class="${per === k ? 'on' : ''}" data-act="statPer" data-arg="${k}" aria-pressed="${per === k}"><b>${l}</b></button>`).join('')}</div>
    <div class="kpis">${K('Time studied', fmtMins(t.m))}${K('Answers right', t.c, t.a ? `of ${t.a}` : '')}${K('Accuracy', t.a ? pct(t.c, t.a) + '%' : '—')}${K('Bits learned', t.b)}${K('Sessions finished', t.s)}${K('XP', t.x)}${K('Active days', t.active)}${K('Streak', streakNow(), `best ${bestStreak()}`)}</div>
    <div class="section-h"><h2>Hours per week</h2><span class="eyebrow">last 12 weeks</span></div>
    <section class="card">${colChart(wk, {label:'Hours studied per week, last 12 weeks', fmt:v => v + 'h', every:3, min:1})}</section>
    <div class="section-h"><h2>Study calendar</h2><span class="eyebrow">minutes per day</span></div>
    <section class="card">${heatmap(20)}</section>
    <div class="section-h"><h2>Answers right per day</h2><span class="eyebrow">last 30 days</span></div>
    <section class="card">${colChart(d30, {label:'Answers right per day, last 30 days', every:5, min:5})}</section>
    <div class="section-h"><h2>By subject</h2><span class="eyebrow">time · level</span></div>
    ${subs.length ? `<section class="card">${subs.map(x => `<button class="subrow" data-act="subject" data-arg="${x.s.id}" style="--c:${x.s.color}"><span class="n"><b>${esc(x.s.name)}</b><em>Lv ${x.L.i} ${x.L.name} · ${x.L.prof}/${x.L.total} proficient</em></span><span class="bar thin"><i style="width:${x.m / maxSub * 100}%"></i></span><span class="v">${fmtMins(x.m)}</span></button>`).join('')}</section>` : `<div class="card empty-state"><b>No subjects started</b>Time and levels show up here per subject.</div>`}
    ${calCardHtml()}
    ${metaCardHtml()}`;
}
function ascentHtml(ts) {
  return `<p class="muted small" style="margin-top:14px">Ten tiers. Each needs several measures at once (right answers, bits learned, topics proficient, hours, exams, mastery that survives a retention check), so no single grind unlocks the next.</p>
  <ol class="ascent">${TIERS.map((T, i) => {
    const state = i < ts.i ? 'done' : i === ts.i ? 'now' : i === ts.i + 1 ? 'next' : 'lock';
    return `<li class="${state}"><span class="asc-g">${tierEmblem(i, 44)}</span><div class="asc-t"><b>${esc(T.name)}</b><span class="small muted">${esc(T.line)}</span>
      ${state === 'next' ? `<div style="margin-top:8px">${reqBars(ts)}</div>` : state === 'lock' ? `<span class="small asc-req">${Object.entries(T.req).map(([k, v]) => `${k === 'hours' ? v + ' h' : v} ${esc(REQ_LABEL[k])}`).join(' · ')}</span>` : state === 'now' ? '<span class="pill accent">You are here</span>' : ''}</div></li>`;
  }).reverse().join('')}</ol>`;
}
function achievementsHtml(L) {
  const got = Store.profile.ach || {};
  const n = ACHIEVEMENTS.filter(a => a.ok(L)).length;
  return `<p class="muted small" style="margin-top:14px">${n} of ${ACHIEVEMENTS.length} earned.</p>
  <div class="achgrid">${ACHIEVEMENTS.map(a => { const ok = a.ok(L); return `<div class="ach ${ok ? 'on' : ''}">${ic(ok ? 'trophy' : 'flag', 20)}<b>${esc(a.name)}</b><span>${esc(a.desc)}</span>${ok && got[a.id] ? `<em>${new Date(got[a.id] + 'T12:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}</em>` : ''}</div>`; }).join('')}</div>`;
}
VIEWS.progress = () => {
  const L = lifeStats(), ts = tierState(L), tab = ['overview', 'ascent', 'ach'].includes(VIEW.ptab) ? VIEW.ptab : 'overview';
  return `<header class="page-h spread"><h1>Progress</h1><button class="icon-btn" data-act="nav" data-arg="settings" aria-label="Settings" title="Settings">${ic('gear', 20)}</button></header>
  ${banners()}
  <nav class="tabbar" role="tablist">${[['overview', 'Overview'], ['ascent', 'The ascent'], ['ach', 'Achievements']].map(([id, l]) => `<button role="tab" class="${tab === id ? 'on' : ''}" aria-selected="${tab === id}" data-act="ptab" data-arg="${id}">${l}</button>`).join('')}</nav>
  ${tab === 'ascent' ? ascentHtml(ts) : tab === 'ach' ? achievementsHtml(L) : overviewHtml(ts)}`;
};
VIEWS.me = VIEWS.progress;

/* ---- Settings (from the gear on Progress) */
VIEWS.settings = () => {
  const p = Store.profile, wm = p.webMode || 'current', th = p.theme || 'system';
  let webStatus = '';
  if (WEB.state === 'ready') webStatus = `<div class="notice good">Web search is connected through ${esc(WEB_SERVER)}.</div>`;
  else if (WEB.state === 'checking') webStatus = `<div class="thinking"><span class="pulse"></span>Connecting…</div>`;
  else webStatus = `${WEB.msg ? `<div class="notice warn">${esc(WEB.msg)}</div>` : ''}<div class="row" style="margin-top:10px"><button class="btn primary sm" data-act="webConnect" ${AI.fn ? '' : 'disabled'}>Connect web search</button><span class="muted small">Uses the ${esc(WEB_SERVER)} connector.</span></div>`;
  const grp = (title, body) => `<section class="card stack" style="gap:8px;margin-top:12px"><div class="eyebrow">${title}</div>${body}</section>`;
  return `<header class="subbar"><button class="icon-btn" data-act="nav" data-arg="progress" aria-label="Back to progress">${ic('back', 20)}</button><div class="subbar-t crumbs">Progress / <b>Settings</b></div></header>
  <header class="page-h"><h1>Settings</h1></header>
  ${grp('How I want to be taught', `<textarea id="teachStyle" class="answer short" style="min-height:140px" placeholder="Rules every tutor and study session must follow, e.g. one step at a time, never give the answer, define every term each time it appears…">${esc(p.teachStyle || '')}</textarea>
      <div class="row"><button class="btn sm" data-act="saveTeach">Save</button><span class="hint">Put first in every tutor, study session, and bit. Overrides their defaults.</span></div>`)}
  ${grp('Tutor model', `<div class="seg">${[['default', 'Balanced', 'Fast replies, strong reasoning. Recommended'], ['complex', 'Most capable', 'Slowest; for hard proofs'], ['quick', 'Fast', 'Quickest, shallower']].map(([k, l, d]) => `<button class="${tutorTier() === k ? 'on' : ''}" data-act="setTier" data-arg="${k}" aria-pressed="${tutorTier() === k}"><b>${l}</b><span>${d}</span></button>`).join('')}</div>
      <p class="hint">Each reply is labeled with the tier that actually answered and how long it took.</p>`)}
  ${grp('Appearance', `<div class="seg compact">${[['system', 'System'], ['dark', 'Dark'], ['light', 'Light']].map(([k, l]) => `<button class="${th === k ? 'on' : ''}" data-act="setTheme" data-arg="${k}" aria-pressed="${th === k}"><b>${l}</b></button>`).join('')}</div>`)}
  ${grp('Daily goal', `<div class="seg compact">${[30, 50, 100, 150].map(g => `<button class="${(p.goal || 50) === g ? 'on' : ''}" data-act="setGoal" data-arg="${g}" aria-pressed="${(p.goal || 50) === g}"><b>${g} XP</b></button>`).join('')}</div>`)}
  ${grp('Lesson depth', `<div class="seg">${Object.entries(DEPTHS).map(([k, d]) => `<button class="${p.depth === k ? 'on' : ''}" data-act="setDepth" data-arg="${k}" aria-pressed="${p.depth === k}"><b>${d.label}</b><span>${d.desc}</span></button>`).join('')}</div>
      <p class="hint">Applies to new lessons and problems. Existing lessons keep their depth.</p>`)}
  ${grp('Web research', `<div class="seg">${Object.entries(WEB_MODES).map(([k, d]) => `<button class="${wm === k ? 'on' : ''}" data-act="setWebMode" data-arg="${k}" aria-pressed="${wm === k}"><b>${d.label}</b><span>${d.desc}</span></button>`).join('')}</div>
      <p class="hint">When on, lessons cite current sources and tutors search when you ask for something current.</p>${webStatus}`)}
  ${grp('Data', `<p class="muted small">${Store.persistent ? 'Progress is saved privately to your account and follows you across devices.' : 'Progress isn’t being saved in this view.'}</p>
      ${VIEW.confirmReset ? `<div class="confirm"><b>Reset all progress?</b><span class="small">Deletes XP, mastery, problem counts, gaps, lessons, sources, vocabulary, calibration, study time, tiers, and tutor conversations. Added subjects, toolkits, and settings stay.</span><div class="row"><button class="btn danger sm" data-act="doReset" ${VIEW.resetting ? 'disabled' : ''}>${VIEW.resetting ? 'Resetting…' : 'Reset everything'}</button><button class="btn ghost sm" data-act="cancelReset">Cancel</button></div></div>` : `<div><button class="btn ghost sm" data-act="askReset" style="color:var(--bad)">Reset progress…</button></div>`}`)}`;
};

/* tier-ups and achievements: checked at most every few seconds, announced once */
let lastFeatCheck = 0;
function checkFeats() {
  if (Date.now() - lastFeatCheck < 4000) return; lastFeatCheck = Date.now();
  habitTick();
  const P = Store.profile, L = lifeStats();
  P.ach = P.ach || {};
  const fresh = ACHIEVEMENTS.filter(a => !P.ach[a.id] && a.ok(L));
  const first = !P.achInit;
  fresh.forEach(a => { P.ach[a.id] = today(); });
  if (first) P.achInit = 1;
  if (fresh.length) { Store.saveProfile(); if (!first) toast(`Achievement: ${fresh.map(a => a.name).join(', ')}`); }
  checkTierUp(L);
}

/* ------------------------------------------------------------------ study plan, weekly review, review workload */
/* ---- workload forecast: simulate each knowledge point's next reviews at a given desired retention */
function forecast(days, r) {
  const out = Array(days).fill(0), now = noon(), end = now + days * DAY;
  const slot = t => Math.max(0, Math.min(days - 1, Math.floor((noon(t) - now) / DAY)));
  let kps = 0, topics = 0;
  Object.values(Store.nodes).forEach(n => {
    if (!nodeInfo(n.key)) return;
    const xs = n.kp ? Object.values(n.kp).filter(x => x && x.s) : [];
    if (xs.length) xs.forEach(x => {
      let st = {s:x.s, d:x.d || 5, l:x.l || now}, due = st.l + fsrsInterval(st.s, r) * DAY, g = 0;
      while (due < end && g++ < 40) { out[slot(due)] += 1.2; kps++; st = fsrsNext(st, 3, Math.max(due, now)); due = st.l + fsrsInterval(st.s, r) * DAY; }
    });
    else if (n.due) { let due = n.due, iv = Math.max(1, n.interval || 1), g = 0; while (due < end && g++ < 30) { out[slot(due)] += 3; topics++; iv *= 2.5; due = Math.max(due, now) + iv * DAY; } }
  });
  return {mins:out, avg:out.reduce((a, b) => a + b, 0) / days, kps, topics};
}
const RETAINS = [[0.85, 'Lighter', 'Fewer reviews; you’ll forget more between them'], [0.9, 'Standard', 'The usual balance'], [0.95, 'Exam mode', 'Remember more; reviews climb steeply']];
function workloadHtml() {
  const r = retainTarget(), f14 = forecast(14, r), max = Math.max(5, ...f14.mins);
  const opts = RETAINS.map(([v, l, d]) => ({v, l, d, avg:forecast(30, v).avg}));
  const data = f14.mins.map((m, i) => { const dt = new Date(noon() + i * DAY); return {v:Math.round(m), label:i === 0 ? 'Today' : dt.toLocaleDateString(undefined, {weekday:'narrow'}), tip:`${dt.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})}: ≈${Math.round(m)} min of review`, cur:i === 0}; });
  return `<div class="section-h"><h2>Review workload</h2><span class="eyebrow">next 14 days · estimate</span></div>
  <section class="card">${colChart(data, {label:'Estimated review minutes per day, next 14 days', fmt:v => v + ' min', every:2, min:max})}
    <div class="eyebrow" style="margin:14px 0 8px">Desired retention</div>
    <div class="seg">${opts.map(o => `<button class="${Math.abs(r - o.v) < 0.001 ? 'on' : ''}" data-act="setRetain" data-arg="${o.v}" aria-pressed="${Math.abs(r - o.v) < 0.001}"><b>${Math.round(o.v * 100)}% · ${o.l}</b><span>${o.d} · ≈${o.avg < 10 ? o.avg.toFixed(1) : Math.round(o.avg)} min/day</span></button>`).join('')}</div>
    <p class="hint" style="margin-top:8px">The share of what you’ve studied you’ll still recall when it comes back. Changes apply to each point’s next review. Minutes assume about 1 minute per knowledge-point question.</p></section>`;
}

/* ---- the if-then study plan */
function planForm() {
  const p = Store.profile.plan;
  if (!VIEW.pf) VIEW.pf = p ? JSON.parse(JSON.stringify(p)) : {days:[false, true, true, true, true, true, false], time:'20:00', cue:'', place:'', mins:30};
  return VIEW.pf;
}
VIEWS.plan = () => {
  const f = planForm(), n = f.days.filter(Boolean).length;
  const cues = ['After dinner', 'After my last class', 'After my morning coffee', 'Before bed'];
  return `<header class="subbar"><button class="icon-btn" data-act="nav" data-arg="${VIEW.from || 'home'}" aria-label="Back">${ic('back', 20)}</button><div class="subbar-t crumbs">Today / <b>Study plan</b></div></header>
  <header class="page-h"><h1>Your study plan</h1><p class="muted">Decide the when, where, and what in advance, as an if-then rule. Fixed cues are what turn studying into a habit instead of a daily decision.</p></header>
  <section class="card stack" style="gap:14px;margin-top:12px">
    <div class="stack" style="gap:8px"><div class="eyebrow">Days</div>
      <div class="daypick">${DOW.map((d, i) => `<button class="${f.days[i] ? 'on' : ''}" data-act="pfDay" data-arg="${i}" aria-pressed="${f.days[i]}">${d}</button>`).join('')}</div>
      <span class="hint">${n} day${n === 1 ? '' : 's'} a week. That is also your weekly target: meet it and you earn a streak freeze.</span></div>
    <div class="row" style="align-items:flex-end;gap:14px">
      <label class="stack" style="gap:6px"><span class="eyebrow">Time</span><input id="plTime" class="field" type="time" value="${esc(f.time)}" data-inp="plTime" style="width:140px"></label>
      <div class="stack" style="gap:6px"><span class="eyebrow">Minutes</span><div class="seg compact">${[15, 30, 45, 60, 90].map(m => `<button class="${f.mins === m ? 'on' : ''}" data-act="pfMins" data-arg="${m}" aria-pressed="${f.mins === m}"><b>${m}</b></button>`).join('')}</div></div>
    </div>
    <label class="stack" style="gap:6px"><span class="eyebrow">Cue: what comes right before</span><input id="plCue" class="field" data-inp="plCue" value="${esc(f.cue)}" placeholder="e.g. After dinner" maxlength="60"></label>
    <div class="chips">${cues.map(c => `<button class="chip-btn" data-act="pfCue" data-arg="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <label class="stack" style="gap:6px"><span class="eyebrow">Where</span><input id="plPlace" class="field" data-inp="plPlace" value="${esc(f.place)}" placeholder="e.g. my desk, the library" maxlength="60"></label>
    <div class="plan-say" id="planSay">${esc(planSentence(f))}</div>
    <div class="row"><button class="btn primary" data-act="planSave" ${n ? '' : 'disabled'}>Save plan</button>${Store.profile.plan ? '<button class="btn ghost" data-act="planClear" style="color:var(--bad)">Remove plan</button>' : ''}</div>
  </section>
  <p class="hint" style="margin-top:12px">Why a plan: if-then plans (“when X happens, I do Y”) are among the best-supported tools in behavior research, with a medium-to-large effect on follow-through across roughly a hundred studies. Habits take about two months on average to become automatic; missing a single day doesn’t reset that.</p>`;
};

/* ---- weekly review: data first, then one decision for next week */
VIEWS.week = () => {
  const P = Store.profile, wk = VIEW.wk || prevWeek(weekKey()), days = weekDays(wk), W = weekSummary(wk), prev = weekSummary(prevWeek(wk));
  const cur = weekKey(), nextWk = wk === cur ? prevWeek(cur, -1) : cur, nw = (P.weeks || {})[nextWk] || {};
  const tgt = VIEW.wt || nw.days || weekTarget(nextWk);
  const fmtD = dk => new Date(dk + 'T12:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'});
  const d = (a, b, f) => { const x = a - b; return !a && !b ? '' : `<em class="${x >= 0 ? 'up' : 'down'}">${x >= 0 ? '▲' : '▼'} ${f ? f(Math.abs(x)) : Math.abs(x)} vs week before</em>`; };
  const K = (l, v, dl) => `<div><span>${l}</span><b>${v}</b>${dl || ''}</div>`;
  const cal = calStats(), plan = P.plan;
  const dots = days.map(dk => { const dt = new Date(dk + 'T12:00:00'), act = isActive(dk), fr = (P.frozen || {})[dk], planned = plan && plan.days[dt.getDay()]; return `<div class="wdot ${act ? 'on' : fr ? 'fr' : planned ? 'miss' : ''}" title="${fmtD(dk)}: ${act ? fmtMins(dayRec(dk).m) : fr ? 'freeze used' : planned ? 'planned, missed' : 'rest'}"><i>${act ? ic('check', 13) : fr ? ic('snow', 13) : ''}</i><span>${DOW[dt.getDay()][0]}</span></div>`; }).join('');
  const subs = allSubjects().filter(s => subjectStats(s).started);
  return `<header class="subbar"><button class="icon-btn" data-act="nav" data-arg="${VIEW.from || 'progress'}" aria-label="Back">${ic('back', 20)}</button><div class="subbar-t crumbs">Progress / <b>Weekly review</b></div></header>
  <header class="page-h"><div class="eyebrow">${fmtD(days[0])} – ${fmtD(days[6])}${wk === cur ? ' · so far' : ''}</div><h1>${W.active >= W.target ? 'Target met' : `${W.active} of ${W.target} days`}</h1>
    <p class="muted">${W.active >= W.target ? `You studied on ${W.active} days${W.frozen ? ` (plus ${W.frozen} covered by a freeze)` : ''}.` : W.active ? `Short of the ${W.target}-day target${W.frozen ? `; ${W.frozen} missed day${W.frozen > 1 ? 's were' : ' was'} covered by a freeze` : ''}. The numbers below are what the week actually built.` : 'No study logged this week.'}</p></header>
  <section class="card"><div class="wdots">${dots}</div></section>
  <div class="kpis">${K('Time', fmtMins(W.m), d(W.m, prev.m, fmtMins))}${K('Right answers', W.c, d(W.c, prev.c))}${K('Accuracy', W.a ? pct(W.c, W.a) + '%' : '—')}${K('Bits learned', W.b, d(W.b, prev.b))}${K('Now proficient', W.prof.length, d(W.prof.length, prev.prof.length))}${K('Gaps closed', W.closed, W.opened ? `<em>${W.opened} found</em>` : '')}</div>
  ${W.prof.length ? `<div class="section-h"><h2>You can now</h2></div><div class="chips">${W.prof.map(k => `<button class="chip-btn" data-act="topic" data-arg="${k}">${ic('check', 13)} ${esc(nodeInfo(k).title)}</button>`).join('')}</div>` : ''}
  ${W.best && W.best.m ? `<p class="muted small" style="margin-top:12px">Longest day: ${new Date(W.best.dk + 'T12:00:00').toLocaleDateString(undefined, {weekday:'long'})}, ${fmtMins(W.best.m)}.${cal.n >= 10 ? ` Calibration overall: ${Math.abs(cal.over) <= 0.05 ? 'well calibrated' : cal.over > 0 ? `overconfident by ${Math.round(cal.over * 100)} points` : `underconfident by ${Math.round(-cal.over * 100)} points`}.` : ''}</p>` : ''}
  ${wk !== cur ? `<div class="section-h"><h2>This week</h2></div>
  <section class="card stack" style="gap:14px">
    <div class="stack" style="gap:8px"><div class="eyebrow">Target: days to study</div><div class="seg compact">${[2, 3, 4, 5, 6, 7].map(n => `<button class="${tgt === n ? 'on' : ''}" data-act="wkTarget" data-arg="${n}" aria-pressed="${tgt === n}"><b>${n}</b></button>`).join('')}</div>
      <span class="hint">${W.active && tgt > W.active + 2 ? 'That’s a big jump from last week. A target you hit beats one you miss; you can raise it next week.' : 'Meet it to earn a streak freeze (you hold ' + (P.freezes || 0) + ' of ' + FREEZE_CAP + ').'}</span></div>
    ${subs.length ? `<label class="stack" style="gap:6px"><span class="eyebrow">Main focus</span><select id="wkFocus" class="field"><option value="">No single focus</option>${subs.map(s => `<option value="${s.id}" ${nw.focus === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>` : ''}
    <label class="stack" style="gap:6px"><span class="eyebrow">One thing to change (optional)</span><input id="wkNote" class="field" value="${esc(nw.note || '')}" maxlength="140" placeholder="e.g. do the review first, before new material"></label>
    <div class="row"><button class="btn primary" data-act="wkSave" data-arg="${wk}|${nextWk}">Save and start the week</button>${plan ? '' : '<button class="btn ghost" data-act="planOpen" data-arg="week">Set a study plan</button>'}</div>
  </section>` : ''}`;
};

/* ---- Today pieces */
function freshCardHtml() {
  const fs = freshStart(); if (!fs) return '';
  const tiny = tinyStep();
  return `<section class="card fresh fs-${fs.kind}"><div class="fresh-h"><div class="stack" style="gap:4px;min-width:0"><div class="eyebrow">${fs.kind === 'week' ? 'Fresh start' : 'Welcome back'}</div><b>${esc(fs.title)}</b><span class="muted small">${esc(fs.body)}</span></div><button class="icon-btn" data-act="fsDismiss" aria-label="Dismiss">${ic('close', 16)}</button></div>
    <div class="row" style="margin-top:10px">${fs.kind === 'week' ? '<button class="btn primary sm" data-act="weekOpen">Review the week</button>' : tiny ? `<button class="btn primary sm" data-act="${tiny.act}" data-arg="${esc(tiny.arg)}">${ic('play', 14)} ${esc(tiny.label)}</button>` : ''}</div></section>`;
}
function planLineHtml() {
  const P = Store.profile, p = P.plan;
  if (!p) return `<button class="planline unset" data-act="planOpen" data-arg="home">${ic('calendar', 16)}<span><b>Set a study plan</b> · a fixed day, time, and cue. One minute.</span>${ic('next', 14)}</button>`;
  const on = plannedToday(), done = isActive(today());
  return `<button class="planline ${on ? 'on' : ''}" data-act="planOpen" data-arg="home">${ic('calendar', 16)}<span>${on ? `<b>${done ? 'Done for today' : `Planned today · ${fmtTime(p.time)}`}</b> · ${p.mins} min${p.cue ? ' · ' + esc(p.cue.toLowerCase()) : ''}${p.place ? ' · ' + esc(p.place) : ''}` : `<b>Rest day in your plan</b> · anything you do still counts`}</span><span class="small muted">${weekActive(weekKey())}/${weekTarget(weekKey())} this week</span></button>`;
}
function onboardHtml() {
  const P = Store.profile;
  if (P.onboarded || Object.keys(Store.nodes).length > 2) return '';
  const steps = [['Open Deep Recall', true, '', ''], ['Set your study plan', !!P.plan, 'planOpen', 'home'], ['Pick a subject', allSubjects().some(s => subjectStats(s).started), 'nav', 'library'], ['Learn your first bit', Object.values(Store.nodes).some(n => n.bits && n.bits.done && Object.keys(n.bits.done).length), 'nav', 'library']];
  const done = steps.filter(s => s[1]).length;
  return `<section class="card onboard"><div class="spread"><b>Getting started</b><span class="mono-t small">${done}/${steps.length}</span></div><span class="bar" style="display:block;margin:8px 0 10px"><i style="width:${done / steps.length * 100}%"></i></span>
    ${steps.map(([l, ok, act, arg]) => `<button class="obstep ${ok ? 'ok' : ''}" ${ok || !act ? 'disabled' : `data-act="${act}" data-arg="${arg}"`}><i>${ok ? ic('check', 13) : ''}</i><span>${l}</span></button>`).join('')}
    <button class="linkish small" data-act="obDone" style="margin-top:6px">Hide this</button></section>`;
}
function habitCardHtml() {
  const P = Store.profile, p = P.plan;
  return `<section class="card habitcard">
    <div class="hstats"><div><span>Day streak</span><b>${streakNow()}</b><em>best ${bestStreak()}</em></div><div><span>Week streak</span><b>${weekStreak()}</b><em>${weekActive(weekKey())}/${weekTarget(weekKey())} days this week</em></div><div><span>Freezes</span><b class="freeze">${[...Array(FREEZE_CAP)].map((_, i) => `<i class="${i < (P.freezes || 0) ? 'on' : ''}">${ic('snow', 15)}</i>`).join('')}</b><em>earned by meeting a week’s target</em></div></div>
    <p class="small muted" style="margin-top:10px">${p ? esc(planSentence(p)) : 'No study plan yet.'} <button class="linkish small" data-act="planOpen" data-arg="progress">${p ? 'Edit' : 'Set one'}</button></p>
    <div class="row" style="margin-top:8px"><button class="btn sm" data-act="weekOpen">Weekly review</button>${P.rec && (P.rec.m.v || P.rec.c.v) ? `<span class="small muted">Records: ${fmtMins(P.rec.m.v)} in a day · ${P.rec.c.v} right in a day</span>` : ''}</div>
  </section>`;
}

Object.assign(ACT, {
  planOpen: from => { VIEW = {name:'plan', from:from || 'home'}; render(); window.scrollTo(0, 0); },
  pfDay: i => { const f = planForm(); f.days[+i] = !f.days[+i]; render(); },
  pfMins: m => { planForm().mins = +m; render(); },
  pfCue: c => { planForm().cue = c; render(); },
  planSave: () => {
    const f = planForm(); if (!f.days.some(Boolean)) return;
    const P = Store.profile; P.plan = {days:f.days.slice(), time:f.time || '20:00', cue:str(f.cue).trim().slice(0, 60), place:str(f.place).trim().slice(0, 60), mins:f.mins || 30, weekDays:f.days.filter(Boolean).length, set:Date.now()};
    P.weeks = P.weeks || {}; P.weeks[weekKey()] = Object.assign(P.weeks[weekKey()] || {}, {days:P.plan.weekDays});
    Store.saveProfile(); toast('Plan saved. It shows on Today and sets your weekly target.'); go(VIEW.from || 'home');
  },
  planClear: () => { delete Store.profile.plan; Store.saveProfile(); go(VIEW.from || 'home'); },
  weekOpen: () => { VIEW = {name:'week', from:VIEW.name === 'home' ? 'home' : 'progress'}; render(); window.scrollTo(0, 0); },
  wkTarget: n => { VIEW.wt = +n; render(); },
  wkSave: a => {
    const [wk, nextWk] = a.split('|'), P = Store.profile; P.weeks = P.weeks || {};
    P.weeks[wk] = Object.assign(P.weeks[wk] || {}, {reviewedAt:Date.now()});
    P.weeks[nextWk] = Object.assign(P.weeks[nextWk] || {}, {days:VIEW.wt || weekTarget(nextWk), focus:($('#wkFocus') || {}).value || '', note:str(($('#wkNote') || {}).value).slice(0, 140)});
    const ks = Object.keys(P.weeks).sort(); if (ks.length > 60) ks.slice(0, ks.length - 60).forEach(k => delete P.weeks[k]);
    Store.saveProfile(); toast('Week set. Your target and focus show on Today.'); go('home');
  },
  fsDismiss: () => { Store.profile.fsDismiss = today(); Store.saveProfile(); render(); },
  obDone: () => { Store.profile.onboarded = 1; Store.saveProfile(); render(); },
  setRetain: v => { Store.profile.retain = +v; Store.saveProfile(); render(); }
});

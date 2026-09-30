/* ------------------------------------------------------------------ topic page: internal structure, stage, and the method's study flow */
function openSheet(k) { go('topic', {key:k}); }
function closeSheet() { const el = $('#sheet'); if (el) el.innerHTML = ''; document.body.classList.remove('teacher-open'); }
const AI_ACTS = ['lesson', 'practice', 'repair', 'task', 'project', 'vocab', 'problems'];
VIEWS.topic = () => {
  const info = nodeInfo(VIEW.key);
  if (!info) { setTimeout(() => go('library'), 0); return ''; }
  const s = info.subject, k = kindOf(s), key = info.key;
  prefetchOutline(key);
  const n = Store.nodes[key], m = mastery(n), p = pst(n), st = topicStage(n), gaps = openGapsFor(key), F = topicFlow(info);
  const O = Store.outlines[key], KS = kpStats(key), wp = weakPrereqs(key);
  const ai = AI.ok(), has = n && n.hasLesson;
  const idx = `${String(info.ui + 1).padStart(2, '0')}.${String(info.ni + 1).padStart(2, '0')}`;
  const fading = n && !assistCapped(n) && (n.mastery || 0) - m >= 8;
  const ttab = ['learn', 'kit', 'prog'].includes(VIEW.ttab) ? VIEW.ttab : 'learn';
  const pk = hasPack(key) && k !== 'lang', P = pk ? packNow(key) : null;
  if (ttab === 'kit' && ((!Store.kits[key] && AI.ok()) || (pk && !(Store.kits[key] && Store.kits[key].pack))) && !KIT[key]) ensureKit(key);
  const needsAI = step => AI_ACTS.includes(step.act) && !(step.act === 'lesson' && has) && !(step.act === 'vocab' && AI.fn) && !(pk && step.act === 'practice') && !ai;

  const K = (l, v) => `<div><span>${l}</span><b>${v}</b></div>`;
  let kv = '';
  if (k === 'lang') kv = K('Right', p.a ? `${p.c}/${p.a}` : '—') + K('Words', deck(info.sid).filter(c => c.node === key).length) + K('Sessions', (n && n.sessions) || 0);
  else if (k === 'concept') kv = K('Sessions', (n && n.sessions) || 0) + K('Answers right', p.a ? `${p.c}/${p.a}` : '—') + K('Brain dump', n && n.dump != null ? Math.round(n.dump * 100) + '%' : '—');
  else kv = K('Solved', p.a ? `${p.c}/${p.a}` : '—') + K('First try', p.a ? pct(p.f, p.a) + '%' : '—') + K('Difficulty', `${levelFor(key)}/3`);
  kv += K('Last studied', ago(n && n.last)) + K('Next review', dueIn(n && n.due)) + K('Open gaps', gaps.length);

  const flow = F.steps.map((x, i) => {
    const isNext = F.next && F.next.id === x.id;
    const off = x.lock || x.skip || needsAI(x);
    const cls = [x.done ? 'done' : '', isNext ? 'next' : '', x.skip ? 'skip' : '', x.lock ? 'lock' : ''].join(' ');
    const go = x.lock ? 'Later' : x.skip ? '—' : isNext ? 'Start' : x.done ? 'Again' : 'Open';
    return `<button class="fstep ${cls}" data-act="${x.act}" data-arg="${esc(x.arg)}" ${off ? 'disabled' : ''}>
      <span class="fi">${x.done ? '✓' : i + 1}</span>
      <span><b>${esc(x.label)}${x.optional ? ' <span class="pill">optional</span>' : ''}</b><small>${esc(x.desc)}</small></span>
      <span class="go">${go}${!off ? ' ›' : ''}</span></button>`;
  }).join('');

  const extras = [];
  if (!pk && !F.steps.some(x => x.act === 'lesson')) extras.push(['lesson', key, has ? 'Full lesson (one page)' : 'Full lesson (one page)']);
  if (!F.steps.some(x => x.id === 'retrieve') && k !== 'lang') extras.push(['task', 'dump|' + key, 'Brain dump']);
  if (!F.steps.some(x => x.id === 'source') && k !== 'lang') extras.push(['source', key, 'Study a source']);
  if (!F.steps.some(x => x.id === 'write') && k !== 'lang') extras.push(['task', 'qwrite|' + key, k === 'program' ? 'Write your own problems' : 'Write your own questions']);
  if (k === 'concept') extras.push(['task', 'argue|' + key, 'Argue a position'], ['task', 'recon|' + key, 'Primary source'], ['task', 'rival|' + key, SCIENCE.includes(info.sid) ? 'Predict the outcome' : 'Rival explanations']);
  if (k === 'lang') extras.push(['reader', key, 'Graded reading & listening']);
  if (LABS[info.sid]) extras.push(['tutorAbout', key, 'Debrief a lab or simulation']);
  extras.unshift(['studyTopic', key, 'Study this in a session']);
  if (!F.steps.some(x => x.id === 'talk')) extras.push(['tutorAbout', key, 'Ask the tutor']);

  const srcs = (n && n.sources) || [];
  const skills = n && n.skills ? Object.entries(n.skills).sort((a, b) => b[1].c - a[1].c).slice(0, 8) : [];
  const methodSw = k === 'lang' ? '' : `<div class="method-sw" role="group" aria-label="Study method"><button class="${F.self ? '' : 'on'}" data-act="setMode" data-arg="${info.sid}|guided" aria-pressed="${!F.self}">Guided</button><button class="${F.self ? 'on' : ''}" data-act="setMode" data-arg="${info.sid}|self" aria-pressed="${F.self}">Self-directed</button></div>`;
  const methodLine = k === 'lang' ? 'Lesson, then exercises and spaced vocabulary. Conversation practice any time.'
    : F.self ? 'Self-directed: you do the work first (retrieve, read, write questions); Claude checks it and logs what’s missing.'
    : 'Guided: Claude teaches first, then tests you. Wrong answers become gaps the next step repairs.';
  const cta = F.next
    ? `<button class="btn primary block" data-act="${F.next.act}" data-arg="${esc(F.next.arg)}" ${needsAI(F.next) ? 'disabled' : ''}>Continue · ${esc(F.next.label)}</button>`
    : `<button class="btn primary block" data-act="practice" data-arg="${key}" ${ai ? '' : 'disabled'}>Practice again</button>`;

  return `<div style="--c:${s.color}">
    <header class="subbar">
      <button class="icon-btn" data-act="subjectAt" data-arg="${key}" aria-label="Back to ${esc(s.name)}">${ic('back', 20)}</button>
      <div class="subbar-t crumbs">${esc(s.name)} / <b>${esc(info.unit)}</b></div>
      <button class="btn ghost sm" data-act="tutorAbout" data-arg="${key}">${k === 'lang' ? 'Conversation' : 'Tutor'}</button>
    </header>
    <section class="topic-head">
      <div>
        <div class="eyebrow">Topic ${idx} · ${esc(info.unit)}</div>
        <h1>${esc(info.title)}</h1>
        <div class="row" style="margin-top:10px;gap:6px"><span class="pill ${st >= 3 ? 'accent' : ''}">${STAGES[st]}</span>${fading ? `<span class="pill warn">Fading · was ${n.mastery}%</span>` : ''}${n && n.due && n.due <= Date.now() ? '<span class="pill warn">Review due</span>' : ''}</div>
      </div>
      ${ring(m, m + '%', 'big')}
    </section>
    <div class="stagebar" aria-label="Stage ${st} of 4">${STAGES.slice(1).map((l, i) => `<div class="${st >= i + 1 ? 'on' : ''} ${st === i + 1 ? 'cur' : ''}"><i></i><span>${l}</span></div>`).join('')}</div>
    <nav class="tabbar" role="tablist">${[['learn', 'Learn'], ['kit', 'Toolkit'], ['prog', 'Progress']].map(([id, l]) => `<button role="tab" class="${ttab === id ? 'on' : ''}" aria-selected="${ttab === id}" data-act="ttab" data-arg="${id}">${l}${id === 'kit' && Store.kits[key] ? ' <i class="tdot"></i>' : ''}</button>`).join('')}</nav>
    ${ttab === 'kit' ? kitBodyHtml(key) : ttab === 'prog' ? `
    <p class="muted small" style="margin-top:14px">${esc(stageHint(n, info))}</p>
    <div class="kv">${kv}</div>
    ${kpSectionHtml(info, O, n, KS)}
    ${n && n.studyLog && n.studyLog.length ? `<div class="section-h"><h2>From study sessions</h2><span class="eyebrow">${n.study ? `${n.study.c}/${n.study.a} right` : ''}</span></div><section class="card">${n.studyLog.slice(-6).reverse().map(e => `<div class="change"><span>${e.tid ? `<button class="linkish" data-act="thread" data-arg="${esc(e.tid)}">${esc(e.title)}</button>` : esc(e.title)}<span class="small muted" style="display:block">${esc(e.note || '')}</span></span><span class="v">${e.a ? e.c + '/' + e.a : ''}${e.u != null ? ` · ${Math.round(e.u * 100)}%` : ''}<br>${ago(e.t).toLowerCase()}</span></div>`).join('')}</section>` : ''}
    ${skills.length ? `<div class="section-h"><h2>Skills on this topic</h2><span class="eyebrow">solved / tried</span></div><div class="skills">${skills.map(([sk, v]) => `<span class="skill"><b>${esc(sk)}</b> · ${v.c}/${v.a}</span>`).join('')}</div>` : ''}
    ${srcs.length ? `<div class="section-h"><h2>Your sources</h2></div><div class="chips">${srcs.slice(-6).map(sr => `<button class="chip-btn" data-act="openSource" data-arg="${esc(sr.id)}">${ic('doc', 14)} ${esc(sr.title.slice(0, 44))}</button>`).join('')}</div>` : ''}
    ${(n && n.myQs && n.myQs.length) ? `<p class="muted small" style="margin-top:12px">${n.myQs.length} of your own question${n.myQs.length > 1 ? 's' : ''} are mixed into this topic’s reviews.</p>` : ''}` : `
    ${assistCapped(n) ? `<section class="card solonote"><div class="spread"><div><b>Solo check</b><div class="muted small">You’ve worked this with the tutor. Prove it closed-book to reach Proficient.</div></div><button class="btn primary sm" data-act="practice" data-arg="${key}" ${ai ? '' : 'disabled'}>Try it solo</button></div></section>` : ''}
    <div style="margin-top:14px">${cta}</div>
    <p class="muted small" style="margin-top:8px">${esc(stageHint(n, info))}</p>
    ${pk ? `<p class="small muted book-note">${ic('learn', 14)} Pre-written textbook chapter${P ? `, researched against ${P.sources.slice(0, 2).map(x => esc(x.title)).join(' and ')}${P.sources.length > 2 ? ' and others' : ''}` : ''}. Your questions go to the teacher panel inside the chapter.</p>` : ''}
    ${gaps.length ? `<section class="card gapnote"><div class="spread"><b>${gaps.length} open gap${gaps.length > 1 ? 's' : ''} on this topic</b><button class="btn warn sm" data-act="repair" data-arg="${key}" ${ai ? '' : 'disabled'}>Repair</button></div>
      <div class="stack" style="gap:6px;margin-top:8px">${gaps.slice(0, 4).map(g => `<div class="gap-line"><b style="font-weight:550">${esc(g.concept)}</b>${g.hits > 1 ? ` <span class="mono-t small" style="color:var(--warn)">×${g.hits}</span>` : ''}<div class="muted small">${fieldHtml(g.detail || '')}</div></div>`).join('')}</div></section>` : ''}
    ${wp.length && !(n && n.ready) ? `<div class="section-h"><h2>Prerequisites</h2></div><section class="card stack" style="gap:8px">${(n.pre || []).map(k => { const pi = nodeInfo(k); if (!pi) return ''; const pm = mastery(Store.nodes[k]); return `<button class="lib-row" data-act="topic" data-arg="${k}" style="padding:6px 0;border:0"><span class="mono" style="--c:${pi.subject.color}">${esc(pi.subject.mono)}</span><span class="t"><span class="ln">${esc(pi.title)}</span><span class="lm"><span>${pm}% mastery${pm < 60 ? ' · below 60%' : ''}</span></span></span><span class="lr"></span></button>`; }).join('')}<div class="row"><button class="btn sm" data-act="readiness" data-arg="${key}" ${ai ? '' : 'disabled'}>Take the readiness check</button><button class="btn ghost sm" data-act="readySkip" data-arg="${key}">I know these</button></div></section>` : ''}
    <div class="section-h"><h2>Study flow</h2>${methodSw}</div>
    <p class="muted small" style="margin-top:-4px">${methodLine}</p>
    <section class="card" style="padding-block:4px;margin-top:10px"><div class="flow">${flow}</div></section>
    <div class="section-h"><h2>Other ways in</h2></div>
    ${LABS[info.sid] ? `<p class="small muted" style="margin:0 0 8px">Practice outside the app: ${LABS[info.sid].map(l => `<a href="${l.url}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join(' · ')}</p>` : ''}
    <div class="chips">${extras.map(([a, g, l]) => `<button class="chip-btn" data-act="${a}" data-arg="${esc(g)}" ${a === 'tutorAbout' || a === 'studyTopic' || (a === 'lesson' && has) || ai ? '' : 'disabled'}>${l}</button>`).join('')}</div>`}
  </div>`;
};

function kpSectionHtml(info, O, n, KS) {
  if (!O) return `<div class="section-h"><h2>Knowledge points</h2></div><section class="card"><p class="muted small">${AI.ok() ? '<span class="pulse" style="display:inline-block;margin-right:8px"></span>Mapping this topic into testable knowledge points against ' + esc(syllabusFor(info)) + ', then auditing the map. Lessons and practice are written to it.' : 'This topic’s knowledge points are mapped the first time Claude is available.'}</p></section>`;
  const kp = (n && n.kp) || {}, now = Date.now();
  const rows = O.kps.map((k, ki) => {
    const x = kp[k.id], v = kpValue(x), due = x && x.due <= now;
    const cls = !x ? 'st0' : v >= 90 ? 'st4' : v >= PROFICIENT ? 'st3' : v >= 40 ? 'st2' : 'st1';
    return `<div class="kprow"><span class="node ${cls}"><span>${ki + 1}</span>${due ? '<i class="dot"></i>' : ''}</span><span class="ptext"><span class="ptitle">${esc(k.t)}</span><span class="pmeta">${x ? `${Math.round(v)}% · ${x.c}/${x.a} right · ${due ? 'due' : 'next ' + dueIn(x.due).toLowerCase()}` : 'untested'}</span></span></div>`;
  }).join('');
  return `<div class="section-h"><h2>Knowledge points</h2><span class="eyebrow">${KS.seen}/${KS.total} tested · ${KS.strong} strong</span></div>
    <details class="card kpcard"${KS.seen ? '' : ' open'}><summary><span class="muted small">Anchored to ${esc(O.ref)}${O.obj ? ` · objective: “${esc(O.obj)}”` : ''}${O.audited ? ' · audited' : ''}</span></summary>
    ${O.scope ? `<p class="muted small" style="margin:8px 0 4px">${esc(O.scope)}</p>` : ''}
    ${O.audit && O.audit.notes ? `<p class="hint">Audit: ${esc(O.audit.notes)}</p>` : ''}
    <div class="kplist">${rows}</div></details>`;
}

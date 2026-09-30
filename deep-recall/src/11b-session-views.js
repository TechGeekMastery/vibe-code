/* ---- session views */
function kitOk(S) { const q = S.questions && S.questions[S.i]; return !!(q && q.node && nodeInfo(q.node) && ['q', 'feedback'].includes(S.phase) && !['exam', 'placement', 'readiness', 'diagnostic', 'pretest', 'vocab', 'drill'].includes(S.kind)); }
VIEWS.session = () => {
  const S = SESSION;
  if (!S) { setTimeout(() => go('home'), 0); return ''; }
  const kindLabel = {practice:'Practice', pretest:'Pre-test', review:'Review', diagnostic:'Diagnostic', repair:'Gap repair', problems:'Problem set', placement:'Placement test', lang:'Exercises', vocab:'Vocabulary', mixed:'Mixed practice', exam:'Course exam', test:'Chapter test', drill:'Drill', readiness:'Readiness check'}[S.kind] || 'Session';
  const head = `<header class="sess-top">
      <button class="icon-btn" data-act="quitSession" aria-label="End session">${ic('close', 22)}</button>
      <div class="bar"><i id="sessBar" style="width:${sessPct(S)}%"></i></div>
      ${S.exam && S.phase !== 'summary' ? '<span class="exam-clock" id="examClock">--:--</span>' : ''}<span class="sess-count" id="sessCount">${sessCountText(S)}</span>
      ${kitOk(S) ? `<button class="icon-btn" data-act="kit" data-arg="${S.questions[S.i].node}" aria-label="Toolkit: rules and terms" title="Toolkit">${ic('book', 19)}</button>` : ''}
    </header>`;
  if (S.phase === 'loading') return head + `<div class="sess-load"><div class="eyebrow">${kindLabel}</div><h1>${esc(S.title)}</h1><p class="muted">${esc(S.loadMsg)}</p><div class="thinking"><span class="pulse"></span>${S.problemStream ? 'Writing problems. The first one appears as soon as it’s done.' : 'Thinking. This usually takes 15–60 seconds.'}</div><button class="btn ghost" data-act="quitSession" style="margin-top:10px">Cancel</button></div>`;
  if (S.phase === 'error') return head + `<div class="sess-load"><div class="eyebrow">${kindLabel}</div><h1>${esc(S.title)}</h1><div class="notice bad">${esc(S.err)}</div><div class="row" style="margin-top:8px">${AI.ok() && S.retry ? '<button class="btn primary" data-act="retrySession">Try again</button>' : ''}<button class="btn ghost" data-act="quitSession">Close</button></div></div>`;
  if (S.phase === 'waiting') return head + `<div class="sess-load"><div class="eyebrow">${kindLabel}</div><h1>Next one</h1><div class="thinking"><span class="pulse"></span>Still being written…</div><button class="btn ghost" data-act="quitSession" style="margin-top:10px">End here and see results</button></div>`;
  if (S.phase === 'intro') return head + `<div class="qwrap"><div class="eyebrow">${kindLabel} · ${esc(S.title)}</div><div class="prose intro-lesson">${mdToHtml(S.intro, {lang:S.langCode || null})}</div></div><div class="sess-actions"><button class="btn primary" data-act="startQs">Test the repair (${S.questions.length} questions)</button></div>`;
  if (S.phase === 'summary') return head + summaryHtml(S, kindLabel);
  const q = S.questions[S.i];
  if (q.type === 'problem') return head + problemHtml(S, q);
  if (q.type === 'drill') return head + drillHtml(S, q);
  if (q.type === 'lang') return head + langQuestionHtml(S, q);
  if (q.type === 'card') return head + cardHtml(S, q);
  return head + questionHtml(S);
};
function sessTotal(S) { return S.streaming && S.expected ? Math.max(S.expected, S.questions.length) : S.questions.length; }
function sessPct(S) { const t = sessTotal(S); if (!t) return 0; const d = S.phase === 'summary' ? t : S.i + (S.phase === 'feedback' ? 1 : 0); return Math.min(100, d / t * 100); }
function sessCountText(S) { const t = sessTotal(S); return t && S.phase !== 'summary' && S.phase !== 'loading' ? Math.min(S.i + 1, t) + '/' + t : ''; }
function updateSessHead() {
  const S = SESSION; if (!S || VIEW.name !== 'session') return;
  const b = $('#sessBar'), c = $('#sessCount');
  if (b) b.style.width = sessPct(S) + '%';
  if (c) c.textContent = sessCountText(S);
}
function confRow(S) {
  return `<div class="conf" role="group" aria-label="How sure are you?"><span class="eyebrow">How sure are you?</span><div class="conf-b">${CONF.map(c => `<button class="cf ${S.conf === c.v ? 'on' : ''}" data-act="conf" data-arg="${c.v}" aria-pressed="${S.conf === c.v}">${c.label}</button>`).join('')}</div></div>`;
}
function nextBtn(S) {
  const last = S.i + 1 >= S.questions.length && !S.streaming;
  return `<button class="btn ${S.fb && S.fb.verdict === 'correct' ? 'go' : 'primary'}" data-act="next" id="nextBtn">${last ? 'See results' : 'Continue'}</button>`;
}
function rootLine(root) {
  const i = root && nodeInfo(root.key); if (!i) return '';
  return `<p class="root"><b>Likely root cause:</b> ${esc(root.why || '')} <button class="linkish" data-act="sheet" data-arg="${i.key}">${esc(i.title)} · ${esc(i.subject.name)}</button></p>`;
}
function questionHtml(S) {
  const q = S.questions[S.i], locked = S.phase !== 'q', info = nodeInfo(q.node);
  const kind = q.own ? 'Your own question' : {mcq:'Multiple choice', recall:'Explain it', apply:'Apply it', order:'Put in order'}[q.type];
  let body = '', actions = '';
  const needConf = S.phase === 'q';
  if (q.type === 'mcq') {
    body = `<div class="opts" role="group" aria-label="Options">${q.options.map((o, i) => {
      let cls = '';
      if (locked) { if (i === q.answer) cls = 'ok'; else if (i === S.sel) cls = 'no'; }
      else if (i === S.sel) cls = 'sel';
      return `<button class="opt ${cls}" data-act="sel" data-arg="${i}" ${locked ? 'disabled' : ''}><span class="opt-k">${'ABCDEF'[i]}</span><span>${fieldHtml(o)}</span></button>`;
    }).join('')}</div>`;
    if (S.phase === 'q') actions = `<button class="btn primary" data-act="checkMcq" ${S.sel == null || !S.conf ? 'disabled' : ''}>Check</button>`;
  } else if (q.type === 'recall' || q.type === 'apply') {
    body = `<textarea id="answer" class="answer" data-inp="sessText" placeholder="${q.type === 'apply' ? 'Reason through the scenario step by step…' : 'Explain it in your own words…'}" aria-label="Your answer" ${locked ? 'readonly' : ''}>${esc(S.text)}</textarea>
      ${S.phase === 'q' ? '<div class="hint">Write it out fully: generating the explanation yourself is what builds the memory. Ctrl/⌘ + Enter to submit.</div>' : ''}`;
    if (S.phase === 'q') actions = `<button class="btn ghost" data-act="idk">I don’t know</button><button class="btn primary" data-act="checkRecall" ${S.conf ? '' : 'disabled'}>Check answer</button>`;
  } else if (q.type === 'order') {
    if (!S.order) { let pool = shuffle(q.items.map((_, i) => i)); if (pool.every((v, i) => v === i)) pool.reverse(); S.order = {pool, picked:[]}; }
    const O = S.order;
    body = `<div class="order-picked" aria-label="Your order">${O.picked.length ? O.picked.map((ix, pos) => `<button class="oi" data-act="unpick" data-arg="${pos}" ${locked ? 'disabled' : ''}><b>${pos + 1}</b><span>${fieldHtml(q.items[ix])}</span></button>`).join('') : '<div class="empty">Tap the items below in order, first to last.</div>'}</div>
      ${O.pool.length ? `<div class="pool">${O.pool.map((ix, pos) => `<button class="oi" data-act="pick" data-arg="${pos}" ${locked ? 'disabled' : ''}><b>·</b><span>${fieldHtml(q.items[ix])}</span></button>`).join('')}</div>` : ''}`;
    if (S.phase === 'q') actions = `<button class="btn ghost" data-act="orderReset">Reset</button><button class="btn primary" data-act="checkOrder" ${O.pool.length || !S.conf ? 'disabled' : ''}>Check</button>`;
  }
  let extra = '';
  if (S.phase === 'selfgrade') {
    extra = `<div class="fb warn"><div class="fb-h">Grade yourself first</div><p>Compare your answer against the key ideas, then rate it. Claude grades it next, and the gap between the two ratings trains your judgment.</p>
      <ul class="rubric">${q.rubric.map(r => `<li><span class="m">·</span><span>${fieldHtml(r)}</span></li>`).join('')}</ul>
      <details><summary>Model answer</summary><div class="prose sm">${mdToHtml(q.model)}</div></details></div>`;
    actions = `<button class="btn" data-act="selfRate" data-arg="0">Missed it</button><button class="btn" data-act="selfRate" data-arg="0.5">Partly</button><button class="btn go" data-act="selfRate" data-arg="1">Had it</button>`;
  }
  if (S.phase === 'grading') { extra = `<div class="thinking"><span class="pulse"></span>Grading your answer…</div>`; actions = `<button class="btn primary" disabled>Grading…</button>`; }
  if (S.phase === 'gradefail') {
    extra = `<div class="fb warn"><div class="fb-h">Grading didn’t go through</div><p>${esc(S.err)}</p>
      <details open><summary>Model answer</summary><div class="prose sm">${mdToHtml(q.model)}</div></details>
      <p>Compare your answer with the model, then grade yourself.</p></div>`;
    actions = `${AI.ok() ? '<button class="btn ghost" data-act="checkRecall">Grade again</button>' : ''}<button class="btn" data-act="selfGrade" data-arg="0">Missed it</button><button class="btn" data-act="selfGrade" data-arg="0.5">Partly</button><button class="btn go" data-act="selfGrade" data-arg="1">Had it</button>`;
  }
  if (S.phase === 'feedback') { extra = fbHtml(q, S.fb); actions = nextBtn(S); }
  return `<div class="qwrap" style="--c:${info ? info.subject.color : 'var(--accent)'}">
      <div class="eyebrow">${kind}${info && !hideTopic(S) ? ' · ' + esc(info.title) : ''}</div>
      <div class="q-prompt prose">${mdToHtml(q.prompt)}</div>
      ${body}${needConf ? confRow(S) : ''}${extra}
    </div>
    <div class="sess-actions">${actions}</div>`;
}
function fbHtml(q, fb) {
  const cls = fb.verdict === 'correct' ? 'good' : fb.verdict === 'partial' ? 'warn' : 'bad';
  const head = fb.verdict === 'correct' ? 'Correct' : fb.verdict === 'partial' ? 'Partly there' : 'Not yet';
  let h = `<div class="fb ${cls}"><div class="fb-h">${head}${q.type !== 'mcq' ? `<span class="fb-score">${Math.round(fb.score * 100)}%</span>` : ''}</div>`;
  if (fb.hyper) h += `<p class="hyper"><b>High-confidence miss.</b> Errors you were sure about are the ones that correct best once you see why. Read this closely; it’s weighted higher in your gaps.</p>`;
  if (fb.self != null) h += `<p><b>You rated it ${Math.round(fb.self * 100)}%; Claude, ${Math.round(fb.score * 100)}%.</b> ${fb.agree >= 0.75 ? 'Your judgment matched.' : fb.self > fb.score ? 'You were more generous than the rubric allows.' : 'You were harsher than needed.'}</p>`;
  if (fb.trap) h += `<p><b>Why that option is tempting:</b> ${fieldHtml(fb.trap)}</p>`;
  if (fb.feedback) h += `<div class="prose sm">${mdToHtml(fb.feedback)}</div>`;
  if (fb.hits && q.rubric) h += `<ul class="rubric">${q.rubric.map((r, i) => `<li><span class="m ${fb.hits[i] ? 'y' : 'n'}">${fb.hits[i] ? '✓' : '✗'}</span><span>${fieldHtml(r)}</span></li>`).join('')}</ul>`;
  if (fb.misconception) h += `<p><b>The wrong model here:</b> ${fieldHtml(fb.misconception)}</p>`;
  if (fb.root) h += rootLine(fb.root);
  if (q.type === 'order' && fb.verdict !== 'correct') h += `<details open><summary>Correct order</summary><ol>${q.items.map(x => `<li>${fieldHtml(x)}</li>`).join('')}</ol></details>`;
  if (fb.model) h += `<details ${fb.verdict !== 'correct' ? 'open' : ''}><summary>Model answer</summary><div class="prose sm">${mdToHtml(fb.model)}</div></details>`;
  if (fb.gaps && fb.gaps.length) h += `<div class="fb-gaps"><span class="eyebrow">${SESSION.kind === 'repair' ? 'Still open' : 'Gap logged'}</span>${fb.gaps.map(g => `<span class="gap-chip">${esc(g.concept)}</span>`).join('')}</div>`;
  return h + '</div>';
}

/* ---- problem view */
const FMT_HINT = {
  expression:'Type math like 3x^2 + sin(2x), sqrt(x)/2, e^(-x), ln(x). The preview shows how it’s read.',
  antiderivative:'Type one antiderivative; “+ C” is optional. Example: x^3/3 - cos(x)',
  number:'A number or exact expression: 0.75, 3/4, 2*sqrt(3), 9.8. Use the units the problem asks for.',
  numbers:'Separate values with commas, in any order: -2, 3'
};
function keyState(q) {
  const m = {pack:['Textbook question', ''], queued:['Key check queued', ''], checking:['Checking the answer key', ''], ok:['Answer key verified', 'ok'], fixed:['Answer key corrected', 'warn'], doubt:['Answer key disputed', 'bad'], unverified:['Key not verified', ''], skip:['', '']}[q.vstate || 'skip'] || ['', ''];
  return m[0] ? `<span class="kstate ${m[1]}" title="Each answer key is re-solved independently before it grades you">${m[0]}</span>` : '';
}
function problemHtml(S, q) {
  const A = S.att, locked = S.phase !== 'q', info = nodeInfo(q.node);
  const diff = `<span class="diff" title="Difficulty ${q.difficulty} of 3" aria-label="Difficulty ${q.difficulty} of 3">${[1, 2, 3].map(d => `<i class="${d <= q.difficulty ? 'on' : ''}"></i>`).join('')}</span>`;
  let input = '';
  if (q.ptype === 'choice') {
    input = `<div class="opts" role="group" aria-label="Options">${q.options.map(o => {
      let cls = '';
      if (locked) { if (o.k === q.answer) cls = 'ok'; else if (A.wrong.includes(o.k)) cls = 'no'; }
      else if (S.sel === o.k) cls = 'sel'; else if (A.wrong.includes(o.k)) cls = 'no';
      return `<button class="opt ${cls}" data-act="psel" data-arg="${o.k}" ${locked || A.wrong.includes(o.k) ? 'disabled' : ''}><span class="opt-k">${o.k}</span><span class="prose sm">${mdToHtml(o.t).replace(/^<p>|<\/p>$/g, '')}</span></button>`;
    }).join('')}</div>`;
  } else if (q.ptype === 'code') {
    if (!S.codeInit) { S.codeInit = true; if (!S.text) S.text = q.starter || ''; }
    input = `<label class="vh" for="code">Your code</label><textarea id="code" class="answer code" data-inp="sessText" spellcheck="false" autocapitalize="off" autocomplete="off" ${locked ? 'readonly' : ''}>${esc(S.text)}</textarea>
      ${S.codeErr && S.phase !== 'feedback' ? `<pre class="code-out bad">${esc(S.codeErr)}</pre>` : ''}${S.codeOut && S.phase !== 'feedback' ? `<pre class="code-out">${esc(S.codeOut)}</pre>` : ''}
      ${!locked ? '<div class="hint">Runs in your browser against hidden tests. Tab indents; Ctrl/⌘ + Enter runs. Three attempts.</div>' : ''}`;
  } else if (q.ptype === 'proof') {
    input = `<textarea id="answer" class="answer" data-inp="sessText" placeholder="${q.written ? 'Write your answer in full: definitions, each step, and the reason for it…' : 'Write your argument step by step…'}" aria-label="${q.written ? 'Your answer' : 'Your proof'}" ${locked ? 'readonly' : ''}>${esc(S.text)}</textarea>`;
  } else {
    input = `<label class="vh" for="pans">Your answer</label>
      <input id="pans" class="pinput" data-inp="pans" value="${esc(S.text)}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Your answer" ${locked ? 'readonly' : ''}>
      <div id="pprev" class="pprev" aria-live="polite"></div>
      ${!locked ? `<div class="hint">${FMT_HINT[q.ptype] || ''}</div>` : ''}`;
  }
  let notes = '';
  if (A.hint && S.phase === 'q') notes += `<div class="notice"><b>Hint:</b> ${mdToHtml(q.hint).replace(/^<p>|<\/p>$/g, '')}</div>`;
  if (A.msg && S.phase === 'q') notes += `<div class="notice ${A.msgKind || 'bad'}">${A.msg}${A.tries && q.ptype !== 'choice' && q.ptype !== 'proof' && AI.ok() && !A.disputed ? ` <button class="linkish" data-act="dispute">My answer is equivalent. Check it.</button>` : ''}</div>`;
  if (S.phase === 'checking') notes += `<div class="thinking"><span class="pulse"></span>${esc(S.checkMsg || 'Checking…')}</div>`;
  const photo = AI.images && AI.ok() && q.ptype !== 'code' ? `<div class="row"><label class="btn ghost sm" for="workFile">${ic('camera', 16)} Check my written work</label><input type="file" id="workFile" class="vh" accept="${esc(AI.imgTypes)}" data-file="work"></div>` : '';
  const photoFb = S.photoText || S.photoBusy ? `<div class="photo-fb" id="photoFb">${photoFbInner(S)}</div>` : '<div id="photoFb"></div>';
  let actions = '';
  if (q.worked) return workedHtml(S, q, info);
  const steps = solSteps(q.solution), shownSteps = Math.max(q.fade || 0, A.steps || 0);
  const given = steps && shownSteps ? steps.slice(0, shownSteps) : null;
  const strict = S.exam || S.strict;
  if (S.phase === 'q') actions = `<button class="btn ghost" data-act="giveUp">${strict ? 'Skip' : 'Show solution'}</button>${q.hint && !A.hint && !strict ? '<button class="btn" data-act="phint">Hint</button>' : ''}${steps && !strict && (A.hint || !q.hint) && shownSteps < steps.length - 1 ? '<button class="btn" data-act="pstep">Show next step</button>' : ''}<button class="btn primary" data-act="pcheck" id="pcheckBtn" ${A.tries === 0 && !S.conf ? 'disabled' : ''}>${q.ptype === 'code' ? 'Run tests' : 'Check'}</button>`;
  else if (S.phase === 'checking') actions = `<button class="btn primary" disabled>Checking…</button>`;
  else if (S.phase === 'feedback') actions = `${S.fb.verdict !== 'correct' ? `<button class="btn" data-act="askTutorProblem">Ask the tutor</button>` : ''}${nextBtn(S)}`;
  return `<div class="qwrap" style="--c:${info ? info.subject.color : 'var(--accent)'}">
      <div class="qhead"><span class="eyebrow">${hideTopic(S) ? 'Problem ' + (S.i + 1) : esc(q.skill) + ' · ' + esc(info ? info.title : '')}</span>${diff}${keyState(q)}${A.tries && S.phase === 'q' ? `<span class="tries">Attempt ${A.tries + 1} of ${q.ptype === 'code' ? 3 : 2}</span>` : ''}</div>
      <div class="q-prompt prose">${mdToHtml(q.prompt)}</div>
      ${given && S.phase === 'q' ? `<div class="given"><div class="eyebrow">${q.fade && !A.steps ? `Given: the first ${given.length} step${given.length > 1 ? 's' : ''}. Finish the solution.` : `Step${given.length > 1 ? 's' : ''} 1–${given.length} of ${steps.length}. Take it from here.`}</div><div class="prose sm">${mdToHtml(given.join('\n'))}</div></div>` : ''}
      ${input}${S.phase === 'q' && A.tries === 0 ? confRow(S) : ''}${notes}
      ${S.phase === 'feedback' ? problemFbHtml(q, S.fb, S) : ''}
      ${photo}${photoFb}
    </div>
    <div class="sess-actions">${actions}</div>`;
}
function photoFbInner(S) {
  if (S.photoBusy && !S.photoText) return `<div class="thinking" style="margin:0"><span class="pulse"></span>Reading your work…</div>`;
  return `<div class="eyebrow" style="margin-bottom:6px">Your written work</div><div class="prose sm">${mdToHtml(S.photoText || '')}</div>${S.photoErr ? `<div class="notice bad">${esc(S.photoErr)}</div>` : ''}`;
}
function problemFbHtml(q, fb, S) {
  const cls = fb.verdict === 'correct' ? 'good' : 'bad';
  const head = fb.verdict === 'correct' ? (fb.firstTry ? 'Solved first try' : 'Solved') : fb.gaveUp ? 'Here’s the solution' : 'Not solved';
  let h = `<div class="fb ${cls}"><div class="fb-h">${head}${fb.verdict !== 'correct' ? `<span class="fb-score">Answer: ${answerHtml(q)}</span>` : ''}</div>`;
  if (q.ptype === 'code' && fb.verdict !== 'correct' && S.codeErr) h += `<pre class="code-out bad">${esc(S.codeErr)}</pre>`;
  if (q.ptype === 'code' && q.reference) h += `<details ${fb.verdict !== 'correct' ? 'open' : ''}><summary>Reference solution (passes every test)</summary><pre class="code-out">${esc(q.reference)}</pre></details><details><summary>The tests</summary><pre class="code-out">${esc(q.tests)}</pre></details>`;
  if (fb.doubt) h += `<div class="notice warn">This problem’s answer key couldn’t be confirmed${q.keyNote ? ': ' + esc(q.keyNote) : ''}. It doesn’t count toward your stats.</div>`;
  if (q.vstate === 'fixed') h += `<div class="notice">The original answer key (${esc(q.origAnswer)}) was wrong and was corrected after an independent re-solve${q.keyNote ? ': ' + esc(q.keyNote) : ''}.</div>`;
  if (fb.hyper) h += `<p class="hyper"><b>High-confidence miss.</b> You were sure on the first attempt. Find the exact step where your reasoning diverged; this gap is weighted higher.</p>`;
  if (fb.note) h += `<p>${fieldHtml(fb.note)}</p>`;
  if (fb.diag) h += `<p><b>Likely mistake:</b> ${fieldHtml(fb.diag)}</p>`;
  else if (fb.diagBusy) h += `<div class="thinking" style="margin:0"><span class="pulse"></span>Working out where it went wrong…</div>`;
  if (fb.root) h += rootLine(fb.root);
  if (fb.hits && q.rubric) h += `<ul class="rubric">${q.rubric.map((r, i) => `<li><span class="m ${fb.hits[i] ? 'y' : 'n'}">${fb.hits[i] ? '✓' : '✗'}</span><span>${esc(r)}</span></li>`).join('')}</ul>`;
  if (fb.feedback) h += `<div class="prose sm">${mdToHtml(fb.feedback)}</div>`;
  const last = S.att.wrong[S.att.wrong.length - 1];
  if (fb.verdict !== 'correct' && last && q.ptype === 'expression' && (q.vars || ['x']).length === 1 && MX.ok() && MX.parses(last) && MX.parses(q.answer)) {
    const v = (q.vars && q.vars[0]) || 'x', sub = e => MX.norm(e).replace(new RegExp('\\b' + v + '\\b', 'g'), '(x)');
    h += `<details open><summary>Your answer vs. the correct one</summary><div class="plot" data-spec="${esc(`f: ${sub(last)} | your answer\nf: ${sub(q.answer)} | correct`)}"></div></details>`;
  }
  h += `<details ${fb.verdict !== 'correct' ? 'open' : ''}><summary>Worked solution</summary><div class="prose sm">${mdToHtml(q.solution)}</div></details>`;
  if (fb.gapLabel) h += `<div class="fb-gaps"><span class="eyebrow">${SESSION.kind === 'repair' ? 'Still open' : 'Gap logged'}</span><span class="gap-chip">${esc(fb.gapLabel)}</span></div>`;
  if (!fb.doubt) h += fb.reported ? '<p class="small muted">Reported. This problem no longer counts toward your stats or gaps.</p>' : `<div><button class="linkish small" data-act="reportProblem">This problem is broken. Don’t count it.</button></div>`;
  return h + '</div>';
}
let prevRaf = 0;
function schedPreview() { if (prevRaf) return; prevRaf = requestAnimationFrame(() => { prevRaf = 0; renderPreview(); }); }
function renderPreview() {
  const el = $('#pprev'); const S = SESSION;
  if (!el || !S) return;
  const q = S.questions[S.i]; const v = String(S.text || '').trim();
  if (!v || !q || q.type !== 'problem') { el.innerHTML = ''; return; }
  const parts = q.ptype === 'numbers' ? v.split(/[,;]/).map(x => x.trim()).filter(Boolean) : [v];
  const texs = parts.map(p => MX.tex(p));
  if (texs.some(t => t == null)) { el.innerHTML = MX.ok() ? '<span class="lbl">Reads as</span><span class="small muted">…can’t read that yet</span>' : ''; return; }
  const tex = texs.join(',\\; ');
  const MJ = window.MathJax;
  if (MJ && typeof MJ.tex2svg === 'function') {
    try { const node = MJ.tex2svg(tex, {display:false}); el.innerHTML = '<span class="lbl">Reads as</span>'; el.appendChild(node); return; } catch (e) {}
  }
  el.innerHTML = '<span class="lbl">Reads as</span><code>' + esc(tex) + '</code>';
}

function summaryHtml(S, kindLabel) {
  const X = S.summary;
  if (!X) return `<div class="summary"><h1>Session ended</h1><p class="muted">Nothing was answered, so nothing was recorded.</p><div class="row"><button class="btn primary" data-act="endSummary">Done</button></div></div>`;
  const pc = Math.round(X.avg * 100);
  const line = pc >= 85 ? 'Strong. The interval before this comes back will grow.' : pc >= 60 ? 'Solid, with holes. The gaps below are where to spend the next session.' : 'This exposed real gaps, which is the point. Repair them now while the feedback is fresh.';
  const nowProf = X.changes.filter(c => c.before < PROFICIENT && c.after >= PROFICIENT && nodeInfo(c.k)).map(c => c.k);
  const changes = X.changes.slice().sort((a, b) => (b.after - b.before) - (a.after - a.before)).map(c => { const i = nodeInfo(c.k); const d = c.after - c.before; return i ? `<div class="change"><span>${esc(i.title)}</span><span class="v">${c.before}% → ${c.after}% <span class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : ''}${d}</span></span></div>` : ''; }).join('');
  const gapNodes = [...new Set(X.newGaps.map(g => g.node))];
  const probs = X.problems;
  const skillRows = probs ? Object.entries(probs.skills).map(([k, v]) => `<div class="change"><span>${esc(k)}</span><span class="v">${v.c}/${v.a}</span></div>`).join('') : '';
  const cal = S.kind !== 'vocab' ? calStats() : null;
  const nodeI = S.node && nodeInfo(S.node);
  const examLine = X.exam ? `<div class="notice ${X.exam.passed ? 'good' : 'warn'}" style="margin-top:0"><b>${X.exam.passed ? 'Passed' : 'Not passed yet'}: ${Math.round(X.exam.score * 100)}%</b> (pass mark ${EXAM_PASS * 100}%${X.exam.unanswered ? `; ${X.exam.unanswered} unanswered count as zero` : ''}). ${X.exam.passed ? 'This course’s exam requirement is complete.' : 'Repair the gaps below, then retake it.'}</div>` : '';
  const readyLine = S.kind === 'readiness' ? `<div class="notice ${S.readyPassed ? 'good' : 'warn'}" style="margin-top:0">${S.readyPassed ? 'Ready. The topic is open.' : 'Not ready yet: the misses were logged as gaps on the prerequisite topics. Repair those first, or skip the check from the topic page.'}</div>` : '';
  const retLine = S.retainedNow && S.retainedNow.length ? `<div class="notice good" style="margin-top:0"><b>Retention confirmed</b> on ${S.retainedNow.map(k => esc(nodeInfo(k).title)).join(', ')}: recalled weeks after first study.</div>` : '';
  const testLine = X.test ? `<div class="notice ${X.test.passed ? 'good' : 'warn'}" style="margin-top:0"><b>${X.test.passed ? 'Passed' : 'Not passed yet'}: ${X.test.got} of ${X.test.total} right (${Math.round(X.test.score * 100)}%)</b>. Pass mark ${TEST_PASS * 100}%; no partial credit. ${X.test.passed ? '' : 'Work through the missed points below, then retake it.'}</div>` : '';
  return `<div class="summary">${examLine}${testLine}${readyLine}${retLine}
    <div><div class="eyebrow">${kindLabel} complete · ${esc(S.title)}</div><div class="pct">${probs ? probs.solved + '/' + probs.n : pc + '%'}</div><p class="muted" style="margin-top:6px">${probs ? `${probs.first} right on the first try. ` : ''}${line}</p></div>
    <div class="sum-stats">
      <div><span>XP earned</span><b>+${X.xp}</b></div>
      <div><span>Answered</span><b>${X.n}</b></div>
      ${S.kind === 'repair' ? `<div><span>Gaps closed</span><b>${X.resolved.length}</b></div>` : `<div><span>Gaps found</span><b>${X.newGaps.length}</b></div>`}
      ${cal && cal.n >= 10 ? `<div><span>Calibration</span><b>${cal.over > 0.05 ? '+' + Math.round(cal.over * 100) : cal.over < -0.05 ? Math.round(cal.over * 100) : '±0'}</b></div>` : ''}
    </div>
    ${skillRows ? `<div class="card"><div class="eyebrow" style="margin-bottom:4px">By skill · right</div>${skillRows}</div>` : ''}
    ${nowProf.length ? `<div class="notice good" style="margin-top:0"><b>You can now:</b> ${nowProf.map(k => esc(nodeInfo(k).title)).join('; ')}. Proficient.</div>` : ''}
    ${changes ? `<div class="card"><div class="eyebrow" style="margin-bottom:4px">What got stronger</div>${changes}</div>` : ''}
    ${X.resolved.length ? `<div class="card stack"><div class="eyebrow">Gaps closed</div>${X.resolved.map(g => `<div class="gap-item resolved"><div class="t"><b>${esc(g.concept)}</b></div></div>`).join('')}</div>` : ''}
    ${X.newGaps.length ? `<div class="card stack"><div class="eyebrow">Gaps found</div>${X.newGaps.map(g => `<div class="gap-item"><div class="t"><b>${fieldHtml(g.concept)}</b><p>${fieldHtml(g.detail)}</p>${g.root && nodeInfo(g.root) ? `<p class="root">Likely root: ${esc(nodeInfo(g.root).title)} · ${esc(nodeInfo(g.root).subject.name)}</p>` : ''}</div></div>`).join('')}</div>` : ''}
    ${nodeI ? summaryProgress(nodeI) : ''}
    <div class="row">
      ${nodeI ? summaryNext(S, nodeI) : `${gapNodes.length === 1 && AI.ok() ? `<button class="btn warn" data-act="repair" data-arg="${gapNodes[0]}">Repair these gaps now</button>` : ''}${gapNodes.length > 1 ? `<button class="btn warn" data-act="nav" data-arg="gaps">Go to gaps</button>` : ''}`}
      <button class="btn ${nodeI ? 'ghost' : 'primary'}" data-act="endSummary">${nodeI && S.back && S.back.name === 'topic' ? 'Back to topic' : 'Done'}</button>
    </div>
  </div>`;
}


/* where this session left you: topic stage and subject level, so progress toward the next milestone is visible */
function summaryProgress(info) {
  const n = Store.nodes[info.key], st = topicStage(n), L = subjectLevel(info.subject);
  return `<section class="panel hud" style="display:grid;gap:12px">
    <div class="spread"><div><div class="eyebrow">Topic stage</div><b style="font-size:1.05rem">${STAGES[st]}</b></div><span class="mono-t" style="color:var(--accent)">${mastery(n)}%</span></div>
    <div class="stagebar" style="margin-top:0">${STAGES.slice(1).map((l, i) => `<div class="${st >= i + 1 ? 'on' : ''} ${st === i + 1 ? 'cur' : ''}"><i></i><span>${l}</span></div>`).join('')}</div>
    <p class="muted small">${esc(stageHint(n, info))}</p>
    <div class="divider" style="margin:2px 0"></div>
    <div class="spread"><div><div class="eyebrow">${esc(info.subject.name)} level</div><b>Lv ${L.i} · ${L.name}</b></div><span class="small muted">${L.next ? `${L.toNext} topic${L.toNext === 1 ? '' : 's'} to ${L.next}` : 'Top level'}</span></div>
    ${levelTicks(L)}
  </section>`;
}
function summaryNext(S, info) {
  const F = topicFlow(info), nx = F.next, ai = AI.ok();
  const setBtn = cls => `<button class="btn ${cls}" data-act="practice" data-arg="${info.key}" ${ai ? '' : 'disabled'}>${info.program || info.lang ? 'Another set' : 'Practice again'}</button>`;
  if (!nx || nx.act === 'practice') return nx ? `<button class="btn primary" data-act="practice" data-arg="${info.key}" ${ai ? '' : 'disabled'}>Next · ${esc(nx.label)}</button>` : (info.program || info.lang ? setBtn('primary') : '');
  const ok = nx.act === 'tutorAbout' || ai;
  return `<button class="btn primary" data-act="${nx.act}" data-arg="${esc(nx.arg)}" ${ok ? '' : 'disabled'}>Next · ${esc(nx.label)}</button>${info.program || info.lang ? setBtn('') : ''}`;
}

function hideTopic(S) { return S.kind === 'mixed' || S.kind === 'exam'; }
function workedHtml(S, q, info) {
  return `<div class="qwrap">
      <div class="qhead"><span class="eyebrow">Worked example · ${esc(q.skill)}</span></div>
      <div class="q-prompt prose">${mdToHtml(q.prompt)}</div>
      <div class="given"><div class="eyebrow">Study each step: say why it’s the right move before reading the next</div><div class="prose sm">${mdToHtml(q.solution)}</div></div>
      <p class="muted small">New topic, so you start with one fully worked problem. The next one comes half-solved; after that you solve alone. Studying worked examples first measurably speeds up novices.</p>
    </div>
    <div class="sess-actions"><button class="btn primary" data-act="studied">I’ve studied it · next</button></div>`;
}

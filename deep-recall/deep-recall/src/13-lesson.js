/* ------------------------------------------------------------------ lesson */
function parseLesson(md) {
  const lines = String(md).split('\n');
  const blocks = []; let buf = [], heading = '', fence = false;
  const flush = () => { if (buf.length) { blocks.push({type:'md', text:buf.join('\n')}); buf = []; } };
  const CHK = /^\s*\**CHECK\**\s*:\**\s*/, ANS = /^\s*\**ANSWER\**\s*:\**\s*/;
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    if (/^\s*```/.test(L)) fence = !fence;
    const h = !fence && L.match(/^##\s+(.*)/); if (h) heading = h[1].replace(/\s*\[[^\]]*\]\s*$/, '').trim();
    if (!fence && CHK.test(L)) {
      flush();
      let q = L.replace(CHK, ''), a = '', j = i + 1;
      while (j < lines.length && !ANS.test(lines[j]) && !/^#/.test(lines[j]) && !CHK.test(lines[j])) { if (lines[j].trim()) q += ' ' + lines[j].trim(); j++; }
      if (j < lines.length && ANS.test(lines[j])) {
        a = lines[j].replace(ANS, ''); j++;
        while (j < lines.length && lines[j].trim() && !/^#/.test(lines[j]) && !CHK.test(lines[j])) { a += '\n' + lines[j]; j++; }
      }
      blocks.push({type:'check', q:q.trim(), a:a.trim(), heading});
      i = j - 1; continue;
    }
    buf.push(L);
  }
  flush();
  return blocks;
}
function sectionBullets(md, name) {
  const re = new RegExp('^##\\s+' + name + '\\s*$', 'im');
  const m = String(md).split(re)[1];
  if (!m) return [];
  return m.split(/^##\s/m)[0].split('\n').filter(l => /^\s*[-*•]\s+/.test(l)).map(l => l.replace(/^\s*[-*•]\s+/, '').trim());
}
function extractKeyPoints(md) { return sectionBullets(md, '(?:Key points|Puntos clave)').slice(0, 10); }
/* "- term — meaning (note)" lines under ## Vocabulary / ## Vocabulario */
function extractVocab(md) {
  return sectionBullets(md, '(?:Vocabulary|Vocabulario)').map(l => {
    const clean = l.replace(/\{\{|\}\}/g, '').replace(/\*\*/g, '');
    const m = clean.match(/^(.+?)\s+[—–-]{1,2}\s+(.+?)(?:\s*\(([^)]*)\))?\s*$/);
    return m ? {t:m[1].trim(), m:m[2].trim(), n:(m[3] || '').trim()} : null;
  }).filter(Boolean).slice(0, 40);
}
const KP_TAG = /^(#{2,3}\s+.*?)\s*\[\s*k\d+(?:\s*[,;]\s*k\d+)*\s*\]\s*$/gm;
function lessonCoverage(md) { const ids = new Set(); String(md).replace(/^#{2,3}\s+.*\[([^\]]*)\]\s*$/gm, (m, g) => { (g.match(/k\d+/g) || []).forEach(x => ids.add(x)); return m; }); return ids; }
function lessonMdHtml(md, info) {
  md = String(md).replace(KP_TAG, '$1');
  let ci = 0;
  const opts = {lang:info.lang ? info.lang.code : null};
  return parseLesson(md).map(b => {
    if (b.type === 'md') return mdToHtml(b.text, opts);
    const i = ci++, st = LESSON.checks[i] || {};
    return `<div class="check">
      <div class="eyebrow">Recall check</div>
      <div class="q">${mdToHtml(b.q, opts).replace(/^<p>|<\/p>$/g, '')}</div>
      <textarea data-inp="chk:${i}" aria-label="Your answer to the recall check" placeholder="Answer from memory before revealing…" ${st.shown ? 'readonly' : ''}>${esc(st.ans || '')}</textarea>
      ${st.shown ? `<div class="ans">${mdToHtml(b.a || '…', opts)}</div>
        ${st.rate ? `<div class="rated">${st.rate === 'missed' ? 'Logged as a gap.' : st.rate === 'partly' ? 'Marked partly right.' : 'Marked as recalled.'}</div>` :
        `<div class="row"><span class="small muted">How did you do?</span><button class="btn sm" data-act="chkRate" data-arg="${i}|missed">Missed it</button><button class="btn sm" data-act="chkRate" data-arg="${i}|partly">Partly</button><button class="btn go sm" data-act="chkRate" data-arg="${i}|got">Got it</button></div>`}` :
        `<div><button class="btn sm" data-act="chkShow" data-arg="${i}" ${b.a ? '' : 'disabled'}>Reveal answer</button></div>`}
    </div>`;
  }).join('');
}
let lessonRaf = 0;
function schedLesson() { if (lessonRaf) return; lessonRaf = requestAnimationFrame(() => { lessonRaf = 0; renderLessonBody(); }); }
function renderLessonBody() {
  const body = $('#lessonBody'); if (!body || !LESSON) return;
  const info = nodeInfo(LESSON.key), L = LESSON;
  let h = '';
  if (L.status === 'loading') h = `<h1>${esc(info.title)}</h1><div class="skel"><i style="width:92%"></i><i style="width:80%"></i><i style="width:86%"></i><i style="width:60%"></i></div>`;
  else if (L.status === 'noai') h = `<h1>${esc(info.title)}</h1><div class="notice warn">This lesson hasn’t been written yet, and writing it needs Claude, which isn’t available in this view.</div>`;
  else if (L.status === 'researching') h = `<h1>${esc(info.title)}</h1><div class="thinking"><span class="pulse"></span>Preparing: syllabus, sources, and scope before writing.</div><div class="weblog">${(L.webLog || []).map(x => `<span>${esc(x)}</span>`).join('')}</div>`;
  else if (!L.md) h = `<h1>${esc(info.title)}</h1><div class="skel"><i style="width:92%"></i><i style="width:80%"></i><i style="width:86%"></i></div><div class="thinking"><span class="pulse"></span>Writing your lesson${L.source ? ' from your source' : ''}${L.web ? ' from fresh web sources' : ''}. Detailed lessons take 20–60 seconds to start.</div>`;
  else h = lessonMdHtml(L.md, info);
  body.innerHTML = h;
  if (L.status !== 'streaming') typeset(body);
}
function renderLessonAfter() {
  const el = $('#lessonAfter'); if (!el || !LESSON) return;
  const L = LESSON, info = nodeInfo(L.key), k = kindOf(info.subject);
  let h = '';
  if (L.status === 'streaming' || L.status === 'researching') h = `<div class="stream-bar"><span class="pulse"></span>${L.status === 'researching' ? 'Researching…' : 'Writing…'}<button class="btn ghost sm" data-act="stopLesson">Stop</button></div>`;
  else if (L.status === 'error') h = `<div class="notice bad">${esc(L.err)}</div><div class="row" style="margin-top:10px">${AI.ok() ? '<button class="btn primary" data-act="rewrite">Try again</button>' : ''}</div>`;
  else if (L.status === 'stopped') h = `<div class="notice">Stopped before the lesson finished.</div><div class="row" style="margin-top:10px"><button class="btn primary" data-act="rewrite" ${AI.ok() ? '' : 'disabled'}>Write it again</button></div>`;
  else if (L.status === 'done') {
    const d = L.depth ? (DEPTHS[L.depth] || {}).label : null;
    const next = k === 'lang' ? {h:'Now use it', p:'Exercises built on this lesson: translation both ways, fill-in-the-blank, sentence building, and listening. Mistakes are tagged by type (gender, case, word order…) so you can see your patterns.', b:'Start exercises'}
      : k === 'program' || k === 'skills' ? {h:'Now solve problems', p:`A problem set at level ${levelFor(L.key)}. Every answer key is re-solved independently before it grades you; you get two attempts and a hint; misses are diagnosed and logged.`, b:'Start problems'}
      : {h:'Practice until it sticks', p:'Seven questions: multiple choice built from real misconceptions, plus answers you write yourself that Claude grades against a rubric. Every miss is logged as a specific gap.', b:'Start practice'};
    h = `${L.truncated ? '<div class="notice warn">This lesson hit the length limit and ends early. Rewrite it for a complete version.</div>' : ''}
    ${L.webNote ? `<div class="notice">${esc(L.webNote)}</div>` : ''}
    ${L.auditing ? '<div class="thinking"><span class="pulse"></span>An independent checker is reviewing this lesson for errors and gaps…</div>' : L.audit ? `<div class="notice ${L.audit.applied || L.audit.notes ? '' : 'good'}"><b>Audited.</b> ${L.audit.applied ? `${L.audit.applied} correction${L.audit.applied > 1 ? 's' : ''} applied in place. ` : ''}${L.audit.notes ? `${L.audit.notes} note${L.audit.notes > 1 ? 's' : ''} added at the end. ` : ''}${!L.audit.applied && !L.audit.notes ? 'No errors found. ' : ''}${esc(L.audit.verdict || '')}${L.audit.uncovered && L.audit.uncovered.length ? ` Not fully covered: ${esc(L.audit.uncovered.join(', '))}; practice will target them.` : ''}</div>` : ''}
    ${L.vocabAdded ? `<div class="notice good">${L.vocabAdded} new words from this lesson were added to your ${esc(info.subject.name)} vocabulary deck.</div>` : ''}
    <section class="card lesson-next">
      <div><div class="eyebrow">Next</div><h3>${next.h}</h3><p style="margin-top:6px">${next.p}</p></div>
      <div class="row"><button class="btn primary" data-act="practiceFromLesson" ${AI.ok() ? '' : 'disabled'}>${next.b}</button>
      ${k !== 'lang' ? `<button class="btn" data-act="task" data-arg="dump|${L.key}|after" ${AI.ok() ? '' : 'disabled'}>Close it and brain-dump</button>` : ''}
      <button class="btn ghost" data-act="rewrite" ${AI.ok() ? '' : 'disabled'}>Rewrite lesson</button></div>
    </section>
    <section class="card tutor">
      <div class="eyebrow">Ask your ${esc(info.subject.name)} tutor about this lesson</div>
      <div class="chips">${TUTOR_CHIPS.map((c, i) => `<button class="chip-btn" data-act="lessonAsk" data-arg="${i}" ${AI.ok() ? '' : 'disabled'}>${esc(c.label)}</button>`).join('')}</div>
      <form id="lessonAskForm" class="tutor-form">
        <textarea id="lessonAskInput" data-inp="lessonAsk" rows="2" placeholder="Ask anything about this lesson" aria-label="Question for the tutor">${esc(L.askDraft || '')}</textarea>
        <button class="btn primary" type="submit" ${AI.ok() ? '' : 'disabled'}>Ask</button>
      </form>
      <p class="hint">Opens the ${esc(info.subject.name)} tutor with this lesson in focus, so the conversation stays in one place.</p>
    </section>
    ${L.created ? `<div class="meta-line">Written ${new Date(L.created).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}${d ? ' · ' + d + ' depth' : ''}${L.web ? ' · with web sources' : ''}${L.sourceTitle ? ' · from “' + esc(L.sourceTitle) + '”' : ''}</div>` : ''}`;
  }
  el.innerHTML = h;
}
async function openLesson(key) {
  const info = nodeInfo(key); if (!info) return;
  closeSheet();
  if (LESSON && LESSON.ctl) LESSON.ctl.abort();
  const L = LESSON = {key, md:'', status:'loading', checks:{}, askDraft:''};
  Store.profile.lastNode = key; Store.saveProfile();
  go('lesson');
  const c = await Store.getLesson(key);
  if (LESSON !== L) return;
  if (c && c.md) { Object.assign(L, {md:c.md, status:'done', created:c.created, depth:c.depth, web:!!c.web, sourceTitle:c.sourceTitle || null, audit:c.audit || null}); renderLessonBody(); renderLessonAfter(); ensureOutline(key).catch(() => {}); return; }
  writeLesson();
}
/* opts.source: {title, url, text} to ground the lesson in the learner's own material */
async function writeLesson(opts) {
  opts = opts || {};
  const L = LESSON; if (!L) return;
  const info = nodeInfo(L.key);
  if (!AI.ok()) { L.status = 'noai'; renderLessonBody(); renderLessonAfter(); return; }
  if (L.ctl) L.ctl.abort();
  Object.assign(L, {md:'', checks:{}, prefetch:null, truncated:false, webNote:'', web:false, webLog:[], source:opts.source || null, sourceTitle:opts.source ? opts.source.title : null, vocabAdded:0});
  L.ctl = new AbortController();
  let brief = '';
  if (!opts.source && !info.lang && webWanted(info)) {
    if (WEB.ready()) {
      L.status = 'researching'; renderLessonBody(); renderLessonAfter(); window.scrollTo(0, 0);
      try {
        const r = await AI.text(researchPrompt(info), {signal:L.ctl.signal, tools:WEB.tools((name, input) => { L.webLog.push(webUseLabel(name, input)); if (LESSON === L && L.status === 'researching') renderLessonBody(); })});
        brief = String(r.text || '').slice(-9000); L.web = true;
      } catch (e) {
        if (LESSON !== L) return;
        if (e && e.code === 'cancelled') { L.status = 'stopped'; renderLessonBody(); renderLessonAfter(); return; }
        L.webNote = 'Web research didn’t go through, so this lesson uses Claude’s own knowledge only.';
      }
    } else {
      L.webNote = 'This lesson uses Claude’s own knowledge, which stops at its training date. Turn on web research under You for current sources.';
    }
  }
  if (LESSON !== L) return;
  if (!Store.outlines[L.key]) {
    L.status = 'researching'; L.webLog = (L.webLog || []).concat(['Mapping knowledge points against ' + syllabusFor(info)]); renderLessonBody(); renderLessonAfter();
    await ensureOutline(L.key, m => { if (LESSON === L) { L.webLog.push(m); renderLessonBody(); } }).catch(() => null);
    if (LESSON !== L) return;
  }
  L.status = 'streaming';
  renderLessonBody(); renderLessonAfter(); window.scrollTo(0, 0);
  const prompt = info.lang ? langLessonPrompt(info, openGapsFor(L.key).slice(0, 5), opts.source) : lessonPrompt(info, openGapsFor(L.key).slice(0, 5), brief, opts.source);
  try {
    const r = await AI.text(prompt, {
      modelTier:'default', cache:false, signal:L.ctl.signal,
      onText: ({text}) => { if (LESSON !== L) return; L.md = text; schedLesson(); }
    });
    if (LESSON !== L) return;
    L.md = r.text; L.status = 'done'; L.truncated = r.truncated; L.created = Date.now(); L.depth = Store.profile.depth;
    Store.saveLesson(L.key, {md:L.md, created:L.created, depth:L.depth, web:L.web, sourceTitle:L.sourceTitle || undefined});
    auditLesson(L, info);
    const n = ensureNode(L.key); n.keyPoints = extractKeyPoints(L.md); n.hasLesson = true; Store.saveNode(L.key);
    if (info.lang) L.vocabAdded = addVocab(info.sid, extractVocab(L.md), L.key);
    if (kindOf(info.subject) === 'concept') { const p = genQuestions(info, L.md, false); p.catch(() => {}); L.prefetch = p; }
  } catch (e) {
    if (LESSON !== L) return;
    if (e && e.text) L.md = e.text;
    L.status = e && e.code === 'cancelled' ? 'stopped' : 'error';
    L.err = errCopy(e);
  }
  renderLessonBody(); renderLessonAfter();
}
function lessonAsk(text) {
  const L = LESSON; text = String(text || '').trim(); if (!L || !text) return;
  const info = nodeInfo(L.key); L.askDraft = '';
  openTutor(info.sid, {focus:L.key, send:text});
}

/* independent fact-check after writing: exact-quote fixes are applied in place, the rest become visible audit notes */
async function auditLesson(L, info) {
  if (!AI.ok() || !L.md) return;
  L.auditing = true; renderLessonAfter();
  try {
    const o = Store.outlines[L.key];
    const r = await AI.json(lessonAuditPrompt(info, L.md, o), {modelTier:'default', cache:false});
    if (LESSON !== L) return;
    let md = L.md, applied = 0; const notes = [];
    (Array.isArray(r && r.issues) ? r.issues : []).slice(0, 8).forEach(x => {
      const q = str(x && x.quote), f = str(x && x.fix);
      if (q && f && md.split(q).length === 2) { md = md.replace(q, f); applied++; }
      else if (x && x.why) notes.push(`- **${str(x.severity) || 'note'}:** ${str(x.why)}${f ? ' Correct version: ' + f : ''}`);
    });
    const covered = lessonCoverage(md);
    let uncovered = (Array.isArray(r && r.uncovered) ? r.uncovered : []).map(str).filter(id => /^k\d+$/.test(id));
    if (o) o.kps.forEach(k => { if (covered.size && !covered.has(k.id) && !uncovered.includes(k.id)) uncovered.push(k.id); });
    if (notes.length) md += '\n\n## Audit notes\n' + notes.join('\n');
    L.md = md;
    L.audit = {at:Date.now(), applied, notes:notes.length, uncovered:uncovered.slice(0, 12), verdict:str(r && r.verdict).slice(0, 240)};
    Store.saveLesson(L.key, {md, created:L.created, depth:L.depth, web:L.web, sourceTitle:L.sourceTitle || undefined, audit:L.audit});
    if (uncovered.length) { const n = ensureNode(L.key); n.uncovered = uncovered.slice(0, 12); Store.saveNode(L.key); }
  } catch (e) { if (LESSON !== L) return; L.audit = null; }
  L.auditing = false;
  if (LESSON === L) { renderLessonBody(); renderLessonAfter(); }
}

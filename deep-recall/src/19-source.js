/* ------------------------------------------------------------------ learn from a source: paste, photo, link, or find */
function openSourceView(key) {
  closeSheet();
  const info = nodeInfo(key);
  SRC = {key:info ? info.key : '', sid:info ? info.sid : '', mode:'paste', stage:'pick', text:'', title:'', url:'', results:null, source:null, summary:'', hide:false};
  go('source');
}
async function openSavedSource(id) {
  closeSheet();
  const d = await Store.getDoc('sources', id);
  if (!d) { toast('That source couldn’t be loaded.'); return; }
  SRC = {key:d.node, sid:(nodeInfo(d.node) || {}).sid || '', mode:'paste', stage:'ready', source:{title:d.title, url:d.url, text:d.text, id}, summary:'', hide:false};
  go('source');
}
VIEWS.source = () => {
  const S = SRC; if (!S) { setTimeout(() => go('home'), 0); return ''; }
  const info = nodeInfo(S.key);
  const s = info ? info.subject : null;
  const back = info ? `data-act="topic" data-arg="${info.key}"` : 'data-act="nav" data-arg="home"';
  let body = '';
  if (!info) {
    const subs = allSubjects();
    const cs = S.sid && subj(S.sid);
    body = `<p class="muted">Pick the topic this material belongs to, so its lesson, gaps, and questions land in the right place.</p>
      <div class="stack" style="margin-top:12px">
        <label class="eyebrow" for="srcSid">Subject</label>
        <select id="srcSid" class="field" data-sel="sid"><option value="">Choose a subject</option>${subs.map(x => `<option value="${x.id}" ${S.sid === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
        ${cs ? `<label class="eyebrow" for="srcKey">Topic</label><select id="srcKey" class="field" data-sel="key"><option value="">Choose a topic</option>${cs.units.map((u, ui) => `<optgroup label="${esc(u.t)}">${u.n.map((t, ni) => `<option value="${cs.id}-${ui}-${ni}">${esc(t)}</option>`).join('')}</optgroup>`).join('')}</select>` : ''}
      </div>`;
  } else if (S.stage === 'pick' || S.stage === 'load' || S.stage === 'results') {
    const tabs = [['paste', 'Paste text'], ['photo', 'Photo of a page'], ['link', 'Web link'], ['find', 'Find one for me']];
    const webOff = !WEB.ready() && (S.mode === 'link' || S.mode === 'find');
    body = `<div class="tabs" role="tablist">${tabs.map(([m, l]) => `<button role="tab" aria-selected="${S.mode === m}" class="${S.mode === m ? 'on' : ''}" data-act="srcMode" data-arg="${m}">${l}</button>`).join('')}</div>
      ${webOff ? `<div class="notice warn">This needs web search. <button class="linkish" data-act="webConnect">Connect it</button>${WEB.msg ? ' · ' + esc(WEB.msg) : ''}</div>` : ''}
      ${S.mode === 'paste' ? `<div class="stack" style="margin-top:12px"><label class="eyebrow" for="srcTitle">Title</label><input id="srcTitle" class="field" data-inp="src:title" value="${esc(S.title)}" placeholder="e.g. Chapter 3: The Chain Rule">
        <label class="eyebrow" for="srcText">Text</label><textarea id="srcText" class="answer tall" data-inp="src:text" placeholder="Paste an article, chapter, notes, or transcript…">${esc(S.text)}</textarea>
        <div class="row"><button class="btn primary" data-act="srcUsePaste">Use this text</button></div></div>` : ''}
      ${S.mode === 'photo' ? (AI.images && AI.ok() ? `<div class="stack" style="margin-top:12px"><p class="muted">Photograph a textbook page, handout, or your own notes. Claude transcribes it (equations included); add more pages after.</p>
        <div class="row"><label class="btn primary" for="srcImg">${ic('camera', 16)} Choose a photo</label><input id="srcImg" type="file" class="vh" accept="${esc(AI.imgTypes)}" data-file="srcImg"></div></div>` : '<div class="notice warn">Photos can’t be sent to Claude in this view.</div>') : ''}
      ${S.mode === 'link' && WEB.ready() ? `<div class="stack" style="margin-top:12px"><label class="eyebrow" for="srcUrl">Link</label><input id="srcUrl" class="field" data-inp="src:url" value="${esc(S.url)}" placeholder="https://…" inputmode="url">
        <div class="row"><button class="btn primary" data-act="srcFetch">Read this page</button></div></div>` : ''}
      ${S.mode === 'find' && WEB.ready() ? `<div class="stack" style="margin-top:12px"><p class="muted">Searches for in-depth, reputable explanations of “${esc(info.title)}”. Pick one to read.</p>
        <div class="row"><button class="btn primary" data-act="srcFind">${S.results ? 'Search again' : 'Search'}</button></div>
        ${S.results ? (S.results.length ? `<div class="stack">${S.results.map((r, i) => `<button class="opt" data-act="srcPickResult" data-arg="${i}"><span class="stack" style="gap:3px;min-width:0"><b>${esc(r.title || r.url)}</b><span class="small muted">${esc((r.url || '').replace(/^https?:\/\//, '').slice(0, 60))}${r.publish_date ? ' · ' + esc(r.publish_date) : ''}</span><span class="small">${esc(str((r.excerpts || [])[0]).replace(/\s+/g, ' ').slice(0, 180))}…</span></span></button>`).join('')}</div>` : '<div class="notice">No results. Try again.</div>') : ''}</div>` : ''}
      ${S.stage === 'load' ? `<div class="thinking"><span class="pulse"></span>${esc(S.loadMsg || 'Loading…')}</div>` : ''}
      ${S.err ? `<div class="notice bad">${esc(S.err)}</div>` : ''}`;
  } else if (S.stage === 'ready') {
    const src = S.source, words = str(src.text).split(/\s+/).filter(Boolean).length;
    body = `<section class="card stack">
        <div class="gap-group-h"><span class="mono" style="--c:${s.color}">${ic('doc', 18)}</span><div class="t"><b>${esc(src.title)}</b><span>${src.url ? `<a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.url.replace(/^https?:\/\//, '').slice(0, 50))}</a> · ` : ''}${words.toLocaleString()} words</span></div></div>
        <details><summary>Read the source</summary><div class="prose sm source-text">${mdToHtml(str(src.text).slice(0, 60000))}</div></details>
      </section>
      ${S.mode === 'photo' && AI.images ? `<div class="row" style="margin-top:10px"><label class="btn ghost sm" for="srcImg2">${ic('camera', 16)} Add another page</label><input id="srcImg2" type="file" class="vh" accept="${esc(AI.imgTypes)}" data-file="srcImg"></div>` : ''}
      <h2 class="section-h">What do you want to do with it?</h2>
      <div class="stack">
        <button class="choice-card" data-act="srcLesson" ${AI.ok() ? '' : 'disabled'}><b>Guided: turn it into a lesson and practice</b><span>Claude builds the lesson around this source, adds the context it assumes, flags where it’s wrong or one-sided, then quizzes you.</span></button>
        <button class="choice-card" data-act="srcSummaryStart" ${AI.ok() ? '' : 'disabled'}><b>Self-directed: read it, then summarize it from memory</b><span>You read it, hide it, and write the summary. Claude audits it for accuracy and completeness and logs what you missed. This is rung 3 of the ladder.</span></button>
      </div>`;
  } else if (S.stage === 'summary' || S.stage === 'grading') {
    const src = S.source;
    body = `<section class="card stack">
        <div class="row" style="justify-content:space-between"><b>${esc(src.title)}</b><button class="btn ghost sm" data-act="srcToggleHide">${S.hide ? 'Show the source' : 'Hide the source'}</button></div>
        ${S.hide ? '<p class="muted small">Hidden. Write from memory; that’s what makes it stick.</p>' : `<div class="prose sm source-text">${mdToHtml(str(src.text).slice(0, 60000))}</div>`}
      </section>
      <p class="muted" style="margin-top:12px">When you’re ready, hide the source and summarize it: its main claims, the reasoning or evidence behind them, and anything you think is questionable.</p>
      <textarea class="answer tall" data-inp="src:summary" aria-label="Your summary" placeholder="The source argues that…" ${S.stage === 'grading' ? 'readonly' : ''}>${esc(S.summary)}</textarea>
      <div class="row" style="margin-top:10px"><button class="btn primary" data-act="srcSummarySubmit" ${S.stage === 'grading' ? 'disabled' : ''}>Audit my summary</button></div>
      ${S.stage === 'grading' ? '<div class="thinking"><span class="pulse"></span>Comparing your summary with the source…</div>' : ''}
      ${S.err ? `<div class="notice bad">${esc(S.err)}</div>` : ''}`;
  } else if (S.stage === 'result') {
    const r = S.result;
    body = `<section class="card stack">
      <div class="sum-stats"><div><span>Overall</span><b>${Math.round(r.score * 100)}%</b></div><div><span>Accuracy</span><b>${Math.round(clamp01(r.accuracy) * 100)}%</b></div><div><span>Completeness</span><b>${Math.round(clamp01(r.completeness) * 100)}%</b></div></div>
      ${r.feedback ? `<div class="prose sm">${mdToHtml(r.feedback)}</div>` : ''}
      ${r.distortions && r.distortions.length ? `<div class="stack"><div class="eyebrow">Distorted or wrong</div>${r.distortions.map(d => `<div class="gap-item"><div class="t"><b>${esc(d.claim)}</b><p>${esc(d.correction)}</p></div></div>`).join('')}</div>` : ''}
      ${r.missed && r.missed.length ? `<div class="stack"><div class="eyebrow">Missed</div>${r.missed.map(m => `<div class="gap-item"><div class="t"><b>${esc(m.point)}</b><p>${esc(m.why_it_matters || '')}</p></div></div>`).join('')}</div>` : ''}
      ${r.captured && r.captured.length ? `<div><div class="eyebrow" style="margin-bottom:6px">You captured</div><div class="skills">${r.captured.map(c => `<span class="skill">${esc(c)}</span>`).join('')}</div></div>` : ''}
      ${r.root_topic && nodeInfo(r.root_topic) ? rootLine({key:r.root_topic, why:r.root_reason}) : ''}
      <div class="row"><button class="btn primary" data-act="practice" data-arg="${info.key}" ${AI.ok() ? '' : 'disabled'}>Practice this topic</button><button class="btn" data-act="task" data-arg="qwrite|${info.key}">Write questions on it</button><button class="btn ghost" data-act="topic" data-arg="${info.key}">Back to topic</button></div>
    </section>`;
  }
  return `<div style="--c:${s ? s.color : 'var(--accent)'}">
    <header class="subbar"><button class="icon-btn" ${back} aria-label="Back">${ic('back', 20)}</button><div class="subbar-t crumbs">${s ? esc(s.name) + ' / <b>' + esc(info.title) + '</b>' : '<b>Study a source</b>'}</div></header>
    <header class="page-h" style="padding-top:4px"><div class="eyebrow">Learn from a source</div><h1>${info ? esc(info.title) : 'Something you’re reading'}</h1></header>
    ${body}
  </div>`;
};
async function saveSourceToTopic(S) {
  if (S.source.id) return;
  const id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  S.source.id = id;
  Store.saveSource(id, {node:S.key, title:S.source.title, url:S.source.url || null, text:str(S.source.text).slice(0, 60000), created:Date.now()});
  const n = ensureNode(S.key); n.sources = (n.sources || []).concat([{id, title:S.source.title.slice(0, 80)}]).slice(-12); Store.saveNode(S.key);
}
async function sourceFromImage(file) {
  const S = SRC; if (!S || !AI.ok()) return;
  const appending = S.stage === 'ready' && S.source;
  S.stage = appending ? 'ready' : 'load'; S.loadMsg = 'Transcribing the page…'; S.err = ''; render();
  if (appending) toast('Transcribing the next page…');
  try {
    const r = await AI.text('Transcribe the text in this image faithfully as Markdown. Keep headings, lists, and tables. Write equations in LaTeX inside \\( \\) or \\[ \\]. Describe each figure or diagram in one bracketed line, like [Figure: …]. Output only the transcription.', {images:file, cache:false});
    if (SRC !== S) return;
    const text = str(r.text).trim();
    if (appending) { S.source.text += '\n\n---\n\n' + text; if (S.source.id) { const id = S.source.id; S.source.id = null; Store.remove(Store.path('sources', id)); } }
    else S.source = {title:S.title || ('Photo · ' + new Date().toLocaleDateString()), url:null, text};
    S.stage = 'ready';
  } catch (e) { if (SRC !== S) return; S.stage = appending ? 'ready' : 'pick'; S.err = errCopy(e); if (appending) toast(errCopy(e)); }
  render();
}
async function sourceFetch(url) {
  const S = SRC; if (!S) return;
  S.stage = 'load'; S.loadMsg = 'Reading the page…'; S.err = ''; render();
  try {
    const x = await webFetch(url, 'Full content of this page for studying ' + (nodeInfo(S.key) || {}).title);
    if (SRC !== S) return;
    S.source = {title:x.title, url:x.url, text:x.text}; S.stage = 'ready';
  } catch (e) { if (SRC !== S) return; S.stage = 'pick'; S.err = webErrCopy(e); }
  render();
}
async function sourceFind() {
  const S = SRC; if (!S) return; const info = nodeInfo(S.key);
  S.stage = 'load'; S.loadMsg = 'Searching…'; S.err = ''; render();
  try {
    const res = await webSearch(`In-depth, reputable explanations of "${info.title}" (${info.subject.name}) suitable for rigorous self-study: textbooks, university course notes, encyclopedias, primary sources, or serious long-form articles. Avoid thin SEO pages.`, [info.title, info.title + ' explained', info.subject.name + ' ' + info.title]);
    if (SRC !== S) return;
    S.results = res.slice(0, 8); S.stage = 'results';
  } catch (e) { if (SRC !== S) return; S.stage = 'pick'; S.err = webErrCopy(e); }
  render();
}
async function sourceSummarySubmit() {
  const S = SRC; if (!S || S.stage === 'grading') return;
  const info = nodeInfo(S.key), summary = str(S.summary).trim(); if (summary.length < 60) { S.err = 'Write a few sentences of summary first.'; render(); return; }
  S.stage = 'grading'; S.err = ''; render();
  try {
    const r = await AI.json(`A learner read the source below and then wrote a summary from memory, in a study app. Topic: ${topicLine(info)}. Level: ${depthLine()}
SOURCE (${S.source.title}):
"""
${str(S.source.text).slice(0, 30000)}
"""
LEARNER'S SUMMARY:
"""
${summary.slice(0, 8000)}
"""
Evaluate accuracy (no distortions of what the source says), completeness (captured the main claims and the reasoning or evidence behind them), and whether they kept the source's claims distinct from established fact where the source is contestable.
${rootSnippet(info.key)}
Reply with only JSON:
{"accuracy":<0.0 to 1.0>,"completeness":<0.0 to 1.0>,"score":<0.0 to 1.0 overall>,"captured":["short labels"],"missed":[{"point":"...","why_it_matters":"...","concept":"max 6 words"}],"distortions":[{"claim":"what they wrote","correction":"what the source actually says, or what is actually true","concept":"max 6 words"}],"feedback":"2-4 sentences","root_topic":null,"root_reason":null}
At most 5 missed and 4 distortions. ${NOTATION}`, {modelTier:'default', cache:false});
    if (SRC !== S) return;
    r.score = clamp01(r && r.score != null ? r.score : mean([clamp01(r && r.accuracy), clamp01(r && r.completeness)]));
    S.result = r; S.stage = 'result';
    (Array.isArray(r.distortions) ? r.distortions : []).slice(0, 4).forEach((d, i) => addGap(S.key, Object.assign({concept:str(d.concept) || 'Source misread', detail:`Wrote “${str(d.claim).slice(0, 100)}”. ${str(d.correction)}`, boost:1}, i === 0 && r.root_topic ? {root_topic:r.root_topic, root_reason:r.root_reason} : {})));
    (Array.isArray(r.missed) ? r.missed : []).slice(0, 3).forEach(m => addGap(S.key, {concept:str(m.concept) || 'Missed point', detail:str(m.point) + (m.why_it_matters ? ' — ' + str(m.why_it_matters) : '')}));
    await saveSourceToTopic(S);
    const n = ensureNode(S.key); n.last = Date.now(); Store.saveNode(S.key);
    addMeta(info.sid, 'summary', r.score);
    addXP(10 + Math.round(r.score * 10));
  } catch (e) { if (SRC !== S) return; S.stage = 'summary'; S.err = errCopy(e); }
  render();
}
Object.assign(ACT, {
  source: a => openSourceView(a),
  openSource: id => openSavedSource(id),
  srcMode: m => { if (!SRC) return; SRC.mode = m; SRC.err = ''; if (SRC.stage !== 'ready') SRC.stage = m === 'find' && SRC.results ? 'results' : 'pick'; render(); },
  srcUsePaste: () => { const S = SRC; if (!S) return; const t = str(S.text).trim(); if (t.length < 200) { S.err = 'Paste at least a few paragraphs.'; render(); return; } S.source = {title:str(S.title).trim() || 'Pasted text · ' + new Date().toLocaleDateString(), url:null, text:t}; S.stage = 'ready'; S.err = ''; render(); },
  srcFetch: () => { if (!SRC) return; const u = str(SRC.url).trim(); if (!/^https?:\/\/\S+\.\S+/.test(u)) { SRC.err = 'Enter a full link starting with https://'; render(); return; } sourceFetch(u); },
  srcFind: () => sourceFind(),
  srcPickResult: i => { const r = SRC && SRC.results && SRC.results[+i]; if (r && r.url) sourceFetch(r.url); },
  srcLesson: async () => {
    const S = SRC; if (!S || !S.source) return;
    await saveSourceToTopic(S);
    if (LESSON && LESSON.ctl) LESSON.ctl.abort();
    LESSON = {key:S.key, md:'', status:'loading', checks:{}, askDraft:''};
    Store.profile.lastNode = S.key; Store.saveProfile();
    go('lesson');
    writeLesson({source:S.source});
  },
  srcSummaryStart: () => { if (SRC) { SRC.stage = 'summary'; SRC.hide = false; render(); } },
  srcToggleHide: () => { if (SRC) { SRC.hide = !SRC.hide; render(); } },
  srcSummarySubmit: () => sourceSummarySubmit()
});

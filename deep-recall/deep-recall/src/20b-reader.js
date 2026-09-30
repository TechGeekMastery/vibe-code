/* ------------------------------------------------------------------ languages: graded reading, listening, and shadowing */
let READER = null;
function readerPrompt(info) {
  const L = info.lang, lvl = (info.unit.split('·')[0] || 'A1').trim();
  const known = deck(info.sid).filter(c => (c.box || 0) >= 2).slice(-40).map(c => c.t).join(', ');
  return `Write a graded reading text for a ${L.name} learner at level ${lvl}. ${L.note}
It must practice the topic "${info.title}" (${info.unit}): use its structures naturally and often. Everyday, concrete subject matter; a short story, dialogue, or message with some narrative pull. 8 to 14 sentences, vocabulary at or just above ${lvl}${known ? `; reuse some of these words the learner knows: ${known}` : ''}.
Then 4 comprehension questions written in ${L.name} at the same level, each with 3 options, testing understanding (who, why, what happened next), not word matching. Then a glossary of 6 to 10 useful words from the text.
Reply with only JSON: {"title":"in ${L.name}","sentences":[{"t":"${L.name} sentence","tr":"${L.base} translation"}],"questions":[{"prompt":"...","options":["...","...","..."],"answer":<index>,"explanation":"in ${L.base}"}],"glossary":[{"t":"${L.name} word with article for nouns","m":"${L.base} meaning"}]}`;
}
async function openReader(key) {
  const info = nodeInfo(key); if (!info || !info.lang || !AI.ok()) return;
  const R = READER = {key, status:'loading', mode:'read', shown:{}, answers:{}, rated:{}};
  Store.profile.lastNode = key; Store.saveProfile();
  go('reader');
  try {
    const r = await AI.json(readerPrompt(info), {modelTier:'default', cache:false});
    if (READER !== R) return;
    const sentences = (Array.isArray(r && r.sentences) ? r.sentences : []).filter(x => x && x.t).map(x => ({t:str(x.t), tr:str(x.tr)}));
    if (sentences.length < 3) throw {code:'invalid_json'};
    const questions = (Array.isArray(r.questions) ? r.questions : []).filter(q => q && Array.isArray(q.options) && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length).map(q => ({prompt:str(q.prompt), options:q.options.map(str), answer:q.answer, explanation:str(q.explanation)}));
    Object.assign(R, {status:'ready', title:str(r.title), sentences, questions, glossary:(Array.isArray(r.glossary) ? r.glossary : []).filter(g => g && g.t && g.m)});
  } catch (e) { if (READER !== R) return; R.status = 'error'; R.err = errCopy(e); }
  if (VIEW.name === 'reader' && READER === R) render();
}
VIEWS.reader = () => {
  const R = READER, info = R && nodeInfo(R.key);
  if (!info) { setTimeout(() => go('home'), 0); return ''; }
  const L = info.lang, code = L.code;
  const head = `<header class="subbar"><button class="icon-btn" data-act="topic" data-arg="${R.key}" aria-label="Back to topic">${ic('back', 20)}</button><div class="subbar-t crumbs">${esc(info.subject.name)} / <b>Reading & listening</b></div></header>`;
  if (R.status === 'loading') return head + `<div class="sess-load"><div class="eyebrow">Graded reader</div><h1>${esc(info.title)}</h1><div class="thinking"><span class="pulse"></span>Writing a text at your level that uses this topic’s grammar…</div></div>`;
  if (R.status === 'error') return head + `<div class="notice bad">${esc(R.err)}</div><div class="row" style="margin-top:10px"><button class="btn primary" data-act="reader" data-arg="${R.key}">Try again</button></div>`;
  const say = (t, slow) => `<button class="say-b" type="button" data-act="${slow ? 'saySlow' : 'say'}" data-arg="${esc(t)}" data-lang="${code}" aria-label="Listen${slow ? ' slowly' : ''}">${ic('speaker', 15)}</button>`;
  const tabs = [['read', 'Read'], ['listen', 'Listen first'], ['shadow', 'Shadow']];
  let body = '';
  if (R.mode === 'read') body = `<div class="reader prose">${R.sentences.map((s, i) => `<p class="rs"><span lang="${code}">${esc(s.t)}</span>${say(s.t)}${R.shown[i] ? `<span class="tr">${esc(s.tr)}</span>` : `<button class="linkish small" data-act="rdShow" data-arg="${i}">translate</button>`}</p>`).join('')}</div>`;
  else if (R.mode === 'listen') body = `<p class="muted small">Listen to the whole text without reading, then answer the questions. Reveal the text afterwards to check what you missed.</p>
    <div class="row"><button class="btn primary" data-act="rdPlayAll" data-arg="1">${ic('speaker', 16)} Play</button><button class="btn" data-act="rdPlayAll" data-arg="0.7">${ic('speaker', 16)} Play slowly</button><button class="btn ghost" data-act="rdMode" data-arg="read">Reveal the text</button></div>`;
  else {
    const i = R.sh || 0, s = R.sentences[i];
    body = `<p class="muted small">Shadowing: play a sentence, then say it aloud at the same time as a second play, matching rhythm and sounds. Rate yourself honestly.</p>
      <section class="card stack"><div class="eyebrow">Sentence ${i + 1} of ${R.sentences.length}</div><p style="font-size:1.15rem" lang="${code}">${esc(s.t)}</p><p class="muted small">${esc(s.tr)}</p>
      <div class="row"><button class="btn" data-act="say" data-arg="${esc(s.t)}" data-lang="${code}">${ic('speaker', 16)} Play</button><button class="btn" data-act="saySlow" data-arg="${esc(s.t)}" data-lang="${code}">${ic('speaker', 16)} Slow</button></div>
      <div class="row"><span class="small muted">How close were you?</span>${['Rough', 'Close', 'Matched'].map((l, j) => `<button class="btn sm ${R.rated[i] === j ? 'primary' : ''}" data-act="rdRate" data-arg="${i}|${j}">${l}</button>`).join('')}</div></section>`;
  }
  const qs = R.questions.map((q, qi) => { const a = R.answers[qi]; return `<div class="card stack"><b lang="${code}">${qi + 1}. ${esc(q.prompt)}</b><div class="opts">${q.options.map((o, oi) => { let c = ''; if (a != null) { if (oi === q.answer) c = 'ok'; else if (oi === a) c = 'no'; } return `<button class="opt ${c}" data-act="rdAns" data-arg="${qi}|${oi}" ${a != null ? 'disabled' : ''}><span class="opt-k">${'ABC'[oi]}</span><span lang="${code}">${esc(o)}</span></button>`; }).join('')}</div>${a != null && q.explanation ? `<p class="small muted">${esc(q.explanation)}</p>` : ''}</div>`; }).join('');
  const done = R.questions.length && Object.keys(R.answers).length === R.questions.length;
  return head + `<header class="page-h" style="padding-top:4px"><div class="eyebrow">Graded reader · ${esc(info.unit)}</div><h1 lang="${code}">${esc(R.title || info.title)}</h1></header>
    <nav class="tabs">${tabs.map(([k, l]) => `<button class="${R.mode === k ? 'on' : ''}" data-act="rdMode" data-arg="${k}">${l}</button>`).join('')}</nav>
    <div style="margin-top:14px">${body}</div>
    <div class="section-h"><h2>Comprehension</h2><span class="eyebrow">${Object.keys(R.answers).length}/${R.questions.length}</span></div>
    <div class="stack">${qs}</div>
    ${done ? `<div class="notice good">${R.questions.filter((q, i) => R.answers[i] === q.answer).length} of ${R.questions.length} right. Recorded to this topic.</div>` : ''}
    ${R.glossary && R.glossary.length ? `<div class="section-h"><h2>Words from this text</h2>${R.added ? '<span class="eyebrow">added</span>' : `<button class="btn sm" data-act="rdAddWords">Add ${R.glossary.length} to my deck</button>`}</div><div class="card">${R.glossary.map(g => `<div class="change"><span lang="${code}">${esc(g.t)} ${say(g.t)}</span><span class="v">${esc(g.m)}</span></div>`).join('')}</div>` : ''}
    <div class="row" style="margin-top:18px"><button class="btn" data-act="reader" data-arg="${R.key}">Another text</button><button class="btn ghost" data-act="topic" data-arg="${R.key}">Back to topic</button></div>`;
};
function readerFinish(R) {
  const score = mean(R.questions.map((q, i) => R.answers[i] === q.answer ? 1 : 0));
  const n = ensureNode(R.key), p = n.p = n.p || {a:0, c:0, f:0, ema:null};
  p.a += R.questions.length; p.c += R.questions.filter((q, i) => R.answers[i] === q.answer).length; p.f += R.questions.filter((q, i) => R.answers[i] === q.answer).length;
  p.ema = p.ema == null ? score : p.ema * 0.8 + score * 0.2;
  n.mastery = Math.round(100 * p.ema * Math.min(1, p.a / 10)); n.last = Date.now(); if (!n.firstAt) n.firstAt = Date.now();
  const sk = n.skills = n.skills || {}; const x = sk['reading comprehension'] = sk['reading comprehension'] || {a:0, c:0}; x.a += R.questions.length; x.c += Math.round(score * R.questions.length);
  if (score < 0.75) addGap(R.key, {concept:'Reading comprehension', detail:'Missed ' + R.questions.filter((q, i) => R.answers[i] !== q.answer).length + ' of ' + R.questions.length + ' comprehension questions on a graded text.'});
  Store.saveNode(R.key); addXP(4 + Math.round(score * 8));
}
function playAll(R, rate) {
  const L = nodeInfo(R.key).lang; const ss = window.speechSynthesis; if (!ss) { toast('This device can’t play speech.'); return; }
  ss.cancel();
  R.sentences.forEach(s => { const u = new SpeechSynthesisUtterance(s.t); u.lang = L.code; u.rate = rate; const v = voiceFor(L.code); if (v) u.voice = v; ss.speak(u); });
}
Object.assign(ACT, {
  reader: a => openReader(a),
  rdMode: m => { if (READER) { READER.mode = m; render(); } },
  rdShow: i => { if (READER) { READER.shown[i] = true; render(); } },
  rdPlayAll: r => { if (READER) playAll(READER, +r); },
  rdRate: a => { const [i, j] = a.split('|').map(Number); const R = READER; if (!R) return; R.rated[i] = j; R.sh = Math.min(R.sentences.length - 1, i + 1); render(); },
  rdAns: a => { const [qi, oi] = a.split('|').map(Number); const R = READER; if (!R || R.answers[qi] != null) return; R.answers[qi] = oi; if (Object.keys(R.answers).length === R.questions.length) readerFinish(R); render(); },
  rdAddWords: () => { const R = READER; if (!R || R.added) return; const n = addVocab(nodeInfo(R.key).sid, R.glossary.map(g => ({t:str(g.t), m:str(g.m)})), R.key); R.added = true; toast(n + ' words added'); render(); },
  saySlow: (a, el) => speak(a, el && el.dataset.lang, true)
});

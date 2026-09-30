/* ------------------------------------------------------------------ languages: lessons, exercises, vocabulary */
const LANG_CHARS = {de:['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'], ca:['à', 'è', 'é', 'í', 'ï', 'ò', 'ó', 'ú', 'ü', 'ç', 'l·l', '’']};
const LANG_ERR_TYPES = 'gender, case, word order, conjugation, tense, agreement, article, preposition, pronoun, spelling, accent, vocabulary, false friend, castellanismo, register, other';
function langContrast(L) {
  return L.code.startsWith('ca')
    ? 'Contrast explicitly with Castilian in every section: what works the same, what differs, and the trap a Spanish speaker falls into.'
    : 'Where English does it differently, say so; point out false friends and the logic behind German word order and case.';
}
function langLessonPrompt(info, gaps, source) {
  const L = info.lang, ca = L.code.startsWith('ca');
  const H = ca ? {mist:'Errores frecuentes', voc:'Vocabulario', key:'Puntos clave'} : {mist:'Common mistakes', voc:'Vocabulary', key:'Key points'};
  return `You write ${L.name} lessons for the self-study app "Deep Recall". ${L.note}
The learner is working through "${info.unit}". Lesson topic: "${info.title}". Level of explanation: ${depthLine()}
${gaps.length ? `The learner has shown these specific gaps; repair each explicitly:\n${gapLines(gaps)}\n` : ''}${source ? `Build the lesson around this material the learner is studying (${source.title}):\n"""\n${String(source.text).slice(0, 20000)}\n"""\n` : ''}
${Store.outlines[info.key] ? `Teach every one of this topic's knowledge points, in order (syllabus anchored to ${Store.outlines[info.key].ref}):\n${Store.outlines[info.key].kps.map(k => k.id + ': ' + k.t + ': ' + k.d).join('\n')}\nEnd each section heading with the ids it covers in square brackets, e.g. "## Word order [k2,k3]".\n` : ''}Write all explanations in ${L.base}. Wrap every ${L.name} example sentence or phrase the learner should hear in {{double braces}}, one sentence per pair of braces, e.g. {{${ca ? 'Em dic Anna.' : 'Ich heiße Anna.'}}}. The app adds a listen button.

Format (Markdown):
# ${info.title}
One or two sentences on what this lets the learner say or understand.

Then ${Store.outlines[info.key] ? 'one section per 2 to 3 knowledge points' : '3 or 4 sections'}:
## <heading>
A clear rule of thumb, why the language works this way, and 4 to 6 example sentences, each followed by its ${L.base} translation in parentheses. ${langContrast(L)}
CHECK: a short task: translate a ${L.base} sentence into ${L.name}, or transform or complete a ${L.name} sentence
ANSWER: the correct ${L.name} answer(s)

Then these sections, with exactly these headings:
## ${H.mist}
3 to 5 bullets: the typical error${ca ? ' (castellanismo, calque, or false friend a Spanish speaker makes)' : ''} and the correct form.
## ${H.voc}
10 to 16 bullets in exactly this form: - {{term}} — meaning (short note)
For nouns include the article${ca ? ' (el/la, l’) and irregular plurals' : ' (der/die/das) and the plural in the note, e.g. (pl. die Hunde)'}; for verbs note irregularities.
## ${H.key}
4 to 6 bullets.

No LaTeX. Write nothing before the title line.`;
}
function langItemsPrompt(opts) {
  const {infos, n} = opts, L = infos[0].lang;
  const errs = errorsFor(infos.map(i => i.key)).slice(0, 5);
  const gaps = []; infos.forEach(i => openGapsFor(i.key).slice(0, 3).forEach(g => gaps.push(`- [${i.key}] ${g.concept}: ${g.detail}`)));
  const listen = !!voiceFor(L.code) || !(window.speechSynthesis && window.speechSynthesis.getVoices().length);
  return `Write ${n} ${L.name} exercises for the self-study app "Deep Recall". ${L.note}
${opts.intro || ''}
Topics (ids):
${infos.map(i => `- ${i.key}: ${i.title} (${i.unit})`).join('\n')}
${opts.keyPoints ? `What the lesson covered:\n${opts.keyPoints}\n` : ''}${infos.length === 1 ? kpBlock(infos[0].key, n, 'json') + '\n' : ''}${gaps.length ? `Open gaps to target:\n${gaps.join('\n')}\n` : ''}${errs.length ? `The learner's most frequent error types: ${errs.map(([t, c]) => t + ' ×' + c).join(', ')}. Include items that exercise these.\n` : ''}
Instructions, hints, and translations are in ${L.base}. Use vocabulary and structures at or below the learner's level, recycle the topic's grammar in natural everyday sentences, and make every item test the topic's point.
Item types (JSON):
{"type":"translate_to","node":"id","prompt":"a ${L.base} sentence to translate into ${L.name}","answers":["every acceptable ${L.name} translation, most natural first"],"focus":"grammar or vocabulary point, max 5 words"}
{"type":"translate_from","node":"id","prompt":"a ${L.name} sentence","answers":["acceptable ${L.base} translations"],"focus":"..."}
{"type":"cloze","node":"id","prompt":"a ${L.name} sentence with ___ for one missing word or short phrase","answers":["the missing text","any other correct fill"],"hint":"${L.base} hint, e.g. the base form","translation":"${L.base} translation of the whole sentence","focus":"..."}
{"type":"choice","node":"id","prompt":"a ${L.base} question about which ${L.name} form is correct, quoting the sentence","options":["...","...","..."],"answer":<index>,"explanation":"why, in ${L.base}","focus":"..."}
{"type":"build","node":"id","prompt":"a ${L.base} sentence","answer":"its ${L.name} translation","distractors":["1 to 3 wrong ${L.name} words that test the grammar point"],"focus":"..."}
${listen ? `{"type":"listen","node":"id","text":"a ${L.name} sentence the learner will hear and type","translation":"${L.base} translation","focus":"listening"}\n` : ''}Distribution: ${opts.distribution || `about 30% translate_to, 15% translate_from, 20% cloze, 10% choice, 15% build${listen ? ', 10% listen' : ''}`}. Order from easier to harder. Vary the correct option's position. No LaTeX.
Reply with only JSON: {"items":[...]${opts.withLesson ? ',"lesson":"Markdown explanation in ' + L.base + ', 200-400 words, one ### heading per gap, with {{' + L.name + ' examples}}"' : ''}}`;
}
function validateLangItems(arr, allowed, fallbackKey) {
  if (!Array.isArray(arr)) throw {code:'invalid_json'};
  const out = [];
  arr.forEach(x => {
    if (!x || typeof x !== 'object') return;
    const node = allowed.includes(x.node) ? x.node : (fallbackKey || allowed[0]);
    const base = {type:'lang', ltype:x.type, node, focus:str(x.focus).slice(0, 50) || 'general', gapIndex:Number.isInteger(x.gapIndex) ? x.gapIndex : null, kp:/^k\d+$/.test(str(x.kp)) ? str(x.kp) : null};
    const answers = Array.isArray(x.answers) ? x.answers.map(str).filter(Boolean) : [];
    if ((x.type === 'translate_to' || x.type === 'translate_from') && str(x.prompt) && answers.length) out.push(Object.assign(base, {prompt:str(x.prompt), answers}));
    else if (x.type === 'cloze' && /_{2,}/.test(str(x.prompt)) && answers.length) out.push(Object.assign(base, {prompt:str(x.prompt), answers, hint:str(x.hint), translation:str(x.translation)}));
    else if (x.type === 'choice' && Array.isArray(x.options) && x.options.length >= 2 && Number.isInteger(x.answer) && x.answer >= 0 && x.answer < x.options.length) {
      const idx = shuffle(x.options.map((_, i) => i));
      out.push(Object.assign(base, {prompt:str(x.prompt), options:idx.map(i => str(x.options[i])), answer:idx.indexOf(x.answer), explanation:str(x.explanation)}));
    }
    else if (x.type === 'build' && str(x.answer) && str(x.prompt)) {
      const words = str(x.answer).replace(/[.!?¿¡]+$/g, '').split(/\s+/).filter(Boolean);
      if (words.length < 2 || words.length > 14) return;
      const tokens = shuffle(words.concat((Array.isArray(x.distractors) ? x.distractors : []).map(str).filter(Boolean).slice(0, 3)));
      out.push(Object.assign(base, {prompt:str(x.prompt), answers:[str(x.answer)], tokens}));
    }
    else if (x.type === 'listen' && str(x.text)) out.push(Object.assign(base, {text:str(x.text), answers:[str(x.text)], translation:str(x.translation)}));
  });
  if (!out.length) throw {code:'invalid_json'};
  return out;
}
const normL = s => String(s || '').toLowerCase().replace(/[’`´]/g, "'").replace(/[¿¡"“”«»]/g, '').replace(/[.!?;:,]+/g, ' ').replace(/\s+/g, ' ').trim();
const stripAcc = s => normL(s).replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/·/g, '');
function langMatch(input, answers) {
  const a = normL(input); if (!a) return 'empty';
  if (answers.some(x => normL(x) === a)) return 'exact';
  const b = stripAcc(input);
  if (answers.some(x => stripAcc(x) === b)) return 'accent';
  return 'no';
}
function langGradePrompt(q, input, info) {
  const L = info.lang, toTarget = q.ltype === 'translate_to';
  return `Grade a translation in a ${L.name} course. ${L.note}
Task: translate into ${toTarget ? L.name : L.base}: "${q.prompt}"
Reference answers: ${q.answers.map(a => '"' + a + '"').join(' | ')}
Learner's answer: "${String(input).slice(0, 600)}"
Accept any natural, correct translation with the same meaning, not just the references. Be strict about grammar${toTarget ? ' (gender, case, agreement, word order, conjugation, prepositions, pronouns) and spelling, including accents' : ''}.
Reply with only JSON: {"correct":true or false,"score":<0.0 to 1.0>,"corrected":"the learner's sentence minimally corrected (or the same if correct)","errors":[{"type":"one of: ${LANG_ERR_TYPES}","explanation":"one sentence in ${L.base}"}],"feedback":"one or two sentences in ${L.base}"}`;
}

/* ---- starting language sessions */
function startLangSet(key, opts) {
  opts = opts || {};
  const info = nodeInfo(key); if (!info || !AI.ok()) return;
  closeSheet();
  const n = opts.count || 10;
  const S = SESSION = newSession({kind:'lang', title:info.title, back:opts.back || {name:'topic', key}, node:key, langCode:info.lang.code,
    loadMsg:`${n} exercises on “${info.title}”: translation both ways, fill-in-the-blank, sentence building${voiceFor(info.lang.code) ? ', and listening' : ''}. Mistakes are tagged by type.`});
  Store.profile.lastNode = key; Store.saveProfile();
  go('session');
  runSession(S, async S => {
    await outlineFirst(S, key);
    const n0 = Store.nodes[key];
    const kp = n0 && n0.keyPoints && n0.keyPoints.length ? n0.keyPoints.map(x => '- ' + x).join('\n') : null;
    const r = await AI.json(langItemsPrompt({infos:[info], n, keyPoints:kp, intro:`Every item uses node "${key}".`}), {modelTier:'default', cache:false, signal:S.ctl.signal});
    addQs(S, validateLangItems(r && r.items, [key], key));
  });
}
function startLangPlacement(sid, ui) {
  const s = subj(sid); const keys = unitKeys(s, ui), infos = keys.map(nodeInfo);
  const S = SESSION = newSession({kind:'placement', title:s.units[ui].t, back:{name:'subject', sid, course:ui}, langCode:s.lang.code,
    loadMsg:`A placement check across ${s.units[ui].t}: one or two items per topic, so you can skip what you already know.`});
  go('session');
  runSession(S, async S => {
    const r = await AI.json(langItemsPrompt({infos, n:Math.min(12, keys.length + 2), intro:'This is a placement check: spread items across the topics in order, one per topic, each testing that topic’s core point. Set "node" to the topic id.'}), {modelTier:'default', cache:false, signal:S.ctl.signal});
    addQs(S, validateLangItems(r && r.items, keys, keys[0]));
  });
}
async function langReviewJob(S, infos) {
  const keys = infos.map(i => i.key);
  const r = await AI.json(langItemsPrompt({infos, n:infos.length * 2, intro:'This is spaced review: 2 items per topic, interleaved, from fresh angles. Set "node" to the topic id.'}), {modelTier:'default', cache:false, signal:S.ctl.signal});
  addQs(S, validateLangItems(r && r.items, keys, keys[0]));
}
function startLangRepair(key, gaps) {
  const info = nodeInfo(key);
  const S = SESSION = newSession({kind:'repair', title:info.title, back:{name:'topic', key}, node:key, holdStream:true, langCode:info.lang.code,
    loadMsg:`Writing a targeted explanation and exercises for ${gaps.length} gap${gaps.length > 1 ? 's' : ''}.`});
  go('session');
  runSession(S, async S => {
    const r = await AI.json(langItemsPrompt({infos:[info], n:Math.min(8, gaps.length * 2), withLesson:true,
      intro:`Repair these specific gaps (2 items per gap; add "gapIndex": the 1-based gap number to each item):\n${gapLines(gaps)}\nFirst write the "lesson": for each gap, the wrong pattern, why it fails, and the correct pattern with examples.`}), {modelTier:'default', cache:false, signal:S.ctl.signal});
    const qs = validateLangItems(r && r.items, [key], key);
    qs.forEach(q => { const g = gaps[(q.gapIndex || 1) - 1] || gaps[0]; q.gapId = g.id; });
    S.intro = str(r && r.lesson) || null;
    S.questions.push(...qs);
  });
}

/* ---- language item view */
function langQuestionHtml(S, q) {
  const info = nodeInfo(q.node), L = info.lang, locked = S.phase !== 'q', code = L.code;
  const label = {translate_to:`Translate into ${L.name}`, translate_from:`Translate into ${L.base}`, cloze:'Fill in the blank', choice:'Choose the correct form', build:'Build the sentence', listen:'Type what you hear'}[q.ltype];
  const sayBtn = (t, slow) => `<button class="say-big" type="button" data-act="say" data-arg="${esc(t)}" data-lang="${code}" aria-label="${slow ? 'Listen slowly' : 'Listen'}">${ic('speaker', slow ? 18 : 24)}${slow ? '<span>slow</span>' : ''}</button>`;
  let prompt = '', input = '';
  if (q.ltype === 'translate_to') prompt = `<div class="q-prompt">${esc(q.prompt)}</div>`;
  else if (q.ltype === 'translate_from') prompt = `<div class="q-prompt say-row">${sayBtn(q.prompt)}<span lang="${code}">${esc(q.prompt)}</span></div>`;
  else if (q.ltype === 'cloze') prompt = `<div class="q-prompt" lang="${code}">${esc(q.prompt).replace(/_{2,}/, '<span class="blank">_____</span>')}</div>${q.translation ? `<div class="muted small">${esc(q.translation)}</div>` : ''}${q.hint ? `<div class="hint">Hint: ${esc(q.hint)}</div>` : ''}`;
  else if (q.ltype === 'choice') prompt = `<div class="q-prompt">${esc(q.prompt)}</div>`;
  else if (q.ltype === 'build') prompt = `<div class="q-prompt">${esc(q.prompt)}</div>`;
  else if (q.ltype === 'listen') prompt = `<div class="say-row">${sayBtn(q.text)}${sayBtn(q.text, true)}</div>${!voiceFor(code) ? `<div class="notice warn">No ${esc(L.name)} voice on this device, so it will play with the default voice.</div>` : ''}`;
  if (q.ltype === 'choice') {
    input = `<div class="opts">${q.options.map((o, i) => { let cls = ''; if (locked) { if (i === q.answer) cls = 'ok'; else if (i === S.sel) cls = 'no'; } else if (i === S.sel) cls = 'sel'; return `<button class="opt ${cls}" data-act="sel" data-arg="${i}" ${locked ? 'disabled' : ''}><span class="opt-k">${'ABCDEF'[i]}</span><span lang="${code}">${esc(o)}</span></button>`; }).join('')}</div>`;
  } else if (q.ltype === 'build') {
    if (!S.build) S.build = {picked:[], pool:q.tokens.map((t, i) => i)};
    const B = S.build;
    input = `<div class="build-line" aria-label="Your sentence">${B.picked.length ? B.picked.map((ix, pos) => `<button class="tok on" data-act="lunpick" data-arg="${pos}" ${locked ? 'disabled' : ''} lang="${code}">${esc(q.tokens[ix])}</button>`).join('') : '<span class="muted small">Tap the words below in order</span>'}</div>
      <div class="build-pool">${B.pool.map((ix, pos) => `<button class="tok" data-act="lpick" data-arg="${pos}" ${locked ? 'disabled' : ''} lang="${code}">${esc(q.tokens[ix])}</button>`).join('')}</div>`;
  } else {
    const target = q.ltype === 'translate_from' ? L.baseCode : code;
    const chars = (LANG_CHARS[info.sid] || []);
    input = `<form id="lansForm" class="stack"><label class="vh" for="lans">Your answer</label>
      <textarea id="lans" class="answer short" data-inp="lans" lang="${target}" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="${q.ltype === 'translate_from' ? 'In ' + esc(L.base) + '…' : 'In ' + esc(L.name) + '…'}" ${locked ? 'readonly' : ''}>${esc(S.text)}</textarea>
      ${!locked && q.ltype !== 'translate_from' && chars.length ? `<div class="charbar">${chars.map(c => `<button type="button" class="tok" data-act="lchar" data-arg="${c}">${c}</button>`).join('')}</div>` : ''}</form>`;
  }
  let fb = '';
  if (S.phase === 'grading') fb = `<div class="thinking"><span class="pulse"></span>Checking your ${q.ltype === 'translate_from' ? 'translation' : esc(L.name)}…</div>`;
  if (S.phase === 'feedback') fb = langFbHtml(q, S.fb, code);
  const actions = S.phase === 'q' ? `<button class="btn ghost" data-act="lskip">I don’t know</button><button class="btn primary" data-act="lcheck">Check</button>` : S.phase === 'feedback' ? nextBtn(S) : `<button class="btn primary" disabled>Checking…</button>`;
  return `<div class="qwrap" style="--c:${info.subject.color}">
      <div class="eyebrow">${label} · ${esc(q.focus)}</div>
      ${prompt}${input}${S.phase === 'q' ? confRow(S) : ''}${fb}
    </div>
    <div class="sess-actions">${actions}</div>`;
}
function langFbHtml(q, fb, code) {
  const cls = fb.verdict === 'correct' ? 'good' : fb.verdict === 'partial' ? 'warn' : 'bad';
  const head = fb.verdict === 'correct' ? 'Correct' : fb.verdict === 'partial' ? 'Almost' : 'Not quite';
  const best = q.ltype === 'listen' ? q.text : q.ltype === 'choice' ? q.options[q.answer] : q.answers[0];
  const say = t => q.ltype === 'translate_from' ? esc(t) : `<span class="say" lang="${code}">${esc(t)}<button class="say-b" type="button" data-act="say" data-arg="${esc(t)}" data-lang="${code}" aria-label="Listen">${ic('speaker', 15)}</button></span>`;
  let h = `<div class="fb ${cls}"><div class="fb-h">${head}</div>`;
  if (fb.hyper) h += `<p class="hyper"><b>High-confidence miss.</b> Worth a second look: this pattern is weighted higher in your gaps.</p>`;
  if (fb.note) h += `<p>${esc(fb.note)}</p>`;
  if (fb.corrected && fb.verdict !== 'correct') h += `<p><b>Corrected:</b> ${say(fb.corrected)}</p>`;
  if (fb.verdict !== 'correct' || q.ltype === 'listen' || q.ltype === 'translate_from') h += `<p><b>${q.ltype === 'translate_from' ? 'A good translation' : 'Answer'}:</b> ${say(best)}</p>`;
  if (q.ltype === 'listen' && q.translation) h += `<p class="muted">${esc(q.translation)}</p>`;
  if (fb.errors && fb.errors.length) h += `<ul class="rubric">${fb.errors.map(e => `<li><span class="m n">✗</span><span><b>${esc(e.type)}:</b> ${esc(e.explanation)}</span></li>`).join('')}</ul>`;
  if (fb.feedback) h += `<p>${esc(fb.feedback)}</p>`;
  if (q.explanation) h += `<p>${esc(q.explanation)}</p>`;
  if (fb.gapLabel) h += `<div class="fb-gaps"><span class="eyebrow">Gap logged</span><span class="gap-chip">${esc(fb.gapLabel)}</span></div>`;
  return h + '</div>';
}
async function langCheck(skip) {
  const S = SESSION; if (!S || S.phase !== 'q') return;
  const q = S.questions[S.i]; const info = nodeInfo(q.node);
  let input = q.ltype === 'build' ? (S.build ? S.build.picked.map(ix => q.tokens[ix]).join(' ') : '') : q.ltype === 'choice' ? (S.sel != null ? String(S.sel) : '') : String(S.text || '').trim();
  if (!skip && !input) return;
  if (skip) return langFinalize(S, q, 0, {errors:[], feedback:''});
  if (q.ltype === 'choice') { const ok = S.sel === q.answer; return langFinalize(S, q, ok ? 1 : 0, {errors:ok ? [] : [{type:'grammar choice', explanation:q.explanation || ''}]}); }
  const m = langMatch(input, q.answers);
  if (m === 'exact') return langFinalize(S, q, 1, {});
  if (m === 'accent') return langFinalize(S, q, 0.7, {note:'Right words, but check the accents or special letters.', errors:[{type:'accent', explanation:'Spelling marks differ from the correct form.'}]});
  if (q.ltype === 'cloze' || q.ltype === 'build' || q.ltype === 'listen' || !AI.ok()) {
    if (q.ltype === 'build' || q.ltype === 'cloze' || !AI.ok()) return langFinalize(S, q, 0, {errors:[{type:q.ltype === 'build' ? 'word order' : 'other', explanation:''}]});
  }
  S.phase = 'grading'; render();
  try {
    const g = await AI.json(langGradePrompt(q.ltype === 'listen' ? Object.assign({}, q, {ltype:'translate_to', prompt:'(dictation) ' + q.text}) : q, input, info), {modelTier:'quick'});
    if (SESSION !== S) return;
    const score = clamp01(g && g.score), ok = !!(g && g.correct) || score >= 0.85;
    S.phase = 'q';
    langFinalize(S, q, ok ? Math.max(score, 0.9) : score, {corrected:str(g && g.corrected), feedback:str(g && g.feedback), errors:Array.isArray(g && g.errors) ? g.errors.slice(0, 4).map(e => ({type:str(e.type).toLowerCase() || 'other', explanation:str(e.explanation)})) : []});
  } catch (e) {
    if (SESSION !== S) return;
    S.phase = 'q'; langFinalize(S, q, 0, {note:'Couldn’t grade automatically (' + errCopy(e) + '). Compare with the answer below.', errors:[]});
  }
}
function langFinalize(S, q, score, extra) {
  const correct = score >= 0.85;
  if (S.conf) recordCal(sidOf(S), S.conf, correct);
  const verdict = correct ? 'correct' : score >= 0.5 ? 'partial' : 'incorrect';
  noteBefore(S, q.node);
  const n = ensureNode(q.node);
  if (!(q.node in S.before)) S.before[q.node] = mastery(n);
  if (q.kp) recordKP(q.node, q.kp, score, S.conf);
  const p = n.p = n.p || {a:0, c:0, f:0, ema:null};
  p.a++; if (correct) { p.c++; p.f++; }
  bumpDay('a', 1); if (correct) { bumpDay('c', 1); n.solo = 1; }
  p.ema = p.ema == null ? score : p.ema * 0.8 + score * 0.2;
  const sk = n.skills = n.skills || {}; const s = sk[q.focus] = sk[q.focus] || {a:0, c:0}; s.a++; if (correct) s.c++;
  const errs = (extra.errors || []).filter(e => e.type);
  if (!correct) {
    n.errs = n.errs || {};
    errs.forEach(e => { n.errs[e.type] = (n.errs[e.type] || 0) + 1; });
    n.miss = n.miss || [];
    n.miss.unshift({p:(q.prompt || q.text || '').slice(0, 160), a:(q.ltype === 'build' && S.build ? S.build.picked.map(ix => q.tokens[ix]).join(' ') : String(S.text || '(skipped)')).slice(0, 90), e:(q.ltype === 'choice' ? q.options[q.answer] : q.answers[0]).slice(0, 80), t:Date.now()});
    n.miss = n.miss.slice(0, 6);
  }
  n.mastery = Math.round(100 * p.ema * Math.min(1, p.a / 10));
  n.last = Date.now(); Store.saveNode(q.node);
  let gapLabel = null;
  if (!correct && S.kind !== 'repair') {
    const t = errs[0] ? errs[0].type : 'recall';
    const r = addGap(q.node, {concept:(t + ': ' + q.focus).slice(0, 60), detail:(errs[0] && errs[0].explanation) || ('Missed: ' + (q.prompt || q.text || '').slice(0, 140)), boost:S.conf >= 75 ? 1 : 0});
    if (r) { gapLabel = r.gap.concept; if (!S.probGaps.includes(r.gap)) S.probGaps.push(r.gap); }
  }
  S.fb = Object.assign({verdict, score, gapLabel, hyper:S.conf >= 75 && !correct}, extra);
  S.results[S.i] = {node:q.node, score, gaps:[], gapId:q.gapId || null, recorded:true, lang:true, skill:q.focus, solved:correct, firstTry:correct};
  S.results[S.i].xp = correct ? 8 : score >= 0.5 ? 4 : 1; addXP(S.results[S.i].xp);
  S.phase = 'feedback'; render(); focusNext();
}

/* ---- vocabulary review */
function startVocab(sid, fromKey) {
  const s = subj(sid); if (!s || !s.lang) return;
  closeSheet();
  let cards = dueCards(sid).slice(0, 20);
  if (!cards.length) cards = deck(sid).slice().sort((a, b) => (a.box || 0) - (b.box || 0) || (a.due || 0) - (b.due || 0)).slice(0, 12);
  if (!cards.length) { toast('No words yet. Lessons add words to your deck.'); return; }
  const back = fromKey && nodeInfo(fromKey) ? {name:'topic', key:fromKey} : VIEW.name === 'review' ? {name:'review'} : VIEW.name === 'home' ? {name:'home'} : {name:'subject', sid};
  const S = SESSION = newSession({kind:'vocab', title:s.name + ' words', back, langCode:s.lang.code, phase:'q'});
  S.questions = shuffle(cards).map(c => ({type:'card', card:c, sid}));
  S.vstats = {right:0, wrong:0, promoted:0};
  go('session');
}
function cardHtml(S, q) {
  const s = subj(q.sid), L = s.lang, c = q.card, locked = S.phase !== 'q';
  const fb = S.fb;
  return `<div class="qwrap" style="--c:${s.color}">
      <div class="eyebrow">Say it in ${esc(L.name)} · box ${c.box || 0} of 7</div>
      <div class="q-prompt"><b>${esc(c.m)}</b>${c.n ? ` <span class="muted small">(${esc(c.n)})</span>` : ''}</div>
      <form id="lansForm"><label class="vh" for="lans">The ${esc(L.name)} word</label>
      <input id="lans" class="pinput" data-inp="lans" lang="${L.code}" value="${esc(S.text)}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${/^(der|die|das)\s/i.test(c.t) || /^(el|la|l')\s?/i.test(c.t) ? 'Include the article' : 'Type it'}" ${locked ? 'readonly' : ''}></form>
      ${!locked && (LANG_CHARS[s.id] || []).length ? `<div class="charbar">${LANG_CHARS[s.id].map(ch => `<button type="button" class="tok" data-act="lchar" data-arg="${ch}">${ch}</button>`).join('')}</div>` : ''}
      ${S.phase === 'feedback' ? `<div class="fb ${fb.verdict === 'correct' ? 'good' : fb.verdict === 'partial' ? 'warn' : 'bad'}"><div class="fb-h">${fb.verdict === 'correct' ? 'Correct' : fb.verdict === 'partial' ? 'Almost' : 'Not quite'}</div>
        <p><span class="say" lang="${L.code}"><b>${esc(c.t)}</b><button class="say-b" type="button" data-act="say" data-arg="${esc(c.t)}" data-lang="${L.code}" aria-label="Listen">${ic('speaker', 15)}</button></span>${fb.note ? ' · ' + esc(fb.note) : ''}</p>
        <p class="small muted">${fb.verdict === 'correct' ? `Next review ${dueIn(c.due).toLowerCase()}.` : 'Back to box 1; it comes back at the end of this session.'}</p></div>` : ''}
    </div>
    <div class="sess-actions">${S.phase === 'q' ? `<button class="btn ghost" data-act="lskip">Show me</button><button class="btn primary" data-act="lcheck">Check</button>` : nextBtn(S)}</div>`;
}
function cardCheck(skip) {
  const S = SESSION, q = S.questions[S.i], c = q.card;
  const input = String(S.text || '').trim(); if (!skip && !input) return;
  let verdict = 'incorrect', note = '';
  if (!skip) {
    const m = langMatch(input, [c.t]);
    const noArt = t => normL(t).replace(/^(der|die|das|el|la|els|les|l')\s*/, '');
    if (m === 'exact') verdict = 'correct';
    else if (m === 'accent') { verdict = 'partial'; note = 'check the accents or special letters'; }
    else if (noArt(input) === noArt(c.t) && noArt(c.t) !== normL(c.t)) { verdict = 'partial'; note = 'the article matters: learn it with the noun'; }
  }
  const ok = verdict === 'correct';
  gradeCard(q.sid, c, ok);
  if (ok) S.vstats.right++; else { S.vstats.wrong++; if (!q.requeued) S.questions.push({type:'card', card:c, sid:q.sid, requeued:true}); }
  if (ok && c.box >= 3) S.vstats.promoted++;
  Store.saveVocab(q.sid);
  S.fb = {verdict, note, score:ok ? 1 : verdict === 'partial' ? 0.5 : 0};
  S.results[S.i] = {vocab:true, score:S.fb.score};
  if (ok) addXP(2);
  S.phase = 'feedback'; render(); focusNext();
  speak(c.t, subj(q.sid).lang.code);
}
function finishVocab(S) {
  S.phase = 'summary'; S.finished = true;
  const v = S.vstats || {right:0, wrong:0, promoted:0};
  const n = v.right + v.wrong;
  S.summary = n ? {changes:[], newGaps:[], resolved:[], xp:v.right * 2, avg:v.right / n, n, problems:{n, solved:v.right, first:v.right, skills:{'words recalled':{a:n, c:v.right}}, lang:true}} : null;
}
Object.assign(ACT, {
  vocab: a => { const [sid, key] = String(a).split('|'); if (SESSION && SESSION.phase === 'summary') SESSION = null; startVocab(sid, key); },
  lcheck: () => { const S = SESSION; if (!S) return; const q = S.questions[S.i]; if (q.type === 'card') cardCheck(false); else langCheck(false); },
  lskip: () => { const S = SESSION; if (!S) return; const q = S.questions[S.i]; if (q.type === 'card') cardCheck(true); else langCheck(true); },
  lpick: pos => { const B = SESSION.build; B.picked.push(B.pool.splice(+pos, 1)[0]); render(); },
  lunpick: pos => { const B = SESSION.build; B.pool.push(B.picked.splice(+pos, 1)[0]); render(); },
  lchar: ch => {
    const el = $('#lans'); if (!el || !SESSION) return;
    const a = el.selectionStart != null ? el.selectionStart : el.value.length, b = el.selectionEnd != null ? el.selectionEnd : a;
    el.value = el.value.slice(0, a) + ch + el.value.slice(b); SESSION.text = el.value;
    el.focus(); el.setSelectionRange(a + ch.length, a + ch.length);
  }
});

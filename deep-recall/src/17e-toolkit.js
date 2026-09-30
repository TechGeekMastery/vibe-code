/* ------------------------------------------------------------------ toolkit: the rules, formulas, and terms a topic runs on. Reference for when you're stuck. */
const KIT = {};   /* key -> {status, err} while loading */
function kitLabels(info) {
  const s = info.subject, k = kindOf(s);
  if (k === 'lang') return {rules:'Grammar rules', terms:'Phrases & words', stuck:'When a sentence won’t come'};
  if (s.code) return {rules:'Syntax & patterns', terms:'Terms', stuck:'When your code won’t work'};
  if (k === 'skills') return {rules:'Formulas & procedures', terms:'Terms', stuck:'Pitfalls & safety'};
  if (k === 'program') return {rules:'Rules & formulas', terms:'Key terms', stuck:'If you’re stuck'};
  return {rules:'Core principles', terms:'Jargon', stuck:'If you’re stuck'};
}
function kitPrompt(info) {
  const s = info.subject, k = kindOf(s), O = Store.outlines[info.key];
  const kps = O ? O.kps.map(p => `- ${p.t}: ${p.d}`).join('\n') : '';
  const what = k === 'lang'
    ? `the grammar rules this topic uses (each as a pattern with a model sentence), and the phrases/words it relies on`
    : s.code ? `the syntax rules, idioms, and standard patterns this topic uses (each FORMULA a short code pattern in backticks), and the terms`
    : k === 'program' || k === 'skills' ? `every rule, law, formula, identity, theorem, and standard procedure a learner needs to solve problems on this topic, INCLUDING the prerequisite rules the topic leans on (e.g. the power rule when the topic is the chain rule), and the key terms`
    : `the core principles, laws, and named arguments or distinctions of this topic (FORMULA = the principle stated in one crisp sentence, or a schema like "P1, P2 ⇒ C"), and the specialist jargon a reader will meet in primary and secondary sources, including terms of art in other languages`;
  return `${HOUSE}
Level: ${depthLine()}
Write the reference TOOLKIT for ${topicLine(info)}: ${what}. This is the card a learner checks when stuck mid-problem or when an unfamiliar word appears. Precise, standard, no padding.
${kps ? `The topic's knowledge points:\n${kps}\n` : ''}
Rules:
- 5 to 12 RULE entries, most-used first. Name each by its standard name.
- 6 to 16 TERM entries, alphabetical. A definition a smart outsider understands, plus one short usage example.
- 3 to 6 STUCK entries: concrete moves to try when stuck on this topic (not generic study advice).
- Math: every expression in \\( \\) inline or \\[ \\] display. Never keyboard notation (x^2, sqrt(), *, <=, ->).
Format exactly, one field per line, a blank line between entries:
RULE: <name>
FORMULA: <the rule itself>
WHEN: <how to recognize when it applies>
EXAMPLE: <a short worked instance>
WATCH: <the typical mistake>

TERM: <term>
MEANS: <definition>
EG: <example of use>

STUCK: <one move>`;
}
function parseKit(txt) {
  const kit = {rules:[], terms:[], stuck:[]}; let cur = null, field = null;
  const map = {FORMULA:'formula', WHEN:'when', EXAMPLE:'example', WATCH:'watch', MEANS:'d', EG:'ex'};
  String(txt || '').split('\n').forEach(line => {
    const m = line.match(/^\s*(RULE|FORMULA|WHEN|EXAMPLE|WATCH|TERM|MEANS|EG|STUCK):\s*(.*)$/);
    if (m) {
      const [, key, val] = m;
      if (key === 'RULE') { cur = {name:val.trim()}; kit.rules.push(cur); field = null; }
      else if (key === 'TERM') { cur = {t:val.trim()}; kit.terms.push(cur); field = null; }
      else if (key === 'STUCK') { kit.stuck.push(val.trim()); cur = null; field = null; }
      else if (cur) { field = map[key]; cur[field] = val.trim(); }
      return;
    }
    if (cur && field && line.trim()) cur[field] += '\n' + line.trim();
    else if (!line.trim() && cur && field) { const v = cur[field]; if (!(v.includes('\\[') && !v.includes('\\]'))) field = null; }
  });
  kit.rules = kit.rules.filter(r => r.name && (r.formula || r.when));
  kit.terms = kit.terms.filter(t => t.t && t.d).sort((a, b) => a.t.localeCompare(b.t));
  return kit;
}
async function ensureKit(key) {
  if ((Store.kits[key] && (Store.kits[key].pack || !hasPack(key))) || (KIT[key] && KIT[key].status === 'loading')) return;
  const info = nodeInfo(key); if (!info) return;
  if (hasPack(key)) {
    KIT[key] = {status:'loading'};
    const P = await loadPack(key);
    delete KIT[key];
    if (P) { refreshKitViews(key); return; }
    if (Store.kits[key]) return;
  }
  if (!AI.ok()) { KIT[key] = {status:'error', err:'Making a toolkit needs Claude.'}; return; }
  KIT[key] = {status:'loading'};
  try {
    if (!Store.outlines[key]) await Store.getOutline(key);
    const r = await AI.text(kitPrompt(info), {modelTier:'default', cache:false});
    const kit = parseKit(r.text);
    if (!kit.rules.length && !kit.terms.length) throw new Error('empty');
    Store.saveKit(key, Object.assign(kit, {created:Date.now()}));
    delete KIT[key];
  } catch (e) { KIT[key] = {status:'error', err:e && e.message === 'empty' ? 'The toolkit came back empty. Try again.' : errCopy(e)}; }
  refreshKitViews(key);
}
function refreshKitViews(key) {
  const d = $('#kitDrawer'); if (d && d.dataset.key === key) { d.innerHTML = kitDrawerInner(key); typeset(d); }
  if (VIEW.name === 'topic' && VIEW.key === key && VIEW.ttab === 'kit') render();
  if (VIEW.name === 'subject' && VIEW.tab === 'kit') render();
}
function ruleCard(r, labels, open) {
  return `<details class="rule" ${open ? 'open' : ''}><summary><b>${fieldHtml(r.name)}</b>${r.formula ? `<div class="formula">${mdToHtml(r.formula)}</div>` : ''}</summary>
    <dl>${r.when ? `<dt>When</dt><dd>${fieldHtml(r.when)}</dd>` : ''}${r.example ? `<dt>Example</dt><dd>${mdToHtml(r.example)}</dd>` : ''}${r.watch ? `<dt>Watch for</dt><dd>${fieldHtml(r.watch)}</dd>` : ''}</dl></details>`;
}
function kitBodyHtml(key, compact) {
  const info = nodeInfo(key), kit = Store.kits[key], st = KIT[key], L = kitLabels(info);
  if (!kit) {
    if (st && st.status === 'loading' && hasPack(key)) return '<div class="thinking"><span class="pulse"></span>Opening the chapter’s toolkit…</div>';
    if (st && st.status === 'loading') return `<div class="thinking"><span class="pulse"></span>Writing the ${esc(L.rules.toLowerCase())}, ${esc(L.terms.toLowerCase())}, and stuck-moves for this topic…</div>`;
    return `${st && st.err ? `<div class="notice bad">${esc(st.err)}</div>` : ''}<section class="card empty-state"><b>No toolkit yet</b>${esc(L.rules)}, ${esc(L.terms.toLowerCase())}, and what to try when stuck, written once for this topic and kept.<div class="row" style="justify-content:center;margin-top:10px"><button class="btn primary sm" data-act="kitMake" data-arg="${key}" ${AI.ok() ? '' : 'disabled'}>Make the toolkit</button></div></section>`;
  }
  return `${kit.rules.length ? `<div class="section-h"><h2>${esc(L.rules)}</h2><span class="eyebrow">${kit.rules.length}</span></div><div class="rules">${kit.rules.map((r, i) => ruleCard(r, L, !compact && i < 2)).join('')}</div>` : ''}
    ${kit.stuck.length ? `<div class="section-h"><h2>${esc(L.stuck)}</h2></div><ol class="stuck">${kit.stuck.map(x => `<li>${fieldHtml(x)}</li>`).join('')}</ol>` : ''}
    ${kit.terms.length ? `<div class="section-h"><h2>${esc(L.terms)}</h2><span class="eyebrow">${kit.terms.length}</span></div><dl class="glossary">${kit.terms.map(t => `<div><dt>${fieldHtml(t.t)}</dt><dd>${fieldHtml(t.d)}${t.ex ? `<span class="eg">${fieldHtml(t.ex)}</span>` : ''}</dd></div>`).join('')}</dl>` : ''}
    ${kit.pack ? '<p class="small muted" style="margin-top:14px">From the textbook chapter.</p>' : `<div class="row" style="margin-top:14px"><button class="btn ghost sm" data-act="kitRedo" data-arg="${key}" ${AI.ok() ? '' : 'disabled'}>Rewrite toolkit</button></div>`}`;
}
function kitDrawerInner(key) {
  const info = nodeInfo(key);
  return `<div class="drawer-h"><div><div class="eyebrow">Toolkit</div><b>${esc(info.title)}</b></div><button class="icon-btn" data-act="closeSheet" aria-label="Close toolkit">${ic('close', 20)}</button></div><div class="drawer-b">${kitBodyHtml(key, true)}</div>`;
}
function openKitDrawer(key) {
  const el = $('#sheet'); if (!el || !nodeInfo(key)) return;
  el.innerHTML = `<div class="backdrop" data-act="closeSheet"></div><aside class="drawer" id="kitDrawer" data-key="${esc(key)}" role="dialog" aria-modal="true" aria-label="Toolkit">${kitDrawerInner(key)}</aside>`;
  typeset(el);
  const b = el.querySelector('.icon-btn'); if (b) b.focus();
  if (!Store.kits[key] && AI.ok() && !(KIT[key] && KIT[key].err)) { ensureKit(key); const d = $('#kitDrawer'); if (d) d.innerHTML = kitDrawerInner(key); }
}
/* the subject's rule book: every toolkit made so far, filterable */
function kitBookHtml(s) {
  const q = (VIEW.kq || '').toLowerCase().trim();
  const keys = nodeKeys(s).filter(k => Store.kits[k]);
  const L = kitLabels(nodeInfo(nodeKeys(s)[0]));
  const match = t => !q || String(t || '').toLowerCase().includes(q);
  const rows = keys.map(k => {
    const kit = Store.kits[k], rs = kit.rules.filter(r => match(r.name) || match(r.formula) || match(r.when)), ts = kit.terms.filter(t => match(t.t) || match(t.d));
    if (q && !rs.length && !ts.length) return '';
    const info = nodeInfo(k);
    return `<section class="kitbook"><div class="spread"><button class="linkish" data-act="topic" data-arg="${k}"><b>${esc(info.title)}</b></button><span class="eyebrow">${esc(info.unit.split('·').pop().trim())}</span></div>
      <div class="rules">${rs.map(r => ruleCard(r, L, false)).join('')}</div>
      ${ts.length ? `<details class="kit-terms"><summary class="small muted">${ts.length} ${esc(L.terms.toLowerCase())}</summary><dl class="glossary">${ts.map(t => `<div><dt>${fieldHtml(t.t)}</dt><dd>${fieldHtml(t.d)}</dd></div>`).join('')}</dl></details>` : ''}</section>`;
  }).join('');
  const nx = subjectNext(s);
  return `<p class="muted small" style="margin-top:16px">Every ${esc(L.rules.toLowerCase())} and ${esc(L.terms.toLowerCase())} entry from this subject’s topic toolkits, in one place. A topic’s toolkit is written the first time you open it.</p>
    <label class="vh" for="kitQ">Filter the rule book</label><input id="kitQ" class="field" data-inp="kitQ" value="${esc(VIEW.kq || '')}" placeholder="Filter: e.g. power rule, modus ponens, dative…" autocomplete="off" style="margin-top:10px">
    <div id="kitBook">${rows || (keys.length ? '<p class="muted small" style="margin-top:12px">Nothing matches.</p>' : `<section class="card empty-state" style="margin-top:12px"><b>No toolkits yet</b>Open any topic’s Toolkit tab to write one.${nx ? `<div class="row" style="justify-content:center;margin-top:10px"><button class="btn sm" data-act="topicKit" data-arg="${nx.key}">${esc(nx.title)} toolkit</button></div>` : ''}</section>`)}</div>`;
}
Object.assign(ACT, {
  kitMake: key => { delete KIT[key]; ensureKit(key); render(); },
  kitRedo: key => { delete Store.kits[key]; delete KIT[key]; ensureKit(key); if ($('#kitDrawer')) refreshKitViews(key); else render(); },
  kit: key => openKitDrawer(key),
  topicKit: key => go('topic', {key, ttab:'kit'}),
  ttab: a => { VIEW.ttab = a; render(); }
});

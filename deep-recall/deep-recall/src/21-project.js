/* ------------------------------------------------------------------ practical skills: guided build projects with checkpoints */
function projectPrompt(info) {
  const s = info.subject;
  return `Design one hands-on project for the topic ${topicLine(info)} in a self-study app. Level: ${depthLine()}
The learner's kit: ${s.kit || 'common hobby tools and parts'}. Use common, inexpensive parts; list anything beyond the kit.
Safety rules: electronics stays low-voltage DC (12 V or less, batteries or a USB supply); never mains wiring or opening mains appliances beyond unplugged, capacitor-safe inspection; include eye protection, ventilation for soldering, and tool safety where relevant.
The project should take 30 to 90 minutes, exercise the topic's core ideas, and build something that visibly works. Each step ends with a checkpoint the learner can verify themselves.
Checkpoint types:
- "measure": a multimeter, ruler, or timer reading, with the expected value, unit, and relative tolerance (e.g. 0.1 for ±10%)
- "photo": the learner photographs the build; "look_for" says what a correct build shows
- "observe": a yes/no observation; "look_for" says what they should see (e.g. the LED blinks about once per second)
- "none": no check needed
Reply with only JSON (${NOTATION} Ω, µF, ° are fine):
{"title":"...","goal":"one or two sentences","time":"e.g. 45 min","parts":[{"name":"...","qty":"...","note":"..."}],"tools":["..."],"safety":["..."],"steps":[{"title":"...","body":"Markdown instructions with specific values, pin or terminal names, and orientation details","why":"one sentence on the principle this step demonstrates","check":{"type":"measure|photo|observe|none","prompt":"what to check","expect":{"value":<number>,"unit":"V","tolerance":0.1},"look_for":"..."}}],"extensions":["2 or 3 ideas to go further"]}
Use 5 to 9 steps.`;
}
function validPlan(p) {
  if (!p || !Array.isArray(p.steps) || !p.steps.length) return null;
  p.steps = p.steps.filter(s => s && s.title && s.body).slice(0, 12).map(s => {
    const c = s.check && typeof s.check === 'object' ? s.check : {type:'none'};
    if (!['measure', 'photo', 'observe', 'none'].includes(c.type)) c.type = 'none';
    if (c.type === 'measure' && !(c.expect && isFinite(Number(c.expect.value)))) c.type = 'observe';
    if (c.type === 'photo' && !AI.images) c.type = 'observe';
    return {title:str(s.title), body:str(s.body), why:str(s.why), check:c};
  });
  if (!p.steps.length) return null;
  p.parts = Array.isArray(p.parts) ? p.parts : []; p.tools = Array.isArray(p.tools) ? p.tools.map(str) : []; p.safety = Array.isArray(p.safety) ? p.safety.map(str) : [];
  return p;
}
async function openProject(key, fresh) {
  const info = nodeInfo(key); if (!info) return;
  closeSheet();
  const n = Store.nodes[key];
  if (n && n.proj && n.proj.plan && !fresh && !n.proj.finished) { PROJ = {key, status:'ready'}; go('project'); return; }
  PROJ = {key, status:'loading'}; go('project');
  if (!AI.ok()) { PROJ.status = 'error'; PROJ.err = errCopy({code:'not_granted'}); render(); return; }
  try {
    const r = await AI.json(projectPrompt(info), {modelTier:'default', cache:false});
    if (!PROJ || PROJ.key !== key) return;
    const plan = validPlan(r); if (!plan) throw {code:'invalid_json'};
    const node = ensureNode(key);
    node.proj = {plan, step:0, passed:[], started:Date.now(), finished:false};
    Store.saveNode(key);
    PROJ.status = 'ready';
  } catch (e) { if (!PROJ || PROJ.key !== key) return; PROJ.status = 'error'; PROJ.err = errCopy(e); }
  render();
}
VIEWS.project = () => {
  const P = PROJ; const info = P && nodeInfo(P.key);
  if (!info) { setTimeout(() => go('home'), 0); return ''; }
  const s = info.subject;
  const head = `<header class="subbar"><button class="icon-btn" data-act="topic" data-arg="${info.key}" aria-label="Back to topic">${ic('back', 20)}</button><div class="subbar-t crumbs">${esc(s.name)} / <b>${esc(info.title)}</b></div><button class="btn ghost sm" data-act="tutorAbout" data-arg="${info.key}">Tutor</button></header>`;
  if (P.status === 'loading') return `<div style="--c:${s.color}">${head}<div class="sess-load"><div class="eyebrow">Project</div><h1>${esc(info.title)}</h1><p class="muted">Designing a build that exercises this topic, with parts, safety notes, and a checkpoint at every step.</p><div class="thinking"><span class="pulse"></span>Thinking. This usually takes 20–60 seconds.</div></div></div>`;
  if (P.status === 'error') return `<div style="--c:${s.color}">${head}<div class="sess-load"><h1>${esc(info.title)}</h1><div class="notice bad">${esc(P.err)}</div><div class="row"><button class="btn primary" data-act="project" data-arg="${P.key}|new">Try again</button></div></div></div>`;
  const pj = Store.nodes[P.key].proj, plan = pj.plan, i = pj.step, done = pj.finished;
  const steps = plan.steps.map((st, k) => `<li class="${k < i || done ? 'done' : k === i ? 'now' : ''}"><b>${esc(st.title)}</b></li>`).join('');
  let cur = '';
  if (done) {
    cur = `<section class="card stack"><div class="fb good"><div class="fb-h">Built</div><p>You finished “${esc(plan.title)}”. Every checkpoint passed.</p></div>
      ${plan.extensions && plan.extensions.length ? `<div><div class="eyebrow" style="margin-bottom:6px">Take it further</div><ul>${plan.extensions.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      <div class="row"><button class="btn primary" data-act="practice" data-arg="${P.key}">Troubleshooting drills</button><button class="btn" data-act="project" data-arg="${P.key}|new">Build another</button><button class="btn ghost" data-act="topic" data-arg="${P.key}">Back to topic</button></div></section>`;
  } else {
    const st = plan.steps[i], c = st.check;
    let check = '';
    if (c.type === 'measure') check = `<div class="stack"><label class="eyebrow" for="meas">${esc(c.prompt || 'Your measurement')}</label>
      <div class="row"><input id="meas" class="pinput" style="max-width:220px" inputmode="decimal" data-inp="measure" value="${esc(P.measure || '')}" placeholder="e.g. 4.7"><span class="eyebrow">${esc(c.expect.unit || '')}</span><button class="btn primary" data-act="projMeasure">Check</button></div></div>`;
    else if (c.type === 'photo') check = `<div class="stack"><p class="muted">${esc(c.prompt || 'Photograph your build.')}</p><div class="row"><label class="btn primary" for="projPhoto">${ic('camera', 16)} Photograph it</label><input id="projPhoto" type="file" class="vh" accept="${esc(AI.imgTypes)}" data-file="projPhoto"><button class="btn ghost sm" data-act="projPass">Skip photo, I’m sure</button></div></div>`;
    else if (c.type === 'observe') check = `<div class="stack"><p><b>${esc(c.prompt || 'Does it work?')}</b></p><div class="row"><button class="btn go" data-act="projPass">Yes</button><button class="btn" data-act="projNo">No</button></div>
      ${P.no ? `<label class="eyebrow" for="obs">What do you see instead?</label><textarea id="obs" class="answer short" data-inp="observe" placeholder="e.g. the LED stays off; the resistor gets warm">${esc(P.observe || '')}</textarea><div class="row"><button class="btn primary" data-act="projTrouble">Troubleshoot with the tutor</button></div>` : ''}</div>`;
    else check = `<div class="row"><button class="btn primary" data-act="projPass">Done, next step</button></div>`;
    cur = `<section class="card stack step-card">
      <div class="eyebrow">Step ${i + 1} of ${plan.steps.length}</div><h3>${esc(st.title)}</h3>
      <div class="prose sm">${mdToHtml(st.body)}</div>
      ${st.why ? `<p class="muted small"><b>Why:</b> ${esc(st.why)}</p>` : ''}
      <div class="checkpoint"><div class="eyebrow">Checkpoint</div>${check}
      ${P.msg ? `<div class="notice ${P.msgKind || ''}">${P.msg}</div>` : ''}
      ${P.photoBusy ? '<div class="thinking"><span class="pulse"></span>Checking your photo…</div>' : ''}
      ${P.fail ? `<div class="row"><button class="btn" data-act="projTrouble">Troubleshoot with the tutor</button><button class="btn ghost sm" data-act="projPass">Continue anyway</button></div>` : ''}</div>
    </section>`;
  }
  return `<div style="--c:${s.color}">${head}
    <header class="page-h" style="padding-top:4px"><div class="eyebrow">Project · ${esc(plan.time || '')}</div><h1>${esc(plan.title)}</h1><p class="muted">${esc(plan.goal || '')}</p></header>
    <details class="card" ${i === 0 && !done ? 'open' : ''}><summary><b>Parts, tools, and safety</b></summary>
      ${plan.parts.length ? `<div class="eyebrow" style="margin-top:10px">Parts</div><ul>${plan.parts.map(p => `<li><b>${esc(p.qty || '')} ${esc(p.name)}</b>${p.note ? ` · <span class="muted">${esc(p.note)}</span>` : ''}</li>`).join('')}</ul>` : ''}
      ${plan.tools.length ? `<div class="eyebrow">Tools</div><p>${plan.tools.map(esc).join(', ')}</p>` : ''}
      ${plan.safety.length ? `<div class="notice warn"><b>Safety</b><ul>${plan.safety.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    </details>
    <ol class="steps">${steps}</ol>
    ${cur}
  </div>`;
};
function projAdvance(passed) {
  const node = Store.nodes[PROJ.key], pj = node.proj;
  pj.passed[pj.step] = passed; pj.step++;
  PROJ.measure = ''; PROJ.observe = ''; PROJ.msg = ''; PROJ.fail = false; PROJ.no = false;
  if (pj.step >= pj.plan.steps.length) {
    pj.finished = true; pj.finishedAt = Date.now();
    const before = mastery(node);
    node.mastery = Math.max(node.mastery || 0, 70); node.last = Date.now(); node.sessions = (node.sessions || 0) + 1; schedule(node, 0.85);
    node.projects = (node.projects || 0) + 1;
    addXP(50); toast(`Project complete · mastery ${before}% → ${mastery(node)}%`);
  } else addXP(5);
  Store.saveNode(PROJ.key); render(); window.scrollTo(0, 0);
}
function projTrouble() {
  const node = Store.nodes[PROJ.key], pj = node.proj, st = pj.plan.steps[pj.step], info = nodeInfo(PROJ.key);
  const c = st.check;
  const detail = c.type === 'measure' ? `Expected about ${c.expect.value} ${c.expect.unit || ''}; I measured ${PROJ.measure || '?'} ${c.expect.unit || ''}.` : c.type === 'observe' ? `Expected: ${c.look_for || c.prompt}. What I see: ${PROJ.observe || 'it doesn’t work'}.` : (PROJ.photoText || '');
  addGap(PROJ.key, {concept:('Build: ' + st.title).slice(0, 60), detail:detail.slice(0, 300)});
  openTutor(info.sid, {send:`I'm building “${pj.plan.title}”, step ${pj.step + 1}: ${st.title}.\n\nStep instructions: ${st.body.slice(0, 900)}\n\nCheckpoint: ${c.prompt || c.look_for || ''}\n${detail}\n\nHelp me troubleshoot. What should I check first?`});
}
async function projectPhoto(file) {
  const P = PROJ; if (!P || !AI.ok()) return;
  const node = Store.nodes[P.key], st = node.proj.plan.steps[node.proj.step];
  P.photoBusy = true; P.msg = ''; render();
  try {
    const r = await AI.json(`A learner is building a project and photographed their work for a checkpoint.
Step: ${st.title}
Instructions: ${st.body.slice(0, 1500)}
What a correct build shows: ${st.check.look_for || st.check.prompt || ''}
Look at the photo. Judge whether this step is done correctly, being specific about orientation, placement, and connections you can see. If you can't tell from the photo, say what to photograph instead.
Reply with only JSON: {"pass":true or false,"feedback":"2-3 sentences","issues":["specific problems you can see"]}`, {images:file});
    if (PROJ !== P) return;
    P.photoBusy = false;
    if (r && r.pass) { toast('Checkpoint passed'); P.msg = ''; projAdvance(true); return; }
    P.photoText = str(r && r.feedback) + (Array.isArray(r && r.issues) && r.issues.length ? ' Issues: ' + r.issues.join('; ') : '');
    P.msg = esc(P.photoText); P.msgKind = 'bad'; P.fail = true;
  } catch (e) { if (PROJ !== P) return; P.photoBusy = false; P.msg = esc(errCopy(e)); P.msgKind = 'warn'; }
  render();
}
Object.assign(ACT, {
  project: a => { const [key, flag] = String(a).split('|'); openProject(key, flag === 'new'); },
  projMeasure: () => {
    const P = PROJ; const node = Store.nodes[P.key], c = node.proj.plan.steps[node.proj.step].check;
    const v = parseFloat(String(P.measure || '').replace(',', '.'));
    if (!isFinite(v)) { P.msg = 'Enter a number.'; P.msgKind = 'warn'; render(); return; }
    const want = Number(c.expect.value), tol = Math.max(Number(c.expect.tolerance) || 0.1, 0.02);
    if (Math.abs(v - want) <= Math.max(tol * Math.abs(want), 1e-9)) { toast('Checkpoint passed'); projAdvance(true); }
    else { P.msg = `Expected about ${want} ${esc(c.expect.unit || '')} (±${Math.round(tol * 100)}%); you measured ${v}. Something’s off: check the circuit against the step, then measure again.`; P.msgKind = 'bad'; P.fail = true; render(); }
  },
  projPass: () => projAdvance(true),
  projNo: () => { if (PROJ) { PROJ.no = true; render(); } },
  projTrouble: () => projTrouble()
});

/* ------------------------------------------------------------------ knowledge points, FSRS scheduling, retention, readiness, migration */

/* ---- curriculum migration: v6 restructured the knowledge subjects; progress moves by topic title */
const CUR_VERSION = 6;
const OLD_KEYS = {"geo-0-0":"Geography as destiny: terrain, rivers, and borders","geo-0-1":"Realism, liberalism, and constructivism","geo-0-2":"The security dilemma and balance of power","geo-0-3":"Hard, soft, and structural power","geo-1-0":"Energy geopolitics: oil, gas, and the petrodollar","geo-1-1":"Sea power and maritime chokepoints","geo-1-2":"Semiconductors and technology chokepoints","geo-1-3":"Sanctions and economic statecraft","geo-1-4":"Nuclear deterrence and escalation ladders","geo-2-0":"US–China rivalry and the Taiwan question","geo-2-1":"Russia, NATO, and the war in Ukraine","geo-2-2":"The Middle East: Iran, the Gulf states, and Israel","geo-2-3":"The Global South, BRICS, and multipolarity","hist-0-0":"The agricultural revolution and the first states","hist-0-1":"The Bronze Age collapse","hist-0-2":"Rome: from republic to empire","hist-0-3":"Han China and the Silk Roads","hist-1-0":"The fall of the Western Roman Empire: competing explanations","hist-1-1":"The Islamic Golden Age","hist-1-2":"The Black Death and its consequences","hist-1-3":"The printing press and the Reformation","hist-1-4":"The gunpowder empires","hist-2-0":"The Great Divergence: why Europe industrialized first","hist-2-1":"The French Revolution","hist-2-2":"Imperialism and the Scramble for Africa","hist-2-3":"The causes of World War I","hist-2-4":"The architecture of the Cold War","phil-0-0":"Rationalism versus empiricism","phil-0-1":"Skepticism and the problem of induction","phil-0-2":"Kant’s synthesis","phil-0-3":"The mind–body problem","phil-1-0":"Consequentialism","phil-1-1":"Deontology","phil-1-2":"Virtue ethics","phil-1-3":"Metaethics: realism, anti-realism, and error theory","phil-2-0":"Popper, Kuhn, and Lakatos on how science works","phil-2-1":"Free will and determinism","phil-2-2":"Social contract theory","phil-2-3":"Wittgenstein and the linguistic turn","epi-0-0":"Bayesian updating","epi-0-1":"Base rates and the base-rate fallacy","epi-0-2":"Calibration and forecasting","epi-0-3":"Cognitive biases as mechanisms, not lists","epi-1-0":"Causal inference: confounding and causal diagrams","epi-1-1":"Selection effects and survivorship bias","epi-1-2":"Goodhart’s law and incentive distortion","epi-1-3":"Steelmanning and argument mapping","epi-2-0":"Evaluating studies: p-hacking and the replication crisis","epi-2-1":"Expert disagreement and when to defer","epi-2-2":"Emergence versus design as explanations","epi-2-3":"Motivated reasoning and identity-protective cognition","bio-0-0":"Cells: prokaryotes, eukaryotes, and endosymbiosis","bio-0-1":"DNA replication","bio-0-2":"Transcription and translation","bio-0-3":"Gene regulation and epigenetics","bio-1-0":"Natural selection and fitness","bio-1-1":"Genetic drift, gene flow, and speciation","bio-1-2":"Metabolism: ATP, glycolysis, and respiration","bio-1-3":"Photosynthesis","bio-2-0":"Development: from zygote to organism","bio-2-1":"Ecology and population dynamics","bio-2-2":"The microbiome","bio-2-3":"Aging and senescence","viro-0-0":"What a virus is, and what it is not","viro-0-1":"The Baltimore classification","viro-0-2":"The viral replication cycle","viro-0-3":"Mutation, recombination, and reassortment","viro-1-0":"Innate immunity","viro-1-1":"Adaptive immunity: B cells and antibodies","viro-1-2":"T cells and MHC","viro-1-3":"Immunological memory and vaccines","viro-2-0":"R0, transmission, and epidemic curves","viro-2-1":"Zoonotic spillover","viro-2-2":"Gain-of-function research: the biosafety policy debate","viro-2-3":"Antivirals and drug resistance","viro-2-4":"Case studies: influenza, HIV, and SARS-CoV-2","neuro-0-0":"Neurons and action potentials","neuro-0-1":"Synapses and neurotransmitters","neuro-0-2":"Brain architecture","neuro-0-3":"Neuroplasticity","neuro-1-0":"Learning and memory systems","neuro-1-1":"Attention and perception","neuro-1-2":"Dopamine, reward, and prediction error","neuro-1-3":"Sleep and what it does","neuro-2-0":"Emotion and the stress response","neuro-2-1":"Decision-making and heuristics","neuro-2-2":"Theories of consciousness","neuro-2-3":"Psychology’s replication crisis","econ-0-0":"Supply, demand, and price signals","econ-0-1":"Elasticity and tax incidence","econ-0-2":"Market structure: from competition to monopoly","econ-0-3":"Externalities and public goods","econ-1-0":"GDP, growth, and productivity","econ-1-1":"Money, banking, and credit creation","econ-1-2":"Central banks and interest rates","econ-1-3":"Inflation: causes and cures","econ-2-0":"Trade, comparative advantage, and tariffs","econ-2-1":"Exchange rates and the balance of payments","econ-2-2":"Financial crises and debt cycles","econ-2-3":"Game theory and strategic behavior","cs-0-0":"Algorithms and Big-O","cs-0-1":"Core data structures","cs-0-2":"Recursion and divide-and-conquer","cs-0-3":"Graphs and graph search","cs-1-0":"Computability and the halting problem","cs-1-1":"P versus NP","cs-1-2":"How a CPU executes code","cs-1-3":"Operating systems: processes, memory, and scheduling","cs-2-0":"Networking: the TCP/IP stack","cs-2-1":"Databases and transactions","cs-2-2":"Distributed systems and consensus","cs-2-3":"Machine learning fundamentals","cyber-0-0":"The CIA triad and threat modeling","cyber-0-1":"Cryptography: symmetric, asymmetric, and hashing","cyber-0-2":"PKI, TLS, and certificates","cyber-0-3":"Authentication and access control","cyber-1-0":"Network security: firewalls, segmentation, and IDS","cyber-1-1":"Web application vulnerabilities (OWASP Top 10)","cyber-1-2":"Memory corruption vulnerabilities","cyber-1-3":"Malware classes and behavior","cyber-2-0":"Incident response and digital forensics","cyber-2-1":"Security operations: logging and SIEM","cyber-2-2":"Cloud and identity security","cyber-2-3":"Nation-state operations and APTs","astro-0-0":"Gravity and orbits","astro-0-1":"Light and spectroscopy","astro-0-2":"Stellar life cycles","astro-0-3":"White dwarfs, neutron stars, and black holes","astro-1-0":"Galaxies and dark matter","astro-1-1":"The Big Bang and the cosmic microwave background","astro-1-2":"Cosmic expansion and dark energy","astro-1-3":"Cosmic inflation","astro-2-0":"Exoplanets and how we detect them","astro-2-1":"The cosmic distance ladder","astro-2-2":"The Fermi paradox","astro-2-3":"The Hubble tension","rel-0-0":"Theories of religion: what counts as one","rel-0-1":"Hinduism","rel-0-2":"Buddhism","rel-0-3":"Confucianism and Daoism","rel-1-0":"Judaism","rel-1-1":"Christianity","rel-1-2":"Islam","rel-1-3":"Zoroastrianism, Sikhism, and Jainism","rel-2-0":"Religion and state power","rel-2-1":"Secularization and its critics","rel-2-2":"Comparative mysticism","rel-2-3":"New religious movements"};
const RENAMED = {'viro|Innate immunity':'viro|Barriers and the innate immune response', 'econ|Game theory and strategic behavior':'econ|Oligopoly and game theory', 'cs|Machine learning fundamentals':'ai|Machine learning 101: supervised, unsupervised, and reinforcement learning', 'cyber|Cryptography: symmetric, asymmetric, and hashing':'cyber|Symmetric encryption and block cipher modes', 'rel|Zoroastrianism, Sikhism, and Jainism':'rel|Zoroastrianism'};
function newKeyFor(oldKey) {
  const t = OLD_KEYS[oldKey]; if (!t) return null;
  const sid = oldKey.split('-')[0];
  const target = RENAMED[sid + '|' + t] || (sid + '|' + t);
  const [tsid, title] = [target.slice(0, target.indexOf('|')), target.slice(target.indexOf('|') + 1)];
  const s = subj(tsid); if (!s) return null;
  for (let ui = 0; ui < s.units.length; ui++) { const ni = s.units[ui].n.indexOf(title); if (ni >= 0) return tsid + '-' + ui + '-' + ni; }
  return null;
}
function migrateCurriculum() {
  const P = Store.profile;
  if ((P.curVersion || 0) >= CUR_VERSION) return;
  const map = {};
  Object.keys(OLD_KEYS).forEach(k => { const nk = newKeyFor(k); if (nk && nk !== k) map[k] = nk; });
  const mk = k => map[k] || k;
  const nodes = {}, moved = [];
  Object.keys(Store.nodes).forEach(k => { const n = Store.nodes[k]; const nk = OLD_KEYS[k] ? (newKeyFor(k) || k) : k; if (nk !== k) moved.push(k); n.key = nk; nodes[nk] = n; });
  moved.forEach(k => Store.remove(Store.persistent ? Store.path('nodes', k) : ''));
  Store.nodes = nodes;
  moved.forEach(k => Store.saveNode(mk(k)));
  P.lessonAlias = P.lessonAlias || {};
  moved.forEach(k => { if (nodes[mk(k)] && nodes[mk(k)].hasLesson) P.lessonAlias[mk(k)] = k; });
  const gaps = {};
  Object.values(Store.gaps).forEach(g => {
    const oldId = g.id, node = mk(g.node);
    const changed = node !== g.node || (g.root && mk(g.root) !== g.root) || (g.from && mk(g.from) !== g.from);
    g.node = node; if (g.root) g.root = mk(g.root); if (g.from) g.from = mk(g.from);
    const id = oldId.indexOf('~') > 0 ? (node + oldId.slice(oldId.indexOf('~'))).slice(0, 120) : oldId;
    g.id = id; gaps[id] = g;
    if (id !== oldId) Store.remove(Store.persistent ? Store.path('gaps', oldId) : '');
    if (changed || id !== oldId) Store.saveGap(id);
  });
  Store.gaps = gaps;
  if (P.lastNode) P.lastNode = mk(P.lastNode);
  Object.values(Store.nodes).forEach(n => { if (!n.firstAt) n.firstAt = n.last || Date.now(); });
  P.curVersion = CUR_VERSION;
  Store.saveProfile();
}

/* ---- FSRS-4.5 memory model, per knowledge point */
const FW = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const F_DECAY = -0.5, F_FACTOR = 19 / 81;
const retainTarget = () => { const r = +Store.profile.retain; return r >= 0.8 && r <= 0.97 ? r : 0.9; };
const clampD = d => Math.min(10, Math.max(1, d));
function fsrsR(elapsedDays, S) { return Math.pow(1 + F_FACTOR * Math.max(0, elapsedDays) / Math.max(0.01, S), F_DECAY); }
function fsrsInterval(S, r) { return Math.max(1, Math.round(S / F_FACTOR * (Math.pow(r || retainTarget(), 1 / F_DECAY) - 1))); }
function fsrsInitD(G) { return clampD(FW[4] - (G - 3) * FW[5]); }
function fsrsNext(state, G, now) {
  now = now || Date.now();
  if (!state || !state.s) return {s:FW[G - 1], d:fsrsInitD(G), l:now};
  const t = (now - (state.l || now)) / DAY, R = fsrsR(t, state.s), D = state.d;
  const d2 = clampD(FW[7] * fsrsInitD(3) + (1 - FW[7]) * (D - FW[6] * (G - 3)));
  let s2;
  if (G === 1) s2 = FW[11] * Math.pow(D, -FW[12]) * (Math.pow(state.s + 1, FW[13]) - 1) * Math.exp(FW[14] * (1 - R));
  else s2 = state.s * (1 + Math.exp(FW[8]) * (11 - D) * Math.pow(state.s, -FW[9]) * (Math.exp(FW[10] * (1 - R)) - 1) * (G === 2 ? FW[15] : 1) * (G === 4 ? FW[16] : 1));
  return {s:Math.max(0.1, Math.min(s2, 3650)), d:d2, l:now};
}
function gradeOf(score, conf) { return score < 0.5 ? 1 : score < 0.8 ? 2 : (score >= 1 && conf >= 95 ? 4 : 3); }
function kpRecall(x, now) { return x && x.s ? fsrsR(((now || Date.now()) - x.l) / DAY, x.s) : 0; }
function kpValue(x) { if (!x || x.e == null) return null; return 100 * x.e * (0.35 + 0.65 * kpRecall(x)); }

/* ---- blended topic mastery: measured knowledge points where seen, the topic-level estimate elsewhere */
function mastery(n) {
  const L = legacyMastery(n);
  let m = L;
  if (n && n.kpN && n.kp) {
    const vals = Object.values(n.kp).map(kpValue).filter(v => v != null);
    if (vals.length) { const seen = Math.min(vals.length, n.kpN); m = Math.round((vals.slice(0, seen).reduce((a, b) => a + b, 0) + (n.kpN - seen) * L) / n.kpN); }
  }
  /* work done only with the tutor's help can't reach Proficient until one solo check confirms it */
  return n && n.study && !n.solo ? Math.min(m, PROFICIENT - 1) : m;
}
function assistCapped(n) { return !!(n && n.study && !n.solo && (legacyMastery(n) >= PROFICIENT || (n.kp && Object.values(n.kp).some(x => (kpValue(x) || 0) >= PROFICIENT)))); }
function syncDue(n) {
  if (!n || !n.kp) return;
  const xs = Object.values(n.kp).filter(x => x.due);
  if (!xs.length) return;
  n.due = Math.min(...xs.map(x => x.due));
  n.interval = Math.max(1, Math.round(mean(xs.map(x => x.s))));
}
function recordKP(key, kpId, score, conf) {
  if (!kpId || !/^k\d+$/.test(kpId)) return;
  const n = ensureNode(key), o = Store.outlines[key];
  if (o && !o.kps.some(k => k.id === kpId)) return;
  n.kp = n.kp || {};
  const prev = n.kp[kpId], G = gradeOf(score, conf || 0);
  const st = fsrsNext(prev, G);
  const e = prev && prev.e != null ? prev.e * 0.55 + score * 0.45 : score;
  n.kp[kpId] = {s:+st.s.toFixed(3), d:+st.d.toFixed(3), l:st.l, due:st.l + fsrsInterval(st.s) * DAY, e:+e.toFixed(3), a:((prev && prev.a) || 0) + 1, c:((prev && prev.c) || 0) + (score >= 0.8 ? 1 : 0)};
  if (o && !n.kpN) n.kpN = o.kps.length;
  syncDue(n);
  if (score >= 0.7) implicitCredit(key);
}
/* practicing a topic successfully also exercises its prerequisites: give them partial review credit (at most daily) */
function implicitCredit(key) {
  const n = Store.nodes[key]; if (!n || !Array.isArray(n.pre)) return;
  const now = Date.now();
  n.pre.forEach(pk => {
    const p = Store.nodes[pk]; if (!p || (p.icAt && now - p.icAt < DAY)) return;
    if (p.kp) Object.keys(p.kp).forEach(id => {
      const x = p.kp[id], full = fsrsNext(x, 3, now);
      const s = x.s + 0.2 * (full.s - x.s);
      x.s = +s.toFixed(3); x.due = Math.max(x.due || 0, now + fsrsInterval(s) * DAY);
    });
    else if (p.due && p.interval) p.due = Math.max(p.due, p.due + p.interval * 0.2 * DAY);
    p.icAt = now; syncDue(p); Store.saveNode(pk);
  });
}
/* which knowledge points to test next: due (lowest recall) first, then never-tested in course order, then the weakest */
function kpTargets(key, count) {
  const o = Store.outlines[key]; if (!o) return [];
  const n = Store.nodes[key] || {}, kp = n.kp || {}, now = Date.now();
  const due = o.kps.filter(k => kp[k.id] && kp[k.id].due <= now).sort((a, b) => kpRecall(kp[a.id]) - kpRecall(kp[b.id]));
  const unseen = o.kps.filter(k => !kp[k.id]);
  const weak = o.kps.filter(k => kp[k.id] && kp[k.id].due > now).sort((a, b) => (kpValue(kp[a.id]) || 0) - (kpValue(kp[b.id]) || 0));
  return due.concat(unseen, weak).slice(0, count || 8);
}
function kpBlock(key, count, field) {
  const o = Store.outlines[key]; if (!o) return '';
  const t = kpTargets(key, count);
  return `Knowledge points of ${key} (id: point: what the learner must be able to do):
${o.kps.map(k => `${k.id}: ${k.t}: ${k.d}`).join('\n')}
Target these first (due for review, untested, or weakest): ${t.map(k => k.id).join(', ')}.
Tag every item with ${field === 'block' ? 'a line "KP: <id>"' : '"kp": "<id>"'} naming the knowledge point it tests. Spread items across different knowledge points.`;
}
function kpStats(key) {
  const o = Store.outlines[key], n = Store.nodes[key] || {}, kp = n.kp || {};
  const total = o ? o.kps.length : (n.kpN || 0);
  const seen = Object.keys(kp).length, strong = Object.values(kp).filter(x => (kpValue(x) || 0) >= PROFICIENT).length;
  return {total, seen, strong, due:Object.values(kp).filter(x => x.due <= Date.now()).length};
}

/* ---- outlines: generated once, audited by an independent pass, then frozen */
const OUTLINE_P = {};
function outlinePrompt(info) {
  const u = info.subject.units[info.ui], obj = objectiveFor(info);
  const neighbors = u.n.map((t, i) => i === info.ni ? null : `- ${t}`).filter(Boolean).join('\n');
  const cands = rootCandidates(info.key, 40).map(k => { const i = nodeInfo(k); return `- ${k}: ${i.title} (${i.subject.name})`; }).join('\n');
  return `You are designing the syllabus for one topic in a rigorous self-study course. Level: ${depthLine()}
Topic: ${topicLine(info)}
Reference standard to match in scope and depth: ${syllabusFor(info)}${obj ? `\nOfficial exam objective for this topic: "${obj}". Cover every sub-topic the official objective lists under it.` : ''}
Other topics in this unit (their content belongs to them; this topic's scope ends where theirs begins):
${neighbors || '(none)'}

Break the topic into 10 to 24 knowledge points: atomic, individually testable units that a strong course on this topic actually teaches and assesses (definitions that matter, mechanisms, causal arguments, procedures, standard problem types, distinctions, key evidence, major positions in a debate). Match the reference's depth: include the technical substance, not only headline ideas. Order them so each builds on earlier ones, and so the sequence tells a story: start from the phenomenon, problem, or question that motivates the topic, and let definitions arrive when they are needed to answer something, not all up front.
Then choose up to 4 prerequisite topics, from this list only, that someone must know before this topic:
${cands || '(none)'}

Reply with only JSON: {"kps":[{"t":"short name, max 8 words","d":"what the learner must be able to do or explain, one sentence","type":"concept|mechanism|procedure|fact|distinction|debate|skill"}],"pre":["topic ids"],"scope":"one sentence on what is in and out of scope"}
${NOTATION}`;
}
function outlineAuditPrompt(info, kps) {
  const obj = objectiveFor(info);
  return `You are auditing a topic syllabus before it is frozen for a rigorous self-study course. Level: ${depthLine()}
Topic: ${topicLine(info)}
Reference standard: ${syllabusFor(info)}${obj ? `\nOfficial objective: "${obj}"` : ''}
Proposed knowledge points:
${kps.map((k, i) => `${i + 1}. ${k.t}: ${k.d}`).join('\n')}

Check it against what the reference actually covers at this level. Find: core points that are missing; points that are factually wrong, vague, or out of scope; duplicates; points too large to test as one unit (split them). Change only what is necessary.
Reply with only JSON: {"missing":[{"t":"...","d":"...","type":"...","after":<number of the point it should follow, 0 for first>}],"remove":[<numbers>],"fix":[{"n":<number>,"t":"...","d":"..."}],"split":[{"n":<number>,"into":[{"t":"...","d":"...","type":"..."}]}],"notes":"one or two sentences on the main changes"}`;
}
/* apply an audit without renumbering: surviving points keep their ids, new points get fresh ids, nothing at or before \`lock\` moves */
function reconcileOutline(o, a, lock) {
  const orig = o.kps.slice(); let next = Math.max(0, ...orig.map(k => +k.id.slice(1) || 0)) + 1;
  const nid = () => 'k' + (next++);
  const mk = x => ({id:nid(), t:str(x.t).slice(0, 80), d:str(x.d).slice(0, 240), type:str(x.type).slice(0, 16) || 'concept'});
  const at = n => (n - 1 > lock && orig[n - 1]) || null;
  (Array.isArray(a.fix) ? a.fix : []).forEach(f => { const x = at(+f.n); if (x && f.t) { x.t = str(f.t).slice(0, 80); x.d = str(f.d || x.d).slice(0, 240); } });
  const rm = new Set((Array.isArray(a.remove) ? a.remove : []).map(Number).map(at).filter(Boolean));
  const extra = new Map();
  (Array.isArray(a.split) ? a.split : []).forEach(sp => { const x = at(+sp.n), parts = Array.isArray(sp.into) ? sp.into.filter(p => p && p.t) : []; if (!x || !parts.length) return; x.t = str(parts[0].t).slice(0, 80); x.d = str(parts[0].d).slice(0, 240); extra.set(x, parts.slice(1).map(mk)); });
  const list = [];
  orig.forEach(k => { if (rm.has(k)) return; list.push(k); if (extra.has(k)) list.push(...extra.get(k)); });
  (Array.isArray(a.missing) ? a.missing : []).filter(m => m && m.t).forEach(m => { const after = orig[(+m.after || 0) - 1]; let i = after && list.includes(after) ? list.indexOf(after) + 1 : 0; i = Math.min(list.length, Math.max(i, lock + 1)); list.splice(i, 0, mk(m)); });
  o.kps.splice(0, o.kps.length, ...list.slice(0, 30));
}
function ensureOutline(key, onStatus) {
  if (Store.outlines[key]) return Promise.resolve(Store.outlines[key]);
  if (OUTLINE_P[key]) return OUTLINE_P[key];
  const info = nodeInfo(key); if (!info) return Promise.resolve(null);
  OUTLINE_P[key] = (async () => {
    const cached = await Store.getOutline(key);
    if (cached) { attachOutline(key, cached); return cached; }
    if (!AI.ok()) return null;
    if (onStatus) onStatus('Mapping the topic into knowledge points against its reference syllabus…');
    const r = await AI.json(outlinePrompt(info), {modelTier:'default', cache:false});
    const draft = (Array.isArray(r && r.kps) ? r.kps : []).filter(k => k && k.t).map(k => ({t:str(k.t), d:str(k.d), type:str(k.type)}));
    if (draft.length < 5) throw {code:'invalid_json'};
    const kps = draft.slice(0, 30).map((k, i) => ({id:'k' + (i + 1), t:k.t.slice(0, 80), d:str(k.d).slice(0, 240), type:str(k.type).slice(0, 16) || 'concept'}));
    const pre = (Array.isArray(r.pre) ? r.pre : []).map(str).filter(k => nodeInfo(k) && k !== key).slice(0, 4);
    const o = {key, kps, pre, scope:str(r.scope).slice(0, 300), ref:syllabusFor(info), obj:objectiveFor(info) || undefined, at:Date.now(), audited:false, audit:null};
    Store.outlines[key] = o; attachOutline(key, o);
    /* the independent audit runs in the background; its changes never touch bits already reached */
    AI.json(outlineAuditPrompt(info, draft), {modelTier:'default', cache:false}).then(audit => {
      reconcileOutline(o, audit || {}, outlineLock(key));
      o.audited = true;
      o.audit = {notes:str(audit && audit.notes).slice(0, 300), added:((audit && audit.missing) || []).length, removed:((audit && audit.remove) || []).length, fixed:((audit && audit.fix) || []).length + ((audit && audit.split) || []).length};
    }).catch(() => { o.audited = false; }).finally(() => { Store.saveOutline(key, o); attachOutline(key, o); if (VIEW.name === 'bits' || (VIEW.name === 'topic' && VIEW.key === key)) render(); });
    return o;
  })().finally(() => { delete OUTLINE_P[key]; });
  return OUTLINE_P[key];
}
function attachOutline(key, o) {
  const n = ensureNode(key);
  if (n.kpN !== o.kps.length || JSON.stringify(n.pre || []) !== JSON.stringify(o.pre || [])) { n.kpN = o.kps.length; n.pre = o.pre || []; Store.saveNode(key); }
}
/* the topic page prefetches its outline in the background, so it is ready by the time the learner starts */
function prefetchOutline(key) {
  if (Store.outlines[key] || OUTLINE_P[key] || !AI.ok() || !nodeInfo(key)) return;
  ensureOutline(key).then(() => { if (VIEW.name === 'topic' && VIEW.key === key) render(); }).catch(() => {});
}

/* ---- prerequisites and readiness */
function weakPrereqs(key) {
  const n = Store.nodes[key]; if (!n || !Array.isArray(n.pre)) return [];
  return n.pre.filter(k => nodeInfo(k) && mastery(Store.nodes[k]) < 60);
}
function needsReadiness(key) {
  const n = Store.nodes[key];
  return !!(n && !n.ready && !n.sessions && !pst(n).a && weakPrereqs(key).length);
}

/* ---- retention: "Mastered" requires recall on a check at least 14 days after first study */
const RETENTION_DAYS = 14;
function retentionDue(n) {
  return !!(n && !n.retained && n.firstAt && Date.now() - n.firstAt >= RETENTION_DAYS * DAY && n.last && Date.now() - n.last >= 5 * DAY && mastery(n) >= PROFICIENT);
}

// Validate a topic file: node validate.mjs <key> [more keys]   (or "all")
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const math = require('/tmp/mj/package/lib/browser/math.js');
const DIR = new URL('./topics/', import.meta.url).pathname;
let keys = process.argv.slice(2);
if (keys[0] === 'all') keys = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
let bad = 0;
const TYPES = ['written', 'expression', 'antiderivative', 'number', 'numbers', 'mcq'];
const words = s => String(s || '').split(/\s+/).filter(Boolean).length;
for (const key of keys) {
  const errs = [], warn = [];
  let o;
  try { o = JSON.parse(fs.readFileSync(DIR + key + '.json', 'utf8')); } catch (e) { console.log(key, 'CANNOT READ/PARSE', e.message); bad++; continue; }
  const E = m => errs.push(m), W = m => warn.push(m);
  if (o.key !== key) E('key mismatch');
  ['title', 'scope', 'intro'].forEach(f => { if (!o[f] || typeof o[f] !== 'string') E('missing ' + f); });
  if (!Array.isArray(o.sources) || o.sources.length < 2) E('need at least 2 sources');
  if (!Array.isArray(o.kps) || o.kps.length < 6 || o.kps.length > 14) E('kps must be 6-14');
  const kpIds = new Set((o.kps || []).map(k => k.id));
  (o.kps || []).forEach(k => { if (!/^k\d+$/.test(k.id) || !k.t || !k.d) E('bad kp ' + JSON.stringify(k).slice(0, 80)); });
  const iw = words(o.intro); if (iw < 60 || iw > 230) W('intro words ' + iw);
  if (!Array.isArray(o.sections) || o.sections.length < 4 || o.sections.length > 8) E('sections must be 4-8');
  const taught = new Set(), tested = new Set(), qids = new Set();
  const texts = [o.intro];
  const checkQ = (q, where) => {
    if (!q || !q.id) return E(where + ': question without id');
    if (qids.has(q.id)) E('duplicate question id ' + q.id); qids.add(q.id);
    if (!TYPES.includes(q.type)) E(q.id + ': bad type ' + q.type);
    if (!kpIds.has(q.kp)) E(q.id + ': unknown kp ' + q.kp); else tested.add(q.kp);
    if (!q.prompt) E(q.id + ': no prompt'); if (!q.why) E(q.id + ': no why');
    texts.push(q.prompt, q.why, q.model);
    if (q.type === 'written') { if (!Array.isArray(q.rubric) || q.rubric.length < 2) E(q.id + ': written needs rubric (2-5)'); if (!q.model) E(q.id + ': written needs model answer'); }
    if (q.type === 'mcq') { if (!Array.isArray(q.options) || q.options.length !== 4) E(q.id + ': mcq needs 4 options'); if (!(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4)) E(q.id + ': mcq answer index'); texts.push(...(q.options || [])); }
    if (['expression', 'antiderivative'].includes(q.type)) {
      if (typeof q.answer !== 'string') E(q.id + ': needs answer string');
      else { try { const c = math.parse(q.answer).compile(); const vars = String(q.vars || 'x').split(/[,\s]+/).filter(Boolean); const sc = {}; vars.forEach((v, i) => { sc[v] = 0.37 + i * 0.21; }); const val = c.evaluate(sc); if (typeof val !== 'number' && !(val && val.re != null)) E(q.id + ': answer does not evaluate to a number'); } catch (e) { E(q.id + ': answer does not parse in mathjs: ' + q.answer + ' (' + e.message + ')'); } }
    }
    if (q.type === 'number') { try { const v = math.evaluate(String(q.answer)); if (typeof v !== 'number' || !isFinite(v)) E(q.id + ': number answer not numeric'); } catch (e) { E(q.id + ': number answer does not parse: ' + q.answer); } }
    if (q.type === 'numbers') { String(q.answer || '').split(/[,;]/).forEach(p => { try { if (!isFinite(math.evaluate(p))) E(q.id + ': numbers part not numeric'); } catch (e) { E(q.id + ': numbers part does not parse: ' + p); } }); }
  };
  (o.sections || []).forEach((s, i) => {
    if (!s.id || !s.title || !s.md) E('section ' + i + ' incomplete');
    (s.kps || []).forEach(k => { if (!kpIds.has(k)) E(s.id + ': unknown kp ' + k); else taught.add(k); });
    const w = words(s.md); if (w < 220 || w > 950) W(s.id + ' words ' + w);
    texts.push(s.md);
    if (!Array.isArray(s.questions) || s.questions.length < 1 || s.questions.length > 3) E(s.id + ': needs 1-3 questions');
    (s.questions || []).forEach(q => checkQ(q, s.id));
    const mcqs = (s.questions || []).filter(q => q.type === 'mcq').length; if (mcqs > 1) E(s.id + ': more than one mcq');
  });
  if (!Array.isArray(o.practice) || o.practice.length < 8 || o.practice.length > 14) E('practice must be 8-14');
  (o.practice || []).forEach(q => checkQ(q, 'practice'));
  if ((o.practice || []).filter(q => q.type === 'mcq').length > 2) E('practice: more than 2 mcq');
  if (!Array.isArray(o.exam) || o.exam.length < 4 || o.exam.length > 6) E('exam must be 4-6');
  (o.exam || []).forEach(q => checkQ(q, 'exam'));
  kpIds.forEach(k => { if (!taught.has(k)) E(k + ' never taught in a section'); if (!tested.has(k)) E(k + ' never tested'); });
  if (!Array.isArray(o.terms) || o.terms.length < 6) E('need at least 6 terms');
  (o.terms || []).forEach(t => { if (!t.t || !t.d) E('bad term'); texts.push(t.d, t.ex); });
  if (!Array.isArray(o.cards) || o.cards.length < 12 || o.cards.length > 30) E('cards must be 12-30');
  const cids = new Set();
  (o.cards || []).forEach(c => { if (!c.id || cids.has(c.id)) E('card id missing/dup ' + c.id); cids.add(c.id); if (!['term', 'formula', 'concept', 'problem'].includes(c.type)) E(c.id + ': bad card type'); if (!c.front || !c.back) E(c.id + ': front/back'); if (!kpIds.has(c.kp)) E(c.id + ': unknown kp'); texts.push(c.front, c.back);
    if (c.answer != null) { try { const vars = String(c.vars || 'x').split(/[,\s]+/).filter(Boolean); const sc = {}; vars.forEach((v, i) => { sc[v] = 0.37 + i * 0.21; }); math.parse(String(c.answer)).compile().evaluate(sc); } catch (e) { E(c.id + ': card answer does not parse'); } } });
  if (!o.kit || !Array.isArray(o.kit.rules) || o.kit.rules.length < 4) E('kit.rules needs 4+'); else o.kit.rules.forEach(r => texts.push(r.formula, r.example));
  if (!o.kit || !Array.isArray(o.kit.stuck) || o.kit.stuck.length < 3) E('kit.stuck needs 3+');
  // notation hygiene
  texts.filter(Boolean).forEach(t => {
    const s = String(t);
    if (/(^|[^\\])\$[^$\s]/.test(s)) E('uses $ for math: ' + s.slice(0, 60));
    const o1 = (s.match(/\\\(/g) || []).length, c1 = (s.match(/\\\)/g) || []).length, o2 = (s.match(/\\\[/g) || []).length, c2 = (s.match(/\\\]/g) || []).length;
    if (o1 !== c1 || o2 !== c2) E('unbalanced math delimiters: ' + s.slice(0, 70));
    if (/\\["']/.test(s)) E('stray backslash before a quote (shows as a visible backslash): ' + s.match(/.{0,30}\\["'].{0,10}/)[0]);
    if (/[\t\u0008\u000c]/.test(s)) E('control character (a lost backslash, e.g. \\t in \\to): ' + JSON.stringify(s.match(/.{0,20}[\t\u0008\u000c].{0,10}/)[0]));
    const prose = s.replace(/\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|```[\s\S]*?```|`[^`]*`/g, '');
    if (/\b[a-z]\^\d|\bsqrt\(|<=|>=|->/.test(prose)) W('keyboard notation in prose: ' + prose.match(/.{0,20}(\b[a-z]\^\d|\bsqrt\(|<=|>=|->).{0,20}/)[0]);
    if (/!\s|fascinating|amazing|mind-blowing|let's dive|let’s dive/i.test(prose)) W('register: ' + (prose.match(/.{0,30}(!\s|fascinating|amazing|mind-blowing|let's dive|let’s dive).{0,20}/i) || [''])[0]);
  });
  const nq = qids.size;
  const all = (o.sections || []).flatMap(s => s.questions || []).concat(o.practice || [], o.exam || []);
  const wr = all.filter(q => q.type === 'written').length;
  console.log(`${key}: ${errs.length ? 'ERRORS ' + errs.length : 'OK'}${warn.length ? ' · warnings ' + warn.length : ''} · ${(o.sections || []).length} sections, ${(o.sections || []).reduce((a, s) => a + words(s.md), 0)} words, ${nq} questions (${wr} written), ${(o.cards || []).length} cards, ${(o.terms || []).length} terms`);
  errs.forEach(e => console.log('  ERROR', e)); warn.forEach(w => console.log('  warn', w));
  if (errs.length) bad++;
}
process.exit(bad ? 1 : 0);

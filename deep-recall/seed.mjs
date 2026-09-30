import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import fs from 'fs';
const { chromium } = pw;
const html = fs.readFileSync('deep-recall.html','utf8');
fs.writeFileSync('/tmp/claude-0/wrapped.html', `<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>${html}</body></html>`);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 1100 }, colorScheme: 'dark' });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR ' + String(e.stack || e)));
page.on('console', m => { if (m.type()==='error' && !/ERR_TUNNEL|Failed to load/.test(m.text())) errs.push(m.text()); });
await page.context().route('**/pyodide@0.26.4/**', r => { const f = r.request().url().split('pyodide@0.26.4/')[1].split('?')[0]; r.fulfill({ path: '/tmp/pyo/package/' + f, contentType: f.endsWith('.wasm') ? 'application/wasm' : f.endsWith('.js') ? 'application/javascript' : 'application/octet-stream' }); });
await page.route('**/mathjax@3.2.2/**', r => { const f = r.request().url().split('mathjax@3.2.2/')[1].split('?')[0]; r.fulfill({ path: '/tmp/mjx/package/' + f, contentType: 'application/javascript' }); });
await page.route('**/mathjs@13.2.0/**', r => r.fulfill({ path: '/tmp/mj/package/lib/browser/math.js', contentType: 'application/javascript' }));
await page.addInitScript(() => {
  const PROBS = `=== PROBLEM
TOPIC: mth-1-4
KP: k2
SKILL: chain rule
DIFFICULTY: 2
TYPE: expression
VARS: x
PROMPT:
Differentiate \\( \\sin(x^2) \\).
ANSWER: 2*x*cos(x^2)
HINT: outer sin, inner x^2
SOLUTION:
\\( 2x\\cos(x^2) \\)
=== END
=== PROBLEM
TOPIC: mth-1-4
SKILL: chain rule
DIFFICULTY: 1
TYPE: number
TOLERANCE: 0.001
PROMPT:
Compute the value.
\`\`\`plot
f: x^2
\`\`\`
ANSWER: 0.5
SOLUTION:
It is 0.25.
=== END`;
  const PYP = `=== PROBLEM\nTOPIC: py-0-8\nKP: k1\nSKILL: functions\nDIFFICULTY: 1\nTYPE: code\nPROMPT:\nWrite add(a, b) returning the sum.\nSTARTER:\ndef add(a, b):\n    pass\nTESTS:\nassert add(1, 2) == 3\nassert add(-1, 1) == 0\nREFERENCE:\ndef add(a, b):\n    return a + b\nANSWER: code\nHINT: use +\nSOLUTION:\n1. Return a + b.\n=== END`;
  const LESSON = `# Topic\nHook.\n## Part\nText with {{Guten Tag.}}\n\`\`\`plot\nf: sin(x)\n\`\`\`\nCHECK: Why?\nANSWER: Because.\n## Vocabulary\n- {{der Hund}} — the dog (pl. die Hunde)\n- {{die Katze}} — the cat\n## Key points\n- one`;
  let bitN = 0;
  const J = (s) => {
    if (s.includes('micro-problem in a step-by-step lesson')) return ++bitN === 1 ? {verdict:'incorrect', score:0.3, feedback:'You dropped the inner derivative x^2 -> 2x.', hint:'Differentiate the inside too.'} : {verdict:'correct', score:1, feedback:'Right.', hint:null};
    if (s.includes('Close out a tutoring session')) return {facts:['Test 2 moved to Oct 20'], covered:'- Proof by contradiction: 2/3', left_off:'- Negating quantifiers still shaky', next:'Drill negations of nested quantifiers, then prove √2 irrational solo.', recommend:[{topic_id:'mth-6-0', why:'Logic basics'}]};
    if (s.includes('where we left off')) return {left_off:'- mid proof', next:'finish the proof'};
    if (s.includes('graded reading text')) return {title:'Der Hund',sentences:[{t:'Der Hund ist groß.',tr:'The dog is big.'},{t:'Er schläft viel.',tr:'He sleeps a lot.'},{t:'Ich mag ihn.',tr:'I like him.'}],questions:[{prompt:'Ist der Hund klein?',options:['Ja','Nein','Vielleicht'],answer:1,explanation:'groß = big'},{prompt:'Was macht er viel?',options:['Essen','Schlafen','Laufen'],answer:1,explanation:'schläft'}],glossary:[{t:'der Hund',m:'dog'},{t:'schlafen',m:'to sleep'}]};
    if (s.includes('Pick a primary source')) return {title:'Leviathan',author:'Thomas Hobbes',date:1651,paraphrase:false,text:'Hereby it is manifest that during the time men live without a common power to keep them all in awe, they are in that condition which is called war.',context:'Written during the English Civil War.'};
    if (s.includes('reconstruction of the argument')) return {score:0.7,feedback:'Good premises.',model:'P1 ... C ...',gap:null};
    if (s.includes('Break the topic into')) return {kps:[{t:'Outer function',d:'identify it',type:'concept'},{t:'Inner function',d:'identify it',type:'concept'},{t:'Leibniz form',d:'use it',type:'procedure'},{t:'Nested chains',d:'apply twice',type:'procedure'},{t:'Common errors',d:'avoid them',type:'distinction'},{t:'With product rule',d:'combine',type:'procedure'}],pre:s.includes('"Bayesian updating"') ? ['sts-1-2'] : [],scope:'Derivatives of compositions.'};
    if (s.includes('auditing a topic syllabus')) return {missing:[{t:'Added point',d:'x',type:'concept',after:0}],remove:[],fix:[],split:[],notes:'Added one missing point.'};
    if (s.includes('independent fact-checker')) return {issues:[{severity:'error',quote:'Text with',fix:'Corrected text with',why:'w'}],uncovered:[],verdict:'Sound after one fix.'};
    if (s.includes('Answer each multiple-choice')) return {answers:[]};
    if (s.includes('free-recall "brain dump"')) return {coverage:0.55,covered:['a'],missing:[{concept:'Base rates',detail:'d',importance:'core'}],errors:[{claim:'x',correction:'y',concept:'Prior vs likelihood'}],feedback:'Do more.',root_topic:'sts-1-2',root_reason:'Bayes theorem'};
    if (s.includes('exercises for the self-study app')) return {items:[{type:'translate_to',node:'de-0-1',prompt:'The dog is big.',answers:['Der Hund ist groß.'],focus:'gender'},{type:'build',node:'de-0-1',prompt:'I am tired',answer:'Ich bin müde',distractors:['ist']},{type:'cloze',node:'de-0-1',prompt:'Ich ___ müde.',answers:['bin'],hint:'sein'}]};
    if (s.includes('Grade a translation')) return {correct:false,score:0.4,corrected:'Der Hund ist groß.',errors:[{type:'gender',explanation:'Hund is masculine'}],feedback:'Watch gender.'};
    if (s.includes('A learner got this problem wrong')) return {error:'You dropped the inner derivative.',detail:'Chain rule needs the inner derivative',root_topic:'mth-1-3',root_reason:'Product rule shaky'};
    if (s.includes("Check a learner's answer in a math")) return {equivalent:false,note:'no'};
    if (s.includes('read the source below')) return {accuracy:0.8,completeness:0.6,score:0.7,captured:['x'],missed:[{point:'p',why_it_matters:'w',concept:'Key claim'}],distortions:[],feedback:'Good.'};
    if (s.includes('hands-on project')) return {title:'LED circuit',goal:'Light an LED',time:'30 min',parts:[{name:'LED',qty:'1'}],tools:['multimeter'],safety:['Low voltage only'],steps:[{title:'Measure battery',body:'Measure it.',why:'Know your source',check:{type:'measure',prompt:'Battery voltage',expect:{value:9,unit:'V',tolerance:0.1}}},{title:'Done',body:'Look',check:{type:'observe',prompt:'Does it light?'}}]};
    if (s.includes('practice set')) return {questions:[{type:'mcq',prompt:'Q?',options:['a','b','c','d'],answer:1,explanation:'e',traps:['t',null,'t','t'],gap:'g'},{type:'recall',prompt:'Explain',rubric:['r1'],model:'m',gap:'g2'}]};
    if (s.includes('grading a free-response')) return {hits:[true],score:0.9,verdict:'correct',feedback:'ok',gaps:[]};
    return {};
  };
  const T = (s) => {
    if (s.includes('Write the OPENER')) return '## Why does the inside matter?\nA case with a gear inside a gear.\nPREDICT: Does the inner gear change the answer?\nOPTIONS: Yes | No | Only sometimes\n---\nThe bits settle it.';
    if (s.includes('You are teaching ONE small bit')) return '## A bit\nA puzzle about tangents.\nPREDICT: Which way does the tangent tilt at a = 1?\nOPTIONS: Up | Down\n---\nDrag \\( a \\).\n```plot\nx: -3, 3\ny: -1, 9\nf: x^2 | y = x²\nf: 2*a*(x - a) + a^2 | tangent\npoint: a, a^2\nslider: a, -2, 2, 1 | a\n```\nConsider \\( \\sin(x^2) \\) and keyboard x^2 here.\nCHECK: Differentiate \\( \\sin(x^2) \\).\nANSWER: \\( 2x\\cos(x^2) \\)';
    if (s.includes('has a question before moving on')) return 'Because the inside also changes: \\( \\frac{d}{dx}x^2 = 2x \\).';
    if (s.includes('Write each problem exactly') && s.includes('STARTER:')) return PYP;
    if (s.includes('Write each problem exactly')) return PROBS;
    if (s.includes('checking the answer key')) return s.includes('Compute the value') ? 'WORK:\nx\nVERDICT: wrong\nANSWER: 0.25\nNOTE: arithmetic slip\nSOLUTION:\nfixed' : 'WORK:\nok\nVERDICT: correct\nANSWER: 2*x*cos(x^2)';
    if (s.includes('Two careful solvers disagree')) return 'WORK:\nx\nVERDICT: B\nANSWER: 0.25\nSOLUTION:\nit is 0.25';
    if (s.includes('lessons for the self-study app') || s.includes('Write the lesson')) return LESSON;
    if (s.includes('Write the reference TOOLKIT')) return 'RULE: Chain rule\nFORMULA: \\[ (f(g(x)))\' = f\'(g(x))\\,g\'(x) \\]\nWHEN: a function inside another function\nEXAMPLE: \\( (\\sin x^2)\' = 2x\\cos x^2 \\)\nWATCH: forgetting the inner derivative\n\nRULE: Power rule\nFORMULA: \\[ (x^n)\' = n x^{n-1} \\]\nWHEN: a power of x\nEXAMPLE: \\( (x^3)\' = 3x^2 \\)\nWATCH: lowering the exponent by one\n\nTERM: Composition\nMEANS: applying one function to the output of another\nEG: sin of x squared\n\nTERM: Inner function\nMEANS: the function applied first\nEG: x squared in sin(x squared)\n\nSTUCK: Name the outer and inner functions out loud.\nSTUCK: Differentiate the outside, keep the inside, multiply by the inside derivative.';
    return 'Tutor reply with \\( x^2 \\).';
  };
  const sample = async (input, o = {}) => {
    if (Array.isArray(input)) {
      const blob = JSON.stringify(input);
      const text = blob.includes('Session loop') ? 'Try the first step yourself.\n<<record {"topic":"mth-6-1","attempted":3,"correct":2,"understanding":0.6,"skill":"proof by contradiction","note":"Can set up contradiction; stumbles on negating quantifiers."}>>\n<<suggest {"topic":"mth-6-0","why":"Negation of quantifiers is the gap."}>>' : 'Here is my answer. Practice this.\n<<practice {"topic":"mth-1-4","count":5}>>';
      o.onText && o.onText({text, delta:text}); return {text, truncated:false, modelTierApplied:o.modelTier === 'complex' ? 'default' : o.modelTier};
    }
    const text = T(input); o.onText && o.onText({text, delta:text}); return {text, truncated:false};
  };
  sample.json = async (input) => J(String(input));
  sample.limits = async () => ({maxPromptBytes:262144, images:{maxCount:4, maxInputBytes:2e7, mediaTypes:['image/jpeg','image/png']}, tools:{maxCount:8}});

  const now = Date.now(), DAYMS = 864e5;
  const dk = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const days = {}, xpByDay = {}, mins = {};
  for (let i = 2; i < 70; i++) { if (i % 7 === 5 || i % 11 === 9) continue; const m = 20 + (i * 37) % 70, k = dk(now - i * DAYMS); days[k] = {m, x:m + 10, a:6 + i % 9, c:4 + i % 7, b:i % 4, s:i % 3 ? 1 : 0}; xpByDay[k] = m + 10; mins[k] = m; }
  const base = 'data/users/u1/profile';
  const DB = {};
  DB[base] = {xp:2400, lastDay:dk(now - 2 * DAYMS), days, xpByDay, mins, minsBy:{mth:1900, phil:320, cert:240}, freezes:1, goal:50, depth:'rigorous', theme:'dark', teachStyle:'One step at a time.'};
  const node = (k, o) => { DB[base + '/nodes/' + k] = Object.assign({key:k, sessions:2, hasLesson:true, last:now - 3 * DAYMS, firstAt:now - 30 * DAYMS, due:now + 4 * DAYMS, interval:6}, o); };
  node('mth-0-0', {mastery:92, p:{a:12, c:11, f:10, ema:0.95}});
  node('mth-0-1', {mastery:81, p:{a:10, c:8, f:7, ema:0.85}, due:now - DAYMS});
  node('mth-0-2', {mastery:55, p:{a:6, c:3, f:2, ema:0.6}});
  node('mth-6-1', {mastery:88, sessions:0, hasLesson:false, study:{n:3, a:8, c:7}, p:{a:8, c:7, f:0, ema:0.9}, studyLog:[{title:'Logic & Proof', t:now - DAYMS, a:3, c:3}]});
  node('phil-0-0', {mastery:70, p:{a:5, c:4, f:4, ema:0.8}});
  DB[base + '/gaps/g1'] = {id:'g1', node:'mth-0-2', concept:'Factoring by grouping', detail:'Pairs terms wrong', hits:2, status:'open', created:now - 5 * DAYMS};
  DB[base + '/gaps/g2'] = {id:'g2', node:'mth-0-1', concept:'Sign errors', detail:'x', hits:1, status:'resolved', created:now - 12 * DAYMS, resolvedAt:now - 8 * DAYMS};
  const snap = (path) => ({exists:path in DB, id:path.split('/').pop(), data:() => JSON.parse(JSON.stringify(DB[path]))});
  const mkDoc = (path) => ({get:async () => snap(path), set:async d => { DB[path] = JSON.parse(JSON.stringify(d)); }, delete:async () => { delete DB[path]; }, collection:c => mkCol(path + '/' + c)});
  const mkCol = (path) => ({limit:() => ({get:async () => ({docs:Object.keys(DB).filter(k => k.startsWith(path + '/') && !k.slice(path.length + 1).includes('/')).map(snap)})}), doc:id => mkDoc(path + '/' + id)});
  window.__DB = DB;
  window.claude = { use: async (n) => n === 'sample' ? sample : n === 'db' ? {doc:mkDoc} : n === 'user' ? {id:async () => 'u1'} : null };
});

const step = async (label, fn) => { try { await fn(); } catch (e) { errs.push('STEP ' + label + ': ' + e.message.split('\n').slice(0,3).join(' | ')); } };
const click = (sel) => page.click(sel, {timeout: 4000});
const nav = (x) => page.evaluate((y) => document.querySelector(`#nav [data-arg="${y}"]`).click(), x);
const txt = () => page.locator('#app').textContent();
await page.goto('file:///tmp/claude-0/wrapped.html');
await page.waitForTimeout(1500);
await page.screenshot({ path: 'seed-home.png', fullPage: true });
await step('freeze used', async () => { const st = await page.evaluate(() => JSON.parse(JSON.stringify(window.__DB['data/users/u1/profile'] || {}))); const t = await txt(); if (!/freeze/i.test(await page.locator('#toast').textContent().catch(() => ''))) {} ; const s = await page.locator('.topbar .stat.fire .num').textContent(); if (+s < 3) throw new Error('streak not preserved: ' + s + ' freezes ' + st.freezes); });
await step('week card', async () => { const t = await txt(); if (!/week in review|clean page|Pick it back up/i.test(t)) throw new Error('no fresh-start card'); if (!/Set a study plan/.test(t)) throw new Error('no plan prompt'); });
await step('plan', async () => { await click('.planline'); await click('[data-act="pfDay"][data-arg="0"]'); await page.fill('#plCue', 'After dinner'); await page.fill('#plPlace', 'my desk'); const say = await page.locator('#planSay').textContent(); if (!/After dinner, at .* I study for 30 min at my desk/.test(say)) throw new Error('say ' + say); await page.screenshot({ path: 'seed-plan.png', fullPage: true }); await click('[data-act="planSave"]'); await page.waitForTimeout(200); if (!/Planned today|Rest day/.test(await txt())) throw new Error('plan line'); });
await step('week review', async () => { await nav('home'); const b = await page.$('[data-act="weekOpen"]'); if (b) await b.click(); else { await nav('progress'); await click('[data-act="weekOpen"]'); } await page.waitForTimeout(200); if (await page.locator('.wdot').count() !== 7) throw new Error('dots'); await page.screenshot({ path: 'seed-week.png', fullPage: true }); await click('[data-act="wkTarget"][data-arg="5"]'); await page.fill('#wkNote', 'review first'); await click('[data-act="wkSave"]'); await page.waitForTimeout(200); if (!/review first/.test(await txt())) throw new Error('week note on today'); });
await page.screenshot({ path: 'seed-home2.png', fullPage: true });
await step('progress habit', async () => { await nav('progress'); await page.waitForTimeout(200); if (!await page.locator('.habitcard').count()) throw new Error('habit card'); await page.screenshot({ path: 'seed-progress.png', fullPage: true }); });
await step('review workload', async () => { await nav('review'); await page.waitForTimeout(200); if (!/Review workload/.test(await txt())) throw new Error('workload'); const before = await page.locator('[data-act="setRetain"]').allTextContents(); await click('[data-act="setRetain"][data-arg="0.95"]'); const on = await page.locator('[data-act="setRetain"].on').textContent(); if (!/95%/.test(on)) throw new Error('retain'); await page.screenshot({ path: 'seed-review.png', fullPage: true }); await click('[data-act="setRetain"][data-arg="0.9"]'); });
await step('frontier + solo', async () => { await nav('library'); await click('[data-act="subject"][data-arg="mth"]'); await page.waitForTimeout(200); if (!await page.locator('.frontier .chip-btn').count()) throw new Error('no frontier'); await page.screenshot({ path: 'seed-subject.png' });
  await page.evaluate(() => { const b = document.querySelector('[data-act="course"][data-arg="6"]'); if (b) b.click(); }); await page.waitForTimeout(100); await click('.path [data-act="topic"][data-arg="mth-6-1"]'); await page.waitForTimeout(200); const t = await txt(); if (!/Solo check/.test(t)) throw new Error('no solo note'); const ring = await page.locator('.topic-head .ring').textContent(); if (+ring.replace('%', '') > 74) throw new Error('not capped ' + ring); await page.screenshot({ path: 'seed-solo.png', fullPage: true }); });
await step('slider plot', async () => { await nav('library'); await click('[data-act="subject"][data-arg="mth"]'); await page.evaluate(() => { const b = document.querySelector('[data-act="course"][data-arg="1"]'); if (b && !b.classList.contains('open')) b.click(); }); await click('.path [data-act="topic"][data-arg="mth-1-4"]'); await click('.fstep[data-act="bits"]'); await page.waitForSelector('[data-act="bitsStart"]:not([disabled])', {timeout:8000}); await page.screenshot({ path: 'seed-opener.png', fullPage: true }); await click('[data-act="bitsStart"]'); await page.waitForSelector('.predict .opt', {timeout:8000}); if (await page.locator('.sliders input').count()) throw new Error('body shown before guess'); await page.screenshot({ path: 'seed-predict.png', fullPage: true }); await click('.predict .opt'); await page.waitForSelector('.sliders input', {timeout:8000}); const d0 = await page.locator('.plot-live svg').innerHTML(); await page.evaluate(() => { const i = document.querySelector('.sliders input'); i.value = '-1.52'; i.dispatchEvent(new Event('input', {bubbles:true})); }); await page.waitForTimeout(150); const d1 = await page.locator('.plot-live svg').innerHTML(); if (d0 === d1) throw new Error('slider did not redraw'); if (!/-1\.52/.test(await page.locator('.slider output').textContent())) throw new Error('output'); await page.screenshot({ path: 'seed-slider.png', fullPage: true }); });
await page.setViewportSize({ width: 1280, height: 900 });
await step('desktop home', async () => { await nav('home'); await page.waitForTimeout(200); await page.screenshot({ path: 'seed-desk-home.png', fullPage: true }); await nav('progress'); await page.screenshot({ path: 'seed-desk-progress.png', fullPage: true }); });
console.log(errs.length ? errs.join('\n') : 'SEED OK');
await browser.close();

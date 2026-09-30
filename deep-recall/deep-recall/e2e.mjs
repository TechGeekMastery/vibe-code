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
    if (s.includes('You are teaching ONE small bit')) return '## A bit\nConsider \\( \\sin(x^2) \\) and keyboard x^2 here.\nCHECK: Differentiate \\( \\sin(x^2) \\).\nANSWER: \\( 2x\\cos(x^2) \\)';
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
  window.claude = { use: async (n) => n === 'sample' ? sample : null };
});
const step = async (label, fn) => { try { await fn(); } catch (e) { errs.push('STEP ' + label + ': ' + e.message.split('\n').slice(0,3).join(' | ')); } };
const click = (sel) => page.click(sel, {timeout: 4000});
await page.goto('file:///tmp/claude-0/wrapped.html');
await page.waitForTimeout(1200);
const nav = async (a) => {
  const x = a === 'me' ? 'progress' : a;
  if (x === 'gaps' || x === 'settings') { await nav(x === 'gaps' ? 'review' : 'progress'); await page.waitForTimeout(80); return page.evaluate((y) => document.querySelector(y === 'gaps' ? '.rtabs [data-arg="gaps"]' : '[data-act="nav"][data-arg="settings"]').click(), x); }
  return page.evaluate((y) => document.querySelector(`#nav [data-arg="${y}"]`).click(), x);
};
await page.screenshot({ path: 'e2e-home0.png', fullPage: true });
await step('home', async () => { if (!await page.locator('.continue').count()) throw new Error('no continue card'); if (await page.locator('.qtile').count() !== 4) throw new Error('quick tiles'); await nav('library'); const n = await page.locator('.stile[data-act="subject"]').count(); if (n < 24) throw new Error('tiles ' + n); await page.fill('#libQ', 'chain rule'); await page.waitForTimeout(100); if (!await page.locator('#libResults .lib-row').count()) throw new Error('search found nothing'); await page.fill('#libQ', ''); });
await page.screenshot({ path: 'e2e-library.png', fullPage: true });
// problems flow
await step('open calc', async () => { await click('[data-act="subject"][data-arg="mth"]'); await click('[data-act="course"][data-arg="1"]'); await click('[data-act="topic"][data-arg="mth-1-4"]'); const f = await page.locator('.fstep').allTextContents(); if (!/Learn/.test(f[0]) || !/Solve/.test(f[1])) throw new Error('guided flow ' + f.join('|')); await click('.method-sw [data-arg="mth|self"]'); const g = await page.locator('.fstep').allTextContents(); if (!/Retrieve/.test(g[0])) throw new Error('self flow ' + g.join('|')); await click('.method-sw [data-arg="mth|guided"]'); await page.screenshot({ path: 'e2e-topic.png', fullPage: true }); await click('.flow [data-act="practice"]:not([disabled])'); await page.waitForTimeout(600); });
await step('p1 wrong twice', async () => { await click('[data-act="conf"][data-arg="95"]'); await page.fill('#pans', 'cos(x^2)'); await click('#pcheckBtn'); await page.waitForTimeout(300); await page.fill('#pans', 'x*cos(x^2)'); await click('#pcheckBtn'); await page.waitForTimeout(500); });
await step('p1 feedback', async () => { const t = await page.locator('.fb').first().textContent(); if (!/Not solved/.test(t)) throw new Error('no fb'); if (!/inner derivative/.test(t)) throw new Error('no diag'); if (!/High-confidence/.test(t)) throw new Error('no hyper'); const plots = await page.locator('.plot svg').count(); if (!plots) throw new Error('no diff plot'); });
await page.screenshot({ path: 'e2e-problem.png', fullPage: true });
await step('report', async () => { await click('[data-act="reportProblem"]'); await page.waitForTimeout(200); await click('#nextBtn'); await page.waitForTimeout(300); });
await step('p2 key fixed', async () => { await click('[data-act="conf"][data-arg="75"]'); await page.fill('#pans', '1/4'); await click('#pcheckBtn'); await page.waitForTimeout(600); const t = await page.locator('.fb').first().textContent(); if (!/Solved/.test(t) || !/corrected/.test(t)) throw new Error('key not fixed: ' + t.slice(0,120)); });
await step('summary', async () => { await click('#nextBtn'); await page.waitForTimeout(300); const t = await page.locator('.summary').textContent(); if (!/1\/1/.test(t)) throw new Error('summary ' + t.slice(0, 80)); if (!/Topic stage/.test(t)) throw new Error('no stage in summary'); await click('[data-act="endSummary"]'); await page.waitForTimeout(200); if (!await page.locator('.topic-head').count()) throw new Error('did not return to topic'); });
// gaps page shows root
await step('gaps root', async () => { await nav('gaps'); await page.waitForTimeout(200); const t = await page.locator('#app').textContent(); if (/Surfaced in/.test(t) || !/No open gaps/.test(t)) throw new Error('reported problem left gaps behind: ' + t.slice(0, 200)); });
// brain dump on epistemics
await step('dump', async () => { await nav('library'); await click('[data-act="subject"][data-arg="epi"]'); await click('[data-act="topic"][data-arg="epi-0-0"]'); await page.waitForTimeout(400); if (!await page.locator('.fstep[data-act="readiness"]').count()) throw new Error('no readiness step'); await click('[data-act="ttab"][data-arg="prog"]'); if (!await page.locator('.kprow').count()) throw new Error('no kp rows'); await click('[data-act="ttab"][data-arg="learn"]'); await click('.chips [data-arg="dump|epi-0-0"]'); await page.fill('textarea[data-inp="task:text"]', 'Bayes updating means combining prior beliefs with likelihood of evidence to get posterior beliefs, proportional.'); await click('[data-act="dumpSubmit"]'); await page.waitForTimeout(400); const t = await page.locator('#app').textContent(); if (!/55%/.test(t)) throw new Error('dump result'); });
// language lesson + exercises
await step('german lesson', async () => { await nav('library'); await click('[data-act="subject"][data-arg="de"]'); await click('[data-act="topic"][data-arg="de-0-1"]'); await click('.flow [data-act="lesson"]'); await page.waitForTimeout(700); const t = await page.locator('#app').textContent(); if (!/2 new words/.test(t)) throw new Error('vocab not added: ' + t.slice(0, 200)); if (!/Audited/.test(t) || !/Corrected text with/.test(t)) throw new Error('audit not applied'); if (!await page.locator('.say-b').count()) throw new Error('no say buttons'); });
await step('german exercises', async () => { await click('[data-act="practiceFromLesson"]'); await page.waitForTimeout(500); await page.fill('#lans', 'Die Hund ist groß'); await click('[data-act="lcheck"]'); await page.waitForTimeout(400); let t = await page.locator('.fb').textContent(); if (!/gender/.test(t)) throw new Error('lang grade'); await click('#nextBtn'); await click('[data-act="lpick"][data-arg="0"]'); const toks = await page.locator('.build-pool .tok').allTextContents(); await page.evaluate(() => { const q = document.querySelectorAll('.build-line .tok'); q.forEach(b => b.click()); }); for (const w of ['Ich','bin','müde']) { const i = (await page.locator('.build-pool .tok').allTextContents()).indexOf(w); await click(`[data-act="lpick"][data-arg="${i}"]`); } await click('[data-act="lcheck"]'); t = await page.locator('.fb').textContent(); if (!/Correct/.test(t)) throw new Error('build ' + t); await click('#nextBtn'); await page.fill('#lans', 'bin'); await click('[data-act="lcheck"]'); await click('#nextBtn'); await page.waitForTimeout(200); const s = await page.locator('.summary').textContent(); if (!/2\/3/.test(s)) throw new Error('lang summary ' + s.slice(0, 80)); await click('[data-act="endSummary"]'); });
const fresh = async () => { await page.reload(); await page.waitForTimeout(1000); };
// tutor with tool
await step('tutor', async () => { await fresh(); await nav('library'); await click('[data-act="subject"][data-arg="mth"]'); await click('[data-act="tutor"][data-arg="mth"]'); await page.waitForTimeout(300); await page.fill('#tin', 'Help'); await page.keyboard.press('Enter'); await page.waitForTimeout(500); if (!await page.locator('.actcard').count()) throw new Error('no action card'); });
// source summary
await step('source', async () => { await fresh(); await nav('library'); await click('[data-act="subject"][data-arg="mth"]'); await click('[data-act="course"][data-arg="1"]'); await click('[data-act="topic"][data-arg="mth-1-4"]'); await click('.chips [data-act="source"]'); await page.fill('#srcText', 'x '.repeat(200)); await click('[data-act="srcUsePaste"]'); await click('[data-act="srcSummaryStart"]'); await page.fill('textarea[data-inp="src:summary"]', 'The source argues many things about the chain rule and derivatives of compositions.'); await click('[data-act="srcSummarySubmit"]'); await page.waitForTimeout(400); const t = await page.locator('#app').textContent(); if (!/70%/.test(t)) throw new Error('summary result'); });
// project
await step('project', async () => { await fresh(); await nav('library'); await click('[data-act="subject"][data-arg="elx"]'); await click('[data-act="topic"][data-arg="elx-0-0"]'); await click('.flow [data-act="project"]'); await page.waitForTimeout(500); await page.fill('#meas', '8.7'); await click('[data-act="projMeasure"]'); await page.waitForTimeout(200); await click('[data-act="projPass"]'); await page.waitForTimeout(200); const t = await page.locator('#app').textContent(); if (!/Built/.test(t)) throw new Error('project not finished'); });
// me page calibration
await step('me', async () => { await click('[data-act="topic"]').catch(()=>{}); await nav('me'); await page.waitForTimeout(200); const t = await page.locator('#app').textContent(); if (!/Calibration/.test(t)) throw new Error('no calibration'); });
await step('subject tabs', async () => { await nav('library'); await click('[data-act="subject"][data-arg="mth"]'); for (const t of ['progress','kit','method','path']) { await click(`[data-act="subjTab"][data-arg="${t}"]`); } const t = await page.locator('.levelcard').textContent(); if (!/Novice|Apprentice/.test(t)) throw new Error('level ' + t); });
await page.screenshot({ path: 'e2e-subject.png', fullPage: true });
await step('home dark', async () => { await nav('home'); await page.waitForTimeout(150); await page.screenshot({ path: 'e2e-home.png', fullPage: true }); });
await step('theme light', async () => { await nav('settings'); await click('[data-act="setTheme"][data-arg="light"]'); const th = await page.evaluate(() => document.documentElement.dataset.theme); if (th !== 'light') throw new Error('theme ' + th); await nav('home'); await page.screenshot({ path: 'e2e-home-light.png', fullPage: true }); await nav('settings'); await click('[data-act="setTheme"][data-arg="system"]'); });
await page.setViewportSize({ width: 1280, height: 900 });
await step('desktop', async () => { await nav('library'); await click('[data-act="subject"][data-arg="phy"]'); await page.screenshot({ path: 'e2e-desktop.png' }); });
await page.setViewportSize({ width: 400, height: 1100 });
await step('drill', async () => { await fresh(); await nav('library'); await click('[data-act="subject"][data-arg="cert"]'); await click('[data-act="topic"][data-arg="cert-0-6"]'); await click('.fstep[data-act="drill"]'); await page.fill('#pans', '0.0.0.0'); await page.keyboard.press('Enter'); await page.waitForTimeout(150); const t = await page.locator('.fb').textContent(); if (!/Answer:/.test(t)) throw new Error('drill fb ' + t); await click('#nextBtn'); if (!await page.locator('#pans').count() && !await page.locator('.opt').count()) throw new Error('drill next'); await click('[data-act="quitSession"]'); });
await step('python code', async () => { await click('[data-act="endSummary"]').catch(()=>{}); await nav('library'); await click('[data-act="subject"][data-arg="py"]'); await click('[data-act="topic"][data-arg="py-0-8"]'); await click('.flow [data-act="practice"]:not([disabled])'); await page.waitForSelector('#code', {timeout:8000}); await click('[data-act="conf"][data-arg="75"]'); await page.fill('#code', 'def add(a, b):\n    return a - b'); await click('#pcheckBtn'); await page.waitForSelector('.code-out.bad', {timeout:90000}); await page.fill('#code', 'def add(a, b):\n    return a + b'); await click('#pcheckBtn'); await page.waitForSelector('.fb.good', {timeout:30000}); const t = await page.locator('.fb').first().textContent(); if (!/Solved/.test(t)) throw new Error('code fb ' + t.slice(0, 100)); });
await page.screenshot({ path: 'e2e-code.png', fullPage: true });
await step('exam', async () => { await fresh(); await nav('library'); await click('[data-act="subject"][data-arg="mth"]'); await click('[data-act="course"][data-arg="1"]'); await click('[data-act="exam"][data-arg="mth|1"]'); await page.waitForSelector('#pans', {timeout:8000}); if (!await page.locator('#examClock').count()) throw new Error('no clock'); if (await page.locator('[data-act="phint"]').count()) throw new Error('hint in exam'); await click('[data-act="conf"][data-arg="50"]'); await page.fill('#pans', 'x'); await click('#pcheckBtn'); await page.waitForTimeout(500); const fb = await page.locator('.fb').first().textContent(); if (!/Not solved|solution/.test(fb)) throw new Error('exam one attempt ' + fb.slice(0, 80)); await click('[data-act="quitSession"]'); await page.waitForTimeout(300); const t = await page.locator('.summary').textContent(); if (!/Not passed yet/.test(t)) throw new Error('exam summary ' + t.slice(0, 120)); await click('[data-act="endSummary"]'); const c = await page.locator('.course.open').textContent(); if (!/exam 0%/.test(c)) throw new Error('exam badge ' + c); });
await step('reader', async () => { await fresh(); await nav('library'); await click('[data-act="subject"][data-arg="de"]'); await click('[data-act="topic"][data-arg="de-0-1"]'); await click('.fstep[data-act="reader"]'); await page.waitForSelector('.reader', {timeout:5000}); await click('[data-act="rdShow"][data-arg="0"]'); await click('[data-act="rdAns"][data-arg="0|1"]'); await click('[data-act="rdAns"][data-arg="1|0"]'); const t = await page.locator('#app').textContent(); if (!/1 of 2 right/.test(t)) throw new Error('reader score'); await click('[data-act="rdAddWords"]'); await click('[data-act="rdMode"][data-arg="shadow"]'); await click('[data-act="rdRate"][data-arg="0|2"]'); if (!/Sentence 2 of 3/.test(await page.locator('#app').textContent())) throw new Error('shadow advance'); });
await step('primary source', async () => { await nav('library'); await click('[data-act="subject"][data-arg="phil"]'); await click('[data-act="course"][data-arg="4"]'); await click('[data-act="topic"][data-arg="phil-4-0"]'); await click('.chips [data-arg="recon|phil-4-0"]'); await page.waitForSelector('blockquote', {timeout:5000}); await page.fill('textarea[data-inp="task:text"]', 'P1: Without a common power men are in a state of war. P2: War makes life insecure. C: Men need a sovereign. Weakest: P1.'); await click('[data-act="scenarioSubmit"]'); await page.waitForTimeout(300); if (!/70%/.test(await page.locator('#app').textContent())) throw new Error('recon grade'); });
await step('goal', async () => { await nav('library'); await click('[data-act="subject"][data-arg="cert"]'); await click('[data-act="subjTab"][data-arg="progress"]'); await click('[data-act="goalForm"]'); await page.selectOption('#goalScope', 'N10-009'); await page.fill('#goalDate', '2027-01-15'); await click('[data-act="saveGoal"]'); await page.waitForTimeout(150); const t = await page.locator('#app').textContent(); if (!/N10-009 exam by/.test(t) || !/topics\/week/.test(t)) throw new Error('goal card ' + t.slice(0, 200)); await click('[data-act="subjTab"][data-arg="progress"]'); if (!/N10-009 readiness/.test(await page.locator('#app').textContent())) throw new Error('exam readiness'); await nav('home'); if (!/Goals/.test(await page.locator('#app').textContent())) throw new Error('goal on today'); });
await page.screenshot({ path: 'e2e-home2.png', fullPage: true });
await step('study session', async () => { await fresh(); await nav('study'); await click('[data-act="threadForm"]'); await page.selectOption('#stSubj', 'mth'); await page.fill('#stTitle', 'Logic & Proof class'); await page.fill('#stGoal', 'MAC 2311? no, logic & proof: quiz Friday on contradiction'); await click('[data-act="threadCreate"]'); await page.waitForTimeout(700);
  if (!await page.locator('.reccard').count()) throw new Error('no record card'); if (!/Balanced model/i.test(await page.locator('.tierline').first().textContent())) throw new Error('tier label ' + await page.locator('.tierline').first().textContent()); if (!/Negation of quantifiers/.test(await page.locator('#tlog').textContent())) throw new Error('no suggestion card');
  await click('[data-act="wrapUp"]'); await page.waitForTimeout(500); const w = await page.locator('.msg.ai.wrap').textContent(); if (!/Where we left off/.test(w) || !/Next time/.test(w)) throw new Error('wrap ' + w.slice(0, 100));
  await click('[data-act="tutorNotes"]'); if (!/Test 2 moved to Oct 20/.test(await page.locator('#app').textContent())) throw new Error('fact not captured');
  await click('.subbar .icon-btn'); const t = await page.locator('#app').textContent(); if (!/Logic & Proof class/.test(t) || !/Next: Drill negations/.test(t)) throw new Error('study list ' + t.slice(0, 200));
  await nav('home'); const h = await page.locator('#app').textContent(); if (!/Resume: Logic & Proof class/.test(h)) throw new Error('no resume in plan');
  await nav('library'); await click('[data-act="subject"][data-arg="mth"]'); if (!await page.locator('.course.open[data-arg="6"]').count()) await click('[data-act="course"][data-arg="6"]'); const row = await page.locator('.path [data-act="topic"][data-arg="mth-6-1"]').textContent(); if (!/studied in sessions/.test(row) || !/2 solved/.test(row)) throw new Error('path row ' + row);
  await click('.path [data-act="topic"][data-arg="mth-6-1"]'); await click('[data-act="ttab"][data-arg="prog"]'); const tp = await page.locator('#app').textContent(); if (!/From study sessions/.test(tp) || !/negating quantifiers/.test(tp)) throw new Error('topic study log');
  await click('[data-act="thread"]'); await page.waitForTimeout(300); if (!await page.locator('.msg.ai.wrap').count()) throw new Error('resume did not reopen thread'); });
await page.screenshot({ path: 'e2e-study.png', fullPage: true });
await step('bits', async () => { await fresh(); await nav('library'); await click('[data-act="subject"][data-arg="mth"]'); if (!await page.locator('.course.open[data-arg="1"]').count()) await click('[data-act="course"][data-arg="1"]'); await click('.path [data-act="topic"][data-arg="mth-1-4"]'); await click('.fstep[data-act="bits"]'); await page.waitForSelector('.predict .opt', {timeout:8000}); if (!/gear inside a gear/.test(await page.locator('.opener').textContent())) throw new Error('opener'); if (/bits settle/.test(await page.locator('#bitBody').textContent())) throw new Error('opener tail shown before guess'); await click('.predict .opt'); if (!/bits settle/.test(await page.locator('#bitBody').textContent())) throw new Error('opener tail after guess'); await page.waitForSelector('[data-act="bitsStart"]:not([disabled])', {timeout:8000}); await click('[data-act="bitsStart"]'); await page.waitForSelector('#bitAns', {timeout:8000});
  const body = await page.locator('#bitBody').innerHTML(); if (!/x<sup>2<\/sup>/.test(body)) throw new Error('keyboard math not prettified');
  await page.fill('#bitAns', 'cos(x^2)'); await click('[data-act="bitCheck"]'); await page.waitForTimeout(300); let t = await page.locator('.bitcheck').textContent(); if (!/Not yet/.test(t) || !/Hint/.test(t)) throw new Error('bit fb1 ' + t.slice(0, 100)); if (!/→/.test(t)) throw new Error('arrow not prettified in feedback');
  await page.fill('#bitAns', '2x cos(x^2)'); await click('[data-act="bitCheck"]'); await page.waitForTimeout(300); t = await page.locator('.bitcheck').textContent(); if (!/Correct/.test(t)) throw new Error('bit fb2');
  await page.fill('#bitAsk', 'Why the inner derivative?'); await page.keyboard.press('Enter'); await page.waitForTimeout(400); if (!/inside also changes/.test(await page.locator('.bitqa').textContent())) throw new Error('bit Q&A');
  await click('[data-act="bitNext"]'); await page.waitForTimeout(300); if (!/Bit 2 of/.test(await page.locator('#app').textContent())) throw new Error('next bit');
  const ok = await page.locator('.bitticks button.ok').count(); if (ok !== 1) throw new Error('tick state ' + ok);
  await click('.subbar [data-act="topic"]'); const f = await page.locator('.fstep[data-act="bits"]').textContent(); if (!/1 of \d+ bits done/.test(f)) throw new Error('flow progress ' + f); });
await page.screenshot({ path: 'e2e-bits.png', fullPage: true });
await step('toolkit', async () => { await nav('library'); await click('[data-act="subject"][data-arg="mth"]'); if (!await page.locator('.course.open[data-arg="1"]').count()) await click('[data-act="course"][data-arg="1"]'); await click('.path [data-act="topic"][data-arg="mth-1-4"]'); await click('[data-act="ttab"][data-arg="kit"]'); await page.waitForSelector('.rule', {timeout:5000}); const n = await page.locator('.rule').count(); if (n !== 2) throw new Error('rules ' + n); if (!await page.locator('.rule mjx-container, .rule .formula').count()) throw new Error('no formula'); if (await page.locator('.glossary > div').count() !== 2) throw new Error('terms'); if (!/Name the outer/.test(await page.locator('.stuck').textContent())) throw new Error('stuck');
  await page.screenshot({ path: 'e2e-kit.png', fullPage: true });
  await click('[data-act="subjectAt"]'); await click('[data-act="subjTab"][data-arg="kit"]'); if (!await page.locator('.kitbook .rule').count()) throw new Error('rule book'); await page.fill('#kitQ', 'power'); await page.waitForTimeout(100); if (await page.locator('#kitBook .rule').count() !== 1) throw new Error('rule book filter');
  await click('[data-act="subjTab"][data-arg="path"]'); await click('.path [data-act="topic"][data-arg="mth-1-4"]'); await click('.fstep[data-act="bits"]'); await page.waitForTimeout(400); await click('.subbar [data-act="kit"]'); await page.waitForSelector('#kitDrawer .rule', {timeout:4000}); await page.screenshot({ path: 'e2e-drawer.png' }); await page.keyboard.press('Escape'); if (await page.locator('#kitDrawer').count()) throw new Error('drawer did not close'); });
await step('progress', async () => { await nav('progress'); await page.waitForTimeout(150); if (!await page.locator('.tiercard').count()) throw new Error('no tier card'); if (!await page.locator('.colchart').count()) throw new Error('no charts'); if (!await page.locator('.heat-g i').count()) throw new Error('no heatmap'); const k = await page.locator('.kpis').textContent(); if (!/Bitslearned1/.test(k.replace(/\s+/g, ''))) throw new Error('kpis ' + k.replace(/\s+/g, ' ').slice(0, 200)); await page.screenshot({ path: 'e2e-progress.png', fullPage: true });
  for (const p of ['day', 'month', 'all']) await click(`[data-act="statPer"][data-arg="${p}"]`);
  await click('[data-act="ptab"][data-arg="ascent"]'); if (await page.locator('.ascent li').count() !== 10) throw new Error('tiers'); if (!/Dr\. Manhattan/.test(await page.locator('.ascent').textContent())) throw new Error('top tier'); await page.screenshot({ path: 'e2e-ascent.png', fullPage: true });
  await click('[data-act="ptab"][data-arg="ach"]'); if (await page.locator('.ach').count() !== 15) throw new Error('achievements'); if (!await page.locator('.ach.on').count()) throw new Error('none earned'); await page.screenshot({ path: 'e2e-ach.png', fullPage: true });
  await nav('settings'); if (!await page.locator('#teachStyle').count()) throw new Error('settings'); });
console.log(errs.length ? errs.join('\n') : 'E2E OK');
await browser.close();

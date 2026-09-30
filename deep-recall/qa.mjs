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
  const J = (s) => {
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
    if (s.includes('Write each problem exactly') && s.includes('STARTER:')) return PYP;
    if (s.includes('Write each problem exactly')) return PROBS;
    if (s.includes('checking the answer key')) return s.includes('Compute the value') ? 'WORK:\nx\nVERDICT: wrong\nANSWER: 0.25\nNOTE: arithmetic slip\nSOLUTION:\nfixed' : 'WORK:\nok\nVERDICT: correct\nANSWER: 2*x*cos(x^2)';
    if (s.includes('Two careful solvers disagree')) return 'WORK:\nx\nVERDICT: B\nANSWER: 0.25\nSOLUTION:\nit is 0.25';
    if (s.includes('lessons for the self-study app') || s.includes('Write the lesson')) return LESSON;
    return 'Tutor reply with \\( x^2 \\).';
  };
  const sample = async (input, o = {}) => {
    if (Array.isArray(input)) {
      if (o.tools) { const t = o.tools.find(x => x.name === 'offer_practice'); if (t) t.execute({topic_id:'mth-1-4', count:5}, {signal:new AbortController().signal}); }
      const text = 'Here is my answer. Practice this.'; o.onText && o.onText({text, delta:text}); return {text, truncated:false};
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
const issues = [];
const nav = async (a) => {
  const x = a === 'me' ? 'progress' : a;
  if (x === 'gaps' || x === 'settings') { await nav(x === 'gaps' ? 'review' : 'progress'); await page.waitForTimeout(80); return page.evaluate((y) => document.querySelector(y === 'gaps' ? '.rtabs [data-arg="gaps"]' : '[data-act="nav"][data-arg="settings"]').click(), x); }
  return page.evaluate((y) => document.querySelector(`#nav [data-arg="${y}"]`).click(), x);
};
const overflow = async (label) => {
  const r = await page.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    if (document.documentElement.scrollWidth > W + 1) bad.push('page scrollWidth ' + document.documentElement.scrollWidth);
    document.querySelectorAll('#app *').forEach(el => { const b = el.getBoundingClientRect(); if (b.width && b.right > W + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('pre,.tbl,.math-display,mjx-container,.code-out,textarea,.subbar-t,.tabbar,.tabs')) bad.push((el.className || el.tagName) + ' right=' + Math.round(b.right)); });
    return bad.slice(0, 4);
  });
  if (r.length) issues.push(label + ': overflow ' + r.join('; '));
};
const clickAct = async (act, arg) => { const sel = arg == null ? `[data-act="${act}"]` : `[data-act="${act}"][data-arg="${arg}"]`; await page.click(sel, {timeout:3000}); await page.waitForTimeout(120); };
for (const w of [390, 1280]) {
  await page.setViewportSize({width:w, height:900});
  for (const v of ['home', 'study', 'library', 'review', 'gaps', 'progress', 'settings']) { await nav(v); await page.waitForTimeout(100); await overflow(w + ' ' + v); }
  await nav('home'); await page.evaluate(() => { const b = document.querySelector('.planline'); if (b) b.click(); }); await page.waitForTimeout(100); await overflow(w + ' plan');
  await nav('progress'); await page.evaluate(() => { const b = document.querySelector('[data-act="weekOpen"]'); if (b) b.click(); }); await page.waitForTimeout(100); await overflow(w + ' week');
  await nav('progress'); for (const t of ['ascent', 'ach', 'overview']) { await clickAct('ptab', t); await overflow(`${w} progress ${t}`); }
  for (const p of ['day', 'all']) { await clickAct('statPer', p); await overflow(`${w} per ${p}`); }
  const sids = await page.evaluate(() => { document.querySelector('#nav [data-arg="library"]').click(); return [...document.querySelectorAll('.stile[data-act="subject"]')].map(b => b.dataset.arg); });
  for (const sid of sids) {
    await nav('library'); await clickAct('subject', sid); await overflow(w + ' subject ' + sid);
    const tabs = await page.$$eval('[data-act="subjTab"]', bs => bs.map(b => b.dataset.arg));
    for (const t of tabs) { await clickAct('subjTab', t); await overflow(`${w} ${sid} tab ${t}`); }
    await clickAct('subjTab', 'path');
    const courses = await page.$$eval('[data-act="course"]', bs => bs.length);
    for (let ui = 0; ui < courses; ui++) {
      const open = await page.$$eval('.course.open', bs => bs.map(b => b.dataset.arg));
      if (!open.includes(String(ui))) await clickAct('course', ui);
      await overflow(`${w} ${sid} course ${ui}`);
      const first = await page.$eval('.path [data-act="topic"]', b => b.dataset.arg).catch(() => null);
      if (!first) { issues.push(`${sid} course ${ui}: no topic rows`); continue; }
      if (w === 390 || ui === 0) { await clickAct('topic', first); await page.waitForTimeout(150); await overflow(`${w} topic ${first}`);
        const hasFlow = await page.$$eval('.fstep', x => x.length); if (!hasFlow) issues.push('no flow on ' + first);
        if (ui === 0) { for (const t of ['prog', 'kit', 'learn']) { await clickAct('ttab', t); await page.waitForTimeout(t === 'kit' ? 250 : 60); await overflow(`${w} topic ${first} ${t}`); } }
        const back = await page.$('.subbar [data-act="subjectAt"]'); if (!back) issues.push('no back on topic ' + first); else { await back.click(); await page.waitForTimeout(120); }
        const onSubj = await page.$('.levelcard'); if (!onSubj) issues.push('back from topic did not return to subject: ' + first);
      }
    }
    await clickAct('tutor', sid).catch(() => issues.push('no tutor button ' + sid)); await overflow(`${w} tutor ${sid}`); await page.click('.subbar .icon-btn');
  }
}
console.log(errs.concat(issues).join('\n') || 'QA CLEAN');
await browser.close();

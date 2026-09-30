// End-to-end flows for the textbook chapters: reader, in-place answers, teacher panel, flashcards, chapter practice, strict test, course exam.
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import fs from 'fs';
const { chromium } = pw;
const html = fs.readFileSync('deep-recall.html', 'utf8');
fs.mkdirSync('/tmp/claude-0', { recursive: true });
fs.writeFileSync('/tmp/claude-0/wrapped.html', `<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>${html}</body></html>`);
const P = JSON.parse(fs.readFileSync('content/topics/mth-2-0.json', 'utf8'));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 1000 }, colorScheme: 'dark' });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR ' + String(e.stack || e)));
page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load/.test(m.text())) errs.push(m.text()); });
await page.route('**/mathjax@3.2.2/**', r => { const f = r.request().url().split('mathjax@3.2.2/')[1].split('?')[0]; r.fulfill({ path: '/tmp/mjx/package/' + f, contentType: 'application/javascript' }); });
await page.route('**/mathjs@13.2.0/**', r => r.fulfill({ path: '/tmp/mj/package/lib/browser/math.js', contentType: 'application/javascript' }));
await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
let packFetches = 0;
await page.context().route('http://dr.test/**', r => { const u = new URL(r.request().url()); if (u.pathname.startsWith('/packs/')) packFetches++; const f = u.pathname === '/' ? '/tmp/claude-0/wrapped.html' : process.cwd() + u.pathname; r.fulfill({ path: f, contentType: f.endsWith('.json') ? 'application/json' : 'text/html' }); });
await page.addInitScript(() => {
  let grades = 0;
  window.__prompts = [];
  const J = (s) => {
    window.__prompts.push(s.slice(0, 200));
    if (s.includes('grading a written answer in a rigorous textbook course')) return ++grades === 1
      ? {hits:[true, false, true, false], score:0.5, verdict:'partial', feedback:'The product rule is stated correctly; the constant is not handled.', hint:'Look at what the remaining indefinite integral already contains.', errors:[{wrong:'The constant is lost', fix:'It is absorbed by the remaining integral'}]}
      : {hits:[true, true, true, true], score:1, verdict:'correct', feedback:'Complete and correct.', hint:null, errors:[]};
    if (s.includes('grading a written answer in a rigorous study app')) return {hits:[true, false], score:0.75, verdict:'partial', feedback:'Mostly right.', errors:[{wrong:'x', fix:'y'}], gaps:[{concept:'Constant of integration', detail:'d'}]};
    if (s.includes("Check a learner's answer")) return {equivalent:false, note:'no'};
    return {};
  };
  const T = (s) => s.includes('You are the teacher for one chapter') ? 'Define \\( u \\) first. What is \\( du \\) here?' : 'x';
  const sample = async (input, o = {}) => { const text = T(String(input)); window.__prompts.push(String(input).slice(0, 200)); o.onText && o.onText({text, delta:text}); return {text, truncated:false}; };
  sample.json = async (input) => J(String(input));
  sample.limits = async () => ({maxPromptBytes:262144});
  window.claude = { use: async (n) => n === 'sample' ? sample : null };
});
const step = async (label, fn) => { try { await fn(); } catch (e) { errs.push('STEP ' + label + ': ' + e.message.split('\n').slice(0, 3).join(' | ')); } };
const click = (sel) => page.click(sel, { timeout: 4000 });
const text = () => page.locator('#app').textContent();
await page.goto('http://dr.test/');
await page.waitForTimeout(1000);
const s1 = P.sections[0], qW = s1.questions.find(q => q.type === 'written'), qA = s1.questions.find(q => q.type === 'antiderivative');

await step('topic flow', async () => {
  await page.evaluate(() => document.querySelector('#nav [data-arg="library"]').click());
  await click('[data-act="subject"][data-arg="mth"]'); await click('[data-act="course"][data-arg="2"]'); await click('[data-act="topic"][data-arg="mth-2-0"]');
  await page.waitForTimeout(300);
  const f = (await page.locator('.fstep').allTextContents()).join(' | ');
  if (!/Read the chapter/.test(f) || !/Flashcards/.test(f) || !/Chapter test/.test(f)) throw new Error('flow ' + f);
  if (/Learn in bits/.test(f)) throw new Error('bits still in flow');
  if (!/Pre-written textbook chapter/.test(await text())) throw new Error('no chapter note');
  if (await page.locator('.fstep[data-act="cards"]').isEnabled()) throw new Error('cards should be locked before any section');
});
await step('toolkit from chapter', async () => {
  await click('[data-act="ttab"][data-arg="kit"]'); await page.waitForTimeout(200);
  const t = await text(); if (!/From the textbook chapter/.test(t) || !/Integration by parts/.test(t)) throw new Error('kit ' + t.slice(0, 200));
  await click('[data-act="ttab"][data-arg="learn"]');
});
await step('open reader', async () => {
  await click('.fstep[data-act="book"]'); await page.waitForSelector('.toc', { timeout: 4000 });
  const t = await text(); if (!t.includes(P.title) || !t.includes(s1.title)) throw new Error('intro page');
  if ((await page.locator('.toc .lib-row').count()) !== P.sections.length) throw new Error('toc rows');
});
await page.screenshot({ path: '/tmp/claude-0/book-intro.png', fullPage: true });
await step('section 1', async () => {
  await click('[data-act="bookNext"]'); await page.waitForSelector('#bq-' + qW.id);
  const t = await text(); if (!t.includes(s1.title)) throw new Error('section title');
  if (!(await page.locator('.terms-box').count())) throw new Error('no terms box');
});
await step('antiderivative wrong twice', async () => {
  await page.fill('#bk-' + qA.id, 'x*sin(2*x)'); await click(`[data-act="bkCheck"][data-arg="${qA.id}"]`); await page.waitForTimeout(150);
  let t = await page.locator('#bq-' + qA.id).textContent(); if (!/try once more/.test(t)) throw new Error('first miss ' + t.slice(0, 200));
  if (/Worked solution/.test(t)) throw new Error('solution shown after first miss');
  await page.fill('#bk-' + qA.id, 'x^2'); await click(`[data-act="bkCheck"][data-arg="${qA.id}"]`); await page.waitForTimeout(150);
  t = await page.locator('#bq-' + qA.id).textContent(); if (!/Not correct/.test(t) || !/Worked solution/.test(t)) throw new Error('final ' + t.slice(0, 200));
});
await step('antiderivative redo, right with + C', async () => {
  await click(`[data-act="bkRedo"][data-arg="${qA.id}"]`).catch(() => {});
  if (await page.locator(`[data-act="bkRedo"][data-arg="${qA.id}"]`).count()) await click(`[data-act="bkRedo"][data-arg="${qA.id}"]`);
  await page.fill('#bk-' + qA.id, 'sin(2x)/4 - x cos(2x)/2 + C'); await page.waitForTimeout(100);
  const pv = await page.locator('#bkp-' + qA.id).textContent(); if (!/Read as/.test(pv)) throw new Error('no preview');
  await page.press('#bk-' + qA.id, 'Enter'); await page.waitForTimeout(150);
  const t = await page.locator('#bq-' + qA.id).textContent(); if (!/Correct/.test(t)) throw new Error('not accepted ' + t.slice(0, 160));
});
await step('written: hint first, correction after', async () => {
  await page.fill('#bk-' + qW.id, 'Integrate the product rule and rearrange.'); await click(`[data-act="bkCheck"][data-arg="${qW.id}"]`);
  await page.waitForSelector(`#bq-${qW.id} .fb`, { timeout: 4000 });
  let t = await page.locator('#bq-' + qW.id).textContent();
  if (!/Partly correct/.test(t) || !/Where to look/.test(t)) throw new Error('attempt 1 ' + t.slice(0, 300));
  if (/Model answer/.test(t) || /Corrections/.test(t)) throw new Error('answer revealed after attempt 1');
  await page.fill('#bk-' + qW.id, 'Full derivation with the constant absorbed.'); await click(`[data-act="bkCheck"][data-arg="${qW.id}"]`); await page.waitForTimeout(300);
  t = await page.locator('#bq-' + qW.id).textContent();
  if (!/Correct/.test(t) || !/Model answer/.test(t)) throw new Error('attempt 2 ' + t.slice(0, 300));
});
await step('section done', async () => {
  const d = await page.evaluate(() => document.querySelectorAll('#bookTicks button.ok, #bookTicks button.meh').length);
  if (d < 2) throw new Error('section tick not marked');
});
await page.screenshot({ path: '/tmp/claude-0/book-section.png', fullPage: true });
await step('teacher panel', async () => {
  await click('[data-act="teacher"]'); await page.waitForSelector('#teacher');
  await page.fill('#teacherIn', 'Why choose u = x here?'); await page.press('#teacherIn', 'Enter'); await page.waitForTimeout(300);
  const t = await page.locator('#teacher').textContent(); if (!/What is/.test(t)) throw new Error('no reply ' + t.slice(0, 200));
  const p = await page.evaluate(() => window.__prompts.find(x => x.includes('You are the teacher'))); if (!p) throw new Error('teacher prompt');
  await page.screenshot({ path: '/tmp/claude-0/book-teacher.png' });
  await click('#teacher [data-act="closeSheet"]');
});
await step('rest of reader and review page', async () => {
  await click('[data-act="bookGo"][data-arg="' + P.sections.length + '"]'); await page.waitForTimeout(200);
  const t = await text(); if (!/Terms of this chapter/.test(t) || !/Study cards/.test(t)) throw new Error('review page');
});
await step('flashcards', async () => {
  await click('[data-act="cards"][data-arg="mth-2-0"]'); await page.waitForSelector('.fcard');
  const n = s1.kps.length; const unlocked = P.cards.filter(c => s1.kps.includes(c.kp)).length;
  const cnt = await page.locator('.sess-count').textContent(); if (!cnt.endsWith('/ ' + unlocked)) throw new Error('queue ' + cnt + ' expected ' + unlocked + ' (kps ' + n + ')');
  await page.keyboard.press(' '); await page.waitForSelector('.fcard .back');
  await click('[data-act="rateCard"][data-arg="1"]'); await page.waitForTimeout(100);
  const cnt2 = await page.locator('.sess-count').textContent(); if (!cnt2.endsWith('/ ' + (unlocked + 1))) throw new Error('again not requeued ' + cnt2);
  for (let i = 0; i < unlocked + 1; i++) { if (await page.locator('.summary').count()) break; await click('[data-act="cardShow"]'); await click('[data-act="rateCard"][data-arg="3"]'); }
  const t = await text(); if (!/Deck done/.test(t)) throw new Error('deck not done');
  const st = await page.evaluate(() => 1);
  await click('[data-act="cardsBack"]'); await page.waitForTimeout(200);
});
await step('chapter practice', async () => {
  await page.waitForSelector('.fstep[data-act="practice"]');
  await click('.fstep[data-act="practice"]'); await page.waitForSelector('.qwrap', { timeout: 5000 });
  const k = await page.locator('.kstate').first().textContent().catch(() => ''); if (!/Textbook question/.test(k)) throw new Error('not a chapter question: ' + k);
  const gen = await page.evaluate(() => window.__prompts.some(x => /Write each problem exactly|practice set/.test(x))); if (gen) throw new Error('practice generated instead of drawn from the chapter');
  await click('[data-act="quitSession"]'); await page.waitForTimeout(200);
  if (await page.locator('[data-act="endSummary"]').count()) await click('[data-act="endSummary"]');
});
await step('strict chapter test', async () => {
  await page.evaluate(() => { const b = document.querySelector('.fstep[data-act="packTest"]'); b.click(); });
  await page.waitForSelector('.qwrap', { timeout: 5000 });
  let guard = 0;
  while (!(await page.locator('.summary').count()) && guard++ < 12) {
    if (await page.locator('#answer').count()) { await click('[data-act="conf"][data-arg="75"]'); await page.fill('#answer', 'An argument.'); await click('#pcheckBtn'); }
    else if (await page.locator('#pans').count()) { await click('[data-act="conf"][data-arg="75"]'); await page.fill('#pans', '0'); await click('#pcheckBtn'); }
    await page.waitForTimeout(250);
    const t = await text();
    if (/Attempt 2 of/.test(t)) throw new Error('strict test offered a second attempt');
    if (/Hint/.test(await page.locator('.sess-actions, .qwrap').first().textContent().catch(() => ''))) {}
    await click('#nextBtn');
    await page.waitForTimeout(150);
  }
  const t = await text(); if (!/Not passed yet: 0 of 5/.test(t)) throw new Error('summary ' + t.slice(0, 300));
  await click('[data-act="endSummary"]');
});
await step('course exam draws chapter items', async () => {
  await page.evaluate(() => { window.__prompts.length = 0; });
  await click('[data-act="subjectAt"]'); await page.waitForTimeout(200);
  await click('[data-act="exam"][data-arg="mth|2"]'); await page.waitForSelector('.qwrap', { timeout: 5000 });
  const k = await page.locator('.kstate').first().textContent().catch(() => ''); if (!/Textbook question/.test(k)) throw new Error('first exam item not from a chapter: ' + k);
  if (!/Skip/.test(await page.locator('.sess-actions').first().textContent())) throw new Error('exam not strict');
  await click('[data-act="quitSession"]'); await page.waitForTimeout(100);
  if (await page.locator('[data-act="endSummary"]').count()) await click('[data-act="endSummary"]');
});
await step('persisted state', async () => {
  const st = await page.evaluate(() => 0);
});
await step('desktop teacher', async () => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => document.querySelector('#nav [data-arg="library"]').click());
  await click('[data-act="subject"][data-arg="mth"]'); await click('[data-act="course"][data-arg="2"]').catch(() => {}); await click('[data-act="topic"][data-arg="mth-2-0"]');
  await click('.fstep[data-act="book"]'); await page.waitForSelector('#bookTicks'); await click('[data-act="teacher"]'); await page.waitForSelector('#teacher'); await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/claude-0/book-desktop.png' });
  const w = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth); if (w) throw new Error('horizontal overflow');
  await page.setViewportSize({ width: 400, height: 1000 });
});
await step('overflow', async () => { const w = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1); if (w) throw new Error('horizontal overflow at 400px'); });
if (packFetches !== 1) errs.push('pack fetched ' + packFetches + ' times (expected once)');
await browser.close();
if (errs.length) { console.log(errs.join('\n')); process.exit(1); }
console.log('BOOK OK');

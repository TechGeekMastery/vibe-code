s = open('e2e.mjs').read()
head = s[:s.index("const step = async")]
head = head.replace("if (s.includes('You are teaching ONE small bit')) return '## A bit\\nConsider", "if (s.includes('You are teaching ONE small bit')) return '## A bit\\nA puzzle about tangents.\\nPREDICT: Which way does the tangent tilt at a = 1?\\nOPTIONS: Up | Down\\n---\\nDrag \\\\( a \\\\).\\n```plot\\nx: -3, 3\\ny: -1, 9\\nf: x^2 | y = x²\\nf: 2*a*(x - a) + a^2 | tangent\\npoint: a, a^2\\nslider: a, -2, 2, 1 | a\\n```\\nConsider", 1)
seed = r'''
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
'''
head = head.replace("  window.claude = { use: async (n) => n === 'sample' ? sample : null };\n", seed, 1)
tail = r'''
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
'''
open('seed.mjs','w').write(head + tail)

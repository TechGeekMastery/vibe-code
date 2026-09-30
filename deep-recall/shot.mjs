import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js'; const { chromium } = pw;
const html = (await import('fs')).readFileSync('deep-recall.html','utf8');
const lesson = `# Why the Roman Republic fell
Why did a system that survived Hannibal collapse to its own generals?

## Institutional stretch
Rome's **constitution** was built for a city-state. [Established] Provinces created commands no annual magistrate could check, and \\(n\\) legions loyal to one man shifted the balance.
CHECK: Why did provincial commands destabilize the Republic?
ANSWER: They gave generals long tenures, personal armies, and wealth outside Senate control.

## Key points
- Armies became clients of their generals
- Annual magistracies could not govern an empire`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 900 }, colorScheme: 'dark' });
const errs = [];
page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
page.on('pageerror', e => errs.push(String(e)));
await page.addInitScript((lesson) => {
  const sample = async (input, o) => { o && o.onText && o.onText({text: lesson, delta: lesson}); return {text: lesson, truncated:false}; };
  sample.json = async () => ({questions:[]});
  window.claude = { use: async (n) => n === 'sample' ? sample : null };
}, lesson);
(await import('fs')).writeFileSync('/tmp/claude-0/wrapped.html', `<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>${html}</body></html>`); await page.context().route('http://dr.test/**', r => { const u = new URL(r.request().url()); const f = u.pathname === '/' ? '/tmp/claude-0/wrapped.html' : process.cwd() + u.pathname; r.fulfill({ path: f, contentType: f.endsWith('.json') ? 'application/json' : 'text/html' }); }); await page.goto('http://dr.test/');
await page.waitForTimeout(1500);
await page.click('[data-arg="hist"]');
await page.click('[data-arg="hist-0-2"]');
await page.click('.sheet [data-act="lesson"]');
await page.waitForTimeout(3000);
await page.screenshot({ path: 'shot.png', fullPage: true });
console.log('errors:', JSON.stringify(errs));
await browser.close();

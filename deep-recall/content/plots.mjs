// Check that every ```plot block in the chapters draws: each curve, parametric curve and shaded region has finite values over the range, every point parses.
// Usage: node content/plots.mjs   (run python3 build.py first so main.js is current)
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url).pathname;
global.window = { math: require('/tmp/mj/package/lib/browser/math.js') };
global.document = { querySelector: () => null, addEventListener: () => {}, body: { classList: { toggle() {} } } };
const src = fs.readFileSync(root + 'main.js', 'utf8').replace(/^\(function \(\) \{\n'use strict';\n/, '').replace(/\}\)\(\);\n$/, '').replace(/\/\* -{60,} boot \*\/[\s\S]*$/, '');
const A = new Function('window', 'document', src + '\nreturn {parsePlotSpec, plotDefaults, renderPlot, MX};')(window, document);
A.MX.ok();
const M = window.math;
let bad = 0, n = 0;
for (const f of fs.readdirSync(root + 'content/topics').filter(f => f.endsWith('.json')).sort()) {
  const o = JSON.parse(fs.readFileSync(root + 'content/topics/' + f, 'utf8'));
  const texts = [o.intro, ...o.sections.map(s => s.md)];
  texts.forEach((t, ti) => {
    for (const m of String(t).matchAll(/```plot\n([\s\S]*?)```/g)) {
      n++;
      const spec = m[1], where = `${o.key} ${ti ? 's' + ti : 'intro'}`;
      const scope = A.plotDefaults(spec), P = A.parsePlotSpec(spec, scope);
      const lines = spec.split('\n').map(l => l.trim()).filter(Boolean);
      const [x0, x1] = P.x || [-5, 5], [t0, t1] = P.t;
      const probs = [];
      const finite = (expr, v, a, b) => { let c; try { c = M.parse(A.MX.norm(expr)).compile(); } catch (e) { return -1; } let k = 0; for (let i = 0; i <= 60; i++) { const sc = Object.assign({}, scope, { [v]: a + (b - a) * i / 60 }); try { if (isFinite(A.MX.num(c.evaluate(sc)))) k++; } catch (e) {} } return k; };
      P.f.forEach(c => { const k = finite(c.expr, 'x', x0, x1); if (k < 6) probs.push(`curve "${c.expr}" ${k < 0 ? 'does not parse' : 'has ' + k + '/61 finite samples'}`); });
      P.shade.forEach(c => { const k = finite(c.expr, 'x', c.a, c.b); if (k < 6) probs.push(`shade "${c.expr}" ${k < 0 ? 'does not parse' : k + '/61 finite'}`); });
      P.params.forEach(c => { const a = finite(c.fx, 't', t0, t1), b = finite(c.fy, 't', t0, t1); if (a < 6 || b < 6) probs.push(`param "${c.fx}; ${c.fy}" ${a}/${b} finite`); });
      const want = k => lines.filter(l => new RegExp('^' + k + '\\s*:', 'i').test(l)).length;
      if (P.points.length !== want('point')) probs.push(`${want('point') - P.points.length} point line(s) don't evaluate`);
      if (P.vectors.length !== want('vector')) probs.push(`${want('vector') - P.vectors.length} vector line(s) don't evaluate`);
      if (P.sliders.length !== want('slider')) probs.push(`${want('slider') - P.sliders.length} slider line(s) invalid`);
      if (P.vlines.length !== want('vline')) probs.push('a vline does not evaluate');
      if (P.hlines.length !== want('hline')) probs.push('an hline does not evaluate');
      if (!A.renderPlot(spec, {})) probs.push('renderPlot returned nothing');
      if (probs.length) { bad++; console.log(where + ': ' + probs.join('; ')); }
    }
  });
}
console.log(`${n} plots checked, ${bad} with problems`);
process.exit(bad ? 1 : 0);

/* ------------------------------------------------------------------ math checking */
const MX = {
  ready:false,
  ok() {
    if (this.ready) return true;
    if (!window.math || typeof window.math.parse !== 'function') return false;
    try { window.math.import({ln: window.math.log}, {override:false}); } catch (e) {}
    this.ready = true; return true;
  },
  norm(s) {
    return String(s).replace(/[·×]/g, '*').replace(/÷/g, '/').replace(/π/g, 'pi').replace(/[θϑ]/g, 'theta').replace(/[φϕ]/g, 'phi').replace(/ω/g, 'omega').replace(/α/g, 'alpha').replace(/β/g, 'beta').replace(/τ/g, 'tau').replace(/λ/g, 'lambda').replace(/μ/g, 'mu').replace(/ρ/g, 'rho').replace(/σ/g, 'sigma').replace(/−|–/g, '-')
      .replace(/√\s*\(/g, 'sqrt(').replace(/√\s*([\w.]+)/g, 'sqrt($1)')
      .replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4')
      .replace(/\barc(sin|cos|tan)\b/g, 'a$1').replace(/\bsin\^-1\b/g, 'asin').replace(/\bcos\^-1\b/g, 'acos').replace(/\btan\^-1\b/g, 'atan')
      .replace(/^\s*[a-zA-Z](\s*\(\s*[a-z]\s*\))?\s*=\s*(?=[^=]*$)/, '')
      .replace(/\+\s*[Cc]\s*$/, '').trim();
  },
  num(v) {
    if (typeof v === 'number') return v;
    if (v && typeof v.re === 'number') return Math.abs(v.im) < 1e-9 ? v.re : NaN;
    if (v && typeof v.toNumber === 'function') { try { return v.toNumber(); } catch (e) { return NaN; } }
    return NaN;
  },
  evalStr(s, scope) { try { return this.num(window.math.evaluate(this.norm(s), scope || {})); } catch (e) { return NaN; } },
  parses(s) { try { window.math.parse(this.norm(s)); return true; } catch (e) { return false; } },
  equiv(a, b, vars, upToConst, pos) {
    let A, B;
    try { A = window.math.parse(this.norm(a)).compile(); } catch (e) { return 'parse'; }
    try { B = window.math.parse(this.norm(b)).compile(); } catch (e) { return null; }
    vars = vars && vars.length ? vars : ['x'];
    const diffs = []; let ok = 0;
    for (let t = 0; t < 60 && ok < 10; t++) {
      const scope = {};
      vars.forEach(v => { scope[v] = t < 30 && !pos ? (Math.random() * 4 - 2) : (Math.random() * 3 + 0.15); });
      let x, y;
      try { x = this.num(A.evaluate(scope)); } catch (e) { x = NaN; }
      try { y = this.num(B.evaluate(scope)); } catch (e) { y = NaN; }
      if (!isFinite(x) || !isFinite(y)) continue;
      ok++; diffs.push(x - y);
      if (!upToConst && Math.abs(x - y) > 1e-6 * Math.max(1, Math.abs(y))) return false;
    }
    if (ok < 4) return this.equivInt(A, B, vars, upToConst);
    if (upToConst) { const d0 = diffs[0]; return diffs.every(d => Math.abs(d - d0) < 1e-6 * Math.max(1, Math.abs(d0))); }
    return true;
  },
  /* sequence answers such as 3^n + (-2)^n are only real at integers: compare them there */
  equivInt(A, B, vars, upToConst) {
    const diffs = [];
    for (let t = 0; t < 14; t++) {
      const scope = {};
      vars.forEach((v, j) => { scope[v] = 1 + ((t + 3 * j) % 12); });
      let x, y;
      try { x = this.num(A.evaluate(scope)); } catch (e) { x = NaN; }
      try { y = this.num(B.evaluate(scope)); } catch (e) { y = NaN; }
      if (!isFinite(x) || !isFinite(y)) continue;
      diffs.push(x - y);
      if (!upToConst && Math.abs(x - y) > 1e-6 * Math.max(1, Math.abs(y))) return false;
    }
    if (diffs.length < 4) return null;
    if (upToConst) { const d0 = diffs[0]; return diffs.every(d => Math.abs(d - d0) < 1e-6 * Math.max(1, Math.abs(d0))); }
    return true;
  },
  close(x, y, tol) { return Math.abs(x - y) <= Math.max((tol || 1e-4) * Math.abs(y), 1e-9); },
  tex(s) {
    if (!this.ok()) return null;
    try { return window.math.parse(this.norm(s)).toTex({parenthesis:'auto', implicit:'hide'}); } catch (e) { return null; }
  }
};
/* returns true | false | 'parse' (learner input unreadable) | null (can't machine-check) */
function machineCheck(q, input) {
  if (q.ptype === 'choice') return String(input).trim().toUpperCase() === String(q.answer).trim().toUpperCase();
  if (q.ptype === 'proof' || q.claudeCheck || !MX.ok()) return null;
  if (q.ptype === 'expression') return MX.equiv(input, q.answer, q.vars, false, q.pos);
  if (q.ptype === 'antiderivative') return MX.equiv(input, q.answer, q.vars, true, q.pos);
  if (q.ptype === 'number') {
    const x = MX.evalStr(input), y = MX.evalStr(q.answer);
    if (!isFinite(x)) return 'parse';
    if (!isFinite(y)) return null;
    return MX.close(x, y, q.tol);
  }
  if (q.ptype === 'numbers') {
    const xs = String(input).split(/[,;]|\band\b/).map(s => s.trim()).filter(Boolean).map(s => MX.evalStr(s));
    const ys = String(q.answer).split(/[,;]/).map(s => s.trim()).filter(Boolean).map(s => MX.evalStr(s));
    if (!xs.length || xs.some(v => !isFinite(v))) return 'parse';
    if (ys.some(v => !isFinite(v))) return null;
    if (xs.length !== ys.length) return false;
    const left = ys.slice();
    for (const x of xs) { const j = left.findIndex(y => MX.close(x, y, q.tol)); if (j < 0) return false; left.splice(j, 1); }
    return true;
  }
  return null;
}


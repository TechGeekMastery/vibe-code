/* ------------------------------------------------------------------ helpers */
const $ = (s, el) => (el || document).querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DAY = 864e5;
const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const today = () => dayKey(Date.now());
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const clamp01 = x => Math.max(0, Math.min(1, Number(x) || 0));
const str = x => typeof x === 'string' ? x : (x == null ? '' : String(x));
const NOTATION = 'Math notation: use real symbols, never keyboard stand-ins: x², xⁿ, x₁, √2, ½, ≤, ≥, ≠, ±, ×, ·, −, →, ⇒, ∈, ∀, ∃, ¬, ∧, ∨, π, θ, Δ, ∫, Σ, ∞, not x^2, sqrt(2), <=, *, ->. Inside JSON strings, no LaTeX backslashes.';
const slug = s => (String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)) || 'gap';
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function ago(t) {
  if (!t) return 'Never';
  const d = Math.floor((Date.now() - t) / DAY);
  if (d <= 0) return 'Today'; if (d === 1) return 'Yesterday'; if (d < 30) return d + ' days ago';
  return new Date(t).toLocaleDateString(undefined, {month:'short', day:'numeric'});
}
function dueIn(t) {
  if (!t) return '—';
  const d = Math.ceil((t - Date.now()) / DAY);
  if (d <= 0) return 'Due now'; if (d === 1) return 'Tomorrow'; return 'In ' + d + ' days';
}
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 2800);
}
function nearBottom() { return window.innerHeight + window.scrollY >= document.body.scrollHeight - 160; }
function toBottom() { window.scrollTo(0, document.body.scrollHeight); }
const I = {
  back:'<path d="M15 18l-6-6 6-6"/>',
  close:'<path d="M6 6l12 12M18 6L6 18"/>',
  learn:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5"/>',
  review:'<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/>',
  gaps:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/>',
  you:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  flame:'<path d="M12 22c4 0 7-3 7-7 0-3-2-5.5-3.5-7-.3 2-1.5 3-2.5 3 .5-3-1-6.5-4-8 .3 3-1.5 5-3 6.8C4.8 11.3 5 13 5 15c0 4 3 7 7 7z"/>',
  bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  send:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'
};
const ic = (n, s) => `<svg viewBox="0 0 24 24" width="${s || 20}" height="${s || 20}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;


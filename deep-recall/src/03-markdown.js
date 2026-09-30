/* ------------------------------------------------------------------ markdown */
/* opts.lang: BCP-47 code; {{text}} becomes a sentence with a listen button in that language */
function mdToHtml(src, opts) {
  opts = opts || {};
  src = String(src || '');
  const math = [];
  src = src.replace(/\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)/g, m => { math.push(m); return '\u0001' + (math.length - 1) + '\u0002'; });
  const restoreRaw = s => s.replace(/\u0001(\d+)\u0002/g, (m, n) => math[+n]);
  const inline = t => {
    let s = esc(t);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*\w])\*(?!\s)([^*]+?)\*(?!\*)/g, '$1<em>$2</em>');
    s = s.replace(/\[(Established|Inferred|Contested|Speculative)\]/gi, (m, w) => `<span class="tag tag-${w.toLowerCase()}">${w}</span>`);
    s = s.replace(/\{\{([^{}]+?)\}\}/g, (m, txt) => opts.lang
      ? `<span class="say" lang="${esc(opts.lang)}">${txt}<button class="say-b" type="button" data-act="say" data-arg="${txt}" data-lang="${esc(opts.lang)}" aria-label="Listen">${ic('speaker', 15)}</button></span>`
      : txt);
    s = s.split(/(<code>[\s\S]*?<\/code>|<a [^>]*>|<[^>]+>)/).map((seg, j) => j % 2 ? seg : prettyMath(seg)).join('');
    s = s.replace(/\u0001(\d+)\u0002/g, (m, n) => esc(math[+n]));
    return s;
  };
  const lines = src.split('\n');
  let out = '', i = 0;
  const isBlockStart = L => /^(#{1,4})\s/.test(L) || /^\s*[-*•]\s+/.test(L) || /^\s*\d+[.)]\s+/.test(L) || /^\s*>/.test(L) || /^\s*```/.test(L) || /^\s*\|/.test(L);
  while (i < lines.length) {
    const L = lines[i];
    let m;
    if ((m = L.match(/^\s*```\s*(\w*)/))) {
      const lang = (m[1] || '').toLowerCase();
      const code = []; i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      i++;
      const body = restoreRaw(code.join('\n'));
      if (lang === 'plot' || lang === 'graph') out += `<div class="plot" data-spec="${esc(body)}"></div>`;
      else out += `<pre><code>${esc(body)}</code></pre>`;
      continue;
    }
    if ((m = L.match(/^(#{1,4})\s+(.*)/))) { const lv = m[1].length; out += `<h${lv}>${inline(m[2])}</h${lv}>`; i++; continue; }
    if (/^\s*\u0001\d+\u0002\s*$/.test(L) && /\\\[/.test(math[+L.match(/\d+/)[0]] || '')) { out += `<div class="math-display">${inline(L.trim())}</div>`; i++; continue; }
    if (/^\s*[-*•]\s+/.test(L)) {
      const items = [];
      while (i < lines.length && (/^\s*[-*•]\s+/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        if (/^\s*[-*•]\s+/.test(lines[i])) items.push(lines[i].replace(/^\s*[-*•]\s+/, '')); else items[items.length - 1] += ' ' + lines[i].trim();
        i++;
      }
      out += '<ul>' + items.map(x => `<li>${inline(x)}</li>`).join('') + '</ul>'; continue;
    }
    if (/^\s*\d+[.)]\s+/.test(L)) {
      const items = [];
      while (i < lines.length && (/^\s*\d+[.)]\s+/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        if (/^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i].replace(/^\s*\d+[.)]\s+/, '')); else items[items.length - 1] += ' ' + lines[i].trim();
        i++;
      }
      out += '<ol>' + items.map(x => `<li>${inline(x)}</li>`).join('') + '</ol>'; continue;
    }
    if (/^\s*>/.test(L)) {
      const q = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, ''));
      out += `<blockquote>${inline(q.join(' '))}</blockquote>`; continue;
    }
    if (/^\s*\|/.test(L)) {
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = r => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
      const body = rows.filter(r => !/^\s*\|?\s*:?-{2,}/.test(r));
      if (body.length) {
        const [h, ...rest] = body;
        out += '<div class="tbl"><table><thead><tr>' + cells(h).map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
          rest.map(r => '<tr>' + cells(r).map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>';
      }
      continue;
    }
    if (!L.trim()) { i++; continue; }
    const para = [];
    while (i < lines.length && lines[i].trim() && !(para.length && isBlockStart(lines[i]))) para.push(lines[i++]);
    out += `<p>${inline(para.join(' '))}</p>`;
  }
  return out;
}
/* safety net: keyboard math that slipped through (x^2, sqrt(), <=, ->, 2*3) becomes real notation; runs on escaped text outside code */
function prettyMath(s) {
  return s
    .replace(/&lt;-&gt;|<->/g, '↔').replace(/&lt;=&gt;/g, '⇔').replace(/=&gt;/g, '⇒').replace(/-&gt;/g, '→').replace(/&lt;-/g, '←')
    .replace(/&lt;=/g, '≤').replace(/&gt;=/g, '≥').replace(/!=/g, '≠').replace(/\+\/-/g, '±').replace(/~=/g, '≈')
    .replace(/\bsqrt\(([^()]{1,30})\)/g, (m, x) => /^[\w.]+$/.test(x) ? '√' + x : '√(' + x + ')')
    .replace(/([A-Za-z0-9)\]])\^\{([^{}]{1,12})\}/g, '$1<sup>$2</sup>')
    .replace(/([A-Za-z0-9)\]])\^\(([^()]{1,12})\)/g, '$1<sup>$2</sup>')
    .replace(/([A-Za-z0-9)\]])\^(-?[0-9]+(?:\.[0-9]+)?|-?[a-zA-Z])(?![\w(])/g, '$1<sup>$2</sup>')
    .replace(/\b([a-zA-Z])_(\d{1,2}|[a-z])\b/g, '$1<sub>$2</sub>')
    .replace(/(\d)\s?\*\s?(\d)/g, '$1 × $2').replace(/([a-zA-Z0-9)])\*([a-zA-Z(])/g, '$1·$2')
    .replace(/(^|[\s(=,])-(?=\d)/g, '$1−').replace(/([\dA-Za-z)]) - (?=[\d(]|[a-zA-Z]\b|[a-zA-Z]\d|\d)/g, '$1 − ')
    .replace(/<sup>-/g, '<sup>−');
}
/* one line of model text with markdown and math, no wrapping paragraph */
function fieldHtml(s, opts) { return mdToHtml(s, opts).replace(/^<p>|<\/p>$/g, ''); }
/* a machine-checkable answer key shown as typeset math when it parses */
function answerHtml(q) {
  const a = String(q.answerText || '');
  if (['expression', 'antiderivative', 'number', 'numbers'].includes(q.ptype) && MX.ok()) {
    const parts = q.ptype === 'numbers' ? a.split(/[,;]/).map(x => x.trim()).filter(Boolean) : [a];
    const tex = parts.map(p => MX.tex(p)); if (tex.every(t => t != null)) return '\\(' + esc(tex.join(',\\; ')) + (q.ptype === 'antiderivative' ? ' + C' : '') + '\\)';
  }
  return fieldHtml(a);
}
/* draw graphs, then typeset math, inside one element */
function typeset(el) {
  if (!el) return;
  try { drawPlots(el); } catch (e) { console.warn(e); }
  const MJ = window.MathJax;
  if (MJ && typeof MJ.typesetPromise === 'function') { try { MJ.typesetPromise([el]).catch(() => {}); } catch (e) {} }
}

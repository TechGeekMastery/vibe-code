/* ------------------------------------------------------------------ web research (Parallel Search connector) */
const WEB = {
  state:'off', msg:'', mcp:null, desc:{},
  async init(ask) {
    this.msg = '';
    if (!window.claude || typeof window.claude.use !== 'function') { this.state = 'unavailable'; this.msg = 'Web search needs this page to be open inside Claude.'; return; }
    if (!AI.tools) { this.state = 'unavailable'; this.msg = 'This Claude view can’t give Claude tools, so web search is off here.'; return; }
    let mcp = null;
    try { mcp = await window.claude.use('mcp'); } catch (e) { mcp = null; }
    if (!mcp) { this.state = 'unavailable'; this.msg = 'Connector access isn’t available in this view.'; return; }
    let perms = null;
    try { perms = await window.claude.use('permissions'); } catch (e) { perms = null; }
    const name = 'mcp:' + WEB_SERVER;
    let st = 'prompt';
    if (perms) { try { st = await perms.state(name); } catch (e) { st = 'prompt'; } }
    if (st === 'denied') { this.state = 'denied'; this.msg = 'Web search was declined for this page. Allow it from the page’s permissions menu.'; return; }
    if (st !== 'granted') {
      if (!ask) { this.state = 'off'; return; }
      if (perms) {
        let r = {};
        try { r = await perms.request([name]); } catch (e) { r = {}; }
        const s2 = r[name];
        if (s2 === 'denied') { this.state = 'denied'; this.msg = 'Web search was declined for this page.'; return; }
      }
    }
    try {
      const d = {};
      for (const t of ['web_search', 'web_fetch']) {
        try { d[t] = await mcp.describeTool(WEB_SERVER, t); }
        catch (e) { if (t === 'web_search') throw e; }
      }
      this.desc = d; this.mcp = mcp; this.state = 'ready';
    } catch (e) {
      this.state = 'unavailable';
      const c = e && e.code;
      this.msg = c === 'server_not_connected' ? `Add the free “${WEB_SERVER}” connector in claude.ai Settings → Connectors, then reload this page.`
        : c === 'needs_reauth' ? `Reconnect “${WEB_SERVER}” in claude.ai Settings → Connectors.`
        : c === 'selection_required' ? `You have more than one “${WEB_SERVER}” connector. Choose one when the page asks, then reload.`
        : c === 'not_in_manifest' ? 'Web search isn’t allowed for this page right now.'
        : c === 'blocked_by_policy' ? 'Your organization’s policy blocks this connector.'
        : 'Couldn’t reach the web search connector. Try again in a moment.';
    }
  },
  ready() { return this.state === 'ready'; },
  sessionId: 'deeprecall-' + Array.from({length:32}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
  /* Parallel Search returns {results:[{url,title,publish_date,excerpts[]}]}; keep what Claude needs, capped */
  compact(payload) {
    if (payload && typeof payload === 'object' && Array.isArray(payload.results)) {
      return JSON.stringify(payload.results.slice(0, 10).map(r => ({
        url:r.url, title:r.title, published:r.publish_date || undefined,
        excerpts:(Array.isArray(r.excerpts) ? r.excerpts : [r.excerpts || r.content || '']).map(x => String(x || '').slice(0, 1800)).slice(0, 3)
      })));
    }
    return typeof payload === 'string' ? payload : JSON.stringify(payload);
  },
  tools(onUse) {
    if (!this.ready()) return [];
    const out = [];
    for (const name of Object.keys(this.desc)) {
      const d = this.desc[name];
      let schema = d && d.inputSchema;
      if (!schema || typeof schema !== 'object' || schema.type !== 'object') continue;
      const hasSession = !!(schema.properties && schema.properties.session_id);
      if (schema.properties && (schema.properties.session_id || schema.properties.model_name)) {
        const props = Object.assign({}, schema.properties); delete props.session_id; delete props.model_name;
        schema = Object.assign({}, schema, {properties:props, required:(schema.required || []).filter(k => k !== 'session_id' && k !== 'model_name')});
      }
      if (JSON.stringify(schema).length > 4000) continue;
      out.push({
        name, description:(str(d.description) || name).slice(0, 900), inputSchema:schema,
        execute: async (input, ctx) => {
          if (onUse) onUse(name, input);
          const args = Object.assign({}, input || {});
          if (hasSession) args.session_id = this.sessionId;
          try {
            const r = await this.mcp.callTool(WEB_SERVER, name, args, {signal:ctx && ctx.signal});
            const payload = r && r.payload !== undefined ? r.payload : (r && r.content);
            return String(this.compact(payload)).slice(0, 24000);
          } catch (e) {
            const c = e && e.code;
            if (c === 'server_not_connected' || c === 'needs_reauth' || c === 'not_in_manifest') { this.state = 'unavailable'; }
            throw new Error((e && e.message) || 'Web tool failed');
          }
        }
      });
    }
    return out;
  }
};
function webUseLabel(name, input) {
  const v = input && typeof input === 'object' ? Object.values(input).find(x => typeof x === 'string' || (Array.isArray(x) && typeof x[0] === 'string')) : null;
  const s = Array.isArray(v) ? v[0] : v;
  return (name === 'web_fetch' ? 'Reading ' : 'Searching ') + (s ? '“' + String(s).slice(0, 80) + '”' : '');
}
function webWanted(info) {
  const m = Store.profile.webMode || 'current';
  if (m === 'off') return false;
  if (m === 'all') return true;
  return CURRENT_SUBJECTS.includes(info.sid) || !!info.subject.custom;
}


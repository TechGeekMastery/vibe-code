/* direct Parallel Search calls from the page (argument names observed from the connector's schema) */
async function webSearch(objective, queries, signal) {
  if (!WEB.ready()) throw {code:'web_off'};
  const r = await WEB.mcp.callTool(WEB_SERVER, 'web_search', {objective:String(objective).slice(0, 400), search_queries:queries.slice(0, 3), session_id:WEB.sessionId}, {signal});
  const p = r && r.payload;
  return p && Array.isArray(p.results) ? p.results : [];
}
async function webFetch(url, objective, signal) {
  if (!WEB.ready()) throw {code:'web_off'};
  const r = await WEB.mcp.callTool(WEB_SERVER, 'web_fetch', {urls:[url], objective:String(objective || 'Main content of the page for study').slice(0, 200), full_content:true, session_id:WEB.sessionId}, {signal});
  const p = r && r.payload;
  const x = p && Array.isArray(p.results) && p.results[0];
  if (!x) throw {code:'tool_error', message:'No content came back for that link.'};
  const text = str(x.full_content) || (Array.isArray(x.excerpts) ? x.excerpts.join('\n\n') : '');
  if (!text.trim()) throw {code:'tool_error', message:'That page had no readable text.'};
  return {title:str(x.title) || url, url:str(x.url) || url, text, date:x.publish_date || null};
}
function webErrCopy(e) {
  const c = e && e.code;
  if (c === 'web_off') return 'Web search isn’t connected. Turn it on under You → Web research.';
  if (c === 'server_not_connected') return `Add the “${WEB_SERVER}” connector in claude.ai Settings → Connectors.`;
  if (c === 'needs_reauth') return `Reconnect “${WEB_SERVER}” in claude.ai Settings → Connectors.`;
  if (c === 'not_in_manifest') return 'Web search isn’t allowed for this page right now.';
  if (c === 'server_unavailable') return 'The search service didn’t respond. Try again in a moment.';
  if (c === 'tool_error') return (e && e.message) || 'The search service reported an error.';
  if (c === 'cancelled') return 'Stopped.';
  return 'Web search failed. Try again.';
}

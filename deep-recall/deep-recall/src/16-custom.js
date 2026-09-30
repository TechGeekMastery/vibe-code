/* ------------------------------------------------------------------ custom subjects */
let addCtl = null;
async function genSubject() {
  const topic = String(ADD.text || '').trim();
  if (!topic || !AI.ok() || ADD.status === 'loading') return;
  ADD.status = 'loading'; ADD.result = null; ADD.err = ''; render();
  addCtl = new AbortController();
  try {
    const r = await AI.json(curriculumPrompt(topic), {modelTier:'default', cache:false, signal:addCtl.signal});
    const units = Array.isArray(r && r.units) ? r.units.filter(u => u && u.t && Array.isArray(u.n) && u.n.length).slice(0, 5).map(u => ({t:str(u.t).slice(0, 90), n:u.n.map(str).filter(Boolean).slice(0, 6).map(x => x.slice(0, 120))})) : [];
    if (!units.length) throw {code:'invalid_json'};
    const name = (str(r.name) || topic).slice(0, 32);
    const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).filter(Boolean);
    const mono = ((words[0] || 'X')[0] + ((words[1] || words[0] || 'x')[words[1] ? 0 : 1] || 'x')).replace(/^./, c => c.toUpperCase()).replace(/.$/, c => c.toLowerCase());
    const color = CUSTOM_COLORS[Object.keys(Store.custom).length % CUSTOM_COLORS.length];
    ADD.result = {name, blurb:str(r.blurb).slice(0, 200), units, mono, color};
    ADD.status = 'idle';
  } catch (e) {
    ADD.status = e && e.code === 'cancelled' ? 'idle' : 'error'; ADD.err = errCopy(e);
  }
  if (VIEW.name === 'add') render();
}
function saveSubject() {
  const r = ADD.result; if (!r) return;
  const id = 'c' + Math.random().toString(36).slice(2, 9).replace(/[^a-z0-9]/g, 'x');
  Store.custom[id] = Object.assign({id, custom:true, created:Date.now()}, r);
  Store.saveCustom(id);
  ADD = {text:'', status:'idle', result:null, err:''};
  toast('Added ' + r.name);
  go('subject', {sid:id});
}


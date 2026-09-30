/* ------------------------------------------------------------------ storage */
const DEFAULT_PROFILE = () => ({xp:0, streak:0, lastDay:null, xpByDay:{}, probByDay:{}, depth:'rigorous', goal:50, lastNode:null, webMode:'current', cal:{}, meta:{}, mode:{}, selfGrade:{}, plans:{}});
const Store = {
  db:null, uid:null, persistent:false,
  profile:DEFAULT_PROFILE(), nodes:{}, gaps:{}, custom:{}, mem:{}, tutor:{}, vocab:{}, q:{}, outlines:{}, threads:{}, kits:{},
  base() { return this.db.doc('data/users/' + this.uid + '/profile'); },
  path(sub, id) { return 'data/users/' + this.uid + '/profile/' + sub + '/' + id; },
  async init() {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    try {
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return;
      const uid = await user.id();
      if (!uid) return;
      this.db = db; this.uid = uid;
      const base = this.base();
      const [p, n, g, c, v, th, kt] = await Promise.all([
        base.get(), base.collection('nodes').limit(1000).get(),
        base.collection('gaps').limit(1000).get(), base.collection('custom').limit(200).get(),
        base.collection('vocab').limit(20).get(), base.collection('threads').limit(200).get(),
        base.collection('kits').limit(600).get()
      ]);
      const clone = d => JSON.parse(JSON.stringify(d.data()));
      if (p.exists) Object.assign(this.profile, clone(p));
      n.docs.forEach(d => { this.nodes[d.id] = clone(d); });
      g.docs.forEach(d => { this.gaps[d.id] = clone(d); });
      c.docs.forEach(d => { const x = clone(d); if (x && Array.isArray(x.units)) this.custom[d.id] = x; });
      v.docs.forEach(d => { const x = clone(d); if (x && Array.isArray(x.cards)) this.vocab[d.id] = x.cards; });
      th.docs.forEach(d => { const x = clone(d); if (x && x.sid) this.threads[d.id] = x; });
      kt.docs.forEach(d => { const x = clone(d); if (x && Array.isArray(x.rules)) this.kits[d.id] = x; });
      this.persistent = true;
    } catch (e) {
      console.warn('Progress storage unavailable', e);
      this.db = null; this.persistent = false;
    }
    ['cal', 'meta', 'mode', 'selfGrade', 'plans', 'mins', 'minsBy', 'levels'].forEach(k => { if (!this.profile[k] || typeof this.profile[k] !== 'object') this.profile[k] = {}; });
  },
  write(path, data) {
    if (!this.persistent) return Promise.resolve();
    const body = JSON.parse(JSON.stringify(data));
    const ref = this.db.doc(path);
    const p = (this.q[path] || Promise.resolve()).then(() => ref.set(body)).catch(e => {
      console.warn('Save failed', path, e);
      if (e && e.code === 'quota_exceeded') toast('Storage is full. Dismiss old gaps to free space.');
      else if (e && e.code === 'revoked') { this.persistent = false; toast('Saving stopped: access to storage changed.'); }
      else if (e && e.code === 'invalid_argument') toast('Couldn’t save some progress (it was too large).');
    });
    this.q[path] = p; return p;
  },
  remove(path) {
    if (!this.persistent || !path) return Promise.resolve();
    const ref = this.db.doc(path);
    const p = (this.q[path] || Promise.resolve()).then(() => ref.delete()).catch(e => console.warn('Delete failed', e));
    this.q[path] = p; return p;
  },
  async getDoc(sub, id) {
    if (!this.persistent) return null;
    try { const s = await this.db.doc(this.path(sub, id)).get(); return s.exists ? JSON.parse(JSON.stringify(s.data())) : null; } catch (e) { console.warn(e); return null; }
  },
  saveProfile() {
    ['xpByDay', 'probByDay', 'days', 'subDays'].forEach(f => {
      const x = this.profile[f] || {}; const keys = Object.keys(x).sort();
      if (keys.length > 400) keys.slice(0, keys.length - 400).forEach(k => delete x[k]);
    });
    return this.write('data/users/' + this.uid + '/profile', this.profile);
  },
  saveNode(k) { return this.write(this.path('nodes', k), this.nodes[k]); },
  saveGap(id) { return this.write(this.path('gaps', id), this.gaps[id]); },
  deleteGap(id) { delete this.gaps[id]; return this.remove(this.path('gaps', id)); },
  saveCustom(id) { return this.write(this.path('custom', id), this.custom[id]); },
  async getLesson(k) {
    if (this.mem[k]) return this.mem[k];
    let d = await this.getDoc('lessons', k);
    const alias = (this.profile.lessonAlias || {})[k];
    if (!d && alias) d = await this.getDoc('lessons', alias);
    if (d) this.mem[k] = d;
    return d;
  },
  saveLesson(k, data) { this.mem[k] = data; return this.write(this.path('lessons', k), data); },
  async getTutor(sid) {
    if (this.tutor[sid]) return this.tutor[sid];
    const d = await this.getDoc('tutor', sid);
    const t = {messages:Array.isArray(d && d.messages) ? d.messages : [], notes:str(d && d.notes), notesAt:(d && d.notesAt) || 0};
    this.tutor[sid] = t; return t;
  },
  saveTutor(sid) {
    const t = this.tutor[sid]; if (!t) return Promise.resolve();
    const msgs = t.messages.filter(m => m.content && !m.pending).slice(-40).map(m => ({role:m.role, content:String(m.content).slice(0, 6000), t:m.t || Date.now(), actions:m.actions && m.actions.length ? m.actions : undefined, img:m.img || undefined, focus:m.focus || undefined}));
    return this.write(this.path('tutor', sid), {messages:msgs, notes:String(t.notes || '').slice(0, 3000), notesAt:t.notesAt || 0});
  },
  saveKit(k, kit) { this.kits[k] = kit; return this.write(this.path('kits', k), kit); },
  saveThread(id) { return this.write(this.path('threads', id), this.threads[id]); },
  saveVocab(lang) { return this.write(this.path('vocab', lang), {cards:(this.vocab[lang] || []).slice(-2500)}); },
  async getOutline(k) {
    if (this.outlines[k]) return this.outlines[k];
    const d = await this.getDoc('outlines', k);
    if (d && Array.isArray(d.kps)) this.outlines[k] = d;
    return this.outlines[k] || null;
  },
  saveOutline(k, o) { this.outlines[k] = o; return this.write(this.path('outlines', k), o); },
  saveSource(id, data) { return this.write(this.path('sources', id), data); }
};

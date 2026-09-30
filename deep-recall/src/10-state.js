/* ------------------------------------------------------------------ app state */
let VIEW = {name:'boot'};
let LESSON = null;
let SESSION = null;
let TUTOR = null;
let ADD = {text:'', status:'idle', result:null, err:''};
let SHOW_RESOLVED = false;
let TASK = null;
let SRC = null;
let PROJ = null;

function go(name, params) {
  VIEW = Object.assign({name}, params || {});
  render();
  window.scrollTo(0, 0);
}
const NAV_VIEWS = ['home', 'study', 'library', 'subject', 'topic', 'review', 'gaps', 'me', 'progress', 'settings', 'add', 'plan', 'week'];
function render() {
  const app = $('#app');
  const fn = VIEWS[VIEW.name] || VIEWS.home;
  app.innerHTML = fn();
  renderNav();
  if (VIEW.name === 'lesson') { renderLessonBody(); renderLessonAfter(); }
  if (VIEW.name === 'tutor') renderTutorLog(true);
  if (VIEW.name === 'session') { renderPreview(); if (SESSION && SESSION.exam && !SESSION.finished) startExamClock(); }
  typeset(app);
  if (VIEW.name === 'task') startTaskClock();
  if (VIEW.name !== 'boot' && VIEW.name !== 'session') { checkLevelUps(); checkFeats(); }
}
function renderNav() {
  const show = NAV_VIEWS.includes(VIEW.name);
  const nav = $('#nav'); nav.hidden = !show; document.body.classList.toggle('has-nav', show);
  if (!show) return;
  const due = dueNodes().length + SUBJECTS.filter(x => x.lang).reduce((a, x) => a + dueCards(x.id).length, 0) + cardsDueCount(), gaps = openGaps().length;
  const tab = ['subject', 'add', 'topic'].includes(VIEW.name) ? 'library' : VIEW.name === 'gaps' ? 'review' : ['me', 'settings', 'week'].includes(VIEW.name) ? 'progress' : VIEW.name === 'plan' ? (VIEW.from === 'progress' ? 'progress' : 'home') : VIEW.name;
  const b = (id, label, icon, badge, blue) => `<button class="nav-b ${tab === id ? 'on' : ''}" data-act="nav" data-arg="${id}" ${tab === id ? 'aria-current="page"' : ''}>${ic(icon, 20)}<span>${label}</span>${badge ? `<span class="badge ${blue ? 'blue' : ''}">${badge}</span>` : ''}</button>`;
  nav.innerHTML = `<div class="nav-in"><div class="nav-brand"><span class="brand-mark">DR</span><span>Deep Recall</span></div>${b('home', 'Today', 'bolt')}${b('study', 'Study', 'chat')}${b('library', 'Library', 'learn')}${b('review', 'Review', 'review', due + gaps, !!due)}${b('progress', 'Progress', 'chart')}</div>`;
}
function banners() {
  let h = '';
  if (!AI.fn) h += `<div class="notice warn">Lesson writing and grading need Claude, which isn’t reachable in this view. Open this page inside Claude to use them.</div>`;
  else if (AI.denied) h += `<div class="notice warn">Claude access was declined for this page, so it can’t write lessons or grade answers. Reload the page to be asked again.</div>`;
  if (!Store.persistent) h += `<div class="notice">Progress in this view isn’t saved to your account. It resets when you close the page.</div>`;
  return h;
}


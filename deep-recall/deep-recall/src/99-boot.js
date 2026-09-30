/* ------------------------------------------------------------------ boot */
(async function boot() {
  const mjs = document.querySelector('script[src*="mathjs"]');
  const onMath = () => { MX.ok(); if (VIEW.name !== 'boot') { drawPlots(document.getElementById('app')); renderPreview(); } };
  if (window.math) onMath(); else if (mjs) mjs.addEventListener('load', onMath);
  try { if (window.speechSynthesis) { window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = () => {}; } } catch (e) {}
  await Promise.all([Store.init(), AI.init()]);
  try { migrateCurriculum(); } catch (e) { console.warn('migration', e); }
  applyTheme();
  try { habitTick(); } catch (e) { console.warn('habit', e); }
  setInterval(studyTick, 30000);
  window.addEventListener('pagehide', () => { try { Store.saveProfile(); } catch (e) {} });
  if ((Store.profile.webMode || 'current') !== 'off') { try { await WEB.init(false); } catch (e) {} }
  go('home');
})();

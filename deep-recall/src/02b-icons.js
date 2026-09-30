Object.assign(I, {
  speaker:'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/>',
  doc:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  flag:'<path d="M5 21V4h11l-2 4 2 4H5"/>',
  next:'<path d="M9 6l6 6-6 6"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  check:'<path d="M5 12l5 5L20 7"/>',
  chat:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  book:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21a2 2 0 0 1 2-2h13v2H6"/><path d="M9 7h6M9 10h4"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  chart:'<path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-8"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/>',
  play:'<path d="M8 5l11 7-11 7z"/>',
  calendar:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  snow:'<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5"/>',
  ladder:'<path d="M7 3v18M17 3v18M7 7h10M7 12h10M7 17h10"/>'
});
function speak(text, lang, slow) {
  try {
    const ss = window.speechSynthesis; if (!ss) { toast('This device can’t play speech.'); return; }
    ss.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = lang || 'en-US'; u.rate = slow ? 0.7 : 0.95;
    const v = voiceFor(lang); if (v) u.voice = v;
    else if (lang && !voiceFor(lang)) toast('No ' + lang + ' voice on this device; using the default voice.');
    ss.speak(u);
  } catch (e) { toast('Speech isn’t available here.'); }
}
function voiceFor(lang) {
  try {
    const vs = (window.speechSynthesis && window.speechSynthesis.getVoices()) || [];
    const l = String(lang || '').toLowerCase(), base = l.split('-')[0];
    return vs.find(v => v.lang && v.lang.toLowerCase() === l) || vs.find(v => v.lang && v.lang.toLowerCase().split(/[-_]/)[0] === base) || null;
  } catch (e) { return null; }
}

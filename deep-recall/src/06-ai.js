/* ------------------------------------------------------------------ Claude */
const AI = {
  fn:null, denied:false, images:false, tools:false, imgTypes:'image/jpeg,image/png,image/webp,image/gif',
  async init() {
    if (window.claude && typeof window.claude.use === 'function') {
      try { this.fn = await window.claude.use('sample'); } catch (e) { this.fn = null; }
      if (this.fn && typeof this.fn.limits === 'function') {
        try {
          const lim = await this.fn.limits();
          this.images = !!(lim && lim.images); this.tools = !!(lim && lim.tools);
          if (lim && lim.images && Array.isArray(lim.images.mediaTypes)) this.imgTypes = lim.images.mediaTypes.join(',');
        } catch (e) {}
      }
    }
  },
  ok() { return !!this.fn && !this.denied; },
  text(input, opts) { if (!this.fn) return Promise.reject({code:'not_granted'}); return this.fn(input, opts || {}); },
  json(input, opts) { if (!this.fn) return Promise.reject({code:'not_granted'}); return this.fn.json(input, opts || {}); }
};
function errCopy(e) {
  const c = e && e.code;
  switch (c) {
    case 'not_granted': case 'sampling_disabled': case 'not_declared': case 'capability_disabled': case 'capability_removed':
      AI.denied = true; return 'Claude access is off for this page, so it can’t write lessons or grade answers. Reload the page to be asked again.';
    case 'rate_limited': return 'You’ve hit a usage limit. Wait a little, then try again.';
    case 'session_expired': return 'Your Claude session expired. Sign in again, then try again.';
    case 'refused': return 'Claude declined this request. Try rephrasing it.';
    case 'invalid_json': return 'The response came back in the wrong format. Try again.';
    case 'prompt_too_large': return 'This request was too large. Try fewer topics at once.';
    case 'empty_completion': return 'Claude returned nothing. Try again.';
    case 'image_rejected': return 'That image couldn’t be used. Try a JPEG or PNG photo under 20 MB.';
    case 'tools_unavailable': return 'This view can’t give Claude tools, so the tutor’s extras and web search are off here.';
    case 'cancelled': return 'Stopped.';
    default: return 'The request was interrupted. Try again.';
  }
}


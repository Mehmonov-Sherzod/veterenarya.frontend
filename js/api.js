// Backend API client. Public endpoints only — no auth required.
window.Api = {
  base() { return window.AppConfig.API_BASE_URL.replace(/\/$/, ''); },

  /**
   * Fetch all active sections together with their localized content blocks.
   * This is the main endpoint the public site uses to build navigation + sections.
   */
  async getSectionsWithContents({ lang = 'uz' } = {}) {
    const url = `${this.base()}/api/v1/sections/with-contents?onlyActive=true&lang=${encodeURIComponent(lang)}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'Accept-Language': lang }
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    }
    return res.json();
  },

  /**
   * Fetch one content block by id, localized to the requested language.
   * Used by the content detail page (content.html?id=...).
   */
  async getContentById(id, { lang = 'uz' } = {}) {
    const url = `${this.base()}/api/v1/contents/${encodeURIComponent(id)}?lang=${encodeURIComponent(lang)}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'Accept-Language': lang }
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    }
    return res.json();
  },

  /**
   * Fetch all active laboratory department heads.
   */
  async getLabHeads() {
    const url = `${this.base()}/api/v1/lab-heads?onlyActive=true`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    }
    return res.json();
  },

  /**
   * Resolve a relative or absolute media URL into an absolute one the browser can fetch.
   * Backend returns relative paths like "/uploads/..." which need the base prepended when
   * the frontend is hosted on a different origin.
   */
  resolveMediaUrl(url) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return this.base() + (url.startsWith('/') ? url : '/' + url);
  }
};

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
   * Fetch the section hierarchy as a tree (root sections with nested `children`),
   * each carrying its localized content blocks. Used by pages that need to render
   * sub-sections under a parent.
   */
  async getSectionsTreeWithContents({ lang = 'uz' } = {}) {
    const url = `${this.base()}/api/v1/sections/with-contents/tree?onlyActive=true&lang=${encodeURIComponent(lang)}`;
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
   * Fetch active top-level Rahbariyat entries (general leadership). Section heads
   * use the separate /section-heads endpoint and live in their own model.
   */
  async getLabHeads({ lang = 'uz', sectionId = null } = {}) {
    const qs = new URLSearchParams({ onlyActive: 'true', lang });
    if (sectionId !== null && sectionId !== undefined) qs.set('sectionId', String(sectionId));
    const url = `${this.base()}/api/v1/lab-heads?${qs.toString()}`;
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
   * Fetch the SectionHead (Bo'lim raxbari) tied to a specific dynamic section.
   * Returns at most one record (sections have unique heads). Used by the public
   * section page to render the centered hero card.
   */
  async getSectionHead({ lang = 'uz', sectionId } = {}) {
    if (sectionId === null || sectionId === undefined) return null;
    const qs = new URLSearchParams({ onlyActive: 'true', lang, sectionId: String(sectionId) });
    const url = `${this.base()}/api/v1/section-heads?${qs.toString()}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'Accept-Language': lang }
    });
    if (!res.ok) return null;
    const list = await res.json();
    return Array.isArray(list) && list.length > 0 ? list[0] : null;
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

// Shared helpers for the news feature. Used by both news.js (dedicated page)
// and app.js (home-page carousel) so the data source and card markup stay in
// sync. The "news section" is detected by slug pattern — admins don't need to
// configure anything as long as their news section's slug contains
// "news", "xabar", or "yangilik".
window.NewsHelpers = {
  /**
   * Walk the section tree and return content items from any section whose slug
   * looks like news. Items are sorted newest-first by createdAt (falls back to
   * id when the timestamp is missing).
   */
  collectNewsItems(tree) {
    const matches = [];
    const isNewsSlug = (slug) => /(^|-)?(news|xabar|xabarlar|yangilik|yangiliklar)(-|$)/i.test(slug || '');
    const visit = (sections) => {
      (sections || []).forEach(s => {
        if (isNewsSlug(s.slug)) {
          (s.items || []).forEach(item => {
            matches.push({ ...item, _sectionSlug: s.slug, _sectionTitle: s.title });
          });
        }
        if (s.children && s.children.length) visit(s.children);
      });
    };
    visit(tree);
    matches.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (db !== da) return db - da;
      return (b.id || 0) - (a.id || 0);
    });
    return matches;
  },

  renderCard(item, lang) {
    const imageUrl = item.imageUrl ? window.Api.resolveMediaUrl(item.imageUrl) : '';
    const date = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString(lang === 'en' ? 'en-GB' : 'uz-UZ').replace(/\//g, '.')
      : '';
    const detailsLabel = window.t('section.details', lang) || 'Batafsil';
    const escape = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
    const imgBlock = imageUrl
      ? `<img src="${escape(imageUrl)}" alt="${escape(item.title)}" loading="lazy" data-fallback />`
      : `<div class="w-full h-full img-fallback">
           <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
         </div>`;
    return `
      <a href="content.html?id=${encodeURIComponent(item.id)}" class="news-card">
        <div class="news-card-image">${imgBlock}</div>
        <div class="news-card-body">
          ${date ? `<div class="news-card-date tabular-nums">${escape(date)}</div>` : ''}
          <h3 class="news-card-title">${escape(item.title)}</h3>
          <span class="news-card-cta">
            <span>${escape(detailsLabel)}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
          </span>
        </div>
      </a>
    `;
  }
};

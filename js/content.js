// Single content detail page. Reads ?id= from URL and renders that one block in full
// (image + text side-by-side on desktop, stacked on mobile).
const ContentPage = {
  state: {
    lang: window.AppConfig.DEFAULT_LANGUAGE,
    id: null
  },

  init() {
    document.getElementById('footer-year').textContent = new Date().getFullYear();

    const stored = localStorage.getItem(window.AppConfig.LANGUAGE_STORAGE_KEY);
    if (stored && window.I18N[stored]) this.state.lang = stored;

    const idRaw = new URLSearchParams(window.location.search).get('id');
    this.state.id = idRaw && /^\d+$/.test(idRaw) ? parseInt(idRaw, 10) : null;

    this.applyTranslations();
    this.bindThemeToggle();
    this.bindLanguageSwitcher();
    this.bindMobileMenu();

    this.load();
  },

  bindThemeToggle() {
    const btn = document.getElementById('theme-btn');
    if (!btn) return;
    const sun = btn.querySelector('.theme-icon-sun');
    const moon = btn.querySelector('.theme-icon-moon');
    const apply = (dark) => {
      document.documentElement.classList.toggle('dark', dark);
      sun.classList.toggle('hidden', !dark);
      moon.classList.toggle('hidden', dark);
    };
    apply(document.documentElement.classList.contains('dark'));
    btn.addEventListener('click', () => {
      const dark = !document.documentElement.classList.contains('dark');
      localStorage.setItem('vetcare_theme', dark ? 'dark' : 'light');
      apply(dark);
    });
  },

  bindMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', () => menu.classList.toggle('hidden'));
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.add('hidden')));
  },

  applyTranslations() {
    document.documentElement.lang = this.state.lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const value = window.t(key, this.state.lang);
      if (value !== null) el.textContent = value;
    });
    const flagMap = { uz: "🇺🇿 UZ", ru: "🇷🇺 RU", en: "🇬🇧 EN" };
    document.getElementById('lang-current').textContent = flagMap[this.state.lang] || flagMap.uz;
    document.querySelectorAll('.lang-option').forEach(b =>
      b.classList.toggle('active', b.dataset.lang === this.state.lang));
  },

  setLanguage(lang) {
    if (!window.I18N[lang]) return;
    this.state.lang = lang;
    localStorage.setItem(window.AppConfig.LANGUAGE_STORAGE_KEY, lang);
    this.applyTranslations();
    this.load();
  },

  bindLanguageSwitcher() {
    const btn = document.getElementById('lang-btn');
    const menu = document.getElementById('lang-menu');
    btn.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('hidden'); });
    document.addEventListener('click', () => menu.classList.add('hidden'));
    document.querySelectorAll('.lang-option').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setLanguage(b.dataset.lang);
        menu.classList.add('hidden');
      });
    });
  },

  rebuildNav(sections, currentSectionSlug) {
    const desktopNav = document.getElementById('primary-nav');
    const mobileNav = document.getElementById('mobile-nav-list');
    const desktopContact = document.getElementById('nav-contact');
    const mobileContact = document.getElementById('mobile-nav-contact');

    if (desktopNav) {
      desktopNav.querySelectorAll('.dynamic-section-link').forEach(el => el.remove());
      sections.forEach(s => {
        const a = document.createElement('a');
        a.href = `section.html?slug=${encodeURIComponent(s.slug)}`;
        a.className = 'nav-link dynamic-section-link' + (s.slug === currentSectionSlug ? ' active' : '');
        a.textContent = s.title;
        desktopNav.insertBefore(a, desktopContact);
      });
    }
    if (mobileNav) {
      mobileNav.querySelectorAll('.dynamic-section-link').forEach(el => el.remove());
      sections.forEach(s => {
        const a = document.createElement('a');
        a.href = `section.html?slug=${encodeURIComponent(s.slug)}`;
        a.className = 'mobile-nav-link dynamic-section-link' + (s.slug === currentSectionSlug ? ' active' : '');
        a.textContent = s.title;
        mobileNav.insertBefore(a, mobileContact);
      });
    }
  },

  async load() {
    const errorBox = document.getElementById('content-error');
    const wrapper = document.getElementById('content-wrapper');
    errorBox.classList.add('hidden');

    if (!this.state.id) {
      errorBox.classList.remove('hidden');
      wrapper.innerHTML = '';
      return;
    }

    try {
      // Fetch content + sections list in parallel.
      const [item, sections] = await Promise.all([
        window.Api.getContentById(this.state.id, { lang: this.state.lang }),
        window.Api.getSectionsWithContents({ lang: this.state.lang })
      ]);

      const parentSection = sections.find(s => s.id === item.sectionId);
      this.rebuildNav(sections, parentSection ? parentSection.slug : null);

      // Update breadcrumb + back link
      const breadcrumbSection = document.getElementById('breadcrumb-section');
      const backLink = document.getElementById('back-link');
      if (parentSection) {
        breadcrumbSection.textContent = parentSection.title;
        breadcrumbSection.href = `section.html?slug=${encodeURIComponent(parentSection.slug)}`;
        backLink.href = `section.html?slug=${encodeURIComponent(parentSection.slug)}`;
      } else {
        breadcrumbSection.textContent = window.t('section.unknown', this.state.lang) || '—';
      }
      document.getElementById('breadcrumb-content').textContent = item.title;
      document.title = item.title + ' — VetSafe';

      this.renderContent(item, parentSection);
      this.bindImageFallbacks();
    } catch (err) {
      console.error(err);
      errorBox.classList.remove('hidden');
      wrapper.innerHTML = '';
    }
  },

  renderContent(item, parentSection) {
    const wrapper = document.getElementById('content-wrapper');
    const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString(this.state.lang === 'en' ? 'en-GB' : 'uz-UZ').replace(/\//g, '.') : '';
    const sectionLabel = parentSection ? escapeHtml(parentSection.title) : '';
    const blocks = this.parseBlocks(item.description);

    // Header: section badge + title + date. Cover image is NOT shown here — image blocks
    // in the body already cover that role, so showing it twice would be a duplicate.
    const headerHtml = `
      <header class="mb-10">
        ${sectionLabel ? `<div class="inline-flex items-center gap-2 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 px-3 py-1 rounded-full text-xs font-semibold mb-4">${sectionLabel}</div>` : ''}
        <h1 class="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight mb-4">${escapeHtml(item.title)}</h1>
        ${date ? `<div class="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <span>${escapeHtml(date)}</span>
        </div>` : ''}
      </header>
    `;

    const bodyHtml = blocks.length > 0
      ? `<div class="space-y-8 sm:space-y-10">${blocks.map(b => this.renderBlock(b)).join('')}</div>`
      : '';

    wrapper.innerHTML = headerHtml + bodyHtml;
  },

  parseBlocks(raw) {
    const text = (raw || '').trim();
    if (!text) return [];
    const MARKER = '__VS_BLOCKS_V1__';
    if (text.startsWith(MARKER)) {
      try {
        const arr = JSON.parse(text.slice(MARKER.length));
        if (Array.isArray(arr)) {
          return arr.map(b => b.t === 'image'
            ? { type: 'image', url: b.u || '' }
            : { type: 'text', value: b.v || '' }
          ).filter(b => b.type === 'image' ? !!b.url : !!b.value);
        }
      } catch { /* fall through to legacy */ }
    }
    // Legacy plain text → single text block
    return [{ type: 'text', value: text }];
  },

  renderBlock(b) {
    if (b.type === 'image') {
      const url = window.Api.resolveMediaUrl(b.url);
      return `
        <div class="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-100 dark:bg-slate-800">
          <img src="${escapeAttr(url)}" alt="" data-fallback class="w-full h-auto" />
        </div>
      `;
    }
    return `
      <div class="prose-content text-slate-700 dark:text-slate-300 leading-relaxed text-base sm:text-lg">
        ${this.renderText(b.value)}
      </div>
    `;
  },

  renderText(raw) {
    const text = String(raw ?? '').trim();
    if (!text) return '';
    if (/^[\[{]/.test(text)) {
      try {
        const parsed = JSON.parse(text);
        return `<pre><code>${escapeHtml(JSON.stringify(parsed, null, 2))}</code></pre>`;
      } catch { /* fall through */ }
    }
    if (/<[a-z][\s\S]*>/i.test(text)) return text;
    return text.split(/\n{2,}/).map(p => `<p class="mb-4">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`).join('');
  },

  // Legacy alias kept for compatibility — unused after refactor.
  renderDescription(raw) { return this.renderText(raw); },

  bindImageFallbacks() {
    document.querySelectorAll('img[data-fallback]').forEach(img => {
      img.addEventListener('error', () => {
        const wrap = img.parentElement;
        wrap.classList.add('img-fallback');
        img.replaceWith(Object.assign(document.createElement('div'), {
          className: 'flex flex-col items-center gap-2 text-brand-700/70 py-12 w-full',
          innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg><div class="text-sm font-medium">No image</div>`
        }), { once: true });
      }, { once: true });
    });
  }
};

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

document.addEventListener('DOMContentLoaded', () => ContentPage.init());

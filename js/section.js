// Single-section detail page. Reads ?slug= from URL and renders that section's content blocks.
const SectionPage = {
  state: {
    lang: window.AppConfig.DEFAULT_LANGUAGE,
    slug: null
  },

  init() {
    document.getElementById('footer-year').textContent = new Date().getFullYear();

    const stored = localStorage.getItem(window.AppConfig.LANGUAGE_STORAGE_KEY);
    if (stored && window.I18N[stored]) this.state.lang = stored;

    this.state.slug = new URLSearchParams(window.location.search).get('slug') || '';

    this.applyTranslations();
    this.bindThemeToggle();
    this.bindLanguageSwitcher();
    this.bindMobileMenu();

    this.load();
  },

  bindMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', () => menu.classList.toggle('hidden'));
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.add('hidden')));
  },

  rebuildNav(sections) {
    const desktopNav = document.getElementById('primary-nav');
    const mobileNav = document.getElementById('mobile-nav-list');
    const desktopContact = document.getElementById('nav-contact');
    const mobileContact = document.getElementById('mobile-nav-contact');
    const currentSlug = this.state.slug;

    if (desktopNav) {
      desktopNav.querySelectorAll('.dynamic-section-link').forEach(el => el.remove());
      sections.forEach(s => {
        const a = document.createElement('a');
        a.href = `section.html?slug=${encodeURIComponent(s.slug)}`;
        a.className = 'nav-link dynamic-section-link' + (s.slug === currentSlug ? ' active' : '');
        a.textContent = s.title;
        desktopNav.insertBefore(a, desktopContact);
      });
    }

    if (mobileNav) {
      mobileNav.querySelectorAll('.dynamic-section-link').forEach(el => el.remove());
      sections.forEach(s => {
        const a = document.createElement('a');
        a.href = `section.html?slug=${encodeURIComponent(s.slug)}`;
        a.className = 'mobile-nav-link dynamic-section-link' + (s.slug === currentSlug ? ' active' : '');
        a.textContent = s.title;
        mobileNav.insertBefore(a, mobileContact);
      });
    }
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

  async load() {
    const errorBox = document.getElementById('section-error');
    const blocks = document.getElementById('section-blocks');
    errorBox.classList.add('hidden');

    if (!this.state.slug) {
      errorBox.classList.remove('hidden');
      return;
    }

    try {
      const sections = await window.Api.getSectionsWithContents({ lang: this.state.lang });
      this.rebuildNav(sections);

      const section = sections.find(s => s.slug === this.state.slug);
      if (!section) {
        errorBox.classList.remove('hidden');
        document.getElementById('section-header').innerHTML = '';
        blocks.innerHTML = '';
        return;
      }

      document.title = section.title + ' — VetSafe';
      document.getElementById('breadcrumb-section').textContent = section.title;
      this.renderHeader(section);
      this.renderBlocks(section.items || []);
      this.bindImageFallbacks();
    } catch (err) {
      console.error(err);
      errorBox.classList.remove('hidden');
    }
  },

  renderHeader(section) {
    const header = document.getElementById('section-header');
    const itemsCount = (section.items || []).length;
    const blocksLabel = window.t('sections.blocks', this.state.lang) || 'blok';
    header.innerHTML = `
      <div class="inline-flex items-center gap-2 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 px-3 py-1 rounded-full text-xs font-semibold mb-4">
        <span>${itemsCount} ${escapeHtml(blocksLabel)}</span>
      </div>
      <h1 class="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">${escapeHtml(section.title)}</h1>
    `;
  },

  renderBlocks(items) {
    const container = document.getElementById('section-blocks');
    if (items.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div class="mx-auto w-14 h-14 rounded-2xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
          </div>
          <p class="text-slate-500 dark:text-slate-400">${escapeHtml(window.t('sections.empty_in_section', this.state.lang) || "Bu bo'limda hali kontent yo'q.")}</p>
        </div>
      `;
      return;
    }
    container.innerHTML = `<div class="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-7">${
      items.map((item) => this.renderCard(item)).join('')
    }</div>`;
  },

  renderCard(item) {
    const imageUrl = window.Api.resolveMediaUrl(item.imageUrl);
    const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString(this.state.lang === 'en' ? 'en-GB' : 'uz-UZ').replace(/\//g, '.') : '';
    const detailsLabel = window.t('section.details', this.state.lang) || 'Batafsil';

    return `
      <article class="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-md hover:shadow-2xl hover:-translate-y-2 hover:border-brand-300 dark:hover:border-brand-700 transition-all duration-300 group">
        <a href="content.html?id=${encodeURIComponent(item.id)}" class="block aspect-[16/10] bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(item.title)}" loading="lazy" data-fallback class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        </a>
        <div class="p-7 flex flex-col flex-1">
          ${date ? `<div class="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4">${escapeHtml(date)}</div>` : ''}
          <h3 class="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug mb-6 line-clamp-3 group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors min-h-[4.6rem]">${escapeHtml(item.title)}</h3>
          <div class="mt-auto">
            <a href="content.html?id=${encodeURIComponent(item.id)}" class="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white text-base font-semibold rounded-xl transition shadow-md hover:shadow-lg">
              <span>${escapeHtml(detailsLabel)}</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
            </a>
          </div>
        </div>
      </article>
    `;
  },

  renderDescription(raw) {
    if (raw === null || raw === undefined) return '';
    const text = String(raw).trim();
    if (!text) return '';
    if (/^[\[{]/.test(text)) {
      try {
        const parsed = JSON.parse(text);
        return `<pre><code>${escapeHtml(JSON.stringify(parsed, null, 2))}</code></pre>`;
      } catch { /* fall through */ }
    }
    if (/<[a-z][\s\S]*>/i.test(text)) return text;
    return `<p>${escapeHtml(text).replace(/\n/g, '<br/>')}</p>`;
  },

  bindImageFallbacks() {
    document.querySelectorAll('img[data-fallback]').forEach(img => {
      img.addEventListener('error', () => {
        const wrap = img.parentElement;
        wrap.classList.add('img-fallback');
        img.replaceWith(Object.assign(document.createElement('div'), {
          className: 'flex flex-col items-center gap-2 text-brand-700/70 py-12',
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

document.addEventListener('DOMContentLoaded', () => SectionPage.init());

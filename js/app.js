// Main app — language switcher, content rendering, scroll animations, navbar state, back-to-top.
const App = {
  state: {
    lang: window.AppConfig.DEFAULT_LANGUAGE
  },

  init() {
    document.getElementById('footer-year').textContent = new Date().getFullYear();

    const stored = localStorage.getItem(window.AppConfig.LANGUAGE_STORAGE_KEY);
    if (stored && window.I18N[stored]) {
      this.state.lang = stored;
    }

    this.wireAdminLinks();
    this.applyTranslations();
    this.bindNavbar();
    this.bindLanguageSwitcher();
    this.bindThemeToggle();
    this.bindMobileMenu();
    this.bindBackToTop();
    this.bindScrollAnimations();

    this.loadContents();
  },

  // ─────────── Theme (dark / light) ───────────
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

  wireAdminLinks() {
    const adminUrl = window.AppConfig.API_BASE_URL.replace(/\/$/, '') + '/admin/';
    ['admin-link', 'admin-link-mobile', 'admin-link-footer'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.setAttribute('href', adminUrl);
    });
  },

  // ─────────── i18n ───────────
  applyTranslations() {
    document.documentElement.lang = this.state.lang;
    document.title = window.t('meta.title', this.state.lang);

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', window.t('meta.description', this.state.lang));

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
    this.loadContents();
  },

  bindLanguageSwitcher() {
    const btn = document.getElementById('lang-btn');
    const menu = document.getElementById('lang-menu');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => menu.classList.add('hidden'));

    document.querySelectorAll('.lang-option').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setLanguage(b.dataset.lang);
        menu.classList.add('hidden');
      });
    });
  },

  // ─────────── Navbar / mobile menu / back-to-top ───────────
  bindNavbar() {
    const navbar = document.getElementById('navbar');
    const update = () => navbar.classList.toggle('scrolled', window.scrollY > 24);
    update();
    window.addEventListener('scroll', update, { passive: true });
  },

  bindMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    btn.addEventListener('click', () => menu.classList.toggle('hidden'));
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.add('hidden')));
  },

  bindBackToTop() {
    const btn = document.getElementById('back-to-top');
    const update = () => btn.classList.toggle('visible', window.scrollY > 600);
    update();
    window.addEventListener('scroll', update, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  },

  // ─────────── Scroll animations ───────────
  bindScrollAnimations() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    document.querySelectorAll('.animate-on-scroll').forEach(el => io.observe(el));
    this._animationObserver = io;
  },

  observeNewAnimated() {
    if (!this._animationObserver) return;
    document.querySelectorAll('.animate-on-scroll:not(.in-view)').forEach(el => this._animationObserver.observe(el));
  },

  // ─────────── Sections + content rendering ───────────
  async loadContents() {
    const list = document.getElementById('sections-list');
    list.innerHTML = this.renderSkeleton(2);

    try {
      const tree = await window.Api.getSectionsTreeWithContents({ lang: this.state.lang });
      // Only top-level (root) sections appear on the home page — child sections live
      // inside their parent's section.html page.
      this.rebuildNav(tree);

      if (!tree || tree.length === 0) {
        list.innerHTML = this.renderEmpty();
        return;
      }

      list.innerHTML = `<div class="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-7">${
        tree.map((section, sIdx) => this.renderSectionCard(section, sIdx)).join('')
      }</div>`;
      this.observeNewAnimated();
      this.bindImageFallbacks();
    } catch (err) {
      console.error(err);
      list.innerHTML = this.renderError();
    }
  },

  rebuildNav(rootSections) {
    NavBuilder.render({
      rootSections,
      desktopNav: document.getElementById('primary-nav'),
      mobileNav: document.getElementById('mobile-nav-list'),
      desktopAnchor: document.getElementById('nav-contact'),
      mobileAnchor: document.getElementById('mobile-nav-contact'),
      activeSlug: null,
      onMobileLinkClick: () => document.getElementById('mobile-menu').classList.add('hidden')
    });
  },

  renderSectionCard(section, sectionIndex) {
    const items = section.items || [];
    const children = section.children || [];
    const itemsCount = items.length;
    const childrenCount = children.length;
    // Prefer this section's own image, otherwise fall back to a child section's image.
    const ownImage = items.find(i => i.imageUrl)?.imageUrl;
    const childImage = !ownImage
      ? children.flatMap(c => c.items || []).find(i => i.imageUrl)?.imageUrl
      : null;
    const previewImage = ownImage || childImage;
    const imageUrl = previewImage ? window.Api.resolveMediaUrl(previewImage) : '';
    const number = String(sectionIndex + 1).padStart(2, '0');
    const openLabel = window.t('sections.open', this.state.lang) || 'Ochish';
    const blocksLabel = window.t('sections.blocks', this.state.lang) || 'blok';
    const subLabel = window.t('sections.subsections', this.state.lang) || 'ichki bo\'lim';

    return `
      <a href="section.html?slug=${escapeAttr(section.slug)}"
         class="group relative flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-md hover:shadow-2xl hover:shadow-brand-200/40 dark:hover:shadow-brand-900/40 hover:-translate-y-2 hover:border-brand-300 dark:hover:border-brand-700 transition-all duration-300 animate-on-scroll">
        <div class="aspect-[16/10] bg-gradient-to-br from-brand-100 via-emerald-100 to-warm-100 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
          ${imageUrl
            ? `<img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(section.title)}" loading="lazy" data-fallback class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />`
            : `<div class="w-full h-full flex items-center justify-center text-brand-700/50 dark:text-brand-400/40">
                 <svg xmlns="http://www.w3.org/2000/svg" class="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
               </div>`
          }
          <span class="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-full text-sm font-bold text-brand-700 dark:text-brand-300">
            #${number}
          </span>
        </div>
        <div class="p-7 flex flex-col flex-1">
          <h3 class="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">${escapeHtml(section.title)}</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-5">
            ${itemsCount} ${escapeHtml(blocksLabel)}${childrenCount ? ` · ${childrenCount} ${escapeHtml(subLabel)}` : ''}
          </p>
          <div class="mt-auto inline-flex items-center gap-2 text-base font-semibold text-brand-600 dark:text-brand-400 group-hover:gap-3 transition-all">
            <span>${openLabel}</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
          </div>
        </div>
      </a>
    `;
  },

  /**
   * Description from API can be plain text, HTML, or a JSON string.
   * - HTML detected by presence of '<' and '>' → render as innerHTML
   * - JSON detected by leading { or [ → format and render in <pre>
   * - Otherwise plain text → escape and wrap newlines
   */
  renderDescription(raw) {
    if (raw === null || raw === undefined) return '';
    const text = String(raw).trim();
    if (!text) return '';

    if (/^[\[{]/.test(text)) {
      try {
        const parsed = JSON.parse(text);
        return `<pre><code>${escapeHtml(JSON.stringify(parsed, null, 2))}</code></pre>`;
      } catch { /* not valid JSON, fall through */ }
    }

    if (/<[a-z][\s\S]*>/i.test(text)) {
      return text;
    }

    return `<p>${escapeHtml(text).replace(/\n/g, '<br/>')}</p>`;
  },

  bindImageFallbacks() {
    document.querySelectorAll('img[data-fallback]').forEach(img => {
      img.addEventListener('error', () => {
        const wrap = img.parentElement;
        wrap.classList.add('img-fallback');
        img.replaceWith(Object.assign(document.createElement('div'), {
          className: 'flex flex-col items-center gap-2 text-brand-700/70',
          innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg><div class="text-sm font-medium">No image</div>`
        }), { once: true });
      }, { once: true });
    });
  },

  // ─────────── States ───────────
  renderSkeleton(count = 2) {
    let html = '';
    for (let i = 0; i < count; i++) {
      const isRight = i % 2 === 1;
      html += `
        <div class="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div class="${isRight ? 'lg:order-2' : ''} skeleton aspect-[4/3] rounded-3xl"></div>
          <div class="${isRight ? 'lg:order-1' : ''} space-y-4">
            <div class="skeleton h-4 w-32"></div>
            <div class="skeleton h-9 w-3/4"></div>
            <div class="skeleton h-4 w-full"></div>
            <div class="skeleton h-4 w-5/6"></div>
            <div class="skeleton h-4 w-2/3"></div>
          </div>
        </div>
      `;
    }
    return html;
  },

  renderEmpty() {
    return `
      <div class="text-center py-12">
        <div class="mx-auto w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
          </svg>
        </div>
        <h3 class="font-display text-xl font-bold text-slate-900">${escapeHtml(window.t('sections.empty_title', this.state.lang))}</h3>
        <p class="text-slate-500 mt-2">${escapeHtml(window.t('sections.empty_message', this.state.lang))}</p>
      </div>
    `;
  },

  renderError() {
    return `
      <div class="text-center py-12">
        <div class="mx-auto w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"/>
          </svg>
        </div>
        <h3 class="font-display text-xl font-bold text-slate-900">${escapeHtml(window.t('sections.error_title', this.state.lang))}</h3>
        <p class="text-slate-500 mt-2 max-w-md mx-auto">${escapeHtml(window.t('sections.error_message', this.state.lang))}</p>
        <button onclick="App.loadContents()" class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Qayta urinish
        </button>
      </div>
    `;
  }
};

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(s) {
  return escapeHtml(s);
}

document.addEventListener('DOMContentLoaded', () => App.init());

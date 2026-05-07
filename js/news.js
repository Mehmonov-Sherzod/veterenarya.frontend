// News listing page. Finds the section that looks like a news section by slug
// (matches /news|xabar|yangilik/i) and renders its content blocks as news cards.
// If no matching section is found, an empty state is shown — admins can rename
// or create one to populate the feed.
const NewsPage = {
  state: {
    lang: window.AppConfig.DEFAULT_LANGUAGE
  },

  async init() {
    document.getElementById('footer-year').textContent = new Date().getFullYear();
    const stored = localStorage.getItem(window.AppConfig.LANGUAGE_STORAGE_KEY);
    if (stored && window.I18N[stored]) this.state.lang = stored;

    this.applyTranslations();
    this.bindNavbar();
    this.bindLanguageSwitcher();
    this.bindMobileMenu();

    await this.load();
  },

  applyTranslations() {
    document.documentElement.lang = this.state.lang;
    document.title = window.t('news.title', this.state.lang);
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const value = window.t(key, this.state.lang);
      if (value !== null) el.textContent = value;
    });
    const codeMap = { uz: 'UZ', ru: 'RU', en: 'EN' };
    const lc = document.getElementById('lang-current');
    if (lc) lc.textContent = codeMap[this.state.lang] || codeMap.uz;
    document.querySelectorAll('.lang-option').forEach(b =>
      b.classList.toggle('active', b.dataset.lang === this.state.lang));
  },

  bindNavbar() {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
  },

  bindLanguageSwitcher() {
    const btn = document.getElementById('lang-btn');
    const menu = document.getElementById('lang-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('hidden'); });
    document.addEventListener('click', () => menu.classList.add('hidden'));
    document.querySelectorAll('.lang-option').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const lang = b.dataset.lang;
        if (!window.I18N[lang]) return;
        this.state.lang = lang;
        localStorage.setItem(window.AppConfig.LANGUAGE_STORAGE_KEY, lang);
        this.applyTranslations();
        this.load();
        menu.classList.add('hidden');
      });
    });
  },

  bindMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', () => menu.classList.toggle('hidden'));
  },

  rebuildNav(rootSections) {
    if (!window.NavBuilder) return;
    window.NavBuilder.render({
      rootSections: Array.isArray(rootSections) ? rootSections : [],
      desktopNav: document.getElementById('primary-nav'),
      mobileNav: document.getElementById('mobile-nav-list'),
      desktopAnchor: document.querySelector('#primary-nav a[href="lab-heads.html"]'),
      mobileAnchor: document.querySelector('#mobile-nav-list a[href="lab-heads.html"]'),
      activeSlug: null,
      onMobileLinkClick: () => {
        const m = document.getElementById('mobile-menu');
        if (m) m.classList.add('hidden');
      }
    });
  },

  async load() {
    const list = document.getElementById('news-list');
    const empty = document.getElementById('news-empty');
    try {
      const tree = await window.Api.getSectionsTreeWithContents({ lang: this.state.lang });
      this.rebuildNav(tree);

      const items = window.NewsHelpers.collectNewsItems(tree);
      if (!items.length) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
      }
      empty.classList.add('hidden');
      list.innerHTML = items.map(item => window.NewsHelpers.renderCard(item, this.state.lang)).join('');
    } catch (err) {
      console.error(err);
      list.innerHTML = '';
      empty.classList.remove('hidden');
    }
  }
};

// NewsHelpers is provided by js/news-helpers.js (loaded before this file) so
// the home-page carousel and the dedicated news page share the same logic.

document.addEventListener('DOMContentLoaded', () => NewsPage.init());

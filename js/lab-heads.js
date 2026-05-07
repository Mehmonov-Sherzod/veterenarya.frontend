// Lab heads page — fetches from backend and renders cards.
const LabHeadsPage = {
  state: {
    lang: window.AppConfig.DEFAULT_LANGUAGE,
    items: []
  },

  async init() {
    document.getElementById('footer-year').textContent = new Date().getFullYear();

    const stored = localStorage.getItem(window.AppConfig.LANGUAGE_STORAGE_KEY);
    if (stored && window.I18N[stored]) this.state.lang = stored;

    this.applyTranslations();
    this.bindNavbar();
    this.bindThemeToggle();
    this.bindLanguageSwitcher();
    this.bindMobileMenu();

    // Build the dynamic top-level section nav (same hierarchy that index.html shows),
    // so visitors keep their place across the site instead of seeing a stripped-down nav.
    this.loadAndRenderNav().catch(err => console.error('nav:', err));

    await this.load();
  },

  async loadAndRenderNav() {
    if (!window.NavBuilder) return;
    try {
      const tree = await window.Api.getSectionsTreeWithContents({ lang: this.state.lang });
      window.NavBuilder.render({
        rootSections: Array.isArray(tree) ? tree : [],
        desktopNav: document.getElementById('primary-nav'),
        mobileNav: document.getElementById('mobile-nav-list'),
        // Insert dynamic links right before the static "Bo'lim boshliqlari" anchor so
        // they sit in the same position as on the home page (between Home and Heads).
        desktopAnchor: document.querySelector('#primary-nav a[href="lab-heads.html"]'),
        mobileAnchor: document.querySelector('#mobile-nav-list a[href="lab-heads.html"]'),
        activeSlug: null,
        onMobileLinkClick: () => {
          const m = document.getElementById('mobile-menu');
          if (m) m.classList.add('hidden');
        }
      });
    } catch (err) {
      console.warn('Section nav lookup failed:', err.message);
    }
  },

  applyTranslations() {
    document.documentElement.lang = this.state.lang;
    document.title = window.t('lab_heads.title', this.state.lang);

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const value = window.t(key, this.state.lang);
      if (value !== null) el.textContent = value;
    });

    const codeMap = { uz: "UZ", ru: "RU", en: "EN" };
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
        this.render();
        this.loadAndRenderNav().catch(err => console.error('nav:', err));
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

  async load() {
    const list = document.getElementById('lab-heads-list');
    const empty = document.getElementById('lab-heads-empty');
    const errorBox = document.getElementById('lab-heads-error');

    try {
      // Section-linked heads are surfaced inline at the top of their section page;
      // this public list shows only the heads that belong to general leadership
      // (no sectionId), so they don't appear twice.
      const all = await window.Api.getLabHeads({ lang: this.state.lang });
      this.state.items = (all || []).filter(h => h.sectionId == null);
      errorBox.classList.add('hidden');

      if (!this.state.items.length) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
      }
      empty.classList.add('hidden');
      this.render();
    } catch (err) {
      console.error(err);
      list.innerHTML = '';
      errorBox.classList.remove('hidden');
    }
  },

  render() {
    const list = document.getElementById('lab-heads-list');
    if (!list) return;

    // Switch the container from a multi-column grid to a centered single-column
    // stack, then render each leader as a large hero-style card mirroring the
    // section-head card on section pages.
    list.className = 'leader-list';

    const escape = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
    const initials = (name) => (name || '?').trim().split(/\s+/).map(w => w[0] || '').slice(0, 2).join('').toUpperCase();

    const phoneLabel = window.t('lab_heads.phone_label', this.state.lang);
    const hoursLabel = window.t('lab_heads.hours_label', this.state.lang);

    list.innerHTML = this.state.items.map(h => {
      const phoneHref = 'tel:' + (h.phone || '').replace(/\s+/g, '');
      const photoSrc = h.photoUrl ? window.Api.resolveMediaUrl(h.photoUrl) : '';
      const photoBlock = photoSrc
        ? `<img src="${escape(photoSrc)}" alt="${escape(h.fullName)}" loading="lazy" />`
        : `<div class="leader-hero-initials">${escape(initials(h.fullName))}</div>`;

      const emailLabel = window.t('lab_heads.email_label', this.state.lang) || 'Email';

      const phoneBlock = h.phone ? `
        <div class="leader-hero-contact">
          <div class="leader-hero-contact-ico brand">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
          </div>
          <div>
            <div class="leader-hero-contact-label">${escape(phoneLabel)}</div>
            <a href="${escape(phoneHref)}" class="leader-hero-contact-value">${escape(h.phone)}</a>
          </div>
        </div>` : '';

      const emailBlock = h.email ? `
        <div class="leader-hero-contact">
          <div class="leader-hero-contact-ico brand">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          </div>
          <div>
            <div class="leader-hero-contact-label">${escape(emailLabel)}</div>
            <a href="mailto:${escape(h.email)}" class="leader-hero-contact-value">${escape(h.email)}</a>
          </div>
        </div>` : '';

      const hoursBlock = h.receptionHours ? `
        <div class="leader-hero-contact">
          <div class="leader-hero-contact-ico accent">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <div class="leader-hero-contact-label">${escape(hoursLabel)}</div>
            <div class="leader-hero-contact-value">${escape(h.receptionHours)}</div>
          </div>
        </div>` : '';

      const filledCount = [h.phone, h.email, h.receptionHours].filter(Boolean).length;
      const contactsBlock = filledCount > 0
        ? `<div class="leader-hero-contacts${filledCount >= 2 ? ' has-two' : ''}">${phoneBlock}${emailBlock}${hoursBlock}</div>`
        : '';

      return `
        <article class="leader-hero">
          <div class="leader-hero-photo">${photoBlock}</div>
          <div class="leader-hero-body">
            <h2 class="leader-hero-name">${escape(h.fullName)}</h2>
            ${h.department ? `<div class="leader-hero-role">${escape(h.department)}</div>` : ''}
            ${contactsBlock}
          </div>
        </article>`;
    }).join('');
  }
};

document.addEventListener('DOMContentLoaded', () => LabHeadsPage.init());

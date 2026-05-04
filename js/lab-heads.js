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

    await this.load();
  },

  applyTranslations() {
    document.documentElement.lang = this.state.lang;
    document.title = window.t('lab_heads.title', this.state.lang);

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const value = window.t(key, this.state.lang);
      if (value !== null) el.textContent = value;
    });

    const flagMap = { uz: "🇺🇿 UZ", ru: "🇷🇺 RU", en: "🇬🇧 EN" };
    const lc = document.getElementById('lang-current');
    if (lc) lc.textContent = flagMap[this.state.lang] || flagMap.uz;

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
      this.state.items = await window.Api.getLabHeads();
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

    const escape = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
    const initials = (name) => name.trim().split(/\s+/).map(w => w[0] || '').slice(0, 2).join('').toUpperCase();
    const palette = ['from-brand-500 to-brand-700', 'from-warm-500 to-warm-700', 'from-emerald-500 to-emerald-700'];

    const phoneLabel = window.t('lab_heads.phone_label', this.state.lang);
    const hoursLabel = window.t('lab_heads.hours_label', this.state.lang);

    list.innerHTML = this.state.items.map((h, i) => {
      const phoneHref = 'tel:' + (h.phone || '').replace(/\s+/g, '');
      const photoSrc = h.photoUrl ? window.Api.resolveMediaUrl(h.photoUrl) : '';
      const photoBlock = photoSrc
        ? `<img src="${escape(photoSrc)}" alt="${escape(h.fullName)}" class="w-full h-full object-cover" />`
        : `<div class="w-full h-full bg-gradient-to-br ${palette[i % palette.length]} flex items-center justify-center text-white font-display font-bold text-5xl">${escape(initials(h.fullName))}</div>`;
      return `
        <article class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
          <div class="aspect-[4/3] bg-slate-100 dark:bg-slate-900 overflow-hidden">${photoBlock}</div>
          <div class="p-6">
            <h3 class="font-display font-bold text-lg text-slate-900 dark:text-white mb-4">${escape(h.fullName)}</h3>
            <div class="space-y-3 text-sm">
              <div class="flex items-start gap-3">
                <div class="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-900/40 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                </div>
                <div class="min-w-0">
                  <div class="text-xs text-slate-500 dark:text-slate-400 mb-0.5">${escape(phoneLabel)}</div>
                  <a href="${escape(phoneHref)}" class="text-slate-900 dark:text-white font-medium hover:text-brand-600 dark:hover:text-brand-400 transition">${escape(h.phone)}</a>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-9 h-9 rounded-lg bg-warm-50 dark:bg-warm-700/30 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-warm-600 dark:text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div class="min-w-0">
                  <div class="text-xs text-slate-500 dark:text-slate-400 mb-0.5">${escape(hoursLabel)}</div>
                  <div class="text-slate-900 dark:text-white font-medium">${escape(h.receptionHours)}</div>
                </div>
              </div>
            </div>
          </div>
        </article>`;
    }).join('');
  }
};

document.addEventListener('DOMContentLoaded', () => LabHeadsPage.init());

// Single-section detail page. Reads ?slug= from URL and renders that section's content blocks
// plus any direct sub-sections (children) so users can drill down further.
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

  rebuildNav(rootSections) {
    NavBuilder.render({
      rootSections,
      desktopNav: document.getElementById('primary-nav'),
      mobileNav: document.getElementById('mobile-nav-list'),
      desktopAnchor: document.getElementById('nav-contact'),
      mobileAnchor: document.getElementById('mobile-nav-contact'),
      activeSlug: this.state.slug,
      onMobileLinkClick: () => {
        const menu = document.getElementById('mobile-menu');
        if (menu) menu.classList.add('hidden');
      }
    });
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

  /**
   * Walk the hierarchy of root sections and find the one matching the requested slug.
   * Returns { section, ancestors } where `ancestors` is the chain from root → ... → parent.
   */
  findSection(roots, slug) {
    const stack = roots.map(r => ({ node: r, ancestors: [] }));
    while (stack.length > 0) {
      const { node, ancestors } = stack.pop();
      if (node.slug === slug) return { section: node, ancestors };
      const childAncestors = [...ancestors, node];
      (node.children || []).forEach(child => stack.push({ node: child, ancestors: childAncestors }));
    }
    return { section: null, ancestors: [] };
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
      const tree = await window.Api.getSectionsTreeWithContents({ lang: this.state.lang });
      this.rebuildNav(tree);

      const { section, ancestors } = this.findSection(tree, this.state.slug);
      if (!section) {
        errorBox.classList.remove('hidden');
        document.getElementById('section-header').innerHTML = '';
        blocks.innerHTML = '';
        return;
      }

      document.title = section.title;
      this.renderBreadcrumb(section, ancestors);
      this.renderHeader(section);
      this.renderBody(section);
      this.bindImageFallbacks();
    } catch (err) {
      console.error(err);
      errorBox.classList.remove('hidden');
    }
  },

  renderBreadcrumb(section, ancestors) {
    const wrap = document.getElementById('breadcrumb');
    if (!wrap) return;
    const homeLabel = window.t('nav.home', this.state.lang) || 'Bosh sahifa';
    const arrow = `<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>`;
    const parts = [
      `<a href="index.html" class="hover:text-brand-600 dark:hover:text-brand-400 transition">${escapeHtml(homeLabel)}</a>`,
      ...ancestors.map(a => `<a href="section.html?slug=${escapeAttr(a.slug)}" class="hover:text-brand-600 dark:hover:text-brand-400 transition">${escapeHtml(a.title)}</a>`),
      `<span class="text-slate-700 dark:text-slate-200 font-medium">${escapeHtml(section.title)}</span>`
    ];
    wrap.innerHTML = parts.join(arrow);
  },

  renderHeader(section) {
    const header = document.getElementById('section-header');
    const itemsCount = (section.items || []).length;
    const childrenCount = (section.children || []).length;
    const blocksLabel = window.t('sections.blocks', this.state.lang) || 'blok';
    const subLabel = window.t('sections.subsections', this.state.lang) || 'ichki bo\'lim';

    const meta = [];
    if (childrenCount > 0) meta.push(`${childrenCount} ${escapeHtml(subLabel)}`);
    if (itemsCount > 0 || childrenCount === 0) meta.push(`${itemsCount} ${escapeHtml(blocksLabel)}`);

    header.innerHTML = `
      <div class="inline-flex items-center gap-2 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 px-3 py-1 rounded-full text-xs font-semibold mb-4">
        <span>${meta.join(' · ')}</span>
      </div>
      <h1 class="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">${escapeHtml(section.title)}</h1>
    `;
  },

  renderBody(section) {
    const container = document.getElementById('section-blocks');
    const items = section.items || [];
    const children = section.children || [];

    const childrenHtml = children.length
      ? this.renderChildrenSection(children)
      : '';

    let blocksHtml = '';
    if (items.length > 0) {
      blocksHtml = `<div class="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-7">${
        items.map((item) => this.renderItemCard(item)).join('')
      }</div>`;
    } else if (children.length === 0) {
      blocksHtml = `
        <div class="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div class="mx-auto w-14 h-14 rounded-2xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
          </div>
          <p class="text-slate-500 dark:text-slate-400">${escapeHtml(window.t('sections.empty_in_section', this.state.lang) || "Bu bo'limda hali kontent yo'q.")}</p>
        </div>`;
    }

    container.innerHTML = childrenHtml + blocksHtml;
  },

  renderChildrenSection(children) {
    const subTitle = window.t('sections.subsections_title', this.state.lang) || 'Ichki bo\'limlar';
    return `
      <section class="mb-12 sm:mb-16">
        <h2 class="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <span class="w-1.5 h-6 bg-brand-500 rounded-full"></span>
          ${escapeHtml(subTitle)}
        </h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-7">
          ${children.map((child, idx) => this.renderChildCard(child, idx)).join('')}
        </div>
      </section>
    `;
  },

  renderChildCard(child, index) {
    const items = child.items || [];
    const grandChildren = child.children || [];
    const ownImage = items.find(i => i.imageUrl)?.imageUrl;
    const grandImage = !ownImage
      ? grandChildren.flatMap(g => g.items || []).find(i => i.imageUrl)?.imageUrl
      : null;
    const previewImage = ownImage || grandImage;
    const imageUrl = previewImage ? window.Api.resolveMediaUrl(previewImage) : '';
    const number = String(index + 1).padStart(2, '0');
    const openLabel = window.t('sections.open', this.state.lang) || 'Ochish';
    const blocksLabel = window.t('sections.blocks', this.state.lang) || 'blok';
    const subLabel = window.t('sections.subsections', this.state.lang) || 'ichki bo\'lim';
    const meta = grandChildren.length
      ? `${items.length} ${escapeHtml(blocksLabel)} · ${grandChildren.length} ${escapeHtml(subLabel)}`
      : `${items.length} ${escapeHtml(blocksLabel)}`;

    return `
      <a href="section.html?slug=${escapeAttr(child.slug)}"
         class="group relative flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-md hover:shadow-2xl hover:shadow-brand-200/40 dark:hover:shadow-brand-900/40 hover:-translate-y-2 hover:border-brand-300 dark:hover:border-brand-700 transition-all duration-300">
        <div class="aspect-[16/10] bg-gradient-to-br from-brand-100 via-emerald-100 to-warm-100 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
          ${imageUrl
            ? `<img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(child.title)}" loading="lazy" data-fallback class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />`
            : `<div class="w-full h-full flex items-center justify-center text-brand-700/50 dark:text-brand-400/40">
                 <svg xmlns="http://www.w3.org/2000/svg" class="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
               </div>`}
          <span class="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-full text-sm font-bold text-brand-700 dark:text-brand-300">
            #${number}
          </span>
        </div>
        <div class="p-7 flex flex-col flex-1">
          <h3 class="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">${escapeHtml(child.title)}</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-5">${meta}</p>
          <div class="mt-auto inline-flex items-center gap-2 text-base font-semibold text-brand-600 dark:text-brand-400 group-hover:gap-3 transition-all">
            <span>${escapeHtml(openLabel)}</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
          </div>
        </div>
      </a>
    `;
  },

  renderItemCard(item) {
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

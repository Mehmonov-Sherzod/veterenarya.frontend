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
      // Dynamic section links sit between "Home" and "Bo'lim boshliqlari"
      // so the order matches the home page exactly.
      desktopAnchor: document.querySelector('#primary-nav a[href="lab-heads.html"]'),
      mobileAnchor: document.querySelector('#mobile-nav-list a[href="lab-heads.html"]'),
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
    const codeMap = { uz: "UZ", ru: "RU", en: "EN" };
    document.getElementById('lang-current').textContent = codeMap[this.state.lang] || codeMap.uz;
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

      // Heads are fetched separately (lightweight) — render asynchronously so the page is
      // already interactive when the head card slides in above the body.
      this.loadAndRenderHeads(section.id, section.title).catch(err => console.error('lab-heads:', err));
    } catch (err) {
      console.error(err);
      errorBox.classList.remove('hidden');
    }
  },

  async loadAndRenderHeads(sectionId, sectionTitle) {
    // Use the new dedicated /section-heads endpoint — distinct from the
    // top-level Rahbariyat (LabHead) listing on /lab-heads.html.
    const head = await window.Api.getSectionHead({ lang: this.state.lang, sectionId });
    const slot = document.getElementById('section-heads');
    if (!slot) return;
    if (!head) { slot.innerHTML = ''; return; }
    slot.innerHTML = this.renderHeadHero(head, sectionTitle);
    this.bindImageFallbacks();
  },

  renderHeadHero(head, sectionTitle) {
    const photo = head.photoUrl ? window.Api.resolveMediaUrl(head.photoUrl) : '';
    const eyebrowLabel = window.t('section.head_title', this.state.lang) || "Bo'lim boshlig'i";
    const phoneLabel = window.t('lab_heads.phone_label', this.state.lang) || 'Telefon';
    const hoursLabel = window.t('lab_heads.hours_label', this.state.lang) || 'Qabul vaqti';

    const initials = String(head.fullName || '')
      .trim().split(/\s+/).map(w => w[0] || '').slice(0, 2).join('').toUpperCase();

    const photoBlock = photo
      ? `<img src="${escapeAttr(photo)}" alt="${escapeAttr(head.fullName)}" loading="eager" data-fallback />`
      : `<div class="section-head-hero-initials">${escapeHtml(initials || '·')}</div>`;

    const emailLabel = window.t('lab_heads.email_label', this.state.lang) || 'Email';

    const phoneBlock = head.phone ? `
      <div class="section-head-hero-contact">
        <div class="section-head-hero-contact-ico brand">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
        </div>
        <div>
          <div class="section-head-hero-contact-label">${escapeHtml(phoneLabel)}</div>
          <a href="tel:${escapeAttr(String(head.phone).replace(/\s+/g, ''))}" class="section-head-hero-contact-value">${escapeHtml(head.phone)}</a>
        </div>
      </div>` : '';

    const emailBlock = head.email ? `
      <div class="section-head-hero-contact">
        <div class="section-head-hero-contact-ico brand">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
        </div>
        <div>
          <div class="section-head-hero-contact-label">${escapeHtml(emailLabel)}</div>
          <a href="mailto:${escapeAttr(head.email)}" class="section-head-hero-contact-value">${escapeHtml(head.email)}</a>
        </div>
      </div>` : '';

    const hoursValue = head.workingHours || head.receptionHours;
    const hoursBlock = hoursValue ? `
      <div class="section-head-hero-contact">
        <div class="section-head-hero-contact-ico accent">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <div>
          <div class="section-head-hero-contact-label">${escapeHtml(hoursLabel)}</div>
          <div class="section-head-hero-contact-value">${escapeHtml(hoursValue)}</div>
        </div>
      </div>` : '';

    const filledCount = [head.phone, head.email, hoursValue].filter(Boolean).length;
    const contactsBlock = filledCount > 0
      ? `<div class="section-head-hero-contacts${filledCount >= 2 ? ' has-two' : ''}">${phoneBlock}${emailBlock}${hoursBlock}</div>`
      : '';

    const sectionLine = sectionTitle
      ? `<div class="section-head-hero-section">${escapeHtml(sectionTitle)}</div>`
      : '';

    return `
      <section class="section-head-hero" aria-label="${escapeAttr(eyebrowLabel)}">
        ${sectionLine}
        <span class="section-head-hero-eyebrow">${escapeHtml(eyebrowLabel)}</span>
        <div class="section-head-hero-photo">${photoBlock}</div>
        <h2 class="section-head-hero-name">${escapeHtml(head.fullName)}</h2>
        ${head.department ? `<div class="section-head-hero-dept">${escapeHtml(head.department)}</div>` : ''}
        ${contactsBlock}
      </section>
    `;
  },

  renderHeadCard(head) {
    const photo = head.photoUrl ? window.Api.resolveMediaUrl(head.photoUrl) : '';
    const phoneLabel = window.t('lab_heads.phone_label', this.state.lang) || 'Telefon';
    const hoursLabel = window.t('lab_heads.hours_label', this.state.lang) || 'Qabul vaqti';
    const photoBlock = photo
      ? `<img src="${escapeAttr(photo)}" alt="${escapeAttr(head.fullName)}" loading="lazy" data-fallback class="w-full h-full object-cover" />`
      : `<div class="w-full h-full flex items-center justify-center img-fallback">
           <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
         </div>`;

    const phoneBlock = head.phone ? `
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-md bg-[color:var(--color-brand-fade)] flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-[color:var(--color-brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
              </div>
              <div>
                <div class="text-xs uppercase tracking-wider font-bold text-[color:var(--color-text-muted)]">${escapeHtml(phoneLabel)}</div>
                <a href="tel:${escapeAttr(head.phone)}" class="font-semibold text-[color:var(--color-text-primary)] hover:text-[color:var(--color-brand-primary)] transition">${escapeHtml(head.phone)}</a>
              </div>
            </div>` : '';
    const hoursBlock = head.receptionHours ? `
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-md bg-[color:var(--color-accent-soft)] flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-[color:var(--color-accent-deep)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <div>
                <div class="text-xs uppercase tracking-wider font-bold text-[color:var(--color-text-muted)]">${escapeHtml(hoursLabel)}</div>
                <div class="font-semibold text-[color:var(--color-text-primary)]">${escapeHtml(head.receptionHours)}</div>
              </div>
            </div>` : '';
    const contactsBlock = (phoneBlock || hoursBlock)
      ? `<div class="space-y-3 text-sm">${phoneBlock}${hoursBlock}</div>`
      : '';

    return `
      <article class="card card-hover overflow-hidden">
        <div class="aspect-[4/3] bg-[color:var(--color-bg-tertiary)] overflow-hidden">${photoBlock}</div>
        <div class="p-6">
          <h3 class="font-display font-bold text-lg text-[color:var(--color-text-primary)]">${escapeHtml(head.fullName)}</h3>
          ${head.department ? `<div class="text-sm text-[color:var(--color-brand-primary)] font-semibold mt-1 mb-4">${escapeHtml(head.department)}</div>` : '<div class="mb-4"></div>'}
          ${contactsBlock}
        </div>
      </article>
    `;
  },

  renderBreadcrumb(section, ancestors) {
    const wrap = document.getElementById('breadcrumb');
    if (!wrap) return;
    const homeLabel = window.t('nav.home', this.state.lang) || 'Bosh sahifa';
    const arrow = `<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>`;
    const parts = [
      `<a href="index.html">${escapeHtml(homeLabel)}</a>`,
      ...ancestors.map(a => `<a href="section.html?slug=${escapeAttr(a.slug)}">${escapeHtml(a.title)}</a>`),
      `<span class="current">${escapeHtml(section.title)}</span>`
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
      <span class="badge badge-brand mb-4">${meta.join(' · ')}</span>
      <h1 class="section-title">${escapeHtml(section.title)}</h1>
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
      blocksHtml = `
        <section>
          <div class="section-divider">
            <span class="section-divider-bar"></span>
            <h2 class="section-divider-title">${escapeHtml(window.t('sections.blocks_title', this.state.lang) || "Materiallar")}</h2>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">${
            items.map((item) => this.renderItemCard(item)).join('')
          }</div>
        </section>`;
    } else if (children.length === 0) {
      blocksHtml = `
        <div class="text-center py-16 bg-[color:var(--color-bg-secondary)] rounded-xl border border-[color:var(--color-border)]">
          <div class="mx-auto w-14 h-14 rounded-xl bg-[color:var(--color-brand-fade)] flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-[color:var(--color-brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
          </div>
          <p class="text-[color:var(--color-text-secondary)]">${escapeHtml(window.t('sections.empty_in_section', this.state.lang) || "Bu bo'limda hali kontent yo'q.")}</p>
        </div>`;
    }

    container.innerHTML = childrenHtml + blocksHtml;
  },

  renderChildrenSection(children) {
    const subTitle = window.t('sections.subsections_title', this.state.lang) || 'Ichki bo\'limlar';
    return `
      <section class="mb-12 lg:mb-16">
        <div class="section-divider">
          <span class="section-divider-bar"></span>
          <h2 class="section-divider-title">${escapeHtml(subTitle)}</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
      <a href="section.html?slug=${escapeAttr(child.slug)}" class="section-card">
        <div class="section-card-image">
          ${imageUrl
            ? `<img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(child.title)}" loading="lazy" data-fallback />`
            : `<div class="w-full h-full flex items-center justify-center text-[color:var(--color-brand-primary)] opacity-30">
                 <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
               </div>`}
          <span class="section-card-number">${number}</span>
        </div>
        <div class="section-card-body">
          <h3 class="section-card-title">${escapeHtml(child.title)}</h3>
          <p class="section-card-meta">${meta}</p>
          <span class="section-card-cta">
            <span>${escapeHtml(openLabel)}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
          </span>
        </div>
      </a>
    `;
  },

  renderItemCard(item) {
    const imageUrl = window.Api.resolveMediaUrl(item.imageUrl);
    const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString(this.state.lang === 'en' ? 'en-GB' : 'uz-UZ').replace(/\//g, '.') : '';
    const detailsLabel = window.t('section.details', this.state.lang) || 'Batafsil';

    return `
      <article class="content-card">
        <a href="content.html?id=${encodeURIComponent(item.id)}" class="block aspect-[16/10] bg-[color:var(--color-bg-tertiary)] overflow-hidden">
          <img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(item.title)}" loading="lazy" data-fallback class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
        </a>
        <div class="p-6 flex flex-col flex-1">
          ${date ? `<div class="text-xs uppercase tracking-wider font-bold text-[color:var(--color-text-muted)] mb-3">${escapeHtml(date)}</div>` : ''}
          <h3 class="font-display text-lg font-bold text-[color:var(--color-text-primary)] leading-snug mb-5 line-clamp-3">${escapeHtml(item.title)}</h3>
          <a href="content.html?id=${encodeURIComponent(item.id)}" class="btn btn-secondary btn-sm mt-auto self-start">
            <span>${escapeHtml(detailsLabel)}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
          </a>
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

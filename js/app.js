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

      list.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">${
        tree.map((section, sIdx) => this.renderSectionCard(section, sIdx)).join('')
      }</div>`;
      this.observeNewAnimated();
      this.bindImageFallbacks();

      // Populate the news carousel from the same tree (no extra request).
      this.populateNewsCarousel(tree);
    } catch (err) {
      console.error(err);
      list.innerHTML = this.renderError();
    }
  },

  /**
   * Render the home-page news carousel from items collected by NewsHelpers
   * (looks for sections whose slug matches news/xabar/yangilik). Hidden when
   * no news is available so the page doesn't show an empty band.
   */
  populateNewsCarousel(tree) {
    const wrap = document.getElementById('news');
    const track = document.getElementById('news-carousel-track');
    if (!wrap || !track || !window.NewsHelpers) return;

    const items = window.NewsHelpers.collectNewsItems(tree);
    if (!items.length) {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    track.innerHTML = items.map(item => window.NewsHelpers.renderCard(item, this.state.lang)).join('');
    this.bindImageFallbacks();
    this.initNewsCarousel(items.length);
  },

  /**
   * Lightweight carousel: snaps to "pages" (1/2/3 cards based on viewport),
   * auto-advances every 5s, pauses on hover/focus, and respects
   * prefers-reduced-motion (no auto-advance, instant transition).
   */
  initNewsCarousel(itemCount) {
    const track = document.getElementById('news-carousel-track');
    const prevBtn = document.getElementById('news-carousel-prev');
    const nextBtn = document.getElementById('news-carousel-next');
    const dotsWrap = document.getElementById('news-carousel-dots');
    const carousel = document.getElementById('news-carousel');
    if (!track || !prevBtn || !nextBtn || !dotsWrap) return;

    // Clean up any prior listeners from a previous render (language switch).
    if (this._newsCarousel) {
      clearInterval(this._newsCarousel.timer);
      this._newsCarousel.cleanup?.();
    }

    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cardsPerView = () => {
      if (window.innerWidth < 640) return 1;
      if (window.innerWidth < 1024) return 2;
      return 3;
    };
    const totalPages = () => Math.max(1, Math.ceil(itemCount / cardsPerView()));

    let current = 0;
    let timer = null;

    const renderDots = () => {
      const total = totalPages();
      dotsWrap.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'news-carousel-dot' + (i === current ? ' active' : '');
        b.setAttribute('aria-label', 'Slide ' + (i + 1));
        b.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(b);
      }
    };

    const update = () => {
      const total = totalPages();
      if (current >= total) current = 0;
      const offset = -(current * 100);
      track.style.transform = `translateX(${offset}%)`;
      dotsWrap.querySelectorAll('.news-carousel-dot').forEach((d, i) =>
        d.classList.toggle('active', i === current));
      const single = total <= 1;
      prevBtn.disabled = single;
      nextBtn.disabled = single;
    };

    const goTo = (i) => {
      const total = totalPages();
      current = ((i % total) + total) % total;
      update();
      restartTimer();
    };
    const next = () => goTo(current + 1);
    const prev = () => goTo(current - 1);

    const startTimer = () => {
      if (reduce || itemCount <= cardsPerView()) return;
      timer = setInterval(next, 5000);
    };
    const restartTimer = () => {
      if (timer) clearInterval(timer);
      startTimer();
    };

    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);

    const onEnter = () => { if (timer) clearInterval(timer); };
    const onLeave = () => restartTimer();
    carousel.addEventListener('mouseenter', onEnter);
    carousel.addEventListener('mouseleave', onLeave);
    carousel.addEventListener('focusin', onEnter);
    carousel.addEventListener('focusout', onLeave);

    let resizeRaf;
    const onResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        renderDots();
        update();
      });
    };
    window.addEventListener('resize', onResize);

    renderDots();
    update();
    startTimer();

    this._newsCarousel = {
      timer,
      cleanup() {
        prevBtn.removeEventListener('click', prev);
        nextBtn.removeEventListener('click', next);
        carousel.removeEventListener('mouseenter', onEnter);
        carousel.removeEventListener('mouseleave', onLeave);
        carousel.removeEventListener('focusin', onEnter);
        carousel.removeEventListener('focusout', onLeave);
        window.removeEventListener('resize', onResize);
      }
    };
  },

  rebuildNav(rootSections) {
    NavBuilder.render({
      rootSections,
      desktopNav: document.getElementById('primary-nav'),
      mobileNav: document.getElementById('mobile-nav-list'),
      // Dynamic section links sit between "Home" and "Bo'lim boshliqlari"
      // so the same ordering is preserved across every page on the site.
      desktopAnchor: document.querySelector('#primary-nav a[href="lab-heads.html"]'),
      mobileAnchor: document.querySelector('#mobile-nav-list a[href="lab-heads.html"]'),
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
      <a href="section.html?slug=${escapeAttr(section.slug)}" class="section-card animate-on-scroll">
        <div class="section-card-image">
          ${imageUrl
            ? `<img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(section.title)}" loading="lazy" data-fallback />`
            : `<div class="w-full h-full flex items-center justify-center text-[color:var(--color-brand-primary)] opacity-30">
                 <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
               </div>`
          }
          <span class="section-card-number">${number}</span>
        </div>
        <div class="section-card-body">
          <h3 class="section-card-title">${escapeHtml(section.title)}</h3>
          <p class="section-card-meta">
            ${itemsCount} ${escapeHtml(blocksLabel)}${childrenCount ? ` &middot; ${childrenCount} ${escapeHtml(subLabel)}` : ''}
          </p>
          <span class="section-card-cta">
            <span>${openLabel}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
          </span>
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
  renderSkeleton(count = 4) {
    let html = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="card overflow-hidden">
          <div class="skeleton aspect-[16/10]" style="border-radius: 0;"></div>
          <div class="p-6 space-y-3">
            <div class="skeleton h-5 w-3/4"></div>
            <div class="skeleton h-4 w-1/2"></div>
            <div class="skeleton h-4 w-1/3 mt-4"></div>
          </div>
        </div>
      `;
    }
    html += '</div>';
    return html;
  },

  renderEmpty() {
    return `
      <div class="text-center py-16 max-w-md mx-auto">
        <div class="mx-auto w-16 h-16 rounded-xl bg-[color:var(--color-brand-fade)] flex items-center justify-center mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-[color:var(--color-brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
          </svg>
        </div>
        <h3 class="font-display text-xl font-bold text-[color:var(--color-text-primary)]">${escapeHtml(window.t('sections.empty_title', this.state.lang))}</h3>
        <p class="text-[color:var(--color-text-secondary)] mt-2">${escapeHtml(window.t('sections.empty_message', this.state.lang))}</p>
      </div>
    `;
  },

  renderError() {
    return `
      <div class="text-center py-16 max-w-md mx-auto">
        <div class="mx-auto w-16 h-16 rounded-xl bg-[color:var(--color-accent-soft)] flex items-center justify-center mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-[color:var(--color-warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"/>
          </svg>
        </div>
        <h3 class="font-display text-xl font-bold text-[color:var(--color-text-primary)]">${escapeHtml(window.t('sections.error_title', this.state.lang))}</h3>
        <p class="text-[color:var(--color-text-secondary)] mt-2 mb-5">${escapeHtml(window.t('sections.error_message', this.state.lang))}</p>
        <button onclick="App.loadContents()" class="btn btn-primary btn-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          <span>Qayta urinish</span>
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

// Shared navbar builder for the public site. Renders the dynamic section nav (desktop + mobile)
// from the section tree returned by the API. Root sections with `children.length > 0` become
// dropdowns whose items are the direct child sections; childless roots stay as flat links.
//
// The navbar is rebuilt every time the API returns new data, so adding/removing a section
// (or moving its parent) in the admin panel is reflected after the next page load — no
// hard-coded labels anywhere.
window.NavBuilder = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const escAttr = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

  function chevronSvg(className) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('xmlns', SVG_NS);
    svg.setAttribute('class', className);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.5');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('d', 'M19 9l-7 7-7-7');
    svg.appendChild(path);
    return svg;
  }

  function buildDesktopDropdown(parent, opts) {
    const wrap = document.createElement('div');
    wrap.className = 'nav-dropdown dynamic-section-link';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'nav-dropdown-trigger';
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.append(document.createTextNode(parent.title));
    trigger.appendChild(chevronSvg('nav-dropdown-chevron'));

    const menu = document.createElement('div');
    menu.className = 'nav-dropdown-menu';
    menu.setAttribute('role', 'menu');

    parent.children.forEach(child => {
      const link = document.createElement('a');
      link.className = 'nav-dropdown-item';
      if (opts.activeSlug && child.slug === opts.activeSlug) link.classList.add('active');
      link.href = `section.html?slug=${encodeURIComponent(child.slug)}`;
      link.textContent = child.title;
      link.setAttribute('role', 'menuitem');
      menu.appendChild(link);
    });

    wrap.appendChild(trigger);
    wrap.appendChild(menu);

    // Hover (desktop pointer) — keep open while pointer is inside parent OR menu, close when it leaves both.
    let hoverCloseTimer = null;
    const open = () => {
      if (hoverCloseTimer) { clearTimeout(hoverCloseTimer); hoverCloseTimer = null; }
      wrap.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    };
    const scheduleClose = () => {
      if (hoverCloseTimer) clearTimeout(hoverCloseTimer);
      hoverCloseTimer = setTimeout(() => {
        wrap.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }, 120);
    };

    wrap.addEventListener('mouseenter', open);
    wrap.addEventListener('mouseleave', scheduleClose);

    // Click toggle for keyboard / touch — also closes other open dropdowns.
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = wrap.classList.contains('open');
      document.querySelectorAll('.nav-dropdown.open').forEach(d => {
        d.classList.remove('open');
        d.querySelector('.nav-dropdown-trigger')?.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) open();
    });

    return wrap;
  }

  function buildMobileGroup(parent, opts) {
    const group = document.createElement('div');
    group.className = 'mobile-nav-group dynamic-section-link';
    if (opts.activeSlug && (parent.slug === opts.activeSlug || parent.children.some(c => c.slug === opts.activeSlug))) {
      group.classList.add('open');
    }

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'mobile-nav-group-trigger';
    trigger.innerHTML = `<span>${escAttr(parent.title)}</span>`;
    trigger.appendChild(chevronSvg('mobile-nav-group-chevron'));

    const list = document.createElement('div');
    list.className = 'mobile-nav-group-list';

    // First item = the parent itself, so users can still open the parent section page.
    const parentLink = document.createElement('a');
    parentLink.href = `section.html?slug=${encodeURIComponent(parent.slug)}`;
    parentLink.className = 'mobile-nav-sublink';
    if (opts.activeSlug && parent.slug === opts.activeSlug) parentLink.style.fontWeight = '600';
    parentLink.textContent = `${parent.title} — hammasi`;
    if (opts.onMobileLinkClick) parentLink.addEventListener('click', opts.onMobileLinkClick);
    list.appendChild(parentLink);

    parent.children.forEach(child => {
      const a = document.createElement('a');
      a.href = `section.html?slug=${encodeURIComponent(child.slug)}`;
      a.className = 'mobile-nav-sublink';
      if (opts.activeSlug && child.slug === opts.activeSlug) a.style.fontWeight = '600';
      a.textContent = child.title;
      if (opts.onMobileLinkClick) a.addEventListener('click', opts.onMobileLinkClick);
      list.appendChild(a);
    });

    trigger.addEventListener('click', () => group.classList.toggle('open'));

    group.appendChild(trigger);
    group.appendChild(list);
    return group;
  }

  // Sections matching this slug/title pattern are surfaced via the dedicated
  // /news.html link in the static nav, so we skip them here to avoid duplicates.
  const NEWS_RE = /news|xabar|yangilik/i;
  const isNewsSection = (s) => NEWS_RE.test(s?.slug || '') || NEWS_RE.test(s?.title || '');

  function render({ rootSections, desktopNav, mobileNav, desktopAnchor, mobileAnchor, activeSlug = null, onMobileLinkClick = null }) {
    const opts = { activeSlug, onMobileLinkClick };
    const list = (Array.isArray(rootSections) ? rootSections : []).filter(s => !isNewsSection(s));

    if (desktopNav) {
      desktopNav.querySelectorAll('.dynamic-section-link').forEach(el => el.remove());
      list.forEach(section => {
        const hasChildren = (section.children || []).length > 0;
        let node;
        if (hasChildren) {
          node = buildDesktopDropdown(section, opts);
        } else {
          node = document.createElement('a');
          node.href = `section.html?slug=${encodeURIComponent(section.slug)}`;
          node.className = 'nav-link dynamic-section-link';
          if (activeSlug && section.slug === activeSlug) node.classList.add('active');
          node.textContent = section.title;
        }
        desktopNav.insertBefore(node, desktopAnchor);
      });
    }

    if (mobileNav) {
      mobileNav.querySelectorAll('.dynamic-section-link').forEach(el => el.remove());
      list.forEach(section => {
        const hasChildren = (section.children || []).length > 0;
        let node;
        if (hasChildren) {
          node = buildMobileGroup(section, opts);
        } else {
          node = document.createElement('a');
          node.href = `section.html?slug=${encodeURIComponent(section.slug)}`;
          node.className = 'mobile-nav-link dynamic-section-link';
          if (activeSlug && section.slug === activeSlug) node.classList.add('active');
          node.textContent = section.title;
          if (onMobileLinkClick) node.addEventListener('click', onMobileLinkClick);
        }
        mobileNav.insertBefore(node, mobileAnchor);
      });
    }

    bindGlobalCloseHandler();
  }

  let globalHandlerBound = false;
  function bindGlobalCloseHandler() {
    if (globalHandlerBound) return;
    globalHandlerBound = true;
    // Click anywhere outside an open dropdown closes it.
    document.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-dropdown.open').forEach(d => {
        if (!d.contains(e.target)) {
          d.classList.remove('open');
          d.querySelector('.nav-dropdown-trigger')?.setAttribute('aria-expanded', 'false');
        }
      });
    });
    // Escape key closes any open dropdown (keyboard accessibility).
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.nav-dropdown.open').forEach(d => {
          d.classList.remove('open');
          d.querySelector('.nav-dropdown-trigger')?.setAttribute('aria-expanded', 'false');
        });
      }
    });
  }

  return { render };
})();

// Motion enhancements — parallax, counter animation, smooth hover micro-interactions.
// Intentionally vanilla, dependency-free, GPU-friendly. Honors prefers-reduced-motion.
(() => {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─────────── Parallax: translates [data-parallax] elements with scroll ─────────── */
  const parallaxNodes = Array.from(document.querySelectorAll('[data-parallax]'));
  let rafId = null;
  let lastY = 0;

  const updateParallax = () => {
    const vh = window.innerHeight;
    parallaxNodes.forEach((el) => {
      const speed = parseFloat(el.dataset.parallax) || 0.2;
      const rect = el.getBoundingClientRect();
      // distance from viewport center (normalized to ~ -1..+1)
      const offset = (rect.top + rect.height / 2 - vh / 2) / vh;
      const ty = -offset * speed * 80; // px
      el.style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0) scale(1.05)`;
    });
    rafId = null;
  };

  const onScroll = () => {
    if (reduce) return;
    if (rafId !== null) return;
    lastY = window.scrollY;
    rafId = requestAnimationFrame(updateParallax);
  };

  if (parallaxNodes.length && !reduce) {
    updateParallax();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  /* ─────────── Animated counters: [data-counter="500"] data-counter-suffix="+" ─────────── */
  const formatNumber = (n) => {
    // Insert thin spaces every 3 digits for readability (matches existing "5 000+" style).
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const animateCounter = (el) => {
    const target = parseFloat(el.dataset.counter);
    if (!Number.isFinite(target)) return;
    const suffix = el.dataset.counterSuffix || '';
    if (reduce) {
      el.textContent = formatNumber(target) + suffix;
      return;
    }
    const duration = 1600;
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3); // cubic-out

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = formatNumber(target * ease(t)) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const counters = document.querySelectorAll('[data-counter]');
  if (counters.length) {
    // Reset to 0 visually so the count-up is always perceived
    counters.forEach((c) => {
      const suffix = c.dataset.counterSuffix || '';
      c.textContent = '0' + suffix;
    });
    if ('IntersectionObserver' in window) {
      const cio = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            animateCounter(e.target);
            cio.unobserve(e.target);
          }
        });
      }, { threshold: 0.15 });
      counters.forEach((c) => cio.observe(c));
    } else {
      counters.forEach(animateCounter);
    }
  }

  /* ─────────── Subtle pointer glow on hovered hero illustration ─────────── */
  document.querySelectorAll('.hero-illustration').forEach((el) => {
    if (reduce) return;
    el.addEventListener('mousemove', (ev) => {
      const r = el.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width) * 100;
      const y = ((ev.clientY - r.top) / r.height) * 100;
      el.style.setProperty('--mx', x + '%');
      el.style.setProperty('--my', y + '%');
    });
  });
})();

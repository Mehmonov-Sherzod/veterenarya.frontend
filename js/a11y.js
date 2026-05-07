// Accessibility controls: font-size step (default → lg → xl → default) and high-contrast toggle.
// Persisted to localStorage so visitors keep their preferred settings across pages.
(function () {
  const STEP_KEY = 'vetsafe_fontstep';
  const HC_KEY   = 'vetsafe_hc';
  const STEPS = ['', 'fs-lg', 'fs-xl'];
  const STEP_LABELS = ['A', 'A+', 'A++'];

  function applyFontStep(idx) {
    const root = document.documentElement;
    STEPS.forEach(c => { if (c) root.classList.remove(c); });
    if (STEPS[idx]) root.classList.add(STEPS[idx]);
    const label = document.querySelector('#a11y-fontsize-btn span[data-i18n="utility.fontsize"]');
    if (label) label.textContent = STEP_LABELS[idx];
    const btn = document.getElementById('a11y-fontsize-btn');
    if (btn) btn.setAttribute('aria-pressed', idx > 0 ? 'true' : 'false');
  }

  function applyHighContrast(on) {
    document.documentElement.classList.toggle('hc-mode', !!on);
    const btn = document.getElementById('a11y-contrast-btn');
    if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function init() {
    const fontStep = parseInt(localStorage.getItem(STEP_KEY) || '0', 10);
    const hc = localStorage.getItem(HC_KEY) === '1';
    applyFontStep(Number.isFinite(fontStep) ? Math.max(0, Math.min(2, fontStep)) : 0);
    applyHighContrast(hc);

    const fsBtn = document.getElementById('a11y-fontsize-btn');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        const cur = parseInt(localStorage.getItem(STEP_KEY) || '0', 10);
        const next = (cur + 1) % STEPS.length;
        localStorage.setItem(STEP_KEY, String(next));
        applyFontStep(next);
      });
    }

    const hcBtn = document.getElementById('a11y-contrast-btn');
    if (hcBtn) {
      hcBtn.addEventListener('click', () => {
        const next = localStorage.getItem(HC_KEY) !== '1';
        localStorage.setItem(HC_KEY, next ? '1' : '0');
        applyHighContrast(next);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

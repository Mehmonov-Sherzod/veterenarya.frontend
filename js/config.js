// Frontend configuration. Resolves the API base URL automatically:
//   • If you serve the page from the same origin as the API (e.g. when the API
//     hosts the static frontend), API_BASE_URL == window.location.origin.
//   • If served from localhost:5500 / file://, fall back to the local dev API
//     on http://localhost:5035.
//   • Override via window.__API_BASE_URL__ before this script loads, OR ship
//     a js/config.local.js (gitignored) that overwrites window.AppConfig.
(function () {
  const inferredBase = (() => {
    if (typeof window === 'undefined' || !window.location) return '';
    if (window.__API_BASE_URL__) return window.__API_BASE_URL__;

    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '';
    if (isLocal) return 'http://localhost:5035';

    // Same-origin in production (recommended: serve frontend behind a reverse
    // proxy that forwards /api/v1 to the backend).
    return window.location.origin;
  })();

  window.AppConfig = {
    API_BASE_URL: inferredBase,
    DEFAULT_LANGUAGE: 'uz',
    LANGUAGE_STORAGE_KEY: 'vetcare_lang',
    PAGE_SIZE: 50
  };
})();

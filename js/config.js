// Frontend configuration. Adjust API_BASE_URL when deploying behind a proxy or to a different host.
window.AppConfig = {
  // Backend API base URL (no trailing slash).
  API_BASE_URL: 'http://localhost:5035',

  // Default UI language ('uz' | 'ru' | 'en').
  DEFAULT_LANGUAGE: 'uz',

  // localStorage key for persisting the user's language choice.
  LANGUAGE_STORAGE_KEY: 'vetcare_lang',

  // Page size when fetching contents.
  PAGE_SIZE: 50
};

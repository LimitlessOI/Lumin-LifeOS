(function () {
  const STORAGE_KEY = 'lifeos_theme';

  function normalizeTheme(theme) {
    return theme === 'light' ? 'light' : 'dark';
  }

  function preferredTheme() {
    const paramsTheme = new URLSearchParams(window.location.search).get('theme');
    const storedTheme = localStorage.getItem(STORAGE_KEY);
    return normalizeTheme(paramsTheme || storedTheme || 'dark');
  }

  function applyTheme(theme) {
    const nextTheme = normalizeTheme(theme || preferredTheme());
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem(STORAGE_KEY, nextTheme);

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.setAttribute('content', nextTheme === 'light' ? '#f6f7fb' : '#0a0a0f');
    }
    return nextTheme;
  }

  applyTheme();

  window.addEventListener('message', (event) => {
    if (event?.data?.type === 'lifeos-theme') applyTheme(event.data.theme);
  });

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) applyTheme(event.newValue);
  });

  window.__lifeosTheme = {
    get() {
      return preferredTheme();
    },
    set(theme) {
      return applyTheme(theme);
    },
  };
})();

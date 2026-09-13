;(function () {
  try {
    const stored = localStorage.getItem('aegis-theme');
    const mode =
      stored === 'light' || stored === 'dark' || stored === 'system'
        ? stored
        : 'dark';
    const prefersDark =
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
  } catch {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }
})();

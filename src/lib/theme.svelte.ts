// src/lib/theme.svelte.ts
// Global dark/light mode state with persistence

function createTheme() {
  let dark = $state(false);

  function init() {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('etest_theme');
    dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    apply();
  }

  function apply() {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', dark);
  }

  function toggle() {
    dark = !dark;
    localStorage.setItem('etest_theme', dark ? 'dark' : 'light');
    apply();
  }

  return {
    get dark() { return dark; },
    init,
    toggle,
  };
}

export const theme = createTheme();

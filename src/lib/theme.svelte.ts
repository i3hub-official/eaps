// src/lib/theme.svelte.ts
// Shared reactive theme state using Svelte 5 runes

let theme = $state<'light' | 'dark'>('light');

export function getTheme() {
  return theme;
}

export function initTheme() {
  if (typeof localStorage === 'undefined') return;
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  theme = (saved === 'dark' || (!saved && prefersDark)) ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
}

export function toggleTheme() {
  theme = theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}
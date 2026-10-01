import { useSyncExternalStore } from 'react';

// Per-device UI preferences (theme + mobile tab bar), kept in localStorage until the user changes them
const THEME_KEY = 'app_theme';
const TABS_KEY = 'app_mobile_tabs';
const CHANGE_EVENT = 'app-preferences-change';

export const THEMES = ['light', 'dark'];
export const MAX_MOBILE_TABS = 4;
export const DEFAULT_MOBILE_TABS = ['/dashboard', '/dashboard/brides', '/dashboard/dresses', '/dashboard/finance'];

const THEME_COLORS = { light: '#ffffff', dark: '#000000' };

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode); the change still applies for this session
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getTheme() {
  const value = read(THEME_KEY);
  return THEMES.includes(value) ? value : 'light';
}

export function applyTheme(theme = getTheme()) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
}

export function setTheme(theme) {
  if (!THEMES.includes(theme)) return;
  write(THEME_KEY, theme);
  applyTheme(theme);
}

// Returned as a string so useSyncExternalStore gets a stable snapshot
function getTabsSnapshot() {
  return read(TABS_KEY) || '';
}

export function parseMobileTabs(raw) {
  try {
    const paths = JSON.parse(raw);
    if (Array.isArray(paths) && paths.every((p) => typeof p === 'string')) {
      return paths.slice(0, MAX_MOBILE_TABS);
    }
  } catch {
    // Fall through to defaults
  }
  return DEFAULT_MOBILE_TABS;
}

export function setMobileTabs(paths) {
  write(TABS_KEY, JSON.stringify(paths.slice(0, MAX_MOBILE_TABS)));
}

function subscribe(callback) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function useTheme() {
  return useSyncExternalStore(subscribe, getTheme);
}

export function useMobileTabs() {
  return parseMobileTabs(useSyncExternalStore(subscribe, getTabsSnapshot));
}

/* ==========================================================================
   PC PLUG — Light / Dark theme toggle
   Light mode is the default. Preference persists in localStorage.
   NOTE: the actual theme is applied earlier by an inline snippet in <head>
   (before CSS loads) to avoid a flash of the wrong theme — this file only
   wires up the toggle button and keeps it in sync.
   ========================================================================== */

const THEME_KEY = "pc_plug_theme";

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) || "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  const btn = document.getElementById("themeToggle");
  if (btn) {
    btn.textContent = theme === "dark" ? "☀️" : "🌙";
    btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    btn.title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(current === "dark" ? "light" : "dark");
}

function initThemeToggle() {
  applyTheme(getStoredTheme());
  const btn = document.getElementById("themeToggle");
  if (btn) btn.addEventListener("click", toggleTheme);
}

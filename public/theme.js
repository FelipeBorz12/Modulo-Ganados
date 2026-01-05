// public/theme.js
(() => {
  const KEY = "ganados_theme";

  function applyTheme(theme) {
    const root = document.documentElement;
    const isDark = theme === "dark";
    root.classList.toggle("dark", isDark);

    // (Opcional) Ajustar theme-color del navegador
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute("content", isDark ? "#121121" : "#5048e5");

    // Actualiza UI del botón si existe
    const btn = document.getElementById("btn-theme");
    const icon = document.getElementById("theme-icon");
    const label = document.getElementById("theme-label");

    if (btn && icon) {
      icon.textContent = isDark ? "dark_mode" : "light_mode";
    }
    if (btn && label) {
      label.textContent = isDark ? "Oscuro" : "Claro";
    }

    // (Opcional) accesibilidad
    document.body?.setAttribute("data-theme", isDark ? "dark" : "light");
  }

  function getSavedTheme() {
    const saved = localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") return saved;

    // default: respeta sistema
    const prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  }

  function toggleTheme() {
    const current = document.documentElement.classList.contains("dark") ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem(KEY, next);
    applyTheme(next);
  }

  // Aplica tema lo antes posible
  const initial = getSavedTheme();
  applyTheme(initial);

  // Enlaza botón si existe
  window.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btn-theme");
    if (btn) btn.addEventListener("click", toggleTheme);
  });
})();

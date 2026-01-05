// public/tw-config.js
window.tailwind = window.tailwind || {};
window.tailwind.config = window.tailwind.config || {};

window.tailwind.config = {
  ...window.tailwind.config,
  darkMode: "class",
  theme: {
    ...(window.tailwind.config.theme || {}),
    extend: {
      ...(window.tailwind.config.theme?.extend || {}),

      colors: {
        ...(window.tailwind.config.theme?.extend?.colors || {}),
        primary: "#5048e5",
        "background-light": "#f6f6f8",
        "background-dark": "#121121",
        "surface-light": "#ffffff",
        "surface-dark": "#1e1d2b",
        "surface-dark-2": "#252433",
        "border-dark": "#382929",
      },

      fontFamily: {
        ...(window.tailwind.config.theme?.extend?.fontFamily || {}),
        display: ["Inter", "sans-serif"],
      },

      borderRadius: {
        ...(window.tailwind.config.theme?.extend?.borderRadius || {}),
        DEFAULT: "1rem",
        lg: "1.5rem",
        xl: "2rem",
        "2xl": "2.5rem",
        full: "9999px",
      },

      boxShadow: {
        ...(window.tailwind.config.theme?.extend?.boxShadow || {}),
        card: "0 20px 40px rgba(15, 23, 42, 0.18)",
      },
    },
  },
};

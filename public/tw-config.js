// public/tw-config.js
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#4F46E5',  // morado principal
          dark: '#4338CA',
        },
      },
      boxShadow: {
        card: '0 20px 40px rgba(15, 23, 42, 0.18)',
      },
    },
  },
};

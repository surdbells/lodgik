/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{css,xml,html,vue,svelte,ts,tsx}'],
  darkMode: ['class', '.ns-dark'],
  theme: {
    extend: {
      colors: {
        // ── Lodgik Sage (matches web exactly) ──────────────────
        sage: {
          50:  '#f4f7f4',
          100: '#e4ede4',
          200: '#c9dac9',
          300: '#a3bfa3',
          400: '#7a9e7a',
          500: '#5a825a',
          600: '#466846',
          700: '#3a543a',
          800: '#314431',
          900: '#293929',
        },
        // ── Accent (amber) ──────────────────────────────────────
        accent: {
          50:  '#fffbeb',
          100: '#fef3c7',
          500: '#f79009',
          600: '#dc6803',
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // NativeScript — no browser resets
  },
};

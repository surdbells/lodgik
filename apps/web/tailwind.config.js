/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./projects/admin/src/**/*.{html,ts}",
    "./projects/hotel/src/**/*.{html,ts}",
    "./projects/shared/src/**/*.{html,ts}",
    "./projects/charts/src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  'var(--lodgik-primary-50, #eff6ff)',
          100: 'var(--lodgik-primary-100, #dbeafe)',
          500: 'var(--lodgik-primary-500, #3b82f6)',
          600: 'var(--lodgik-primary-600, #2563eb)',
          700: 'var(--lodgik-primary-700, #1d4ed8)',
          900: 'var(--lodgik-primary-900, #1e3a5f)',
        },
        accent: {
          500: 'var(--lodgik-accent-500, #f59e0b)',
          600: 'var(--lodgik-accent-600, #d97706)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

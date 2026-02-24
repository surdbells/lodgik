/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./projects/admin/src/**/*.{html,ts}",
    "./projects/hotel/src/**/*.{html,ts}",
    "./projects/merchant/src/**/*.{html,ts}",
    "./projects/shared/src/**/*.{html,ts}",
    "./projects/charts/src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
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
        primary: {
          50:  'var(--lodgik-primary-50, #f4f7f4)',
          100: 'var(--lodgik-primary-100, #e4ede4)',
          500: 'var(--lodgik-primary-500, #5a825a)',
          600: 'var(--lodgik-primary-600, #466846)',
          700: 'var(--lodgik-primary-700, #3a543a)',
          900: 'var(--lodgik-primary-900, #293929)',
        },
        accent: {
          500: 'var(--lodgik-accent-500, #f79009)',
          600: 'var(--lodgik-accent-600, #dc6803)',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0px 1px 3px rgba(16, 24, 40, 0.06), 0px 1px 2px rgba(16, 24, 40, 0.04)',
        'card-hover': '0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06)',
      },
    },
  },
  plugins: [],
};

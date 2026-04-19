import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // LeaderSmart brand palette — inherits from ChurchSmart warmth
        brand: {
          50: '#eef4ff',
          100: '#dbe6ff',
          200: '#bdcfff',
          300: '#92adff',
          400: '#677fff',
          500: '#4255ff',
          600: '#2a36f0',
          700: '#1e3a8a', // primary — deep trust blue
          800: '#1e3470',
          900: '#1e2a5a',
        },
        flame: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#d97706', // accent — warm orange, kept from Fire Church
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        ink: '#111827',
        body: '#374151',
        muted: '#6b7280',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px 0 rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;

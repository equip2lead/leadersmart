import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // v2 primary — Royal Indigo. 1:1 mirror of Tailwind's built-in
        // indigo scale so `indigo-royal-700` = #4338CA exactly matches
        // the spec anchor. Any component reaching for the primary brand
        // colour uses `indigo-royal-*`; the old navy `brand-*` scale is
        // gone.
        'indigo-royal': {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca', // spec anchor — Royal Indigo
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        // v2 accent — Warm Gold. Shifted from Tailwind amber so that
        // `gold-warm-600` renders #F59E0B (Tailwind amber-500). The old
        // `flame-*` scale mapped `-600` to a darker #d97706; the pivot
        // brings the same slot forward to the brighter spec anchor.
        // The 500/600 stops intentionally share #F59E0B so either class
        // hits the spec colour.
        'gold-warm': {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // spec anchor
          600: '#f59e0b', // spec anchor (shifted from Tailwind amber-600)
          700: '#d97706',
          800: '#b45309',
          900: '#92400e',
        },
        // Semantic single-value tokens.
        midnight: '#111827', // gray-900 alias — headings + high-contrast text
        ink: '#111827',
        body: '#374151',
        muted: '#6b7280',
      },
      // Semantic backgrounds live as arbitrary Tailwind classes rather
      // than named tokens so the intent is legible at the callsite:
      //   bg-[#F8FAFC] — cool surface
      //   bg-[#FFFDF7] — warm surface
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

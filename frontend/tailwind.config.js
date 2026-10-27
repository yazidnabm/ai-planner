/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Light
        canvas: '#FAF9F7',
        surface: '#FFFFFF',
        ink: '#1A1A1A',
        muted: '#6B6863',
        line: '#E5E3DE',
        // Dark
        'canvas-dark': '#101312',
        'surface-dark': '#181B1A',
        'surface-2-dark': '#202423',
        'ink-dark': '#E7E5E4',
        'muted-dark': '#9BA19E',
        'line-dark': '#2A2F2E',
        // Accent (teal/emerald)
        accent: {
          DEFAULT: '#0D9488',
          hover: '#0F766E',
          soft: '#CCFBF1',
          'soft-dark': '#134E4A',
        },
        // Priority (semantic)
        'prio-high': '#DC2626',
        'prio-medium': '#D97706',
        'prio-low': '#6B7280',
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};

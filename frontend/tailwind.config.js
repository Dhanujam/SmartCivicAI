/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans Tamil"', 'Inter', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        civic: {
          50: '#f0fdf4',
          100: '#e0f2fe',
          200: '#bae6fd',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          navy: '#0f172a',
          dark: '#1e293b',
          body: '#475569',
          muted: '#64748b',
          subtle: '#94a3b8',
          border: '#e2e8f0',
          'border-strong': '#cbd5e1',
          bg: '#f8fafc',
          card: '#ffffff',
          'soft-blue': '#eff6ff',
          'soft-gray': '#f1f5f9',
        },
      },
      boxShadow: {
        'civic': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        'civic-md': '0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
        'civic-lg': '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
}

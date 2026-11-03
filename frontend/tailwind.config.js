/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0f2e2a', 800: '#16403a', 700: '#1f5249', 600: '#2c6a5e', 300: '#8fb0a8', 100: '#dbe6e3' },
        chalk: { DEFAULT: '#eef1ef', 200: '#e1e6e3', 300: '#cfd7d3' },
        bus: { DEFAULT: '#f4b400', 600: '#d99f00', 100: '#fdf0c6' },
        board: { DEFAULT: '#2b59c3', 100: '#dfe8fb' },
        ok: { DEFAULT: '#1c8c63', 100: '#d9f1e7' },
        bad: { DEFAULT: '#d1433a', 100: '#fbe1de' },
      },
      fontFamily: {
        display: ['"Schibsted Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl: '0.875rem' },
    },
  },
  plugins: [],
};

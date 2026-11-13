/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'], sans: ['"DM Sans"', 'system-ui', 'sans-serif'] },
      colors: {
        brand: { 50: '#eefaff', 100: '#d9f2ff', 200: '#bce8ff', 300: '#8ddbff', 400: '#52c3fb', 500: '#2aa6f2', 600: '#1488d8', 700: '#126db0', 800: '#145a90', 900: '#154c77', 950: '#0b2239' },
        foam: '#f3fafc',
        lemon: { 300: '#ffe27a', 400: '#ffd84d', 500: '#fbc41f' },
      },
      boxShadow: { soft: '0 1px 2px rgba(11,34,57,.05), 0 8px 24px -12px rgba(11,34,57,.18)' },
    },
  },
  plugins: [],
};

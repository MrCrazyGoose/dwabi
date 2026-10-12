/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}', './shared/**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        eco: {
          50: '#effaf3',
          100: '#d8f3e1',
          200: '#b3e5c6',
          300: '#80d1a4',
          400: '#4bb67e',
          500: '#289a62',
          600: '#1b7c4e',
          700: '#166341',
          800: '#144f36',
          900: '#12412e',
        },
      },
    },
  },
  plugins: [],
};

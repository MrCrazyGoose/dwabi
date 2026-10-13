/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}', './shared/**/*.js'],
  theme: {
    // Bin-label signage: square corners everywhere.
    borderRadius: { none: '0', DEFAULT: '0', full: '9999px' },
    extend: {
      fontFamily: {
        sans: ['Barlow', 'Arial', 'sans-serif'],
        display: ['"Barlow Condensed"', '"Arial Narrow"', 'Arial', 'sans-serif'],
        // Stencil lettering, like the paint on bins and trucks. Logo and headlines only.
        stencil: ['"Big Shoulders Stencil Display"', '"Barlow Condensed"', '"Arial Narrow"', 'sans-serif'],
      },
      colors: {
        paper: '#F3F0E8', // page background, like unbleached card stock
        ink: '#141414',
        bin: '#1C4FA0', // county blue bin
        kraft: '#C9A46B', // cardboard
        hazard: '#F5C400',
        stop: '#C62828',
        leaf: '#2E6B34',
        plum: '#5B3E8E',
        rust: '#B5541B',
        ash: '#5E5E5A',
      },
      borderWidth: { 3: '3px' },
    },
  },
  plugins: [],
};

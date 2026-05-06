/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy:  '#0D2340',
        blue:  '#1A6B9A',
        teal:  '#0E9E8E',
        sky:   '#E8F4FA',
        mint:  '#E6F7F5',
        paper: '#F7F9FB',
        ink:   '#0D1B2A',
        mid:   '#4A6070',
        muted: '#7A92A3',
        line:  '#DDE4EA',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'monospace'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}

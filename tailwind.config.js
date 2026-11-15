/** Colour tokens come from docs/design-plan.md. White text only on blue-600 or darker. */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sky: { 50: '#F3F9FD', 100: '#DCEEFA', 300: '#9FD0F0' },
        blue: { 600: '#1F6FB2', 800: '#14487A' },
        ink: '#0F2233',
        sun: { 400: '#F5B800' },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      maxWidth: { content: '1200px' },
    },
  },
  plugins: [],
}

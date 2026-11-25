/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/**/*.{html,js,ts,jsx,tsx,vue}'
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--app-font)', 'system-ui', 'sans-serif']
      },
      colors: {
        note: {
          bg: 'var(--note-bg)',
          fg: 'var(--note-fg)',
          bar: 'var(--bar-bg)',
          barFg: 'var(--bar-fg)'
        }
      }
    }
  },
  plugins: []
}


/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf8f3',
          100: '#faebe2',
          200: '#f5d6c5',
          300: '#ebb899',
          400: '#e09068',
          500: '#d67244',
          600: '#c45a33',
          700: '#a0452a',
          800: '#82392a',
          900: '#6b3026',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}
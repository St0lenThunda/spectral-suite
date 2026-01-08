/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'music-bg': '#0f172a',
        'music-accent': '#38bdf8',
      },
    },
  },
  plugins: [],
}

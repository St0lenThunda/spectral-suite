/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  presets: [
    require( '../../packages/core/tailwind.preset.js' )
  ],
  theme: {
    extend: {
      colors: {
        'music-bg': '#0f172a',
        'music-accent': '#38bdf8',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
      },
    },
  },
  plugins: [],
}

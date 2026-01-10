/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        spectral: {
          950: 'var(--color-spectral-950)',
          900: 'var(--color-spectral-900)',
          800: 'var(--color-spectral-800)',
        },
        glass: {
          surface: 'var(--color-glass-surface)',
          border: 'var(--color-glass-border)',
          highlight: 'var(--color-glass-highlight)',
        },
        accent: {
          primary: 'var(--color-accent-primary)',
          secondary: 'var(--color-accent-secondary)',
          tertiary: 'var(--color-accent-tertiary)',
        }
      }
    }
  }
}

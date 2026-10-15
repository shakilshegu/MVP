/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Every colour is a theme variable (see index.css), so dark mode is just a different set of values.
      colors: {
        forest: { DEFAULT: 'rgb(var(--c-forest) / <alpha-value>)', 700: 'rgb(var(--c-forest-700) / <alpha-value>)', 600: 'rgb(var(--c-forest-600) / <alpha-value>)', 100: 'rgb(var(--c-forest-100) / <alpha-value>)', 50: 'rgb(var(--c-forest-50) / <alpha-value>)' },
        sage: { DEFAULT: 'rgb(var(--c-sage) / <alpha-value>)', dark: 'rgb(var(--c-sage-dark) / <alpha-value>)' },
        bark: { DEFAULT: 'rgb(var(--c-bark) / <alpha-value>)', 50: 'rgb(var(--c-bark-50) / <alpha-value>)' },
        paper: 'rgb(var(--c-paper) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        inverse: 'rgb(var(--c-inverse) / <alpha-value>)',
        note: 'rgb(var(--c-note) / <alpha-value>)',
        danger: { DEFAULT: 'rgb(var(--c-danger) / <alpha-value>)', 50: 'rgb(var(--c-danger-50) / <alpha-value>)' },
        warn: { DEFAULT: 'rgb(var(--c-warn) / <alpha-value>)', 50: 'rgb(var(--c-warn-50) / <alpha-value>)' },
        morning: { DEFAULT: 'rgb(var(--c-morning) / <alpha-value>)', ink: 'rgb(var(--c-morning-ink) / <alpha-value>)' },
        day: { DEFAULT: 'rgb(var(--c-day) / <alpha-value>)', ink: 'rgb(var(--c-day-ink) / <alpha-value>)' },
        evening: { DEFAULT: 'rgb(var(--c-evening) / <alpha-value>)', ink: 'rgb(var(--c-evening-ink) / <alpha-value>)' },
        night: { DEFAULT: 'rgb(var(--c-night) / <alpha-value>)', ink: 'rgb(var(--c-night-ink) / <alpha-value>)' },
        bar: 'rgb(var(--c-bar) / <alpha-value>)',
        service: 'rgb(var(--c-service) / <alpha-value>)',
        kitchen: 'rgb(var(--c-kitchen) / <alpha-value>)',
        rain: 'rgb(var(--c-rain) / <alpha-value>)',
      },
      ringOffsetColor: { DEFAULT: 'rgb(var(--c-surface) / <alpha-value>)' },
      fontFamily: {
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      keyframes: {
        pop: { from: { opacity: '0', transform: 'translateY(4px) scale(.98)' }, to: { opacity: '1', transform: 'none' } },
        slide: { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
        'slide-left': { from: { transform: 'translateX(-100%)' }, to: { transform: 'none' } },
        rise: { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
        draw: { from: { strokeDashoffset: '48' }, to: { strokeDashoffset: '0' } },
      },
      animation: {
        pop: 'pop .16s ease-out',
        slide: 'slide .22s cubic-bezier(.2,.8,.2,1)',
        'slide-left': 'slide-left .22s cubic-bezier(.2,.8,.2,1)',
        rise: 'rise .22s cubic-bezier(.2,.8,.2,1)',
        draw: 'draw .6s .15s ease-out both',
      },
    },
  },
  plugins: [],
}

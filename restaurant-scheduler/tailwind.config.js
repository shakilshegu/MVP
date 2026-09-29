/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: '#1E4034', 700: '#163026', 600: '#2A5646', 100: '#DCE8E0', 50: '#EEF3EF' },
        sage: { DEFAULT: '#DDE5DE', dark: '#C4CEC7' },
        bark: { DEFAULT: '#54302C', 50: '#F6EEEC' },
        paper: '#F7F8F6',
        ink: '#17221D',
        muted: '#626C66',
        line: '#E2E7E3',
        danger: { DEFAULT: '#B42318', 50: '#FDEDEB' },
        warn: { DEFAULT: '#8A5300', 50: '#FFF4DC' },
        morning: { DEFAULT: '#F4E3AE', ink: '#654A08' },
        day: { DEFAULT: '#D2E6D8', ink: '#1E4034' },
        evening: { DEFAULT: '#EDD5CC', ink: '#54302C' },
        night: { DEFAULT: '#D6DAEA', ink: '#2C3457' },
        bar: '#B7791F',
        service: '#2F7A64',
        kitchen: '#8A4B42',
      },
      fontFamily: {
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      keyframes: {
        pop: { from: { opacity: '0', transform: 'translateY(4px) scale(.98)' }, to: { opacity: '1', transform: 'none' } },
        slide: { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
        rise: { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
        draw: { from: { strokeDashoffset: '48' }, to: { strokeDashoffset: '0' } },
      },
      animation: {
        pop: 'pop .16s ease-out',
        slide: 'slide .22s cubic-bezier(.2,.8,.2,1)',
        rise: 'rise .22s cubic-bezier(.2,.8,.2,1)',
        draw: 'draw .6s .15s ease-out both',
      },
    },
  },
  plugins: [],
}

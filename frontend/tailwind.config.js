/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        /* Zip semantic tokens (aliases for cinematic UI) */
        primary: '#e50914',
        background: '#08080c',
        muted: '#94a3b8',
        brand: {
          black: '#050505',
          dark: '#0b0b0b',
          red: '#E50914',
          redHover: '#B20710',
          surface: '#121212',
          border: '#2a2a2a'
        },
        /* Zip-inspired cinematic palette (home / rails) */
        app: {
          bg: '#08080c',
          surface: '#12121a',
          surfaceElevated: '#1a1a24',
          accent: '#00f2ff',
        },
        surface: {
          DEFAULT: '#12121a',
          elevated: '#1a1a24',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        inter: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
}

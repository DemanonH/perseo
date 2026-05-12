/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#F5A623',
          50:  '#FEF3DC',
          100: '#FDE9BA',
          200: '#FBD275',
          300: '#F9BB30',
          400: '#F5A623',
          500: '#D4880A',
          600: '#A36908',
          700: '#724906',
          800: '#412904',
          900: '#100A01',
        },
        surface: {
          DEFAULT: '#141414',
          50:  '#2a2a2a',
          100: '#1f1f1f',
          200: '#141414',
          300: '#0f0f0f',
          400: '#0a0a0a',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
};

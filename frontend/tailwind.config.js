/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        fintech: {
          bright: '#0070E0',
          cyan: '#009CDE',
          vibrant: '#0064D2',
          deep: '#002C6C',
          navy: '#001C3D',
          midnight: '#001124',
          slate: '#F5F7FA',
        },
        pals: {
          50: '#F0F7FD',
          100: '#E0EFFB',
          200: '#B9DCF7',
          300: '#7DC0F1',
          400: '#38A0E9',
          500: '#0079C1',
          600: '#005E99',
          700: '#00457C',
          800: '#003058',
          900: '#002038',
          950: '#001324',
        },
      },
      fontFamily: {
        sans: ['"Times New Roman"', 'Times', 'Georgia', 'serif'],
        serif: ['"Times New Roman"', 'Times', 'Georgia', 'serif'],
        mono: ['"Times New Roman"', 'Times', 'Georgia', 'serif'],
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        card: '0 10px 30px -5px rgba(0, 28, 61, 0.08), 0 4px 12px -2px rgba(0, 28, 61, 0.04)',
        'card-hover': '0 25px 50px -12px rgba(0, 44, 108, 0.18), 0 8px 24px -4px rgba(0, 44, 108, 0.08)',
        float: '0 20px 40px -10px rgba(0, 112, 224, 0.35)',
        pill: '0 8px 20px -4px rgba(0, 28, 61, 0.25)',
      },
      animation: {
        'mascot-bob': 'bob 3s ease-in-out infinite',
        'mascot-blink': 'blink 4s infinite',
        'float-slow': 'float 6s ease-in-out infinite',
        'float-reverse': 'floatRev 7s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 2.5s ease-in-out infinite',
      },
      keyframes: {
        bob: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        blink: {
          '0%, 90%, 100%': { transform: 'scaleY(1)' },
          '95%': { transform: 'scaleY(0.1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-12px) rotate(2deg)' },
        },
        floatRev: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(10px) rotate(-2deg)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(0.98)' },
        },
      },
    },
  },
  plugins: [],
};

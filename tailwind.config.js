/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        ink: '#181713',
        paper: '#f5efe4',
        signal: '#d9532f',
        signalDark: '#b84323',
      },
      fontFamily: {
        display: ['"Poppins"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        body: ['"Poppins"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
        poppins: ['"Poppins"', 'sans-serif'],
      },
      keyframes: {
        revealUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        revealRight: {
          '0%': { opacity: '0', transform: 'translateX(-22px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -8px, 0)' },
        },
      },
      animation: {
        revealUp: 'revealUp 650ms cubic-bezier(0.22, 1, 0.36, 1) both',
        revealRight: 'revealRight 750ms cubic-bezier(0.22, 1, 0.36, 1) both',
        drift: 'drift 5.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

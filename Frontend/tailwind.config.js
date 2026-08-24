/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070b14',
          900: '#0a0f1c',
          850: '#0c1322',
          800: '#0f1726',
          750: '#121c30',
          700: '#16213a',
          600: '#1c2a48',
          500: '#243456',
          400: '#324366',
        },
        accent: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        signal: {
          low: '#10b981',
          moderate: '#f59e0b',
          high: '#fb7185',
          critical: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(34,211,238,0.18), 0 8px 30px rgba(8,145,178,0.18)',
        'glow-sm': '0 0 0 1px rgba(34,211,238,0.14), 0 4px 16px rgba(8,145,178,0.14)',
        panel: '0 10px 40px -10px rgba(0,0,0,0.6)',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        flowDash: {
          to: { strokeDashoffset: '-40' },
        },
        floatY: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        spinSlow: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        pulseGlow: 'pulseGlow 2.4s ease-in-out infinite',
        flowDash: 'flowDash 1.2s linear infinite',
        floatY: 'floatY 5s ease-in-out infinite',
        fadeIn: 'fadeIn 0.4s ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
        spinSlow: 'spinSlow 8s linear infinite',
      },
    },
  },
  plugins: [],
};

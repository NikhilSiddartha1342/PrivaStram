/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#090D16',
        surface: {
          50: '#151D2F',
          100: '#111827',
          200: '#0E1422',
          300: '#090D16',
        },
        cyber: {
          cyan: '#00F0FF',
          blue: '#2563EB',
          emerald: '#00E599',
          crimson: '#FF3366',
          amber: '#FFB800',
          purple: '#8B5CF6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -5px rgba(0, 240, 255, 0.35)',
        'glow-emerald': '0 0 20px -5px rgba(0, 229, 153, 0.35)',
        'glow-crimson': '0 0 20px -5px rgba(255, 51, 102, 0.35)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 4s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(0.98)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        }
      }
    },
  },
  plugins: [],
}

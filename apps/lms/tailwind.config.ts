import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 900: '#111110', 800: '#1C1B19', 700: '#292723', 600: '#39352F' },
        stone: { 500: '#665F54', 400: '#938A7C', 300: '#B8AFA1' },
        paper: { 200: '#E8E3D9', 100: '#F3F0E9' },
        bronze: { 500: '#B18A68', 400: '#C39B7B' },
        state: { success: '#6F7D5E', warning: '#A98B4A', danger: '#8C5A4E' },
      },
      borderColor: { DEFAULT: 'rgba(102, 95, 84, 0.25)', dark: 'rgba(243, 240, 233, 0.08)' },
      fontFamily: {
        serif: ['var(--font-serif)', '"Shippori Mincho"', '"Noto Serif JP"', 'serif'],
        sans: ['var(--font-sans)', '"Noto Sans JP"', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: { wide: '0.04em', wider: '0.08em', widest: '0.16em' },
      borderRadius: { DEFAULT: '2px', md: '4px', lg: '6px' },
      transitionDuration: { DEFAULT: '220ms' },
      transitionTimingFunction: { DEFAULT: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      },
      animation: {
        'fade-up': 'fade-up 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 160ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
      maxWidth: { container: '1200px', prose: '720px' },
    },
  },
  plugins: [typography],
} satisfies Config

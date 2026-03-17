import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{vue,js,ts}',
    './app/components/**/*.{vue,js,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
  ],
  theme: {
    extend: {
      colors: {
        space: {
          50: '#f0f0ff',
          100: '#e0e0ff',
          900: '#05050f',
          950: '#000005',
        },
        sun: {
          DEFAULT: '#FDB813',
          glow: '#FF8C00',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'space-gradient': 'radial-gradient(ellipse at center, #0a0a1a 0%, #000005 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config

import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './styles/**/*.css',
  ],
  theme: {
    extend: {
      colors: {
        // Brand tokens from styles/base.css :root. `<alpha-value>` lets `bg-accent-pink/20` work.
        accent: {
          pink: {
            DEFAULT: 'rgb(var(--pink-rgb) / <alpha-value>)',
            light: 'var(--pink-light)',
            strong: 'var(--pink-strong)',
          },
          blue: 'var(--accent-blue)',
        },
      },
      fontFamily: {
        syne: ['var(--font-syne)', 'sans-serif'],
        outfit: ['var(--font-outfit)', 'sans-serif'],
      },
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { opacity: '0.5' },
          '100%': { opacity: '1' },
        }
      },
    },
  },
  plugins: [],
}
export default config

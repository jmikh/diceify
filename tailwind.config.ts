import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design System: Map CSS variables to Tailwind colors
        // These reference the tokens defined in globals.css :root
        theme: {
          // Backgrounds
          bg: {
            primary: 'var(--bg-primary)',
            secondary: 'var(--bg-secondary)',
            deep: 'var(--bg-deep)',
            glass: {
              DEFAULT: 'var(--bg-glass)',
              hover: 'var(--bg-glass-hover)',
            }
          },
          // Glass effects
          glass: {
            light: 'var(--glass-light)',
            medium: 'var(--glass-medium)',
            DEFAULT: 'var(--bg-glass)',
            hover: 'var(--bg-glass-hover)',
          },
          // Text
          text: {
            primary: 'var(--text-primary)',
            secondary: 'var(--text-secondary)',
            muted: 'var(--text-muted)',
            dim: 'var(--text-dim)',
          },
          // Accents
          accent: {
            purple: 'var(--accent-purple)',
            green: 'var(--accent-green)',
          },
          // Glows
          glow: {
            purple: 'var(--glow-purple)',
            green: 'var(--glow-green)',
          },
          // Borders
          border: {
            glass: 'var(--border-glass)',
            'glass-light': 'var(--border-glass-light)',
          },
          // Semantic
          primary: {
            DEFAULT: 'var(--color-primary)',
            hover: 'var(--color-primary-hover)',
            glow: 'var(--color-primary-glow)',
          },
        },
        // Direct pink access (frequently used)
        pink: {
          DEFAULT: 'var(--pink)',
          light: 'var(--pink-light)',
          glow: 'var(--pink-glow)',
          'glow-soft': 'var(--pink-glow-soft)',
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
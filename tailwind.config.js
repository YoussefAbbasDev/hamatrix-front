/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('--bg-rgb'),
        surface: token('--surface-rgb'),
        surface2: token('--surface-2-rgb'),
        line: token('--line-rgb'),
        ink: token('--ink-rgb'),
        muted: token('--muted-rgb'),
        accent: token('--accent-rgb'),
        accent2: token('--accent-2-rgb'),
        cyan: token('--cyan-rgb'),
        success: '#34D399',
        warning: '#FBBF24',
        danger: '#FB7185',
        available: '#34D399',
        occupied: '#FF2E93',
        reserved: '#FBBF24',
        maintenance: '#8B8AA0',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', 'Cairo', 'Tajawal', 'system-ui', 'sans-serif'],
        display: ['Rubik', '"IBM Plex Sans Arabic"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        md: '8px',
        lg: '10px',
        xl: '12px',
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgb(var(--accent-rgb) / 0.18)',
        glow: '0 0 24px rgb(var(--accent-rgb) / 0.22)',
        card: '0 10px 30px rgb(0 0 0 / 0.25)',
      },
      backgroundImage: {
        'accent-gradient':
          'linear-gradient(135deg, rgb(var(--accent-rgb)) 0%, rgb(var(--accent-2-rgb)) 100%)',
        'ambient':
          'radial-gradient(60% 50% at 85% 0%, rgb(var(--accent-2-rgb) / 0.12) 0%, transparent 70%), radial-gradient(45% 40% at 10% 10%, rgb(var(--accent-rgb) / 0.08) 0%, transparent 70%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(var(--accent-rgb) / 0.0)' },
          '50%': { boxShadow: '0 0 18px 0 rgb(var(--accent-rgb) / 0.22)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 240ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 180ms ease-out both',
        'slide-in': 'slide-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-glow': 'pulse-glow 2.6s ease-in-out infinite',
        shimmer: 'shimmer 1.6s linear infinite',
        'spin-slow': 'spin-slow 1.2s linear infinite',
      },
    },
  },
  plugins: [],
};

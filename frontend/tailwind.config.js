export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cyber: {
          deep: 'var(--bg-deep)',
          surface: 'var(--bg-surface)',
          card: 'var(--bg-card)',
        },
        vault: {
          gold: 'var(--accent-gold)',
          mint: 'var(--accent-mint)',
          cobalt: 'var(--accent-cobalt)',
          silver: 'var(--text-muted)',
          blue: 'var(--accent-blue)',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(6, 182, 212, 0.3), 0 0 30px rgba(6, 182, 212, 0.1)',
        'neon-purple': '0 0 15px rgba(139, 92, 246, 0.3), 0 0 30px rgba(139, 92, 246, 0.1)',
        'neon-emerald': '0 0 15px rgba(16, 185, 129, 0.3), 0 0 30px rgba(16, 185, 129, 0.1)',
        'neon-rose': '0 0 15px rgba(244, 63, 94, 0.3)',
      },
    },
  },
  plugins: [],
};

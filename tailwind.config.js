/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        abyss: '#0a0e14',
        panel: '#141923',
        steel: '#1a2333',
        edge: 'rgba(255, 255, 255, 0.08)',
        gold: '#ffc24b',
        blizzard: '#0e9cff',
        emerald: '#2fbf71',
        blood: '#ff5566',
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.45)',
        'glow-gold': '0 0 24px rgba(255, 194, 75, 0.35)',
        'glow-blue': '0 0 24px rgba(14, 156, 255, 0.3)',
      },
    },
  },
  plugins: [],
};

import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './modules/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#141824',
        paper: '#f7f8fb',
        panel: '#ffffff',
        line: '#d9dee8',
        muted: '#667085',
        sage: '#4263eb',
        moss: '#172554',
        coral: '#ff6b35',
        sky: '#eaf1ff',
        lilac: '#f0e7ff',
        mint: '#e8fbf2',
      },
      boxShadow: {
        soft: '0 12px 40px rgba(20, 24, 36, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;

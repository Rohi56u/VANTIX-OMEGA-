/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        'omega-dark': '#0a0a0c',
        'omega-panel': '#131316',
        'omega-border': '#2a2a30',
        'omega-accent': '#00f0ff',
        'omega-danger': '#ff2a6d',
        'omega-success': '#05ffa1',
        'omega-warning': '#ffc800',
      }
    },
  },
  plugins: [],
}
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#090a0f',
        card: '#12151f',
        border: '#1f2433',
        primary: '#3b82f6',
        'primary-hover': '#2563eb',
        muted: '#8b949e',
        danger: '#ef4444',
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
    },
  },
  plugins: [],
};

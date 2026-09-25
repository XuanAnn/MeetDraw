/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Minimalist Clean Light Palette
        navy: {
          950: '#f8fafc', // Main crisp background (slate-50)
          900: '#ffffff', // Primary surface (pure white card)
          850: '#f1f5f9', // Secondary surface (slate-100 inputs/toggles)
          800: '#e2e8f0', // Clean structural border (slate-200)
          700: '#cbd5e1', // Divider / hover border (slate-300)
          600: '#94a3b8', // Muted icon / subtle elements (slate-400)
        },
        indigo: {
          accent: '#4f46e5',
          light: '#4338ca',
          glow: '#4f46e5',
        },
        emerald: {
          active: '#059669',
        },
        cyan: {
          accent: '#0284c7',
        },
        rose: {
          alert: '#e11d48',
        },
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */

// ---------------------------------------------------------------------------
// Badminton Academy — Design System
//
// The brand ramp is intentionally aliased over `blue` and `indigo` so that
// every existing surface (40+ admin pages, public landing page, auth) picks
// up the new identity automatically. `sport` is the energetic secondary used
// for highlights, success states and marketing gradients.
// ---------------------------------------------------------------------------

const brand = {
  50: '#eff4ff',
  100: '#dbe6ff',
  200: '#bfd3ff',
  300: '#93b4ff',
  400: '#608cff',
  500: '#3b66f6',
  600: '#2547eb',
  700: '#1c37d4',
  800: '#1d30ac',
  900: '#1e2f89',
  950: '#161e50',
};

const sport = {
  50: '#f0fdf4',
  100: '#dcfce7',
  200: '#bbf7d0',
  300: '#86efac',
  400: '#4ade80',
  500: '#22c55e',
  600: '#16a34a',
  700: '#15803d',
  800: '#166534',
  900: '#14532d',
};

const ink = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#020617',
};

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand identity — aliased so the whole app re-skins from one place.
        blue: brand,
        indigo: brand,
        primary: {
          DEFAULT: brand[600],
          ...brand,
        },
        sport,
        'primary-foreground': '#ffffff',
        'primary-subtle': '#eef4ff',
        'primary-subtle-hover': '#dbe6ff',
        background: '#f6f7fb',
        foreground: ink[900],
        card: '#ffffff',
        'card-foreground': ink[900],
        popover: '#ffffff',
        'muted-foreground': ink[500],
        'subtle-foreground': ink[400],
        'border-strong': ink[300],
        destructive: {
          DEFAULT: '#dc2626',
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        'destructive-subtle': '#fef2f2',
        success: {
          DEFAULT: sport[600],
          50: sport[50],
          100: sport[100],
          500: sport[500],
          600: sport[600],
          700: sport[700],
        },
        'success-subtle': '#ecfdf5',
        warning: {
          DEFAULT: '#d97706',
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        'warning-subtle': '#fffbeb',
        info: {
          DEFAULT: '#0284c7',
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        'info-subtle': '#f0f9ff',
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },

      borderRadius: {
        sm: '0.375rem',
        DEFAULT: '0.5rem',
        md: '0.625rem',
        lg: '0.75rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },

      boxShadow: {
        xs: '0 1px 2px 0 rgb(15 23 42 / 0.04)',
        sm: '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)',
        DEFAULT: '0 1px 3px 0 rgb(15 23 42 / 0.07), 0 1px 2px -1px rgb(15 23 42 / 0.05)',
        md: '0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 6px -2px rgb(15 23 42 / 0.05)',
        lg: '0 12px 24px -6px rgb(15 23 42 / 0.10), 0 4px 10px -4px rgb(15 23 42 / 0.06)',
        xl: '0 20px 40px -10px rgb(15 23 42 / 0.14), 0 8px 16px -8px rgb(15 23 42 / 0.08)',
        '2xl': '0 32px 64px -16px rgb(15 23 42 / 0.20)',
        inner: 'inset 0 2px 4px 0 rgb(15 23 42 / 0.05)',
        glow: '0 0 0 4px rgb(59 102 246 / 0.12)',
        'glow-sm': '0 4px 14px -4px rgb(37 71 235 / 0.35)',
        'glow-lg': '0 8px 32px -8px rgb(37 71 235 / 0.40)',
        'glow-sport': '0 8px 32px -8px rgb(22 163 74 / 0.40)',
      },

      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },

      animation: {
        'fade-in': 'fade-in 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slide-up 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-down': 'slide-down 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scale-in 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
        shimmer: 'shimmer 1.8s infinite',
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      },

      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #1c37d4 0%, #2547eb 45%, #16a34a 130%)',
        'sport-gradient': 'linear-gradient(135deg, #16a34a 0%, #4ade80 100%)',
        'subtle-grid':
          'linear-gradient(to right, rgb(15 23 42 / 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgb(15 23 42 / 0.04) 1px, transparent 1px)',
      },

      maxWidth: {
        screen: '1440px',
      },

      spacing: {
        18: '4.5rem',
      },
    },
  },
  plugins: [],
};

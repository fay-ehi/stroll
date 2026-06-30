/**
 * Stroll — Tailwind / NativeWind v4 Configuration
 * Version 1.0
 *
 * This file lives at the project root: stroll54/tailwind.config.js
 *
 * All design token values are defined here so that NativeWind utility
 * classes stay in sync with the TypeScript theme object in src/theme/.
 *
 * Design System source of truth: src/theme/colors.ts, typography.ts, etc.
 * When a token value changes, update BOTH this file AND the corresponding
 * theme module. They must always match.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  // ─── Content Paths ─────────────────────────────────────────────────────────
  // NativeWind scans these files to generate utility classes.
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],

  presets: [require('nativewind/preset')],

  theme: {
    extend: {
      // ─── Colors ─────────────────────────────────────────────────────────────
      colors: {
        // Brand
        brand: {
          primary:     '#FC5A03',
          interactive: '#E45214',
        },
        // Backgrounds
        background: {
          DEFAULT:   '#FFFFFF',
          secondary: '#FAFAFA',
        },
        surface:   '#FFFFFF',
        divider:   '#EFEFEF',
        border:    '#E6E6E6',
        // Text hierarchy
        text: {
          primary:   '#111111',
          secondary: '#6B7280',
          tertiary:  '#9CA3AF',
          disabled:  '#D1D5DB',
        },
        // Semantic
        success:   '#16A34A',
        warning:   '#F59E0B',
        error:     '#DC2626',
        info:      '#2563EB',
      },

      // ─── Font Families ───────────────────────────────────────────────────────
      // Keys must exactly match the names registered with useFonts().
      fontFamily: {
        'heading':         ['PlusJakartaSans-SemiBold'],
        'heading-bold':    ['PlusJakartaSans-Bold'],
        'body':            ['Inter-Regular'],
        'body-medium':     ['Inter-Medium'],
        'body-semibold':   ['Inter-SemiBold'],
      },

      // ─── Font Sizes ─────────────────────────────────────────────────────────
      // Each entry is [fontSize, { lineHeight, letterSpacing, fontWeight }].
      // NativeWind v4 supports the tuple form.
      fontSize: {
        'display':   ['48px', { lineHeight: '58px' }],
        'h1':        ['36px', { lineHeight: '44px' }],
        'h2':        ['30px', { lineHeight: '38px' }],
        'h3':        ['24px', { lineHeight: '32px' }],
        'h4':        ['20px', { lineHeight: '28px' }],
        'h5':        ['18px', { lineHeight: '26px' }],
        'body-lg':   ['16px', { lineHeight: '26px' }],
        'body':      ['15px', { lineHeight: '24px' }],
        'body-sm':   ['14px', { lineHeight: '22px' }],
        'caption':   ['12px', { lineHeight: '18px' }],
        'tiny':      ['11px', { lineHeight: '16px' }],
      },

      // ─── Spacing ─────────────────────────────────────────────────────────────
      // Extends (does not replace) Tailwind's default spacing scale.
      // Usage: p-screen, px-xl, gap-component, mt-xxl, etc.
      spacing: {
        'xxs':       '4px',
        'xs':        '8px',
        'sm':        '12px',
        'md':        '16px',
        'lg':        '20px',
        'xl':        '24px',
        'xxl':       '32px',
        '3xl':       '40px',
        '4xl':       '48px',
        '5xl':       '56px',
        '6xl':       '64px',
        '7xl':       '72px',
        '8xl':       '80px',
        // Semantic aliases
        'screen':    '24px',    // standard screen horizontal padding
        'section':   '32px',    // large section padding
        'component': '16px',    // gap between components
      },

      // ─── Border Radius ───────────────────────────────────────────────────────
      // Usage: rounded-card, rounded-button, rounded-sheet, rounded-full
      borderRadius: {
        'none':    '0px',
        'button':  '14px',
        'input':   '14px',
        'card':    '18px',
        'image':   '20px',
        'dialog':  '20px',
        'sheet':   '28px',
        'full':    '9999px',
      },

      // ─── Border Width ────────────────────────────────────────────────────────
      borderWidth: {
        DEFAULT: '1px',
      },

      // ─── Min Height ──────────────────────────────────────────────────────────
      // Touch target enforcement and component height constraints.
      minHeight: {
        'touch':    '44px',
        'button':   '48px',
        'input':    '48px',
        'list-sm':  '60px',
        'list-md':  '72px',
      },

      // ─── Height ──────────────────────────────────────────────────────────────
      height: {
        'button':   '48px',
        'input':    '48px',
        'search':   '48px',
        'touch':    '44px',
      },

      // ─── Z-Index ─────────────────────────────────────────────────────────────
      zIndex: {
        'base':     '0',
        'raised':   '10',
        'dropdown': '20',
        'sticky':   '30',
        'sheet':    '40',
        'modal':    '50',
        'toast':    '60',
        'tooltip':  '70',
      },

      // ─── Opacity ─────────────────────────────────────────────────────────────
      opacity: {
        'disabled': '0.38',
        'medium':   '0.5',
        'heavy':    '0.72',
      },
    },
  },

  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'brand-orange': '#FC5A03',
        'brand-orange-active': '#E45214',
        'neutral-bg': '#FFFFFF',
        'neutral-bg-secondary': '#FAFAFA',
        'neutral-divider': '#EFEFEF',
        'neutral-border': '#E6E6E6',
        'text-primary': '#111111',
        'text-secondary': '#6B7280',
        'text-tertiary': '#9CA3AF',
        'text-disabled': '#D1D5DB',
        'semantic-success': '#16A34A',
        'semantic-warning': '#F59E0B',
        'semantic-error': '#DC2626',
        'semantic-info': '#2563EB',
      },
      borderRadius: {
        'btn': '14px',
        'card': '18px',
        'image': '20px',
        'sheet': '28px',
      },
      fontFamily: {
        'heading': ['PlusJakartaSans-SemiBold', 'sans-serif'],
        'heading-bold': ['PlusJakartaSans-Bold', 'sans-serif'],
        'body': ['Inter-Regular', 'sans-serif'],
        'body-medium': ['Inter-Medium', 'sans-serif'],
        'body-semibold': ['Inter-SemiBold', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export const Colors = {
  brandOrange: '#FC5A03',
  brandOrangeActive: '#E45214',
  bgPrimary: '#FFFFFF',
  bgSecondary: '#FAFAFA',
  surface: '#FFFFFF',
  divider: '#EFEFEF',
  border: '#E6E6E6',
  textPrimary: '#111111',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textDisabled: '#D1D5DB',
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#DC2626',
  info: '#2563EB',
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const FontFamily = {
  headingSemiBold: 'PlusJakartaSans-SemiBold',
  headingBold: 'PlusJakartaSans-Bold',
  bodyRegular: 'Inter-Regular',
  bodyMedium: 'Inter-Medium',
  bodySemiBold: 'Inter-SemiBold',
} as const;

export const FontSize = {
  h1: 36, h2: 30, h3: 24, h4: 20, h5: 18,
  bodyLg: 16, body: 15, bodySm: 14, caption: 12, tiny: 11,
} as const;

export const Spacing = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24,
  '2xl': 32, '3xl': 40, '4xl': 48,
  screenPadding: 24,
  cardPadding: 20,
} as const;

export const Radius = {
  button: 14, card: 18, image: 20, sheet: 28, full: 9999,
} as const;

export const Shadow = {
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
} as const;

export const TouchTarget = {
  minimum: 44,
  button: 48,
  search: 48,
} as const;

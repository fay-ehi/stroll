/**
 * Stroll Design System — Global Styles
 * Version 1.0
 *
 * Provides reusable screen-level StyleSheet defaults.
 * Every screen layout should begin by spreading these styles,
 * then apply screen-specific overrides on top.
 *
 * These are NOT component styles — they are structural defaults:
 *   - Screen background
 *   - Safe area configuration
 *   - Default text color
 *   - Default content padding
 *   - Scrollable screen defaults
 *
 * Usage in a screen:
 *   import { globalStyles } from '@/theme/globalStyles';
 *
 *   export default function DiscoverScreen() {
 *     return (
 *       <SafeAreaView style={globalStyles.safeArea}>
 *         <ScrollView
 *           style={globalStyles.screen}
 *           contentContainerStyle={globalStyles.screenContent}
 *         >
 *           {content}
 *         </ScrollView>
 *       </SafeAreaView>
 *     );
 *   }
 */

import { StyleSheet, Platform } from 'react-native';
import { theme } from './index';

export const globalStyles = StyleSheet.create({
  // ─── Safe Area ─────────────────────────────────────────────────────────────
  /**
   * Root wrapper for every screen.
   * Always use SafeAreaView (from react-native-safe-area-context) with this style.
   * Provides the correct background color and fills the safe inset area.
   */
  safeArea: {
    flex:            1,
    backgroundColor: theme.colors.neutral.background,
  },

  // ─── Screen ────────────────────────────────────────────────────────────────
  /**
   * Applied to the ScrollView or flat View that fills the safe area.
   * Provides the white background and flex fill.
   */
  screen: {
    flex:            1,
    backgroundColor: theme.colors.neutral.background,
  },

  /**
   * Applied to contentContainerStyle on ScrollView screens.
   * Provides standard horizontal padding and bottom breathing room.
   */
  screenContent: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom:     theme.spacing['4xl'], // 48px breathing room above tab bar
  },

  /**
   * Screen content with no horizontal padding.
   * Used for screens with full-bleed sections (e.g. Discover feed, image galleries).
   */
  screenContentFlush: {
    paddingBottom: theme.spacing['4xl'],
  },

  // ─── Section ───────────────────────────────────────────────────────────────
  /**
   * Standard vertical gap between major page sections.
   */
  section: {
    marginBottom: theme.spacing.xxl,
  },

  /**
   * Standard section with large padding (e.g. hero sections, intro blocks).
   */
  sectionLarge: {
    paddingHorizontal: theme.layout.sectionPaddingLarge,
    marginBottom:      theme.spacing.xxl,
  },

  // ─── Default Text ─────────────────────────────────────────────────────────
  /**
   * Default text color.
   * Should be applied at the root text wrapper when NativeWind is not used.
   */
  text: {
    color: theme.colors.text.primary,
  },

  textSecondary: {
    color: theme.colors.text.secondary,
  },

  // ─── Row Layout ────────────────────────────────────────────────────────────
  /**
   * Horizontal flex row — used everywhere for icon+label, avatar+name pairs.
   */
  row: {
    flexDirection: 'row',
    alignItems:    'center',
  },

  rowSpaceBetween: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },

  // ─── Center Layout ─────────────────────────────────────────────────────────
  /**
   * Center content both axes — used for empty states, loading spinners.
   */
  center: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },

  // ─── Divider ───────────────────────────────────────────────────────────────
  /**
   * Horizontal rule — use sparingly. Whitespace separates sections first (§32).
   */
  divider: {
    height:          theme.borders.width,
    backgroundColor: theme.colors.neutral.divider,
  },

  // ─── Card Container ────────────────────────────────────────────────────────
  /**
   * Base card surface — white background, card radius, medium shadow.
   * Specific card components build on top of this.
   */
  card: {
    backgroundColor: theme.colors.neutral.surface,
    borderRadius:    theme.radius.card,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor:   theme.shadows.medium.shadowColor,
          shadowOffset:  theme.shadows.medium.shadowOffset,
          shadowOpacity: theme.shadows.medium.shadowOpacity,
          shadowRadius:  theme.shadows.medium.shadowRadius,
        }
      : { elevation: theme.shadows.medium.elevation }),
  },

  // ─── Input Base ────────────────────────────────────────────────────────────
  /**
   * Base input container style.
   * Text field components build on this to ensure consistent height and radius.
   */
  inputBase: {
    height:          theme.layout.inputHeight,
    borderRadius:    theme.radius.input,
    borderWidth:     theme.borders.width,
    borderColor:     theme.colors.neutral.border,
    backgroundColor: theme.colors.neutral.background,
    paddingHorizontal: theme.spacing.md,
  },

  // ─── Button Base ───────────────────────────────────────────────────────────
  /**
   * Base button container. Button components build on this.
   */
  buttonBase: {
    height:         theme.layout.buttonHeight,
    borderRadius:   theme.radius.button,
    paddingHorizontal: theme.spacing.lg,
    alignItems:     'center',
    justifyContent: 'center',
    flexDirection:  'row',
  },
});

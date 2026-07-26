/**
 * Stroll — Auth Screen Wrapper
 * src/components/auth/AuthScreenWrapper.tsx
 *
 * Sprint 1 Prompt 2 fix: footer (submit button) moved outside the
 * ScrollView and pinned to the bottom of the screen. This ensures
 * the button is always visible regardless of keyboard state or screen
 * height — the previous version could push the button below the fold
 * on smaller devices when the keyboard was open.
 *
 * Bug fix (this pass): on a screen with several stacked fields (Sign
 * Up's Display Name / Username / Email / Password), the fix above
 * covers "the button stays visible" but not "the field you're actually
 * typing into stays visible" — `KeyboardAvoidingView`'s `padding`
 * behavior shrinks the ScrollView to make room for the keyboard, but
 * never scrolls its content, so focusing a field further down the form
 * doesn't bring it into the now-smaller visible area; Email and Password
 * could end up needing a manual scroll, or briefly sitting behind the
 * footer, exactly as reported ("email and password fields cannot be
 * visible at the same time"). Fixed with a small context: each
 * `AuthFormField` reports its own focus event up through
 * `AuthFieldFocusContext`, and this component scrolls the field into
 * view above the footer/keyboard — re-run both on focus AND when the
 * keyboard's height itself changes, since on iOS a field's onFocus can
 * fire slightly before `keyboardWillShow`, when the keyboard height
 * we'd calculate against is still stale.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Keyboard,
  Dimensions,
  type TextInput as RNTextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { H2, Body } from '@/components/ui';
import { Icon } from '@/components/ui';
import { ArrowLeft } from 'lucide-react-native';

// ─── Focus-tracking context ────────────────────────────────────────────────────
// AuthFormField registers its own onFocus through here so this wrapper —
// the only thing that knows the current keyboard height and holds the
// ScrollView ref — can be the one to actually scroll. Exported so
// AuthFormField.tsx can consume it without a prop-drilled callback at
// every call site.

export interface AuthFieldFocusContextValue {
  scrollToFocusedField: (fieldRef: React.RefObject<RNTextInput | null>) => void;
}

const AuthFieldFocusContext = createContext<AuthFieldFocusContextValue | null>(null);

export function useAuthFieldFocus(): AuthFieldFocusContextValue | null {
  return useContext(AuthFieldFocusContext);
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AuthScreenWrapperProps {
  title:      string;
  subtitle?:  string;
  showBack?:  boolean;
  children:   React.ReactNode;
  /** Rendered in a sticky area below the form, always visible. */
  footer?:    React.ReactNode;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function AuthScreenWrapper({
  title,
  subtitle,
  showBack = false,
  children,
  footer,
}: AuthScreenWrapperProps) {
  const insets = useSafeAreaInsets();

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const footerHeightRef = useRef(0);
  const focusedFieldRef = useRef<React.RefObject<RNTextInput | null> | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Scrolls just far enough that the focused field's bottom edge clears
  // the visible area above the keyboard + sticky footer — not a jump to
  // top, and not more than necessary, so a field that's already visible
  // doesn't move at all.
  const performScroll = useCallback((fieldRef: React.RefObject<RNTextInput | null>, kbHeight: number) => {
    requestAnimationFrame(() => {
      const node = fieldRef.current;
      if (!node || !scrollViewRef.current) return;
      node.measureInWindow((_x, y, _width, height) => {
        const windowHeight = Dimensions.get('window').height;
        const visibleBottom = windowHeight - kbHeight - footerHeightRef.current;
        const overflow = y + height - visibleBottom + theme.spacing.md;
        if (overflow > 0) {
          scrollViewRef.current?.scrollTo({
            y: scrollOffsetRef.current + overflow,
            animated: true,
          });
        }
      });
    });
  }, []);

  const scrollToFocusedField = useCallback(
    (fieldRef: React.RefObject<RNTextInput | null>) => {
      focusedFieldRef.current = fieldRef;
      performScroll(fieldRef, keyboardHeight);
    },
    [keyboardHeight, performScroll],
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const height = e.endCoordinates.height;
      setKeyboardHeight(height);
      // Re-run against the just-arrived height — covers the case where
      // onFocus fired first, using the stale (pre-keyboard) height.
      if (focusedFieldRef.current) performScroll(focusedFieldRef.current, height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [performScroll]);

  return (
    <AuthFieldFocusContext.Provider value={{ scrollToFocusedField }}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        {/* Scrollable form area */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: Math.max(
                insets.top + theme.spacing.lg,
                theme.spacing.xxl
              ),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
        >
          {/* Back button */}
          {showBack && (
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Icon
                icon={ArrowLeft}
                size="md"
                color={theme.colors.text.primary}
              />
            </Pressable>
          )}

          {/* Brand wordmark */}
          <View style={styles.brand}>
            <Body
              color={theme.colors.brand.primary}
              style={styles.wordmark}
            >
              Stroll
            </Body>
          </View>

          {/* Title + subtitle */}
          <View style={styles.header}>
            <H2 style={styles.title}>{title}</H2>
            {subtitle ? (
              <Body color={theme.colors.text.secondary}>{subtitle}</Body>
            ) : null}
          </View>

          {/* Form fields */}
          {children}
        </ScrollView>

        {/* ── Sticky footer — always visible, never scrolls away ── */}
        {footer ? (
          <View
            onLayout={(e) => { footerHeightRef.current = e.nativeEvent.layout.height; }}
            style={[
              styles.footer,
              {
                paddingBottom: Math.max(
                  insets.bottom + theme.spacing.sm,
                  theme.spacing.xl
                ),
              },
            ]}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </AuthFieldFocusContext.Provider>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: theme.colors.neutral.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    // Bottom padding ensures last field isn't hidden behind footer.
    paddingBottom: theme.spacing['4xl'],
  },
  backButton: {
    alignSelf:      'flex-start',
    marginBottom:   theme.spacing.lg,
    minWidth:       theme.layout.touchTargetMin,
    minHeight:      theme.layout.touchTargetMin,
    alignItems:     'center',
    justifyContent: 'center',
  },
  brand: {
    marginBottom: theme.spacing.xxl,
  },
  wordmark: {
    fontWeight:    theme.typography.weights.bold,
    fontSize:      theme.typography.sizes.h4,
    letterSpacing: theme.typography.letterSpacings.tight,
  },
  header: {
    marginBottom: theme.spacing.xxl,
    gap:          theme.spacing.xs,
  },
  title: {
    marginBottom: 0,
  },
  footer: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingTop:        theme.spacing.md,
    borderTopWidth:    theme.borders.width,
    borderTopColor:    theme.colors.neutral.border,
    backgroundColor:   theme.colors.neutral.background,
    gap:               theme.spacing.sm,
  },
});

/**
 * Stroll — Search Input
 * src/components/search/SearchInput.tsx
 *
 * Sprint 7 Prompt 1 — Search Foundation.
 *
 * Design System §23 — Search Bar: Height 48px (theme.layout.searchBarHeight).
 * Radius: theme.radius.full — that token's own doc in theme/radius.ts
 * already calls out "pill-shaped search bars" as one of its three named
 * use cases, alongside profile avatars and FABs.
 *
 * Deliberately its own component, NOT a restyled `TextInput`
 * (components/ui/TextInput.tsx) — that component's Design System rule
 * ("Always use labels. Do not rely solely on placeholders.") is correct
 * for form fields, but a search bar is a different, universally
 * recognized pattern (iOS UISearchBar, Android SearchView) that doesn't
 * carry a floating label above it; the placeholder itself is the visible
 * affordance. Accessibility is still covered — `accessibilityLabel`
 * on the underlying RNTextInput gives screen readers a real label even
 * without visible label text (the same reasoning that pattern's own
 * platform-native search fields rely on).
 *
 * Requirements covered: rounded, search icon, clear button, placeholder,
 * typing, clearing, focus, blur, keyboard submission. Debouncing itself
 * lives in useSearch.ts, not here — this component only reports raw
 * value changes; see that hook's own module doc for why.
 */

import React, { forwardRef } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Pressable,
  StyleSheet,
  type TextInputProps as RNTextInputProps,
  type ViewStyle,
} from 'react-native';
import { Search, X } from 'lucide-react-native';

import { theme } from '@/theme';
import { textStyles } from '@/theme/typography';
import { hitSlop } from '@/theme/utils';
import { Icon } from '@/components/ui';

export interface SearchInputProps
  extends Omit<RNTextInputProps, 'style' | 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (text: string) => void;
  /** Called when the clear (×) button is pressed — in addition to `onChangeText('')`, so a caller can also blur, reset scroll position, etc. */
  onClear?: () => void;
  /** Outer container style override. */
  containerStyle?: ViewStyle;
}

export const SearchInput = forwardRef<RNTextInput, SearchInputProps>(
  (
    {
      value,
      onChangeText,
      onClear,
      placeholder = 'Search experiences, collections or creators',
      containerStyle,
      onFocus,
      onBlur,
      ...inputProps
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const hasValue = value.length > 0;

    const handleClear = () => {
      onChangeText('');
      onClear?.();
    };

    return (
      <View
        style={[
          styles.wrapper,
          { borderColor: isFocused ? theme.colors.brand.primary : 'transparent' },
          containerStyle,
        ]}
      >
        <View style={styles.iconLeft}>
          <Icon icon={Search} size="md" color={theme.colors.text.tertiary} />
        </View>

        <RNTextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.tertiary}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          style={[styles.input, textStyles.body]}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel="Search experiences, collections or creators"
          accessibilityHint="Results update as you type"
          {...inputProps}
        />

        {hasValue ? (
          <Pressable
            onPress={handleClear}
            hitSlop={hitSlop(CLEAR_BUTTON_DIAMETER)}
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Icon icon={X} size="sm" color={theme.colors.text.secondary} />
          </Pressable>
        ) : null}
      </View>
    );
  },
);

SearchInput.displayName = 'SearchInput';

// ─── Styles ────────────────────────────────────────────────────────────────────

const CLEAR_BUTTON_DIAMETER = 20;

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: theme.layout.searchBarHeight,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.neutral.backgroundSecondary,
    paddingHorizontal: theme.spacing.md,
    borderWidth: theme.borders.width,
  },
  iconLeft: {
    marginRight: theme.spacing.xs,
  },
  input: {
    flex: 1,
    height: '100%',
    color: theme.colors.text.primary,
    paddingVertical: 0, // RN Android adds default vertical padding — normalize to 0, same as TextInput.tsx
  },
  clearButton: {
    marginLeft: theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

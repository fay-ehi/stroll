/**
 * Stroll — Action Sheet Provider
 * src/components/actionSheet/ActionSheetProvider.tsx
 *
 * Renders the single ActionSheet component at the root of the app, same
 * pattern as ToastProvider.tsx. Add <ActionSheetProvider> inside the
 * root layout, wrapping the <Stack> (nested with/near <ToastProvider> —
 * order between the two doesn't matter, they're independent overlays).
 *
 * Usage in app/_layout.tsx:
 *   import { ActionSheetProvider } from '@/components/actionSheet/ActionSheetProvider';
 *
 *   <ActionSheetProvider>
 *     <Stack ... />
 *   </ActionSheetProvider>
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActionSheet } from './ActionSheet';

interface ActionSheetProviderProps {
  children: React.ReactNode;
}

export function ActionSheetProvider({ children }: ActionSheetProviderProps) {
  return (
    <View style={styles.container}>
      {children}
      {/* ActionSheet renders via its own <Modal>, so it isn't clipped by
          any child's overflow:hidden regardless of where it sits in this
          tree — mounted here (not inside children) purely to match
          ToastProvider's shape and keep both singleton overlays declared
          in the same place. */}
      <ActionSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

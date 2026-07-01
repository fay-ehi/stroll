/**
 * Stroll — Toast Provider
 * src/components/toast/ToastProvider.tsx
 *
 * Renders the single Toast component at the root of the app so toasts
 * can appear over any screen without being mounted/unmounted per route.
 *
 * Add <ToastProvider> inside the root layout, wrapping the <Stack>.
 * It renders its children normally and adds the floating toast layer.
 *
 * Usage in app/_layout.tsx:
 *   import { ToastProvider } from '@/components/toast/ToastProvider';
 *
 *   <ToastProvider>
 *     <Stack ... />
 *   </ToastProvider>
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Toast } from './Toast';

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <View style={styles.container}>
      {children}
      {/* Toast sits above all content via absolute positioning in Toast.tsx.
          Rendering it here (sibling to children, not inside them) means it
          is never clipped by any child's overflow:hidden. */}
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

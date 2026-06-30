/**
 * Stroll — Error Boundary
 * src/components/shell/ErrorBoundary.tsx
 *
 * Catches unexpected render errors anywhere in the component tree below it
 * and shows a calm, on-brand fallback instead of a native red-screen crash.
 *
 * Design Philosophy §24 "Trust Through Restraint" and §38 "Performance
 * Philosophy" both push toward a product that never feels broken or
 * alarming. A crash screen should look like Stroll, not like an error log.
 *
 * Class component is required here — React error boundaries cannot be
 * implemented with hooks as of React 19; componentDidCatch /
 * getDerivedStateFromError have no hook equivalent.
 *
 * This is a shell-level concern, not a reusable UI primitive, so it lives
 * in components/shell rather than components/ui.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { H3, Body, Button, Icon } from '@/components/ui';
import { AlertTriangle } from 'lucide-react-native';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Sprint 4 scope: log to console only. A real crash-reporting
    // integration (Sentry, Bugsnag, etc.) is a future, explicit decision —
    // not something to silently introduce here.
    console.error('[Stroll ErrorBoundary] Caught render error:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.iconBackdrop}>
            <Icon icon={AlertTriangle} size="xl" color={theme.colors.semantic.error} />
          </View>
          <H3 align="center" style={styles.title}>
            Something went wrong
          </H3>
          <Body align="center" color={theme.colors.text.secondary} style={styles.description}>
            We couldn't load this right now. Please try again.
          </Body>
          <Button label="Try Again" onPress={this.handleReset} />
        </View>
      );
    }

    return this.props.children;
  }
}

// Icon backdrop diameter and description max-width follow the same
// token-derived pattern established in EmptyState.tsx (Sprint 3) for
// consistency — named constants rather than inlined magic numbers.
const ICON_BACKDROP_DIAMETER = theme.spacing['8xl']; // 80px
const DESCRIPTION_MAX_WIDTH  = theme.spacing['5xl'] * 5; // 280px

const styles = StyleSheet.create({
  container: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: theme.layout.sectionPaddingLarge,
    backgroundColor:   theme.colors.neutral.background,
  },
  iconBackdrop: {
    width:            ICON_BACKDROP_DIAMETER,
    height:           ICON_BACKDROP_DIAMETER,
    borderRadius:     theme.radius.full,
    backgroundColor:  theme.colors.neutral.backgroundSecondary,
    alignItems:       'center',
    justifyContent:   'center',
    marginBottom:     theme.spacing.lg,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  description: {
    marginBottom: theme.spacing.lg,
    maxWidth: DESCRIPTION_MAX_WIDTH,
  },
});

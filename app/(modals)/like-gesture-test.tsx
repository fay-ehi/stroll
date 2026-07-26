/**
 * Stroll — Like Gesture Test (TEMPORARY)
 * app/(modals)/like-gesture-test.tsx
 *
 * NOT part of any real navigation flow — no button, tab, or link
 * anywhere in the app points here. Reach it via Expo's dev menu
 * ("Go to route" in Expo Go / a dev client) typing the path
 * `/like-gesture-test`, or by temporarily calling
 * `router.push('/like-gesture-test')` from anywhere while debugging.
 *
 * Exists purely to verify ExperienceCard's double-tap-to-like gesture
 * on a real device in isolation — a plain ScrollView with two REAL
 * cards (via the existing useFeaturedExperiences() hook, no mock data,
 * so the Like mutation round-trips against real data too), deliberately
 * outside the Discover feed's FlatList/virtualization/SwipeableTabs
 * machinery. If something's still wrong with the gesture, this narrows
 * it down to ExperienceCard itself rather than anything about the feed
 * around it.
 *
 * Delete this file (and its <Stack.Screen name="like-gesture-test" />
 * entry in this group's _layout.tsx) once the gesture is confirmed
 * working and ported back into normal use — it shouldn't ship.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';

import { theme } from '@/theme';
import { ScreenContainer, H4, Body, Caption, Icon, Spinner, EmptyState } from '@/components/ui';
import { ExperienceCard } from '@/components/discover/ExperienceCard';
import { useFeaturedExperiences } from '@/hooks/useDiscoverFeed';
import { hitSlop } from '@/theme/utils';

export default function LikeGestureTestModal() {
  const { experiences, isLoading, isError, refetch } = useFeaturedExperiences();
  const testCards = experiences.slice(0, 2);

  return (
    <ScreenContainer scroll edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <H4>Like gesture test</H4>
          <Caption color={theme.colors.text.tertiary}>
            Not a real screen — for verifying double-tap only.
          </Caption>
        </View>
        <Pressable
          onPress={() => router.back()}
          hitSlop={hitSlop(32)}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Icon icon={X} size="md" color={theme.colors.text.secondary} />
        </Pressable>
      </View>

      <View style={styles.instructions}>
        <Body>Try on each card below:</Body>
        <Caption color={theme.colors.text.secondary}>
          • Single tap the photo → should open Experience Detail once (not twice).{'\n'}
          • Single tap the title/footer area → should also open it once.{'\n'}
          • Double tap the photo (not yet liked) → heart fills, floating heart pops, count
          goes up — no navigation.{'\n'}
          • Double tap the photo again (already liked) → nothing happens (no animation, no
          re-navigation, no unlike).{'\n'}
          • Tap the small heart in the footer → likes/unlikes directly, same as double tap.
        </Caption>
      </View>

      {isLoading ? (
        <View style={styles.spinner}>
          <Spinner />
        </View>
      ) : isError ? (
        <EmptyState
          title="Couldn't load test cards"
          description="Check your connection and try again."
          action={{ label: 'Retry', onPress: refetch }}
        />
      ) : testCards.length === 0 ? (
        <EmptyState
          title="No experiences to test with"
          description="Your Featured carousel is empty right now — this screen borrows from it, so there's nothing to render."
        />
      ) : (
        <View style={styles.cards}>
          {testCards.map((experience) => (
            <ExperienceCard key={experience.id} experience={experience} source="discover_feed" />
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  headerText: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  instructions: {
    gap: theme.spacing.xxs,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
  spinner: {
    marginTop: theme.spacing.xl,
  },
  cards: {
    gap: theme.spacing.lg,
  },
});

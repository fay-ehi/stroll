/**
 * Stroll — Following Feed Panel
 * src/components/discover/FollowingFeed.tsx
 *
 * The second panel in Discover's <SwipeableTabs>, paired with
 * <ForYouFeed>. No social graph feature exists yet (see PRD), so this is
 * an honest static empty state rather than a feed — kept as its own
 * component (not inlined in discover.tsx) purely so both swipe panels
 * follow the same "one component per panel" shape, which is what makes
 * them safe to lay out side by side in the pager.
 *
 * `edges={['bottom']}` on ScreenContainer: the top safe-area inset is
 * now handled ONCE by DiscoverScreen's own SafeAreaView, above the top
 * bar/tabs/pager — this panel must not also apply a top inset, or the
 * gap under the status bar would effectively double (applied once above
 * the pager, then again inside this panel).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Users } from 'lucide-react-native';

import { EmptyState, ScreenContainer, OfflineBanner } from '@/components/ui';

export interface FollowingFeedProps {
  listHeader: React.ReactElement;
}

export function FollowingFeed({ listHeader }: FollowingFeedProps) {
  return (
    <ScreenContainer scroll={false} padded={false} edges={['bottom']}>
      <OfflineBanner />
      {listHeader}
      <View style={styles.emptyBody}>
        <EmptyState
          icon={Users}
          title="Nothing here yet"
          description="Follow people to see their experiences here."
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  emptyBody: {
    flex: 1,
  },
});

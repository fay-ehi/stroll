/**
 * Stroll — Nearby Experience Card
 * src/components/discover/NearbyExperienceCard.tsx
 *
 * Sprint 4 Prompt 2 — Location-Aware Nearby Experience Surfacing,
 * Requirement 5: a distinct visual variant of a feed card carrying
 * creator attribution + distance, wrapping the existing ExperienceCard
 * rather than forking a parallel card implementation.
 *
 * The attribution strip is a sibling ABOVE ExperienceCard, not an
 * injected prop on it — ExperienceCard's own internals (Card variant,
 * shadow, radius) stay completely untouched, so this component can't
 * drift out of sync with future ExperienceCard changes.
 *
 * Fires the `nearby_experience_surfaced` impression event once per
 * mount. FlatList windowing (see ForYouFeed.tsx) means a card scrolled
 * far away and back can, in principle, remount and re-fire this — an
 * accepted tradeoff for an MVP impression counter given there's no
 * viewability-tracking infrastructure elsewhere in this codebase yet to
 * dedupe against; worth revisiting if/when a real analytics provider
 * (see analytics.ts's own doc) needs stricter impression semantics.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Navigation } from 'lucide-react-native';

import { theme } from '@/theme';
import { Icon, Caption } from '@/components/ui';
import { ExperienceCard } from './ExperienceCard';
import { formatDistance } from '@/utils';
import { trackNearbyExperienceSurfaced } from '@/lib/analytics';
import type { NearbyExperienceModel } from '@/types/location';

export interface NearbyExperienceCardProps {
  nearby: NearbyExperienceModel;
  style?: ViewStyle;
}

export const NearbyExperienceCard = React.memo(function NearbyExperienceCard({
  nearby,
  style,
}: NearbyExperienceCardProps) {
  const { experience, distanceKm, placeId } = nearby;
  const distanceLabel = formatDistance(distanceKm);
  const creatorName = experience.creator.displayName;
  const attributionLabel = `${creatorName} explored this ${distanceLabel} from you — check out their experience.`;

  useEffect(() => {
    trackNearbyExperienceSurfaced({ experienceId: experience.id, placeId, distanceKm });
    // Fire once per mount, keyed to the experience actually shown — not
    // on every distance/placeId re-render (those never change without a
    // remount anyway, since nearby is a fresh value per pool refresh).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experience.id]);

  return (
    <View style={style}>
      <View
        style={styles.strip}
        accessible
        accessibilityRole="text"
        accessibilityLabel={attributionLabel}
      >
        <Icon icon={Navigation} size="xs" color={theme.colors.brand.primary} />
        <Caption color={theme.colors.text.secondary} style={styles.stripText} numberOfLines={1}>
          <Caption color={theme.colors.text.primary} style={styles.stripCreatorName}>
            {creatorName}
          </Caption>{' '}
          explored this {distanceLabel} from you
        </Caption>
      </View>
      <ExperienceCard experience={experience} source="nearby_surfaced" />
    </View>
  );
});

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    marginBottom: theme.spacing.xs,
    backgroundColor: theme.colors.neutral.backgroundSecondary,
    borderRadius: theme.radius.full,
    alignSelf: 'flex-start',
  },
  stripText: {
    flexShrink: 1,
  },
  stripCreatorName: {
    fontWeight: theme.typography.weights.semiBold,
  },
});

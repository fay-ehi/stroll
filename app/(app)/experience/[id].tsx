/**
 * Stroll — Experience Detail
 * app/(app)/experience/[id].tsx
 *
 * PRD §8.6 — Full view of an Experience post. Sprint 2 Prompt 2:
 * the canonical detail page — header, gallery, description, metadata,
 * location preview, creator section, related experiences, action bar.
 *
 * Navigation: reached from every Experience Card with only the
 * experience's id (see ExperienceCard.tsx's onPress) — never a passed
 * object — so this screen always fetches its own fresh copy via
 * useExperienceDetailPage() rather than trusting anything the previous
 * screen might have had cached.
 *
 * The app-wide Stack has `headerShown: false` (see app/(app)/_layout.tsx),
 * so the back button below is this screen's own — not a native header.
 *
 * Not built this sprint, per the brief's explicit scope: editing,
 * creation, comments, likes, collections, public profiles, following,
 * interactive maps, search, notifications, settings, sharing, reporting.
 * Save/Share/Directions/Report in the action bar are real, tappable
 * placeholders (see ExperienceActionBar's doc) — not fake-disabled UI.
 */

import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, WifiOff, AlertCircle, SearchX } from 'lucide-react-native';

import { theme } from '@/theme';
import { EmptyState, ScreenContainer, OfflineBanner } from '@/components/ui';
import {
  ImageGallery,
  ExperienceDetailHeader,
  ExperienceDescription,
  ExperienceMetadata,
  LocationPreview,
  CreatorSection,
  RelatedExperiences,
  ExperienceActionBar,
  ExperienceDetailSkeleton,
} from '@/components/experience-detail';
import { useExperienceDetailPage } from '@/hooks/useExperienceDetail';
import { useNetworkStatus } from '@/hooks';
import { showToast } from '@/stores/toastStore';

function BackButton() {
  return (
    <Pressable
      onPress={() => router.back()}
      style={styles.backButton}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <View style={styles.backButtonScrim} />
      <ArrowLeft size={20} color={theme.colors.static.white} />
    </Pressable>
  );
}

export default function ExperienceDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  // Falls through to fetchExperienceById's own UUID validation (see
  // experiencesService.ts) rather than special-casing a missing param
  // here — an empty/malformed id surfaces as the same "Invalid ID" error
  // state as a garbled deep link would.
  const id = rawId ?? '';

  const network = useNetworkStatus();
  const isOffline = !network.isConnected || network.isInternetReachable === false;

  const { detail, related } = useExperienceDetailPage(id);

  const handleCreatorPress = () => {
    showToast({ type: 'info', message: 'Profile pages are coming soon.' });
  };

  // ── Initial loading ──────────────────────────────────────────────────────────
  if (detail.isLoading) {
    return (
      <ScreenContainer scroll={false} padded={false}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Inside the scroll content, not pinned above it — this
              screen's BackButton already floats over the hero image at
              the very top; a pinned banner there would compete with it
              for the same space. Scrolling away with the rest of the
              page is an acceptable tradeoff for a status indicator. */}
          <OfflineBanner />
          <ExperienceDetailSkeleton />
        </ScrollView>
        <BackButton />
      </ScreenContainer>
    );
  }

  // ── Empty/error states — offline, not found, invalid id, or other failure ──
  if (!detail.experience) {
    let emptyState: React.ReactNode;

    if (isOffline) {
      emptyState = (
        <EmptyState
          icon={WifiOff}
          title="You're offline"
          description="Connect to the internet to view this experience."
          action={{ label: 'Try Again', onPress: detail.refetch }}
        />
      );
    } else if (detail.error?.code === 'NOT_FOUND') {
      emptyState = (
        <EmptyState
          icon={SearchX}
          title="Experience unavailable"
          description="This experience may have been removed."
        />
      );
    } else if (detail.error?.code === 'VALIDATION_ERROR') {
      emptyState = (
        <EmptyState
          icon={SearchX}
          title="Experience unavailable"
          description="This link doesn't point to a valid experience."
        />
      );
    } else {
      emptyState = (
        <EmptyState
          icon={AlertCircle}
          title="We couldn't load this experience"
          description={detail.error?.userMessage ?? 'Something went wrong. Please try again.'}
          action={{ label: 'Try Again', onPress: detail.refetch }}
        />
      );
    }

    return (
      <ScreenContainer scroll={false} padded={false}>
        {/* No hero image on this branch, so the BackButton's dark scrim
            (needed for contrast over a photo) isn't doing anything
            useful here — it may sit slightly over this banner's left
            edge, a minor cosmetic overlap rather than the two fighting
            over the same visual role. */}
        <OfflineBanner />
        <View style={styles.emptyBody}>{emptyState}</View>
        <BackButton />
      </ScreenContainer>
    );
  }

  const experience = detail.experience;

  return (
    <ScreenContainer scroll={false} padded={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <OfflineBanner />
        <ImageGallery images={experience.photos} title={experience.title} />

        <View style={styles.content}>
          <ExperienceDetailHeader experience={experience} onCreatorPress={handleCreatorPress} />
          <ExperienceDescription story={experience.story} />
          <ExperienceMetadata experience={experience} />
          <LocationPreview place={experience.place} />
          <CreatorSection creator={experience.creator} onPress={handleCreatorPress} />
        </View>

        <View style={styles.relatedSpacing}>
          <RelatedExperiences experiences={related.experiences} isLoading={related.isLoading} />
        </View>
      </ScrollView>

      <ExperienceActionBar />
      <BackButton />
    </ScreenContainer>
  );
}

const BACK_BUTTON_DIAMETER = 40;

const styles = StyleSheet.create({
  content: {
    padding: theme.layout.screenPaddingHorizontal,
    gap: theme.spacing.xl,
  },
  relatedSpacing: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  emptyBody: {
    flex: 1,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    width: BACK_BUTTON_DIAMETER,
    height: BACK_BUTTON_DIAMETER,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  backButtonScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.static.black,
    opacity: theme.opacity.heavy,
  },
});

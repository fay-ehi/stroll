/**
 * Stroll — Contributors Line
 * src/components/collections/ContributorsLine.tsx
 *
 * Sprint 5 — Prompt 2, requirement #5 (Contributors): "Update the
 * Collection Detail screen to display collaborators. Examples: 'Created
 * by Alice & Bob', 'Created by Alice, Bob +2'. Each collaborator should
 * link to their public profile. Reuse the existing profile navigation."
 *
 * Replaces CollectionDetailHeader's old single-owner "Curated by X"
 * Caption for a collaborative Collection (owner.length -1 collaborators
 * > 0); a single-owner Collection keeps rendering that original line
 * unchanged (this component isn't used there — see
 * CollectionDetailHeader.tsx).
 *
 * Names, not avatars, are the tappable targets — a comma-separated list
 * of individually-pressable inline Text segments, matching how a
 * sentence like this reads (compare to CollectionCard.tsx's avatar
 * *stack*, which is a different, glanceable-not-readable treatment for
 * the same data on a card).
 *
 * "Reuse the existing profile navigation" → ROUTES.app.otherUserProfile,
 * the same route the rest of the app resolves a profile tap to (see
 * routes.ts) — currently a placeholder screen (app/(app)/profile/[id].tsx
 * says so directly), which isn't this prompt's concern to build.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { theme } from '@/theme';
import { Caption } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import type { CreatorPreview } from '@/types/experience';

export interface ContributorsLineProps {
  owner: CreatorPreview;
  /** ACCEPTED collaborators only — matches CollectionModel.collaborators's own contract. */
  collaborators: CreatorPreview[];
  experienceCountLabel: string;
}

// Beyond this many total contributors, collapse to "A, B +N" rather than
// spelling out every name — keeps the line from wrapping to multiple
// lines of a Collection Detail header on a normal-width phone screen.
const MAX_NAMED_CONTRIBUTORS = 2;

function ContributorName({ person }: { person: CreatorPreview }) {
  return (
    <Pressable
      onPress={() => router.push(ROUTES.app.otherUserProfile(person.id))}
      hitSlop={theme.spacing.xxs}
      accessibilityRole="link"
      accessibilityLabel={`View ${person.displayName}'s profile`}
    >
      <Caption color={theme.colors.text.secondary} style={styles.link}>
        {person.displayName}
      </Caption>
    </Pressable>
  );
}

export function ContributorsLine({ owner, collaborators, experienceCountLabel }: ContributorsLineProps) {
  const contributors = [owner, ...collaborators];
  const named = contributors.slice(0, MAX_NAMED_CONTRIBUTORS);
  const overflowCount = contributors.length - named.length;

  return (
    <View style={styles.row}>
      <Caption color={theme.colors.text.secondary}>Created by </Caption>
      {named.map((person, index) => (
        <React.Fragment key={person.id}>
          <ContributorName person={person} />
          {index < named.length - 1 ? (
            <Caption color={theme.colors.text.secondary}>{index === named.length - 2 && overflowCount === 0 ? ' & ' : ', '}</Caption>
          ) : null}
        </React.Fragment>
      ))}
      {overflowCount > 0 ? <Caption color={theme.colors.text.secondary}>{` +${overflowCount}`}</Caption> : null}
      <Caption color={theme.colors.text.secondary}>{` · ${experienceCountLabel}`}</Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  link: {
    textDecorationLine: 'underline',
  },
});

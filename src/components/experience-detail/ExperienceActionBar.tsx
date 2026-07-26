/**
 * Stroll — Experience Action Bar
 * src/components/experience-detail/ExperienceActionBar.tsx
 *
 * Requirement #11 — Action Bar: "Save, Share, Directions, Report. Only
 * implement navigation or placeholder callbacks where appropriate. Actual
 * functionality belongs to later sprints. The component should already
 * support loading states and disabled states."
 *
 * Built directly on the existing `Button` component (tertiary variant),
 * which already has full loading/disabled support (Design System §21) —
 * "the component should already support loading states" is satisfied by
 * reuse, not by building new state-handling machinery. `isSaving` /
 * `saveDisabled` are wired straight through to Button's own `loading`/
 * `disabled` props so a future Save mutation just passes its own
 * `isPending` in.
 *
 * Each of the four actions accepts an optional override callback; any
 * left unset falls back to an honest Toast placeholder ("X is coming
 * soon"), matching the pattern already established by ExperienceCard's
 * save button and DiscoverTopBar's city/notifications buttons — tappable
 * and gives real feedback, persists nothing.
 *
 * Save's on/off color (Sprint 5 Prompt 4 follow-up): every other action
 * here is one-shot, so Button's own tertiary-variant color (brand
 * orange) is a fine default for all of them. Save is a toggle, and
 * "always orange regardless of state" didn't read as a toggle — this
 * button now passes Button's `color` prop explicitly (added this same
 * pass) to go neutral when not saved and fully orange with a filled
 * BookmarkCheck icon once saved.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Bookmark, BookmarkCheck, Share2, Navigation, Flag } from 'lucide-react-native';

import { theme } from '@/theme';
import { Button, Divider } from '@/components/ui';
import { showToast } from '@/stores/toastStore';

export interface ExperienceActionBarProps {
  onSave?: () => void;
  onShare?: () => void;
  onDirections?: () => void;
  onReport?: () => void;
  /** Whether the experience is currently saved — flips the Save button's label/icon. Defaults to false. */
  isSaved?: boolean;
  /** Passed straight through to the Save button's `loading` state. */
  isSaving?: boolean;
  /** Passed straight through to the Save button's `disabled` state. */
  saveDisabled?: boolean;
}

function placeholder(action: string) {
  showToast({ type: 'info', message: `${action} is coming soon.` });
}

export function ExperienceActionBar({
  onSave,
  onShare,
  onDirections,
  onReport,
  isSaved = false,
  isSaving = false,
  saveDisabled = false,
}: ExperienceActionBarProps) {
  return (
    <View>
      <Divider />
      <View style={styles.row}>
        <Button
          label={isSaved ? 'Saved' : 'Save'}
          leftIcon={isSaved ? BookmarkCheck : Bookmark}
          variant="tertiary"
          size="sm"
          // Every other tertiary button here (Share/Directions/Report) is
          // a one-shot action, so it's fine for all of them to read as
          // brand-orange by default (Button's own tertiary variant
          // color). Save is a toggle, and needed a clearer on/off
          // distinction than "always orange" gave it: neutral (not
          // saved) vs. fully orange with a filled icon (saved).
          color={isSaved ? theme.colors.brand.primary : theme.colors.text.secondary}
          loading={isSaving}
          disabled={saveDisabled}
          onPress={onSave ?? (() => placeholder('Saving'))}
          style={styles.action}
        />
        <Button
          label="Share"
          leftIcon={Share2}
          variant="tertiary"
          size="sm"
          onPress={onShare ?? (() => placeholder('Sharing'))}
          style={styles.action}
        />
        <Button
          label="Directions"
          leftIcon={Navigation}
          variant="tertiary"
          size="sm"
          onPress={onDirections ?? (() => placeholder('Directions'))}
          style={styles.action}
        />
        <Button
          label="Report"
          leftIcon={Flag}
          variant="tertiary"
          size="sm"
          onPress={onReport ?? (() => placeholder('Reporting'))}
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  action: {
    flex: 1,
  },
});

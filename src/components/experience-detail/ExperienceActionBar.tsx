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
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Bookmark, Share2, Navigation, Flag } from 'lucide-react-native';

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
          leftIcon={Bookmark}
          variant="tertiary"
          size="sm"
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

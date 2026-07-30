/**
 * Stroll — Delete Account
 * app/(modals)/delete-account.tsx
 *
 * Sprint 9 Prompt 1 — Account Settings, Danger Zone. Design System §40:
 * modals are reserved for critical confirmations / destructive actions —
 * same X-to-dismiss header convention as collection-invitations.tsx and
 * follows/[userId].tsx, but this is the one irreversible action in the
 * whole app, so unlike those two, the close (X) button is disabled while
 * a deletion is actually in flight (see isDeleting below) — a
 * mid-request dismiss shouldn't be possible.
 *
 * ── The confirmation gate ──
 * The sprint doc requires the flow to "explain clearly that this action
 * is permanent" and "require explicit confirmation before continuing."
 * Reaching this screen at all is step one; step two is typing the
 * signed-in user's own @username into a field before the Delete button
 * enables — the same "type something specific to prove you mean it"
 * pattern GitHub/similar tools use for repo deletion, and stronger than
 * a single native Alert.alert (used elsewhere in this app only for
 * reversible actions like Log Out — see settings.tsx).
 *
 * ── After a successful delete ──
 * app/(modals) is a SIBLING of (app) at the root Stack (see
 * app/_layout.tsx — both are named Stack.Screen entries, not nested
 * inside one another), so (app)/_layout.tsx's own auth guard/Redirect
 * never actually runs for a screen presented from (modals) — flipping
 * authStore's status to 'unauthenticated' alone would leave this modal
 * sitting on screen with nothing to interact with. router.replace(...)
 * to the auth Welcome screen is required here, mirroring the same
 * "flow complete → replace the stack" pattern
 * app/(onboarding)/suggested-users.tsx already uses after onboarding
 * finishes.
 */

import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { X, AlertTriangle } from 'lucide-react-native';

import { theme } from '@/theme';
import { ScreenContainer, H4, Body, Caption, Button, TextInput, Icon } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { useDeleteAccount } from '@/hooks/useSettings';
import { ROUTES } from '@/constants/routes';

const WHAT_GETS_DELETED = [
  'Your profile, including your bio and photo',
  'Every experience and collection you created',
  'Your saved items, likes, and follow connections',
  'Your notifications',
] as const;

export default function DeleteAccountScreen() {
  const { profile, isLoading: profileLoading } = useProfile();
  const { submit, loading: isDeleting } = useDeleteAccount();
  const [confirmationText, setConfirmationText] = useState('');

  const expectedUsername = profile?.username.toLowerCase();
  const isConfirmed =
    Boolean(expectedUsername) && confirmationText.trim().toLowerCase() === expectedUsername;

  const handleClose = () => {
    if (isDeleting) return;
    router.back();
  };

  const handleDelete = async () => {
    if (!isConfirmed) return;
    const result = await submit();
    if (result.ok) {
      router.replace(ROUTES.auth.welcome as never);
    }
  };

  return (
    <ScreenContainer scroll padded={false}>
      <View style={styles.header}>
        <H4>Delete Account</H4>
        <Pressable
          onPress={handleClose}
          disabled={isDeleting}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Icon
            icon={X}
            size="md"
            color={isDeleting ? theme.colors.text.disabled : theme.colors.text.primary}
          />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.warningIconWrapper}>
          <Icon icon={AlertTriangle} size="xl" color={theme.colors.semantic.error} />
        </View>

        <Body align="center" style={styles.intro}>
          Deleting your account is permanent and cannot be undone.
        </Body>

        <View style={styles.list}>
          {WHAT_GETS_DELETED.map((item) => (
            <View key={item} style={styles.listRow}>
              <View style={styles.bullet} />
              <Body color={theme.colors.text.secondary} style={styles.listText}>
                {item}
              </Body>
            </View>
          ))}
        </View>

        <TextInput
          label={
            profile
              ? `Type "${profile.username}" to confirm`
              : 'Type your username to confirm'
          }
          value={confirmationText}
          onChangeText={setConfirmationText}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!profileLoading && !isDeleting}
          placeholder={profile?.username}
          containerStyle={styles.confirmInput}
        />

        <Button
          label="Delete My Account"
          variant="destructive"
          fullWidth
          disabled={!isConfirmed}
          loading={isDeleting}
          onPress={() => { void handleDelete(); }}
        />

        <Caption align="center" color={theme.colors.text.tertiary} style={styles.footnote}>
          This cannot be reversed once confirmed.
        </Caption>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingVertical:   theme.spacing.md,
  },
  content: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingTop:        theme.spacing.sm,
    paddingBottom:     theme.spacing['4xl'],
  },
  warningIconWrapper: {
    alignItems:   'center',
    marginBottom: theme.spacing.md,
  },
  intro: {
    marginBottom: theme.spacing.lg,
  },
  list: {
    gap:          theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  listRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           theme.spacing.sm,
  },
  bullet: {
    width:            5,
    height:           5,
    borderRadius:     theme.radius.full,
    backgroundColor:  theme.colors.text.tertiary,
    marginTop:        8,
  },
  listText: {
    flex: 1,
  },
  confirmInput: {
    marginBottom: theme.spacing.lg,
  },
  footnote: {
    marginTop: theme.spacing.md,
  },
});

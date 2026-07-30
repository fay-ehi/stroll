/**
 * Stroll — Settings
 * app/(app)/settings.tsx
 *
 * Sprint 9 Prompt 1 — Account Settings. Replaces the Sprint 4 placeholder
 * (PlaceholderScreen) that lived here — see this repo's git history for
 * that version.
 *
 * Scope, per the prompt doc: Username / Email / Password management,
 * Logout (moved here from the Profile screen's footer — see that
 * screen's own diff this sprint), and Delete Account. Explicitly NOT
 * profile editing (display name / bio / avatar), privacy, notification,
 * appearance, or language settings — those stay where they already are
 * or wait for a future sprint.
 *
 * A normal (app) stack push (like notifications.tsx, experience/[id],
 * place/[id]) — ArrowLeft + router.back(), not the X the codebase's
 * *modal* screens use. Reached from the Profile tab (a gear icon in that
 * screen's header — see profile.tsx's own diff this sprint).
 *
 * ── Inline editing, not a second navigation layer ──
 * Username/Email/Password each edit inline within their own row (tap the
 * row → it swaps for a small form with Save/Cancel), the same pattern
 * profile.tsx already established for Display Name/Bio (isEditing swaps
 * the header's read view for an edit view in place). This keeps every
 * account action reachable in the fewest taps (Design System §53) rather
 * than introducing three more pushed screens for three short forms.
 * Delete Account is the one exception — Design System §40 reserves
 * modals for critical/destructive confirmations, so that one action
 * alone opens app/(modals)/delete-account.tsx.
 *
 * ── Password row visibility ──
 * Hidden entirely (not just disabled) when hasPasswordAuth(user) is
 * false — see useSettings.ts's own doc for why that's always true today
 * but is written to adapt automatically later.
 */

import React, { useState } from 'react';
import { View, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, AtSign, Mail, Lock, LogOut, Trash2, HelpCircle, MessageSquarePlus, Info, Tag, FileCode, Shield, FileText, Users } from 'lucide-react-native';

import { theme } from '@/theme';
import { ScreenContainer, H4, Button, TextInput, Icon } from '@/components/ui';
import { SettingsSection, SettingsRow } from '@/components/settings';
import { useAuthState, useSignOut, useResetPassword } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import {
  useUsernameAvailability,
  useUpdateUsername,
  useEmailSettings,
  hasPasswordAuth,
} from '@/hooks/useSettings';
import { MODAL_ROUTES, ROUTES } from '@/constants/routes';
import { useAppVersionInfo } from '@/hooks/useAppVersionInfo';
import { hitSlop } from '@/theme/utils';

const HEADER_BUTTON_SIZE = 40;

type EditingField = 'username' | 'email' | 'password' | null;

export default function SettingsScreen() {
  const { user } = useAuthState();
  const { profile, isLoading: profileLoading } = useProfile();
  const { signOut, loading: signingOut } = useSignOut();
  const resetPassword = useResetPassword();
  const emailSettings = useEmailSettings();
  const updateUsernameMutation = useUpdateUsername();
  const versionInfo = useAppVersionInfo();

  const [editingField, setEditingField] = useState<EditingField>(null);

  const [usernameDraft, setUsernameDraft] = useState('');
  const usernameAvailability = useUsernameAvailability(usernameDraft, profile?.username);

  const [emailDraft, setEmailDraft] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<{ password?: string; confirm?: string }>({});

  const passwordAuthAvailable = hasPasswordAuth(user);

  // ── Username ────────────────────────────────────────────────────────────────
  const handleEditUsername = () => {
    setUsernameDraft(profile?.username ?? '');
    setEditingField('username');
  };

  const handleSaveUsername = () => {
    updateUsernameMutation.mutate(usernameDraft, {
      onSuccess: () => setEditingField(null),
    });
  };

  // ── Email ───────────────────────────────────────────────────────────────────
  const handleEditEmail = () => {
    setEmailDraft(user?.email ?? '');
    setEmailError(undefined);
    setEditingField('email');
  };

  const handleSaveEmail = async () => {
    const error = emailSettings.validate(emailDraft);
    if (error) {
      setEmailError(error);
      return;
    }
    setEmailError(undefined);
    const result = await emailSettings.submit(emailDraft);
    if (result.ok) setEditingField(null);
  };

  // ── Password ────────────────────────────────────────────────────────────────
  const handleEditPassword = () => {
    setNewPassword('');
    setConfirmPassword('');
    setPasswordErrors({});
    setEditingField('password');
  };

  const handleSavePassword = async () => {
    const errors = resetPassword.validate(newPassword, confirmPassword);
    if (errors.password || errors.confirm) {
      setPasswordErrors(errors);
      return;
    }
    setPasswordErrors({});
    const result = await resetPassword.submit(newPassword);
    if (result.ok) setEditingField(null);
  };

  // ── Shared cancel (any field) ──────────────────────────────────────────────
  const handleCancelEdit = () => {
    setEditingField(null);
    setEmailError(undefined);
    setPasswordErrors({});
  };

  // ── Log Out (moved here from the Profile screen footer) ───────────────────
  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  // ── Delete Account — opens the dedicated confirmation modal ────────────────
  const handleOpenDeleteAccount = () => {
    router.push(MODAL_ROUTES.deleteAccount as never);
  };

  return (
    <ScreenContainer scroll={false} padded={false} avoidKeyboard edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
          hitSlop={hitSlop(HEADER_BUTTON_SIZE)}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Icon icon={ArrowLeft} size="md" color={theme.colors.text.primary} />
        </Pressable>
        <H4 style={styles.headerTitle}>Settings</H4>
        {/* Empty spacer balances the back button's width so the title stays visually centered — same trick notifications.tsx uses. */}
        <View style={styles.headerButton} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection title="Account">
          {editingField === 'username' ? (
            <View key="username-edit" style={styles.editBlock}>
              <TextInput
                label="Username"
                leftIcon={AtSign}
                value={usernameDraft}
                onChangeText={setUsernameDraft}
                autoCapitalize="none"
                autoCorrect={false}
                errorText={
                  usernameAvailability.status === 'invalid' ||
                  usernameAvailability.status === 'reserved' ||
                  usernameAvailability.status === 'taken'
                    ? usernameAvailability.message
                    : undefined
                }
                success={usernameAvailability.status === 'available'}
                helperText={
                  usernameAvailability.status === 'checking' ? 'Checking availability…' : undefined
                }
              />
              <View style={styles.editActions}>
                <Button label="Cancel" variant="secondary" style={styles.editActionButton} onPress={handleCancelEdit} />
                <Button
                  label="Save"
                  style={styles.editActionButton}
                  disabled={usernameAvailability.status !== 'available'}
                  loading={updateUsernameMutation.isPending}
                  onPress={handleSaveUsername}
                />
              </View>
            </View>
          ) : (
            <SettingsRow
              key="username-row"
              label="Username"
              icon={AtSign}
              value={profile ? `@${profile.username}` : undefined}
              loading={profileLoading}
              onPress={handleEditUsername}
              accessibilityHint="Opens username editing"
            />
          )}

          {editingField === 'email' ? (
            <View key="email-edit" style={styles.editBlock}>
              <TextInput
                label="Email Address"
                leftIcon={Mail}
                value={emailDraft}
                onChangeText={(text) => { setEmailDraft(text); setEmailError(undefined); }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                errorText={emailError}
                helperText="We'll send a confirmation link to your new address before it takes effect."
              />
              <View style={styles.editActions}>
                <Button label="Cancel" variant="secondary" style={styles.editActionButton} onPress={handleCancelEdit} />
                <Button
                  label="Save"
                  style={styles.editActionButton}
                  loading={emailSettings.loading}
                  onPress={() => { void handleSaveEmail(); }}
                />
              </View>
            </View>
          ) : (
            <SettingsRow
              key="email-row"
              label="Email Address"
              icon={Mail}
              value={user?.email}
              onPress={handleEditEmail}
              accessibilityHint="Opens email editing"
            />
          )}

          {passwordAuthAvailable ? (
            editingField === 'password' ? (
              <View key="password-edit" style={styles.editBlock}>
                <TextInput
                  label="New Password"
                  leftIcon={Lock}
                  value={newPassword}
                  onChangeText={(text) => { setNewPassword(text); setPasswordErrors((e) => ({ ...e, password: undefined })); }}
                  secureTextEntry
                  errorText={passwordErrors.password}
                />
                <TextInput
                  label="Confirm New Password"
                  leftIcon={Lock}
                  value={confirmPassword}
                  onChangeText={(text) => { setConfirmPassword(text); setPasswordErrors((e) => ({ ...e, confirm: undefined })); }}
                  secureTextEntry
                  errorText={passwordErrors.confirm}
                  containerStyle={styles.secondField}
                />
                <View style={styles.editActions}>
                  <Button label="Cancel" variant="secondary" style={styles.editActionButton} onPress={handleCancelEdit} />
                  <Button
                    label="Save"
                    style={styles.editActionButton}
                    loading={resetPassword.loading}
                    onPress={() => { void handleSavePassword(); }}
                  />
                </View>
              </View>
            ) : (
              <SettingsRow
                key="password-row"
                label="Password"
                icon={Lock}
                value="••••••••"
                onPress={handleEditPassword}
                accessibilityHint="Opens password editing"
              />
            )
          ) : null}
        </SettingsSection>

        <SettingsSection title="Session">
          <SettingsRow
            label="Log Out"
            icon={LogOut}
            onPress={confirmLogout}
            loading={signingOut}
            chevron={false}
          />
        </SettingsSection>

        {/* Sprint 9 Prompt 2 — Help, About & Legal. Three new sections,
            all pure navigation rows (no local state, no mutations) — the
            actual content lives on the destination screens. */}
        <SettingsSection title="Help">
          <SettingsRow
            label="Help & Support"
            icon={HelpCircle}
            onPress={() => router.push(ROUTES.app.help as never)}
          />
          <SettingsRow
            label="Send Feedback"
            icon={MessageSquarePlus}
            onPress={() => router.push(ROUTES.app.feedback as never)}
          />
        </SettingsSection>

        <SettingsSection title="About">
          <SettingsRow
            label="About Stroll"
            icon={Info}
            onPress={() => router.push(ROUTES.app.about as never)}
          />
          <SettingsRow
            label="Version"
            icon={Tag}
            value={versionInfo.displayString}
            chevron={false}
          />
          <SettingsRow
            label="Open Source Licenses"
            icon={FileCode}
            onPress={() => router.push(ROUTES.app.licenses as never)}
          />
        </SettingsSection>

        <SettingsSection title="Legal">
          <SettingsRow
            label="Privacy Policy"
            icon={Shield}
            onPress={() => router.push(ROUTES.app.legal.privacy as never)}
          />
          <SettingsRow
            label="Terms of Service"
            icon={FileText}
            onPress={() => router.push(ROUTES.app.legal.terms as never)}
          />
          <SettingsRow
            label="Community Guidelines"
            icon={Users}
            onPress={() => router.push(ROUTES.app.legal.communityGuidelines as never)}
          />
        </SettingsSection>

        <SettingsSection title="Danger Zone" destructive>
          <SettingsRow
            label="Delete Account"
            icon={Trash2}
            destructive
            onPress={handleOpenDeleteAccount}
            accessibilityHint="Opens account deletion confirmation"
          />
        </SettingsSection>
      </ScrollView>
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
  headerButton: {
    width:          HEADER_BUTTON_SIZE,
    height:         HEADER_BUTTON_SIZE,
    alignItems:     'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex:      1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingTop:        theme.spacing.md,
    paddingBottom:     theme.spacing['4xl'],
  },
  editBlock: {
    paddingVertical: theme.spacing.md,
    gap:             theme.spacing.md,
  },
  secondField: {
    marginTop: 0,
  },
  editActions: {
    flexDirection: 'row',
    gap:           theme.spacing.sm,
  },
  editActionButton: {
    flex: 1,
  },
});

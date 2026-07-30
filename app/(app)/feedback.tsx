/**
 * Stroll — Send Feedback
 * app/(app)/feedback.tsx
 *
 * Sprint 9 Prompt 2 — Help, About & Legal. Reached from Settings' Help
 * section (see app/(app)/settings.tsx's diff this sprint).
 *
 * "Requirements: Feedback text, Character limit, Submit button, Success
 * state, Error state." All four: the Chip row is the type selector
 * (Bug/Feature/General — see feedbackService.ts's own doc for why this
 * is one table with a discriminator column, not three separate flows);
 * the TextInput's own maxLength enforces the character limit and a
 * Caption counter beneath it makes that limit visible as you type;
 * Submit is a single Button whose `loading` is
 * useSubmitFeedback().isPending; the Success state fully replaces the
 * form with an EmptyState-shaped confirmation (not just a toast — the
 * mutation's onSuccess already fires one of those too, see
 * useFeedback.ts) with a "Send More Feedback" action that resets back to
 * a blank form; the Error state is the same toast plus the form staying
 * exactly as the user left it, so "Provide retry actions" is just
 * "tap Submit again" — the same pattern every other mutation-backed
 * screen in this app already uses (see useSettings.ts's hooks).
 */

import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, CheckCircle2 } from 'lucide-react-native';

import { theme } from '@/theme';
import { ScreenContainer, H4, Label, Caption, Chip, TextInput, Button, EmptyState, Icon } from '@/components/ui';
import { useSubmitFeedback, FEEDBACK_MESSAGE_MAX_LENGTH, FEEDBACK_TYPE_LABELS } from '@/hooks/useFeedback';
import type { FeedbackType } from '@/services/feedbackService';
import { hitSlop } from '@/theme/utils';

const HEADER_BUTTON_SIZE = 40;
const FEEDBACK_TYPES: readonly FeedbackType[] = ['general', 'bug', 'feature'];

export default function FeedbackScreen() {
  const submitFeedback = useSubmitFeedback();
  const [type, setType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const trimmedLength = message.trim().length;
  const canSubmit = trimmedLength > 0 && trimmedLength <= FEEDBACK_MESSAGE_MAX_LENGTH;

  const handleSubmit = () => {
    if (!canSubmit) return;
    submitFeedback.mutate(
      { type, message },
      { onSuccess: () => setSubmitted(true) }
    );
  };

  const handleSendAnother = () => {
    setMessage('');
    setType('general');
    setSubmitted(false);
  };

  return (
    <ScreenContainer scroll={false} padded={false}>
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
        <H4 style={styles.headerTitle}>Send Feedback</H4>
        <View style={styles.headerButton} />
      </View>

      {submitted ? (
        <View style={styles.successContainer}>
          <EmptyState
            icon={CheckCircle2}
            title="Thanks for the feedback!"
            description="We read every submission — it genuinely helps shape what we build next."
            action={{ label: 'Send More Feedback', onPress: handleSendAnother, variant: 'secondary' }}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Label style={styles.sectionLabel}>WHAT KIND OF FEEDBACK?</Label>
          <View style={styles.chipRow}>
            {FEEDBACK_TYPES.map((option) => (
              <Chip
                key={option}
                label={FEEDBACK_TYPE_LABELS[option]}
                selected={type === option}
                onPress={() => setType(option)}
              />
            ))}
          </View>

          <TextInput
            label="Your feedback"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            maxLength={FEEDBACK_MESSAGE_MAX_LENGTH}
            placeholder="Tell us what's working, what isn't, or what you'd like to see..."
            containerStyle={styles.textInput}
          />
          <Caption
            color={theme.colors.text.tertiary}
            align="right"
            style={styles.counter}
          >
            {message.length}/{FEEDBACK_MESSAGE_MAX_LENGTH}
          </Caption>

          <Button
            label="Submit Feedback"
            fullWidth
            disabled={!canSubmit}
            loading={submitFeedback.isPending}
            onPress={handleSubmit}
          />
        </ScrollView>
      )}
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
  content: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingTop:        theme.spacing.sm,
    paddingBottom:     theme.spacing['4xl'],
  },
  sectionLabel: {
    marginBottom: theme.spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           theme.spacing.sm,
    marginBottom:  theme.spacing.lg,
  },
  textInput: {
    marginBottom: 0,
  },
  counter: {
    marginTop:    theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  successContainer: {
    flex:              1,
    justifyContent:    'center',
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
  },
});

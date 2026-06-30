/**
 * Stroll — Forgot Password
 * app/(auth)/forgot-password.tsx
 *
 * PRD §8.1 — Field: Email. Action: Send Reset Link.
 * Sprint 4: placeholder only, no Supabase / auth logic.
 */

import React from 'react';
import { PlaceholderScreen } from '@/components/placeholder/PlaceholderScreen';

export default function ForgotPasswordScreen() {
  return (
    <PlaceholderScreen
      title="Forgot Password"
      description="Enter your email to receive a password reset link."
    />
  );
}

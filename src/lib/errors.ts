/**
 * Stroll — Error Utilities
 * src/lib/errors.ts
 *
 * Normalizes every error type the application might encounter into a
 * single, consistent shape (StrollError) so UI components never need
 * to inspect raw error objects from Supabase, fetch, or unexpected throws.
 *
 * Error categories (Design System §35 — Error States):
 *   "Every error state should include: Simple explanation, Suggested
 *   solution, Retry action (where appropriate). Avoid technical language.
 *   Instead of 'Network request failed.' use 'We couldn't load this right
 *   now. Please try again.'"
 *
 * Usage:
 *   import { normalizeError, isNetworkError } from '@/lib/errors';
 *
 *   try {
 *     const { data, error } = await supabase.from('experiences').select();
 *     if (error) throw normalizeError(error);
 *   } catch (err) {
 *     const strollError = normalizeError(err);
 *     showToast({ type: 'error', message: strollError.userMessage });
 *   }
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR'
  | 'TIMEOUT'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'USERNAME_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'RATE_LIMITED'
  | 'WEAK_PASSWORD'
  | 'UNKNOWN';

export interface StrollError {
  /** Machine-readable code for programmatic handling. */
  code: ErrorCode;
  /** Developer-facing message — shown in dev logs, never in production UI. */
  devMessage: string;
  /** User-facing message — always calm, never technical (Design System §35). */
  userMessage: string;
  /** The original error for logging/debugging. */
  originalError?: unknown;
  /** Whether the operation is worth retrying automatically. */
  isRetryable: boolean;
}

// ─── User Messages ─────────────────────────────────────────────────────────────
// Defined centrally so the tone stays consistent (Design System §35).
// Every message must be calm, non-blaming, and action-oriented.

const USER_MESSAGES: Record<ErrorCode, string> = {
  NETWORK_ERROR:    "We couldn't load this right now. Check your connection and try again.",
  UNAUTHORIZED:     'Please sign in to continue.',
  FORBIDDEN:        "You don't have permission to do that.",
  NOT_FOUND:        "We couldn't find what you're looking for.",
  CONFLICT:         'This action conflicts with something that already exists.',
  VALIDATION_ERROR: 'Please check your information and try again.',
  SERVER_ERROR:     "Something went wrong on our end. Please try again shortly.",
  TIMEOUT:          'This is taking longer than expected. Please try again.',
  // Sprint 1 Prompt 4 fix: these six used to all fall through to the generic
  // status-code mapping below (mostly landing on VALIDATION_ERROR or UNKNOWN),
  // which is exactly the "an error occurred" vagueness this fix addresses.
  EMAIL_ALREADY_REGISTERED: 'An account with this email already exists. Try signing in instead.',
  USERNAME_TAKEN:           'This username is already taken. Please choose another.',
  // Deliberately doesn't say which of email/password is wrong — Supabase's
  // API doesn't distinguish "wrong password" from "no account with this
  // email" either, by design, to prevent attackers from using the login
  // form to discover which emails have accounts (user enumeration). See
  // this fix's write-up for the tradeoff and how to change it if you'd
  // rather prioritize UX over that protection.
  INVALID_CREDENTIALS:      'Incorrect email or password. Please try again.',
  EMAIL_NOT_CONFIRMED:      'Please confirm your email before signing in — check your inbox for the link.',
  RATE_LIMITED:             'Too many attempts. Please wait a moment and try again.',
  WEAK_PASSWORD:            'Please choose a stronger password.',
  UNKNOWN:          "We couldn't load this right now. Please try again.",
};

const RETRYABLE_CODES: ErrorCode[] = [
  'NETWORK_ERROR',
  'SERVER_ERROR',
  'TIMEOUT',
  'UNKNOWN',
];

// ─── Supabase Auth Error Codes ─────────────────────────────────────────────────
// Supabase Auth error codes are the *machine-readable* `code` property, not
// the human-readable `message` (which can change across versions) — this is
// what Supabase's own docs recommend keying off. See:
// https://supabase.com/docs/guides/auth/debugging/error-codes
// Only mapped here in authService/profileService call sites where we KNOW
// we're looking at an auth error, so this stays out of the generic
// Postgrest error path below.

const AUTH_ERROR_CODE_MAP: Partial<Record<string, ErrorCode>> = {
  user_already_exists:        'EMAIL_ALREADY_REGISTERED',
  email_exists:                'EMAIL_ALREADY_REGISTERED',
  invalid_credentials:         'INVALID_CREDENTIALS',
  email_not_confirmed:         'EMAIL_NOT_CONFIRMED',
  weak_password:               'WEAK_PASSWORD',
  over_email_send_rate_limit:  'RATE_LIMITED',
  over_request_rate_limit:     'RATE_LIMITED',
  over_sms_send_rate_limit:    'RATE_LIMITED',
};

// ─── Supabase Error Shape ──────────────────────────────────────────────────────

interface SupabaseError {
  message: string;
  code?: string;
  status?: number;
  details?: string;
  hint?: string;
}

function isSupabaseError(err: unknown): err is SupabaseError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as Record<string, unknown>).message === 'string'
  );
}

function httpStatusToCode(status?: number): ErrorCode {
  if (!status) return 'UNKNOWN';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 422) return 'VALIDATION_ERROR';
  // 429 (Too Many Requests) — added for Sprint 4 Prompt 3's Google
  // Places integration, where a quota-exceeded response is a real,
  // expected failure mode this app needs to surface distinctly rather
  // than as a generic UNKNOWN error. Applies to any other 429-emitting
  // caller too (Supabase, future providers), not just Google.
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500)  return 'SERVER_ERROR';
  return 'UNKNOWN';
}

// ─── Normalizer ────────────────────────────────────────────────────────────────

export function normalizeError(err: unknown): StrollError {
  // Already normalized — return as-is.
  if (isStrollError(err)) return err;

  // Network / fetch errors.
  if (err instanceof TypeError && err.message.toLowerCase().includes('network')) {
    return makeError('NETWORK_ERROR', err.message, err);
  }

  // Timeout errors.
  if (err instanceof Error && err.name === 'AbortError') {
    return makeError('TIMEOUT', err.message, err);
  }

  // Supabase errors (PostgrestError, AuthError — both have message + status).
  if (isSupabaseError(err)) {
    // Check for a known Supabase Auth error code first — these need a much
    // more specific message than the generic HTTP-status mapping below can
    // give (e.g. status 400 alone can't tell "wrong password" apart from
    // "malformed request").
    const authCode = err.code ? AUTH_ERROR_CODE_MAP[err.code] : undefined;
    if (authCode) return makeError(authCode, err.message, err);

    const code = httpStatusToCode(err.status);
    return makeError(code, err.message, err);
  }

  // Standard JS Error.
  if (err instanceof Error) {
    return makeError('UNKNOWN', err.message, err);
  }

  // Strings or other primitives thrown directly.
  return makeError('UNKNOWN', String(err), err);
}

export function makeError(
  code: ErrorCode,
  devMessage: string,
  originalError?: unknown
): StrollError {
  return {
    code,
    devMessage,
    userMessage:   USER_MESSAGES[code] ?? USER_MESSAGES.UNKNOWN,
    originalError,
    isRetryable:   RETRYABLE_CODES.includes(code),
  };
}

// ─── Type Guard ────────────────────────────────────────────────────────────────

export function isStrollError(err: unknown): err is StrollError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'userMessage' in err &&
    'isRetryable' in err
  );
}

// ─── Specific Predicates ───────────────────────────────────────────────────────

export function isNetworkError(err: unknown): boolean {
  return isStrollError(err) && err.code === 'NETWORK_ERROR';
}

export function isUnauthorizedError(err: unknown): boolean {
  return isStrollError(err) && err.code === 'UNAUTHORIZED';
}

export function isNotFoundError(err: unknown): boolean {
  return isStrollError(err) && err.code === 'NOT_FOUND';
}

// ─── Logging ───────────────────────────────────────────────────────────────────

import { devLog } from './config';

/**
 * Logs a normalized error in development. In future, replace the body
 * with a real crash-reporting SDK call (Sentry, Bugsnag, etc.) without
 * changing any call sites.
 */
export function logError(context: string, err: unknown): void {
  const normalized = normalizeError(err);
  devLog(`[Error: ${context}]`, normalized.code, normalized.devMessage, normalized.originalError);
}

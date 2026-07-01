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
  UNKNOWN:          "We couldn't load this right now. Please try again.",
};

const RETRYABLE_CODES: ErrorCode[] = [
  'NETWORK_ERROR',
  'SERVER_ERROR',
  'TIMEOUT',
  'UNKNOWN',
];

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
    const code = httpStatusToCode((err as { status?: number }).status);
    return makeError(code, err.message, err);
  }

  // Standard JS Error.
  if (err instanceof Error) {
    return makeError('UNKNOWN', err.message, err);
  }

  // Strings or other primitives thrown directly.
  return makeError('UNKNOWN', String(err), err);
}

function makeError(
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

/**
 * Stroll — Toast Store
 * src/stores/toastStore.ts
 *
 * Zustand store managing the toast notification queue.
 * UI components import `useToastStore` to read the active toast.
 * Anywhere in the app imports `showToast` / `hideToast` to trigger one.
 *
 * Design System §36 — Toast Notifications:
 *   Duration: 3 seconds
 *   Position: Bottom of screen
 *   Types: Success, Info, Warning, Error
 *   Toasts should never interrupt user flow.
 */

import { create } from 'zustand';
import { TIMEOUTS } from '@/constants/app';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastPayload {
  /** The message shown to the user — keep short and action-oriented. */
  message: string;
  /** Visual variant, maps to semantic colors. */
  type: ToastType;
  /** Override the default 3-second duration. */
  duration?: number;
}

interface ToastState {
  /** The currently visible toast, or null when hidden. */
  current: ToastPayload | null;
  /** Queue of pending toasts — shown one at a time. */
  queue: ToastPayload[];
  /** Internal: show the next toast from the queue. */
  _showNext: () => void;
  /** Internal: dismiss the current toast. */
  _dismiss: () => void;
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useToastStore = create<ToastState>((set, get) => ({
  current: null,
  queue:   [],

  _showNext: () => {
    const { queue } = get();
    if (queue.length === 0) return;

    const [next, ...remaining] = queue;
    if (!next) return;

    set({ current: next, queue: remaining });

    // Auto-dismiss after duration.
    setTimeout(() => {
      get()._dismiss();
    }, next.duration ?? TIMEOUTS.TOAST_DURATION_MS);
  },

  _dismiss: () => {
    set({ current: null });
    // Wait one frame for the hide animation, then show next if queued.
    setTimeout(() => {
      get()._showNext();
    }, 350);
  },
}));

// ─── Public API ────────────────────────────────────────────────────────────────
// Import these functions anywhere in the app — they don't require a hook.

/**
 * Shows a toast notification. Queues it if one is already visible.
 *
 * Usage:
 *   showToast({ type: 'success', message: 'Experience published!' });
 *   showToast({ type: 'error', message: error.userMessage });
 */
export function showToast(payload: ToastPayload): void {
  const { current, queue, _showNext } = useToastStore.getState();

  if (!current) {
    // Nothing showing — put it in queue and trigger immediately.
    useToastStore.setState({ queue: [...queue, payload] });
    _showNext();
  } else {
    // Already showing — add to queue; it will auto-advance on dismiss.
    useToastStore.setState({ queue: [...queue, payload] });
  }
}

/**
 * Immediately hides the current toast.
 */
export function hideToast(): void {
  useToastStore.getState()._dismiss();
}

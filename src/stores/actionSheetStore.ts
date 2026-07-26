/**
 * Stroll — Action Sheet Store
 * src/stores/actionSheetStore.ts
 *
 * Zustand store managing the single active action sheet. Mirrors
 * toastStore.ts's pattern exactly: UI (ActionSheet.tsx, rendered once by
 * ActionSheetProvider in the root layout) reads `current`; anywhere else
 * in the app imports `showActionSheet` / `hideActionSheet` to trigger or
 * dismiss one, with no hook required.
 *
 * Why this exists: several screens previously built their "long-press
 * management menu" (Edit / Add to Collection / Delete, Manage Collection,
 * Profile Photo, etc.) on top of React Native's `Alert.alert`, which
 * renders the OS's own system dialog — a plain, un-themed list of text
 * buttons. That's fine for a genuine yes/no confirmation (this app still
 * uses Alert.alert for those — "Delete this draft?", "Sign out?", and
 * so on), but it looks completely out of place for an options MENU,
 * breaking the app's visual language exactly where the user notices it
 * most (their own content). This store backs a custom bottom-sheet
 * component instead — same rounded-corner, icon-forward, brand-colored
 * language as every other surface in the app.
 *
 * Only one sheet is ever shown at a time — unlike toasts, sheets block
 * interaction with the rest of the screen until dismissed, so there's no
 * queue, just a single `current` slot.
 */

import { create } from 'zustand';
import type { LucideIcon } from 'lucide-react-native';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ActionSheetOption {
  /** Row label. */
  label: string;
  /** Optional leading icon — Lucide only, per Design System §12. */
  icon?: LucideIcon;
  /** Renders the row (icon + label) in the semantic error color, for irreversible/destructive actions. */
  destructive?: boolean;
  /** Greys out the row and makes it non-interactive. */
  disabled?: boolean;
  onPress: () => void;
}

export interface ActionSheetPayload {
  /** Optional heading shown above the option list (e.g. an experience's title, or "Manage Collection"). */
  title?: string;
  /** Optional supporting line under the title. */
  message?: string;
  options: ActionSheetOption[];
  /** Defaults to "Cancel". */
  cancelLabel?: string;
}

interface ActionSheetState {
  current: ActionSheetPayload | null;
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useActionSheetStore = create<ActionSheetState>(() => ({
  current: null,
}));

// ─── Public API ────────────────────────────────────────────────────────────────
// Import these functions anywhere in the app — they don't require a hook.
//
// Usage:
//   showActionSheet({
//     title: experience.title,
//     options: [
//       { label: 'Edit', icon: Pencil, onPress: handleEdit },
//       { label: 'Delete', icon: Trash2, destructive: true, onPress: handleDelete },
//     ],
//   });

export function showActionSheet(payload: ActionSheetPayload): void {
  useActionSheetStore.setState({ current: payload });
}

/** Dismisses the active action sheet without invoking any option. */
export function hideActionSheet(): void {
  useActionSheetStore.setState({ current: null });
}

/**
 * Stroll — Profile UI Store
 * src/stores/profileStore.ts
 *
 * UI-only state for the profile domain. The profile itself (server state)
 * lives entirely in TanStack Query via `useProfile()` — this store never
 * duplicates that. It only holds transient, client-side state TanStack
 * Query has no business owning:
 *   - Whether the profile verification screen is in "editing" mode
 *   - Draft field values while editing (before Save is pressed / discarded)
 *   - Avatar upload stage (used to drive progress UI)
 *
 * Architecture: UI screens → hooks (useProfile) → this store (UI state only)
 *                                               → services → Supabase
 * This store never imports from services or calls Supabase directly —
 * that's `useUploadAvatar()`'s job; it only tracks the stage so the UI
 * can render the right loading state.
 */

import { create } from 'zustand';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type AvatarUploadStage =
  | 'idle'
  | 'picking'     // Native image picker is open
  | 'validating'  // Checking type/size of the picked asset
  | 'uploading'   // Sending the file to Supabase Storage
  | 'saving';     // Writing the new avatar_url to the profile row

export interface ProfileDraft {
  displayName: string;
  bio:         string;
}

interface ProfileUIState {
  // ── Editing ──────────────────────────────────────────────────────────────
  isEditing: boolean;
  draft:     ProfileDraft | null;

  /** Enters edit mode, seeding the draft from the current profile values. */
  startEditing:  (initial: ProfileDraft) => void;
  /** Updates one or more draft fields without leaving edit mode. */
  updateDraft:   (patch: Partial<ProfileDraft>) => void;
  /** Discards the draft and exits edit mode (Cancel). */
  cancelEditing: () => void;
  /** Exits edit mode after a successful save, clearing the draft. */
  finishEditing: () => void;

  // ── Avatar Upload ────────────────────────────────────────────────────────
  avatarUploadStage: AvatarUploadStage;
  setAvatarUploadStage: (stage: AvatarUploadStage) => void;
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useProfileStore = create<ProfileUIState>((set) => ({
  isEditing: false,
  draft:     null,

  startEditing: (initial) => set({ isEditing: true, draft: initial }),

  updateDraft: (patch) =>
    set((s) => ({ draft: s.draft ? { ...s.draft, ...patch } : null })),

  cancelEditing: () => set({ isEditing: false, draft: null }),
  finishEditing: () => set({ isEditing: false, draft: null }),

  avatarUploadStage: 'idle',
  setAvatarUploadStage: (stage) => set({ avatarUploadStage: stage }),
}));

// ─── Selector Helpers ──────────────────────────────────────────────────────────

export const selectIsAvatarUploading = (s: ProfileUIState): boolean =>
  s.avatarUploadStage !== 'idle';

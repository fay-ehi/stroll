/**
 * Stroll — Location UI Store
 * src/stores/locationStore.ts
 *
 * Sprint 4 Prompt 2 — Location-Aware Nearby Experience Surfacing.
 *
 * Holds only session-scoped UI state — never persisted (no storage
 * middleware), so it resets naturally on every app relaunch, which is
 * exactly the "session" boundary both the permission soft-ask and the
 * city-switch suggestion are specified against:
 *   - softAskShownThisSession: the in-app permission card is allowed to
 *     appear "never more than once per app open" (Requirement 1).
 *   - citySwitchSuggestion: tracks which detected mismatch city has
 *     already been shown/dismissed this session (Requirement 4) — a
 *     NEW detected city replaces the record and can be shown once; the
 *     SAME detected city, once dismissed, stays suppressed all session.
 *
 * No server state lives here (that's useLocation.ts / useNearbyExperiences.ts
 * via TanStack Query) and no UI is imported here, per the app's State Rules.
 */

import { create } from 'zustand';

interface CitySwitchSuggestionRecord {
  city: string;
  dismissed: boolean;
}

interface LocationUIState {
  softAskShownThisSession: boolean;
  citySwitchSuggestion: CitySwitchSuggestionRecord | null;

  markSoftAskShown: () => void;
  /** No-ops if `city` is already the tracked mismatch this session — re-presenting it would silently undo a dismissal the next time the feed re-evaluates the match. */
  presentCitySwitchSuggestion: (city: string) => void;
  dismissCitySwitchSuggestion: () => void;
  /** Called once the mismatch resolves (permission lost, city match regained, or the person tapped Switch) so a genuinely new mismatch later this session can be shown fresh. */
  clearCitySwitchSuggestion: () => void;
}

export const useLocationStore = create<LocationUIState>((set, get) => ({
  softAskShownThisSession: false,
  citySwitchSuggestion: null,

  markSoftAskShown: () => set({ softAskShownThisSession: true }),

  presentCitySwitchSuggestion: (city) => {
    const current = get().citySwitchSuggestion;
    if (current && current.city === city) return;
    set({ citySwitchSuggestion: { city, dismissed: false } });
  },

  dismissCitySwitchSuggestion: () =>
    set((state) =>
      state.citySwitchSuggestion
        ? { citySwitchSuggestion: { ...state.citySwitchSuggestion, dismissed: true } }
        : state
    ),

  clearCitySwitchSuggestion: () => set({ citySwitchSuggestion: null }),
}));

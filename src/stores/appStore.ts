import { create } from 'zustand';
import { DEFAULT_CITY } from '@constants/config';
import type { City } from '@types/models';

interface AppState {
  activeCity: City;
  isOnboarded: boolean;
  setActiveCity: (city: City) => void;
  setOnboarded: (onboarded: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeCity: DEFAULT_CITY,
  isOnboarded: false,
  setActiveCity: (city) => set({ activeCity: city }),
  setOnboarded: (onboarded) => set({ isOnboarded: onboarded }),
}));

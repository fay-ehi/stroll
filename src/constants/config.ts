import type { City } from '@types/models';

export const CITIES: City[] = ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan'];
export const DEFAULT_CITY: City = 'Lagos';

export const VIBE_TAGS = [
  'Quiet', 'Romantic', 'Luxury', 'Budget Friendly', 'Hidden Gem',
  'Lively', 'Cozy', 'Instagrammable', 'Late Night', 'Date Spot',
  'Remote Work Friendly', 'Family Friendly', 'Great for Groups',
] as const;

export const VISIT_TYPES = ['Solo', 'Date', 'Friends', 'Family', 'Work', 'Group Event'] as const;

export const AMOUNT_SPENT_OPTIONS = [
  'Under ₦5,000', '₦5,000 – ₦10,000', '₦10,000 – ₦20,000',
  '₦20,000 – ₦50,000', '₦50,000+',
] as const;

export const PAGINATION = {
  feedPageSize: 20,
  searchPageSize: 10,
} as const;

export const PHOTO_UPLOAD = {
  maxPhotos: 10,
  quality: 0.8,
  maxDimension: 1920,
} as const;

export const QueryKeys = {
  session: ['session'] as const,
  experiences: {
    feed: (city: City) => ['experiences', 'feed', city] as const,
    byId: (id: string) => ['experiences', id] as const,
    byUser: (userId: string) => ['experiences', 'user', userId] as const,
  },
  places: {
    byId: (id: string) => ['places', id] as const,
    search: (query: string) => ['places', 'search', query] as const,
  },
  collections: {
    byId: (id: string) => ['collections', id] as const,
    byUser: (userId: string) => ['collections', 'user', userId] as const,
  },
  users: {
    byId: (id: string) => ['users', id] as const,
    profile: () => ['users', 'profile'] as const,
  },
  savedPlaces: {
    all: () => ['saved-places'] as const,
  },
} as const;

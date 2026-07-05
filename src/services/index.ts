/**
 * Stroll — Services Barrel
 * src/services/index.ts
 *
 * Services are thin wrappers around external APIs (Supabase).
 * Import from here in hooks and stores — never in UI components.
 */

export {
  signUp,
  signIn,
  signOut,
  requestPasswordReset,
  updatePassword,
  getSession,
  onAuthStateChange,
  type AuthResult,
  type SignUpCredentials,
  type SignUpResult,
  type SignInCredentials,
  type AuthStateCallback,
} from './authService';

export {
  createProfile,
  getProfile,
  updateProfile,
  checkUsernameAvailable,
  uploadAvatar,
  removeAvatar,
  completeOnboarding,
  ensureProfile,
  type Profile,
  type ProfileResult,
  type CreateProfilePayload,
  type UpdateProfilePayload,
} from './profileService';

export {
  fetchFeaturedPlaces,
  fetchNearbyPlaces,
  fetchPlacesByCity,
  fetchPlacesByCategory,
  fetchPlaceById,
  type PlacesResult,
  type PlaceRowWithDistance,
} from './placesService';

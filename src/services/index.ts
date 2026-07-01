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

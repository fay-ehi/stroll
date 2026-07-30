/**
 * Stroll — App Version Info Hook
 * src/hooks/useAppVersionInfo.ts
 *
 * Sprint 9 Prompt 2 — Help, About & Legal: Version. Backs both the
 * Settings screen's "Version" row and the About Stroll screen's own
 * Version/Build/Copyright block — one hook, two call sites, so they can
 * never drift out of sync with each other.
 *
 * "Populate dynamically where possible" (prompt doc): version and build
 * number come from expo-constants (already a dependency — nothing new
 * added), which reads app.json/EAS build metadata rather than a
 * hardcoded string.
 *
 * ── Environment ──
 * expo-constants alone can't distinguish "TestFlight" from "App Store"
 * the way expo-updates' release channel/branch data can (not a
 * dependency of this project) — so this uses the closest available
 * signal without adding one: `__DEV__` for a local dev build, otherwise
 * `Constants.executionEnvironment` (`storeClient` = running inside Expo
 * Go, `standalone`/`bare` = an actual built binary, which is what both a
 * TestFlight build and a production App Store build are). This can't
 * tell TestFlight and Production apart from the client alone — labeled
 * "Production" for both today; a future sprint adding expo-updates could
 * refine this further without any other call site changing.
 */

import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export interface AppVersionInfo {
  /** e.g. "1.0.0" — from app.json's `expo.version`. */
  version: string;
  /** iOS `ios.buildNumber` / Android `android.versionCode`, stringified. Null when EAS hasn't injected one yet (common on a fresh checkout before a first build). */
  buildNumber: string | null;
  environment: 'Development' | 'Production';
  /** Convenience — "1.0.0 (42)" when a build number is known, "1.0.0" otherwise. What the Settings screen's Version row and the About screen both actually display. */
  displayString: string;
}

export function useAppVersionInfo(): AppVersionInfo {
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const buildNumber =
    Platform.OS === 'ios'
      ? (Constants.expoConfig?.ios?.buildNumber ?? null)
      : Platform.OS === 'android'
        ? (Constants.expoConfig?.android?.versionCode != null
            ? String(Constants.expoConfig.android.versionCode)
            : null)
        : null;

  // See this file's module doc for why "TestFlight" specifically isn't
  // distinguishable from this signal alone.
  const environment: AppVersionInfo['environment'] =
    __DEV__ || Constants.executionEnvironment === ExecutionEnvironment.StoreClient
      ? 'Development'
      : 'Production';

  const displayString = buildNumber ? `${version} (${buildNumber})` : version;

  return { version, buildNumber, environment, displayString };
}

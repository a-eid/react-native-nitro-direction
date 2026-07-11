# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] — 2026-07-11

### Added
- Initial release.
- `LayoutDirection` Nitro HybridObject (singleton) owning the app's layout
  direction, modelled on `Appearance` / `Dimensions` / `Keyboard`.
- Public JS API: `setRTL`, `toggleDirection`, `applyLocaleDirection`,
  `isRTLLocale`, plus the reactive `layoutDirection.isRTL` / `.direction` and an
  `onDirectionChanged` native→JS callback.
- Runtime LTR ⇄ RTL flip with **no restart, reload or remount** — rides React
  Native's own cold-start re-layout path on the live Fabric surface (iOS:
  `UIContentSizeCategoryDidChangeNotification` + Yoga cache-bust; Android:
  forced `ReactSurfaceView` measure pass).
- Native chrome mirroring: native-stack header, native tab bar, and on iOS the
  edge swipe-back gesture (rebinds to the mirrored edge).
- Keeps JS-side `I18nManager.isRTL` in sync on every flip.
- Android manifest merges `android:supportsRtl="true"` into the host app.
- Loud warning (with issue URL) if the iOS `RCTFabricSurface` surface API ever
  changes under us, so an RN upgrade can't silently break the flip.
- JS unit tests (57) covering `isRTLLocale`, `setRTL`, `toggleDirection`,
  `applyLocaleDirection`, and the `onDirectionChanged` callback.
- Example app: a stability torture-test (TextInput, horizontal/inverted/sticky
  FlatLists, modal-flipped-while-open, locale-driven flip, scroll-offset
  preservation).

### Compatibility
- React Native `0.86` (New Architecture / Fabric).
- `react-native-nitro-modules` `0.36.x`.
- iOS 13+, Android API 23+.

### Known limitations
- The flip mechanism depends on non-contractual React Native internals (see
  README → "How it works → Non-contractual internals"). Re-verify on major RN
  upgrades.
- Unistyles / Uniwind integration is **not** included in v1 — styling-engine
  integrations are left to consumers via the `onDirectionChanged` callback, in
  line with the package's "native owns state, styling engines consume" design.

# react-native-nitro-direction

Flip your React Native app between **LTR and RTL at runtime** — **no restart, no
bundle reload, no remount**. One call re-mirrors the whole UI *and* the native
chrome (navigation header, native tab bar, and on iOS the edge swipe-back
gesture), in place, keeping the user's navigation stack, scroll and form state
intact.

Built on [Nitro Modules](https://github.com/mrousavy/nitro) — a singleton
HybridObject that owns the app's layout direction, modelled on `Appearance` /
`Dimensions` / `Keyboard`: native owns the state, JS (and styling engines)
consume it.

The usual `I18nManager.forceRTL(true)` needs an app restart to take effect on the
New Architecture. This package doesn't — it rides React Native's own re-layout
paths (the ones a cold start uses) to re-lay out every live Fabric surface, and
mirrors the native chrome alongside it. No `node_modules` patch, no navigator
swap, no root-key remount.

- **Runtime flip** — LTR ⇄ RTL without restarting.
- **Nitro Modules** — singleton HybridObject, JSI-direct, native callbacks.
- **Native New Architecture** (Fabric / bridgeless), iOS + Android.
- **Autolinked** — no `MainApplication` / Podfile edits.
- **Tiny API** — `setRTL`, `toggleDirection`, plus a reactive `isRTL` / `direction`
  and an `onDirectionChanged` callback.

---

## Requirements

- React Native **New Architecture (Fabric)** — default on RN 0.76+ / Expo SDK 52+.
- [`react-native-nitro-modules`](https://www.npmjs.com/package/react-native-nitro-modules) as a peer.
- A **bare app** (RN CLI) or **development build** (Expo). Native code does not
  run in Expo Go.
- iOS 13+ / Android API 23+ with `android:supportsRtl="true"` (the package's
  manifest merges this in for you).

**Tested against:** React Native `0.86` · `react-native-nitro-modules` `0.36.x`.

> ⚠️ **The flip rides non-contractual React Native internals** — see
> [How it works](#how-it-works). Re-verify on a major RN upgrade; the module
> logs a loud warning if the iOS surface API has changed.

## Installation

```sh
npm install react-native-nitro-direction react-native-nitro-modules
# or: bun add react-native-nitro-direction react-native-nitro-modules
```

Rebuild the native app — the JS wrapper resolves immediately, but the native
HybridObject has to compile into the binary:

```sh
# bare React Native
cd ios && pod install && cd ..
npx react-native run-ios && npx react-native run-android
```

Autolinks on both platforms — no manual native edits.

## Quick start

```ts
import {
  setRTL,
  toggleDirection,
  layoutDirection,
} from 'react-native-nitro-direction'

await setRTL(true)   // flip to RTL, natively, in place
await setRTL(false)  // back to LTR

await toggleDirection() // flip to the opposite of current

layoutDirection.isRTL     // boolean — live read
layoutDirection.direction // 'rtl' | 'ltr'

// Native → JS event, fires after the visual flip has landed
layoutDirection.onDirectionChanged = (isRTL: boolean) => {
  // styling engines / listeners recompute here
}
```

`setRTL` also keeps the JS-side `I18nManager.isRTL` constant in sync.

## API

| Export | Signature | Description |
| --- | --- | --- |
| `setRTL` | `(isRTL: boolean) => Promise<boolean>` | Flip layout direction at runtime. Resolves to the applied direction once the native flip + re-layout has landed. |
| `toggleDirection` | `() => Promise<boolean>` | Flip to the opposite of the current direction. |
| `layoutDirection` | singleton `HybridObject` | The native runtime. `isRTL`, `direction`, `setRTL`, `toggle`, `onDirectionChanged`. |

---

## Full integration

Three things to wire up: cold start, the language switch, and (for RTL that
follows your text and navigation) a couple of small conventions.

### 1. Align direction on cold start

Do it **before the first screen paints**, so a relaunch in the stored language
is already correct:

```tsx
// app root (before rendering your navigator)
const isRTL = await getStoredDirection() // your own logic
await setRTL(isRTL) // native flip + JS I18nManager
```

### 2. Switch language — direction FIRST, then strings

Call `setRTL` **before** `i18n.changeLanguage`. The tree must be RTL when the
new text re-measures; otherwise the new text bakes its alignment while the tree
is still LTR.

```ts
async function changeLanguage(locale: string) {
  const isRTL = /* your own locale→direction logic */
  await setRTL(isRTL)              // 1. flip direction (native, no restart)
  await i18n.changeLanguage(locale) // 2. then swap the strings
}
```

### 3. Make text follow the direction

React Native only mirrors a `<Text>` / `<TextInput>` when its style sets
`textAlign`. Use `textAlign: 'left'`: it is start-relative, so RN keeps it left
in LTR and flips it to **right** under RTL. (Don't also hardcode a mirrored
`textAlign`/`flexDirection` — the native flip already performs the swap, so a
manual swap would double-mirror and cancel out.)

```ts
const styles = StyleSheet.create({
  title: { fontSize: 20, textAlign: 'left' },   // ✅ flips with direction
  body:  { fontSize: 15 /* no textAlign */ },    // ❌ stays left under RTL
})
```

Rows built with `flexDirection: 'row'` reverse automatically under RTL — no
change needed.

### 4. Expo Router / React Navigation — keep animations & gestures in sync

The native-stack push/pop animation and the swipe-back gesture read their
direction from `LocaleDirContext`, which defaults to the **cached startup
constant** and never updates at runtime. Override it with a value that tracks
your language state:

```tsx
import { LocaleDirContext } from '@react-navigation/native'

function RootLayout() {
  const direction = useLanguageDirection() // your own logic → 'rtl' | 'ltr'

  return (
    <LocaleDirContext.Provider value={direction}>
      <Stack /* … */ />
    </LocaleDirContext.Provider>
  )
}
```

(Plain React Navigation: pass `direction` to `NavigationContainer` and re-render
it on language change instead.)

### 5. Subscribe to native direction changes

```ts
useEffect(() => {
  layoutDirection.onDirectionChanged = (isRTL: boolean) => {
    // e.g. invalidate a style cache, drive a styling-engine plugin
  }
  return () => { layoutDirection.onDirectionChanged = undefined }
}, [])
```

The callback fires **after** the visual flip has landed on the main/UI thread,
so it's the right place for styling engines to recompute.

---

## How it works

`setRTL(isRTL)` first sets the RN direction flags synchronously (`RCTI18nUtil` on
iOS, `I18nUtil` SharedPreferences on Android) so the `isRTL` getter is coherent
immediately. Then it dispatches the UIKit/View work to the main/UI thread, where
it runs on a single pass:

- **iOS** — post `UIContentSizeCategoryDidChangeNotification` so every
  `RCTFabricSurface` stores the new `layoutDirection` → **bust Yoga's size-keyed
  layout cache** by nudging each surface's size 1pt and restoring it (forces a
  real re-layout in the new direction) → mirror `UINavigationBar` / `UITabBar`
  `semanticContentAttribute` and re-arm the `interactivePopGestureRecognizer`.
- **Android** — `forceLayout()` + `requestLayout()` on every `ReactSurfaceView`
  (re-runs `onMeasure` → `updateLayoutSpecs` → `constraintLayout`, re-reading
  `isRTL`) → set the decor view `layoutDirection`.

The key insight, on both platforms, is that the layout direction of a running
Fabric surface is normally read **once** at surface creation — so `forceRTL` at
runtime updates the flag but doesn't re-mirror anything. This package triggers
RN's own cold-start re-layout path on the live surface, which is what makes the
flip work without a restart.

### ⚠️ Non-contractual internals

The mechanism depends on a few React Native internals that are not part of the
public API contract:

- `RCTFabricSurface` subscribing to `UIContentSizeCategoryDidChangeNotification`
  and re-running `_updateLayoutContext` (iOS).
- Yoga keying its per-node layout cache on size + measure mode (not direction) —
  which is why the size-nudge cache-bust is needed (iOS).
- `ReactSurfaceView.onMeasure` reading `I18nUtil.isRTL` fresh on every measure
  pass (Android).

If a future RN version changes these, the flip can silently degrade to "only
works after restart." To make that failure **loud** rather than silent, the iOS
path checks that `RCTFabricSurface` still exposes `minimumSize`/`maximumSize`
(via KVC) and logs a warning — including an issue URL — if it doesn't.

**When upgrading React Native:** run the [example app](#example) and flip every
screen. If anything regresses, that's the signal.

---

## Example

A runnable stability torture-test lives in [`example/`](../../example) — one
screen exercising TextInput, horizontal/inverted/sticky FlatLists, a modal
flipped while open, and a locale-driven flip, with a live scroll-offset readout
to prove state survives the flip.

```sh
cd example
cd ios && pod install && cd ..   # iOS
npx react-native run-ios
```

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Nothing happens at all | Native module not in the binary — rebuild (`pod install` + run). Confirm `react-native-nitro-modules` is installed. |
| Only flips after a restart | You're on the New Architecture? Confirm `newArchEnabled`. Make sure you `await setRTL(...)` (it re-lays out live surfaces). |
| Text doesn't right-align | Add `textAlign: 'left'` to that text style (see step 3). Unset alignment never flips on an LTR device. |
| Text flips but shows old strings' alignment | Call `setRTL` **before** `i18n.changeLanguage` (step 2). |
| Push animation / swipe-back keep old direction | Override `LocaleDirContext` (step 4). |
| iOS console: `WARNING: RCTFabricSurface does not respond to minimumSize` | RN's surface API changed under us — the RN content won't relayout until restart. File an issue with your RN version. |

## License

MIT

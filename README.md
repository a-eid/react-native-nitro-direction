# react-native-nitro-direction

[![npm version](https://img.shields.io/npm/v/react-native-nitro-direction)](https://www.npmjs.com/package/react-native-nitro-direction)
[![license](https://img.shields.io/npm/l/react-native-nitro-direction)](./LICENSE)

Flip your React Native app between **LTR and RTL at runtime** — no restart, no
bundle reload, no remount. One call re-mirrors the entire UI *and* the native
chrome (navigation header, tab bar, and on iOS the edge swipe-back gesture) in
place, keeping navigation state, scroll position, and form state intact.

Built on [Nitro Modules](https://github.com/mrousavy/nitro). Native owns the
direction, JS reads and sets it. Same pattern as `Appearance`, `Dimensions`,
`Keyboard`. Three exports — `setDirection`, `getDirection`, `onDirectionChanged`.

`I18nManager.forceRTL(true)` needs an app restart on the New Architecture. This
package doesn't. It triggers React Native's own cold-start re-layout paths on
every live Fabric surface, then mirrors the native chrome alongside it.

- **Runtime flip** — LTR ⇄ RTL without restarting
- **JSI-direct** — no bridge serialization, native callbacks
- **Fabric & bridgeless** — iOS + Android, New Architecture only
- **Autolinked** — zero `MainApplication` / Podfile edits
- **Three exports** — `setDirection`, `getDirection`, `onDirectionChanged`

---

## Requirements

- React Native **New Architecture (Fabric)** — default on RN 0.76+ / Expo SDK 52+
- [`react-native-nitro-modules`](https://www.npmjs.com/package/react-native-nitro-modules) peer dependency
- A **bare app** (RN CLI) or **development build** (Expo). Native code does not run in Expo Go
- iOS 13+ / Android API 23+. The package's manifest merges `android:supportsRtl="true"` for you

**Tested against:** React Native `0.86` · `react-native-nitro-modules` `0.36.x`

> ⚠️ The flip depends on non-contractual React Native internals — see
> [How it works](#how-it-works). Re-verify on major RN upgrades. The module logs
> a loud warning if the iOS surface API changes under it.

---

## Installation

```sh
bun add react-native-nitro-direction react-native-nitro-modules
```

Rebuild the native app — the hybrid object must compile into the binary:

```sh
cd ios && pod install && cd ..
npx react-native run-ios
npx react-native run-android
```

Autolinks on both platforms. No manual native steps.

---

## Quick start

```ts
import {
  setDirection,
  getDirection,
  onDirectionChanged,
} from 'react-native-nitro-direction'

// Flip the entire app
await setDirection('rtl')
await setDirection('ltr')

// Read the current direction
getDirection() // 'ltr' | 'rtl'

// Subscribe to native direction changes
const cleanup = onDirectionChanged((direction) => {
  // fires after the visual flip has landed on the main thread
})
```

`setDirection` also keeps `I18nManager.isRTL` in sync on the JS side.

> **The direction persists across app restarts — no extra storage needed.**
> `setDirection` writes to React Native's own i18n flags (`RCTI18nUtil` on iOS,
> `I18nUtil` SharedPreferences on Android), which RN reads on every cold start.
> Kill the app after `setDirection('rtl')` and it boots straight into RTL. See
> [Persistence](#persistence).

---

## API

| Export | Signature | Description |
| --- | --- | --- |
| `setDirection` | `(direction: 'ltr' \| 'rtl') => Promise<'ltr' \| 'rtl'>` | Flip the app's layout direction at runtime. Resolves once the native re-layout has landed. |
| `getDirection` | `() => 'ltr' \| 'rtl'` | Get the current layout direction. |
| `onDirectionChanged` | `(callback: (dir: 'ltr' \| 'rtl') => void) => () => void` | Subscribe to direction changes. Returns a cleanup function. |

---

## Integration guide

### Best practices at a glance

- ✅ Seed initial React state from `getDirection()`, not `I18nManager.isRTL`.
- ✅ Call `setDirection` **before** `i18n.changeLanguage` (see
  [Language switch](#language-switch--direction-first-then-strings)).
- ✅ Wrap your navigator in `LocaleDirContext` to drive `react-native-screens`'
  push/pop animation and swipe gesture (see
  [React Navigation / Expo Router](#react-navigation--expo-router)).
- ❌ Don't persist direction yourself — it's already native (see
  [Persistence](#persistence)).
- ❌ Don't call `setDirection` every boot just to restore — the native flags
  survive restarts on their own.
- ❌ Don't hardcode `textAlign: 'right'` under RTL — use `'left'` and let the
  flip swap it (see [Text alignment](#text-alignment)).

### Cold start — seed state, don't re-flip

On launch the native hierarchy is **already** in the last-set direction
(that's the whole point of persistence). You only need to sync it into React
state so your components render correctly:

```tsx
// app root — read the persisted direction synchronously to seed state
const [direction, setDir] = useState(getDirection())

useEffect(() => onDirectionChanged(setDir), [])
```

`getDirection()` reads the native flag synchronously, so the very first render
is correct — no LTR flash, no `await` before first paint.

The only time you call `setDirection` at boot is when you're choosing the
direction from an **external** source the native flags don't know about — a
freshly fetched user preference, or device-locale detection on first launch
(see [First launch](#first-launch--device-locale-detection)).

### Persistence

`setDirection` writes to **React Native's own** i18n stores — `RCTI18nUtil`
(`NSUserDefaults`) on iOS and `I18nUtil` (SharedPreferences) on Android.
These are the exact same flags RN reads during startup, so:

- The direction **survives app kills and device reboots**. No AsyncStorage, no
  MMKV, no `useState`+`useEffect` restore dance.
- The native chrome (header, tab bar, swipe gesture) is correct from frame one
  — the flags are read *before* JS loads.
- `getDirection()` is always coherent with what the native side actually
  rendered.

**Don't add your own storage layer.** Two copies of the truth drift: if your
store says RTL but RN's flag says LTR (e.g. after an RN upgrade changes the
storage key, or a consumer clears one but not the other), you reintroduce the
exact LTR flash this package exists to kill.

> **No "follow system" reset.** Once set, the direction sticks — this matches
> iOS's `semanticContentAttribute` override model. To follow the device locale,
> detect it yourself and call `setDirection(systemDirection)` when it changes
> (see [First launch](#first-launch--device-locale-detection)).

### First launch / device locale detection

On a true first launch there's no persisted direction yet. Detect it from the
device locale and set it once — it then persists for every subsequent launch:

```ts
import { setDirection } from 'react-native-nitro-direction'
import { getLocales } from 'expo-localization'         // or react-native-localize
import { AppState } from 'react-native'

const RTL_RE = /^(ar|he|fa|ur|ku|ps|sd|ug|yi)/i

function isRTL(locale: string): boolean {
  return RTL_RE.test(locale)
}

async function syncDirectionFromLocale() {
  const [{ languageCode }] = getLocales()
  await setDirection(isRTL(languageCode) ? 'rtl' : 'ltr')
}

// run once on first launch (your own "has run before" flag), and again if the
// user changes their device language while the app is backgrounded:
syncDirectionFromLocale()
AppState.addEventListener('change', (state) => {
  if (state === 'active') syncDirectionFromLocale()
})
```

Locale detection is intentionally **not** part of this package — different apps
have different RTL-locale sets, different override rules (user-pick vs.
follow-system), and different localization stacks. Keep that logic in your app.

### Language switch — direction first, then strings

Call `setDirection` **before** `i18n.changeLanguage()`. The tree must be RTL
when the new strings measure; otherwise the text bakes its alignment while the
tree is still LTR.

```ts
async function switchLanguage(locale: string) {
  const direction = isRTLLanguage(locale) ? 'rtl' : 'ltr' // your logic
  await setDirection(direction)        // 1. flip direction (native, no restart)
  await i18n.changeLanguage(locale)    // 2. swap the strings
}
```

### Text alignment

React Native only mirrors `<Text>` / `<TextInput>` when their style includes
`textAlign`. Use `textAlign: 'left'` — it's start-relative, so RN keeps it left
in LTR and flips it to right under RTL. Don't hardcode a mirrored value; the
native flip already does the swap, so double-mirroring cancels out.

```ts
const styles = StyleSheet.create({
  title: { textAlign: 'left' },  // ✅ flips with direction
  body:  { /* no textAlign */ }, // ❌ stays left under RTL
})
```

`flexDirection: 'row'` reverses automatically — no changes needed.

### React Navigation / Expo Router

Wrap your navigator in `LocaleDirContext` and feed it your direction state.
This is the **single source of truth** — `react-native-screens` reads it via
`useLocale()` → `useHeaderConfigProps` → `ScreenStackHeaderConfig`, which sets
the native `semanticContentAttribute` that controls the push/pop animation
direction and swipe-back gesture edge.

**Isolate the provider in its own component** that receives `children`. When
direction changes, only the context provider and its consumers re-render — the
`children` prop is a stable element reference, so React bails out of re-rendering
the navigator and its screens.

```tsx
import { useEffect, useState, type ReactNode } from 'react'
import { Stack } from 'expo-router'
import { getDirection, onDirectionChanged } from 'react-native-nitro-direction'
import { LocaleDirContext } from 'expo-router/react-navigation'

// Isolated so direction changes don't re-render the navigator tree —
// only LocaleDirContext consumers (screens calling useLocale()) update.
function DirectionProvider({ children }: { children: ReactNode }) {
  const [direction, setDirection] = useState(getDirection)
  useEffect(() => onDirectionChanged(setDirection), [])

  return (
    <LocaleDirContext.Provider value={direction}>
      {children}
    </LocaleDirContext.Provider>
  )
}

export default function RootLayout() {
  return (
    <DirectionProvider>
      <Stack>{/* screens */}</Stack>
    </DirectionProvider>
  )
}
```

This gives you:

- ✅ **Push/pop animation** slides in the correct direction
- ✅ **Swipe-back gesture** rebinds to the mirrored edge
- ✅ **Survives reloads** — RNS re-applies from the context on mount
- ✅ **Minimal re-renders** — only `LocaleDirContext` consumers update
- ✅ **React content** mirrors (text alignment, flex, layout)

> ⚠️ **Known limitation — large title & back chevron.** The iOS navigation bar's
> large title and back chevron do not reliably re-render at runtime when
> direction flips. `react-native-screens` manages its own `UINavigationController`
> instances, and UIKit's private large-title view doesn't respond to
> `setNeedsLayout`. The animation, gesture, and content all flip correctly —
> only the nav bar chrome is affected. If you need this,
> [track the issue](https://github.com/a-eid/react-native-nitro-direction/issues).

### Subscribe to direction changes

```ts
useEffect(() => {
  return onDirectionChanged((direction) => {
    // recompute styles, invalidate caches, drive a styling engine plugin
  })
}, [])
```

The callback fires after the visual flip has landed on the main/UI thread, so
styling engines can safely recompute.

---

## How it works

`setDirection(direction)` sets RN's direction flags synchronously
(`RCTI18nUtil` on iOS, `I18nUtil` SharedPreferences on Android) — so
`getDirection()` is coherent immediately. Then it dispatches the view work to
the main/UI thread in a single pass:

**iOS**
1. Post `UIContentSizeCategoryDidChangeNotification` — every `RCTFabricSurface`
   re-reads the stored `layoutDirection` into its constraints
2. Bust Yoga's size-keyed layout cache — bump each surface's min/max size by 1pt
   and immediately restore it, forcing a real re-layout in the new direction
3. Mirror `UINavigationBar` / `UITabBar` `semanticContentAttribute`
4. Re-arm the `interactivePopGestureRecognizer` so the edge swipe-back rebinds
   to the mirrored screen edge

**Android**
1. `forceLayout()` + `requestLayout()` on every `ReactSurfaceView` —
   `onMeasure` → `updateLayoutSpecs` → `constraintLayout`, re-reading `isRTL`
2. Set the decor view's `layoutDirection` so inheriting views (toolbars,
   headers) re-resolve

The key insight: Fabric normally reads the layout direction **once** at surface
creation. Calling `forceRTL` updates the flag but doesn't re-mirror anything.
This package triggers RN's own cold-start re-layout path on the *live* surface,
which is why the flip works without a restart.

### Non-contractual internals

The mechanism depends on React Native internals not covered by the public API:

- `RCTFabricSurface` subscribing to `UIContentSizeCategoryDidChangeNotification`
  and re-running `_updateLayoutContext` (iOS)
- Yoga keying its per-node layout cache on size + measure mode, not direction —
  hence the size-nudge (iOS)
- `ReactSurfaceView.onMeasure` reading `I18nUtil.isRTL` fresh on every measure
  pass (Android)

If a future RN version changes these, the flip silently degrades. To make that
failure loud, the iOS path checks that `RCTFabricSurface` still responds to
`minimumSize`/`maximumSize` (via KVC) and logs a warning with an issue URL if it
doesn't.

**When upgrading React Native:** run the example app and flip every screen.

---

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Nothing happens | Native module not in the binary — rebuild (`pod install` + run). Confirm `react-native-nitro-modules` is installed. |
| Only flips after restart | You're on New Architecture? Confirm `newArchEnabled`. Are you `await`-ing `setDirection()`? |
| Text doesn't right-align | Add `textAlign: 'left'` to that style. Unset alignment never flips. |
| Text alignment is stale after language switch | Call `setDirection` **before** `i18n.changeLanguage`. |
| Push animation / swipe-back stuck in old direction | Wrap your navigator in `LocaleDirContext` and feed it your direction state. See [React Navigation / Expo Router](#react-navigation--expo-router). |
| Large title or back chevron don't flip | **Known limitation** — UIKit's large-title view doesn't re-render on `setNeedsLayout`. Animation + gesture still work via the `direction` prop. See the note in the [React Navigation section](#react-navigation--expo-router). |
| `WARNING: RCTFabricSurface does not respond to minimumSize` | RN's surface API changed — the content won't re-layout until restart. [File an issue](https://github.com/a-eid/react-native-nitro-direction/issues) with your RN version. |

## License

MIT

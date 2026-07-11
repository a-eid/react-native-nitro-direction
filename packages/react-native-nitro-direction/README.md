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

---

## API

| Export | Signature | Description |
| --- | --- | --- |
| `setDirection` | `(direction: 'ltr' \| 'rtl') => Promise<'ltr' \| 'rtl'>` | Flip the app's layout direction at runtime. Resolves once the native re-layout has landed. |
| `getDirection` | `() => 'ltr' \| 'rtl'` | Get the current layout direction. |
| `onDirectionChanged` | `(callback: (dir: 'ltr' \| 'rtl') => void) => () => void` | Subscribe to direction changes. Returns a cleanup function. |

---

## Integration guide

### Cold start — set direction before the first paint

Do this before rendering your navigator so the stored language is already
correct on launch:

```tsx
// app root, before <NavigationContainer> or the first <Stack>
const direction = getStoredDirection() // your logic — persisted pref, device locale, etc.
await setDirection(direction)
```

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

The native-stack push/pop animation and swipe-back gesture read their direction
from `LocaleDirContext`, which defaults to the cached startup value and never
re-reads at runtime. Override it:

```tsx
import { LocaleDirContext } from '@react-navigation/native'

function RootLayout() {
  // your own state that stays in sync with direction changes
  const direction = /* ... */

  return (
    <LocaleDirContext.Provider value={direction}>
      <Stack />
    </LocaleDirContext.Provider>
  )
}
```

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
| Push animation / swipe-back stuck in old direction | Override `LocaleDirContext` (see React Navigation section). |
| `WARNING: RCTFabricSurface does not respond to minimumSize` | RN's surface API changed — the content won't re-layout until restart. [File an issue](https://github.com/a-eid/react-native-nitro-direction/issues) with your RN version. |

## License

MIT

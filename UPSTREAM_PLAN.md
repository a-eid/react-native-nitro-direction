# Upstream Fix Plan — Runtime RTL Reactivity in React Native & react-native-screens

**Platforms:** iOS + Android (Part 1 is both; Part 2 is iOS-only)

## Problem Summary

`react-native-nitro-direction` flips the layout direction at runtime, but two
gaps in the upstream packages prevent full reactivity:

1. **RN core (iOS + Android): `I18nManager.isRTL` (JS) is frozen** — captured at
   module load, never updated when `forceRTL` is called at runtime. On iOS,
   `RCTI18nUtil`/`RCTI18nManager` post no notification and emit no event. On
   Android, `I18nManagerModule.kt` delegates to `I18nUtil` and emits nothing.
   Both platforms need the same fix: emit a device event after mutation.
2. **RNS (iOS only): large title & back chevron don't re-render** —
   `react-native-screens` sets `semanticContentAttribute` on nav controllers via
   `applySemanticContentAttributeIfNeededToNavCtrl:`, but UIKit's private
   large-title view doesn't rebuild on `setNeedsLayout`. RNS already uses
   `traitOverrides.layoutDirection` for **tab bars** (which works) but not for
   nav controllers. **Android does not have this issue** — RNS Android derives
   direction from `View.layoutDirection`, which our package already sets.

Both fixes are small, focused, and benefit every RN app doing runtime RTL.

---

## Part 1: RN Core — Make `I18nManager.isRTL` Reactive

### Root cause

`I18nManager.js` (line 15) caches `i18nConstants` **once** at module load:

```js
const i18nConstants = getI18nManagerConstants();  // frozen snapshot

export default {
  isRTL: i18nConstants.isRTL,  // line 59 — never updates after boot
};
```

On the native side, three layers all fail to broadcast:

| Layer | What it does | What's missing |
|-------|-------------|----------------|
| `RCTI18nUtil.m` | Writes `NSUserDefaults` keys on `forceRTL:` / `allowRTL:` / `swapLeftAndRightInRTL:` | Posts **zero** notifications |
| `RCTI18nManager.mm` | TurboModule wrapper — calls `RCTI18nUtil` | Posts **zero** notifications, emits **zero** JS events |
| `RCTFabricSurface.mm:71` | Observes `UIContentSizeCategoryDidChangeNotification` → calls `_updateLayoutContext` | Only re-reads `isRTL` on **OS content-size changes**, not on JS `forceRTL` calls. And it only feeds the **native layout** — nothing goes to JS. |

There is **no `RCTI18nDirectionDidChangeNotification`** in `RCTConstants.h`.
The registry (`React/Base/RCTConstants.h`) has notifications for user-interface
style, window frame, and JS loading — but nothing for i18n/direction.

### The fix: mirror the Dimensions broadcasting pattern

RN core already has a canonical pattern for broadcasting native state changes to
JS. `RCTDeviceInfo.mm` broadcasts dimension changes via:

```objc
[[_moduleRegistry moduleForName:"EventDispatcher"]
    sendDeviceEventWithName:@"didUpdateDimensions"
                      body:[self _exportedDimensions]];
```

And `Dimensions.js` subscribes:

```js
RCTDeviceEventEmitter.addListener('didUpdateDimensions', (update) => {
  Dimensions.set(update);
});
```

We mirror this exactly for i18n.

### Changes

#### 1a. Declare the notification name

**File: `React/Base/RCTConstants.h`**

```objc
// Add alongside RCTUserInterfaceStyleDidChangeNotification:
RCT_EXTERN NSString *const RCTI18nDirectionDidChangeNotification;
```

**File: `React/Base/RCTConstants.m`**

```objc
NSString *const RCTI18nDirectionDidChangeNotification = @"RCTI18nDirectionDidChangeNotification";
```

This lets `RCTFabricSurface` observe it natively (so surfaces re-layout on
`forceRTL` calls without needing the `UIContentSizeCategory` hack our package
currently uses).

#### 1b. Post the notification from `RCTI18nUtil`

**File: `React/Modules/RCTI18nUtil.m`**

After each mutating method, post the notification:

```objc
- (void)allowRTL:(BOOL)value
{
  // ... existing NSUserDefaults write ...
  [[NSNotificationCenter defaultCenter]
      postNotificationName:RCTI18nDirectionDidChangeNotification object:nil];
}

- (void)forceRTL:(BOOL)value
{
  // ... existing NSUserDefaults write ...
  [[NSNotificationCenter defaultCenter]
      postNotificationName:RCTI18nDirectionDidChangeNotification object:nil];
}

- (void)swapLeftAndRightInRTL:(BOOL)value
{
  // ... existing NSUserDefaults write ...
  [[NSNotificationCenter defaultCenter]
      postNotificationName:RCTI18nDirectionDidChangeNotification object:nil];
}
```

**Why `RCTI18nUtil` and not `RCTI18nManager`?** `RCTI18nUtil` is the single
source of truth — it's what `RCTFabricSurface` already reads from, and what any
native code calls. Posting here means *every* path that changes direction (JS
module, native code, our package) triggers the notification.

#### 1c. Make `RCTFabricSurface` observe the new notification

**File: `React/Fabric/Surface/RCTFabricSurface.mm`**

In the init (alongside the existing `UIContentSizeCategoryDidChangeNotification`
registration at line 71):

```objc
[[NSNotificationCenter defaultCenter] addObserver:self
                                         selector:@selector(handleI18nDirectionDidChangeNotification:)
                                             name:RCTI18nDirectionDidChangeNotification
                                           object:nil];
```

Handler:

```objc
- (void)handleI18nDirectionDidChangeNotification:(NSNotification *)notification
{
  [self _updateLayoutContext];
}
```

This means our package's `UIContentSizeCategory.didChangeNotification` hack
becomes unnecessary — the surface re-layouts natively on `forceRTL`. But
existing code keeps working (both notifications trigger the same method).

#### 1d. Emit the JS event from `RCTI18nManager`

**File: `React/CoreModules/RCTI18nManager.h`**

Change the superclass to `RCTEventEmitter`:

```objc
@interface RCTI18nManager : RCTEventEmitter <NativeI18nManagerSpec>
```

**File: `React/CoreModules/RCTI18nManager.mm`**

```objc
+ (BOOL)requiresMainQueueSetup { return YES; }  // RCTEventEmitter needs main queue

- (NSArray<NSString *> *)supportedEvents
{
  return @[@"didUpdateI18nConstants"];
}

- (void)emitI18nConstantsDidChange
{
  [self sendEventWithName:@"didUpdateI18nConstants" body:[self getConstants]];
}

RCT_EXPORT_METHOD(allowRTL:(BOOL)value)
{
  [[RCTI18nUtil sharedInstance] allowRTL:value];
  [self emitI18nConstantsDidChange];
}

RCT_EXPORT_METHOD(forceRTL:(BOOL)value)
{
  [[RCTI18nUtil sharedInstance] forceRTL:value];
  [self emitI18nConstantsDidChange];
}

RCT_EXPORT_METHOD(swapLeftAndRightInRTL:(BOOL)value)
{
  [[RCTI18nUtil sharedInstance] swapLeftAndRightInRTL:value];
  [self emitI18nConstantsDidChange];
}
```

This mirrors `RCTAppState`, `RCTKeyboardObserver`, and `RCTStatusBarManager` —
all extend `RCTEventEmitter` and call `sendEventWithName:body:`.

#### 1e. Make `I18nManager.js` reactive

**File: `Libraries/ReactNative/I18nManager.js`**

```js
import NativeI18nManager from './NativeI18nManager';
import RCTDeviceEventEmitter from '../EventEmitter/RCTDeviceEventEmitter';

let i18nConstants = getI18nManagerConstants();

// Subscribe BEFORE seeding so we don't miss updates between module load and
// first subscription (mirrors Dimensions.js pattern).
RCTDeviceEventEmitter.addListener('didUpdateI18nConstants', (update) => {
  i18nConstants = { ...i18nConstants, ...update };
});

export default {
  getConstants: () => i18nConstants,

  // Getters — always reflect the current value, not a frozen snapshot.
  get isRTL() { return i18nConstants.isRTL; },
  get doLeftAndRightSwapInRTL() { return i18nConstants.doLeftAndRightSwapInRTL; },

  allowRTL: (shouldAllow) => { NativeI18nManager?.allowRTL(shouldAllow); },
  forceRTL: (shouldForce) => { NativeI18nManager?.forceRTL(shouldForce); },
  swapLeftAndRightInRTL: (flipStyles) => { NativeI18nManager?.swapLeftAndRightInRTL(flipStyles); },
};
```

**The key change:** `isRTL` changes from a frozen property to a **getter**. Every
existing call site (`I18nManager.isRTL`) reads identically — but now returns the
correct value after a runtime flip.

**Breaking change?** No. Property → getter is transparent. The only behavioral
change is that it returns the correct value after `forceRTL`, which is strictly
an improvement.

#### 1f. Android — emit the device event from `I18nManagerModule`

The Android side has the **same gap** as iOS: `I18nManagerModule.kt` delegates
to `I18nUtil` but emits no events.

**File: `ReactAndroid/src/main/java/com/facebook/react/modules/i18nmanager/I18nManagerModule.kt`**

```kotlin
// Inject the ReactApplicationContext (already available via base class)

override fun allowRTL(value: Boolean) {
    I18nUtil.instance.allowRTL(context, value)
    emitI18nConstantsDidChange()
}

override fun forceRTL(value: Boolean) {
    I18nUtil.instance.forceRTL(context, value)
    emitI18nConstantsDidChange()
}

override fun swapLeftAndRightInRTL(value: Boolean) {
    I18nUtil.instance.swapLeftAndRightInRTL(context, value)
    emitI18nConstantsDidChange()
}

private fun emitI18nConstantsDidChange() {
    reactApplicationContext.emitDeviceEvent("didUpdateI18nConstants", getTypedExportedConstants())
}
```

**`emitDeviceEvent`** is the Android equivalent of iOS's
`sendEventWithName:body:`. It's already available on `ReactApplicationContext`
(via `BridgelessReactContext.kt:156`), and is the exact pattern
`DeviceInfoModule.kt:117` uses to emit `"didUpdateDimensions"`.

**File: `ReactAndroid/src/main/java/com/facebook/react/modules/i18nmanager/I18nUtil.kt`**

Unlike iOS (where `RCTI18nUtil` is the natural notification source), on Android
the notification belongs in `I18nManagerModule` — because Android's `I18nUtil`
is a plain Kotlin object with no reference to the React context. The module
already has the context and can emit. **No changes needed to `I18nUtil.kt`.**

> **Android Fabric surface — no changes needed.** Unlike iOS (where
> `RCTFabricSurface` listens to `UIContentSizeCategoryDidChangeNotification`),
> Android's `ReactSurfaceView.onMeasure` re-reads `I18nUtil.isRTL` on **every
> measure pass**. The `forceLayout()` + `requestLayout()` calls in
> `HybridLayoutDirection.kt` already trigger this. So Android has no equivalent
> of the iOS `UIContentSizeCategory` notification hack — it just re-measures.

### Files to change (Part 1)

**iOS:**

| File | Change |
|------|--------|
| `React/Base/RCTConstants.h` | Declare `RCTI18nDirectionDidChangeNotification` |
| `React/Base/RCTConstants.m` | Define the notification string |
| `React/Modules/RCTI18nUtil.m` | Post notification after each mutation |
| `React/Fabric/Surface/RCTFabricSurface.mm` | Observe the new notification → `_updateLayoutContext` |
| `React/CoreModules/RCTI18nManager.h` | Inherit `RCTEventEmitter` |
| `React/CoreModules/RCTI18nManager.mm` | Emit `didUpdateI18nConstants` JS event; implement `supportedEvents` |

**Android:**

| File | Change |
|------|--------|
| `ReactAndroid/.../i18nmanager/I18nManagerModule.kt` | Emit `didUpdateI18nConstants` via `emitDeviceEvent` after each mutation |

**Shared JS (both platforms):**

| File | Change |
|------|--------|
| `Libraries/ReactNative/I18nManager.js` | Make `i18nConstants` mutable, subscribe to `didUpdateI18nConstants`, convert `isRTL` to getter |

> **Android Fabric surface: no changes needed.** `ReactSurfaceView.onMeasure`
> already re-reads `I18nUtil.isRTL` on every measure pass. The `forceLayout()`
> call triggers it. No notification observer required.

### Testing

1. Call `I18nManager.forceRTL(true)` → `I18nManager.isRTL` returns `true` immediately
2. Fabric surface re-layouts without `UIContentSizeCategory` hack
3. `Modal.js:372` (the only RN core consumer) picks up new direction
4. No duplicate events (each `forceRTL` → one notification + one JS event)
5. `getConstants()` returns fresh values
6. No regression on cold start (initial read unchanged)

### PR target

**`facebook/react-native`** — `main` branch.
Title: "feat: make I18nManager reactive to runtime direction changes"
Body: reference the Dimensions pattern as precedent, note the `RCTEventEmitter`
superclass change mirrors `RCTAppState`/`RCTKeyboardObserver`.

---

## Part 2: react-native-screens — Fix Large Title & Back Chevron RTL

### Root cause

**iOS only.** `RNSScreenStackHeaderConfig.mm:765-783`
(`applySemanticContentAttributeIfNeededToNavCtrl:`) sets
`semanticContentAttribute` on the nav controller + nav bar + appearance proxies.
But `semanticContentAttribute` **does not trigger `traitCollectionDidChange:`** —
which is what UIKit needs to rebuild the private `_UINavigationBarLargeTitleView`
and re-render the back chevron.

RNS already knows the fix — it uses `traitOverrides.layoutDirection` for **tab
bars** in `RNSTabsHostComponentView.mm:420-437`, and it works. The stack header
just doesn't use it.

**Android does NOT have this issue.** RNS Android reads direction purely from
`View.layoutDirection` (inherited from the decor view), not from `I18nUtil`.
`ScreenStackHeaderConfig.kt:241-244` sets `toolbar.layoutDirection` directly
from the `direction` prop, and `StackHeaderConfig.kt:153` derives `isRTL` from
the view's own resolved `layoutDirection`. Since our package already sets
`decorView.layoutDirection` in `HybridLayoutDirection.kt:86`, the toolbar
re-mirrors automatically on the next layout pass. **No Android RNS changes needed.**

Additional iOS findings from the research:

- **`RNSNavigationController` has no `traitCollectionDidChange:` override** and no
  `traitOverrides` usage. It's defined in `RNSScreenStack.h:13-21` and
  instantiated at `RNSScreenStack.mm:205`.
- **`updateViewControllerIfNeeded` (line 134) early-returns unless the screen is
  the top/visible VC.** So if direction changes while a non-top screen is
  configured, nothing happens until that screen becomes top.
- The direction prop is converted via `RNSConvert.mm:5-16` which only returns
  `ForceRightToLeft` or `ForceLeftToRight` — no `Unspecified`/inherit case.
- **No existing observer or notification** for direction changes on the stack
  side. The only `traitCollectionDidChange:` overrides are on `RNSTabBarController`
  (horizontal size class) and `RNSModalScreen`.

### The fix

Two changes: add `traitOverrides` to the existing method, and add a
`traitCollectionDidChange:` hook on `RNSNavigationController` for reactivity.

#### 2a. Add `traitOverrides.layoutDirection` to `applySemanticContentAttributeIfNeededToNavCtrl:`

**File: `ios/RNSScreenStackHeaderConfig.mm` (line 765)**

```objc
- (void)applySemanticContentAttributeIfNeededToNavCtrl:(UINavigationController *)navCtrl
{
  if ((self.direction == UISemanticContentAttributeForceLeftToRight ||
       self.direction == UISemanticContentAttributeForceRightToLeft) &&
      navCtrl.view.semanticContentAttribute != self.direction) {

    // Existing: semanticContentAttribute (controls animation direction + gesture edge).
    // RNSScreenStackAnimator.mm and RNSScreenStack.mm read this directly.
    navCtrl.view.semanticContentAttribute = self.direction;
    navCtrl.navigationBar.semanticContentAttribute = self.direction;
    [[UIButton appearanceWhenContainedInInstancesOfClasses:@[navCtrl.navigationBar.class]]
        setSemanticContentAttribute:self.direction];
    [[UIView appearanceWhenContainedInInstancesOfClasses:@[navCtrl.navigationBar.class]]
        setSemanticContentAttribute:self.direction];
    [[UISearchBar appearanceWhenContainedInInstancesOfClasses:@[navCtrl.navigationBar.class]]
        setSemanticContentAttribute:self.direction];

    // NEW: traitOverrides.layoutDirection (mirrors RNSTabsHostComponentView.mm:425).
    // This triggers traitCollectionDidChange:, which forces UIKit to rebuild
    // the large title view and back chevron — semanticContentAttribute alone
    // doesn't invalidate them once laid out.
    UITraitEnvironmentLayoutDirection layoutDirection =
        self.direction == UISemanticContentAttributeForceRightToLeft
            ? UITraitEnvironmentLayoutDirectionRightToLeft
            : UITraitEnvironmentLayoutDirectionLeftToRight;
    if (@available(iOS 17.0, *)) {
      navCtrl.traitOverrides.layoutDirection = layoutDirection;
      navCtrl.navigationBar.traitOverrides.layoutDirection = layoutDirection;
    } else {
      // Pre-iOS-17 fallback — mirrors RNSTabBarController.mm:1033-1049.
      UITraitCollection *override =
          [UITraitCollection traitCollectionWithLayoutDirection:layoutDirection];
      [navCtrl.parentViewController setOverrideTraitCollection:override
                                          forChildViewController:navCtrl];
    }
  }
}
```

This is additive — it doesn't change the existing `semanticContentAttribute`
behavior (which the animator and gesture recognizer depend on), it just adds
the trait override alongside it.

#### 2b. Add `traitCollectionDidChange:` to `RNSNavigationController`

**File: `ios/RNSScreenStack.mm` (in the `RNSNavigationController` implementation, lines 41-154)**

```objc
- (void)traitCollectionDidChange:(UITraitCollection *)previousTraitCollection
{
  [super traitCollectionDidChange:previousTraitCollection];

  // When the layout direction trait changes (e.g. via traitOverrides from our
  // header config, or from an external direction flip), force the nav bar to
  // re-render. This is what makes the large title and back chevron update.
  if (previousTraitCollection.layoutDirection != self.traitCollection.layoutDirection) {
    // Re-apply the appearance to invalidate UIKit's internal layout cache.
    UINavigationBar *bar = self.navigationBar;
    UINavigationBarAppearance *standard = [bar.standardAppearance copy];
    UINavigationBarAppearance *scrollEdge = [bar.scrollEdgeAppearance copy];
    bar.standardAppearance = standard;
    bar.scrollEdgeAppearance = scrollEdge;
    [bar setNeedsLayout];
    [bar layoutIfNeeded];
  }
}
```

This catches both the trait override we set in 2a AND any external trait changes
(such as our package's `traitOverrides` if we re-add it, or iOS system-level
direction changes).

#### 2c. (Optional) Handle the non-top-screen case

`updateViewControllerIfNeeded` (line 134) early-returns for non-top VCs. If you
flip direction while on screen A, screen B (below in the stack) won't get the
trait update until it becomes top. To handle this, store the pending direction
and apply it in `willShowViewController:`:

**File: `ios/RNSScreenStackHeaderConfig.mm`** — in `willShowViewController:`
(line 356, which already calls `updateViewControllerIfNeeded`), the trait
override will be applied automatically because `updateViewController:withConfig:`
calls `applySemanticContentAttributeIfNeededToNavCtrl:` on every `willShow`.
So **no additional change needed** — the fix in 2a covers this.

### Files to change (Part 2)

| File | Change |
|------|--------|
| `ios/RNSScreenStackHeaderConfig.mm` | Add `traitOverrides.layoutDirection` + pre-17 fallback to `applySemanticContentAttributeIfNeededToNavCtrl:` (line 765) |
| `ios/RNSScreenStack.mm` | Add `traitCollectionDidChange:` to `RNSNavigationController` (line ~41) |

> **Android RNS: no changes needed.** RNS Android derives direction from
> `View.layoutDirection` (set by `decorView.layoutDirection` in our package),
> not from `I18nUtil`. The toolbar re-mirrors automatically. This is an
> iOS-only issue — Android's `Toolbar` doesn't have a private large-title
> view that resists re-rendering.

### Why this should work

- RNS already uses this exact `traitOverrides` pattern for tab bars and it works
- `traitOverrides.layoutDirection` triggers `traitCollectionDidChange:`, which
  UIKit propagates to the nav bar and all subviews (including the private
  `_UINavigationBarLargeTitleView`)
- The back chevron re-renders because the trait change invalidates the nav bar's
  appearance cache
- `semanticContentAttribute` is kept (not replaced) because
  `RNSScreenStackAnimator.mm:135` and `RNSScreenStack.mm:824` read it directly
- The pre-iOS-17 fallback mirrors `RNSTabBarController.mm:1033-1049` exactly

### If traitOverrides alone isn't sufficient

Nuclear fallback: in `traitCollectionDidChange:`, cycle the view controller
stack to force UIKit to tear down and rebuild the nav bar:

```objc
// Last resort — has side effects (viewWillAppear, possible scroll reset)
NSArray<UIViewController *> *vcs = self.viewControllers;
if (vcs.count > 0) {
  [self setViewControllers:@[vcs.lastObject] animated:NO];
  [self setViewControllers:vcs animated:NO];
}
```

This is heavier but guaranteed to rebuild everything. Only use if the
appearance-copy approach doesn't fully work.

### Testing

1. Push a screen with `largeTitle: true`
2. Flip direction at runtime (via `react-native-nitro-direction` or `I18nManager.forceRTL`)
3. Large title re-renders in the new direction (text alignment + position)
4. Back chevron flips direction (‹ ↔ ›)
5. Push/pop animation slides the correct way
6. Swipe-back gesture activates from the correct edge
7. No scroll position reset, no `viewWillAppear` side effects
8. Flip while on a deep screen → pop back → the parent screen's nav bar is correct

### PR target

**`software-mansion/react-native-screens`** — `main` branch.
Title: "feat(ios): add traitOverrides.layoutDirection to fix large title & back chevron RTL"
Body: reference their own tab bar implementation (`RNSTabsHostComponentView.mm:420`)
as precedent. Note that `semanticContentAttribute` alone doesn't trigger
`traitCollectionDidChange:`.

---

## Part 3: Interaction Between the Two Fixes

The two fixes are **independent but complementary**:

| Scenario | Today | + RN core fix | + RNS fix | + Both |
|----------|-------|---------------|-----------|--------|
| React content flips | ✅ (UIContentSizeCategory hack) | ✅ (native notification) | ✅ | ✅ |
| `I18nManager.isRTL` in JS | ❌ Frozen | ✅ Reactive | ❌ | ✅ |
| Push/pop animation | ✅ (via `direction` prop) | ✅ | ✅ | ✅ |
| Large title re-renders | ❌ | ❌ | ✅ | ✅ |
| Back chevron flips | ❌ | ❌ | ✅ | ✅ |
| No `LocaleDirContext` wrapper needed | ❌ | ❌ | ⚠️ Partial | ✅ |
| No `UIContentSizeCategory` hack needed | ❌ | ✅ | ❌ | ✅ |

With **both** upstream fixes, `react-native-nitro-direction` could:
- Drop the `LocaleDirContext` wrapper (RNS reads traits directly via the `direction` prop → `traitOverrides`)
- Drop the JS-side `I18nManager.forceRTL` sync call (core does it reactively)
- Drop the `UIContentSizeCategory.didChangeNotification` hack (Fabric observes natively)
- Become truly zero-config — just `setDirection('rtl')` and everything works

### What this package simplifies to after both fixes

```ts
// The entire JS API — no consumer-side wiring needed
export async function setDirection(direction: 'ltr' | 'rtl') {
  await layoutDirection.setRTL(direction === 'rtl')
}
```

---

## Priority / Sequencing

1. **RNS fix (Part 2) first** — it's the more visible issue (large title/chevron)
   and has a clear precedent (tab bars). Higher chance of acceptance. ~20 lines
   across 2 iOS files. Android needs nothing.
2. **RN core fix (Part 1) second** — deeper architectural improvement (event-driven
   reactivity). Affects iOS (7 files) + Android (1 file) + shared JS (1 file).
   May need more discussion with Meta maintainers about the event name and
   `RCTEventEmitter` superclass change.

## Alternative: patch-package

If upstream PRs are slow or rejected, both fixes are small enough for
`patch-package`:
- RN core patch: ~60 lines across 9 files (7 iOS + 1 Android + 1 shared JS)
- RNS patch: ~20 lines across 2 iOS files (Android needs nothing)

---

## Appendix A: File Locations (RN 0.86)

### RN core — iOS (in `node_modules/.bun/react-native@0.86.0/.../react-native/`)

| File | Role |
|------|------|
| `Libraries/ReactNative/I18nManager.js` | JS module — `isRTL` frozen at line 59 (**shared, both platforms**) |
| `Libraries/ReactNative/NativeI18nManager.js` | TurboModule spec (no events) |
| `src/private/specs_DEPRECATED/modules/NativeI18nManager.js` | Original spec |
| `React/CoreModules/RCTI18nManager.mm` | iOS native TurboModule — posts nothing |
| `React/Modules/RCTI18nUtil.h` / `.m` | iOS state holder (NSUserDefaults) — posts nothing |
| `React/Fabric/Surface/RCTFabricSurface.mm:71,177` | Observes `UIContentSizeCategoryDidChangeNotification` → `_updateLayoutContext` |
| `React/Fabric/RCTSurfacePresenter.mm` | Does NOT observe any i18n notification |
| `React/Base/RCTConstants.h` | iOS notification name registry — no i18n entry |
| `React/CoreModules/RCTDeviceInfo.mm:253` | **Reference pattern**: `sendDeviceEventWithName:@"didUpdateDimensions"` |
| `Libraries/Utilities/Dimensions.js:120` | **Reference pattern**: `RCTDeviceEventEmitter.addListener` → mutable state |

### RN core — Android (in `node_modules/.bun/react-native@0.86.0/.../ReactAndroid/`)

| File | Role |
|------|------|
| `.../modules/i18nmanager/I18nManagerModule.kt` | Android TurboModule — delegates to `I18nUtil`, emits nothing |
| `.../modules/i18nmanager/I18nUtil.kt` | Android state holder (SharedPreferences) — no broadcast/listener |
| `.../runtime/ReactSurfaceView.kt:81,110` | `onMeasure` → `updateLayoutSpecs` — re-reads `isRTL` on every measure pass |
| `.../runtime/ReactSurfaceImpl.kt:176,217` | `updateLayoutSpecs` → `surfaceHandler.setLayoutConstraints(..., isRTL(context))` |
| `.../fabric/SurfaceHandlerBinding.kt:37` | JNI bridge — pushes constraints to C++ `SurfaceHandler` |
| `.../uimanager/LayoutShadowNode.kt:691` | `maybeTransformLeftRightToStartEnd` — re-reads `doLeftAndRightSwapInRTL` per layout |
| `.../runtime/BridgelessReactContext.kt:156` | `emitDeviceEvent(eventName, args)` — **the Android broadcast API** |
| `.../modules/deviceinfo/DeviceInfoModule.kt:117` | **Reference pattern**: `emitDeviceEvent("didUpdateDimensions", ...)` |
| `.../modules/core/DeviceEventManagerModule.kt:26` | Defines `RCTDeviceEventEmitter` JSModule interface |

> **Android Fabric surface re-reads `isRTL` on every `onMeasure`** — no
> notification observer needed. `forceLayout()` triggers a fresh measure pass,
> which re-reads `I18nUtil.isRTL`. This is fundamentally different from iOS,
> where `RCTFabricSurface` caches the direction and only re-reads on
> `UIContentSizeCategoryDidChangeNotification`.

### react-native-screens (in `node_modules/.bun/react-native-screens@4.26.0/.../ios/`)

| File | Role |
|------|------|
| `RNSScreenStackHeaderConfig.h:48` | `@property direction` (`UISemanticContentAttribute`) |
| `RNSScreenStackHeaderConfig.mm:765` | `applySemanticContentAttributeIfNeededToNavCtrl:` — **target for fix** |
| `RNSScreenStackHeaderConfig.mm:475` | `updateViewController:withConfig:animated:` — calls the above at line 506 |
| `RNSScreenStackHeaderConfig.mm:134` | `updateViewControllerIfNeeded` — early-returns for non-top VC |
| `RNSScreenStackHeaderConfig.mm:1054` | `direction` prop inflow |
| `RNSScreenStackHeaderConfig.mm:280` | `loadBackButtonImageInViewController:` — back chevron image |
| `RNSScreenStackHeaderConfig.mm:466` | `setBackIndicatorImage:` in appearance |
| `RNSScreenStackAnimator.mm:135,235` | Reads `view.semanticContentAttribute` for animation direction |
| `RNSScreenStack.mm:824` | Reads `view.semanticContentAttribute` for gesture edge |
| `RNSScreenStack.h:13` | `RNSNavigationController` declaration — **target for `traitCollectionDidChange:`** |
| `RNSScreenStack.mm:41` | `RNSNavigationController` implementation — **target for fix** |
| `RNSScreenStack.mm:205` | `RNSNavigationController` instantiation |
| `RNSConvert.mm:5` | `UISemanticContentAttributeFromCppEquivalent:` — only Force{L,R}To{R,L} |
| `tabs/host/RNSTabsHostComponentView.mm:420` | **Working reference**: `setLayoutDirection:` uses `traitOverrides` |
| `tabs/host/RNSTabBarController.mm:1033` | **Working reference**: pre-iOS-17 `setOverrideTraitCollection:` fallback |
| `tabs/host/RNSTabBarController.mm:213` | `traitCollectionDidChange:` (handles size class, not direction) |

## Appendix B: What This Package Does Today (Workarounds)

These workarounds become unnecessary once the upstream fixes land:

| Workaround | In this package | Replaced by |
|-----------|-----------------|-------------|
| Post `UIContentSizeCategory.didChangeNotification` | `HybridLayoutDirection.swift:applyFlip` (iOS) | RNS's native `RCTI18nDirectionDidChangeNotification` observer |
| Call `I18nManager.forceRTL()` + `allowRTL()` in JS | `src/index.ts:setDirection` (shared) | Core's reactive `isRTL` getter (the call still happens, but the JS sync becomes unnecessary) |
| `LocaleDirContext` wrapper in consumer app | `example/app/_layout.tsx` (shared) | RNS reads `traitOverrides` directly (if `direction` prop is passed) |
| `semanticContentAttribute` + `setNeedsLayout` on nav bars | `HybridLayoutDirection.swift:applyAttribute` (iOS) | RNS's own `applySemanticContentAttributeIfNeededToNavCtrl:` with `traitOverrides` |
| `forceLayout()` + `requestLayout()` on `ReactSurfaceView`s | `HybridLayoutDirection.kt:forceSurfaceRelayout` (Android) | Still needed — Android re-reads `isRTL` on measure, but `forceLayout` is what triggers the measure. This stays. |
| `decorView.layoutDirection = direction` | `HybridLayoutDirection.kt:setRTL` (Android) | Stays — this is what mirrors the native chrome (toolbar, headers). RNS Android inherits from this. |

> **Note:** Android's `forceLayout()`/`decorView.layoutDirection` workarounds
> are not replaced by the upstream fix — they're the mechanism that makes the
> flip work on Android. The upstream fix only adds JS-side reactivity
> (`I18nManager.isRTL` updates), not the native flip itself.

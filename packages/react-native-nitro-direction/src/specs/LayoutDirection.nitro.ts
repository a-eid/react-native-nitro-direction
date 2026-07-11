import { type HybridObject, NitroModules } from 'react-native-nitro-modules'

/**
 * The two possible layout directions. `'ltr'` flows left-to-right (English,
 * Spanish, …); `'rtl'` flows right-to-left (Arabic, Hebrew, Persian, …).
 */
export type Direction = 'ltr' | 'rtl'

/**
 * The native runtime that owns the app's layout direction.
 *
 * A single singleton HybridObject, created once and living for the app's
 * lifetime — modelled on `Appearance` / `Dimensions` / `Keyboard`: native owns
 * the state, JS (and styling engines) consume it.
 *
 * {@link LayoutDirection.setRTL} flips the **entire app** — the React Native
 * content (text alignment, `flex` start/end, left/right style swapping) *and*
 * the native chrome (navigation header, native tab bar, the iOS edge
 * swipe-back gesture) — at runtime, with no restart, reload or remount.
 *
 * Thread-safety: {@link LayoutDirection.setRTL} dispatches all UIKit/View work
 * to the main/UI thread internally and resolves the Promise once the flip has
 * landed. The {@link LayoutDirection.isRTL} getter reflects the requested
 * direction immediately (it is updated synchronously at the start of the flip),
 * while {@link LayoutDirection.onDirectionChanged} fires once the visual flip
 * completes.
 */
export interface LayoutDirection
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /**
   * The currently requested layout direction. Updated synchronously at the
   * start of a flip, so it reflects *intent* — read this for live UI.
   * (`I18nManager.isRTL` on the JS side is kept in sync with this.)
   */
  readonly isRTL: boolean

  /**
   * Convenience: `'rtl'` when {@link LayoutDirection.isRTL}, else `'ltr'`.
   */
  readonly direction: Direction

  /**
   * Flip the whole app's layout direction at runtime — natively, with no
   * restart, reload or remount.
   *
   * @param isRTL `true` for right-to-left, `false` for left-to-right.
   * @returns a Promise resolving to the direction that was applied, once the
   *   native flip + re-layout has landed. Safe to call off-device / when the
   *   native module is unavailable (resolves to `isRTL` unchanged).
   */
  setRTL(isRTL: boolean): Promise<boolean>

  /**
   * Flip to the opposite of the current direction.
   * @returns the new direction (a Promise resolving to the applied `isRTL`).
   */
  toggle(): Promise<boolean>

  /**
   * Native → JS event. Fires **after** the visual flip has landed on the
   * main/UI thread (so styling engines / listeners that recompute on a
   * direction change know the native hierarchy is already mirrored).
   *
   * Install by assigning a function; pass `undefined` to clear.
   */
  onDirectionChanged: ((isRTL: boolean) => void) | undefined
}

const layoutDirection = NitroModules.createHybridObject<LayoutDirection>('LayoutDirection')
export { layoutDirection }

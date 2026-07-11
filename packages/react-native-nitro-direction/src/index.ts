import { I18nManager } from 'react-native'

import { layoutDirection } from './specs/LayoutDirection.nitro'

/**
 * Get the current layout direction.
 *
 * @returns `'ltr'` or `'rtl'`.
 */
export function getDirection(): 'ltr' | 'rtl' {
  return layoutDirection.direction
}

/**
 * Set the whole app's layout direction at runtime — natively, with no restart,
 * reload or remount. One call re-mirrors:
 *
 * - the entire React Native content (text alignment, `flex` start/end,
 *   left/right style swapping), and
 * - the native chrome — the native-stack navigation header, the native tab
 *   bar, and on iOS the interactive edge swipe-back gesture (it rebinds to the
 *   mirrored edge).
 *
 * It also keeps the JS-side `I18nManager.isRTL` constant in sync, so the rest
 * of your app (and libraries that read it) see the new direction immediately.
 *
 * @param direction `'ltr'` or `'rtl'`.
 * @returns a Promise resolving to the applied direction once the native flip
 *   has landed.
 */
export async function setDirection(direction: 'ltr' | 'rtl'): Promise<'ltr' | 'rtl'> {
  const isRTL = direction === 'rtl'
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.allowRTL(true)
    I18nManager.forceRTL(isRTL)
  }
  await layoutDirection.setRTL(isRTL)
  return direction
}

/**
 * Subscribe to native direction changes. Fires **after** the visual flip has
 * landed on the main/UI thread.
 *
 * @param callback Called with the new direction (`'ltr'` or `'rtl'`) whenever
 *   the layout direction changes.
 * @returns A cleanup function that removes the listener.
 */
export function onDirectionChanged(
  callback: (direction: 'ltr' | 'rtl') => void,
): () => void {
  layoutDirection.onDirectionChanged = (isRTL: boolean) => {
    callback(isRTL ? 'rtl' : 'ltr')
  }
  return () => {
    layoutDirection.onDirectionChanged = undefined
  }
}

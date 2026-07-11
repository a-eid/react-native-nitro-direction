import { I18nManager } from 'react-native'

import { layoutDirection } from './specs/LayoutDirection.nitro'
import { isRTLLocale } from './locales'

export { layoutDirection }
export type { LayoutDirection, Direction } from './specs/LayoutDirection.nitro'
export { isRTLLocale } from './locales'

/**
 * Flip the whole app's layout direction (LTR ⇄ RTL) at runtime — natively,
 * with no restart, reload or remount. One call re-mirrors:
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
 * @param isRTL `true` for right-to-left, `false` for left-to-right.
 * @returns a Promise resolving to the direction that was applied, once the
 *   native flip has landed.
 */
export async function setRTL(isRTL: boolean): Promise<boolean> {
  // Keep the JS-side constant coherent even before/without the native flip.
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.allowRTL(true)
    I18nManager.forceRTL(isRTL)
  }
  return layoutDirection.setRTL(isRTL)
}

/**
 * Convenience: flip to the opposite of the current direction.
 */
export async function toggleDirection(): Promise<boolean> {
  const next = !layoutDirection.isRTL
  return setRTL(next)
}

/**
 * Convenience wrapper: apply RTL if `locale` is a right-to-left language,
 * LTR otherwise.
 *
 * @example
 *   await applyLocaleDirection('ar') // RTL
 *   await applyLocaleDirection('en') // LTR
 */
export async function applyLocaleDirection(locale: string): Promise<boolean> {
  return setRTL(isRTLLocale(locale))
}

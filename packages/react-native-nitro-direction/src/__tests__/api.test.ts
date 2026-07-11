import {
  setRTL,
  toggleDirection,
  applyLocaleDirection,
} from '../index'
// Import the mock helpers from the bare specifiers — jest's moduleNameMapper
// resolves these to our stubs (see jest.config.js).
import {
  __reset as resetNitro,
  __lastSetRTL,
  __didToggle,
  layoutDirection,
} from 'react-native-nitro-modules'
import { I18nManager, __resetI18n } from 'react-native'

describe('setRTL (JS wrapper)', () => {
  beforeEach(() => {
    resetNitro()
    __resetI18n()
  })

  it('calls the native setRTL with the given value', async () => {
    await setRTL(true)
    expect(__lastSetRTL()).toBe(true)

    await setRTL(false)
    expect(__lastSetRTL()).toBe(false)
  })

  it('resolves to the applied direction', async () => {
    await expect(setRTL(true)).resolves.toBe(true)
    await expect(setRTL(false)).resolves.toBe(false)
  })

  it('keeps JS-side I18nManager.isRTL in sync', async () => {
    await setRTL(true)
    expect(I18nManager.isRTL).toBe(true)

    await setRTL(false)
    expect(I18nManager.isRTL).toBe(false)
  })
})

describe('toggleDirection', () => {
  beforeEach(() => {
    resetNitro()
    __resetI18n()
  })

  it('flips to the opposite of the current direction', async () => {
    expect(layoutDirection.isRTL).toBe(false)
    await toggleDirection()
    expect(layoutDirection.isRTL).toBe(true)
    // The JS wrapper calls setRTL, not the native toggle, so the toggle flag
    // never trips.
    expect(__didToggle()).toBe(false)
  })
})

describe('applyLocaleDirection', () => {
  beforeEach(() => {
    resetNitro()
    __resetI18n()
  })

  it.each<[string, boolean]>([
    ['ar', true],
    ['ar-EG', true],
    ['he-IL', true],
    ['fa', true],
    ['ur-PK', true],
    ['en', false],
    ['en-US', false],
    ['fr-FR', false],
  ])('locale %s → native setRTL(%s)', async (locale, expected) => {
    await applyLocaleDirection(locale)
    expect(__lastSetRTL()).toBe(expected)
  })
})

describe('onDirectionChanged callback', () => {
  beforeEach(() => {
    resetNitro()
    __resetI18n()
  })

  it('fires when the mock flips', async () => {
    const seen: boolean[] = []
    layoutDirection.onDirectionChanged = (isRTL: boolean) => seen.push(isRTL)

    await setRTL(true)
    await setRTL(false)

    expect(seen).toEqual([true, false])
  })
})

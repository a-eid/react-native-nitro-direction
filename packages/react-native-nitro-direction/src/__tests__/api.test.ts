import { setDirection, getDirection, onDirectionChanged } from '../index'
import {
  __reset as resetNitro,
  __lastSetRTL,
} from 'react-native-nitro-modules'
import { I18nManager, __resetI18n } from 'react-native'

describe('setDirection', () => {
  beforeEach(() => {
    resetNitro()
    __resetI18n()
  })

  it("calls the native setRTL with true for 'rtl'", async () => {
    await setDirection('rtl')
    expect(__lastSetRTL()).toBe(true)
    expect(I18nManager.isRTL).toBe(true)
  })

  it("calls the native setRTL with false for 'ltr'", async () => {
    // set to rtl first so the 'ltr' call isn't an early-return no-op
    await setDirection('rtl')
    expect(__lastSetRTL()).toBe(true)

    await setDirection('ltr')
    expect(__lastSetRTL()).toBe(false)
    expect(I18nManager.isRTL).toBe(false)
  })

  it('early-returns when direction is unchanged', async () => {
    // already ltr from reset — calling ltr again should no-op
    expect(__lastSetRTL()).toBe(null)
    await setDirection('ltr')
    expect(__lastSetRTL()).toBe(null)
  })

  it('resolves to the applied direction', async () => {
    await expect(setDirection('rtl')).resolves.toBe('rtl')
    await expect(setDirection('ltr')).resolves.toBe('ltr')
  })

  it('keeps JS-side I18nManager.isRTL in sync', async () => {
    expect(I18nManager.isRTL).toBe(false)

    await setDirection('rtl')
    expect(I18nManager.isRTL).toBe(true)

    await setDirection('ltr')
    expect(I18nManager.isRTL).toBe(false)
  })
})

describe('getDirection', () => {
  beforeEach(() => {
    resetNitro()
    __resetI18n()
  })

  it("returns 'ltr' initially", () => {
    expect(getDirection()).toBe('ltr')
  })

  it("returns 'rtl' after setting to rtl", async () => {
    await setDirection('rtl')
    expect(getDirection()).toBe('rtl')
  })

  it("returns 'ltr' after toggling back", async () => {
    await setDirection('rtl')
    await setDirection('ltr')
    expect(getDirection()).toBe('ltr')
  })
})

describe('onDirectionChanged', () => {
  beforeEach(() => {
    resetNitro()
    __resetI18n()
  })

  it('fires when the direction changes', async () => {
    const seen: string[] = []
    const cleanup = onDirectionChanged((direction) => seen.push(direction))

    await setDirection('rtl')
    await setDirection('ltr')

    expect(seen).toEqual(['rtl', 'ltr'])
    cleanup()
  })

  it('cleanup stops further events', async () => {
    const seen: string[] = []
    const cleanup = onDirectionChanged((direction) => seen.push(direction))
    cleanup()

    await setDirection('rtl')
    expect(seen).toEqual([])
  })
})

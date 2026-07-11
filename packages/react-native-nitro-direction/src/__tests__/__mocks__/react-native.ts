/**
 * Minimal `react-native` mock for unit-testing the JS helpers without a native
 * runtime. Only the `I18nManager` surface that `index.ts` touches is stubbed.
 */
let _isRTL = false

export const I18nManager = {
  get isRTL() {
    return _isRTL
  },
  allowRTL: (_value: boolean) => {},
  forceRTL: (value: boolean) => {
    _isRTL = value
  },
  swapLeftAndRightInRTL: (_value: boolean) => {},
  getConstants: () => ({ isRTL: _isRTL }),
}

export const Platform = {
  OS: 'ios',
  select: <T>(obj: { ios?: T; android?: T; default?: T }): T | undefined =>
    obj.ios ?? obj.default,
}

// Reset helper for tests (not exported from the real module).
export const __resetI18n = () => {
  _isRTL = false
}

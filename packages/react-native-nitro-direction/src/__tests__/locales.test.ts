import { isRTLLocale } from '../locales'

describe('isRTLLocale', () => {
  describe('RTL languages', () => {
    const rtlCases: Array<[string, string]> = [
      ['ar', 'Arabic'],
      ['he', 'Hebrew'],
      ['fa', 'Persian'],
      ['ur', 'Urdu'],
      ['ps', 'Pashto'],
      ['sd', 'Sindhi'],
      ['ug', 'Uyghur'],
      ['yi', 'Yiddish'],
      ['ckb', 'Kurdish Sorani'],
      ['dv', 'Divehi'],
      ['ku', 'Kurdish'],
      ['arc', 'Aramaic'],
      ['iw', 'legacy Hebrew'],
    ]

    test.each(rtlCases)("'%s' (%s) → true", (code) => {
      expect(isRTLLocale(code)).toBe(true)
    })
  })

  describe('LTR languages', () => {
    const ltrCases = ['en', 'fr', 'es', 'de', 'zh', 'ja', 'ko', 'ru', 'hi', 'th']
    test.each(ltrCases)("'%s' → false", (code) => {
      expect(isRTLLocale(code)).toBe(false)
    })
  })

  describe('BCP-47 tags', () => {
    test.each([
      ['ar-EG', true],
      ['ar-SA', true],
      ['he-IL', true],
      ['fa-IR', true],
      ['ur-PK', true],
      ['en-US', false],
      ['en-GB', false],
      ['zh-CN', false],
    ])("'%s' → %s", (tag, expected) => {
      expect(isRTLLocale(tag)).toBe(expected)
    })
  })

  describe('underscore separators', () => {
    test.each([
      ['ar_EG', true],
      ['he_IL', true],
      ['fa_IR', true],
      ['en_US', false],
    ])("'%s' → %s", (tag, expected) => {
      expect(isRTLLocale(tag)).toBe(expected)
    })
  })

  describe('case-insensitivity', () => {
    test.each([
      ['AR', true],
      ['AR-EG', true],
      ['He', true],
      ['EN', false],
      ['EN-us', false],
    ])("'%s' → %s", (tag, expected) => {
      expect(isRTLLocale(tag)).toBe(expected)
    })
  })

  describe('edge cases', () => {
    test('empty string → false', () => {
      expect(isRTLLocale('')).toBe(false)
    })

    test('unknown language → false', () => {
      expect(isRTLLocale('xx')).toBe(false)
      expect(isRTLLocale('xx-YY')).toBe(false)
    })

    test('only a region subtag → false', () => {
      expect(isRTLLocale('-EG')).toBe(false)
    })

    test('whitespace-only → false', () => {
      expect(isRTLLocale('   ')).toBe(false)
    })
  })
})

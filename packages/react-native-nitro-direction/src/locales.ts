/**
 * Language codes whose scripts are written right-to-left. Lowercased, matched
 * against the first segment of a BCP-47 tag (`ar-EG` → `ar`, `he_IL` → `he`).
 *
 * Deliberately includes the common RTL scripts plus a couple of legacy codes
 * (`iw` = legacy Hebrew, `iw` is what Android sometimes reports) and scripts
 * that are RTL in their written form (`arc` Aramaic, `dv` Divehi).
 */
const RTL_LANGUAGES = new Set<string>([
  'ar', // Arabic
  'arc', // Aramaic
  'ckb', // Kurdish (Sorani)
  'dv', // Divehi / Maldivian
  'fa', // Persian / Farsi
  'he', // Hebrew
  'iw', // Hebrew (legacy code)
  'ku', // Kurdish
  'ps', // Pashto
  'sd', // Sindhi
  'ug', // Uyghur
  'ur', // Urdu
  'yi', // Yiddish
])

/**
 * Whether a BCP-47 locale / language code is written right-to-left.
 *
 * Accepts full tags (`ar-EG`, `he-IL`), underscored ones (`fa_IR`) and bare
 * language codes (`ur`). Case-insensitive. Anything not in the RTL set returns
 * `false` (so `en`, `fr`, `zh`, … are LTR).
 *
 * @example
 *   isRTLLocale('ar')      // true
 *   isRTLLocale('ar-EG')   // true
 *   isRTLLocale('he_IL')   // true
 *   isRTLLocale('en-US')   // false
 *   isRTLLocale('')        // false
 */
export function isRTLLocale(locale: string): boolean {
  if (!locale) return false
  const lang = locale.toLowerCase().split(/[-_]/)[0] ?? ''
  return RTL_LANGUAGES.has(lang)
}

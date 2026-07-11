/**
 * Minimal `react-native-nitro-modules` mock for unit tests. The real singleton
 * calls native code; here `NitroModules.createHybridObject` returns a stub that
 * records calls and exposes a mutable `isRTL`, so the JS helpers (`setRTL`,
 * `toggleDirection`) can be exercised end-to-end in
 * Node without any native runtime.
 */

// Local shim for the `HybridObject<T>` type so this mock doesn't have to import
// the real `react-native-nitro-modules` (which `tsconfig.test.json` rewrites to
// *this* file via `paths`, and would otherwise be circular).
type HybridObjectShim = Record<string, unknown>

let _isRTL = false
let _lastSetRTL: boolean | null = null
let _lastToggle = false
let _onDirectionChanged: ((isRTL: boolean) => void) | undefined

const stub = {
  get isRTL() {
    return _isRTL
  },
  get direction() {
    return _isRTL ? 'rtl' : ('ltr' as const)
  },
  async setRTL(isRTL: boolean): Promise<boolean> {
    _lastSetRTL = isRTL
    _isRTL = isRTL
    _onDirectionChanged?.(isRTL)
    return isRTL
  },
  async toggle(): Promise<boolean> {
    _lastToggle = true
    _isRTL = !_isRTL
    _onDirectionChanged?.(_isRTL)
    return _isRTL
  },
  set onDirectionChanged(fn: ((isRTL: boolean) => void) | undefined) {
    _onDirectionChanged = fn
  },
  get onDirectionChanged() {
    return _onDirectionChanged
  },
}

export const NitroModules = {
  createHybridObject<T extends HybridObjectShim>(_name: string): T {
    return stub as unknown as T
  },
}

// Test-only introspection / reset helpers (consumed by api.test.ts).
export const __lastSetRTL = (): boolean | null => _lastSetRTL
export const __didToggle = (): boolean => _lastToggle
export const __reset = (): void => {
  _isRTL = false
  _lastSetRTL = null
  _lastToggle = false
  _onDirectionChanged = undefined
}

// Re-export the stub as `layoutDirection` for tests that subscribe to the
// callback directly.
export const layoutDirection = stub

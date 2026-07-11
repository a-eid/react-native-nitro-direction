import NitroModules
import React
import UIKit

/**
 * The native runtime that owns the app's layout direction.
 *
 * `setRTL(isRTL)` hot-swaps the WHOLE app layout direction at runtime, natively,
 * without a reload and without dropping the JS/user session:
 *
 *   1. Flips React Native's own RTL flag (`RCTI18nUtil`) and asks every live
 *      Fabric surface to re-run its layout in the new direction. This is the
 *      exact code path a cold restart takes, so text alignment, flex `start`/
 *      `end`, and left/right style swapping all mirror instantly.
 *   2. Forces the UIKit layout direction on all windows + the native-stack
 *      navigation controllers so the native header and the interactive edge
 *      swipe-back gesture mirror to the correct screen edge.
 *
 * When `isRTL == true` the swipe-back edge / layout moves to the RIGHT.
 * When `isRTL == false` everything moves back to the LEFT.
 *
 * Thread-safety: Nitro calls methods on the JS thread; all UIKit + surface
 * mutation must happen on the main UI thread, so the body runs inside a
 * `DispatchQueue.main.async` block and the Promise resolves once it completes.
 */
class HybridLayoutDirection: HybridLayoutDirectionSpec {
  // MARK: - Callbacks

  var onDirectionChanged: ((_ isRTL: Bool) -> Void)?

  // MARK: - Read-only state

  /**
   * The currently requested direction, read straight from `RCTI18nUtil`.
   * `setRTL` flips the flag synchronously at the start of the call (before
   * dispatching to main), so this getter reflects *intent* immediately.
   */
  var isRTL: Bool {
    return RCTI18nUtil.shared().isRTL()
  }

  var direction: Direction {
    return isRTL ? .rtl : .ltr
  }

  // MARK: - setRTL

  func setRTL(isRTL: Bool) throws -> Promise<Bool> {
    // --- 1. Flip RN's layout direction synchronously, on the calling thread.
    // The flag itself is thread-safe to set, and doing it here (rather than
    // inside the main block) makes the `isRTL` getter coherent immediately.
    let i18n = RCTI18nUtil.shared()
    i18n.allowRTL(true)
    i18n.forceRTL(isRTL)
    i18n.swapLeftAndRight(true)

    let promise = Promise<Bool>()

    // All UIKit + surface mutation MUST happen on the main UI thread.
    DispatchQueue.main.async { [weak self] in
      guard let self = self else {
        promise.resolve(isRTL)
        return
      }
      self.applyFlip(isRTL: isRTL)
      // Fire after the visual flip has landed on the main thread.
      self.onDirectionChanged?(isRTL)
      promise.resolve(isRTL)
    }

    return promise
  }

  // MARK: - toggle

  func toggle() throws -> Promise<Bool> {
    return try setRTL(!isRTL)
  }

  // MARK: - The flip (runs on the main thread)

  /**
   * Re-mirror the whole app: the RN content (Fabric surfaces) + the UIKit chrome.
   *
   * Two independent pieces, both updated on a single main-thread hop:
   *
   *   A. Post `UIContentSizeCategoryDidChangeNotification` so every
   *      `RCTFabricSurface` re-runs `_updateLayoutContext` and stores the new
   *      `layoutDirection` into its constraints.
   *   B. Bust Yoga's per-node size-keyed layout cache (the notification alone
   *      does NOT visibly flip a running surface — see `forceFabricRelayout`).
   *   C. Mirror the UIKit chrome (windows, nav bars, tab bars) and re-arm the
   *      iOS edge swipe-back gesture.
   */
  private func applyFlip(isRTL: Bool) {
    // RCTAccessibilityManager listens to this notification and reads
    // `UIContentSizeCategoryNewValueKey` from userInfo; omitting it logs
    // "Can't determine multiplier for category (null)".
    var contentSizeCategory = UIApplication.shared.preferredContentSizeCategory
    if contentSizeCategory == nil {
      contentSizeCategory = UIContentSizeCategory.large
    }
    NotificationCenter.default.post(
      name: UIContentSizeCategory.didChangeNotification,
      object: nil,
      userInfo: [UIContentSizeCategory.newValueKey: contentSizeCategory as Any]
    )

    let attribute: UISemanticContentAttribute = isRTL
      ? .forceRightToLeft
      : .forceLeftToRight

    // Views created AFTER this call inherit the new direction.
    UIView.appearance().semanticContentAttribute = attribute

    // Collect every active window (scene API on iOS 13+, legacy fallback).
    var windows: [UIWindow] = []
    if #available(iOS 13.0, *) {
      for scene in UIApplication.shared.connectedScenes {
        guard let windowScene = scene as? UIWindowScene else { continue }
        windows.append(contentsOf: windowScene.windows)
      }
    }
    if windows.isEmpty {
      // Fallback for older iOS / Mac Catalyst without scenes.
      windows = UIApplication.shared.windows
    }

    for window in windows {
      window.semanticContentAttribute = attribute
      self.applyAttribute(attribute, to: window.rootViewController)
      // Force every live Fabric surface in this window to fully re-layout in
      // the new direction (the notification only updated the stored direction;
      // Yoga's cache would otherwise keep the old frames).
      self.forceFabricRelayout(in: window, attribute: attribute)
      window.setNeedsLayout()
      window.layoutIfNeeded()
    }
  }

  /**
   * Walk the view-controller hierarchy applying the semantic content attribute.
   * For every `UINavigationController` we also re-arm the interactive pop
   * gesture, which forces the screen-edge pan recognizer to recompute the edge
   * it is bound to (left vs. right). For every `UITabBarController` we mirror
   * the tab bar so the tabs move to the correct side without a restart.
   */
  private func applyAttribute(_ attribute: UISemanticContentAttribute,
                              to viewController: UIViewController?) {
    guard let viewController = viewController else { return }

    viewController.view.semanticContentAttribute = attribute

    if let nav = viewController as? UINavigationController {
      nav.view.semanticContentAttribute = attribute
      nav.navigationBar.semanticContentAttribute = attribute
      // Clear the navigation bar's cached layout boundaries.
      nav.navigationBar.setNeedsLayout()
      nav.navigationBar.layoutIfNeeded()
      // Toggling `enabled` invalidates the recognizer's cached edge so UIKit
      // rebinds it to the mirrored screen edge on the next layout tick.
      if let popGesture = nav.interactivePopGestureRecognizer {
        popGesture.isEnabled = false
        popGesture.isEnabled = true
      }
    }

    if let tabController = viewController as? UITabBarController {
      // The tab bar caches its item layout; setting the semantic attribute and
      // forcing a layout pass mirrors the tab order to the new direction.
      tabController.tabBar.semanticContentAttribute = attribute
      tabController.tabBar.setNeedsLayout()
      tabController.tabBar.layoutIfNeeded()
    }

    // Recurse into every child and any modally presented controller so nested
    // navigators (react-native-screens creates one per stack) are all covered.
    for child in viewController.children {
      self.applyAttribute(attribute, to: child)
    }
    self.applyAttribute(attribute, to: viewController.presentedViewController)

    viewController.view.setNeedsLayout()
    viewController.view.layoutIfNeeded()
  }

  /**
   * Depth-first walk of a view tree that forces every mounted Fabric surface to
   * re-run its layout in the direction set moments earlier.
   *
   * `RCTSurfaceView` is the container UIKit view for a running React surface;
   * its `surface` conforms to `RCTSurfaceProtocol`. We bump the surface's layout
   * constraints (min AND max) by one point and immediately restore the exact
   * originals. Because Yoga keys its layout cache on the available size (not on
   * the layout direction), changing the size invalidates that cache and makes
   * Yoga recompute the whole tree — this time with the RTL/LTR direction already
   * stored in the surface's constraints.
   *
   * We PRESERVE the surface's existing min/max relationship: a root surface is
   * sized exactly (`minimumSize == maximumSize == host bounds`) by the hosting
   * view, so forcing `minimumSize` to zero would let the root collapse (blank
   * screen). We read the current constraints and only offset them.
   *
   * NOTE: SwiftUI content (e.g. `@expo/ui`) is intentionally NOT touched here.
   * Forcing `semanticContentAttribute` on a `UIHostingController`'s view makes
   * UIKit apply a horizontal mirror transform, which flips the glyphs (reversed
   * text). SwiftUI direction must instead be driven from JS via the SwiftUI
   * environment (`\.layoutDirection`).
   */
  private func forceFabricRelayout(in view: UIView,
                                   attribute: UISemanticContentAttribute) {
    if let surfaceView = view as? RCTSurfaceView {
      let surface = surfaceView.surface
      // `RCTFabricSurface` exposes minimumSize/maximumSize; read via KVC so we
      // stay on the public `RCTSurfaceProtocol` header and avoid subclass casts.
      if let surface = surface,
         (surface as NSObject).responds(to: NSSelectorFromString("minimumSize")) {
        let minSize = (surface.value(forKey: "minimumSize") as? NSValue)?.cgSizeValue ?? .zero
        let maxSize = (surface.value(forKey: "maximumSize") as? NSValue)?.cgSizeValue ?? .zero

        if maxSize.width > 0.0 && maxSize.height > 0.0 {
          surface.setMinimumSize(CGSize(width: minSize.width + 1.0, height: minSize.height),
                                 maximumSize: CGSize(width: maxSize.width + 1.0, height: maxSize.height))
          surface.setMinimumSize(minSize, maximumSize: maxSize)
        }
      } else if surface != nil {
        // HARDENING: if RCTFabricSurface ever stops exposing minimumSize/
        // maximumSize (an RN upgrade), the running surface will NOT re-layout
        // until a restart — fail loudly instead of silently degrading.
        print("[LayoutDirection] WARNING: RCTFabricSurface does not respond to " +
              "`minimumSize` — React Native may have changed its surface API. " +
              "The RN content will not relayout until an app restart. " +
              "Please file an issue at https://github.com/a-eid/react-native-nitro-direction/issues " +
              "and include your React Native version.")
      }
    }

    // Mirror native bars regardless of how they were attached — the native tab
    // bar (react-native-screens) and native-stack headers cache their item
    // layout and only re-mirror after an explicit semantic-attribute change.
    if view is UITabBar || view is UINavigationBar {
      view.semanticContentAttribute = attribute
      view.setNeedsLayout()
      view.layoutIfNeeded()
    }

    for subview in view.subviews {
      self.forceFabricRelayout(in: subview, attribute: attribute)
    }
  }
}

import NitroModules
import UIKit

// NOTE: Do NOT `import React` here.
// React's C++ headers break Swift-C++ interop on the iOS 26 SDK's libc++
// (`std::__construct_at` no-matching-function). All React-Native-touching
// code lives in LayoutDirectionBridge.mm (ObjC++) behind a pure-ObjC header.

class HybridLayoutDirection: HybridLayoutDirectionSpec {
  var onDirectionChanged: ((_ isRTL: Bool) -> Void)?

  var isRTL: Bool {
    return LayoutDirectionIsRTL()
  }

  var direction: Direction {
    return isRTL ? .rtl : .ltr
  }

  func setRTL(isRTL: Bool) throws -> Promise<Bool> {
    // Flip RN's own direction flags synchronously so `isRTL` is coherent
    // immediately after the call, then dispatch the view work to the main thread.
    LayoutDirectionApplyRTL(isRTL)

    let promise = Promise<Bool>()

    DispatchQueue.main.async { [weak self] in
      guard let self = self else {
        promise.resolve(withResult: isRTL)
        return
      }
      self.applyFlip(isRTL: isRTL)
      self.onDirectionChanged?(isRTL)
      promise.resolve(withResult: isRTL)
    }

    return promise
  }

  func toggle() throws -> Promise<Bool> {
    return try setRTL(isRTL: !isRTL)
  }

  private func applyFlip(isRTL: Bool) {
    let contentSizeCategory = UIApplication.shared.preferredContentSizeCategory
    NotificationCenter.default.post(
      name: UIContentSizeCategory.didChangeNotification,
      object: nil,
      userInfo: ["UIContentSizeCategoryNewValueKey": contentSizeCategory]
    )

    let attribute: UISemanticContentAttribute = isRTL
      ? .forceRightToLeft
      : .forceLeftToRight

    UIView.appearance().semanticContentAttribute = attribute

    var windows: [UIWindow] = []
    if #available(iOS 13.0, *) {
      for scene in UIApplication.shared.connectedScenes {
        guard let windowScene = scene as? UIWindowScene else { continue }
        windows.append(contentsOf: windowScene.windows)
      }
    }

    for window in windows {
      window.semanticContentAttribute = attribute
      self.applyAttribute(attribute, to: window.rootViewController)
      self.forceFabricRelayout(in: window, attribute: attribute)
      window.setNeedsLayout()
      window.layoutIfNeeded()
    }
  }

  private func applyAttribute(_ attribute: UISemanticContentAttribute,
                              to viewController: UIViewController?) {
    guard let viewController = viewController else { return }

    viewController.view.semanticContentAttribute = attribute

    if let nav = viewController as? UINavigationController {
      nav.view.semanticContentAttribute = attribute
      nav.navigationBar.semanticContentAttribute = attribute
      nav.navigationBar.setNeedsLayout()
      nav.navigationBar.layoutIfNeeded()
      if let popGesture = nav.interactivePopGestureRecognizer {
        popGesture.isEnabled = false
        popGesture.isEnabled = true
      }
    }

    if let tabController = viewController as? UITabBarController {
      tabController.tabBar.semanticContentAttribute = attribute
      tabController.tabBar.setNeedsLayout()
      tabController.tabBar.layoutIfNeeded()
    }

    for child in viewController.children {
      self.applyAttribute(attribute, to: child)
    }
    self.applyAttribute(attribute, to: viewController.presentedViewController)

    viewController.view.setNeedsLayout()
    viewController.view.layoutIfNeeded()
  }

  private func forceFabricRelayout(in view: UIView,
                                   attribute: UISemanticContentAttribute) {
    // Delegated to the ObjC++ bridge — busts Yoga's size-keyed layout cache on
    // every Fabric surface. Keeps React out of the Swift module.
    LayoutDirectionRelayoutSurfaceIfPresent(view)

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

import NitroModules
import React
import UIKit

class HybridLayoutDirection: HybridLayoutDirectionSpec {
  var onDirectionChanged: ((_ isRTL: Bool) -> Void)?

  var isRTL: Bool {
    return RCTI18nUtil.sharedInstance()?.isRTL() ?? false
  }

  var direction: Direction {
    return isRTL ? .rtl : .ltr
  }

  func setRTL(isRTL: Bool) throws -> Promise<Bool> {
    guard let i18n = RCTI18nUtil.sharedInstance() else {
      let promise = Promise<Bool>()
      promise.resolve(withResult: isRTL)
      return promise
    }
    i18n.allowRTL(true)
    i18n.forceRTL(isRTL)
    i18n.swapLeftAndRightInRTL(true)

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
    if let surfaceView = view as? RCTSurfaceView,
       let surface = surfaceView.surface {
      // RCTFabricSurface implements setMinimumSize:maximumSize: on the protocol.
      // Use a bridging cast through AnyObject to access it without subclass casts.
      if let surfaceObj = surface as AnyObject?,
         surfaceObj.responds(to: NSSelectorFromString("minimumSize")) {
        let minSize = (surfaceObj.value(forKey: "minimumSize") as? NSValue)?.cgSizeValue ?? .zero
        let maxSize = (surfaceObj.value(forKey: "maximumSize") as? NSValue)?.cgSizeValue ?? .zero

        if maxSize.width > 0.0 && maxSize.height > 0.0 {
          surface.setMinimumSize(CGSize(width: minSize.width + 1.0, height: minSize.height),
                                 maximumSize: CGSize(width: maxSize.width + 1.0, height: maxSize.height))
          surface.setMinimumSize(minSize, maximumSize: maxSize)
        } else {
          // Surface exists but no valid size constraints yet. Use setNeedsLayout
          // to trigger a relayout on the container instead.
          surfaceView.setNeedsLayout()
          surfaceView.layoutIfNeeded()
        }
      } else {
        print("[LayoutDirection] WARNING: RCTFabricSurface does not respond to " +
              "`minimumSize` — React Native may have changed its surface API. " +
              "The RN content will not relayout until an app restart. " +
              "Please file an issue at https://github.com/a-eid/react-native-nitro-direction/issues " +
              "and include your React Native version.")
      }
    }

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

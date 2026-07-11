//
//  LayoutDirectionBridge.h
//  LayoutDirection
//
//  Pure Objective-C header. Imports ONLY Foundation/UIKit — never React.
//
//  React-Native-touching code lives in LayoutDirectionBridge.mm (ObjC++).
//  Keeping React out of the Swift module prevents the iOS 26 SDK's
//  libc++ `__construct_at` change from breaking Swift-C++ interop.
//

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

/// Read React Native's persisted `isRTL` flag (`RCTI18nUtil`).
BOOL LayoutDirectionIsRTL(void);

/// Flip React Native's own i18n flags synchronously so the getter above is
/// coherent immediately after the call. Mirrors `setRTL` in `HybridLayoutDirection`.
void LayoutDirectionApplyRTL(BOOL isRTL);

/// If `view` is a Fabric `RCTSurfaceView`, bust Yoga's per-node size-keyed layout
/// cache by nudging the surface's min/max size by 1pt then restoring it — forcing
/// a real re-layout in the new direction. Returns YES if `view` was a surface.
BOOL LayoutDirectionRelayoutSurfaceIfPresent(UIView *view);

NS_ASSUME_NONNULL_END

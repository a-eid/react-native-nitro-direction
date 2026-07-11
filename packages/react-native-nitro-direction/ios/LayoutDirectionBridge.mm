//
//  LayoutDirectionBridge.mm
//  LayoutDirection
//
//  ObjC++ implementation. This is the ONLY file that imports React headers.
//  Compiling as ObjC++ (not Swift-C++ interop) sidesteps the iOS 26 SDK's
//  libc++ `__construct_at` change that breaks Swift's interop layer.
//

#import "LayoutDirectionBridge.h"

#import <React/RCTI18nUtil.h>
#import <React/RCTSurfaceView.h>
#import <React/RCTSurfaceProtocol.h>
#import <React/RCTFabricSurface.h>

BOOL LayoutDirectionIsRTL(void) {
  return [RCTI18nUtil sharedInstance].isRTL;
}

void LayoutDirectionApplyRTL(BOOL isRTL) {
  RCTI18nUtil *i18n = [RCTI18nUtil sharedInstance];
  [i18n allowRTL:YES];
  [i18n forceRTL:isRTL];
  [i18n swapLeftAndRightInRTL:YES];
}

BOOL LayoutDirectionRelayoutSurfaceIfPresent(UIView *view) {
  if (![view isKindOfClass:[RCTSurfaceView class]]) {
    return NO;
  }

  RCTSurfaceView *surfaceView = (RCTSurfaceView *)view;
  id<RCTSurfaceProtocol> surface = surfaceView.surface;
  if (surface == nil) {
    return YES;
  }

  // `RCTSurfaceProtocol` only declares the setter; the `minimumSize`/
  // `maximumSize` getter properties live on the concrete `RCTFabricSurface`
  // (New Architecture). Cast to read them; fall back to a plain layout pass
  // if the surface isn't a Fabric surface (e.g. legacy bridge surface).
  RCTFabricSurface *fabricSurface = [surface isKindOfClass:[RCTFabricSurface class]]
      ? (RCTFabricSurface *)surface
      : nil;

  if (fabricSurface != nil) {
    CGSize minSize = fabricSurface.minimumSize;
    CGSize maxSize = fabricSurface.maximumSize;

    if (maxSize.width > 0.0 && maxSize.height > 0.0) {
      // Bust Yoga's per-node size-keyed layout cache: bump the constraints by
      // 1pt then immediately restore, forcing a real re-layout in the new
      // direction (Yoga keys its cache on size + measure mode, not direction).
      [surface setMinimumSize:CGSizeMake(minSize.width + 1.0, minSize.height)
                  maximumSize:CGSizeMake(maxSize.width + 1.0, maxSize.height)];
      [surface setMinimumSize:minSize maximumSize:maxSize];
    } else {
      // Surface exists but has no valid size constraints yet — a plain layout
      // pass will pick up the new direction on the next traversal.
      [surfaceView setNeedsLayout];
      [surfaceView layoutIfNeeded];
    }
  } else {
    // Not a Fabric surface — still nudge the setter (which the protocol
    // declares) with the view's own bounds to trigger a relayout.
    CGSize bounds = surfaceView.bounds.size;
    [surface setMinimumSize:bounds maximumSize:bounds];
    [surfaceView setNeedsLayout];
    [surfaceView layoutIfNeeded];
  }

  return YES;
}

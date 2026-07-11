package com.margelo.nitro.layoutdirection

import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.view.ViewGroup
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.modules.i18nmanager.I18nUtil
import com.facebook.react.runtime.ReactSurfaceView
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

/**
 * The native runtime that owns the app's layout direction.
 *
 * `setRTL(isRTL)` hot-swaps the WHOLE app layout direction at runtime, without
 * recreating the Activity, reloading the JS bundle, or remounting React:
 *
 *   1. Persists React Native's direction flags (I18nUtil shared preferences —
 *      the exact same flags a cold start reads). This happens synchronously on
 *      the calling thread so `isRTL` is coherent immediately after the call.
 *   2. Forces every live Fabric surface (`ReactSurfaceView`) through a fresh
 *      measure pass. `ReactSurfaceView.onMeasure` calls
 *      `ReactSurfaceImpl.updateLayoutSpecs`, which re-reads `I18nUtil.isRTL`
 *      and pushes new layout constraints into the C++ `SurfaceHandler`. Because
 *      the direction changed, `SurfaceHandler.constraintLayout` re-commits the
 *      whole shadow tree — a full native RTL/LTR re-layout, same code path as
 *      boot.
 *   3. Mirrors the native chrome: sets the window decor view's
 *      `layoutDirection` so every native view that inherits its direction
 *      (react-native-screens toolbars/headers, fragment containers) resolves
 *      to the new direction on the next layout pass.
 *
 * Thread-safety: Nitro calls methods on the JS thread; all View mutation must
 * happen on the UI thread, so steps 2–3 run inside a `Handler(Looper.getMainLooper())`
 * block and the Promise resolves once they complete.
 */
@Keep
@DoNotStrip
class HybridLayoutDirection : HybridLayoutDirectionSpec() {

    override var onDirectionChanged: ((isRTL: Boolean) -> Unit)? = null

    /** The currently requested direction, read straight from the persisted flag. */
    override val isRTL: Boolean
        get() = NitroModules.applicationContext?.let { I18nUtil.instance.isRTL(it) } ?: false

    override val direction: Direction
        get() = if (isRTL) Direction.RTL else Direction.LTR

    override fun setRTL(isRTL: Boolean): Promise<Boolean> {
        val context = NitroModules.applicationContext
            ?: throw IllegalStateException("ApplicationContext is not available")

        // --- 1. Flip RN's own direction flags. These live in SharedPreferences and
        // are re-read on every ReactSurfaceView measure. Done synchronously so the
        // `isRTL` getter is coherent immediately.
        val i18nUtil = I18nUtil.instance
        i18nUtil.allowRTL(context, true)
        i18nUtil.forceRTL(context, isRTL)
        i18nUtil.swapLeftAndRightInRTL(context, true)

        val promise = Promise<Boolean>()
        val mainHandler = Handler(Looper.getMainLooper())

        mainHandler.post {
            val activity = context.currentActivity
            if (activity == null) {
                // Flags are persisted; the next surface to measure picks them up.
                // Still fire the callback so listeners know the intent changed.
                onDirectionChanged?.invoke(isRTL)
                promise.resolve(isRTL)
                return@post
            }

            val direction =
                if (isRTL) View.LAYOUT_DIRECTION_RTL else View.LAYOUT_DIRECTION_LTR

            // --- 3. Mirror the native chrome. Views with LAYOUT_DIRECTION_INHERIT
            // (the default — includes react-native-screens' native header/Toolbar)
            // re-resolve from the decor view on the next traversal.
            val decorView = activity.window?.decorView
            if (decorView != null) {
                decorView.layoutDirection = direction
            } else {
                Log.w(TAG, "Activity window has no decor view; the native chrome will not mirror until the next layout pass.")
            }

            // --- 2. Force every live Fabric surface through onMeasure so it pushes
            // fresh, direction-aware layout constraints into the SurfaceHandler.
            if (decorView != null) {
                forceSurfaceRelayout(decorView)
                decorView.requestLayout()
                decorView.invalidate()
            }

            // Fire after the visual flip has landed (main-thread block is done).
            onDirectionChanged?.invoke(isRTL)
            promise.resolve(isRTL)
        }

        return promise
    }

    override fun toggle(): Promise<Boolean> {
        return setRTL(!isRTL)
    }

    /**
     * Walk the view hierarchy and force-relayout every `ReactSurfaceView`.
     * `forceLayout()` marks the view dirty so its `onMeasure` is guaranteed to
     * run on the next pass even if the measure specs are unchanged; `onMeasure`
     * is where the fresh `I18nUtil.isRTL` value reaches Fabric.
     */
    private fun forceSurfaceRelayout(view: View) {
        if (view is ReactSurfaceView) {
            view.forceLayout()
            view.requestLayout()
        }
        if (view is ViewGroup) {
            for (i in 0 until view.childCount) {
                forceSurfaceRelayout(view.getChildAt(i))
            }
        }
    }

    companion object {
        private const val TAG = "LayoutDirection"
    }
}

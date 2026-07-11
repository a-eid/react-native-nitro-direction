# react-native-nitro-direction — example

A minimal React Native (bare CLI) app that exercises
[`react-native-nitro-direction`](../packages/react-native-nitro-direction)
flipping the **whole UI between LTR and RTL at runtime** — no restart, no
reload, no remount.

It is a **stability torture-test**, not a showcase. One screen, every surface
that has historically broken on an RTL flip:

1. **TextInput** — cursor position, selection, placeholder alignment.
2. **FlatList (horizontal)** — start/end anchoring.
3. **FlatList (inverted + sticky header)** — the three known-bad modes.
4. **Modal** — flip *while open*, and open *after* a flip.
5. **setRTL** — direct direction flip test.

Plus a live `scroll offset` readout to confirm a `ScrollView` keeps its position
across the flip.

## Run it

Because this is native code (Nitro module), it needs a full native build — Metro
reload is not enough.

```sh
# from the repo root
bun install                      # or yarn / npm — installs the workspace

cd example
bun install                      # example's own deps

# iOS
cd ios && pod install && cd ..   # autolinks the Nitro module
npx react-native run-ios

# Android
npx react-native run-android
```

> The example resolves the library by workspace symlink
> (`react-native-nitro-direction: link:../packages/...`), so edits to the
> library source hot-reload without a `nitrogen` rebuild.

## Try it

1. Hit **Flip** in the header. The whole screen mirrors in place — text
   right-aligns, rows reverse, chevrons swap, the header readout flips.
2. Open the **Modal**, then **Flip** without closing — the modal mirrors in
   place and stays open.
3. Scroll the list, **Flip** mid-scroll — the scroll offset is preserved.
4. Toggle **inverted** and flip — the list keeps working.
5. Flip back. Everything returns to LTR. No restart, no remount, no lost state.

If any of those glitch, that's the bug the library needs to fix — file it.

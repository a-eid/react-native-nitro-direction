import { useEffect, useState, type ReactNode } from "react"
import { Stack } from "expo-router"
import { getDirection, onDirectionChanged } from "react-native-nitro-direction"
import { LocaleDirContext } from "expo-router/react-navigation"
import { COLORS } from "../components/COLORS"

/**
 * Wraps the app in LocaleDirContext, driven by the package's direction state.
 *
 * Isolated as its own component so that when direction changes, only the
 * context provider and its consumers (screens calling `useLocale()`)
 * re-render — not the entire navigator tree. The `children` prop is a stable
 * React element reference from the parent, so React bails out of re-rendering
 * `<Stack>` and its screens.
 */
function DirectionProvider({ children }: { children: ReactNode }) {
  const [direction, setDirection] = useState(getDirection)

  useEffect(() => {
    return onDirectionChanged(setDirection)
  }, [setDirection])

  return (
    <LocaleDirContext.Provider value={direction}>
      {children}
    </LocaleDirContext.Provider>
  )
}

export default function RootLayout() {
  return (
    <DirectionProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.bg },
          headerTintColor: COLORS.text,
        }}
      >
        <Stack.Screen name="index" options={{ title: "react-native-nitro-direction" }} />
        <Stack.Screen name="(native-tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(js-tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
        <Stack.Screen name="messages" options={{ title: "Messages" }} />
        <Stack.Screen name="files" options={{ title: "Files" }} />
        <Stack.Screen name="contacts" options={{ title: "Contacts" }} />
        <Stack.Screen name="standalone-modal" options={{ title: "Modal", presentation: "modal" }} />
      </Stack>
    </DirectionProvider>
  )
}

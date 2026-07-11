import { Tabs } from 'expo-router'
import { COLORS } from '../../components/COLORS'

export default function JsTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.bg },
        headerTintColor: COLORS.text,
        tabBarStyle: { backgroundColor: COLORS.bg, borderTopColor: COLORS.border },
        tabBarActiveTintColor: COLORS.tint,
        tabBarInactiveTintColor: COLORS.muted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inputs', tabBarIcon: () => null }} />
      <Tabs.Screen name="list" options={{ title: 'Lists', tabBarIcon: () => null }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: () => null }} />
    </Tabs>
  )
}

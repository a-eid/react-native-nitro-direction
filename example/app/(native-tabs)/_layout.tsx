import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { DarkTheme, ThemeProvider } from 'expo-router'
import { COLORS } from '../../components/COLORS'

export default function NativeTabsLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Inputs</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="text.cursor" md="text_fields" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="list">
          <NativeTabs.Trigger.Label>Lists</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="list.bullet" md="list" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="modal">
          <NativeTabs.Trigger.Label>Modal</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="rectangle" md="crop_square" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  )
}

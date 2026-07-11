import 'react-native-gesture-handler'
import { Drawer } from 'expo-router/drawer'
import { COLORS } from '../../components/COLORS'

export default function DrawerLayout() {
  return (
    <Drawer
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.bg },
        headerTintColor: COLORS.text,
        drawerStyle: { backgroundColor: COLORS.bg },
        drawerActiveTintColor: COLORS.tint,
        drawerInactiveTintColor: COLORS.muted,
      }}
    >
      <Drawer.Screen name="home" options={{ drawerLabel: 'Home', title: 'Drawer Home' }} />
      <Drawer.Screen name="inbox" options={{ drawerLabel: 'Inbox', title: 'Drawer Inbox' }} />
      <Drawer.Screen name="archive" options={{ drawerLabel: 'Archive', title: 'Drawer Archive' }} />
    </Drawer>
  )
}

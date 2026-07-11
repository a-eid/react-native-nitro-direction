import { StyleSheet, Text, View } from 'react-native'
import { FlipButton } from '../../components/FlipButton'
import { COLORS } from '../../components/COLORS'
import { ScreenBody, Section, Muted } from '../../components/ScreenBody'

export default function DrawerHome() {
  return (
    <ScreenBody>
      <FlipButton />
      <Section title="Drawer Home">
        <Muted>This is a nested drawer navigator. Swipe from the edge to open the drawer — it should mirror sides in RTL.</Muted>
      </Section>
    </ScreenBody>
  )
}

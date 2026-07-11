import { StyleSheet, Text, View } from 'react-native'
import { FlipButton } from '../../components/FlipButton'
import { COLORS } from '../../components/COLORS'
import { ScreenBody, Section, Muted } from '../../components/ScreenBody'

export default function DrawerArchive() {
  return (
    <ScreenBody>
      <FlipButton />
      <Section title="Archive">
        <Muted>Archive screen inside the drawer. Drawer items should re-order in RTL.</Muted>
      </Section>
    </ScreenBody>
  )
}

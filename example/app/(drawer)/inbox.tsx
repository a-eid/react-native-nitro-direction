import { StyleSheet, Text, View } from 'react-native'
import { FlipButton } from '../../components/FlipButton'
import { COLORS } from '../../components/COLORS'
import { ScreenBody, Section, Muted } from '../../components/ScreenBody'

export default function DrawerInbox() {
  return (
    <ScreenBody>
      <FlipButton />
      <Section title="Inbox">
        <Muted>Inbox screen inside the drawer. Check that the drawer item labels and chevrons mirror correctly in RTL.</Muted>
      </Section>
    </ScreenBody>
  )
}

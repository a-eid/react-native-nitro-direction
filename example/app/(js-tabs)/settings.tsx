import { StyleSheet, Switch, Text, View } from 'react-native'
import { setDirection, getDirection } from 'react-native-nitro-direction'
import { useState } from 'react'
import { FlipButton } from '../../components/FlipButton'
import { COLORS } from '../../components/COLORS'
import { ScreenBody, Section } from '../../components/ScreenBody'

export default function JsSettingsTab() {
  const [notifications, setNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(true)

  return (
    <ScreenBody>
      <FlipButton />

      <Section title="Settings toggles">
        <View style={styles.row}>
          <Text style={styles.label}>Notifications</Text>
          <Switch value={notifications} onValueChange={setNotifications} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Dark mode</Text>
          <Switch value={darkMode} onValueChange={setDarkMode} />
        </View>
      </Section>

      <Section title="Direct setDirection">
        <View style={styles.row}>
          <Text style={styles.btn} onPress={() => setDirection('rtl')}>RTL</Text>
          <Text style={styles.btn} onPress={() => setDirection('ltr')}>LTR</Text>
        </View>
      </Section>

      <Text style={styles.muted}>
        Settings toggles should stay in the correct position relative to their
        labels when flipping direction.
      </Text>
    </ScreenBody>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { color: COLORS.text, fontSize: 15, textAlign: 'left' },
  btn: {
    backgroundColor: COLORS.card,
    color: COLORS.text,
    fontWeight: '600',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    textAlign: 'center',
    flex: 1,
  },
  muted: { color: COLORS.muted, fontSize: 13, lineHeight: 18, textAlign: 'left' },
})

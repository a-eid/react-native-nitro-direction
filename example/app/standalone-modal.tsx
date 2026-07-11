import { Pressable, StyleSheet, Text, View } from 'react-native'
import { setDirection, getDirection } from 'react-native-nitro-direction'
import { FlipButton } from '../components/FlipButton'
import { COLORS } from '../components/COLORS'
import { ScreenBody, Section } from '../components/ScreenBody'

export default function StandaloneModalScreen() {
  return (
    <ScreenBody>
      <FlipButton />

      <Section title="Modal presentation">
        <Text style={styles.muted}>
          This screen is presented as a modal (slide from bottom). Flip
          direction while it's open — the modal chrome should mirror without
          dismissing.
        </Text>
      </Section>

      <Section title="Direct setDirection">
        <View style={styles.row}>
          <Pressable style={styles.btn} onPress={() => setDirection('rtl')}>
            <Text style={styles.btnText}>RTL</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={() => setDirection('ltr')}>
            <Text style={styles.btnText}>LTR</Text>
          </Pressable>
        </View>
      </Section>

      <Text style={styles.muted}>
        Swipe down to dismiss. The close button and gesture should work
        identically in both LTR and RTL modes.
      </Text>
    </ScreenBody>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  btn: {
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
    alignItems: 'center',
  },
  btnText: { color: COLORS.text, fontWeight: '600' },
  muted: { color: COLORS.muted, fontSize: 13, lineHeight: 18, textAlign: 'left' },
})

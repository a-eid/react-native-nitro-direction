import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { setDirection } from 'react-native-nitro-direction'
import { FlipButton } from '../../components/FlipButton'
import { COLORS } from '../../components/COLORS'
import { ScreenBody, Section } from '../../components/ScreenBody'

export default function JsInputsTab() {
  const [text, setText] = useState('Type here — cursor should stay sane on flip')

  return (
    <ScreenBody>
      <FlipButton />

      <Section title="TextInput">
        <TextInput
          value={text}
          onChangeText={setText}
          style={styles.input}
          placeholder="Placeholder should flip side"
          multiline
        />
      </Section>

      <Section title="Direct setDirection">
        <View style={styles.row}>
          <Text style={styles.btn} onPress={() => setDirection('rtl')}>RTL</Text>
          <Text style={styles.btn} onPress={() => setDirection('ltr')}>LTR</Text>
        </View>
      </Section>
    </ScreenBody>
  )
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: COLORS.card,
    color: COLORS.text,
    borderRadius: 10,
    padding: 12,
    minHeight: 60,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: 'left',
  },
  row: { flexDirection: 'row', gap: 12 },
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
})

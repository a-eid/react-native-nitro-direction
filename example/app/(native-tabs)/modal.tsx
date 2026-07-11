import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { setDirection } from 'react-native-nitro-direction'
import { FlipButton } from '../../components/FlipButton'
import { COLORS } from '../../components/COLORS'
import { ScreenBody, Section } from '../../components/ScreenBody'

export default function NativeModalTab() {
  const [open, setOpen] = useState(false)

  return (
    <ScreenBody>
      <FlipButton />

      <Section title="Modal (flip while open)">
        <Pressable style={styles.btn} onPress={() => setOpen(true)}>
          <Text style={styles.btnText}>Open modal</Text>
        </Pressable>
      </Section>

      <Modal visible={open} animationType="slide" transparent>
        <Pressable style={styles.modalWrap} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Native Tab Modal</Text>
            <Text style={styles.muted}>Flip direction while this modal is open.</Text>
            <View style={styles.row}>
              <Pressable style={styles.btn} onPress={() => { setDirection('rtl'); }}>
                <Text style={styles.btnText}>RTL</Text>
              </Pressable>
              <Pressable style={styles.btn} onPress={() => { setDirection('ltr'); }}>
                <Text style={styles.btnText}>LTR</Text>
              </Pressable>
            </View>
            <Pressable style={styles.btn} onPress={() => setOpen(false)}>
              <Text style={styles.btnText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
  },
  modalTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700', textAlign: 'left' },
})

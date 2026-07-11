import { useEffect, useState, useCallback } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  getDirection,
  setDirection,
  onDirectionChanged,
} from 'react-native-nitro-direction'
import { COLORS } from './COLORS'

export function FlipButton() {
  const [isRTL, setIsRTL] = useState(getDirection() === 'rtl')

  useEffect(() => {
    return onDirectionChanged((dir) => {
      setIsRTL(dir === 'rtl')
    })
  }, [])

  const flip = useCallback(async () => {
    const next = getDirection() === 'ltr' ? 'rtl' : 'ltr'
    await setDirection(next)
    setIsRTL(next === 'rtl')
  }, [])

  return (
    <View style={styles.container}>
      <Text style={styles.readout}>
        direction: <Text style={styles.bold}>{isRTL ? 'RTL →' : '← LTR'}</Text>
      </Text>
      <Pressable style={styles.btn} onPress={flip}>
        <Text style={styles.btnText}>Flip to {isRTL ? 'LTR' : 'RTL'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  readout: { fontSize: 14, color: COLORS.muted, textAlign: 'left' },
  bold: { color: COLORS.tint, fontWeight: '700' },
  btn: {
    backgroundColor: COLORS.tint,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: { color: COLORS.onTint, fontWeight: '700', fontSize: 15 },
})
